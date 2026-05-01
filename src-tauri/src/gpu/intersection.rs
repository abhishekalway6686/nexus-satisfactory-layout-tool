/*!
 * GPU-accelerated line intersection detection using wgpu compute shaders
 */

use super::{GpuContext, GpuBuffer, ComputePipeline, GpuTimer, GpuUtils};
use anyhow::Result;
use bytemuck::{Pod, Zeroable};
use wgpu::*;

/// 2D point for intersection calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct Point2D {
    pub x: f32,
    pub y: f32,
    pub _padding: [f32; 2], // Align to 16 bytes for GPU
}

impl Point2D {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y, _padding: [0.0; 2] }
    }
}

impl From<crate::geometry::Point2D> for Point2D {
    fn from(point: crate::geometry::Point2D) -> Self {
        Self::new(point.x as f32, point.y as f32)
    }
}

/// Line segment for GPU calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct LineSegment {
    pub start: Point2D,
    pub end: Point2D,
}

impl LineSegment {
    pub fn new(start: Point2D, end: Point2D) -> Self {
        Self { start, end }
    }
}

/// Intersection result from GPU
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct IntersectionResult {
    pub point: Point2D,
    pub t1: f32,
    pub t2: f32,
    pub has_intersection: u32,
    pub _padding: [f32; 3],
}

impl IntersectionResult {
    pub fn empty() -> Self {
        Self {
            point: Point2D::new(0.0, 0.0),
            t1: 0.0,
            t2: 0.0,
            has_intersection: 0,
            _padding: [0.0; 3],
        }
    }
}

/// Parameters for intersection calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
struct IntersectionParams {
    line_count_a: u32,
    line_count_b: u32,
    epsilon: f32,
    max_results: u32,
}

/// GPU intersection calculator
pub struct IntersectionCalculator {
    context: GpuContext,
    pairwise_pipeline: ComputePipeline,
    bulk_pipeline: ComputePipeline,
    bind_group_layout: BindGroupLayout,
    timer: Option<GpuTimer>,
}

impl IntersectionCalculator {
    fn create_bind_group_layout(device: &Device, label: &str) -> BindGroupLayout {
        device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some(label),
            entries: &[
                // line_segments_a buffer
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
                // line_segments_b buffer
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

    const PAIRWISE_SHADER_SOURCE: &'static str = r#"
        struct Point2D {
            x: f32,
            y: f32,
        }

        struct LineSegment {
            start: Point2D,
            end: Point2D,
        }

        struct IntersectionResult {
            point: Point2D,
            t1: f32,
            t2: f32,
            has_intersection: u32,
        }

        struct IntersectionParams {
            line_count_a: u32,
            line_count_b: u32,
            epsilon: f32,
            max_results: u32,
        }

        @group(0) @binding(0) var<storage, read> lines_a: array<LineSegment>;
        @group(0) @binding(1) var<storage, read> lines_b: array<LineSegment>;
        @group(0) @binding(2) var<storage, read_write> results: array<IntersectionResult>;
        @group(0) @binding(3) var<uniform> params: IntersectionParams;

        fn line_intersection(
            p1: Point2D, p2: Point2D,
            p3: Point2D, p4: Point2D,
            epsilon: f32
        ) -> IntersectionResult {
            var result: IntersectionResult;
            result.has_intersection = 0u;
            result.point = Point2D(0.0, 0.0);
            result.t1 = 0.0;
            result.t2 = 0.0;

            let d1 = vec2<f32>(p2.x - p1.x, p2.y - p1.y);
            let d2 = vec2<f32>(p4.x - p3.x, p4.y - p3.y);
            let d3 = vec2<f32>(p1.x - p3.x, p1.y - p3.y);

            let cross = d1.x * d2.y - d1.y * d2.x;
            
            if (abs(cross) < epsilon) {
                return result; // Lines are parallel
            }

            let t1 = (d3.x * d2.y - d3.y * d2.x) / cross;
            let t2 = (d3.x * d1.y - d3.y * d1.x) / cross;

            // Check if intersection is within both line segments
            if (t1 >= 0.0 && t1 <= 1.0 && t2 >= 0.0 && t2 <= 1.0) {
                result.has_intersection = 1u;
                result.t1 = t1;
                result.t2 = t2;
                result.point.x = p1.x + t1 * d1.x;
                result.point.y = p1.y + t1 * d1.y;
            }

            return result;
        }

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            let total_pairs = params.line_count_a * params.line_count_b;
            
            if (index >= total_pairs) {
                return;
            }
            
            let a_index = index / params.line_count_b;
            let b_index = index % params.line_count_b;
            
            if (a_index >= params.line_count_a || b_index >= params.line_count_b) {
                return;
            }
            
            let line_a = lines_a[a_index];
            let line_b = lines_b[b_index];
            
            let intersection = line_intersection(
                line_a.start, line_a.end,
                line_b.start, line_b.end,
                params.epsilon
            );
            
            results[index] = intersection;
        }
    "#;

    const BULK_SHADER_SOURCE: &'static str = r#"
        struct Point2D {
            x: f32,
            y: f32,
        }

        struct LineSegment {
            start: Point2D,
            end: Point2D,
        }

        struct IntersectionResult {
            point: Point2D,
            t1: f32,
            t2: f32,
            has_intersection: u32,
        }

        struct IntersectionParams {
            line_count_a: u32,
            line_count_b: u32,
            epsilon: f32,
            max_results: u32,
        }

        @group(0) @binding(0) var<storage, read> lines_a: array<LineSegment>;
        @group(0) @binding(1) var<storage, read> lines_b: array<LineSegment>;
        @group(0) @binding(2) var<storage, read_write> results: array<IntersectionResult>;
        @group(0) @binding(3) var<uniform> params: IntersectionParams;

        var<workgroup> temp_results: array<IntersectionResult, 256>;
        var<workgroup> result_count: atomic<u32>;

        fn line_intersection(
            p1: Point2D, p2: Point2D,
            p3: Point2D, p4: Point2D,
            epsilon: f32
        ) -> IntersectionResult {
            var result: IntersectionResult;
            result.has_intersection = 0u;
            result.point = Point2D(0.0, 0.0);
            result.t1 = 0.0;
            result.t2 = 0.0;

            let d1 = vec2<f32>(p2.x - p1.x, p2.y - p1.y);
            let d2 = vec2<f32>(p4.x - p3.x, p4.y - p3.y);
            let d3 = vec2<f32>(p1.x - p3.x, p1.y - p3.y);

            let cross = d1.x * d2.y - d1.y * d2.x;
            
            if (abs(cross) < epsilon) {
                return result;
            }

            let t1 = (d3.x * d2.y - d3.y * d2.x) / cross;
            let t2 = (d3.x * d1.y - d3.y * d1.x) / cross;

            if (t1 >= 0.0 && t1 <= 1.0 && t2 >= 0.0 && t2 <= 1.0) {
                result.has_intersection = 1u;
                result.t1 = t1;
                result.t2 = t2;
                result.point.x = p1.x + t1 * d1.x;
                result.point.y = p1.y + t1 * d1.y;
            }

            return result;
        }

        @compute @workgroup_size(256)
        fn main(
            @builtin(global_invocation_id) global_id: vec3<u32>,
            @builtin(local_invocation_index) local_index: u32
        ) {
            if (local_index == 0u) {
                atomicStore(&result_count, 0u);
            }
            workgroupBarrier();

            let index = global_id.x;
            let total_pairs = params.line_count_a * params.line_count_b;
            
            if (index >= total_pairs) {
                return;
            }
            
            let a_index = index / params.line_count_b;
            let b_index = index % params.line_count_b;
            
            if (a_index >= params.line_count_a || b_index >= params.line_count_b) {
                return;
            }
            
            let line_a = lines_a[a_index];
            let line_b = lines_b[b_index];
            
            let intersection = line_intersection(
                line_a.start, line_a.end,
                line_b.start, line_b.end,
                params.epsilon
            );
            
            if (intersection.has_intersection == 1u) {
                let count = atomicAdd(&result_count, 1u);
                if (count < 256u && count < params.max_results) {
                    temp_results[count] = intersection;
                }
            }

            workgroupBarrier();

            // Write results to global memory
            if (local_index == 0u) {
                let final_count = atomicLoad(&result_count);
                let workgroup_base = global_id.x / 256u * 256u;
                
                for (var i = 0u; i < min(final_count, 256u); i++) {
                    let global_index = workgroup_base + i;
                    if (global_index < arrayLength(&results)) {
                        results[global_index] = temp_results[i];
                    }
                }
            }
        }
    "#;

    /// Create a new intersection calculator
    pub async fn new(context: GpuContext, enable_timing: bool) -> Result<Self> {
        let bind_group_layout = context.device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Intersection Calculator Bind Group Layout"),
            entries: &[
                // lines_a buffer
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
                // lines_b buffer
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
        });

        let pairwise_pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::PAIRWISE_SHADER_SOURCE,
            "main",
            Self::create_bind_group_layout(&context.device, "Pairwise Intersection Calculator Bind Group Layout"),
            Some("Pairwise Intersection Calculator"),
        )?;

        let bulk_pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::BULK_SHADER_SOURCE,
            "main",
            Self::create_bind_group_layout(&context.device, "Bulk Intersection Calculator Bind Group Layout"),
            Some("Bulk Intersection Calculator"),
        )?;

        let timer = if enable_timing && context.supports_feature(Features::TIMESTAMP_QUERY) {
            Some(GpuTimer::new(&context.device))
        } else {
            None
        };

        Ok(Self {
            context,
            pairwise_pipeline,
            bulk_pipeline,
            bind_group_layout,
            timer,
        })
    }

    /// Find all intersections between two sets of line segments
    pub async fn find_intersections(
        &self,
        lines_a: &[LineSegment],
        lines_b: &[LineSegment],
        epsilon: f32,
        max_results: Option<u32>,
    ) -> Result<(Vec<IntersectionResult>, Option<f64>)> {
        if lines_a.is_empty() || lines_b.is_empty() {
            return Ok((Vec::new(), None));
        }

        let max_results = max_results.unwrap_or(lines_a.len() as u32 * lines_b.len() as u32);
        let total_pairs = lines_a.len() as u32 * lines_b.len() as u32;

        // Create buffers
        let lines_a_buffer = GpuBuffer::with_data(
            &self.context.device,
            lines_a,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Lines A Buffer"),
        );

        let lines_b_buffer = GpuBuffer::with_data(
            &self.context.device,
            lines_b,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Lines B Buffer"),
        );

        let results_buffer = GpuBuffer::new(
            &self.context.device,
            (total_pairs as u64) * std::mem::size_of::<IntersectionResult>() as u64,
            BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            Some("Results Buffer"),
        );

        let params = IntersectionParams {
            line_count_a: lines_a.len() as u32,
            line_count_b: lines_b.len() as u32,
            epsilon,
            max_results,
        };

        let params_buffer = GpuBuffer::with_data(
            &self.context.device,
            &[params],
            BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            Some("Params Buffer"),
        );

        // Create bind group
        let bind_group = self.context.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Intersection Calculator Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: lines_a_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: lines_b_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: results_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 3,
                    resource: params_buffer.buffer.as_entire_binding(),
                },
            ],
        });

        // Create command encoder
        let mut encoder = self.context.device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("Intersection Calculator Encoder"),
        });

        // Start timing if available
        if let Some(ref timer) = self.timer {
            timer.start(&mut encoder);
        }

        // Dispatch compute shader
        {
            let mut cpass = encoder.begin_compute_pass(&ComputePassDescriptor {
                label: Some("Intersection Calculator Pass"),
                timestamp_writes: None,
            });
            
            // Use bulk pipeline for large datasets, pairwise for smaller ones
            let pipeline = if total_pairs > 10000 {
                &self.bulk_pipeline.pipeline
            } else {
                &self.pairwise_pipeline.pipeline
            };
            
            cpass.set_pipeline(pipeline);
            cpass.set_bind_group(0, &bind_group, &[]);

            let (_, num_workgroups) = GpuUtils::calculate_workgroup_size(total_pairs, 256);
            cpass.dispatch_workgroups(num_workgroups, 1, 1);
        }

        // End timing if available
        if let Some(ref timer) = self.timer {
            timer.end(&mut encoder);
        }

        // Submit commands
        self.context.queue.submit(Some(encoder.finish()));

        // Read back results
        let all_results = results_buffer.read_data::<IntersectionResult>(&self.context.device, &self.context.queue).await?;

        // Filter out empty results
        let intersections: Vec<IntersectionResult> = all_results
            .into_iter()
            .filter(|r| r.has_intersection != 0)
            .take(max_results as usize)
            .collect();

        // Get timing result if available
        let timing = if let Some(ref timer) = self.timer {
            let nanoseconds = timer.get_result(&self.context.device).await?;
            Some(nanoseconds as f64 / 1_000_000.0) // Convert to milliseconds
        } else {
            None
        };

        Ok((intersections, timing))
    }

    /// Find intersections between a polyline and multiple other polylines
    pub async fn find_polyline_intersections(
        &self,
        query_polyline: &[Point2D],
        target_polylines: &[Vec<Point2D>],
        epsilon: f32,
    ) -> Result<(Vec<PolylineIntersectionResult>, Option<f64>)> {
        if query_polyline.len() < 2 || target_polylines.is_empty() {
            return Ok((Vec::new(), None));
        }

        let mut all_results = Vec::new();

        // Convert query polyline to line segments
        let query_segments: Vec<LineSegment> = query_polyline
            .windows(2)
            .map(|window| LineSegment::new(window[0], window[1]))
            .collect();

        for (polyline_index, target_polyline) in target_polylines.iter().enumerate() {
            if target_polyline.len() < 2 {
                continue;
            }

            // Convert target polyline to line segments
            let target_segments: Vec<LineSegment> = target_polyline
                .windows(2)
                .map(|window| LineSegment::new(window[0], window[1]))
                .collect();

            // Find intersections
            let (intersections, _) = self.find_intersections(
                &query_segments,
                &target_segments,
                epsilon,
                Some(100), // Limit results per polyline
            ).await?;

            if !intersections.is_empty() {
                all_results.push(PolylineIntersectionResult {
                    polyline_index,
                    intersections,
                });
            }
        }

        Ok((all_results, None))
    }

    /// Benchmark GPU vs CPU performance
    pub async fn benchmark(
        &self,
        line_count_a: usize,
        line_count_b: usize,
        iterations: usize,
    ) -> Result<BenchmarkResult> {
        // Generate test data
        let lines_a: Vec<LineSegment> = (0..line_count_a)
            .map(|i| {
                let offset = i as f32 * 2.0;
                LineSegment::new(
                    Point2D::new(offset, 0.0),
                    Point2D::new(offset + 1.0, 10.0),
                )
            })
            .collect();

        let lines_b: Vec<LineSegment> = (0..line_count_b)
            .map(|i| {
                let offset = i as f32 * 1.5;
                LineSegment::new(
                    Point2D::new(0.0, offset),
                    Point2D::new(10.0, offset + 1.0),
                )
            })
            .collect();

        // Benchmark GPU
        let mut gpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let (_, gpu_time) = self.find_intersections(&lines_a, &lines_b, 1e-6, None).await?;
            let total_time = start.elapsed().as_secs_f64() * 1000.0;
            gpu_times.push(gpu_time.unwrap_or(total_time));
        }

        // Benchmark CPU
        let mut cpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let _cpu_result = Self::find_intersections_cpu(&lines_a, &lines_b, 1e-6);
            let cpu_time = start.elapsed().as_secs_f64() * 1000.0;
            cpu_times.push(cpu_time);
        }

        let avg_gpu_time = gpu_times.iter().sum::<f64>() / gpu_times.len() as f64;
        let avg_cpu_time = cpu_times.iter().sum::<f64>() / cpu_times.len() as f64;
        let speedup = avg_cpu_time / avg_gpu_time;

        let total_pairs = line_count_a * line_count_b;

        Ok(BenchmarkResult {
            line_count_a,
            line_count_b,
            iterations,
            avg_gpu_time_ms: avg_gpu_time,
            avg_cpu_time_ms: avg_cpu_time,
            speedup,
            throughput_gpu: (total_pairs as f64) / avg_gpu_time * 1000.0,
            throughput_cpu: (total_pairs as f64) / avg_cpu_time * 1000.0,
        })
    }

    /// CPU reference implementation for benchmarking
    fn find_intersections_cpu(
        lines_a: &[LineSegment],
        lines_b: &[LineSegment],
        epsilon: f32,
    ) -> Vec<IntersectionResult> {
        let mut results = Vec::new();

        for line_a in lines_a {
            for line_b in lines_b {
                if let Some(intersection) = Self::line_intersection_cpu(line_a, line_b, epsilon) {
                    results.push(intersection);
                }
            }
        }

        results
    }

    fn line_intersection_cpu(
        line_a: &LineSegment,
        line_b: &LineSegment,
        epsilon: f32,
    ) -> Option<IntersectionResult> {
        let p1 = line_a.start;
        let p2 = line_a.end;
        let p3 = line_b.start;
        let p4 = line_b.end;

        let d1x = p2.x - p1.x;
        let d1y = p2.y - p1.y;
        let d2x = p4.x - p3.x;
        let d2y = p4.y - p3.y;
        let d3x = p1.x - p3.x;
        let d3y = p1.y - p3.y;

        let cross = d1x * d2y - d1y * d2x;

        if cross.abs() < epsilon {
            return None; // Lines are parallel
        }

        let t1 = (d3x * d2y - d3y * d2x) / cross;
        let t2 = (d3x * d1y - d3y * d1x) / cross;

        if t1 >= 0.0 && t1 <= 1.0 && t2 >= 0.0 && t2 <= 1.0 {
            Some(IntersectionResult {
                point: Point2D::new(p1.x + t1 * d1x, p1.y + t1 * d1y),
                t1,
                t2,
                has_intersection: 1,
                _padding: [0.0; 3],
            })
        } else {
            None
        }
    }
}

/// Result from polyline intersection detection
#[derive(Debug, Clone)]
pub struct PolylineIntersectionResult {
    pub polyline_index: usize,
    pub intersections: Vec<IntersectionResult>,
}

/// Benchmark results for intersection calculations
#[derive(Debug, Clone)]
pub struct BenchmarkResult {
    pub line_count_a: usize,
    pub line_count_b: usize,
    pub iterations: usize,
    pub avg_gpu_time_ms: f64,
    pub avg_cpu_time_ms: f64,
    pub speedup: f64,
    pub throughput_gpu: f64, // pairs per second
    pub throughput_cpu: f64, // pairs per second
}

impl BenchmarkResult {
    pub fn print_summary(&self) {
        println!("Intersection Calculation Benchmark Results:");
        println!("  Lines A: {}", self.line_count_a);
        println!("  Lines B: {}", self.line_count_b);
        println!("  Total Pairs: {}", self.line_count_a * self.line_count_b);
        println!("  Iterations: {}", self.iterations);
        println!("  Average GPU Time: {:.3} ms", self.avg_gpu_time_ms);
        println!("  Average CPU Time: {:.3} ms", self.avg_cpu_time_ms);
        println!("  Speedup: {:.2}x", self.speedup);
        println!("  GPU Throughput: {:.0} pairs/sec", self.throughput_gpu);
        println!("  CPU Throughput: {:.0} pairs/sec", self.throughput_cpu);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_intersection_calculator() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = IntersectionCalculator::new(context, false).await?;

        // Create two intersecting lines
        let lines_a = vec![LineSegment::new(
            Point2D::new(0.0, 0.0),
            Point2D::new(10.0, 10.0),
        )];

        let lines_b = vec![LineSegment::new(
            Point2D::new(0.0, 10.0),
            Point2D::new(10.0, 0.0),
        )];

        let (intersections, _) = calculator.find_intersections(&lines_a, &lines_b, 1e-6, None).await?;

        assert_eq!(intersections.len(), 1);
        let intersection = &intersections[0];
        assert_eq!(intersection.has_intersection, 1);
        assert!((intersection.point.x - 5.0).abs() < 0.001);
        assert!((intersection.point.y - 5.0).abs() < 0.001);

        Ok(())
    }

    #[tokio::test]
    async fn test_no_intersection() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = IntersectionCalculator::new(context, false).await?;

        // Create two parallel lines
        let lines_a = vec![LineSegment::new(
            Point2D::new(0.0, 0.0),
            Point2D::new(10.0, 0.0),
        )];

        let lines_b = vec![LineSegment::new(
            Point2D::new(0.0, 5.0),
            Point2D::new(10.0, 5.0),
        )];

        let (intersections, _) = calculator.find_intersections(&lines_a, &lines_b, 1e-6, None).await?;

        assert_eq!(intersections.len(), 0);

        Ok(())
    }
}