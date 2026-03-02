# VIP Video İzleme Projesi (Tam Local Kurulum)

Bu proje **Node.js + Express + SQLite + Nginx + React** mimarisi kullanılarak tamamen **yerel makinede** (internetsiz veya kendi sunucunuzda) çalışacak şekilde tasarlanmıştır.

## Mimarinin Avantajları
1. **Dockerized:** Tüm servisler tek komutla çalışır (`docker-compose up`).
2. **Nginx Cache:** Tüm resimler 7 gün, videolar 30 gün boyunca Nginx tarafından ara belleğe alınır, sunucu yorulmaz.
3. **Service Worker:** Tarayıcı tarafında videolar ve resimler cache'lenir (offline destek).
4. **Range Requests:** Videolar parça parça çekilir (seek özelliği, videoyu ileri sarmak için tümünü indirmeye gerek yok).
5. **SQLite:** Kurulum gerektirmeyen gömülü veritabanı (veriler `backend/db/database.db` içinde saklanır).

---

## Kurulum (Windows)

Makinenizde **Docker Desktop** kurulu ve çalışıyor olmalıdır.

1. Proje ana klasörüne gidin (bu `README.md`'nin olduğu klasör).
2. Sadece **`start.bat`** dosyasına çift tıklayın.

*Alternatif olarak komut satırında:*
```bash
docker-compose up --build
```

### Varsayılan Admin Hesabı:
- **Kullanıcı adı:** `admin`
- **Şifre:** `admin123`

---

## Veritabanı ve Medyalar Nerede Saklanıyor?

Kalıcı (persistent) veriler projenin içindeki şu klasörlerde tutulur, Docker container'ları silinse bile **verileriniz kaybolmaz**:
- **Veritabanı:** `backend/db/database.db`
- **Videolar:** `backend/uploads/videos/`
- **Resimler:** `backend/uploads/images/`

Yedek almak için sadece bu `backend/db` ve `backend/uploads` klasörlerini kopyalamanız yeterlidir.

---

## Geliştirici Notları (Local Frontend Geliştirme)

Sadece React (frontend) üzerinde değişiklik yapıp anında görmek istiyorsanız, API backend'inin çalışması gerekir.

1. Terminal 1 (Backend başlat):
```bash
cd backend
npm install
npm run dev
# (3001 portunda Express API çalışır)
```

2. Terminal 2 (Frontend başlat):
```bash
npm install
npm run dev
# (5173 portunda React çalışır, istekler .env.local üzerinden localhost:3001'e gider)
```
