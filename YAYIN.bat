@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "SRC=%~dp0"
set "DEST=C:\Users\Fatih\AppData\Local\Temp\secim-arsiv-deploy"
set "REPO=https://github.com/Falpertan/secim-arsiv.git"

echo.
echo  Türkiye Seçim Arşivi — Yayına al
echo  ─────────────────────────────────
echo  Kaynak : %SRC%
echo  GitHub : Falpertan/secim-arsiv ^(main^)
echo  Site   : https://secimarsivi.com
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo  HATA: git bulunamadi. Git for Windows kurun.
  pause
  exit /b 1
)

if not exist "%DEST%\.git" (
  echo  Ilk calistirma — repo klonlaniyor...
  git clone "%REPO%" "%DEST%"
  if errorlevel 1 (
    echo  HATA: klon basarisiz.
    pause
    exit /b 1
  )
)

echo  Dosyalar kopyalaniyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SRC%tools\deploy_sync.ps1" -Source "%SRC%" -Dest "%DEST%"
if errorlevel 1 (
  echo  HATA: kopyalama basarisiz.
  pause
  exit /b 1
)

cd /d "%DEST%"
git pull --rebase origin main 2>nul

set "MSG=%~1"
if "%MSG%"=="" set "MSG=deploy: site guncelleme"

git add -A
git diff --cached --quiet
if errorlevel 1 (
  git -c user.name=Falpertan -c user.email=Falpertan@users.noreply.github.com commit -m "%MSG%"
  if errorlevel 1 (
    echo  HATA: commit basarisiz.
    pause
    exit /b 1
  )
  git push origin main
  if errorlevel 1 (
    echo  HATA: push basarisiz.
    pause
    exit /b 1
  )
  echo.
  echo  BASARILI — birkaç dakika icinde secimarsivi.com guncellenir.
  echo  Tarayicida Ctrl+Shift+R ile sert yenileme yapin.
) else (
  echo  Degisiklik yok — push atlandi.
)

echo.
pause
