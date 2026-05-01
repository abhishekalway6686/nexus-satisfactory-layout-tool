//! High-Performance R-tree Spatial Index System
//!
//! This module provides an optimized spatial indexing system using the rstar crate
//! for efficient viewport culling with 10,000+ objects. It implements viewport
//! culling logic that returns only visible objects with comprehensive performance metrics.

// Allow dead code - library functions for different build targets
#![allow(dead_code)]

use std::collections::{HashMap, HashSet};
use std::time::Instant;
use rstar::{RTree, RTreeObject, AABB, PointDistance};
use serde::{Serialize, Deserialize};
use rayon::prelude::*;

use crate::types::{Point3D, BoundingBox3D, Building, RailwayNode};
use super::{SpatialObject, SpatialIndexManager};
use super::SpatialEntity;

// Configuration constants for tombstone system
const TOMBSTONE_REBUILD_THRESHOLD: usize = 100; // Rebuild when tombstones exceed this count
const TOMBSTONE_RATIO_THRESHOLD: f64 = 0.1; // Rebuild when tombstones > 10% of total objects


/// Viewport bounds for culling queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportBounds {
    pub left: f64,
    pub right: f64,
    pub top: f64,
    pub bottom: f64,
    pub z_level: f64,
    pub z_range: f64, // Additional z-range for 3D culling
}

impl ViewportBounds {
    pub fn new(left: f64, right: f64, top: f64, bottom: f64, z_level: f64, z_range: f64) -> Self {
        Self { left, right, top, bottom, z_level, z_range }
    }
    
    pub fn to_aabb(&self) -> AABB<[f64; 3]> {
        AABB::from_corners(
            [self.left, self.top, self.z_level - self.z_range],
            [self.right, self.bottom, self.z_level + self.z_range],
        )
    }
    
    pub fn contains_point(&self, point: &Point3D) -> bool {
        point.x >= self.left && 
        point.x <= self.right && 
        point.y >= self.top && 
        point.y <= self.bottom &&
        (point.z - self.z_level).abs() <= self.z_range
    }
}


/// Spatial object wrapper that implements RTreeObject for rstar integration
#[derive(Debug, Clone)]
pub struct SpatialObjectWrapper {
    pub object: SpatialObject,
    pub bounds: BoundingBox3D,
    pub center: [f64; 3],
}

impl SpatialObjectWrapper {
    pub fn new(object: SpatialObject, bounds: BoundingBox3D) -> Self {
        let center_point = bounds.center();
        Self {
            object,
            bounds,
            center: [center_point.x, center_point.y, center_point.z],
        }
    }
}

impl RTreeObject for SpatialObjectWrapper {
    type Envelope = AABB<[f64; 3]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_corners(
            [self.bounds.min.x, self.bounds.min.y, self.bounds.min.z],
            [self.bounds.max.x, self.bounds.max.y, self.bounds.max.z],
        )
    }
}

impl PointDistance for SpatialObjectWrapper {
    fn distance_2(&self, point: &[f64; 3]) -> f64 {
        let dx = self.center[0] - point[0];
        let dy = self.center[1] - point[1]; 
        let dz = self.center[2] - point[2];
        dx * dx + dy * dy + dz * dz
    }
}

/// Performance metrics for spatial operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialQueryMetrics {
    pub query_time_ms: f64,
    pub objects_checked: usize,
    pub objects_returned: usize,
    pub viewport_area: f64,
    pub culling_ratio: f64, // Percentage of objects culled
}

/// Viewport culling result with performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportCullingResult {
    pub objects: Vec<SpatialObject>,
    pub metrics: SpatialQueryMetrics,
}
/// Spatial object data for HTTP responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialObjectData {
    pub id: String,
    pub object_type: String,
}


/// High-performance R-tree based spatial index using the rstar crate
/// Optimized for viewport culling with 10,000+ objects
///
/// Uses a tombstone system for O(1) deletions instead of O(n log n) tree rebuilds.
/// Tombstoned objects are filtered from query results and the tree is rebuilt
/// lazily when the tombstone count exceeds thresholds.
#[derive(Debug)]
pub struct HighPerformanceSpatialIndex {
    rtree: RTree<SpatialObjectWrapper>,
    object_count: usize,
    /// Set of object IDs marked for deletion (tombstones)
    /// Using tombstones avoids expensive O(n log n) tree rebuilds on each delete
    tombstones: HashSet<String>,
    /// Flag indicating the tree needs cleanup (tombstone ratio exceeded threshold)
    needs_rebuild: bool,
}

impl HighPerformanceSpatialIndex {
    pub fn new() -> Self {
        Self {
            rtree: RTree::new(),
            object_count: 0,
            tombstones: HashSet::new(),
            needs_rebuild: false,
        }
    }

    /// Bulk insert objects for optimal tree construction
    pub fn bulk_insert(&mut self, objects: Vec<(SpatialObject, BoundingBox3D)>) {
        let start_time = Instant::now();

        let wrappers: Vec<SpatialObjectWrapper> = objects.into_iter()
            .map(|(obj, bounds)| SpatialObjectWrapper::new(obj, bounds))
            .collect();

        self.object_count = wrappers.len();
        self.rtree = RTree::bulk_load(wrappers);
        // Clear tombstones on bulk insert
        self.tombstones.clear();
        self.needs_rebuild = false;

        log::info!("Bulk loaded {} objects in R-tree in {:.2}ms",
            self.object_count, start_time.elapsed().as_secs_f64() * 1000.0);
    }

    /// Insert a single object
    pub fn insert(&mut self, object: SpatialObject, bounds: BoundingBox3D) {
        let object_id = object.get_id().to_string();

        // If this object was previously tombstoned, remove from tombstones
        self.tombstones.remove(&object_id);

        let wrapper = SpatialObjectWrapper::new(object, bounds);
        self.rtree.insert(wrapper);
        self.object_count += 1;
    }

    /// Remove object by ID using O(1) tombstone marking
    ///
    /// Instead of O(n log n) tree rebuild, we mark the object as deleted.
    /// Query operations filter out tombstoned objects.
    /// The tree is rebuilt lazily when tombstone ratio exceeds threshold.
    pub fn remove(&mut self, object_id: &str) -> bool {
        // Check if object exists (not already tombstoned)
        if self.tombstones.contains(object_id) {
            return false; // Already deleted
        }

        // Mark as tombstone - O(1) operation
        self.tombstones.insert(object_id.to_string());
        self.object_count = self.object_count.saturating_sub(1);

        // Check if we need to trigger a rebuild
        self.check_rebuild_threshold();

        true
    }

    /// Check if tombstone count exceeds threshold and mark for rebuild
    fn check_rebuild_threshold(&mut self) {
        let tombstone_count = self.tombstones.len();
        let total_in_tree = self.rtree.size();

        // Trigger rebuild if:
        // 1. Tombstone count exceeds absolute threshold, OR
        // 2. Tombstone ratio exceeds percentage threshold
        if tombstone_count >= TOMBSTONE_REBUILD_THRESHOLD ||
           (total_in_tree > 0 && (tombstone_count as f64 / total_in_tree as f64) > TOMBSTONE_RATIO_THRESHOLD) {
            self.needs_rebuild = true;
        }
    }

    /// Perform deferred cleanup of tombstoned objects
    /// Call this during idle time or when needs_rebuild is true
    pub fn cleanup_tombstones(&mut self) {
        if self.tombstones.is_empty() {
            self.needs_rebuild = false;
            return;
        }

        let start_time = Instant::now();
        let tombstone_count = self.tombstones.len();

        // Drain and filter in one pass
        let objects: Vec<_> = self.rtree.drain()
            .filter(|wrapper| !self.tombstones.contains(wrapper.object.get_id()))
            .collect();

        // Rebuild tree without tombstoned objects
        self.rtree = RTree::bulk_load(objects);
        self.tombstones.clear();
        self.needs_rebuild = false;

        log::info!("Cleaned up {} tombstones in R-tree in {:.2}ms",
            tombstone_count, start_time.elapsed().as_secs_f64() * 1000.0);
    }

    /// Check if object is tombstoned (deleted)
    #[inline]
    fn is_tombstoned(&self, object_id: &str) -> bool {
        self.tombstones.contains(object_id)
    }

    /// Get whether a rebuild is needed
    pub fn needs_rebuild(&self) -> bool {
        self.needs_rebuild
    }

    /// Get tombstone count for diagnostics
    pub fn tombstone_count(&self) -> usize {
        self.tombstones.len()
    }
    
    /// High-performance viewport culling - returns only objects within viewport bounds
    /// Filters out tombstoned (deleted) objects from results
    pub fn viewport_cull(&self, viewport: &ViewportBounds) -> ViewportCullingResult {
        let start_time = Instant::now();
        let viewport_aabb = viewport.to_aabb();

        // Use rstar's locate_in_envelope for efficient spatial query
        // Filter out tombstoned objects inline for best performance
        let results: Vec<_> = self.rtree
            .locate_in_envelope(&viewport_aabb)
            .filter(|wrapper| !self.is_tombstoned(wrapper.object.get_id()))
            .map(|wrapper| wrapper.object.clone())
            .collect();

        let query_time_ms = start_time.elapsed().as_secs_f64() * 1000.0;
        let objects_returned = results.len();
        let culling_ratio = if self.object_count > 0 {
            (self.object_count - objects_returned) as f64 / self.object_count as f64
        } else {
            0.0
        };

        let viewport_area = (viewport.right - viewport.left) * (viewport.bottom - viewport.top);

        ViewportCullingResult {
            objects: results,
            metrics: SpatialQueryMetrics {
                query_time_ms,
                objects_checked: self.object_count,
                objects_returned,
                viewport_area,
                culling_ratio,
            },
        }
    }

    /// Fast radius query using rstar's nearest neighbor optimization
    /// Filters out tombstoned (deleted) objects from results
    pub fn query_radius(&self, center: &Point3D, radius: f64) -> Vec<SpatialObject> {
        let point = [center.x, center.y, center.z];
        let radius_squared = radius * radius;

        self.rtree
            .locate_within_distance(point, radius_squared)
            .filter(|wrapper| !self.is_tombstoned(wrapper.object.get_id()))
            .map(|wrapper| wrapper.object.clone())
            .collect()
    }

    /// Find nearest N objects to a point
    /// Filters out tombstoned (deleted) objects from results
    pub fn find_nearest(&self, point: &Point3D, count: usize) -> Vec<(SpatialObject, f64)> {
        let query_point = [point.x, point.y, point.z];

        self.rtree
            .nearest_neighbor_iter(&query_point)
            .filter(|wrapper| !self.is_tombstoned(wrapper.object.get_id()))
            .take(count)
            .map(|wrapper| {
                let distance = wrapper.distance_2(&query_point).sqrt();
                (wrapper.object.clone(), distance)
            })
            .collect()
    }

    /// Efficient rectangular bounds query
    /// Filters out tombstoned (deleted) objects from results
    pub fn query_bounds(&self, bounds: &BoundingBox3D) -> Vec<SpatialObject> {
        let aabb = AABB::from_corners(
            [bounds.min.x, bounds.min.y, bounds.min.z],
            [bounds.max.x, bounds.max.y, bounds.max.z],
        );

        self.rtree
            .locate_in_envelope(&aabb)
            .filter(|wrapper| !self.is_tombstoned(wrapper.object.get_id()))
            .map(|wrapper| wrapper.object.clone())
            .collect()
    }
    
    /// Parallel viewport culling for multiple viewports (useful for multi-window applications)
    pub fn parallel_viewport_cull(&self, viewports: &[ViewportBounds]) -> Vec<ViewportCullingResult> {
        viewports
            .par_iter()
            .map(|viewport| self.viewport_cull(viewport))
            .collect()
    }
    
    /// Get spatial index statistics
    pub fn get_stats(&self) -> SpatialIndexStats {
        // RTree doesn't expose depth directly, estimate based on object count
        let estimated_depth = if self.object_count == 0 {
            0
        } else {
            (self.object_count as f64).log2().ceil() as usize
        };

        SpatialIndexStats {
            total_objects: self.object_count,
            tree_depth: estimated_depth,
            memory_usage_estimate: self.object_count * std::mem::size_of::<SpatialObjectWrapper>(),
            tombstone_count: self.tombstones.len(),
            needs_rebuild: self.needs_rebuild,
        }
    }

    /// Clear all objects from the index
    pub fn clear(&mut self) {
        self.rtree = RTree::new();
        self.object_count = 0;
        self.tombstones.clear();
        self.needs_rebuild = false;
    }

    pub fn object_count(&self) -> usize {
        self.object_count
    }

    /// Get the actual number of objects in the tree (including tombstoned)
    pub fn tree_size(&self) -> usize {
        self.rtree.size()
    }
}

/// Statistics about the spatial index
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialIndexStats {
    pub total_objects: usize,
    pub tree_depth: usize,
    pub memory_usage_estimate: usize,
    /// Number of tombstoned (deleted but not yet cleaned up) objects
    pub tombstone_count: usize,
    /// Whether the index needs a rebuild due to high tombstone ratio
    pub needs_rebuild: bool,
}


/// Comprehensive spatial index manager with R-tree optimization
#[derive(Debug)]
pub struct OptimizedSpatialIndexManager {
    // High-performance R-tree for all spatial objects
    main_index: HighPerformanceSpatialIndex,
    
    // Type-specific indices for specialized queries
    buildings_index: HighPerformanceSpatialIndex,
    railway_nodes_index: HighPerformanceSpatialIndex,
    conveyor_poles_index: HighPerformanceSpatialIndex,
    pipe_supports_index: HighPerformanceSpatialIndex,
    
    // Legacy spatial grid for compatibility
    legacy_manager: SpatialIndexManager,
    
    // Performance tracking
    last_update_time: Option<Instant>,
    query_count: usize,
}

impl OptimizedSpatialIndexManager {
    pub fn new() -> Self {
        Self {
            main_index: HighPerformanceSpatialIndex::new(),
            buildings_index: HighPerformanceSpatialIndex::new(),
            railway_nodes_index: HighPerformanceSpatialIndex::new(),
            conveyor_poles_index: HighPerformanceSpatialIndex::new(),
            pipe_supports_index: HighPerformanceSpatialIndex::new(),
            legacy_manager: SpatialIndexManager::new(),
            last_update_time: None,
            query_count: 0,
        }
    }
    
    /// Initialize with bulk data for optimal performance
    pub fn initialize_bulk(&mut self, 
        buildings: &HashMap<String, Building>,
        railway_nodes: &HashMap<String, RailwayNode>,
        conveyor_poles: &HashMap<String, crate::types::ConveyorPole>,
        pipe_supports: &HashMap<String, crate::types::PipeSupport>,
    ) {
        let start_time = Instant::now();
        let mut all_objects = Vec::new();
        let mut buildings_objects = Vec::new();
        let mut railway_objects = Vec::new();
        let mut conveyor_objects = Vec::new();
        let mut pipe_objects = Vec::new();
        
        // Process buildings
        for building in buildings.values() {
            let spatial_obj = SpatialObject::Building(building.id.clone());
            let bounds = building.get_bounds();
            
            all_objects.push((spatial_obj.clone(), bounds.clone()));
            buildings_objects.push((spatial_obj, bounds));
        }
        
        // Process railway nodes
        for node in railway_nodes.values() {
            let spatial_obj = SpatialObject::RailwayNode(node.id.clone());
            let bounds = node.get_bounds();
            
            all_objects.push((spatial_obj.clone(), bounds.clone()));
            railway_objects.push((spatial_obj, bounds));
        }
        
        // Process conveyor poles
        for pole in conveyor_poles.values() {
            let spatial_obj = SpatialObject::ConveyorPole(pole.id.clone());
            let bounds = pole.get_bounds();
            
            all_objects.push((spatial_obj.clone(), bounds.clone()));
            conveyor_objects.push((spatial_obj, bounds));
        }
        
        // Process pipe supports
        for support in pipe_supports.values() {
            let spatial_obj = SpatialObject::PipeSupport(support.id.clone());
            let bounds = support.get_bounds();
            
            all_objects.push((spatial_obj.clone(), bounds.clone()));
            pipe_objects.push((spatial_obj, bounds));
        }
        
        // Bulk load all indices
        self.main_index.bulk_insert(all_objects);
        self.buildings_index.bulk_insert(buildings_objects);
        self.railway_nodes_index.bulk_insert(railway_objects);
        self.conveyor_poles_index.bulk_insert(conveyor_objects);
        self.pipe_supports_index.bulk_insert(pipe_objects);
        
        // Also initialize legacy manager for compatibility
        self.legacy_manager.initialize_buildings(buildings);
        self.legacy_manager.initialize_railway_nodes(railway_nodes);
        self.legacy_manager.initialize_conveyor_poles(conveyor_poles);
        self.legacy_manager.initialize_pipe_supports(pipe_supports);
        
        self.last_update_time = Some(start_time);
        
        log::info!("Optimized spatial index initialized with {} objects in {:.2}ms", 
            self.main_index.object_count(), start_time.elapsed().as_secs_f64() * 1000.0);
    }
    
    /// High-performance viewport culling for all object types
    pub fn viewport_cull_all(&mut self, viewport: &ViewportBounds) -> ViewportCullingResult {
        self.query_count += 1;
        self.main_index.viewport_cull(viewport)
    }
    
    /// Type-specific viewport culling
    pub fn viewport_cull_buildings(&mut self, viewport: &ViewportBounds) -> ViewportCullingResult {
        self.query_count += 1;
        self.buildings_index.viewport_cull(viewport)
    }
    
    pub fn viewport_cull_railways(&mut self, viewport: &ViewportBounds) -> ViewportCullingResult {
        self.query_count += 1;
        self.railway_nodes_index.viewport_cull(viewport)
    }
    
    /// Add new object to indices
    pub fn add_object(&mut self, object: SpatialObject, bounds: BoundingBox3D) {
        self.main_index.insert(object.clone(), bounds.clone());
        
        match &object {
            SpatialObject::Building(_) => self.buildings_index.insert(object.clone(), bounds.clone()),
            SpatialObject::RailwayNode(_) => self.railway_nodes_index.insert(object.clone(), bounds.clone()),
            SpatialObject::ConveyorPole(_) => self.conveyor_poles_index.insert(object.clone(), bounds.clone()),
            SpatialObject::PipeSupport(_) => self.pipe_supports_index.insert(object.clone(), bounds),
            _ => {} // Other types not yet supported in specialized indices
        }
    }
    
    /// Remove object from all indices
    pub fn remove_object(&mut self, object_id: &str) -> bool {
        let main_removed = self.main_index.remove(object_id);
        
        // Try to remove from specialized indices (expensive but necessary)
        let _ = self.buildings_index.remove(object_id);
        let _ = self.railway_nodes_index.remove(object_id);
        let _ = self.conveyor_poles_index.remove(object_id);
        let _ = self.pipe_supports_index.remove(object_id);
        
        main_removed
    }
    
    /// Get comprehensive statistics
    pub fn get_comprehensive_stats(&self) -> OptimizedSpatialStats {
        OptimizedSpatialStats {
            main_index: self.main_index.get_stats(),
            buildings_index: self.buildings_index.get_stats(),
            railway_nodes_index: self.railway_nodes_index.get_stats(),
            conveyor_poles_index: self.conveyor_poles_index.get_stats(),
            pipe_supports_index: self.pipe_supports_index.get_stats(),
            total_query_count: self.query_count,
            last_update_time: self.last_update_time.map(|t| t.elapsed().as_secs_f64()),
        }
    }
    
    /// Clear all indices
    pub fn clear(&mut self) {
        self.main_index.clear();
        self.buildings_index.clear();
        self.railway_nodes_index.clear();
        self.conveyor_poles_index.clear();
        self.pipe_supports_index.clear();
        self.legacy_manager.clear();
        self.query_count = 0;
        self.last_update_time = None;
    }
}

/// Comprehensive statistics for the optimized spatial index system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizedSpatialStats {
    pub main_index: SpatialIndexStats,
    pub buildings_index: SpatialIndexStats,
    pub railway_nodes_index: SpatialIndexStats,
    pub conveyor_poles_index: SpatialIndexStats,
    pub pipe_supports_index: SpatialIndexStats,
    pub total_query_count: usize,
    pub last_update_time: Option<f64>, // Seconds since last update
}


#[cfg(test)]
mod rtree_tests {
    use super::*;
    
    #[test]
    fn test_high_performance_spatial_index() {
        let mut index = HighPerformanceSpatialIndex::new();
        
        // Insert test objects
        let objects = vec![
            (SpatialObject::Building("building1".to_string()), 
             BoundingBox3D::new(Point3D::new(0.0, 0.0, 0.0), Point3D::new(10.0, 10.0, 10.0))),
            (SpatialObject::Building("building2".to_string()), 
             BoundingBox3D::new(Point3D::new(50.0, 50.0, 0.0), Point3D::new(60.0, 60.0, 10.0))),
            (SpatialObject::Building("building3".to_string()), 
             BoundingBox3D::new(Point3D::new(100.0, 100.0, 0.0), Point3D::new(110.0, 110.0, 10.0))),
        ];
        
        index.bulk_insert(objects);
        assert_eq!(index.object_count(), 3);
        
        // Test viewport culling
        let viewport = ViewportBounds::new(-5.0, 65.0, -5.0, 65.0, 5.0, 10.0);
        let result = index.viewport_cull(&viewport);
        
        assert_eq!(result.objects.len(), 2); // Should find buildings 1 and 2
        assert!(result.metrics.query_time_ms >= 0.0);
        assert!(result.metrics.culling_ratio > 0.0);
    }
    
    #[test]
    fn test_viewport_culling_performance() {
        let mut index = HighPerformanceSpatialIndex::new();
        
        // Insert many objects to test performance
        let mut objects = Vec::new();
        for i in 0..1000 {
            let x = (i % 100) as f64 * 20.0;
            let y = (i / 100) as f64 * 20.0;
            objects.push((
                SpatialObject::Building(format!("building{}", i)),
                BoundingBox3D::new(Point3D::new(x, y, 0.0), Point3D::new(x + 10.0, y + 10.0, 10.0)),
            ));
        }
        
        index.bulk_insert(objects);
        
        // Test small viewport culling
        let viewport = ViewportBounds::new(0.0, 100.0, 0.0, 100.0, 5.0, 10.0);
        let result = index.viewport_cull(&viewport);
        
        // Should cull most objects
        assert!(result.objects.len() < index.object_count());
        assert!(result.metrics.culling_ratio > 0.5);
        assert!(result.metrics.query_time_ms < 10.0); // Should be very fast
    }
    
    #[test]
    fn test_radius_query() {
        let mut index = HighPerformanceSpatialIndex::new();
        
        let objects = vec![
            (SpatialObject::Building("near".to_string()), 
             BoundingBox3D::new(Point3D::new(5.0, 5.0, 0.0), Point3D::new(15.0, 15.0, 10.0))),
            (SpatialObject::Building("far".to_string()), 
             BoundingBox3D::new(Point3D::new(100.0, 100.0, 0.0), Point3D::new(110.0, 110.0, 10.0))),
        ];
        
        index.bulk_insert(objects);
        
        let center = Point3D::new(0.0, 0.0, 5.0);
        let results = index.query_radius(&center, 20.0);
        
        assert_eq!(results.len(), 1); // Should only find the near object
    }
    
    #[test]
    fn test_optimized_spatial_index_manager() {
        let mut manager = OptimizedSpatialIndexManager::new();
        
        // Create test data
        let mut buildings = HashMap::new();
        buildings.insert("b1".to_string(), Building {
            id: "b1".to_string(),
            building_type: "miner".to_string(),
            x: 10.0,
            y: 10.0,
            z: 0.0,
            rotation: 0.0,
        });
        
        let railway_nodes = HashMap::new();
        let conveyor_poles = HashMap::new();
        let pipe_supports = HashMap::new();
        
        manager.initialize_bulk(&buildings, &railway_nodes, &conveyor_poles, &pipe_supports);
        
        // Test viewport culling
        let viewport = ViewportBounds::new(0.0, 20.0, 0.0, 20.0, 0.0, 10.0);
        let result = manager.viewport_cull_all(&viewport);
        
        assert_eq!(result.objects.len(), 1);
        assert!(result.metrics.query_time_ms >= 0.0);
        
        // Test statistics
        let stats = manager.get_comprehensive_stats();
        assert_eq!(stats.main_index.total_objects, 1);
        assert_eq!(stats.buildings_index.total_objects, 1);
        assert_eq!(stats.total_query_count, 1);
    }
    
    #[test] 
    fn test_viewport_bounds() {
        let viewport = ViewportBounds::new(-10.0, 10.0, -5.0, 5.0, 0.0, 2.0);
        
        // Test point inside viewport
        let inside_point = Point3D::new(0.0, 0.0, 1.0);
        assert!(viewport.contains_point(&inside_point));
        
        // Test point outside viewport (X)
        let outside_x = Point3D::new(15.0, 0.0, 1.0);
        assert!(!viewport.contains_point(&outside_x));
        
        // Test point outside viewport (Z)
        let outside_z = Point3D::new(0.0, 0.0, 5.0);
        assert!(!viewport.contains_point(&outside_z));
        
        // Test AABB conversion
        let aabb = viewport.to_aabb();
        assert_eq!(aabb.lower(), [viewport.left, viewport.top, viewport.z_level - viewport.z_range]);
        assert_eq!(aabb.upper(), [viewport.right, viewport.bottom, viewport.z_level + viewport.z_range]);
    }
    
    #[test]
    fn test_parallel_viewport_culling() {
        let mut index = HighPerformanceSpatialIndex::new();
        
        // Create test objects in different regions
        let objects = vec![
            (SpatialObject::Building("nw".to_string()), 
             BoundingBox3D::new(Point3D::new(0.0, 0.0, 0.0), Point3D::new(10.0, 10.0, 10.0))),
            (SpatialObject::Building("ne".to_string()), 
             BoundingBox3D::new(Point3D::new(100.0, 0.0, 0.0), Point3D::new(110.0, 10.0, 10.0))),
            (SpatialObject::Building("sw".to_string()), 
             BoundingBox3D::new(Point3D::new(0.0, 100.0, 0.0), Point3D::new(10.0, 110.0, 10.0))),
            (SpatialObject::Building("se".to_string()), 
             BoundingBox3D::new(Point3D::new(100.0, 100.0, 0.0), Point3D::new(110.0, 110.0, 10.0))),
        ];
        
        index.bulk_insert(objects);
        
        // Test multiple viewports in parallel
        let viewports = vec![
            ViewportBounds::new(-5.0, 15.0, -5.0, 15.0, 5.0, 10.0), // Should find NW
            ViewportBounds::new(95.0, 115.0, -5.0, 15.0, 5.0, 10.0), // Should find NE
            ViewportBounds::new(-5.0, 15.0, 95.0, 115.0, 5.0, 10.0), // Should find SW
            ViewportBounds::new(95.0, 115.0, 95.0, 115.0, 5.0, 10.0), // Should find SE
        ];
        
        let results = index.parallel_viewport_cull(&viewports);
        
        // Each viewport should find exactly one object
        for result in results {
            assert_eq!(result.objects.len(), 1);
            assert!(result.metrics.query_time_ms >= 0.0);
        }
    }
}

