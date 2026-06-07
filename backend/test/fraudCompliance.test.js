const test = require("node:test");
const assert = require("node:assert/strict");
const fc = require("fast-check");
const { createApp } = require("../src/app");
const { createToken } = require("../src/middleware/auth");
const { env } = require("../src/config/env");
const store = require("../src/db/demoStore");
const { scoreFraudRisk } = require("../src/services/fraud");
const fraudCases = require("./fixtures/fraudCases");

function resetDemoStore() {
  store.users.clear();
  store.withdrawals.length = 0;
  store.devices.length = 0;
  store.suspiciousActivity.length = 0;
  store.riskReviews.length = 0;
  store.complianceProfiles.length = 0;
  store.complianceThresholds.length = 0;
  store.privacyConsentAudit.length = 0;
  store.dataSubjectRequests.length = 0;
  store.ledgerEntries.length = 0;
}

async function testServer() {
  env.DATABASE_URL = "";
  resetDemoStore();
  const admin = await store.createDemoUser({ name: "Admin", email: "admin@example.com", password: "password123", role: "admin" });
  const user = await store.createDemoUser({ name: "Member", email: "member@example.com", password: "password123", role: "user" });
  admin.email_verified = true;
  user.email_verified = true;
  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    admin,
    user,
    baseUrl,
    adminHeaders: { Authorization: `Bearer ${createToken(admin)}`, "Content-Type": "application/json", "x-device-hash": "admin-device" },
    userHeaders: { Authorization: `Bearer ${createToken(user)}`, "Content-Type": "application/json", "x-device-hash": "member-device" },
    close: () => new Promise(resolve => server.close(resolve))
  };
}

for (const fixture of fraudCases) {
  test(`fraud scorer handles edge case: ${fixture.name}`, () => {
    const risk = scoreFraudRisk(fixture.input);
    assert.equal(risk.action, fixture.action);
    if (fixture.minScore !== undefined) assert.ok(risk.risk_score >= fixture.minScore);
    if (fixture.maxScore !== undefined) assert.ok(risk.risk_score <= fixture.maxScore);
    assert.ok(Array.isArray(risk.reason_codes));
    assert.ok(risk.reason_codes.length > 0);
  });
}

test("fraud scorer always returns a bounded score and valid action", () => {
  fc.assert(fc.property(
    fc.integer({ min: -100, max: 1000 }),
    fc.integer({ min: -20, max: 20 }),
    fc.integer({ min: 0, max: 3650 }),
    (payoutAmount, providerReversalCount, accountAgeDays) => {
      const risk = scoreFraudRisk({
        payoutAmount,
        providerReversalCount,
        accountAgeDays,
        deviceFingerprintHash: payoutAmount % 2 ? "device" : ""
      });
      assert.ok(risk.risk_score >= 0);
      assert.ok(risk.risk_score <= 100);
      assert.ok(["allow", "hold", "manual_review", "deny"].includes(risk.action));
    }
  ));
});

test("threshold changes lock and unlock withdrawal eligibility end to end", async () => {
  const server = await testServer();
  try {
    const profileResponse = await fetch(`${server.baseUrl}/api/compliance/profile`, {
      method: "PUT",
      headers: server.userHeaders,
      body: JSON.stringify({ country: "US", kycStatus: "not_started", w9Status: "not_started" })
    });
    assert.equal(profileResponse.status, 200);

    const lowThreshold = await fetch(`${server.baseUrl}/api/admin/compliance/thresholds/US`, {
      method: "PUT",
      headers: server.adminHeaders,
      body: JSON.stringify({ kycThresholdCents: 1000, taxThresholdCents: 60000, requiredTaxForm: "W-9" })
    });
    assert.equal(lowThreshold.status, 200);

    const blockedWithdrawal = await fetch(`${server.baseUrl}/api/wallet/withdrawals`, {
      method: "POST",
      headers: server.userHeaders,
      body: JSON.stringify({ method: "PayPal", amount: 25, destinationValue: "member@example.com", balance: 48.75 })
    });
    assert.equal(blockedWithdrawal.status, 423);
    const blockedPayload = await blockedWithdrawal.json();
    assert.deepEqual(blockedPayload.compliance.blocked_reasons, ["KYC_REQUIRED"]);
    assert.equal(store.withdrawals.length, 0);

    const highThreshold = await fetch(`${server.baseUrl}/api/admin/compliance/thresholds/US`, {
      method: "PUT",
      headers: server.adminHeaders,
      body: JSON.stringify({ kycThresholdCents: 100000, taxThresholdCents: 60000, requiredTaxForm: "W-9" })
    });
    assert.equal(highThreshold.status, 200);

    const allowedWithdrawal = await fetch(`${server.baseUrl}/api/wallet/withdrawals`, {
      method: "POST",
      headers: server.userHeaders,
      body: JSON.stringify({ method: "PayPal", amount: 25, destinationValue: "member@example.com", balance: 48.75 })
    });
    assert.equal(allowedWithdrawal.status, 200);
    const allowedPayload = await allowedWithdrawal.json();
    assert.equal(allowedPayload.compliance.can_pay, true);
    assert.equal(allowedPayload.withdrawal.status, "review");
    assert.equal(store.withdrawals.length, 1);
    assert.equal(store.riskReviews.length, 1);
  } finally {
    await server.close();
  }
});
