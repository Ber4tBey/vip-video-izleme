const http = require('http');
const https = require('https');

const REQUEST_TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const HTTP_AGENT = new http.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 20, timeout: 60000 });
const HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 20, timeout: 60000 });

const STREAMTAPE_HOSTS = new Set(['streamtape.com', 'streamta.pe']);

const isAllowedHost = (hostname = '') => {
  const lower = hostname.toLowerCase();
  if (STREAMTAPE_HOSTS.has(lower)) return true;
  for (const host of STREAMTAPE_HOSTS) {
    if (lower.endsWith(`.${host}`)) return true;
  }
  return false;
};

const normalizeStreamtapeUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string') return '';
  const input = rawUrl.trim();
  if (!input) return '';

  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return '';
  }

  if (!isAllowedHost(parsed.hostname)) return '';

  parsed.protocol = 'https:';
  parsed.hash = '';
  return parsed.toString();
};

const fetchHtml = (targetUrl, redirectCount = 0) =>
  new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      reject(new Error('Gecersiz URL'));
      return;
    }

    if (!isAllowedHost(parsed.hostname)) {
      reject(new Error('Gecersiz Streamtape hostu'));
      return;
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        agent: parsed.protocol === 'http:' ? HTTP_AGENT : HTTPS_AGENT,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'Accept-Encoding': 'identity',
          Connection: 'keep-alive',
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error('Cok fazla yonlendirme'));
            return;
          }
          const nextUrl = new URL(location, parsed).toString();
          resolve(fetchHtml(nextUrl, redirectCount + 1));
          return;
        }

        if (status < 200 || status >= 300) {
          reject(new Error(`Streamtape HTTP hatasi: ${status}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('Streamtape istegi zaman asimina ugradi'));
    });
    req.end();
  });

const decodeHtmlEntities = (value = '') =>
  value
    .replace(/&amp;/gi, '&')
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/gi, '/');

const getOgMeta = (html = '', key = '') => {
  if (!html || !key) return '';

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const afterNamePattern = new RegExp(
    `<meta[^>]*?(?:name|property)\\s*=\\s*['"]${escapedKey}['"][^>]*?content\\s*=\\s*['"]([^'"]+)['"][^>]*>`,
    'i'
  );
  const beforeNamePattern = new RegExp(
    `<meta[^>]*?content\\s*=\\s*['"]([^'"]+)['"][^>]*?(?:name|property)\\s*=\\s*['"]${escapedKey}['"][^>]*>`,
    'i'
  );

  const match = html.match(afterNamePattern) || html.match(beforeNamePattern);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : '';
};

const parseDirectUrlParts = (html = '') => {
  const tokenMatch =
    html.match(/document\.getElementById.*\('norobotlink'\)\.innerHTML =.*?token=(.*?)'.*?;/is) ||
    html.match(
      /document\.getElementById\s*\(\s*['"]norobotlink['"]\s*\)\.innerHTML\s*=\s*.*?token=([^'"]+)['"].*?;/is
    );
  const infixMatch =
    html.match(/<div id="ideoooolink" style="display:none;">(.*?token=).*?<[/]div>/is) ||
    html.match(/<div[^>]*id=['"]ideoooolink['"][^>]*>(.*?token=).*?<\/div>/is);

  if (!tokenMatch || !infixMatch) {
    throw new Error('Streamtape oynatma linki cozulmedi');
  }

  return {
    token: tokenMatch[1],
    infix: infixMatch[1],
  };
};

const buildDirectUrl = ({ infix, token }) => {
  const combined = `${decodeHtmlEntities(infix)}${decodeHtmlEntities(token)}`.trim();
  if (!combined) throw new Error('Bos stream linki');

  if (/^https?:\/\//i.test(combined)) {
    return combined.replace(/^http:/i, 'https:');
  }

  // test.py equivalent: PREFIX='https:/' + infix + token
  const pythonStyleUrl = `https:/${combined}`;
  try {
    return new URL(pythonStyleUrl).toString();
  } catch {
    if (combined.startsWith('//')) return `https:${combined}`;
    if (combined.startsWith('/')) return `https://${combined.replace(/^\/+/, '')}`;
    return `https://${combined.replace(/^\/+/, '')}`;
  }
};

const resolveStreamtapeMetadata = async (streamtapeUrl) => {
  const normalized = normalizeStreamtapeUrl(streamtapeUrl);
  if (!normalized) throw new Error('Gecersiz Streamtape linki');

  const html = await fetchHtml(normalized);
  const { token, infix } = parseDirectUrlParts(html);

  return {
    normalizedUrl: normalized,
    directUrl: buildDirectUrl({ infix, token }),
    title: getOgMeta(html, 'og:title'),
    thumbnailUrl: getOgMeta(html, 'og:image'),
  };
};

const resolveStreamtapeDirectUrl = async (streamtapeUrl) => {
  const data = await resolveStreamtapeMetadata(streamtapeUrl);
  return data.directUrl;
};

const resolveStreamtapeThumbnail = async (streamtapeUrl) => {
  const data = await resolveStreamtapeMetadata(streamtapeUrl);
  return data.thumbnailUrl || '';
};

module.exports = {
  normalizeStreamtapeUrl,
  resolveStreamtapeDirectUrl,
  resolveStreamtapeMetadata,
  resolveStreamtapeThumbnail,
};
