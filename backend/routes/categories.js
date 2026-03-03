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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sadece resim dosyalari kabul edilir'));
  },
});

// GET /api/categories
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

// POST /api/categories (admin)
router.post('/', adminOnly, upload.single('image'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Ad zorunlu' });

  const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
  const result = db.prepare('INSERT INTO categories (name, image_url) VALUES (?, ?)').run(name, imageUrl);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/categories/:id (admin)
router.put('/:id', adminOnly, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Bulunamadi' });

  const { name, isActive } = req.body;
  const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : existing.image_url;

  if (req.file && existing.image_url) {
    deleteFileIfExists(toAbsoluteUploadPath(existing.image_url));
  }

  db.prepare('UPDATE categories SET name=?, image_url=?, is_active=? WHERE id=?').run(
    name || existing.name,
    imageUrl,
    isActive !== undefined ? (isActive === 'true' ? 1 : 0) : existing.is_active,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

// PATCH /api/categories/:id/toggle (admin)
router.patch('/:id/toggle', adminOnly, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Bulunamadi' });

  db.prepare('UPDATE categories SET is_active = ? WHERE id = ?').run(
    category.is_active ? 0 : 1,
    req.params.id
  );
  res.json({ success: true });
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Bulunamadi' });

  if (category.image_url) deleteFileIfExists(toAbsoluteUploadPath(category.image_url));
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
