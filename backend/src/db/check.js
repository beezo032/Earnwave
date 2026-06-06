require("dotenv").config();

const { getPool } = require("./postgres");

async function check() {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured. Add it to backend/.env first.");
  }

  const version = await pool.query("SELECT version()");
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  console.log("PostgreSQL connected.");
  console.log(version.rows[0].version);
  console.log(`Tables: ${tables.rows.map(row => row.table_name).join(", ") || "none yet"}`);
  await pool.end();
}

check().catch(error => {
  console.error(error.message);
  process.exit(1);
});
