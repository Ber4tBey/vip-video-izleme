# Windows Sunucu (VDS) Kurulum Rehberi (Docker Olmadan)

Sanallaştırma kapalı olduğu için projeyi Windows Server / Windows makineniz üzerinde manuel olarak yayınlama adımları aşağıdadır.

## Ön Koşullar

Yeni bir PowerShell veya CMD penceresi açın ve aşağıdaki yazılımları kurun:

1. **Node.js İndirin ve Kurun:**
   - [Node.js adresinden](https://nodejs.org/en) güncel sürümü indirip kurun ("Next" diyerek standart kurulum).

2. **PM2 Kurulumu (Uygulamayı Açık Tutmak İçin):**
   - Terminali yönetici olarak açıp şu komutu çalıştırın:
   ```cmd
   npm install -g pm2
   ```

3. **Nginx Kurulumu (Eğer Port 80'i kullanacaksanız):**
   - İsteğe bağlıdır ancak önerilir. Eğer sadece Backend'i başlatıp frontend'i Vite ile sunmak isterseniz `npm run dev` kullanabilirsiniz ama production için Nginx iyi olur. (Veya projeyi IIS üzerinden de yayınlayabilirsiniz). 

---

## 1. Backend Kurulumu

1. Cmd/Powershell üzerinden projenizin bulunduğu tam yola gidin:
   ```cmd
   cd C:\Users\berat\Masaüstü\vip_video_izleme\backend
   ```
2. Gerekli paketleri indirin:
   ```cmd
   npm install
   ```
3. Uygulamayı PM2 ile başlatın (Böylece cmd kapansa da çalışmaya devam eder):
   ```cmd
   pm2 start server.js --name "vip-video-backend"
   ```
4. PM2'yi kaydetmek (sunucu yeniden başlarsa oto açılması için bir servis kurabilirsiniz ya da manuel pm2 başlatabilirsiniz):
   ```cmd
   pm2 save
   ```

*(Artık backend `http://localhost:3001` adresinde çalışıyor olacaktır.)*

---

## 2. Frontend Kurulumu (Alternatif Yollar)

### Yöntem A: Geliştirici Modunda (En Basiti Ama Performanssız)
Sadece VDS'e girip projeyi başlatmak istiyorsanız:
1. Ana dizine dönün:
   ```cmd
   cd C:\Users\berat\Masaüstü\vip_video_izleme
   ```
2. Uygulamayı başlatın:
   ```cmd
   npm run dev -- --host
   ```
Bu sayede `http://<VDS-IP-ADRESI>:5173` üzerinden siteye erişebilirsiniz. 

*(Not: Port 5173'ün Windows Güvenlik Duvarı'ndan (Firewall) dışarıya açık olması gerekir.)*

### Yöntem B: Production Build (Önerilen)
Uygulamayı statik dosyalara çevirip sunmak en hızlısıdır.

1. Ana dizinde projeyi derleyin:
   ```cmd
   cd C:\Users\berat\Masaüstü\vip_video_izleme
   npm install
   npm run build
   ```
2. Oluşan `dist` klasörünü sunmak için basit bir statik dosya sunucusu kurun:
   ```cmd
   npm install -g serve
   ```
3. Uygulamayı PM2 ile servis edin (port 80 üzerinden sunmak isterseniz komut sonuna `-p 80` ekleyebilirsiniz, ancak yönetici izni gerekir):
   ```cmd
   pm2 start serve --name "vip-video-frontend" -- -s dist -l 80
   ```

## 3. Bağlantı Ayarları

Şu anda proje içindeki `.env` ve ayarlarda `.env.local` içerisinde backend adresi `http://localhost:3001` gibi görünmektedir. Eğer dışarıdan birisi girecekse, frontend ayarlarındaki (örneğin `.env` dosyasındaki `VITE_API_URL`) adresin sunucunuzun IP adresi olması gerekir.

Eğer Windows Firewall portları engelliyorsa:
1. Başlat menüsünden `Gelişmiş Güvenlik Özellikli Windows Defender Güvenlik Duvarı`nı açın.
2. `Gelen Kuralları` (Inbound Rules) -> `Yeni Kural` deyin.
3. `Bağlantı Noktası` (Port) seçin -> `İleri`.
4. `Sektörel Bağlantı Noktaları` kısmına 80 ve 3001 (eğer api'ye doğrudan erişilmesini isterseniz) ekleyin.
5. İzin ver deyin ve kurala bir isim verip kaydedin.
