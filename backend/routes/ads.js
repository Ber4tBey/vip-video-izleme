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
    cb(null, `ad-${req.params.slotId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sadece resim dosyalari kabul edilir'));
  },
});

// GET /api/ads (public)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM ads').all();
  const bySlot = {};
  rows.forEach((row) => {
    bySlot[row.slot_id] = row;
  });
  res.json(bySlot);
});

// PUT /api/ads/:slotId (admin + optional image)
router.put('/:slotId', adminOnly, upload.single('image'), (req, res) => {
  const { linkUrl, altText, isActive } = req.body;
  const existing = db.prepare('SELECT * FROM ads WHERE slot_id = ?').get(req.params.slotId);

  let imageUrl = req.body.imageUrl ?? (existing?.image_url || '');
  if (req.file) {
    imageUrl = `/uploads/images/${req.file.filename}`;
    if (existing?.image_url && existing.image_url !== imageUrl) {
      deleteFileIfExists(toAbsoluteUploadPath(existing.image_url));
    }
  }

  db.prepare(`
    INSERT INTO ads (slot_id, image_url, link_url, alt_text, is_active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(slot_id) DO UPDATE SET
      image_url = excluded.image_url,
      link_url  = excluded.link_url,
      alt_text  = excluded.alt_text,
      is_active = excluded.is_active
  `).run(
    req.params.slotId,
    imageUrl,
    linkUrl ?? existing?.link_url ?? '',
    altText ?? existing?.alt_text ?? 'Reklam',
    isActive !== undefined ? (isActive === 'true' ? 1 : 0) : (existing?.is_active ?? 0)
  );

  res.json(db.prepare('SELECT * FROM ads WHERE slot_id = ?').get(req.params.slotId));
});

module.exports = router;
