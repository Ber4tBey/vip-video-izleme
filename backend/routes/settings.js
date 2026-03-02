const router = require('express').Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');

// GET /api/settings (public)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach((r) => { obj[r.key] = r.value; });
  res.json(obj);
});

// PUT /api/settings (admin)
router.put('/', adminOnly, (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const upsert = db.transaction((data) => {
    Object.entries(data).forEach(([k, v]) => stmt.run(k, v));
  });
  upsert(req.body);
  res.json({ success: true });
});

module.exports = router;
