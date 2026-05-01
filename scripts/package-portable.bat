@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0\.."

REM Get version from package.json
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set "VERSION=%%v"

set "OUTPUT_DIR=dist-portable"
set "PACKAGE_NAME=SatisfactoryLayoutTool-%VERSION%-windows"

echo.
echo ================================================================
echo    Satisfactory Layout Tool - Portable Packaging Script
echo    Version %VERSION%
echo ================================================================
echo.

echo Step 1/5: Cleaning previous builds...
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%"

echo.
echo Step 2/5: Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo Step 3/5: Building Rust backend...
call npm run rust:build
if errorlevel 1 (
    echo ERROR: Rust build failed!
    pause
    exit /b 1
)

echo.
echo Step 4/5: Building launcher...
cd launcher
call npm install
call npm run build:windows
if errorlevel 1 (
    echo ERROR: Launcher build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo Step 5/5: Assembling package...

REM Copy launcher
copy "launcher\dist\SatisfactoryLayoutTool.exe" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul

REM Copy Rust server
copy "src-tauri\target\release\standalone-server.exe" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul

REM Copy frontend dist
xcopy "dist\*" "%OUTPUT_DIR%\%PACKAGE_NAME%\dist\" /E /I /Q >nul

REM Copy real license, attribution, and changelog files
copy "LICENSE" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul
copy "docs\legal\AGPL-3.0.txt" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul
copy "docs\legal\ADDITIONAL_TERMS.md" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul
copy "NOTICE" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul
copy "CHANGELOG.md" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul
copy "docs\INSTALL.md" "%OUTPUT_DIR%\%PACKAGE_NAME%\" >nul

REM Create HOW_TO_USE.txt
set "HOWTO_FILE=%OUTPUT_DIR%\%PACKAGE_NAME%\HOW_TO_USE.txt"
echo Satisfactory Layout Tool > "%HOWTO_FILE%"
echo ======================== >> "%HOWTO_FILE%"
echo. >> "%HOWTO_FILE%"
echo 1. Double-click SatisfactoryLayoutTool.exe >> "%HOWTO_FILE%"
echo 2. Wait for the app to open in your browser >> "%HOWTO_FILE%"
echo 3. Keep the launcher window open while using the app >> "%HOWTO_FILE%"
echo 4. Close the launcher window when done >> "%HOWTO_FILE%"
echo. >> "%HOWTO_FILE%"
echo Troubleshooting: >> "%HOWTO_FILE%"
echo - If the browser doesn't open, go to: http://127.0.0.1:5173 >> "%HOWTO_FILE%"
echo - Make sure all files stay in the same folder >> "%HOWTO_FILE%"
echo. >> "%HOWTO_FILE%"
echo License: This software is licensed under the GNU AGPL-3.0-or-later >> "%HOWTO_FILE%"
echo with additional attribution-preservation terms. See LICENSE, >> "%HOWTO_FILE%"
echo docs/legal/AGPL-3.0.txt, docs/legal/ADDITIONAL_TERMS.md, and NOTICE. >> "%HOWTO_FILE%"

echo.
echo ================================================================
echo    BUILD COMPLETE!
echo ================================================================
echo.
echo Package created at: %OUTPUT_DIR%\%PACKAGE_NAME%\
echo.
echo Contents:
dir /b "%OUTPUT_DIR%\%PACKAGE_NAME%"
echo.
echo To distribute:
echo   1. Zip the folder: %OUTPUT_DIR%\%PACKAGE_NAME%
echo   2. Upload as a release asset on GitHub
echo.
echo Users just need to:
echo   1. Extract the zip
echo   2. Double-click SatisfactoryLayoutTool.exe
echo.
pause
