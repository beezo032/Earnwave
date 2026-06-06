const express = require("express");

const legalRouter = express.Router();

const docs = {
  terms: {
    title: "Terms of Service",
    body: [
      "EarnWave users must provide accurate account information and may maintain only one account.",
      "Rewards are credited only after valid offerwall tracking, fraud review, and provider confirmation.",
      "EarnWave may reverse credits, suspend accounts, or reject payouts for fraud, chargebacks, duplicate accounts, VPN/proxy abuse, or policy violations."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "EarnWave collects account details, device signals, IP metadata, offer activity, and payout destination details to operate the rewards platform.",
      "Fraud-prevention data is used to protect users, advertisers, and payout systems.",
      "Provider postbacks and payment processors may process data under their own policies."
    ]
  },
  rewards: {
    title: "Rewards Policy",
    body: [
      "Balances are tracked through ledger entries for credits, debits, reversals, and payout requests.",
      "Payouts require manual approval before PayPal, Tremendous, or crypto automation is triggered.",
      "Minimums, limits, countries, and payment methods may change based on provider availability and risk."
    ]
  },
  fraud: {
    title: "Fraud and Account Policy",
    body: [
      "Users may not use VPNs, proxies, emulators, duplicate accounts, fake identities, or automated activity to earn rewards.",
      "Suspicious activity may be held for review before credits or payouts are approved.",
      "Repeated violations can result in account closure and forfeiture of pending rewards."
    ]
  }
};

legalRouter.get("/", (req, res) => {
  res.json({ docs });
});

legalRouter.get("/:slug", (req, res) => {
  const doc = docs[req.params.slug];
  if (!doc) return res.status(404).json({ message: "Legal document not found" });
  res.json({ doc });
});

module.exports = { legalRouter };
