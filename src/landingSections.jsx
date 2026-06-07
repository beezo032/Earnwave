import React from "react";
import {
  ArrowRight,
  Bitcoin,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  Gamepad2,
  Gift,
  Lock,
  PackageCheck,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet
} from "lucide-react";

export const earningMethods = [
  { title: "Surveys", copy: "Answer profile-matched research from CPX Research and BitLabs when live credentials are connected.", payout: "$0.40-$6", icon: ClipboardList },
  { title: "Offerwalls", copy: "Complete app, finance, trial, and shopping offers from supported provider walls.", payout: "$3-$45", icon: Gift },
  { title: "Play Games", copy: "Install mobile games, reach tracked milestones, and wait for provider confirmation.", payout: "$2-$35", icon: Gamepad2 }
];

export const howItWorksSteps = [
  ["Create a verified account", "Sign up, confirm your email, and keep one account per person so rewards can be reviewed cleanly."],
  ["Choose an earning method", "Start with surveys, offerwalls, games, daily streaks, referrals, or bonus codes from your dashboard."],
  ["Track rewards to payout", "Available rewards can be withdrawn; pending rewards wait for provider approval or fraud review."]
];

export const rewardStatusRows = [
  ["Available rewards", "Cleared rewards already credited to your balance and eligible for withdrawal once you meet the minimum cashout."],
  ["Pending rewards", "Tracked rewards waiting on provider callback, hold period, duplicate checks, or manual fraud review."]
];

export const payoutMethods = ["PayPal Payouts", "Tremendous gift cards", "Crypto withdrawals", "Manual review queue"];

export const payoutProofs = [
  { name: "Maya R.", method: "PayPal", amount: "$25.00", detail: "TXN ****-8421", note: "Survey streak and app offer payout approved after review." },
  { name: "Jon T.", method: "Gift Card", amount: "$10.00", detail: "Order ****-1198", note: "Tremendous reward delivered to verified email." },
  { name: "Alex P.", method: "Crypto", amount: "$42.50", detail: "Wallet 0x8F****91", note: "Crypto withdrawal approved from the manual queue." }
];

export const landingFaqs = [
  ["Why do some rewards pend before becoming available?", "Some providers confirm completions after a callback, quality check, or advertiser review. EarnWave shows pending rewards separately so users know what is still being verified."],
  ["Why can a reward reverse?", "Rewards may reverse when a provider reports chargeback, duplicate account activity, VPN/proxy abuse, failed offer requirements, or advertiser rejection."],
  ["When can I cash out?", "Available rewards can be withdrawn after the minimum cashout is met. Withdrawals enter review first for fraud protection."],
  ["Which payout methods are supported?", "EarnWave is built for PayPal Payouts, Tremendous gift cards, crypto withdrawals, and manual approval before automation runs."]
];

export function LandingHero({ navigate, money, analyticsSeries, earningsFeed, Meter }) {
  return (
    <section className="hero">
      <div className="hero-orbit" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy-block">
          <div className="eyebrow"><ShieldCheck size={16} /> Verified earning, reviewed payouts, transparent reward status</div>
          <h1>Earn cash rewards from surveys, offers, games, and daily bonuses.</h1>
          <p className="hero-copy">EarnWave helps members find concrete earning methods, track pending versus available rewards, and cash out through reviewed payout flows built for trust.</p>
          <div className="hero-methods">
            {earningMethods.map(item => {
              const Icon = item.icon;
              return <div className="hero-method" key={item.title}><Icon size={18} /><strong>{item.title}</strong><span>{item.payout}</span></div>;
            })}
          </div>
          <div className="actions">
            <button className="btn xl" onClick={() => navigate("/signup")}>Create Verified Account <ArrowRight size={18} /></button>
            <button className="btn alt xl" onClick={() => navigate("/offers")}>Browse Earning Methods</button>
          </div>
          <div className="trust-strip">
            <TrustMetric value="$0.50" label="Minimum cashout path" />
            <TrustMetric value="Review" label="Every withdrawal checked" />
            <TrustMetric value="Ledger" label="Credits and reversals tracked" />
          </div>
        </div>
        <div className="hero-product" aria-label="Earnings dashboard preview">
          <div className="dash-window">
            <div className="window-top"><span /><span /><span /><strong>EarnWave Rewards</strong></div>
            <div className="balance-panel hero-balance">
              <div>
                <p>Available balance</p>
                <div className="balance count-up">$48.75</div>
              </div>
              <span className="tag blue"><TrendingUp size={14} /> $12.40 pending review</span>
              <Meter value={76} />
              <p>Pending rewards become available after provider approval and fraud checks.</p>
            </div>
            <div className="hero-chart">
              {analyticsSeries.map((item, index) => <span key={item.day} style={{ height: `${32 + index * 7}%` }} />)}
            </div>
            <div className="feed-card">
              <div className="feed-title"><PackageCheck size={16} /> Recent verified activity</div>
              {earningsFeed.map(item => (
                <div className="feed-row" key={`${item.user}-${item.time}`}>
                  <span className="avatar">{item.user.slice(0, 1)}</span>
                  <p><strong>{item.user}</strong> {item.action}</p>
                  <strong>+{money(item.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PayoutMethodsStrip() {
  return (
    <section className="logo-band">
      <div className="container trust-logos">
        <span><CreditCard size={16} /> PayPal Payouts</span>
        <span><Gift size={16} /> Tremendous gift cards</span>
        <span><Bitcoin size={16} /> Crypto withdrawals</span>
        <span><Lock size={16} /> Manual review first</span>
      </div>
    </section>
  );
}

export function HowItWorksBlock({ SectionTitle }) {
  return (
    <section>
      <div className="container">
        <SectionTitle title="How EarnWave works" copy="A simple three-step flow from verified account to reviewed payout." />
        <div className="process-grid three-step-grid">
          {howItWorksSteps.map(([title, copy], index) => <div className="card process-card" key={title}><span className="rank">{index + 1}</span><h3>{title}</h3><p>{copy}</p></div>)}
        </div>
      </div>
    </section>
  );
}

export function RewardStatusExplainer({ SectionTitle }) {
  return (
    <section className="split-section">
      <div className="container split-grid">
        <div>
          <SectionTitle title="Pending vs available rewards" copy="EarnWave separates reward status so users understand what can be withdrawn and what is still being verified." />
          <div className="security-list">
            {rewardStatusRows.map(([title, copy]) => <div className="security-row status-explainer-row" key={title}><CheckCircle size={18} /><span><strong>{title}</strong>{copy}</span></div>)}
          </div>
        </div>
        <div className="card security-panel">
          <div className="risk-score"><span>Reward status</span><strong>Clear</strong></div>
          <div className="row"><span>Available balance</span><span className="pill">$48.75</span></div>
          <div className="row"><span>Pending verification</span><span className="pill blue">$12.40</span></div>
          <div className="row"><span>Manual payout review</span><span className="pill">Required</span></div>
        </div>
      </div>
    </section>
  );
}

export function PayoutProof({ SectionTitle }) {
  return (
    <section>
      <div className="container">
        <SectionTitle title="Payout proof, without exposing private details" copy="Example payout records are redacted to show credibility while protecting member identities and transaction data." />
        <div className="testimonial-grid">
          {payoutProofs.map(item => (
            <div className="card testimonial-card payout-proof-card" key={item.detail}>
              <div className="stars" aria-label="Verified payout"><Star size={15} /><Star size={15} /><Star size={15} /><Star size={15} /><Star size={15} /></div>
              <h3>{item.amount} via {item.method}</h3>
              <p>{item.note}</p>
              <div className="row"><div><strong>{item.name}</strong><p>{item.detail}</p></div><span className="pill blue">Redacted</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PendingRewardsFaq({ SectionTitle, FaqItem }) {
  return (
    <section>
      <div className="container faq-wrap">
        <SectionTitle title="Why rewards may pend or reverse" copy="Clear rules reduce support tickets and help users understand reward timing before they start." />
        <div className="faq-grid">
          {landingFaqs.map(([question, answer], index) => <FaqItem key={question} question={question} answer={answer} defaultOpen={index === 0} />)}
        </div>
      </div>
    </section>
  );
}

export function TrustMetric({ value, label }) {
  return <div className="trust-item"><strong>{value}</strong><p>{label}</p></div>;
}

export function StructuredFaqMarkup() {
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landingFaqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />;
}
