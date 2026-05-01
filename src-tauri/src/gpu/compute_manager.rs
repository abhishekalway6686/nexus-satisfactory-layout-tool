/*!
 * GPU compute manager that orchestrates all GPU-accelerated calculations
 */

use super::{GpuContext, distance::DistanceCalculator, curve::CurveCalculator, intersection::IntersectionCalculator, spatial::SpatialCalculator};
use anyhow::{Context, Result};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Centralized GPU compute manager
pub struct ComputeManager {
    context: GpuContext,
    distance_calculator: Arc<RwLock<Option<DistanceCalculator>>>,
    curve_calculator: Arc<RwLock<Option<CurveCalculator>>>,
    intersection_calculator: Arc<RwLock<Option<IntersectionCalculator>>>,
    spatial_calculator: Arc<RwLock<Option<SpatialCalculator>>>,
    is_initialized: Arc<RwLock<bool>>,
    enable_timing: bool,
}

impl ComputeManager {
    /// Create a new compute manager
    pub async fn new(enable_timing: bool) -> Result<Self> {
        let context = GpuContext::new().await?;
        
        Ok(Self {
            context,
            distance_calculator: Arc::new(RwLock::new(None)),
            curve_calculator: Arc::new(RwLock::new(None)),
            intersection_calculator: Arc::new(RwLock::new(None)),
            spatial_calculator: Arc::new(RwLock::new(None)),
            is_initialized: Arc::new(RwLock::new(false)),
            enable_timing,
        })
    }

    /// Initialize all calculators lazily
    pub async fn initialize(&self) -> Result<()> {
        let mut is_initialized = self.is_initialized.write().await;
        if *is_initialized {
            return Ok(());
        }

        log::info!("Initializing GPU compute manager...");

        // Initialize distance calculator
        {
            let mut distance_calc = self.distance_calculator.write().await;
            *distance_calc = Some(
                DistanceCalculator::new(self.context.clone(), self.enable_timing)
                    .await
                    .context("Failed to initialize distance calculator")?
            );
        }

        // Initialize curve calculator
        {
            let mut curve_calc = self.curve_calculator.write().await;
            *curve_calc = Some(
                CurveCalculator::new(self.context.clone(), self.enable_timing)
                    .await
                    .context("Failed to initialize curve calculator")?
            );
        }

        // Initialize intersection calculator
        {
            let mut intersection_calc = self.intersection_calculator.write().await;
            *intersection_calc = Some(
                IntersectionCalculator::new(self.context.clone(), self.enable_timing)
                    .await
                    .context("Failed to initialize intersection calculator")?
            );
        }

        // Initialize spatial calculator
        {
            let mut spatial_calc = self.spatial_calculator.write().await;
            *spatial_calc = Some(
                SpatialCalculator::new(self.context.clone(), self.enable_timing)
                    .await
                    .context("Failed to initialize spatial calculator")?
            );
        }

        *is_initialized = true;
        log::info!("GPU compute manager initialized successfully");
        Ok(())
    }

    /// Check if GPU is available and working
    pub async fn is_gpu_available(&self) -> bool {
        self.is_initialized.read().await.clone()
    }

    /// Get adapter information
    pub fn get_adapter_info(&self) -> wgpu::AdapterInfo {
        self.context.get_adapter_info()
    }

    /// Get device limits
    pub fn get_limits(&self) -> wgpu::Limits {
        self.context.get_limits()
    }

    /// Get distance calculator
    pub async fn distance_calculator(&self) -> Result<Arc<RwLock<Option<DistanceCalculator>>>> {
        if !*self.is_initialized.read().await {
            self.initialize().await?;
        }
        Ok(self.distance_calculator.clone())
    }

    /// Get curve calculator
    pub async fn curve_calculator(&self) -> Result<Arc<RwLock<Option<CurveCalculator>>>> {
        if !*self.is_initialized.read().await {
            self.initialize().await?;
        }
        Ok(self.curve_calculator.clone())
    }

    /// Get intersection calculator
    pub async fn intersection_calculator(&self) -> Result<Arc<RwLock<Option<IntersectionCalculator>>>> {
        if !*self.is_initialized.read().await {
            self.initialize().await?;
        }
        Ok(self.intersection_calculator.clone())
    }

    /// Get spatial calculator
    pub async fn spatial_calculator(&self) -> Result<Arc<RwLock<Option<SpatialCalculator>>>> {
        if !*self.is_initialized.read().await {
            self.initialize().await?;
        }
        Ok(self.spatial_calculator.clone())
    }

    /// Run comprehensive benchmark of all GPU operations
    pub async fn run_full_benchmark(&self) -> Result<FullBenchmarkResult> {
        self.initialize().await?;

        log::info!("Starting comprehensive GPU benchmark...");

        // Distance benchmark
        let distance_result = {
            let calc_guard = self.distance_calculator.read().await;
            if let Some(ref calc) = *calc_guard {
                Some(calc.benchmark(10000, 5).await?)
            } else {
                None
            }
        };

        // Curve benchmark
        let curve_result = {
            let calc_guard = self.curve_calculator.read().await;
            if let Some(ref calc) = *calc_guard {
                Some(calc.benchmark(1000, 50, 5).await?)
            } else {
                None
            }
        };

        // Intersection benchmark
        let intersection_result = {
            let calc_guard = self.intersection_calculator.read().await;
            if let Some(ref calc) = *calc_guard {
                Some(calc.benchmark(500, 500, 3).await?)
            } else {
                None
            }
        };

        // Spatial benchmark
        let spatial_result = {
            let calc_guard = self.spatial_calculator.read().await;
            if let Some(ref calc) = *calc_guard {
                Some(calc.benchmark(10000, "radius", 5).await?)
            } else {
                None
            }
        };

        log::info!("GPU benchmark completed");

        Ok(FullBenchmarkResult {
            adapter_info: self.get_adapter_info(),
            distance_benchmark: distance_result,
            curve_benchmark: curve_result,
            intersection_benchmark: intersection_result,
            spatial_benchmark: spatial_result,
        })
    }

    /// Get memory usage statistics
    pub fn get_memory_stats(&self) -> GpuMemoryStats {
        let memory_manager = super::get_gpu_memory_manager();
        GpuMemoryStats {
            current_usage_bytes: memory_manager.get_current_usage(),
            peak_usage_bytes: memory_manager.get_peak_usage(),
            adapter_info: self.get_adapter_info(),
            device_limits: self.get_limits(),
        }
    }

    /// Test GPU availability and return diagnostic information
    pub async fn run_diagnostics(&self) -> GpuDiagnostics {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Test initialization
        match self.initialize().await {
            Ok(_) => {},
            Err(e) => {
                errors.push(format!("Failed to initialize GPU: {}", e));
                return GpuDiagnostics {
                    is_available: false,
                    adapter_info: None,
                    errors,
                    warnings,
                    features_supported: Vec::new(),
                    memory_info: None,
                };
            }
        }

        let adapter_info = self.get_adapter_info();
        let limits = self.get_limits();

        // Check features
        let mut features_supported = Vec::new();
        if self.context.supports_feature(wgpu::Features::TIMESTAMP_QUERY) {
            features_supported.push("TIMESTAMP_QUERY".to_string());
        } else {
            warnings.push("TIMESTAMP_QUERY not supported - timing will be unavailable".to_string());
        }

        if self.context.supports_feature(wgpu::Features::PIPELINE_STATISTICS_QUERY) {
            features_supported.push("PIPELINE_STATISTICS_QUERY".to_string());
        }

        if self.context.supports_feature(wgpu::Features::STORAGE_RESOURCE_BINDING_ARRAY) {
            features_supported.push("STORAGE_RESOURCE_BINDING_ARRAY".to_string());
        }

        // Check memory limits
        if limits.max_buffer_size < 100 * 1024 * 1024 {
            warnings.push(format!("Max buffer size is only {} MB, some operations may be limited", 
                limits.max_buffer_size / (1024 * 1024)));
        }

        if limits.max_compute_workgroup_size_x < 256 {
            warnings.push("Max workgroup size is limited, performance may be reduced".to_string());
        }

        GpuDiagnostics {
            is_available: true,
            adapter_info: Some(adapter_info),
            errors,
            warnings,
            features_supported,
            memory_info: Some(self.get_memory_stats()),
        }
    }
}

/// Full benchmark results for all GPU operations
#[derive(Debug, Clone)]
pub struct FullBenchmarkResult {
    pub adapter_info: wgpu::AdapterInfo,
    pub distance_benchmark: Option<super::distance::BenchmarkResult>,
    pub curve_benchmark: Option<super::curve::BenchmarkResult>,
    pub intersection_benchmark: Option<super::intersection::BenchmarkResult>,
    pub spatial_benchmark: Option<super::spatial::BenchmarkResult>,
}

impl FullBenchmarkResult {
    pub fn print_summary(&self) {
        println!("=== GPU Compute Benchmark Results ===");
        println!("Adapter: {}", self.adapter_info.name);
        println!("Backend: {:?}", self.adapter_info.backend);
        println!("Device Type: {:?}", self.adapter_info.device_type);
        println!();

        if let Some(ref result) = self.distance_benchmark {
            result.print_summary();
            println!();
        }

        if let Some(ref result) = self.curve_benchmark {
            result.print_summary();
            println!();
        }

        if let Some(ref result) = self.intersection_benchmark {
            result.print_summary();
            println!();
        }

        if let Some(ref result) = self.spatial_benchmark {
            result.print_summary();
            println!();
        }

        println!("=== End Benchmark Results ===");
    }

    pub fn get_overall_speedup(&self) -> Option<f64> {
        let mut speedups = Vec::new();

        if let Some(ref result) = self.distance_benchmark {
            speedups.push(result.speedup);
        }

        if let Some(ref result) = self.curve_benchmark {
            speedups.push(result.speedup);
        }

        if let Some(ref result) = self.intersection_benchmark {
            speedups.push(result.speedup);
        }

        if let Some(ref result) = self.spatial_benchmark {
            speedups.push(result.speedup);
        }

        if speedups.is_empty() {
            None
        } else {
            Some(speedups.iter().sum::<f64>() / speedups.len() as f64)
        }
    }
}

/// GPU memory usage statistics
#[derive(Debug, Clone)]
pub struct GpuMemoryStats {
    pub current_usage_bytes: u64,
    pub peak_usage_bytes: u64,
    pub adapter_info: wgpu::AdapterInfo,
    pub device_limits: wgpu::Limits,
}

/// GPU diagnostic information
#[derive(Debug, Clone)]
pub struct GpuDiagnostics {
    pub is_available: bool,
    pub adapter_info: Option<wgpu::AdapterInfo>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub features_supported: Vec<String>,
    pub memory_info: Option<GpuMemoryStats>,
}

impl GpuDiagnostics {
    pub fn print_report(&self) {
        println!("=== GPU Diagnostics Report ===");
        
        if self.is_available {
            println!("✅ GPU is available and functional");
            
            if let Some(ref info) = self.adapter_info {
                println!("📱 Adapter: {}", info.name);
                println!("🔧 Backend: {:?}", info.backend);
                println!("💾 Device Type: {:?}", info.device_type);
            }

            if !self.features_supported.is_empty() {
                println!("✨ Supported Features:");
                for feature in &self.features_supported {
                    println!("   • {}", feature);
                }
            }

            if let Some(ref memory) = self.memory_info {
                println!("💾 Memory Usage:");
                println!("   • Current: {} MB", memory.current_usage_bytes / (1024 * 1024));
                println!("   • Peak: {} MB", memory.peak_usage_bytes / (1024 * 1024));
                println!("   • Max Buffer: {} MB", memory.device_limits.max_buffer_size / (1024 * 1024));
            }

            if !self.warnings.is_empty() {
                println!("⚠️  Warnings:");
                for warning in &self.warnings {
                    println!("   • {}", warning);
                }
            }
        } else {
            println!("❌ GPU is not available");
        }

        if !self.errors.is_empty() {
            println!("🚨 Errors:");
            for error in &self.errors {
                println!("   • {}", error);
            }
        }

        println!("=== End Diagnostics Report ===");
    }
}

// Global compute manager instance
static COMPUTE_MANAGER: tokio::sync::OnceCell<ComputeManager> = tokio::sync::OnceCell::const_new();

/// Get the global compute manager instance
pub async fn get_compute_manager() -> Result<&'static ComputeManager> {
    COMPUTE_MANAGER.get_or_try_init(|| async {
        ComputeManager::new(true).await
    }).await
}

/// Initialize the global compute manager
pub async fn initialize_compute_manager() -> Result<()> {
    let manager = get_compute_manager().await?;
    manager.initialize().await
}

/// Check if GPU is available globally
pub async fn is_gpu_available() -> bool {
    match get_compute_manager().await {
        Ok(manager) => manager.is_gpu_available().await,
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_compute_manager() -> Result<()> {
        let manager = ComputeManager::new(false).await?;
        manager.initialize().await?;

        assert!(manager.is_gpu_available().await);

        // Test that we can get calculators
        let distance_calc = manager.distance_calculator().await?;
        assert!(distance_calc.read().await.is_some());

        let curve_calc = manager.curve_calculator().await?;
        assert!(curve_calc.read().await.is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_diagnostics() -> Result<()> {
        let manager = ComputeManager::new(false).await?;
        let diagnostics = manager.run_diagnostics().await;
        
        assert!(diagnostics.is_available);
        assert!(diagnostics.adapter_info.is_some());
        
        Ok(())
    }
}