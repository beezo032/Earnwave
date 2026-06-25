import React, { useState } from "react";
import { BrandLogo } from "../components/BrandLogo.jsx";
import { TurnstileField } from "../components/TurnstileField.jsx";

export function VerifyEmailPage({ api, navigate }) {
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

export function ForgotPasswordPage({ api, navigate }) {
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

export function ResetPasswordPage({ api, navigate }) {
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

export function TokenForm({ title, copy, token, setToken, notice, submit, button, navigate }) {
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

export function AuthPage({ mode, api, navigate }) {
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
