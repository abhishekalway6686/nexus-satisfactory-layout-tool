use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use tokio::time::{interval, Duration};
use crate::state::LayoutEvent;
use crate::errors::AppError;
use tauri::{AppHandle, Emitter};

/// Event batching configuration
const EVENT_BATCH_SIZE: usize = 100;
const EVENT_BATCH_TIMEOUT_MS: u64 = 50;

/// State synchronization event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncEvent {
    /// Full state snapshot
    StateSnapshot {
        version: u64,
        checksum: String,
        data: StateSnapshotData,
    },
    
    /// Delta update
    StateDelta {
        from_version: u64,
        to_version: u64,
        operations: Vec<DeltaOperation>,
    },
    
    /// State checksum for validation
    StateChecksum {
        version: u64,
        checksum: String,
    },
    
    /// Recovery request
    RecoveryRequest {
        last_known_version: u64,
    },
    
    /// Batch of layout events
    EventBatch {
        events: Vec<LayoutEvent>,
        timestamp: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateSnapshotData {
    pub buildings: serde_json::Value,
    pub conveyor_belts: serde_json::Value,
    pub pipelines: serde_json::Value,
    pub railways: serde_json::Value,
    pub sticky_notes: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "op")]
pub enum DeltaOperation {
    Add { collection: String, id: String, data: serde_json::Value },
    Update { collection: String, id: String, data: serde_json::Value },
    Remove { collection: String, id: String },
    Move { collection: String, id: String, old_pos: [f64; 3], new_pos: [f64; 3] },
}

/// Event synchronization manager
pub struct EventSyncManager {
    app_handle: AppHandle,
    event_buffer: Arc<RwLock<Vec<LayoutEvent>>>,
    event_sender: mpsc::Sender<LayoutEvent>,
    event_receiver: Arc<RwLock<mpsc::Receiver<LayoutEvent>>>,
    state_version: Arc<RwLock<u64>>,
    checksum_cache: Arc<RwLock<HashMap<u64, String>>>,
}

impl EventSyncManager {
    pub fn new(app_handle: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel(1000);
        
        Self {
            app_handle,
            event_buffer: Arc::new(RwLock::new(Vec::with_capacity(EVENT_BATCH_SIZE))),
            event_sender: tx,
            event_receiver: Arc::new(RwLock::new(rx)),
            state_version: Arc::new(RwLock::new(0)),
            checksum_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Start the event batching service
    pub async fn start_batching_service(&self) {
        let event_buffer = self.event_buffer.clone();
        let event_receiver = self.event_receiver.clone();
        let app_handle = self.app_handle.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(EVENT_BATCH_TIMEOUT_MS));
            let mut receiver = event_receiver.write().await;
            
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        // Send buffered events if any
                        let mut buffer = event_buffer.write().await;
                        if !buffer.is_empty() {
                            let events = std::mem::take(&mut *buffer);
                            let batch = SyncEvent::EventBatch {
                                events,
                                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                            };
                            
                            let _ = app_handle.emit("sync-event", &batch);
                        }
                    }
                    
                    Some(event) = receiver.recv() => {
                        // Add to buffer
                        let mut buffer = event_buffer.write().await;
                        buffer.push(event);
                        
                        // Send immediately if buffer is full
                        if buffer.len() >= EVENT_BATCH_SIZE {
                            let events = std::mem::take(&mut *buffer);
                            let batch = SyncEvent::EventBatch {
                                events,
                                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                            };
                            
                            let _ = app_handle.emit("sync-event", &batch);
                        }
                    }
                }
            }
        });
    }
    
    /// Queue an event for batched sending
    pub async fn queue_event(&self, event: LayoutEvent) -> Result<(), AppError> {
        self.event_sender.send(event).await
            .map_err(|_| AppError::OperationError("Failed to queue event".to_string()))
    }
    
    /// Send a high-priority event immediately
    pub async fn send_immediate(&self, event: SyncEvent) -> Result<(), AppError> {
        self.app_handle.emit("sync-event", &event)
            .map_err(|e| AppError::OperationError(format!("Failed to emit event: {}", e)))
    }
    
    /// Update state version and calculate checksum
    pub async fn update_state_version(&self, new_version: u64, checksum: String) {
        let mut version = self.state_version.write().await;
        *version = new_version;
        
        let mut cache = self.checksum_cache.write().await;
        cache.insert(new_version, checksum.clone());
        
        // Keep only last 100 checksums
        if cache.len() > 100 {
            let min_version = new_version.saturating_sub(100);
            cache.retain(|&k, _| k >= min_version);
        }
    }
    
    /// Get checksum for a specific version
    pub async fn get_checksum(&self, version: u64) -> Option<String> {
        self.checksum_cache.read().await.get(&version).cloned()
    }
    
    /// Create a state snapshot
    pub async fn create_snapshot(
        &self,
        state: &crate::state::LayoutState,
    ) -> Result<SyncEvent, AppError> {
        let version = state.version;
        let checksum = calculate_state_checksum(state)?;
        
        // Update version tracking
        self.update_state_version(version, checksum.clone()).await;
        
        // Serialize state components
        let snapshot = StateSnapshotData {
            buildings: serde_json::to_value(&state.buildings)?,
            conveyor_belts: serde_json::to_value(&state.conveyor_belts)?,
            pipelines: serde_json::to_value(&state.pipelines)?,
            railways: serde_json::to_value(&state.railways)?,
            sticky_notes: serde_json::to_value(&state.sticky_notes)?,
        };
        
        Ok(SyncEvent::StateSnapshot {
            version,
            checksum,
            data: snapshot,
        })
    }
    
    /// Create a delta update between versions
    pub async fn create_delta(
        &self,
        from_state: &crate::state::LayoutState,
        to_state: &crate::state::LayoutState,
    ) -> Result<SyncEvent, AppError> {
        let mut operations = Vec::new();
        
        // Compare buildings
        for (id, building) in &to_state.buildings {
            match from_state.buildings.get(id) {
                Some(old_building) => {
                    if building != old_building {
                        // Check if it's just a position change
                        if building.x != old_building.x || 
                           building.y != old_building.y || 
                           building.z != old_building.z {
                            operations.push(DeltaOperation::Move {
                                collection: "buildings".to_string(),
                                id: id.clone(),
                                old_pos: [old_building.x, old_building.y, old_building.z],
                                new_pos: [building.x, building.y, building.z],
                            });
                        } else {
                            operations.push(DeltaOperation::Update {
                                collection: "buildings".to_string(),
                                id: id.clone(),
                                data: serde_json::to_value(building)?,
                            });
                        }
                    }
                }
                None => {
                    operations.push(DeltaOperation::Add {
                        collection: "buildings".to_string(),
                        id: id.clone(),
                        data: serde_json::to_value(building)?,
                    });
                }
            }
        }
        
        // Find removed buildings
        for id in from_state.buildings.keys() {
            if !to_state.buildings.contains_key(id) {
                operations.push(DeltaOperation::Remove {
                    collection: "buildings".to_string(),
                    id: id.clone(),
                });
            }
        }
        
        // TODO: Add similar comparisons for other collections
        
        Ok(SyncEvent::StateDelta {
            from_version: from_state.version,
            to_version: to_state.version,
            operations,
        })
    }
}

/// Calculate a checksum for the entire state
fn calculate_state_checksum(state: &crate::state::LayoutState) -> Result<String, AppError> {
    use sha2::{Sha256, Digest};
    use std::collections::BTreeMap;
    
    let mut hasher = Sha256::new();
    
    // Sort all entities by ID for consistent ordering
    let sorted_buildings: BTreeMap<_, _> = state.buildings.iter().collect();
    let sorted_conveyors: BTreeMap<_, _> = state.conveyor_belts.iter().collect();
    let sorted_pipelines: BTreeMap<_, _> = state.pipelines.iter().collect();
    let sorted_railways: BTreeMap<_, _> = state.railways.iter().collect();
    let sorted_notes: BTreeMap<_, _> = state.sticky_notes.iter().collect();
    
    // Hash each collection
    hasher.update(serde_json::to_string(&sorted_buildings)?);
    hasher.update(serde_json::to_string(&sorted_conveyors)?);
    hasher.update(serde_json::to_string(&sorted_pipelines)?);
    hasher.update(serde_json::to_string(&sorted_railways)?);
    hasher.update(serde_json::to_string(&sorted_notes)?);
    
    // Include version in checksum
    hasher.update(state.version.to_le_bytes());
    
    Ok(format!("{:x}", hasher.finalize()))
}

/// Commands for synchronization
#[tauri::command]
pub async fn verify_state_checksum(
    version: u64,
    client_checksum: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<bool, String> {
    let state_manager = state.state_manager.read().await;
    let state_data = state_manager.get_state().await;
    
    if state_data.version != version {
        return Ok(false);
    }
    
    let server_checksum = calculate_state_checksum(&state_data)
        .map_err(|e| e.to_string())?;
    
    Ok(server_checksum == client_checksum)
}

#[tauri::command]
pub async fn request_state_recovery(
    last_known_version: u64,
    state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
    let state_manager = state.state_manager.read().await;
    let current_state = state_manager.get_state().await;
    
    // If version difference is small, try to send delta
    if current_state.version > last_known_version && 
       current_state.version - last_known_version < 50 {
        // TODO: Implement delta recovery from history
        // For now, always send full snapshot
    }
    
    // Send full snapshot
    let snapshot = state.event_sync.create_snapshot(&current_state).await
        .map_err(|e| e.to_string())?;
    
    state.event_sync.send_immediate(snapshot).await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn force_state_sync(
    state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
    let state_manager = state.state_manager.read().await;
    let state_data = state_manager.get_state().await;
    
    let snapshot = state.event_sync.create_snapshot(&state_data).await
        .map_err(|e| e.to_string())?;
    
    state.event_sync.send_immediate(snapshot).await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_checksum_consistency() {
        let state1 = crate::state::LayoutState::default();
        let checksum1 = calculate_state_checksum(&state1).unwrap();
        let checksum2 = calculate_state_checksum(&state1).unwrap();
        
        assert_eq!(checksum1, checksum2, "Checksums should be consistent");
    }
}