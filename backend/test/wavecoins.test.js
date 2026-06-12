const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const store = require("../src/db/demoStore");
const {
  formatBalance,
  usdCentsToWaveCoins,
  waveCoinsToUsdCents
} = require("../src/services/currency");
const { recordOfferwallEvent } = require("../src/services/offerwalls");

function resetDemoStore() {
  store.users.clear();
  store.paymentEvents.length = 0;
  store.ledgerEntries.length = 0;
}

test("WaveCoin conversion is exact", () => {
  assert.equal(waveCoinsToUsdCents(100), 100);
  assert.equal(usdCentsToWaveCoins(100), 100);
  assert.equal(formatBalance({ preferredBalanceDisplay: "usd" }, 500), "$5.00");
  assert.equal(formatBalance({ preferredBalanceDisplay: "both" }, 1250), "1,250 WaveCoins ($12.50)");
});

test("duplicate provider transactions cannot credit twice", async () => {
  env.DATABASE_URL = "";
  resetDemoStore();
  const user = await store.createDemoUser({ name: "WaveCoin Tester", email: "wavecoins@example.com", password: "password123", role: "user" });
  user.balance = 0;
  user.total_earned = 0;
  user.balance_wavecoins = 0;
  user.total_earned_wavecoins = 0;

  const event = {
    provider: "cpx",
    userId: user.id,
    transactionId: "provider-tx-1",
    offerId: "survey-1",
    amount: 5,
    status: "approved",
    raw: { transaction_id: "provider-tx-1" }
  };
  const signature = { verified: true };

  await recordOfferwallEvent(event, signature);
  await recordOfferwallEvent(event, signature);

  assert.equal(user.balance_wavecoins, 350);
  assert.equal(user.total_earned_wavecoins, 350);
  assert.equal(store.ledgerEntries.length, 1);
  assert.equal(store.paymentEvents.length, 1);
});
