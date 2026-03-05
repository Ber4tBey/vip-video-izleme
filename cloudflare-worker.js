/**
 * Cloudflare Worker — HLS Video CDN
 *
 * Auth model:
 *   .m3u8 playlists → require valid JWT (access gate, no cache)
 *   .ts  segments   → public, cached 30 days at edge
 *   .jpg / preview.mp4 → public, cached 7 days at edge
 *   /api/*          → bypass cache, forward to origin
 *
 * Deploy:
 *   1. Cloudflare dashboard → Workers & Pages → Create Worker
 *   2. Paste this file's content
 *   3. Set environment variable: JWT_SECRET = (your JWT_SECRET value)
 *   4. Add a route: yourdomain.com/uploads/* → this worker
 */

const CACHE_TTL = {
  ts:  60 * 60 * 24 * 30, // 30 days for .ts segments
  jpg: 60 * 60 * 24 * 7,  // 7 days for thumbnails
  mp4: 60 * 60 * 24 * 7,  // 7 days for preview clips
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
  const url = new URL(request.url);
  const path = url.pathname;

  // ── API routes — always bypass CDN cache ──────────────────────────────
    if (path.startsWith('/api/')) {
      return fetch(request);
    }

    // ── .m3u8 playlist — validate JWT, no cache ───────────────────────────
    if (path.endsWith('.m3u8')) {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token eksik' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const valid = await verifyJwt(token, JWT_SECRET); // JWT_SECRET from environment variables
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Forward to origin — do NOT cache (playlist is the access gate)
      const response = await fetch(request);
      const newRes = new Response(response.body, response);
      newRes.headers.set('Cache-Control', 'no-store, no-cache');
      return newRes;
    }

    // ── .ts segments — public, serve from Cloudflare edge cache ──────────
    if (path.endsWith('.ts')) {
      return serveFromCache(request, event, CACHE_TTL.ts, 'video/MP2T');
    }

    // ── thumbnails and preview clips — public, cached ─────────────────────
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      return serveFromCache(request, event, CACHE_TTL.jpg, 'image/jpeg');
    }
    if (path.endsWith('.mp4')) {
      return serveFromCache(request, event, CACHE_TTL.mp4, 'video/mp4');
    }

    // ── everything else — pass through ────────────────────────────────────
    return fetch(request);
}

// ── Serve from Cloudflare edge cache ────────────────────────────────────────
async function serveFromCache(request, event, ttl, contentType) {
  const cacheKey = new Request(new URL(request.url).pathname, { method: 'GET' });
  const cache = caches.default;

  // Check edge cache first
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // Cache miss — fetch from origin
  response = await fetch(request);
  if (!response.ok) return response;

  // Save to edge cache
  const cachedResponse = new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${ttl}`,
      'Cloudflare-CDN-Cache-Control': `public, max-age=${ttl}`,
    },
  });

  event.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
  return cachedResponse;
}

// ── JWT Validation using Web Crypto API ──────────────────────────────────────
// Supports HS256 signed tokens (same as jsonwebtoken default)
async function verifyJwt(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(signingInput)
    );

    if (!valid) return false;

    // Check expiry
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}
