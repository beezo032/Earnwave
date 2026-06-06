const Stripe = require("stripe");
const { env } = require("../config/env");

function stripeClient() {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY);
}

async function createStripeCheckout({ amount, userId }) {
  const stripe = stripeClient();
  if (!stripe) {
    return {
      provider: "stripe",
      configured: false,
      message: "Set STRIPE_SECRET_KEY to create real Stripe Checkout Sessions."
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.PUBLIC_URL}/wallet?payment=stripe_success`,
    cancel_url: `${env.PUBLIC_URL}/wallet?payment=stripe_cancel`,
    metadata: { userId },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(amount) * 100),
        product_data: { name: "EarnWave account funding" }
      }
    }]
  });

  return { provider: "stripe", configured: true, id: session.id, url: session.url };
}

async function paypalAccessToken() {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return null;
  const base = env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const token = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const payload = await response.json();
  return { base, accessToken: payload.access_token };
}

async function createPayPalOrder({ amount, userId }) {
  const auth = await paypalAccessToken();
  if (!auth) {
    return {
      provider: "paypal",
      configured: false,
      message: "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to create real PayPal Orders."
    };
  }

  const response = await fetch(`${auth.base}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ custom_id: String(userId), amount: { currency_code: "USD", value: Number(amount).toFixed(2) } }]
    })
  });

  return response.json();
}

module.exports = { createStripeCheckout, createPayPalOrder };
