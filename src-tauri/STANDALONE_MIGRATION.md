# Tauri to Standalone HTTP Server Migration

This document describes the successful migration from Tauri webview to a standalone Rust HTTP server with browser frontend.

## Overview

The migration leverages the existing HTTP bridge infrastructure to create two modes of operation:
- **Tauri Mode** (default): Traditional Tauri desktop application
- **Standalone Mode**: Pure HTTP server accessible from any browser

## Changes Made

### 1. Feature Flags in Cargo.toml

Added feature flags to conditionally compile Tauri dependencies:

```toml
[features]
default = ["tauri-mode"]
tauri-mode = ["dep:tauri", "dep:tauri-plugin-log", "dep:tauri-plugin-fs", "dep:tauri-plugin-dialog", "dep:tauri-build"]
standalone = []
```

### 2. Conditional Module Loading

Updated `lib.rs` to conditionally load Tauri-specific modules:

```rust
#[cfg(feature = "tauri-mode")]
pub mod commands;
#[cfg(feature = "tauri-mode")]
pub mod events;
#[cfg(feature = "tauri-mode")]
pub mod viewport;
```

### 3. Standalone Server Binary

Created `standalone_main.rs` with a minimal HTTP server that provides:
- Health checks
- Basic geometry calculations (3D distance)
- Performance monitoring
- API information endpoints

### 4. Build Configuration

Modified `build.rs` to only run Tauri build when needed:

```rust
fn main() {
  #[cfg(feature = "tauri-mode")]
  tauri_build::build();
}
```

## Usage

### Building and Running Tauri Mode (Default)

```bash
# Build Tauri application
cargo build

# Run Tauri application
cargo run
```

### Building and Running Standalone Mode

```bash
# Build standalone HTTP server
cargo build --bin standalone-server --features standalone --no-default-features

# Run standalone HTTP server
cargo run --bin standalone-server --features standalone --no-default-features
```

The standalone server will start on `http://127.0.0.1:5175`

## API Endpoints (Standalone Mode)

### Health & Info
- `GET /` - API information
- `GET /health` - Health check
- `GET /api/info` - API information

### Geometry Operations
- `POST /api/calculate_distance_3d` - Calculate 3D distance between points

### Performance Monitoring
- `GET /api/performance_stats` - Get performance statistics

## Current Limitations

The standalone mode currently provides a **minimal subset** of functionality:
- Basic geometry calculations
- Performance monitoring
- Health checks

### Missing Features (Can be added incrementally)
- Building operations (CRUD)
- Spatial queries and indexing
- Infrastructure operations (conveyors, railways, pipes)
- Serialization (save/load)
- Viewport operations
- Full command coverage (80+ Tauri commands)

## Future Extension

To add more functionality to standalone mode:

1. **Add HTTP endpoints** in `standalone_main.rs` for new operations
2. **Extract business logic** from Tauri commands to shared functions
3. **Create HTTP request/response types** matching the Tauri command signatures
4. **Gradually migrate** one command module at a time

The existing HTTP bridge (`http_bridge.rs`) can be extended to cover more Tauri commands systematically.

## Benefits

1. **Browser Compatibility**: Works with any modern browser
2. **No Tauri Dependencies**: Lighter build for server deployment
3. **HTTP API**: Can be consumed by web frontends, mobile apps, or other services
4. **Incremental Migration**: Commands can be migrated one at a time
5. **Existing Infrastructure**: Leverages the already-built HTTP bridge system

## Testing

Use the provided test script:

```bash
./test_standalone.bat
```

This tests all available endpoints and verifies the server is working correctly.

## Architecture

The migration maintains the original architecture but conditionally compiles components:

```
src/
├── standalone_main.rs          # Standalone HTTP server entry point
├── lib.rs                      # Conditionally loads modules
├── commands/ (tauri-mode only) # Original Tauri commands
├── events/ (tauri-mode only)   # Tauri event system
├── viewport/ (tauri-mode only) # Tauri viewport system  
├── http_bridge.rs              # Shared HTTP bridge (both modes)
├── geometry/                   # Shared business logic
├── spatial/                    # Shared spatial indexing
├── state/                      # Shared state management
└── performance/                # Shared performance tracking
```

## Next Steps

1. **Extend API coverage** by adding more HTTP endpoints
2. **Create a web frontend** that consumes the HTTP API
3. **Add WebSocket support** for real-time updates
4. **Implement authentication** for production deployment
5. **Add comprehensive API documentation** (OpenAPI/Swagger)
6. **Performance optimization** for HTTP request handling