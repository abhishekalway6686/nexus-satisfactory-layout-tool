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
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        Ok(Self {
            pipeline,
            bind_group_layout,
        })
    }

    /// Create a compute pipeline with entries for the bind group layout
    pub fn with_bind_group_entries(
        device: &Device,
        shader_source: &str,
        entry_point: &str,
        bind_group_entries: &[wgpu::BindGroupLayoutEntry],
        label: Option<&str>,
    ) -> Result<Self> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("{}_shader", label.unwrap_or("compute"))),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some(&format!("{}_bind_group_layout", label.unwrap_or("compute"))),
            entries: bind_group_entries,
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
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        Ok(Self {
            pipeline,
            bind_group_layout,
        })
    }
}
