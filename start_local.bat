@echo off
echo ==============================================
echo VIP Video Platform - PC/Sunucu Baslatma (Node.js Proxy)
echo ==============================================
echo.
echo Lutfen port 80 (Ana Sunucu) acik olduguna emin olun.
echo Uygulama PM2 uzerinden arka planda "vip-video-proxy"
echo ve "vip-video-backend" isimleriyle calisacaktir.
echo.

cd /d "%~dp0"

echo [1/3] Proxy API yonlendirici ayarlari kuruluyor...
call npm install

echo [2/3] Backend bagimliliklari kuruluyor...
cd backend
call npm install
cd ..

echo [3/3] PM2 uzerinden sunucular baslatiliyor...
call npx pm2 reload ecosystem.config.cjs || call npx pm2 start ecosystem.config.cjs

echo.
echo Islem tamamlandi.
echo Uygulamaya erisim: http://localhost (veya IP adresiniz)
echo.
echo Uygulamalari durdurmak icin "npx pm2 stop all" komutunu kullanabilirsiniz.
pause
