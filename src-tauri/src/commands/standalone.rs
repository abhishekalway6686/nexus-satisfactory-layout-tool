// Standalone Command Implementations
// HTTP-compatible versions of Tauri commands for standalone mode

use serde::{Deserialize, Serialize};

use crate::AppState;

// Re-export common types for HTTP API
pub use crate::types::{Point3D, Building, RailwayNode, ConveyorPole, PipeSupport};

/// Standalone geometry command implementations
pub mod geometry {
    use super::*;

    pub async fn calculate_distance_3d(p1: Point3D, p2: Point3D) -> Result<f64, String> {
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let dz = p1.z - p2.z;
        Ok((dx * dx + dy * dy + dz * dz).sqrt())
    }

    pub async fn calculate_distance_3d_squared(p1: Point3D, p2: Point3D) -> Result<f64, String> {
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let dz = p1.z - p2.z;
        Ok(dx * dx + dy * dy + dz * dz)
    }

    pub async fn calculate_distance_2d(p1: Point3D, p2: Point3D) -> Result<f64, String> {
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        Ok((dx * dx + dy * dy).sqrt())
    }

    pub async fn calculate_distance_2d_squared(p1: Point3D, p2: Point3D) -> Result<f64, String> {
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        Ok(dx * dx + dy * dy)
    }

    pub async fn generate_curve_control_point(p1: Point3D, p2: Point3D, p3: Point3D) -> Result<Point3D, String> {
        // Enhanced curve control point calculation
        let mid_x = (p1.x + p3.x) / 2.0;
        let mid_y = (p1.y + p3.y) / 2.0;
        let mid_z = (p1.z + p3.z) / 2.0;
        
        // Blend with p2 for better curve smoothing
        let control_x = (mid_x + p2.x) / 2.0;
        let control_y = (mid_y + p2.y) / 2.0;
        let control_z = (mid_z + p2.z) / 2.0;
        
        Ok(Point3D::new(control_x, control_y, control_z))
    }

    pub async fn get_quadratic_bezier_points(
        start: Point3D, 
        control: Point3D, 
        end: Point3D, 
        num_points: Option<u32>
    ) -> Result<Vec<Point3D>, String> {
        let segments = num_points.unwrap_or(20);
        let mut points = Vec::new();
        
        for i in 0..=segments {
            let t = i as f64 / segments as f64;
            let u = 1.0 - t;
            
            let x = u * u * start.x + 2.0 * u * t * control.x + t * t * end.x;
            let y = u * u * start.y + 2.0 * u * t * control.y + t * t * end.y;
            let z = u * u * start.z + 2.0 * u * t * control.z + t * t * end.z;
            
            points.push(Point3D::new(x, y, z));
        }
        
        Ok(points)
    }

    pub async fn should_create_turn(p1: Point3D, p2: Point3D, p3: Point3D) -> Result<bool, String> {
        // Calculate vectors
        let v1 = Point3D::new(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
        let v2 = Point3D::new(p3.x - p2.x, p3.y - p2.y, p3.z - p2.z);
        
        // Calculate dot product
        let dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        let len1 = (v1.x * v1.x + v1.y * v1.y + v1.z * v1.z).sqrt();
        let len2 = (v2.x * v2.x + v2.y * v2.y + v2.z * v2.z).sqrt();
        
        if len1 == 0.0 || len2 == 0.0 {
            return Ok(false);
        }
        
        let cos_angle = dot / (len1 * len2);
        // Clamp to [-1, 1] to avoid floating point errors
        let cos_angle = cos_angle.max(-1.0).min(1.0);
        let angle = cos_angle.acos();
        
        // Create turn if angle is greater than threshold (e.g., 15 degrees)
        Ok(angle > 0.26) // 15 degrees in radians
    }

    pub async fn find_line_intersection(
        line1_start: Point3D,
        line1_end: Point3D,
        line2_start: Point3D,
        line2_end: Point3D,
    ) -> Result<Option<Point3D>, String> {
        // 2D line intersection (ignoring z-coordinate for now)
        let x1 = line1_start.x;
        let y1 = line1_start.y;
        let x2 = line1_end.x;
        let y2 = line1_end.y;
        let x3 = line2_start.x;
        let y3 = line2_start.y;
        let x4 = line2_end.x;
        let y4 = line2_end.y;

        let denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        if denom.abs() < f64::EPSILON {
            return Ok(None); // Lines are parallel
        }

        let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        let u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if t >= 0.0 && t <= 1.0 && u >= 0.0 && u <= 1.0 {
            let x = x1 + t * (x2 - x1);
            let y = y1 + t * (y2 - y1);
            let z = line1_start.z + t * (line1_end.z - line1_start.z);
            Ok(Some(Point3D::new(x, y, z)))
        } else {
            Ok(None)
        }
    }
}

/// Standalone spatial command implementations
pub mod spatial {
    use super::*;

    pub async fn query_buildings_radius(
        app_state: &AppState,
        center: Point3D,
        radius: f64,
        exclude_ids: Option<Vec<String>>,
    ) -> Result<Vec<Building>, String> {
        let state_manager = app_state.state_manager.read().await;
        let buildings = state_manager.find_buildings_in_radius(&center, radius).await;
        
        let exclude_set: std::collections::HashSet<String> = exclude_ids
            .unwrap_or_default()
            .into_iter()
            .collect();
        
        let filtered_buildings = buildings
            .into_iter()
            .filter(|building| !exclude_set.contains(&building.id))
            .collect();
        
        Ok(filtered_buildings)
    }

    pub async fn universal_spatial_query(
        app_state: &AppState,
        center: Point3D,
        radius: f64,
        include_buildings: bool,
        _include_railway_nodes: bool,
        _include_conveyor_poles: bool,
        _include_pipe_supports: bool,
        exclude_ids: Option<Vec<String>>,
    ) -> Result<UniversalSpatialQueryResult, String> {
        let state_manager = app_state.state_manager.read().await;
        
        let exclude_set: std::collections::HashSet<String> = exclude_ids
            .unwrap_or_default()
            .into_iter()
            .collect();
        
        let mut result = UniversalSpatialQueryResult {
            buildings: Vec::new(),
            railway_nodes: Vec::new(),
            conveyor_poles: Vec::new(),
            pipe_supports: Vec::new(),
        };
        
        // Query buildings using state manager method
        if include_buildings {
            let buildings = state_manager.find_buildings_in_radius(&center, radius).await;
            result.buildings = buildings
                .into_iter()
                .filter(|building| !exclude_set.contains(&building.id))
                .collect();
        }

        // For now, we'll leave railway nodes, conveyor poles, and pipe supports empty
        // as they require more complex spatial queries that aren't implemented in the state manager yet
        // TODO: Implement these queries when needed
        
        Ok(result)
    }
}

/// Standalone building command implementations
pub mod buildings {
    use super::*;

    pub async fn get_all_buildings(app_state: &AppState) -> Result<Vec<Building>, String> {
        let state_manager = app_state.state_manager.read().await;
        let buildings_map = state_manager.get_all_buildings().await;
        
        Ok(buildings_map.values().cloned().collect())
    }

    pub async fn get_building(app_state: &AppState, building_id: String) -> Result<Option<Building>, String> {
        let state_manager = app_state.state_manager.read().await;
        
        Ok(state_manager.get_building(&building_id).await)
    }

    pub async fn create_building(
        app_state: &AppState,
        building_type: String,
        position: Point3D,
        rotation: f64,
        floor: i32,
    ) -> Result<Building, String> {
        let state_manager = app_state.state_manager.write().await;
        
        let mut building = Building::new(
            uuid::Uuid::new_v4().to_string(),
            building_type,
            position.x,
            position.y,
            floor,
        );
        
        // Set rotation (converting from f64 to u16)
        building.rotation = (rotation as u16) % 360;

        state_manager.create_building(building.clone()).await
            .map_err(|e| e.to_string())?;
        
        Ok(building)
    }
}

/// Standalone performance monitoring
pub mod performance {
    use super::*;
    use std::collections::HashMap;
    use crate::performance::PerformanceStats;

    pub async fn get_performance_stats(app_state: &AppState) -> Result<HashMap<String, PerformanceStats>, String> {
        let tracker = app_state.performance_tracker.read().await;
        Ok(tracker.get_performance_stats())
    }
}

// Result types for HTTP API
#[derive(Serialize, Deserialize)]
pub struct UniversalSpatialQueryResult {
    pub buildings: Vec<Building>,
    pub railway_nodes: Vec<RailwayNode>,
    pub conveyor_poles: Vec<ConveyorPole>,
    pub pipe_supports: Vec<PipeSupport>,
}