import React, { useEffect, useState, useRef } from "react";
import { useStore } from "../store.js";
import { toast } from "react-hot-toast";
import {
  ClipboardList,
  Flame,
  Search,
  Filter,
  Sparkles,
  Trophy,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  Lock,
  PackageCheck,
  Gift,
  KeyRound,
  CreditCard,
  PieChart,
  Hexagon
} from "lucide-react";
import {
  SectionTitle,
  OfferCard,
  OfferSkeleton,
  Meter,
  Feature,
  Stat,
  Metric
} from "../components/OfferCard.jsx";
import {
  defaultOfferwallProviders,
  surveyProviders,
  formatBalance,
  dollarsToWaveCoins,
  waveCoinsToUsd,
  userAmountWaveCoins,
  recordActivityMetric,
  trackEvent,
  money
} from "../utils.js";
import { offersForEnabledProviders, filterOffersByCategory, offerCategoryTabs } from "../offerwallOffers.js";

const ENABLE_PREVIEW_ACTIVITY = import.meta.env.VITE_ENABLE_PREVIEW_ACTIVITY === "true";

export function OffersPage({ }) {
  const { session, request, save, refreshSession, logout } = useStore();
  const [offers, setOffers] = useState([]);
  const [providers, setProviders] = useState(defaultOfferwallProviders);
  const [filter, setFilter] = useState(() => new URLSearchParams(window.location.search).get("category") || "All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    request("/offerwalls/providers").then(data => {
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
    recordActivityMetric("providerOpens");
    trackEvent("offer_card_clicked", { provider, offerId: offer?.id, category: offer?.category });
    try {
      const launch = await request(`/offerwalls/${provider}/launch`);
      if (!launch.configured) {
        toast.error(launch.message);
        return;
      }
      setModal({ provider, name: providers[provider]?.name || offer?.provider || "Survey provider", url: launch.url, integration: launch.integration, scriptSrc: launch.scriptSrc, config: launch.config });
    } catch (error) {
      toast.error("Log in with a verified email before starting surveys.");
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
            <span>Cashout guide</span>
            <strong className="count-up">500 WaveCoins</strong>
            <p>$5.00 minimum cashout</p>
            <Meter value={100} />
          </div>
        </div>

        <div className="offerwall-widgets">
          <div className="daily-streak-widget"><Flame size={20} /><div><strong>7 day streak</strong><span>Claim today's bonus to keep your multiplier alive.</span></div></div>
          {ENABLE_PREVIEW_ACTIVITY && (
            <div className="top-earners-widget">
              <strong>Preview top earners</strong>
              {topEarners.map((earner, index) => <div className="earner-mini" key={earner.name}><span>#{index + 1}</span><p>{earner.name}</p><strong>{formatBalance({}, earner.earned)}</strong></div>)}
            </div>
          )}
        </div>

        <SectionTitle title="Survey offerwalls" copy="Only CPX Research and TheoremReach are shown until more providers are approved and configured." action={<span className="tag blue">Verified walls</span>} />
        <div className="featured-carousel" aria-label="Survey offers row">
          {(loading ? Array.from({ length: 3 }) : surveyOffers).map((offer, index) => loading ? <OfferSkeleton key={index} /> : <OfferCard key={offer.id} offer={offer} actionLabel="Start Offer" onStart={() => openProvider(offer.providerKey, offer)} />)}
        </div>
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

export function SurveysPage({ }) {
  const { session, request, save, refreshSession, logout } = useStore();
  const user = session?.user || {};
  const [providers, setProviders] = useState(defaultOfferwallProviders);
  const [loading, setLoading] = useState(true);
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
    request("/offerwalls/providers").then(data => {
      setProviders(data.providers || defaultOfferwallProviders);
    }).catch(() => {}).finally(() => {
      window.setTimeout(() => setLoading(false), 320);
    });
  }, []);

  async function openSurveyProvider(provider) {
    recordActivityMetric("providerOpens");
    trackEvent("survey_provider_opened", { provider });
    try {
      const launch = await request(`/offerwalls/${provider}/launch`);
      if (!launch.configured) {
        toast.error(launch.message || "This survey provider is waiting for credentials.");
        return;
      }
      const providerName = providers[provider]?.name || surveyProviders.find(item => item.key === provider)?.name || "Survey provider";
      setModal({ provider, name: providerName, url: launch.url, integration: launch.integration, scriptSrc: launch.scriptSrc, config: launch.config });
    } catch (error) {
      toast.error("Log in with a verified email before opening survey walls.");
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

        <section className="best-survey-grid">
          <div className="card best-survey-card">
            <div>
              <span className="eyebrow"><Trophy size={15} /> Best Survey Right Now</span>
              <h2>{bestProvider.name}</h2>
              <p>Highest current reward range with secure tracking and provider reward verification.</p>
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

        <SectionTitle title="Survey Partners" copy="Open trusted survey partners without leaving EarnWave." action={<span className="tag">Pending rewards verify first</span>} />
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
            [ClipboardList, "Provider reward verification"],
            [CreditCard, "Clear payout rules"]
          ].map(([Icon, label], idx) => {
            const FinalIcon = Icon;
            return <div className="trust-signal-card" key={idx}><FinalIcon size={18} /><span>{label}</span></div>;
          })}
        </section>

        <section className="survey-trust-section">
          <SectionTitle title="How survey rewards work" copy="EarnWave tracks provider verifications and reviews rewards before payout." />
          <div className="process-grid survey-process-grid">
            {[
              [Search, "Choose a provider", "Pick CPX Research or TheoremReach based on reward range, time, and fit."],
              [ClipboardList, "Complete a survey", "Answer carefully and finish the partner flow with EarnWave tracking active."],
              [Clock, "Reward may pend", "Some survey credits wait for provider verification before payout."],
              [CheckCircle, "Approved rewards become available", "Verified rewards move into your available WaveCoins balance."]
            ].map(([Icon, title, copy], index) => {
              const FinalIcon = Icon;
              return <Feature key={title} icon={<span><FinalIcon size={18} /></span>} title={`${index + 1}. ${title}`} copy={copy} />;
            })}
          </div>
        </section>
        {ENABLE_PREVIEW_ACTIVITY && (
          <section className="recent-survey-activity card">
            <SectionTitle title="Recent EarnWave Activity" copy="Preview activity examples are shown only when preview mode is enabled." action={<span className="tag amber">Preview mode</span>} />
            <div className="activity-preview-list">
              {[
                ["Ma***", "earned 125 WaveCoins", "TheoremReach"],
                ["Jo***", "started CPX Research", "Survey started"],
                ["Pr***", "requested a $10 payout", "PayPal review"],
                ["Al***", "completed a survey", "Pending review"]
              ].map(([name, action, meta]) => <div className="activity-preview-row" key={`${name}-${action}`}><span className="avatar">{name.slice(0, 1)}</span><strong>{name}</strong><p>{action}</p><em>{meta}</em></div>)}
            </div>
          </section>
        )}
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
          <span className={enabled ? "pill" : "pill blue"}>{enabled ? "Live" : "Unavailable"}</span>
        </div>
        <div className="survey-provider-stats improved">
          <span><Gift size={15} /> {provider.rewardRange}</span>
          <span><DollarSign size={15} /> {provider.usdRange}</span>
          <span><Clock size={15} /> Avg. {provider.averageTime}</span>
          <span><Users size={15} /> {provider.userType}</span>
          <span><ShieldCheck size={15} /> Trusted provider</span>
          <span><CheckCircle size={15} /> Status: {enabled ? "Live" : "Unavailable"}</span>
        </div>
        <div className="provider-trust-note"><ShieldCheck size={15} /> Rewards verify after provider review</div>
        <button className="btn" type="button" disabled={!enabled} onClick={onOpen}>{enabled ? "Open Surveys" : "Unavailable"} <ArrowRight size={17} /></button>
      </div>
    </article>
  );
}

function ClipboardSurveyIcon({ name }) {
  let domain = "";
  if (name === "CPX Research") domain = "cpx-research.com";
  else if (name === "TheoremReach") domain = "theoremreach.com";
  else if (name === "BitLabs") domain = "bitlabs.ai";
  else if (name === "Inbrain") domain = "inbrain.ai";

  if (domain) {
    return (
      <div className="provider-real-logo">
        <img 
          src={`https://logo.clearbit.com/${domain}`} 
          alt={`${name} logo`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="fallback-icon" style={{ display: 'none' }}>
          <PackageCheck size={30} />
          <strong>{name.split(" ").map(part => part[0]).join("").slice(0, 3)}</strong>
        </div>
      </div>
    );
  }

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

export function SurveyModal({ modal, onClose }) {
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

export function CpxFullscreenWidget({ modal }) {
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
