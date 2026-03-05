# 🚀 Production CDN & Caching Guide (Cloudflare)

Bu belge, video sunucunuzu canlı (production) ortama aldığınızda Cloudflare gibi bir CDN (Content Delivery Network) arkasında videolarınızı nasıl **ÜCRETSİZ** ve **SINIRSIZ** bir şekilde önbelleğe (cache) alacağınızı açıklar.

Nginx sunucumuz zaten kendi içinde temel bir önbellekleme (Disk Caching) yapıyor. Ancak asıl devasa performans artışı, Nginx'in önüne Cloudflare (veya AWS CloudFront) koyarak sağlanır.

## Neden CDN Kullanmalıyım?
1. **Sunucu Bant Genişliği (Bandwidth) Tasarrufu:** Aynı videoyu 10.000 kişi izlese bile, video sunucunuzdan (Nginx/MinIO) sadece **1 kez** çıkar. Kalan 9.999 kişiye videoyu Cloudflare kendi cebinden (Edge sunucularından) gönderir. Sunucunuzun internet kotası bitmez veya aşım ücreti ödemezsiniz.
2. **Dünya Çapında Hız:** Sitenize giren bir kullanıcı videoyu Türkiye'den açıyorsa Türkiye sunucularından, Almanya'dan açıyorsa Almanya sunucularından izler. Donma/Takılma sıfıra iner.
3. **DDOS Koruması:** Sunucunuzun gerçek IP adresi gizlenir, doğrudan saldırılara karşı korunursunuz.

---

## 🛠️ Kurulum ve Entegrasyon Adımları

Nginx ayarlarınız (kodlarınız) şu an Cloudflare için **tamamen hazır** durumdadır. Tek yapmanız gereken bu sunucuyu Cloudflare ağına dahil etmektir.

### Adım 1: Domain Yönlendirmesi
1. [Cloudflare](https://dash.cloudflare.com) hesabı oluşturun.
2. Sahip olduğunuz Alan Adını (Domain) Cloudflare'e ekleyin ve DNS Nameserver ayarlarını değiştirin.
3. DNS sekmesine giderek, A kaydı oluşturun ve sunucunuzun IP adresini girin. **Proxy Status (Turuncu Bulut)** ikonunun AÇIK olduğundan emin olun.
   - Örn: `A | video | 192.168.1.50 | Proxied` -> Bu sayede `video.siteniz.com` (ya da uygulamanızın public adresi) CDN arkasında çalışacak.

### Adım 2: Page Rules (Sayfa Kuralları) ile Cache Zorlama
Cloudflare normalde `.html`, `.js`, `.css` ve resimleri cache'ler ancak varsayılan olarak **Video dosyalarını** (.ts, .m3u8) cache'lemez. Bunun için özel kural yazmalıyız:

1. Cloudflare panelinden **Rules** -> **Page Rules** (veya Cache Rules) bölümüne gidin.
2. Yeni kural oluşturun (Create Page Rule).
3. URL eşleşme kısmına şunu yazın: `*siteniz.com/hls/*` (Sizin video yayın proxy alanınız).
4. Ayarlar kısmından (Add a Setting):
   - **Cache Level:** `Cache Everything` (Her Şeyi Önbelleğe Al)
   - **Edge Cache TTL:** `A Month` (Zaman damgalı `.ts` segmentleri bir kez oluşur ve değişmez, o yüzden 1 ay tutulabilir).
   - **Browser Cache TTL:** `A Day` (veya Respect Existing Headers).
5. Kuralı kaydedin ve en üste taşıyın.

### Adım 3: M3U8 (Canlı Listeler) İçin İstisna
Dikkat! `.ts` (video parçaları) asla değişmez, bu yüzden ömür boyu cache'lenebilir. ANCAK `master.m3u8` veya `stream.m3u8` gibi dizin dosyaları bazen değişebilir (Örn: videonun bir kısmı silindiyse veya canlı yayınsa).
Bu platform VOD (Video On Demand - Hazır Video) yayını yaptığı için oluşturduğunuz videolar sonradan değişmez, ancak olası bir oynatma hatasına karşı sadece `.m3u8` dosyaları için ayrı bir kural (Rule) oluşturup Edge Cache TTL süresini "2 Dakika" gibi kısa bir süreye indirebilirsiniz.

---

## ✅ Sistem Şu Anda Ne Yapıyor (Nginx Yapılandırmamız)
Eğer projeyi incelerseniz `nginx/nginx.conf` dosyasına şu satırları zaten entegre ettik:
- Nginx, `hls-videos` için devasa bir önbellek havuzu (`proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=hls_cache:10m max_size=1g inactive=60m`) oluşturdu.
- Yani Cloudflare gibi bir CDN olmasa bile, Nginx saniyede gelen binlerce isteği doğrudan belleğinden cevaplar, arka plandaki MinIO veritabanını felç etmez.

## Sonuç
CDN (Cloudflare) kullanmak sadece sistemin dışından ufak bir Domain ayarından ibarettir. Mevcut kod yapınız ve oluşturduğumuz mimari tam olarak on binlerce kullanıcıya VOD sistemi sunmaya en uygun, CDN-Dostu (CDN-Friendly) biçimdedir! Herhangi bir kod değişikliğine gerek yoktur.
