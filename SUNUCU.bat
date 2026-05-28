@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Türkiye Seçim Arşivi — Anket güncelleme sunucusu
echo  ─────────────────────────────────────────────────
echo  Site:     http://127.0.0.1:8765/
echo  Anket:    http://127.0.0.1:8765/#/anket
echo.
echo  Gelecek seçimler ^> "Anketleri güncelle" ile tarama yapilir.
echo  Python dosyaya yazar: data/anket/bundle.json
echo.
python tools/anket_server.py
pause
