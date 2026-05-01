/**
 * GPU Compute Module - Entry point for all GPU-accelerated calculations
 * Provides a unified interface for all compute operations with automatic fallbacks
 */

export { GPUComputeManager, getGPUComputeManager, isGPUComputeAvailable } from './GPUComputeManager';
export type { ComputeDevice, ComputeCapabilities, ComputeBuffer, ComputeKernel } from './GPUComputeManager';

export { DistanceCompute, getDistanceCompute } from './DistanceCompute';
export type { DistanceComputeOptions, DistanceResult } from './DistanceCompute';

export { CurveCompute, getCurveCompute } from './CurveCompute';
export type { CurveComputeOptions, CurveResult, CurveBatch } from './CurveCompute';

export { IntersectionCompute, getIntersectionCompute } from './IntersectionCompute';
export type { 
  IntersectionComputeOptions, 
  LineSegment, 
  IntersectionResult, 
  IntersectionBatch 
} from './IntersectionCompute';

export { SpatialCompute, getSpatialCompute } from './SpatialCompute';
export type { 
  SpatialComputeOptions, 
  SpatialEntity, 
  SpatialQuery, 
  SpatialQueryResult, 
  SpatialBatch 
} from './SpatialCompute';

import { getGPUComputeManager } from './GPUComputeManager';
import { getDistanceCompute } from './DistanceCompute';
import { getCurveCompute } from './CurveCompute';
import { getIntersectionCompute } from './IntersectionCompute';
import { getSpatialCompute } from './SpatialCompute';
import { Point3D } from '../../../types';

/**
 * Unified GPU Compute Interface
 * Provides high-level methods that automatically choose the best compute method
 */
export class UnifiedComputeEngine {
  private static instance: UnifiedComputeEngine | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): UnifiedComputeEngine {
    if (!UnifiedComputeEngine.instance) {
      UnifiedComputeEngine.instance = new UnifiedComputeEngine();
    }
    return UnifiedComputeEngine.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Initialize all compute modules
      const [computeManager, distanceCompute, curveCompute, intersectionCompute, spatialCompute] = 
        await Promise.all([
          getGPUComputeManager(),
          getDistanceCompute(),
          getCurveCompute(),
          getIntersectionCompute(),
          getSpatialCompute()
        ]);

      this.initialized = true;
      
      const device = computeManager.getDevice();
      console.log(`✅ UnifiedComputeEngine initialized with ${device?.type || 'CPU fallback'}`);
      
      return computeManager.isSupported();
    } catch (error) {
      console.error('Failed to initialize UnifiedComputeEngine:', error);
      return false;
    }
  }

  /**
   * High-performance bulk distance calculations
   * Automatically chooses the best method based on data size and GPU availability
   */
  async calculateDistances3D(pointsA: Point3D[], pointsB: Point3D[]): Promise<Float32Array> {
    const distanceCompute = await getDistanceCompute();
    const result = await distanceCompute.calculate3D(pointsA, pointsB);
    return result.distances;
  }

  async calculateDistances3DSquared(pointsA: Point3D[], pointsB: Point3D[]): Promise<Float32Array> {
    const distanceCompute = await getDistanceCompute();
    const result = await distanceCompute.calculate3DSquared(pointsA, pointsB);
    return result.distances;
  }

  async calculateDistances2D(pointsA: Point3D[], pointsB: Point3D[]): Promise<Float32Array> {
    const distanceCompute = await getDistanceCompute();
    const result = await distanceCompute.calculate2D(pointsA, pointsB);
    return result.distances;
  }

  async calculateDistances2DSquared(pointsA: Point3D[], pointsB: Point3D[]): Promise<Float32Array> {
    const distanceCompute = await getDistanceCompute();
    const result = await distanceCompute.calculate2DSquared(pointsA, pointsB);
    return result.distances;
  }

  /**
   * High-performance Bezier curve generation
   * Automatically handles tessellation and optimization
   */
  async generateBezierCurve(
    start: Point3D, 
    control: Point3D, 
    end: Point3D, 
    steps?: number
  ): Promise<Point3D[]> {
    const curveCompute = await getCurveCompute();
    const result = await curveCompute.generateCurve(start, control, end, steps);
    return result.points;
  }

  async generateBezierCurves(curves: Array<{
    start: Point3D;
    control: Point3D;
    end: Point3D;
    steps: number;
  }>): Promise<Point3D[]> {
    const curveCompute = await getCurveCompute();
    const result = await curveCompute.generateCurves(curves);
    return result.points;
  }

  async calculateBezierLength(start: Point3D, control: Point3D, end: Point3D, samples?: number): Promise<number> {
    const curveCompute = await getCurveCompute();
    return curveCompute.calculateLength(start, control, end, samples);
  }

  /**
   * High-performance line intersection detection
   * Automatically handles large polyline intersections
   */
  async findLineIntersections(
    segments1: Array<{ start: Point3D; end: Point3D }>,
    segments2: Array<{ start: Point3D; end: Point3D }>
  ): Promise<Array<{
    point: Point3D;
    t1: number;
    t2: number;
    segment1Index: number;
    segment2Index: number;
  }>> {
    const intersectionCompute = await getIntersectionCompute();
    const result = await intersectionCompute.findIntersections(segments1, segments2);
    return result.intersections;
  }

  async findSelfIntersections(segments: Array<{ start: Point3D; end: Point3D }>): Promise<Array<{
    point: Point3D;
    t1: number;
    t2: number;
    segment1Index: number;
    segment2Index: number;
  }>> {
    const intersectionCompute = await getIntersectionCompute();
    const result = await intersectionCompute.findSelfIntersections(segments);
    return result.intersections;
  }

  /**
   * High-performance spatial queries
   * Automatically handles R-tree style operations
   */
  async spatialQuery(
    entities: Array<{
      id: string;
      position: Point3D;
      boundingBox: { min: Point3D; max: Point3D };
      type: string;
    }>,
    center: Point3D,
    radius: number,
    options?: {
      types?: string[];
      maxResults?: number;
    }
  ): Promise<Array<{
    id: string;
    position: Point3D;
    boundingBox: { min: Point3D; max: Point3D };
    type: string;
    distance: number;
  }>> {
    const spatialCompute = await getSpatialCompute();
    const result = await spatialCompute.executeQuery(entities, {
      center,
      radius,
      types: options?.types,
      maxResults: options?.maxResults
    });

    return result.entities.map((entity, index) => ({
      ...entity,
      distance: result.distances[index]
    }));
  }

  async bulkSpatialQueries(
    entities: Array<{
      id: string;
      position: Point3D;
      boundingBox: { min: Point3D; max: Point3D };
      type: string;
    }>,
    queries: Array<{
      center: Point3D;
      radius: number;
      types?: string[];
      maxResults?: number;
    }>
  ): Promise<Array<Array<{
    id: string;
    position: Point3D;
    boundingBox: { min: Point3D; max: Point3D };
    type: string;
    distance: number;
  }>>> {
    const spatialCompute = await getSpatialCompute();
    const result = await spatialCompute.executeQueries(entities, queries);

    return result.results.map(queryResult =>
      queryResult.entities.map((entity, index) => ({
        ...entity,
        distance: queryResult.distances[index]
      }))
    );
  }

  /**
   * Get comprehensive performance statistics
   */
  async getPerformanceStats(): Promise<{
    computeManager: any;
    distance: any;
    curve: any;
    intersection: any;
    spatial: any;
  }> {
    const [computeManager, distanceCompute, curveCompute, intersectionCompute, spatialCompute] = 
      await Promise.all([
        getGPUComputeManager(),
        getDistanceCompute(),
        getCurveCompute(),
        getIntersectionCompute(),
        getSpatialCompute()
      ]);

    return {
      computeManager: computeManager.getStats(),
      distance: distanceCompute.getStats(),
      curve: curveCompute.getStats(),
      intersection: intersectionCompute.getStats(),
      spatial: spatialCompute.getStats()
    };
  }

  /**
   * Run comprehensive benchmarks across all compute modules
   */
  async runBenchmarks(): Promise<{
    distance: any;
    curve: any;
    intersection: any;
    spatial: any;
  }> {
    const [distanceCompute, curveCompute, intersectionCompute, spatialCompute] = 
      await Promise.all([
        getDistanceCompute(),
        getCurveCompute(),
        getIntersectionCompute(),
        getSpatialCompute()
      ]);

    const [distanceBench, curveBench, intersectionBench, spatialBench] = await Promise.all([
      distanceCompute.benchmark(),
      curveCompute.benchmark(),
      intersectionCompute.benchmark(),
      spatialCompute.benchmark()
    ]);

    return {
      distance: distanceBench,
      curve: curveBench,
      intersection: intersectionBench,
      spatial: spatialBench
    };
  }

  /**
   * Check if GPU compute is available and supported
   */
  async isGPUSupported(): Promise<boolean> {
    const computeManager = await getGPUComputeManager();
    return computeManager.isSupported();
  }

  /**
   * Get the current compute device information
   */
  async getDeviceInfo(): Promise<{
    type: string;
    supported: boolean;
    capabilities: any;
  }> {
    const computeManager = await getGPUComputeManager();
    const device = computeManager.getDevice();
    
    return {
      type: device?.type || 'unsupported',
      supported: device?.supported || false,
      capabilities: device?.capabilities || {}
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Get the unified compute engine singleton
 */
export async function getUnifiedComputeEngine(): Promise<UnifiedComputeEngine> {
  const engine = UnifiedComputeEngine.getInstance();
  await engine.initialize();
  return engine;
}

/**
 * Quick initialization check for GPU compute capabilities
 */
export async function initializeGPUCompute(): Promise<{
  supported: boolean;
  device: string;
  modules: {
    distance: boolean;
    curve: boolean;
    intersection: boolean;
    spatial: boolean;
  };
}> {
  try {
    const engine = await getUnifiedComputeEngine();
    const supported = await engine.isGPUSupported();
    const deviceInfo = await engine.getDeviceInfo();
    
    const [distanceCompute, curveCompute, intersectionCompute, spatialCompute] = 
      await Promise.all([
        getDistanceCompute(),
        getCurveCompute(),
        getIntersectionCompute(),
        getSpatialCompute()
      ]);

    return {
      supported,
      device: deviceInfo.type,
      modules: {
        distance: distanceCompute.isSupported(),
        curve: curveCompute.isSupported(),
        intersection: intersectionCompute.isSupported(),
        spatial: spatialCompute.isSupported()
      }
    };
  } catch (error) {
    console.error('GPU Compute initialization failed:', error);
    return {
      supported: false,
      device: 'unsupported',
      modules: {
        distance: false,
        curve: false,
        intersection: false,
        spatial: false
      }
    };
  }
}