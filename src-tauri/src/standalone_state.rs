use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use rstar::{RTree, RTreeObject, AABB};

// Import types from the main codebase
use crate::types::geometry::{Point3D, BoundingBox3D};

// Entity types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Building {
    pub id: String,
    pub building_type: String,
    pub position: Point3D,
    pub rotation: f64,
    pub width: f64,
    pub height: f64,
    pub depth: f64,
    pub floor: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConveyorBelt {
    pub id: String,
    pub start: Point3D,
    pub end: Point3D,
    pub belt_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pipeline {
    pub id: String,
    pub segments: Vec<Point3D>,
    pub pipe_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Railway {
    pub id: String,
    pub nodes: Vec<Point3D>,
    pub rail_type: String,
}

// Spatial object for R-tree indexing
#[derive(Debug, Clone)]
pub struct SpatialObject {
    pub id: String,
    pub object_type: ObjectType,
    pub bounds: BoundingBox3D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ObjectType {
    Building,
    ConveyorBelt,
    Pipeline,
    Railway,
}

impl RTreeObject for SpatialObject {
    type Envelope = AABB<[f64; 3]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_corners(
            [self.bounds.min.x, self.bounds.min.y, self.bounds.min.z],
            [self.bounds.max.x, self.bounds.max.y, self.bounds.max.z],
        )
    }
}

// Main state manager
pub struct StateManager {
    pub buildings: HashMap<String, Building>,
    pub conveyor_belts: HashMap<String, ConveyorBelt>,
    pub pipelines: HashMap<String, Pipeline>,
    pub railways: HashMap<String, Railway>,
    pub spatial_index: RTree<SpatialObject>,
}

impl StateManager {
    pub fn new() -> Self {
        Self {
            buildings: HashMap::new(),
            conveyor_belts: HashMap::new(),
            pipelines: HashMap::new(),
            railways: HashMap::new(),
            spatial_index: RTree::new(),
        }
    }

    // Building operations
    pub fn add_building(&mut self, building: Building) -> Result<(), String> {
        let bounds = BoundingBox3D {
            min: Point3D {
                x: building.position.x - building.width / 2.0,
                y: building.position.y - building.height / 2.0,
                z: building.position.z,
            },
            max: Point3D {
                x: building.position.x + building.width / 2.0,
                y: building.position.y + building.height / 2.0,
                z: building.position.z + building.depth,
            },
        };

        let spatial_obj = SpatialObject {
            id: building.id.clone(),
            object_type: ObjectType::Building,
            bounds,
        };

        self.spatial_index.insert(spatial_obj);
        self.buildings.insert(building.id.clone(), building);
        Ok(())
    }

    pub fn remove_building(&mut self, id: &str) -> Result<(), String> {
        if let Some(building) = self.buildings.remove(id) {
            // Remove from spatial index
            self.rebuild_spatial_index();
            Ok(())
        } else {
            Err(format!("Building {} not found", id))
        }
    }

    pub fn update_building(&mut self, id: &str, building: Building) -> Result<(), String> {
        if self.buildings.contains_key(id) {
            self.buildings.insert(id.to_string(), building);
            self.rebuild_spatial_index();
            Ok(())
        } else {
            Err(format!("Building {} not found", id))
        }
    }

    // Viewport culling
    pub fn query_viewport(&self, left: f64, right: f64, top: f64, bottom: f64, z_min: f64, z_max: f64) -> ViewportResult {
        let start_time = std::time::Instant::now();
        
        let envelope = AABB::from_corners(
            [left, top, z_min],
            [right, bottom, z_max],
        );

        let results: Vec<_> = self.spatial_index
            .locate_in_envelope(&envelope)
            .cloned()
            .collect();

        let query_time_ms = start_time.elapsed().as_secs_f64() * 1000.0;

        ViewportResult {
            buildings: results.iter()
                .filter_map(|obj| {
                    if matches!(obj.object_type, ObjectType::Building) {
                        self.buildings.get(&obj.id).cloned()
                    } else {
                        None
                    }
                })
                .collect(),
            conveyor_belts: results.iter()
                .filter_map(|obj| {
                    if matches!(obj.object_type, ObjectType::ConveyorBelt) {
                        self.conveyor_belts.get(&obj.id).cloned()
                    } else {
                        None
                    }
                })
                .collect(),
            pipelines: results.iter()
                .filter_map(|obj| {
                    if matches!(obj.object_type, ObjectType::Pipeline) {
                        self.pipelines.get(&obj.id).cloned()
                    } else {
                        None
                    }
                })
                .collect(),
            railways: results.iter()
                .filter_map(|obj| {
                    if matches!(obj.object_type, ObjectType::Railway) {
                        self.railways.get(&obj.id).cloned()
                    } else {
                        None
                    }
                })
                .collect(),
            metrics: QueryMetrics {
                query_time_ms,
                objects_checked: self.spatial_index.size(),
                objects_returned: results.len(),
                culling_ratio: 1.0 - (results.len() as f64 / self.spatial_index.size().max(1) as f64),
            },
        }
    }

    // Rebuild spatial index from scratch
    pub fn rebuild_spatial_index(&mut self) {
        let mut objects = Vec::new();

        // Add buildings
        for (id, building) in &self.buildings {
            let bounds = BoundingBox3D {
                min: Point3D {
                    x: building.position.x - building.width / 2.0,
                    y: building.position.y - building.height / 2.0,
                    z: building.position.z,
                },
                max: Point3D {
                    x: building.position.x + building.width / 2.0,
                    y: building.position.y + building.height / 2.0,
                    z: building.position.z + building.depth,
                },
            };

            objects.push(SpatialObject {
                id: id.clone(),
                object_type: ObjectType::Building,
                bounds,
            });
        }

        // Add conveyor belts
        for (id, belt) in &self.conveyor_belts {
            let bounds = BoundingBox3D {
                min: Point3D {
                    x: belt.start.x.min(belt.end.x),
                    y: belt.start.y.min(belt.end.y),
                    z: belt.start.z.min(belt.end.z),
                },
                max: Point3D {
                    x: belt.start.x.max(belt.end.x),
                    y: belt.start.y.max(belt.end.y),
                    z: belt.start.z.max(belt.end.z),
                },
            };

            objects.push(SpatialObject {
                id: id.clone(),
                object_type: ObjectType::ConveyorBelt,
                bounds,
            });
        }

        // Bulk load for optimal R-tree construction
        self.spatial_index = RTree::bulk_load(objects);
    }

    // Get stats
    pub fn get_stats(&self) -> StateStats {
        StateStats {
            total_buildings: self.buildings.len(),
            total_conveyors: self.conveyor_belts.len(),
            total_pipelines: self.pipelines.len(),
            total_railways: self.railways.len(),
            spatial_index_size: self.spatial_index.size(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportResult {
    pub buildings: Vec<Building>,
    pub conveyor_belts: Vec<ConveyorBelt>,
    pub pipelines: Vec<Pipeline>,
    pub railways: Vec<Railway>,
    pub metrics: QueryMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryMetrics {
    pub query_time_ms: f64,
    pub objects_checked: usize,
    pub objects_returned: usize,
    pub culling_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateStats {
    pub total_buildings: usize,
    pub total_conveyors: usize,
    pub total_pipelines: usize,
    pub total_railways: usize,
    pub spatial_index_size: usize,
}

// Thread-safe wrapper
pub type SharedStateManager = Arc<RwLock<StateManager>>;