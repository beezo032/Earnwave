const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const { dispatchPayout, sendTremendousReward } = require("../src/services/payouts");

function setTremendousEnv(overrides = {}) {
  env.TREMENDOUS_API_KEY = overrides.apiKey ?? "test-tremendous-key";
  env.TREMENDOUS_ENV = overrides.environment ?? "testflight";
  env.TREMENDOUS_FUNDING_SOURCE_ID = overrides.fundingSourceId ?? "funding-source-123";
  env.TREMENDOUS_PRODUCT_ID = overrides.productId ?? "product-123";
}

test("Tremendous gift card payout builds a reviewed reward order", async () => {
  setTremendousEnv();
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({ order: { id: "order-123" } })
    };
  };

  try {
    const result = await dispatchPayout({
      id: "abc",
      method: "Gift Card",
      amount: 5,
      destination_value: "member@example.com",
      recipient_name: "Member Name"
    });

    assert.equal(result.configured, true);
    assert.equal(result.provider, "tremendous");
    assert.equal(result.reference, "order-123");
    assert.equal(request.url, "https://testflight.tremendous.com/api/v2/orders");
    assert.equal(request.options.headers.Authorization, "Bearer test-tremendous-key");
    assert.equal(request.options.headers["Idempotency-Key"], "withdrawal-abc");
    assert.equal(request.body.external_id, "withdrawal-abc");
    assert.equal(request.body.payment.funding_source_id, "funding-source-123");
    assert.equal(request.body.rewards[0].value.denomination, 5);
    assert.equal(request.body.rewards[0].value.currency_code, "USD");
    assert.equal(request.body.rewards[0].delivery.method, "EMAIL");
    assert.equal(request.body.rewards[0].recipient.email, "member@example.com");
    assert.equal(request.body.rewards[0].recipient.name, "Member Name");
    assert.deepEqual(request.body.rewards[0].products, ["product-123"]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Tremendous requires API key, funding source, and product id", async () => {
  setTremendousEnv({ apiKey: "", fundingSourceId: "", productId: "" });

  const result = await sendTremendousReward({
    id: "withdrawal-missing-config",
    amount: 5,
    destination_value: "member@example.com"
  });

  assert.equal(result.configured, false);
  assert.equal(result.provider, "tremendous");
  assert.match(result.message, /TREMENDOUS_API_KEY/);
});
