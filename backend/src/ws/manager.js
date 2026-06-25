const { WebSocketServer, WebSocket } = require("ws");

let wss = null;
// Map of user_id to an array of active WebSocket connections
const activeConnections = new Map();

function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Parse URL parameters (e.g. /ws?userId=123)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");

    if (userId) {
      if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Set());
      }
      activeConnections.get(userId).add(ws);
    }

    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("close", () => {
      if (userId && activeConnections.has(userId)) {
        activeConnections.get(userId).delete(ws);
        if (activeConnections.get(userId).size === 0) {
          activeConnections.delete(userId);
        }
      }
    });
  });

  // Keep-alive heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));
}

/**
 * Push a notification to a specific connected user.
 * @param {string} userId The user to notify
 * @param {object} payload The JSON payload to send
 */
function notifyUser(userId, payload) {
  if (!userId || !activeConnections.has(String(userId))) return false;

  const stringPayload = JSON.stringify(payload);
  const connections = activeConnections.get(String(userId));

  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(stringPayload);
    }
  }
  
  return true;
}

module.exports = {
  initWebSocketServer,
  notifyUser
};
