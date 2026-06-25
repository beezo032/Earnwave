import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getDeviceFingerprint } from "./utils.js";
import { Shell, AuthRequired, AdminGuard } from "./components/Shell.jsx";\r\nimport { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { OffersPage, SurveysPage } from "./pages/OffersPage.jsx";
import { Dashboard } from "./pages/DashboardPage.jsx";
import { WalletPage } from "./pages/WalletPage.jsx";
import { SupportPage } from "./pages/SupportPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";
import { SettingsPage, ProfilePage } from "./pages/SettingsPage.jsx";
import {
  HowItWorksPage,
  TrustPage,
  ReferralPage,
  LeaderboardPage,
  LegalPage
} from "./pages/StaticPages.jsx";
import {
  AuthPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage
} from "./pages/AuthPages.jsx";
import "./styles.css";

// Re-export page for existing test scripts compatibility
export { SurveysPage } from "./pages/OffersPage.jsx";

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

  async function refreshSession() {
    if (!session?.token) return null;
    try {
      const data = await request("/auth/me");
      if (data.user) {
        const nextSession = { ...session, user: data.user };
        localStorage.setItem("earnwave_session", JSON.stringify(nextSession));
        setSession(nextSession);
        return data.user;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function save(nextSession) {
    localStorage.setItem("earnwave_session", JSON.stringify(nextSession));
    setSession(nextSession);
  }
  function logout() {
    localStorage.removeItem("earnwave_session");
    setSession(null);
  }

  return { session, request, refreshSession, save, logout };
}

export function App() {
  const [route, navigate] = useRoute();
  const api = useApi();
  const page = useMemo(() => {
    const routePath = route.split("?")[0];
    if (routePath === "/offers" || routePath === "/offers.html") return <OffersPage api={api} />;
    if (routePath === "/surveys") return <SurveysPage api={api} />;
    if (routePath === "/how-it-works") return <HowItWorksPage navigate={navigate} />;
    if (routePath === "/trust") return <TrustPage navigate={navigate} />;
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
    return <LandingPage navigate={navigate} />;
  }, [route, api.session]);

  return (\r\n    <ErrorBoundary>\r\n      <Shell route={route} navigate={navigate} api={api}>{page}</Shell>\r\n    </ErrorBoundary>\r\n  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
