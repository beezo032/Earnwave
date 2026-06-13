const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { createApp } = require("../src/app");
const { createToken } = require("../src/middleware/auth");
const { env } = require("../src/config/env");
const { listOfferwallCallbackEvents } = require("../src/services/offerwalls");
const store = require("../src/db/demoStore");

function resetDemoStore() {
  store.users.clear();
  store.paymentEvents.length = 0;
  store.ledgerEntries.length = 0;
}

test("CPX launch returns script widget config with required user parameters and md5 secure hash", async () => {
  env.DATABASE_URL = "";
  env.CPX_APP_ID = "33553";
  env.CPX_SECURE_HASH_SECRET = "test-cpx-secret";
  resetDemoStore();

  const user = await store.createDemoUser({ name: "CPX Tester", email: "cpx@example.com", password: "password123", role: "user" });
  user.email_verified = true;
  user.username = "cpxtester";

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/api/offerwalls/cpx/launch`, {
      headers: {
        Authorization: `Bearer ${createToken(user)}`,
        "x-device-hash": "cpx-device"
      }
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    const url = new URL(payload.url);
    const expectedHash = crypto.createHash("md5").update(`${user.id}-test-cpx-secret`).digest("hex");

    assert.equal(payload.configured, true);
    assert.equal(payload.integration, "cpx_script");
    assert.equal(payload.scriptSrc, "https://cdn.cpx-research.com/assets/js/script_tag_v2.0.js");
    assert.equal(url.origin, "https://offers.cpx-research.com");
    assert.equal(url.pathname, "/index.php");
    assert.equal(url.searchParams.get("app_id"), "33553");
    assert.equal(url.searchParams.get("ext_user_id"), user.id);
    assert.equal(url.searchParams.get("username"), "cpxtester");
    assert.equal(url.searchParams.get("email"), "cpx@example.com");
    assert.equal(url.searchParams.get("subid_1"), "earnwave");
    assert.equal(url.searchParams.get("subid_2"), user.id);
    assert.equal(url.searchParams.get("secure_hash"), expectedHash);
    assert.equal(payload.config.general_config.app_id, 33553);
    assert.equal(payload.config.general_config.ext_user_id, user.id);
    assert.equal(payload.config.general_config.username, "cpxtester");
    assert.equal(payload.config.general_config.email, "cpx@example.com");
    assert.equal(payload.config.general_config.secure_hash, expectedHash);
    assert.deepEqual(payload.config.script_config, [{ div_id: "fullscreen", theme_style: 1, order_by: 2, limit_surveys: 7 }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

function cpxExpectedHash(params, secret) {
  const sorted = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join("&");
  return crypto.createHash("sha256").update(sorted + secret).digest("hex");
}

function theoremExpectedHash(urlBeforeHash, secret) {
  return crypto.createHmac("sha1", secret).update(urlBeforeHash).digest("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

test("CPX callback route verifies and records callback events", async () => {
  env.DATABASE_URL = "";
  env.CPX_SECURE_HASH_SECRET = "test-cpx-secret";
  env.CPX_USER_REWARD_PERCENT = 70;
  resetDemoStore();

  const user = await store.createDemoUser({ name: "CPX Callback", email: "cpx-callback@example.com", password: "password123", role: "user" });
  user.email_verified = true;

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const params = {
      ext_user_id: user.id,
      transaction_id: "txn-123",
      amount: "5.50",
      status: "approved"
    };
    const secure_hash = cpxExpectedHash(params, env.CPX_SECURE_HASH_SECRET);
    const query = new URLSearchParams({ ...params, secure_hash }).toString();
    const response = await fetch(`${baseUrl}/api/offerwalls/cpx/callback?${query}`);

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.received, true);
    assert.equal(payload.verified, true);
    assert.equal(payload.event.provider, "cpx");
    assert.equal(payload.event.userId, user.id);
    assert.equal(payload.event.transactionId, "txn-123");
    assert.equal(payload.event.amount, 5.5);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("CPX callback normalizes amount_local, amount_usd, and status reversal", async () => {
  env.DATABASE_URL = "";
  env.CPX_SECURE_HASH_SECRET = "test-cpx-secret";
  resetDemoStore();

  const user = await store.createDemoUser({ name: "CPX Amounts", email: "cpx-amounts@example.com", password: "password123", role: "user" });
  user.email_verified = true;
  user.balance_wavecoins = 1000;
  user.balance = 10;

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const creditParams = {
      ext_user_id: user.id,
      trans_id: "txn-cpx-amounts",
      amount_local: "500",
      amount_usd: "5.00",
      status: "1"
    };
    const creditHash = cpxExpectedHash(creditParams, env.CPX_SECURE_HASH_SECRET);
    const creditQuery = new URLSearchParams({ ...creditParams, secure_hash: creditHash }).toString();
    const creditResponse = await fetch(`${baseUrl}/api/offerwalls/cpx/callback?${creditQuery}`);
    const creditPayload = await creditResponse.json();

    assert.equal(creditResponse.status, 200);
    assert.equal(creditPayload.event.amount, 5);
    assert.equal(user.balance_wavecoins, 1350);
    assert.equal(store.ledgerEntries[0].provider_gross_usd_cents, 500);
    assert.equal(store.ledgerEntries[0].user_reward_wavecoins, 350);
    assert.equal(store.ledgerEntries[0].platform_margin_usd_cents, 150);

    const reversalParams = {
      ext_user_id: user.id,
      trans_id: "txn-cpx-amounts-reversal",
      amount_local: "500",
      amount_usd: "5.00",
      status: "2"
    };
    const reversalHash = cpxExpectedHash(reversalParams, env.CPX_SECURE_HASH_SECRET);
    const reversalQuery = new URLSearchParams({ ...reversalParams, secure_hash: reversalHash }).toString();
    const reversalResponse = await fetch(`${baseUrl}/api/offerwalls/cpx/callback?${reversalQuery}`);

    assert.equal(reversalResponse.status, 200);
    assert.equal(user.balance_wavecoins, 1000);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("unsigned CPX callback is rejected and does not credit balance", async () => {
  env.DATABASE_URL = "";
  env.CPX_SECURE_HASH_SECRET = "test-cpx-secret";
  env.ALLOW_UNVERIFIED_OFFERWALL_CALLBACKS = false;
  resetDemoStore();

  const user = await store.createDemoUser({ name: "Unsigned Callback", email: "unsigned-cpx@example.com", password: "password123", role: "user" });
  user.email_verified = true;
  const startingBalance = user.balance_wavecoins;

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const params = new URLSearchParams({
      ext_user_id: user.id,
      transaction_id: "txn-unsigned",
      amount: "25",
      status: "approved"
    }).toString();
    const response = await fetch(`${baseUrl}/api/offerwalls/cpx/callback?${params}`);
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.verified, false);
    assert.equal(user.balance_wavecoins, startingBalance);
    assert.equal(store.paymentEvents.length, 1);
    assert.equal(store.paymentEvents[0].rejected, true);
    assert.equal(store.ledgerEntries.length, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("admin callback log includes rejected CPX callback diagnostics", async () => {
  env.DATABASE_URL = "";
  env.CPX_SECURE_HASH_SECRET = "test-cpx-secret";
  env.ALLOW_UNVERIFIED_OFFERWALL_CALLBACKS = false;
  resetDemoStore();

  const user = await store.createDemoUser({ name: "Callback Diagnostics", email: "callback-diagnostics@example.com", password: "password123", role: "user" });
  user.email_verified = true;

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const params = new URLSearchParams({
      user_id: user.id,
      trans_id: "txn-cpx-rejected-log",
      amount_local: "100",
      amount_usd: "1.00",
      status: "1"
    }).toString();
    await fetch(`${baseUrl}/api/offerwalls/cpx/callback?${params}`);
    const callbacks = await listOfferwallCallbackEvents({ limit: 5 });

    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].provider, "cpx");
    assert.equal(callbacks[0].rejected, true);
    assert.equal(callbacks[0].normalized_event.userId, user.id);
    assert.equal(callbacks[0].normalized_event.transactionId, "txn-cpx-rejected-log");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("CPX callback accepts configured postback secret and credits user split", async () => {
  env.DATABASE_URL = "";
  env.CPX_SECURE_HASH_SECRET = "test-cpx-secret";
  env.CPX_POSTBACK_SECRET = "test-postback-secret";
  env.CPX_USER_REWARD_PERCENT = 70;
  env.ALLOW_UNVERIFIED_OFFERWALL_CALLBACKS = false;
  resetDemoStore();

  const user = await store.createDemoUser({ name: "CPX Secret", email: "cpx-secret@example.com", password: "password123", role: "user" });
  user.email_verified = true;
  const startingBalance = user.balance_wavecoins;

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const params = new URLSearchParams({
      user_id: user.id,
      trans_id: "txn-cpx-secret",
      amount_local: "100",
      amount_usd: "1.00",
      status: "1",
      postback_secret: "test-postback-secret"
    }).toString();
    const response = await fetch(`${baseUrl}/api/offerwalls/cpx/callback?${params}`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.verified, true);
    assert.equal(payload.event.userId, user.id);
    assert.equal(payload.event.transactionId, "txn-cpx-secret");
    assert.equal(user.balance_wavecoins - startingBalance, 70);
    assert.equal(store.ledgerEntries[0].provider_gross_usd_cents, 100);
    assert.equal(store.ledgerEntries[0].user_reward_wavecoins, 70);
    assert.equal(store.ledgerEntries[0].platform_margin_usd_cents, 30);
  } finally {
    env.CPX_POSTBACK_SECRET = "";
    await new Promise(resolve => server.close(resolve));
  }
});

test("TheoremReach callback route verifies and records callback events", async () => {
  env.DATABASE_URL = "";
  env.THEOREM_SECRET_KEY = "theorem-secret";
  resetDemoStore();

  const user = await store.createDemoUser({ name: "Theorem Callback", email: "theorem-callback@example.com", password: "password123", role: "user" });
  user.email_verified = true;

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  env.PUBLIC_URL = baseUrl;

  try {
    const params = {
      external_id: user.id,
      transaction_id: "txn-456",
      currency: "10",
      status: "approved"
    };
    const queryString = new URLSearchParams(params).toString();
    const urlBeforeHash = `${env.PUBLIC_URL}/api/offerwalls/theorem/callback?${queryString}`;
    const hash = theoremExpectedHash(urlBeforeHash, env.THEOREM_SECRET_KEY);
    const response = await fetch(`${baseUrl}/api/offerwalls/theorem/callback?${queryString}&hash=${encodeURIComponent(hash)}`);

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.received, true);
    assert.equal(payload.verified, true);
    assert.equal(payload.event.provider, "theorem");
    assert.equal(payload.event.userId, user.id);
    assert.equal(payload.event.transactionId, "txn-456");
    assert.equal(payload.event.amount, 10);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("TheoremReach launch URL includes required IDs and url-safe hmac hash", async () => {
  env.DATABASE_URL = "";
  env.THEOREM_API_KEY = "theorem-api-key";
  env.THEOREM_PARTNER_ID = "25068";
  env.THEOREM_SECRET_KEY = "theorem-secret";
  resetDemoStore();

  const user = await store.createDemoUser({ name: "Theorem Tester", email: "theorem@example.com", password: "password123", role: "user" });
  user.email_verified = true;

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await fetch(`${baseUrl}/api/offerwalls/theorem/launch`, {
      headers: {
        Authorization: `Bearer ${createToken(user)}`,
        "x-device-hash": "theorem-device"
      }
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    const url = new URL(payload.url);
    const hash = url.searchParams.get("hash");

    assert.equal(payload.configured, true);
    assert.equal(url.searchParams.get("api_key"), "theorem-api-key");
    assert.equal(url.searchParams.get("partner_id"), "25068");
    assert.equal(url.searchParams.get("user_id"), user.id);
    assert.equal(url.searchParams.get("external_id"), user.id);
    assert.equal(url.searchParams.get("exchange_rate"), "100");
    assert.equal(url.searchParams.get("currency_name_plural"), "WaveCoins");
    assert.ok(url.searchParams.get("transaction_id"));
    assert.match(hash, /^[A-Za-z0-9_-]+$/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
