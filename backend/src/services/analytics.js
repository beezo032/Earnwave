async function platformAnalytics() {
  return {
    revenue: 18900,
    payouts: 7420,
    conversionRate: 18.4,
    activeUsers: 12450,
    providerQuality: [
      { provider: "AdGem", approvalRate: 92, reversalRate: 1.8 },
      { provider: "Lootably", approvalRate: 88, reversalRate: 2.4 },
      { provider: "Torox", approvalRate: 84, reversalRate: 3.1 },
      { provider: "BitLabs", approvalRate: 91, reversalRate: 1.6 }
    ],
    timeseries: [
      { day: "Mon", revenue: 2400, payouts: 980, users: 320 },
      { day: "Tue", revenue: 3100, payouts: 1280, users: 410 },
      { day: "Wed", revenue: 2800, payouts: 1160, users: 390 },
      { day: "Thu", revenue: 3900, payouts: 1510, users: 520 },
      { day: "Fri", revenue: 4600, payouts: 1880, users: 610 },
      { day: "Sat", revenue: 5200, payouts: 2020, users: 690 },
      { day: "Sun", revenue: 4800, payouts: 1760, users: 640 }
    ]
  };
}

module.exports = { platformAnalytics };
