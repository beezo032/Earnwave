import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  ClipboardList,
  Clock,
  Flame,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  PackageCheck,
  ShieldCheck,
  Settings,
  Trophy,
  Users,
  Wallet
} from "lucide-react";
import { BrandLogo } from "./BrandLogo.jsx";
import { formatBalance, dollarsToWaveCoins, readActivityMetrics, trackEvent } from "../utils.js";

export function Shell({ route, navigate, api, children }) {
  const isAuthed = Boolean(api.session?.user);
  const isAdmin = api.session?.user?.role === "admin";
  const loggedInNavItems = [
    ["/surveys", "Surveys"],
    ["/dashboard", "Dashboard"],
    ["/wallet", "Wallet"],
    ["/referrals", "Referrals"],
    ["/support", "Support"]
  ];
  const loggedOutNavItems = [
    ["/surveys", "Surveys"],
    ["/how-it-works", "How It Works"],
    ["/offers", "Rewards"],
    ["/trust", "Trust"]
  ];
  const adminItems = isAdmin ? [["/analytics", "Analytics"], ["/admin", "Admin"]] : [];
  const navItems = isAuthed ? loggedInNavItems : loggedOutNavItems;

  useEffect(() => {
    if (!isAuthed || isAdmin) return undefined;
    const refresh = () => api.refreshSession?.();
    const interval = window.setInterval(refresh, 30000);
    const onVisibility = () => { if (!document.hidden) refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthed, isAdmin, api.session?.token]);

  return (
    <>
      <header className="header">
        <div className="container nav">
          <button className="logo ghost" type="button" onClick={() => navigate("/")} aria-label="EarnWave home">
            <BrandLogo />
          </button>
          <nav className="nav-links">
            {[...navItems, ...adminItems].map(([path, label]) => (
              <button key={path} type="button" className={route === path ? "active-link" : ""} onClick={() => {
                if (path === "/surveys") trackEvent("surveys_nav_click", { route: path });
                navigate(path);
              }}>{label}</button>
            ))}
            {isAuthed ? (
              <>
                <button
                  className="topbar-balance nav-balance"
                  type="button"
                  onClick={() => navigate("/wallet")}
                  aria-label="Open wallet balance"
                  title="Open wallet"
                >
                  {formatBalance(api.session?.user || {}, api.session?.user?.balance_wavecoins ?? dollarsToWaveCoins(api.session?.user?.balance || 0))}
                </button>
                <TopNotifications api={api} navigate={navigate} />
                <button className="icon-link" type="button" onClick={() => { api.logout(); navigate("/"); }}><LogOut size={17} /> Logout</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => navigate("/login")}>Login</button>
                <button className="btn" type="button" onClick={() => navigate("/signup")}>Create Account</button>
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
      <Footer navigate={navigate} />
    </>
  );
}

export function Footer({ navigate }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <BrandLogo compact />
          <p>A premium rewards marketplace for surveys, games, apps, offers, WaveCoins, referrals, streaks, and real payouts.</p>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => navigate("/how-it-works")}>How It Works</button>
          <button type="button" onClick={() => navigate("/trust")}>Trust</button>
          <button type="button" onClick={() => navigate("/support")}>Support</button>
          <button type="button" onClick={() => navigate("/legal")}>Legal</button>
        </div>
      </div>
    </footer>
  );
}

export function TopNotifications({ api, navigate }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("earnwave_read_notifications") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("earnwave_read_notifications", JSON.stringify(readIds));
  }, [readIds]);

  const [metrics, setMetrics] = useState(readActivityMetrics);
  const user = api.session?.user || {};
  const [notifications, setNotifications] = useState([
    {
      id: "payout-review",
      icon: <ShieldCheck size={22} />,
      title: "Payout review enabled",
      date: "Today",
      body: "Withdrawals are checked for fraud protection before PayPal or gift card payout.",
      action: "Open wallet",
      to: "/wallet",
      tone: "green"
    },
    {
      id: "cashout-min",
      icon: <Wallet size={22} />,
      title: "WaveCoins minimum cashout",
      date: "Today",
      body: "500 WaveCoins minimum cashout. 100 WaveCoins equals $1.00 when redeemed.",
      action: "View balance",
      to: "/wallet",
      tone: "blue"
    },
    {
      id: "pending",
      icon: <Clock size={22} />,
      title: "Rewards may pend",
      date: "Live tracking",
      body: "Survey rewards can stay pending until the provider verifies completion.",
      action: "See surveys",
      to: "/surveys",
      tone: "amber"
    },
    {
      id: "streak",
      icon: <Flame size={22} />,
      title: "Daily streak ready",
      date: "Today",
      body: "Claim your streak and keep your bonus progress moving.",
      action: "Open dashboard",
      to: "/dashboard",
      tone: "orange"
    }
  ]);
  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  useEffect(() => {
    function handleActivity(event) {
      setMetrics(event.detail || readActivityMetrics());
    }
    function handleWsNotification(event) {
      const data = event.detail;
      setNotifications(prev => [{
        id: `ws-${Date.now()}`,
        icon: <PackageCheck size={22} />,
        title: data.title || "New Notification",
        date: "Just now",
        body: data.message,
        action: "Open dashboard",
        to: "/dashboard",
        tone: "green"
      }, ...prev]);
    }
    window.addEventListener("earnwave:activity", handleActivity);
    window.addEventListener("EarnWaveNotification", handleWsNotification);
    window.addEventListener("storage", handleActivity);
    return () => {
      window.removeEventListener("earnwave:activity", handleActivity);
      window.removeEventListener("EarnWaveNotification", handleWsNotification);
      window.removeEventListener("storage", handleActivity);
    };
  }, []);

  function go(path, id) {
    if (id && !readIds.includes(id)) {
      setReadIds(prev => {
        const next = [...prev, id];
        localStorage.setItem("earnwave_read_notifications", JSON.stringify(next));
        return next;
      });
    }
    setOpen(false);
    navigate(path);
  }

  function markAllRead() {
    const next = notifications.map(n => n.id);
    localStorage.setItem("earnwave_read_notifications", JSON.stringify(next));
    setReadIds(next);
  }

  const bellRef = React.useRef(null);
  const [dropPos, setDropPos] = React.useState({ top: 80, right: 24 });

  function openDropdown() {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right
      });
    }
    setOpen(o => !o);
  }

  return (
    <div className="top-notifications">
      <button ref={bellRef} className="top-bell" type="button" onClick={openDropdown} aria-expanded={open} aria-label="Open notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}
      </button>
      {open && createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="notification-dropdown"
            role="dialog"
            aria-label="Notifications"
            style={{ top: dropPos.top, right: dropPos.right }}
          >
            <div className="notification-dropdown-head">
              <div>
                <strong>Notifications</strong>
                <span>{user.name ? `${user.name}'s updates` : "Your EarnWave updates"}</span>
              </div>
              <button type="button" onClick={markAllRead}>Mark all as read</button>
            </div>
            <div className="activity-strip">
              <div><Activity size={15} /><span>Survey starts</span><strong>{metrics.surveyStarts}</strong></div>
              <div><ClipboardList size={15} /><span>Provider opens</span><strong>{metrics.providerOpens}</strong></div>
              <div><PackageCheck size={15} /><span>Completed</span><strong>{metrics.completedSurveys}</strong></div>
            </div>
            <div className="notification-list">
              {notifications.map(item => {
                const isRead = readIds.includes(item.id);
                return (
                  <div
                    className={`notification-item ${item.tone}`}
                    key={item.id}
                    style={{ opacity: isRead ? 0.6 : 1, cursor: "pointer" }}
                    onClick={() => go(item.to, item.id)}
                  >
                    <div className="notification-icon">{item.icon}</div>
                    <div>
                      <div className="notification-item-title"><strong>{item.title}</strong><span>{item.date}</span></div>
                      <p>{item.body}</p>
                      <button type="button">{item.action}<ArrowRight size={15} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      , document.body)}
    </div>
  );
}

export function DashboardLayout({ active, navigate, api, children }) {
  const isAdmin = api.session?.user?.role === "admin";
  const items = [
    ["Dashboard", "/dashboard", <LayoutDashboard size={17} />],
    ["Surveys", "/surveys", <ClipboardList size={17} />],
    ["Wallet", "/wallet", <Wallet size={17} />],
    ["Referrals", "/referrals", <Users size={17} />],
    ["Leaderboard", "/leaderboard", <Trophy size={17} />],
    ["Profile", "/profile", <Users size={17} />],
    ["Settings", "/settings", <Settings size={17} />],
    ["Support", "/support", <Activity size={17} />],
    ...(isAdmin ? [
      ["Analytics", "/analytics", <BarChart3 size={17} />],
      ["Admin", "/admin", <ShieldCheck size={17} />]
    ] : [])
  ];
  const userLabel = api.session?.user?.username
    ? `@${api.session.user.username}`
    : api.session?.user?.email || "EarnWave";

  return (
    <main className="dashboard">
      <div className="container dashboard-layout">
        <aside className="sidebar">
          <button className="sidebar-brand" type="button" onClick={() => navigate("/")}><BrandLogo compact /></button>
          {items.map(([label, path, icon]) => <button key={label} type="button" className={active === label ? "active" : ""} onClick={() => navigate(path)}>{icon}{label}</button>)}
          <div className="sidebar-user">
            <span className="sidebar-user-label">{userLabel}</span>
          </div>
          <button type="button" onClick={() => { api.logout(); navigate("/"); }}><LogOut size={17} />Logout</button>
        </aside>
        <div className="dashboard-main">
          {children}
        </div>
      </div>
    </main>
  );
}

export function AdminGuard({ api, navigate, children }) {
  if (api.session?.user?.role === "admin") return children;

  return (
    <main className="page">
      <div className="container">
        <div className="card form-card">
          <div className="icon"><Lock size={20} /></div>
          <h2>Admin access required</h2>
          <p>This area is hidden from regular users and requires an admin session.</p>
          <button className="btn" type="button" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    </main>
  );
}

export function AuthRequired({ api, navigate, children }) {
  if (api.session?.token && api.session?.user?.role === "admin") return children;
  if (api.session?.token && api.session?.user?.email_verified) return children;

  if (api.session?.token && api.session?.user && !api.session.user.email_verified) {
    return (
      <main className="page">
        <div className="container">
          <div className="card form-card">
            <div className="icon"><Mail size={20} /></div>
            <h2>Verify your email</h2>
            <p>You need to verify your email before entering your account dashboard.</p>
            <button className="btn" type="button" onClick={() => navigate(`/verify-email?email=${encodeURIComponent(api.session.user.email || "")}`)}>Verify Email</button>
            <button className="btn alt" type="button" onClick={() => { api.logout(); navigate("/login"); }}>Back to Login</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="card form-card">
          <div className="icon"><Lock size={20} /></div>
          <h2>Authentication required</h2>
          <p>You need to login to see this page.</p>
          <button className="btn" type="button" onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </div>
    </main>
  );
}
