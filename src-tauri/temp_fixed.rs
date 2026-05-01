/*!
 * GPU-accelerated computing module using wgpu
 * Provides high-performance implementations of expensive calculations
 */

pub mod distance;
pub mod curve;
pub mod intersection;
pub mod spatial;
pub mod compute_manager;

use std::sync::Arc;
use anyhow::{Context, Result};
use wgpu::{Device, Queue, Adapter, Instance, Backends, PowerPreference, util::DeviceExt};

/// Simple GPU memory manager for tracking usage
pub struct GpuMemoryManager {
    current_usage: std::sync::atomic::AtomicU64,
    peak_usage: std::sync::atomic::AtomicU64,
}

impl GpuMemoryManager {
    pub fn new() -> Self {
        Self {
            current_usage: std::sync::atomic::AtomicU64::new(0),
            peak_usage: std::sync::atomic::AtomicU64::new(0),
        }
    }
    
    pub fn get_current_usage(&self) -> u64 {
        self.current_usage.load(std::sync::atomic::Ordering::Relaxed)
    }
    
    pub fn get_peak_usage(&self) -> u64 {
        self.peak_usage.load(std::sync::atomic::Ordering::Relaxed)
    }
}

static GPU_MEMORY_MANAGER: std::sync::OnceLock<GpuMemoryManager> = std::sync::OnceLock::new();

pub fn get_gpu_memory_manager() -> &'static GpuMemoryManager {
    GPU_MEMORY_MANAGER.get_or_init(|| GpuMemoryManager::new())
}

/// GPU compute context that manages the wgpu device and queue
#[derive(Clone)]
pub struct GpuContext {
    pub device: Arc<Device>,
    pub queue: Arc<Queue>,
    pub adapter: Arc<Adapter>,
}

impl GpuContext {
    /// Initialize the GPU context with the best available adapter
    pub async fn new() -> Result<Self> {
        let instance = Instance::new(wgpu::InstanceDescriptor {
            backends: Backends::all(),
            ..Default::default()
        });

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .context("Failed to find an appropriate adapter")?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    required_features: wgpu::Features::TIMESTAMP_QUERY 
                        | wgpu::Features::PIPELINE_STATISTICS_QUERY
                        | wgpu::Features::SPIRV_SHADER_PASSTHROUGH
                        | wgpu::Features::MAPPABLE_PRIMARY_BUFFERS
                        | wgpu::Features::BUFFER_BINDING_ARRAY
                        | wgpu::Features::STORAGE_RESOURCE_BINDING_ARRAY,
                    required_limits: wgpu::Limits {
                        max_buffer_size: 1024 * 1024 * 1024, // 1GB max buffer
                        max_storage_buffer_binding_size: 1024 * 1024 * 512, // 512MB max storage buffer
                        max_compute_workgroup_size_x: 1024,
                        max_compute_workgroup_size_y: 1024,
                        max_compute_workgroup_size_z: 64,
                        max_compute_workgroups_per_dimension: 65535,
                        max_compute_invocations_per_workgroup: 1024,
                        ..Default::default()
                    },
                    label: Some("SatisfactoryLayoutTool GPU Device"),
                },
                None,
            )
            .await
            .context("Failed to create device")?;

        log::info!("GPU Context initialized: {}", adapter.get_info().name);
        log::info!("Backend: {:?}", adapter.get_info().backend);
        log::info!("Device Type: {:?}", adapter.get_info().device_type);

        Ok(Self {
            device: Arc::new(device),
            queue: Arc::new(queue),
            adapter: Arc::new(adapter),
        })
    }

    /// Get adapter information for diagnostics
    pub fn get_adapter_info(&self) -> wgpu::AdapterInfo {
        self.adapter.get_info()
    }

    /// Get device limits for configuration
    pub fn get_limits(&self) -> wgpu::Limits {
        self.device.limits()
    }

    /// Check if a specific feature is supported
    pub fn supports_feature(&self, feature: wgpu::Features) -> bool {
        self.device.features().contains(feature)
    }
}

/// GPU buffer wrapper with automatic cleanup
pub struct GpuBuffer {
    pub buffer: wgpu::Buffer,
    pub size: u64,
    pub usage: wgpu::BufferUsages,
}

impl GpuBuffer {
    /// Create a new GPU buffer
    pub fn new(
        device: &Device,
        size: u64,
        usage: wgpu::BufferUsages,
        label: Option<&str>,
    ) -> Self {
        let buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label,
            size,
            usage,
            mapped_at_creation: false,
        });

        Self { buffer, size, usage }
    }

    /// Create a buffer with initial data
    pub fn with_data<T: bytemuck::Pod>(
        device: &Device,
        data: &[T],
        usage: wgpu::BufferUsages,
        label: Option<&str>,
    ) -> Self {
        let buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label,
            contents: bytemuck::cast_slice(data),
            usage,
        });

        Self {
            buffer,
            size: (data.len() * std::mem::size_of::<T>()) as u64,
            usage,
        }
    }

    /// Write data to the buffer
    pub fn write_data<T: bytemuck::Pod>(&self, queue: &Queue, data: &[T]) {
        queue.write_buffer(&self.buffer, 0, bytemuck::cast_slice(data));
    }

    /// Read data from the buffer (requires COPY_SRC usage)
    pub async fn read_data<T: bytemuck::Pod + Clone>(&self, device: &Device) -> Result<Vec<T>> {
        let staging_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Buffer"),
            size: self.size,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Copy Encoder"),
        });

        encoder.copy_buffer_to_buffer(&self.buffer, 0, &staging_buffer, 0, self.size);

        device.get_queue().submit(Some(encoder.finish()));

        let buffer_slice = staging_buffer.slice(..);
        let (sender, receiver) = futures::channel::oneshot::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            sender.send(result).unwrap();
        });

        device.poll(wgpu::Maintain::Wait);
        receiver.await??;

        let data = buffer_slice.get_mapped_range();
        let result: Vec<T> = bytemuck::cast_slice(&data).to_vec();
        drop(data);
        staging_buffer.unmap();

        Ok(result)
    }
}

/// Compute pipeline wrapper for easier usage
pub struct ComputePipeline {
    pub pipeline: wgpu::ComputePipeline,
    pub bind_group_layout: wgpu::BindGroupLayout,
}

impl ComputePipeline {
    /// Create a new compute pipeline from WGSL source
    pub fn new(
        device: &Device,
        shader_source: &str,
        entry_point: &str,
        label: Option<&str>,
    ) -> Result<Self> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("{}_shader", label.unwrap_or("compute"))),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some(&format!("{}_bind_group_layout", label.unwrap_or("compute"))),
            entries: &[], // Will be populated by specific implementations
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("{}_pipeline_layout", label.unwrap_or("compute"))),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label,
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point,
        });

        Ok(Self {
            pipeline,
            bind_group_layout,
        })
    }

    /// Create a compute pipeline with a custom bind group layout
    pub fn with_layout(
        device: &Device,
        shader_source: &str,
        entry_point: &str,
        bind_group_layout: wgpu::BindGroupLayout,
        label: Option<&str>,
    ) -> Result<Self> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("{}_shader", label.unwrap_or("compute"))),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("{}_pipeline_layout", label.unwrap_or("compute"))),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label,
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point,
        });

        Ok(Self {
            pipeline,
            bind_group_layout,
        })
    }
}

/// Performance timer for GPU operations
pub struct GpuTimer {
    query_set: wgpu::QuerySet,
    resolve_buffer: wgpu::Buffer,
    destination_buffer: wgpu::Buffer,
}

impl GpuTimer {
    /// Create a new GPU timer
    pub fn new(device: &Device) -> Self {
        let query_set = device.create_query_set(&wgpu::QuerySetDescriptor {
            label: Some("Timestamp Query Set"),
            ty: wgpu::QueryType::Timestamp,
            count: 2,
        });

        let resolve_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Query Resolve Buffer"),
            size: 16, // 2 timestamps * 8 bytes each
            usage: wgpu::BufferUsages::QUERY_RESOLVE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let destination_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Query Result Buffer"),
            size: 16,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        Self {
            query_set,
            resolve_buffer,
            destination_buffer,
        }
    }

    /// Start timing
    pub fn start(&self, encoder: &mut wgpu::CommandEncoder) {
        encoder.write_timestamp(&self.query_set, 0);
    }

    /// End timing
    pub fn end(&self, encoder: &mut wgpu::CommandEncoder) {
        encoder.write_timestamp(&self.query_set, 1);
        encoder.resolve_query_set(&self.query_set, 0..2, &self.resolve_buffer, 0);
        encoder.copy_buffer_to_buffer(&self.resolve_buffer, 0, &self.destination_buffer, 0, 16);
    }

    /// Get timing result in nanoseconds
    pub async fn get_result(&self, device: &Device) -> Result<u64> {
        let buffer_slice = self.destination_buffer.slice(..);
        let (sender, receiver) = futures::channel::oneshot::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            sender.send(result).unwrap();
        });

        device.poll(wgpu::Maintain::Wait);
        receiver.await??;

        let data = buffer_slice.get_mapped_range();
        let timestamps: &[u64] = bytemuck::cast_slice(&data);
        let duration = timestamps[1] - timestamps[0];
        drop(data);
        self.destination_buffer.unmap();

        Ok(duration)
    }
}

/// Common GPU computation utilities
pub struct GpuUtils;

impl GpuUtils {
    /// Calculate optimal workgroup size for a given problem size
    pub fn calculate_workgroup_size(problem_size: u32, max_workgroup_size: u32) -> (u32, u32) {
        let workgroup_size = max_workgroup_size.min(256); // Conservative default
        let num_workgroups = (problem_size + workgroup_size - 1) / workgroup_size;
        (workgroup_size, num_workgroups)
    }

    /// Calculate optimal 2D workgroup layout
    pub fn calculate_2d_workgroup_size(
        width: u32,
        height: u32,
        max_workgroup_size: u32,
    ) -> ((u32, u32), (u32, u32)) {
        let max_dim = (max_workgroup_size as f32).sqrt() as u32;
        let workgroup_x = max_dim.min(16); // Conservative 2D workgroup size
        let workgroup_y = max_dim.min(16);
        
        let num_workgroups_x = (width + workgroup_x - 1) / workgroup_x;
        let num_workgroups_y = (height + workgroup_y - 1) / workgroup_y;
        
        ((workgroup_x, workgroup_y), (num_workgroups_x, num_workgroups_y))
    }

    /// Create a staging buffer for reading data back from GPU
    pub fn create_staging_buffer(device: &Device, size: u64) -> wgpu::Buffer {
        device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Buffer"),
            size,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        })
    }

    /// Submit a command buffer and wait for completion
    pub async fn submit_and_wait(device: &Device, queue: &Queue, commands: wgpu::CommandBuffer) {
        queue.submit(Some(commands));
        device.poll(wgpu::Maintain::Wait);
    }
}

/// Error types for GPU operations
#[derive(thiserror::Error, Debug)]
pub enum GpuError {
    #[error("GPU initialization failed: {0}")]
    InitializationFailed(String),
    
    #[error("Buffer operation failed: {0}")]
    BufferError(String),
    
    #[error("Compute operation failed: {0}")]
    ComputeError(String),
    
    #[error("GPU not available")]
    GpuNotAvailable,
    
    #[error("Insufficient GPU memory")]
    InsufficientMemory,
}

