import React, { useState } from "react";
import { Gamepad2, CheckCircle } from "lucide-react";
import { formatWaveCoinReward, formatRewardUsd, earnWaveFallbackImage } from "../offerwallOffers.js";

export function SectionTitle({ title, copy, action }) {
  return <div className="section-title"><div><h2>{title}</h2>{copy && <p>{copy}</p>}</div>{action}</div>;
}

export function DashboardTop({ kicker, title, copy, action }) {
  return <div className="dashboard-top"><div><p className="green"><strong>{kicker}</strong></p><h2>{title}</h2><p>{copy}</p></div>{action}</div>;
}

export function Metric({ value, label }) {
  return <div className="trust-item"><strong>{value}</strong><p>{label}</p></div>;
}

export function Feature({ icon, title, copy }) {
  return <div className="card feature-card"><div className="icon">{icon}</div><h3>{title}</h3><p>{copy}</p></div>;
}

export function PaymentMethod({ icon, title, copy }) {
  return <div className="card payment-card"><div className="icon">{icon}</div><h3>{title}</h3><p>{copy}</p></div>;
}

export function FaqItem({ question, answer, defaultOpen = false }) {
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

export function Stat({ label, value }) {
  return <div className="card stat-card"><p>{label}</p><strong>{value}</strong></div>;
}

export function MiniStat({ label, value }) {
  return <div className="mini-stat"><p>{label}</p><strong>{value}</strong></div>;
}

export function Meter({ value }) {
  return <div className="meter"><span style={{ width: `${value}%` }} /></div>;
}

export function OfferCard({ offer, actionLabel = "Start Offer", featured = false, onStart }) {
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
        <div><h3>{offer.title}</h3><p>{offer.isDevelopmentOnly ? "Development-only mock card for local preview." : "Open this earning path to see available rewards, steps, and timing."}</p></div>
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

export function OfferSkeleton({ featured = false }) {
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

export function Method({ title, copy }) {
  return <div className="method"><strong>{title}</strong><p>{copy}</p></div>;
}

export function DataTable({ rows }) {
  return (
    <div className="table-wrap">
      <table><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === row.length - 1 ? <span className="pill">{cell}</span> : cell}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

export function RiskCard({ title, items }) {
  return <div className="card"><h3>{title}</h3>{items.map(item => <div className="row" key={item}><span>{item}</span><CheckCircle size={17} /></div>)}</div>;
}
