use tauri::State;
use crate::{AppState, state::LayoutState};
use crate::compatibility::{
    detect_format, migrate_v1_to_v2, export_v2_to_v1, 
    SaveFileFormat, SaveFileV1, SaveFileV2, SaveFileVersion
};
use std::time::Instant;
use std::path::PathBuf;
use std::collections::HashMap;

#[tauri::command]
pub async fn save_layout(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<(), String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    let layout_state = state_manager.get_state().await;
    
    // Determine save format based on file extension
    let save_as_v1 = file_path.ends_with(".json");
    
    let content = if save_as_v1 {
        // Export as V1 format for backward compatibility
        let v2_save = SaveFileV2 {
            version: SaveFileVersion {
                format_version: 2,
                app_version: env!("CARGO_PKG_VERSION").to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
            layout: layout_state,
            metadata: HashMap::new(),
        };
        
        let v1_save = export_v2_to_v1(&v2_save)
            .map_err(|e| format!("Export to V1 error: {}", e))?;
        
        serde_json::to_string_pretty(&v1_save)
            .map_err(|e| format!("Serialization error: {}", e))?
    } else {
        // Save as V2 format (.slt files)
        let v2_save = SaveFileV2 {
            version: SaveFileVersion {
                format_version: 2,
                app_version: env!("CARGO_PKG_VERSION").to_string(),
                created_at: chrono::Utc::now().timestamp() as u64,
            },
            layout: layout_state,
            metadata: HashMap::new(),
        };
        
        serde_json::to_string_pretty(&v2_save)
            .map_err(|e| format!("Serialization error: {}", e))?
    };
    
    // Write to file
    std::fs::write(&file_path, content)
        .map_err(|e| format!("File write error: {}", e))?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("save_layout", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn load_layout(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<LayoutState, String> {
    let start = Instant::now();
    
    // Read file
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("File read error: {}", e))?;
    
    // Detect format and load accordingly
    let format = detect_format(&content)
        .map_err(|e| format!("Format detection error: {}", e))?;
    
    let layout = match format {
        SaveFileFormat::V1 => {
            // Parse V1 format
            let v1_save: SaveFileV1 = serde_json::from_str(&content)
                .map_err(|e| format!("V1 deserialization error: {}", e))?;
            
            // Migrate to V2
            let v2_save = migrate_v1_to_v2(v1_save)
                .map_err(|e| format!("Migration error: {}", e))?;
            
            v2_save.layout
        },
        SaveFileFormat::V2 => {
            // Parse V2 format directly
            let v2_save: SaveFileV2 = serde_json::from_str(&content)
                .map_err(|e| format!("V2 deserialization error: {}", e))?;
            
            v2_save.layout
        }
    };
    
    // Load into StateManager
    let state_manager = state.state_manager.read().await;
    state_manager.load_state(layout.clone()).await
        .map_err(|e| format!("State load error: {}", e))?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("load_layout", duration);
    
    Ok(layout)
}

#[tauri::command]
pub async fn export_to_json(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    let layout_state = state_manager.get_state().await;
    
    // Serialize to JSON
    let json = serde_json::to_string_pretty(&layout_state)
        .map_err(|e| format!("Serialization error: {}", e))?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("export_to_json", duration);
    
    Ok(json)
}

#[tauri::command]
pub async fn import_from_json(
    state: State<'_, AppState>,
    json_data: String,
) -> Result<(), String> {
    let start = Instant::now();
    
    // Deserialize from JSON
    let _layout: LayoutState = serde_json::from_str(&json_data)
        .map_err(|e| format!("Deserialization error: {}", e))?;

    // TODO: Load into StateManager
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("import_from_json", duration);
    
    Ok(())
}

#[tauri::command]
pub async fn auto_save(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let start = Instant::now();
    
    let state_manager = state.state_manager.read().await;
    let layout_state = state_manager.get_state().await;
    
    // Generate auto-save filename
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("autosave_layout_{}.json", timestamp);
    let path = PathBuf::from("saves").join(&filename);
    
    // Ensure saves directory exists
    std::fs::create_dir_all("saves")
        .map_err(|e| format!("Failed to create saves directory: {}", e))?;
    
    // Serialize and save
    let json = serde_json::to_string_pretty(&layout_state)
        .map_err(|e| format!("Serialization error: {}", e))?;
    
    std::fs::write(&path, json)
        .map_err(|e| format!("File write error: {}", e))?;
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("auto_save", duration);
    
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn list_saves(
    state: State<'_, AppState>,
) -> Result<Vec<SaveInfo>, String> {
    let start = Instant::now();
    
    let saves_dir = PathBuf::from("saves");
    
    if !saves_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut saves = Vec::new();
    
    let entries = std::fs::read_dir(&saves_dir)
        .map_err(|e| format!("Failed to read saves directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "json") {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    saves.push(SaveInfo {
                        filename: path.file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        path: path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        modified: modified.duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_secs())
                            .unwrap_or(0),
                    });
                }
            }
        }
    }
    
    // Sort by modification time (newest first)
    saves.sort_by(|a, b| b.modified.cmp(&a.modified));
    
    // Track performance
    let duration = start.elapsed().as_millis() as u64;
    state.performance_tracker.write().await
        .record_timing("list_saves", duration);
    
    Ok(saves)
}

#[derive(serde::Serialize)]
pub struct SaveInfo {
    filename: String,
    path: String,
    size: u64,
    modified: u64,
}