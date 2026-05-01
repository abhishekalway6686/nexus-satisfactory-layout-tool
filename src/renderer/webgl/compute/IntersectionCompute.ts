/**
 * GPU-accelerated line intersection detection
 * Implements high-performance geometric intersection tests using compute shaders
 */

import { getGPUComputeManager, ComputeKernel, ComputeBuffer } from './GPUComputeManager';
import { Point3D } from '../../../types';

export interface IntersectionComputeOptions {
  readonly maxSegmentsPerBatch: number;
  readonly enableSpatialFiltering: boolean;
  readonly intersectionTolerance: number;
  readonly enableParallelCheck: boolean;
}

export interface LineSegment {
  readonly start: Point3D;
  readonly end: Point3D;
  readonly id?: string;
}

export interface IntersectionResult {
  readonly point: Point3D;
  readonly t1: number; // Parameter along first line (0-1)
  readonly t2: number; // Parameter along second line (0-1)
  readonly segment1Index: number;
  readonly segment2Index: number;
  readonly distance?: number; // For near-miss intersections
}

export interface IntersectionBatch {
  readonly intersections: IntersectionResult[];
  readonly computeTimeMs: number;
  readonly method: 'webgpu' | 'webgl2' | 'cpu_fallback';
  readonly segmentsProcessed: number;
  readonly comparisonsPerformed: number;
}

const WEBGPU_INTERSECTION_COMPUTE_SHADER = `
struct LineSegment {
  start: vec3<f32>,
  end: vec3<f32>,
}

struct Intersection {
  point: vec3<f32>,
  t1: f32,
  t2: f32,
  segment1: u32,
  segment2: u32,
  valid: u32,
}

@group(0) @binding(0) var<storage, read> segments1: array<LineSegment>;
@group(0) @binding(1) var<storage, read> segments2: array<LineSegment>;
@group(0) @binding(2) var<storage, read_write> intersections: array<Intersection>;
@group(0) @binding(3) var<uniform> params: vec4<u32>; // [count1, count2, spatialFiltering, padding]

const EPSILON: f32 = 1e-6;
const INTERSECTION_TOLERANCE: f32 = 1e-4;

fn lineIntersection2D(
  p1: vec2<f32>, p2: vec2<f32>,
  p3: vec2<f32>, p4: vec2<f32>
) -> vec4<f32> { // Returns: xy = intersection point, z = t1, w = t2
  let d1 = p2 - p1;
  let d2 = p4 - p3;
  let denom = d1.x * d2.y - d1.y * d2.x;
  
  if (abs(denom) < EPSILON) {
    return vec4<f32>(-1.0); // Parallel lines
  }
  
  let dp = p3 - p1;
  let t1 = (dp.x * d2.y - dp.y * d2.x) / denom;
  let t2 = (dp.x * d1.y - dp.y * d1.x) / denom;
  
  let intersection = p1 + t1 * d1;
  return vec4<f32>(intersection, t1, t2);
}

fn segmentDistance(p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>, p4: vec2<f32>) -> f32 {
  // Calculate minimum distance between two line segments
  let d1 = p2 - p1;
  let d2 = p4 - p3;
  let dp = p1 - p3;
  
  let a = dot(d1, d1);
  let b = dot(d1, d2);
  let c = dot(d2, d2);
  let d = dot(d1, dp);
  let e = dot(d2, dp);
  
  let det = a * c - b * b;
  
  var s: f32;
  var t: f32;
  
  if (det < EPSILON) {
    // Lines are parallel
    s = 0.0;
    t = d / b;
    t = clamp(t, 0.0, 1.0);
  } else {
    s = (b * e - c * d) / det;
    t = (a * e - b * d) / det;
    
    s = clamp(s, 0.0, 1.0);
    t = clamp(t, 0.0, 1.0);
  }
  
  let closest1 = p1 + s * d1;
  let closest2 = p3 + t * d2;
  
  return length(closest1 - closest2);
}

fn boundingBoxesOverlap(seg1: LineSegment, seg2: LineSegment) -> bool {
  let min1 = min(seg1.start.xy, seg1.end.xy);
  let max1 = max(seg1.start.xy, seg1.end.xy);
  let min2 = min(seg2.start.xy, seg2.end.xy);
  let max2 = max(seg2.start.xy, seg2.end.xy);
  
  return (max1.x >= min2.x && min1.x <= max2.x &&
          max1.y >= min2.y && min1.y <= max2.y);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  let j = global_id.y;
  let count1 = params.x;
  let count2 = params.y;
  let spatialFiltering = params.z;
  
  if (i >= count1 || j >= count2) {
    return;
  }
  
  // Skip self-intersection for same array
  if (i == j && count1 == count2) {
    return;
  }
  
  let seg1 = segments1[i];
  let seg2 = segments2[j];
  
  // Early spatial filtering using bounding boxes
  if (spatialFiltering == 1u && !boundingBoxesOverlap(seg1, seg2)) {
    return;
  }
  
  // Calculate 2D intersection (ignoring Z for now)
  let result = lineIntersection2D(
    seg1.start.xy, seg1.end.xy,
    seg2.start.xy, seg2.end.xy
  );
  
  let t1 = result.z;
  let t2 = result.w;
  
  // Check if intersection is within both segments
  var valid = 0u;
  var intersectionPoint = vec3<f32>(0.0);
  
  if (t1 >= -INTERSECTION_TOLERANCE && t1 <= 1.0 + INTERSECTION_TOLERANCE &&
      t2 >= -INTERSECTION_TOLERANCE && t2 <= 1.0 + INTERSECTION_TOLERANCE) {
    
    // Calculate 3D intersection point
    let point1 = seg1.start + t1 * (seg1.end - seg1.start);
    let point2 = seg2.start + t2 * (seg2.end - seg2.start);
    
    // Average the two points (they should be very close in 2D)
    intersectionPoint = (point1 + point2) * 0.5;
    valid = 1u;
  }
  
  // Store result
  let outputIndex = i * count2 + j;
  if (outputIndex < arrayLength(&intersections)) {
    intersections[outputIndex] = Intersection(
      intersectionPoint,
      t1,
      t2,
      i,
      j,
      valid
    );
  }
}
`;

const WEBGL_INTERSECTION_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_segments1;
uniform sampler2D u_segments2;
uniform ivec2 u_textureSize;
uniform int u_count1;
uniform int u_count2;
uniform bool u_spatialFiltering;
uniform float u_intersectionTolerance;

out vec4 fragColor;

const float EPSILON = 1e-6;

struct LineSegment {
  vec3 start;
  vec3 end;
};

LineSegment getSegment(sampler2D tex, int index) {
  // Each segment takes 2 pixels: start and end points
  int basePixel = index * 2;
  int y = basePixel / u_textureSize.x;
  int x = basePixel % u_textureSize.x;
  
  vec4 startPixel = texelFetch(tex, ivec2(x, y), 0);
  vec4 endPixel = texelFetch(tex, ivec2(x + 1, y), 0);
  
  return LineSegment(startPixel.xyz, endPixel.xyz);
}

vec4 lineIntersection2D(vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  vec2 d1 = p2 - p1;
  vec2 d2 = p4 - p3;
  float denom = d1.x * d2.y - d1.y * d2.x;
  
  if (abs(denom) < EPSILON) {
    return vec4(-1.0); // Parallel lines
  }
  
  vec2 dp = p3 - p1;
  float t1 = (dp.x * d2.y - dp.y * d2.x) / denom;
  float t2 = (dp.x * d1.y - dp.y * d1.x) / denom;
  
  vec2 intersection = p1 + t1 * d1;
  return vec4(intersection, t1, t2);
}

bool boundingBoxesOverlap(LineSegment seg1, LineSegment seg2) {
  vec2 min1 = min(seg1.start.xy, seg1.end.xy);
  vec2 max1 = max(seg1.start.xy, seg1.end.xy);
  vec2 min2 = min(seg2.start.xy, seg2.end.xy);
  vec2 max2 = max(seg2.start.xy, seg2.end.xy);
  
  return (max1.x >= min2.x && min1.x <= max2.x &&
          max1.y >= min2.y && min1.y <= max2.y);
}

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  int pixelIndex = fragCoord.y * u_textureSize.x + fragCoord.x;
  
  // Decode i,j from pixel index
  int i = pixelIndex / u_count2;
  int j = pixelIndex % u_count2;
  
  if (i >= u_count1 || j >= u_count2) {
    fragColor = vec4(0.0);
    return;
  }
  
  // Skip self-intersection
  if (i == j && u_count1 == u_count2) {
    fragColor = vec4(0.0);
    return;
  }
  
  LineSegment seg1 = getSegment(u_segments1, i);
  LineSegment seg2 = getSegment(u_segments2, j);
  
  // Early spatial filtering
  if (u_spatialFiltering && !boundingBoxesOverlap(seg1, seg2)) {
    fragColor = vec4(0.0);
    return;
  }
  
  // Calculate intersection
  vec4 result = lineIntersection2D(
    seg1.start.xy, seg1.end.xy,
    seg2.start.xy, seg2.end.xy
  );
  
  float t1 = result.z;
  float t2 = result.w;
  
  // Check if intersection is within both segments
  if (t1 >= -u_intersectionTolerance && t1 <= 1.0 + u_intersectionTolerance &&
      t2 >= -u_intersectionTolerance && t2 <= 1.0 + u_intersectionTolerance) {
    
    // Calculate 3D intersection point
    vec3 point1 = seg1.start + t1 * (seg1.end - seg1.start);
    vec3 point2 = seg2.start + t2 * (seg2.end - seg2.start);
    vec3 intersectionPoint = (point1 + point2) * 0.5;
    
    // Encode intersection data (point.xy in RG, t1 in B, valid flag in A)
    fragColor = vec4(intersectionPoint.xy, t1, 1.0);
  } else {
    fragColor = vec4(0.0);
  }
}
`;

export class IntersectionCompute {
  private computeManager: Awaited<ReturnType<typeof getGPUComputeManager>> | null = null;
  private intersectionKernel: ComputeKernel | null = null;
  private initialized = false;
  private options: IntersectionComputeOptions;

  constructor(options: Partial<IntersectionComputeOptions> = {}) {
    this.options = {
      maxSegmentsPerBatch: 2048,
      enableSpatialFiltering: true,
      intersectionTolerance: 1e-4,
      enableParallelCheck: true,
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
        console.warn('GPU Compute not supported, intersection calculations will fall back to CPU');
        this.initialized = true; // Mark as initialized even without GPU
        return false;
      }

      const device = this.computeManager.getDevice()!;
      
      if (device.type === 'webgpu') {
        this.intersectionKernel = await this.computeManager.createKernel(
          'intersection_compute',
          WEBGPU_INTERSECTION_COMPUTE_SHADER
        );
      } else if (device.type === 'webgl2') {
        this.intersectionKernel = await this.computeManager.createKernel(
          'intersection_compute',
          WEBGL_INTERSECTION_FRAGMENT_SHADER
        );
      }

      this.initialized = true;
      console.log(`✅ IntersectionCompute initialized with ${device.type}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize IntersectionCompute:', error);
      this.initialized = true; // Prevent retry loop
      return false;
    }
  }

  /**
   * Find all intersections between two sets of line segments
   */
  async findIntersections(
    segments1: LineSegment[],
    segments2: LineSegment[]
  ): Promise<IntersectionBatch> {
    const startTime = performance.now();

    // Fall back to CPU for small arrays or when GPU is not available
    if (!this.initialized || !this.computeManager?.isSupported() || 
        (segments1.length * segments2.length) < 1000) {
      return this.findIntersectionsCPU(segments1, segments2, startTime);
    }

    try {
      // Process in batches if necessary
      const maxComparisons = this.options.maxSegmentsPerBatch * this.options.maxSegmentsPerBatch;
      if ((segments1.length * segments2.length) > maxComparisons) {
        return await this.findIntersectionsBatched(segments1, segments2, startTime);
      }

      return await this.findIntersectionsGPU(segments1, segments2, startTime);
    } catch (error) {
      console.warn('GPU intersection detection failed, falling back to CPU:', error);
      return this.findIntersectionsCPU(segments1, segments2, startTime);
    }
  }

  /**
   * Find self-intersections within a single set of line segments
   */
  async findSelfIntersections(segments: LineSegment[]): Promise<IntersectionBatch> {
    // For self-intersections, we compare the array with itself
    return this.findIntersections(segments, segments);
  }

  private async findIntersectionsGPU(
    segments1: LineSegment[],
    segments2: LineSegment[],
    startTime: number
  ): Promise<IntersectionBatch> {
    const device = this.computeManager!.getDevice()!;

    // Prepare segment data
    const segmentData1 = new Float32Array(segments1.length * 6); // 2 points * 3 components each
    const segmentData2 = new Float32Array(segments2.length * 6);

    for (let i = 0; i < segments1.length; i++) {
      const seg = segments1[i];
      const offset = i * 6;
      segmentData1[offset] = seg.start.x;
      segmentData1[offset + 1] = seg.start.y;
      segmentData1[offset + 2] = seg.start.z;
      segmentData1[offset + 3] = seg.end.x;
      segmentData1[offset + 4] = seg.end.y;
      segmentData1[offset + 5] = seg.end.z;
    }

    for (let i = 0; i < segments2.length; i++) {
      const seg = segments2[i];
      const offset = i * 6;
      segmentData2[offset] = seg.start.x;
      segmentData2[offset + 1] = seg.start.y;
      segmentData2[offset + 2] = seg.start.z;
      segmentData2[offset + 3] = seg.end.x;
      segmentData2[offset + 4] = seg.end.y;
      segmentData2[offset + 5] = seg.end.z;
    }

    // Create GPU buffers
    const segments1Buffer = await this.computeManager!.createBuffer(
      segmentData1.byteLength,
      'input',
      segmentData1.buffer
    );

    const segments2Buffer = await this.computeManager!.createBuffer(
      segmentData2.byteLength,
      'input',
      segmentData2.buffer
    );

    const resultCount = segments1.length * segments2.length;
    const intersectionsBuffer = await this.computeManager!.createBuffer(
      resultCount * 24, // 6 floats + 2 uints per intersection = 24 bytes
      'output'
    );

    // Create parameters buffer
    const params = new Uint32Array([
      segments1.length,
      segments2.length,
      this.options.enableSpatialFiltering ? 1 : 0,
      0 // padding
    ]);
    const paramsBuffer = await this.computeManager!.createBuffer(
      params.byteLength,
      'uniform',
      params.buffer
    );

    // Execute compute kernel
    const workgroupsX = Math.ceil(segments1.length / 16);
    const workgroupsY = Math.ceil(segments2.length / 16);
    await this.intersectionKernel!.execute(
      { x: workgroupsX, y: workgroupsY },
      [segments1Buffer, segments2Buffer, intersectionsBuffer, paramsBuffer]
    );

    // Read back results
    const resultData = await this.computeManager!.readBuffer(intersectionsBuffer);
    const intersections = this.parseIntersectionResults(resultData, segments1.length, segments2.length);

    // Cleanup
    segments1Buffer.dispose();
    segments2Buffer.dispose();
    intersectionsBuffer.dispose();
    paramsBuffer.dispose();

    const computeTimeMs = performance.now() - startTime;

    return {
      intersections,
      computeTimeMs,
      method: device.type as 'webgpu' | 'webgl2',
      segmentsProcessed: segments1.length + segments2.length,
      comparisonsPerformed: segments1.length * segments2.length
    };
  }

  private parseIntersectionResults(
    data: ArrayBuffer,
    count1: number,
    count2: number
  ): IntersectionResult[] {
    const floatView = new Float32Array(data);
    const uintView = new Uint32Array(data);
    const intersections: IntersectionResult[] = [];

    const stride = 6; // 6 elements per intersection (3 point coords + t1 + t2 + valid flag)
    
    for (let i = 0; i < count1 * count2; i++) {
      const offset = i * stride;
      const validFlag = uintView[offset + 5];
      
      if (validFlag === 1) {
        intersections.push({
          point: {
            x: floatView[offset],
            y: floatView[offset + 1],
            z: floatView[offset + 2]
          },
          t1: floatView[offset + 3],
          t2: floatView[offset + 4],
          segment1Index: Math.floor(i / count2),
          segment2Index: i % count2
        });
      }
    }

    return intersections;
  }

  private async findIntersectionsBatched(
    segments1: LineSegment[],
    segments2: LineSegment[],
    startTime: number
  ): Promise<IntersectionBatch> {
    const batchSize = this.options.maxSegmentsPerBatch;
    const allIntersections: IntersectionResult[] = [];
    let totalComparisons = 0;

    // Process segments1 in batches
    for (let i = 0; i < segments1.length; i += batchSize) {
      const batch1 = segments1.slice(i, Math.min(i + batchSize, segments1.length));
      
      // Process segments2 in batches
      for (let j = 0; j < segments2.length; j += batchSize) {
        const batch2 = segments2.slice(j, Math.min(j + batchSize, segments2.length));
        
        const batchResult = await this.findIntersectionsGPU(
          batch1,
          batch2,
          performance.now()
        );
        
        // Adjust indices for the batch offset
        const adjustedIntersections = batchResult.intersections.map(intersection => ({
          ...intersection,
          segment1Index: intersection.segment1Index + i,
          segment2Index: intersection.segment2Index + j
        }));
        
        allIntersections.push(...adjustedIntersections);
        totalComparisons += batchResult.comparisonsPerformed;
      }
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      intersections: allIntersections,
      computeTimeMs,
      method: this.computeManager!.getDevice()!.type as 'webgpu' | 'webgl2',
      segmentsProcessed: segments1.length + segments2.length,
      comparisonsPerformed: totalComparisons
    };
  }

  private findIntersectionsCPU(
    segments1: LineSegment[],
    segments2: LineSegment[],
    startTime: number
  ): IntersectionBatch {
    const intersections: IntersectionResult[] = [];
    let comparisons = 0;

    for (let i = 0; i < segments1.length; i++) {
      for (let j = 0; j < segments2.length; j++) {
        // Skip self-intersection for same array
        if (segments1 === segments2 && i === j) {
          continue;
        }

        comparisons++;

        const seg1 = segments1[i];
        const seg2 = segments2[j];

        const intersection = this.lineIntersection2DCPU(
          seg1.start, seg1.end,
          seg2.start, seg2.end
        );

        if (intersection && 
            intersection.t1 >= -this.options.intersectionTolerance && 
            intersection.t1 <= 1 + this.options.intersectionTolerance &&
            intersection.t2 >= -this.options.intersectionTolerance && 
            intersection.t2 <= 1 + this.options.intersectionTolerance) {
          
          intersections.push({
            point: intersection.point,
            t1: intersection.t1,
            t2: intersection.t2,
            segment1Index: i,
            segment2Index: j
          });
        }
      }
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      intersections,
      computeTimeMs,
      method: 'cpu_fallback',
      segmentsProcessed: segments1.length + segments2.length,
      comparisonsPerformed: comparisons
    };
  }

  private lineIntersection2DCPU(
    start1: Point3D, end1: Point3D,
    start2: Point3D, end2: Point3D
  ): { point: Point3D; t1: number; t2: number } | null {
    const d1x = end1.x - start1.x;
    const d1y = end1.y - start1.y;
    const d2x = end2.x - start2.x;
    const d2y = end2.y - start2.y;

    const denom = d1x * d2y - d1y * d2x;
    
    if (Math.abs(denom) < 1e-6) {
      return null; // Parallel lines
    }

    const dpx = start2.x - start1.x;
    const dpy = start2.y - start1.y;
    
    const t1 = (dpx * d2y - dpy * d2x) / denom;
    const t2 = (dpx * d1y - dpy * d1x) / denom;

    // Calculate 3D intersection point (average of the two points for Z)
    const point1: Point3D = {
      x: start1.x + t1 * d1x,
      y: start1.y + t1 * d1y,
      z: start1.z + t1 * (end1.z - start1.z)
    };

    const point2: Point3D = {
      x: start2.x + t2 * d2x,
      y: start2.y + t2 * d2y,
      z: start2.z + t2 * (end2.z - start2.z)
    };

    return {
      point: {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2,
        z: (point1.z + point2.z) / 2
      },
      t1,
      t2
    };
  }

  /**
   * Benchmark GPU vs CPU performance for intersection detection
   */
  async benchmark(segmentCount: number = 100): Promise<{
    cpu: { timeMs: number; throughput: number };
    gpu?: { timeMs: number; throughput: number; speedup: number };
  }> {
    // Generate test segments
    const segments = Array.from({ length: segmentCount }, () => ({
      start: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      },
      end: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      }
    }));

    // Benchmark CPU
    const cpuResult = this.findIntersectionsCPU(segments, segments, performance.now());
    const cpuThroughput = cpuResult.comparisonsPerformed / cpuResult.computeTimeMs * 1000;

    const result: any = {
      cpu: {
        timeMs: cpuResult.computeTimeMs,
        throughput: cpuThroughput
      }
    };

    // Benchmark GPU if available
    if (this.initialized && this.computeManager?.isSupported()) {
      try {
        const gpuResult = await this.findIntersectionsGPU(segments, segments, performance.now());
        const gpuThroughput = gpuResult.comparisonsPerformed / gpuResult.computeTimeMs * 1000;
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
    if (this.intersectionKernel) {
      this.intersectionKernel.dispose();
      this.intersectionKernel = null;
    }
    this.initialized = false;
  }

  isSupported(): boolean {
    return this.initialized && this.computeManager?.isSupported() || false;
  }

  getStats(): {
    supported: boolean;
    device: string;
    maxSegmentsPerBatch: number;
    spatialFiltering: boolean;
  } {
    return {
      supported: this.isSupported(),
      device: this.computeManager?.getDevice()?.type || 'unsupported',
      maxSegmentsPerBatch: this.options.maxSegmentsPerBatch,
      spatialFiltering: this.options.enableSpatialFiltering
    };
  }
}

// Singleton instance
let intersectionCompute: IntersectionCompute | null = null;

export async function getIntersectionCompute(): Promise<IntersectionCompute> {
  if (!intersectionCompute) {
    intersectionCompute = new IntersectionCompute();
    await intersectionCompute.initialize();
  }
  return intersectionCompute;
}