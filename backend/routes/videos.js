const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../database');
const { adminOnly } = require('../middleware/auth');
const {
  videosDir,
  thumbnailsDir,
  ensureMediaDirs,
  toAbsoluteUploadPath,
  deleteFileIfExists,
  getThumbnailFileName,
  getThumbnailUrl,
  generateVideoThumbnailSync,
  optimizeVideoForStreamingSync,
} = require('../utils/media');

ensureMediaDirs();

const chunkDir = path.join(videosDir, '.chunks');
if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

const directUpload = multer({
  storage: multer.diskStorage({
    destination: videosDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Sadece video dosyalari kabul edilir'));
  },
});

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB max per chunk
});

const sanitizeUploadId = (value) => {
  if (typeof value !== 'string') return '';
  return /^[a-zA-Z0-9_-]{8,120}$/.test(value) ? value : '';
};

const normalizeExt = (originalName, mimeType) => {
  const ext = path.extname(originalName || '').toLowerCase();
  if (ext) return ext;
  if (mimeType === 'video/webm') return '.webm';
  if (mimeType === 'video/quicktime') return '.mov';
  if (mimeType === 'video/x-matroska') return '.mkv';
  return '.mp4';
};

const createThumbnailForVideo = (videoFileName) => {
  const videoPath = path.join(videosDir, videoFileName);
  const thumbPath = path.join(thumbnailsDir, getThumbnailFileName(videoFileName));
  const ok = generateVideoThumbnailSync(videoPath, thumbPath);
  return ok ? getThumbnailUrl(videoFileName) : null;
};

const saveThumbnailFromDataUrl = (thumbnailDataUrl, videoFileName) => {
  if (typeof thumbnailDataUrl !== 'string' || !thumbnailDataUrl) return null;

  const match = /^data:image\/(?:jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i.exec(thumbnailDataUrl.trim());
  if (!match) return null;

  const thumbPath = path.join(thumbnailsDir, getThumbnailFileName(videoFileName));
  const buffer = Buffer.from(match[1], 'base64');
  if (!buffer.length) return null;

  fs.writeFileSync(thumbPath, buffer);
  return getThumbnailUrl(videoFileName);
};

const createVideoRecord = ({ title, description, categoryId, modelId, isVIP, isActive, url, thumbnailUrl }) => {
  const result = db.prepare(`
    INSERT INTO videos (title, description, url, thumbnail_url, category_id, model_id, is_vip, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    url,
    thumbnailUrl,
    categoryId || null,
    modelId || null,
    isVIP === 'true' ? 1 : 0,
    isActive === 'false' ? 0 : 1
  );

  return db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
};

const cleanupChunkFiles = (uploadId, totalChunks) => {
  for (let index = 0; index < totalChunks; index += 1) {
    const chunkPath = path.join(chunkDir, `${uploadId}.${index}.part`);
    if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
  }
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

// POST /api/videos/upload/chunk (admin + chunk upload)
router.post('/upload/chunk', adminOnly, chunkUpload.single('chunk'), (req, res) => {
  const uploadId = sanitizeUploadId(req.body.uploadId);
  const chunkIndex = Number.parseInt(req.body.chunkIndex, 10);
  const totalChunks = Number.parseInt(req.body.totalChunks, 10);

  if (!uploadId) return res.status(400).json({ error: 'Gecersiz uploadId' });
  if (!req.file) return res.status(400).json({ error: 'Chunk dosyasi gerekli' });
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) return res.status(400).json({ error: 'Gecersiz chunkIndex' });
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 5000) {
    return res.status(400).json({ error: 'Gecersiz totalChunks' });
  }
  if (chunkIndex >= totalChunks) return res.status(400).json({ error: 'Chunk index range disinda' });

  const chunkPath = path.join(chunkDir, `${uploadId}.${chunkIndex}.part`);
  fs.writeFileSync(chunkPath, req.file.buffer);
  res.json({ success: true, chunkIndex, totalChunks });
});

// POST /api/videos/upload/complete (admin + merge chunks + save DB record)
router.post('/upload/complete', adminOnly, (req, res) => {
  const {
    uploadId: rawUploadId,
    totalChunks: rawTotalChunks,
    originalName,
    mimeType,
    title,
    description,
    categoryId,
    modelId,
    isVIP,
    isActive,
    thumbnailDataUrl,
  } = req.body;

  const uploadId = sanitizeUploadId(rawUploadId);
  const totalChunks = Number.parseInt(rawTotalChunks, 10);

  if (!uploadId) return res.status(400).json({ error: 'Gecersiz uploadId' });
  if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 5000) {
    return res.status(400).json({ error: 'Gecersiz totalChunks' });
  }

  for (let index = 0; index < totalChunks; index += 1) {
    const chunkPath = path.join(chunkDir, `${uploadId}.${index}.part`);
    if (!fs.existsSync(chunkPath)) {
      return res.status(400).json({ error: `Eksik chunk: ${index + 1}/${totalChunks}` });
    }
  }

  const ext = normalizeExt(originalName, mimeType);
  const mergedFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const mergedFilePath = path.join(videosDir, mergedFileName);

  try {
    for (let index = 0; index < totalChunks; index += 1) {
      const chunkPath = path.join(chunkDir, `${uploadId}.${index}.part`);
      const chunkBuffer = fs.readFileSync(chunkPath);
      fs.appendFileSync(mergedFilePath, chunkBuffer);
    }
  } catch (err) {
    if (fs.existsSync(mergedFilePath)) fs.unlinkSync(mergedFilePath);
    cleanupChunkFiles(uploadId, totalChunks);
    return res.status(500).json({ error: err.message || 'Chunk birlestirme hatasi' });
  }

  cleanupChunkFiles(uploadId, totalChunks);
  optimizeVideoForStreamingSync(mergedFilePath);

  const url = `/uploads/videos/${mergedFileName}`;
  const thumbnailUrl =
    saveThumbnailFromDataUrl(thumbnailDataUrl, mergedFileName) || createThumbnailForVideo(mergedFileName);
  const video = createVideoRecord({
    title,
    description,
    categoryId,
    modelId,
    isVIP,
    isActive,
    url,
    thumbnailUrl,
  });

  return res.status(201).json(video);
});

// POST /api/videos (admin + direct upload, fallback)
router.post('/', adminOnly, directUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video dosyasi gerekli' });

  const { title, description, categoryId, modelId, isVIP, isActive } = req.body;
  if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });

  optimizeVideoForStreamingSync(req.file.path);
  const url = `/uploads/videos/${req.file.filename}`;
  const thumbnailUrl = createThumbnailForVideo(req.file.filename);
  const video = createVideoRecord({
    title,
    description,
    categoryId,
    modelId,
    isVIP,
    isActive,
    url,
    thumbnailUrl,
  });

  res.status(201).json(video);
});

// PUT /api/videos/:id (admin)
router.put('/:id', adminOnly, directUpload.single('video'), (req, res) => {
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Video bulunamadi' });

  const { title, description, categoryId, modelId, isVIP, isActive } = req.body;
  let url = existing.url;
  let thumbnailUrl = existing.thumbnail_url || null;

  if (req.file) {
    optimizeVideoForStreamingSync(req.file.path);
    url = `/uploads/videos/${req.file.filename}`;
    const generatedThumbnail = createThumbnailForVideo(req.file.filename);
    if (generatedThumbnail) {
      thumbnailUrl = generatedThumbnail;
      if (existing.thumbnail_url) deleteFileIfExists(toAbsoluteUploadPath(existing.thumbnail_url));
    }

    deleteFileIfExists(toAbsoluteUploadPath(existing.url));
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

// POST /api/videos/:id/view
router.post('/:id/view', (req, res) => {
  db.prepare('UPDATE videos SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
