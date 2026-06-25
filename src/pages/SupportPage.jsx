import React, { useEffect, useState } from "react";
import {
  Mail,
  ShieldCheck,
  Search,
  CreditCard,
  KeyRound,
  Users,
  Clock
} from "lucide-react";
import {
  SectionTitle,
  Metric,
  Feature
} from "../components/OfferCard.jsx";
import { DashboardLayout } from "../components/Shell.jsx";
import { rewardLabel } from "../utils.js";

export function SupportPage({ navigate, api }) {
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
    ["appear", "How long do rewards take to appear?", "Many rewards appear as pending after provider verification. Some surveys require additional provider verification before they become available."],
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
          <SectionTitle title="Your tickets" copy="Select a ticket to view the full thread and reply." action={<span className="tag blue">Support Queue</span>} />
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
