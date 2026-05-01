/*!
 * GPU-accelerated spatial indexing and queries using wgpu compute shaders
 */

use super::{GpuContext, GpuBuffer, ComputePipeline, GpuTimer, GpuUtils};
use super::distance::Point3D;
use anyhow::Result;
use bytemuck::{Pod, Zeroable};
use wgpu::*;

/// Bounding box for GPU calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct BoundingBox {
    pub min: Point3D,
    pub max: Point3D,
}

impl BoundingBox {
    pub fn new(min: Point3D, max: Point3D) -> Self {
        Self { min, max }
    }

    pub fn from_point_radius(center: Point3D, radius: f32) -> Self {
        Self {
            min: Point3D::new(center.x - radius, center.y - radius, center.z - radius),
            max: Point3D::new(center.x + radius, center.y + radius, center.z + radius),
        }
    }

    pub fn contains_point(&self, point: &Point3D) -> bool {
        point.x >= self.min.x && point.x <= self.max.x &&
        point.y >= self.min.y && point.y <= self.max.y &&
        point.z >= self.min.z && point.z <= self.max.z
    }

    pub fn intersects(&self, other: &BoundingBox) -> bool {
        self.min.x <= other.max.x && self.max.x >= other.min.x &&
        self.min.y <= other.max.y && self.max.y >= other.min.y &&
        self.min.z <= other.max.z && self.max.z >= other.min.z
    }
}

/// Spatial object with bounding box and ID
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct SpatialObject {
    pub bbox: BoundingBox,
    pub id: u32,
    pub object_type: u32,
    pub _padding: [u32; 2],
}

impl SpatialObject {
    pub fn new(bbox: BoundingBox, id: u32, object_type: u32) -> Self {
        Self {
            bbox,
            id,
            object_type,
            _padding: [0; 2],
        }
    }
}

/// Query parameters for spatial operations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
struct SpatialParams {
    object_count: u32,
    query_type: u32, // 0 = point, 1 = radius, 2 = bbox, 3 = frustum
    max_results: u32,
    use_early_exit: u32,
    query_point: Point3D,
    query_radius: f32,
    query_bbox: BoundingBox,
    _padding: [f32; 3],
}

/// Query result from GPU
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct SpatialQueryResult {
    pub object_id: u32,
    pub object_type: u32,
    pub distance: f32,
    pub is_valid: u32,
}

impl SpatialQueryResult {
    pub fn empty() -> Self {
        Self {
            object_id: 0,
            object_type: 0,
            distance: f32::MAX,
            is_valid: 0,
        }
    }
}

/// GPU spatial index calculator
pub struct SpatialCalculator {
    context: GpuContext,
    point_query_pipeline: ComputePipeline,
    radius_query_pipeline: ComputePipeline,
    bbox_query_pipeline: ComputePipeline,
    bind_group_layout: BindGroupLayout,
    timer: Option<GpuTimer>,
}

impl SpatialCalculator {
    fn create_bind_group_layout(device: &Device, label: &str) -> BindGroupLayout {
        device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some(label),
            entries: &[
                // spatial_entities buffer
                BindGroupLayoutEntry {
                    binding: 0,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // query_points/query_data buffer
                BindGroupLayoutEntry {
                    binding: 1,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // results buffer
                BindGroupLayoutEntry {
                    binding: 2,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // params uniform
                BindGroupLayoutEntry {
                    binding: 3,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        })
    }

    const POINT_QUERY_SHADER_SOURCE: &'static str = r#"
        struct Point3D {
            x: f32,
            y: f32,
            z: f32,
        }

        struct BoundingBox {
            min: Point3D,
            max: Point3D,
        }

        struct SpatialObject {
            bbox: BoundingBox,
            id: u32,
            object_type: u32,
        }

        struct SpatialParams {
            object_count: u32,
            query_type: u32,
            max_results: u32,
            use_early_exit: u32,
            query_point: Point3D,
            query_radius: f32,
            query_bbox: BoundingBox,
        }

        struct SpatialQueryResult {
            object_id: u32,
            object_type: u32,
            distance: f32,
            is_valid: u32,
        }

        @group(0) @binding(0) var<storage, read> objects: array<SpatialObject>;
        @group(0) @binding(1) var<storage, read_write> results: array<SpatialQueryResult>;
        @group(0) @binding(2) var<uniform> params: SpatialParams;

        fn point_in_bbox(point: Point3D, bbox: BoundingBox) -> bool {
            return point.x >= bbox.min.x && point.x <= bbox.max.x &&
                   point.y >= bbox.min.y && point.y <= bbox.max.y &&
                   point.z >= bbox.min.z && point.z <= bbox.max.z;
        }

        fn distance_to_bbox(point: Point3D, bbox: BoundingBox) -> f32 {
            let dx = max(0.0, max(bbox.min.x - point.x, point.x - bbox.max.x));
            let dy = max(0.0, max(bbox.min.y - point.y, point.y - bbox.max.y));
            let dz = max(0.0, max(bbox.min.z - point.z, point.z - bbox.max.z));
            return sqrt(dx * dx + dy * dy + dz * dz);
        }

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            
            if (index >= params.object_count) {
                return;
            }
            
            let obj = objects[index];
            
            var result: SpatialQueryResult;
            result.object_id = obj.id;
            result.object_type = obj.object_type;
            result.is_valid = 0u;
            
            if (point_in_bbox(params.query_point, obj.bbox)) {
                result.distance = 0.0;
                result.is_valid = 1u;
            } else {
                result.distance = distance_to_bbox(params.query_point, obj.bbox);
                result.is_valid = 0u;
            }
            
            results[index] = result;
        }
    "#;

    const RADIUS_QUERY_SHADER_SOURCE: &'static str = r#"
        struct Point3D {
            x: f32,
            y: f32,
            z: f32,
        }

        struct BoundingBox {
            min: Point3D,
            max: Point3D,
        }

        struct SpatialObject {
            bbox: BoundingBox,
            id: u32,
            object_type: u32,
        }

        struct SpatialParams {
            object_count: u32,
            query_type: u32,
            max_results: u32,
            use_early_exit: u32,
            query_point: Point3D,
            query_radius: f32,
            query_bbox: BoundingBox,
        }

        struct SpatialQueryResult {
            object_id: u32,
            object_type: u32,
            distance: f32,
            is_valid: u32,
        }

        @group(0) @binding(0) var<storage, read> objects: array<SpatialObject>;
        @group(0) @binding(1) var<storage, read_write> results: array<SpatialQueryResult>;
        @group(0) @binding(2) var<uniform> params: SpatialParams;

        fn distance_to_bbox(point: Point3D, bbox: BoundingBox) -> f32 {
            let dx = max(0.0, max(bbox.min.x - point.x, point.x - bbox.max.x));
            let dy = max(0.0, max(bbox.min.y - point.y, point.y - bbox.max.y));
            let dz = max(0.0, max(bbox.min.z - point.z, point.z - bbox.max.z));
            return sqrt(dx * dx + dy * dy + dz * dz);
        }

        fn bbox_center(bbox: BoundingBox) -> Point3D {
            return Point3D(
                (bbox.min.x + bbox.max.x) * 0.5,
                (bbox.min.y + bbox.max.y) * 0.5,
                (bbox.min.z + bbox.max.z) * 0.5
            );
        }

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            
            if (index >= params.object_count) {
                return;
            }
            
            let obj = objects[index];
            
            var result: SpatialQueryResult;
            result.object_id = obj.id;
            result.object_type = obj.object_type;
            result.is_valid = 0u;
            
            let distance = distance_to_bbox(params.query_point, obj.bbox);
            result.distance = distance;
            
            if (distance <= params.query_radius) {
                result.is_valid = 1u;
            }
            
            results[index] = result;
        }
    "#;

    const BBOX_QUERY_SHADER_SOURCE: &'static str = r#"
        struct Point3D {
            x: f32,
            y: f32,
            z: f32,
        }

        struct BoundingBox {
            min: Point3D,
            max: Point3D,
        }

        struct SpatialObject {
            bbox: BoundingBox,
            id: u32,
            object_type: u32,
        }

        struct SpatialParams {
            object_count: u32,
            query_type: u32,
            max_results: u32,
            use_early_exit: u32,
            query_point: Point3D,
            query_radius: f32,
            query_bbox: BoundingBox,
        }

        struct SpatialQueryResult {
            object_id: u32,
            object_type: u32,
            distance: f32,
            is_valid: u32,
        }

        @group(0) @binding(0) var<storage, read> objects: array<SpatialObject>;
        @group(0) @binding(1) var<storage, read_write> results: array<SpatialQueryResult>;
        @group(0) @binding(2) var<uniform> params: SpatialParams;

        fn bbox_intersects(a: BoundingBox, b: BoundingBox) -> bool {
            return a.min.x <= b.max.x && a.max.x >= b.min.x &&
                   a.min.y <= b.max.y && a.max.y >= b.min.y &&
                   a.min.z <= b.max.z && a.max.z >= b.min.z;
        }

        fn bbox_distance(a: BoundingBox, b: BoundingBox) -> f32 {
            let dx = max(0.0, max(a.min.x - b.max.x, b.min.x - a.max.x));
            let dy = max(0.0, max(a.min.y - b.max.y, b.min.y - a.max.y));
            let dz = max(0.0, max(a.min.z - b.max.z, b.min.z - a.max.z));
            return sqrt(dx * dx + dy * dy + dz * dz);
        }

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            
            if (index >= params.object_count) {
                return;
            }
            
            let obj = objects[index];
            
            var result: SpatialQueryResult;
            result.object_id = obj.id;
            result.object_type = obj.object_type;
            result.is_valid = 0u;
            
            if (bbox_intersects(obj.bbox, params.query_bbox)) {
                result.distance = 0.0;
                result.is_valid = 1u;
            } else {
                result.distance = bbox_distance(obj.bbox, params.query_bbox);
                result.is_valid = 0u;
            }
            
            results[index] = result;
        }
    "#;

    /// Create a new spatial calculator
    pub async fn new(context: GpuContext, enable_timing: bool) -> Result<Self> {
        let bind_group_layout = context.device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Spatial Calculator Bind Group Layout"),
            entries: &[
                // objects buffer
                BindGroupLayoutEntry {
                    binding: 0,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // results buffer
                BindGroupLayoutEntry {
                    binding: 1,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // params uniform
                BindGroupLayoutEntry {
                    binding: 2,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let point_query_pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::POINT_QUERY_SHADER_SOURCE,
            "main",
            Self::create_bind_group_layout(&context.device, "Point Query Bind Group Layout"),
            Some("Point Query"),
        )?;

        let radius_query_pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::RADIUS_QUERY_SHADER_SOURCE,
            "main",
            Self::create_bind_group_layout(&context.device, "Radius Query Bind Group Layout"),
            Some("Radius Query"),
        )?;

        let bbox_query_pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::BBOX_QUERY_SHADER_SOURCE,
            "main",
            Self::create_bind_group_layout(&context.device, "Bbox Query Bind Group Layout"),
            Some("BBox Query"),
        )?;

        let timer = if enable_timing && context.supports_feature(Features::TIMESTAMP_QUERY) {
            Some(GpuTimer::new(&context.device))
        } else {
            None
        };

        Ok(Self {
            context,
            point_query_pipeline,
            radius_query_pipeline,
            bbox_query_pipeline,
            bind_group_layout,
            timer,
        })
    }

    /// Query objects by point intersection
    pub async fn query_point(
        &self,
        objects: &[SpatialObject],
        query_point: Point3D,
        max_results: Option<u32>,
    ) -> Result<(Vec<SpatialQueryResult>, Option<f64>)> {
        if objects.is_empty() {
            return Ok((Vec::new(), None));
        }

        let max_results = max_results.unwrap_or(objects.len() as u32);

        // Create buffers
        let objects_buffer = GpuBuffer::with_data(
            &self.context.device,
            objects,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Objects Buffer"),
        );

        let results_buffer = GpuBuffer::new(
            &self.context.device,
            (objects.len() as u64) * std::mem::size_of::<SpatialQueryResult>() as u64,
            BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            Some("Results Buffer"),
        );

        let params = SpatialParams {
            object_count: objects.len() as u32,
            query_type: 0, // Point query
            max_results,
            use_early_exit: 1,
            query_point,
            query_radius: 0.0,
            query_bbox: BoundingBox::new(Point3D::new(0.0, 0.0, 0.0), Point3D::new(0.0, 0.0, 0.0)),
            _padding: [0.0; 3],
        };

        let params_buffer = GpuBuffer::with_data(
            &self.context.device,
            &[params],
            BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            Some("Params Buffer"),
        );

        let (results, timing) = self.execute_query(
            &self.point_query_pipeline,
            &objects_buffer,
            &results_buffer,
            &params_buffer,
            objects.len() as u32,
        ).await?;

        // Filter valid results
        let valid_results: Vec<SpatialQueryResult> = results
            .into_iter()
            .filter(|r| r.is_valid != 0)
            .take(max_results as usize)
            .collect();

        Ok((valid_results, timing))
    }

    /// Query objects within radius
    pub async fn query_radius(
        &self,
        objects: &[SpatialObject],
        query_point: Point3D,
        radius: f32,
        max_results: Option<u32>,
    ) -> Result<(Vec<SpatialQueryResult>, Option<f64>)> {
        if objects.is_empty() {
            return Ok((Vec::new(), None));
        }

        let max_results = max_results.unwrap_or(objects.len() as u32);

        // Create buffers
        let objects_buffer = GpuBuffer::with_data(
            &self.context.device,
            objects,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Objects Buffer"),
        );

        let results_buffer = GpuBuffer::new(
            &self.context.device,
            (objects.len() as u64) * std::mem::size_of::<SpatialQueryResult>() as u64,
            BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            Some("Results Buffer"),
        );

        let params = SpatialParams {
            object_count: objects.len() as u32,
            query_type: 1, // Radius query
            max_results,
            use_early_exit: 1,
            query_point,
            query_radius: radius,
            query_bbox: BoundingBox::new(Point3D::new(0.0, 0.0, 0.0), Point3D::new(0.0, 0.0, 0.0)),
            _padding: [0.0; 3],
        };

        let params_buffer = GpuBuffer::with_data(
            &self.context.device,
            &[params],
            BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            Some("Params Buffer"),
        );

        let (results, timing) = self.execute_query(
            &self.radius_query_pipeline,
            &objects_buffer,
            &results_buffer,
            &params_buffer,
            objects.len() as u32,
        ).await?;

        // Filter valid results and sort by distance
        let mut valid_results: Vec<SpatialQueryResult> = results
            .into_iter()
            .filter(|r| r.is_valid != 0)
            .collect();

        valid_results.sort_by(|a, b| a.distance.partial_cmp(&b.distance).unwrap());
        valid_results.truncate(max_results as usize);

        Ok((valid_results, timing))
    }

    /// Query objects within bounding box
    pub async fn query_bbox(
        &self,
        objects: &[SpatialObject],
        query_bbox: BoundingBox,
        max_results: Option<u32>,
    ) -> Result<(Vec<SpatialQueryResult>, Option<f64>)> {
        if objects.is_empty() {
            return Ok((Vec::new(), None));
        }

        let max_results = max_results.unwrap_or(objects.len() as u32);

        // Create buffers
        let objects_buffer = GpuBuffer::with_data(
            &self.context.device,
            objects,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Objects Buffer"),
        );

        let results_buffer = GpuBuffer::new(
            &self.context.device,
            (objects.len() as u64) * std::mem::size_of::<SpatialQueryResult>() as u64,
            BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            Some("Results Buffer"),
        );

        let params = SpatialParams {
            object_count: objects.len() as u32,
            query_type: 2, // BBox query
            max_results,
            use_early_exit: 1,
            query_point: Point3D::new(0.0, 0.0, 0.0),
            query_radius: 0.0,
            query_bbox,
            _padding: [0.0; 3],
        };

        let params_buffer = GpuBuffer::with_data(
            &self.context.device,
            &[params],
            BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            Some("Params Buffer"),
        );

        let (results, timing) = self.execute_query(
            &self.bbox_query_pipeline,
            &objects_buffer,
            &results_buffer,
            &params_buffer,
            objects.len() as u32,
        ).await?;

        // Filter valid results
        let valid_results: Vec<SpatialQueryResult> = results
            .into_iter()
            .filter(|r| r.is_valid != 0)
            .take(max_results as usize)
            .collect();

        Ok((valid_results, timing))
    }

    /// Execute a spatial query with the given pipeline
    async fn execute_query(
        &self,
        pipeline: &ComputePipeline,
        objects_buffer: &GpuBuffer,
        results_buffer: &GpuBuffer,
        params_buffer: &GpuBuffer,
        object_count: u32,
    ) -> Result<(Vec<SpatialQueryResult>, Option<f64>)> {
        // Create bind group
        let bind_group = self.context.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Spatial Calculator Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: objects_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: results_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: params_buffer.buffer.as_entire_binding(),
                },
            ],
        });

        // Create command encoder
        let mut encoder = self.context.device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("Spatial Calculator Encoder"),
        });

        // Start timing if available
        if let Some(ref timer) = self.timer {
            timer.start(&mut encoder);
        }

        // Dispatch compute shader
        {
            let mut cpass = encoder.begin_compute_pass(&ComputePassDescriptor {
                label: Some("Spatial Calculator Pass"),
                timestamp_writes: None,
            });
            cpass.set_pipeline(&pipeline.pipeline);
            cpass.set_bind_group(0, &bind_group, &[]);

            let (_, num_workgroups) = GpuUtils::calculate_workgroup_size(object_count, 256);
            cpass.dispatch_workgroups(num_workgroups, 1, 1);
        }

        // End timing if available
        if let Some(ref timer) = self.timer {
            timer.end(&mut encoder);
        }

        // Submit commands
        self.context.queue.submit(Some(encoder.finish()));

        // Read back results
        let results = results_buffer.read_data::<SpatialQueryResult>(&self.context.device, &self.context.queue).await?;

        // Get timing result if available
        let timing = if let Some(ref timer) = self.timer {
            let nanoseconds = timer.get_result(&self.context.device).await?;
            Some(nanoseconds as f64 / 1_000_000.0) // Convert to milliseconds
        } else {
            None
        };

        Ok((results, timing))
    }

    /// Benchmark GPU vs CPU performance
    pub async fn benchmark(
        &self,
        object_count: usize,
        query_type: &str,
        iterations: usize,
    ) -> Result<BenchmarkResult> {
        // Generate test objects
        let objects: Vec<SpatialObject> = (0..object_count)
            .map(|i| {
                let offset = i as f32 * 2.0;
                let min = Point3D::new(offset, offset, offset);
                let max = Point3D::new(offset + 1.0, offset + 1.0, offset + 1.0);
                SpatialObject::new(BoundingBox::new(min, max), i as u32, 0)
            })
            .collect();

        let query_point = Point3D::new(object_count as f32, object_count as f32, object_count as f32);
        let query_radius = object_count as f32 * 0.1;

        // Benchmark GPU
        let mut gpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let (_, gpu_time) = match query_type {
                "point" => self.query_point(&objects, query_point, None).await?,
                "radius" => self.query_radius(&objects, query_point, query_radius, None).await?,
                "bbox" => {
                    let bbox = BoundingBox::from_point_radius(query_point, query_radius);
                    self.query_bbox(&objects, bbox, None).await?
                }
                _ => return Err(anyhow::anyhow!("Unknown query type: {}", query_type)),
            };
            let total_time = start.elapsed().as_secs_f64() * 1000.0;
            gpu_times.push(gpu_time.unwrap_or(total_time));
        }

        // Benchmark CPU
        let mut cpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let _cpu_result = Self::query_cpu(&objects, query_point, query_radius, query_type);
            let cpu_time = start.elapsed().as_secs_f64() * 1000.0;
            cpu_times.push(cpu_time);
        }

        let avg_gpu_time = gpu_times.iter().sum::<f64>() / gpu_times.len() as f64;
        let avg_cpu_time = cpu_times.iter().sum::<f64>() / cpu_times.len() as f64;
        let speedup = avg_cpu_time / avg_gpu_time;

        Ok(BenchmarkResult {
            object_count,
            query_type: query_type.to_string(),
            iterations,
            avg_gpu_time_ms: avg_gpu_time,
            avg_cpu_time_ms: avg_cpu_time,
            speedup,
            throughput_gpu: (object_count as f64) / avg_gpu_time * 1000.0,
            throughput_cpu: (object_count as f64) / avg_cpu_time * 1000.0,
        })
    }

    /// CPU reference implementation for benchmarking
    fn query_cpu(
        objects: &[SpatialObject],
        query_point: Point3D,
        query_radius: f32,
        query_type: &str,
    ) -> Vec<SpatialQueryResult> {
        let mut results = Vec::new();

        for obj in objects {
            let mut result = SpatialQueryResult::empty();
            result.object_id = obj.id;
            result.object_type = obj.object_type;

            match query_type {
                "point" => {
                    if obj.bbox.contains_point(&query_point) {
                        result.distance = 0.0;
                        result.is_valid = 1;
                        results.push(result);
                    }
                }
                "radius" => {
                    let distance = Self::distance_to_bbox_cpu(query_point, &obj.bbox);
                    result.distance = distance;
                    if distance <= query_radius {
                        result.is_valid = 1;
                        results.push(result);
                    }
                }
                "bbox" => {
                    let query_bbox = BoundingBox::from_point_radius(query_point, query_radius);
                    if obj.bbox.intersects(&query_bbox) {
                        result.distance = 0.0;
                        result.is_valid = 1;
                        results.push(result);
                    }
                }
                _ => {}
            }
        }

        results
    }

    fn distance_to_bbox_cpu(point: Point3D, bbox: &BoundingBox) -> f32 {
        let dx = 0.0f32.max((bbox.min.x - point.x).max(point.x - bbox.max.x));
        let dy = 0.0f32.max((bbox.min.y - point.y).max(point.y - bbox.max.y));
        let dz = 0.0f32.max((bbox.min.z - point.z).max(point.z - bbox.max.z));
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

/// Benchmark results for spatial calculations
#[derive(Debug, Clone)]
pub struct BenchmarkResult {
    pub object_count: usize,
    pub query_type: String,
    pub iterations: usize,
    pub avg_gpu_time_ms: f64,
    pub avg_cpu_time_ms: f64,
    pub speedup: f64,
    pub throughput_gpu: f64, // objects per second
    pub throughput_cpu: f64, // objects per second
}

impl BenchmarkResult {
    pub fn print_summary(&self) {
        println!("Spatial Query Benchmark Results:");
        println!("  Object Count: {}", self.object_count);
        println!("  Query Type: {}", self.query_type);
        println!("  Iterations: {}", self.iterations);
        println!("  Average GPU Time: {:.3} ms", self.avg_gpu_time_ms);
        println!("  Average CPU Time: {:.3} ms", self.avg_cpu_time_ms);
        println!("  Speedup: {:.2}x", self.speedup);
        println!("  GPU Throughput: {:.0} objects/sec", self.throughput_gpu);
        println!("  CPU Throughput: {:.0} objects/sec", self.throughput_cpu);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_spatial_calculator() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = SpatialCalculator::new(context, false).await?;

        // Create test objects
        let objects = vec![
            SpatialObject::new(
                BoundingBox::new(
                    Point3D::new(0.0, 0.0, 0.0),
                    Point3D::new(1.0, 1.0, 1.0),
                ),
                1,
                0,
            ),
            SpatialObject::new(
                BoundingBox::new(
                    Point3D::new(5.0, 5.0, 5.0),
                    Point3D::new(6.0, 6.0, 6.0),
                ),
                2,
                0,
            ),
        ];

        // Test point query
        let query_point = Point3D::new(0.5, 0.5, 0.5);
        let (results, _) = calculator.query_point(&objects, query_point, None).await?;
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].object_id, 1);

        // Test radius query
        let (results, _) = calculator.query_radius(&objects, query_point, 2.0, None).await?;
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].object_id, 1);

        // Test bbox query
        let query_bbox = BoundingBox::new(
            Point3D::new(-1.0, -1.0, -1.0),
            Point3D::new(2.0, 2.0, 2.0),
        );
        let (results, _) = calculator.query_bbox(&objects, query_bbox, None).await?;
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].object_id, 1);

        Ok(())
    }
}