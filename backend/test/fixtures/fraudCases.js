module.exports = [
  {
    name: "clean verified mobile signal",
    input: {
      turnstileResult: "success",
      ipReputation: "residential",
      asn: "consumer isp",
      country: "US",
      accountCountry: "US",
      deviceFingerprintHash: "device-clean",
      accountAgeDays: 90,
      payoutAmount: 12,
      androidPlayIntegrityVerdict: "MEETS_DEVICE_INTEGRITY",
      iosAppAttestStatus: "verified"
    },
    action: "allow",
    maxScore: 10
  },
  {
    name: "new high-value payout from risky network",
    input: {
      turnstileResult: "failed",
      ipReputation: "vpn proxy datacenter",
      asn: "hosting datacenter",
      country: "CA",
      accountCountry: "US",
      deviceFingerprintHash: "",
      accountAgeDays: 1,
      providerReversalCount: 2,
      payoutAmount: 125,
      androidPlayIntegrityVerdict: "failed",
      duplicateHouseholdIndicators: ["same_address", "same_payout"]
    },
    action: "deny",
    minScore: 85
  }
];
