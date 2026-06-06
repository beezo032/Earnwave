require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { getPool } = require("./postgres");

async function migrate() {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS payout_alerts BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS security_alerts BOOLEAN NOT NULL DEFAULT true;
  `);

  await pool.query(`
    INSERT INTO bonus_codes (code, reward_cents, xp_reward, max_redemptions)
    VALUES
      ('WELCOME', 100, 50, 5000),
      ('DAILYBOOST', 50, 25, 10000),
      ('WAVE2026', 250, 100, 2000)
    ON CONFLICT (code) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO offers (provider, provider_offer_id, title, description, category, reward_cents, difficulty, estimated_time)
    VALUES
      ('AdGem', 'kingdom-builder', 'Kingdom Builder', 'Reach castle level 10 and keep the app installed for tracking.', 'Games', 2840, 'Medium', '2-4 days'),
      ('BitLabs', 'consumer-pulse', 'Consumer Pulse Survey', 'Answer a short brand research survey with instant credit.', 'Surveys', 425, 'Easy', '8 min'),
      ('Lootably', 'streaming-trial', 'Streaming App Trial', 'Start a partner trial and confirm your first app session.', 'Apps', 1100, 'Easy', '15 min'),
      ('RevU', 'budget-card', 'Budget Card Signup', 'Open a free finance account and complete identity verification.', 'Finance', 3600, 'Advanced', '1 day'),
      ('EarnWave', 'daily-checkin', 'Daily Check-in', 'Claim today''s streak reward and keep your bonus multiplier alive.', 'Bonus', 75, 'Easy', '1 min')
    ON CONFLICT DO NOTHING
  `);

  await pool.end();
}

migrate().then(() => {
  console.log("PostgreSQL schema is ready.");
}).catch(error => {
  console.error(error);
  process.exit(1);
});
