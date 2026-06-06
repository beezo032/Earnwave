import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bitcoin,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  Flame,
  Gamepad2,
  Gift,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Medal,
  PackageCheck,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Smartphone,
  TrendingUp,
  Trophy,
  Users,
  Wallet
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./styles.css";

const demoOffers = [
  { id: 1, title: "Kingdom Builder", category: "Games", reward: 28.4, description: "Reach castle level 10 and keep the app installed for tracking.", difficulty: "Medium", time: "2-4 days", provider: "AdGem" },
  { id: 2, title: "Consumer Pulse Survey", category: "Surveys", reward: 4.25, description: "Answer a short brand research survey with instant credit.", difficulty: "Easy", time: "8 min", provider: "BitLabs" },
  { id: 3, title: "Streaming App Trial", category: "Apps", reward: 11, description: "Start a partner trial and confirm your first app session.", difficulty: "Easy", time: "15 min", provider: "Lootably" },
  { id: 4, title: "Budget Card Signup", category: "Finance", reward: 36, description: "Open a free finance account and complete identity verification.", difficulty: "Advanced", time: "1 day", provider: "RevU" },
  { id: 5, title: "Daily Check-in", category: "Bonus", reward: .75, description: "Claim today's streak reward and keep your bonus multiplier alive.", difficulty: "Easy", time: "1 min", provider: "EarnWave" },
  { id: 6, title: "Puzzle Sprint", category: "Games", reward: 17.8, description: "Complete 20 puzzle rounds in a new mobile game.", difficulty: "Medium", time: "1-2 days", provider: "Torox" }
];

const analyticsSeries = [
  { day: "Mon", revenue: 2400, payouts: 980, users: 320 },
  { day: "Tue", revenue: 3100, payouts: 1280, users: 410 },
  { day: "Wed", revenue: 2800, payouts: 1160, users: 390 },
  { day: "Thu", revenue: 3900, payouts: 1510, users: 520 },
  { day: "Fri", revenue: 4600, payouts: 1880, users: 610 },
  { day: "Sat", revenue: 5200, payouts: 2020, users: 690 },
  { day: "Sun", revenue: 4800, payouts: 1760, users: 640 }
];

const categoryRows = [
  { name: "Games", value: 42 },
  { name: "Surveys", value: 28 },
  { name: "Apps", value: 19 },
  { name: "Finance", value: 7 },
  { name: "Bonus", value: 4 }
];

const earningsFeed = [
  { user: "Maya", action: "completed a finance survey", amount: 6.25, time: "now" },
  { user: "Jon", action: "hit a 9-day streak", amount: 1.45, time: "1m" },
  { user: "Priya", action: "finished a game quest", amount: 18.80, time: "3m" },
  { user: "Alex", action: "cashed out to PayPal", amount: 25.00, time: "5m" }
];

const testimonials = [
  { name: "Nia R.", role: "College student", quote: "The dashboard makes it obvious what to do next. I use streaks between classes and cash out small wins weekly." },
  { name: "Marcus T.", role: "Remote support lead", quote: "It feels more like a finance app than a rewards site. The payout review status and ledger history are what sold me." },
  { name: "Elena G.", role: "Budget-focused parent", quote: "Simple, clear, and not noisy. I can check offers, see risk-free payout choices, and move on with my day." }
];

const faqs = [
  ["How do rewards get tracked?", "EarnWave records offerwall callbacks, device signals, ledger entries, and provider transaction IDs so credits can be reviewed cleanly."],
  ["When can I cash out?", "The platform supports low minimum withdrawals, with manual review before PayPal, gift card, or crypto payout automation."],
  ["Is this only for gamers?", "No. The experience is built for surveys, apps, games, finance offers, referrals, daily streaks, and side-income workflows."],
  ["How is fraud handled?", "VPN/proxy checks, device fingerprinting, duplicate-account signals, suspicious activity flags, and withdrawal review queues protect users and the business."]
];

const defaultOfferwallProviders = {
  cpx: { key: "cpx", name: "CPX Research", enabled: false },
  adgate: { key: "adgate", name: "AdGate", enabled: false },
  bitlabs: { key: "bitlabs", name: "BitLabs", enabled: false },
  lootably: { key: "lootably", name: "Lootably", enabled: false },
  timewall: { key: "timewall", name: "TimeWall", enabled: false },
  ayet: { key: "ayet", name: "Ayet Studios", enabled: false }
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function getDeviceFingerprint() {
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

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(path) {
    window.history.pushState({}, "", path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return [route, navigate];
}

function useApi() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("earnwave_session") || "null"));

  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    headers["x-device-hash"] = await getDeviceFingerprint();

    const response = await fetch(`/api${path}`, { ...options, headers, credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "EarnWave API request failed");
    return payload;
  }

  function save(nextSession) {
    localStorage.setItem("earnwave_session", JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function logout() {
    localStorage.removeItem("earnwave_session");
    setSession(null);
  }

  return { session, request, save, logout };
}

function Shell({ route, navigate, api, children }) {
  const isAuthed = Boolean(api.session?.user);
  const isAdmin = api.session?.user?.role === "admin";
  const navItems = [
    ["/offers", "Offers"],
    ["/dashboard", "Dashboard"],
    ["/wallet", "Wallet"],
    ["/referrals", "Referrals"]
  ];
  const adminItems = isAdmin ? [["/analytics", "Analytics"], ["/admin", "Admin"]] : [];

  return (
    <>
      <header className="header">
        <div className="container nav">
          <button className="logo ghost" onClick={() => navigate("/")} aria-label="EarnWave home">
            <BrandLogo />
          </button>
          <nav className="nav-links">
            {[...navItems, ...adminItems].map(([path, label]) => (
              <button key={path} className={route === path ? "active-link" : ""} onClick={() => navigate(path)}>{label}</button>
            ))}
            {isAuthed ? (
              <button className="icon-link" onClick={() => { api.logout(); navigate("/"); }}><LogOut size={17} /> Logout</button>
            ) : (
              <>
                <button onClick={() => navigate("/login")}>Log in</button>
                <button className="btn" onClick={() => navigate("/signup")}>Join Free</button>
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
      <Footer navigate={navigate} />
    </>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <BrandLogo compact />
          <p>A premium rewards platform for surveys, games, apps, streaks, referrals, and reviewed payouts.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => navigate("/how-it-works")}>How It Works</button>
          <button onClick={() => navigate("/trust")}>Trust</button>
          <button onClick={() => navigate("/support")}>Support</button>
          <button onClick={() => navigate("/legal")}>Legal</button>
        </div>
      </div>
    </footer>
  );
}

function Landing({ navigate }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-orbit" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy-block">
            <div className="eyebrow"><ShieldCheck size={16} /> Verified accounts - reviewed payouts - transparent rewards</div>
            <h1>The smarter way to turn free time into real rewards.</h1>
            <p className="hero-copy">EarnWave brings premium offer discovery, account protection, progress tracking, and payout confidence into one modern rewards experience.</p>
            <div className="actions">
              <button className="btn xl" onClick={() => navigate("/signup")}>Create Verified Account <ArrowRight size={18} /></button>
              <button className="btn alt xl" onClick={() => navigate("/offers")}>Explore Reward Options</button>
            </div>
            <div className="trust-strip">
              <Metric value="$0.50" label="Starter cashout path" />
              <Metric value="Review" label="Every withdrawal checked" />
              <Metric value="Verified" label="Account-first earning" />
            </div>
          </div>
          <div className="hero-product" aria-label="Animated earnings dashboard preview">
            <div className="dash-window">
              <div className="window-top"><span /><span /><span /><strong>EarnWave Live</strong></div>
              <div className="balance-panel hero-balance">
                <div>
                  <p>Ready to cash out</p>
                  <div className="balance count-up">$48.75</div>
                </div>
                <span className="tag blue"><TrendingUp size={14} /> +18.4%</span>
                <Meter value={76} />
                <p>76% toward today&apos;s progress tier</p>
              </div>
              <div className="hero-chart">
                {analyticsSeries.map((item, index) => <span key={item.day} style={{ height: `${32 + index * 7}%` }} />)}
              </div>
              <div className="feed-card">
                <div className="feed-title"><Activity size={16} /> Real-time earnings</div>
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

      <section className="logo-band">
        <div className="container trust-logos">
          <span><Lock size={16} /> Manual payout review</span>
          <span><ShieldCheck size={16} /> Fraud monitoring</span>
          <span><CreditCard size={16} /> PayPal</span>
          <span><Gift size={16} /> Gift cards</span>
          <span><Bitcoin size={16} /> Crypto-ready</span>
        </div>
      </section>

      <section>
        <div className="container">
          <SectionTitle title="How EarnWave works" copy="A simple, transparent flow designed to keep members informed from signup to payout." />
          <div className="process-grid">
            <div className="card process-card"><span className="rank">1</span><h3>Verify your account</h3><p>Create your profile, confirm your email, and start with a trusted account foundation.</p></div>
            <div className="card process-card"><span className="rank">2</span><h3>Choose reward paths</h3><p>Browse surveys, games, apps, and bonuses with clear reward values and provider labels.</p></div>
            <div className="card process-card"><span className="rank">3</span><h3>Track progress</h3><p>Follow completions, streaks, referrals, and account activity from your member dashboard.</p></div>
            <div className="card process-card"><span className="rank">4</span><h3>Cash out confidently</h3><p>Submit withdrawals into a review-first payout flow built for trust and accountability.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <SectionTitle title="Built for modern earners" copy="A focused rewards flow for students, gamers, side hustlers, remote workers, survey users, crypto users, and budget-conscious adults." />
          <div className="cards">
            <Feature icon={<Gamepad2 />} title="Clear reward discovery" copy="Reward value, provider, category, difficulty, and timing are shown up front so members can choose with confidence." />
            <Feature icon={<ShieldCheck />} title="Trust-first by design" copy="Verified accounts, ledger history, fraud review, and payout status make the platform feel accountable from day one." />
            <Feature icon={<Sparkles />} title="Momentum without noise" copy="Streaks, levels, referrals, leaderboards, and bonus codes encourage daily progress without clutter." />
          </div>
        </div>
      </section>

      <section className="split-section">
        <div className="container split-grid">
          <div>
            <SectionTitle title="Safety users can see" copy="EarnWave makes trust visible with verified accounts, reviewed payouts, fraud signals, support access, and transparent account controls." />
            <div className="security-list">
              {["VPN/proxy detection", "Device fingerprinting", "Duplicate account checks", "Withdrawal review queue"].map(item => (
                <div className="security-row" key={item}><CheckCircle size={18} /><span>{item}</span></div>
              ))}
            </div>
          </div>
          <div className="card security-panel">
            <div className="risk-score"><span>Risk monitor</span><strong>Low</strong></div>
            <Meter value={18} />
            <div className="row"><span>Session integrity</span><span className="pill">Verified</span></div>
            <div className="row"><span>Payout review</span><span className="pill blue">Queued</span></div>
            <div className="row"><span>Ledger audit</span><span className="pill">Synced</span></div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <SectionTitle title="Payouts with confidence built in" copy="Members can choose familiar redemption paths while EarnWave keeps manual review and auditability in place." />
          <div className="payment-grid">
            <PaymentMethod icon={<CreditCard />} title="PayPal Payouts" copy="Fast digital cashouts after moderation approval." />
            <PaymentMethod icon={<Gift />} title="Tremendous cards" copy="Gift card delivery for flexible reward redemption." />
            <PaymentMethod icon={<Bitcoin />} title="Crypto withdrawals" copy="Stablecoin-ready workflow for crypto-native users." />
            <PaymentMethod icon={<Wallet />} title="Manual queue" copy="Every payout starts reviewed before automation dispatches." />
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container stats-hero">
          <Metric value="6" label="Provider paths supported" />
          <Metric value="100%" label="Payouts reviewed first" />
          <Metric value="18-55" label="Designed across generations" />
          <Metric value="Daily" label="Progress loops built in" />
        </div>
      </section>

      <section>
        <div className="container">
          <SectionTitle title="Designed around real routines" copy="EarnWave stays clear and credible whether someone earns between classes, after work, during game time, or as a steady side routine." />
          <div className="testimonial-grid">
            {testimonials.map(item => <Testimonial key={item.name} {...item} />)}
          </div>
        </div>
      </section>

      <section>
        <div className="container split-grid">
          <div>
            <SectionTitle title="Momentum you can feel" copy="Social proof stays clean: visible activity, clear rewards, and a simple path for new members to start building progress." />
            <div className="top-earners">
              {[
                { name: "WaveHunter", amount: 184.2, badge: "Games" },
                { name: "NovaEarns", amount: 143.75, badge: "Surveys" },
                { name: "CryptoMia", amount: 121.4, badge: "Crypto" }
              ].map((row, index) => (
                <div className="earner-row" key={row.name}>
                  <span className="rank">{index + 1}</span>
                  <div><strong>{row.name}</strong><p>{row.badge} streak active</p></div>
                  <span className="reward">{money(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card social-proof-card">
            <div className="icon"><Users /></div>
            <h3>Designed for daily retention</h3>
            <p>Levels, streaks, bonus codes, referral sharing, and public rankings give users a reason to come back without turning the product into clutter.</p>
            <button className="btn alt" onClick={() => navigate("/leaderboard")}>View Leaderboard</button>
          </div>
        </div>
      </section>

      <section>
        <div className="container faq-wrap">
          <SectionTitle title="FAQ" copy="Straight answers help users trust the product before they create an account." />
          <div className="faq-grid">
            {faqs.map(([question, answer], index) => <FaqItem key={question} question={question} answer={answer} defaultOpen={index === 0} />)}
          </div>
          <div className="final-cta">
            <h2>Start verified. Track progress. Cash out confidently.</h2>
            <button className="btn xl" onClick={() => navigate("/signup")}>Create Your Account <ArrowRight size={18} /></button>
          </div>
        </div>
      </section>
    </main>
  );
}

function OffersPage({ api }) {
  const [offers, setOffers] = useState(demoOffers);
  const [providers, setProviders] = useState(defaultOfferwallProviders);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [providerNotice, setProviderNotice] = useState("Connect provider credentials in .env to open live offerwalls.");

  useEffect(() => {
    api.request("/offers/public").then(data => setOffers(data.offers || data)).catch(() => setOffers(demoOffers));
    api.request("/offerwalls/providers").then(data => setProviders(data.providers || defaultOfferwallProviders)).catch(() => {});
  }, []);

  async function openProvider(provider) {
    try {
      const launch = await api.request(`/offerwalls/${provider}/launch`);
      if (!launch.configured) {
        setProviderNotice(launch.message);
        return;
      }
      window.open(launch.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setProviderNotice("Log in before opening an offerwall.");
    }
  }

  const visible = offers.filter(offer => {
    const categoryMatch = filter === "All" || offer.category === filter;
    const queryMatch = `${offer.title} ${offer.description} ${offer.provider}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  });

  return (
    <main className="page">
      <div className="container">
        <SectionTitle title="Offer marketplace" copy="Search and filter live provider inventory with tracking-ready offer cards." action={<span className="tag blue">Provider-ready</span>} />
        <div className="provider-grid">
          {Object.values(providers).map(provider => (
            <div className="card provider-card" key={provider.key}>
              <div>
                <h3>{provider.name}</h3>
                <p>{provider.enabled ? "Credentials configured. Ready to launch." : "Waiting for publisher credentials."}</p>
              </div>
              <button className={provider.enabled ? "btn" : "btn alt"} onClick={() => openProvider(provider.key)}>
                {provider.enabled ? "Open Wall" : "Configure"}
              </button>
            </div>
          ))}
        </div>
        <div className="notice offerwall-notice">{providerNotice}</div>
        <div className="toolbar">
          <div className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search offers or providers" /></div>
          <div className="filters"><Filter size={18} />{["All", "Games", "Surveys", "Apps", "Finance", "Bonus"].map(item => <button key={item} className={filter === item ? "filter active" : "filter"} onClick={() => setFilter(item)}>{item}</button>)}</div>
        </div>
        <div className="offers-grid">{visible.map(offer => <OfferCard key={offer.id} offer={offer} />)}</div>
      </div>
    </main>
  );
}

function Dashboard({ api, navigate }) {
  const user = api.session?.user || { name: "EarnWave User", balance: 48.75, total_earned: 320.4 };
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
  const [bonusCode, setBonusCode] = useState("");
  const [growthNotice, setGrowthNotice] = useState("Claim daily streaks and redeem bonus codes to level up faster.");

  useEffect(() => {
    api.request("/growth/me").then(data => setGrowth(data.growth)).catch(() => {});
    api.request("/growth/leaderboard").then(data => setLeaderboard(data.leaderboard || [])).catch(() => {});
  }, []);

  async function claimStreak() {
    try {
      const result = await api.request("/growth/streak/claim", { method: "POST", body: "{}" });
      if (result.growth) setGrowth(result.growth);
      setGrowthNotice(result.claimed ? `Streak claimed: +${money(result.reward)} and +${result.xp} XP.` : result.message);
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
      setBonusCode("");
      setGrowthNotice(`Code ${result.code} redeemed: +${money(result.reward)} and +${result.xp} XP.`);
    } catch (error) {
      setGrowthNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Dashboard" navigate={navigate} api={api}>
      <DashboardTop kicker="Member dashboard" title={`Welcome back, ${user.name}`} copy="Track progress, choose the next best offer, and manage rewards from one focused workspace." action={<button className="btn" onClick={() => navigate("/wallet")}>Review Payouts <ArrowRight size={17} /></button>} />
      <div className="dashboard-hero-card">
        <div className="balance-card">
          <p>Available Balance</p>
          <strong>{money(user.balance)}</strong>
          <span>Every withdrawal is reviewed before payout automation runs.</span>
          <div className="actions">
            <button className="btn" onClick={() => navigate("/offers")}>Find Offers</button>
            <button className="btn alt" onClick={() => navigate("/wallet")}>Withdraw</button>
          </div>
        </div>
        <div className="analytics-card">
          <div className="mini-chart-head">
            <div><p>7-day earning trend</p><strong>{money(user.total_earned)}</strong></div>
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
        <div className="notification-card">
          <div className="feed-title"><Bell size={16} /> Notifications</div>
          <div className="mini-alert"><Clock size={16} /> Payout reviews usually complete within 24h.</div>
          <div className="mini-alert"><Flame size={16} /> Your streak bonus is ready today.</div>
          <div className="mini-alert"><Star size={16} /> Bonus code WELCOME adds XP.</div>
        </div>
      </div>
      <div className="stats">
        <Stat label="Total Earned" value={money(user.total_earned)} />
        <Stat label="Level" value={growth.level} />
        <Stat label="Daily Streak" value={`${growth.streak} days`} />
        <Stat label="Referrals" value={growth.referrals} />
      </div>
      <div className="workspace-grid">
        <div className="card">
          <SectionTitle title="Recommended next steps" copy="Reward options organized around value, time, category, and confidence." action={<span className="tag">Tracking ready</span>} />
          <div className="offers-grid compact">{demoOffers.slice(0, 4).map(offer => <OfferCard key={offer.id} offer={offer} actionLabel={`Start +${money(offer.reward)}`} />)}</div>
        </div>
        <SideRail
          growth={growth}
          leaderboard={leaderboard}
          bonusCode={bonusCode}
          setBonusCode={setBonusCode}
          claimStreak={claimStreak}
          redeemCode={redeemCode}
          growthNotice={growthNotice}
        />
      </div>
    </DashboardLayout>
  );
}

function WalletPage({ navigate, api }) {
  const user = api.session?.user || { balance: 48.75 };
  const [withdrawal, setWithdrawal] = useState({ method: "PayPal", amount: "", destinationType: "EMAIL", destinationValue: "" });
  const [notice, setNotice] = useState("All cashouts enter review before approval.");
  const [transactions, setTransactions] = useState([
    { created_at: "2026-06-05", type: "offer_completion", description: "Completed Kingdom Builder", amount: 28.4, direction: "credit" },
    { created_at: "2026-06-04", type: "withdrawal_request", description: "PayPal withdrawal requested", amount: 18.5, direction: "debit" }
  ]);

  useEffect(() => {
    api.request("/account/transactions").then(data => setTransactions(data.transactions || [])).catch(() => {});
  }, []);

  async function submitWithdrawal(event) {
    event.preventDefault();
    try {
      const result = await api.request("/wallet/withdrawals", {
        method: "POST",
        body: JSON.stringify({ ...withdrawal, balance: user.balance })
      });
      setNotice(`Withdrawal ${result.withdrawal.status}: risk score ${result.risk.score} (${result.risk.signals.join(", ")}).`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Wallet" navigate={navigate} api={api}>
      <DashboardTop kicker="Wallet" title="Payout center" copy="Review your balance, choose a redemption method, and follow every request from review to completion." action={<span className="tag">Minimum $0.50</span>} />
      <div className="wallet-grid">
        <div className="card">
          <p>Available Balance</p>
          <div className="balance">{money(user.balance)}</div>
          <Meter value={84} />
          <div className="method-grid">
            <Method title="PayPal" copy="Payouts after approval" />
            <Method title="Tremendous" copy="Gift cards after approval" />
            <Method title="Crypto" copy="Circle stablecoin payout" />
          </div>
          <form className="form-grid" onSubmit={submitWithdrawal}>
            <label>Method<select value={withdrawal.method} onChange={event => {
              const method = event.target.value;
              setWithdrawal({
                ...withdrawal,
                method,
                destinationType: method === "Crypto" ? "ETH" : "EMAIL"
              });
            }}><option>PayPal</option><option>Gift Card</option><option>Crypto</option></select></label>
            <label>Amount<input type="number" min="0.5" step="0.01" placeholder="25.00" value={withdrawal.amount} onChange={event => setWithdrawal({ ...withdrawal, amount: event.target.value })} /></label>
            {withdrawal.method === "Crypto" && (
              <label>Network<select value={withdrawal.destinationType} onChange={event => setWithdrawal({ ...withdrawal, destinationType: event.target.value })}><option>ETH</option><option>SOL</option><option>AVAX</option><option>MATIC</option></select></label>
            )}
            <label>{withdrawal.method === "Crypto" ? "Wallet address" : "Recipient email"}<input required placeholder={withdrawal.method === "Crypto" ? "0x..." : "member@example.com"} value={withdrawal.destinationValue} onChange={event => setWithdrawal({ ...withdrawal, destinationValue: event.target.value })} /></label>
            <button className="btn">Request Withdrawal</button>
            <div className="notice">{notice}</div>
          </form>
        </div>
        <div className="card">
          <SectionTitle title="Ledger history" copy="Auditable credits and debits tied to offers, bonuses, streaks, and withdrawals." />
          <DataTable rows={transactions.map(item => [
            String(item.created_at || "").slice(0, 10),
            item.description,
            `${item.direction === "debit" ? "-" : "+"}${money(item.amount)}`,
            item.type
          ])} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function HowItWorksPage({ navigate }) {
  const steps = [
    ["Discover", "Pick surveys, games, apps, finance tasks, or daily bonuses from tracked provider inventory."],
    ["Complete", "EarnWave records completion signals, provider callbacks, fraud score, and ledger entries."],
    ["Review", "Withdrawals enter manual review first so users and the business are protected."],
    ["Cash out", "Approved payouts can move through PayPal, Tremendous gift cards, or crypto rails once credentials are live."]
  ];

  return (
    <main className="page">
      <div className="container">
        <DashboardTop kicker="How it works" title="A clear path from offer to payout." copy="EarnWave keeps the member journey simple while the platform handles tracking, risk checks, payout review, and records behind the scenes." action={<button className="btn" onClick={() => navigate("/signup")}>Create Account</button>} />
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
          <Feature icon={<PackageCheck />} title="Offer tracking" copy="Provider launch URLs and callback routes are ready for real offerwall credentials." />
          <Feature icon={<ShieldCheck />} title="Risk review" copy="Device fingerprinting, VPN/proxy heuristics, duplicate checks, and withdrawal flags are already wired." />
        </div>
      </div>
    </main>
  );
}

function TrustPage({ navigate, api }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health").then(response => response.json()).then(setHealth).catch(() => {});
  }, []);

  const remaining = health?.readiness?.remaining || [];
  return (
    <main className="page">
      <div className="container">
        <DashboardTop kicker="Trust center" title="Clear systems for rewards, support, and payouts." copy="EarnWave is built to feel accountable before a member ever starts an offer." action={<button className="btn alt" onClick={() => navigate("/legal")}>View Policies</button>} />
        <div className="cards">
          <Feature icon={<Lock />} title="Reviewed payouts" copy="Every withdrawal enters review before payout automation can dispatch." />
          <Feature icon={<Activity />} title="Ledger history" copy="Credits and debits are recorded with reference IDs and balance-after snapshots." />
          <Feature icon={<Mail />} title="Support trail" copy="Support tickets and admin replies create a clear account-service history." />
        </div>
        <div className="card readiness-card">
          <SectionTitle title="Launch readiness" copy="Live status from the backend health endpoint." action={<span className="tag blue">{health?.database || "demo"}</span>} />
          <div className="readiness-grid">
            <ReadinessItem label="PostgreSQL" ready={Boolean(health?.readiness?.database)} />
            <ReadinessItem label="Redis" ready={Boolean(health?.readiness?.redis)} />
            <ReadinessItem label="Admin bootstrap" ready={Boolean(health?.readiness?.adminBootstrap)} />
            <ReadinessItem label="Offerwalls" ready={health?.readiness && Object.values(health.readiness.offerwalls || {}).some(Boolean)} />
            <ReadinessItem label="Payout providers" ready={health?.readiness && Object.values(health.readiness.payouts || {}).some(Boolean)} />
            <ReadinessItem label="Fraud review" ready />
          </div>
          {remaining.length > 0 && <div className="notice">Remaining: {remaining.join("; ")}</div>}
        </div>
      </div>
    </main>
  );
}

function SettingsPage({ navigate, api }) {
  const user = api.session?.user || { name: "EarnWave User", email: "demo@example.com", email_verified: false };
  const [security, setSecurity] = useState(null);
  const [preferences, setPreferences] = useState({ marketing_opt_in: true, payout_alerts: true, security_alerts: true });
  const [notice, setNotice] = useState("Manage account trust, alerts, and security preferences.");

  useEffect(() => {
    api.request("/account/security").then(data => setSecurity(data.security)).catch(() => {});
    api.request("/account/preferences").then(data => setPreferences(data.preferences)).catch(() => {});
  }, []);

  async function savePreference(key) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      await api.request("/account/preferences", { method: "PATCH", body: JSON.stringify(next) });
      setNotice("Preferences saved.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function sendVerification() {
    try {
      const result = await api.request("/auth/verify-email/send", { method: "POST", body: "{}" });
      if (result.verification?.previewUrl) {
        setNotice(`Verification email ready. Local preview: ${result.verification.previewUrl}`);
      } else if (result.verification?.status === "sent") {
        setNotice("Verification email sent. Check your inbox.");
      } else if (result.verification?.status === "failed") {
        setNotice("Verification email could not be sent. Check email provider settings in Render.");
      } else {
        setNotice("Verification email queued in the admin outbox. Connect an email provider to send it.");
      }
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Settings" navigate={navigate} api={api}>
      <DashboardTop kicker="Account" title="Settings and security" copy="Manage verification, payout alerts, and account preferences with clarity." />
      <div className="workspace-grid">
        <div className="card">
          <SectionTitle title="Security status" copy={user.email} action={<span className={security?.emailVerified || user.email_verified ? "tag" : "tag amber"}>{security?.emailVerified || user.email_verified ? "Verified" : "Unverified"}</span>} />
          <div className="security-list">
            <ReadinessItem label="Email verification" ready={Boolean(security?.emailVerified || user.email_verified)} />
            <ReadinessItem label="Password reset" ready={Boolean(security?.passwordResetEnabled)} />
            <ReadinessItem label="Payout review" ready={Boolean(security?.payoutReviewRequired)} />
            <ReadinessItem label="Ledger audit" ready={Boolean(security?.ledgerEnabled)} />
          </div>
          <button className="btn" onClick={sendVerification}>Send Verification Email</button>
        </div>
        <div className="stack">
          <div className="card">
            <h3>Notification preferences</h3>
            {[
              ["marketing_opt_in", "Growth tips and bonus drops"],
              ["payout_alerts", "Payout status alerts"],
              ["security_alerts", "Security and login alerts"]
            ].map(([key, label]) => (
              <button className="toggle-row" key={key} onClick={() => savePreference(key)}>
                <span>{label}</span>
                <span className={preferences[key] ? "toggle on" : "toggle"} />
              </button>
            ))}
          </div>
          <div className="notice">{notice}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ReadinessItem({ label, ready }) {
  return <div className={ready ? "readiness-item ready" : "readiness-item"}><CheckCircle size={17} /><span>{label}</span><strong>{ready ? "Ready" : "Needed"}</strong></div>;
}

function ReferralPage({ navigate, api }) {
  const user = api.session?.user || { referral_code: "WAVE2026", total_earned: 320.4 };
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
    api.request("/growth/me").then(data => setGrowth(data.growth)).catch(() => {});
  }, []);

  return (
    <DashboardLayout active="Referrals" navigate={navigate} api={api}>
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
          <div className="mini-alert">Share game offers with squad chats.</div>
          <div className="mini-alert">Promote PayPal cashout trust.</div>
        </div>
      </div>
      <div className="cards">
        <Feature icon={<Users />} title="Clean sharing" copy="Short code, full referral URL, and copy-first interaction." />
        <Feature icon={<Trophy />} title="Status rewards" copy="Levels and achievements make sharing feel like progress." />
        <Feature icon={<BarChart3 />} title="Trackable funnel" copy="Referral counts live in the growth API and can be extended into conversion analytics." />
      </div>
    </DashboardLayout>
  );
}

function LeaderboardPage({ navigate, api }) {
  const [leaderboard, setLeaderboard] = useState([
    { name: "WaveHunter", total_earned: 184, level: 12, streak: 14 },
    { name: "NovaEarns", total_earned: 143, level: 10, streak: 9 },
    { name: "SurveyAce", total_earned: 98, level: 8, streak: 6 }
  ]);

  useEffect(() => {
    api.request("/growth/leaderboard").then(data => setLeaderboard(data.leaderboard || [])).catch(() => {});
  }, []);

  return (
    <DashboardLayout active="Leaderboard" navigate={navigate} api={api}>
      <DashboardTop kicker="Community" title="Leaderboard" copy="A clean competitive layer for members building consistent reward progress." action={<span className="tag"><Flame size={14} /> Weekly reset</span>} />
      <div className="leaderboard-stage">
        {leaderboard.slice(0, 3).map((row, index) => (
          <div className={`podium-card podium-${index + 1}`} key={row.name}>
            <span className="rank">{index + 1}</span>
            <h3>{row.name}</h3>
            <strong>{money(row.total_earned)}</strong>
            <p>Level {row.level} - {row.streak} day streak</p>
          </div>
        ))}
      </div>
      <div className="card">
        <SectionTitle title="All earners" copy="Clear ranking increases retention without overwhelming new users." />
        <DataTable rows={leaderboard.map((row, index) => [
          `#${index + 1}`,
          row.name,
          money(row.total_earned),
          `Level ${row.level}`,
          `${row.streak} days`
        ])} />
      </div>
    </DashboardLayout>
  );
}

function ProfilePage({ navigate, api }) {
  const user = api.session?.user || { name: "EarnWave User", username: "earnwave_user", email: "demo@example.com" };
  const [profile, setProfile] = useState({
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    country: user.country || "",
    timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  });
  const [notice, setNotice] = useState("Update your username, display name, and public profile info.");

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const result = await api.request("/account/profile", {
        method: "PATCH",
        body: JSON.stringify(profile)
      });
      api.save({ ...api.session, user: result.user });
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Profile" navigate={navigate} api={api}>
      <DashboardTop kicker="Account" title="Profile settings" copy="Choose how your EarnWave account appears across referrals, support, and community surfaces." />
      <div className="wallet-grid">
        <form className="card form-grid" onSubmit={saveProfile}>
          <label>Display name<input value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} required /></label>
          <label>Username<input value={profile.username} onChange={event => setProfile({ ...profile, username: event.target.value })} minLength="3" maxLength="24" required /></label>
          <label>Email<input value={user.email || ""} disabled /></label>
          <label>Country<input value={profile.country} onChange={event => setProfile({ ...profile, country: event.target.value })} placeholder="United States" /></label>
          <label>Timezone<input value={profile.timezone} onChange={event => setProfile({ ...profile, timezone: event.target.value })} /></label>
          <label>Bio<textarea value={profile.bio} onChange={event => setProfile({ ...profile, bio: event.target.value })} maxLength="280" placeholder="Tell us what kind of rewards you like." /></label>
          <button className="btn" type="submit">Save Profile</button>
          <div className="notice">{notice}</div>
        </form>
        <div className="card">
          <h3>Account status</h3>
          <div className="row"><span>Role</span><span className="pill">{user.role || "user"}</span></div>
          <div className="row"><span>Username</span><span className="pill">{user.username || "Needed"}</span></div>
          <div className="row"><span>Status</span><span className="pill">{user.status || "active"}</span></div>
          <div className="row"><span>Email</span><span className={user.email_verified ? "pill" : "pill amber"}>{user.email_verified ? "Verified" : "Unverified"}</span></div>
          <div className="row"><span>Referral code</span><span className="pill">{user.referral_code || "Generated after login"}</span></div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SupportPage({ navigate, api }) {
  const [form, setForm] = useState({ subject: "", category: "general", message: "" });
  const [tickets, setTickets] = useState([]);
  const [notice, setNotice] = useState("Open a ticket for offer tracking, payout review, account access, or trust and safety questions.");

  useEffect(() => {
    api.request("/account/support/tickets").then(data => setTickets(data.tickets || [])).catch(() => {});
  }, []);

  async function submitTicket(event) {
    event.preventDefault();
    try {
      const result = await api.request("/account/support/tickets", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setTickets([result.ticket, ...tickets]);
      setForm({ subject: "", category: "general", message: "" });
      setNotice("Support ticket created.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Support" navigate={navigate} api={api}>
      <DashboardTop kicker="Help" title="Support center" copy="Create a ticket, keep the conversation organized, and give the team the context needed to help." />
      <div className="wallet-grid">
        <form className="card form-grid" onSubmit={submitTicket}>
          <label>Subject<input value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} /></label>
          <label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option>general</option><option>offer</option><option>payout</option><option>account</option><option>fraud</option></select></label>
          <label>Message<input value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} placeholder="Tell us what happened" /></label>
          <button className="btn" type="submit">Create Ticket</button>
          <div className="notice">{notice}</div>
        </form>
        <div className="card">
          <SectionTitle title="Your tickets" copy="Recent support activity." />
          <DataTable rows={(tickets.length ? tickets : [{ created_at: "2026-06-05", subject: "Example payout review", category: "payout", status: "open" }]).map(ticket => [
            String(ticket.created_at || "").slice(0, 10),
            ticket.subject,
            ticket.category,
            ticket.status
          ])} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function LegalPage() {
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    fetch("/api/legal").then(response => response.json()).then(data => setDocs(data.docs)).catch(() => {});
  }, []);

  const fallback = {
    terms: { title: "Terms of Service", body: ["Rewards require valid tracking, fraud review, and provider confirmation."] },
    privacy: { title: "Privacy Policy", body: ["EarnWave collects account, device, offer, and payout data to operate the platform."] },
    rewards: { title: "Rewards Policy", body: ["Balances are tracked through ledger entries and payouts require manual approval."] },
    fraud: { title: "Fraud Policy", body: ["VPN/proxy abuse, duplicate accounts, and automated activity are prohibited."] }
  };

  const visibleDocs = docs || fallback;

  return (
    <main className="page">
      <div className="container">
        <SectionTitle title="Legal center" copy="Core policies for account use, rewards, privacy, and fraud." />
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

function AdminPage({ navigate, api }) {
  const [moderation, setModeration] = useState({
    queue: [],
    flags: [
      { id: "flag-1", event_type: "withdrawal_review", severity: "high", score: 75, signals: ["vpn_proxy_or_datacenter_intel", "withdrawal_threshold_pressure"], status: "open" },
      { id: "flag-2", event_type: "signup_risk", severity: "medium", score: 55, signals: ["device_seen_on_other_account"], status: "open" }
    ]
  });
  const [payouts, setPayouts] = useState([
    { id: "demo-pay-1", user_name: "WaveHunter", method: "PayPal", amount: 25, status: "review", risk_score: 25, destination_value: "wave@example.com" },
    { id: "demo-pay-2", user_name: "GiftAce", method: "Gift Card", amount: 10, status: "review", risk_score: 18, destination_value: "gift@example.com" },
    { id: "demo-pay-3", user_name: "ChainUser", method: "Crypto", amount: 42, status: "held", risk_score: 61, destination_value: "0x..." }
  ]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [emails, setEmails] = useState([]);
  const [payoutNotice, setPayoutNotice] = useState("Manual approval is required before any automated payout is sent.");

  useEffect(() => {
    api.request("/admin/moderation").then(setModeration).catch(() => {});
    api.request("/admin/payouts").then(data => setPayouts(data.payouts || [])).catch(() => {});
    api.request("/account/admin/support/tickets").then(data => setSupportTickets(data.tickets || [])).catch(() => {});
    api.request("/account/admin/email-outbox").then(data => setEmails(data.emails || [])).catch(() => {});
  }, []);

  async function approvePayout(id) {
    try {
      const result = await api.request(`/admin/payouts/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ note: "Approved from admin queue" })
      });
      setPayoutNotice(result.message);
      api.request("/admin/payouts").then(data => setPayouts(data.payouts || [])).catch(() => {});
    } catch (error) {
      setPayoutNotice(error.message);
    }
  }

  async function rejectQueuedPayout(id) {
    try {
      const result = await api.request(`/admin/payouts/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: "Rejected from admin queue" })
      });
      setPayoutNotice(result.message);
      api.request("/admin/payouts").then(data => setPayouts(data.payouts || [])).catch(() => {});
    } catch (error) {
      setPayoutNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Admin" navigate={navigate} api={api}>
      <DashboardTop kicker="Operations" title="Admin moderation" copy="Review users, payout risk, offerwall callbacks, reversals, and suspicious completions." action={<span className="tag rose">Risk queue</span>} />
      <div className="stats">
        <Stat label="Pending Payouts" value="$4,280" />
        <Stat label="Flagged Users" value="37" />
        <Stat label="Reversals" value="2.1%" />
        <Stat label="Avg Review" value="19h" />
      </div>
      <div className="workspace-grid">
        <div className="card">
          <SectionTitle title="Moderation queue" copy="Admin endpoints support approve, reject, hold, ban, and note actions." />
          <DataTable rows={(moderation.queue.length ? moderation.queue : [
            { user: "WaveHunter", reason: "Payout velocity", amount: 84.2, status: "Hold" },
            { user: "SurveyAce", reason: "Duplicate IP", amount: 12.75, status: "Review" },
            { user: "NovaEarns", reason: "Provider reversal", amount: 43.9, status: "Reject" }
          ]).map(item => [item.user, item.reason, money(item.amount), item.status])} />
        </div>
        <div className="card payout-queue-card">
          <SectionTitle title="Manual payout approval" copy="PayPal Payouts, Tremendous gift cards, and crypto withdrawals only dispatch after approval." />
          <div className="notice">{payoutNotice}</div>
          <div className="payout-list">
            {payouts.map(item => (
              <div className="payout-row" key={item.id}>
                <div>
                  <strong>{item.user_name || item.user_id || "Member"} - {item.method}</strong>
                  <p>{money(item.amount)} to {item.destination_value || "destination pending"} | risk {item.risk_score || 0} | {item.status}</p>
                </div>
                <div className="payout-actions">
                  <button className="btn" onClick={() => approvePayout(item.id)}>Approve</button>
                  <button className="btn alt" onClick={() => rejectQueuedPayout(item.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <SectionTitle title="Suspicious activity flags" copy="Open flags from VPN/proxy checks, device fingerprint reuse, duplicate account signals, and withdrawal reviews." />
          <div className="flag-list">
            {moderation.flags.map(flag => (
              <div className="flag-row" key={flag.id}>
                <div>
                  <strong>{flag.event_type}</strong>
                  <p>{(flag.signals || []).join(", ")}</p>
                </div>
                <span className={flag.severity === "high" ? "tag rose" : "tag amber"}>{flag.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <RiskCard title="Anti-fraud signals" items={["VPN/proxy detection", "Device fingerprint reuse", "Duplicate account checks", "Withdrawal review pressure", "Suspicious activity flags"]} />
          <RiskCard title="Moderation actions" items={["Approve payout", "Reject payout", "Ban account", "Add internal note"]} />
        </div>
        <div className="card">
          <SectionTitle title="Support queue" copy="Admin support visibility for payout, account, offer, and fraud tickets." />
          <DataTable rows={(supportTickets.length ? supportTickets : [
            { subject: "Payout timing", category: "payout", priority: "high", status: "open" },
            { subject: "Offer missing credit", category: "offer", priority: "normal", status: "pending" }
          ]).map(item => [item.subject, item.category, item.priority, item.status])} />
        </div>
        <div className="card">
          <SectionTitle title="Email outbox" copy="Delivery trail for verification, reset, payout, and support messages." />
          <DataTable rows={(emails.length ? emails : [
            { to_email: "member@example.com", subject: "Verify your EarnWave account", status: "queued", provider: "local" },
            { to_email: "member@example.com", subject: "Reset your EarnWave password", status: "queued", provider: "local" }
          ]).map(item => [item.to_email, item.subject, item.provider, item.status])} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function AnalyticsPage({ navigate, api }) {
  return (
    <DashboardLayout active="Analytics" navigate={navigate} api={api}>
      <DashboardTop kicker="Analytics" title="Performance dashboard" copy="Revenue, payout exposure, user growth, conversion, provider quality, and category mix." action={<span className="tag blue">Live API ready</span>} />
      <div className="stats">
        <Stat label="Revenue" value="$18,900" />
        <Stat label="Payouts" value="$7,420" />
        <Stat label="Conversion" value="18.4%" />
        <Stat label="Active Users" value="12,450" />
      </div>
      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Revenue vs payouts</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analyticsSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="day" stroke="#aeb8c7" />
              <YAxis stroke="#aeb8c7" />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#32e6a1" fill="rgba(50,230,161,.18)" />
              <Area type="monotone" dataKey="payouts" stroke="#46c7ff" fill="rgba(70,199,255,.12)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>Category mix</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="name" stroke="#aeb8c7" />
              <YAxis stroke="#aeb8c7" />
              <Tooltip />
              <Bar dataKey="value" fill="#ffc857" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}

function VerifyEmailPage({ api, navigate }) {
  const params = new URLSearchParams(window.location.search);
  const [notice, setNotice] = useState("Open the verification link from your email, or paste the token from a local preview.");
  const [token, setToken] = useState(() => params.get("token") || "");
  const [email, setEmail] = useState(() => params.get("email") || "");

  async function submit(event) {
    event.preventDefault();
    try {
      const result = await api.request("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
      if (api.session) api.save({ ...api.session, user: result.user });
      setNotice("Email verified. You can log in now.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function resend(event) {
    event.preventDefault();
    try {
      await api.request("/auth/verify-email/resend", { method: "POST", body: JSON.stringify({ email }) });
      setNotice("Verification email sent if that account exists.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="form-page">
      <div className="container">
        <form className="card form-card" onSubmit={submit}>
          <button type="button" className="logo auth-logo ghost" onClick={() => navigate("/")}><BrandLogo /></button>
          <h2>Verify email</h2>
          <p>Confirm your email before logging in to EarnWave.</p>
          <label>Token<input value={token} onChange={event => setToken(event.target.value)} required /></label>
          <button className="btn" type="submit">Verify Email</button>
          <button className="btn alt" type="button" onClick={() => navigate("/login")}>Go to Login</button>
          <div className="notice">{notice}</div>
        </form>
        <form className="card form-card" onSubmit={resend}>
          <h2>Resend link</h2>
          <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <button className="btn alt" type="submit">Resend Verification</button>
        </form>
      </div>
    </main>
  );
}

function ForgotPasswordPage({ api, navigate }) {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("Enter your email and EarnWave will send a reset link.");

  async function submit(event) {
    event.preventDefault();
    try {
      const result = await api.request("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
      if (result.previewUrl) {
        setNotice(`Reset email ready. Local preview: ${result.previewUrl}`);
      } else if (result.status === "sent") {
        setNotice("If that email exists, a reset link has been sent.");
      } else if (result.status === "failed") {
        setNotice("Reset email could not be sent. Check email provider settings in Render.");
      } else {
        setNotice("If that email exists, a reset link was queued in the admin outbox.");
      }
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="form-page">
      <div className="container">
        <form className="card form-card" onSubmit={submit}>
          <button type="button" className="logo auth-logo ghost" onClick={() => navigate("/")}><BrandLogo /></button>
          <h2>Reset password</h2>
          <p>Recover access without contacting support.</p>
          <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <button className="btn" type="submit">Send Reset Link</button>
          <button className="btn alt" type="button" onClick={() => navigate("/login")}>Back to Login</button>
          <div className="notice">{notice}</div>
        </form>
      </div>
    </main>
  );
}

function ResetPasswordPage({ api, navigate }) {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("Paste your reset token and choose a new password.");

  async function submit(event) {
    event.preventDefault();
    try {
      await api.request("/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) });
      setNotice("Password reset. You can log in with the new password.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="form-page">
      <div className="container">
        <form className="card form-card" onSubmit={submit}>
          <button type="button" className="logo auth-logo ghost" onClick={() => navigate("/")}><BrandLogo /></button>
          <h2>Choose new password</h2>
          <label>Reset token<input value={token} onChange={event => setToken(event.target.value)} required /></label>
          <label>New password<input type="password" minLength="8" value={password} onChange={event => setPassword(event.target.value)} required /></label>
          <button className="btn" type="submit">Reset Password</button>
          <div className="notice">{notice}</div>
        </form>
      </div>
    </main>
  );
}

function TokenForm({ title, copy, token, setToken, notice, submit, button, navigate }) {
  return (
    <main className="form-page">
      <div className="container">
        <form className="card form-card" onSubmit={submit}>
          <button type="button" className="logo auth-logo ghost" onClick={() => navigate("/")}><BrandLogo /></button>
          <h2>{title}</h2>
          <p>{copy}</p>
          <label>Token<input value={token} onChange={event => setToken(event.target.value)} required /></label>
          <button className="btn" type="submit">{button}</button>
          <div className="notice">{notice}</div>
        </form>
      </div>
    </main>
  );
}

function AuthPage({ mode, api, navigate }) {
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { name: "", username: "", email: "", password: "", referralCode: params.get("ref") || "" };
  });
  const [notice, setNotice] = useState("Create a verified account before entering EarnWave.");

  async function submit(event) {
    event.preventDefault();
    const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
    try {
      const result = await api.request(endpoint, { method: "POST", body: JSON.stringify(form) });
      if (mode === "signup") {
        setNotice(result.message || "Account created. Verify your email before logging in.");
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
      api.save(result);
      navigate("/dashboard");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="form-page">
      <div className="container">
        <form className="card form-card" onSubmit={submit}>
          <button type="button" className="logo auth-logo ghost" onClick={() => navigate("/")}><BrandLogo /></button>
          <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
          <p>{mode === "signup" ? "Verify your email first, then enter your rewards dashboard." : "Log in to continue building your reward progress."}</p>
          {mode === "signup" && <label>Name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label>}
          {mode === "signup" && <label>Username<input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} minLength="3" maxLength="24" required /></label>}
          <label>Email<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required /></label>
          {mode === "signup" && <label>Referral code<input value={form.referralCode} onChange={event => setForm({ ...form, referralCode: event.target.value })} placeholder="Optional" /></label>}
          <button className="btn" type="submit">{mode === "signup" ? "Create Account" : "Login"}</button>
          {mode === "login" && <button className="btn alt" type="button" onClick={() => navigate("/forgot-password")}>Forgot Password</button>}
          <div className="notice">{notice}</div>
        </form>
      </div>
    </main>
  );
}

function DashboardLayout({ active, navigate, api, children }) {
  const isAdmin = api.session?.user?.role === "admin";
  const items = [
    ["Dashboard", "/dashboard", <LayoutDashboard size={17} />],
    ["Offers", "/offers", <Gift size={17} />],
    ["Wallet", "/wallet", <Wallet size={17} />],
    ["Referrals", "/referrals", <Users size={17} />],
    ["Leaderboard", "/leaderboard", <Trophy size={17} />],
    ["Profile", "/profile", <Users size={17} />],
    ["Settings", "/settings", <Settings size={17} />],
    ["Support", "/support", <Activity size={17} />],
    ...(isAdmin ? [
      ["Analytics", "/analytics", <BarChart3 size={17} />],
      ["Admin", "/admin", <ShieldCheck size={17} />]
    ] : [])
  ];
  return (
    <main className="dashboard">
      <div className="container dashboard-layout">
        <aside className="sidebar">
          <button className="sidebar-brand" onClick={() => navigate("/")}><BrandLogo compact /></button>
          {items.map(([label, path, icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => navigate(path)}>{icon}{label}</button>)}
          <button onClick={() => { api.logout(); navigate("/"); }}><LogOut size={17} />Logout</button>
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}

function AdminGuard({ api, navigate, children }) {
  if (api.session?.user?.role === "admin") return children;

  return (
    <main className="page">
      <div className="container">
        <div className="card form-card">
          <div className="icon"><Lock size={20} /></div>
          <h2>Admin access required</h2>
          <p>This area is hidden from regular users and requires an admin session.</p>
          <button className="btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    </main>
  );
}

function AuthRequired({ api, navigate, children }) {
  if (api.session?.token && api.session?.user?.role === "admin") return children;
  if (api.session?.token && api.session?.user?.email_verified) return children;

  if (api.session?.token && api.session?.user && !api.session.user.email_verified) {
    return (
      <main className="page">
        <div className="container">
          <div className="card form-card">
            <div className="icon"><Mail size={20} /></div>
            <h2>Verify your email</h2>
            <p>You need to verify your email before entering your account dashboard.</p>
            <button className="btn" onClick={() => navigate(`/verify-email?email=${encodeURIComponent(api.session.user.email || "")}`)}>Verify Email</button>
            <button className="btn alt" onClick={() => { api.logout(); navigate("/login"); }}>Back to Login</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="card form-card">
          <div className="icon"><Lock size={20} /></div>
          <h2>Login required</h2>
          <p>Create an account, verify your email, then log in to access this area.</p>
          <button className="btn" onClick={() => navigate("/login")}>Go to Login</button>
          <button className="btn alt" onClick={() => navigate("/signup")}>Create Account</button>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ title, copy, action }) {
  return <div className="section-title"><div><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{action}</div>;
}

function DashboardTop({ kicker, title, copy, action }) {
  return <div className="dashboard-top"><div><p className="green"><strong>{kicker}</strong></p><h2>{title}</h2><p>{copy}</p></div>{action}</div>;
}

function BrandLogo({ compact = false }) {
  return <img className={compact ? "brand-logo compact" : "brand-logo"} src="/earnwave-logo-polished.png" alt="EarnWave" />;
}

function Metric({ value, label }) {
  return <div className="trust-item"><strong>{value}</strong><p>{label}</p></div>;
}

function Feature({ icon, title, copy }) {
  return <div className="card feature-card"><div className="icon">{icon}</div><h3>{title}</h3><p>{copy}</p></div>;
}

function PaymentMethod({ icon, title, copy }) {
  return <div className="card payment-card"><div className="icon">{icon}</div><h3>{title}</h3><p>{copy}</p></div>;
}

function Testimonial({ name, role, quote }) {
  return (
    <div className="card testimonial-card">
      <div className="stars" aria-label="Five star review"><Star size={15} /><Star size={15} /><Star size={15} /><Star size={15} /><Star size={15} /></div>
      <p>"{quote}"</p>
      <div className="row">
        <div><strong>{name}</strong><p>{role}</p></div>
        <span className="pill blue">Verified</span>
      </div>
    </div>
  );
}

function FaqItem({ question, answer, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={open ? "faq-item open" : "faq-item"}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <h3>{question}</h3>
        <span>{open ? "-" : "+"}</span>
      </button>
      {open && <p>{answer}</p>}
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="card stat-card"><p>{label}</p><strong>{value}</strong></div>;
}

function MiniStat({ label, value }) {
  return <div className="mini-stat"><p>{label}</p><strong>{value}</strong></div>;
}

function Meter({ value }) {
  return <div className="meter"><span style={{ width: `${value}%` }} /></div>;
}

function OfferCard({ offer, actionLabel = "Start Offer" }) {
  return (
    <div className="card offer-card">
      <div className="offer-head">
        <div><h3>{offer.title}</h3><p>{offer.description}</p></div>
        <span className="reward">{money(offer.reward)}</span>
      </div>
      <div className="offer-meta">
        <span className="tag">{offer.category}</span>
        <span className="tag blue">{offer.provider || "Provider"}</span>
        <span className="tag amber">{offer.time || "Tracked"}</span>
        <span className="tag rose">{offer.difficulty || "Standard"}</span>
      </div>
      <button className="btn alt">{actionLabel}</button>
    </div>
  );
}

function SideRail({ growth, leaderboard, bonusCode, setBonusCode, claimStreak, redeemCode, growthNotice }) {
  const xpProgress = Math.min(100, Math.round((growth.xp / Math.max(growth.nextLevelXp, 1)) * 100));
  return (
    <div className="stack">
      <div className="card">
        <h3>Level {growth.level}</h3>
        <p>{growth.xp} XP toward {growth.nextLevelXp} XP</p>
        <br /><Meter value={xpProgress} />
      </div>
      <div className="card">
        <h3>Referral system</h3>
        <p>Code: <strong>{growth.referralCode}</strong></p>
        <div className="copy-box">{growth.referralUrl}</div>
        <div className="row"><span>Referrals</span><span className="pill">{growth.referrals}</span></div>
      </div>
      <div className="card">
        <h3>Daily streak</h3>
        <p>{growth.streak} day streak. Claim once per day.</p>
        <button className="btn" onClick={claimStreak}>Claim Daily Bonus</button>
      </div>
      <div className="card">
        <h3>Bonus codes</h3>
        <form className="bonus-form" onSubmit={redeemCode}>
          <input value={bonusCode} onChange={event => setBonusCode(event.target.value)} placeholder="WELCOME" />
          <button className="btn" type="submit">Redeem</button>
        </form>
        <div className="notice">{growthNotice}</div>
      </div>
      <div className="card">
        <h3>Leaderboard</h3>
        {leaderboard.map((row, index) => <div className="leader-row" key={`${row.name}-${index}`}><span className="avatar">{index + 1}</span><strong>{row.name}</strong><span className="pill">{money(row.total_earned)}</span></div>)}
      </div>
      <div className="card"><h3>Quick goals</h3><div className="row"><span>Complete one survey</span><span className="tag amber">+$2 bonus</span></div><div className="row"><span>Try one game quest</span><span className="tag blue">2x XP</span></div></div>
    </div>
  );
}

function Method({ title, copy }) {
  return <div className="method"><strong>{title}</strong><p>{copy}</p></div>;
}

function DataTable({ rows }) {
  return (
    <div className="table-wrap">
      <table><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === row.length - 1 ? <span className="pill">{cell}</span> : cell}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

function RiskCard({ title, items }) {
  return <div className="card"><h3>{title}</h3>{items.map(item => <div className="row" key={item}><span>{item}</span><CheckCircle size={17} /></div>)}</div>;
}

function App() {
  const [route, navigate] = useRoute();
  const api = useApi();
  const page = useMemo(() => {
    if (route === "/offers" || route === "/offers.html") return <OffersPage api={api} />;
    if (route === "/how-it-works") return <HowItWorksPage navigate={navigate} />;
    if (route === "/trust") return <TrustPage api={api} navigate={navigate} />;
    if (route === "/dashboard" || route === "/dashboard.html") return <AuthRequired api={api} navigate={navigate}><Dashboard api={api} navigate={navigate} /></AuthRequired>;
    if (route === "/wallet" || route === "/wallet.html") return <AuthRequired api={api} navigate={navigate}><WalletPage api={api} navigate={navigate} /></AuthRequired>;
    if (route === "/referrals") return <AuthRequired api={api} navigate={navigate}><ReferralPage api={api} navigate={navigate} /></AuthRequired>;
    if (route === "/leaderboard") return <LeaderboardPage api={api} navigate={navigate} />;
    if (route === "/profile") return <AuthRequired api={api} navigate={navigate}><ProfilePage api={api} navigate={navigate} /></AuthRequired>;
    if (route === "/settings") return <AuthRequired api={api} navigate={navigate}><SettingsPage api={api} navigate={navigate} /></AuthRequired>;
    if (route === "/support") return <AuthRequired api={api} navigate={navigate}><SupportPage api={api} navigate={navigate} /></AuthRequired>;
    if (route === "/legal") return <LegalPage />;
    if (route === "/admin" || route === "/admin.html") return <AdminGuard api={api} navigate={navigate}><AdminPage api={api} navigate={navigate} /></AdminGuard>;
    if (route === "/analytics") return <AdminGuard api={api} navigate={navigate}><AnalyticsPage api={api} navigate={navigate} /></AdminGuard>;
    if (route === "/login" || route === "/login.html") return <AuthPage mode="login" api={api} navigate={navigate} />;
    if (route === "/signup" || route === "/signup.html") return <AuthPage mode="signup" api={api} navigate={navigate} />;
    if (route === "/forgot-password") return <ForgotPasswordPage api={api} navigate={navigate} />;
    if (route === "/reset-password") return <ResetPasswordPage api={api} navigate={navigate} />;
    if (route === "/verify-email") return <VerifyEmailPage api={api} navigate={navigate} />;
    return <Landing navigate={navigate} />;
  }, [route, api.session]);

  return <Shell route={route} navigate={navigate} api={api}>{page}</Shell>;
}

createRoot(document.getElementById("root")).render(<App />);
