const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const { createWithdrawal, listWithdrawals } = require("../services/wallet");
const { evaluatePayoutEligibility } = require("../services/compliance");
const { buildRisk, flagSuspiciousActivity, persistRiskReview } = require("../services/fraud");

const walletRouter = express.Router();
const withdrawalSchema = z.object({
  method: z.enum(["PayPal", "Gift Card", "Crypto"]),
  amount: z.coerce.number().positive().optional(),
  amountWaveCoins: z.coerce.number().int().positive().optional(),
  destinationType: z.string().max(32).optional(),
  destinationValue: z.string().min(3).max(255)
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
    const compliance = await evaluatePayoutEligibility({
      userId: req.user.id,
      payoutAmountCents: Math.round(Number(input.amount || 0) * 100)
    });
    if (!compliance.can_pay) {
      return res.status(423).json({
        message: "Payout locked until required compliance data is present.",
        compliance
      });
    }
    const risk = await buildRisk(req, { highValue: input.amount >= 25, withdrawalAmount: input.amount, balance: Number(req.body.balance || 0) });
    await persistRiskReview({
      userId: req.user.id,
      eventType: "withdrawal_review",
      risk,
      input: {
        payoutAmount: input.amount,
        method: input.method,
        destinationType: input.destinationType || (input.method === "Crypto" ? "ETH" : "EMAIL")
      },
      metadata: { compliance }
    });
    if (risk.action === "deny") {
      await flagSuspiciousActivity({
        userId: req.user.id,
        eventType: "withdrawal_denied",
        risk,
        metadata: { method: input.method, amount: input.amount }
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
        metadata: { withdrawalId: withdrawal.id, method: input.method, amount: input.amount, status: withdrawal.status }
      });
    }
    res.json({ withdrawal, risk, compliance });
  } catch (error) {
    next(error);
  }
});

module.exports = { walletRouter };
