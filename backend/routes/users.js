const router = require('express').Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');

// GET /api/users (admin)
router.get('/', adminOnly, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, is_admin, is_vip, is_active, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// POST /api/users (admin)
router.post('/', adminOnly, (req, res) => {
  const { username, password, isVIP, isAdmin } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Kullanıcı adı zaten kullanılıyor' });

  const bcrypt = require('bcrypt');
  const hash = bcrypt.hashSync(password, 10);
  
  const result = db.prepare(
    'INSERT INTO users (username, password, is_vip, is_admin) VALUES (?, ?, ?, ?)'
  ).run(username, hash, isVIP ? 1 : 0, isAdmin ? 1 : 0);
  
  const newUser = db.prepare(
    'SELECT id, username, is_admin, is_vip, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(newUser);
});

// PUT /api/users/:id (admin)
router.put('/:id', adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const { isVIP, isActive, isAdmin } = req.body;
  db.prepare('UPDATE users SET is_vip=?, is_active=?, is_admin=? WHERE id=?').run(
    isVIP  !== undefined ? (isVIP  ? 1 : 0) : user.is_vip,
    isActive !== undefined ? (isActive ? 1 : 0) : user.is_active,
    isAdmin !== undefined ? (isAdmin ? 1 : 0) : user.is_admin,
    req.params.id
  );
  const updated = db.prepare(
    'SELECT id, username, is_admin, is_vip, is_active, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  res.json(updated);
});

// DELETE /api/users/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
