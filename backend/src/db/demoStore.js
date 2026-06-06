const bcrypt = require("bcryptjs");

const users = new Map();
const withdrawals = [];
const moderationEvents = [];
const paymentEvents = [];
const devices = [];
const suspiciousActivity = [];
const referrals = [];
const streakClaims = [];
const bonusCodeRedemptions = [];
const ledgerEntries = [];
const supportTickets = [];
const supportMessages = [];
const emailOutbox = [];
const authTokens = [];
const bonusCodes = [
  { code: "WELCOME", reward: 1, xp: 50, active: true, max_redemptions: 5000 },
  { code: "DAILYBOOST", reward: .5, xp: 25, active: true, max_redemptions: 10000 },
  { code: "WAVE2026", reward: 2.5, xp: 100, active: true, max_redemptions: 2000 }
];

const offers = [
  { id: "1", title: "Kingdom Builder", description: "Reach castle level 10 and keep the app installed for tracking.", reward: 28.4, category: "Games", difficulty: "Medium", time: "2-4 days", provider: "AdGem" },
  { id: "2", title: "Consumer Pulse Survey", description: "Answer a short brand research survey with instant credit.", reward: 4.25, category: "Surveys", difficulty: "Easy", time: "8 min", provider: "BitLabs" },
  { id: "3", title: "Streaming App Trial", description: "Start a partner trial and confirm your first app session.", reward: 11, category: "Apps", difficulty: "Easy", time: "15 min", provider: "Lootably" },
  { id: "4", title: "Budget Card Signup", description: "Open a free finance account and complete identity verification.", reward: 36, category: "Finance", difficulty: "Advanced", time: "1 day", provider: "RevU" },
  { id: "5", title: "Daily Check-in", description: "Claim today's streak reward and keep your bonus multiplier alive.", reward: .75, category: "Bonus", difficulty: "Easy", time: "1 min", provider: "EarnWave" },
  { id: "6", title: "Puzzle Sprint", description: "Complete 20 puzzle rounds in a new mobile game.", reward: 17.8, category: "Games", difficulty: "Medium", time: "1-2 days", provider: "Torox" }
];

async function createDemoUser({ name, email, password, role = "admin" }) {
  const existing = [...users.values()].find(user => user.email === email);
  if (existing) return existing;

  const user = {
    id: String(users.size + 1),
    name,
    username: email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 24) || `user${users.size + 1}`,
    email,
    password_hash: await bcrypt.hash(password, 10),
    balance: 48.75,
    total_earned: 320.4,
    role,
    status: "active",
    email_verified: false,
    marketing_opt_in: true,
    payout_alerts: true,
    security_alerts: true,
    bio: "",
    country: "",
    timezone: "",
    fraud_score: 0,
    referral_code: `EW${String(users.size + 1).padStart(5, "0")}`,
    referred_by: null,
    level: 7,
    xp: 640,
    streak_count: 7,
    last_streak_at: null
  };
  users.set(user.id, user);
  return user;
}

module.exports = {
  users,
  offers,
  withdrawals,
  moderationEvents,
  paymentEvents,
  devices,
  suspiciousActivity,
  referrals,
  streakClaims,
  bonusCodes,
  bonusCodeRedemptions,
  ledgerEntries,
  supportTickets,
  supportMessages,
  emailOutbox,
  authTokens,
  createDemoUser
};
