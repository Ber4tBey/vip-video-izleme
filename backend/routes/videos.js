const router = require('express').Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  videosDir,
  thumbnailsDir,
  ensureMediaDirs,
  toAbsoluteUploadPath,
  deleteFileIfExists,
  getThumbnailFileName,
  getThumbnailUrl,
  generateVideoThumbnailSync,
} = require('../utils/media');

ensureMediaDirs();

const storage = multer.diskStorage({
  destination: videosDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Sadece video dosyalari kabul edilir'));
  },
});

const createThumbnailForVideo = (videoFileName) => {
  const videoPath = path.join(videosDir, videoFileName);
  const thumbPath = path.join(thumbnailsDir, getThumbnailFileName(videoFileName));
  const ok = generateVideoThumbnailSync(videoPath, thumbPath);
  return ok ? getThumbnailUrl(videoFileName) : null;
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

// POST /api/videos (admin + file upload)
router.post('/', adminOnly, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video dosyasi gerekli' });

  const { title, description, categoryId, modelId, isVIP } = req.body;
  if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });

  const url = `/uploads/videos/${req.file.filename}`;
  const thumbnailUrl = createThumbnailForVideo(req.file.filename);

  const result = db.prepare(`
    INSERT INTO videos (title, description, url, thumbnail_url, category_id, model_id, is_vip)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    url,
    thumbnailUrl,
    categoryId || null,
    modelId || null,
    isVIP === 'true' ? 1 : 0
  );

  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(video);
});

// PUT /api/videos/:id (admin)
router.put('/:id', adminOnly, upload.single('video'), (req, res) => {
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Video bulunamadi' });

  const { title, description, categoryId, modelId, isVIP, isActive } = req.body;

  let url = existing.url;
  let thumbnailUrl = existing.thumbnail_url || null;

  if (req.file) {
    url = `/uploads/videos/${req.file.filename}`;
    thumbnailUrl = createThumbnailForVideo(req.file.filename);

    deleteFileIfExists(toAbsoluteUploadPath(existing.url));
    if (existing.thumbnail_url) deleteFileIfExists(toAbsoluteUploadPath(existing.thumbnail_url));
  }

  db.prepare(`
    UPDATE videos
    SET title=?, description=?, url=?, thumbnail_url=?, category_id=?, model_id=?, is_vip=?, is_active=?
    WHERE id=?
  `).run(
    title || existing.title,
    description ?? existing.description,
    url,
    thumbnailUrl,
    categoryId ?? existing.category_id,
    modelId ?? existing.model_id,
    isVIP !== undefined ? (isVIP === 'true' ? 1 : 0) : existing.is_vip,
    isActive !== undefined ? (isActive === 'true' ? 1 : 0) : existing.is_active,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id));
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

  deleteFileIfExists(toAbsoluteUploadPath(video.url));
  if (video.thumbnail_url) deleteFileIfExists(toAbsoluteUploadPath(video.thumbnail_url));

  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/videos/:id/view - increment view count
router.post('/:id/view', (req, res) => {
  db.prepare('UPDATE videos SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
