use tauri::State;
use crate::{AppState, types::Building, state::BuildingUpdate};
use std::collections::HashMap;
use std::time::Instant;

#[tauri::command]
pub async fn create_building(
    state: State<'_, AppState>,
    building: Building,
) -> Result<Building, String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    let _result = state_manager.create_building(building.clone()).await
        .map_err(|e| e.to_string())?;

    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("create_building", duration);
    
    Ok(building)
}

#[tauri::command]
pub async fn update_building_position(
    state: State<'_, AppState>,
    building_id: String,
    x: f64,
    y: f64,
    floor: Option<i32>,
) -> Result<(), String> {
    let start = Instant::now();
    
    let update = BuildingUpdate {
        x: Some(x),
        y: Some(y),
        z: None,
        floor,
        rotation: None,
    };
    
    let state_manager = state.state_manager.read().await;
    state_manager.update_building(&building_id, update).await
        .map_err(|e| e.to_string())?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("update_building_position", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn update_building_rotation(
    state: State<'_, AppState>,
    building_id: String,
    rotation: u16,
) -> Result<(), String> {
    let start = Instant::now();
    
    let update = BuildingUpdate {
        x: None,
        y: None,
        z: None,
        floor: None,
        rotation: Some(rotation),
    };
    
    let state_manager = state.state_manager.read().await;
    state_manager.update_building(&building_id, update).await
        .map_err(|e| e.to_string())?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("update_building_rotation", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn delete_building(
    state: State<'_, AppState>,
    building_id: String,
) -> Result<(), String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    state_manager.delete_building(&building_id).await
        .map_err(|e| e.to_string())?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("delete_building", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn get_building(
    state: State<'_, AppState>,
    building_id: String,
) -> Result<Option<Building>, String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    let building = state_manager.get_building(&building_id).await;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("get_building", duration);
    
    Ok(building)
}

#[tauri::command]
pub async fn get_all_buildings(
    state: State<'_, AppState>,
) -> Result<HashMap<String, Building>, String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    let buildings = state_manager.get_all_buildings().await;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("get_all_buildings", duration);
    
    Ok(buildings)
}

#[tauri::command]
pub async fn batch_create_buildings(
    state: State<'_, AppState>,
    buildings: Vec<Building>,
) -> Result<Vec<Building>, String> {
    let start = Instant::now();
    let mut created = Vec::new();
    
    for building in buildings {
        {
            let state_manager = state.state_manager.read().await;
            state_manager.create_building(building.clone()).await
                .map_err(|e| e.to_string())?;
        }
        created.push(building);
    }
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("batch_create_buildings", duration);
    
    Ok(created)
}

#[tauri::command]
pub async fn batch_update_buildings(
    state: State<'_, AppState>,
    updates: HashMap<String, BuildingUpdate>,
) -> Result<(), String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    for (building_id, update) in updates {
        state_manager.update_building(&building_id, update).await
            .map_err(|e| e.to_string())?;
    }
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("batch_update_buildings", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn batch_delete_buildings(
    state: State<'_, AppState>,
    building_ids: Vec<String>,
) -> Result<(), String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    for building_id in building_ids {
        state_manager.delete_building(&building_id).await
            .map_err(|e| e.to_string())?;
    }
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("batch_delete_buildings", duration);
    
    Ok(())
}

// Undo/Redo commands
#[tauri::command]
pub async fn undo(state: State<'_, AppState>) -> Result<(), String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    state_manager.undo().await
        .map_err(|e| e.to_string())?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("undo", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn redo(state: State<'_, AppState>) -> Result<(), String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    state_manager.redo().await
        .map_err(|e| e.to_string())?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("redo", duration);
    
    Ok(())
}