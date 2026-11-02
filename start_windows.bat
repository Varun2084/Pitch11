@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python nahi mila. python.org/downloads se install karein aur "Add Python to PATH" tick karein.
  pause
  exit /b 1
)
if exist web\data\meta.json goto serve
echo Asli data download ho raha hai. Isme 5-10 minute lag sakte hain...
python pipeline\build.py --out web\data
if errorlevel 1 (
  echo Data nahi ban saka. Upar ka error screenshot karke bhejiye.
  pause
  exit /b 1
)
python pipeline\news.py --out web\data
:serve
start "" http://localhost:8000
echo App chal raha hai. Band karne ke liye ye window close karein.
python -m http.server 8000 -d web
pause
