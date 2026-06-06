require("dotenv").config();

const { createApp } = require("./src/app");
const { env } = require("./src/config/env");
const { connectRedis } = require("./src/cache/redis");

async function start() {
  await connectRedis();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`EarnWave API running on http://localhost:${env.PORT}`);
  });
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
