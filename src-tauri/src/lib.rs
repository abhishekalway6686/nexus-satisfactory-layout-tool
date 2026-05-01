// Core modules
pub mod types;
pub mod geometry;
pub mod spatial;
pub mod state;
pub mod commands;
pub mod compatibility;
pub mod serialization;
pub mod performance;
pub mod errors;
pub mod gpu;
#[cfg(feature = "tauri-mode")]
pub mod events;
pub mod http_bridge;

#[cfg(feature = "tauri-mode")]
pub mod viewport;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};

#[cfg(feature = "tauri-mode")]
use tauri::{Manager, State, AppHandle};

use crate::state::{StateManager, LayoutEvent};
use crate::spatial::rtree_spatial_index::OptimizedSpatialIndexManager;

#[cfg(feature = "tauri-mode")]
use crate::events::EventSyncManager;

/// Main application state shared across all commands
#[derive(Clone)]
pub struct AppState {
    pub state_manager: Arc<RwLock<StateManager>>,
    pub performance_tracker: Arc<RwLock<performance::PerformanceTracker>>,
    pub optimized_spatial_index: Arc<RwLock<OptimizedSpatialIndexManager>>,
    #[cfg(feature = "tauri-mode")]
    pub event_sync: Arc<EventSyncManager>,
}

impl AppState {
    #[cfg(feature = "tauri-mode")]
    pub fn new(app_handle: AppHandle, event_sender: broadcast::Sender<LayoutEvent>) -> Self {
        let state_manager = Arc::new(RwLock::new(StateManager::new(event_sender)));
        let event_sync = Arc::new(EventSyncManager::new(app_handle));
        
        Self {
            state_manager,
            performance_tracker: Arc::new(RwLock::new(performance::PerformanceTracker::new())),
            optimized_spatial_index: Arc::new(RwLock::new(OptimizedSpatialIndexManager::new())),
            event_sync,
        }
    }
    
    #[cfg(all(feature = "standalone", not(feature = "tauri-mode")))]
    pub fn new_standalone(event_sender: broadcast::Sender<LayoutEvent>) -> Self {
        let state_manager = Arc::new(RwLock::new(StateManager::new(event_sender)));
        
        Self {
            state_manager,
            optimized_spatial_index: Arc::new(RwLock::new(OptimizedSpatialIndexManager::new())),
            performance_tracker: Arc::new(RwLock::new(performance::PerformanceTracker::new())),
        }
    }
}

// Test command to verify Rust backend is working
#[cfg(feature = "tauri-mode")]
#[tauri::command]
async fn test_rust_connection() -> Result<String, String> {
    Ok("Rust backend connected successfully! 🦀".to_string())
}

#[cfg(feature = "tauri-mode")]
#[tauri::command]
async fn get_performance_stats(
    state: State<'_, AppState>,
) -> Result<std::collections::HashMap<String, performance::PerformanceStats>, String> {
    let tracker = state.performance_tracker.read().await;
    Ok(tracker.get_performance_stats())
}

#[cfg(feature = "tauri-mode")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // Test commands
            test_rust_connection,
            get_performance_stats,
            
            // Geometric operations
            commands::geometry::calculate_distance_3d,
            commands::geometry::calculate_distance_3d_squared,
            commands::geometry::calculate_distance_2d,
            commands::geometry::calculate_distance_2d_squared,
            commands::geometry::project_point_on_line,
            commands::geometry::calculate_distances_bulk,
            commands::geometry::calculate_distances_2d_bulk,
            commands::geometry::calculate_distances_2d_squared_bulk,
            commands::geometry::calculate_distances_3d_squared_bulk,
            commands::geometry::generate_curve_control_point,
            commands::geometry::interpolate_bezier_curve,
            commands::geometry::calculate_bezier_length,
            commands::geometry::should_create_turn,
            commands::geometry::find_line_intersection,
            commands::geometry::merge_line_segments,
            
            // NEW: High-performance curve calculation commands
            commands::geometry::should_create_turn_exact,
            commands::geometry::calculate_curve_control_point_exact,
            commands::geometry::get_quadratic_bezier_points,
            commands::geometry::split_bezier_at_t,
            
            // NEW: Railway snapping optimization commands
            commands::geometry::calculate_railway_node_distances,
            commands::geometry::calculate_railway_segment_snaps,
            commands::geometry::detect_railway_snap_target,
            
            // NEW: Intersection logic migration commands (targeting 30-100x improvement)
            commands::geometry::lines_intersect_rust,
            commands::geometry::approximate_bezier_rust,
            commands::geometry::find_polyline_intersections_rust,
            commands::geometry::is_right_triangle_pattern_rust,
            commands::geometry::bulk_polyline_intersections,
            commands::geometry::railway_segment_to_polyline,
            
            // NEW: High-performance railway intersection optimization (TEMPORARILY DISABLED)
            
            // Building operations
            commands::buildings::create_building,
            commands::buildings::update_building_position,
            commands::buildings::update_building_rotation,
            commands::buildings::delete_building,
            commands::buildings::get_building,
            commands::buildings::get_all_buildings,
            commands::buildings::batch_create_buildings,
            commands::buildings::batch_update_buildings,
            commands::buildings::batch_delete_buildings,
            commands::buildings::undo,
            commands::buildings::redo,
            
            // High-performance spatial queries
            commands::spatial::bulk_spatial_query_buildings,
            commands::spatial::query_buildings_radius,
            commands::spatial::query_railway_nodes_optimized,
            commands::spatial::bulk_query_railway_nodes,
            commands::spatial::universal_spatial_query,
            commands::spatial::get_spatial_stats,
            commands::spatial::benchmark_spatial_performance,
            commands::spatial::rebuild_spatial_index,
            
            // NEW: Ultra-high-performance Rust spatial queries (10x faster)
            commands::spatial::rust_spatial_query_buildings,
            commands::spatial::rust_universal_spatial_query,
            commands::spatial::rust_bulk_spatial_query,
            commands::spatial::rust_spatial_index_stats,
            commands::spatial::rust_query_railway_nodes_optimized,
            commands::spatial::adaptive_spatial_query,
            
            // Legacy spatial queries (maintained for compatibility)
            commands::spatial::find_buildings_in_radius,
            commands::spatial::find_nearest_building,
            commands::spatial::find_buildings_in_bounds,
            
            // Infrastructure operations
            commands::infrastructure::create_conveyor_belt,
            commands::infrastructure::update_conveyor_belt,
            commands::infrastructure::delete_conveyor_belt,
            commands::infrastructure::create_pipeline,
            commands::infrastructure::update_pipeline,
            commands::infrastructure::delete_pipeline,
            commands::infrastructure::create_railway,
            commands::infrastructure::update_railway,
            commands::infrastructure::delete_railway,
            commands::infrastructure::merge_infrastructure_segments,
            
            // Serialization
            commands::serialization::save_layout,
            commands::serialization::load_layout,
            commands::serialization::export_to_json,
            commands::serialization::import_from_json,
            commands::serialization::auto_save,
            commands::serialization::list_saves,
            
            // Benchmark commands
            commands::benchmark::benchmark_calculate_distance_3d,
            commands::benchmark::benchmark_calculate_distances_bulk,
            commands::benchmark::generate_smooth_path,
            commands::benchmark::process_points,
            commands::benchmark::get_memory_usage,
            commands::benchmark::clear_all_data,
            commands::benchmark::benchmark_get_performance_stats,
            commands::benchmark::run_geometric_benchmark,
            commands::benchmark::run_spatial_benchmark,
            
            // Synchronization commands
            events::verify_state_checksum,
            // High-performance viewport commands
            commands::viewport::init_viewport_system,
            commands::viewport::update_viewport_bounds,
            commands::viewport::get_viewport_metrics,
            
            // GPU-accelerated commands with automatic fallback
            commands::geometry::calculate_distances_bulk_gpu,
            commands::geometry::generate_bezier_curves_bulk_gpu,
            commands::geometry::find_line_intersections_bulk_gpu,
            commands::geometry::spatial_query_gpu,
            commands::geometry::get_gpu_status,
            commands::geometry::run_gpu_benchmark,
            
            // State synchronization commands
            events::request_state_recovery,
            events::force_state_sync,
        ])
        .setup(|app| {
            // Initialize app state with app handle
            let app_handle = app.handle();
            
            // Create the broadcast channel inside the async runtime
            let (event_sender, mut event_receiver) = broadcast::channel(1000);
            let app_state = AppState::new(app_handle.clone(), event_sender.clone());
            
            // Setup event forwarding from state manager to event sync
            let event_sync_for_forwarding = app_state.event_sync.clone();
            tauri::async_runtime::spawn(async move {
                while let Ok(event) = event_receiver.recv().await {
                    let _ = event_sync_for_forwarding.queue_event(event).await;
                }
            });
            
            // Start event batching service
            let event_sync = app_state.event_sync.clone();
            tauri::async_runtime::spawn(async move {
                event_sync.start_batching_service().await;
            });
            
            // Start HTTP Bridge for browser tab access
            let app_state_for_bridge = Arc::new(app_state.clone());
            tauri::async_runtime::spawn(async move {
                if let Err(e) = http_bridge::start_http_bridge(app_state_for_bridge).await {
                    log::error!("Failed to start HTTP bridge: {}", e);
                } else {
                    log::info!("HTTP Bridge started successfully");
                }
            });
            
            // Manage state
            app.manage(app_state);
            
            // Initialize viewport state
            let viewport_system = crate::viewport::ViewportSystem::default();
            app.manage(crate::commands::viewport::ViewportState(std::sync::Mutex::new(viewport_system)));
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            
            log::info!("Satisfactory Layout Tool started with Rust backend and event synchronization");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
