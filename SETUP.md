# Video Server — Kurulum & Dağıtım Kılavuzu (Windows VPS)

> HLS video yayını, VIP üyelik sistemi ve Cloudflare CDN entegrasyonu.  
> **Hedef Ortam: Windows Server 2019/2022 VPS**

---

## İçindekiler

1. [Sistem Gereksinimleri](#1-sistem-gereksinimleri)
2. [Docker Kurulumu (Windows)](#2-docker-kurulumu-windows)
3. [Uygulama Kurulumu](#3-uygulama-kurulumu)
4. [Ortam Değişkenleri](#4-ortam-değişkenleri)
5. [İlk Admin Kullanıcısı](#5-ilk-admin-kullanıcısı)
6. [Servis Mimarisi](#6-servis-mimarisi)
7. [Production Dağıtımı (Windows VPS)](#7-production-dağıtımı-windows-vps)
8. [Cloudflare CDN Kurulumu](#8-cloudflare-cdn-kurulumu)
9. [Yönetim Komutları](#9-yönetim-komutları)
10. [Sorun Giderme](#10-sorun-giderme)

---

## 1. Sistem Gereksinimleri

| Gereksinim | Minimum | Önerilen |
|------------|---------|----------|
| CPU | 2 çekirdek | 4 çekirdek |
| RAM | 4 GB | 8 GB |
| Disk | 50 GB SSD | 200 GB NVMe |
| İşletim Sistemi | Windows Server 2019 | Windows Server 2022 |
| Docker Desktop | 4.20+ | En son sürüm |

---

## 2. Docker Kurulumu (Windows)

**PowerShell (Yönetici olarak çalıştırın):**

```powershell
# WSL2 özelliğini etkinleştir
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# WSL2'yi varsayılan yap
wsl --set-default-version 2

# WSL2 Linux Kernel güncellemesi indir ve kur
# https://aka.ms/wsl2kernel adresinden indirin

# Docker Desktop indir ve kur
# https://www.docker.com/products/docker-desktop/
# Yükleyici çalıştırırken "Use WSL 2 instead of Hyper-V" seçin
```

Docker Desktop kurulumu sonrası **Restart** yapın, ardından:

```powershell
# Docker çalışıyor mu kontrol et
docker --version
docker-compose --version

# Test
docker run hello-world
```

> **Not:** Docker Desktop kurulduktan sonra sistem tepsisinde çalışmalıdır. Her Windows başlangıcında otomatik başlaması için Docker Desktop → Settings → General → "Start Docker Desktop when you log in" seçeneğini işaretleyin.

---

## 3. Uygulama Kurulumu

**PowerShell (Yönetici olarak çalıştırın):**

```powershell
# Git ile repo klonla (Git yoksa: https://git-scm.com/download/win)
cd C:\
git clone <repo-url> video-server
cd C:\video-server

# .env dosyasını oluştur
Copy-Item .env.example .env
notepad .env  # Düzenleyin (bkz. Bölüm 4)

# Tüm servisleri başlat
docker-compose up --build -d

# Durum kontrolü
docker-compose ps
```

Uygulama `http://localhost:8080` adresinde çalışır.  
Admin paneli: `http://localhost:8080/admin`

---

## 4. Ortam Değişkenleri

`.env` dosyası (proje kök dizininde):

```env
# ─── Güvenlik ───────────────────────────────────────────────────────────────
# JWT token imzalama anahtarı — Production'da mutlaka değiştirin!
JWT_SECRET=super_secret_video_key_123

# ─── MinIO (Object Storage) ─────────────────────────────────────────────────
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin123

# ─── PostgreSQL ─────────────────────────────────────────────────────────────
PG_USER=video_user
PG_PASSWORD=video_pass
PG_DB=video_db
```

> ⚠️ **Production'da `JWT_SECRET` mutlaka güçlü, rastgele bir değer olmalıdır:**
> ```powershell
> # Rastgele güçlü şifre üret
> [System.Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Max 256) }))
> ```

---

## 5. İlk Admin Kullanıcısı

Sistem ilk başladığında otomatik olarak admin kullanıcısı oluşturulur:

| Alan | Değer |
|------|-------|
| Kullanıcı Adı | `admin` |
| Şifre | `admin123` |

> 🔑 **İlk girişten sonra şifreyi değiştirin!**

Eğer admin kullanıcısı oluşturulmadıysa:
```powershell
docker exec video-server-api-1 node -e "require('./database').seedAdmin()"
```

---

## 6. Servis Mimarisi

```
┌──────────────────────────────────────────────────────┐
│  Kullanıcı Tarayıcısı                                 │
└────────────────┬─────────────────────────────────────┘
                 │ HTTP :8080
┌────────────────▼─────────────────────────────────────┐
│  Frontend (Nginx + React SPA)  :8080                  │
│  /api/*  → proxy → API :3000                          │
│  /uploads/* → proxy → API :3000                       │
└────────────────┬─────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
┌─────────────────┐  ┌──────────────────────────────────┐
│  API (Express)  │  │  Worker (FFmpeg + BullMQ)         │
│  :3000          │  │  - HLS encode                     │
│  - REST API     │  │  - Thumbnail extraction           │
│  - MinIO proxy  │  │  - Preview clip generation       │
│  - JWT auth     │  └──────────────┬───────────────────┘
└────────┬────────┘                 │
         │                         │
    ┌────┴────┐    ┌───────────┐   │
    ▼         ▼    ▼           ▼   ▼
┌───────┐ ┌──────┐ ┌────────┐ ┌───────┐
│Postgres│ │Redis │ │ MinIO  │ │ MinIO │
│:5432   │ │:6379 │ │raw-vids│ │hls-   │
│        │ │queue │ │        │ │videos │
└───────┘ └──────┘ └────────┘ └───────┘
```

### Servis Portları

| Servis | Port | Açıklama |
|--------|------|----------|
| Frontend | 8080 | React SPA + API proxy |
| API | 3000 | REST API (dahili) |
| PostgreSQL | 5432 | Veritabanı |
| Redis | 6379 | İş kuyruğu |
| MinIO | 9000 | Object storage |
| MinIO Console | 9001 | MinIO yönetim paneli |

---

## 7. Production Dağıtımı (Windows VPS)

### 7.1 Windows Firewall Ayarları

**PowerShell (Yönetici olarak çalıştırın):**

```powershell
# HTTP portunu aç (Cloudflare için yeterli)
New-NetFirewallRule -DisplayName "HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# HTTPS
New-NetFirewallRule -DisplayName "HTTPS 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Uygulama portu (Cloudflare olmadan direkt erişim için)
New-NetFirewallRule -DisplayName "Video App 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow

# Mevcut kuralları listele
Get-NetFirewallRule | Where-Object {$_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound'} | Select-Object DisplayName, LocalPort
```

### 7.2 Port 80 Yönlendirmesi

Cloudflare yalnızca port 80/443 üzerinden proxy yapar. Docker uygulamanız 8080'de çalışıyor. IIS veya port proxy ile yönlendirin:

**Seçenek A — IIS Reverse Proxy (önerilen):**

```powershell
# IIS ve URL Rewrite modülü kur
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Url-Auth

# Application Request Routing (ARR) indir ve kur:
# https://www.iis.net/downloads/microsoft/application-request-routing

# IIS Manager'da yeni site oluştur → web.config:
```

`C:\inetpub\wwwroot\web.config`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:8080/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="8589934592" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

**Seçenek B — Netsh Port Proxy (daha basit):**

```powershell
# Port 80'i 8080'e yönlendir
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=8080 connectaddress=127.0.0.1

# Yönlendirmeleri listele
netsh interface portproxy show all

# Kaldırmak için
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0
```

### 7.3 Docker Desktop Autostart

Docker Desktop'ın Windows başlangıcında otomatik çalışması için:

```powershell
# Docker Desktop kısayolunu Startup klasörüne ekle
$startup = [System.Environment]::GetFolderPath('Startup')
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut("$startup\Docker Desktop.lnk")
$shortcut.TargetPath = $dockerPath
$shortcut.Save()
```

### 7.4 Docker Compose Autostart

Windows başlangıcında `docker-compose up -d` otomatik çalıştırmak için Görev Zamanlayıcısı:

```powershell
# Task Scheduler ile otomatik başlatma
$action = New-ScheduledTaskAction `
  -Execute "docker-compose" `
  -Argument "up -d" `
  -WorkingDirectory "C:\video-server"

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName "VideoServer-DockerCompose" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -RunLevel Highest `
  -Force

Write-Host "Görev zamanlayıcı kuruldu!"
```

### 7.5 SSL (Cloudflare ile)

Cloudflare kullanıyorsanız SSL için Cloudflare'in kendi sertifikasını kullanın:

- Cloudflare paneli → **SSL/TLS** → Mode: **Full**
- Bu mod sunucunuzda herhangi bir sertifika gerektirmez
- Cloudflare ↔ Tarayıcı: Cloudflare sertifikası (HTTPS)
- Cloudflare ↔ Sunucu: Şifrelenmemiş HTTP (yeterlidir, zira Cloudflare korur)

Sunucu üzerinde SSL zorunluysa (Cloudflare olmadan):
```powershell
# win-acme ile Let's Encrypt sertifikası al (ücretsiz)
# https://www.win-acme.com/ adresinden indirin
# wacs.exe --target iis
```

---

## 8. Cloudflare CDN Kurulumu

### 8.1 Domain Bağlantısı

1. [dash.cloudflare.com](https://dash.cloudflare.com) → "Add a site"
2. DNS kayıtlarını ekleyin:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | A | @ | `<VPS_IP>` | ✅ Proxied |
   | A | www | `<VPS_IP>` | ✅ Proxied |

3. Nameserver'ları domain kayıt yerinizde güncelleyin

### 8.2 Cloudflare Worker Kurulumu

1. **Workers & Pages** → **Create Worker**
2. `cloudflare-worker.js` dosyasının içeriğini yapıştırın → **Save and deploy**
3. Worker → **Settings → Variables → Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `JWT_SECRET` | `.env` dosyasındaki `JWT_SECRET` değeri |

4. Worker → **Settings → Triggers → Add Route**:
   ```
   yourdomain.com/uploads/*
   ```

### 8.3 Cache Kuralları

**Caching → Cache Rules → Create rule:**

**Kural 1:** API bypass
- IF: URL path starts with `/api`
- THEN: Cache Level = Bypass

**Kural 2:** Video segmentleri cachele
- IF: URL path ends with `.ts`  
- THEN: Cache Everything, Edge TTL = 30 days

### 8.4 Cloudflare Ayarları

| Ayar | Değer |
|------|-------|
| SSL/TLS → Mode | **Full** |
| Speed → Minify | JS + CSS + HTML |
| Network → HTTP/3 | Enabled |

### 8.5 CDN Cache Dağılımı

| Dosya Türü | Auth | Cache |
|------------|------|-------|
| `.m3u8` playlist | JWT gerekli | No-cache |
| `.ts` segmentler | Public | **30 gün (edge)** |
| `.jpg` thumbnail | Public | 7 gün (edge) |
| `preview.mp4` | Public | 7 gün (edge) |
| `/api/*` | JWT gerekli | Bypass |

---

## 9. Yönetim Komutları

**PowerShell ile Docker yönetimi:**

```powershell
# Tüm servisleri başlat
docker-compose up -d

# Tüm servisleri durdur
docker-compose down

# Logları izle
docker-compose logs -f
docker-compose logs worker -f     # Sadece worker
docker-compose logs api -f        # Sadece API

# Belirli servisi yeniden başlat
docker-compose restart api
docker-compose restart worker

# Yeni kod ile yeniden derle
docker-compose up --build -d api
docker-compose up --build -d worker
docker-compose up --build -d frontend
docker-compose up --build -d        # Tümü

# Servis durumlarını listele
docker-compose ps

# Kaynak kullanımı
docker stats
```

### Veritabanı

```powershell
# PostgreSQL bağlan
docker exec -it video-server-postgres-1 psql -U video_user -d video_db

# Veritabanı yedekle
$date = Get-Date -Format "yyyyMMdd"
docker exec video-server-postgres-1 pg_dump -U video_user video_db | Out-File "backup_$date.sql" -Encoding utf8

# Yedekten geri yükle
Get-Content backup.sql | docker exec -i video-server-postgres-1 psql -U video_user video_db
```

### Volume / Disk

```powershell
# Volume listesi
docker volume ls

# Disk kullanımı
docker system df

# ⚠️ DİKKAT: Tüm verileri sil (geriye dönüşü yok!)
docker-compose down -v

# Kullanılmayan image'ları temizle
docker image prune -f
```

---

## 10. Sorun Giderme

### Video işlenmiyor

```powershell
docker-compose logs worker --tail=100
```

### Thumbnail / Preview URL null

Bu video yeni worker kodu eklenmeden önce işlenmiş → videoyu silip tekrar yükleyin.

### Admin girişi çalışmıyor

```powershell
# Admin kullanıcısını sıfırla
docker exec video-server-api-1 node -e "
const db = require('./database');
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10).then(h =>
  db.query('INSERT INTO users (username, password, is_admin) VALUES (\$1,\$2,\$3) ON CONFLICT (username) DO UPDATE SET password=\$2', ['admin', h, true])
  .then(() => { console.log('Admin tamamlandi'); process.exit(0); })
);"
```

### Port 80 çalışmıyor

```powershell
# Hangi process 80'i kullanıyor?
netstat -ano | findstr ":80"

# IIS çalışıyor mu?
Get-Service -Name W3SVC

# IIS durdur (çakışma varsa)
Stop-Service -Name W3SVC
Set-Service -Name W3SVC -StartupType Disabled
```

### Docker başlamıyor

```powershell
# Docker Desktop servis durumu
Get-Service -Name *docker*

# WSL durumu
wsl --status
wsl --list --verbose

# Docker Desktop'ı yeniden başlat
Stop-Process -Name "Docker Desktop" -Force
Start-Sleep 3
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### `413 Request Entity Too Large`

IIS kullanıyorsanız `web.config`'de `maxAllowedContentLength` değerini artırın (bkz. Bölüm 7.2).

### Cloudflare'de video oynatma sorunu

1. Worker route'u: `yourdomain.com/uploads/*` ✓
2. Worker environment'ta `JWT_SECRET` doğru mu?
3. Cloudflare **SSL/TLS → Mode: Full** mı?
4. Cloudflare → **Cache → Purge Everything**

---

## Dosya Yapısı

```
C:\video-server\
├── docker-compose.yml          # Tüm servis tanımları
├── .env                        # Ortam değişkenleri (git'e eklemeyin!)
├── .env.example                # Örnek env dosyası
├── cloudflare-worker.js        # Cloudflare CDN Worker scripti
├── SETUP.md                    # Bu dosya
│
├── db\
│   └── init.sql                # Veritabanı şeması
│
├── nginx\
│   └── nginx.conf              # Docker içi nginx ayarları
│
├── worker\                     # Video işleme servisi (FFmpeg)
│   └── src\
│       ├── index.js
│       ├── process.js          # HLS encode + thumbnail + preview
│       └── storage.js          # MinIO yardımcıları
│
└── new_front\                  # Frontend + Backend
    ├── backend\                # Express.js API
    │   ├── server.js           # Ana sunucu + MinIO proxy
    │   ├── database.js
    │   └── routes\
    └── src\                    # React SPA
```
