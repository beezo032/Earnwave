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
      ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS earning_interests TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS balance_wavecoins INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_earned_wavecoins INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS preferred_balance_display TEXT NOT NULL DEFAULT 'coins';
  `);

  await pool.query(`
    UPDATE users
    SET balance_wavecoins = balance_cents,
        total_earned_wavecoins = total_earned_cents
    WHERE balance_wavecoins = 0
      AND total_earned_wavecoins = 0
      AND (balance_cents > 0 OR total_earned_cents > 0);
  `);

  await pool.query(`
    ALTER TABLE ledger_entries
      ADD COLUMN IF NOT EXISTS amount_wavecoins INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS usd_value_cents INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS provider TEXT,
      ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
      ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'pending';
  `);

  await pool.query(`
    UPDATE ledger_entries
    SET amount_wavecoins = amount_cents,
        usd_value_cents = amount_cents
    WHERE amount_wavecoins = 0
      AND amount_cents > 0;
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");

  await pool.query(`
    ALTER TABLE withdrawals
      ADD COLUMN IF NOT EXISTS fraud_action TEXT NOT NULL DEFAULT 'hold',
      ADD COLUMN IF NOT EXISTS risk_reason_codes TEXT[] NOT NULL DEFAULT '{}';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS risk_reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      event_type TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      action TEXT NOT NULL CHECK (action IN ('allow', 'hold', 'manual_review', 'deny')),
      reason_codes TEXT[] NOT NULL DEFAULT '{}',
      input JSONB NOT NULL DEFAULT '{}',
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS compliance_thresholds (
      country TEXT PRIMARY KEY,
      kyc_threshold_cents INTEGER NOT NULL DEFAULT 5000,
      tax_threshold_cents INTEGER NOT NULL DEFAULT 60000,
      required_tax_form TEXT NOT NULL DEFAULT 'W-9',
      updated_by UUID REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS compliance_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id),
      country TEXT NOT NULL DEFAULT '',
      kyc_status TEXT NOT NULL DEFAULT 'not_started',
      w9_status TEXT NOT NULL DEFAULT 'not_started',
      w8_status TEXT NOT NULL DEFAULT 'not_started',
      payout_locked BOOLEAN NOT NULL DEFAULT false,
      lock_reason TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS privacy_consent_audit (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      consent_type TEXT NOT NULL DEFAULT 'privacy',
      category TEXT NOT NULL,
      granted BOOLEAN NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS data_subject_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      email TEXT NOT NULL,
      request_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_risk_reviews_user ON risk_reviews(user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_compliance_profiles_country ON compliance_profiles(country)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_privacy_consent_user ON privacy_consent_audit(user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON data_subject_requests(status)");

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
