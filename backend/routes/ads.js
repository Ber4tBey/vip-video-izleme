const router = require('express').Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ad-${req.params.slotId}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/ads (public)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM ads').all();
  // keyed by slot_id
  const obj = {};
  rows.forEach((r) => { obj[r.slot_id] = r; });
  res.json(obj);
});

// PUT /api/ads/:slotId (admin + optional image)
router.put('/:slotId', adminOnly, upload.single('image'), (req, res) => {
  const { linkUrl, altText, isActive } = req.body;
  const ad = db.prepare('SELECT * FROM ads WHERE slot_id = ?').get(req.params.slotId);

  const imageUrl = req.file
    ? `/uploads/images/${req.file.filename}`
    : (req.body.imageUrl ?? (ad?.image_url || ''));

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
    linkUrl ?? ad?.link_url ?? '',
    altText ?? ad?.alt_text ?? 'Reklam',
    isActive !== undefined ? (isActive === 'true' ? 1 : 0) : (ad?.is_active ?? 0)
  );

  res.json(db.prepare('SELECT * FROM ads WHERE slot_id = ?').get(req.params.slotId));
});

module.exports = router;
