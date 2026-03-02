require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { checkVideoToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static uploads with proper cache headers ─────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Images: 7 day cache
app.use('/uploads/images', express.static(path.join(__dirname, 'uploads/images'), {
  maxAge: '7d', etag: true, lastModified: true,
}));

// Videos: range request support + 30 day cache with AUTH CHECK
app.get('/uploads/videos/:file', checkVideoToken, (req, res) => {
  const filePath = path.join(__dirname, 'uploads/videos', req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Video bulunamadı' });
  
  // URL to match DB
  const requestedUrl = `/uploads/videos/${req.params.file}`;
  const videoRow = db.prepare('SELECT * FROM videos WHERE url = ?').get(requestedUrl);
  
  // If video is VIP and user is not VIP/Admin
  if (videoRow && videoRow.is_vip) {
    if (!req.user || (!req.user.isVIP && !req.user.isAdmin)) {
      return res.status(403).json({ error: 'Bu VIP videoyu izlemek için yetkiniz yok.' });
    }
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
  res.setHeader('Content-Type', 'video/mp4');

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 5 * 1024 * 1024, total - 1);
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': total });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/videos',     require('./routes/videos'));
app.use('/api/models',     require('./routes/models'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/ads',        require('./routes/ads'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Endpoint bulunamadı' }));

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor → http://localhost:${PORT}`);
});
