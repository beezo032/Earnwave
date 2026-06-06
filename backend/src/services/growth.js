const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { users, referrals, streakClaims, bonusCodes, bonusCodeRedemptions } = require("../db/demoStore");
const { recordLedgerEntry } = require("./ledger");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor(Number(xp || 0) / 250) + 1);
}

function serializeUserGrowth(user) {
  const xp = user.xp || Math.round(Number(user.total_earned || 0) * 2);
  return {
    referralCode: user.referral_code,
    referralUrl: `${process.env.PUBLIC_URL || "http://localhost:5000"}/signup?ref=${user.referral_code}`,
    level: user.level || levelFromXp(xp),
    xp,
    nextLevelXp: levelFromXp(xp) * 250,
    streak: user.streak_count || 0,
    lastStreakAt: user.last_streak_at,
    referrals: referrals.filter(item => item.referrer_id === user.id).length
  };
}

async function getGrowthProfile(userId) {
  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    return serializeUserGrowth(user);
  }

  const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
  if (!result.rows[0]) throw new Error("User not found");
  const referralResult = await query("SELECT COUNT(*)::int AS count FROM referrals WHERE referrer_id = $1", [userId]);
  return {
    ...serializeUserGrowth({ ...result.rows[0], total_earned: Number(result.rows[0].total_earned_cents || 0) / 100 }),
    referrals: referralResult.rows[0].count
  };
}

async function claimDailyStreak(userId) {
  const today = todayKey();

  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    if (user.last_streak_at === today) {
      return { claimed: false, message: "Daily streak already claimed.", growth: serializeUserGrowth(user) };
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    user.streak_count = user.last_streak_at === yesterday ? Number(user.streak_count || 0) + 1 : 1;
    user.last_streak_at = today;
    const reward = Math.min(2, .25 + user.streak_count * .05);
    user.balance = Number(user.balance || 0) + reward;
    user.total_earned = Number(user.total_earned || 0) + reward;
    user.xp = Number(user.xp || 0) + 20;
    user.level = levelFromXp(user.xp);
    streakClaims.push({ user_id: userId, claim_date: today, reward, xp: 20 });
    await recordLedgerEntry({
      userId,
      type: "daily_streak",
      direction: "credit",
      amount: reward,
      referenceType: "streak",
      referenceId: today,
      description: `Daily streak day ${user.streak_count}`,
      metadata: { xp: 20 }
    });
    return { claimed: true, reward, xp: 20, growth: serializeUserGrowth(user) };
  }

  const existing = await query("SELECT id FROM streak_claims WHERE user_id = $1 AND claim_date = CURRENT_DATE", [userId]);
  if (existing.rows[0]) {
    return { claimed: false, message: "Daily streak already claimed.", growth: await getGrowthProfile(userId) };
  }

  const userResult = await query("SELECT * FROM users WHERE id = $1", [userId]);
  const user = userResult.rows[0];
  const continued = user.last_streak_at && new Date(user.last_streak_at).toISOString().slice(0, 10) === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = continued ? Number(user.streak_count || 0) + 1 : 1;
  const rewardCents = Math.min(200, 25 + streak * 5);
  const xpReward = 20;

  await query("INSERT INTO streak_claims (user_id, reward_cents, xp_reward) VALUES ($1, $2, $3)", [userId, rewardCents, xpReward]);
  await query(
    "UPDATE users SET streak_count = $1, last_streak_at = CURRENT_DATE, balance_cents = balance_cents + $2, total_earned_cents = total_earned_cents + $2, xp = xp + $3, level = GREATEST(level, FLOOR((xp + $3) / 250) + 1) WHERE id = $4",
    [streak, rewardCents, xpReward, userId]
  );
  await recordLedgerEntry({
    userId,
    type: "daily_streak",
    direction: "credit",
    amountCents: rewardCents,
    referenceType: "streak",
    referenceId: today,
    description: `Daily streak day ${streak}`,
    metadata: { xp: xpReward }
  });

  return { claimed: true, reward: rewardCents / 100, xp: xpReward, growth: await getGrowthProfile(userId) };
}

async function redeemBonusCode(userId, code) {
  const normalized = String(code || "").trim().toUpperCase();

  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    const bonus = bonusCodes.find(item => item.code === normalized && item.active);
    if (!bonus) throw new Error("Invalid or expired bonus code");
    if (bonusCodeRedemptions.some(item => item.user_id === userId && item.code === normalized)) {
      throw new Error("Bonus code already redeemed");
    }
    bonusCodeRedemptions.push({ user_id: userId, code: normalized, reward: bonus.reward, xp: bonus.xp });
    user.balance = Number(user.balance || 0) + bonus.reward;
    user.total_earned = Number(user.total_earned || 0) + bonus.reward;
    user.xp = Number(user.xp || 0) + bonus.xp;
    user.level = levelFromXp(user.xp);
    await recordLedgerEntry({
      userId,
      type: "bonus_code",
      direction: "credit",
      amount: bonus.reward,
      referenceType: "bonus_code",
      referenceId: normalized,
      description: `Redeemed bonus code ${normalized}`,
      metadata: { xp: bonus.xp }
    });
    return { code: normalized, reward: bonus.reward, xp: bonus.xp, growth: serializeUserGrowth(user) };
  }

  const bonusResult = await query("SELECT * FROM bonus_codes WHERE code = $1 AND active = true AND (expires_at IS NULL OR expires_at > now())", [normalized]);
  const bonus = bonusResult.rows[0];
  if (!bonus) throw new Error("Invalid or expired bonus code");

  await query("INSERT INTO bonus_code_redemptions (user_id, code, reward_cents, xp_reward) VALUES ($1, $2, $3, $4)", [userId, normalized, bonus.reward_cents, bonus.xp_reward]);
  await query(
    "UPDATE users SET balance_cents = balance_cents + $1, total_earned_cents = total_earned_cents + $1, xp = xp + $2, level = GREATEST(level, FLOOR((xp + $2) / 250) + 1) WHERE id = $3",
    [bonus.reward_cents, bonus.xp_reward, userId]
  );
  await recordLedgerEntry({
    userId,
    type: "bonus_code",
    direction: "credit",
    amountCents: bonus.reward_cents,
    referenceType: "bonus_code",
    referenceId: normalized,
    description: `Redeemed bonus code ${normalized}`,
    metadata: { xp: bonus.xp_reward }
  });
  return { code: normalized, reward: bonus.reward_cents / 100, xp: bonus.xp_reward, growth: await getGrowthProfile(userId) };
}

async function leaderboard() {
  if (!env.DATABASE_URL) {
    const rows = [...users.values()]
      .map(user => ({ name: user.name, total_earned: user.total_earned || 0, level: user.level || levelFromXp(user.xp), streak: user.streak_count || 0 }))
      .sort((a, b) => b.total_earned - a.total_earned)
      .slice(0, 10);
    return rows.length ? rows : [
      { name: "WaveHunter", total_earned: 184, level: 12, streak: 14 },
      { name: "NovaEarns", total_earned: 143, level: 10, streak: 9 },
      { name: "SurveyAce", total_earned: 98, level: 8, streak: 6 }
    ];
  }

  const result = await query("SELECT name, total_earned_cents, level, streak_count FROM users ORDER BY total_earned_cents DESC LIMIT 10");
  return result.rows.map(row => ({
    name: row.name,
    total_earned: Number(row.total_earned_cents || 0) / 100,
    level: row.level,
    streak: row.streak_count
  }));
}

module.exports = {
  claimDailyStreak,
  getGrowthProfile,
  leaderboard,
  redeemBonusCode
};
