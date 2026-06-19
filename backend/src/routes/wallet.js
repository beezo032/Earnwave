const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const { createWithdrawal, listWithdrawals } = require("../services/wallet");
const { evaluatePayoutEligibility } = require("../services/compliance");
const { buildRisk, duplicateAccountSignals, duplicatePayoutDestinationSignals, flagSuspiciousActivity, lookupIpReputation, persistRiskReview, providerReversalCountForUser, verifyTurnstileToken, withdrawalVelocitySignals } = require("../services/fraud");
const { findUserById } = require("../services/users");
const { env } = require("../config/env");

const walletRouter = express.Router();
const withdrawalSchema = z.object({
  method: z.enum(["PayPal", "Gift Card", "Crypto"]),
  amount: z.coerce.number().positive().optional(),
  amountWaveCoins: z.coerce.number().int().positive().optional(),
  destinationType: z.string().max(32).optional(),
  destinationValue: z.string().min(3).max(255),
  turnstileToken: z.string().max(4096).optional()
}).refine(body => body.amount || body.amountWaveCoins, { message: "Amount is required" });

walletRouter.get("/withdrawals", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    res.json({ withdrawals: await listWithdrawals(req.user.id) });
  } catch (error) {
    next(error);
  }
});

walletRouter.post("/withdrawals", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const input = withdrawalSchema.parse(req.body);
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const payoutAmountCents = input.amountWaveCoins || Math.round(Number(input.amount || 0) * 100);
    const payoutAmountUsd = payoutAmountCents / 100;
    const serverBalanceUsd = Number(user.balance_wavecoins || 0) / 100;
    const compliance = await evaluatePayoutEligibility({
      userId: req.user.id,
      payoutAmountCents
    });
    if (!compliance.can_pay) {
      return res.status(423).json({
        message: "Payout locked until required compliance data is present.",
        compliance
      });
    }
    const accountAgeDays = user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) : undefined;
    const duplicateSignals = await duplicateAccountSignals({ email: user.email, req, currentUserId: req.user.id });
    const duplicateHouseholdIndicators = await duplicatePayoutDestinationSignals({ userId: req.user.id, destinationValue: input.destinationValue });
    const providerReversalCount = await providerReversalCountForUser(req.user.id);
    const ipIntel = await lookupIpReputation(req);
    const turnstile = await verifyTurnstileToken({ token: input.turnstileToken || req.headers["x-turnstile-token"], ip: ipIntel.ip });
    const payoutVelocitySignals = await withdrawalVelocitySignals({ userId: req.user.id, amountWaveCoins: input.amountWaveCoins || payoutAmountCents });
    const risk = await buildRisk(req, {
      highValue: payoutAmountUsd >= 25,
      withdrawalAmount: payoutAmountUsd,
      balance: serverBalanceUsd,
      duplicateSignals,
      payoutVelocitySignals,
      accountAgeDays,
      accountCountry: user.country,
      payoutCountry: req.headers["x-payout-country"] || user.country,
      requiresTurnstile: env.REQUIRE_TURNSTILE_WITHDRAWALS,
      turnstileResult: turnstile.result,
      ipReputation: ipIntel.reputation,
      asn: ipIntel.asn,
      ipCountry: ipIntel.country,
      providerReversalCount,
      duplicateHouseholdIndicators
    });
    await persistRiskReview({
      userId: req.user.id,
      eventType: "withdrawal_review",
      risk,
      input: {
        payoutAmount: payoutAmountUsd,
        method: input.method,
        destinationType: input.destinationType || (input.method === "Crypto" ? "ETH" : "EMAIL"),
        ipIntel: { source: ipIntel.source, country: ipIntel.country, asn: ipIntel.asn },
        turnstile: { success: turnstile.success, result: turnstile.result, reason: turnstile.reason },
        payoutVelocitySignals
      },
      metadata: { compliance }
    });
    if (risk.action === "deny") {
      await flagSuspiciousActivity({
        userId: req.user.id,
        eventType: "withdrawal_denied",
        risk,
        metadata: { method: input.method, amount: payoutAmountUsd }
      });
      return res.status(403).json({ message: "Withdrawal denied by fraud controls.", risk });
    }
    const withdrawal = await createWithdrawal({
      userId: req.user.id,
      method: input.method,
      amount: input.amount,
      amountWaveCoins: input.amountWaveCoins,
      destinationType: input.destinationType || (input.method === "Crypto" ? "ETH" : "EMAIL"),
      destinationValue: input.destinationValue,
      risk
    });
    if (risk.risk_score >= 35 || withdrawal.status === "held" || withdrawal.status === "review") {
      await flagSuspiciousActivity({
        userId: req.user.id,
        eventType: "withdrawal_review",
        risk,
        metadata: { withdrawalId: withdrawal.id, method: input.method, amount: payoutAmountUsd, status: withdrawal.status }
      });
    }
    res.json({ withdrawal, risk, compliance });
  } catch (error) {
    next(error);
  }
});

module.exports = { walletRouter };

