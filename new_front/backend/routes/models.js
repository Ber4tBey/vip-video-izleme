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

const processImageUpload = (file) => {
  if (!file) return null;
  const originalPath = path.join(imagesDir, file.filename);
  const optimizedPath = optimizeImageForDeliverySync(originalPath);
  return imagePathToUrl(optimizedPath);
};

// GET /api/models — paginated + searchable
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = 1';
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND name ILIKE $${paramIdx++}`;
      params.push(`%${search}%`);
    }

    const countResult = await db.query(`SELECT COUNT(*) as total FROM models ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);

    const { rows } = await db.query(
      `SELECT * FROM models ${whereClause} ORDER BY name LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({
      models: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/models (admin)
router.post('/', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Ad zorunlu' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const imageUrl = processImageUpload(req.file);
    const { rows } = await db.query('INSERT INTO models (name, slug, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *', [
      name,
      slug,
      description || null,
      imageUrl
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/models/:id (admin)
router.put('/:id', adminOnly, upload.single('image'), async (req, res) => {
  try {
    const existRes = await db.query('SELECT * FROM models WHERE id = $1', [req.params.id]);
    if (existRes.rows.length === 0) return res.status(404).json({ error: 'Bulunamadi' });
    const existing = existRes.rows[0];

    const { name, description, isActive } = req.body;
    const imageUrl = req.file ? processImageUpload(req.file) : existing.image_url;

    if (req.file && existing.image_url) {
      deleteFileIfExists(toAbsoluteUploadPath(existing.image_url));
    }

    const newName = name || existing.name;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { rows } = await db.query(
      'UPDATE models SET name=$1, slug=$2, description=$3, image_url=$4, is_active=$5 WHERE id=$6 RETURNING *',
      [
        newName,
        slug,
        description ?? existing.description,
        imageUrl,
        isActive !== undefined ? (isActive === 'true' ? 1 : 0) : existing.is_active,
        req.params.id
      ]
    );

    res.json(rows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/models/:id/toggle (admin)
router.patch('/:id/toggle', adminOnly, async (req, res) => {
  try {
    const modelRes = await db.query('SELECT * FROM models WHERE id = $1', [req.params.id]);
    if (modelRes.rows.length === 0) return res.status(404).json({ error: 'Bulunamadi' });
    const model = modelRes.rows[0];

    await db.query('UPDATE models SET is_active = $1 WHERE id = $2', [model.is_active ? 0 : 1, req.params.id]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/models/:id (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const modelRes = await db.query('SELECT * FROM models WHERE id = $1', [req.params.id]);
    if (modelRes.rows.length === 0) return res.status(404).json({ error: 'Bulunamadi' });
    const model = modelRes.rows[0];

    if (model.image_url) deleteFileIfExists(toAbsoluteUploadPath(model.image_url));
    await db.query('DELETE FROM models WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
