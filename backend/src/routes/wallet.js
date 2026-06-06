const express = require("express");
const { z } = require("zod");
const { requireAuth, requireVerifiedEmail } = require("../middleware/auth");
const { createWithdrawal, listWithdrawals } = require("../services/wallet");
const { buildRisk, flagSuspiciousActivity } = require("../services/fraud");

const walletRouter = express.Router();
const withdrawalSchema = z.object({
  method: z.enum(["PayPal", "Gift Card", "Crypto"]),
  amount: z.coerce.number().positive(),
  destinationType: z.string().max(32).optional(),
  destinationValue: z.string().min(3).max(255)
});

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
    const risk = await buildRisk(req, { highValue: input.amount >= 25, withdrawalAmount: input.amount, balance: Number(req.body.balance || 0) });
    const withdrawal = await createWithdrawal({
      userId: req.user.id,
      method: input.method,
      amount: input.amount,
      destinationType: input.destinationType || (input.method === "Crypto" ? "ETH" : "EMAIL"),
      destinationValue: input.destinationValue,
      risk
    });
    if (risk.score >= 35 || withdrawal.status === "held" || withdrawal.status === "review") {
      await flagSuspiciousActivity({
        userId: req.user.id,
        eventType: "withdrawal_review",
        risk,
        metadata: { withdrawalId: withdrawal.id, method: input.method, amount: input.amount, status: withdrawal.status }
      });
    }
    res.json({ withdrawal, risk });
  } catch (error) {
    next(error);
  }
});

module.exports = { walletRouter };
