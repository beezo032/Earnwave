require("dotenv").config();

const http = require("http");
const { createApp } = require("./src/app");
const { env } = require("./src/config/env");
const { connectRedis } = require("./src/cache/redis");
const { migrate } = require("./src/db/migrate");
const { bootstrapAdmin } = require("./src/scripts/bootstrapAdmin");
const { initWebSocketServer } = require("./src/ws/manager");

async function prepareProduction() {
  if (env.NODE_ENV !== "production" || !env.DATABASE_URL) return;

  await migrate({ closePool: false });
  console.log("PostgreSQL schema is ready.");

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await bootstrapAdmin();
  } else {
    console.log("Skipping admin bootstrap: ADMIN_EMAIL and ADMIN_PASSWORD are not both configured.");
  }
}

async function start() {
  await prepareProduction();
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  
  // Attach WebSocket Server
  initWebSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`EarnWave API and WebSocket running on http://localhost:${env.PORT}`);
  });
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
