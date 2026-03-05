# Video Streaming Platform Architecture

Bu proje, ölçeklenebilir ve production-ready bir video upload ve HLS streaming platformudur.

## Mimari Akış (Upload -> Encode -> Stream)

1. **Upload API (Node.js/Express)**:
   - Kullanıcı frontend üzerinden videoyu yükler.
   - API, `multer` kullanarak geçici olarak diskte tutar.
   - Dosya MinIO üzerindeki `raw-videos` bucket'ına (S3 uyumlu Object Storage) aktarılır.
   - Dosya yüklendikten sonra, Redis queue (BullMQ) üzerine `encode` job'ı bırakılır ve silinir.

2. **FFmpeg Worker (Node.js/BullMQ/FFmpeg)**:
   - Worker sürekli Redis kuyruğunu dinler.
   - Yeni bir video job'ı geldiğinde MinIO `raw-videos` bucket'ından kaynak videoyu çeker.
   - `fluent-ffmpeg` kullanarak videoyu HLS (HTTP Live Streaming) formatında 3 farklı kaliteye ayarlar (1080p, 720p, 480p).
   - Çıktı olarak oluşan `.m3u8` master/stream playlistleri ve `.ts` segment dosyaları MinIO içindeki `hls-videos` (Public) bucket'ına upload edilir.

3. **Nginx Streaming Server**:
   - Nginx server'ımız MinIO'nun `hls-videos` dosyalarına Reverse Proxy görevi görür.
   - Aynı zamanda Nginx üzerinde In-Memory / Disk-Caching uygulanarak (`proxy_cache`), her video segment i isteğinde doğrudan MinIO'ya yük bindirmez, kendi önbelleğinden sunar.
   - Frontend oynatıcısı (HLS.js) için gerekli olan CORS header'larını ayarlar.
   - Bir Cloudflare CDN veya benzeri bir CDN arkasında ise edge cache olarak yapılandırılabilir. (Cloudflare kullanıldığı takdirde Nginx Header verileri optimize edilerek "Cache-Control" header'ları eklenmiştir).

4. **Frontend HLS.js Player**:
   - Basit bir statik HTML sayfası üzerinden `hls.js` ile Nginx'e (Port 80) istek atılır. M3U8 dosyasını stream eder.
   - Otomatik veya manuel kalite seçme (1080p, 720p vb.) özellikleri eklenmiştir.

## Production İçin Önerilen Optimizasyonlar

Eğer sistemi gerçek production (Canlı) ortama taşıyacaksanız şu optimizasyonları yapmanız şiddetle tavsiye edilir:

1. **Storage (MinIO) Dağıtımı**:
   - Tek makine (Single-Node) yerine, Disk sayısı fazla ve yatayda büyüyen bir MinIO Cluster yapısı kurun.

2. **CDN (Cloudflare vb.)**:
   - `Nginx` şu an önbellek (cache) olarak çalışıyor. Önüne **Cloudflare Proxy** açarsanız, dünyanın her yerindeki Edge Sunucularında videolarınız cache'lenir, bu sayede sunucunuza gelen trafik %90 oranında azalır.
   - Nginx üzerinde Cache-Control Headers kalıcı olarak ayarlanmalı (örn. statik `.ts` segmentleri için `max-age=31536000`).

3. **FFmpeg Optimizasyonları (GPU / Donanım Hızlandırma)**:
   - Şu an CPU üzerinden render alınıyor (`libx264`). Sunucuda ekran kartı (NVIDIA vs) varsa FFmpeg argümanlarındaki `libx264` yerine donanım hızlandırma (`h264_nvenc` vb.) eklenebilir. Böylece çok daha hızlı ve az CPU yorularak encode sağlanır.

4. **Docker Swarm / Kubernetes**:
   - Sisteme yük bindiğinde `Worker` servisinin sayısını (`replicas: 5` vb.) artırarak kuyruktaki encode sürelerini çok hızlıca düşürebilirsiniz.
   - API ve Frontend de AutoScaling yapılarına dahil edilebilir.

5. **Güvenlik (Authentication/DRM)**:
   - M3U8 linkleri şu an herkese açık. Video hırsızlığını engellemek için JWT token mimarisi Nginx tarafında "Secure Link Module" ile entegre edilebilir veya AES-128 HLS şifreleme yapılabilir.

---
**Nasıl Çalıştırılır?**

```bash
# Servisleri başlatın (Kurduğumuz klasörde terminal açarak)
docker-compose up -d --build
```
    
**Servis Adresleri:**
- **Frontend**: `http://localhost:8080/` (Video Yükleme && Oynatma Arayüzü)
- **API**: `http://localhost:3000/`
- **Nginx Streaming**: `http://localhost/hls/...`
- **MinIO Console**: `http://localhost:9001/` (K.adı: admin / Şifre: admin123)
