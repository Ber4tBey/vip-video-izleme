const router = require('express').Router();
const multer = require('multer');
const db = require('../database');
const { adminOnly, optionalAuth } = require('../middleware/auth');
const { toAbsoluteUploadPath, deleteFileIfExists } = require('../utils/media');
const {
  normalizeStreamtapeUrl,
  resolveStreamtapeDirectUrl,
  resolveStreamtapeMetadata,
} = require('../utils/streamtape');

const parseStreamtapeForm = (req, res, next) => {
  multer().none()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Dosya yukleme kapatildi. Sadece Streamtape linki kullanin.' });
    }
    return next();
  });
};

const toDbBoolean = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return 1;
    if (v === 'false' || v === '0') return 0;
  }
  return defaultValue;
};

const pickBodyValue = (body, ...keys) => {
  for (const key of keys) {
    if (body[key] !== undefined) return body[key];
  }
  return undefined;
};

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isLocalVideoUrl = (value) => typeof value === 'string' && value.startsWith('/uploads/videos/');
const isLocalUploadPath = (value) => typeof value === 'string' && value.startsWith('/uploads/');

const resolveStreamtapeDataSafely = async (streamtapeUrl) => {
  try {
    return await resolveStreamtapeMetadata(streamtapeUrl);
  } catch {
    return null;
  }
};

const createVideoRecord = ({
  title,
  description,
  categoryId,
  modelId,
  isVIP,
  isActive,
  streamtapeUrl,
  thumbnailUrl,
}) => {
  const result = db.prepare(`
    INSERT INTO videos (title, description, url, thumbnail_url, streamtape_url, category_id, model_id, is_vip, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    streamtapeUrl,
    thumbnailUrl || null,
    streamtapeUrl,
    categoryId || null,
    modelId || null,
    toDbBoolean(isVIP, 0),
    toDbBoolean(isActive, 1)
  );

  return db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
};

// GET /api/videos
router.get('/', (req, res) => {
  const { category, model, vip, search } = req.query;
  let sql = `
    SELECT v.*, c.name as category_name, m.name as model_name
    FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    LEFT JOIN models m ON v.model_id = m.id
    WHERE v.is_active = 1
  `;

  const params = [];
  if (category) {
    sql += ' AND v.category_id = ?';
    params.push(category);
  }
  if (model) {
    sql += ' AND v.model_id = ?';
    params.push(model);
  }
  if (vip === '1') {
    sql += ' AND v.is_vip = 1';
  }
  if (search) {
    sql += ' AND v.title LIKE ?';
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY v.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/videos/all (admin)
router.get('/all', adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, c.name as category_name, m.name as model_name
    FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    LEFT JOIN models m ON v.model_id = m.id
    ORDER BY v.created_at DESC
  `).all();
  res.json(rows);
});

// Upload endpoints are disabled by request: Streamtape only.
router.post('/upload/chunk', adminOnly, (req, res) => {
  res.status(410).json({ error: 'Video dosyasi yukleme kapatildi. Sadece Streamtape linki kullanin.' });
});

router.post('/upload/complete', adminOnly, (req, res) => {
  res.status(410).json({ error: 'Video dosyasi yukleme kapatildi. Sadece Streamtape linki kullanin.' });
});

// POST /api/videos (admin, streamtape-only)
router.post('/', adminOnly, parseStreamtapeForm, async (req, res) => {
  const { title, description, isVIP, isActive } = req.body;
  const categoryId = pickBodyValue(req.body, 'categoryId', 'category_id', 'category');
  const modelId = pickBodyValue(req.body, 'modelId', 'model_id', 'model');
  const streamtapeInput = normalizeOptionalText(pickBodyValue(req.body, 'streamtapeUrl', 'streamtape_url'));
  const streamtapeUrl = normalizeStreamtapeUrl(streamtapeInput);

  if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });
  if (!streamtapeUrl) return res.status(400).json({ error: 'Gecerli Streamtape linki zorunlu' });

  const metadata = await resolveStreamtapeDataSafely(streamtapeUrl);
  const thumbnailUrl =
    normalizeOptionalText(pickBodyValue(req.body, 'thumbnailUrl', 'thumbnail_url')) ||
    metadata?.thumbnailUrl ||
    null;

  const video = createVideoRecord({
    title,
    description,
    categoryId,
    modelId,
    isVIP,
    isActive,
    streamtapeUrl,
    thumbnailUrl,
  });

  res.status(201).json(video);
});

// PUT /api/videos/:id (admin, streamtape-only)
router.put('/:id', adminOnly, parseStreamtapeForm, async (req, res) => {
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Video bulunamadi' });

  const { title, description, isVIP, isActive } = req.body;
  const categoryId = pickBodyValue(req.body, 'categoryId', 'category_id', 'category');
  const modelId = pickBodyValue(req.body, 'modelId', 'model_id', 'model');

  const hasStreamtapeInput = pickBodyValue(req.body, 'streamtapeUrl', 'streamtape_url') !== undefined;
  const streamtapeInput = normalizeOptionalText(pickBodyValue(req.body, 'streamtapeUrl', 'streamtape_url') || '');

  let streamtapeUrl = normalizeStreamtapeUrl(existing.streamtape_url || existing.url);
  let thumbnailUrl = existing.thumbnail_url || null;

  if (!streamtapeUrl && !hasStreamtapeInput) {
    return res.status(400).json({ error: 'Bu kayit local video. Streamtape linki girmeniz gerekli.' });
  }

  if (hasStreamtapeInput) {
    if (!streamtapeInput) {
      return res.status(400).json({ error: 'Streamtape linki bos olamaz' });
    }

    const normalizedStreamtapeUrl = normalizeStreamtapeUrl(streamtapeInput);
    if (!normalizedStreamtapeUrl) {
      return res.status(400).json({ error: 'Gecersiz Streamtape linki' });
    }

    if (isLocalVideoUrl(existing.url)) deleteFileIfExists(toAbsoluteUploadPath(existing.url));
    if (isLocalUploadPath(existing.thumbnail_url)) deleteFileIfExists(toAbsoluteUploadPath(existing.thumbnail_url));

    streamtapeUrl = normalizedStreamtapeUrl;
    const metadata = await resolveStreamtapeDataSafely(streamtapeUrl);
    thumbnailUrl = metadata?.thumbnailUrl || thumbnailUrl;
  }

  db.prepare(`
    UPDATE videos
    SET title=?, description=?, url=?, thumbnail_url=?, streamtape_url=?, category_id=?, model_id=?, is_vip=?, is_active=?
    WHERE id=?
  `).run(
    title || existing.title,
    description ?? existing.description,
    streamtapeUrl,
    thumbnailUrl,
    streamtapeUrl,
    categoryId ?? existing.category_id,
    modelId ?? existing.model_id,
    isVIP !== undefined ? toDbBoolean(isVIP, existing.is_vip) : existing.is_vip,
    isActive !== undefined ? toDbBoolean(isActive, existing.is_active) : existing.is_active,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id));
});

// GET /api/videos/:id/playback
router.get('/:id/playback', optionalAuth, async (req, res) => {
  const video = db.prepare(`
    SELECT id, url, streamtape_url, is_vip, is_active
    FROM videos
    WHERE id = ?
  `).get(req.params.id);

  if (!video || !video.is_active) {
    return res.status(404).json({ error: 'Video bulunamadi' });
  }

  if (video.is_vip) {
    if (!req.user || (!req.user.isVIP && !req.user.isAdmin)) {
      return res.status(403).json({ error: 'Bu VIP videoyu izlemek icin yetkiniz yok.' });
    }
  }

  const streamtapeSource = normalizeStreamtapeUrl(video.streamtape_url || video.url);
  if (!streamtapeSource) {
    return res.status(400).json({ error: 'Bu video icin Streamtape linki bulunamadi' });
  }

  try {
    const refreshedUrl = await resolveStreamtapeDirectUrl(streamtapeSource);
    return res.json({
      url: refreshedUrl,
      source: 'streamtape',
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Streamtape linki yenilenemedi' });
  }
});

// PATCH /api/videos/:id/toggle (admin)
router.patch('/:id/toggle', adminOnly, (req, res) => {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Bulunamadi' });

  db.prepare('UPDATE videos SET is_active = ? WHERE id = ?').run(video.is_active ? 0 : 1, req.params.id);
  res.json({ success: true });
});

// DELETE /api/videos/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Bulunamadi' });

  if (isLocalVideoUrl(video.url)) deleteFileIfExists(toAbsoluteUploadPath(video.url));
  if (isLocalUploadPath(video.thumbnail_url)) deleteFileIfExists(toAbsoluteUploadPath(video.thumbnail_url));

  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/videos/:id/view
router.post('/:id/view', (req, res) => {
  db.prepare('UPDATE videos SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
