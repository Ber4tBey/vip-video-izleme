const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'database.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    is_admin   INTEGER NOT NULL DEFAULT 0,
    is_vip     INTEGER NOT NULL DEFAULT 0,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL UNIQUE,
    image_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS models (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL UNIQUE,
    bio       TEXT,
    image_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS videos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    url         TEXT    NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    model_id    INTEGER REFERENCES models(id) ON DELETE SET NULL,
    is_vip      INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    view_count  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS ads (
    slot_id   TEXT PRIMARY KEY,
    image_url TEXT NOT NULL DEFAULT '',
    link_url  TEXT NOT NULL DEFAULT '',
    alt_text  TEXT NOT NULL DEFAULT 'Reklam',
    is_active INTEGER NOT NULL DEFAULT 0
  );
`);

// Lightweight migration: add video thumbnail field if missing.
const videoColumns = db.prepare(`PRAGMA table_info(videos)`).all().map((c) => c.name);
if (!videoColumns.includes('thumbnail_url')) {
  db.prepare('ALTER TABLE videos ADD COLUMN thumbnail_url TEXT').run();
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
const seedAdmin = () => {
  const existing = db.prepare('SELECT id FROM users WHERE is_admin = 1').get();
  if (existing) return;
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  db.prepare(`INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)`)
    .run(process.env.ADMIN_USERNAME || 'admin', hash);
  console.log('✅ Admin user seeded (admin / admin123)');
};

const seedSettings = () => {
  const insert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  insert.run('telegramLink', 'https://t.me/yourusername');
  insert.run('siteName', 'ONLYMIXMEDIA');
};

const seedAds = () => {
  const slots = [
    'home-leaderboard', 'home-rectangle', 'home-banner',
    'videos-leaderboard', 'footer-leaderboard',
  ];
  const insert = db.prepare(`INSERT OR IGNORE INTO ads (slot_id) VALUES (?)`);
  slots.forEach((s) => insert.run(s));
};

seedAdmin();
seedSettings();
seedAds();

module.exports = db;
