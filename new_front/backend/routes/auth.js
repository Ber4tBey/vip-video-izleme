const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const sign = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, isAdmin: !!user.is_admin, isVIP: !!user.is_vip },
    process.env.JWT_SECRET || 'super_secret_video_key_123',
    { expiresIn: '30d' }
  );

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });

    const result = await db.query('SELECT * FROM users WHERE username = $1 AND is_active = 1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });

    const { password: _p, ...safe } = user;
    res.json({ token: sign(user), user: safe });
  } catch(err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Kullanıcı adı zaten kullanılıyor' });

    const hash = await bcrypt.hash(password, 10);
    const insertResult = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [username, hash]
    );
    const user = insertResult.rows[0];
    const { password: _p, ...safe } = user;
    res.status(201).json({ token: sign(user), user: safe });
  } catch(err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Token gerekli' });
    
    let payload;
    try {
      payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'super_secret_video_key_123');
    } catch {
      return res.status(401).json({ error: 'Geçersiz token' });
    }

    const { rows } = await db.query('SELECT id, username, is_admin, is_vip, is_active, created_at FROM users WHERE id = $1', [payload.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
