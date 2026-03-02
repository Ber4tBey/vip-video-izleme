# Nginx Windows Konfigürasyonu (nginx-windows.conf)

Aşağıdaki yapılandırmayı, Nginx'i Windows'ta kurduğunuz klasörün altındaki `conf/nginx.conf` dosyasıyla değiştirebilirsiniz. 
Ayrıca `root (html)` dizini için aşağıdaki `C:/Users/berat/Masaüstü/vip_video_izleme/dist` yolunu kullandık. NGINX Windows'ta `/` (ileri eğik çizgi) kabul eder.

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;

    # Gzip sıkıştırma aktif
    gzip  on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache Yolu (Önyükleme Medya) - Windows'ta geçici klasörü baz alalım
    # NGINX'in bu klasörü oluşturabilmesi için yetkili açılması gerekebilir
    proxy_cache_path temp/media_cache levels=1:2 keys_zone=media_cache:10m max_size=5g inactive=30d;

    server {
        listen       80;
        server_name  localhost; # Veya IP / Domain adresiniz

        # ─── 1. Frontend SPA (React Vite) Dosyaları ──────────────────
        # NOT: Burada 'C:/Users/...' gibi tam yol yazarken slash (/) kullanılmalı
        root "C:/Users/berat/Masaüstü/vip_video_izleme/dist";
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }

        # ─── Static assets uzun süreli bellek ──────────────────
        location ~* \.(js|css|woff2|woff|ttf|eot|svg|ico|png|jpg|gif|webp)$ {
            try_files $uri @backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # ─── 2. API Yönlendirmesi (Backend :3001) ──────────────────
        location /api/ {
            proxy_pass         http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            client_max_body_size 2g; # Video yüklemeleri için
        }

        # ─── 3. Resim & Videolar Yönlendirmesi (Backend :3001) ─────
        location /uploads/ {
            proxy_pass         http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header   Host $host;
            proxy_set_header   Range $http_range;
            proxy_set_header   If-Range $http_if_range;

            # Range bypass
            proxy_cache_bypass $http_range;
            proxy_no_cache     $http_range;

            # Nginx proxy cache ayarları
            proxy_cache        media_cache;
            proxy_cache_key    "$scheme$request_method$host$request_uri";
            proxy_cache_valid  200 30d;
            proxy_cache_valid  404 1m;
            add_header         X-Cache-Status $upstream_cache_status;
        }

        # ─── 4. Fallback ───────────────────────────────────────────
        location @backend {
            proxy_pass http://127.0.0.1:3001;
        }

        # Hata sayfaları
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}
```

### Windows Üzerinde Nginx Kurulumu (Kısa Rehber)
1. **[Nginx for Windows](http://nginx.org/en/download.html)** resmi sitesine girip **"Mainline version (Windows zip)"** indirin.
2. Zip'ten dosyaları **`C:\nginx`** adında bir klasöre çıkarın (İçine boşluk girmeyen kısa bir yola atmak iyidir).
3. Yukarıda size verdiğim içeriği kopyalayarak `C:\nginx\conf\nginx.conf` dosyasının içerisine yapıştırın ve kaydedin.
4. Daha önce PM2 ile çalıştırdığımız frontend servisini (`vip-video-frontend` yani 5173 nolu port) durdurun. (Çünkü artık Nginx Frontend serve işlemlerini statik olarak hızlandırılmıs *dist* dizininden kendisi verecek):
   ```cmd
   npx pm2 stop vip-video-frontend
   ```
5. CMD'yi (Yönetici Olarak Çalıştır) açıp Nginx klasörüne gidin:
   ```cmd
   cd C:\nginx
   ```
6. Nginx'i çalıştırın:
   ```cmd
   start nginx
   ```

**(Nginx artık arkaplanda port 80 [http] dinleyecektir. http://localhost veya sunucunuzun IP adresi üzerinden projenize hızlıca erişebilirsiniz.)**

Arka planda Nginx çalışıyor mu kontrol etmek için CMD üzerinden `tasklist /fi "imagename eq nginx.exe"` komutunu kullanabilirsiniz. Kapatmak için de yine `cd C:\nginx` üzerinden `nginx -s stop` yazmanız yeterlidir.
