@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "HTML=%~dp0twitter-export.html"
set "OUT=%~dp0twitter-kapak-1200x630.png"

for %%B in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if exist %%B (
  echo PNG uretiliyor...
  %%B --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --run-all-compositor-stages-before-draw --virtual-time-budget=4000 --screenshot="%OUT%" "file:///%HTML:\=/%"
  if exist "%OUT%" (
    echo Tamam: %OUT%
    pause
    exit /b 0
  )
)

echo HATA: Chrome veya Edge bulunamadi.
pause
exit /b 1
