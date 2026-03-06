const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../database');
const { adminOnly } = require('../middleware/auth');

// Helper: compute effective VIP (flag + not expired)
const computeVip = (user) => {
  if (!user.is_vip) return 0;
  if (!user.vip_expires_at) return 1; // no expiry = permanent
  return new Date(user.vip_expires_at) > new Date() ? 1 : 0;
};

const USER_FIELDS = 'id, username, is_admin, is_vip, vip_expires_at, is_active, created_at';

// GET /api/users (admin) — paginated + searchable
router.get('/', adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause = `WHERE username ILIKE $${paramIdx++}`;
      params.push(`%${search}%`);
    }

    // Count total
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch page
    const { rows } = await db.query(
      `SELECT ${USER_FIELDS} FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({
      users: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (admin)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { username, password, isVIP, isAdmin, vipDays } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Eksik alan' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Kullanıcı adı zaten kullanılıyor' });

    const hash = await bcrypt.hash(password, 10);
    
    // Calculate VIP expiry
    let vipExpiresAt = null;
    const isVipFlag = isVIP ? 1 : 0;
    if (isVIP && vipDays && vipDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + parseInt(vipDays));
      vipExpiresAt = expiry.toISOString();
    }
    
    const { rows } = await db.query(
      'INSERT INTO users (username, password, is_vip, vip_expires_at, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, hash, isVipFlag, vipExpiresAt, isAdmin ? 1 : 0]
    );
    
    const newUser = await db.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
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

    const { isVIP, isActive, isAdmin, vipDays } = req.body;
    
    // Calculate VIP fields
    let newIsVip = user.is_vip;
    let newVipExpiresAt = user.vip_expires_at;
    
    if (isVIP !== undefined) {
      if (isVIP && vipDays !== undefined) {
        if (parseInt(vipDays) === 0) {
          // Remove VIP
          newIsVip = 0;
          newVipExpiresAt = null;
        } else {
          // Grant/extend VIP
          newIsVip = 1;
          const days = parseInt(vipDays);
          // If user already has VIP with remaining time, extend from expiry date
          const baseDate = (user.is_vip && user.vip_expires_at && new Date(user.vip_expires_at) > new Date())
            ? new Date(user.vip_expires_at)
            : new Date();
          baseDate.setDate(baseDate.getDate() + days);
          newVipExpiresAt = baseDate.toISOString();
        }
      } else if (!isVIP) {
        // Remove VIP via toggle
        newIsVip = 0;
        newVipExpiresAt = null;
      }
    }

    await db.query(
      `UPDATE users SET is_vip=$1, vip_expires_at=$2, is_active=$3, is_admin=$4 WHERE id=$5`,
      [
        newIsVip,
        newVipExpiresAt,
        isActive !== undefined ? (isActive ? 1 : 0) : user.is_active,
        isAdmin !== undefined ? (isAdmin ? 1 : 0) : user.is_admin,
        req.params.id
      ]
    );
    
    const updated = await db.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
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
