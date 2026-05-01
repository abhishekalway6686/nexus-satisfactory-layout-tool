// HTTP Bridge for Browser Tab Access to Rust Commands
// Enables browser tabs to access Tauri commands via HTTP endpoints

use std::sync::Arc;
use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::Json as ResponseJson,
    routing::{get, post},
    Router,
};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};
// use tokio::sync::RwLock; // Removed unused import
use serde::{Deserialize, Serialize};

use crate::{AppState, types::{Point3D, Building, RailwayNode, ConveyorPole, PipeSupport}};
use crate::spatial::rtree_spatial_index::{ViewportBounds, SpatialObjectData};

// HTTP API Types
#[derive(Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    message: String,
}

#[derive(Serialize, Deserialize)]
struct Distance3DRequest {
    p1: Point3D,
    p2: Point3D,
}

#[derive(Serialize, Deserialize)]
struct Distance3DResponse {
    distance: f64,
}

#[derive(Serialize, Deserialize)]
struct SpatialQueryRequest {
    center: Point3D,
    radius: f64,
    exclude_ids: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize)]
struct SpatialQueryResponse {
    buildings: Vec<Building>,
    query_time_ms: f64,
}

#[derive(Serialize, Deserialize)]
struct UniversalSpatialQueryRequest {
    center: Point3D,
    radius: f64,
    options: SpatialQueryOptions,
}

#[derive(Serialize, Deserialize)]
struct SpatialQueryOptions {
    include_buildings: Option<bool>,
    include_railway_nodes: Option<bool>,
    include_conveyor_poles: Option<bool>,
    include_pipe_supports: Option<bool>,
    exclude_ids: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize)]
struct UniversalSpatialQueryResponse {
    buildings: Vec<Building>,
    railway_nodes: Vec<RailwayNode>,
    conveyor_poles: Vec<ConveyorPole>,
    pipe_supports: Vec<PipeSupport>,
    query_time_ms: f64,
}

#[derive(Serialize, Deserialize)]
struct CurveControlPointRequest {
    p1: Point3D,
    p2: Point3D,
    p3: Point3D,
}

#[derive(Serialize, Deserialize)]
struct CurveControlPointResponse {
    control_point: Point3D,
}

#[derive(Serialize, Deserialize)]
struct BezierPointsRequest {
    start: Point3D,
    control: Point3D,
    end: Point3D,
    num_points: Option<u32>,
}

#[derive(Serialize, Deserialize)]
struct BezierPointsResponse {
    points: Vec<Point3D>,
}

// Viewport Culling Types
#[derive(Serialize, Deserialize)]
struct ViewportCullingRequest {
    left: f64,
    right: f64,
    top: f64,
    bottom: f64,
    z_level: f64,
    z_range: f64,
}

#[derive(Serialize, Deserialize)]
struct ViewportCullingResponse {
    objects: Vec<SpatialObjectData>,
    metrics: SpatialQueryMetrics,
}


#[derive(Serialize, Deserialize)]
struct SpatialQueryMetrics {
    query_time_ms: f64,
    objects_checked: usize,
    objects_returned: usize,
    viewport_area: f64,
    culling_ratio: f64,
}
// HTTP Handlers
async fn health_check() -> ResponseJson<HealthResponse> {
    ResponseJson(HealthResponse {
        status: "ok".to_string(),
        message: "Rust backend HTTP bridge is running! 🦀".to_string(),
    })
}

async fn test_rust_connection() -> ResponseJson<String> {
    ResponseJson("Rust backend connected successfully via HTTP! 🦀".to_string())
}

async fn calculate_distance_3d(
    Json(request): Json<Distance3DRequest>,
) -> Result<ResponseJson<Distance3DResponse>, StatusCode> {
    let _start = std::time::Instant::now();

    // Use the same calculation as the Tauri command
    let dx = request.p1.x - request.p2.x;
    let dy = request.p1.y - request.p2.y;
    let dz = request.p1.z - request.p2.z;
    let distance = (dx * dx + dy * dy + dz * dz).sqrt();
    
    Ok(ResponseJson(Distance3DResponse { distance }))
}

async fn spatial_query_buildings(
    State(app_state): State<Arc<AppState>>,
    Json(_request): Json<SpatialQueryRequest>,
) -> Result<ResponseJson<SpatialQueryResponse>, StatusCode> {
    let start = std::time::Instant::now();
    
    // Access the state manager
    let state_manager = app_state.state_manager.read().await;
    let _current_state = state_manager.get_state().await;
    
    // TODO: Implement actual spatial query using the spatial index
    // For now, return empty results to establish the bridge
    let buildings = Vec::new();
    
    let query_time_ms = start.elapsed().as_secs_f64() * 1000.0;
    
    Ok(ResponseJson(SpatialQueryResponse {
        buildings,
        query_time_ms,
    }))
}

async fn universal_spatial_query(
    State(app_state): State<Arc<AppState>>,
    Json(_request): Json<UniversalSpatialQueryRequest>,
) -> Result<ResponseJson<UniversalSpatialQueryResponse>, StatusCode> {
    let start = std::time::Instant::now();
    
    // Access the state manager
    let state_manager = app_state.state_manager.read().await;
    let _current_state = state_manager.get_state().await;
    
    // TODO: Implement actual universal spatial query
    // For now, return empty results to establish the bridge
    let buildings = Vec::new();
    let railway_nodes = Vec::new();
    let conveyor_poles = Vec::new();
    let pipe_supports = Vec::new();
    
    let query_time_ms = start.elapsed().as_secs_f64() * 1000.0;
    
    Ok(ResponseJson(UniversalSpatialQueryResponse {
        buildings,
        railway_nodes,
        conveyor_poles,
        pipe_supports,
        query_time_ms,
    }))
}

async fn viewport_cull_objects(
    State(app_state): State<Arc<AppState>>,
    Json(request): Json<ViewportCullingRequest>,
) -> Result<ResponseJson<ViewportCullingResponse>, StatusCode> {
    let _start = std::time::Instant::now();

    // Create viewport bounds from request
    let viewport = ViewportBounds::new(
        request.left,
        request.right,
        request.top,
        request.bottom,
        request.z_level,
        request.z_range,
    );
    
    // Access the optimized spatial index
    let mut spatial_index = app_state.optimized_spatial_index.write().await;
    let result = spatial_index.viewport_cull_all(&viewport);
    
    // Convert SpatialObject to SpatialObjectData for HTTP response
    let objects: Vec<SpatialObjectData> = result.objects.iter().map(|obj| {
        SpatialObjectData {
            id: obj.get_id().to_string(),
            object_type: obj.get_type().to_string(),
        }
    }).collect();
    
    let response = ViewportCullingResponse {
        objects,
        metrics: SpatialQueryMetrics {
            query_time_ms: result.metrics.query_time_ms,
            objects_checked: result.metrics.objects_checked,
            objects_returned: result.metrics.objects_returned,
            viewport_area: result.metrics.viewport_area,
            culling_ratio: result.metrics.culling_ratio,
        },
    };
    
    Ok(ResponseJson(response))
}


async fn calculate_curve_control_point(
    Json(request): Json<CurveControlPointRequest>,
) -> Result<ResponseJson<CurveControlPointResponse>, StatusCode> {
    // Use the same calculation as the Tauri command
    // This is a simplified version - implement full curve logic later
    let control_point = Point3D::new(
        (request.p1.x + request.p2.x + request.p3.x) / 3.0,
        (request.p1.y + request.p2.y + request.p3.y) / 3.0,
        (request.p1.z + request.p2.z + request.p3.z) / 3.0,
    );
    
    Ok(ResponseJson(CurveControlPointResponse { control_point }))
}

async fn get_quadratic_bezier_points(
    Json(request): Json<BezierPointsRequest>,
) -> Result<ResponseJson<BezierPointsResponse>, StatusCode> {
    let num_points = request.num_points.unwrap_or(20);
    let mut points = Vec::new();
    
    for i in 0..=num_points {
        let t = i as f64 / num_points as f64;
        let u = 1.0 - t;
        
        let x = u * u * request.start.x + 2.0 * u * t * request.control.x + t * t * request.end.x;
        let y = u * u * request.start.y + 2.0 * u * t * request.control.y + t * t * request.end.y;
        let z = u * u * request.start.z + 2.0 * u * t * request.control.z + t * t * request.end.z;
        
        points.push(Point3D::new(x, y, z));
    }
    
    Ok(ResponseJson(BezierPointsResponse { points }))
}

// Performance Stats Handler  
async fn get_performance_stats(
    State(app_state): State<Arc<AppState>>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let tracker = app_state.performance_tracker.read().await;
    let stats = tracker.get_performance_stats();
    Ok(ResponseJson(serde_json::to_value(stats).unwrap()))
}

// API Information Handler
async fn api_info() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "name": "Satisfactory Layout Tool HTTP API",
        "version": "2.0.0",
        "mode": if cfg!(feature = "tauri-mode") { "tauri-bridge" } else { "standalone" },
        "endpoints": {
            "health": "GET /health",
            "test": "GET /api/test_rust_connection",
            "geometry": {
                "distance_3d": "POST /api/calculate_distance_3d",
                "curve_control_point": "POST /api/calculate_curve_control_point", 
                "bezier_points": "POST /api/get_quadratic_bezier_points"
            },
            "spatial": {
                "query_buildings": "POST /api/spatial_query_buildings",
                "universal_query": "POST /api/universal_spatial_query"
            },
            "performance": {
                "stats": "GET /api/performance_stats"
            }
        }
    }))
}

// Create HTTP Router
pub fn create_router(app_state: Arc<AppState>) -> Router {
    Router::new()
        // Health and info
        .route("/", get(api_info))
        .route("/health", get(health_check))
        .route("/api/info", get(api_info))
        .route("/api/test_rust_connection", get(test_rust_connection))
        
        // Geometry operations
        .route("/api/calculate_distance_3d", post(calculate_distance_3d))
        .route("/api/calculate_curve_control_point", post(calculate_curve_control_point))
        .route("/api/get_quadratic_bezier_points", post(get_quadratic_bezier_points))
        
        // Spatial queries
        .route("/api/spatial_query_buildings", post(spatial_query_buildings))
        .route("/api/universal_spatial_query", post(universal_spatial_query))
        .route("/api/viewport_cull", post(viewport_cull_objects))
        
        // Performance
        .route("/api/performance_stats", get(get_performance_stats))
        
        .layer(
            ServiceBuilder::new()
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods(Any)
                        .allow_headers(Any)
                )
        )
        .with_state(app_state)
}

// Start HTTP Bridge Server (Tauri mode)
#[cfg(feature = "tauri-mode")]
pub async fn start_http_bridge(app_state: Arc<AppState>) -> Result<(), Box<dyn std::error::Error>> {
    let app = create_router(app_state);
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:5175").await?;
    log::info!("🌐 HTTP Bridge server running on http://127.0.0.1:5175");
    log::info!("🔗 Browser tab can now access Rust commands via HTTP");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}

// Start HTTP Bridge Server (Standalone mode)
#[cfg(feature = "standalone")]
pub async fn start_http_bridge_standalone(app_state: AppState) -> Result<(), Box<dyn std::error::Error>> {
    let app = create_router(Arc::new(app_state));
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:5175").await?;
    log::info!("🌐 Standalone HTTP server running on http://127.0.0.1:5175");
    log::info!("🔗 Browser can now access all Rust commands via HTTP");
    log::info!("📊 Open http://127.0.0.1:5175/health to verify server is running");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}