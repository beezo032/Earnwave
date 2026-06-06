const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { createStripeCheckout, createPayPalOrder } = require("../services/payments");

const paymentRouter = express.Router();
const paymentSchema = z.object({ amount: z.coerce.number().min(.5).max(500) });

paymentRouter.post("/stripe/checkout", requireAuth, async (req, res, next) => {
  try {
    const input = paymentSchema.parse(req.body);
    res.json(await createStripeCheckout({ amount: input.amount, userId: req.user.id }));
  } catch (error) {
    next(error);
  }
});

paymentRouter.post("/paypal/orders", requireAuth, async (req, res, next) => {
  try {
    const input = paymentSchema.parse(req.body);
    res.json(await createPayPalOrder({ amount: input.amount, userId: req.user.id }));
  } catch (error) {
    next(error);
  }
});

paymentRouter.post("/stripe/webhook", (req, res) => {
  res.json({ received: true, message: "Wire STRIPE_WEBHOOK_SECRET and persist event verification for production." });
});

module.exports = { paymentRouter };
