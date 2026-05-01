@echo off
echo ========================================
echo Building Satisfactory Layout Tool Launcher
echo ========================================
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install

echo.
echo Building Windows executable...
call npm run build:windows

echo.
echo ========================================
echo Build complete!
echo.
echo Output: dist\SatisfactoryLayoutTool.exe
echo.
echo To create a distributable package:
echo 1. Copy dist\SatisfactoryLayoutTool.exe
echo 2. Copy standalone-server.exe (from src-tauri\target\release)
echo 3. Put both in the same folder
echo 4. Optionally add the dist folder from frontend build
echo ========================================
pause
