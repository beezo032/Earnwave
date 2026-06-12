const { env } = require("../config/env");

const DEFAULT_USER_REWARD_PERCENT = 70;

function clampPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return DEFAULT_USER_REWARD_PERCENT;
  return Math.min(100, Math.max(0, percent));
}

function userRewardPercentForProvider(provider) {
  const key = String(provider || "").toLowerCase();
  if (key === "cpx") return clampPercent(env.CPX_USER_REWARD_PERCENT);
  if (key === "theorem") return clampPercent(env.THEOREM_USER_REWARD_PERCENT);
  return DEFAULT_USER_REWARD_PERCENT;
}

function calculateRewardSplit({ provider, grossUsdCents }) {
  const providerGrossUsdCents = Math.max(0, Math.round(Number(grossUsdCents || 0)));
  const userRewardPercent = userRewardPercentForProvider(provider);
  const userRewardWaveCoins = Math.floor((providerGrossUsdCents * userRewardPercent) / 100);
  const platformMarginUsdCents = Math.max(0, providerGrossUsdCents - userRewardWaveCoins);

  return {
    providerGrossUsdCents,
    userRewardWaveCoins,
    platformMarginUsdCents,
    userRewardPercent
  };
}

module.exports = {
  DEFAULT_USER_REWARD_PERCENT,
  calculateRewardSplit,
  userRewardPercentForProvider
};
