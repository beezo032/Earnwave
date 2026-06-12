export const earnWaveFallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='560' viewBox='0 0 900 560'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2332e6a1'/%3E%3Cstop offset='1' stop-color='%2345c8ff'/%3E%3C/linearGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='18' result='b'/%3E%3CfeMerge%3E%3CfeMergeNode in='b'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Crect width='900' height='560' fill='%23060b12'/%3E%3Ccircle cx='720' cy='120' r='220' fill='%2345c8ff' opacity='.12'/%3E%3Ccircle cx='180' cy='420' r='260' fill='%2332e6a1' opacity='.14'/%3E%3Crect x='282' y='150' width='336' height='260' rx='54' fill='%230b1220' stroke='url(%23g)' stroke-width='4' filter='url(%23glow)'/%3E%3Cpath d='M330 253h82l-18 36h-50l-14-36Zm9 67h48l-17 34h-17l-14-34Zm75-67h39l-11 101 75-124 43-25-9 65 31-15-3 37-34 17-8 72h-42l11-88-55 88h-44l7-128Z' fill='url(%23g)'/%3E%3Ctext x='450' y='462' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-size='42' font-weight='800' fill='%23f6fbff'%3EEarnWave%3C/text%3E%3C/svg%3E";

export const offerCategoryTabs = ["All", "Surveys"];

export const developmentMockOffers = [
  {
    id: "dev-cpx-survey",
    title: "Consumer Opinion Survey",
    imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
    provider: "CPX Research",
    providerKey: "cpx",
    category: "Surveys",
    rewardWaveCoins: 250,
    estimatedMinutes: 8,
    isFeatured: true,
    label: "Development preview"
  },
  {
    id: "dev-theorem-survey",
    title: "Gaming Habits Survey",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
    provider: "TheoremReach",
    providerKey: "theorem",
    category: "Surveys",
    rewardWaveCoins: null,
    estimatedMinutes: 10,
    isFeatured: true,
    label: "Development preview"
  }
];

const curatedProviderOffers = [
  {
    id: "curated-cpx-surveys",
    title: "CPX Survey Matches",
    imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
    provider: "CPX Research",
    providerKey: "cpx",
    category: "Surveys",
    rewardWaveCoins: null,
    estimatedMinutes: 12,
    isFeatured: true,
    label: "Featured Survey Offer"
  },
  {
    id: "curated-theorem-surveys",
    title: "TheoremReach Survey Matches",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    provider: "TheoremReach",
    providerKey: "theorem",
    category: "Surveys",
    rewardWaveCoins: null,
    estimatedMinutes: 14,
    isFeatured: true,
    label: "Featured Survey Offer"
  }
];

export function usdCentsToWaveCoins(usdCents) {
  if (usdCents === null || usdCents === undefined || usdCents === "") return null;
  return Math.round(Number(usdCents));
}

export function usdDollarsToWaveCoins(usdDollars) {
  if (usdDollars === null || usdDollars === undefined || usdDollars === "") return null;
  return Math.round(Number(usdDollars) * 100);
}

export function normalizeOffer(providerOffer = {}) {
  const rewardWaveCoins = providerOffer.rewardWaveCoins
    ?? providerOffer.reward_wavecoins
    ?? (providerOffer.rewardUsdCents !== undefined ? usdCentsToWaveCoins(providerOffer.rewardUsdCents) : null)
    ?? (providerOffer.reward_usd_cents !== undefined ? usdCentsToWaveCoins(providerOffer.reward_usd_cents) : null)
    ?? (providerOffer.payoutUsd !== undefined ? usdDollarsToWaveCoins(providerOffer.payoutUsd) : null)
    ?? (providerOffer.reward !== undefined ? usdDollarsToWaveCoins(providerOffer.reward) : null)
    ?? null;
  const rewardUsdCents = providerOffer.rewardUsdCents
    ?? providerOffer.reward_usd_cents
    ?? (rewardWaveCoins === null ? null : rewardWaveCoins);

  return {
    id: providerOffer.id || `${providerOffer.providerKey || "provider"}-${providerOffer.title || "offer"}`,
    title: providerOffer.title || "Featured earning offer",
    imageUrl: providerOffer.imageUrl || providerOffer.image_url || providerOffer.thumbnail || earnWaveFallbackImage,
    provider: providerOffer.provider || "EarnWave",
    providerKey: providerOffer.providerKey || providerOffer.provider_key || String(providerOffer.provider || "").toLowerCase(),
    category: providerOffer.category || "Featured",
    rewardWaveCoins,
    rewardUsdCents,
    rewardLabel: providerOffer.rewardLabel || providerOffer.reward_label || (rewardWaveCoins === null ? "Reward varies" : null),
    estimatedMinutes: providerOffer.estimatedMinutes ?? providerOffer.estimated_minutes ?? null,
    startUrl: providerOffer.startUrl || providerOffer.start_url || "",
    isFeatured: Boolean(providerOffer.isFeatured ?? providerOffer.is_featured ?? providerOffer.is_trending ?? false),
    label: providerOffer.label || "Featured Survey Offer",
    isDevelopmentOnly: Boolean(providerOffer.isDevelopmentOnly ?? providerOffer.is_development_only ?? false)
  };
}

export function formatWaveCoinReward(offer = {}) {
  const rewardWaveCoins = offer.rewardWaveCoins ?? offer.reward_wavecoins;
  if (rewardWaveCoins === null || rewardWaveCoins === undefined) return "Reward varies";
  return `${Math.round(Number(rewardWaveCoins)).toLocaleString()} WaveCoins`;
}

export function formatRewardUsd(offer = {}) {
  const cents = offer.rewardUsdCents ?? offer.reward_usd_cents ?? offer.rewardWaveCoins ?? offer.reward_wavecoins;
  if (cents === null || cents === undefined) return "";
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export function offersForEnabledProviders(providers = {}, { includeDevelopmentMocks = false } = {}) {
  const enabledKeys = new Set(Object.entries(providers).filter(([, provider]) => provider?.enabled).map(([key]) => key));
  if (includeDevelopmentMocks) {
    return developmentMockOffers.map(offer => normalizeOffer({ ...offer, isDevelopmentOnly: true }));
  }
  return curatedProviderOffers
    .filter(offer => enabledKeys.has(offer.providerKey))
    .map(normalizeOffer);
}

export function filterOffersByCategory(offers, category) {
  if (!category || category === "All") return offers;
  if (category === "Featured") return offers.filter(offer => offer.isFeatured);
  return offers.filter(offer => offer.category === category);
}
