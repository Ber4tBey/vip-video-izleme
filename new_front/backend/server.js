require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
const { normalizeStreamtapeUrl, resolveStreamtapeThumbnail } = require('./utils/streamtape');
const storage = require('./utils/storage');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Quick local multer for passing off to MinIO
const upload = multer({ dest: path.join(__dirname, 'tmp-uploads') });

const app = express();
const PORT = process.env.PORT || 3001;
const VIDEO_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

ensureMediaDirs();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const staticCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=2592000, immutable');
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

app.post('/api/assets/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  try {
    const ext = path.extname(req.file.originalname) || '.png';
    const objectName = `${uuidv4()}${ext}`;
    const filePath = req.file.path;

    await storage.uploadFile('assets', objectName, filePath);
    fs.unlinkSync(filePath);

    const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const minioPort = process.env.MINIO_PORT || '9000';
    const publicUrl = `http://${minioEndpoint}:${minioPort}/assets/${objectName}`;

    res.json({
      success: true,
      url: publicUrl,
      objectName: objectName
    });
  } catch (error) {
    console.error('Asset Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Secure Proxy for HLS Video Playback from MinIO
app.get('/uploads/videos/*', async (req, res) => {
  const objectName = req.params[0];
  if (!objectName) {
    return res.status(400).json({ error: 'Dosya belirtilmedi' });
  }

  // Asset type classification
  const isM3u8 = objectName.endsWith('.m3u8');
  const isTs   = objectName.endsWith('.ts');
  const isJpg  = objectName.endsWith('.jpg');
  const isMp4  = objectName.endsWith('.mp4');

  // Removed JWT verification: All .m3u8 playlists and .ts segments are now Public

  try {
    const dataStream = await storage.minioClient.getObject('hls-videos', objectName);

    if (isM3u8) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      // Now allowing playlists to be cached since token verification is removed
      res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=2592000, immutable');
      let playlist = '';
      dataStream.on('data', chunk => playlist += chunk.toString('utf8'));
      dataStream.on('end', () => {
        res.send(playlist);
      });
      dataStream.on('error', (err) => {
        console.error('MinIO Playlist Read Error:', err);
        if (!res.headersSent) res.status(500).end();
      });
      return;
    } else if (isTs) {
      res.setHeader('Content-Type', 'video/MP2T');
      res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=2592000, immutable');
    } else if (isJpg) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=2592000, immutable');
    } else if (isMp4) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=2592000, immutable');
    }

    dataStream.pipe(res);
  } catch (err) {
    if (err.code === 'NoSuchKey') {
      return res.status(404).json({ error: 'Video bulunamadi' });
    }
    console.error('MinIO Proxy Error:', err);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});
// ─── Bot Prerender: serves HTML with correct meta tags for crawlers ───
const trMapSrv = { ç:'c',Ç:'C',ğ:'g',Ğ:'G',ı:'i',İ:'I',ö:'o',Ö:'O',ş:'s',Ş:'S',ü:'u',Ü:'U' };
const slugifySrv = (t='') => t.split('').map(c=>trMapSrv[c]||c).join('').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

const prerenderHtml = (meta) => {
  const siteUrl = 'https://onlymix.tube';
  const title = meta.title || 'OnlyMix — Türk İfşa, Porno ve Sex Videoları İzle';
  const desc = meta.description || 'En yeni türk ifşa, porno, sikiş ve sex videolarını full HD kalitede izle.';
  const image = meta.image || `${siteUrl}/android-chrome-192x192.png`;
  const url = meta.url || siteUrl;
  const type = meta.type || 'website';
  const jsonLd = meta.jsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>` : '';

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<meta name="keywords" content="türk ifşa, porno, sex, sikiş, türkçe porno, yerli porno, ifşa videoları, türk modeller, hd porno izle"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<meta property="og:type" content="${type}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${image}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:site_name" content="OnlyMix"/>
<meta property="og:locale" content="tr_TR"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${image}"/>
<link rel="canonical" href="${url}"/>
${jsonLd}
</head>
<body><div id="root"></div></body>
</html>`;
};

app.get('/api/prerender/*', async (req, res) => {
  const siteUrl = 'https://onlymix.tube';
  const route = req.params[0] || '';

  try {
    // /video/:slug
    const videoMatch = route.match(/^video\/(.+)$/);
    if (videoMatch) {
      const slug = videoMatch[1];
      const { rows } = await db.query(
        "SELECT v.*, c.name as category_name, m.name as model_name FROM videos v LEFT JOIN categories c ON v.category_id=c.id LEFT JOIN models m ON v.model_id=m.id WHERE v.is_active=1 AND v.job_status='completed'"
      );
      const video = rows.find(v => slugifySrv(v.title) === slug);
      if (video && !video.is_vip) {
        const thumbUrl = video.thumbnail_url ? `${siteUrl}${video.thumbnail_url}` : undefined;
        return res.send(prerenderHtml({
          title: `${video.title} — Türk İfşa Porno İzle`,
          description: video.description || `${video.title} ifşa ve sex videosu full HD izle. ${video.model_name||'Türk porno'}, ${video.category_name||'sikiş videoları'}.`,
          image: thumbUrl,
          url: `${siteUrl}/video/${slug}`,
          type: 'video.other',
          jsonLd: { "@context":"https://schema.org","@type":"VideoObject","name":video.title,"description":video.description||`${video.title} porno videosu`,"thumbnailUrl":thumbUrl,"uploadDate":video.created_at,"interactionStatistic":{"@type":"InteractionCounter","interactionType":"https://schema.org/WatchAction","userInteractionCount":video.view_count||0} }
        }));
      }
    }

    // /models/:slug
    const modelMatch = route.match(/^models\/(.+)$/);
    if (modelMatch) {
      const { rows } = await db.query('SELECT * FROM models WHERE slug=$1 AND is_active=1', [modelMatch[1]]);
      if (rows[0]) {
        const m = rows[0];
        const img = m.image_url ? `${siteUrl}${m.image_url}` : undefined;
        return res.send(prerenderHtml({
          title: `${m.name} İfşa ve Porno Videoları İzle`,
          description: `${m.name} ifşa videoları, en sıcak paylaşımlar ve vip sızıntılar. ${m.name} porno izle.`,
          image: img, url: `${siteUrl}/models/${m.slug}`,
        }));
      }
    }

    // /categories/:slug
    const catMatch = route.match(/^categories\/(.+)$/);
    if (catMatch) {
      const { rows } = await db.query('SELECT * FROM categories WHERE slug=$1 AND is_active=1', [catMatch[1]]);
      if (rows[0]) {
        const c = rows[0];
        const img = c.image_url ? `${siteUrl}${c.image_url}` : undefined;
        return res.send(prerenderHtml({
          title: `${c.name} Videoları — Porno İzle`,
          description: `${c.name} kategorisindeki en iyi pornolar, ifşa ve sex videoları.`,
          image: img, url: `${siteUrl}/categories/${c.slug}`,
        }));
      }
    }

    // Static pages meta
    const staticMeta = {
      '': { title: 'OnlyMix — Türk İfşa, Porno ve Sex Videoları HD İzle', description: 'En yeni türk ifşa, porno, sikiş ve sex videolarını full HD kalitede izle.' },
      'videos': { title: 'Tüm Videolar — Türk İfşa ve VIP Porno İzle', description: 'En yeni türk ifşa, porno ve sikiş videolarını full HD izle.' },
      'models': { title: 'Türk Modeller, İfşa ve Sex Videoları', description: 'Yerli modellerin en iyi ifşa, porno ve sex videoları.' },
      'categories': { title: 'Porno Kategorileri — VIP Sex ve İfşa', description: 'Tüm kategoriler, türk ifşa, hd porno ve sex arşivleri.' },
      'trends': { title: 'Trend Videolar — En Çok İzlenen Porno ve İfşalar', description: 'En çok izlenen vip porno, türk ifşa ve sex videoları.' },
      'buy-vip': { title: 'VIP Üyelik Satın Al — Premium Porno Erişimi', description: 'VIP üyelik ile tüm özel türk ifşa, porno ve sex videolarına sınırsız erişim.' },
    };

    const sm = staticMeta[route] || staticMeta[''];
    res.send(prerenderHtml({ ...sm, url: `${siteUrl}/${route}` }));
  } catch (err) {
    console.error('Prerender error:', err);
    res.send(prerenderHtml({ url: `${siteUrl}/${route}` }));
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Dynamic sitemap.xml
app.get('/api/sitemap.xml', async (req, res) => {
  try {
    const siteUrl = 'https://onlymix.tube';

    // Static pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/videos', priority: '0.9', changefreq: 'daily' },
      { loc: '/models', priority: '0.8', changefreq: 'weekly' },
      { loc: '/categories', priority: '0.8', changefreq: 'weekly' },
      { loc: '/trends', priority: '0.8', changefreq: 'daily' },
      { loc: '/buy-vip', priority: '0.5', changefreq: 'monthly' },
    ];

    // Dynamic: videos (title → slug)
    const videosRes = await db.query(`
      SELECT title, created_at FROM videos 
      WHERE is_active = 1 AND job_status = 'completed' AND is_vip = 0
      ORDER BY created_at DESC
    `);
    const videos = videosRes.rows;

    // Dynamic: models
    const modelsRes = await db.query('SELECT slug, created_at FROM models WHERE is_active = 1');
    const models = modelsRes.rows;
    
    // Dynamic: categories
    const catsRes = await db.query('SELECT slug, created_at FROM categories WHERE is_active = 1');
    const categories = catsRes.rows;

    // Slugify helper (same as frontend)
    const trMap = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' };
    const slugify = (text = '') => text.split('').map(c => trMap[c] || c).join('').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static
    for (const page of staticPages) {
      xml += `  <url><loc>${siteUrl}${page.loc}</loc><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>\n`;
    }

    // Videos
    for (const v of videos) {
      const slug = slugify(v.title);
      const lastmod = v.created_at ? new Date(v.created_at).toISOString().split('T')[0] : '';
      xml += `  <url><loc>${siteUrl}/video/${slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    }

    // Models
    for (const m of models) {
      xml += `  <url><loc>${siteUrl}/models/${m.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }

    // Categories
    for (const c of categories) {
      xml += `  <url><loc>${siteUrl}/categories/${c.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Sitemap error');
  }
});

// GET /api/system/disk — admin only disk space info
const { adminOnly: adminOnlyMw } = require('./middleware/auth');
app.get('/api/system/disk', adminOnlyMw, (req, res) => {
  try {
    // /hostfs is bind-mounted from host root to read real disk info
    const target = require('fs').existsSync('/hostfs') ? '/hostfs' : '/';
    const output = execSync(`df -B1 ${target} | tail -1`).toString().trim();
    const parts = output.split(/\s+/);
    const totalBytes = parseInt(parts[1]) || 0;
    const usedBytes  = parseInt(parts[2]) || 0;
    const freeBytes  = parseInt(parts[3]) || 0;
    const usedPct    = parts[4] || '0%';
    res.json({ totalBytes, usedBytes, freeBytes, usedPct });
  } catch (err) {
    res.status(500).json({ error: 'Disk bilgisi alinamadi' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint bulunamadi' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatasi' });
});

const backfillMissingThumbnails = async () => {
  const rows = db.prepare(`
    SELECT id, url, thumbnail_url, streamtape_url
    FROM videos
    WHERE thumbnail_url IS NULL OR thumbnail_url = ''
  `).all();

  if (!rows.length) return;

  let updated = 0;
  for (const row of rows) {
    const streamtapeSource = normalizeStreamtapeUrl(row.streamtape_url || row.url);
    if (streamtapeSource) {
      const remoteThumbnail = await resolveStreamtapeThumbnail(streamtapeSource).catch(() => '');
      if (!remoteThumbnail) continue;
      db.prepare('UPDATE videos SET thumbnail_url = ?, streamtape_url = ? WHERE id = ?')
        .run(remoteThumbnail, streamtapeSource, row.id);
      updated += 1;
      continue;
    }

    const fileName = path.basename(row.url || '');
    if (!fileName) continue;

    const videoPath = path.join(videosDir, fileName);
    if (!fs.existsSync(videoPath)) continue;

    const thumbnailPath = path.join(thumbnailsDir, getThumbnailFileName(fileName));
    if (!fs.existsSync(thumbnailPath)) {
      const generated = generateVideoThumbnailSync(videoPath, thumbnailPath);
      if (!generated) continue;
    }

    const thumbnailUrl = getThumbnailUrl(fileName);
    db.prepare('UPDATE videos SET thumbnail_url = ? WHERE id = ?').run(thumbnailUrl, row.id);
    updated += 1;
  }

  if (updated > 0) {
    console.log(`[Media] Generated thumbnails for ${updated} existing video(s).`);
  }
};

app.listen(PORT, async () => {
  console.log(`Backend calisiyor: http://localhost:${PORT}`);
  
  try {
    await storage.initializeBuckets();
    console.log('[MinIO] Buckets initialized successfully');
  } catch (err) {
    console.error('[MinIO] Bucket initialization failed:', err.message);
  }
});
