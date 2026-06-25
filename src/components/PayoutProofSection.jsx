import React, { useEffect, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { SectionTitle } from "./OfferCard.jsx";
import { formatBalance, money, waveCoinsToUsd } from "../utils.js";

const ENABLE_PREVIEW_PAYOUTS = import.meta.env.VITE_ENABLE_PREVIEW_PAYOUTS === "true";

const payoutProofPreview = [
  { name: "Ma*** R.", method: "PayPal", amountWaveCoins: 2500, completedAt: "Preview", status: "completed", preview: true },
  { name: "Jo*** T.", method: "Gift card", amountWaveCoins: 1000, completedAt: "Preview", status: "completed", preview: true },
  { name: "Pr*** S.", method: "PayPal", amountWaveCoins: 5000, completedAt: "Preview", status: "completed", preview: true }
];

export function PayoutProofSection({ compact = false }) {
  const [proofs, setProofs] = useState(null);

  useEffect(() => {
    fetch("/api/public/payout-proofs")
      .then(response => response.json())
      .then(data => setProofs(data.proofs || []))
      .catch(() => setProofs([]));
  }, []);

  const visibleProofs = proofs?.length ? proofs : ENABLE_PREVIEW_PAYOUTS ? payoutProofPreview : [];
  const isPreview = !proofs?.length && visibleProofs.length > 0;

  return (
    <section className={compact ? "payout-proof-section compact" : "payout-proof-section"}>
      <SectionTitle
        title="Recent Payouts"
        copy={isPreview ? "Preview payout cards are clearly labeled while live proof is unavailable." : visibleProofs.length ? "Recent completed payouts with private user details redacted." : "Live completed payouts will appear here after the first verified payout."}
        action={<span className={isPreview ? "tag amber" : "tag"}><ShieldCheck size={14} /> {isPreview ? "Preview mode" : visibleProofs.length ? "Verified proof" : "Awaiting proof"}</span>}
      />
      {visibleProofs.length ? (
        <div className="payout-proof-grid">
          {visibleProofs.map((item, index) => (
            <div className="card payout-proof-card" key={`${item.name}-${item.completedAt}-${index}`}>
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
                <span>Method: <strong>{item.method}</strong></span>
                <strong>{item.preview ? "Preview example" : "Completed"}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card payout-empty-state">
          <div className="icon"><CreditCard /></div>
          <h3>Live completed payouts will appear here after the first verified payout.</h3>
          <p>Completed payout proof will appear after verified cashouts are available.</p>
        </div>
      )}
    </section>
  );
}
