/*!
 * GPU-accelerated Bezier curve calculations using wgpu compute shaders
 */

use super::{GpuContext, GpuBuffer, ComputePipeline, GpuTimer, GpuUtils};
use super::distance::Point3D;
use anyhow::Result;
use bytemuck::{Pod, Zeroable};
use wgpu::*;

/// Bezier curve definition for GPU calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct BezierCurve {
    pub start: Point3D,
    pub control: Point3D,
    pub end: Point3D,
    pub steps: u32,
    pub _padding: [f32; 3], // Align to 64 bytes
}

impl BezierCurve {
    pub fn new(start: Point3D, control: Point3D, end: Point3D, steps: u32) -> Self {
        Self {
            start,
            control,
            end,
            steps,
            _padding: [0.0; 3],
        }
    }
}

/// Parameters for curve calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
struct CurveParams {
    curve_count: u32,
    max_steps: u32,
    adaptive_tessellation: u32,
    curvature_tolerance: f32,
}

/// GPU curve calculator
pub struct CurveCalculator {
    context: GpuContext,
    bezier_pipeline: ComputePipeline,
    adaptive_pipeline: Option<ComputePipeline>,
    bind_group_layout: BindGroupLayout,
    timer: Option<GpuTimer>,
}

impl CurveCalculator {
    fn create_bind_group_layout(device: &Device, label: &str) -> BindGroupLayout {
        device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some(label),
            entries: &[
                // curves buffer
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
                // points buffer
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
                // optimal_steps buffer (for adaptive)
                BindGroupLayoutEntry {
                    binding: 3,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // max_curvatures buffer (for adaptive)
                BindGroupLayoutEntry {
                    binding: 4,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        })
    }

    const BEZIER_SHADER_SOURCE: &'static str = r#"
        struct BezierCurve {
            start: vec4<f32>,
            control: vec4<f32>,
            end: vec4<f32>,
            steps: u32,
        }

        struct CurveParams {
            curve_count: u32,
            max_steps: u32,
            adaptive_tessellation: u32,
            curvature_tolerance: f32,
        }

        @group(0) @binding(0) var<storage, read> curves: array<BezierCurve>;
        @group(0) @binding(1) var<storage, read_write> points: array<vec4<f32>>;
        @group(0) @binding(2) var<storage, read_write> point_offsets: array<u32>;
        @group(0) @binding(3) var<uniform> params: CurveParams;

        fn evaluate_bezier(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> vec3<f32> {
            let u = 1.0 - t;
            return u * u * start + 2.0 * u * t * control + t * t * end;
        }

        fn bezier_tangent(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> vec3<f32> {
            let u = 1.0 - t;
            return 2.0 * u * (control - start) + 2.0 * t * (end - control);
        }

        fn calculate_curvature(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> f32 {
            let tangent = bezier_tangent(start, control, end, t);
            let dt = 0.001;
            let tangent2 = bezier_tangent(start, control, end, t + dt);
            let curvature_vec = (tangent2 - tangent) / dt;
            let tangent_length = length(tangent);
            if (tangent_length < 0.001) {
                return 0.0;
            }
            return length(curvature_vec) / (tangent_length * tangent_length * tangent_length);
        }

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let curve_index = global_id.x;
            
            if (curve_index >= params.curve_count) {
                return;
            }
            
            let curve = curves[curve_index];
            let base_offset = point_offsets[curve_index];
            
            var actual_steps = curve.steps;
            
            // Adaptive tessellation based on curvature
            if (params.adaptive_tessellation == 1u) {
                var max_curvature = 0.0;
                let sample_count = 10u;
                
                for (var i = 0u; i < sample_count; i++) {
                    let t = f32(i) / f32(sample_count - 1u);
                    let curvature = calculate_curvature(curve.start.xyz, curve.control.xyz, curve.end.xyz, t);
                    max_curvature = max(max_curvature, curvature);
                }
                
                // Adjust steps based on curvature
                let curvature_factor = min(max_curvature / params.curvature_tolerance, 4.0);
                actual_steps = u32(f32(curve.steps) * (1.0 + curvature_factor));
                actual_steps = min(actual_steps, params.max_steps);
            }
            
            // Generate tessellated points
            for (var i = 0u; i <= actual_steps; i++) {
                let t = f32(i) / f32(actual_steps);
                let point = evaluate_bezier(curve.start.xyz, curve.control.xyz, curve.end.xyz, t);
                
                let point_index = base_offset + i;
                if (point_index < arrayLength(&points)) {
                    points[point_index] = vec4<f32>(point, 1.0);
                }
            }
        }
    "#;

    const ADAPTIVE_ANALYSIS_SHADER_SOURCE: &'static str = r#"
        struct BezierCurve {
            start: vec4<f32>,
            control: vec4<f32>,
            end: vec4<f32>,
            steps: u32,
        }

        struct CurveParams {
            curve_count: u32,
            max_steps: u32,
            adaptive_tessellation: u32,
            curvature_tolerance: f32,
        }

        @group(0) @binding(0) var<storage, read> curves: array<BezierCurve>;
        @group(0) @binding(1) var<storage, read_write> optimal_steps: array<u32>;
        @group(0) @binding(2) var<storage, read_write> max_curvatures: array<f32>;
        @group(0) @binding(3) var<uniform> params: CurveParams;

        fn bezier_tangent(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> vec3<f32> {
            let u = 1.0 - t;
            return 2.0 * u * (control - start) + 2.0 * t * (end - control);
        }

        fn calculate_curvature(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> f32 {
            let tangent = bezier_tangent(start, control, end, t);
            let dt = 0.001;
            let tangent2 = bezier_tangent(start, control, end, t + dt);
            let curvature_vec = (tangent2 - tangent) / dt;
            let tangent_length = length(tangent);
            if (tangent_length < 0.001) {
                return 0.0;
            }
            return length(curvature_vec) / (tangent_length * tangent_length * tangent_length);
        }

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let curve_index = global_id.x;
            
            if (curve_index >= params.curve_count) {
                return;
            }
            
            let curve = curves[curve_index];
            
            // Analyze curvature across the curve
            var max_curvature = 0.0;
            let sample_count = 20u;
            
            for (var i = 0u; i < sample_count; i++) {
                let t = f32(i) / f32(sample_count - 1u);
                let curvature = calculate_curvature(curve.start.xyz, curve.control.xyz, curve.end.xyz, t);
                max_curvature = max(max_curvature, curvature);
            }
            
            // Calculate optimal step count
            let curvature_factor = min(max_curvature / params.curvature_tolerance, 4.0);
            let optimal = u32(f32(curve.steps) * (1.0 + curvature_factor));
            
            optimal_steps[curve_index] = min(optimal, params.max_steps);
            max_curvatures[curve_index] = max_curvature;
        }
    "#;

    /// Create a new curve calculator
    pub async fn new(context: GpuContext, enable_timing: bool) -> Result<Self> {
        let bind_group_layout = context.device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Curve Calculator Bind Group Layout"),
            entries: &[
                // curves buffer
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
                // points buffer (or optimal_steps for adaptive)
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
                // point_offsets buffer (or max_curvatures for adaptive)
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
        });

        let bezier_pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::BEZIER_SHADER_SOURCE,
            "main",
            Self::create_bind_group_layout(&context.device, "Bezier Calculator Bind Group Layout"),
            Some("Bezier Calculator"),
        )?;

        let adaptive_pipeline = if context.supports_feature(Features::STORAGE_RESOURCE_BINDING_ARRAY) {
            Some(ComputePipeline::with_layout(
                &context.device,
                Self::ADAPTIVE_ANALYSIS_SHADER_SOURCE,
                "main",
                Self::create_bind_group_layout(&context.device, "Adaptive Curve Analyzer Bind Group Layout"),
                Some("Adaptive Curve Analyzer"),
            )?)
        } else {
            None
        };

        let timer = if enable_timing && context.supports_feature(Features::TIMESTAMP_QUERY) {
            Some(GpuTimer::new(&context.device))
        } else {
            None
        };

        Ok(Self {
            context,
            bezier_pipeline,
            adaptive_pipeline,
            bind_group_layout,
            timer,
        })
    }

    /// Generate tessellated points for multiple Bezier curves
    pub async fn generate_curves(
        &self,
        curves: &[BezierCurve],
        adaptive_tessellation: bool,
        curvature_tolerance: f32,
    ) -> Result<(Vec<Point3D>, Option<f64>)> {
        if curves.is_empty() {
            return Ok((Vec::new(), None));
        }

        // Calculate total points and offsets
        let mut total_points = 0u32;
        let mut point_offsets = Vec::with_capacity(curves.len());
        
        for curve in curves {
            point_offsets.push(total_points);
            total_points += curve.steps + 1; // +1 because we include both endpoints
        }

        let max_steps = curves.iter().map(|c| c.steps).max().unwrap_or(20);

        // Create buffers
        let curves_buffer = GpuBuffer::with_data(
            &self.context.device,
            curves,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Curves Buffer"),
        );

        let points_buffer = GpuBuffer::new(
            &self.context.device,
            (total_points as u64) * std::mem::size_of::<Point3D>() as u64,
            BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            Some("Points Buffer"),
        );

        let offsets_buffer = GpuBuffer::with_data(
            &self.context.device,
            &point_offsets,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Offsets Buffer"),
        );

        let params = CurveParams {
            curve_count: curves.len() as u32,
            max_steps,
            adaptive_tessellation: if adaptive_tessellation { 1 } else { 0 },
            curvature_tolerance,
        };

        let params_buffer = GpuBuffer::with_data(
            &self.context.device,
            &[params],
            BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            Some("Params Buffer"),
        );

        // Create bind group
        let bind_group = self.context.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Curve Calculator Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: curves_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: points_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: offsets_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 3,
                    resource: params_buffer.buffer.as_entire_binding(),
                },
            ],
        });

        // Create command encoder
        let mut encoder = self.context.device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("Curve Calculator Encoder"),
        });

        // Start timing if available
        if let Some(ref timer) = self.timer {
            timer.start(&mut encoder);
        }

        // Dispatch compute shader
        {
            let mut cpass = encoder.begin_compute_pass(&ComputePassDescriptor {
                label: Some("Curve Calculator Pass"),
                timestamp_writes: None,
            });
            cpass.set_pipeline(&self.bezier_pipeline.pipeline);
            cpass.set_bind_group(0, &bind_group, &[]);

            let (_, num_workgroups) = GpuUtils::calculate_workgroup_size(curves.len() as u32, 64);
            cpass.dispatch_workgroups(num_workgroups, 1, 1);
        }

        // End timing if available
        if let Some(ref timer) = self.timer {
            timer.end(&mut encoder);
        }

        // Submit commands
        self.context.queue.submit(Some(encoder.finish()));

        // Read back results
        let points = points_buffer.read_data::<Point3D>(&self.context.device, &self.context.queue).await?;

        // Get timing result if available
        let timing = if let Some(ref timer) = self.timer {
            let nanoseconds = timer.get_result(&self.context.device).await?;
            Some(nanoseconds as f64 / 1_000_000.0) // Convert to milliseconds
        } else {
            None
        };

        // Trim points to actual count (some may be unused due to adaptive tessellation)
        let trimmed_points = points.into_iter().take(total_points as usize).collect();

        Ok((trimmed_points, timing))
    }

    /// Generate tessellated points for a single Bezier curve
    pub async fn generate_curve(
        &self,
        start: Point3D,
        control: Point3D,
        end: Point3D,
        steps: u32,
        adaptive: bool,
    ) -> Result<(Vec<Point3D>, Option<f64>)> {
        let curve = BezierCurve::new(start, control, end, steps);
        let (all_points, timing) = self.generate_curves(&[curve], adaptive, 0.1).await?;
        Ok((all_points, timing))
    }

    /// Analyze curves to determine optimal tessellation
    pub async fn analyze_curves(&self, curves: &[BezierCurve], curvature_tolerance: f32) -> Result<(Vec<u32>, Vec<f32>)> {
        if let Some(ref adaptive_pipeline) = self.adaptive_pipeline {
            // Use GPU analysis
            let curves_buffer = GpuBuffer::with_data(
                &self.context.device,
                curves,
                BufferUsages::STORAGE | BufferUsages::COPY_DST,
                Some("Analysis Curves Buffer"),
            );

            let optimal_steps_buffer = GpuBuffer::new(
                &self.context.device,
                (curves.len() as u64) * std::mem::size_of::<u32>() as u64,
                BufferUsages::STORAGE | BufferUsages::COPY_SRC,
                Some("Optimal Steps Buffer"),
            );

            let max_curvatures_buffer = GpuBuffer::new(
                &self.context.device,
                (curves.len() as u64) * std::mem::size_of::<f32>() as u64,
                BufferUsages::STORAGE | BufferUsages::COPY_SRC,
                Some("Max Curvatures Buffer"),
            );

            let params = CurveParams {
                curve_count: curves.len() as u32,
                max_steps: 100,
                adaptive_tessellation: 1,
                curvature_tolerance,
            };

            let params_buffer = GpuBuffer::with_data(
                &self.context.device,
                &[params],
                BufferUsages::UNIFORM | BufferUsages::COPY_DST,
                Some("Analysis Params Buffer"),
            );

            let bind_group = self.context.device.create_bind_group(&BindGroupDescriptor {
                label: Some("Curve Analysis Bind Group"),
                layout: &self.bind_group_layout,
                entries: &[
                    BindGroupEntry {
                        binding: 0,
                        resource: curves_buffer.buffer.as_entire_binding(),
                    },
                    BindGroupEntry {
                        binding: 1,
                        resource: optimal_steps_buffer.buffer.as_entire_binding(),
                    },
                    BindGroupEntry {
                        binding: 2,
                        resource: max_curvatures_buffer.buffer.as_entire_binding(),
                    },
                    BindGroupEntry {
                        binding: 3,
                        resource: params_buffer.buffer.as_entire_binding(),
                    },
                ],
            });

            let mut encoder = self.context.device.create_command_encoder(&CommandEncoderDescriptor {
                label: Some("Curve Analysis Encoder"),
            });

            {
                let mut cpass = encoder.begin_compute_pass(&ComputePassDescriptor {
                    label: Some("Curve Analysis Pass"),
                    timestamp_writes: None,
                });
                cpass.set_pipeline(&adaptive_pipeline.pipeline);
                cpass.set_bind_group(0, &bind_group, &[]);

                let (_, num_workgroups) = GpuUtils::calculate_workgroup_size(curves.len() as u32, 64);
                cpass.dispatch_workgroups(num_workgroups, 1, 1);
            }

            self.context.queue.submit(Some(encoder.finish()));

            let optimal_steps = optimal_steps_buffer.read_data::<u32>(&self.context.device, &self.context.queue).await?;
            let max_curvatures = max_curvatures_buffer.read_data::<f32>(&self.context.device, &self.context.queue).await?;

            Ok((optimal_steps, max_curvatures))
        } else {
            // Fall back to CPU analysis
            let optimal_steps = curves.iter().map(|c| c.steps).collect();
            let max_curvatures = vec![0.0; curves.len()];
            Ok((optimal_steps, max_curvatures))
        }
    }

    /// Calculate the length of a Bezier curve using tessellation
    pub async fn calculate_curve_length(
        &self,
        start: Point3D,
        control: Point3D,
        end: Point3D,
        samples: u32,
    ) -> Result<f32> {
        let (points, _) = self.generate_curve(start, control, end, samples, false).await?;
        
        let mut length = 0.0f32;
        for i in 1..points.len() {
            let p1 = &points[i - 1];
            let p2 = &points[i];
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let dz = p2.z - p1.z;
            length += (dx * dx + dy * dy + dz * dz).sqrt();
        }
        
        Ok(length)
    }

    /// Benchmark GPU vs CPU performance
    pub async fn benchmark(
        &self,
        curve_count: usize,
        steps_per_curve: u32,
        iterations: usize,
    ) -> Result<BenchmarkResult> {
        // Generate test curves
        let curves: Vec<BezierCurve> = (0..curve_count)
            .map(|i| {
                let offset = i as f32 * 10.0;
                BezierCurve::new(
                    Point3D::new(offset, 0.0, 0.0),
                    Point3D::new(offset + 5.0, 10.0, 5.0),
                    Point3D::new(offset + 10.0, 0.0, 0.0),
                    steps_per_curve,
                )
            })
            .collect();

        // Benchmark GPU
        let mut gpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let (_, gpu_time) = self.generate_curves(&curves, false, 0.1).await?;
            let total_time = start.elapsed().as_secs_f64() * 1000.0;
            gpu_times.push(gpu_time.unwrap_or(total_time));
        }

        // Benchmark CPU
        let mut cpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let _cpu_result = Self::generate_curves_cpu(&curves);
            let cpu_time = start.elapsed().as_secs_f64() * 1000.0;
            cpu_times.push(cpu_time);
        }

        let avg_gpu_time = gpu_times.iter().sum::<f64>() / gpu_times.len() as f64;
        let avg_cpu_time = cpu_times.iter().sum::<f64>() / cpu_times.len() as f64;
        let speedup = avg_cpu_time / avg_gpu_time;

        let total_points = curve_count * (steps_per_curve as usize + 1);

        Ok(BenchmarkResult {
            curve_count,
            steps_per_curve,
            iterations,
            avg_gpu_time_ms: avg_gpu_time,
            avg_cpu_time_ms: avg_cpu_time,
            speedup,
            throughput_gpu: (total_points as f64) / avg_gpu_time * 1000.0,
            throughput_cpu: (total_points as f64) / avg_cpu_time * 1000.0,
        })
    }

    /// CPU reference implementation for benchmarking
    fn generate_curves_cpu(curves: &[BezierCurve]) -> Vec<Point3D> {
        let mut all_points = Vec::new();
        
        for curve in curves {
            for i in 0..=curve.steps {
                let t = i as f32 / curve.steps as f32;
                let u = 1.0 - t;
                
                let point = Point3D::new(
                    u * u * curve.start.x + 2.0 * u * t * curve.control.x + t * t * curve.end.x,
                    u * u * curve.start.y + 2.0 * u * t * curve.control.y + t * t * curve.end.y,
                    u * u * curve.start.z + 2.0 * u * t * curve.control.z + t * t * curve.end.z,
                );
                
                all_points.push(point);
            }
        }
        
        all_points
    }
}

/// Benchmark results for curve calculations
#[derive(Debug, Clone)]
pub struct BenchmarkResult {
    pub curve_count: usize,
    pub steps_per_curve: u32,
    pub iterations: usize,
    pub avg_gpu_time_ms: f64,
    pub avg_cpu_time_ms: f64,
    pub speedup: f64,
    pub throughput_gpu: f64, // points per second
    pub throughput_cpu: f64, // points per second
}

impl BenchmarkResult {
    pub fn print_summary(&self) {
        println!("Curve Calculation Benchmark Results:");
        println!("  Curve Count: {}", self.curve_count);
        println!("  Steps per Curve: {}", self.steps_per_curve);
        println!("  Iterations: {}", self.iterations);
        println!("  Average GPU Time: {:.3} ms", self.avg_gpu_time_ms);
        println!("  Average CPU Time: {:.3} ms", self.avg_cpu_time_ms);
        println!("  Speedup: {:.2}x", self.speedup);
        println!("  GPU Throughput: {:.0} points/sec", self.throughput_gpu);
        println!("  CPU Throughput: {:.0} points/sec", self.throughput_cpu);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_curve_calculator() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = CurveCalculator::new(context, false).await?;

        let start = Point3D::new(0.0, 0.0, 0.0);
        let control = Point3D::new(5.0, 10.0, 0.0);
        let end = Point3D::new(10.0, 0.0, 0.0);

        let (points, _) = calculator.generate_curve(start, control, end, 10, false).await?;

        assert_eq!(points.len(), 11); // 10 steps + 1 endpoint
        assert!((points[0].x - start.x).abs() < 0.001);
        assert!((points[0].y - start.y).abs() < 0.001);
        assert!((points[10].x - end.x).abs() < 0.001);
        assert!((points[10].y - end.y).abs() < 0.001);

        Ok(())
    }

    #[tokio::test]
    async fn test_curve_length() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = CurveCalculator::new(context, false).await?;

        // Test with a straight line (should be approximately 10 units)
        let start = Point3D::new(0.0, 0.0, 0.0);
        let control = Point3D::new(5.0, 0.0, 0.0); // Straight line control point
        let end = Point3D::new(10.0, 0.0, 0.0);

        let length = calculator.calculate_curve_length(start, control, end, 100).await?;
        assert!((length - 10.0).abs() < 0.1); // Should be close to 10

        Ok(())
    }
}