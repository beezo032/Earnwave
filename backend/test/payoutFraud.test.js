const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const store = require("../src/db/demoStore");
const { createWithdrawal } = require("../src/services/wallet");
const { approveAndDispatch } = require("../src/services/payouts");
const { updateComplianceProfile } = require("../src/services/compliance");

function resetDemoStore() {
  store.users.clear();
  store.withdrawals.length = 0;
  store.ledgerEntries.length = 0;
  store.complianceProfiles.length = 0;
  store.complianceThresholds.length = 0;
}

test("approved payout cannot be approved and dispatched a second time", async () => {
  env.DATABASE_URL = "";
  env.PAYPAL_CLIENT_ID = "";
  env.PAYPAL_CLIENT_SECRET = "";
  resetDemoStore();

  const admin = await store.createDemoUser({ name: "Admin", email: "payout-admin@example.com", password: "password123", role: "admin" });
  const user = await store.createDemoUser({ name: "Payout User", email: "payout-user@example.com", password: "password123", role: "user" });
  user.email_verified = true;
  user.balance_wavecoins = 2000;
  user.balance = 20;
  await updateComplianceProfile({
    userId: user.id,
    country: "US",
    w9Status: "collected",
    payoutLocked: false
  });

  const withdrawal = await createWithdrawal({
    userId: user.id,
    method: "PayPal",
    amountWaveCoins: 500,
    destinationType: "EMAIL",
    destinationValue: "member@example.com",
    risk: { risk_score: 10, action: "allow", reason_codes: ["BASELINE_LOW_RISK"] }
  });

  const firstApproval = await approveAndDispatch({ id: withdrawal.id, moderatorId: admin.id, note: "manual review approved" });
  assert.equal(firstApproval.withdrawal.status, "approved");

  await assert.rejects(
    () => approveAndDispatch({ id: withdrawal.id, moderatorId: admin.id, note: "duplicate approval" }),
    /already approved/
  );
});
