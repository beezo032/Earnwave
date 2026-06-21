const express = require("express");

const legalRouter = express.Router();

const docs = {
  terms: {
    title: "Terms of Service",
    body: [
      "By creating an EarnWave account, you agree to use the platform only for lawful, personal reward-earning activity and to provide accurate account, profile, tax, and payout information.",
      "You must be at least 18 years old, or the age of majority where you live if higher. One person may maintain only one EarnWave account, and accounts may not be sold, transferred, shared, or operated for another person.",
      "EarnWave reward credits are called WaveCoins. WaveCoins are promotional reward credits, not cash, stored value, a bank balance, cryptocurrency, securities, or legal tender. 100 WaveCoins equals $1.00 only when redeemed through an approved EarnWave payout method.",
      "Rewards are credited only after valid tracking, provider confirmation, fraud review, and any required compliance checks. EarnWave may delay, hold, reverse, or deny credits and payouts when tracking is incomplete, a provider reverses credit, or account activity violates these terms.",
      "EarnWave may change available offers, payout methods, minimum cashout amounts, countries, provider access, fees, and platform features at any time. If we make material changes to these terms, continued use of the platform means you accept the updated terms.",
      "EarnWave may suspend or close accounts, block withdrawals, remove pending rewards, or ban users for fraud, abuse, duplicate accounts, chargebacks, false information, prohibited automation, provider policy violations, or attempts to manipulate the reward system.",
      "EarnWave is provided as available. We do not guarantee that every offer will be available, that every user will qualify for every survey, or that third-party providers will approve every completion."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "EarnWave collects information needed to operate the platform, including account details, username, email address, profile information, referral activity, support messages, offer activity, wallet and payout records, tax/KYC status, and privacy or cookie consent choices.",
      "We also collect technical and fraud-prevention data such as IP address, country, ASN or network signals, device fingerprint hash, browser and device metadata, session activity, provider callback data, duplicate-account indicators, and suspicious activity flags.",
      "We use this information to create and secure accounts, match users with offers and surveys, track rewards, process support requests, review withdrawals, detect fraud, comply with tax and legal obligations, measure product performance, and communicate important account updates.",
      "EarnWave works with third-party offerwall providers, survey partners, payment processors, email providers, analytics tools, hosting providers, fraud-prevention vendors, and compliance providers. These partners may process data under their own terms and privacy policies.",
      "We do not sell account data as a standalone product. We may share limited data when required for offer tracking, fraud prevention, payout processing, tax reporting, legal compliance, business operations, or when you direct us to do so.",
      "Users may request access, correction, deletion, or export of eligible personal data through support. Some records may need to be retained for fraud prevention, tax, accounting, dispute, chargeback, security, or legal reasons.",
      "Cookies and similar technologies may be used for necessary platform operation, preferences, analytics, marketing attribution, and fraud prevention. Where required, users can manage consent choices for non-essential categories."
    ]
  },
  rewards: {
    title: "Rewards Policy",
    body: [
      "EarnWave tracks balances in integer WaveCoins. 100 WaveCoins equals $1.00 when redeemed through an approved payout method. WaveCoins have no value outside EarnWave and cannot be transferred between users.",
      "Rewards may appear as pending after a survey, referral, daily streak, bonus code, or quest. Pending rewards are not withdrawable until the provider confirms completion and EarnWave approves the reward.",
      "Rewards may pend, reverse, or be denied because the user did not qualify, tracking was blocked, the offer was completed before launch through EarnWave, provider rules were not followed, duplicate completion was detected, a refund or chargeback occurred, the advertiser reversed credit, or fraud review found risk.",
      "Available rewards can be requested for payout only after the minimum cashout is reached and required account, compliance, and payout information is complete. The default minimum cashout is 500 WaveCoins, equal to $5.00.",
      "All withdrawals are reviewed before payment. Review may include account age, device and IP signals, provider reversal history, payout amount, country mismatch, duplicate household indicators, KYC/tax status, and prior suspicious activity.",
      "EarnWave may impose daily, weekly, monthly, or lifetime earning and withdrawal limits. Payout methods and timing depend on provider availability, risk review, payment processor rules, country support, and compliance requirements.",
      "If a provider reverses a previously credited reward, EarnWave may subtract the WaveCoins from the user balance, move the account negative, hold future withdrawals, or request additional review."
    ]
  },
  fraud: {
    title: "Fraud and Account Policy",
    body: [
      "EarnWave is built for real users completing real surveys and approved reward actions. Users may not use fake identities, stolen information, duplicate accounts, shared accounts, account farms, bots, scripts, emulators, tampered devices, click automation, artificial traffic, or misleading behavior to earn rewards.",
      "VPNs, proxies, hosting networks, datacenter IPs, location spoofing, device spoofing, Play Integrity or App Attest failures, repeated household duplication, suspicious referral rings, and unusual payout velocity may trigger holds or manual review.",
      "Users may not complete the same offer multiple times unless the provider clearly allows it, submit false survey responses, intentionally fail quality checks, use disposable contact information to bypass rules, or interfere with tracking systems.",
      "EarnWave may request additional verification before releasing rewards. Refusing verification, providing inconsistent information, or attempting to bypass review may result in denied payouts or account closure.",
      "When fraud or abuse is detected, EarnWave may hold pending rewards, reverse credits, deny withdrawals, limit account access, block offerwalls, close the account, ban related accounts, and retain records needed to protect the platform.",
      "Appeals may be submitted through support. Appeals should include the account email, provider, offer or survey name, completion date, expected reward, screenshots if available, and any explanation relevant to the review."
    ]
  },
  tax: {
    title: "Tax and KYC Policy",
    body: [
      "Users are responsible for understanding and reporting any taxes that may apply to rewards, payouts, gifts, prizes, or other value received through EarnWave. EarnWave does not provide personal tax, legal, or financial advice.",
      "EarnWave may require identity, country, tax, and payout information before allowing withdrawals. Required information may depend on country, payout amount, payment method, risk level, provider requirements, and applicable law.",
      "U.S. users may be asked to provide W-9 information. Non-U.S. users may be asked to provide W-8 information or other documentation. EarnWave may lock payouts until required tax or identity information is complete and verified.",
      "Payment processors, payment apps, marketplaces, and third-party settlement organizations may issue tax forms such as Form 1099-K when legal thresholds or processor rules apply. Users may also need to report income even if no tax form is issued.",
      "EarnWave may collect and retain tax/KYC records, payout history, country, consent logs, risk review notes, and related documentation as required for compliance, fraud prevention, accounting, dispute handling, and legal obligations.",
      "If information is missing, expired, inconsistent, or cannot be verified, EarnWave may hold or deny payouts until the issue is resolved."
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
