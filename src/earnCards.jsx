import React, { useEffect } from "react";
import { ArrowRight, ClipboardList, PackageCheck, SearchCheck, Timer } from "lucide-react";

export const earnCards = [
  {
    id: "cpx-surveys",
    title: "CPX Research",
    copy: "Open CPX Research surveys matched by profile, region, and response quality.",
    provider: "CPX Research",
    payout: "$0.40-$6",
    status: "available",
    route: "/surveys",
    cta: "Open CPX",
    icon: SearchCheck
  },
  {
    id: "theorem-surveys",
    title: "TheoremReach",
    copy: "Launch TheoremReach surveys with secure tracking and server-side rewards.",
    provider: "TheoremReach",
    payout: "$0.40-$6",
    status: "available",
    route: "/surveys",
    cta: "Open Theorem",
    icon: ClipboardList
  }
];

export function trackEarnCardEvent(eventName, payload) {
  const detail = { surface: "earn_dashboard", ...payload };
  window.dispatchEvent(new CustomEvent(`earnwave:${eventName}`, { detail }));
  window.dataLayer?.push({ event: `earnwave_${eventName}`, ...detail });
}

function EarnCardSkeleton() {
  return (
    <div className="earn-primary-card skeleton-card" aria-label="Loading earn card">
      <div className="skeleton-line skeleton-icon" />
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-line button" />
    </div>
  );
}

export function EarnDashboardCards({ loading = false, navigate, onAnalytics = trackEarnCardEvent }) {
  useEffect(() => {
    if (loading) return;
    earnCards.forEach((card, position) => {
      onAnalytics("card_impression", {
        cardId: card.id,
        cardTitle: card.title,
        position: position + 1,
        provider: card.provider,
        payout: card.payout,
        status: card.status
      });
    });
  }, [loading, onAnalytics]);

  if (loading) {
    return (
      <section className="earn-dashboard-panel" aria-busy="true" aria-label="Earn dashboard loading">
        <div className="earn-status-legend">
          <span><PackageCheck size={15} /> Available: ready to start</span>
          <span><Timer size={15} /> Pending: reward verifies after provider callback</span>
        </div>
        <div className="earn-dashboard-grid">
          {earnCards.map(card => <EarnCardSkeleton key={card.id} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="earn-dashboard-panel" aria-label="Earn dashboard">
      <div className="earn-status-legend">
        <span><PackageCheck size={15} /> Available: ready to start</span>
        <span><Timer size={15} /> Pending: reward verifies after provider callback</span>
      </div>
      <div className="earn-dashboard-grid">
        {earnCards.map((card, position) => {
          const Icon = card.icon;
          return (
            <article className="earn-primary-card" key={card.id}>
              <div className="earn-card-top">
                <div className="icon"><Icon size={22} /></div>
                <span className={card.status === "available" ? "pill" : "pill blue"}>{card.status}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
              <div className="earn-card-meta">
                <span className="tag blue">Provider: {card.provider}</span>
                <span className="tag amber">Est. payout {card.payout}</span>
              </div>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  onAnalytics("card_click", {
                    cardId: card.id,
                    cardTitle: card.title,
                    position: position + 1,
                    route: card.route,
                    provider: card.provider,
                    payout: card.payout,
                    status: card.status
                  });
                  navigate(card.route);
                }}
              >
                {card.cta} <ArrowRight size={17} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
