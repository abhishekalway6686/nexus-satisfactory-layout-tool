//! Ultra-fast viewport culling system using R-tree spatial index
//! 
//! Provides O(log N) visibility detection instead of O(N) iteration.
//! Designed to handle 10,000+ objects with sub-millisecond query times.

use super::{ViewportBounds, SpatialObject, SpatialQueryResult};
use rstar::RTree;
use std::collections::HashMap;
use std::time::Instant;
// use rayon::prelude::*; // Removed unused import
// use wide::{f64x4, CmpLt, CmpGt, CmpLe, CmpGe}; // Removed unused imports

/// High-performance viewport culling system
pub struct ViewportCullingSystem {
    /// R-tree spatial index for ultra-fast queries
    rtree: RTree<SpatialObject>,
    /// Object lookup by ID for fast updates
    objects_by_id: HashMap<String, SpatialObject>,
    /// Maximum objects to return per query
    max_objects_per_query: usize,
    /// Performance metrics
    last_query_time: f64,
    query_count: u64,
    total_query_time: f64,
}

impl ViewportCullingSystem {
    /// Create new culling system
    pub fn new(max_objects_per_query: usize) -> Self {
        Self {
            rtree: RTree::new(),
            objects_by_id: HashMap::new(),
            max_objects_per_query,
            last_query_time: 0.0,
            query_count: 0,
            total_query_time: 0.0,
        }
    }
    
    /// Add objects to the spatial index
    pub fn add_objects(&mut self, objects: Vec<SpatialObject>) {
        let start_time = Instant::now();
        
        // Add to lookup table
        for object in &objects {
            self.objects_by_id.insert(object.id.clone(), object.clone());
        }
        
        // Rebuild R-tree with all objects (most efficient for bulk updates)
        let all_objects: Vec<SpatialObject> = self.objects_by_id.values().cloned().collect();
        self.rtree = RTree::bulk_load(all_objects);
        
        let elapsed = start_time.elapsed().as_secs_f64() * 1000.0;
        log::debug!("Added {} objects to spatial index in {:.3}ms", objects.len(), elapsed);
    }
    
    /// Remove objects from spatial index
    pub fn remove_objects(&mut self, object_ids: &[String]) {
        let start_time = Instant::now();
        
        // Remove from lookup table
        for id in object_ids {
            self.objects_by_id.remove(id);
        }
        
        // Rebuild R-tree without removed objects
        let remaining_objects: Vec<SpatialObject> = self.objects_by_id.values().cloned().collect();
        self.rtree = RTree::bulk_load(remaining_objects);
        
        let elapsed = start_time.elapsed().as_secs_f64() * 1000.0;
        log::debug!("Removed {} objects from spatial index in {:.3}ms", object_ids.len(), elapsed);
    }
    
    /// Get all objects visible within viewport bounds
    pub fn get_visible_objects(&mut self, bounds: &ViewportBounds) -> Vec<SpatialQueryResult> {
        let start_time = Instant::now();
        
        // Create search envelope with small margin for edge objects
        let margin = 10.0; // 10-meter margin
        let search_bounds = bounds.expanded(margin);
        let search_envelope = search_bounds.to_aabb();
        
        // Query R-tree for objects intersecting viewport
        let visible_objects: Vec<SpatialQueryResult> = self.rtree
            .locate_in_envelope_intersecting(&search_envelope)
            .filter(|obj| {
                // Filter by floor if needed
                obj.floor == bounds.floor || obj.floor == -1 // -1 = all floors
            })
            .take(self.max_objects_per_query)
            .map(|obj| SpatialQueryResult {
                id: obj.id.clone(),
                object_type: obj.object_type.clone(),
                data: obj.data.clone(),
                distance: None,
            })
            .collect();
        
        // Update performance metrics
        let elapsed = start_time.elapsed().as_secs_f64() * 1000.0;
        self.last_query_time = elapsed;
        self.query_count += 1;
        self.total_query_time += elapsed;
        
        visible_objects
    }
    
    /// Get performance metrics
    pub fn object_count(&self) -> usize {
        self.objects_by_id.len()
    }
    
    pub fn last_query_time(&self) -> f64 {
        self.last_query_time
    }
}
