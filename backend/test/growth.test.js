const test = require("node:test");
const assert = require("node:assert/strict");
const fc = require("fast-check");
const { createApp } = require("../src/app");
const { createToken } = require("../src/middleware/auth");
const { env } = require("../src/config/env");
const store = require("../src/db/demoStore");
const { computeNextStreak } = require("../src/services/growth");

function resetDemoStore() {
  store.users.clear();
  store.referrals.length = 0;
  store.streakClaims.length = 0;
  store.dailyQuests.length = 0;
  store.questCompletions.length = 0;
  store.weeklyLeaderboardSnapshots.length = 0;
  store.ledgerEntries.length = 0;
}

async function testServer() {
  env.DATABASE_URL = "";
  resetDemoStore();
  const user = await store.createDemoUser({ name: "Quest Tester", email: "quest@example.com", password: "password123", role: "user" });
  user.email_verified = true;
  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = createToken(user);
  return {
    user,
    baseUrl,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-device-hash": "test-device" },
    close: () => new Promise(resolve => server.close(resolve))
  };
}

test("assigns a daily quest and blocks duplicate completion", async () => {
  const server = await testServer();
  try {
    const questResponse = await fetch(`${server.baseUrl}/api/growth/quests/daily`, { headers: server.headers });
    assert.equal(questResponse.status, 200);
    const questPayload = await questResponse.json();
    assert.equal(typeof questPayload.quest.id, "string");
    assert.equal(questPayload.quest.status, "assigned");

    const completeResponse = await fetch(`${server.baseUrl}/api/growth/quests/${questPayload.quest.id}/complete`, {
      method: "POST",
      headers: server.headers,
      body: "{}"
    });
    assert.equal(completeResponse.status, 200);
    const completePayload = await completeResponse.json();
    assert.equal(completePayload.completed, true);
    assert.equal(completePayload.quest.status, "completed");
    assert.equal(store.questCompletions.length, 1);

    const duplicateResponse = await fetch(`${server.baseUrl}/api/growth/quests/${questPayload.quest.id}/complete`, {
      method: "POST",
      headers: server.headers,
      body: "{}"
    });
    assert.equal(duplicateResponse.status, 409);
    const duplicatePayload = await duplicateResponse.json();
    assert.match(duplicatePayload.message, /already completed/i);
    assert.equal(store.questCompletions.length, 1);
  } finally {
    await server.close();
  }
});

test("returns weekly leaderboard aggregation endpoint", async () => {
  const server = await testServer();
  try {
    store.ledgerEntries.push({
      id: "weekly-credit",
      user_id: server.user.id,
      type: "daily_quest",
      direction: "credit",
      amount: 3.25,
      created_at: new Date().toISOString()
    });

    const response = await fetch(`${server.baseUrl}/api/growth/leaderboard/weekly`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.leaderboard[0].userId, server.user.id);
    assert.equal(payload.leaderboard[0].total_earned, 3.25);
  } finally {
    await server.close();
  }
});

test("streak continuity increments only from yesterday", () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 365 }), fc.integer({ min: 0, max: 1000 }), (daysAgo, currentStreak) => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const last = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
    const result = computeNextStreak({ lastStreakAt: last, currentStreak, now });

    if (daysAgo === 0) {
      assert.equal(result.alreadyClaimed, true);
      assert.equal(result.streak, currentStreak);
    } else if (daysAgo === 1) {
      assert.equal(result.alreadyClaimed, false);
      assert.equal(result.continued, true);
      assert.equal(result.streak, currentStreak + 1);
    } else {
      assert.equal(result.alreadyClaimed, false);
      assert.equal(result.continued, false);
      assert.equal(result.streak, 1);
    }
  }));
});

test("streak continuity starts at one when no previous claim exists", () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 1000 }), currentStreak => {
    const result = computeNextStreak({ lastStreakAt: null, currentStreak, now: new Date("2026-06-07T12:00:00.000Z") });
    assert.equal(result.alreadyClaimed, false);
    assert.equal(result.streak, 1);
  }));
});
