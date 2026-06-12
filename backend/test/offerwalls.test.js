const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { createApp } = require("../src/app");
const { createToken } = require("../src/middleware/auth");
const { env } = require("../src/config/env");
const store = require("../src/db/demoStore");

function resetDemoStore() {
  store.users.clear();
}

test("CPX launch URL includes required user parameters and md5 secure hash", async () => {
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

    assert.equal(payload.configured, true);
    assert.equal(url.origin, "https://offers.cpx-research.com");
    assert.equal(url.pathname, "/index.php");
    assert.equal(url.searchParams.get("app_id"), "33553");
    assert.equal(url.searchParams.get("ext_user_id"), user.id);
    assert.equal(url.searchParams.get("username"), "cpxtester");
    assert.equal(url.searchParams.get("email"), "cpx@example.com");
    assert.equal(url.searchParams.get("subid_1"), "earnwave");
    assert.equal(url.searchParams.get("subid_2"), user.id);
    assert.equal(
      url.searchParams.get("secure_hash"),
      crypto.createHash("md5").update(`${user.id}-test-cpx-secret`).digest("hex")
    );
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
