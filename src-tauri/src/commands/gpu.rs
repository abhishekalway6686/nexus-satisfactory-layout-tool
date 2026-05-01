/*!
 * Tauri commands for GPU-accelerated calculations
 */

use crate::gpu::{GpuContext, distance, curve};
use crate::types::geometry::Point3D;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

/// GPU compute state for the application
pub struct GpuState {
    context: Arc<Mutex<Option<GpuContext>>>,
    distance_calculator: Arc<Mutex<Option<distance::DistanceCalculator>>>,
    curve_calculator: Arc<Mutex<Option<curve::CurveCalculator>>>,
}

impl GpuState {
    pub fn new() -> Self {
        Self {
            context: Arc::new(Mutex::new(None)),
            distance_calculator: Arc::new(Mutex::new(None)),
            curve_calculator: Arc::new(Mutex::new(None)),
        }
    }
}

impl Default for GpuState {
    fn default() -> Self {
        Self::new()
    }
}

/// GPU device information
#[derive(Debug, Clone, Serialize)]
pub struct GpuDeviceInfo {
    pub name: String,
    pub backend: String,
    pub device_type: String,
    pub supported: bool,
    pub limits: GpuLimits,
}

/// GPU limits information
#[derive(Debug, Clone, Serialize)]
pub struct GpuLimits {
    pub max_buffer_size: u64,
    pub max_storage_buffer_binding_size: u32,
    pub max_compute_workgroup_size_x: u32,
    pub max_compute_workgroup_size_y: u32,
    pub max_compute_workgroup_size_z: u32,
    pub max_compute_workgroups_per_dimension: u32,
    pub max_compute_invocations_per_workgroup: u32,
}

/// Distance calculation request
#[derive(Debug, Deserialize)]
pub struct DistanceRequest {
    pub points_a: Vec<Point3D>,
    pub points_b: Vec<Point3D>,
    pub distance_type: String, // "3d", "3d_squared", "2d", "2d_squared"
}

/// Distance calculation response
#[derive(Debug, Serialize)]
pub struct DistanceResponse {
    pub distances: Vec<f32>,
    pub compute_time_ms: Option<f64>,
    pub method: String, // "gpu" or "cpu_fallback"
}

/// Curve generation request
#[derive(Debug, Deserialize)]
pub struct CurveRequest {
    pub curves: Vec<CurveDefinition>,
    pub adaptive_tessellation: bool,
    pub curvature_tolerance: f32,
}

/// Single curve definition
#[derive(Debug, Deserialize)]
pub struct CurveDefinition {
    pub start: Point3D,
    pub control: Point3D,
    pub end: Point3D,
    pub steps: u32,
}

/// Curve generation response
#[derive(Debug, Serialize)]
pub struct CurveResponse {
    pub points: Vec<Point3D>,
    pub compute_time_ms: Option<f64>,
    pub method: String, // "gpu" or "cpu_fallback"
}

/// Benchmark request
#[derive(Debug, Deserialize)]
pub struct BenchmarkRequest {
    pub operation: String, // "distance" or "curve"
    pub size: usize,
    pub iterations: usize,
}

/// Benchmark response
#[derive(Debug, Serialize)]
pub struct BenchmarkResponse {
    pub operation: String,
    pub size: usize,
    pub iterations: usize,
    pub gpu_time_ms: f64,
    pub cpu_time_ms: f64,
    pub speedup: f64,
    pub gpu_throughput: f64,
    pub cpu_throughput: f64,
}

/// Initialize GPU compute system
#[tauri::command]
pub async fn initialize_gpu_compute(state: State<'_, GpuState>) -> Result<GpuDeviceInfo, String> {
    log::info!("Initializing GPU compute system...");

    // Initialize GPU context
    let context = match GpuContext::new().await {
        Ok(ctx) => ctx,
        Err(e) => {
            log::error!("Failed to initialize GPU context: {}", e);
            return Err(format!("Failed to initialize GPU: {}", e));
        }
    };

    let adapter_info = context.get_adapter_info();
    let limits = context.get_limits();

    // Store context
    {
        let mut context_guard = state.context.lock().await;
        *context_guard = Some(context.clone());
    }

    // Initialize distance calculator
    match distance::DistanceCalculator::new(context.clone(), true).await {
        Ok(calculator) => {
            let mut calc_guard = state.distance_calculator.lock().await;
            *calc_guard = Some(calculator);
            log::info!("Distance calculator initialized");
        }
        Err(e) => {
            log::warn!("Failed to initialize distance calculator: {}", e);
        }
    }

    // Initialize curve calculator
    match curve::CurveCalculator::new(context.clone(), true).await {
        Ok(calculator) => {
            let mut calc_guard = state.curve_calculator.lock().await;
            *calc_guard = Some(calculator);
            log::info!("Curve calculator initialized");
        }
        Err(e) => {
            log::warn!("Failed to initialize curve calculator: {}", e);
        }
    }

    let device_info = GpuDeviceInfo {
        name: adapter_info.name,
        backend: format!("{:?}", adapter_info.backend),
        device_type: format!("{:?}", adapter_info.device_type),
        supported: true,
        limits: GpuLimits {
            max_buffer_size: limits.max_buffer_size,
            max_storage_buffer_binding_size: limits.max_storage_buffer_binding_size,
            max_compute_workgroup_size_x: limits.max_compute_workgroup_size_x,
            max_compute_workgroup_size_y: limits.max_compute_workgroup_size_y,
            max_compute_workgroup_size_z: limits.max_compute_workgroup_size_z,
            max_compute_workgroups_per_dimension: limits.max_compute_workgroups_per_dimension,
            max_compute_invocations_per_workgroup: limits.max_compute_invocations_per_workgroup,
        },
    };

    log::info!("GPU compute system initialized successfully");
    Ok(device_info)
}

/// Check if GPU compute is available
#[tauri::command]
pub async fn is_gpu_compute_available(state: State<'_, GpuState>) -> Result<bool, String> {
    let context_guard = state.context.lock().await;
    Ok(context_guard.is_some())
}

/// Get GPU device information
#[tauri::command]
pub async fn get_gpu_device_info(state: State<'_, GpuState>) -> Result<Option<GpuDeviceInfo>, String> {
    let context_guard = state.context.lock().await;
    if let Some(context) = context_guard.as_ref() {
        let adapter_info = context.get_adapter_info();
        let limits = context.get_limits();

        Ok(Some(GpuDeviceInfo {
            name: adapter_info.name,
            backend: format!("{:?}", adapter_info.backend),
            device_type: format!("{:?}", adapter_info.device_type),
            supported: true,
            limits: GpuLimits {
                max_buffer_size: limits.max_buffer_size,
                max_storage_buffer_binding_size: limits.max_storage_buffer_binding_size,
                max_compute_workgroup_size_x: limits.max_compute_workgroup_size_x,
                max_compute_workgroup_size_y: limits.max_compute_workgroup_size_y,
                max_compute_workgroup_size_z: limits.max_compute_workgroup_size_z,
                max_compute_workgroups_per_dimension: limits.max_compute_workgroups_per_dimension,
                max_compute_invocations_per_workgroup: limits.max_compute_invocations_per_workgroup,
            },
        }))
    } else {
        Ok(None)
    }
}

/// Calculate distances using GPU acceleration
#[tauri::command]
pub async fn gpu_calculate_distances(
    request: DistanceRequest,
    state: State<'_, GpuState>,
) -> Result<DistanceResponse, String> {
    if request.points_a.len() != request.points_b.len() {
        return Err("Point arrays must have the same length".to_string());
    }

    let calc_guard = state.distance_calculator.lock().await;
    if let Some(calculator) = calc_guard.as_ref() {
        // Convert points to GPU format
        let gpu_points_a: Vec<distance::Point3D> = request.points_a
            .into_iter()
            .map(|p| distance::Point3D::new(p.x, p.y, p.z))
            .collect();

        let gpu_points_b: Vec<distance::Point3D> = request.points_b
            .into_iter()
            .map(|p| distance::Point3D::new(p.x, p.y, p.z))
            .collect();

        // Determine distance type
        let distance_type = match request.distance_type.as_str() {
            "3d" => distance::DistanceType::Distance3D,
            "3d_squared" => distance::DistanceType::Distance3DSquared,
            "2d" => distance::DistanceType::Distance2D,
            "2d_squared" => distance::DistanceType::Distance2DSquared,
            _ => return Err("Invalid distance type".to_string()),
        };

        // Calculate distances
        match calculator.calculate_distances(&gpu_points_a, &gpu_points_b, distance_type).await {
            Ok((distances, timing)) => Ok(DistanceResponse {
                distances,
                compute_time_ms: timing,
                method: "gpu".to_string(),
            }),
            Err(e) => Err(format!("GPU distance calculation failed: {}", e)),
        }
    } else {
        Err("GPU distance calculator not initialized".to_string())
    }
}

/// Generate Bezier curves using GPU acceleration
#[tauri::command]
pub async fn gpu_generate_curves(
    request: CurveRequest,
    state: State<'_, GpuState>,
) -> Result<CurveResponse, String> {
    let calc_guard = state.curve_calculator.lock().await;
    if let Some(calculator) = calc_guard.as_ref() {
        // Convert curves to GPU format
        let gpu_curves: Vec<curve::BezierCurve> = request.curves
            .into_iter()
            .map(|c| curve::BezierCurve::new(
                distance::Point3D::new(c.start.x, c.start.y, c.start.z),
                distance::Point3D::new(c.control.x, c.control.y, c.control.z),
                distance::Point3D::new(c.end.x, c.end.y, c.end.z),
                c.steps,
            ))
            .collect();

        // Generate curves
        match calculator.generate_curves(
            &gpu_curves,
            request.adaptive_tessellation,
            request.curvature_tolerance,
        ).await {
            Ok((points, timing)) => {
                // Convert points back to client format
                let client_points: Vec<Point3D> = points
                    .into_iter()
                    .map(|p| Point3D { x: p.x, y: p.y, z: p.z })
                    .collect();

                Ok(CurveResponse {
                    points: client_points,
                    compute_time_ms: timing,
                    method: "gpu".to_string(),
                })
            }
            Err(e) => Err(format!("GPU curve generation failed: {}", e)),
        }
    } else {
        Err("GPU curve calculator not initialized".to_string())
    }
}

/// Calculate length of a Bezier curve
#[tauri::command]
pub async fn gpu_calculate_curve_length(
    start: Point3D,
    control: Point3D,
    end: Point3D,
    samples: u32,
    state: State<'_, GpuState>,
) -> Result<f32, String> {
    let calc_guard = state.curve_calculator.lock().await;
    if let Some(calculator) = calc_guard.as_ref() {
        let gpu_start = distance::Point3D::new(start.x, start.y, start.z);
        let gpu_control = distance::Point3D::new(control.x, control.y, control.z);
        let gpu_end = distance::Point3D::new(end.x, end.y, end.z);

        match calculator.calculate_curve_length(gpu_start, gpu_control, gpu_end, samples).await {
            Ok(length) => Ok(length),
            Err(e) => Err(format!("GPU curve length calculation failed: {}", e)),
        }
    } else {
        Err("GPU curve calculator not initialized".to_string())
    }
}

/// Run GPU compute benchmarks
#[tauri::command]
pub async fn gpu_benchmark(
    request: BenchmarkRequest,
    state: State<'_, GpuState>,
) -> Result<BenchmarkResponse, String> {
    match request.operation.as_str() {
        "distance" => {
            let calc_guard = state.distance_calculator.lock().await;
            if let Some(calculator) = calc_guard.as_ref() {
                match calculator.benchmark(request.size, request.iterations).await {
                    Ok(result) => Ok(BenchmarkResponse {
                        operation: request.operation,
                        size: request.size,
                        iterations: request.iterations,
                        gpu_time_ms: result.avg_gpu_time_ms,
                        cpu_time_ms: result.avg_cpu_time_ms,
                        speedup: result.speedup,
                        gpu_throughput: result.throughput_gpu,
                        cpu_throughput: result.throughput_cpu,
                    }),
                    Err(e) => Err(format!("Distance benchmark failed: {}", e)),
                }
            } else {
                Err("Distance calculator not initialized".to_string())
            }
        }
        "curve" => {
            let calc_guard = state.curve_calculator.lock().await;
            if let Some(calculator) = calc_guard.as_ref() {
                match calculator.benchmark(request.size, 20, request.iterations).await {
                    Ok(result) => Ok(BenchmarkResponse {
                        operation: request.operation,
                        size: request.size,
                        iterations: request.iterations,
                        gpu_time_ms: result.avg_gpu_time_ms,
                        cpu_time_ms: result.avg_cpu_time_ms,
                        speedup: result.speedup,
                        gpu_throughput: result.throughput_gpu,
                        cpu_throughput: result.throughput_cpu,
                    }),
                    Err(e) => Err(format!("Curve benchmark failed: {}", e)),
                }
            } else {
                Err("Curve calculator not initialized".to_string())
            }
        }
        _ => Err("Invalid benchmark operation".to_string()),
    }
}

/// Get GPU memory usage statistics
#[tauri::command]
pub async fn get_gpu_memory_stats() -> Result<serde_json::Value, String> {
    let memory_manager = crate::gpu::get_gpu_memory_manager();
    
    Ok(serde_json::json!({
        "current_usage_bytes": memory_manager.get_current_usage(),
        "peak_usage_bytes": memory_manager.get_peak_usage(),
        "current_usage_mb": memory_manager.get_current_usage() as f64 / (1024.0 * 1024.0),
        "peak_usage_mb": memory_manager.get_peak_usage() as f64 / (1024.0 * 1024.0),
    }))
}

/// Cleanup GPU resources (called on app shutdown)
#[tauri::command]
pub async fn cleanup_gpu_compute(state: State<'_, GpuState>) -> Result<(), String> {
    log::info!("Cleaning up GPU compute resources...");

    // Clear calculators
    {
        let mut calc_guard = state.distance_calculator.lock().await;
        *calc_guard = None;
    }

    {
        let mut calc_guard = state.curve_calculator.lock().await;
        *calc_guard = None;
    }

    // Clear context
    {
        let mut context_guard = state.context.lock().await;
        *context_guard = None;
    }

    log::info!("GPU compute cleanup completed");
    Ok(())
}

/// Test GPU connection and basic functionality
#[tauri::command]
pub async fn test_gpu_compute(state: State<'_, GpuState>) -> Result<serde_json::Value, String> {
    // Test distance calculation with small dataset
    let test_points_a = vec![
        Point3D { x: 0.0, y: 0.0, z: 0.0 },
        Point3D { x: 1.0, y: 1.0, z: 1.0 },
    ];

    let test_points_b = vec![
        Point3D { x: 1.0, y: 0.0, z: 0.0 },
        Point3D { x: 2.0, y: 2.0, z: 2.0 },
    ];

    let distance_request = DistanceRequest {
        points_a: test_points_a,
        points_b: test_points_b,
        distance_type: "3d".to_string(),
    };

    let distance_result = gpu_calculate_distances(distance_request, state.clone()).await;

    // Test curve generation with simple curve
    let curve_request = CurveRequest {
        curves: vec![CurveDefinition {
            start: Point3D { x: 0.0, y: 0.0, z: 0.0 },
            control: Point3D { x: 5.0, y: 10.0, z: 0.0 },
            end: Point3D { x: 10.0, y: 0.0, z: 0.0 },
            steps: 10,
        }],
        adaptive_tessellation: false,
        curvature_tolerance: 0.1,
    };

    let curve_result = gpu_generate_curves(curve_request, state).await;

    // Get device info
    let device_info = get_gpu_device_info(state).await?;

    Ok(serde_json::json!({
        "distance_test": {
            "success": distance_result.is_ok(),
            "result": distance_result.ok(),
            "error": distance_result.err(),
        },
        "curve_test": {
            "success": curve_result.is_ok(),
            "result": curve_result.ok(),
            "error": curve_result.err(),
        },
        "device_info": device_info,
        "memory_stats": get_gpu_memory_stats().await?,
    }))
}