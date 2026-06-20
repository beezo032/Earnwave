import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bitcoin,
  CheckCircle,
  ClipboardList,
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
import {
  earnWaveFallbackImage,
  filterOffersByCategory,
  formatRewardUsd,
  formatWaveCoinReward,
  normalizeOffer,
  offerCategoryTabs,
  offersForEnabledProviders
} from "./offerwallOffers.js";
import "./styles.css";

const demoOffers = [
  { id: 1, title: "CPX Research Survey Wall", category: "Surveys", reward: 2.98, description: "Answer matching CPX surveys and earn the displayed user reward when your responses qualify.", difficulty: "Easy", time: "5-18 min", provider: "CPX Research" },
  { id: 2, title: "TheoremReach Survey Wall", category: "Surveys", reward: 3.85, description: "Open TheoremReach surveys with verified callback tracking and user-side reward estimates.", difficulty: "Easy", time: "6-20 min", provider: "TheoremReach" },
  { id: 5, title: "Daily Check-in", category: "Bonus", reward: .75, description: "Claim today's streak reward and keep your bonus multiplier alive.", difficulty: "Easy", time: "1 min", provider: "EarnWave" },
  { id: 6, title: "Survey Streak Bonus", category: "Bonus", reward: 1.25, description: "Keep your survey streak active for better daily momentum.", difficulty: "Easy", time: "1 min", provider: "EarnWave" }
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
  { name: "CPX Research", value: 52 },
  { name: "TheoremReach", value: 38 },
  { name: "Daily Bonuses", value: 10 }
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

const payoutProofPreview = [
  { name: "Ma*** R.", method: "PayPal", amountWaveCoins: 2500, completedAt: "Preview", status: "completed", preview: true },
  { name: "Jo*** T.", method: "Gift card", amountWaveCoins: 1000, completedAt: "Preview", status: "completed", preview: true },
  { name: "Pr*** S.", method: "PayPal", amountWaveCoins: 5000, completedAt: "Preview", status: "completed", preview: true }
];

const faqs = [
  ["How do rewards get tracked?", "Your wallet shows pending and available WaveCoins so you can follow rewards from completion to payout."],
  ["When can I cash out?", "You can request a payout once you reach the minimum cashout. Payouts are reviewed before being sent through PayPal or gift cards."],
  ["Is this only for survey users?", "EarnWave currently focuses on surveys through CPX Research and TheoremReach, with referrals, streaks, and payout tracking around that core flow."],
  ["Why are payouts reviewed?", "Reviews help reduce duplicate accounts, suspicious activity, and reversals so rewards stay fair for real members."]
];

const defaultOfferwallProviders = {
  cpx: { key: "cpx", name: "CPX Research", enabled: false },
  theorem: { key: "theorem", name: "TheoremReach", enabled: false }
};

const surveyProviders = [
  {
    key: "cpx",
    name: "CPX Research",
    description: "High-volume survey inventory with profile matching, global routing, and fast research tasks.",
    rewardRange: "28-455 WaveCoins",
    usdRange: "$0.28-$4.55",
    averageTime: "5-18 min",
    userType: "Best for beginners",
    maxWaveCoins: 455,
    gradient: "linear-gradient(135deg, rgba(50,230,161,.22), rgba(69,200,255,.14))"
  },
  {
    key: "theorem",
    name: "TheoremReach",
    description: "Trusted survey wall built for qualified responses, clear completion flow, and reward tracking.",
    rewardRange: "35-420 WaveCoins",
    usdRange: "$0.35-$4.20",
    averageTime: "6-20 min",
    userType: "Best for higher payout",
    maxWaveCoins: 420,
    gradient: "linear-gradient(135deg, rgba(69,200,255,.22), rgba(255,107,138,.13))"
  }
];

const ENABLE_CRYPTO_WITHDRAWALS = import.meta.env.VITE_ENABLE_CRYPTO_WITHDRAWALS === "true";
const ENABLE_PREVIEW_PAYOUTS = import.meta.env.VITE_ENABLE_PREVIEW_PAYOUTS !== "false";
const ENABLE_TRENDING_MOCK_OFFERS = import.meta.env.VITE_ENABLE_TRENDING_MOCK_OFFERS !== "false";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

const trendingEarnCards = [
  {
    id: "home-game-quest",
    title: "Game Quest",
    category: "Game",
    provider: "CPX Research",
    rewardWaveCoins: 1200,
    rewardUsdCents: 1200,
    label: "Example"
  },
  {
    id: "home-finance-survey",
    title: "Finance Survey",
    category: "Survey",
    provider: "TheoremReach",
    rewardWaveCoins: 625,
    rewardUsdCents: 625,
    label: "Example"
  },
  {
    id: "home-app-trial",
    title: "Mobile App Trial",
    category: "App",
    provider: "CPX Research",
    rewardWaveCoins: 850,
    rewardUsdCents: 850,
    label: "Example"
  },
  {
    id: "home-daily-survey",
    title: "Daily Survey",
    category: "Offer",
    provider: "TheoremReach",
    rewardWaveCoins: null,
    rewardUsdCents: null,
    rewardLabel: "Reward varies",
    label: "Curated"
  }
];

function trackEvent(eventName, payload = {}) {
  const detail = { surface: "earnwave", ...payload };
  window.dispatchEvent(new CustomEvent(`earnwave:${eventName}`, { detail }));
  window.dataLayer?.push({ event: `earnwave_${eventName}`, ...detail });
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function dollarsToWaveCoins(value) {
  return Math.round(Number(value || 0) * 100);
}

function waveCoinsToUsd(waveCoins) {
  return Number(waveCoins || 0) / 100;
}

function userAmountWaveCoins(user, fallbackDollars = 0, key = "balance_wavecoins") {
  return user?.[key] ?? dollarsToWaveCoins(fallbackDollars);
}

function formatBalance(user = {}, amountWaveCoins = 0) {
  const preference = user.preferredBalanceDisplay || "coins";
  const coins = `${Math.round(Number(amountWaveCoins || 0)).toLocaleString()} WaveCoins`;
  const usd = money(waveCoinsToUsd(amountWaveCoins));
  if (preference === "usd") return usd;
  if (preference === "both") return `${coins} (${usd})`;
  return coins;
}

function rewardLabel(valueDollars) {
  return formatBalance({ preferredBalanceDisplay: "coins" }, dollarsToWaveCoins(valueDollars));
}

const defaultActivityMetrics = { clicks: 24, downloads: 6, completedOffers: 3 };

function readActivityMetrics() {
  try {
    return { ...defaultActivityMetrics, ...JSON.parse(localStorage.getItem("earnwave_activity_metrics") || "{}") };
  } catch {
    return defaultActivityMetrics;
  }
}

function recordActivityMetric(type) {
  const current = readActivityMetrics();
  const next = { ...current, [type]: Number(current[type] || 0) + 1 };
  localStorage.setItem("earnwave_activity_metrics", JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("earnwave:activity", { detail: next }));
  return next;
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
  const [csrfToken, setCsrfToken] = useState(null);

  async function refreshCsrfToken() {
    try {
      const response = await fetch("/api/csrf-token", { credentials: "include" });
      const payload = await response.json();
      if (response.ok && payload.csrfToken) {
        setCsrfToken(payload.csrfToken);
        return payload.csrfToken;
      }
    } catch (error) {
      console.warn("Failed to refresh CSRF token", error);
    }
    return null;
  }

  useEffect(() => {
    if (session?.token) {
      refreshCsrfToken();
    }
  }, [session?.token]);

  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    headers["x-device-hash"] = await getDeviceFingerprint();

    const method = (options.method || "GET").toUpperCase();
    if (method !== "GET") {
      const token = csrfToken || (session?.token ? await refreshCsrfToken() : null);
      if (token) headers["x-csrf-token"] = token;
    }

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
  const loggedInNavItems = [
    ["/surveys", "Surveys"],
    ["/dashboard", "Dashboard"],
    ["/wallet", "Wallet"],
    ["/referrals", "Referrals"],
    ["/support", "Support"]
  ];
  const loggedOutNavItems = [
    ["/surveys", "Surveys"],
    ["/how-it-works", "How It Works"],
    ["/offers", "Rewards"],
    ["/trust", "Trust"]
  ];
  const adminItems = isAdmin ? [["/analytics", "Analytics"], ["/admin", "Admin"]] : [];
  const navItems = isAuthed ? loggedInNavItems : loggedOutNavItems;

  return (
    <>
      <header className="header">
        <div className="container nav">
          <button className="logo ghost" onClick={() => navigate("/")} aria-label="EarnWave home">
            <BrandLogo />
          </button>
          <nav className="nav-links">
            {[...navItems, ...adminItems].map(([path, label]) => (
              <button key={path} className={route === path ? "active-link" : ""} onClick={() => {
                if (path === "/surveys") trackEvent("surveys_nav_click", { route: path });
                navigate(path);
              }}>{label}</button>
            ))}
            {isAuthed ? (
              <>
                <button
                  className="topbar-balance nav-balance"
                  type="button"
                  onClick={() => navigate("/wallet")}
                  aria-label="Open wallet balance"
                  title="Open wallet"
                >
                  {formatBalance(api.session?.user || {}, api.session?.user?.balance_wavecoins ?? dollarsToWaveCoins(api.session?.user?.balance || 0))}
                </button>
                <TopNotifications api={api} navigate={navigate} />
                <button className="icon-link" onClick={() => { api.logout(); navigate("/"); }}><LogOut size={17} /> Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/login")}>Login</button>
                <button className="btn" onClick={() => navigate("/signup")}>Create Account</button>
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
          <Metric value="2" label="Survey partners live" />
          <Metric value="100%" label="Payouts reviewed first" />
          <Metric value="100 WC" label="Equals $1.00" />
          <Metric value="Daily" label="Progress loops built in" />
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
          <div className="eyebrow"><ShieldCheck size={16} /> Reviewed payouts - clear WaveCoins - trusted survey walls</div>
          <h1>Ride the Reward Wave.</h1>
          <p className="hero-copy">Earn WaveCoins through surveys, games, apps, and offers. Redeem rewards through PayPal and gift cards.</p>
          <div className="actions">
            <button className="btn xl" onClick={() => navigate("/signup")}>Create Free Account <ArrowRight size={18} /></button>
            <button className="btn alt xl" onClick={() => navigate("/surveys")}>Browse Surveys</button>
          </div>
          <p className="cta-helper">100 WaveCoins = $1.00. Payouts are reviewed before being sent.</p>
          <div className="conversion-strip" aria-label="WaveCoins conversion examples">
            <Metric value="500 WC" label="$5" />
            <Metric value="1,000 WC" label="$10" />
            <Metric value="2,500 WC" label="$25" />
          </div>
        </div>
        <div className="hero-product" aria-label="Animated earnings dashboard preview">
          <div className="dash-window">
            <div className="window-top"><span /><span /><span /><strong>EarnWave Live</strong></div>
            <div className="balance-panel hero-balance">
              <div>
                <p>Ready to cash out</p>
                <div className="balance count-up">4,875 WaveCoins</div>
              </div>
              <span className="tag blue"><TrendingUp size={14} /> $48.75</span>
              <Meter value={76} />
              <p>76% toward today&apos;s progress tier</p>
            </div>
            <div className="hero-chart">
              {analyticsSeries.map((item, index) => <span key={item.day} style={{ height: `${32 + index * 7}%` }} />)}
            </div>
            <div className="feed-card">
              <div className="feed-title"><Activity size={16} /> Live earning paths</div>
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
  const cards = ENABLE_TRENDING_MOCK_OFFERS ? trendingEarnCards : trendingEarnCards.map(card => ({ ...card, rewardWaveCoins: null, rewardUsdCents: null, rewardLabel: "Reward varies", label: "Curated" }));
  return (
    <section className="home-section-tight">
      <div className="container">
        <SectionTitle title="Trending Ways to Earn" copy="Launch-mode examples show the kinds of surveys, games, apps, and offers EarnWave is built to route clearly." action={<span className="tag amber">Example rewards</span>} />
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
          <Metric value="100 WC" label="$1" />
          <Metric value="500 WC" label="$5" />
          <Metric value="1,000 WC" label="$10" />
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section>
      <div className="container">
        <SectionTitle title="How EarnWave Works" copy="Pick offers, earn WaveCoins, track your progress, and cash out with confidence." />
        <div className="process-grid">
          <div className="card process-card"><span className="rank">1</span><h3>Play Games & Complete Surveys</h3><p>Choose from surveys, games, apps, and special offers.</p></div>
          <div className="card process-card"><span className="rank">2</span><h3>Earn WaveCoins</h3><p>Complete tasks and watch your WaveCoin balance grow.</p></div>
          <div className="card process-card"><span className="rank">3</span><h3>Track Progress</h3><p>Monitor rewards, streaks, referrals, and account activity.</p></div>
          <div className="card process-card"><span className="rank">4</span><h3>Cash Out</h3><p>Redeem PayPal cash or gift cards after payout review.</p></div>
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
          <SectionTitle title="Trust built into every payout" copy="EarnWave reviews payouts before sending them to reduce fraud and protect the platform." />
          <div className="security-list">
            {["Fraud monitoring", "Device fingerprinting", "Payout review queue", "Ledger audit trail"].map(item => (
              <div className="security-row" key={item}><CheckCircle size={18} /><span>{item}</span></div>
            ))}
          </div>
        </div>
        <div className="card security-panel">
          <div className="risk-score"><span>Payout review</span><strong>Manual first</strong></div>
          <Meter value={72} />
          <div className="row"><span>Provider callback</span><span className="pill">Tracked</span></div>
          <div className="row"><span>Withdrawal status</span><span className="pill blue">Reviewed</span></div>
          <div className="row"><span>Balance changes</span><span className="pill">Ledgered</span></div>
        </div>
      </div>
    </section>
  );
}

function PayoutMethodsSection() {
  const methods = [
    <PaymentMethod key="paypal" icon={<CreditCard />} title="PayPal Cash" copy="Receive cash to your PayPal account after review." />,
    <PaymentMethod key="tremendous" icon={<Gift />} title="Tremendous Gift Cards" copy="Redeem gift cards through Tremendous." />,
    <PaymentMethod key="manual" icon={<Wallet />} title="Manual Review" copy="Payouts are reviewed before being sent to protect members and the platform." />
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
    { icon: <ClipboardList />, title: "Built for students", copy: "Quick surveys and simple progress tracking fit into small breaks without confusing payout rules." },
    { icon: <Gamepad2 />, title: "Built for gamers", copy: "Game, app, and quest-style earning paths can be surfaced as provider inventory grows." },
    { icon: <Rocket />, title: "Built for side hustlers", copy: "Clear reward credits, reviewed cashouts, referrals, and streaks support consistent earning habits." }
  ];
  return (
    <section>
      <div className="container">
        <SectionTitle title="What EarnWave is built for" copy="Honest launch-safe benefits for the audiences EarnWave is designed to serve." />
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
            <h2>Start earning WaveCoins with a reviewed payout path.</h2>
            <p>Browse surveys, build progress, and redeem through PayPal or Tremendous gift cards after review.</p>
          </div>
          <button className="btn xl" onClick={() => navigate("/signup")}>Create Free Account <ArrowRight size={18} /></button>
        </div>
      </div>
    </section>
  );
}

function OffersPage({ api }) {
  const [offers, setOffers] = useState([]);
  const [providers, setProviders] = useState(defaultOfferwallProviders);
  const [filter, setFilter] = useState(() => new URLSearchParams(window.location.search).get("category") || "All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [providerNotice, setProviderNotice] = useState("Choose CPX Research or TheoremReach to open a secure survey wall.");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    api.request("/offerwalls/providers").then(data => {
      const nextProviders = data.providers || defaultOfferwallProviders;
      setProviders(nextProviders);
      const hasLiveProviders = Object.values(nextProviders).some(provider => ["cpx", "theorem"].includes(provider.key) && provider.enabled);
      setOffers(offersForEnabledProviders(nextProviders, { includeDevelopmentMocks: import.meta.env.DEV && !hasLiveProviders }));
    }).catch(() => {
      setOffers(offersForEnabledProviders(defaultOfferwallProviders, { includeDevelopmentMocks: import.meta.env.DEV }));
    }).finally(() => {
      window.setTimeout(() => setLoading(false), 360);
    });
  }, []);

  async function openProvider(provider, offer) {
    trackEvent("offer_card_clicked", { provider, offerId: offer?.id, category: offer?.category });
    try {
      const launch = await api.request(`/offerwalls/${provider}/launch`);
      if (!launch.configured) {
        setProviderNotice(launch.message);
        return;
      }
      setModal({ provider, name: providers[provider]?.name || offer?.provider || "Survey provider", url: launch.url, integration: launch.integration, scriptSrc: launch.scriptSrc, config: launch.config });
    } catch (error) {
      setProviderNotice("Log in with a verified email before starting surveys.");
    }
  }

  function closeModal() {
    if (modal?.provider) trackEvent("offer_modal_closed", { provider: modal.provider });
    setModal(null);
  }

  const enabledProviders = Object.values(providers).filter(provider => ["cpx", "theorem"].includes(provider.key) && provider.enabled);
  const categoryFiltered = filterOffersByCategory(offers, filter);
  const visible = categoryFiltered.filter(offer => `${offer.title} ${offer.provider} ${offer.category}`.toLowerCase().includes(query.toLowerCase()));
  const surveyOffers = offers.filter(offer => offer.category === "Surveys").slice(0, 4);
  const topEarners = [
    { name: "SurveyAce", earned: 18450 },
    { name: "NovaEarns", earned: 14320 },
    { name: "WaveHunter", earned: 9850 }
  ];

  return (
    <main className="page">
      <div className="container">
        <div className="offerwall-hero">
          <div>
            <div className="eyebrow"><ClipboardList size={16} /> Survey offerwalls</div>
            <h1>Earn WaveCoins with CPX and TheoremReach surveys.</h1>
            <p className="hero-copy">EarnWave currently supports two trusted survey offerwalls. Complete qualifying surveys, then rewards are verified server-side before payout.</p>
            <div className="actions">
              <span className="tag">100 WaveCoins = $1.00</span>
              <span className="tag blue">{enabledProviders.length ? `${enabledProviders.length} provider${enabledProviders.length === 1 ? "" : "s"} ready` : "Providers hidden until ready"}</span>
              <span className="tag amber">Daily streak active</span>
            </div>
          </div>
          <div className="offerwall-balance-widget">
            <span>Animated balance</span>
            <strong className="count-up">4,875 WaveCoins</strong>
            <p>$48.75 redeemable estimate</p>
            <Meter value={74} />
          </div>
        </div>

        <div className="offerwall-widgets">
          <div className="daily-streak-widget"><Flame size={20} /><div><strong>7 day streak</strong><span>Claim today's bonus to keep your multiplier alive.</span></div></div>
          <div className="top-earners-widget">
            <strong>Top Earners Today</strong>
            {topEarners.map((earner, index) => <div className="earner-mini" key={earner.name}><span>#{index + 1}</span><p>{earner.name}</p><strong>{formatBalance({}, earner.earned)}</strong></div>)}
          </div>
        </div>

        <SectionTitle title="Survey offerwalls" copy="Only CPX Research and TheoremReach are shown until more providers are approved and configured." action={<span className="tag blue">Verified walls</span>} />
        <div className="featured-carousel" aria-label="Survey offers row">
          {(loading ? Array.from({ length: 3 }) : surveyOffers).map((offer, index) => loading ? <OfferSkeleton key={index} /> : <OfferCard key={offer.id} offer={offer} actionLabel="Start Offer" onStart={() => openProvider(offer.providerKey, offer)} />)}
        </div>
        <div className="notice offerwall-notice">{providerNotice}</div>
        <div className="toolbar">
          <div className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search survey providers" /></div>
          <div className="filters"><Filter size={18} />{offerCategoryTabs.map(item => <button key={item} className={filter === item ? "filter active" : "filter"} onClick={() => setFilter(item)}>{item}</button>)}</div>
        </div>
        {offers.some(offer => offer.isDevelopmentOnly) && <div className="notice offerwall-notice">Development-only survey preview data. Production only shows configured CPX and TheoremReach cards.</div>}
        <div className="offers-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <OfferSkeleton key={index} />)
            : visible.map(offer => <OfferCard key={offer.id} offer={offer} onStart={() => openProvider(offer.providerKey, offer)} />)}
        </div>
        {!loading && visible.length === 0 && (
          <div className="card empty-offers-card">
            <h3>No configured survey cards yet</h3>
            <p>CPX Research and TheoremReach cards will appear here when their credentials are configured. Other offerwalls stay hidden from users.</p>
          </div>
        )}
      </div>
      {modal && <SurveyModal modal={modal} onClose={closeModal} />}
    </main>
  );
}

export function SurveysPage({ api }) {
  const user = api.session?.user || {};
  const [providers, setProviders] = useState(defaultOfferwallProviders);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("Choose a trusted survey provider to launch a secure survey wall.");
  const [modal, setModal] = useState(null);
  const balanceWaveCoins = userAmountWaveCoins(user, user.balance);
  const pendingWaveCoins = Number(user.pending_wavecoins ?? user.pending_rewards_wavecoins ?? dollarsToWaveCoins(user.pending_rewards || 0));
  const completedSurveys = Number(user.completed_surveys || user.completed_offers || 0);
  const approvedRewards = userAmountWaveCoins(user, user.total_earned, "total_earned_wavecoins");
  const streak = Number(user.streak_count || user.streak || 2);
  const cashoutMinimum = 500;
  const cashoutProgress = Math.min(100, Math.round((balanceWaveCoins / cashoutMinimum) * 100));
  const bestProvider = surveyProviders.find(provider => provider.key === "theorem") || surveyProviders[0];
  const totalAvailableWaveCoins = surveyProviders.reduce((sum, provider) => sum + Number(provider.maxWaveCoins || 0), 0);
  const successRate = completedSurveys > 0 ? "82%" : "New";
  const missions = [
    { title: "Complete one survey", reward: "+50 WaveCoins", complete: completedSurveys > 0 },
    { title: "Open CPX Research", reward: "+25 WaveCoins", complete: false, provider: "cpx" },
    { title: "Open TheoremReach", reward: "+25 WaveCoins", complete: false, provider: "theorem" },
    { title: "Keep your streak active", reward: "+10 WaveCoins", complete: streak > 1 }
  ];

  useEffect(() => {
    api.request("/offerwalls/providers").then(data => {
      setProviders(data.providers || defaultOfferwallProviders);
    }).catch(() => {}).finally(() => {
      window.setTimeout(() => setLoading(false), 320);
    });
  }, []);

  async function openSurveyProvider(provider) {
    trackEvent("survey_provider_opened", { provider });
    try {
      const launch = await api.request(`/offerwalls/${provider}/launch`);
      if (!launch.configured) {
        setNotice(launch.message || "This survey provider is waiting for credentials.");
        return;
      }
      const providerName = providers[provider]?.name || surveyProviders.find(item => item.key === provider)?.name || "Survey provider";
      setModal({ provider, name: providerName, url: launch.url, integration: launch.integration, scriptSrc: launch.scriptSrc, config: launch.config });
    } catch (error) {
      setNotice("Log in with a verified email before opening survey walls.");
    }
  }

  function closeModal() {
    if (modal?.provider) trackEvent("survey_modal_closed", { provider: modal.provider });
    setModal(null);
  }

  return (
    <main className="page surveys-page">
      <div className="container">
        <section className="surveys-hero upgraded">
          <div className="surveys-hero-copy">
            <div className="eyebrow"><Sparkles size={16} /> Trusted survey earning</div>
            <h1>Turn Your Opinions Into Rewards</h1>
            <p className="hero-copy">Complete surveys from trusted partners and earn WaveCoins toward PayPal and gift card rewards.</p>
            <div className="actions">
              <button className="btn xl" onClick={() => openSurveyProvider(bestProvider.key)}>Start Best Survey <ArrowRight size={18} /></button>
              <span className="tag blue"><ShieldCheck size={14} /> Verified providers</span>
            </div>
          </div>
          <div className="survey-balance-card cashout-focused">
            <span>Your survey balance</span>
            <strong>{formatBalance(user, balanceWaveCoins)}</strong>
            {user.preferredBalanceDisplay === "coins" && <p>{money(waveCoinsToUsd(balanceWaveCoins))} USD estimate</p>}
            <div className="cashout-track compact-track">
              <div className="row"><span>{balanceWaveCoins.toLocaleString()} / {cashoutMinimum.toLocaleString()} WaveCoins</span><strong>{cashoutProgress}% to first cashout</strong></div>
              <Meter value={cashoutProgress} />
            </div>
            <small>100 WaveCoins = $1.00.</small>
          </div>
        </section>

        <div className="notice offerwall-notice">{notice}</div>

        <section className="best-survey-grid">
          <div className="card best-survey-card">
            <div>
              <span className="eyebrow"><Trophy size={15} /> Best Survey Right Now</span>
              <h2>{bestProvider.name}</h2>
              <p>Highest current reward range with secure tracking and provider callback verification.</p>
            </div>
            <div className="best-survey-facts">
              <span className="tag amber">Up to {bestProvider.maxWaveCoins} WaveCoins</span>
              <span className="tag blue">Estimated time: {bestProvider.averageTime}</span>
              <span className="pill">Live</span>
            </div>
            <button className="btn" onClick={() => openSurveyProvider(bestProvider.key)}>Start {bestProvider.name} <ArrowRight size={17} /></button>
          </div>
          <div className="card available-earnings-card">
            <SectionTitle title="Available Earnings" copy="Estimates show possible user rewards before provider qualification." />
            <div className="earnings-summary-grid">
              <Metric value="455 WC" label="CPX Research up to" />
              <Metric value="420 WC" label="TheoremReach up to" />
              <Metric value={`${totalAvailableWaveCoins} WC`} label="Total estimate" />
              <Metric value={money(waveCoinsToUsd(totalAvailableWaveCoins))} label="Dollar estimate" />
            </div>
          </div>
        </section>

        <section className="survey-missions-section">
          <SectionTitle title="Today's Missions" copy="Small bonus goals keep your survey progress moving." action={<span className="tag amber">Up to +110 WaveCoins</span>} />
          <div className="mission-grid">
            {missions.map(mission => (
              <button className={mission.complete ? "mission-card complete" : "mission-card"} key={mission.title} type="button" onClick={() => mission.provider ? openSurveyProvider(mission.provider) : undefined}>
                <span>{mission.complete ? <CheckCircle size={17} /> : <Clock size={17} />}</span>
                <strong>{mission.title}</strong>
                <em>{mission.reward}</em>
                <small>{mission.complete ? "Completed" : "Incomplete"}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="survey-account-stats card">
          <SectionTitle title="Survey Stats" copy={completedSurveys ? "Your survey profile is building with each verified completion." : "Start your first survey to build your earning profile."} />
          <div className="account-overview-grid survey-stat-grid">
            <Stat label="Surveys completed" value={completedSurveys} />
            <Stat label="Approved rewards" value={formatBalance(user, approvedRewards)} />
            <Stat label="Pending rewards" value={formatBalance({ preferredBalanceDisplay: "coins" }, pendingWaveCoins)} />
            <Stat label="Success rate" value={successRate} />
            <Stat label="Current streak" value={`${streak} days`} />
          </div>
        </section>

        <SectionTitle title="Survey Partners" copy="Open survey walls in a focused modal without leaving EarnWave." action={<span className="tag">Pending rewards verify first</span>} />
        <div className="survey-provider-grid improved">
          {loading
            ? surveyProviders.map(provider => <SurveyProviderSkeleton key={provider.key} />)
            : surveyProviders.map(provider => (
              <SurveyProviderCard
                key={provider.key}
                provider={provider}
                enabled={Boolean(providers[provider.key]?.enabled)}
                onOpen={() => openSurveyProvider(provider.key)}
              />
            ))}
        </div>

        <section className="survey-trust-row" aria-label="Survey trust signals">
          {[
            [ShieldCheck, "Verified survey providers"],
            [KeyRound, "Secure tracking"],
            [Lock, "Fraud-protected withdrawals"],
            [ClipboardList, "Provider callback verification"],
            [CreditCard, "Clear payout rules"]
          ].map(([Icon, label]) => <div className="trust-signal-card" key={label}><Icon size={18} /><span>{label}</span></div>)}
        </section>

        <section className="survey-trust-section">
          <SectionTitle title="How survey rewards work" copy="EarnWave tracks provider callbacks and reviews rewards before payout." />
          <div className="process-grid survey-process-grid">
            {[
              [Search, "Choose a provider", "Pick CPX Research or TheoremReach based on reward range, time, and fit."],
              [ClipboardList, "Complete a survey", "Answer carefully and finish the partner flow with EarnWave tracking active."],
              [Clock, "Reward may pend", "Some survey credits wait for provider verification before payout."],
              [CheckCircle, "Approved rewards become available", "Verified rewards move into your available WaveCoins balance."]
            ].map(([Icon, title, copy], index) => <Feature key={title} icon={<span><Icon size={18} /></span>} title={`${index + 1}. ${title}`} copy={copy} />)}
          </div>
        </section>

        <section className="recent-survey-activity card">
          <SectionTitle title="Recent EarnWave Activity" copy="Preview activity examples are shown until live public activity is available." action={<span className="tag amber">Preview examples</span>} />
          <div className="activity-preview-list">
            {[
              ["Ma***", "earned 125 WaveCoins", "TheoremReach"],
              ["Jo***", "started CPX Research", "Survey started"],
              ["Pr***", "cashed out $10", "PayPal"],
              ["Al***", "completed a survey", "Pending review"]
            ].map(([name, action, meta]) => <div className="activity-preview-row" key={`${name}-${action}`}><span className="avatar">{name.slice(0, 1)}</span><strong>{name}</strong><p>{action}</p><em>{meta}</em></div>)}
          </div>
        </section>
      </div>

      {modal && <SurveyModal modal={modal} onClose={closeModal} />}
    </main>
  );
}

function SurveyProviderCard({ provider, enabled, onOpen }) {
  return (
    <article className="card survey-provider-card" style={{ "--provider-gradient": provider.gradient }}>
      <div className="survey-provider-logo" aria-hidden="true">
        <ClipboardSurveyIcon name={provider.name} />
      </div>
      <div className="survey-provider-copy">
        <div className="offer-head">
          <div>
            <h3>{provider.name}</h3>
            <p>{provider.description}</p>
          </div>
          <span className={enabled ? "pill" : "pill blue"}>{enabled ? "Live" : "Preview"}</span>
        </div>
        <div className="survey-provider-stats improved">
          <span><Gift size={15} /> {provider.rewardRange}</span>
          <span><DollarSign size={15} /> {provider.usdRange}</span>
          <span><Clock size={15} /> Avg. {provider.averageTime}</span>
          <span><Users size={15} /> {provider.userType}</span>
          <span><ShieldCheck size={15} /> Trusted provider</span>
          <span><CheckCircle size={15} /> Status: {enabled ? "Live" : "Preview"}</span>
        </div>
        <div className="provider-trust-note"><ShieldCheck size={15} /> Rewards verify after provider callback</div>
        <button className="btn" type="button" onClick={onOpen}>Open Surveys <ArrowRight size={17} /></button>
      </div>
    </article>
  );
}

function ClipboardSurveyIcon({ name }) {
  return (
    <div className="survey-logo-mark">
      <PackageCheck size={30} />
      <strong>{name.split(" ").map(part => part[0]).join("").slice(0, 3)}</strong>
    </div>
  );
}

function SurveyProviderSkeleton() {
  return (
    <div className="card survey-provider-card skeleton-card" aria-label="Loading survey provider">
      <div className="survey-provider-logo skeleton-line" />
      <div className="survey-provider-copy">
        <div className="skeleton-line wide" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-line button" />
      </div>
    </div>
  );
}

function SurveyModal({ modal, onClose }) {
  return (
    <div className="survey-modal-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="survey-modal" role="dialog" aria-modal="true" aria-label={`${modal.name} survey wall`}>
        <div className="survey-modal-head">
          <div>
            <span>Survey wall</span>
            <strong>{modal.name}</strong>
          </div>
          <button className="icon-link" type="button" onClick={onClose}>Close</button>
        </div>
        {modal.integration === "cpx_script"
          ? <CpxFullscreenWidget modal={modal} />
          : <iframe title={`${modal.name} surveys`} src={modal.url} loading="lazy" />}
      </div>
    </div>
  );
}

function CpxFullscreenWidget({ modal }) {
  const [status, setStatus] = useState("loading");
  const [useFallback, setUseFallback] = useState(false);
  const statusRef = useRef("loading");

  function updateStatus(nextStatus) {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }

  useEffect(() => {
    if (!modal?.config || !modal?.scriptSrc) return undefined;

    const scriptId = "earnwave-cpx-script-tag";
    const containerId = modal.config?.script_config?.[0]?.div_id || "fullscreen";
    updateStatus("loading");
    setUseFallback(false);
    document.getElementById(scriptId)?.remove();
    window.config = {
      ...modal.config,
      functions: {
        no_surveys_available: () => {
          updateStatus("no_surveys");
          window.dispatchEvent(new CustomEvent("earnwave:cpx_no_surveys_available"));
        },
        count_new_surveys: countsurveys => {
          updateStatus(Number(countsurveys || 0) > 0 ? "ready" : "no_surveys");
          window.dispatchEvent(new CustomEvent("earnwave:cpx_count_new_surveys", { detail: { count: countsurveys } }));
        },
        get_all_surveys: surveys => {
          updateStatus(Array.isArray(surveys) && surveys.length > 0 ? "ready" : "no_surveys");
          window.dispatchEvent(new CustomEvent("earnwave:cpx_get_all_surveys", { detail: { surveys } }));
        },
        get_transaction: transactions => {
          window.dispatchEvent(new CustomEvent("earnwave:cpx_get_transaction", { detail: { transactions } }));
        }
      }
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "text/javascript";
    script.src = modal.scriptSrc;
    script.async = true;
    script.onload = () => {
      window.setTimeout(() => {
        const container = document.getElementById(containerId);
        if (statusRef.current === "loading" && !container?.querySelector("iframe, a[href], button")) setUseFallback(true);
      }, 3500);
    };
    script.onerror = () => {
      updateStatus("error");
      setUseFallback(true);
    };
    document.body.appendChild(script);

    const fallbackTimer = window.setTimeout(() => {
      if (statusRef.current === "loading") setUseFallback(true);
    }, 6000);

    return () => {
      window.clearTimeout(fallbackTimer);
      document.getElementById(scriptId)?.remove();
      if (window.config?.general_config?.ext_user_id === modal.config?.general_config?.ext_user_id) {
        delete window.config;
      }
    };
  }, [modal]);

  return (
    <div className="cpx-fullscreen-shell">
      <div className="cpx-loading-copy">
        <strong>{useFallback ? "Opening CPX Research surveys" : "Loading CPX Research surveys"}</strong>
        <span>
          {status === "no_surveys"
            ? "CPX says there may be no matched surveys for this profile right now."
            : useFallback
              ? "Using the direct CPX wall because the script widget did not render."
              : "Matched surveys will appear here when available."}
        </span>
      </div>
      {useFallback
        ? <iframe title="CPX Research surveys" src={modal.url} loading="lazy" />
        : <div style={{ maxWidth: 950, margin: "auto" }} id="fullscreen" />}
    </div>
  );
}

function Dashboard({ api, navigate }) {
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
        <button className="btn summary-cta" onClick={() => navigate("/surveys")}>Start Best Offer <ArrowRight size={17} /></button>
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
        trackActivity("clicks");
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
        trackActivity("clicks");
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
      provider: "CPX Research",
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
      <SectionTitle title="Available Offers" copy="Choose a trusted survey provider. Final rewards verify after the provider callback." action={<span className="tag">Available</span>} />
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
            <div className="provider-trust-note"><ShieldCheck size={15} /> Rewards verify after provider callback</div>
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

function OnboardingChecklist({ user, navigate }) {
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

function PayoutProofSection({ compact = false }) {
  const [proofs, setProofs] = useState(null);

  useEffect(() => {
    fetch("/api/public/payout-proofs")
      .then(response => response.json())
      .then(data => setProofs(data.proofs || []))
      .catch(() => setProofs([]));
  }, []);

  const visibleProofs = proofs?.length ? proofs : ENABLE_PREVIEW_PAYOUTS ? payoutProofPreview : [];
  const isPreview = !proofs?.length;

  return (
    <section className={compact ? "payout-proof-section compact" : "payout-proof-section"}>
      <SectionTitle
        title="Recent Payouts"
        copy={isPreview ? "Live completed payouts will appear here after the first verified payout. Preview examples are clearly labeled." : "Recent completed payouts with private user details redacted."}
        action={<span className={isPreview ? "tag amber" : "tag"}><ShieldCheck size={14} /> {isPreview ? "Preview examples" : "Verified proof"}</span>}
      />
      {visibleProofs.length ? (
        <div className="payout-proof-grid">
          {visibleProofs.map(item => (
          <div className="card payout-proof-card" key={`${item.name}-${item.completedAt}`}>
            <div className="payout-proof-top">
              <span className="avatar">{item.name.slice(0, 1)}</span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.preview ? "Preview until live payout" : item.completedAt}</p>
              </div>
              <span className={item.preview ? "pill blue" : "pill"}>{item.status}</span>
            </div>
            <div className="payout-proof-amount">
              <strong>{formatBalance({ preferredBalanceDisplay: "coins" }, item.amountWaveCoins)}</strong>
              <span>{money(waveCoinsToUsd(item.amountWaveCoins))}</span>
            </div>
            <div className="payout-proof-meta">
              <span>Method: {item.method}</span>
              <strong>{item.preview ? "Preview example" : "Completed"}</strong>
            </div>
          </div>
          ))}
        </div>
      ) : (
        <div className="card payout-empty-state">
          <div className="icon"><CreditCard /></div>
          <h3>Live completed payouts will appear here after the first verified payout.</h3>
          <p>No fake payout proof is shown in production when preview payouts are disabled.</p>
        </div>
      )}
    </section>
  );
}

function WalletPage({ navigate, api }) {
  const [walletUser, setWalletUser] = useState(api.session?.user || { balance: 48.75 });
  const minimumCashoutWaveCoins = 500;
  const [withdrawal, setWithdrawal] = useState({ method: "PayPal", amountWaveCoins: "", destinationType: "EMAIL", destinationValue: "", turnstileToken: "" });
  const [notice, setNotice] = useState("All cashouts enter review before approval.");
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([
    { created_at: "2026-06-05", type: "offer_completion", description: "Completed Kingdom Builder", amount: 28.4, direction: "credit" },
    { created_at: "2026-06-04", type: "withdrawal_request", description: "PayPal withdrawal requested", amount: 18.5, direction: "debit" }
  ]);

  useEffect(() => {
    api.request("/auth/me").then(data => {
      if (data.user) {
        setWalletUser(data.user);
        if (api.session) api.save({ ...api.session, user: data.user });
      }
    }).catch(() => {});
    api.request("/account/transactions").then(data => setTransactions(data.transactions || [])).catch(() => {});
    api.request("/wallet/withdrawals").then(data => setWithdrawals(data.withdrawals || [])).catch(() => {});
  }, []);

  const availableWaveCoins = userAmountWaveCoins(walletUser, walletUser.balance);
  const pendingWaveCoins = transactions
    .filter(item => ["pending", "held", "review"].includes(String(item.status || "").toLowerCase()))
    .reduce((sum, item) => sum + Number(item.amount_wavecoins ?? dollarsToWaveCoins(item.amount || 0)), 0);
  const cashoutProgress = Math.min(100, Math.round((availableWaveCoins / minimumCashoutWaveCoins) * 100));
  const latestWithdrawal = withdrawals[0];
  const payoutStatus = latestWithdrawal?.status || "No withdrawal yet";

  async function submitWithdrawal(event) {
    event.preventDefault();
    try {
      const result = await api.request("/wallet/withdrawals", {
        method: "POST",
        body: JSON.stringify({ ...withdrawal, amountWaveCoins: Number(withdrawal.amountWaveCoins), balance: walletUser.balance })
      });
      setWithdrawals([result.withdrawal, ...withdrawals]);
      setNotice(`Withdrawal ${result.withdrawal.status}: risk score ${result.risk.score} (${result.risk.signals.join(", ")}).`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Wallet" navigate={navigate} api={api}>
      <DashboardTop kicker="Wallet" title="Payout center" copy="WaveCoins are EarnWave reward credits. 100 WaveCoins equals $1.00 when redeemed." action={<span className="tag">500 WaveCoins minimum cashout</span>} />
      <div className="wallet-summary-grid">
        <MiniStat label="Available balance" value={formatBalance(walletUser, availableWaveCoins)} />
        <MiniStat label="Pending rewards" value={formatBalance(walletUser, pendingWaveCoins)} />
        <MiniStat label="Minimum cashout" value={formatBalance(walletUser, minimumCashoutWaveCoins)} />
        <MiniStat label="Payout status" value={payoutStatus} />
      </div>
      <div className="wallet-grid">
        <div className="card">
          <p>Available Balance</p>
          <div className="balance">{formatBalance(walletUser, availableWaveCoins)}</div>
          <Meter value={cashoutProgress} />
          <div className="notice">500 WaveCoins minimum cashout. WaveCoins are EarnWave reward credits. 100 WaveCoins equals $1.00 when redeemed.</div>
          <div className="wallet-clarity-list">
            <div className="row"><span>Ready to withdraw</span><span className="pill">{formatBalance(walletUser, availableWaveCoins)}</span></div>
            <div className="row"><span>Pending rewards</span><span className="pill blue">{formatBalance(walletUser, pendingWaveCoins)}</span></div>
            <div className="row"><span>Minimum cashout</span><span className="pill amber">{formatBalance(walletUser, minimumCashoutWaveCoins)}</span></div>
          </div>
          <label>Balance display<select value={walletUser.preferredBalanceDisplay || "coins"} onChange={async event => {
            const preferredBalanceDisplay = event.target.value;
            const nextUser = { ...walletUser, preferredBalanceDisplay };
            setWalletUser(nextUser);
            if (api.session) api.save({ ...api.session, user: nextUser });
            await api.request("/account/preferences", { method: "PATCH", body: JSON.stringify({ preferredBalanceDisplay }) }).catch(() => {});
          }}><option value="coins">WaveCoins</option><option value="usd">USD</option><option value="both">WaveCoins + USD</option></select></label>
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
            <label>Amount in WaveCoins<input type="number" min="500" step="1" placeholder="2500" value={withdrawal.amountWaveCoins} onChange={event => setWithdrawal({ ...withdrawal, amountWaveCoins: event.target.value })} /></label>
            {withdrawal.method === "Crypto" && (
              <label>Network<select value={withdrawal.destinationType} onChange={event => setWithdrawal({ ...withdrawal, destinationType: event.target.value })}><option>ETH</option><option>SOL</option><option>AVAX</option><option>MATIC</option></select></label>
            )}
            <label>{withdrawal.method === "Crypto" ? "Wallet address" : "Recipient email"}<input required placeholder={withdrawal.method === "Crypto" ? "0x..." : "member@example.com"} value={withdrawal.destinationValue} onChange={event => setWithdrawal({ ...withdrawal, destinationValue: event.target.value })} /></label>
            <TurnstileField onToken={token => setWithdrawal(current => ({ ...current, turnstileToken: token }))} />
            <button className="btn">Request Withdrawal</button>
            <div className="notice">{notice}</div>
          </form>
        </div>
        <div className="card">
          <SectionTitle title="Withdrawal history" copy="Every payout request shows its method, amount, and current review status." />
          <DataTable rows={(withdrawals.length ? withdrawals : [
            { created_at: "No requests yet", method: "Choose a payout method", amount: 0, status: "Not started" }
          ]).map(item => [
            String(item.created_at || "").slice(0, 10) || "New",
            item.method || "Method",
            formatBalance(walletUser, item.amount_wavecoins ?? dollarsToWaveCoins(item.amount ?? item.amount_cents / 100)),
            item.status || "Pending"
          ])} />
        </div>
        <div className="card wallet-history-card">
          <SectionTitle title="Ledger history" copy="Auditable credits and debits tied to offers, bonuses, streaks, and withdrawals." />
          <DataTable rows={transactions.map(item => [
            String(item.created_at || "").slice(0, 10),
            item.description,
            `${item.direction === "debit" ? "-" : "+"}${formatBalance(walletUser, item.amount_wavecoins ?? dollarsToWaveCoins(item.amount))}`,
            item.type
          ])} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function HowItWorksPage({ navigate }) {
  const steps = [
    ["Play Games & Complete Surveys", "Choose from surveys, games, apps, and special offers."],
    ["Earn WaveCoins", "Complete tasks and watch your WaveCoin balance grow."],
    ["Track Progress", "Monitor rewards, streaks, referrals, and account activity."],
    ["Cash Out", "Redeem PayPal cash or gift cards after payout review."]
  ];

  return (
    <main className="page">
      <div className="container">
        <DashboardTop kicker="How it works" title="How EarnWave Works" copy="Pick offers, earn WaveCoins, track your progress, and cash out with confidence." action={<button className="btn" onClick={() => navigate("/signup")}>Create Account</button>} />
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

function TrustPage({ navigate }) {
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

  async function saveBalanceDisplay(preferredBalanceDisplay) {
    const next = { ...preferences, preferredBalanceDisplay };
    setPreferences(next);
    try {
      await api.request("/account/preferences", { method: "PATCH", body: JSON.stringify({ preferredBalanceDisplay }) });
      if (api.session?.user) api.save({ ...api.session, user: { ...api.session.user, preferredBalanceDisplay } });
      setNotice("Balance display saved.");
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
            <label>Balance display<select value={preferences.preferredBalanceDisplay || "coins"} onChange={event => saveBalanceDisplay(event.target.value)}><option value="coins">WaveCoins</option><option value="usd">USD</option><option value="both">WaveCoins + USD</option></select></label>
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
          <div className="mini-alert">Share survey rewards with friends who like quick research tasks.</div>
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
            <strong>{formatBalance(api.session?.user || {}, dollarsToWaveCoins(row.total_earned))}</strong>
            <p>Level {row.level} - {row.streak} day streak</p>
          </div>
        ))}
      </div>
      <div className="card">
        <SectionTitle title="All earners" copy="Clear ranking increases retention without overwhelming new users." />
        <DataTable rows={leaderboard.map((row, index) => [
          `#${index + 1}`,
          row.name,
          formatBalance(api.session?.user || {}, dollarsToWaveCoins(row.total_earned)),
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
    timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    earning_interests: user.earning_interests || ""
  });
  const [notice, setNotice] = useState("Update your username, display name, and public profile info.");
  const interestOptions = ["surveys", "consumer research", "daily streaks", "referrals"];

  function toggleInterest(interest) {
    const current = profile.earning_interests.split(",").map(item => item.trim()).filter(Boolean);
    const next = current.includes(interest)
      ? current.filter(item => item !== interest)
      : [...current, interest];
    setProfile({ ...profile, earning_interests: next.join(",") });
  }

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
          <div className="interest-field">
            <span>Choose earning interests</span>
            <div className="interest-chips">
              {interestOptions.map(interest => {
                const active = profile.earning_interests.split(",").includes(interest);
                return <button className={active ? "interest-chip active" : "interest-chip"} type="button" key={interest} onClick={() => toggleInterest(interest)}>{interest}</button>;
              })}
            </div>
          </div>
          <label>Bio<textarea value={profile.bio} onChange={event => setProfile({ ...profile, bio: event.target.value })} maxLength="280" placeholder="Tell us what kind of rewards you like." /></label>
          <button className="btn" type="submit">Save Profile</button>
          <div className="notice">{notice}</div>
        </form>
        <div className="card">
          <h3>Account status</h3>
          <div className="row"><span>Role</span><span className="pill">{user.role || "user"}</span></div>
          <div className="row"><span>Username</span><span className="pill">{user.username || "Needed"}</span></div>
          <div className="row"><span>Interests</span><span className="pill blue">{user.earning_interests || "Needed"}</span></div>
          <div className="row"><span>Status</span><span className="pill">{user.status || "active"}</span></div>
          <div className="row"><span>Email</span><span className={user.email_verified ? "pill" : "pill amber"}>{user.email_verified ? "Verified" : "Unverified"}</span></div>
          <div className="row"><span>Referral code</span><span className="pill">{user.referral_code || "Generated after login"}</span></div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SupportPage({ navigate, api }) {
  const user = api.session?.user || {};
  const emptyForm = { subject: "", category: "general", priority: "medium", provider: "EarnWave", rewardAmount: "", completionDate: "", message: "", attachmentNames: [], confirmed: false };
  const [form, setForm] = useState(emptyForm);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [notice, setNotice] = useState("Most tickets receive a response within 24 hours.");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizard, setWizard] = useState({ provider: "CPX Research", offerName: "", completionDate: "", rewardAmount: "", proofFiles: [], notes: "" });
  const [openFaq, setOpenFaq] = useState("pending");

  useEffect(() => {
    refreshTickets();
  }, []);

  function refreshTickets() {
    api.request("/account/support/tickets").then(data => {
      const nextTickets = data.tickets || [];
      setTickets(nextTickets);
      setSelectedTicket(current => {
        if (!current) return nextTickets[0] || null;
        return nextTickets.find(ticket => String(ticket.id) === String(current.id)) || nextTickets[0] || null;
      });
    }).catch(() => {});
  }

  function updateForm(next) {
    setForm(current => ({ ...current, ...next }));
  }

  function selectCategory(category) {
    const presets = {
      missing_reward: { subject: "Missing reward claim", category: "missing_reward", priority: "high", provider: "CPX Research", message: "I completed a survey/offer but the reward is missing. Details below." },
      payout: { subject: "Withdrawal or payout review", category: "payout", priority: "high", provider: "EarnWave", message: "I need help with a payout or withdrawal review." },
      account: { subject: "Account access issue", category: "account", priority: "medium", provider: "EarnWave", message: "I need help accessing or updating my account." },
      verification: { subject: "Email or verification issue", category: "verification", priority: "medium", provider: "EarnWave", message: "I need help with email verification or account verification." },
      referral: { subject: "Referral question", category: "referral", priority: "low", provider: "EarnWave", message: "I have a question about referral tracking or rewards." },
      fraud: { subject: "Trust and safety question", category: "fraud", priority: "high", provider: "EarnWave", message: "I need help with a trust and safety review." }
    };
    updateForm(presets[category] || {});
    setNotice("Category selected. Add any dates, proof, and exact reward details before submitting.");
  }

  function handleFiles(event, target = "form") {
    const names = Array.from(event.target.files || []).slice(0, 5).map(file => `${file.name} (${Math.ceil(file.size / 1024)} KB)`);
    if (target === "reply") setReplyAttachments(names);
    else if (target === "wizard") setWizard(current => ({ ...current, proofFiles: names }));
    else updateForm({ attachmentNames: names });
  }

  async function submitTicket(event, override = null) {
    event?.preventDefault?.();
    const payload = override || form;
    if (!payload.confirmed && !override) {
      setNotice("Please confirm the details are accurate before submitting.");
      return;
    }
    try {
      const result = await api.request("/account/support/tickets", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const nextTickets = [result.ticket, ...tickets];
      setTickets(nextTickets);
      setSelectedTicket(result.ticket);
      setForm(emptyForm);
      setNotice("Support ticket created. You can track replies here and by email.");
      setWizardOpen(false);
      setWizardStep(1);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function submitWizard() {
    const payload = {
      subject: `Missing reward claim: ${wizard.offerName || wizard.provider}`,
      category: "missing_reward",
      priority: "high",
      provider: wizard.provider,
      rewardAmount: wizard.rewardAmount,
      completionDate: wizard.completionDate,
      attachmentNames: wizard.proofFiles,
      confirmed: true,
      message: [
        `Provider: ${wizard.provider}`,
        `Offer or survey: ${wizard.offerName}`,
        `Completion date: ${wizard.completionDate}`,
        `Expected reward: ${wizard.rewardAmount}`,
        wizard.notes ? `Notes: ${wizard.notes}` : null
      ].filter(Boolean).join("\n")
    };
    await submitTicket(null, payload);
  }

  async function sendTicketReply(event) {
    event.preventDefault();
    if (!selectedTicket?.id || !reply.trim()) return;
    try {
      const result = await api.request(`/account/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: reply.trim(), attachmentNames: replyAttachments })
      });
      setTickets(current => current.map(ticket => String(ticket.id) === String(result.ticket.id) ? result.ticket : ticket));
      setSelectedTicket(result.ticket);
      setReply("");
      setReplyAttachments([]);
      setNotice("Reply added to your ticket. Support will see it in the queue.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  function startMissingRewardClaim() {
    setWizardOpen(true);
    setWizardStep(1);
    selectCategory("missing_reward");
  }

  const activeTicket = selectedTicket || tickets[0];
  const openTickets = tickets.filter(ticket => !["resolved", "closed", "denied"].includes(ticket.status)).length;
  const lastUpdate = tickets[0]?.updated_at || tickets[0]?.created_at;
  const messages = activeTicket?.messages?.length ? activeTicket.messages : activeTicket ? [{ id: "initial", sender_name: user.name || "You", message: activeTicket.message, created_at: activeTicket.created_at }] : [];
  const faqs = [
    ["appear", "How long do rewards take to appear?", "Many rewards appear as pending after the provider callback. Some surveys require additional provider verification before they become available."],
    ["pending", "Why is my reward pending?", "Pending means EarnWave has not yet received final provider approval or the reward is still under fraud/payout review."],
    ["proof", "What proof should I upload for missing rewards?", "Upload screenshots showing the provider, offer or survey name, completion confirmation, date, and expected reward if available."],
    ["payout", "How long do payout reviews take?", "Most payout review questions receive a support response within 24 hours, but fraud or provider checks can take longer."],
    ["denied", "Can a reward be denied?", "Yes. Rewards may be denied if the provider reverses credit, tracking is incomplete, duplicate accounts are found, or offer rules were not followed."],
    ["reply", "How will I know support replied?", "Replies appear inside your ticket thread and are also sent to your account email when email delivery is configured."],
    ["duplicates", "Do I need to open multiple tickets?", "No. Duplicate tickets can slow down review. Reply to the existing ticket with extra proof or context." ]
  ];

  return (
    <DashboardLayout active="Support" navigate={navigate} api={api}>
      <section className="support-hero-panel">
        <div>
          <span className="eyebrow"><Mail size={16} /> Support center</span>
          <h1>How can we help?</h1>
          <p>Track missing rewards, payout reviews, account issues, and support conversations in one place.</p>
          <div className="actions">
            <button className="btn" onClick={() => document.getElementById("support-ticket-form")?.scrollIntoView({ behavior: "smooth" })}>Open Support Ticket</button>
            <button className="btn alt" onClick={startMissingRewardClaim}>Start Missing Reward Claim</button>
          </div>
        </div>
        <div className="support-hero-stats">
          <Metric value="24h" label="Avg response time" />
          <Metric value="1-7d" label="Missing reward review" />
          <Metric value={openTickets} label="Open tickets" />
          <Metric value={lastUpdate ? String(lastUpdate).slice(0, 10) : "None"} label="Last support update" />
        </div>
      </section>

      <div className="support-expectations">
        {["Most tickets receive a response within 24 hours.", "Missing reward claims may require provider verification.", "Submitting duplicate tickets can slow down review.", "Screenshots help speed up missing reward claims."].map(item => <div className="mini-alert" key={item}><ShieldCheck size={16} /><span>{item}</span></div>)}
      </div>

      <div className="support-category-grid">
        {[
          [Search, "Missing Reward", "Claim a survey or offer that did not credit.", "missing_reward"],
          [CreditCard, "Withdrawal/Payout Review", "Ask about payout status or manual review.", "payout"],
          [KeyRound, "Account Access", "Login, profile, or account access help.", "account"],
          [Mail, "Email or Verification Issue", "Verification links and email delivery.", "verification"],
          [Users, "Referral Question", "Referral code, link, or reward questions.", "referral"],
          [ShieldCheck, "Trust & Safety", "Fraud review or account safety questions.", "fraud"]
        ].map(([Icon, title, copy, category]) => (
          <button className="support-category-card" key={title} type="button" onClick={() => category === "missing_reward" ? startMissingRewardClaim() : selectCategory(category)}>
            <span><Icon size={18} /></span>
            <strong>{title}</strong>
            <p>{copy}</p>
          </button>
        ))}
      </div>

      {wizardOpen && <MissingRewardWizard wizard={wizard} setWizard={setWizard} step={wizardStep} setStep={setWizardStep} onFiles={event => handleFiles(event, "wizard")} onSubmit={submitWizard} onClose={() => setWizardOpen(false)} />}

      <div className="support-workspace-grid">
        <form id="support-ticket-form" className="card form-grid support-ticket-form" onSubmit={submitTicket}>
          <SectionTitle title="Open support ticket" copy="Give support the exact details needed to review your issue faster." />
          <label>Contact email<input value={user.email || ""} disabled /></label>
          <label>Subject<input value={form.subject} onChange={event => updateForm({ subject: event.target.value })} placeholder="Example: CPX survey completed but reward missing" required /></label>
          <div className="form-two-col">
            <label>Category<select value={form.category} onChange={event => updateForm({ category: event.target.value })}><option value="general">General</option><option value="missing_reward">Missing reward</option><option value="offer">Offer tracking</option><option value="payout">Payout review</option><option value="account">Account access</option><option value="verification">Email/verification</option><option value="referral">Referral</option><option value="fraud">Trust & safety</option></select></label>
            <label>Priority<select value={form.priority} onChange={event => updateForm({ priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          </div>
          <div className="form-two-col">
            <label>Related provider<select value={form.provider} onChange={event => updateForm({ provider: event.target.value })}><option>CPX Research</option><option>TheoremReach</option><option>EarnWave</option><option>Other</option></select></label>
            <label>Related reward amount<input value={form.rewardAmount} onChange={event => updateForm({ rewardAmount: event.target.value })} placeholder="Example: 420 WaveCoins or $4.20" /></label>
          </div>
          <label>Completion date<input type="date" value={form.completionDate} onChange={event => updateForm({ completionDate: event.target.value })} /></label>
          <label>Screenshot/proof upload<input type="file" accept="image/*,.pdf" multiple onChange={handleFiles} /></label>
          {form.attachmentNames.length > 0 && <div className="notice">Attached proof: {form.attachmentNames.join(", ")}</div>}
          <label>Message<textarea value={form.message} onChange={event => updateForm({ message: event.target.value })} placeholder="Tell us what happened. Include provider, offer or survey name, completion date, expected reward, and what page you saw after completion." required /></label>
          <label className="support-confirm-row"><input type="checkbox" checked={form.confirmed} onChange={event => updateForm({ confirmed: event.target.checked })} /> <span>I included accurate details and understand duplicate tickets can slow review.</span></label>
          <button className="btn" type="submit">Open Support Ticket</button>
          <div className="notice">{notice}</div>
        </form>

        <div className="card support-ticket-dashboard">
          <SectionTitle title="Your tickets" copy="Select a ticket to view the full thread and reply." action={<button className="btn alt" type="button" onClick={refreshTickets}>Refresh</button>} />
          <div className="user-ticket-list">
            {(tickets.length ? tickets : [{ id: "preview", subject: "No tickets yet", category: "general", status: "open", priority: "medium", message: "Open your first ticket to start a support thread.", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), messages: [] }]).map(ticket => (
              <button className={activeTicket && String(activeTicket.id) === String(ticket.id) ? "user-ticket-card active" : "user-ticket-card"} key={ticket.id} type="button" onClick={() => setSelectedTicket(ticket)}>
                <div><strong>#{String(ticket.id).slice(0, 8)} {ticket.subject}</strong><p>{String(ticket.message || "").split("\n")[0]}</p></div>
                <span className="pill">{ticket.status}</span>
                <small>{ticket.category} | {ticket.priority || "normal"} | Updated {String(ticket.updated_at || ticket.created_at || "").slice(0, 10)}</small>
                <em>View Ticket</em>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTicket && <TicketDetailPanel ticket={activeTicket} messages={messages} reply={reply} setReply={setReply} onReply={sendTicketReply} onFiles={event => handleFiles(event, "reply")} replyAttachments={replyAttachments} />}

      <section className="card support-faq-section">
        <SectionTitle title="Support FAQ" copy="Quick answers that may solve common support questions faster." />
        <div className="faq-grid">
          {faqs.map(([id, question, answer]) => (
            <div className={openFaq === id ? "faq-item open" : "faq-item"} key={id}>
              <button type="button" onClick={() => setOpenFaq(openFaq === id ? "" : id)}><h3>{question}</h3><span>{openFaq === id ? "-" : "+"}</span></button>
              {openFaq === id && <p>{answer}</p>}
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}

function MissingRewardWizard({ wizard, setWizard, step, setStep, onFiles, onSubmit, onClose }) {
  const steps = ["Provider", "Details", "Proof", "Review"];
  return (
    <section className="card missing-reward-wizard">
      <SectionTitle title="Missing Reward Claim" copy="Follow the steps so support has the proof needed for provider verification." action={<button className="btn alt" type="button" onClick={onClose}>Close</button>} />
      <div className="wizard-steps">{steps.map((label, index) => <span className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} key={label}>{index + 1}. {label}</span>)}</div>
      {step === 1 && <div className="wizard-panel"><h3>Select provider</h3><div className="method-grid">{["CPX Research", "TheoremReach", "Other"].map(provider => <button className={wizard.provider === provider ? "method active" : "method"} key={provider} type="button" onClick={() => setWizard({ ...wizard, provider })}><strong>{provider}</strong><p>Provider used for the missing reward.</p></button>)}</div></div>}
      {step === 2 && <div className="wizard-panel form-grid"><label>Offer or survey name<input value={wizard.offerName} onChange={event => setWizard({ ...wizard, offerName: event.target.value })} /></label><label>Completion date<input type="date" value={wizard.completionDate} onChange={event => setWizard({ ...wizard, completionDate: event.target.value })} /></label><label>Expected reward amount<input value={wizard.rewardAmount} onChange={event => setWizard({ ...wizard, rewardAmount: event.target.value })} placeholder="Example: 420 WaveCoins or $4.20" /></label></div>}
      {step === 3 && <div className="wizard-panel form-grid"><label>Screenshot upload<input type="file" accept="image/*,.pdf" multiple onChange={onFiles} /></label>{wizard.proofFiles.length > 0 && <div className="notice">Proof files: {wizard.proofFiles.join(", ")}</div>}<label>Optional notes<textarea value={wizard.notes} onChange={event => setWizard({ ...wizard, notes: event.target.value })} placeholder="Add confirmation text, survey ID, or anything support should know." /></label></div>}
      {step === 4 && <div className="wizard-panel claim-review"><h3>Review claim</h3><p><strong>Provider:</strong> {wizard.provider}</p><p><strong>Offer/survey:</strong> {wizard.offerName || "Missing"}</p><p><strong>Completion date:</strong> {wizard.completionDate || "Missing"}</p><p><strong>Expected reward:</strong> {wizard.rewardAmount || "Missing"}</p><p><strong>Proof:</strong> {wizard.proofFiles.length ? wizard.proofFiles.join(", ") : "No files selected"}</p></div>}
      <div className="wizard-actions"><button className="btn alt" type="button" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</button>{step < 4 ? <button className="btn" type="button" onClick={() => setStep(step + 1)}>Next</button> : <button className="btn" type="button" onClick={onSubmit}>Submit Claim</button>}</div>
    </section>
  );
}

function TicketDetailPanel({ ticket, messages, reply, setReply, onReply, onFiles, replyAttachments }) {
  const timeline = [
    ["Submitted", true],
    ["Under Review", ["pending", "waiting_provider", "resolved", "closed", "denied"].includes(ticket.status)],
    ["Waiting for Provider", ticket.status === "waiting_provider"],
    ["Resolved / Denied", ["resolved", "closed", "denied"].includes(ticket.status)],
    ["Closed", ticket.status === "closed"]
  ];
  return (
    <section className="card ticket-detail-panel">
      <SectionTitle title={`Ticket #${String(ticket.id).slice(0, 8)}`} copy={`${ticket.subject} | ${ticket.category} | ${ticket.priority || "normal"}`} action={<span className="pill">{ticket.status}</span>} />
      <div className="ticket-timeline">{timeline.map(([label, active]) => <span className={active ? "active" : ""} key={label}>{label}</span>)}</div>
      <div className="ticket-meta-grid"><Metric value={String(ticket.created_at || "").slice(0, 10) || "Today"} label="Created" /><Metric value={String(ticket.updated_at || ticket.created_at || "").slice(0, 10) || "Today"} label="Last updated" /><Metric value="Email + in-app" label="Reply delivery" /></div>
      <div className="support-message-thread user-thread">{messages.map(message => <div className={message.sender_role === "admin" ? "support-message admin" : "support-message"} key={message.id || message.created_at}><div className="row"><strong>{message.sender_role === "admin" ? "EarnWave Support" : (message.sender_name || "You")}</strong><span>{String(message.created_at || "").slice(0, 16).replace("T", " ")}</span></div><p>{message.message}</p></div>)}</div>
      <form className="support-reply-form" onSubmit={onReply}><label>Reply to support<textarea value={reply} onChange={event => setReply(event.target.value)} placeholder="Add more details or upload proof for this ticket." /></label><label>Attach proof<input type="file" accept="image/*,.pdf" multiple onChange={onFiles} /></label>{replyAttachments.length > 0 && <div className="notice">Attached: {replyAttachments.join(", ")}</div>}<button className="btn" type="submit">Add Reply</button></form>
    </section>
  );
}

function LegalPage() {
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
  const [users, setUsers] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportReplyStatus, setSupportReplyStatus] = useState("pending");
  const [supportInternal, setSupportInternal] = useState(false);
  const [supportNotice, setSupportNotice] = useState("Select a ticket to review and respond.");
  const [emails, setEmails] = useState([]);
  const [complianceUsers, setComplianceUsers] = useState([]);
  const [offerwallEconomics, setOfferwallEconomics] = useState([]);
  const [offerwallCallbacks, setOfferwallCallbacks] = useState([]);
  const [reasonCodes, setReasonCodes] = useState({});
  const [payoutNotice, setPayoutNotice] = useState("Manual approval is required before any automated payout is sent.");
  const [rewardNotice, setRewardNotice] = useState("Provider rewards stay pending until you release or reverse them.");

  function refreshOfferwallCallbacks() {
    api.request("/admin/offerwall-callbacks").then(data => setOfferwallCallbacks(data.callbacks || [])).catch(() => {});
  }

  function refreshRewardEconomics() {
    api.request("/admin/offerwall-economics").then(data => setOfferwallEconomics(data.entries || [])).catch(() => {});
  }

  useEffect(() => {
    api.request("/admin/moderation").then(setModeration).catch(() => {});
    api.request("/admin/payouts").then(data => setPayouts(data.payouts || [])).catch(() => {});
    api.request("/admin/users").then(data => setUsers(data.users || [])).catch(() => {});
    api.request("/admin/fraud/reason-codes").then(data => setReasonCodes(data.reasonCodes || {})).catch(() => {});
    api.request("/admin/compliance/payout-readiness?amountCents=2500").then(data => setComplianceUsers(data.users || [])).catch(() => {});
    refreshRewardEconomics();
    refreshOfferwallCallbacks();
    refreshSupportTickets();
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
      api.request("/admin/compliance/payout-readiness?amountCents=2500").then(data => setComplianceUsers(data.users || [])).catch(() => {});
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
      api.request("/admin/compliance/payout-readiness?amountCents=2500").then(data => setComplianceUsers(data.users || [])).catch(() => {});
    } catch (error) {
      setPayoutNotice(error.message);
    }
  }


  async function releaseProviderReward(id) {
    try {
      const result = await api.request(`/admin/provider-rewards/${id}/release`, {
        method: "POST",
        body: JSON.stringify({ note: "Released from admin reward review" })
      });
      setRewardNotice(`${Number(result.reward.user_reward_wavecoins || result.reward.amount_wavecoins || 0).toLocaleString()} WaveCoins released to the user.`);
      refreshRewardEconomics();
      api.request("/admin/users").then(data => setUsers(data.users || [])).catch(() => {});
    } catch (error) {
      setRewardNotice(error.message);
    }
  }

  async function reverseProviderReward(id) {
    try {
      const result = await api.request(`/admin/provider-rewards/${id}/reverse`, {
        method: "POST",
        body: JSON.stringify({ note: "Reversed from admin reward review" })
      });
      setRewardNotice(`Reward ${result.reward.provider_transaction_id || id} reversed.`);
      refreshRewardEconomics();
      api.request("/admin/users").then(data => setUsers(data.users || [])).catch(() => {});
    } catch (error) {
      setRewardNotice(error.message);
    }
  }
  function reasonSummary(codes = []) {
    return (codes.length ? codes : ["BASELINE_LOW_RISK"]).map(code => `${code}: ${reasonCodes[code] || "Review this risk signal."}`);
  }

  function refreshSupportTickets() {
    api.request("/account/admin/support/tickets").then(data => {
      const nextTickets = data.tickets || [];
      setSupportTickets(nextTickets);
      setSelectedSupportTicket(current => {
        if (!current) return nextTickets[0] || null;
        return nextTickets.find(ticket => String(ticket.id) === String(current.id)) || nextTickets[0] || null;
      });
    }).catch(() => {});
  }

  function updateSelectedSupportTicket(updatedTicket) {
    setSupportTickets(current => current.map(ticket => String(ticket.id) === String(updatedTicket.id) ? updatedTicket : ticket));
    setSelectedSupportTicket(updatedTicket);
    setSupportReplyStatus(updatedTicket.status || "pending");
  }

  async function sendSupportReply(event) {
    event.preventDefault();
    if (!selectedSupportTicket?.id || !supportReply.trim()) return;
    try {
      const result = await api.request(`/account/admin/support/tickets/${selectedSupportTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: supportReply.trim(), status: supportReplyStatus, internal: supportInternal })
      });
      updateSelectedSupportTicket(result.ticket);
      setSupportReply("");
      setSupportInternal(false);
      setSupportNotice(supportInternal ? "Internal note saved." : "Reply saved and queued to email the user.");
      api.request("/account/admin/email-outbox").then(data => setEmails(data.emails || [])).catch(() => {});
    } catch (error) {
      setSupportNotice(error.message);
    }
  }

  async function updateSupportTicketStatus(status) {
    if (!selectedSupportTicket?.id) return;
    const statusMessages = {
      open: "Support status updated: this ticket is open for review.",
      pending: "Support status updated: this ticket is pending review.",
      waiting_provider: "Support status updated: this ticket is waiting for provider verification.",
      resolved: "Support status updated: this ticket has been resolved.",
      closed: "Support status updated: this ticket has been closed.",
      denied: "Support status updated: this request was denied after review."
    };
    try {
      const result = await api.request(`/account/admin/support/tickets/${selectedSupportTicket.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: statusMessages[status] || `Support status updated: ${status}.`, status, internal: false })
      });
      updateSelectedSupportTicket(result.ticket);
      setSupportNotice(`Ticket status changed to ${status.replace("_", " ")}.`);
      api.request("/account/admin/email-outbox").then(data => setEmails(data.emails || [])).catch(() => {});
    } catch (error) {
      setSupportNotice(error.message);
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
        <div className="card payout-queue-card">
          <SectionTitle title="Users and tracking IDs" copy="Use these IDs to confirm provider callbacks are mapped to real EarnWave accounts." />
          <DataTable rows={(users.length ? users : [
            { id: "none", username: "No test users found", email: "Create a normal user account first", email_verified: false, balance_wavecoins: 0, created_at: "" }
          ]).map(item => [
            item.id,
            item.username || item.name || "member",
            item.email,
            item.email_verified ? "Verified" : "Unverified",
            `${Number(item.balance_wavecoins || 0).toLocaleString()} WaveCoins`,
            String(item.created_at || "").slice(0, 10) || item.status || "active"
          ])} />
        </div>
        <div className="card">
          <SectionTitle title="Moderation queue" copy="Admin endpoints support approve, reject, hold, ban, and note actions." />
          <DataTable rows={(moderation.queue.length ? moderation.queue : [
            { user: "WaveHunter", reason: "Payout velocity", amount: 84.2, status: "Hold" },
            { user: "SurveyAce", reason: "Duplicate IP", amount: 12.75, status: "Review" },
            { user: "NovaEarns", reason: "Provider reversal", amount: 43.9, status: "Reject" }
          ]).map(item => [item.user, item.reason, `${rewardLabel(item.amount)} (${money(item.amount)})`, item.status])} />
        </div>
        <div className="card payout-queue-card">
          <SectionTitle title="Manual payout approval" copy="PayPal Payouts, Tremendous gift cards, and crypto withdrawals only dispatch after approval." />
          <div className="notice">{payoutNotice}</div>
          <div className="payout-list">
            {payouts.map(item => (
              <div className="payout-row" key={item.id}>
                <div>
                  <strong>{item.user_name || item.user_id || "Member"} - {item.method}</strong>
                  <p>{rewardLabel(item.amount)} ({money(item.amount)}) to {item.destination_value || "destination pending"} | risk {item.risk_score || 0} | {item.status}</p>
                  <div className="reason-list">
                    {reasonSummary(item.risk_reason_codes).map(reason => <span key={reason}>{reason}</span>)}
                  </div>
                </div>
                <div className="payout-actions">
                  <button className="btn" onClick={() => approvePayout(item.id)}>Approve</button>
                  <button className="btn alt" onClick={() => rejectQueuedPayout(item.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card payout-queue-card">
          <SectionTitle title="Compliance payout readiness" copy="Shows which users can be paid now and exactly why blocked accounts need more data." />
          <DataTable rows={(complianceUsers.length ? complianceUsers : [
            { user_name: "Example Member", email: "member@example.com", can_pay: false, blocked_reasons: ["COUNTRY_REQUIRED", "KYC_REQUIRED"] }
          ]).map(item => [
            item.user_name || item.email,
            item.can_pay ? "Can pay" : "Blocked",
            item.can_pay ? "Ready" : (item.blocked_reasons || []).join(", "),
            item.profile?.country || "Missing"
          ])} />
        </div>
        <ProviderRewardReviewPanel
          entries={offerwallEconomics}
          notice={rewardNotice}
          onRelease={releaseProviderReward}
          onReverse={reverseProviderReward}
        />
        <div className="card payout-queue-card">
          <SectionTitle
            title="Offerwall callback log"
            copy="Use this after CPX or Theorem tests to confirm whether the provider reached EarnWave, passed verification, and sent a matching user ID."
            action={<button className="btn alt" type="button" onClick={refreshOfferwallCallbacks}>Refresh</button>}
          />
          <div className="callback-setup-card">
            <div>
              <strong>CPX postback URL required</strong>
              <p>Rejected CPX callbacks usually mean CPX is missing <code>postback_secret</code> or Render has a different <code>CPX_POSTBACK_SECRET</code>. Put this URL in CPX, then replace <code>YOUR_CPX_POSTBACK_SECRET</code> with the exact same secret value saved in Render.</p>
              <code className="callback-url-box">{getCpxPostbackUrl()}</code>
            </div>
            <button className="btn alt" type="button" onClick={() => navigator.clipboard?.writeText(getCpxPostbackUrl())}>Copy URL</button>
          </div>
          <DataTable rows={(offerwallCallbacks.length ? offerwallCallbacks : [
            { provider: "cpx", event_type: "waiting", normalized_event: { userId: "No callback yet", transactionId: "Check CPX postback URL", amount: 0, status: "pending" }, rejected: false, reason: "Complete a test survey, then refresh." }
          ]).map(item => {
            const normalized = item.normalized_event || {};
            const payload = item.payload || {};
            const amountUsd = normalized.amount || payload.amount_usd || payload.amount || 0;
            return [
              item.provider || "provider",
              item.rejected ? "Rejected" : "Accepted",
              normalized.userId || payload.user_id || payload.ext_user_id || "Missing user",
              normalized.transactionId || payload.trans_id || payload.transaction_id || "Missing transaction",
              amountUsd ? money(Number(amountUsd)) : "Reward varies",
              item.reason || normalized.status || item.event_type || "ok"
            ];
          })} />
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
        <SupportAdminPanel
          tickets={supportTickets}
          selectedTicket={selectedSupportTicket}
          setSelectedTicket={setSelectedSupportTicket}
          reply={supportReply}
          setReply={setSupportReply}
          replyStatus={supportReplyStatus}
          setReplyStatus={setSupportReplyStatus}
          internal={supportInternal}
          setInternal={setSupportInternal}
          notice={supportNotice}
          onReply={sendSupportReply}
          onRefresh={refreshSupportTickets}
          onStatusChange={updateSupportTicketStatus}
        />
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

function getCpxPostbackUrl() {
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://getearnwave.com";
  return `${origin}/api/offerwalls/cpx/callback?user_id={user_id}&trans_id={trans_id}&amount_local={amount_local}&amount_usd={amount_usd}&status={status}&postback_secret=YOUR_CPX_POSTBACK_SECRET`;
}

function ProviderRewardReviewPanel({ entries, notice, onRelease, onReverse }) {
  const hasRealEntries = entries.length > 0;

  function releaseText(item) {
    if (item.status !== "pending") return item.status;
    if (!item.release_eligible_at) return "manual review";
    const releaseAt = new Date(item.release_eligible_at);
    if (Number.isNaN(releaseAt.getTime())) return "manual review";
    const minutes = Math.max(0, Math.ceil((releaseAt.getTime() - Date.now()) / 60000));
    if (!minutes) return "eligible now";
    if (minutes < 60) return `${minutes}m hold left`;
    return `${Math.ceil(minutes / 60)}h hold left`;
  }

  return (
    <div className="card payout-queue-card provider-reward-review">
      <SectionTitle
        title="Provider reward review"
        copy="Users see only their net WaveCoins. Admin sees provider gross payout, user reward, EarnWave margin, and pending release status."
        action={<span className="tag amber">Pending funds</span>}
      />
      <div className="notice">{notice}</div>
      {!hasRealEntries ? (
        <div className="provider-reward-empty">
          <strong>No real provider rewards are ready to release yet.</strong>
          <p>Accepted CPX or TheoremReach callbacks will create pending rewards here. Rejected callbacks do not create funds, so there is nothing to release or reverse until callback verification passes.</p>
          <div className="reward-split-grid">
            <span><small>Example gross</small>$1.00</span>
            <span><small>User would get</small>70 WaveCoins ($0.70)</span>
            <span><small>EarnWave margin</small>$0.30</span>
            <span><small>Status</small>Preview only</span>
          </div>
        </div>
      ) : (
        <div className="provider-reward-list">
          {entries.map(item => {
            const userReward = Number(item.user_reward_wavecoins || item.amount_wavecoins || 0);
            const isPending = item.status === "pending";
            return (
              <div className="provider-reward-row" key={item.id}>
                <div>
                  <div className="provider-reward-head">
                    <strong>{item.user_name || item.user_email || item.user_id || "Member"}</strong>
                    <span className={isPending ? "tag amber" : item.status === "available" ? "tag" : "tag rose"}>{item.status}</span>
                  </div>
                  <p>{item.provider || "provider"} | {item.provider_transaction_id || "no transaction id"}</p>
                  <div className="reward-split-grid">
                    <span><small>Provider gross</small>{money(Number(item.provider_gross_usd_cents || 0) / 100)}</span>
                    <span><small>User gets</small>{userReward.toLocaleString()} WaveCoins ({money(waveCoinsToUsd(userReward))})</span>
                    <span><small>EarnWave margin</small>{money(Number(item.platform_margin_usd_cents || 0) / 100)}</span>
                    <span><small>Release timer</small>{releaseText(item)}</span>
                  </div>
                </div>
                <div className="provider-reward-actions">
                  <button className="btn" type="button" disabled={!isPending} onClick={() => onRelease(item.id)}>Release</button>
                  <button className="btn alt" type="button" disabled={item.status === "reversed"} onClick={() => onReverse(item.id)}>Reverse</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function SupportAdminPanel({ tickets, selectedTicket, setSelectedTicket, reply, setReply, replyStatus, setReplyStatus, internal, setInternal, notice, onReply, onRefresh, onStatusChange }) {
  const visibleTickets = tickets.length ? tickets : [
    { id: "preview-1", user_name: "Preview Member", user_email: "member@example.com", subject: "Payout timing", category: "payout", priority: "high", status: "open", message: "Preview ticket until live support requests arrive.", messages: [] },
    { id: "preview-2", user_name: "Survey User", user_email: "survey@example.com", subject: "Offer missing credit", category: "offer", priority: "normal", status: "pending", message: "Example missing reward report.", messages: [] }
  ];
  const activeTicket = selectedTicket || visibleTickets[0];
  const messages = activeTicket?.messages?.length ? activeTicket.messages : activeTicket ? [{
    id: `${activeTicket.id}-initial`,
    sender_name: activeTicket.user_name || activeTicket.user_email || "Member",
    sender_email: activeTicket.user_email || "",
    sender_role: "user",
    message: activeTicket.message,
    internal: false,
    created_at: activeTicket.created_at
  }] : [];
  const statusOptions = [
    ["open", "Open"],
    ["pending", "Pending"],
    ["waiting_provider", "Waiting for Provider"],
    ["resolved", "Resolved"],
    ["denied", "Denied"],
    ["closed", "Closed"]
  ];
  const statusTimeline = [
    ["Submitted", true],
    ["Under Review", ["pending", "waiting_provider", "resolved", "closed", "denied"].includes(activeTicket?.status)],
    ["Waiting for Provider", activeTicket?.status === "waiting_provider"],
    ["Resolved / Denied", ["resolved", "closed", "denied"].includes(activeTicket?.status)],
    ["Closed", activeTicket?.status === "closed"]
  ];

  return (
    <div className="card payout-queue-card support-admin-panel">
      <SectionTitle
        title="Support queue"
        copy="Click a ticket to see the user, message history, and reply from admin."
        action={<button className="btn alt" type="button" onClick={onRefresh}>Refresh</button>}
      />
      <div className="support-admin-grid">
        <div className="support-ticket-list" aria-label="Support ticket list">
          {visibleTickets.map(ticket => (
            <button
              className={activeTicket && String(activeTicket.id) === String(ticket.id) ? "support-ticket-row active" : "support-ticket-row"}
              key={ticket.id}
              type="button"
              onClick={() => { setSelectedTicket(ticket); setReplyStatus(ticket.status || "pending"); }}
            >
              <span className="avatar">{String(ticket.user_name || ticket.user_email || "M").slice(0, 1)}</span>
              <div>
                <strong>{ticket.subject}</strong>
                <p>{ticket.user_name || "Member"} {ticket.user_email ? `- ${ticket.user_email}` : ""}</p>
              </div>
              <span className={ticket.priority === "high" ? "tag rose" : "tag"}>{ticket.status}</span>
            </button>
          ))}
        </div>
        <div className="support-ticket-detail">
          {activeTicket ? (
            <>
              <div className="support-ticket-head">
                <div>
                  <span className="eyebrow">{activeTicket.category} support</span>
                  <h3>{activeTicket.subject}</h3>
                  <p>{activeTicket.user_name || "Member"} {activeTicket.username ? `@${activeTicket.username}` : ""}</p>
                  <p>{activeTicket.user_email || "No email on ticket"} | User ID: {activeTicket.user_id || "preview"}</p>
                </div>
                <div className="support-ticket-badges">
                  <span className={activeTicket.priority === "high" ? "tag rose" : "tag amber"}>{activeTicket.priority || "normal"}</span>
                  <span className="pill blue">{activeTicket.status}</span>
                </div>
              </div>
              <div className="ticket-timeline admin-ticket-timeline">{statusTimeline.map(([label, active]) => <span className={active ? "active" : ""} key={label}>{label}</span>)}</div>
              <div className="admin-status-actions">
                <button className="btn alt" type="button" onClick={() => onStatusChange("waiting_provider")}>Waiting for Provider</button>
                <button className="btn alt" type="button" onClick={() => onStatusChange("resolved")}>Resolve</button>
                <button className="btn alt" type="button" onClick={() => onStatusChange("denied")}>Deny</button>
                <button className="btn alt" type="button" onClick={() => onStatusChange("closed")}>Close</button>
              </div>
              <div className="support-message-thread">
                {messages.map(message => (
                  <div className={message.internal ? "support-message internal" : "support-message"} key={message.id || `${message.created_at}-${message.sender_id}`}>
                    <div className="row">
                      <strong>{message.sender_name || "EarnWave Support"}</strong>
                      <span>{String(message.created_at || activeTicket.created_at || "").slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p>{message.message}</p>
                    {message.internal && <span className="tag amber">Internal note</span>}
                  </div>
                ))}
              </div>
              <form className="support-reply-form" onSubmit={onReply}>
                <label>Admin reply
                  <textarea value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a clear reply or internal note..." />
                </label>
                <div className="support-reply-controls">
                  <label>Status
                    <select value={replyStatus} onChange={event => setReplyStatus(event.target.value)}>
                      {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="toggle-row support-internal-toggle">
                    <span>Internal note only</span>
                    <input type="checkbox" checked={internal} onChange={event => setInternal(event.target.checked)} />
                  </label>
                  <button className="btn alt" type="button" onClick={() => onStatusChange(replyStatus)}>Update Status</button>
                  <button className="btn" type="submit">Send Reply</button>
                </div>
                <div className="notice">{notice}</div>
              </form>
            </>
          ) : (
            <div className="notice">No support tickets yet.</div>
          )}
        </div>
      </div>
    </div>
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

function TurnstileField({ onToken }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return;
    let widgetId = null;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !containerRef.current || containerRef.current.dataset.rendered === "true") return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: token => onToken(token),
        "expired-callback": () => onToken("")
      });
      containerRef.current.dataset.rendered = "true";
    };

    if (!window.turnstile) {
      const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", renderWidget, { once: true });
      }
    } else {
      renderWidget();
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      if (containerRef.current) containerRef.current.dataset.rendered = "false";
    };
  }, [onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div className="turnstile-wrap" ref={containerRef} />;
}
function AuthPage({ mode, api, navigate }) {
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { name: "", username: "", email: "", password: "", referralCode: params.get("ref") || "", turnstileToken: "" };
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
          {mode === "signup" && <TurnstileField onToken={token => setForm(current => ({ ...current, turnstileToken: token }))} />}
          <button className="btn" type="submit">{mode === "signup" ? "Create Account" : "Login"}</button>
          {mode === "login" && <button className="btn alt" type="button" onClick={() => navigate("/forgot-password")}>Forgot Password</button>}
          <div className="notice">{notice}</div>
        </form>
      </div>
    </main>
  );
}

function TopNotifications({ api, navigate }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const [metrics, setMetrics] = useState(readActivityMetrics);
  const user = api.session?.user || {};
  const notifications = [
    {
      id: "payout-review",
      icon: <ShieldCheck size={22} />,
      title: "Payout review enabled",
      date: "Today",
      body: "Withdrawals are checked for fraud protection before PayPal, gift card, or crypto payout.",
      action: "Open wallet",
      to: "/wallet",
      tone: "green"
    },
    {
      id: "wavecoins",
      icon: <Wallet size={22} />,
      title: "WaveCoins minimum cashout",
      date: "Today",
      body: "500 WaveCoins minimum cashout. 100 WaveCoins equals $1.00 when redeemed.",
      action: "View balance",
      to: "/wallet",
      tone: "blue"
    },
    {
      id: "pending",
      icon: <Clock size={22} />,
      title: "Rewards may pend",
      date: "Live tracking",
      body: "Survey rewards can stay pending until the provider verifies completion.",
      action: "See surveys",
      to: "/surveys",
      tone: "amber"
    },
    {
      id: "streak",
      icon: <Flame size={22} />,
      title: "Daily streak ready",
      date: "Today",
      body: "Claim your streak and keep your bonus progress moving.",
      action: "Open dashboard",
      to: "/dashboard",
      tone: "orange"
    }
  ];
  const unreadCount = read ? 0 : notifications.length;

  useEffect(() => {
    function handleActivity(event) {
      setMetrics(event.detail || readActivityMetrics());
    }
    window.addEventListener("earnwave:activity", handleActivity);
    window.addEventListener("storage", handleActivity);
    return () => {
      window.removeEventListener("earnwave:activity", handleActivity);
      window.removeEventListener("storage", handleActivity);
    };
  }, []);

  function go(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="top-notifications">
      <button className="top-bell" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-head">
            <div>
              <strong>Notifications</strong>
              <span>{user.name ? `${user.name}'s updates` : "Your EarnWave updates"}</span>
            </div>
            <button type="button" onClick={() => setRead(true)}>Mark all as read</button>
          </div>
          <div className="activity-strip">
            <div><Activity size={15} /><span>Clicks</span><strong>{metrics.clicks}</strong></div>
            <div><Smartphone size={15} /><span>Downloads</span><strong>{metrics.downloads}</strong></div>
            <div><PackageCheck size={15} /><span>Completed</span><strong>{metrics.completedOffers}</strong></div>
          </div>
          <div className="notification-list">
            {notifications.map(item => (
              <div className={`notification-item ${item.tone}`} key={item.id}>
                <div className="notification-icon">{item.icon}</div>
                <div>
                  <div className="notification-item-title"><strong>{item.title}</strong><span>{item.date}</span></div>
                  <p>{item.body}</p>
                  <button type="button" onClick={() => go(item.to)}>{item.action}<ArrowRight size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardLayout({ active, navigate, api, children }) {
  const isAdmin = api.session?.user?.role === "admin";
  const items = [
    ["Dashboard", "/dashboard", <LayoutDashboard size={17} />],
    ["Surveys", "/surveys", <ClipboardList size={17} />],
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
        <div className="dashboard-main">
          <div className="dashboard-topbar">
            <div>
              <span>{active}</span>
              <strong>{api.session?.user?.username ? `@${api.session.user.username}` : api.session?.user?.email || "EarnWave"}</strong>
            </div>
          </div>
          {children}
        </div>
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

function OfferCard({ offer, actionLabel = "Start Offer", featured = false, onStart }) {
  const [imageFailed, setImageFailed] = useState(false);
  const rewardText = formatWaveCoinReward(offer);
  const usdText = formatRewardUsd(offer);
  const minutes = offer.estimatedMinutes || offer.estimated_minutes || null;
  return (
    <div className={featured ? "card offer-card game-offer-card featured" : "card offer-card game-offer-card"}>
      <div className="offer-thumb">
        {!imageFailed ? (
          <img src={offer.imageUrl || offer.thumbnail || earnWaveFallbackImage} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="offer-thumb-fallback"><Gamepad2 size={30} /><span>EarnWave</span></div>
        )}
        <div className="offer-labels">
          <span className="hot-label trend">{offer.label || (offer.isFeatured ? "Featured" : offer.category)}</span>
        </div>
      </div>
      <div className="offer-head">
        <div><h3>{offer.title}</h3><p>{offer.isDevelopmentOnly ? "Development-only mock card for local preview." : "Open the provider wall to see live eligibility, exact steps, and tracking rules."}</p></div>
        <div className="offer-reward-stack">
          <span className="reward">{rewardText}</span>
          <small>{usdText || "Exact payout shown by provider"}</small>
        </div>
      </div>
      <div className="offer-meta">
        <span className="tag">{offer.category}</span>
        <span className="tag blue">{offer.provider || "Provider"}</span>
        {minutes && <span className="tag amber">{minutes} min</span>}
        {offer.isDevelopmentOnly && <span className="tag rose">Dev only</span>}
      </div>
      <button className="btn alt" onClick={onStart}>{actionLabel}</button>
    </div>
  );
}

function OfferSkeleton({ featured = false }) {
  return (
    <div className={featured ? "card game-offer-card featured skeleton-card" : "card game-offer-card skeleton-card"}>
      <div className="offer-thumb skeleton-line" />
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-line button" />
    </div>
  );
}

function SideRail({ growth, leaderboard, bonusCode, setBonusCode, claimStreak, redeemCode, dailyQuest, completeQuest, growthNotice }) {
  const xpProgress = Math.min(100, Math.round((growth.xp / Math.max(growth.nextLevelXp, 1)) * 100));
  const referralProgress = growth.referralProgress || { referrals: growth.referrals || 0, target: 5, progress: 0, rewardUnlocked: false };
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
        <div className="row"><span>Referrals</span><span className="pill">{referralProgress.referrals}/{referralProgress.target}</span></div>
        <Meter value={referralProgress.progress || 0} />
        <p>{referralProgress.rewardUnlocked ? "Referral reward tier unlocked." : "Invite verified users to fill the progress card."}</p>
      </div>
      <div className="card">
        <h3>Daily streak</h3>
        <p>{growth.streak} day streak. Claim once per day.</p>
        <button className="btn" onClick={claimStreak}>Claim Daily Bonus</button>
      </div>
      <div className="card">
        <h3>Daily quest</h3>
        <p>{dailyQuest ? dailyQuest.title : "Loading today's quest..."}</p>
        {dailyQuest && <div className="row"><span>{dailyQuest.description}</span><span className="tag amber">+{rewardLabel(dailyQuest.reward)}</span></div>}
        <button className={dailyQuest?.status === "completed" ? "btn alt" : "btn"} disabled={!dailyQuest || dailyQuest.status === "completed"} onClick={completeQuest}>
          {dailyQuest?.status === "completed" ? "Quest Complete" : "Complete Quest"}
        </button>
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
        <h3>Weekly leaderboard</h3>
        {leaderboard.map((row, index) => <div className="leader-row" key={`${row.name}-${index}`}><span className="avatar">{index + 1}</span><strong>{row.name}</strong><span className="pill">{rewardLabel(row.total_earned)}</span></div>)}
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

export function App() {
  const [route, navigate] = useRoute();
  const api = useApi();
  const page = useMemo(() => {
    const routePath = route.split("?")[0];
    if (routePath === "/offers" || routePath === "/offers.html") return <OffersPage api={api} />;
    if (routePath === "/surveys") return <SurveysPage api={api} />;
    if (routePath === "/how-it-works") return <HowItWorksPage navigate={navigate} />;
    if (routePath === "/trust") return <TrustPage api={api} navigate={navigate} />;
    if (routePath === "/dashboard" || routePath === "/dashboard.html") return <AuthRequired api={api} navigate={navigate}><Dashboard api={api} navigate={navigate} /></AuthRequired>;
    if (routePath === "/wallet" || routePath === "/wallet.html") return <AuthRequired api={api} navigate={navigate}><WalletPage api={api} navigate={navigate} /></AuthRequired>;
    if (routePath === "/referrals") return <AuthRequired api={api} navigate={navigate}><ReferralPage api={api} navigate={navigate} /></AuthRequired>;
    if (routePath === "/leaderboard") return <LeaderboardPage api={api} navigate={navigate} />;
    if (routePath === "/profile") return <AuthRequired api={api} navigate={navigate}><ProfilePage api={api} navigate={navigate} /></AuthRequired>;
    if (routePath === "/settings") return <AuthRequired api={api} navigate={navigate}><SettingsPage api={api} navigate={navigate} /></AuthRequired>;
    if (routePath === "/support") return <AuthRequired api={api} navigate={navigate}><SupportPage api={api} navigate={navigate} /></AuthRequired>;
    if (routePath === "/legal") return <LegalPage />;
    if (routePath === "/admin" || routePath === "/admin.html") return <AdminGuard api={api} navigate={navigate}><AdminPage api={api} navigate={navigate} /></AdminGuard>;
    if (routePath === "/analytics") return <AdminGuard api={api} navigate={navigate}><AnalyticsPage api={api} navigate={navigate} /></AdminGuard>;
    if (routePath === "/login" || routePath === "/login.html") return <AuthPage mode="login" api={api} navigate={navigate} />;
    if (routePath === "/signup" || routePath === "/signup.html") return <AuthPage mode="signup" api={api} navigate={navigate} />;
    if (routePath === "/forgot-password") return <ForgotPasswordPage api={api} navigate={navigate} />;
    if (routePath === "/reset-password") return <ResetPasswordPage api={api} navigate={navigate} />;
    if (routePath === "/verify-email") return <VerifyEmailPage api={api} navigate={navigate} />;
    return <Landing navigate={navigate} />;
  }, [route, api.session]);

  return <Shell route={route} navigate={navigate} api={api}>{page}</Shell>;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
