const express = require("express");
const Stripe = require("stripe");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { createStripeCheckout, createPayPalOrder } = require("../services/payments");
const { env } = require("../config/env");

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
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ message: "Server is not configured with STRIPE_WEBHOOK_SECRET." });
  }
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).json({ message: "Missing Stripe signature header." });
  }
  const stripe = new Stripe(env.STRIPE_SECRET_KEY || "");
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature validation failed", error.message);
    return res.status(400).json({ message: "Invalid Stripe webhook signature." });
  }

  console.info("Stripe webhook received:", event.type);
  return res.json({ received: true, type: event.type });
});

module.exports = { paymentRouter };
