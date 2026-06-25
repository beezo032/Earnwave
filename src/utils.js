export function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function dollarsToWaveCoins(value) {
  return Math.round(Number(value || 0) * 100);
}

export function waveCoinsToUsd(waveCoins) {
  return Number(waveCoins || 0) / 100;
}

export function userAmountWaveCoins(user, fallbackDollars = 0, key = "balance_wavecoins") {
  return user?.[key] ?? dollarsToWaveCoins(fallbackDollars);
}

export function formatBalance(user = {}, amountWaveCoins = 0) {
  const preference = user.preferredBalanceDisplay || "coins";
  const coins = `${Math.round(Number(amountWaveCoins || 0)).toLocaleString()} WaveCoins`;
  const usd = money(waveCoinsToUsd(amountWaveCoins));
  if (preference === "usd") return usd;
  if (preference === "both") return `${coins} (${usd})`;
  return coins;
}

export function rewardLabel(valueDollars) {
  return formatBalance({ preferredBalanceDisplay: "coins" }, dollarsToWaveCoins(valueDollars));
}

export function trackEvent(eventName, payload = {}) {
  const detail = { surface: "earnwave", ...payload };
  window.dispatchEvent(new CustomEvent(`earnwave:${eventName}`, { detail }));
  window.dataLayer?.push({ event: `earnwave_${eventName}`, ...detail });
}

export const defaultActivityMetrics = { surveyStarts: 0, providerOpens: 0, completedSurveys: 0 };

export function readActivityMetrics() {
  try {
    return { ...defaultActivityMetrics, ...JSON.parse(localStorage.getItem("earnwave_activity_metrics") || "{}") };
  } catch {
    return defaultActivityMetrics;
  }
}

export function recordActivityMetric(type) {
  const current = readActivityMetrics();
  const next = { ...current, [type]: Number(current[type] || 0) + 1 };
  localStorage.setItem("earnwave_activity_metrics", JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("earnwave:activity", { detail: next }));
  return next;
}

export async function getDeviceFingerprint() {
  const cached = localStorage.getItem("earnwave_device_hash");
  if (cached) return cached;

  const source = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency || "unknown",
    navigator.deviceMemory || "unknown"
  ].join("|");

  if (!window.crypto?.subtle) {
    const fallback = btoa(source).replace(/[^a-z0-9]/gi, "").slice(0, 64);
    localStorage.setItem("earnwave_device_hash", fallback);
    return fallback;
  }

  const encoded = new TextEncoder().encode(source);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem("earnwave_device_hash", hash);
  return hash;
}

export const defaultOfferwallProviders = {
  cpx: { key: "cpx", name: "CPX Research", enabled: false },
  theorem: { key: "theorem", name: "TheoremReach", enabled: false }
};

export const surveyProviders = [
  {
    key: "cpx",
    name: "CPX Research",
    description: "High-volume survey inventory with profile matching, global routing, and fast research tasks.",
    rewardRange: "28-455 WaveCoins",
    usdRange: "$0.28-$4.55",
    averageTime: "5-18 min",
    userType: "Best for beginners",
    maxWaveCoins: 455,
    gradient: "linear-gradient(135deg, rgba(50,230,161,.22), rgba(69,200,255,.14))"
  },
  {
    key: "theorem",
    name: "TheoremReach",
    description: "Trusted survey wall built for qualified responses, clear completion flow, and reward tracking.",
    rewardRange: "35-420 WaveCoins",
    usdRange: "$0.35-$4.20",
    averageTime: "6-20 min",
    userType: "Best for higher payout",
    maxWaveCoins: 420,
    gradient: "linear-gradient(135deg, rgba(69,200,255,.22), rgba(255,107,138,.13))"
  }
];
