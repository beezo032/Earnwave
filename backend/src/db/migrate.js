require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { getPool } = require("./postgres");

async function migrate({ closePool = true } = {}) {
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
      ADD COLUMN IF NOT EXISTS security_alerts BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT '';
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_quests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      quest_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward_cents INTEGER NOT NULL DEFAULT 0,
      xp_reward INTEGER NOT NULL DEFAULT 0,
      assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'assigned',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, quest_key, assigned_date)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quest_completions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      quest_id UUID REFERENCES daily_quests(id),
      user_id UUID REFERENCES users(id),
      quest_key TEXT NOT NULL,
      completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
      reward_cents INTEGER NOT NULL DEFAULT 0,
      xp_reward INTEGER NOT NULL DEFAULT 0,
      ip_address TEXT,
      device_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, quest_key, completed_date)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_leaderboard_snapshots (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      rankings JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(week_start)
    );
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, assigned_date)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_quest_completions_user_date ON quest_completions(user_id, completed_date)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week ON weekly_leaderboard_snapshots(week_start)");

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

  if (closePool) {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().then(() => {
    console.log("PostgreSQL schema is ready.");
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { migrate };
