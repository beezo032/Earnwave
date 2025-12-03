// server.js  (EarnWave backend with auth + points + postbacks)

const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;


// ====== CONFIG ======
const POSTBACK_SECRET = "k3jhf8sd8f7sd8f7sd8f7sdf87sdf"; 
 // <- change this to something random & secret

// ====== DATABASE SETUP ======
const db = new sqlite3.Database("./earnwave.db");

// init DB structure
db.serialize(() => {
  // users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      passwordHash TEXT,
      createdAt TEXT
    )
  `);

  // add points column if it doesn't exist
  db.run(
    `ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`,
    (err) => {
      if (err && !/duplicate column/i.test(err.message)) {
        console.error("Error adding points column:", err.message);
      }
    }
  );

  // transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      amount INTEGER,
      source TEXT,
      rawData TEXT,
      createdAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
});

// Helpers for sqlite3 with promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // this.lastID, this.changes
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ====== EXPRESS MIDDLEWARE ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "change_this_session_secret_in_production",
    resave: false,
    saveUninitialized: false,
  })
);

// serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// ====== AUTH ROUTES
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  try {
    const existingUser = await get(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    const result = await run(
      "INSERT INTO users (username, email, passwordHash, createdAt, points) VALUES (?, ?, ?, ?, 0)",
      [username, email, passwordHash, createdAt]
    );

    req.session.userId = result.lastID;

    res.json({
      user: { id: result.lastID, username, email, points: 0 },
    });
  } catch (err) {
    console.error("Register error", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const user = await get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash || "");
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    req.session.userId = user.id;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        points: user.points ?? 0,
      },
    });
  } catch (err) {
    console.error("Login error", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

  try {
    const user = await get("SELECT id, username, email, points FROM users WHERE id = ?", [
      req.session.userId,
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("/api/me error", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ====== TRANSACTIONS ======
app.get("/api/transactions", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

  try {
    const transactions = await all(
      "SELECT amount, source, createdAt FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 20",
      [req.session.userId]
    );

    res.json({ transactions });
  } catch (err) {
    console.error("Transactions error", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/transactions.csv", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

  try {
    const transactions = await all(
      "SELECT amount, source, createdAt FROM transactions WHERE userId = ? ORDER BY createdAt DESC",
      [req.session.userId]
    );

    const header = "amount,source,date\n";
    const rows = transactions
      .map((t) => `${t.amount},${(t.source || "Offer").replace(/,/g, " ")},${t.createdAt}`)
      .join("\n");

    const csv = header + rows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=earnwave-transactions.csv");
    res.send(csv);
  } catch (err) {
    console.error("CSV export error", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ====== POSTBACK (mock)
app.post("/postback", async (req, res) => {
  const { user_id, amount, source, signature } = req.body;

  if (signature !== POSTBACK_SECRET) {
    return res.status(403).json({ error: "Invalid signature" });
  }

  const pointsToAdd = parseInt(amount, 10) || 0;
  if (!user_id || pointsToAdd <= 0) {
    return res.status(400).json({ error: "Missing user or invalid amount" });
  }

  try {
    const user = await get("SELECT id FROM users WHERE id = ?", [user_id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    await run("UPDATE users SET points = points + ? WHERE id = ?", [pointsToAdd, user_id]);
    await run(
      "INSERT INTO transactions (userId, amount, source, rawData, createdAt) VALUES (?, ?, ?, ?, ?)",
      [user_id, pointsToAdd, source || "Offer", JSON.stringify(req.body), new Date().toISOString()]
    );

    res.json({ status: "credited" });
  } catch (err) {
    console.error("Postback error", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ====== FALLBACK ======
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`EarnWave server running on http://localhost:${PORT}`);
});
