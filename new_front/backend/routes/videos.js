const router = require('express').Router();
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { adminOnly, optionalAuth, checkVideoToken } = require('../middleware/auth');
const storage = require('../utils/storage');
const queue = require('../utils/queue');

// Multer setup for temporarily storing video chunks
const uploadDir = path.join(__dirname, '../../uploads/temp_chunks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

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

// GET /api/videos (Public / Authenticated List) — paginated
router.get('/', async (req, res) => {
  try {
    const { category, model, vip, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let whereClause = ' WHERE v.is_active = 1 AND v.job_status = \'completed\'';
    const params = [];
    let paramCount = 1;

    if (category) {
      whereClause += ` AND v.category_id = $${paramCount++}`;
      params.push(category);
    }
    if (model) {
      whereClause += ` AND v.model_id = $${paramCount++}`;
      params.push(model);
    }
    if (vip === '1') {
      whereClause += ' AND v.is_vip = 1';
    } else if (vip === '0') {
      whereClause += ' AND v.is_vip = 0';
    }
    if (search) {
      whereClause += ` AND v.title ILIKE $${paramCount++}`;
      params.push(`%${search}%`);
    }

    const baseSql = `
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      LEFT JOIN models m ON v.model_id = m.id
      ${whereClause}
    `;

    // Count
    const countResult = await db.query(`SELECT COUNT(*) as total ${baseSql}`, params);
    const total = parseInt(countResult.rows[0].total);

    // Sort
    const orderBy = req.query.sort === 'views' ? 'v.view_count DESC' : 'v.created_at DESC';

    // Fetch page
    const { rows } = await db.query(
      `SELECT v.*, c.name as category_name, m.name as model_name ${baseSql} ORDER BY ${orderBy} LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      [...params, limit, offset]
    );

    res.json({
      videos: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/videos/all (Admin)
router.get('/all', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, c.name as category_name, m.name as model_name
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      LEFT JOIN models m ON v.model_id = m.id
      ORDER BY v.created_at DESC
    `);
    
    // Send data straight from the database now that QueueEvents keeps it updated
    res.json(rows.map(video => ({
      ...video,
      jobStatus: video.job_status,
      jobProgress: video.job_progress
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const MIN_FREE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

const checkDiskSpace = () => {
  try {
    const output = execSync("df -B1 / | tail -1").toString().trim();
    const parts = output.split(/\s+/);
    return parseInt(parts[3]) || 0;
  } catch { return Infinity; } // fail-open if df unavailable
};

const formatBytes = (bytes) => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
};

// POST /api/videos/upload/chunk
router.post('/upload/chunk', adminOnly, upload.single('chunk'), async (req, res) => {
  try {
    // 10GB guard
    const freeBytes = checkDiskSpace();
    if (freeBytes < MIN_FREE_BYTES) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(507).json({ error: `Yetersiz disk alani! Kalan: ${formatBytes(freeBytes)}. En az 10 GB bos alan gereklidir.` });
    }

    const { uploadId, chunkIndex, totalChunks } = req.body;
    
    if (!req.file || !uploadId || chunkIndex === undefined || !totalChunks) {
      return res.status(400).json({ error: 'Missing chunk data' });
    }

    const chunkDir = path.join(uploadDir, uploadId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
    fs.renameSync(req.file.path, chunkPath);

    res.json({ message: 'Chunk uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/videos/upload/complete
router.post('/upload/complete', adminOnly, async (req, res) => {
  try {
    const { uploadId, totalChunks, filename } = req.body;
    let { title, description, category_id, model_id, is_vip, is_active } = req.body;

    if (!uploadId || !totalChunks || !title) {
      return res.status(400).json({ error: 'Missing complete data or title' });
    }

    const chunkDir = path.join(uploadDir, uploadId);
    const finalFilePath = path.join(uploadDir, `${uploadId}_final.mp4`);
    
    // Asynchronous non-blocking chunk merging
    const writeStream = fs.createWriteStream(finalFilePath);
    
    const mergeChunks = async () => {
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i}`);
        if (!fs.existsSync(chunkPath)) {
          throw new Error(`Missing chunk ${i}`);
        }
        await new Promise((resolve, reject) => {
          const readStream = fs.createReadStream(chunkPath);
          readStream.on('end', () => {
            fs.unlinkSync(chunkPath); // clean up immediately
            resolve();
          });
          readStream.on('error', reject);
          readStream.pipe(writeStream, { end: false }); // keep writeStream open
        });
      }
      writeStream.end();
    };

    await mergeChunks();
    // After asynchronous write completion
    fs.rmdirSync(chunkDir);

    // After writing the file, create DB record
    const { rows } = await db.query(`
      INSERT INTO videos (title, description, category_id, model_id, is_vip, is_active, job_status, job_progress)
      VALUES ($1, $2, $3, $4, $5, $6, 'processing', 0)
      RETURNING *
    `, [
      title, 
      description || null, 
      category_id || null, 
      model_id || null, 
      toDbBoolean(is_vip, 0), 
      toDbBoolean(is_active, 1)
    ]);
    
    const video = rows[0];
    const videoIdStr = video.id.toString();
    const objectName = `${videoIdStr}.mp4`;

    // Upload to MinIO
    await storage.uploadFile('raw-videos', objectName, finalFilePath);
    
    // Clean up temp assembled file
    fs.unlinkSync(finalFilePath);

    // Enqueue
    await queue.addVideoJob({
      videoId: videoIdStr,
      objectName: objectName,
      originalName: filename || objectName
    });

    res.json({ message: 'Upload complete! Video processing started.', video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/videos/:id (admin)
router.put('/:id', adminOnly, upload.none(), async (req, res) => {
  try {
    const existRes = await db.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (existRes.rows.length === 0) return res.status(404).json({ error: 'Bulunamadi' });
    const existing = existRes.rows[0];

    const { title, description, isVIP, isActive, categoryId, modelId } = req.body;

    const { rows } = await db.query(`
      UPDATE videos
      SET title=$1, description=$2, category_id=$3, model_id=$4, is_vip=$5, is_active=$6
      WHERE id=$7 RETURNING *
    `, [
      title || existing.title,
      description ?? existing.description,
      categoryId ?? existing.category_id,
      modelId ?? existing.model_id,
      isVIP !== undefined ? toDbBoolean(isVIP, existing.is_vip) : existing.is_vip,
      isActive !== undefined ? toDbBoolean(isActive, existing.is_active) : existing.is_active,
      req.params.id
    ]);

    res.json(rows[0]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/videos/:id/toggle (admin)
router.patch('/:id/toggle', adminOnly, async (req, res) => {
  try {
    const existRes = await db.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (existRes.rows.length === 0) return res.status(404).json({ error: 'Bulunamadi' });
    const video = existRes.rows[0];

    await db.query('UPDATE videos SET is_active = $1 WHERE id = $2', [video.is_active ? 0 : 1, req.params.id]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/videos/:id (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const existRes = await db.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (existRes.rows.length === 0) return res.status(404).json({ error: 'Bulunamadi' });
    
    // Use old utility script which invokes MinIO delete directly
    await storage.deleteVideo(req.params.id.toString());
    await db.query('DELETE FROM videos WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/view
router.post('/:id/view', async (req, res) => {
  try {
    await db.query('UPDATE videos SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/status/:id
router.get('/status/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    const { rows } = await db.query('SELECT job_status, job_progress FROM videos WHERE id = $1', [videoId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Video Job Not Found / Missing' });
    }

    const { job_status: status, job_progress: progress } = rows[0];
    res.json({ status, progress: progress || 0, videoId });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
