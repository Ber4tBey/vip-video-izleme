const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../database');
const { adminOnly } = require('../middleware/auth');

// GET /api/users (admin)
router.get('/', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, is_admin, is_vip, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (admin)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { username, password, isVIP, isAdmin } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Kullanıcı adı zaten kullanılıyor' });

    const hash = await bcrypt.hash(password, 10);
    
    const { rows } = await db.query(
      'INSERT INTO users (username, password, is_vip, is_admin) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, hash, isVIP ? 1 : 0, isAdmin ? 1 : 0]
    );
    
    const newUser = await db.query(
      'SELECT id, username, is_admin, is_vip, is_active, created_at FROM users WHERE id = $1',
      [rows[0].id]
    );
    res.status(201).json(newUser.rows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id (admin)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const user = userRes.rows[0];

    const { isVIP, isActive, isAdmin } = req.body;
    await db.query(`UPDATE users SET is_vip=$1, is_active=$2, is_admin=$3 WHERE id=$4`, [
      isVIP !== undefined ? (isVIP ? 1 : 0) : user.is_vip,
      isActive !== undefined ? (isActive ? 1 : 0) : user.is_active,
      isAdmin !== undefined ? (isAdmin ? 1 : 0) : user.is_admin,
      req.params.id
    ]);
    
    const updated = await db.query(
      'SELECT id, username, is_admin, is_vip, is_active, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
