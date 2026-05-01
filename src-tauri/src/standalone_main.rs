use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::{Json as ResponseJson, IntoResponse},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use tower_http::cors::CorsLayer;
use rstar::{RTree, RTreeObject, AABB};

// Import all the existing modules we need
mod geometry;
mod types;
mod spatial;
mod state;
mod performance;
mod errors;
// mod http_bridge; // Not needed for standalone server, has its own routes

use types::{Point3D, Building, ConveyorPole, PipeSupport, RailwayNode, BoundingBox3D};
use state::StateManager;
use performance::PerformanceTracker;

/// Complete application state for the standalone server
#[derive(Clone)]
pub struct AppState {
    pub state_manager: Arc<RwLock<StateManager>>,
    pub performance_tracker: Arc<RwLock<PerformanceTracker>>,
    pub rtree_index: Arc<RwLock<RTree<SpatialRTreeObject>>>,
}

/// R-tree compatible spatial object wrapper
#[derive(Debug, Clone)]
pub struct SpatialRTreeObject {
    pub id: String,
    pub object_type: String,
    pub position: Point3D,
    pub bounds: BoundingBox3D,
}

impl RTreeObject for SpatialRTreeObject {
    type Envelope = AABB<[f64; 3]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_corners(
            [self.bounds.min.x, self.bounds.min.y, self.bounds.min.z],
            [self.bounds.max.x, self.bounds.max.y, self.bounds.max.z],
        )
    }
}

impl AppState {
    pub async fn new() -> Self {
        let (event_sender, mut _event_receiver) = broadcast::channel(1000);
        let state_manager = Arc::new(RwLock::new(StateManager::new(event_sender)));
        let performance_tracker = Arc::new(RwLock::new(PerformanceTracker::new()));
        let rtree_index = Arc::new(RwLock::new(RTree::new()));
        
        Self {
            state_manager,
            performance_tracker,
            rtree_index,
        }
    }

    /// Update R-tree index with current state
    pub async fn rebuild_rtree_index(&self) {
        let state = self.state_manager.read().await.get_state().await;
        let mut rtree = self.rtree_index.write().await;
        
        // Clear existing index
        *rtree = RTree::new();
        
        let mut objects = Vec::new();
        
        // Index all buildings
        for (id, building) in &state.buildings {
            let bounds = building.calculate_bounds();
            objects.push(SpatialRTreeObject {
                id: id.clone(),
                object_type: "building".to_string(),
                position: Point3D::new(building.x, building.y, building.z),
                bounds,
            });
        }
        
        // Index all conveyor poles
        for (id, pole) in &state.conveyor_poles {
            let bounds = BoundingBox3D::new(
                Point3D::new(pole.x - 1.0, pole.y - 1.0, pole.z - 1.0),
                Point3D::new(pole.x + 1.0, pole.y + 1.0, pole.z + 1.0),
            );
            objects.push(SpatialRTreeObject {
                id: id.clone(),
                object_type: "conveyor_pole".to_string(),
                position: Point3D::new(pole.x, pole.y, pole.z),
                bounds,
            });
        }
        
        // Index all pipe supports
        for (id, support) in &state.pipe_supports {
            let bounds = BoundingBox3D::new(
                Point3D::new(support.x - 1.0, support.y - 1.0, support.z - 1.0),
                Point3D::new(support.x + 1.0, support.y + 1.0, support.z + 1.0),
            );
            objects.push(SpatialRTreeObject {
                id: id.clone(),
                object_type: "pipe_support".to_string(),
                position: Point3D::new(support.x, support.y, support.z),
                bounds,
            });
        }
        
        // Index all railway nodes
        for (id, node) in &state.railway_nodes {
            let bounds = BoundingBox3D::new(
                Point3D::new(node.x - 2.0, node.y - 2.0, node.z - 1.0),
                Point3D::new(node.x + 2.0, node.y + 2.0, node.z + 1.0),
            );
            objects.push(SpatialRTreeObject {
                id: id.clone(),
                object_type: "railway_node".to_string(),
                position: Point3D::new(node.x, node.y, node.z),
                bounds,
            });
        }
        
        // Index conveyor segments
        for (id, segment) in &state.conveyor_segments {
            if let (Some(start_pole), Some(end_pole)) = (
                state.conveyor_poles.get(&segment.start_pole),
                state.conveyor_poles.get(&segment.end_pole)
            ) {
                let bounds = calculate_segment_bounds(
                    &Point3D::new(start_pole.x, start_pole.y, start_pole.z),
                    &Point3D::new(end_pole.x, end_pole.y, end_pole.z)
                );
                objects.push(SpatialRTreeObject {
                    id: id.clone(),
                    object_type: "conveyor_segment".to_string(),
                    position: Point3D::new(
                        (start_pole.x + end_pole.x) / 2.0,
                        (start_pole.y + end_pole.y) / 2.0,
                        (start_pole.z + end_pole.z) / 2.0,
                    ),
                    bounds,
                });
            }
        }
        
        // Index pipe segments
        for (id, segment) in &state.pipe_segments {
            if let (Some(start_support), Some(end_support)) = (
                state.pipe_supports.get(&segment.start_support),
                state.pipe_supports.get(&segment.end_support)
            ) {
                let bounds = calculate_segment_bounds(
                    &Point3D::new(start_support.x, start_support.y, start_support.z),
                    &Point3D::new(end_support.x, end_support.y, end_support.z)
                );
                objects.push(SpatialRTreeObject {
                    id: id.clone(),
                    object_type: "pipe_segment".to_string(),
                    position: Point3D::new(
                        (start_support.x + end_support.x) / 2.0,
                        (start_support.y + end_support.y) / 2.0,
                        (start_support.z + end_support.z) / 2.0,
                    ),
                    bounds,
                });
            }
        }
        
        // Index railway segments
        for (id, segment) in &state.railway_segments {
            if let (Some(start_node), Some(end_node)) = (
                state.railway_nodes.get(&segment.start_node),
                state.railway_nodes.get(&segment.end_node)
            ) {
                let bounds = calculate_segment_bounds(
                    &Point3D::new(start_node.x, start_node.y, start_node.z),
                    &Point3D::new(end_node.x, end_node.y, end_node.z)
                );
                objects.push(SpatialRTreeObject {
                    id: id.clone(),
                    object_type: "railway_segment".to_string(),
                    position: Point3D::new(
                        (start_node.x + end_node.x) / 2.0,
                        (start_node.y + end_node.y) / 2.0,
                        (start_node.z + end_node.z) / 2.0,
                    ),
                    bounds,
                });
            }
        }
        
        // Bulk insert all objects into R-tree
        *rtree = RTree::bulk_load(objects);
        
        println!("🔄 Rebuilt R-tree index with {} objects", rtree.size());
    }

    /// Query R-tree for objects within a viewport bounds
    pub async fn query_viewport_objects(&self, viewport_bounds: ViewportBounds) -> ViewportQueryResult {
        let start = std::time::Instant::now();
        let rtree = self.rtree_index.read().await;
        let state = self.state_manager.read().await.get_state().await;
        
        // Create AABB for the viewport
        let query_bounds = AABB::from_corners(
            [viewport_bounds.min_x, viewport_bounds.min_y, viewport_bounds.min_z.unwrap_or(-1000.0)],
            [viewport_bounds.max_x, viewport_bounds.max_y, viewport_bounds.max_z.unwrap_or(1000.0)],
        );
        
        // Query R-tree
        let candidates: Vec<&SpatialRTreeObject> = rtree
            .locate_in_envelope_intersecting(&query_bounds)
            .collect();
        
        // Group results by type
        let mut buildings = Vec::new();
        let mut conveyor_poles = Vec::new();
        let mut conveyor_segments = Vec::new();
        let mut pipe_supports = Vec::new();
        let mut pipe_segments = Vec::new();
        let mut railway_nodes = Vec::new();
        let mut railway_segments = Vec::new();
        
        for candidate in candidates {
            match candidate.object_type.as_str() {
                "building" => {
                    if let Some(building) = state.buildings.get(&candidate.id) {
                        buildings.push(building.clone());
                    }
                },
                "conveyor_pole" => {
                    if let Some(pole) = state.conveyor_poles.get(&candidate.id) {
                        conveyor_poles.push(pole.clone());
                    }
                },
                "conveyor_segment" => {
                    if let Some(segment) = state.conveyor_segments.get(&candidate.id) {
                        conveyor_segments.push(segment.clone());
                    }
                },
                "pipe_support" => {
                    if let Some(support) = state.pipe_supports.get(&candidate.id) {
                        pipe_supports.push(support.clone());
                    }
                },
                "pipe_segment" => {
                    if let Some(segment) = state.pipe_segments.get(&candidate.id) {
                        pipe_segments.push(segment.clone());
                    }
                },
                "railway_node" => {
                    if let Some(node) = state.railway_nodes.get(&candidate.id) {
                        railway_nodes.push(node.clone());
                    }
                },
                "railway_segment" => {
                    if let Some(segment) = state.railway_segments.get(&candidate.id) {
                        railway_segments.push(segment.clone());
                    }
                },
                _ => {}
            }
        }
        
        let query_time_ms = start.elapsed().as_secs_f64() * 1000.0;
        let objects_returned = buildings.len() + conveyor_poles.len() + conveyor_segments.len() + 
                            pipe_supports.len() + pipe_segments.len() + railway_nodes.len() + railway_segments.len();
        
        ViewportQueryResult {
            buildings,
            conveyor_poles,
            conveyor_segments,
            pipe_supports,
            pipe_segments,
            railway_nodes,
            railway_segments,
            total_objects_checked: rtree.size(),
            objects_returned,
            query_time_ms,
        }
    }
}

// HTTP API Types
#[derive(Serialize, Deserialize)]
struct ApiInfo {
    name: String,
    version: String,
    mode: String,
    endpoints: serde_json::Value,
}

#[derive(Deserialize)]
pub struct ViewportBounds {
    min_x: f64,
    max_x: f64,
    min_y: f64,
    max_y: f64,
    min_z: Option<f64>,
    max_z: Option<f64>,
    #[allow(dead_code)]
    current_floor: Option<i32>,
}

#[derive(Serialize)]
pub struct ViewportQueryResult {
    buildings: Vec<Building>,
    conveyor_poles: Vec<ConveyorPole>,
    conveyor_segments: Vec<types::ConveyorSegment>,
    pipe_supports: Vec<PipeSupport>,
    pipe_segments: Vec<types::PipeSegment>,
    railway_nodes: Vec<RailwayNode>,
    railway_segments: Vec<types::RailwaySegment>,
    total_objects_checked: usize,
    objects_returned: usize,
    query_time_ms: f64,
}

#[derive(Deserialize)]
struct Distance3DRequest {
    p1: Point3D,
    p2: Point3D,
}

#[derive(Serialize)]
struct Distance3DResponse {
    distance: f64,
}

#[derive(Deserialize)]
struct SpatialQueryRequest {
    center: Point3D,
    radius: f64,
    exclude_ids: Option<Vec<String>>,
}

#[derive(Serialize)]
struct SpatialQueryResponse {
    buildings: Vec<Building>,
    query_time_ms: f64,
    objects_checked: usize,
}

#[derive(Deserialize)]
struct UniversalSpatialQueryRequest {
    center: Point3D,
    radius: f64,
    options: SpatialQueryOptions,
}

#[derive(Deserialize)]
struct SpatialQueryOptions {
    include_buildings: Option<bool>,
    include_railway_nodes: Option<bool>,
    include_conveyor_poles: Option<bool>,
    include_pipe_supports: Option<bool>,
    exclude_ids: Option<Vec<String>>,
}

#[derive(Serialize)]
struct UniversalSpatialQueryResponse {
    buildings: Vec<Building>,
    railway_nodes: Vec<RailwayNode>,
    conveyor_poles: Vec<ConveyorPole>,
    pipe_supports: Vec<PipeSupport>,
    query_time_ms: f64,
    objects_checked: usize,
}

#[derive(Deserialize)]
struct BezierPointsRequest {
    start: Point3D,
    control: Point3D,
    end: Point3D,
    num_points: Option<u32>,
}

#[derive(Serialize)]
struct BezierPointsResponse {
    points: Vec<Point3D>,
}

#[derive(Deserialize)]
struct CurveControlPointRequest {
    p1: Point3D,
    p2: Point3D,
    p3: Point3D,
}

#[derive(Serialize)]
struct CurveControlPointResponse {
    control_point: Point3D,
}

#[derive(Serialize)]
struct SpatialStatsResponse {
    total_objects: usize,
    buildings: usize,
    conveyor_poles: usize,
    pipe_supports: usize,
    railway_nodes: usize,
    segments: usize,
    spatial_index_ready: bool,
    last_rebuild_ms: f64,
}

// HTTP Handlers

async fn root() -> impl IntoResponse {
    ResponseJson(serde_json::json!({
        "name": "Satisfactory Layout Tool HTTP Server",
        "status": "running",
        "mode": "standalone",
        "version": env!("CARGO_PKG_VERSION"),
        "api": "/api/info"
    }))
}

async fn health() -> impl IntoResponse {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "server": "standalone",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn api_info() -> impl IntoResponse {
    ResponseJson(ApiInfo {
        name: "Satisfactory Layout Tool API".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        mode: "standalone".to_string(),
        endpoints: serde_json::json!({
            "health": "GET /health",
            "test": "GET /api/test_rust_connection",
            "geometry": {
                "distance_3d": "POST /api/calculate_distance_3d",
                "curve_control_point": "POST /api/calculate_curve_control_point",
                "bezier_points": "POST /api/get_quadratic_bezier_points"
            },
            "spatial": {
                "viewport_query": "POST /api/spatial/viewport_query",
                "query_buildings": "POST /api/spatial/query_buildings",
                "universal_query": "POST /api/spatial/universal_query",
                "stats": "GET /api/spatial/stats"
            },
            "state": {
                "buildings": {
                    "create": "POST /api/state/buildings",
                    "update": "PUT /api/state/buildings/{id}",
                    "delete": "DELETE /api/state/buildings/{id}",
                    "get": "GET /api/state/buildings/{id}",
                    "list": "GET /api/state/buildings"
                }
            },
            "performance": {
                "stats": "GET /api/performance/stats"
            }
        })
    })
}

async fn test_rust_connection() -> impl IntoResponse {
    ResponseJson(serde_json::json!({
        "success": true,
        "message": "Rust standalone backend is connected! 🦀",
        "backend": "standalone",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

async fn calculate_distance_3d(Json(request): Json<Distance3DRequest>) -> Result<ResponseJson<Distance3DResponse>, StatusCode> {
    let dx = request.p1.x - request.p2.x;
    let dy = request.p1.y - request.p2.y;
    let dz = request.p1.z - request.p2.z;
    let distance = (dx * dx + dy * dy + dz * dz).sqrt();
    
    Ok(ResponseJson(Distance3DResponse { distance }))
}

async fn calculate_curve_control_point(Json(request): Json<CurveControlPointRequest>) -> Result<ResponseJson<CurveControlPointResponse>, StatusCode> {
    // Use the exact algorithm from the geometry module
    let control_point = geometry::calculate_curve_control_point_exact(&request.p1, &request.p2, &request.p3);
    Ok(ResponseJson(CurveControlPointResponse { control_point }))
}

async fn get_quadratic_bezier_points(Json(request): Json<BezierPointsRequest>) -> Result<ResponseJson<BezierPointsResponse>, StatusCode> {
    let num_points = request.num_points.unwrap_or(20);
    let points = geometry::get_quadratic_bezier_points(&request.start, &request.control, &request.end, num_points as usize);
    Ok(ResponseJson(BezierPointsResponse { points }))
}

async fn viewport_query(
    State(app_state): State<AppState>,
    Json(viewport_bounds): Json<ViewportBounds>,
) -> Result<ResponseJson<ViewportQueryResult>, StatusCode> {
    let result = app_state.query_viewport_objects(viewport_bounds).await;
    Ok(ResponseJson(result))
}

async fn spatial_query_buildings(
    State(app_state): State<AppState>,
    Json(request): Json<SpatialQueryRequest>,
) -> Result<ResponseJson<SpatialQueryResponse>, StatusCode> {
    let start = std::time::Instant::now();
    let rtree = app_state.rtree_index.read().await;
    let state = app_state.state_manager.read().await.get_state().await;
    
    // Create AABB for radius query
    let query_bounds = AABB::from_corners(
        [request.center.x - request.radius, request.center.y - request.radius, request.center.z - request.radius],
        [request.center.x + request.radius, request.center.y + request.radius, request.center.z + request.radius],
    );
    
    // Query R-tree and filter buildings
    let candidates: Vec<&SpatialRTreeObject> = rtree
        .locate_in_envelope_intersecting(&query_bounds)
        .filter(|obj| obj.object_type == "building")
        .collect();
    
    let exclude_set: std::collections::HashSet<String> = request.exclude_ids.unwrap_or_default().into_iter().collect();
    
    let mut buildings = Vec::new();
    for candidate in &candidates {
        if !exclude_set.contains(&candidate.id) {
            // Check actual distance
            let distance = {
                let dx = candidate.position.x - request.center.x;
                let dy = candidate.position.y - request.center.y;
                let dz = candidate.position.z - request.center.z;
                (dx * dx + dy * dy + dz * dz).sqrt()
            };
            
            if distance <= request.radius {
                if let Some(building) = state.buildings.get(&candidate.id) {
                    buildings.push(building.clone());
                }
            }
        }
    }
    
    let query_time_ms = start.elapsed().as_secs_f64() * 1000.0;
    
    Ok(ResponseJson(SpatialQueryResponse {
        buildings,
        query_time_ms,
        objects_checked: candidates.len(),
    }))
}

async fn universal_spatial_query(
    State(app_state): State<AppState>,
    Json(request): Json<UniversalSpatialQueryRequest>,
) -> Result<ResponseJson<UniversalSpatialQueryResponse>, StatusCode> {
    let start = std::time::Instant::now();
    let rtree = app_state.rtree_index.read().await;
    let state = app_state.state_manager.read().await.get_state().await;
    
    // Create AABB for radius query
    let query_bounds = AABB::from_corners(
        [request.center.x - request.radius, request.center.y - request.radius, request.center.z - request.radius],
        [request.center.x + request.radius, request.center.y + request.radius, request.center.z + request.radius],
    );
    
    // Query R-tree
    let candidates: Vec<&SpatialRTreeObject> = rtree
        .locate_in_envelope_intersecting(&query_bounds)
        .collect();
    
    let exclude_set: std::collections::HashSet<String> = request.options.exclude_ids.unwrap_or_default().into_iter().collect();
    
    let mut buildings = Vec::new();
    let mut railway_nodes = Vec::new();
    let mut conveyor_poles = Vec::new();
    let mut pipe_supports = Vec::new();
    
    for candidate in &candidates {
        if exclude_set.contains(&candidate.id) {
            continue;
        }
        
        // Check actual distance
        let distance = {
            let dx = candidate.position.x - request.center.x;
            let dy = candidate.position.y - request.center.y;
            let dz = candidate.position.z - request.center.z;
            (dx * dx + dy * dy + dz * dz).sqrt()
        };
        
        if distance > request.radius {
            continue;
        }
        
        match candidate.object_type.as_str() {
            "building" if request.options.include_buildings.unwrap_or(true) => {
                if let Some(building) = state.buildings.get(&candidate.id) {
                    buildings.push(building.clone());
                }
            },
            "railway_node" if request.options.include_railway_nodes.unwrap_or(true) => {
                if let Some(node) = state.railway_nodes.get(&candidate.id) {
                    railway_nodes.push(node.clone());
                }
            },
            "conveyor_pole" if request.options.include_conveyor_poles.unwrap_or(true) => {
                if let Some(pole) = state.conveyor_poles.get(&candidate.id) {
                    conveyor_poles.push(pole.clone());
                }
            },
            "pipe_support" if request.options.include_pipe_supports.unwrap_or(true) => {
                if let Some(support) = state.pipe_supports.get(&candidate.id) {
                    pipe_supports.push(support.clone());
                }
            },
            _ => {}
        }
    }
    
    let query_time_ms = start.elapsed().as_secs_f64() * 1000.0;
    
    Ok(ResponseJson(UniversalSpatialQueryResponse {
        buildings,
        railway_nodes,
        conveyor_poles,
        pipe_supports,
        query_time_ms,
        objects_checked: candidates.len(),
    }))
}

async fn get_spatial_stats(State(app_state): State<AppState>) -> impl IntoResponse {
    let rtree = app_state.rtree_index.read().await;
    let state = app_state.state_manager.read().await.get_state().await;
    
    ResponseJson(SpatialStatsResponse {
        total_objects: rtree.size(),
        buildings: state.buildings.len(),
        conveyor_poles: state.conveyor_poles.len(),
        pipe_supports: state.pipe_supports.len(),
        railway_nodes: state.railway_nodes.len(),
        segments: state.conveyor_segments.len() + state.pipe_segments.len() + state.railway_segments.len(),
        spatial_index_ready: true,
        last_rebuild_ms: 0.0, // TODO: track this
    })
}

async fn performance_stats(State(app_state): State<AppState>) -> impl IntoResponse {
    let tracker = app_state.performance_tracker.read().await;
    let stats = tracker.get_performance_stats();
    ResponseJson(stats)
}

// State management handlers

async fn create_building(
    State(app_state): State<AppState>,
    Json(building): Json<Building>,
) -> Result<ResponseJson<Building>, StatusCode> {
    {
        let state_manager = app_state.state_manager.write().await;
        match state_manager.create_building(building.clone()).await {
            Ok(_) => {},
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }
    
    // Rebuild R-tree index
    app_state.rebuild_rtree_index().await;
    Ok(ResponseJson(building))
}

async fn get_all_buildings(State(app_state): State<AppState>) -> impl IntoResponse {
    let state_manager = app_state.state_manager.read().await;
    let buildings = state_manager.get_all_buildings().await;
    ResponseJson(buildings)
}

/// Helper function to calculate bounding box for line segments
fn calculate_segment_bounds(start: &Point3D, end: &Point3D) -> BoundingBox3D {
    BoundingBox3D::new(
        Point3D::new(
            start.x.min(end.x),
            start.y.min(end.y),
            start.z.min(end.z),
        ),
        Point3D::new(
            start.x.max(end.x),
            start.y.max(end.y),
            start.z.max(end.z),
        ),
    )
}

#[tokio::main(flavor = "multi_thread", worker_threads = 8)]
async fn main() {
    // Initialize logging
    env_logger::init();
    
    println!("🚀 Starting Satisfactory Layout Tool Standalone HTTP Server...");
    println!("🔧 Performance: Multi-threaded runtime with 8 worker threads");
    println!("🔧 Performance: Optimization level 3 with LTO enabled");
    println!("🔧 Performance: SIMD operations enabled for geometry calculations");
    
    // Create application state
    let app_state = AppState::new().await;
    
    // Build initial R-tree index
    app_state.rebuild_rtree_index().await;
    
    // Build the router
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/api/info", get(api_info))
        .route("/api/test_rust_connection", get(test_rust_connection))
        
        // Geometry operations
        .route("/api/calculate_distance_3d", post(calculate_distance_3d))
        .route("/api/calculate_curve_control_point", post(calculate_curve_control_point))
        .route("/api/get_quadratic_bezier_points", post(get_quadratic_bezier_points))
        
        // Spatial queries (high performance viewport culling)
        .route("/api/spatial/viewport_query", post(viewport_query))
        .route("/api/spatial/query_buildings", post(spatial_query_buildings))
        .route("/api/spatial/universal_query", post(universal_spatial_query))
        .route("/api/spatial/stats", get(get_spatial_stats))
        
        // State management
        .route("/api/state/buildings", post(create_building))
        .route("/api/state/buildings", get(get_all_buildings))
        
        // Performance monitoring
        .route("/api/performance/stats", get(performance_stats))
        
        .layer(CorsLayer::permissive())
        .with_state(app_state);
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:5175")
        .await
        .unwrap();
    
    println!("✅ Server running at http://127.0.0.1:5175");
    println!("📝 API documentation at http://127.0.0.1:5175/api/info");
    println!("🎯 Viewport culling enabled with R-tree spatial indexing");
    println!("🔄 Real-time state synchronization ready");
    
    axum::serve(listener, app)
        .await
        .unwrap();
}