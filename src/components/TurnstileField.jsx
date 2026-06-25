import React, { useEffect, useRef } from "react";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export function TurnstileField({ onToken }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return;
    let widgetId = null;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !containerRef.current || containerRef.current.dataset.rendered === "true") return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: token => onToken(token),
        "expired-callback": () => onToken("")
      });
      containerRef.current.dataset.rendered = "true";
    };

    if (!window.turnstile) {
      const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", renderWidget, { once: true });
      }
    } else {
      renderWidget();
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      if (containerRef.current) containerRef.current.dataset.rendered = "false";
    };
  }, [onToken]);

  return TURNSTILE_SITE_KEY ? <div className="turnstile-field" ref={containerRef} /> : null;
}
