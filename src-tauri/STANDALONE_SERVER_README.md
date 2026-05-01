# Satisfactory Layout Tool - Standalone HTTP Server

This standalone HTTP server provides all the Rust-based calculation capabilities of the Satisfactory Layout Tool without requiring the Tauri desktop application. It's perfect for:

- Server deployments
- Headless environments
- Integration with other applications
- Development and testing
- Microservice architectures

## Features

The standalone server provides a comprehensive HTTP API with all the performance-optimized Rust calculations:

### 🎯 Geometry Operations
- 3D/2D distance calculations
- Curve control point generation
- Bézier curve point generation
- Turn detection algorithms
- Line intersection detection

### 🌍 Spatial Queries
- Building radius queries
- Universal spatial queries (buildings, railways, conveyors, pipes)
- High-performance spatial indexing

### 🏗️ Building Management
- Building creation and retrieval
- Position and rotation management
- Floor-based organization

### 📊 Performance Monitoring
- Real-time performance statistics
- Query timing and metrics
- System health monitoring

## Quick Start

### Building the Server

#### Windows
```bash
# Navigate to the Tauri directory
cd src-tauri

# Build standalone server
.\build-standalone.bat
```

#### Linux/macOS
```bash
# Navigate to the Tauri directory
cd src-tauri

# Make build script executable
chmod +x build-standalone.sh

# Build standalone server
./build-standalone.sh
```

#### Manual Build
```bash
cd src-tauri
cargo build --bin standalone-server --features standalone --release
```

### Running the Server

#### Windows
```bash
.\target\release\standalone-server.exe
```

#### Linux/macOS
```bash
./target/release/standalone-server
```

The server will start on `http://127.0.0.1:5175`

## API Documentation

### Health Check
```bash
GET /health
```

Example response:
```json
{
  "status": "healthy",
  "message": "Satisfactory Layout Tool Rust backend is running! 🦀",
  "version": "2.0.0",
  "mode": "standalone",
  "uptime_seconds": 123.45
}
```

### API Information
```bash
GET /api/info
```

Returns comprehensive API documentation and endpoint listing.

### Geometry Operations

#### Calculate 3D Distance
```bash
POST /api/geometry/distance_3d
Content-Type: application/json

{
  "p1": {"x": 0.0, "y": 0.0, "z": 0.0},
  "p2": {"x": 100.0, "y": 100.0, "z": 100.0}
}
```

Response:
```json
{
  "distance": 173.20508075688772,
  "calculation_time_ms": 0.001234
}
```

#### Generate Curve Control Point
```bash
POST /api/geometry/curve_control_point
Content-Type: application/json

{
  "p1": {"x": 0.0, "y": 0.0, "z": 0.0},
  "p2": {"x": 50.0, "y": 50.0, "z": 0.0},
  "p3": {"x": 100.0, "y": 0.0, "z": 0.0}
}
```

#### Generate Bézier Curve Points
```bash
POST /api/geometry/bezier_points
Content-Type: application/json

{
  "start": {"x": 0.0, "y": 0.0, "z": 0.0},
  "control": {"x": 50.0, "y": 50.0, "z": 0.0},
  "end": {"x": 100.0, "y": 0.0, "z": 0.0},
  "num_points": 20
}
```

### Spatial Queries

#### Query Buildings in Radius
```bash
POST /api/spatial/query_buildings
Content-Type: application/json

{
  "center": {"x": 0.0, "y": 0.0, "z": 0.0},
  "radius": 500.0,
  "exclude_ids": ["building-1", "building-2"]
}
```

#### Universal Spatial Query
```bash
POST /api/spatial/universal_query
Content-Type: application/json

{
  "center": {"x": 0.0, "y": 0.0, "z": 0.0},
  "radius": 500.0,
  "include_buildings": true,
  "include_railway_nodes": true,
  "include_conveyor_poles": false,
  "include_pipe_supports": false,
  "exclude_ids": []
}
```

### Building Operations

#### Get All Buildings
```bash
GET /api/buildings
```

#### Create Building
```bash
POST /api/buildings
Content-Type: application/json

{
  "building_type": "Constructor",
  "position": {"x": 100.0, "y": 100.0, "z": 0.0},
  "rotation": 0.0,
  "floor": 0
}
```

### Performance Statistics
```bash
GET /api/performance/stats
```

## Configuration

### Environment Variables

- `RUST_LOG`: Controls logging level (trace, debug, info, warn, error)
- `SERVER_PORT`: Override default port (5175)
- `SERVER_HOST`: Override default host (127.0.0.1)

Example:
```bash
RUST_LOG=debug SERVER_PORT=8080 ./target/release/standalone-server
```

## Integration Examples

### cURL Examples

```bash
# Health check
curl http://127.0.0.1:5175/health

# Calculate distance
curl -X POST http://127.0.0.1:5175/api/geometry/distance_3d \
  -H "Content-Type: application/json" \
  -d '{"p1": {"x": 0, "y": 0, "z": 0}, "p2": {"x": 100, "y": 100, "z": 100}}'

# Spatial query
curl -X POST http://127.0.0.1:5175/api/spatial/query_buildings \
  -H "Content-Type: application/json" \
  -d '{"center": {"x": 0, "y": 0, "z": 0}, "radius": 500}'
```

### JavaScript/Node.js Example

```javascript
const API_BASE = 'http://127.0.0.1:5175';

async function calculateDistance(p1, p2) {
  const response = await fetch(`${API_BASE}/api/geometry/distance_3d`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p1, p2 })
  });
  
  return await response.json();
}

// Usage
const distance = await calculateDistance(
  { x: 0, y: 0, z: 0 },
  { x: 100, y: 100, z: 100 }
);
console.log(`Distance: ${distance.distance}`);
```

### Python Example

```python
import requests

API_BASE = 'http://127.0.0.1:5175'

def calculate_distance(p1, p2):
    response = requests.post(f'{API_BASE}/api/geometry/distance_3d', json={
        'p1': p1,
        'p2': p2
    })
    return response.json()

# Usage
distance = calculate_distance(
    {'x': 0, 'y': 0, 'z': 0},
    {'x': 100, 'y': 100, 'z': 100}
)
print(f"Distance: {distance['distance']}")
```

## Performance

The standalone server provides the same high-performance calculations as the desktop application:

- **Geometry calculations**: Sub-millisecond response times
- **Spatial queries**: Optimized R-tree spatial indexing
- **Concurrent requests**: Tokio-based async handling
- **Memory efficient**: Zero-copy operations where possible

## Architecture

```
┌─────────────────────┐
│   HTTP Clients      │
│  (Browser, cURL,    │
│   other services)   │
└──────────┬──────────┘
           │ HTTP/JSON
           ▼
┌─────────────────────┐
│   Axum HTTP Server  │
│   (Port 5175)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Standalone Commands│
│   (Geometry, Spatial,│
│    Buildings, etc.)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Rust Core Engine  │
│  (State Management, │
│  Spatial Indexing,  │
│  Performance Tracking)│
└─────────────────────┘
```

## Development

### Adding New Endpoints

1. Add command implementation to `src/commands/standalone.rs`
2. Add HTTP handler to `src/http_bridge_enhanced.rs`
3. Add route to the router in `create_enhanced_router()`
4. Update this documentation

### Testing

```bash
# Build and run tests
cargo test --features standalone

# Run specific test
cargo test --features standalone geometry_tests
```

## Troubleshooting

### Common Issues

**Port already in use**
- Change port with `SERVER_PORT` environment variable
- Kill existing process using the port

**Connection refused**
- Ensure server is running
- Check firewall settings
- Verify correct host/port combination

**Performance issues**
- Enable release mode builds
- Monitor with `/api/performance/stats` endpoint
- Check system resources

### Logs

Enable detailed logging:
```bash
RUST_LOG=debug ./target/release/standalone-server
```

## License

MIT License - same as the main Satisfactory Layout Tool project.