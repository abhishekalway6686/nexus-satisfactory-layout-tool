use tauri::State;
use crate::{AppState, types::Point3D};
use std::time::Instant;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    #[serde(rename = "totalBytes")]
    pub total_bytes: usize,
}

#[tauri::command]
pub async fn benchmark_calculate_distance_3d(p1: Point3D, p2: Point3D) -> Result<f64, String> {
    Ok(crate::geometry::distance_3d(&p1, &p2))
}

#[tauri::command]
pub async fn benchmark_calculate_distances_bulk(
    points_a: Vec<Point3D>,
    points_b: Vec<Point3D>,
) -> Result<Vec<f64>, String> {
    if points_a.len() != points_b.len() {
        return Err("Point arrays must have the same length".to_string());
    }
    
    Ok(crate::geometry::calculate_distances_bulk_simd(&points_a, &points_b))
}

#[tauri::command]
pub async fn generate_smooth_path(segments: Vec<Point3D>) -> Result<Vec<Point3D>, String> {
    if segments.len() < 2 {
        return Ok(segments);
    }
    
    let mut smooth_path = Vec::new();
    
    for i in 0..segments.len() - 1 {
        let start = &segments[i];
        let end = &segments[i + 1];
        
        smooth_path.push(*start);
        
        // Generate control point for curve
        if let Some(control) = crate::geometry::generate_curve_control_point(start, end, 0.2) {
            // Sample the curve
            for t in 1..10 {
                let t = t as f64 / 10.0;
                let point = crate::geometry::interpolate_bezier(start, end, &control, t);
                smooth_path.push(point);
            }
        }
        
        if i == segments.len() - 2 {
            smooth_path.push(*end);
        }
    }
    
    Ok(smooth_path)
}

#[tauri::command]
pub async fn process_points(points: Vec<Point3D>) -> Result<Vec<Point3D>, String> {
    // Simulate processing - double all coordinates
    Ok(points.into_iter()
        .map(|p| Point3D::new(p.x * 2.0, p.y * 2.0, p.z * 2.0))
        .collect())
}

#[tauri::command]
pub async fn get_memory_usage(state: State<'_, AppState>) -> Result<MemoryStats, String> {
    // Estimate memory usage based on stored data
    let state_manager = state.state_manager.read().await;
    let state_data = state_manager.get_state().await;
    
    // Rough estimates (in bytes)
    let building_size = 200; // Building struct with connections
    let conveyor_size = 100; // ConveyorBelt struct with segments
    let pipeline_size = 100; // Pipeline struct
    let railway_size = 150; // Railway struct with stations
    let note_size = 150; // StickyNote struct with text
    
    let total_bytes = 
        state_data.buildings.len() * building_size +
        state_data.conveyor_belts.len() * conveyor_size +
        state_data.pipelines.len() * pipeline_size +
        state_data.railways.len() * railway_size +
        state_data.sticky_notes.len() * note_size;
    
    Ok(MemoryStats { total_bytes })
}

#[tauri::command]
pub async fn clear_all_data(state: State<'_, AppState>) -> Result<(), String> {
    // Clear all data from state manager
    let empty_state = crate::state::LayoutState::default();
    let state_manager = state.state_manager.read().await;
    state_manager.update_state(empty_state).await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn benchmark_get_performance_stats(state: State<'_, AppState>) -> Result<std::collections::HashMap<String, crate::performance::PerformanceStats>, String> {
    let stats = state.performance_tracker.read().await.get_performance_stats();
    Ok(stats)
}

#[tauri::command]
pub async fn run_geometric_benchmark(
    state: State<'_, AppState>,
    iterations: usize,
) -> Result<f64, String> {
    let mut perf_tracker = state.performance_tracker.write().await;
    
    // Generate test data
    let mut points_a = Vec::new();
    let mut points_b = Vec::new();
    
    for i in 0..1000 {
        points_a.push(Point3D::new(i as f64, 0.0, 0.0));
        points_b.push(Point3D::new(i as f64 + 3.0, 4.0, 0.0));
    }
    
    // Run benchmark
    let start = Instant::now();
    
    for _ in 0..iterations {
        let _distances = crate::geometry::calculate_distances_bulk_simd(&points_a, &points_b);
    }
    
    let duration = start.elapsed();
    let avg_ms = duration.as_millis() as f64 / iterations as f64;
    
    perf_tracker.record_timing("geometric_benchmark", avg_ms as u64);
    
    Ok(avg_ms)
}

#[tauri::command]
pub async fn run_spatial_benchmark(
    state: State<'_, AppState>,
    num_buildings: usize,
    iterations: usize,
) -> Result<f64, String> {
    let mut perf_tracker = state.performance_tracker.write().await;
    
    // Create test buildings
    for i in 0..num_buildings {
        let building = crate::types::Building {
            id: format!("bench-{}", i),
            building_type: "constructor".to_string(),
            x: (i % 100) as f64 * 10.0,
            y: (i / 100) as f64 * 10.0,
            z: 0.0,
            floor: 0,
            rotation: 0,
            connection_points: vec![],
            railway_points: None,
            text: None,
            width: None,
            height: None,
            material: None,
        };
        
        let state_manager = state.state_manager.read().await;
        state_manager.create_building(building).await
            .map_err(|e| e.to_string())?;
    }
    
    // Run benchmark
    let test_point = Point3D::new(500.0, 500.0, 0.0);
    let radius = 100.0;
    
    let start = Instant::now();
    
    for _ in 0..iterations {
        let state_manager = state.state_manager.read().await;
        let _results = state_manager.find_buildings_in_radius(&test_point, radius).await;
    }
    
    let duration = start.elapsed();
    let avg_ms = duration.as_millis() as f64 / iterations as f64;
    
    perf_tracker.record_timing("spatial_benchmark", avg_ms as u64);
    
    // Cleanup
    let state_manager = state.state_manager.read().await;
    state_manager.update_state(crate::state::LayoutState::default()).await
        .map_err(|e| e.to_string())?;
    
    Ok(avg_ms)
}