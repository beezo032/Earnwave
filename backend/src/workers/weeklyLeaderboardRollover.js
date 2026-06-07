require("dotenv").config();

const { rolloverWeeklyLeaderboard } = require("../services/growth");

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

function shouldRun(now = new Date()) {
  return now.getUTCDay() === 1 && now.getUTCHours() === 0;
}

async function runOnce(now = new Date()) {
  return rolloverWeeklyLeaderboard(now);
}

function startWorker({ intervalMs = Number(process.env.WEEKLY_LEADERBOARD_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS) } = {}) {
  const timer = setInterval(async () => {
    const now = new Date();
    if (!shouldRun(now)) return;
    try {
      const snapshot = await runOnce(now);
      console.log(`Weekly leaderboard rolled over for ${snapshot.week_start || snapshot.weekStart}.`);
    } catch (error) {
      console.error("Weekly leaderboard rollover failed:", error.message);
    }
  }, intervalMs);

  timer.unref?.();
  return timer;
}

if (require.main === module) {
  startWorker();
  console.log("Weekly leaderboard rollover worker started.");
}

module.exports = { runOnce, shouldRun, startWorker };
