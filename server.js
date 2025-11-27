// server.js  (EarnWave backend with auth + points + postbacks)

const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;


// ====== CONFIG ======
const POSTBACK_SECRET = "CHANGE_THIS_POSTBACK_SECRET"; // <- change this to something random & secret

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
