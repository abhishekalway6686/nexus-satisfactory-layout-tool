//! High-performance viewport system for eliminating canvas dragging lag
//! 
//! This module provides ultra-fast viewport management with:
//! - SIMD-accelerated coordinate transforms
//! - R-tree spatial indexing for O(log N) visibility queries
//! - Predictive caching for smooth panning
//! - Sub-millisecond response times for 10,000+ objects

use crate::types::Point3D;
use serde::{Deserialize, Serialize};
// use std::collections::HashMap; // Removed unused import
// use std::sync::{Arc, RwLock}; // Removed unused imports
use rstar::{RTreeObject, AABB};
// use wide::{f64x4, CmpLt, CmpGt}; // Removed unused imports
// use rayon::prelude::*; // Removed unused import

pub mod culling;
pub mod transform;
pub mod spatial;
pub mod cache;

pub use culling::ViewportCullingSystem;
pub use transform::TransformEngine;
pub use spatial::SpatialQueryEngine;
pub use cache::ViewportCache;

/// Viewport bounds in world coordinates
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ViewportBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub scale: f64,
    pub floor: i32,
}

impl ViewportBounds {
    pub fn new(x: f64, y: f64, width: f64, height: f64, scale: f64, floor: i32) -> Self {
        Self { x, y, width, height, scale, floor }
    }
    
    /// Check if a point is within the viewport bounds
    #[inline]
    pub fn contains_point(&self, point: &Point3D) -> bool {
        point.x >= self.x 
            && point.x <= self.x + self.width
            && point.y >= self.y
            && point.y <= self.y + self.height
    }
    
    /// Get expanded bounds for culling with margin
    pub fn expanded(&self, margin: f64) -> Self {
        Self {
            x: self.x - margin,
            y: self.y - margin,
            width: self.width + 2.0 * margin,
            height: self.height + 2.0 * margin,
            scale: self.scale,
            floor: self.floor,
        }
    }
    
    /// Convert to AABB for spatial queries
    pub fn to_aabb(&self) -> AABB<Point2D> {
        AABB::from_corners(
            Point2D::new(self.x, self.y),
            Point2D::new(self.x + self.width, self.y + self.height),
        )
    }
}

/// 2D point for spatial indexing (implements RTreeObject)
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

impl Point2D {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
    
    pub fn from_point3d(point: &Point3D) -> Self {
        Self { x: point.x, y: point.y }
    }
}


impl rstar::Point for Point2D {
    type Scalar = f64;
    const DIMENSIONS: usize = 2;
    
    fn generate(mut generator: impl FnMut(usize) -> Self::Scalar) -> Self {
        Self {
            x: generator(0),
            y: generator(1),
        }
    }
    
    fn nth(&self, index: usize) -> Self::Scalar {
        match index {
            0 => self.x,
            1 => self.y,
            _ => panic!("Point2D only has 2 dimensions"),
        }
    }
    
    fn nth_mut(&mut self, index: usize) -> &mut Self::Scalar {
        match index {
            0 => &mut self.x,
            1 => &mut self.y,
            _ => panic!("Point2D only has 2 dimensions"),
        }
    }
}

/// Canvas object types that can be spatially indexed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CanvasObjectType {
    Building,
    ConveyorBelt,
    Pipe,
    Railway,
    PowerLine,
    Foundation,
    Wall,
    Railing,
    StickyNote,
}

/// Spatial object for R-tree indexing
#[derive(Debug, Clone)]
pub struct SpatialObject {
    pub id: String,
    pub object_type: CanvasObjectType,
    pub bounds: AABB<Point2D>,
    pub floor: i32,
    pub data: ObjectData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ObjectData {
    Point(Point3D),
    Line { start: Point3D, end: Point3D },
    Rectangle { min: Point3D, max: Point3D },
    Curve { points: Vec<Point3D> },
}

impl RTreeObject for SpatialObject {
    type Envelope = AABB<Point2D>;
    
    fn envelope(&self) -> Self::Envelope {
        self.bounds
    }
}

/// Result of a spatial query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialQueryResult {
    pub id: String,
    pub object_type: CanvasObjectType,
    pub data: ObjectData,
    pub distance: Option<f64>,
}

/// Grid line for viewport rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridLine {
    pub start: Point3D,
    pub end: Point3D,
    pub is_major: bool,
}

/// Coordinate transformation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformResult {
    pub screen_x: f64,
    pub screen_y: f64,
}

/// Batch coordinate transformation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchTransformResult {
    pub transforms: Vec<TransformResult>,
}

/// Viewport update configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportConfig {
    pub culling_enabled: bool,
    pub predictive_cache_enabled: bool,
    pub max_objects_per_query: usize,
    pub spatial_index_cell_size: f64,
    pub cache_prediction_distance: f64,
}

impl Default for ViewportConfig {
    fn default() -> Self {
        Self {
            culling_enabled: true,
            predictive_cache_enabled: true,
            max_objects_per_query: 10000,
            spatial_index_cell_size: 50.0,
            cache_prediction_distance: 1000.0,
        }
    }
}

/// Performance metrics for the viewport system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportMetrics {
    pub objects_in_spatial_index: usize,
    pub cache_hit_rate: f64,
    pub cache_size: usize,
    pub last_query_time_ms: f64,
}

/// Main viewport system coordinating all subsystems
pub struct ViewportSystem {
    culling_system: ViewportCullingSystem,
    transform_engine: TransformEngine,
    spatial_engine: SpatialQueryEngine,
    cache: ViewportCache,
    config: ViewportConfig,
}

impl ViewportSystem {
    /// Create new viewport system
    pub fn new(config: ViewportConfig) -> Self {
        Self {
            culling_system: ViewportCullingSystem::new(config.max_objects_per_query),
            transform_engine: TransformEngine::new(),
            spatial_engine: SpatialQueryEngine::new(config.spatial_index_cell_size),
            cache: ViewportCache::new(config.cache_prediction_distance),
            config,
        }
    }
    
    /// Update viewport bounds and get visible objects
    pub fn update_viewport(&mut self, bounds: ViewportBounds) -> Vec<SpatialQueryResult> {
        // Check cache first
        if let Some(cached) = self.cache.get_cached_objects(&bounds) {
            return cached;
        }
        
        // Perform spatial query
        let visible_objects = self.culling_system.get_visible_objects(&bounds);
        
        // Cache results for future queries
        self.cache.cache_objects(&bounds, &visible_objects);
        
        // Predictive cache update
        if self.config.predictive_cache_enabled {
            self.cache.update_predictions(&bounds);
        }
        
        visible_objects
    }
    
    /// Add objects to spatial index
    pub fn add_objects(&mut self, objects: Vec<SpatialObject>) {
        self.spatial_engine.add_objects(objects.clone());
        self.culling_system.add_objects(objects);
        self.cache.invalidate_all();
    }
    
    /// Remove objects from spatial index
    pub fn remove_objects(&mut self, object_ids: &[String]) {
        self.spatial_engine.remove_objects(object_ids);
        self.culling_system.remove_objects(object_ids);
        self.cache.invalidate_by_ids(object_ids);
    }
    
    /// Update existing objects
    pub fn update_objects(&mut self, objects: Vec<SpatialObject>) {
        let object_ids: Vec<String> = objects.iter().map(|o| o.id.clone()).collect();
        self.remove_objects(&object_ids);
        self.add_objects(objects);
    }
    
    /// Get grid lines for viewport
    pub fn get_grid_lines(&self, bounds: &ViewportBounds, grid_size: f64) -> Vec<GridLine> {
        let mut lines = Vec::new();
        
        // Calculate grid bounds with padding
        let start_x = ((bounds.x / grid_size).floor() - 1.0) * grid_size;
        let end_x = (((bounds.x + bounds.width) / grid_size).ceil() + 1.0) * grid_size;
        let start_y = ((bounds.y / grid_size).floor() - 1.0) * grid_size;
        let end_y = (((bounds.y + bounds.height) / grid_size).ceil() + 1.0) * grid_size;
        
        // Generate vertical lines
        let mut x = start_x;
        while x <= end_x {
            let is_major = (x % (grid_size * 10.0)).abs() < 0.001;
            lines.push(GridLine {
                start: Point3D::new(x, start_y, bounds.floor as f64 * 4.0),
                end: Point3D::new(x, end_y, bounds.floor as f64 * 4.0),
                is_major,
            });
            x += grid_size;
        }
        
        // Generate horizontal lines
        let mut y = start_y;
        while y <= end_y {
            let is_major = (y % (grid_size * 10.0)).abs() < 0.001;
            lines.push(GridLine {
                start: Point3D::new(start_x, y, bounds.floor as f64 * 4.0),
                end: Point3D::new(end_x, y, bounds.floor as f64 * 4.0),
                is_major,
            });
            y += grid_size;
        }
        
        lines
    }
    
    /// Transform world coordinates to screen coordinates (batch)
    pub fn transform_to_screen_batch(
        &mut self, 
        points: &[Point3D], 
        bounds: &ViewportBounds
    ) -> BatchTransformResult {
        BatchTransformResult {
            transforms: self.transform_engine.world_to_screen_batch(points, bounds),
        }
    }
    
    /// Transform screen coordinates to world coordinates (batch)
    pub fn transform_to_world_batch(
        &mut self, 
        screen_points: &[(f64, f64)], 
        bounds: &ViewportBounds
    ) -> Vec<Point3D> {
        self.transform_engine.screen_to_world_batch(screen_points, bounds)
    }
    
    /// Find objects at screen point
    pub fn find_objects_at_point(
        &mut self, 
        screen_x: f64, 
        screen_y: f64, 
        bounds: &ViewportBounds,
        radius: f64
    ) -> Vec<SpatialQueryResult> {
        // Convert screen to world coordinates
        let world_point = self.transform_engine.screen_to_world(screen_x, screen_y, bounds);
        
        // Query spatial index
        self.spatial_engine.find_objects_near_point(&world_point, radius, bounds.floor)
    }
    
    /// Get performance metrics
    pub fn get_metrics(&self) -> ViewportMetrics {
        ViewportMetrics {
            objects_in_spatial_index: self.spatial_engine.object_count(),
            cache_hit_rate: self.cache.hit_rate(),
            cache_size: self.cache.size(),
            last_query_time_ms: self.culling_system.last_query_time(),
        }
    }
}

impl Default for ViewportSystem {
    fn default() -> Self {
        Self::new(ViewportConfig::default())
    }
}
