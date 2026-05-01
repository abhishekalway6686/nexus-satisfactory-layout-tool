// Allow dead code in this module - these are library functions used by different build targets
#![allow(dead_code)]

use std::collections::{HashMap, HashSet};
use crate::types::{Point3D, BoundingBox3D, Building, RailwayNode};
use crate::geometry::distance_3d;
use serde::{Serialize, Deserialize};
use rayon::prelude::*;
use wide::f64x4;
// Unused rstar imports removed
// use std::time::Instant; // Removed unused import

/// Trait for entities that can be stored in spatial indexing
pub trait SpatialEntity {
    fn get_id(&self) -> &str;
    fn get_position(&self) -> Point3D;
    fn get_bounds(&self) -> BoundingBox3D;
}

/// Implement SpatialEntity for all supported types
impl SpatialEntity for Building {
    fn get_id(&self) -> &str {
        &self.id
    }
    
    fn get_position(&self) -> Point3D {
        Point3D::new(self.x, self.y, self.z)
    }
    
    fn get_bounds(&self) -> BoundingBox3D {
        // Assuming 8x8x8 meter building size (adjust based on building type if needed)
        BoundingBox3D::new(
            Point3D::new(self.x, self.y, self.z),
            Point3D::new(self.x + 8.0, self.y + 8.0, self.z + 8.0),
        )
    }
}

impl SpatialEntity for RailwayNode {
    fn get_id(&self) -> &str {
        &self.id
    }
    
    fn get_position(&self) -> Point3D {
        Point3D::new(self.x, self.y, self.z)
    }
    
    fn get_bounds(&self) -> BoundingBox3D {
        // Point entity with 1-meter radius
        BoundingBox3D::new(
            Point3D::new(self.x - 0.5, self.y - 0.5, self.z - 0.5),
            Point3D::new(self.x + 0.5, self.y + 0.5, self.z + 0.5),
        )
    }
}

impl SpatialEntity for crate::types::ConveyorPole {
    fn get_id(&self) -> &str {
        &self.id
    }
    
    fn get_position(&self) -> Point3D {
        Point3D::new(self.x, self.y, self.z)
    }
    
    fn get_bounds(&self) -> BoundingBox3D {
        // Point entity with 1-meter radius
        BoundingBox3D::new(
            Point3D::new(self.x - 0.5, self.y - 0.5, self.z - 0.5),
            Point3D::new(self.x + 0.5, self.y + 0.5, self.z + 0.5),
        )
    }
}

impl SpatialEntity for crate::types::PipeSupport {
    fn get_id(&self) -> &str {
        &self.id
    }
    
    fn get_position(&self) -> Point3D {
        Point3D::new(self.x, self.y, self.z)
    }
    
    fn get_bounds(&self) -> BoundingBox3D {
        // Point entity with 1-meter radius  
        BoundingBox3D::new(
            Point3D::new(self.x - 0.5, self.y - 0.5, self.z - 0.5),
            Point3D::new(self.x + 0.5, self.y + 0.5, self.z + 0.5),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SpatialObject {
    Building(String),
    RailwayNode(String),
    ConveyorPole(String),
    PipeSupport(String),
    ConveyorBelt(String),
    Pipeline(String),
    Railway(String),
    StickyNote(String),
}

impl SpatialObject {
    pub fn get_id(&self) -> &String {
        match self {
            SpatialObject::Building(id) => id,
            SpatialObject::RailwayNode(id) => id,
            SpatialObject::ConveyorPole(id) => id,
            SpatialObject::PipeSupport(id) => id,
            SpatialObject::ConveyorBelt(id) => id,
            SpatialObject::Pipeline(id) => id,
            SpatialObject::Railway(id) => id,
            SpatialObject::StickyNote(id) => id,
        }
    }
    
    pub fn get_type(&self) -> &'static str {
        match self {
            SpatialObject::Building(_) => "building",
            SpatialObject::RailwayNode(_) => "railway_node",
            SpatialObject::ConveyorPole(_) => "conveyor_pole",
            SpatialObject::PipeSupport(_) => "pipe_support",
            SpatialObject::ConveyorBelt(_) => "conveyor_belt",
            SpatialObject::Pipeline(_) => "pipeline",
            SpatialObject::Railway(_) => "railway",
            SpatialObject::StickyNote(_) => "sticky_note",
        }
    }
}

/// Cell key for spatial grid - optimized for minimal allocations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct CellKey {
    x: i32,
    y: i32,
    z: i32,
}

/// High-performance spatial grid optimized for the Satisfactory layout tool
/// Supports discrete z-levels (4-meter floor spacing) and efficient bulk operations
#[derive(Debug)]
pub struct SpatialGrid<T> {
    cell_size: f64,
    cells: HashMap<CellKey, Vec<T>>,
    entity_to_cell: HashMap<String, CellKey>,
    _phantom: std::marker::PhantomData<T>,
}

/// Performance statistics for spatial operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialStats {
    pub total_entities: usize,
    pub total_cells: usize,
    pub avg_entities_per_cell: f64,
    pub max_entities_in_cell: usize,
    pub cell_size: f64,
}

/// Result from bulk spatial queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkQueryResult<T> {
    pub entities: Vec<T>,
    pub query_time_ms: f64,
    pub entities_checked: usize,
}

/// Grid-based spatial index for fast spatial queries - compatible with JavaScript SpatialGrid
#[derive(Debug)]
pub struct SpatialIndex {
    cell_size: f64,
    cells: HashMap<CellKey, Vec<SpatialObject>>,
    object_bounds: HashMap<String, BoundingBox3D>,
}

/// Rust implementation of SpatialIndexManager - EXACT match to TypeScript version
/// Manages spatial indices for various entity types in the layout.
/// Provides fast O(1) lookups for proximity queries across all entity types.
#[derive(Debug)]
pub struct SpatialIndexManager {
    railway_node_grid: SpatialGrid<RailwayNode>,
    building_grid: SpatialGrid<Building>,
    conveyor_pole_grid: SpatialGrid<crate::types::ConveyorPole>,
    pipe_support_grid: SpatialGrid<crate::types::PipeSupport>,
}

impl SpatialIndexManager {
    pub fn new() -> Self {
        Self {
            // Initialize spatial grids with optimal cell sizes for each entity type - EXACT MATCH
            // Cell size balances memory usage vs query performance
            railway_node_grid: SpatialGrid::new(10.0), // 10m cells for point entities
            building_grid: SpatialGrid::new(20.0),      // 20m cells for larger buildings  
            conveyor_pole_grid: SpatialGrid::new(10.0), // 10m cells for point entities
            pipe_support_grid: SpatialGrid::new(10.0),  // 10m cells for point entities
        }
    }
    
    // ===== Railway Node Methods - EXACT MATCH to TypeScript =====
    
    pub fn initialize_railway_nodes(&mut self, nodes: &HashMap<String, RailwayNode>) {
        self.railway_node_grid.clear();
        for node in nodes.values() {
            self.railway_node_grid.insert(node.clone());
        }
    }
    
    pub fn add_railway_node(&mut self, node: RailwayNode) {
        self.railway_node_grid.insert(node);
    }
    
    pub fn update_railway_node(&mut self, node: RailwayNode) {
        self.railway_node_grid.update(node);
    }
    
    pub fn remove_railway_node(&mut self, node_id: &str) -> bool {
        self.railway_node_grid.remove(node_id)
    }
    
    pub fn get_railway_node_grid(&self) -> &SpatialGrid<RailwayNode> {
        &self.railway_node_grid
    }
    
    // ===== Building Methods - EXACT MATCH to TypeScript =====
    
    pub fn initialize_buildings(&mut self, buildings: &HashMap<String, Building>) {
        self.building_grid.clear();
        for building in buildings.values() {
            self.building_grid.insert(building.clone());
        }
    }
    
    pub fn add_building(&mut self, building: Building) {
        self.building_grid.insert(building);
    }
    
    pub fn update_building(&mut self, building: Building) {
        self.building_grid.update(building);
    }
    
    pub fn remove_building(&mut self, building_id: &str) -> bool {
        self.building_grid.remove(building_id)
    }
    
    pub fn get_building_grid(&self) -> &SpatialGrid<Building> {
        &self.building_grid
    }
    
    /// Fast proximity search for buildings near a point - EXACT MATCH to TypeScript
    pub fn find_nearby_buildings(&self, point: &Point3D, radius: f64, exclude_ids: &[String]) -> Vec<Building> {
        self.building_grid.query_radius(point, radius, exclude_ids)
    }
    
    // ===== Conveyor Pole Methods - EXACT MATCH to TypeScript =====
    
    pub fn initialize_conveyor_poles(&mut self, poles: &HashMap<String, crate::types::ConveyorPole>) {
        self.conveyor_pole_grid.clear();
        for pole in poles.values() {
            self.conveyor_pole_grid.insert(pole.clone());
        }
    }
    
    pub fn add_conveyor_pole(&mut self, pole: crate::types::ConveyorPole) {
        self.conveyor_pole_grid.insert(pole);
    }
    
    pub fn update_conveyor_pole(&mut self, pole: crate::types::ConveyorPole) {
        self.conveyor_pole_grid.update(pole);
    }
    
    pub fn remove_conveyor_pole(&mut self, pole_id: &str) -> bool {
        self.conveyor_pole_grid.remove(pole_id)
    }
    
    pub fn get_conveyor_pole_grid(&self) -> &SpatialGrid<crate::types::ConveyorPole> {
        &self.conveyor_pole_grid
    }
    
    /// Fast proximity search for conveyor poles near a point - EXACT MATCH to TypeScript
    pub fn find_nearby_conveyor_poles(&self, point: &Point3D, radius: f64, exclude_ids: &[String]) -> Vec<crate::types::ConveyorPole> {
        self.conveyor_pole_grid.query_radius(point, radius, exclude_ids)
    }
    
    // ===== Pipe Support Methods - EXACT MATCH to TypeScript =====
    
    pub fn initialize_pipe_supports(&mut self, supports: &HashMap<String, crate::types::PipeSupport>) {
        self.pipe_support_grid.clear();
        for support in supports.values() {
            self.pipe_support_grid.insert(support.clone());
        }
    }
    
    pub fn add_pipe_support(&mut self, support: crate::types::PipeSupport) {
        self.pipe_support_grid.insert(support);
    }
    
    pub fn update_pipe_support(&mut self, support: crate::types::PipeSupport) {
        self.pipe_support_grid.update(support);
    }
    
    pub fn remove_pipe_support(&mut self, support_id: &str) -> bool {
        self.pipe_support_grid.remove(support_id)
    }
    
    pub fn get_pipe_support_grid(&self) -> &SpatialGrid<crate::types::PipeSupport> {
        &self.pipe_support_grid
    }
    
    /// Fast proximity search for pipe supports near a point - EXACT MATCH to TypeScript
    pub fn find_nearby_pipe_supports(&self, point: &Point3D, radius: f64, exclude_ids: &[String]) -> Vec<crate::types::PipeSupport> {
        self.pipe_support_grid.query_radius(point, radius, exclude_ids)
    }
    
    // ===== General Methods - EXACT MATCH to TypeScript =====
    
    /// Clears all spatial indices
    pub fn clear(&mut self) {
        self.railway_node_grid.clear();
        self.building_grid.clear();
        self.conveyor_pole_grid.clear();
        self.pipe_support_grid.clear();
    }
    
    /// Gets statistics about all spatial indices for debugging/optimization - EXACT MATCH to TypeScript
    pub fn get_stats(&self) -> SpatialIndexManagerStats {
        SpatialIndexManagerStats {
            railway_nodes: self.railway_node_grid.get_stats(),
            buildings: self.building_grid.get_stats(),
            conveyor_poles: self.conveyor_pole_grid.get_stats(),
            pipe_supports: self.pipe_support_grid.get_stats(),
        }
    }
    
    /// Universal proximity search across all entity types - EXACT MATCH to TypeScript
    pub fn find_nearby_entities(
        &self,
        point: &Point3D,
        radius: f64,
        options: &UniversalQueryOptions,
    ) -> UniversalSpatialQueryResult {
        UniversalSpatialQueryResult {
            buildings: if options.include_buildings {
                self.find_nearby_buildings(point, radius, &options.exclude_ids)
            } else {
                Vec::new()
            },
            conveyor_poles: if options.include_conveyor_poles {
                self.find_nearby_conveyor_poles(point, radius, &options.exclude_ids)
            } else {
                Vec::new()
            },
            pipe_supports: if options.include_pipe_supports {
                self.find_nearby_pipe_supports(point, radius, &options.exclude_ids)
            } else {
                Vec::new()
            },
            railway_nodes: if options.include_railway_nodes {
                self.railway_node_grid.query_radius(point, radius, &options.exclude_ids)
            } else {
                Vec::new()
            },
        }
    }
}

/// Statistics for the spatial index manager - EXACT MATCH to TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialIndexManagerStats {
    pub railway_nodes: SpatialStats,
    pub buildings: SpatialStats,
    pub conveyor_poles: SpatialStats,
    pub pipe_supports: SpatialStats,
}

/// Options for universal spatial queries - EXACT MATCH to TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniversalQueryOptions {
    pub include_buildings: bool,
    pub include_conveyor_poles: bool,
    pub include_pipe_supports: bool,
    pub include_railway_nodes: bool,
    pub exclude_ids: Vec<String>,
}

impl Default for UniversalQueryOptions {
    fn default() -> Self {
        Self {
            include_buildings: true,
            include_conveyor_poles: true,
            include_pipe_supports: true,
            include_railway_nodes: true,
            exclude_ids: Vec::new(),
        }
    }
}

/// Result from universal spatial query - EXACT MATCH to TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniversalSpatialQueryResult {
    pub buildings: Vec<Building>,
    pub conveyor_poles: Vec<crate::types::ConveyorPole>,
    pub pipe_supports: Vec<crate::types::PipeSupport>,
    pub railway_nodes: Vec<RailwayNode>,
}

impl<T: Clone + Send + Sync> SpatialGrid<T> 
where 
    T: SpatialEntity,
{
    pub fn new(cell_size: f64) -> Self {
        Self {
            cell_size,
            cells: HashMap::new(),
            entity_to_cell: HashMap::new(),
            _phantom: std::marker::PhantomData,
        }
    }
    
    /// Get cell key for a 3D point - EXACT match to TypeScript getCellKey algorithm
    /// Z coordinate is normalized by floor levels (4-meter spacing)
    fn get_cell_key(&self, x: f64, y: f64, z: f64) -> CellKey {
        CellKey {
            x: (x / self.cell_size).floor() as i32,
            y: (y / self.cell_size).floor() as i32,
            z: (z / 4.0).floor() as i32, // Normalize by floor height (4m spacing) - EXACT MATCH
        }
    }
    
    /// Format cell key as string - EXACT match to TypeScript format
    #[allow(dead_code)]
    fn get_cell_key_string(&self, x: f64, y: f64, z: f64) -> String {
        let cell_x = (x / self.cell_size).floor() as i32;
        let cell_y = (y / self.cell_size).floor() as i32;
        let cell_z = (z / 4.0).floor() as i32;
        format!("{},{},{}", cell_x, cell_y, cell_z)
    }
    
    /// Get nearby cell keys that could contain entities within radius
    /// EXACT match to TypeScript getNearbyCellKeys algorithm
    fn get_nearby_cell_keys(&self, point: &Point3D, radius: f64) -> Vec<CellKey> {
        let cell_radius = (radius / self.cell_size).ceil() as i32;
        let center_cell_x = (point.x / self.cell_size).floor() as i32;
        let center_cell_y = (point.y / self.cell_size).floor() as i32;
        let center_cell_z = (point.z / 4.0).floor() as i32; // Floor normalization - EXACT MATCH
        
        let mut nearby_cells = Vec::new();
        
        // Check all cells within the radius - EXACT match to TypeScript algorithm
        for dx in -cell_radius..=cell_radius {
            for dy in -cell_radius..=cell_radius {
                for dz in -1..=1 { // Usually only check current floor and adjacent - EXACT MATCH
                    let cell_x = center_cell_x + dx;
                    let cell_y = center_cell_y + dy;
                    let cell_z = center_cell_z + dz;
                    nearby_cells.push(CellKey { x: cell_x, y: cell_y, z: cell_z });
                }
            }
        }
        
        nearby_cells
    }
    
    /// Insert entity into spatial grid
    pub fn insert(&mut self, entity: T) {
        let id = entity.get_id().to_string();
        let position = entity.get_position();
        
        // Remove from old cell if exists
        if let Some(old_key) = self.entity_to_cell.remove(&id) {
            if let Some(cell) = self.cells.get_mut(&old_key) {
                cell.retain(|e| e.get_id() != id);
                if cell.is_empty() {
                    self.cells.remove(&old_key);
                }
            }
        }
        
        // Insert into new cell
        let cell_key = self.get_cell_key(position.x, position.y, position.z);
        self.cells.entry(cell_key).or_insert_with(Vec::new).push(entity);
        self.entity_to_cell.insert(id, cell_key);
    }
    
    /// Remove entity from spatial grid by ID
    pub fn remove(&mut self, entity_id: &str) -> bool {
        if let Some(cell_key) = self.entity_to_cell.remove(entity_id) {
            if let Some(cell) = self.cells.get_mut(&cell_key) {
                let initial_len = cell.len();
                cell.retain(|entity| entity.get_id() != entity_id);
                
                let was_removed = cell.len() < initial_len;
                
                // Clean up empty cells
                if cell.is_empty() {
                    self.cells.remove(&cell_key);
                }
                
                return was_removed;
            }
        }
        false
    }
    
    /// Update entity position in spatial grid
    pub fn update(&mut self, entity: T) {
        let id = entity.get_id().to_string();
        let old_key = self.entity_to_cell.get(&id).cloned();
        let new_key = self.get_cell_key(entity.get_position().x, entity.get_position().y, entity.get_position().z);
        
        if old_key != Some(new_key) {
            // Entity moved to different cell - remove and re-insert
            self.remove(&id);
            self.insert(entity);
        } else if let Some(cell_key) = old_key {
            // Update entity reference in same cell
            if let Some(cell) = self.cells.get_mut(&cell_key) {
                for existing in cell.iter_mut() {
                    if existing.get_id() == id {
                        *existing = entity;
                        break;
                    }
                }
            }
        }
    }
    
    /// Query entities within radius - returns sorted by distance
    /// EXACT match to TypeScript queryRadius algorithm with vectorized optimizations
    pub fn query_radius(&self, point: &Point3D, radius: f64, exclude_ids: &[String]) -> Vec<T> {
        let radius_squared = radius * radius;
        let mut results: Vec<(T, f64)> = Vec::new();
        let exclude_set: HashSet<&String> = exclude_ids.iter().collect();
        
        // Get all cells that could contain entities within radius - EXACT MATCH
        let nearby_cell_keys = self.get_nearby_cell_keys(point, radius);
        
        // Vectorized distance calculations for performance
        let point_x = point.x;
        let point_y = point.y;
        let point_z = point.z;
        
        for cell_key in nearby_cell_keys {
            if let Some(cell) = self.cells.get(&cell_key) {
                // Process entities in batches for vectorization opportunities
                for entity in cell {
                    if exclude_set.contains(&entity.get_id().to_string()) {
                        continue;
                    }
                    
                    let entity_pos = entity.get_position();
                    
                    // Calculate squared distance (avoid sqrt for performance) - EXACT MATCH
                    let dx = entity_pos.x - point_x;
                    let dy = entity_pos.y - point_y;
                    let dz = entity_pos.z - point_z;
                    let distance_squared = dx * dx + dy * dy + dz * dz;
                    
                    if distance_squared <= radius_squared {
                        results.push((entity.clone(), distance_squared));
                    }
                }
            }
        }
        
        // Sort by distance and return entities - EXACT MATCH to TypeScript
        results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        results.into_iter().map(|(entity, _)| entity).collect()
    }
    
    /// Bulk query for multiple points - highly optimized for performance with SIMD and parallel processing
    pub fn query_radius_bulk(&self, queries: &[(Point3D, f64)], exclude_ids: &[String]) -> Vec<Vec<T>> {
        let exclude_set: HashSet<&String> = exclude_ids.iter().collect();
        
        // Use parallel processing for large batches
        if queries.len() > 10 {
            queries
                .par_iter()
                .map(|(point, radius)| self.query_radius_simd_single(point, *radius, &exclude_set))
                .collect::<Vec<_>>()
        } else {
            queries
                .iter()
                .map(|(point, radius)| self.query_radius_simd_single(point, *radius, &exclude_set))
                .collect()
        }
    }
    
    /// SIMD-optimized single radius query with wide crate for vectorized distance calculations
    fn query_radius_simd_single(&self, point: &Point3D, radius: f64, exclude_set: &HashSet<&String>) -> Vec<T> {
        let radius_squared = radius * radius;
        let mut query_results: Vec<(T, f64)> = Vec::new();
        
        let nearby_cell_keys = self.get_nearby_cell_keys(point, radius);
        let point_x = point.x;
        let point_y = point.y;
        let point_z = point.z;
        
        for cell_key in nearby_cell_keys {
            if let Some(cell) = self.cells.get(&cell_key) {
                // Process entities in SIMD-friendly batches of 4
                let chunks: Vec<&[T]> = cell.chunks(4).collect();
                
                for chunk in chunks {
                    if chunk.len() == 4 {
                        // SIMD processing for full chunks of 4 entities
                        let positions: Vec<Point3D> = chunk.iter().map(|e| e.get_position()).collect();
                        let distances_sq = self.calculate_distances_squared_simd4(
                            point_x, point_y, point_z,
                            &positions[0], &positions[1], &positions[2], &positions[3]
                        );
                        
                        for (i, entity) in chunk.iter().enumerate() {
                            if exclude_set.contains(&entity.get_id().to_string()) {
                                continue;
                            }
                            
                            if distances_sq[i] <= radius_squared {
                                query_results.push((entity.clone(), distances_sq[i]));
                            }
                        }
                    } else {
                        // Fallback for partial chunks
                        for entity in chunk {
                            if exclude_set.contains(&entity.get_id().to_string()) {
                                continue;
                            }
                            
                            let entity_pos = entity.get_position();
                            let dx = entity_pos.x - point_x;
                            let dy = entity_pos.y - point_y;
                            let dz = entity_pos.z - point_z;
                            let distance_squared = dx * dx + dy * dy + dz * dz;
                            
                            if distance_squared <= radius_squared {
                                query_results.push((entity.clone(), distance_squared));
                            }
                        }
                    }
                }
            }
        }
        
        // Sort by distance and return entities
        query_results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        query_results.into_iter().map(|(entity, _)| entity).collect()
    }
    
    /// SIMD-optimized distance calculation for 4 points using wide crate
    #[inline]
    fn calculate_distances_squared_simd4(&self, 
        query_x: f64, query_y: f64, query_z: f64,
        p1: &Point3D, p2: &Point3D, p3: &Point3D, p4: &Point3D
    ) -> [f64; 4] {
        // Pack 4 x-coordinates into SIMD vector
        let xs = f64x4::new([p1.x, p2.x, p3.x, p4.x]);
        let ys = f64x4::new([p1.y, p2.y, p3.y, p4.y]);
        let zs = f64x4::new([p1.z, p2.z, p3.z, p4.z]);
        
        // Broadcast query point coordinates
        let query_x_vec = f64x4::splat(query_x);
        let query_y_vec = f64x4::splat(query_y);
        let query_z_vec = f64x4::splat(query_z);
        
        // Calculate differences
        let dx = xs - query_x_vec;
        let dy = ys - query_y_vec;
        let dz = zs - query_z_vec;
        
        // Calculate squared distances
        let dx2 = dx * dx;
        let dy2 = dy * dy;
        let dz2 = dz * dz;
        let distances_squared = dx2 + dy2 + dz2;
        
        distances_squared.to_array()
    }
    
    /// Parallel bulk radius query optimized for high-frequency operations like drawing
    pub fn query_radius_bulk_parallel(&self, queries: &[(Point3D, f64)], exclude_ids: &[String]) -> Vec<Vec<T>> {
        let exclude_set: HashSet<&String> = exclude_ids.iter().collect();
        
        // Always use parallel processing for maximum performance
        queries
            .par_iter()
            .map(|(point, radius)| {
                let radius_squared = radius * radius;
                let mut candidates = Vec::new();
                
                // Get nearby cells
                let nearby_cell_keys = self.get_nearby_cell_keys(point, *radius);
                
                // Collect all candidate entities from nearby cells
                for cell_key in nearby_cell_keys {
                    if let Some(cell) = self.cells.get(&cell_key) {
                        candidates.extend(cell.iter().filter(|e| !exclude_set.contains(&e.get_id().to_string())));
                    }
                }
                
                // Process candidates in chunks for SIMD optimization
                let chunk_size = 64; // Optimal chunk size for cache performance
                let mut results: Vec<(T, f64)> = Vec::new();
                
                for chunk in candidates.chunks(chunk_size) {
                    let mut chunk_results = Vec::new();
                    
                    // Process each chunk with SIMD when possible
                    let simd_chunks: Vec<&[&T]> = chunk.chunks(4).collect();
                    
                    for simd_chunk in simd_chunks {
                        if simd_chunk.len() == 4 {
                            let positions: Vec<Point3D> = simd_chunk.iter().map(|e| e.get_position()).collect();
                            let distances_sq = self.calculate_distances_squared_simd4(
                                point.x, point.y, point.z,
                                &positions[0], &positions[1], &positions[2], &positions[3]
                            );
                            
                            for (i, entity) in simd_chunk.iter().enumerate() {
                                if distances_sq[i] <= radius_squared {
                                    chunk_results.push(((*entity).clone(), distances_sq[i]));
                                }
                            }
                        } else {
                            // Handle remaining entities
                            for entity in simd_chunk {
                                let entity_pos = entity.get_position();
                                let dx = entity_pos.x - point.x;
                                let dy = entity_pos.y - point.y;
                                let dz = entity_pos.z - point.z;
                                let distance_squared = dx * dx + dy * dy + dz * dz;
                                
                                if distance_squared <= radius_squared {
                                    chunk_results.push(((*entity).clone(), distance_squared));
                                }
                            }
                        }
                    }
                    
                    results.extend(chunk_results);
                }
                
                // Sort by distance
                results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
                results.into_iter().map(|(entity, _)| entity).collect()
            })
            .collect()
    }
    
    /// Clear all entities from the grid
    pub fn clear(&mut self) {
        self.cells.clear();
        self.entity_to_cell.clear();
    }
    
    /// Get total number of entities in the grid
    pub fn size(&self) -> usize {
        self.entity_to_cell.len()
    }
    
    /// Get statistics about the spatial grid for debugging/optimization
    pub fn get_stats(&self) -> SpatialStats {
        let mut max_entities_in_cell = 0;
        let mut total_entities_in_cells = 0;
        
        for cell in self.cells.values() {
            let cell_size = cell.len();
            total_entities_in_cells += cell_size;
            max_entities_in_cell = max_entities_in_cell.max(cell_size);
        }
        
        let total_cells = self.cells.len();
        
        SpatialStats {
            total_entities: self.entity_to_cell.len(),
            total_cells,
            avg_entities_per_cell: if total_cells > 0 {
                total_entities_in_cells as f64 / total_cells as f64
            } else {
                0.0
            },
            max_entities_in_cell,
            cell_size: self.cell_size,
        }
    }
}

impl SpatialIndex {
    pub fn new(cell_size: f64) -> Self {
        Self {
            cell_size,
            cells: HashMap::new(),
            object_bounds: HashMap::new(),
        }
    }
    
    fn get_cell_key(&self, point: &Point3D) -> CellKey {
        CellKey {
            x: (point.x / self.cell_size).floor() as i32,
            y: (point.y / self.cell_size).floor() as i32,
            z: (point.z / self.cell_size).floor() as i32,
        }
    }
    
    fn get_cells_for_bounds(&self, bounds: &BoundingBox3D) -> Vec<CellKey> {
        let min_cell = self.get_cell_key(&bounds.min);
        let max_cell = self.get_cell_key(&bounds.max);
        
        let mut cells = Vec::new();
        for x in min_cell.x..=max_cell.x {
            for y in min_cell.y..=max_cell.y {
                for z in min_cell.z..=max_cell.z {
                    cells.push(CellKey { x, y, z });
                }
            }
        }
        cells
    }
    
    pub fn insert(&mut self, object: SpatialObject, bounds: BoundingBox3D) {
        let id = object.get_id().clone();
        
        // Remove existing object if it exists
        if self.object_bounds.contains_key(&id) {
            self.remove(&id);
        }
        
        // Insert into all cells that the bounds overlap
        let cells = self.get_cells_for_bounds(&bounds);
        for cell_key in cells {
            self.cells.entry(cell_key)
                .or_insert_with(Vec::new)
                .push(object.clone());
        }
        
        self.object_bounds.insert(id, bounds);
    }
    
    pub fn remove(&mut self, object_id: &str) -> bool {
        if let Some(bounds) = self.object_bounds.remove(object_id) {
            let cells = self.get_cells_for_bounds(&bounds);
            
            for cell_key in cells {
                if let Some(cell_objects) = self.cells.get_mut(&cell_key) {
                    cell_objects.retain(|obj| obj.get_id() != object_id);
                    if cell_objects.is_empty() {
                        self.cells.remove(&cell_key);
                    }
                }
            }
            true
        } else {
            false
        }
    }
    
    pub fn find_in_bounds(&self, query_bounds: &BoundingBox3D) -> Vec<SpatialObject> {
        let cells = self.get_cells_for_bounds(query_bounds);
        let mut results = Vec::new();
        let mut seen = HashSet::new();
        
        for cell_key in cells {
            if let Some(cell_objects) = self.cells.get(&cell_key) {
                for obj in cell_objects {
                    let id = obj.get_id();
                    if seen.insert(id.clone()) {
                        // Check if object actually intersects query bounds
                        if let Some(obj_bounds) = self.object_bounds.get(id) {
                            if obj_bounds.intersects(query_bounds) {
                                results.push(obj.clone());
                            }
                        }
                    }
                }
            }
        }
        
        results
    }
    
    pub fn find_in_radius(&self, center: &Point3D, radius: f64) -> Vec<SpatialObject> {
        let query_bounds = BoundingBox3D::new(
            Point3D::new(center.x - radius, center.y - radius, center.z - radius),
            Point3D::new(center.x + radius, center.y + radius, center.z + radius),
        );
        
        let candidates = self.find_in_bounds(&query_bounds);
        
        // Filter by actual distance
        candidates.into_iter()
            .filter(|obj| {
                if let Some(bounds) = self.object_bounds.get(obj.get_id()) {
                    let obj_center = bounds.center();
                    distance_3d(&obj_center, center) <= radius
                } else {
                    false
                }
            })
            .collect()
    }
    
    pub fn find_nearest(&self, point: &Point3D, max_distance: f64) -> Option<(SpatialObject, f64)> {
        let candidates = self.find_in_radius(point, max_distance);
        
        candidates.into_iter()
            .filter_map(|obj| {
                if let Some(bounds) = self.object_bounds.get(obj.get_id()) {
                    let obj_center = bounds.center();
                    let dist = distance_3d(&obj_center, point);
                    Some((obj, dist))
                } else {
                    None
                }
            })
            .min_by(|(_, dist1), (_, dist2)| {
                dist1.partial_cmp(dist2).unwrap()
            })
    }
    
    pub fn clear(&mut self) {
        self.cells.clear();
        self.object_bounds.clear();
    }
    
    pub fn object_count(&self) -> usize {
        self.object_bounds.len()
    }
}

/// R-tree node for more complex spatial queries
#[derive(Debug, Clone)]
struct RTreeNode {
    bounds: BoundingBox3D,
    children: Vec<RTreeNode>,
    objects: Vec<(String, SpatialObject)>, // (id, object) pairs
}

/// R-tree implementation for efficient spatial indexing
#[derive(Debug)]
pub struct RTree {
    root: Option<RTreeNode>,
    max_entries: usize,
    #[allow(dead_code)]
    min_entries: usize,
}

impl RTree {
    pub fn new(max_entries: usize) -> Self {
        let min_entries = max_entries / 2;
        Self {
            root: None,
            max_entries,
            min_entries,
        }
    }
    
    pub fn insert(&mut self, object: SpatialObject, bounds: BoundingBox3D) {
        let id = object.get_id().clone();
        let entry = (id, object);
        
        match self.root.take() {
            Some(mut root) => {
                self.insert_into_node(&mut root, entry, bounds);
                self.root = Some(root);
            }
            None => {
                self.root = Some(RTreeNode {
                    bounds,
                    children: Vec::new(),
                    objects: vec![entry],
                });
            }
        }
    }
    
    fn insert_into_node(&mut self, node: &mut RTreeNode, entry: (String, SpatialObject), bounds: BoundingBox3D) {
        // Expand node bounds to include new object
        node.bounds.expand_to_include(&bounds.min);
        node.bounds.expand_to_include(&bounds.max);
        
        if node.children.is_empty() {
            // Leaf node - add object
            node.objects.push(entry);
            
            // Split if necessary
            if node.objects.len() > self.max_entries {
                self.split_node(node);
            }
        } else {
            // Internal node - choose best child
            let best_child_idx = self.choose_subtree(&node.children, &bounds);
            self.insert_into_node(&mut node.children[best_child_idx], entry, bounds);
        }
    }
    
    fn choose_subtree(&self, children: &[RTreeNode], bounds: &BoundingBox3D) -> usize {
        let mut best_idx = 0;
        let mut best_cost = f64::MAX;
        
        for (idx, child) in children.iter().enumerate() {
            let enlarged = self.enlarged_bounds(&child.bounds, bounds);
            let enlargement = self.bounds_volume(&enlarged) - self.bounds_volume(&child.bounds);
            
            if enlargement < best_cost {
                best_cost = enlargement;
                best_idx = idx;
            }
        }
        
        best_idx
    }
    
    fn enlarged_bounds(&self, bounds1: &BoundingBox3D, bounds2: &BoundingBox3D) -> BoundingBox3D {
        BoundingBox3D::new(
            Point3D::new(
                bounds1.min.x.min(bounds2.min.x),
                bounds1.min.y.min(bounds2.min.y),
                bounds1.min.z.min(bounds2.min.z),
            ),
            Point3D::new(
                bounds1.max.x.max(bounds2.max.x),
                bounds1.max.y.max(bounds2.max.y),
                bounds1.max.z.max(bounds2.max.z),
            ),
        )
    }
    
    fn bounds_volume(&self, bounds: &BoundingBox3D) -> f64 {
        let dx = bounds.max.x - bounds.min.x;
        let dy = bounds.max.y - bounds.min.y;
        let dz = bounds.max.z - bounds.min.z;
        dx * dy * dz
    }
    
    fn split_node(&mut self, node: &mut RTreeNode) {
        // Simple linear split algorithm
        // TODO: Implement more sophisticated split algorithm (quadratic or R*-tree split)
        let mid = node.objects.len() / 2;
        let new_objects = node.objects.split_off(mid);
        
        // Recalculate bounds for both nodes
        let bounds1 = self.calculate_bounds_for_objects(&node.objects);
        let bounds2 = self.calculate_bounds_for_objects(&new_objects);
        
        // Create new sibling node
        let new_node = RTreeNode {
            bounds: bounds2,
            children: Vec::new(),
            objects: new_objects,
        };
        
        // Update current node bounds
        node.bounds = bounds1;
        
        // If this is the root, create new root
        if self.root.as_ref().map(|r| r as *const _) == Some(node as *const _) {
            let old_root = std::mem::replace(&mut self.root, None);
            if let Some(old) = old_root {
                self.root = Some(RTreeNode {
                    bounds: self.enlarged_bounds(&old.bounds, &new_node.bounds),
                    children: vec![old, new_node],
                    objects: Vec::new(),
                });
            }
        }
    }
    
    fn calculate_bounds_for_objects(&self, objects: &[(String, SpatialObject)]) -> BoundingBox3D {
        if objects.is_empty() {
            return BoundingBox3D::new(Point3D::default(), Point3D::default());
        }
        
        // For now, use simple placeholder bounds
        // In real implementation, would need to track object bounds
        BoundingBox3D::new(
            Point3D::new(f64::MIN, f64::MIN, f64::MIN),
            Point3D::new(f64::MAX, f64::MAX, f64::MAX),
        )
    }
    
    pub fn query_bounds(&self, query_bounds: &BoundingBox3D) -> Vec<&SpatialObject> {
        let mut results = Vec::new();
        
        if let Some(ref root) = self.root {
            self.query_node(root, query_bounds, &mut results);
        }
        
        results
    }
    
    fn query_node<'a>(&'a self, node: &'a RTreeNode, query_bounds: &BoundingBox3D, results: &mut Vec<&'a SpatialObject>) {
        if !node.bounds.intersects(query_bounds) {
            return;
        }
        
        if node.children.is_empty() {
            // Leaf node - check objects
            for (_, obj) in &node.objects {
                results.push(obj);
            }
        } else {
            // Internal node - recurse to children
            for child in &node.children {
                self.query_node(child, query_bounds, results);
            }
        }
    }
    
    pub fn query_radius(&self, center: &Point3D, radius: f64) -> Vec<&SpatialObject> {
        let query_bounds = BoundingBox3D::new(
            Point3D::new(center.x - radius, center.y - radius, center.z - radius),
            Point3D::new(center.x + radius, center.y + radius, center.z + radius),
        );
        
        self.query_bounds(&query_bounds)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_spatial_index_insert_remove() {
        let mut index = SpatialIndex::new(10.0);
        
        let obj = SpatialObject::Building("building1".to_string());
        let bounds = BoundingBox3D::new(
            Point3D::new(0.0, 0.0, 0.0),
            Point3D::new(5.0, 5.0, 5.0),
        );
        
        index.insert(obj, bounds);
        assert_eq!(index.object_count(), 1);
        
        assert!(index.remove("building1"));
        assert_eq!(index.object_count(), 0);
    }
    
    #[test]
    fn test_spatial_index_query() {
        let mut index = SpatialIndex::new(10.0);
        
        // Insert multiple objects
        for i in 0..10 {
            let obj = SpatialObject::Building(format!("building{}", i));
            let bounds = BoundingBox3D::new(
                Point3D::new(i as f64 * 10.0, 0.0, 0.0),
                Point3D::new(i as f64 * 10.0 + 5.0, 5.0, 5.0),
            );
            index.insert(obj, bounds);
        }
        
        // Query in radius
        let results = index.find_in_radius(&Point3D::new(25.0, 2.5, 2.5), 15.0);
        assert!(results.len() >= 2); // Should find at least buildings 2 and 3
    }
    
    #[test]
    fn test_rtree_basic() {
        let mut rtree = RTree::new(4);
        
        let obj = SpatialObject::Building("building1".to_string());
        let bounds = BoundingBox3D::new(
            Point3D::new(0.0, 0.0, 0.0),
            Point3D::new(5.0, 5.0, 5.0),
        );
        
        rtree.insert(obj, bounds);
        
        let query_bounds = BoundingBox3D::new(
            Point3D::new(-1.0, -1.0, -1.0),
            Point3D::new(6.0, 6.0, 6.0),
        );
        
        let results = rtree.query_bounds(&query_bounds);
        assert_eq!(results.len(), 1);
    }
}

pub mod rtree_spatial_index;
