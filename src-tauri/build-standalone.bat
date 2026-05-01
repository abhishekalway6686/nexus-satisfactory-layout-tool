@echo off
echo Building standalone HTTP server...
cargo build --release --bin standalone-server --features standalone --no-default-features
echo.
echo Build complete! Run with: target\release\standalone-server.exe