const router = require('express').Router();
const http = require('http');
const https = require('https');
const multer = require('multer');
const db = require('../database');
const { adminOnly, optionalAuth, checkVideoToken } = require('../middleware/auth');
const { toAbsoluteUploadPath, deleteFileIfExists } = require('../utils/media');
const {
  normalizeStreamtapeUrl,
  resolveStreamtapeDirectUrl,
  resolveStreamtapeMetadata,
} = require('../utils/streamtape');

const parseStreamtapeForm = (req, res, next) => {
  multer().none()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Dosya yukleme kapatildi. Sadece Streamtape linki kullanin.' });
    }
    return next();
  });
};

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

const pickBodyValue = (body, ...keys) => {
  for (const key of keys) {
    if (body[key] !== undefined) return body[key];
  }
  return undefined;
};

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isLocalVideoUrl = (value) => typeof value === 'string' && value.startsWith('/uploads/videos/');
const isLocalUploadPath = (value) => typeof value === 'string' && value.startsWith('/uploads/');
const STREAM_REDIRECT_LIMIT = 7;
const STREAM_TIMEOUT_MS = 20000;
const STREAM_HTTP_AGENT = new http.Agent({ keepAlive: true, maxSockets: 250, maxFreeSockets: 50, timeout: 60000 });
const STREAM_HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 250, maxFreeSockets: 50, timeout: 60000 });
const DIRECT_URL_CACHE_MAX = 1500;
const DIRECT_URL_CACHE_DEFAULT_TTL_MS = 120000;
const DIRECT_URL_CACHE_MAX_TTL_MS = 10 * 60 * 1000;
const DIRECT_URL_CACHE_SAFETY_MS = 10000;
const RETRYABLE_UPSTREAM_STATUSES = new Set([401, 403, 404, 410]);
const RETRYABLE_PROXY_ERROR_CODE = 'RETRYABLE_UPSTREAM_STATUS';
const streamtapeDirectUrlCache = new Map();
const streamtapeResolveInFlight = new Map();

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const copyUpstreamHeaders = (sourceHeaders, res) => {
  Object.entries(sourceHeaders || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (HOP_BY_HOP_HEADERS.has(String(key).toLowerCase())) return;
    res.setHeader(key, value);
  });
};

const evictDirectUrlCacheIfNeeded = () => {
  while (streamtapeDirectUrlCache.size > DIRECT_URL_CACHE_MAX) {
    const oldestKey = streamtapeDirectUrlCache.keys().next().value;
    if (!oldestKey) break;
    streamtapeDirectUrlCache.delete(oldestKey);
  }
};

const extractExpiresMs = (url) => {
  try {
    const parsed = new URL(url);
    const rawExpires = parsed.searchParams.get('expires');
    const asNumber = Number(rawExpires);
    if (!Number.isFinite(asNumber) || asNumber <= 0) return 0;
    return asNumber * 1000;
  } catch {
    return 0;
  }
};

const calculateCacheTtlMs = (url) => {
  const now = Date.now();
  const expiresAt = extractExpiresMs(url);

  if (expiresAt > now + DIRECT_URL_CACHE_SAFETY_MS) {
    const remaining = expiresAt - now - DIRECT_URL_CACHE_SAFETY_MS;
    return Math.max(1000, Math.min(remaining, DIRECT_URL_CACHE_MAX_TTL_MS));
  }

  return DIRECT_URL_CACHE_DEFAULT_TTL_MS;
};

const getCachedStreamtapeDirectUrl = (streamtapeSource) => {
  const cached = streamtapeDirectUrlCache.get(streamtapeSource);
  if (!cached) return '';
  if (cached.expiresAt <= Date.now()) {
    streamtapeDirectUrlCache.delete(streamtapeSource);
    return '';
  }
  return cached.url;
};

const setCachedStreamtapeDirectUrl = (streamtapeSource, directUrl, resolvedAt = Date.now()) => {
  const existing = streamtapeDirectUrlCache.get(streamtapeSource);
  if (existing?.resolvedAt && existing.resolvedAt > resolvedAt) return;

  const ttlMs = calculateCacheTtlMs(directUrl);
  const expiresAt = Date.now() + ttlMs;
  streamtapeDirectUrlCache.set(streamtapeSource, { url: directUrl, expiresAt, resolvedAt });
  evictDirectUrlCacheIfNeeded();
};

const clearCachedStreamtapeDirectUrl = (streamtapeSource) => {
  streamtapeDirectUrlCache.delete(streamtapeSource);
};

const resolveDirectUrlWithCache = async (streamtapeSource, { forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = getCachedStreamtapeDirectUrl(streamtapeSource);
    if (cached) return cached;

    const inFlight = streamtapeResolveInFlight.get(streamtapeSource);
    if (inFlight) return await inFlight;
  }

  const resolveStartedAt = Date.now();
  const resolvePromise = (async () => {
    const resolved = await resolveStreamtapeDirectUrl(streamtapeSource);
    if (resolved) setCachedStreamtapeDirectUrl(streamtapeSource, resolved, resolveStartedAt);
    return resolved;
  })();

  streamtapeResolveInFlight.set(streamtapeSource, resolvePromise);
  try {
    return await resolvePromise;
  } finally {
    if (streamtapeResolveInFlight.get(streamtapeSource) === resolvePromise) {
      streamtapeResolveInFlight.delete(streamtapeSource);
    }
  }
};

const proxyStreamFromUrl = (req, res, targetUrl, streamtapeSource, redirectCount = 0) =>
  new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      reject(new Error('Gecersiz stream URL'));
      return;
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const headers = {
      'User-Agent':
        req.headers['user-agent'] ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
      Referer: streamtapeSource,
      Accept: req.headers.accept || '*/*',
      'Accept-Encoding': 'identity',
      Connection: 'keep-alive',
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const upstreamReq = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: req.method,
        agent: parsed.protocol === 'http:' ? STREAM_HTTP_AGENT : STREAM_HTTPS_AGENT,
        headers,
      },
      (upstreamRes) => {
        const status = upstreamRes.statusCode || 0;
        const location = upstreamRes.headers.location;

        if (status >= 300 && status < 400 && location) {
          if (redirectCount >= STREAM_REDIRECT_LIMIT) {
            upstreamRes.resume();
            reject(new Error('Cok fazla stream yonlendirmesi'));
            return;
          }

          const nextUrl = new URL(location, parsed).toString();
          upstreamRes.resume();
          resolve(proxyStreamFromUrl(req, res, nextUrl, streamtapeSource, redirectCount + 1));
          return;
        }

        if (RETRYABLE_UPSTREAM_STATUSES.has(status)) {
          upstreamRes.resume();
          const retryableError = new Error(`Upstream stream HTTP ${status}`);
          retryableError.code = RETRYABLE_PROXY_ERROR_CODE;
          retryableError.status = status;
          reject(retryableError);
          return;
        }

        res.status(status || 502);
        copyUpstreamHeaders(upstreamRes.headers, res);

        if (req.method === 'HEAD') {
          upstreamRes.resume();
          res.end();
          resolve();
          return;
        }

        upstreamRes.on('error', reject);
        upstreamRes.pipe(res);
        upstreamRes.on('end', resolve);
      }
    );

    upstreamReq.on('error', reject);
    upstreamReq.setTimeout(STREAM_TIMEOUT_MS, () => upstreamReq.destroy(new Error('Upstream stream timeout')));
    upstreamReq.end();
  });

const resolveStreamtapeDataSafely = async (streamtapeUrl) => {
  try {
    return await resolveStreamtapeMetadata(streamtapeUrl);
  } catch {
    return null;
  }
};

const createVideoRecord = ({
  title,
  description,
  categoryId,
  modelId,
  isVIP,
  isActive,
  streamtapeUrl,
  thumbnailUrl,
}) => {
  const result = db.prepare(`
    INSERT INTO videos (title, description, url, thumbnail_url, streamtape_url, category_id, model_id, is_vip, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    streamtapeUrl,
    thumbnailUrl || null,
    streamtapeUrl,
    categoryId || null,
    modelId || null,
    toDbBoolean(isVIP, 0),
    toDbBoolean(isActive, 1)
  );

  return db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
};

// GET /api/videos
router.get('/', (req, res) => {
  const { category, model, vip, search } = req.query;
  let sql = `
    SELECT v.*, c.name as category_name, m.name as model_name
    FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    LEFT JOIN models m ON v.model_id = m.id
    WHERE v.is_active = 1
  `;

  const params = [];
  if (category) {
    sql += ' AND v.category_id = ?';
    params.push(category);
  }
  if (model) {
    sql += ' AND v.model_id = ?';
    params.push(model);
  }
  if (vip === '1') {
    sql += ' AND v.is_vip = 1';
  }
  if (search) {
    sql += ' AND v.title LIKE ?';
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY v.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/videos/all (admin)
router.get('/all', adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, c.name as category_name, m.name as model_name
    FROM videos v
    LEFT JOIN categories c ON v.category_id = c.id
    LEFT JOIN models m ON v.model_id = m.id
    ORDER BY v.created_at DESC
  `).all();
  res.json(rows);
});

// Upload endpoints are disabled by request: Streamtape only.
router.post('/upload/chunk', adminOnly, (req, res) => {
  res.status(410).json({ error: 'Video dosyasi yukleme kapatildi. Sadece Streamtape linki kullanin.' });
});

router.post('/upload/complete', adminOnly, (req, res) => {
  res.status(410).json({ error: 'Video dosyasi yukleme kapatildi. Sadece Streamtape linki kullanin.' });
});

// POST /api/videos (admin, streamtape-only)
router.post('/', adminOnly, parseStreamtapeForm, async (req, res) => {
  const { title, description, isVIP, isActive } = req.body;
  const categoryId = pickBodyValue(req.body, 'categoryId', 'category_id', 'category');
  const modelId = pickBodyValue(req.body, 'modelId', 'model_id', 'model');
  const streamtapeInput = normalizeOptionalText(pickBodyValue(req.body, 'streamtapeUrl', 'streamtape_url'));
  const streamtapeUrl = normalizeStreamtapeUrl(streamtapeInput);

  if (!title) return res.status(400).json({ error: 'Baslik zorunlu' });
  if (!streamtapeUrl) return res.status(400).json({ error: 'Gecerli Streamtape linki zorunlu' });

  const metadata = await resolveStreamtapeDataSafely(streamtapeUrl);
  const thumbnailUrl =
    normalizeOptionalText(pickBodyValue(req.body, 'thumbnailUrl', 'thumbnail_url')) ||
    metadata?.thumbnailUrl ||
    null;

  const video = createVideoRecord({
    title,
    description,
    categoryId,
    modelId,
    isVIP,
    isActive,
    streamtapeUrl,
    thumbnailUrl,
  });

  res.status(201).json(video);
});

// PUT /api/videos/:id (admin, streamtape-only)
router.put('/:id', adminOnly, parseStreamtapeForm, async (req, res) => {
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Video bulunamadi' });
  const existingStreamtapeSource = normalizeStreamtapeUrl(existing.streamtape_url || existing.url);

  const { title, description, isVIP, isActive } = req.body;
  const categoryId = pickBodyValue(req.body, 'categoryId', 'category_id', 'category');
  const modelId = pickBodyValue(req.body, 'modelId', 'model_id', 'model');

  const hasStreamtapeInput = pickBodyValue(req.body, 'streamtapeUrl', 'streamtape_url') !== undefined;
  const streamtapeInput = normalizeOptionalText(pickBodyValue(req.body, 'streamtapeUrl', 'streamtape_url') || '');

  let streamtapeUrl = normalizeStreamtapeUrl(existing.streamtape_url || existing.url);
  let thumbnailUrl = existing.thumbnail_url || null;

  if (!streamtapeUrl && !hasStreamtapeInput) {
    return res.status(400).json({ error: 'Bu kayit local video. Streamtape linki girmeniz gerekli.' });
  }

  if (hasStreamtapeInput) {
    if (!streamtapeInput) {
      return res.status(400).json({ error: 'Streamtape linki bos olamaz' });
    }

    const normalizedStreamtapeUrl = normalizeStreamtapeUrl(streamtapeInput);
    if (!normalizedStreamtapeUrl) {
      return res.status(400).json({ error: 'Gecersiz Streamtape linki' });
    }

    if (isLocalVideoUrl(existing.url)) deleteFileIfExists(toAbsoluteUploadPath(existing.url));
    if (isLocalUploadPath(existing.thumbnail_url)) deleteFileIfExists(toAbsoluteUploadPath(existing.thumbnail_url));

    streamtapeUrl = normalizedStreamtapeUrl;
    const metadata = await resolveStreamtapeDataSafely(streamtapeUrl);
    thumbnailUrl = metadata?.thumbnailUrl || thumbnailUrl;
  }

  db.prepare(`
    UPDATE videos
    SET title=?, description=?, url=?, thumbnail_url=?, streamtape_url=?, category_id=?, model_id=?, is_vip=?, is_active=?
    WHERE id=?
  `).run(
    title || existing.title,
    description ?? existing.description,
    streamtapeUrl,
    thumbnailUrl,
    streamtapeUrl,
    categoryId ?? existing.category_id,
    modelId ?? existing.model_id,
    isVIP !== undefined ? toDbBoolean(isVIP, existing.is_vip) : existing.is_vip,
    isActive !== undefined ? toDbBoolean(isActive, existing.is_active) : existing.is_active,
    req.params.id
  );

  if (existingStreamtapeSource && existingStreamtapeSource !== streamtapeUrl) {
    clearCachedStreamtapeDirectUrl(existingStreamtapeSource);
  }
  clearCachedStreamtapeDirectUrl(streamtapeUrl);

  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id));
});

// GET/HEAD /api/videos/:id/stream
// Proxies Streamtape bytes through backend so client IP differences do not break playback.
const streamFromStreamtape = async (req, res) => {
  const video = db.prepare(`
    SELECT id, url, streamtape_url, is_vip, is_active
    FROM videos
    WHERE id = ?
  `).get(req.params.id);

  if (!video || !video.is_active) {
    return res.status(404).json({ error: 'Video bulunamadi' });
  }

  if (video.is_vip) {
    if (!req.user || (!req.user.isVIP && !req.user.isAdmin)) {
      return res.status(403).json({ error: 'Bu VIP videoyu izlemek icin yetkiniz yok.' });
    }
  }

  const streamtapeSource = normalizeStreamtapeUrl(video.streamtape_url || video.url);
  if (!streamtapeSource) {
    return res.status(400).json({ error: 'Bu video icin Streamtape linki bulunamadi' });
  }

  try {
    const directUrl = await resolveDirectUrlWithCache(streamtapeSource);
    await proxyStreamFromUrl(req, res, directUrl, streamtapeSource);
    return undefined;
  } catch (err) {
    if (!res.headersSent && err?.code === RETRYABLE_PROXY_ERROR_CODE) {
      try {
        clearCachedStreamtapeDirectUrl(streamtapeSource);
        const freshDirectUrl = await resolveDirectUrlWithCache(streamtapeSource, { forceRefresh: true });
        await proxyStreamFromUrl(req, res, freshDirectUrl, streamtapeSource);
        return undefined;
      } catch (retryErr) {
        if (!res.headersSent) {
          return res.status(502).json({ error: retryErr.message || 'Stream proxy hatasi' });
        }
        res.destroy();
        return undefined;
      }
    }

    if (!res.headersSent) {
      return res.status(502).json({ error: err.message || 'Stream proxy hatasi' });
    }
    res.destroy();
    return undefined;
  }
};

router.head('/:id/stream', checkVideoToken, streamFromStreamtape);
router.get('/:id/stream', checkVideoToken, streamFromStreamtape);

// GET /api/videos/:id/playback
router.get('/:id/playback', optionalAuth, async (req, res) => {
  const video = db.prepare(`
    SELECT id, url, streamtape_url, is_vip, is_active
    FROM videos
    WHERE id = ?
  `).get(req.params.id);

  if (!video || !video.is_active) {
    return res.status(404).json({ error: 'Video bulunamadi' });
  }

  if (video.is_vip) {
    if (!req.user || (!req.user.isVIP && !req.user.isAdmin)) {
      return res.status(403).json({ error: 'Bu VIP videoyu izlemek icin yetkiniz yok.' });
    }
  }

  const streamtapeSource = normalizeStreamtapeUrl(video.streamtape_url || video.url);
  if (!streamtapeSource) {
    return res.status(400).json({ error: 'Bu video icin Streamtape linki bulunamadi' });
  }

  try {
    const refreshedUrl = await resolveDirectUrlWithCache(streamtapeSource);
    return res.json({
      url: refreshedUrl,
      source: 'streamtape',
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Streamtape linki yenilenemedi' });
  }
});

// PATCH /api/videos/:id/toggle (admin)
router.patch('/:id/toggle', adminOnly, (req, res) => {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Bulunamadi' });

  db.prepare('UPDATE videos SET is_active = ? WHERE id = ?').run(video.is_active ? 0 : 1, req.params.id);
  res.json({ success: true });
});

// DELETE /api/videos/:id (admin)
router.delete('/:id', adminOnly, (req, res) => {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Bulunamadi' });
  const streamtapeSource = normalizeStreamtapeUrl(video.streamtape_url || video.url);

  if (isLocalVideoUrl(video.url)) deleteFileIfExists(toAbsoluteUploadPath(video.url));
  if (isLocalUploadPath(video.thumbnail_url)) deleteFileIfExists(toAbsoluteUploadPath(video.thumbnail_url));
  if (streamtapeSource) clearCachedStreamtapeDirectUrl(streamtapeSource);

  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/videos/:id/view
router.post('/:id/view', (req, res) => {
  db.prepare('UPDATE videos SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
