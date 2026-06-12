const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const { readiness } = require("../src/services/readiness");
const { dispatchPayout } = require("../src/services/payouts");

test("manual payouts count as a configured payout path", async () => {
  env.MANUAL_PAYOUTS_ENABLED = true;
  env.PAYPAL_CLIENT_ID = "";
  env.PAYPAL_CLIENT_SECRET = "";
  env.TREMENDOUS_API_KEY = "";
  env.CIRCLE_API_KEY = "";
  env.CIRCLE_WALLET_ID = "";

  const health = readiness();
  assert.equal(health.payouts.manual, true);
  assert.equal(health.remaining.includes("Configure at least one payout provider"), false);
});

test("manual payout mode returns a manual dispatch marker", async () => {
  env.MANUAL_PAYOUTS_ENABLED = true;

  const result = await dispatchPayout({
    id: "manual-1",
    method: "Manual",
    amount: 5,
    destination_value: "member@example.com"
  });

  assert.equal(result.configured, true);
  assert.equal(result.provider, "manual");
  assert.match(result.message, /Manual payout mode/);
});
