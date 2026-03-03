const router = require('express').Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  imagesDir,
  ensureMediaDirs,
  toAbsoluteUploadPath,
  deleteFileIfExists,
} = require('../utils/media');

ensureMediaDirs();

const storage = multer.diskStorage({
  destination: imagesDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sadece resim dosyalari kabul edilir'));
  },
});

// GET /api/models
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM models ORDER BY name').all());
});

// POST /api/models (admin)
router.post('/', adminOnly, upload.single('image'), (req, res) => {
  const { name, bio } = req.body;
  if (!name) return res.status(400).json({ error: 'Ad zorunlu' });

  const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
  const result = db.prepare('INSERT INTO models (name, bio, image_url) VALUES (?, ?, ?)').run(
    name,
    bio || null,
    imageUrl
  );

  res.status(201).json(db.prepare('SELECT * FROM models WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/models/:id (admin)
router.put('/:id', adminOnly, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Bulunamadi' });

  const { name, bio, isActive } = req.body;
  const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : existing.image_url;

  if (req.file && existing.image_url) {
    deleteFileIfExists(toAbsoluteUploadPath(existing.image_url));
  }

  db.prepare('UPDATE models SET name=?, bio=?, image_url=?, is_active=? WHERE id=?').run(
    name || existing.name,
    bio ?? existing.bio,
    imageUrl,
    isActive !== undefined ? (isActive === 'true' ? 1 : 0) : existing.is_active,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id));
});

// PATCH /api/models/:id/toggle (admin)
router.patch('/:id/toggle', adminOnly, (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Bulunamadi' });

  db.prepare('UPDATE models SET is_active = ? WHERE id = ?').run(model.is_active ? 0 : 1, req.params.id);
  res.json({ success: true });
});

// DELETE /api/models/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Bulunamadi' });

  if (model.image_url) deleteFileIfExists(toAbsoluteUploadPath(model.image_url));
  db.prepare('DELETE FROM models WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
