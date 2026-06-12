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

async function transaction(work) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getPool, query, transaction };
