import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const distDir = path.join(__dirname, 'dist');

const createApiProxy = (prefix) => createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: (incomingPath) => `${prefix}${incomingPath}`,
});

app.use('/api', createApiProxy('/api'));
app.use('/uploads', createApiProxy('/uploads'));

app.use(express.static(distDir, {
  index: false,
  etag: true,
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get('*splat', (req, res) => {
  res.sendFile(path.resolve(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Web server started: http://localhost:${PORT}`);
  console.log(`[Proxy] Backend target: ${BACKEND_URL}`);
});
