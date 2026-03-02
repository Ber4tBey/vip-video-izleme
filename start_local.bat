@echo off
echo ==============================================
echo VIP Video Platform - Baslatilmasi (Docker Yok)
echo ==============================================
echo.
echo Lutfen port 3001 (Backend) ve 5173 (Frontend) 
echo Windows Firewall uzerinden disariya acik oldugundan emin olun.
echo.

cd /d "%~dp0"

echo [1/3] Frontend bagimliliklari kuruluyor...
call npm install

echo [2/3] Backend bagimliliklari kuruluyor...
cd backend
call npm install
cd ..

echo [3/3] PM2 uzerinden sunucular baslatiliyor...
call npx pm2 start ecosystem.config.cjs

echo.
echo Islem tamamlandi.
echo Frontend erisim: http://localhost:5173
echo Backend API    : http://localhost:3001
echo.
echo Uygulamalari durdurmak icin "npx pm2 stop all" komutunu kullanabilirsiniz.
pause
