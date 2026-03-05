const router = require('express').Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');

// GET /api/settings (public)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach((r) => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings (admin)
router.put('/', adminOnly, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof key === 'string' && typeof value === 'string') {
        const valStr = value.trim();
        await db.query(
          `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, valStr]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
