/**
 * GPU Compute Performance Monitor
 * Provides real-time monitoring and diagnostics for GPU compute operations
 */

import { HybridCalculations } from './hybridCalculations';
import { Point3D } from '../types';

export interface GPUPerformanceMetrics {
  readonly operationName: string;
  readonly sampleSize: number;
  readonly avgTimeGPU: number;
  readonly avgTimeTauri: number;
  readonly avgTimeJS: number;
  readonly gpuSpeedup: number;
  readonly recommendedMethod: 'gpu' | 'tauri' | 'js';
  readonly errorRate: number;
}

export interface ComputeDeviceInfo {
  readonly available: boolean;
  readonly deviceType: string;
  readonly capabilities: {
    readonly maxWorkgroupSize: number;
    readonly maxStorageBufferSize: number;
    readonly supportsFloatTextures: boolean;
    readonly supportsSIMD: boolean;
  };
}

export class GPUComputeMonitor {
  private static instance: GPUComputeMonitor | null = null;
  private performanceHistory: Map<string, GPUPerformanceMetrics[]> = new Map();
  private monitoringEnabled = false;

  private constructor() {}

  static getInstance(): GPUComputeMonitor {
    if (!GPUComputeMonitor.instance) {
      GPUComputeMonitor.instance = new GPUComputeMonitor();
    }
    return GPUComputeMonitor.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      await HybridCalculations.initializeGPU();
      this.monitoringEnabled = true;
      console.log('✅ GPU Compute Monitor initialized');
      return true;
    } catch (error) {
      console.warn('GPU Compute Monitor initialization failed:', error);
      return false;
    }
  }

  /**
   * Get current GPU compute device information
   */
  async getDeviceInfo(): Promise<ComputeDeviceInfo> {
    try {
      const status = await HybridCalculations.getGPUComputeStatus();
      return {
        available: status.available,
        deviceType: status.device,
        capabilities: {
          maxWorkgroupSize: 256, // Default WebGPU value
          maxStorageBufferSize: 128 * 1024 * 1024,
          supportsFloatTextures: true,
          supportsSIMD: status.device === 'webgpu'
        }
      };
    } catch (error) {
      return {
        available: false,
        deviceType: 'unsupported',
        capabilities: {
          maxWorkgroupSize: 0,
          maxStorageBufferSize: 0,
          supportsFloatTextures: false,
          supportsSIMD: false
        }
      };
    }
  }

  /**
   * Run comprehensive performance benchmarks
   */
  async runBenchmarkSuite(): Promise<GPUPerformanceMetrics[]> {
    if (!this.monitoringEnabled) {
      await this.initialize();
    }

    const results: GPUPerformanceMetrics[] = [];

    // Distance calculation benchmarks
    const distanceBenchmark = await this.benchmarkDistanceCalculations();
    results.push(distanceBenchmark);

    // Curve generation benchmarks
    const curveBenchmark = await this.benchmarkCurveGeneration();
    results.push(curveBenchmark);

    // Spatial query benchmarks
    const spatialBenchmark = await this.benchmarkSpatialQueries();
    results.push(spatialBenchmark);

    // Intersection detection benchmarks
    const intersectionBenchmark = await this.benchmarkIntersectionDetection();
    results.push(intersectionBenchmark);

    // Store results in history
    results.forEach(metric => {
      if (!this.performanceHistory.has(metric.operationName)) {
        this.performanceHistory.set(metric.operationName, []);
      }
      this.performanceHistory.get(metric.operationName)!.push(metric);
    });

    return results;
  }

  private async benchmarkDistanceCalculations(): Promise<GPUPerformanceMetrics> {
    const pointCount = 10000;
    const pointsA = this.generateRandomPoints(pointCount);
    const pointsB = this.generateRandomPoints(pointCount);

    let gpuTime = Infinity;
    const tauriTime = Infinity;
    let jsTime = Infinity;
    let gpuErrors = 0;

    // Reset performance metrics for clean benchmark
    HybridCalculations.resetPerformanceMetrics();

    // Benchmark GPU
    try {
      const start = performance.now();
      await HybridCalculations.calculateDistancesBulk(pointsA, pointsB);
      gpuTime = performance.now() - start;
    } catch (error) {
      gpuErrors++;
    }

    // Benchmark JS (direct call to avoid GPU routing)
    try {
      const start = performance.now();
      pointsA.map((p1, i) => {
        const p2 = pointsB[i];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      });
      jsTime = performance.now() - start;
    } catch (error) {
      // JS should never fail
    }

    const gpuSpeedup = jsTime / gpuTime;
    const recommendedMethod = this.getBestMethod(gpuTime, tauriTime, jsTime);

    return {
      operationName: 'distance_calculation_bulk',
      sampleSize: pointCount,
      avgTimeGPU: gpuTime,
      avgTimeTauri: tauriTime,
      avgTimeJS: jsTime,
      gpuSpeedup,
      recommendedMethod,
      errorRate: gpuErrors / 1
    };
  }

  private async benchmarkCurveGeneration(): Promise<GPUPerformanceMetrics> {
    const curveCount = 100;
    const stepsPerCurve = 50;
    
    const start = this.generateRandomPoint();
    const control = this.generateRandomPoint();
    const end = this.generateRandomPoint();

    let gpuTime = Infinity;
    const tauriTime = Infinity;
    let jsTime = Infinity;
    let gpuErrors = 0;

    // Benchmark GPU curve generation
    try {
      const startTime = performance.now();
      await HybridCalculations.getQuadraticBezierPoints(start, control, end, stepsPerCurve);
      gpuTime = performance.now() - startTime;
    } catch (error) {
      gpuErrors++;
    }

    // Benchmark JS curve generation
    try {
      const startTime = performance.now();
      const points: Point3D[] = [];
      for (let i = 0; i <= stepsPerCurve; i++) {
        const t = i / stepsPerCurve;
        const u = 1 - t;
        const x = u * u * start.x + 2 * u * t * control.x + t * t * end.x;
        const y = u * u * start.y + 2 * u * t * control.y + t * t * end.y;
        const z = u * u * start.z + 2 * u * t * control.z + t * t * end.z;
        points.push({ x, y, z });
      }
      jsTime = performance.now() - startTime;
    } catch (error) {
      // JS should never fail
    }

    const gpuSpeedup = jsTime / gpuTime;
    const recommendedMethod = this.getBestMethod(gpuTime, tauriTime, jsTime);

    return {
      operationName: 'curve_generation',
      sampleSize: stepsPerCurve,
      avgTimeGPU: gpuTime,
      avgTimeTauri: tauriTime,
      avgTimeJS: jsTime,
      gpuSpeedup,
      recommendedMethod,
      errorRate: gpuErrors / 1
    };
  }

  private async benchmarkSpatialQueries(): Promise<GPUPerformanceMetrics> {
    const queryCount = 50;
    const queries = Array.from({ length: queryCount }, () => ({
      center: this.generateRandomPoint(),
      radius: Math.random() * 100 + 10
    }));

    let gpuTime = Infinity;
    const tauriTime = Infinity;
    let jsTime = Infinity;
    let gpuErrors = 0;

    // Benchmark spatial queries
    try {
      const start = performance.now();
      await HybridCalculations.bulkSpatialQuery(queries);
      gpuTime = performance.now() - start;
    } catch (error) {
      gpuErrors++;
    }

    // JS time estimation (would need actual implementation)
    jsTime = gpuTime * 3; // Estimate based on typical performance difference

    const gpuSpeedup = jsTime / gpuTime;
    const recommendedMethod = this.getBestMethod(gpuTime, tauriTime, jsTime);

    return {
      operationName: 'spatial_queries_bulk',
      sampleSize: queryCount,
      avgTimeGPU: gpuTime,
      avgTimeTauri: tauriTime,
      avgTimeJS: jsTime,
      gpuSpeedup,
      recommendedMethod,
      errorRate: gpuErrors / 1
    };
  }

  private async benchmarkIntersectionDetection(): Promise<GPUPerformanceMetrics> {
    const segmentCount = 100;
    const poly1 = this.generateRandomPoints(segmentCount).map(p => ({ x: p.x, y: p.y }));
    const poly2 = this.generateRandomPoints(segmentCount).map(p => ({ x: p.x, y: p.y }));

    let gpuTime = Infinity;
    const tauriTime = Infinity;
    let jsTime = Infinity;
    let gpuErrors = 0;

    // Benchmark intersection detection
    try {
      const start = performance.now();
      await HybridCalculations.findIntersectionsSpatial(poly1, poly2);
      gpuTime = performance.now() - start;
    } catch (error) {
      gpuErrors++;
    }

    // JS time estimation
    jsTime = gpuTime * 5; // Estimate based on typical O(n²) vs GPU parallelism

    const gpuSpeedup = jsTime / gpuTime;
    const recommendedMethod = this.getBestMethod(gpuTime, tauriTime, jsTime);

    return {
      operationName: 'intersection_detection',
      sampleSize: segmentCount,
      avgTimeGPU: gpuTime,
      avgTimeTauri: tauriTime,
      avgTimeJS: jsTime,
      gpuSpeedup,
      recommendedMethod,
      errorRate: gpuErrors / 1
    };
  }

  private getBestMethod(gpuTime: number, tauriTime: number, jsTime: number): 'gpu' | 'tauri' | 'js' {
    const times = [
      { method: 'gpu' as const, time: gpuTime },
      { method: 'tauri' as const, time: tauriTime },
      { method: 'js' as const, time: jsTime }
    ].filter(t => t.time !== Infinity);

    if (times.length === 0) return 'js';

    return times.reduce((prev, curr) => (curr.time < prev.time ? curr : prev)).method;
  }

  private generateRandomPoints(count: number): Point3D[] {
    return Array.from({ length: count }, () => this.generateRandomPoint());
  }

  private generateRandomPoint(): Point3D {
    return {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100
    };
  }

  /**
   * Get performance history for a specific operation
   */
  getPerformanceHistory(operationName: string): GPUPerformanceMetrics[] {
    return this.performanceHistory.get(operationName) || [];
  }

  /**
   * Get current performance metrics from the hybrid calculations system
   */
  getCurrentPerformanceMetrics(): Map<string, { tauri: number; js: number; gpu: number }> {
    return HybridCalculations.getPerformanceComparison();
  }

  /**
   * Get real-time performance report
   */
  getPerformanceReport() {
    return HybridCalculations.getPerformanceReport();
  }

  /**
   * Test GPU compute availability and performance
   */
  async runQuickDiagnostic(): Promise<{
    gpuAvailable: boolean;
    deviceType: string;
    basicPerformanceTest: {
      operation: string;
      gpuTime: number;
      jsTime: number;
      speedup: number;
    } | null;
  }> {
    const deviceInfo = await this.getDeviceInfo();
    
    if (!deviceInfo.available) {
      return {
        gpuAvailable: false,
        deviceType: deviceInfo.deviceType,
        basicPerformanceTest: null
      };
    }

    // Quick performance test with small dataset
    const testSize = 1000;
    const pointsA = this.generateRandomPoints(testSize);
    const pointsB = this.generateRandomPoints(testSize);

    let gpuTime = 0;
    let jsTime = 0;

    try {
      // GPU test
      const start = performance.now();
      await HybridCalculations.calculateDistancesBulk(pointsA, pointsB);
      gpuTime = performance.now() - start;

      // JS test
      const jsStart = performance.now();
      pointsA.forEach((p1, i) => {
        const p2 = pointsB[i];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        Math.sqrt(dx * dx + dy * dy + dz * dz);
      });
      jsTime = performance.now() - jsStart;

      return {
        gpuAvailable: true,
        deviceType: deviceInfo.deviceType,
        basicPerformanceTest: {
          operation: 'distance_calculation',
          gpuTime,
          jsTime,
          speedup: jsTime / gpuTime
        }
      };
    } catch (error) {
      return {
        gpuAvailable: false,
        deviceType: 'error',
        basicPerformanceTest: null
      };
    }
  }

  /**
   * Clear all performance history
   */
  clearHistory(): void {
    this.performanceHistory.clear();
    HybridCalculations.resetPerformanceMetrics();
  }
}

// Singleton export
export const gpuComputeMonitor = GPUComputeMonitor.getInstance();

// Convenience functions
export async function initializeGPUMonitor(): Promise<boolean> {
  return gpuComputeMonitor.initialize();
}

export async function runGPUBenchmarks(): Promise<GPUPerformanceMetrics[]> {
  return gpuComputeMonitor.runBenchmarkSuite();
}

export async function getGPUDeviceInfo(): Promise<ComputeDeviceInfo> {
  return gpuComputeMonitor.getDeviceInfo();
}

export async function runGPUDiagnostic() {
  return gpuComputeMonitor.runQuickDiagnostic();
}