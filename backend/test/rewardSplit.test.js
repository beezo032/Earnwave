const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const { calculateRewardSplit } = require("../src/services/rewardSplit");

test("default provider reward split pays users 70 percent in WaveCoins", () => {
  env.CPX_USER_REWARD_PERCENT = 70;
  env.THEOREM_USER_REWARD_PERCENT = 70;

  assert.deepEqual(calculateRewardSplit({ provider: "cpx", grossUsdCents: 100 }), {
    providerGrossUsdCents: 100,
    userRewardWaveCoins: 70,
    platformMarginUsdCents: 30,
    userRewardPercent: 70
  });

  assert.deepEqual(calculateRewardSplit({ provider: "theorem", grossUsdCents: 200 }), {
    providerGrossUsdCents: 200,
    userRewardWaveCoins: 140,
    platformMarginUsdCents: 60,
    userRewardPercent: 70
  });
});

test("reward split rounds user WaveCoins down", () => {
  env.CPX_USER_REWARD_PERCENT = 70;

  const split = calculateRewardSplit({ provider: "cpx", grossUsdCents: 101 });

  assert.equal(split.userRewardWaveCoins, 70);
  assert.equal(split.platformMarginUsdCents, 31);
});
