import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080; // Genellikle HTTP izinli port 8080
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// 1. Backend Proxy (API ve Uploads için)
// /api yoluna gelen istekleri backend apiye pasla
app.use('/api', createProxyMiddleware({ 
  target: BACKEND_URL, 
  changeOrigin: true 
}));

// /uploads yoluna gelen istekleri backend uploads (video) icin pasla
app.use('/uploads', createProxyMiddleware({ 
  target: BACKEND_URL, 
  changeOrigin: true 
}));

// 2. Statik Frontend Dosyalari (React/Vite Production Build)
// dist klasorunu ana kok dizin olarak sun
app.use(express.static(path.join(__dirname, 'dist')));

// 3. React SPA Fallback
// Frontende ait bir sayfa yenilendiginde veya dogrudan girildiginde index.html'ye yonlendir.
app.get('*splat', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// Sunucuyu baslat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Web server baslatildi: http://localhost:${PORT}`);
  console.log(`[Proxy] Yonlendirilen Backend API: ${BACKEND_URL}`);
});
