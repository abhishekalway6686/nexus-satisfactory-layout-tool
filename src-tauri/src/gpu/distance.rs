/*!
 * GPU-accelerated distance calculations using wgpu compute shaders
 */

use super::{GpuContext, GpuBuffer, ComputePipeline, GpuTimer, GpuUtils};
use anyhow::Result;
use bytemuck::{Pod, Zeroable};
use wgpu::*;

/// 3D point for GPU calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct Point3D {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub _padding: f32, // Align to 16 bytes for GPU
}

impl Point3D {
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z, _padding: 0.0 }
    }
}

impl From<crate::types::geometry::Point3D> for Point3D {
    fn from(point: crate::types::geometry::Point3D) -> Self {
        Self::new(point.x as f32, point.y as f32, point.z as f32)
    }
}

/// Distance calculation types
#[repr(u32)]
#[derive(Clone, Copy, Debug)]
pub enum DistanceType {
    Distance3D = 0,
    Distance3DSquared = 1,
    Distance2D = 2,
    Distance2DSquared = 3,
}

/// Parameters for distance calculations
#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
struct DistanceParams {
    count: u32,
    distance_type: u32,
    _padding: [u32; 2],
}

/// GPU distance calculator
pub struct DistanceCalculator {
    context: GpuContext,
    pipeline: ComputePipeline,
    bind_group_layout: BindGroupLayout,
    timer: Option<GpuTimer>,
}

impl DistanceCalculator {
    const SHADER_SOURCE: &'static str = r#"
        struct DistanceParams {
            count: u32,
            distance_type: u32,
        }

        @group(0) @binding(0) var<storage, read> points_a: array<vec4<f32>>;
        @group(0) @binding(1) var<storage, read> points_b: array<vec4<f32>>;
        @group(0) @binding(2) var<storage, read_write> distances: array<f32>;
        @group(0) @binding(3) var<uniform> params: DistanceParams;

        const DISTANCE_3D: u32 = 0u;
        const DISTANCE_3D_SQUARED: u32 = 1u;
        const DISTANCE_2D: u32 = 2u;
        const DISTANCE_2D_SQUARED: u32 = 3u;

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            
            if (index >= params.count) {
                return;
            }
            
            let p1 = points_a[index];
            let p2 = points_b[index];
            
            var result: f32;
            
            switch (params.distance_type) {
                case DISTANCE_3D: {
                    let diff = p2.xyz - p1.xyz;
                    result = length(diff);
                }
                case DISTANCE_3D_SQUARED: {
                    let diff = p2.xyz - p1.xyz;
                    result = dot(diff, diff);
                }
                case DISTANCE_2D: {
                    let diff = p2.xy - p1.xy;
                    result = length(diff);
                }
                case DISTANCE_2D_SQUARED: {
                    let diff = p2.xy - p1.xy;
                    result = dot(diff, diff);
                }
                default: {
                    result = 0.0;
                }
            }
            
            distances[index] = result;
        }
    "#;

    /// Create a new distance calculator
    pub async fn new(context: GpuContext, enable_timing: bool) -> Result<Self> {
        let bind_group_layout = context.device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Distance Calculator Bind Group Layout"),
            entries: &[
                // points_a buffer
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
                // points_b buffer
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
                // distances buffer
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

        let pipeline = ComputePipeline::with_layout(
            &context.device,
            Self::SHADER_SOURCE,
            "main",
            bind_group_layout,
            Some("Distance Calculator"),
        )?;
        
        // Create a new bind group layout for storing
        let bind_group_layout = context.device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("Distance Calculator Bind Group Layout"),
            entries: &[
                // points_a buffer
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
                // points_b buffer
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
                // distances buffer
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

        let timer = if enable_timing && context.supports_feature(Features::TIMESTAMP_QUERY) {
            Some(GpuTimer::new(&context.device))
        } else {
            None
        };

        Ok(Self {
            context,
            pipeline,
            bind_group_layout,
            timer,
        })
    }

    /// Calculate distances between corresponding points in two arrays
    pub async fn calculate_distances(
        &self,
        points_a: &[Point3D],
        points_b: &[Point3D],
        distance_type: DistanceType,
    ) -> Result<(Vec<f32>, Option<f64>)> {
        if points_a.len() != points_b.len() {
            return Err(anyhow::anyhow!("Point arrays must have the same length"));
        }

        let count = points_a.len() as u32;
        if count == 0 {
            return Ok((Vec::new(), None));
        }

        // Create buffers
        let points_a_buffer = GpuBuffer::with_data(
            &self.context.device,
            points_a,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Points A Buffer"),
        );

        let points_b_buffer = GpuBuffer::with_data(
            &self.context.device,
            points_b,
            BufferUsages::STORAGE | BufferUsages::COPY_DST,
            Some("Points B Buffer"),
        );

        let distances_buffer = GpuBuffer::new(
            &self.context.device,
            (count as u64) * std::mem::size_of::<f32>() as u64,
            BufferUsages::STORAGE | BufferUsages::COPY_SRC,
            Some("Distances Buffer"),
        );

        let params = DistanceParams {
            count,
            distance_type: distance_type as u32,
            _padding: [0; 2],
        };

        let params_buffer = GpuBuffer::with_data(
            &self.context.device,
            &[params],
            BufferUsages::UNIFORM | BufferUsages::COPY_DST,
            Some("Params Buffer"),
        );

        // Create bind group
        let bind_group = self.context.device.create_bind_group(&BindGroupDescriptor {
            label: Some("Distance Calculator Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                BindGroupEntry {
                    binding: 0,
                    resource: points_a_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 1,
                    resource: points_b_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 2,
                    resource: distances_buffer.buffer.as_entire_binding(),
                },
                BindGroupEntry {
                    binding: 3,
                    resource: params_buffer.buffer.as_entire_binding(),
                },
            ],
        });

        // Create command encoder
        let mut encoder = self.context.device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("Distance Calculator Encoder"),
        });

        // Start timing if available
        if let Some(ref timer) = self.timer {
            timer.start(&mut encoder);
        }

        // Dispatch compute shader
        {
            let mut cpass = encoder.begin_compute_pass(&ComputePassDescriptor {
                label: Some("Distance Calculator Pass"),
                timestamp_writes: None,
            });
            cpass.set_pipeline(&self.pipeline.pipeline);
            cpass.set_bind_group(0, &bind_group, &[]);

            let (_, num_workgroups) = GpuUtils::calculate_workgroup_size(count, 256);
            cpass.dispatch_workgroups(num_workgroups, 1, 1);
        }

        // End timing if available
        if let Some(ref timer) = self.timer {
            timer.end(&mut encoder);
        }

        // Submit commands
        self.context.queue.submit(Some(encoder.finish()));

        // Read back results
        let distances = distances_buffer.read_data::<f32>(&self.context.device, &self.context.queue).await?;

        // Get timing result if available
        let timing = if let Some(ref timer) = self.timer {
            let nanoseconds = timer.get_result(&self.context.device).await?;
            Some(nanoseconds as f64 / 1_000_000.0) // Convert to milliseconds
        } else {
            None
        };

        Ok((distances, timing))
    }

    /// Calculate 3D distances
    pub async fn calculate_3d_distances(
        &self,
        points_a: &[Point3D],
        points_b: &[Point3D],
    ) -> Result<(Vec<f32>, Option<f64>)> {
        self.calculate_distances(points_a, points_b, DistanceType::Distance3D).await
    }

    /// Calculate squared 3D distances (faster, avoids sqrt)
    pub async fn calculate_3d_distances_squared(
        &self,
        points_a: &[Point3D],
        points_b: &[Point3D],
    ) -> Result<(Vec<f32>, Option<f64>)> {
        self.calculate_distances(points_a, points_b, DistanceType::Distance3DSquared).await
    }

    /// Calculate 2D distances (ignoring Z component)
    pub async fn calculate_2d_distances(
        &self,
        points_a: &[Point3D],
        points_b: &[Point3D],
    ) -> Result<(Vec<f32>, Option<f64>)> {
        self.calculate_distances(points_a, points_b, DistanceType::Distance2D).await
    }

    /// Calculate squared 2D distances
    pub async fn calculate_2d_distances_squared(
        &self,
        points_a: &[Point3D],
        points_b: &[Point3D],
    ) -> Result<(Vec<f32>, Option<f64>)> {
        self.calculate_distances(points_a, points_b, DistanceType::Distance2DSquared).await
    }

    /// Benchmark GPU vs CPU performance
    pub async fn benchmark(
        &self,
        point_count: usize,
        iterations: usize,
    ) -> Result<BenchmarkResult> {
        // Generate test data
        let points_a: Vec<Point3D> = (0..point_count)
            .map(|i| Point3D::new(
                (i as f32) * 0.1,
                (i as f32) * 0.2,
                (i as f32) * 0.05,
            ))
            .collect();

        let points_b: Vec<Point3D> = (0..point_count)
            .map(|i| Point3D::new(
                (i as f32) * 0.15,
                (i as f32) * 0.25,
                (i as f32) * 0.08,
            ))
            .collect();

        // Benchmark GPU
        let mut gpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let (_, gpu_time) = self.calculate_3d_distances(&points_a, &points_b).await?;
            let total_time = start.elapsed().as_secs_f64() * 1000.0;
            gpu_times.push(gpu_time.unwrap_or(total_time));
        }

        // Benchmark CPU
        let mut cpu_times = Vec::new();
        for _ in 0..iterations {
            let start = std::time::Instant::now();
            let _cpu_result = Self::calculate_distances_cpu(&points_a, &points_b);
            let cpu_time = start.elapsed().as_secs_f64() * 1000.0;
            cpu_times.push(cpu_time);
        }

        let avg_gpu_time = gpu_times.iter().sum::<f64>() / gpu_times.len() as f64;
        let avg_cpu_time = cpu_times.iter().sum::<f64>() / cpu_times.len() as f64;
        let speedup = avg_cpu_time / avg_gpu_time;

        Ok(BenchmarkResult {
            point_count,
            iterations,
            avg_gpu_time_ms: avg_gpu_time,
            avg_cpu_time_ms: avg_cpu_time,
            speedup,
            throughput_gpu: (point_count as f64) / avg_gpu_time * 1000.0,
            throughput_cpu: (point_count as f64) / avg_cpu_time * 1000.0,
        })
    }

    /// CPU reference implementation for benchmarking
    fn calculate_distances_cpu(points_a: &[Point3D], points_b: &[Point3D]) -> Vec<f32> {
        points_a
            .iter()
            .zip(points_b.iter())
            .map(|(p1, p2)| {
                let dx = p2.x - p1.x;
                let dy = p2.y - p1.y;
                let dz = p2.z - p1.z;
                (dx * dx + dy * dy + dz * dz).sqrt()
            })
            .collect()
    }
}

/// Benchmark results for distance calculations
#[derive(Debug, Clone)]
pub struct BenchmarkResult {
    pub point_count: usize,
    pub iterations: usize,
    pub avg_gpu_time_ms: f64,
    pub avg_cpu_time_ms: f64,
    pub speedup: f64,
    pub throughput_gpu: f64, // points per second
    pub throughput_cpu: f64, // points per second
}

impl BenchmarkResult {
    pub fn print_summary(&self) {
        println!("Distance Calculation Benchmark Results:");
        println!("  Point Count: {}", self.point_count);
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
    async fn test_distance_calculator() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = DistanceCalculator::new(context, false).await?;

        let points_a = vec![
            Point3D::new(0.0, 0.0, 0.0),
            Point3D::new(1.0, 1.0, 1.0),
        ];

        let points_b = vec![
            Point3D::new(1.0, 0.0, 0.0),
            Point3D::new(2.0, 2.0, 2.0),
        ];

        let (distances, _) = calculator.calculate_3d_distances(&points_a, &points_b).await?;

        assert_eq!(distances.len(), 2);
        assert!((distances[0] - 1.0).abs() < 0.001);
        assert!((distances[1] - (3.0_f32).sqrt()).abs() < 0.001);

        Ok(())
    }

    #[tokio::test]
    async fn test_distance_types() -> Result<()> {
        let context = GpuContext::new().await?;
        let calculator = DistanceCalculator::new(context, false).await?;

        let points_a = vec![Point3D::new(0.0, 0.0, 0.0)];
        let points_b = vec![Point3D::new(3.0, 4.0, 0.0)];

        // Test 3D distance
        let (distances_3d, _) = calculator.calculate_3d_distances(&points_a, &points_b).await?;
        assert!((distances_3d[0] - 5.0).abs() < 0.001);

        // Test 3D squared distance
        let (distances_3d_sq, _) = calculator.calculate_3d_distances_squared(&points_a, &points_b).await?;
        assert!((distances_3d_sq[0] - 25.0).abs() < 0.001);

        // Test 2D distance (should be the same as 3D in this case)
        let (distances_2d, _) = calculator.calculate_2d_distances(&points_a, &points_b).await?;
        assert!((distances_2d[0] - 5.0).abs() < 0.001);

        // Test 2D squared distance
        let (distances_2d_sq, _) = calculator.calculate_2d_distances_squared(&points_a, &points_b).await?;
        assert!((distances_2d_sq[0] - 25.0).abs() < 0.001);

        Ok(())
    }
}