import React from "react";
import {
  Activity,
  ArrowRight,
  Bitcoin,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Gamepad2,
  Gift,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Wallet
} from "lucide-react";
import {
  Metric,
  SectionTitle,
  OfferCard,
  Meter,
  PaymentMethod,
  FaqItem,
  Feature
} from "../components/OfferCard.jsx";
import { PayoutProofSection } from "../components/PayoutProofSection.jsx";
import { rewardLabel } from "../utils.js";


const ENABLE_CRYPTO_WITHDRAWALS = import.meta.env.VITE_ENABLE_CRYPTO_WITHDRAWALS === "true";

const analyticsSeries = [
  { day: "Mon", revenue: 2400, payouts: 980, users: 320 },
  { day: "Tue", revenue: 3100, payouts: 1280, users: 410 },
  { day: "Wed", revenue: 2800, payouts: 1160, users: 390 },
  { day: "Thu", revenue: 3900, payouts: 1510, users: 520 },
  { day: "Fri", revenue: 4600, payouts: 1880, users: 610 },
  { day: "Sat", revenue: 5200, payouts: 2020, users: 690 },
  { day: "Sun", revenue: 4800, payouts: 1760, users: 640 }
];

const earningsFeed = [
  { user: "Maya", action: "completed a survey", amount: 6.25, time: "now" },
  { user: "Jon", action: "kept a daily streak", amount: 1.45, time: "1m" },
  { user: "Priya", action: "started an app offer", amount: 3.20, time: "3m" },
  { user: "Alex", action: "requested a PayPal payout", amount: 25.00, time: "5m" }
];

const trendingEarnCards = [
  {
    id: "home-game-offers",
    title: "Game Rewards",
    category: "Game",
    provider: "EarnWave Partners",
    rewardWaveCoins: null,
    rewardUsdCents: null,
    rewardLabel: "Reward varies",
    label: "Curated"
  },
  {
    id: "home-survey-offers",
    title: "Survey Matches",
    category: "Survey",
    provider: "CPX Research",
    rewardWaveCoins: null,
    rewardUsdCents: null,
    rewardLabel: "Reward varies",
    label: "Curated"
  },
  {
    id: "home-app-offers",
    title: "App Offers",
    category: "App",
    provider: "Offerwall Partners",
    rewardWaveCoins: null,
    rewardUsdCents: null,
    rewardLabel: "Reward varies",
    label: "Member bonus"
  },
  {
    id: "home-special-offers",
    title: "Special Offers",
    category: "Offer",
    provider: "EarnWave Partners",
    rewardWaveCoins: null,
    rewardUsdCents: null,
    rewardLabel: "Reward varies",
    label: "Member bonus"
  }
];

const faqs = [
  ["How do rewards get tracked?", "Your wallet shows pending and available WaveCoins so you can follow rewards from completion to payout."],
  ["When can I cash out?", "You can request a payout once you reach the minimum cashout. Payouts are reviewed before being sent through PayPal or gift cards."],
  ["What can I earn from?", "EarnWave is built for surveys, games, apps, offers, referrals, and daily streaks. Available partners may vary by account and region."],
  ["Why are payouts reviewed?", "Reviews help reduce duplicate accounts, suspicious activity, and reversals so rewards stay fair for real members."]
];

export function LandingPage({ navigate }) {
  return (
    <main>
      <HeroSection navigate={navigate} />
      <TrendingOffersSection navigate={navigate} />
      <WaveCoinsExplainer />
      <HowItWorksSection />
      <TrustSection />
      <PayoutMethodsSection />
      <RecentPayoutsSection />
      <PlatformBenefitsSection />
      <section className="stats-section">
        <div className="container stats-hero">
          <Metric value="4" label="Ways to earn" />
          <Metric value="PayPal" label="And gift cards" />
          <Metric value="100 WC" label="Equals $1.00" />
          <Metric value="Daily" label="Streaks and bonuses" />
        </div>
      </section>
      <FooterCTA navigate={navigate} />
    </main>
  );
}

function HeroSection({ navigate }) {
  return (
    <section className="hero">
      <div className="hero-orbit" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy-block">
          <div className="eyebrow"><ShieldCheck size={16} /> Surveys - games - apps - offers - real rewards</div>
          <h1>Earn WaveCoins. Redeem Real Rewards.</h1>
          <p className="hero-copy">Complete surveys, games, apps, and offers. Cash out with PayPal and gift cards.</p>
          <div className="actions">
            <button className="btn xl" onClick={() => navigate("/signup")}>Create Free Account <ArrowRight size={18} /></button>
            <button className="btn alt xl" onClick={() => navigate("/surveys")}>Browse Surveys</button>
          </div>
          <p className="cta-helper">Start free, earn WaveCoins, and track every reward from pending to payout.</p>
          <div className="conversion-strip" aria-label="WaveCoins conversion examples">
            <Metric value="100 WaveCoins" label="$1.00" />
            <Metric value="500 WaveCoins" label="$5.00" />
            <Metric value="1,000 WaveCoins" label="$10.00" />
          </div>
        </div>
        <div className="hero-product" aria-label="Animated earnings dashboard preview">
          <div className="dash-window">
            <div className="window-top"><span /><span /><span /><strong>EarnWave Dashboard</strong></div>
            <div className="balance-panel hero-balance">
              <div>
                <p>Ready to redeem</p>
                <div className="balance count-up">4,875 WaveCoins</div>
              </div>
              <span className="tag blue"><TrendingUp size={14} /> $48.75</span>
              <Meter value={76} />
              <p>Track every reward from start to cashout</p>
            </div>
            <div className="hero-chart">
              {analyticsSeries.map((item, index) => <span key={item.day} style={{ height: `${32 + index * 7}%` }} />)}
            </div>
            <div className="feed-card">
              <div className="feed-title"><Activity size={16} /> Live activity</div>
              {earningsFeed.map(item => (
                <div className="feed-row" key={`${item.user}-${item.time}`}>
                  <span className="avatar">{item.user.slice(0, 1)}</span>
                  <p><strong>{item.user}</strong> {item.action}</p>
                  <strong>+{rewardLabel(item.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendingOffersSection({ navigate }) {
  const cards = trendingEarnCards.map(card => ({ ...card, rewardWaveCoins: null, rewardUsdCents: null, rewardLabel: "Reward varies", label: "Curated" }));
  return (
    <section className="home-section-tight">
      <div className="container">
        <SectionTitle title="Trending Ways to Earn" copy="Pick the earning path that fits your time: games, surveys, apps, or featured offers." action={<span className="tag amber">Reward varies</span>} />
        <div className="trending-offers-grid">
          {cards.map(card => <OfferCard key={card.id} offer={{ ...card, isFeatured: true }} actionLabel="Start Earning" onStart={() => navigate("/signup")} />)}
        </div>
      </div>
    </section>
  );
}

function WaveCoinsExplainer() {
  return (
    <section className="home-section-tight">
      <div className="container">
        <SectionTitle title="WaveCoins made simple" copy="WaveCoins are EarnWave reward credits. 100 WaveCoins equals $1.00 when redeemed." />
        <div className="wavecoins-grid">
          <Metric value="100 WaveCoins" label="$1.00" />
          <Metric value="500 WaveCoins" label="$5.00" />
          <Metric value="1,000 WaveCoins" label="$10.00" />
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section>
      <div className="container">
        <SectionTitle title="How EarnWave Works" copy="Start earning in minutes, then follow your WaveCoins all the way to payout." />
        <div className="process-grid">
          <div className="card process-card"><span className="rank">1</span>   <h3>Play Games & Complete Surveys</h3><p>Choose surveys, games, apps, and offers when they are available for your account.</p></div>
          <div className="card process-card"><span className="rank">2</span>   <h3>Earn WaveCoins</h3><p>Complete tasks and watch your WaveCoin balance grow.</p></div>
          <div className="card process-card"><span className="rank">3</span>   <h3>Track Progress</h3><p>See pending rewards, available WaveCoins, streaks, referrals, and payout progress.</p></div>
          <div className="card process-card"><span className="rank">4</span>   <h3>Cash Out</h3><p>Redeem PayPal cash or gift cards after payout review.</p></div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="split-section">
      <div className="container split-grid">
        <div>
          <SectionTitle title="Rewards you can follow" copy="EarnWave shows clear reward status so users know what is pending, available, or paid." />
          <div className="security-list">
            {["Clear reward status", "Account protection", "Payout review", "Balance history"].map(item => (
              <div className="security-row" key={item}><CheckCircle size={18} /><span>{item}</span></div>
            ))}
          </div>
        </div>
        <div className="card security-panel">
          <div className="risk-score"><span>Payout status</span><strong>Reviewed before sending</strong></div>
          <Meter value={72} />
          <div className="row"><span>Reward status</span><span className="pill">Visible</span></div>
          <div className="row"><span>Withdrawal status</span><span className="pill blue">Reviewed</span></div>
          <div className="row"><span>Balance changes</span><span className="pill">Recorded</span></div>
        </div>
      </div>
    </section>
  );
}

function PayoutMethodsSection() {
  const methods = [
    <PaymentMethod key="paypal" icon={<CreditCard />} title="PayPal Cash" copy="Receive cash to your PayPal account after review." />,
    <PaymentMethod key="tremendous" icon={<Gift />} title="Gift Cards" copy="Redeem popular gift cards after payout review." />,
    <PaymentMethod key="manual" icon={<Wallet />} title="Payout Review" copy="Payouts are checked before they are sent." />
  ];
  if (ENABLE_CRYPTO_WITHDRAWALS) {
    methods.push(<PaymentMethod key="crypto" icon={<Bitcoin />} title="Crypto withdrawals" copy="Optional stablecoin-ready workflow when enabled." />);
  }
  return (
    <section>
      <div className="container">
        <SectionTitle title="Payouts with confidence built in" copy="Start with PayPal and gift cards. More payout options can be added later." />
        <div className="payment-grid">{methods}</div>
      </div>
    </section>
  );
}

function RecentPayoutsSection() {
  return (
    <section>
      <div className="container">
        <PayoutProofSection />
      </div>
    </section>
  );
}

function PlatformBenefitsSection() {
  const benefitCards = [
    { icon: <ClipboardList />, title: "Built for Students", copy: "Quick earning options, simple WaveCoin tracking, and payout progress that fits between classes or shifts." },
    { icon: <Gamepad2 />, title: "Built for Gamers", copy: "Game-style goals, streaks, levels, and reward paths make earning feel active instead of boring." },
    { icon: <Rocket />, title: "Built for Side Hustlers", copy: "Surveys, apps, offers, referrals, and reviewed payouts give casual earners a clear place to build momentum." }
  ];
  return (
    <section>
      <div className="container">
        <SectionTitle title="Who EarnWave is built for" copy="A rewards marketplace for people who want simple earning paths, clear balances, and real cashout options." />
        <div className="benefit-grid">
          {benefitCards.map(item => <Feature key={item.title} {...item} />)}
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ navigate }) {
  return (
    <section>
      <div className="container faq-wrap">
        <SectionTitle title="FAQ" copy="Straight answers help users trust the product before they create an account." />
        <div className="faq-grid">
          {faqs.map(([question, answer], index) => <FaqItem key={question} question={question} answer={answer} defaultOpen={index === 0} />)}
        </div>
        <div className="final-cta">
          <div>
            <h2>Start earning WaveCoins today.</h2>
            <p>Complete surveys, games, apps, and offers, then redeem through PayPal or gift cards.</p>
          </div>
          <button className="btn xl" onClick={() => navigate("/signup")}>Create Free Account <ArrowRight size={18} /></button>
        </div>
      </div>
    </section>
  );
}
