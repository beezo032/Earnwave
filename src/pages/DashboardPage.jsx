import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock,
  Flame,
  Lock,
  Medal,
  Rocket,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  TrendingUp,
  CheckCircle,
  CreditCard,
  Gift,
  ClipboardList
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  SectionTitle,
  OfferCard,
  Meter,
  Stat,
  MiniStat,
  Metric,
  Feature
} from "../components/OfferCard.jsx";
import { DashboardLayout } from "../components/Shell.jsx";
import { PayoutProofSection } from "../components/PayoutProofSection.jsx";
import {
  formatBalance,
  dollarsToWaveCoins,
  userAmountWaveCoins,
  recordActivityMetric,
  rewardLabel
} from "../utils.js";

const ENABLE_TRENDING_MOCK_OFFERS = import.meta.env.VITE_ENABLE_TRENDING_MOCK_OFFERS === "true";

const analyticsSeries = [
  { day: "Mon", revenue: 2400, payouts: 980, users: 320 },
  { day: "Tue", revenue: 3100, payouts: 1280, users: 410 },
  { day: "Wed", revenue: 2800, payouts: 1160, users: 390 },
  { day: "Thu", revenue: 3900, payouts: 1510, users: 520 },
  { day: "Fri", revenue: 4600, payouts: 1880, users: 610 },
  { day: "Sat", revenue: 5200, payouts: 2020, users: 690 },
  { day: "Sun", revenue: 4800, payouts: 1760, users: 640 }
];

export function Dashboard({ api, navigate }) {
  const [user, setUser] = useState(api.session?.user || { name: "EarnWave User", balance: 48.75, total_earned: 320.4 });
  const [growth, setGrowth] = useState({
    referralCode: user.referral_code || "WAVE2026",
    referralUrl: `${window.location.origin}/signup?ref=${user.referral_code || "WAVE2026"}`,
    level: user.level || 7,
    xp: user.xp || 640,
    nextLevelXp: 750,
    streak: user.streak_count || 7,
    referrals: 0
  });
  const [leaderboard, setLeaderboard] = useState([
    { name: "WaveHunter", total_earned: 184, level: 12, streak: 14 },
    { name: "NovaEarns", total_earned: 143, level: 10, streak: 9 },
    { name: "SurveyAce", total_earned: 98, level: 8, streak: 6 }
  ]);
  const [dailyQuest, setDailyQuest] = useState(null);
  const [bonusCode, setBonusCode] = useState("");
  const [growthNotice, setGrowthNotice] = useState("Claim daily streaks and redeem bonus codes to level up faster.");

  useEffect(() => {
    refreshUser();
    api.request("/growth/me").then(data => setGrowth(data.growth)).catch(() => {});
    api.request("/growth/leaderboard/weekly").then(data => setLeaderboard(data.leaderboard || [])).catch(() => {
      api.request("/growth/leaderboard").then(data => setLeaderboard(data.leaderboard || [])).catch(() => {});
    });
    api.request("/growth/quests/daily").then(data => setDailyQuest(data.quest)).catch(() => {});
  }, []);

  useEffect(() => {
    if (api.session?.user) setUser(api.session.user);
  }, [api.session?.user?.balance_wavecoins, api.session?.user?.pending_wavecoins, api.session?.user?.total_earned_wavecoins]);

  async function refreshUser() {
    try {
      const data = await api.request("/auth/me");
      if (data.user) {
        setUser(data.user);
        if (api.session) api.save({ ...api.session, user: data.user });
      }
    } catch (error) {
      // Dashboard can still render from the current session if refresh fails.
    }
  }

  async function claimStreak() {
    try {
      const result = await api.request("/growth/streak/claim", { method: "POST", body: "{}" });
      if (result.growth) setGrowth(result.growth);
      if (result.claimed) await refreshUser();
      setGrowthNotice(result.claimed ? `Streak claimed: +${rewardLabel(result.reward)} and +${result.xp} XP.` : result.message);
    } catch (error) {
      setGrowthNotice(error.message);
    }
  }

  async function redeemCode(event) {
    event.preventDefault();
    try {
      const result = await api.request("/growth/bonus-codes/redeem", {
        method: "POST",
        body: JSON.stringify({ code: bonusCode })
      });
      if (result.growth) setGrowth(result.growth);
      await refreshUser();
      setBonusCode("");
      setGrowthNotice(`Code ${result.code} redeemed: +${rewardLabel(result.reward)} and +${result.xp} XP.`);
    } catch (error) {
      setGrowthNotice(error.message);
    }
  }

  async function completeQuest() {
    if (!dailyQuest?.id) return;
    try {
      const result = await api.request(`/growth/quests/${dailyQuest.id}/complete`, { method: "POST", body: "{}" });
      if (result.quest) setDailyQuest(result.quest);
      if (result.growth) setGrowth(result.growth);
      await refreshUser();
      setGrowthNotice(`Daily quest complete: +${rewardLabel(result.quest.reward)} and +${result.quest.xp} XP.`);
    } catch (error) {
      setGrowthNotice(error.message);
    }
  }

  function trackActivity(type) {
    recordActivityMetric(type);
  }

  const balanceWaveCoins = userAmountWaveCoins(user, user.balance);
  const totalEarnedWaveCoins = userAmountWaveCoins(user, user.total_earned, "total_earned_wavecoins");
  const pendingWaveCoins = Number(user.pending_wavecoins ?? user.pending_rewards_wavecoins ?? dollarsToWaveCoins(user.pending_rewards || 0));
  const completedSurveys = Number(user.completed_surveys || user.completed_offers || 0);
  const minimumCashoutWaveCoins = 500;
  const cashoutProgress = Math.min(100, Math.round((balanceWaveCoins / minimumCashoutWaveCoins) * 100));
  const hasRealActivityData = completedSurveys > 0 && totalEarnedWaveCoins >= minimumCashoutWaveCoins;

  return (
    <DashboardLayout active="Dashboard" navigate={navigate} api={api}>
      <DashboardRewardSummary
        user={user}
        growth={growth}
        balanceWaveCoins={balanceWaveCoins}
        pendingWaveCoins={pendingWaveCoins}
        minimumCashoutWaveCoins={minimumCashoutWaveCoins}
        cashoutProgress={cashoutProgress}
        navigate={navigate}
      />
      <div className="dashboard-notices compact" aria-label="Dashboard trust notices">
        <div className="dashboard-notice"><ShieldCheck size={18} /><span>Rewards are verified before payout.</span></div>
        <div className="dashboard-notice blue"><Lock size={18} /><span>Withdrawals are reviewed for fraud protection.</span></div>
      </div>
      <FastestPathToCashout navigate={navigate} claimStreak={claimStreak} trackActivity={trackActivity} />
      <div className="dashboard-focus-grid">
        <AvailableSurveyOffers navigate={navigate} />
        <div className="dashboard-side-stack">
          <DailyBonusFeature growth={growth} dailyQuest={dailyQuest} claimStreak={claimStreak} completeQuest={completeQuest} growthNotice={growthNotice} />
          <ReferralProgressFeature growth={growth} />
        </div>
      </div>
      {hasRealActivityData ? (
        <div className="dashboard-hero-card">
          <div className="analytics-card">
            <div className="mini-chart-head">
              <div><p>7-day earning trend</p><strong>{formatBalance(user, totalEarnedWaveCoins)}</strong></div>
              <span className="tag"><TrendingUp size={14} /> Healthy</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={analyticsSeries}>
                <defs>
                  <linearGradient id="earnWaveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32e6a1" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#46c7ff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="day" stroke="#9aa8ba" />
                <YAxis stroke="#9aa8ba" />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#32e6a1" fill="url(#earnWaveGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <AccountOverview
          user={user}
          growth={growth}
          totalEarnedWaveCoins={totalEarnedWaveCoins}
          pendingWaveCoins={pendingWaveCoins}
          completedSurveys={completedSurveys}
        />
      )}
      <PayoutProofSection compact />
      <AchievementBadges growth={growth} totalEarnedWaveCoins={totalEarnedWaveCoins} completedSurveys={completedSurveys} />
      <div className="workspace-grid lower-dashboard-grid">
        <div className="card">
          <SectionTitle title="Bonus tools" copy="Extra ways to build momentum after your next survey completion." action={<span className="tag">Optional boosts</span>} />
          <div className="bonus-form-card">
            <form className="bonus-form" onSubmit={redeemCode}>
              <input value={bonusCode} onChange={event => setBonusCode(event.target.value)} placeholder="WELCOME" />
              <button className="btn" type="submit">Redeem</button>
            </form>
            <div className="notice">{growthNotice}</div>
          </div>
        </div>
        <LeaderboardPreview leaderboard={leaderboard} />
      </div>
    </DashboardLayout>
  );
}

function DashboardRewardSummary({ user, growth, balanceWaveCoins, pendingWaveCoins, minimumCashoutWaveCoins, cashoutProgress, navigate }) {
  const remaining = Math.max(0, minimumCashoutWaveCoins - balanceWaveCoins);
  const summaryCards = [
    { label: "Current balance", value: formatBalance(user, balanceWaveCoins), icon: <Wallet size={19} />, tone: "mint" },
    { label: "Pending rewards", value: formatBalance({ preferredBalanceDisplay: "coins" }, pendingWaveCoins), icon: <Clock size={19} />, tone: "blue" },
    { label: "Level", value: `Level ${growth.level || 1}`, icon: <Trophy size={19} />, tone: "gold" },
    { label: "Daily streak", value: `${growth.streak || 0} days`, icon: <Flame size={19} />, tone: "mint" }
  ];

  return (
    <section className="dashboard-summary" aria-label="Dashboard reward summary">
      <div className="summary-hero-card">
        <span className="eyebrow">Rewards dashboard</span>
        <h1>{formatBalance(user, balanceWaveCoins)}</h1>
        <p>{remaining > 0 ? `${remaining.toLocaleString()} WaveCoins until your first cashout.` : "You are eligible to request a payout."}</p>
        <div className="cashout-track">
          <div className="row"><span>Cashout progress</span><strong>{balanceWaveCoins.toLocaleString()} / {minimumCashoutWaveCoins.toLocaleString()} WaveCoins</strong></div>
          <Meter value={cashoutProgress} />
        </div>
        <button className="btn summary-cta" onClick={() => navigate("/surveys")}>Start Best Survey <ArrowRight size={17} /></button>
      </div>
      <div className="summary-metric-grid">
        {summaryCards.map(card => (
          <div className={`summary-metric-card ${card.tone}`} key={card.label}>
            <span>{card.icon}</span>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FastestPathToCashout({ navigate, claimStreak, trackActivity }) {
  const actions = [
    {
      title: "Complete TheoremReach survey wall",
      reward: "+385 WaveCoins",
      time: "Estimated time: 8-12 minutes",
      copy: "Best first step for a larger survey reward estimate.",
      cta: "Open TheoremReach",
      action: () => {
        trackActivity("surveyStarts");
        navigate("/surveys");
      }
    },
    {
      title: "Complete CPX Research survey wall",
      reward: "+298 WaveCoins",
      time: "Estimated time: 8-12 minutes",
      copy: "Matched surveys based on your profile and region.",
      cta: "Open CPX",
      action: () => {
        trackActivity("surveyStarts");
        navigate("/surveys");
      }
    },
    {
      title: "Claim daily bonus",
      reward: "Bonus WaveCoins",
      time: "Estimated time: under 1 minute",
      copy: "Claim once per day to keep your streak moving.",
      cta: "Claim Bonus",
      action: claimStreak
    }
  ];

  return (
    <section className="fastest-path-section">
      <SectionTitle title="Fastest Path to Cashout" copy="Start with the actions most likely to move your 500 WaveCoins cashout bar today." action={<span className="tag"><Rocket size={14} /> Recommended</span>} />
      <div className="fastest-path-grid">
        {actions.map((item, index) => (
          <button className="path-card" key={item.title} onClick={item.action} type="button">
            <span className="path-rank">{index + 1}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <small>{item.time}</small>
            </div>
            <strong>{item.reward}</strong>
            <em>{item.cta} <ArrowRight size={15} /></em>
          </button>
        ))}
      </div>
    </section>
  );
}

function AvailableSurveyOffers({ navigate }) {
  const providers = [
    {
      name: "CPX Research",
      reward: "+298 WaveCoins estimate",
      provider: "EarnWave",
      description: "Profile-matched surveys with server-side reward callbacks.",
      cta: "Open CPX",
      icon: <Search size={22} />
    },
    {
      name: "TheoremReach",
      reward: "+385 WaveCoins estimate",
      provider: "TheoremReach",
      description: "Trusted survey wall with verified tracking before rewards become available.",
      cta: "Open TheoremReach",
      icon: <ClipboardList size={22} />
    }
  ];

  return (
    <section className="card dashboard-offer-panel">
      <SectionTitle title="Available Offers" copy="Choose a trusted survey provider. Final rewards verify after provider review." action={<span className="tag">Available</span>} />
      <div className="provider-action-grid">
        {providers.map(provider => (
          <div className="provider-action-card" key={provider.name}>
            <div className="provider-action-top">
              <span className="icon">{provider.icon}</span>
              <span className="pill">Available</span>
            </div>
            <h3>{provider.name}</h3>
            <p>{provider.description}</p>
            <div className="provider-action-meta">
              <span className="tag blue">Provider: {provider.provider}</span>
              <span className="tag amber">{provider.reward || "Reward varies"}</span>
            </div>
            <div className="provider-trust-note"><ShieldCheck size={15} /> Rewards verify after provider review</div>
            <button className="btn" onClick={() => navigate("/surveys")}>{provider.cta} <ArrowRight size={16} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyBonusFeature({ growth, dailyQuest, claimStreak, completeQuest, growthNotice }) {
  return (
    <section className="card daily-bonus-feature">
      <div className="daily-bonus-glow"><Gift size={24} /></div>
      <span className="eyebrow">Daily bonus</span>
      <h3>{growth.streak || 0} day streak</h3>
      <p>Claim once per day. Keeping the streak alive helps build your first-cashout momentum.</p>
      <div className="daily-bonus-meta">
        <span className="tag amber">Bonus WaveCoins</span>
        {dailyQuest && <span className="tag blue">Quest: {dailyQuest.status || "available"}</span>}
      </div>
      <div className="daily-bonus-actions">
        <button className="btn" onClick={claimStreak}>Claim Daily Bonus</button>
        {dailyQuest && (
          <button className="btn alt" disabled={dailyQuest.status === "completed"} onClick={completeQuest}>
            {dailyQuest.status === "completed" ? "Quest Complete" : "Complete Quest"}
          </button>
        )}
      </div>
      <div className="notice">{growthNotice}</div>
    </section>
  );
}

function ReferralProgressFeature({ growth }) {
  const [copied, setCopied] = useState(false);
  const referralProgress = growth.referralProgress || { referrals: growth.referrals || 0, target: 5, progress: Math.min(100, Math.round(((growth.referrals || 0) / 5) * 100)) };

  async function copyLink() {
    await navigator.clipboard?.writeText(growth.referralUrl || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="card referral-feature-card">
      <span className="eyebrow">Referral progress</span>
      <div className="row"><h3>{growth.referralCode}</h3><span className="pill">{referralProgress.referrals}/{referralProgress.target}</span></div>
      <div className="copy-box">{growth.referralUrl}</div>
      <Meter value={referralProgress.progress || 0} />
      <p>Invite verified users and earn referral rewards.</p>
      <button className="btn alt" onClick={copyLink}>{copied ? "Copied" : "Copy Link"}</button>
    </section>
  );
}

function AccountOverview({ user, growth, totalEarnedWaveCoins, pendingWaveCoins, completedSurveys }) {
  const items = [
    { label: "Total earned", value: formatBalance(user, totalEarnedWaveCoins) },
    { label: "Surveys completed", value: completedSurveys },
    { label: "Pending rewards", value: formatBalance({ preferredBalanceDisplay: "coins" }, pendingWaveCoins) },
    { label: "Referrals", value: growth.referrals || 0 },
    { label: "Level", value: growth.level || 1 },
    { label: "Daily streak", value: `${growth.streak || 0} days` }
  ];

  return (
    <section className="card account-overview-panel">
      <SectionTitle title="Account Overview" copy="Your chart will unlock after enough real earning activity is available." action={<span className="tag blue">New account view</span>} />
      <div className="account-overview-grid">
        {items.map(item => <Stat key={item.label} label={item.label} value={item.value} />)}
      </div>
    </section>
  );
}

function AchievementBadges({ growth, totalEarnedWaveCoins, completedSurveys }) {
  const achievements = [
    { title: "First Survey", unlocked: completedSurveys > 0 || totalEarnedWaveCoins > 0, icon: <CheckCircle size={18} /> },
    { title: "First Cashout", unlocked: false, icon: <CreditCard size={18} /> },
    { title: "3 Day Streak", unlocked: Number(growth.streak || 0) >= 3, icon: <Flame size={18} /> },
    { title: "5 Referrals", unlocked: Number(growth.referrals || 0) >= 5, icon: <Users size={18} /> },
    { title: "Level 5", unlocked: Number(growth.level || 1) >= 5, icon: <Medal size={18} /> }
  ];

  return (
    <section className="card achievements-panel">
      <SectionTitle title="Achievements" copy="Milestones that help members build daily earning habits." />
      <div className="achievement-grid">
        {achievements.map(item => (
          <div className={item.unlocked ? "achievement-badge unlocked" : "achievement-badge locked"} key={item.title}>
            <span>{item.icon}</span>
            <strong>{item.title}</strong>
            <small>{item.unlocked ? "Unlocked" : "Locked"}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeaderboardPreview({ leaderboard }) {
  return (
    <section className="card leaderboard-preview-card">
      <SectionTitle title="Weekly leaderboard" copy="Friendly competition resets weekly." action={<span className="tag"><Trophy size={14} /> Live</span>} />
      {leaderboard.slice(0, 5).map((row, index) => (
        <div className="leader-row" key={`${row.name}-${index}`}>
          <span className="avatar">{index + 1}</span>
          <strong>{row.name}</strong>
          <span className="pill">{rewardLabel(row.total_earned)}</span>
        </div>
      ))}
    </section>
  );
}

export function OnboardingChecklist({ user, navigate }) {
  const balanceWaveCoins = userAmountWaveCoins(user, user.balance);
  const minimumCashout = 500;
  const interestLabel = user.earning_interests || user.interests || "";
  const hasInterests = Boolean(String(interestLabel).trim());
  const hasProfile = Boolean(user.username && user.name && (user.country || user.bio || user.timezone));
  const hasStarted = Number(user.total_earned_wavecoins || 0) > 0 || Number(user.total_earned || 0) > 0 || Number(user.completed_offers || 0) > 0;
  const steps = [
    {
      title: "Verify email",
      copy: "Confirm your email before reward and payout access.",
      done: Boolean(user.email_verified),
      action: "Verify",
      route: `/verify-email?email=${encodeURIComponent(user.email || "")}`
    },
    {
      title: "Complete profile",
      copy: "Add username, country, timezone, and reward preferences.",
      done: hasProfile,
      action: "Edit profile",
      route: "/profile"
    },
    {
      title: "Choose earning interests",
      copy: "Choose your survey interests to personalize EarnWave.",
      done: hasInterests,
      action: "Set interests",
      route: "/profile"
    },
    {
      title: "Start first offer",
      copy: "Launch a CPX or TheoremReach survey to create your first ledger event.",
      done: hasStarted,
      action: "Browse surveys",
      route: "/surveys"
    },
    {
      title: "Reach first cashout",
      copy: `${Math.max(0, minimumCashout - balanceWaveCoins).toLocaleString()} WaveCoins left until your first payout request.`,
      done: balanceWaveCoins >= minimumCashout,
      action: "Open wallet",
      route: "/wallet"
    }
  ];
  const completed = steps.filter(step => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <section className="onboarding-panel" aria-label="New member onboarding">
      <div className="onboarding-head">
        <div>
          <p>Start strong</p>
          <h2>Finish your EarnWave setup</h2>
          <span>{completed} of {steps.length} steps complete</span>
        </div>
        <div className="onboarding-progress">
          <strong>{progress}%</strong>
          <Meter value={progress} />
        </div>
      </div>
      <div className="onboarding-steps">
        {steps.map(step => (
          <button className={step.done ? "onboarding-step done" : "onboarding-step"} key={step.title} onClick={() => navigate(step.route)} type="button">
            <span>{step.done ? <CheckCircle size={18} /> : <Rocket size={18} />}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.copy}</p>
            </div>
            <em>{step.done ? "Done" : step.action}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
