//! Tauri commands for high-performance viewport operations

use crate::viewport::{ViewportSystem, ViewportBounds, ViewportConfig};
use tauri::State;
use std::sync::Mutex;

/// Global viewport system state
pub struct ViewportState(pub Mutex<ViewportSystem>);

/// Initialize viewport system
#[tauri::command]
pub async fn init_viewport_system(
    state: State<'_, ViewportState>,
    config: ViewportConfig,
) -> Result<(), String> {
    let viewport_system = ViewportSystem::new(config);
    *state.0.lock().unwrap() = viewport_system;
    Ok(())
}

/// Update viewport bounds and get visible objects
#[tauri::command]
pub async fn update_viewport_bounds(
    state: State<'_, ViewportState>,
    bounds: ViewportBounds,
) -> Result<Vec<crate::viewport::SpatialQueryResult>, String> {
    let mut system = state.0.lock().unwrap();
    Ok(system.update_viewport(bounds))
}

/// Get viewport performance metrics
#[tauri::command]
pub async fn get_viewport_metrics(
    state: State<'_, ViewportState>,
) -> Result<crate::viewport::ViewportMetrics, String> {
    let system = state.0.lock().unwrap();
    Ok(system.get_metrics())
}
