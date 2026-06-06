const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "earnwave.db"));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0,
      total_earned REAL DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward REAL NOT NULL,
      category TEXT NOT NULL,
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS completed_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      offer_id INTEGER,
      reward REAL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT COUNT(*) AS count FROM offers", (err, row) => {
    if (!err && row.count === 0) {
      const offers = [
        ["Kingdom Builder", "Reach castle level 10 and keep the app installed for tracking.", 28.4, "Games"],
        ["Consumer Pulse Survey", "Answer a short brand research survey with instant credit.", 4.25, "Surveys"],
        ["Streaming App Trial", "Start a partner trial and confirm your first app session.", 11.0, "Apps"],
        ["Budget Card Signup", "Open a free finance account and complete identity verification.", 36.0, "Finance"],
        ["Daily Check-in", "Claim today's streak reward and keep your bonus multiplier alive.", 0.75, "Bonus"],
        ["Puzzle Sprint", "Complete 20 puzzle rounds in a new mobile game.", 17.8, "Games"]
      ];

      offers.forEach(offer => {
        db.run(
          "INSERT INTO offers (title, description, reward, category) VALUES (?, ?, ?, ?)",
          offer
        );
      });
    }
  });
});

module.exports = db;
