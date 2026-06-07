const MINIMUM_CASHOUT_WAVECOINS = 500;

function waveCoinsToUsdCents(waveCoins) {
  return Math.max(0, Math.round(Number(waveCoins || 0)));
}

function usdCentsToWaveCoins(usdCents) {
  return Math.max(0, Math.round(Number(usdCents || 0)));
}

function usdDollarsToWaveCoins(amount) {
  return usdCentsToWaveCoins(Number(amount || 0) * 100);
}

function formatUsdFromWaveCoins(waveCoins) {
  return `$${(waveCoinsToUsdCents(waveCoins) / 100).toFixed(2)}`;
}

function formatWaveCoins(waveCoins) {
  return `${Math.round(Number(waveCoins || 0)).toLocaleString()} WaveCoins`;
}

function formatBalance(user = {}, amountWaveCoins = 0) {
  const preference = user.preferredBalanceDisplay || user.preferred_balance_display || "coins";
  const coins = formatWaveCoins(amountWaveCoins);
  const usd = formatUsdFromWaveCoins(amountWaveCoins);
  if (preference === "usd") return usd;
  if (preference === "both") return `${coins} (${usd})`;
  return coins;
}

module.exports = {
  MINIMUM_CASHOUT_WAVECOINS,
  formatBalance,
  formatUsdFromWaveCoins,
  formatWaveCoins,
  usdCentsToWaveCoins,
  usdDollarsToWaveCoins,
  waveCoinsToUsdCents
};
