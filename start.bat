@echo off
echo ===================================================
echo VIP VIDEO IZLEME - LOCAL SUNUCUYU BASLATMA EKRANI
echo ===================================================
echo.
echo 1) Docker Compose baslatiliyor...
echo.

docker-compose up -d --build

echo.
echo ===================================================
echo [BASARILI]
echo - Site adresi: http://localhost
echo - API adresi: http://localhost/api
echo.
echo Kapatmak icin: docker-compose down yazabilirsiniz
echo ===================================================
pause
