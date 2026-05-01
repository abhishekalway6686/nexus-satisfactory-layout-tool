/**
 * GPU-accelerated distance calculations
 * Implements bulk distance computation using WebGPU/WebGL compute shaders
 */

import { getGPUComputeManager, ComputeKernel, ComputeBuffer } from './GPUComputeManager';
import { Point3D } from '../../../types';

export interface DistanceComputeOptions {
  readonly maxBatchSize: number;
  readonly enablePrefetch: boolean;
  readonly enableFp16?: boolean; // Use half-precision floats when possible
}

export interface DistanceResult {
  readonly distances: Float32Array;
  readonly computeTimeMs: number;
  readonly method: 'webgpu' | 'webgl2' | 'cpu_fallback';
  readonly batchSize: number;
}

const WEBGPU_DISTANCE_COMPUTE_SHADER = `
@group(0) @binding(0) var<storage, read> pointsA: array<vec3<f32>>;
@group(0) @binding(1) var<storage, read> pointsB: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> distances: array<f32>;
@group(0) @binding(3) var<uniform> params: vec4<u32>; // [count, distance_type, padding, padding]

const DISTANCE_3D: u32 = 0u;
const DISTANCE_3D_SQUARED: u32 = 1u;
const DISTANCE_2D: u32 = 2u;
const DISTANCE_2D_SQUARED: u32 = 3u;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  let count = params.x;
  let distance_type = params.y;
  
  if (index >= count) {
    return;
  }
  
  let p1 = pointsA[index];
  let p2 = pointsB[index];
  
  var result: f32;
  
  switch (distance_type) {
    case DISTANCE_3D: {
      let diff = p2 - p1;
      result = length(diff);
    }
    case DISTANCE_3D_SQUARED: {
      let diff = p2 - p1;
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
`;

const WEBGL_DISTANCE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_pointsA;
uniform sampler2D u_pointsB;
uniform ivec2 u_textureSize;
uniform int u_count;
uniform int u_distanceType;

out vec4 fragColor;

// Distance type constants
const int DISTANCE_3D = 0;
const int DISTANCE_3D_SQUARED = 1;
const int DISTANCE_2D = 2;
const int DISTANCE_2D_SQUARED = 3;

vec3 getPoint(sampler2D tex, int index) {
  int pixelIndex = index / 4; // 4 components per pixel (RGBA)
  int component = index % 4;
  
  int y = pixelIndex / u_textureSize.x;
  int x = pixelIndex % u_textureSize.x;
  
  vec4 pixel = texelFetch(tex, ivec2(x, y), 0);
  
  if (component == 0) return vec3(pixel.r, pixel.g, pixel.b);
  else if (component == 1) return vec3(pixel.g, pixel.b, pixel.a);
  else if (component == 2) return vec3(pixel.b, pixel.a, 0.0);
  else return vec3(pixel.a, 0.0, 0.0);
}

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  int index = fragCoord.y * u_textureSize.x + fragCoord.x;
  
  if (index >= u_count) {
    fragColor = vec4(0.0);
    return;
  }
  
  vec3 p1 = getPoint(u_pointsA, index);
  vec3 p2 = getPoint(u_pointsB, index);
  
  float result;
  
  if (u_distanceType == DISTANCE_3D) {
    vec3 diff = p2 - p1;
    result = length(diff);
  } else if (u_distanceType == DISTANCE_3D_SQUARED) {
    vec3 diff = p2 - p1;
    result = dot(diff, diff);
  } else if (u_distanceType == DISTANCE_2D) {
    vec2 diff = p2.xy - p1.xy;
    result = length(diff);
  } else if (u_distanceType == DISTANCE_2D_SQUARED) {
    vec2 diff = p2.xy - p1.xy;
    result = dot(diff, diff);
  } else {
    result = 0.0;
  }
  
  fragColor = vec4(result, 0.0, 0.0, 1.0);
}
`;

export class DistanceCompute {
  private computeManager: Awaited<ReturnType<typeof getGPUComputeManager>> | null = null;
  private distanceKernel: ComputeKernel | null = null;
  private initialized = false;
  private options: DistanceComputeOptions;

  constructor(options: Partial<DistanceComputeOptions> = {}) {
    this.options = {
      maxBatchSize: 65536, // 64K points max per batch
      enablePrefetch: true,
      enableFp16: false,
      ...options
    };
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Get GPU manager
      this.computeManager = await getGPUComputeManager();

      // WAIT for GPU initialization to complete
      await this.computeManager.waitForInitialization();

      // NOW it's safe to check support
      if (!this.computeManager.isSupported()) {
        console.warn('GPU Compute not supported, distance calculations will fall back to CPU');
        this.initialized = true; // Mark as initialized even without GPU
        return false;
      }

      const device = this.computeManager.getDevice()!;
      
      if (device.type === 'webgpu') {
        this.distanceKernel = await this.computeManager.createKernel(
          'distance_compute',
          WEBGPU_DISTANCE_COMPUTE_SHADER
        );
      } else if (device.type === 'webgl2') {
        this.distanceKernel = await this.computeManager.createKernel(
          'distance_compute',
          WEBGL_DISTANCE_FRAGMENT_SHADER
        );
      }

      this.initialized = true;
      console.log(`✅ DistanceCompute initialized with ${device.type}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize DistanceCompute:', error);
      this.initialized = true; // Prevent retry loop
      return false;
    }
  }

  /**
   * Calculate 3D distances between corresponding points in two arrays
   */
  async calculate3D(pointsA: Point3D[], pointsB: Point3D[]): Promise<DistanceResult> {
    return this.calculateDistances(pointsA, pointsB, 'distance3d');
  }

  /**
   * Calculate squared 3D distances (avoids expensive sqrt operation)
   */
  async calculate3DSquared(pointsA: Point3D[], pointsB: Point3D[]): Promise<DistanceResult> {
    return this.calculateDistances(pointsA, pointsB, 'distance3d_squared');
  }

  /**
   * Calculate 2D distances (ignoring Z component)
   */
  async calculate2D(pointsA: Point3D[], pointsB: Point3D[]): Promise<DistanceResult> {
    return this.calculateDistances(pointsA, pointsB, 'distance2d');
  }

  /**
   * Calculate squared 2D distances
   */
  async calculate2DSquared(pointsA: Point3D[], pointsB: Point3D[]): Promise<DistanceResult> {
    return this.calculateDistances(pointsA, pointsB, 'distance2d_squared');
  }

  /**
   * Internal method for distance calculations
   */
  private async calculateDistances(
    pointsA: Point3D[], 
    pointsB: Point3D[], 
    distanceType: 'distance3d' | 'distance3d_squared' | 'distance2d' | 'distance2d_squared'
  ): Promise<DistanceResult> {
    const startTime = performance.now();

    // Validate inputs
    if (pointsA.length !== pointsB.length) {
      throw new Error('Point arrays must have the same length');
    }

    const pointCount = pointsA.length;

    // Fall back to CPU for small arrays or when GPU is not available
    if (!this.initialized || !this.computeManager?.isSupported() || pointCount < 100) {
      return this.calculateDistancesCPU(pointsA, pointsB, distanceType, startTime);
    }

    try {
      // Process in batches if necessary
      if (pointCount > this.options.maxBatchSize) {
        return await this.calculateDistancesBatched(pointsA, pointsB, distanceType, startTime);
      }

      return await this.calculateDistancesGPU(pointsA, pointsB, distanceType, startTime);
    } catch (error) {
      console.warn('GPU distance calculation failed, falling back to CPU:', error);
      return this.calculateDistancesCPU(pointsA, pointsB, distanceType, startTime);
    }
  }

  private async calculateDistancesGPU(
    pointsA: Point3D[],
    pointsB: Point3D[],
    distanceType: 'distance3d' | 'distance3d_squared' | 'distance2d' | 'distance2d_squared',
    startTime: number
  ): Promise<DistanceResult> {
    const pointCount = pointsA.length;
    const device = this.computeManager!.getDevice()!;

    // Convert points to flat arrays
    const flatPointsA = new Float32Array(pointCount * 3);
    const flatPointsB = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const idx = i * 3;
      flatPointsA[idx] = pointsA[i].x;
      flatPointsA[idx + 1] = pointsA[i].y;
      flatPointsA[idx + 2] = pointsA[i].z;
      
      flatPointsB[idx] = pointsB[i].x;
      flatPointsB[idx + 1] = pointsB[i].y;
      flatPointsB[idx + 2] = pointsB[i].z;
    }

    // Create GPU buffers
    const pointsABuffer = await this.computeManager!.createBuffer(
      flatPointsA.byteLength,
      'input',
      flatPointsA.buffer
    );

    const pointsBBuffer = await this.computeManager!.createBuffer(
      flatPointsB.byteLength,
      'input',
      flatPointsB.buffer
    );

    const distancesBuffer = await this.computeManager!.createBuffer(
      pointCount * 4, // Float32
      'output'
    );

    // Create uniform buffer for parameters
    const distanceTypeMap = {
      'distance3d': 0,
      'distance3d_squared': 1,
      'distance2d': 2,
      'distance2d_squared': 3
    };

    const params = new Uint32Array([pointCount, distanceTypeMap[distanceType], 0, 0]);
    const paramsBuffer = await this.computeManager!.createBuffer(
      params.byteLength,
      'uniform',
      params.buffer
    );

    // Execute compute kernel
    const workgroups = Math.ceil(pointCount / 256);
    await this.distanceKernel!.execute(
      { x: workgroups },
      [pointsABuffer, pointsBBuffer, distancesBuffer, paramsBuffer]
    );

    // Read back results
    const resultData = await this.computeManager!.readBuffer(distancesBuffer);
    const distances = new Float32Array(resultData, 0, pointCount);

    // Cleanup
    pointsABuffer.dispose();
    pointsBBuffer.dispose();
    distancesBuffer.dispose();
    paramsBuffer.dispose();

    const computeTimeMs = performance.now() - startTime;

    return {
      distances,
      computeTimeMs,
      method: device.type as 'webgpu' | 'webgl2',
      batchSize: pointCount
    };
  }

  private async calculateDistancesBatched(
    pointsA: Point3D[],
    pointsB: Point3D[],
    distanceType: 'distance3d' | 'distance3d_squared' | 'distance2d' | 'distance2d_squared',
    startTime: number
  ): Promise<DistanceResult> {
    const pointCount = pointsA.length;
    const batchSize = this.options.maxBatchSize;
    const batchCount = Math.ceil(pointCount / batchSize);
    
    const allDistances = new Float32Array(pointCount);
    let totalComputeTime = 0;

    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, pointCount);
      
      const batchPointsA = pointsA.slice(start, end);
      const batchPointsB = pointsB.slice(start, end);
      
      const batchResult = await this.calculateDistancesGPU(
        batchPointsA,
        batchPointsB,
        distanceType,
        performance.now()
      );
      
      allDistances.set(batchResult.distances, start);
      totalComputeTime += batchResult.computeTimeMs;
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      distances: allDistances,
      computeTimeMs,
      method: this.computeManager!.getDevice()!.type as 'webgpu' | 'webgl2',
      batchSize: pointCount
    };
  }

  private calculateDistancesCPU(
    pointsA: Point3D[],
    pointsB: Point3D[],
    distanceType: 'distance3d' | 'distance3d_squared' | 'distance2d' | 'distance2d_squared',
    startTime: number
  ): DistanceResult {
    const pointCount = pointsA.length;
    const distances = new Float32Array(pointCount);

    for (let i = 0; i < pointCount; i++) {
      const p1 = pointsA[i];
      const p2 = pointsB[i];

      let distance: number;
      switch (distanceType) {
        case 'distance3d': {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dz = p2.z - p1.z;
          distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          break;
        }
        case 'distance3d_squared': {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dz = p2.z - p1.z;
          distance = dx * dx + dy * dy + dz * dz;
          break;
        }
        case 'distance2d': {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          distance = Math.sqrt(dx * dx + dy * dy);
          break;
        }
        case 'distance2d_squared': {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          distance = dx * dx + dy * dy;
          break;
        }
      }

      distances[i] = distance;
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      distances,
      computeTimeMs,
      method: 'cpu_fallback',
      batchSize: pointCount
    };
  }

  /**
   * Benchmark GPU vs CPU performance for distance calculations
   */
  async benchmark(pointCount: number = 10000): Promise<{
    cpu: { timeMs: number; throughput: number };
    gpu?: { timeMs: number; throughput: number; speedup: number };
  }> {
    // Generate test data
    const pointsA = Array.from({ length: pointCount }, () => ({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100
    }));

    const pointsB = Array.from({ length: pointCount }, () => ({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100
    }));

    // Benchmark CPU
    const cpuResult = await this.calculateDistancesCPU(pointsA, pointsB, 'distance3d', performance.now());
    const cpuThroughput = pointCount / cpuResult.computeTimeMs * 1000; // points per second

    const result: any = {
      cpu: {
        timeMs: cpuResult.computeTimeMs,
        throughput: cpuThroughput
      }
    };

    // Benchmark GPU if available
    if (this.initialized && this.computeManager?.isSupported()) {
      try {
        const gpuResult = await this.calculateDistancesGPU(pointsA, pointsB, 'distance3d', performance.now());
        const gpuThroughput = pointCount / gpuResult.computeTimeMs * 1000;
        const speedup = cpuResult.computeTimeMs / gpuResult.computeTimeMs;

        result.gpu = {
          timeMs: gpuResult.computeTimeMs,
          throughput: gpuThroughput,
          speedup
        };
      } catch (error) {
        console.warn('GPU benchmark failed:', error);
      }
    }

    return result;
  }

  dispose(): void {
    if (this.distanceKernel) {
      this.distanceKernel.dispose();
      this.distanceKernel = null;
    }
    this.initialized = false;
  }

  isSupported(): boolean {
    return this.initialized && this.computeManager?.isSupported() || false;
  }

  getStats(): {
    supported: boolean;
    device: string;
    maxBatchSize: number;
  } {
    return {
      supported: this.isSupported(),
      device: this.computeManager?.getDevice()?.type || 'unsupported',
      maxBatchSize: this.options.maxBatchSize
    };
  }
}

// Singleton instance
let distanceCompute: DistanceCompute | null = null;

export async function getDistanceCompute(): Promise<DistanceCompute> {
  if (!distanceCompute) {
    distanceCompute = new DistanceCompute();
    await distanceCompute.initialize();
  }
  return distanceCompute;
}