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
  optimizeImageForDeliverySync,
  imagePathToUrl,
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

const processImageUpload = (file) => {
  if (!file) return '';
  const originalPath = path.join(imagesDir, file.filename);
  const optimizedPath = optimizeImageForDeliverySync(originalPath);
  return imagePathToUrl(optimizedPath);
};

// GET /api/ads (public)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM ads');
    const bySlot = {};
    rows.forEach((row) => {
      bySlot[row.slot_id] = row;
    });
    res.json(bySlot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ads/:slotId (admin + optional image)
router.put('/:slotId', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { linkUrl, altText, isActive } = req.body;
    const existRes = await db.query('SELECT * FROM ads WHERE slot_id = $1', [req.params.slotId]);
    const existing = existRes.rows.length > 0 ? existRes.rows[0] : null;

    let imageUrl = req.body.imageUrl ?? (existing?.image_url || '');
    if (req.file) {
      imageUrl = processImageUpload(req.file);
      if (existing?.image_url && existing.image_url !== imageUrl) {
        deleteFileIfExists(toAbsoluteUploadPath(existing.image_url));
      }
    }

    const { rows } = await db.query(`
      INSERT INTO ads (slot_id, image_url, link, alt_text, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(slot_id) DO UPDATE SET
        image_url = excluded.image_url,
        link      = excluded.link,
        alt_text  = excluded.alt_text,
        is_active = excluded.is_active
      RETURNING *
    `, [
      req.params.slotId,
      imageUrl,
      linkUrl ?? existing?.link ?? '',
      altText ?? existing?.alt_text ?? 'Reklam',
      isActive !== undefined ? (isActive === 'true' ? 1 : 0) : (existing?.is_active ?? 0)
    ]);

    res.json(rows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
