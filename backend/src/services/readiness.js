const { env } = require("../config/env");
const { publicProviders } = require("./offerwalls");

function payoutReadiness() {
  return {
    paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
    tremendous: Boolean(env.TREMENDOUS_API_KEY && env.TREMENDOUS_FUNDING_SOURCE_ID && env.TREMENDOUS_PRODUCT_ID),
    crypto: Boolean(env.CIRCLE_API_KEY && env.CIRCLE_WALLET_ID)
  };
}

function readiness() {
  const offerwalls = publicProviders();
  return {
    database: Boolean(env.DATABASE_URL),
    redis: Boolean(env.REDIS_URL),
    adminBootstrap: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
    offerwalls: Object.fromEntries(Object.entries(offerwalls).map(([key, provider]) => [key, provider.enabled])),
    payouts: payoutReadiness(),
    remaining: [
      !env.DATABASE_URL && "Set DATABASE_URL and run migrations",
      !env.REDIS_URL && "Set REDIS_URL for sessions/cache",
      !(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) && "Set ADMIN_EMAIL and ADMIN_PASSWORD, then run npm run bootstrap:admin",
      !Object.values(offerwalls).some(provider => provider.enabled) && "Configure at least one offerwall provider",
      !Object.values(payoutReadiness()).some(Boolean) && "Configure at least one payout provider"
    ].filter(Boolean)
  };
}

module.exports = { readiness };
