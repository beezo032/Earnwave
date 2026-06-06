const { Pool } = require("pg");
const { env } = require("../config/env");

let pool;

function getPool() {
  if (!env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const result = await db.query(sql, params);
  return result;
}

module.exports = { getPool, query };
