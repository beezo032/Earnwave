import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import {
  PackageCheck,
  ShieldCheck,
  Lock,
  Activity,
  Wallet,
  Mail,
  Users,
  Trophy,
  Flame,
  Sparkles,
  BarChart3
} from "lucide-react";
import { DashboardLayout } from "../components/Shell.jsx";
import {
  DashboardTop,
  SectionTitle,
  Feature,
  DataTable,
  MiniStat
} from "../components/OfferCard.jsx";
import { formatBalance, dollarsToWaveCoins } from "../utils.js";

export function HowItWorksPage({ navigate }) {
  const steps = [
    ["Play Games & Complete Surveys", "Choose surveys, games, apps, and offers when they are available for your account."],
    ["Earn WaveCoins", "Complete tasks and watch your WaveCoin balance grow."],
    ["Track Progress", "Monitor rewards, streaks, referrals, and account activity."],
    ["Cash Out", "Redeem PayPal cash or gift cards after payout review."]
  ];

  return (
    <main className="page">
      <div className="container">
        <DashboardTop kicker="How it works" title="How EarnWave Works" copy="Complete surveys, games, apps, and offers, earn WaveCoins, track your progress, and cash out with confidence." action={<button className="btn" onClick={() => navigate("/signup")}>Create Account</button>} />
        <div className="process-grid">
          {steps.map(([title, copy], index) => (
            <div className="card process-card" key={title}>
              <span className="rank">{index + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <div className="split-grid page-band">
          <Feature icon={<PackageCheck />} title="Clear reward status" copy="Your wallet separates pending and available WaveCoins so you know what can be cashed out." />
          <Feature icon={<ShieldCheck />} title="Reviewed payouts" copy="Payouts are reviewed before being sent to help keep EarnWave fair for real members." />
        </div>
      </div>
    </main>
  );
}

export function TrustPage({ navigate }) {
  return (
    <main className="page">
      <div className="container">
        <DashboardTop kicker="Trust" title="Why Members Trust EarnWave" copy="EarnWave keeps rewards clear, payout reviews visible, and account activity easy to follow." action={<button className="btn alt" onClick={() => navigate("/legal")}>View Policies</button>} />
        <div className="cards">
          <Feature icon={<Lock />} title="Reviewed Payouts" copy="Every payout is reviewed before processing." />
          <Feature icon={<Activity />} title="Fraud Protection" copy="Duplicate accounts and suspicious activity are monitored." />
          <Feature icon={<Wallet />} title="Transparent Rewards" copy="Track rewards through your wallet and account history." />
          <Feature icon={<Mail />} title="Support Access" copy="Get help through support when something needs review." />
        </div>
      </div>
    </main>
  );
}

export function ReferralPage({ navigate, }) {
  const { session, request, save, refreshSession, logout } = useStore();
  const user = session?.user || { referral_code: "WAVE2026", total_earned: 320.4 };
  const [growth, setGrowth] = useState({
    referralCode: user.referral_code || "WAVE2026",
    referralUrl: `${window.location.origin}/signup?ref=${user.referral_code || "WAVE2026"}`,
    referrals: 0,
    level: 7,
    xp: 640,
    nextLevelXp: 750,
    streak: 7
  });

  useEffect(() => {
    request("/growth/me").then(data => setGrowth(data.growth)).catch(() => {});
  }, []);

  return (
    <DashboardLayout active="Referrals" navigate={navigate}>
      <DashboardTop kicker="Growth" title="Referral center" copy="Share EarnWave with people who already trust your recommendations, then track progress in one place." action={<button className="btn" onClick={() => navigator.clipboard?.writeText(growth.referralUrl)}>Copy Link</button>} />
      <div className="dashboard-hero-card referral-hero">
        <div className="balance-card">
          <p>Your referral code</p>
          <strong>{growth.referralCode}</strong>
          <span>{growth.referralUrl}</span>
        </div>
        <div className="card">
          <SectionTitle title="Referral stats" copy="Built to encourage sharing without feeling spammy." />
          <div className="stats mini-stats">
            <MiniStat label="Referrals" value={growth.referrals} />
            <MiniStat label="Level" value={growth.level} />
            <MiniStat label="XP" value={growth.xp} />
            <MiniStat label="Streak" value={`${growth.streak}d`} />
          </div>
        </div>
        <div className="notification-card">
          <div className="feed-title"><Sparkles size={16} /> Share prompts</div>
          <div className="mini-alert">Invite classmates for survey streaks.</div>
          <div className="mini-alert">Share survey rewards with friends who like quick research tasks.</div>
          <div className="mini-alert">Promote PayPal cashout trust.</div>
        </div>
      </div>
      <div className="cards">
        <Feature icon={<Users />} title="Clean sharing" copy="Short code, full referral URL, and copy-first interaction." />
        <Feature icon={<Trophy />} title="Status rewards" copy="Levels and achievements make sharing feel like progress." />
        <Feature icon={<BarChart3 />} title="Referral progress" copy="Referral counts and progress rewards help you see what each invite is doing." />
      </div>
    </DashboardLayout>
  );
}

export function LeaderboardPage({ navigate, }) {
  const { session, request, save, refreshSession, logout } = useStore();
  const [leaderboard, setLeaderboard] = useState([
    { name: "WaveHunter", total_earned: 184, level: 12, streak: 14 },
    { name: "NovaEarns", total_earned: 143, level: 10, streak: 9 },
    { name: "SurveyAce", total_earned: 98, level: 8, streak: 6 }
  ]);

  useEffect(() => {
    request("/growth/leaderboard").then(data => setLeaderboard(data.leaderboard || [])).catch(() => {});
  }, []);

  return (
    <DashboardLayout active="Leaderboard" navigate={navigate}>
      <DashboardTop kicker="Community" title="Leaderboard" copy="A clean competitive layer for members building consistent reward progress." action={<span className="tag"><Flame size={14} /> Weekly reset</span>} />
      <div className="leaderboard-stage">
        {leaderboard.slice(0, 3).map((row, index) => (
          <div className={`podium-card podium-${index + 1}`} key={row.name}>
            <span className="rank">{index + 1}</span>
            <h3>{row.name}</h3>
            <strong>{formatBalance(session?.user || {}, dollarsToWaveCoins(row.total_earned))}</strong>
            <p>Level {row.level} - {row.streak} day streak</p>
          </div>
        ))}
      </div>
      <div className="card">
        <SectionTitle title="All earners" copy="Clear ranking increases retention without overwhelming new users." />
        <DataTable rows={leaderboard.map((row, index) => [
          `#${index + 1}`,
          row.name,
          formatBalance(session?.user || {}, dollarsToWaveCoins(row.total_earned)),
          `Level ${row.level}`,
          `${row.streak} days`
        ])} />
      </div>
    </DashboardLayout>
  );
}

export function LegalPage() {
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    fetch("/api/legal").then(response => response.json()).then(data => setDocs(data.docs)).catch(() => {});
  }, []);

  const fallback = {
    terms: { title: "Terms of Service", body: ["Use EarnWave lawfully, keep one accurate account, and understand that WaveCoins are promotional reward credits redeemable only through approved EarnWave payout methods.", "Rewards require valid tracking, provider confirmation, fraud review, and any required compliance checks before payout."] },
    privacy: { title: "Privacy Policy", body: ["EarnWave collects account, device, offer, payout, support, tax/KYC, consent, and fraud-prevention data to operate and secure the platform.", "Data may be processed by offerwall providers, payment processors, email providers, hosting providers, analytics tools, fraud-prevention vendors, and compliance providers."] },
    rewards: { title: "Rewards Policy", body: ["Balances are tracked in integer WaveCoins. 100 WaveCoins equals $1.00 when redeemed through an approved payout method.", "Rewards may be pending, reversed, or denied when tracking fails, provider rules are not followed, advertiser credit is reversed, or fraud review finds risk."] },
    fraud: { title: "Fraud and Account Policy", body: ["Fake identities, duplicate accounts, VPN/proxy abuse, emulators, bots, scripts, location spoofing, and misleading survey behavior are prohibited.", "EarnWave may hold rewards, deny withdrawals, close accounts, ban related accounts, and retain records needed to protect the platform."] },
    tax: { title: "Tax and KYC Policy", body: ["Users are responsible for taxes on rewards and payouts. EarnWave may require W-9, W-8, identity, country, and payout information before withdrawals.", "Payouts may be locked until required information is complete, verified, and compliant with processor and legal requirements."] }
  };

  const visibleDocs = docs || fallback;

  return (
    <main className="page">
      <div className="container">
        <SectionTitle title="Legal center" copy="Core policies for account use, privacy, rewards, fraud prevention, taxes, and payout compliance." />
        <div className="cards">
          {Object.entries(visibleDocs).map(([slug, doc]) => (
            <div className="card legal-card" key={slug}>
              <h3>{doc.title}</h3>
              {doc.body.map((line, index) => <p key={index}>{line}</p>)}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
