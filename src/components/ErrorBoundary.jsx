import React from "react";
import { AlertOctagon } from "lucide-react";
import { BrandLogo } from "./BrandLogo.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg)" }}>
          <header className="header" style={{ position: "static", borderBottom: "1px solid var(--line)", background: "rgba(9, 15, 24, .88)" }}>
            <div className="container nav" style={{ justifyContent: "center", padding: "12px 24px" }}>
              <BrandLogo />
            </div>
          </header>
          <div className="container" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card form-card" style={{ textAlign: "center", maxWidth: "420px" }}>
              <div className="icon" style={{ margin: "0 auto 16px", color: "var(--rose)", background: "rgba(239, 68, 68, 0.1)", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertOctagon size={24} />
              </div>
              <h2 style={{ marginBottom: "8px" }}>Something went wrong</h2>
              <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
                We encountered an unexpected error while loading this page. Our team has been notified.
              </p>
              <button 
                className="btn" 
                type="button" 
                onClick={() => window.location.reload()}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
