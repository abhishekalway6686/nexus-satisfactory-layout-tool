/**
 * GPU-accelerated Bezier curve calculations
 * Implements high-performance curve tessellation and evaluation using compute shaders
 */

import { getGPUComputeManager, ComputeKernel, ComputeBuffer } from './GPUComputeManager';
import { Point3D } from '../../../types';

export interface CurveComputeOptions {
  readonly maxCurvesPerBatch: number;
  readonly defaultTessellationSteps: number;
  readonly enableAdaptiveTessellation: boolean;
  readonly curvatureTolerance: number;
}

export interface CurveResult {
  readonly points: Point3D[];
  readonly computeTimeMs: number;
  readonly method: 'webgpu' | 'webgl2' | 'cpu_fallback';
  readonly actualSteps: number;
}

export interface CurveBatch {
  readonly curves: Array<{
    start: Point3D;
    control: Point3D;
    end: Point3D;
    steps: number;
  }>;
  readonly points: Point3D[];
  readonly computeTimeMs: number;
  readonly method: 'webgpu' | 'webgl2' | 'cpu_fallback';
}

const WEBGPU_BEZIER_COMPUTE_SHADER = `
struct BezierCurve {
  start: vec3<f32>,
  control: vec3<f32>,
  end: vec3<f32>,
  steps: u32,
}

@group(0) @binding(0) var<storage, read> curves: array<BezierCurve>;
@group(0) @binding(1) var<storage, read_write> points: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> pointOffsets: array<u32>;
@group(0) @binding(3) var<uniform> params: vec4<u32>; // [curveCount, maxSteps, adaptiveTessellation, padding]

fn evaluateBezier(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> vec3<f32> {
  let u = 1.0 - t;
  return u * u * start + 2.0 * u * t * control + t * t * end;
}

fn getBezierTangent(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> vec3<f32> {
  let u = 1.0 - t;
  return 2.0 * u * (control - start) + 2.0 * t * (end - control);
}

fn calculateCurvature(start: vec3<f32>, control: vec3<f32>, end: vec3<f32>, t: f32) -> f32 {
  let tangent = getBezierTangent(start, control, end, t);
  let dt = 0.001;
  let tangent2 = getBezierTangent(start, control, end, t + dt);
  let curvatureVec = (tangent2 - tangent) / dt;
  return length(curvatureVec) / pow(length(tangent), 3.0);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let curveIndex = global_id.x;
  let curveCount = params.x;
  let maxSteps = params.y;
  let adaptiveTessellation = params.z;
  
  if (curveIndex >= curveCount) {
    return;
  }
  
  let curve = curves[curveIndex];
  let baseOffset = pointOffsets[curveIndex];
  
  var actualSteps = curve.steps;
  
  // Adaptive tessellation based on curvature
  if (adaptiveTessellation == 1u) {
    var maxCurvature = 0.0;
    let sampleCount = 10u;
    
    for (var i = 0u; i < sampleCount; i++) {
      let t = f32(i) / f32(sampleCount - 1u);
      let curvature = calculateCurvature(curve.start, curve.control, curve.end, t);
      maxCurvature = max(maxCurvature, curvature);
    }
    
    // Adjust steps based on curvature (higher curvature = more steps)
    let curvatureFactor = min(maxCurvature * 100.0, 4.0);
    actualSteps = u32(f32(curve.steps) * (1.0 + curvatureFactor));
    actualSteps = min(actualSteps, maxSteps);
  }
  
  // Generate tessellated points
  for (var i = 0u; i <= actualSteps; i++) {
    let t = f32(i) / f32(actualSteps);
    let point = evaluateBezier(curve.start, curve.control, curve.end, t);
    
    let pointIndex = baseOffset + i;
    if (pointIndex < arrayLength(&points)) {
      points[pointIndex] = point;
    }
  }
}
`;

const WEBGL_BEZIER_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_curves;
uniform sampler2D u_offsets;
uniform ivec2 u_textureSize;
uniform int u_curveCount;
uniform int u_maxSteps;
uniform bool u_adaptiveTessellation;
uniform float u_curvatureTolerance;

out vec4 fragColor;

struct BezierCurve {
  vec3 start;
  vec3 control;
  vec3 end;
  int steps;
};

BezierCurve getCurve(int index) {
  // Each curve takes 4 pixels: start, control, end, steps
  int basePixel = index * 4;
  int y = basePixel / u_textureSize.x;
  int x = basePixel % u_textureSize.x;
  
  vec4 startPixel = texelFetch(u_curves, ivec2(x, y), 0);
  vec4 controlPixel = texelFetch(u_curves, ivec2(x + 1, y), 0);
  vec4 endPixel = texelFetch(u_curves, ivec2(x + 2, y), 0);
  vec4 stepsPixel = texelFetch(u_curves, ivec2(x + 3, y), 0);
  
  return BezierCurve(
    startPixel.xyz,
    controlPixel.xyz,
    endPixel.xyz,
    int(stepsPixel.r)
  );
}

vec3 evaluateBezier(vec3 start, vec3 control, vec3 end, float t) {
  float u = 1.0 - t;
  return u * u * start + 2.0 * u * t * control + t * t * end;
}

vec3 getBezierTangent(vec3 start, vec3 control, vec3 end, float t) {
  float u = 1.0 - t;
  return 2.0 * u * (control - start) + 2.0 * t * (end - control);
}

float calculateCurvature(vec3 start, vec3 control, vec3 end, float t) {
  vec3 tangent = getBezierTangent(start, control, end, t);
  float dt = 0.001;
  vec3 tangent2 = getBezierTangent(start, control, end, t + dt);
  vec3 curvatureVec = (tangent2 - tangent) / dt;
  return length(curvatureVec) / pow(length(tangent), 3.0);
}

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  int pixelIndex = fragCoord.y * u_textureSize.x + fragCoord.x;
  
  // Determine which curve and point within that curve this pixel represents
  int curveIndex = 0;
  int pointIndex = pixelIndex;
  
  // Find the curve this point belongs to
  for (int i = 0; i < u_curveCount; i++) {
    BezierCurve curve = getCurve(i);
    int curvePoints = curve.steps + 1;
    
    if (pointIndex < curvePoints) {
      curveIndex = i;
      break;
    }
    
    pointIndex -= curvePoints;
  }
  
  if (curveIndex >= u_curveCount) {
    fragColor = vec4(0.0);
    return;
  }
  
  BezierCurve curve = getCurve(curveIndex);
  int actualSteps = curve.steps;
  
  // Adaptive tessellation
  if (u_adaptiveTessellation) {
    float maxCurvature = 0.0;
    int sampleCount = 10;
    
    for (int i = 0; i < sampleCount; i++) {
      float t = float(i) / float(sampleCount - 1);
      float curvature = calculateCurvature(curve.start, curve.control, curve.end, t);
      maxCurvature = max(maxCurvature, curvature);
    }
    
    float curvatureFactor = min(maxCurvature / u_curvatureTolerance, 4.0);
    actualSteps = int(float(curve.steps) * (1.0 + curvatureFactor));
    actualSteps = min(actualSteps, u_maxSteps);
  }
  
  if (pointIndex > actualSteps) {
    fragColor = vec4(0.0);
    return;
  }
  
  float t = float(pointIndex) / float(actualSteps);
  vec3 point = evaluateBezier(curve.start, curve.control, curve.end, t);
  
  fragColor = vec4(point, 1.0);
}
`;

export class CurveCompute {
  private computeManager: Awaited<ReturnType<typeof getGPUComputeManager>> | null = null;
  private bezierKernel: ComputeKernel | null = null;
  private initialized = false;
  private options: CurveComputeOptions;

  constructor(options: Partial<CurveComputeOptions> = {}) {
    this.options = {
      maxCurvesPerBatch: 1024,
      defaultTessellationSteps: 20,
      enableAdaptiveTessellation: true,
      curvatureTolerance: 0.1,
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
        console.warn('GPU Compute not supported, curve calculations will fall back to CPU');
        this.initialized = true; // Mark as initialized even without GPU
        return false;
      }

      const device = this.computeManager.getDevice()!;
      
      if (device.type === 'webgpu') {
        this.bezierKernel = await this.computeManager.createKernel(
          'bezier_compute',
          WEBGPU_BEZIER_COMPUTE_SHADER
        );
      } else if (device.type === 'webgl2') {
        this.bezierKernel = await this.computeManager.createKernel(
          'bezier_compute',
          WEBGL_BEZIER_FRAGMENT_SHADER
        );
      }

      this.initialized = true;
      console.log(`✅ CurveCompute initialized with ${device.type}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize CurveCompute:', error);
      this.initialized = true; // Prevent retry loop
      return false;
    }
  }

  /**
   * Generate tessellated points for a single Bezier curve
   */
  async generateCurve(
    start: Point3D,
    control: Point3D,
    end: Point3D,
    steps?: number
  ): Promise<CurveResult> {
    const actualSteps = steps ?? this.options.defaultTessellationSteps;
    return this.generateCurves([{ start, control, end, steps: actualSteps }])
      .then(batch => ({
        points: batch.points,
        computeTimeMs: batch.computeTimeMs,
        method: batch.method,
        actualSteps
      }));
  }

  /**
   * Generate tessellated points for multiple Bezier curves in a batch
   */
  async generateCurves(curves: Array<{
    start: Point3D;
    control: Point3D;
    end: Point3D;
    steps: number;
  }>): Promise<CurveBatch> {
    const startTime = performance.now();

    // Fall back to CPU for small batches or when GPU is not available
    if (!this.initialized || !this.computeManager?.isSupported() || curves.length < 10) {
      return this.generateCurvesCPU(curves, startTime);
    }

    try {
      // Process in batches if necessary
      if (curves.length > this.options.maxCurvesPerBatch) {
        return await this.generateCurvesBatched(curves, startTime);
      }

      return await this.generateCurvesGPU(curves, startTime);
    } catch (error) {
      console.warn('GPU curve generation failed, falling back to CPU:', error);
      return this.generateCurvesCPU(curves, startTime);
    }
  }

  private async generateCurvesGPU(
    curves: Array<{
      start: Point3D;
      control: Point3D;
      end: Point3D;
      steps: number;
    }>,
    startTime: number
  ): Promise<CurveBatch> {
    const device = this.computeManager!.getDevice()!;

    // Calculate total points needed
    let totalPoints = 0;
    const pointOffsets: number[] = [];
    
    for (const curve of curves) {
      pointOffsets.push(totalPoints);
      totalPoints += curve.steps + 1; // +1 because we include both endpoints
    }

    // Prepare curve data
    const curveData = new Float32Array(curves.length * 10); // 3 points * 3 components + 1 step count = 10 floats
    
    for (let i = 0; i < curves.length; i++) {
      const curve = curves[i];
      const offset = i * 10;
      
      // Start point
      curveData[offset] = curve.start.x;
      curveData[offset + 1] = curve.start.y;
      curveData[offset + 2] = curve.start.z;
      
      // Control point
      curveData[offset + 3] = curve.control.x;
      curveData[offset + 4] = curve.control.y;
      curveData[offset + 5] = curve.control.z;
      
      // End point
      curveData[offset + 6] = curve.end.x;
      curveData[offset + 7] = curve.end.y;
      curveData[offset + 8] = curve.end.z;
      
      // Steps
      curveData[offset + 9] = curve.steps;
    }

    // Create GPU buffers
    const curvesBuffer = await this.computeManager!.createBuffer(
      curveData.byteLength,
      'input',
      curveData.buffer
    );

    const pointsBuffer = await this.computeManager!.createBuffer(
      totalPoints * 3 * 4, // 3 components * 4 bytes per float
      'output'
    );

    const offsetsData = new Uint32Array(pointOffsets);
    const offsetsBuffer = await this.computeManager!.createBuffer(
      offsetsData.byteLength,
      'input',
      offsetsData.buffer
    );

    // Create parameters buffer
    const params = new Uint32Array([
      curves.length,
      Math.max(...curves.map(c => c.steps)),
      this.options.enableAdaptiveTessellation ? 1 : 0,
      0 // padding
    ]);
    const paramsBuffer = await this.computeManager!.createBuffer(
      params.byteLength,
      'uniform',
      params.buffer
    );

    // Execute compute kernel
    const workgroups = Math.ceil(curves.length / 256);
    await this.bezierKernel!.execute(
      { x: workgroups },
      [curvesBuffer, pointsBuffer, offsetsBuffer, paramsBuffer]
    );

    // Read back results
    const resultData = await this.computeManager!.readBuffer(pointsBuffer);
    const flatPoints = new Float32Array(resultData);

    // Convert flat array back to Point3D array
    const points: Point3D[] = [];
    for (let i = 0; i < flatPoints.length; i += 3) {
      points.push({
        x: flatPoints[i],
        y: flatPoints[i + 1],
        z: flatPoints[i + 2]
      });
    }

    // Cleanup
    curvesBuffer.dispose();
    pointsBuffer.dispose();
    offsetsBuffer.dispose();
    paramsBuffer.dispose();

    const computeTimeMs = performance.now() - startTime;

    return {
      curves,
      points,
      computeTimeMs,
      method: device.type as 'webgpu' | 'webgl2'
    };
  }

  private async generateCurvesBatched(
    curves: Array<{
      start: Point3D;
      control: Point3D;
      end: Point3D;
      steps: number;
    }>,
    startTime: number
  ): Promise<CurveBatch> {
    const batchSize = this.options.maxCurvesPerBatch;
    const batchCount = Math.ceil(curves.length / batchSize);
    
    const allPoints: Point3D[] = [];
    let totalComputeTime = 0;

    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, curves.length);
      
      const batchCurves = curves.slice(start, end);
      
      const batchResult = await this.generateCurvesGPU(
        batchCurves,
        performance.now()
      );
      
      allPoints.push(...batchResult.points);
      totalComputeTime += batchResult.computeTimeMs;
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      curves,
      points: allPoints,
      computeTimeMs,
      method: this.computeManager!.getDevice()!.type as 'webgpu' | 'webgl2'
    };
  }

  private generateCurvesCPU(
    curves: Array<{
      start: Point3D;
      control: Point3D;
      end: Point3D;
      steps: number;
    }>,
    startTime: number
  ): CurveBatch {
    const allPoints: Point3D[] = [];

    for (const curve of curves) {
      const curvePoints = this.evaluateBezierCPU(
        curve.start,
        curve.control,
        curve.end,
        curve.steps
      );
      allPoints.push(...curvePoints);
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      curves,
      points: allPoints,
      computeTimeMs,
      method: 'cpu_fallback'
    };
  }

  private evaluateBezierCPU(start: Point3D, control: Point3D, end: Point3D, steps: number): Point3D[] {
    const points: Point3D[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      
      const point: Point3D = {
        x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
        z: u * u * start.z + 2 * u * t * control.z + t * t * end.z
      };
      
      points.push(point);
    }
    
    return points;
  }

  /**
   * Calculate the length of a Bezier curve using tessellation
   */
  async calculateLength(start: Point3D, control: Point3D, end: Point3D, samples: number = 100): Promise<number> {
    const result = await this.generateCurve(start, control, end, samples);
    
    let length = 0;
    for (let i = 1; i < result.points.length; i++) {
      const p1 = result.points[i - 1];
      const p2 = result.points[i];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      length += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    return length;
  }

  /**
   * Find the closest point on a Bezier curve to a given point
   */
  async findClosestPoint(
    targetPoint: Point3D,
    start: Point3D,
    control: Point3D,
    end: Point3D,
    samples: number = 50
  ): Promise<{ point: Point3D; t: number; distance: number }> {
    const result = await this.generateCurve(start, control, end, samples);
    
    let minDistance = Infinity;
    let closestPoint = start;
    let closestT = 0;
    
    for (let i = 0; i < result.points.length; i++) {
      const point = result.points[i];
      const dx = point.x - targetPoint.x;
      const dy = point.y - targetPoint.y;
      const dz = point.z - targetPoint.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
        closestT = i / (result.points.length - 1);
      }
    }
    
    return {
      point: closestPoint,
      t: closestT,
      distance: minDistance
    };
  }

  /**
   * Benchmark GPU vs CPU performance for curve generation
   */
  async benchmark(curveCount: number = 100, stepsPerCurve: number = 20): Promise<{
    cpu: { timeMs: number; throughput: number };
    gpu?: { timeMs: number; throughput: number; speedup: number };
  }> {
    // Generate test curves
    const curves = Array.from({ length: curveCount }, () => ({
      start: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      },
      control: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      },
      end: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      },
      steps: stepsPerCurve
    }));

    // Benchmark CPU
    const cpuResult = this.generateCurvesCPU(curves, performance.now());
    const cpuThroughput = curveCount / cpuResult.computeTimeMs * 1000; // curves per second

    const result: any = {
      cpu: {
        timeMs: cpuResult.computeTimeMs,
        throughput: cpuThroughput
      }
    };

    // Benchmark GPU if available
    if (this.initialized && this.computeManager?.isSupported()) {
      try {
        const gpuResult = await this.generateCurvesGPU(curves, performance.now());
        const gpuThroughput = curveCount / gpuResult.computeTimeMs * 1000;
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
    if (this.bezierKernel) {
      this.bezierKernel.dispose();
      this.bezierKernel = null;
    }
    this.initialized = false;
  }

  isSupported(): boolean {
    return this.initialized && this.computeManager?.isSupported() || false;
  }

  getStats(): {
    supported: boolean;
    device: string;
    maxCurvesPerBatch: number;
    adaptiveTessellation: boolean;
  } {
    return {
      supported: this.isSupported(),
      device: this.computeManager?.getDevice()?.type || 'unsupported',
      maxCurvesPerBatch: this.options.maxCurvesPerBatch,
      adaptiveTessellation: this.options.enableAdaptiveTessellation
    };
  }
}

// Singleton instance
let curveCompute: CurveCompute | null = null;

export async function getCurveCompute(): Promise<CurveCompute> {
  if (!curveCompute) {
    curveCompute = new CurveCompute();
    await curveCompute.initialize();
  }
  return curveCompute;
}