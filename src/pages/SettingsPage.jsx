import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { toast } from "react-hot-toast";
import { CheckCircle } from "lucide-react";
import { DashboardLayout } from "../components/Shell.jsx";
import { DashboardTop, SectionTitle } from "../components/OfferCard.jsx";
import { formatBalance, dollarsToWaveCoins } from "../utils.js";

export function SettingsPage({ navigate, }) {
  const { session, request, save, refreshSession, logout } = useStore();
  const user = session?.user || { name: "EarnWave User", email: "demo@example.com", email_verified: false };
  const [security, setSecurity] = useState(null);
  const [preferences, setPreferences] = useState({ marketing_opt_in: true, payout_alerts: true, security_alerts: true });

  useEffect(() => {
    request("/account/security").then(data => setSecurity(data.security)).catch(() => {});
    request("/account/preferences").then(data => setPreferences(data.preferences)).catch(() => {});
  }, []);

  async function savePreference(key) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      await request("/account/preferences", { method: "PATCH", body: JSON.stringify(next) });
      toast.success("Preferences saved.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveBalanceDisplay(preferredBalanceDisplay) {
    const next = { ...preferences, preferredBalanceDisplay };
    setPreferences(next);
    try {
      await request("/account/preferences", { method: "PATCH", body: JSON.stringify({ preferredBalanceDisplay }) });
      if (session?.user) save({ ...session, user: { ...session.user, preferredBalanceDisplay } });
      toast.success("Balance display saved.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function sendVerification() {
    try {
      const result = await request("/auth/verify-email/send", { method: "POST", body: "{}" });
      if (result.verification?.previewUrl) {
        toast.success(`Verification email ready. Local preview: ${result.verification.previewUrl}`);
      } else if (result.verification?.status === "sent") {
        toast.success("Verification email sent. Check your inbox.");
      } else if (result.verification?.status === "failed") {
        toast.error("Verification email could not be sent. Check email provider settings in Render.");
      } else {
        toast.success("Verification email queued in the admin outbox. Connect an email provider to send it.");
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <DashboardLayout active="Settings" navigate={navigate}>
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
          <button className="btn" type="button" onClick={sendVerification}>Send Verification Email</button>
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
              <button className="toggle-row" type="button" key={key} onClick={() => savePreference(key)}>
                <span>{label}</span>
                <span className={preferences[key] ? "toggle on" : "toggle"} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ReadinessItem({ label, ready }) {
  return <div className={ready ? "readiness-item ready" : "readiness-item"}><CheckCircle size={17} /><span>{label}</span><strong>{ready ? "Ready" : "Needed"}</strong></div>;
}

export function ProfilePage({ navigate, }) {
  const { session, request, save, refreshSession, logout } = useStore();
  const user = session?.user || { name: "EarnWave User", username: "earnwave_user", email: "demo@example.com" };
  const [profile, setProfile] = useState({
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    country: user.country || "",
    timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    earning_interests: user.earning_interests || ""
  });
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
      const result = await request("/account/profile", {
        method: "PATCH",
        body: JSON.stringify(profile)
      });
      save({ ...session, user: result.user });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <DashboardLayout active="Profile" navigate={navigate}>
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
