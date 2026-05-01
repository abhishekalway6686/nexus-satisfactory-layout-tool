use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use crate::types::{Building, ConveyorBelt, Pipeline, Railway, StickyNote, Point3D, BoundingBox3D, ConveyorPole, ConveyorSegment, PipeSupport, PipeSegment, RailwayNode, RailwaySegment};
use crate::spatial::{SpatialIndex, SpatialObject};
use crate::errors::AppError;
// Note: geometry functions imported but not used in current implementation

/// Maximum number of undo/redo states to keep
const MAX_HISTORY_SIZE: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutState {
    pub buildings: HashMap<String, Building>,
    pub conveyor_belts: HashMap<String, ConveyorBelt>,
    pub conveyor_poles: HashMap<String, ConveyorPole>,
    pub conveyor_segments: HashMap<String, ConveyorSegment>,
    pub pipelines: HashMap<String, Pipeline>,
    pub pipe_supports: HashMap<String, PipeSupport>,
    pub pipe_segments: HashMap<String, PipeSegment>,
    pub railways: HashMap<String, Railway>,
    pub railway_nodes: HashMap<String, RailwayNode>,
    pub railway_segments: HashMap<String, RailwaySegment>,
    pub sticky_notes: HashMap<String, StickyNote>,
    pub version: u64,
}

impl Default for LayoutState {
    fn default() -> Self {
        Self {
            buildings: HashMap::new(),
            conveyor_belts: HashMap::new(),
            conveyor_poles: HashMap::new(),
            conveyor_segments: HashMap::new(),
            pipelines: HashMap::new(),
            pipe_supports: HashMap::new(),
            pipe_segments: HashMap::new(),
            railways: HashMap::new(),
            railway_nodes: HashMap::new(),
            railway_segments: HashMap::new(),
            sticky_notes: HashMap::new(),
            version: 0,
        }
    }
}

impl LayoutState {
    /// Create a deep clone for snapshotting
    pub fn snapshot(&self) -> LayoutState {
        self.clone()
    }
    
    /// Get all infrastructure connected to a building
    pub fn get_connected_infrastructure(&self, building_id: &str) -> ConnectedInfrastructure {
        let mut connected = ConnectedInfrastructure::default();
        
        // Find connected conveyors
        for (id, belt) in &self.conveyor_belts {
            if belt.from_building_id.as_ref() == Some(&building_id.to_string()) ||
               belt.to_building_id.as_ref() == Some(&building_id.to_string()) {
                connected.conveyor_belts.push(id.clone());
            }
        }
        
        // Find connected pipelines
        for (id, pipeline) in &self.pipelines {
            if pipeline.from_building_id.as_ref() == Some(&building_id.to_string()) ||
               pipeline.to_building_id.as_ref() == Some(&building_id.to_string()) {
                connected.pipelines.push(id.clone());
            }
        }
        
        // Find connected railways
        for (id, railway) in &self.railways {
            if railway.connected_buildings.contains(&building_id.to_string()) {
                connected.railways.push(id.clone());
            }
        }
        
        connected
    }
}

#[derive(Debug, Default)]
pub struct ConnectedInfrastructure {
    pub conveyor_belts: Vec<String>,
    pub pipelines: Vec<String>,
    pub railways: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LayoutEvent {
    // Building events
    BuildingCreated { building_id: String },
    BuildingUpdated { building_id: String, old_position: Point3D },
    BuildingDeleted { building_id: String },
    
    // Conveyor events
    ConveyorCreated { conveyor_id: String },
    ConveyorUpdated { conveyor_id: String },
    ConveyorDeleted { conveyor_id: String },
    ConveyorsMerged { old_ids: Vec<String>, new_id: String },
    
    // Pipeline events
    PipelineCreated { pipeline_id: String },
    PipelineUpdated { pipeline_id: String },
    PipelineDeleted { pipeline_id: String },
    PipelinesMerged { old_ids: Vec<String>, new_id: String },
    
    // Railway events
    RailwayCreated { railway_id: String },
    RailwayUpdated { railway_id: String },
    RailwayDeleted { railway_id: String },
    RailwaysMerged { old_ids: Vec<String>, new_id: String },
    
    // Sticky note events
    StickyNoteCreated { note_id: String },
    StickyNoteUpdated { note_id: String },
    StickyNoteDeleted { note_id: String },
    
    // State events
    StateReset,
    StateLoaded,
}

/// Thread-safe state manager with undo/redo support
pub struct StateManager {
    current: Arc<RwLock<LayoutState>>,
    history: Arc<RwLock<VecDeque<LayoutState>>>,
    redo_stack: Arc<RwLock<VecDeque<LayoutState>>>,
    spatial_index: Arc<RwLock<SpatialIndex>>,
    event_sender: broadcast::Sender<LayoutEvent>,
}

impl StateManager {
    pub fn new(event_sender: broadcast::Sender<LayoutEvent>) -> Self {
        Self {
            current: Arc::new(RwLock::new(LayoutState::default())),
            history: Arc::new(RwLock::new(VecDeque::with_capacity(MAX_HISTORY_SIZE))),
            redo_stack: Arc::new(RwLock::new(VecDeque::new())),
            spatial_index: Arc::new(RwLock::new(SpatialIndex::new(10.0))),
            event_sender,
        }
    }
    
    /// Save current state to history before making changes
    async fn save_to_history(&self) {
        let current = self.current.read().await;
        let mut history = self.history.write().await;
        
        // Add current state to history
        history.push_back(current.snapshot());
        
        // Limit history size
        if history.len() > MAX_HISTORY_SIZE {
            history.pop_front();
        }
        
        // Clear redo stack when new action is performed
        let mut redo_stack = self.redo_stack.write().await;
        redo_stack.clear();
    }
    
    /// Undo last operation
    pub async fn undo(&self) -> Result<(), AppError> {
        let mut history = self.history.write().await;
        
        if let Some(previous_state) = history.pop_back() {
            let current = self.current.read().await;
            let current_snapshot = current.snapshot();
            drop(current);
            
            // Save current state to redo stack
            let mut redo_stack = self.redo_stack.write().await;
            redo_stack.push_back(current_snapshot);
            
            // Restore previous state
            let mut current = self.current.write().await;
            *current = previous_state;
            current.version += 1;
            
            // Rebuild spatial index
            self.rebuild_spatial_index(&current).await?;
            
            // Send event
            let _ = self.event_sender.send(LayoutEvent::StateReset);
            
            Ok(())
        } else {
            Err(AppError::OperationError("Nothing to undo".to_string()))
        }
    }
    
    /// Redo last undone operation
    pub async fn redo(&self) -> Result<(), AppError> {
        let mut redo_stack = self.redo_stack.write().await;
        
        if let Some(redo_state) = redo_stack.pop_back() {
            // Save current state to history
            let current = self.current.read().await;
            let mut history = self.history.write().await;
            history.push_back(current.snapshot());
            drop(current);
            
            // Restore redo state
            let mut current = self.current.write().await;
            *current = redo_state;
            current.version += 1;
            
            // Rebuild spatial index
            self.rebuild_spatial_index(&current).await?;
            
            // Send event
            let _ = self.event_sender.send(LayoutEvent::StateReset);
            
            Ok(())
        } else {
            Err(AppError::OperationError("Nothing to redo".to_string()))
        }
    }
    
    /// Rebuild spatial index from current state
    pub async fn rebuild_spatial_index(&self, state: &LayoutState) -> Result<(), AppError> {
        let mut spatial_index = self.spatial_index.write().await;
        spatial_index.clear();
        
        // Add all buildings
        for (id, building) in &state.buildings {
            let bounds = building.calculate_bounds();
            spatial_index.insert(SpatialObject::Building(id.clone()), bounds);
        }
        
        // Add conveyor segments
        for (id, segment) in &state.conveyor_segments {
            if let (Some(start_pole), Some(end_pole)) = (
                state.conveyor_poles.get(&segment.start_pole),
                state.conveyor_poles.get(&segment.end_pole)
            ) {
                let bounds = calculate_segment_bounds(
                    &Point3D::new(start_pole.x, start_pole.y, start_pole.z),
                    &Point3D::new(end_pole.x, end_pole.y, end_pole.z)
                );
                spatial_index.insert(SpatialObject::ConveyorBelt(id.clone()), bounds);
            }
        }
        
        // Add pipe segments
        for (id, segment) in &state.pipe_segments {
            if let (Some(start_support), Some(end_support)) = (
                state.pipe_supports.get(&segment.start_support),
                state.pipe_supports.get(&segment.end_support)
            ) {
                let bounds = calculate_segment_bounds(
                    &Point3D::new(start_support.x, start_support.y, start_support.z),
                    &Point3D::new(end_support.x, end_support.y, end_support.z)
                );
                spatial_index.insert(SpatialObject::Pipeline(id.clone()), bounds);
            }
        }
        
        // Add railway segments
        for (id, segment) in &state.railway_segments {
            if let (Some(start_node), Some(end_node)) = (
                state.railway_nodes.get(&segment.start_node),
                state.railway_nodes.get(&segment.end_node)
            ) {
                let bounds = calculate_segment_bounds(
                    &Point3D::new(start_node.x, start_node.y, start_node.z),
                    &Point3D::new(end_node.x, end_node.y, end_node.z)
                );
                spatial_index.insert(SpatialObject::Railway(id.clone()), bounds);
            }
        }
        
        // Add sticky notes
        for (id, note) in &state.sticky_notes {
            let bounds = note.calculate_bounds();
            spatial_index.insert(SpatialObject::StickyNote(id.clone()), bounds);
        }
        
        Ok(())
    }
    
    // Building operations
    
    pub async fn create_building(&self, building: Building) -> Result<(), AppError> {
        self.save_to_history().await;
        
        let building_id = building.id.clone();
        let bounds = building.calculate_bounds();
        
        let mut state = self.current.write().await;
        state.buildings.insert(building_id.clone(), building);
        state.version += 1;
        
        // Update spatial index
        let mut spatial_index = self.spatial_index.write().await;
        spatial_index.insert(SpatialObject::Building(building_id.clone()), bounds);
        
        // Send event
        let _ = self.event_sender.send(LayoutEvent::BuildingCreated { building_id });
        
        Ok(())
    }
    
    pub async fn update_building(&self, building_id: &str, update: BuildingUpdate) -> Result<(), AppError> {
        self.save_to_history().await;
        
        let mut state = self.current.write().await;
        
        if let Some(building) = state.buildings.get_mut(building_id) {
            let old_position = Point3D::new(building.x, building.y, building.z);
            
            // Apply updates
            if let Some(x) = update.x {
                building.x = x;
            }
            if let Some(y) = update.y {
                building.y = y;
            }
            if let Some(z) = update.z {
                building.z = z;
            }
            if let Some(floor) = update.floor {
                building.floor = floor;
                building.z = floor as f64 * 4.0; // Update z based on floor
            }
            if let Some(rotation) = update.rotation {
                building.rotation = rotation;
            }
            
            // Calculate bounds and store new position before updating version
            let bounds = building.calculate_bounds();
            let new_position = Point3D::new(building.x, building.y, building.z);
            
            // Now we can update version as we're done with building
            state.version += 1;
            
            // Update spatial index
            let mut spatial_index = self.spatial_index.write().await;
            spatial_index.remove(building_id);
            spatial_index.insert(SpatialObject::Building(building_id.to_string()), bounds);
            
            // Update connected infrastructure if position changed
            if old_position.x != new_position.x || old_position.y != new_position.y || old_position.z != new_position.z {
                self.update_connected_infrastructure(&mut state, building_id, &old_position).await?;
            }
            
            // Send event
            let _ = self.event_sender.send(LayoutEvent::BuildingUpdated { 
                building_id: building_id.to_string(),
                old_position,
            });
            
            Ok(())
        } else {
            Err(AppError::NotFound(format!("Building {} not found", building_id)))
        }
    }
    
    pub async fn delete_building(&self, building_id: &str) -> Result<(), AppError> {
        self.save_to_history().await;
        
        let mut state = self.current.write().await;
        
        if state.buildings.remove(building_id).is_some() {
            state.version += 1;
            
            // Remove from spatial index
            let mut spatial_index = self.spatial_index.write().await;
            spatial_index.remove(building_id);
            
            // Delete connected infrastructure
            let connected = state.get_connected_infrastructure(building_id);
            
            for belt_id in connected.conveyor_belts {
                self.delete_conveyor_internal(&mut state, &belt_id).await?;
            }
            
            for pipeline_id in connected.pipelines {
                self.delete_pipeline_internal(&mut state, &pipeline_id).await?;
            }
            
            for railway_id in connected.railways {
                // Remove building from railway's connected buildings list
                if let Some(railway) = state.railways.get_mut(&railway_id) {
                    railway.connected_buildings.retain(|id| id != building_id);
                }
            }
            
            // Send event
            let _ = self.event_sender.send(LayoutEvent::BuildingDeleted { 
                building_id: building_id.to_string() 
            });
            
            Ok(())
        } else {
            Err(AppError::NotFound(format!("Building {} not found", building_id)))
        }
    }
    
    // Infrastructure update helper
    async fn update_connected_infrastructure(
        &self,
        _state: &mut LayoutState,
        _building_id: &str,
        _old_position: &Point3D,
    ) -> Result<(), AppError> {
        // This is a placeholder - in a full implementation, this would:
        // 1. Find all conveyors, pipes, and railways connected to this building
        // 2. Update their anchor points to follow the building's new position
        // 3. Recalculate their paths
        // 4. Update the spatial index for affected segments
        
        Ok(())
    }
    
    // Internal helpers for deleting infrastructure
    async fn delete_conveyor_internal(&self, state: &mut LayoutState, conveyor_id: &str) -> Result<(), AppError> {
        if let Some(belt) = state.conveyor_belts.remove(conveyor_id) {
            // Remove associated segments and poles
            for segment_id in &belt.segments {
                if let Some(segment) = state.conveyor_segments.remove(segment_id) {
                    // Remove orphaned poles
                    if !self.is_pole_used(&state, &segment.start_pole) {
                        state.conveyor_poles.remove(&segment.start_pole);
                    }
                    if !self.is_pole_used(&state, &segment.end_pole) {
                        state.conveyor_poles.remove(&segment.end_pole);
                    }
                }
            }
        }
        Ok(())
    }
    
    async fn delete_pipeline_internal(&self, state: &mut LayoutState, pipeline_id: &str) -> Result<(), AppError> {
        if let Some(pipeline) = state.pipelines.remove(pipeline_id) {
            // Remove associated segments and supports
            for segment_id in &pipeline.segments {
                if let Some(segment) = state.pipe_segments.remove(segment_id) {
                    // Remove orphaned supports
                    if !self.is_support_used(&state, &segment.start_support) {
                        state.pipe_supports.remove(&segment.start_support);
                    }
                    if !self.is_support_used(&state, &segment.end_support) {
                        state.pipe_supports.remove(&segment.end_support);
                    }
                }
            }
        }
        Ok(())
    }
    
    fn is_pole_used(&self, state: &LayoutState, pole_id: &str) -> bool {
        state.conveyor_segments.values().any(|seg| 
            seg.start_pole == pole_id || seg.end_pole == pole_id
        )
    }
    
    fn is_support_used(&self, state: &LayoutState, support_id: &str) -> bool {
        state.pipe_segments.values().any(|seg| 
            seg.start_support == support_id || seg.end_support == support_id
        )
    }
    
    // State loading
    
    pub async fn load_state(&self, new_state: LayoutState) -> Result<(), AppError> {
        self.save_to_history().await;
        
        let mut current = self.current.write().await;
        *current = new_state;
        current.version += 1;
        
        // Rebuild spatial index
        self.rebuild_spatial_index(&current).await?;
        
        // Send event
        let _ = self.event_sender.send(LayoutEvent::StateLoaded);
        
        Ok(())
    }
    
    // State management
    
    pub async fn update_state(&self, new_state: LayoutState) -> Result<(), AppError> {
        self.save_to_history().await;
        
        let mut current = self.current.write().await;
        *current = new_state;
        current.version += 1;
        
        // Rebuild spatial index
        self.rebuild_spatial_index(&current).await?;
        
        // Send event
        let _ = self.event_sender.send(LayoutEvent::StateReset);
        
        Ok(())
    }
    
    // Getters
    
    pub async fn get_state(&self) -> LayoutState {
        self.current.read().await.clone()
    }
    
    pub async fn get_building(&self, building_id: &str) -> Option<Building> {
        self.current.read().await.buildings.get(building_id).cloned()
    }
    
    pub async fn get_all_buildings(&self) -> HashMap<String, Building> {
        self.current.read().await.buildings.clone()
    }
    
    pub async fn find_buildings_in_radius(&self, center: &Point3D, radius: f64) -> Vec<Building> {
        let spatial_index = self.spatial_index.read().await;
        let objects = spatial_index.find_in_radius(center, radius);
        
        let state = self.current.read().await;
        objects.into_iter()
            .filter_map(|obj| match obj {
                SpatialObject::Building(id) => state.buildings.get(&id).cloned(),
                _ => None,
            })
            .collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildingUpdate {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub z: Option<f64>,
    pub floor: Option<i32>,
    pub rotation: Option<u16>,
}

/// Calculate bounding box for a line segment
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

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::broadcast;
    
    #[tokio::test]
    async fn test_state_manager_undo_redo() {
        let (tx, _rx) = broadcast::channel(100);
        let manager = StateManager::new(tx);
        
        // Create a building
        let building = Building {
            id: "test1".to_string(),
            building_type: "Constructor".to_string(),
            x: 10.0,
            y: 20.0,
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
        
        manager.create_building(building).await.unwrap();
        
        // Update the building
        let update = BuildingUpdate {
            x: Some(30.0),
            y: None,
            z: None,
            floor: None,
            rotation: None,
        };
        
        manager.update_building("test1", update).await.unwrap();
        
        // Check current state
        let state = manager.get_state().await;
        assert_eq!(state.buildings.get("test1").unwrap().x, 30.0);
        
        // Undo
        manager.undo().await.unwrap();
        let state = manager.get_state().await;
        assert_eq!(state.buildings.get("test1").unwrap().x, 10.0);
        
        // Redo
        manager.redo().await.unwrap();
        let state = manager.get_state().await;
        assert_eq!(state.buildings.get("test1").unwrap().x, 30.0);
    }
}