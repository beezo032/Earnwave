const { createClient } = require("redis");
const { RedisStore } = require("connect-redis");
const { env } = require("../config/env");

let client;
let connected = false;

async function connectRedis() {
  if (!env.REDIS_URL) return null;
  if (client) return client;

  client = createClient({ url: env.REDIS_URL });
  client.on("error", error => {
    connected = false;
    console.warn("Redis unavailable:", error.message);
  });

  await client.connect();
  connected = true;
  return client;
}

function redisStore() {
  if (!client || !connected) return undefined;
  return new RedisStore({ client, prefix: "earnwave:sess:" });
}

async function cacheGet(key) {
  if (!client || !connected) return null;
  const value = await client.get(`earnwave:cache:${key}`);
  return value ? JSON.parse(value) : null;
}

async function cacheSet(key, value, ttlSeconds = 300) {
  if (!client || !connected) return;
  await client.set(`earnwave:cache:${key}`, JSON.stringify(value), { EX: ttlSeconds });
}

function getClient() {
  return connected ? client : null;
}

module.exports = { connectRedis, redisStore, cacheGet, cacheSet, getClient };
