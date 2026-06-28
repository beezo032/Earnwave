import { create } from "zustand";
import { getDeviceFingerprint } from "./utils.js";

export const useStore = create((set, get) => ({
  session: JSON.parse(localStorage.getItem("earnwave_session") || "null"),
  csrfToken: null,

  save: (nextSession) => {
    if (nextSession) {
      localStorage.setItem("earnwave_session", JSON.stringify(nextSession));
    } else {
      localStorage.removeItem("earnwave_session");
    }
    set({ session: nextSession });
  },

  logout: () => {
    get().save(null);
  },

  refreshCsrfToken: async () => {
    try {
      const response = await fetch("/api/csrf-token", { credentials: "include" });
      const payload = await response.json();
      if (response.ok && payload.csrfToken) {
        set({ csrfToken: payload.csrfToken });
        return payload.csrfToken;
      }
    } catch (error) {
      console.warn("Failed to refresh CSRF token", error);
    }
    return null;
  },

  request: async (path, options = {}) => {
    const { session, csrfToken, refreshCsrfToken } = get();
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
  },

  refreshSession: async () => {
    const { session, request, save } = get();
    if (!session?.token) return null;
    try {
      const data = await request("/auth/me");
      if (data.user) {
        const nextSession = { ...session, user: data.user };
        save(nextSession);
        return data.user;
      }
    } catch (error) {
      return null;
    }
    return null;
  }
}));

// Initialize WebSocket for live balance updates and CSRF refresh on load
if (typeof window !== "undefined") {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
  let ws;
  let reconnectTimer;

  useStore.subscribe(
    (state) => state.session?.user?.id,
    (userId, previousUserId) => {
      // Cleanup previous connection
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
      }
      clearTimeout(reconnectTimer);

      if (!userId) return;

      const wsUrl = `${wsHost}/ws?userId=${userId}`;

      function connect() {
        ws = new window.WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "NOTIFICATION") {
              // Dispatch a global event so the notification bell can update
              window.dispatchEvent(new CustomEvent("EarnWaveNotification", { detail: data }));
              // Also proactively refresh the session to get updated balances
              useStore.getState().refreshSession();
            }
          } catch (e) {
            console.error("WS message error", e);
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };
      }

      connect();
    }
  );

  // Initial CSRF refresh if session exists
  const initialSession = useStore.getState().session;
  if (initialSession?.token) {
    useStore.getState().refreshCsrfToken();
  }
}
