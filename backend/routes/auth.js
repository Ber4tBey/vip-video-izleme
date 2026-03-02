const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const sign = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, isAdmin: !!user.is_admin, isVIP: !!user.is_vip },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });

  const { password: _p, ...safe } = user;
  res.json({ token: sign(user), user: safe });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Kullanıcı adı zaten kullanılıyor' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const { password: _p, ...safe } = user;
  res.status(201).json({ token: sign(user), user: safe });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token gerekli' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, username, is_admin, is_vip, is_active, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
});

module.exports = router;
