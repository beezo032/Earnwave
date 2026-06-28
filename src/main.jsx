import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getDeviceFingerprint } from "./utils.js";
import { Shell, AuthRequired, AdminGuard } from "./components/Shell.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Toaster } from "react-hot-toast";
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



export function App() {
  const [route, navigate] = useRoute();
  const page = useMemo(() => {
    const routePath = route.split("?")[0];
    if (routePath === "/offers" || routePath === "/offers.html") return <OffersPage />;
    if (routePath === "/surveys") return <SurveysPage />;
    if (routePath === "/how-it-works") return <HowItWorksPage navigate={navigate} />;
    if (routePath === "/trust") return <TrustPage navigate={navigate} />;
    if (routePath === "/dashboard" || routePath === "/dashboard.html") return <AuthRequired navigate={navigate}><Dashboard navigate={navigate} /></AuthRequired>;
    if (routePath === "/wallet" || routePath === "/wallet.html") return <AuthRequired navigate={navigate}><WalletPage navigate={navigate} /></AuthRequired>;
    if (routePath === "/referrals") return <AuthRequired navigate={navigate}><ReferralPage navigate={navigate} /></AuthRequired>;
    if (routePath === "/leaderboard") return <LeaderboardPage navigate={navigate} />;
    if (routePath === "/profile") return <AuthRequired navigate={navigate}><ProfilePage navigate={navigate} /></AuthRequired>;
    if (routePath === "/settings") return <AuthRequired navigate={navigate}><SettingsPage navigate={navigate} /></AuthRequired>;
    if (routePath === "/support") return <AuthRequired navigate={navigate}><SupportPage navigate={navigate} /></AuthRequired>;
    if (routePath === "/legal") return <LegalPage />;
    if (routePath === "/admin" || routePath === "/admin.html") return <AdminGuard navigate={navigate}><AdminPage navigate={navigate} /></AdminGuard>;
    if (routePath === "/analytics") return <AdminGuard navigate={navigate}><AnalyticsPage navigate={navigate} /></AdminGuard>;
    if (routePath === "/login" || routePath === "/login.html") return <AuthPage mode="login" navigate={navigate} />;
    if (routePath === "/signup" || routePath === "/signup.html") return <AuthPage mode="signup" navigate={navigate} />;
    if (routePath === "/forgot-password") return <ForgotPasswordPage navigate={navigate} />;
    if (routePath === "/reset-password") return <ResetPasswordPage navigate={navigate} />;
    if (routePath === "/verify-email") return <VerifyEmailPage navigate={navigate} />;
    return <LandingPage navigate={navigate} />;
  }, [route]);

  return (
    <ErrorBoundary>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#1f2937", color: "#fff" } }} />
      <Shell route={route} navigate={navigate}>{page}</Shell>
    </ErrorBoundary>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
