require("dotenv").config();

const bcrypt = require("bcryptjs");
const { query, getPool } = require("../db/postgres");

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "EarnWave Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  }

  if (!getPool()) {
    throw new Error("DATABASE_URL is required for admin bootstrap.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const referralCode = `ADMIN${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const result = await query(
    `INSERT INTO users (name, email, password_hash, referral_code, role, email_verified)
     VALUES ($1, $2, $3, $4, 'admin', true)
     ON CONFLICT (email)
     DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash, email_verified = true
     RETURNING id, email, role`,
    [name, email, passwordHash, referralCode]
  );

  console.log(`Admin ready: ${result.rows[0].email} (${result.rows[0].role})`);
}

if (require.main === module) {
  bootstrapAdmin().then(() => process.exit(0)).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { bootstrapAdmin };
