@echo off
echo Testing Standalone HTTP Server...
echo.

echo Building standalone server...
cargo build --bin standalone-server --features standalone --no-default-features
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo.
echo Starting server in background...
start /min cargo run --bin standalone-server --features standalone --no-default-features

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo.
echo Testing endpoints:

echo.
echo 1. Health Check:
curl -s http://127.0.0.1:5175/health
echo.

echo.
echo 2. API Info:
curl -s http://127.0.0.1:5175/api/info
echo.

echo.
echo 3. Distance Calculation:
curl -s -X POST http://127.0.0.1:5175/api/calculate_distance_3d ^
  -H "Content-Type: application/json" ^
  -d "{\"p1\":{\"x\":0,\"y\":0,\"z\":0},\"p2\":{\"x\":3,\"y\":4,\"z\":0}}"
echo.

echo.
echo 4. Performance Stats:
curl -s http://127.0.0.1:5175/api/performance_stats
echo.

echo.
echo Test completed! Check the responses above.
echo Note: Server is still running in background. Close the console window to stop it.