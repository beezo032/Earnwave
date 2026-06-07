const { query } = require("../db/postgres");
const { env } = require("../config/env");
const {
  users,
  referrals,
  streakClaims,
  bonusCodes,
  bonusCodeRedemptions,
  dailyQuests,
  ledgerEntries,
  questCompletions,
  weeklyLeaderboardSnapshots
} = require("../db/demoStore");
const { recordLedgerEntry } = require("./ledger");

const questCatalog = [
  { questKey: "open_offers", title: "Browse three offers", description: "Review today's top earning options before starting.", reward: .15, xp: 10 },
  { questKey: "complete_survey", title: "Complete one survey", description: "Finish a survey or mark one provider callback complete.", reward: .5, xp: 20 },
  { questKey: "play_game", title: "Try one game quest", description: "Start or continue a tracked game milestone.", reward: .35, xp: 15 },
  { questKey: "invite_friend", title: "Share your referral link", description: "Open your referral card and invite a friend.", reward: .25, xp: 15 }
];

function dateKey(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function todayKey(now = new Date()) {
  return dateKey(now);
}

function yesterdayKey(now = new Date()) {
  return dateKey(new Date(new Date(now).getTime() - 86400000));
}

function computeNextStreak({ lastStreakAt, currentStreak = 0, now = new Date() }) {
  const today = todayKey(now);
  if (lastStreakAt === today) return { alreadyClaimed: true, streak: Number(currentStreak || 0), today };
  const continued = lastStreakAt === yesterdayKey(now);
  return { alreadyClaimed: false, continued, streak: continued ? Number(currentStreak || 0) + 1 : 1, today };
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor(Number(xp || 0) / 250) + 1);
}

function questForDate(userId, date = todayKey()) {
  const seed = `${userId}:${date}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return questCatalog[seed % questCatalog.length];
}

function serializeQuest(row) {
  return {
    id: row.id,
    questKey: row.quest_key ?? row.questKey,
    title: row.title,
    description: row.description,
    reward: row.reward ?? Number(row.reward_cents || 0) / 100,
    xp: row.xp ?? row.xp_reward,
    assignedDate: row.assigned_date ?? row.assignedDate,
    status: row.status || "assigned"
  };
}

function referralProgressFor(userId) {
  const userReferrals = referrals.filter(item => String(item.referrer_id) === String(userId));
  const completed = userReferrals.filter(item => ["approved", "paid", "completed"].includes(String(item.status))).length;
  const target = 5;
  return {
    referrals: userReferrals.length,
    completed,
    target,
    progress: Math.min(100, Math.round((userReferrals.length / target) * 100)),
    rewardUnlocked: completed >= target
  };
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
    referrals: referrals.filter(item => item.referrer_id === user.id).length,
    referralProgress: referralProgressFor(user.id)
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
    referrals: referralResult.rows[0].count,
    referralProgress: {
      referrals: referralResult.rows[0].count,
      completed: referralResult.rows[0].count,
      target: 5,
      progress: Math.min(100, Math.round((referralResult.rows[0].count / 5) * 100)),
      rewardUnlocked: referralResult.rows[0].count >= 5
    }
  };
}

async function getDailyQuest(userId, now = new Date()) {
  const assignedDate = todayKey(now);
  const template = questForDate(userId, assignedDate);

  if (!env.DATABASE_URL) {
    let quest = dailyQuests.find(item => String(item.user_id) === String(userId) && item.assigned_date === assignedDate);
    if (!quest) {
      quest = {
        id: String(dailyQuests.length + 1),
        user_id: userId,
        quest_key: template.questKey,
        title: template.title,
        description: template.description,
        reward: template.reward,
        xp: template.xp,
        assigned_date: assignedDate,
        status: "assigned",
        created_at: new Date().toISOString()
      };
      dailyQuests.unshift(quest);
    }
    const completed = questCompletions.some(item => String(item.user_id) === String(userId) && item.quest_key === quest.quest_key && item.completed_date === assignedDate);
    return serializeQuest({ ...quest, status: completed ? "completed" : quest.status });
  }

  const existing = await query("SELECT * FROM daily_quests WHERE user_id = $1 AND assigned_date = $2 LIMIT 1", [userId, assignedDate]);
  if (existing.rows[0]) return serializeQuest(existing.rows[0]);

  const result = await query(
    "INSERT INTO daily_quests (user_id, quest_key, title, description, reward_cents, xp_reward, assigned_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [userId, template.questKey, template.title, template.description, Math.round(template.reward * 100), template.xp, assignedDate]
  );
  return serializeQuest(result.rows[0]);
}

async function completeDailyQuest({ userId, questId, req, now = new Date() }) {
  const today = todayKey(now);

  if (!env.DATABASE_URL) {
    const quest = dailyQuests.find(item => String(item.id) === String(questId) && String(item.user_id) === String(userId));
    if (!quest) throw new Error("Daily quest not found");
    if (quest.assigned_date !== today) throw new Error("Daily quest expired");
    const duplicate = questCompletions.some(item => String(item.user_id) === String(userId) && item.quest_key === quest.quest_key && item.completed_date === today);
    if (duplicate) throw new Error("Daily quest already completed");
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    quest.status = "completed";
    questCompletions.unshift({
      id: String(questCompletions.length + 1),
      quest_id: quest.id,
      user_id: userId,
      quest_key: quest.quest_key,
      completed_date: today,
      reward: quest.reward,
      xp: quest.xp,
      ip_address: req?.ip,
      device_hash: req?.headers?.["x-device-hash"],
      created_at: new Date().toISOString()
    });
    user.balance = Number(user.balance || 0) + Number(quest.reward || 0);
    user.total_earned = Number(user.total_earned || 0) + Number(quest.reward || 0);
    user.xp = Number(user.xp || 0) + Number(quest.xp || 0);
    user.level = levelFromXp(user.xp);
    await recordLedgerEntry({
      userId,
      type: "daily_quest",
      direction: "credit",
      amount: quest.reward,
      referenceType: "daily_quest",
      referenceId: quest.id,
      description: `Completed daily quest: ${quest.title}`,
      metadata: { questKey: quest.quest_key, xp: quest.xp }
    });
    return { completed: true, quest: serializeQuest(quest), growth: serializeUserGrowth(user) };
  }

  const questResult = await query("SELECT * FROM daily_quests WHERE id = $1 AND user_id = $2", [questId, userId]);
  const quest = questResult.rows[0];
  if (!quest) throw new Error("Daily quest not found");
  if (dateKey(quest.assigned_date) !== today) throw new Error("Daily quest expired");

  try {
    await query(
      "INSERT INTO quest_completions (quest_id, user_id, quest_key, completed_date, reward_cents, xp_reward, ip_address, device_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [quest.id, userId, quest.quest_key, today, quest.reward_cents, quest.xp_reward, req?.ip || null, req?.headers?.["x-device-hash"] || null]
    );
  } catch (error) {
    if (String(error.message).includes("duplicate") || error.code === "23505") throw new Error("Daily quest already completed");
    throw error;
  }

  await query("UPDATE daily_quests SET status = 'completed' WHERE id = $1", [quest.id]);
  await query(
    "UPDATE users SET balance_cents = balance_cents + $1, total_earned_cents = total_earned_cents + $1, xp = xp + $2, level = GREATEST(level, FLOOR((xp + $2) / 250) + 1) WHERE id = $3",
    [quest.reward_cents, quest.xp_reward, userId]
  );
  await recordLedgerEntry({
    userId,
    type: "daily_quest",
    direction: "credit",
    amountCents: quest.reward_cents,
    referenceType: "daily_quest",
    referenceId: quest.id,
    description: `Completed daily quest: ${quest.title}`,
    metadata: { questKey: quest.quest_key, xp: quest.xp_reward }
  });
  return { completed: true, quest: serializeQuest({ ...quest, status: "completed" }), growth: await getGrowthProfile(userId) };
}

async function claimDailyStreak(userId, now = new Date()) {
  const today = todayKey(now);

  if (!env.DATABASE_URL) {
    const user = users.get(String(userId));
    if (!user) throw new Error("User not found");
    const next = computeNextStreak({ lastStreakAt: user.last_streak_at, currentStreak: user.streak_count, now });
    if (next.alreadyClaimed) {
      return { claimed: false, message: "Daily streak already claimed.", growth: serializeUserGrowth(user) };
    }

    user.streak_count = next.streak;
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
  const next = computeNextStreak({ lastStreakAt: user.last_streak_at ? dateKey(user.last_streak_at) : null, currentStreak: user.streak_count, now });
  const streak = next.streak;
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

function weekStartKey(now = new Date()) {
  const date = new Date(now);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return dateKey(date);
}

function weekEndKey(weekStart) {
  return dateKey(new Date(new Date(weekStart).getTime() + 6 * 86400000));
}

async function weeklyLeaderboard(now = new Date()) {
  const weekStart = weekStartKey(now);
  const weekEndExclusive = dateKey(new Date(new Date(weekStart).getTime() + 7 * 86400000));

  if (!env.DATABASE_URL) {
    return [...users.values()]
      .map(user => {
        const weeklyTotal = ledgerEntries
          .filter(entry => String(entry.user_id) === String(user.id) && entry.direction === "credit" && dateKey(entry.created_at) >= weekStart && dateKey(entry.created_at) < weekEndExclusive)
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        return { userId: user.id, name: user.name, total_earned: weeklyTotal, level: user.level || levelFromXp(user.xp), streak: user.streak_count || 0 };
      })
      .sort((a, b) => b.total_earned - a.total_earned)
      .slice(0, 10)
      .map((row, index) => ({ ...row, rank: index + 1, weekStart }));
  }

  const result = await query(`
    SELECT u.id AS user_id, u.name, u.level, u.streak_count,
           COALESCE(SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE 0 END), 0) AS weekly_cents
    FROM users u
    LEFT JOIN ledger_entries l ON l.user_id = u.id AND l.created_at >= $1::date AND l.created_at < $2::date
    GROUP BY u.id
    ORDER BY weekly_cents DESC
    LIMIT 10
  `, [weekStart, weekEndExclusive]);

  return result.rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    name: row.name,
    total_earned: Number(row.weekly_cents || 0) / 100,
    level: row.level,
    streak: row.streak_count,
    weekStart
  }));
}

async function rolloverWeeklyLeaderboard(now = new Date()) {
  const weekStart = weekStartKey(new Date(new Date(now).getTime() - 7 * 86400000));
  const weekEnd = weekEndKey(weekStart);
  const rankings = await weeklyLeaderboard(new Date(weekStart));

  if (!env.DATABASE_URL) {
    let snapshot = weeklyLeaderboardSnapshots.find(item => item.week_start === weekStart);
    if (!snapshot) {
      snapshot = { id: String(weeklyLeaderboardSnapshots.length + 1), week_start: weekStart, week_end: weekEnd, rankings, created_at: new Date().toISOString() };
      weeklyLeaderboardSnapshots.unshift(snapshot);
    }
    return snapshot;
  }

  const result = await query(
    `INSERT INTO weekly_leaderboard_snapshots (week_start, week_end, rankings)
     VALUES ($1, $2, $3)
     ON CONFLICT (week_start) DO UPDATE SET rankings = EXCLUDED.rankings
     RETURNING *`,
    [weekStart, weekEnd, JSON.stringify(rankings)]
  );
  return result.rows[0];
}

module.exports = {
  claimDailyStreak,
  completeDailyQuest,
  computeNextStreak,
  getDailyQuest,
  getGrowthProfile,
  leaderboard,
  redeemBonusCode,
  rolloverWeeklyLeaderboard,
  weeklyLeaderboard
};
