import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Shell.jsx";
import {
  DashboardTop,
  Stat,
  SectionTitle,
  DataTable,
  RiskCard
} from "../components/OfferCard.jsx";
import { money, rewardLabel, waveCoinsToUsd } from "../utils.js";

const ENABLE_CRYPTO_WITHDRAWALS = import.meta.env.VITE_ENABLE_CRYPTO_WITHDRAWALS === "true";

export function AdminPage({ navigate, api }) {
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
    { id: "demo-pay-3", user_name: "GiftReview", method: "Gift Card", amount: 42, status: "held", risk_score: 61, destination_value: "reward@example.com" }
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

  async function rejectProviderReward(id) {
    try {
      const result = await api.request(`/admin/provider-rewards/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: "Rejected from admin reward review" })
      });
      setRewardNotice(`Reward ${result.reward.provider_transaction_id || id} rejected. No WaveCoins were released.`);
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
          <SectionTitle title="Users and tracking IDs" copy="Use these IDs to confirm provider verifications are mapped to real EarnWave accounts." />
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
          <SectionTitle title="Manual payout approval" copy={ENABLE_CRYPTO_WITHDRAWALS ? "PayPal, Tremendous gift cards, and crypto withdrawals only dispatch after approval." : "PayPal and Tremendous gift card payouts only dispatch after approval."} />
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
          onReject={rejectProviderReward}
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

function ProviderRewardReviewPanel({ entries, notice, onRelease, onReject, onReverse }) {
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
        title="Provider reward control center"
        copy="Release approved pending rewards, reject pending rewards without crediting, or reverse already released funds when a provider chargeback or fraud review requires it."
        action={<span className="tag amber">Manual control</span>}
      />
      <div className="notice">{notice}</div>
      {!hasRealEntries ? (
        <div className="provider-reward-empty">
          <strong>No real provider rewards are ready to review yet.</strong>
          <p>Accepted CPX or TheoremReach callbacks will create pending rewards here. Rejected callbacks do not create funds, so there is nothing to release, reject, or reverse until callback verification passes.</p>
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
            const status = String(item.status || "pending").toLowerCase();
            const isPending = status === "pending";
            const isAvailable = status === "available";
            return (
              <div className="provider-reward-row detailed" key={item.id}>
                <div>
                  <div className="provider-reward-head">
                    <div>
                      <strong>{item.user_name || item.user_email || item.user_id || "Member"}</strong>
                      <p>{item.user_email || "No email"} | @{item.user_username || "no_username"}</p>
                    </div>
                    <span className={isPending ? "tag amber" : isAvailable ? "tag" : "tag rose"}>{status}</span>
                  </div>
                  <div className="admin-user-context-grid">
                    <span><small>User ID</small>{item.user_id || "Missing"}</span>
                    <span><small>Account</small>{item.user_status || "active"}</span>
                    <span><small>Country</small>{item.user_country || "Missing"}</span>
                    <span><small>Fraud score</small>{Number(item.user_fraud_score || 0)}</span>
                    <span><small>Balance</small>{Number(item.user_balance_wavecoins || 0).toLocaleString()} WaveCoins</span>
                    <span><small>Total earned</small>{Number(item.user_total_earned_wavecoins || 0).toLocaleString()} WaveCoins</span>
                  </div>
                  <p className="provider-transaction-line">{item.provider || "provider"} | {item.provider_transaction_id || "no transaction id"}</p>
                  <div className="reward-split-grid">
                    <span><small>Provider gross</small>{money(Number(item.provider_gross_usd_cents || 0) / 100)}</span>
                    <span><small>User gets</small>{userReward.toLocaleString()} WaveCoins ({money(waveCoinsToUsd(userReward))})</span>
                    <span><small>EarnWave margin</small>{money(Number(item.platform_margin_usd_cents || 0) / 100)}</span>
                    <span><small>Release timer</small>{releaseText(item)}</span>
                  </div>
                  <div className="admin-reward-notes">
                    <span>Release: moves pending WaveCoins to available balance.</span>
                    <span>Reject: closes pending reward with no user credit.</span>
                    <span>Reverse: subtracts an already released reward from available balance.</span>
                  </div>
                </div>
                <div className="provider-reward-actions">
                  <button className="btn" type="button" disabled={!isPending} onClick={() => onRelease(item.id)}>Release</button>
                  <button className="btn alt" type="button" disabled={!isPending} onClick={() => onReject(item.id)}>Reject</button>
                  <button className="btn danger" type="button" disabled={!isAvailable} onClick={() => onReverse(item.id)}>Reverse</button>
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
              <form className="support-reply-form" onSubmit={sendSupportReply}>
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
