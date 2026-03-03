require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { checkVideoToken } = require('./middleware/auth');
const {
  imagesDir,
  videosDir,
  thumbnailsDir,
  ensureMediaDirs,
  getThumbnailFileName,
  getThumbnailUrl,
  generateVideoThumbnailSync,
  getVideoMimeType,
} = require('./utils/media');

const app = express();
const PORT = process.env.PORT || 3001;
const VIDEO_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

ensureMediaDirs();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const staticCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
};

app.use('/uploads/images', express.static(imagesDir, {
  maxAge: '30d',
  etag: true,
  lastModified: true,
  setHeaders: staticCacheHeaders,
}));

app.use('/uploads/thumbnails', express.static(thumbnailsDir, {
  maxAge: '30d',
  etag: true,
  lastModified: true,
  setHeaders: staticCacheHeaders,
}));

const streamVideo = (req, res) => {
  const fileName = path.basename(req.params.file || '');
  if (!fileName || fileName !== req.params.file) {
    return res.status(400).json({ error: 'Gecersiz dosya adi' });
  }

  const filePath = path.join(videosDir, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video bulunamadi' });
  }

  const requestedUrl = `/uploads/videos/${fileName}`;
  const videoRow = db.prepare('SELECT is_vip FROM videos WHERE url = ?').get(requestedUrl);
  if (videoRow?.is_vip) {
    if (!req.user || (!req.user.isVIP && !req.user.isAdmin)) {
      return res.status(403).json({ error: 'Bu VIP videoyu izlemek icin yetkiniz yok.' });
    }
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
  res.setHeader('Content-Type', getVideoMimeType(filePath));

  const range = req.headers.range;
  if (range) {
    const matches = /^bytes=(\d*)-(\d*)$/i.exec(range);
    if (!matches) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }

    let start = matches[1] ? Number.parseInt(matches[1], 10) : 0;
    let end = matches[2]
      ? Number.parseInt(matches[2], 10)
      : Math.min(start + VIDEO_CHUNK_SIZE - 1, total - 1);

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || start >= total) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }

    end = Math.min(end, total - 1);
    const contentLength = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', contentLength);

    if (req.method === 'HEAD') return res.end();

    const stream = fs.createReadStream(filePath, { start, end, highWaterMark: 1024 * 1024 });
    stream.on('error', () => res.destroy());
    return stream.pipe(res);
  }

  res.setHeader('Content-Length', total);
  if (req.method === 'HEAD') return res.end();

  const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
  stream.on('error', () => res.destroy());
  return stream.pipe(res);
};

app.head('/uploads/videos/:file', checkVideoToken, streamVideo);
app.get('/uploads/videos/:file', checkVideoToken, streamVideo);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/models', require('./routes/models'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ads', require('./routes/ads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Endpoint bulunamadi' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatasi' });
});

const backfillMissingThumbnails = () => {
  const rows = db.prepare(`
    SELECT id, url, thumbnail_url
    FROM videos
    WHERE thumbnail_url IS NULL OR thumbnail_url = ''
  `).all();

  if (!rows.length) return;

  let updated = 0;
  rows.forEach((row) => {
    const fileName = path.basename(row.url || '');
    if (!fileName) return;

    const videoPath = path.join(videosDir, fileName);
    if (!fs.existsSync(videoPath)) return;

    const thumbnailPath = path.join(thumbnailsDir, getThumbnailFileName(fileName));
    if (!fs.existsSync(thumbnailPath)) {
      const generated = generateVideoThumbnailSync(videoPath, thumbnailPath);
      if (!generated) return;
    }

    const thumbnailUrl = getThumbnailUrl(fileName);
    db.prepare('UPDATE videos SET thumbnail_url = ? WHERE id = ?').run(thumbnailUrl, row.id);
    updated += 1;
  });

  if (updated > 0) {
    console.log(`[Media] Generated thumbnails for ${updated} existing video(s).`);
  }
};

app.listen(PORT, () => {
  console.log(`Backend calisiyor: http://localhost:${PORT}`);
  setTimeout(backfillMissingThumbnails, 250);
});
