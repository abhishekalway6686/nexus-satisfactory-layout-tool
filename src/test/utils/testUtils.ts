/**
 * Test Utilities for Performance Benchmarking and Rust Integration
 * 
 * Comprehensive utilities for testing Rust optimization performance,
 * validation, and fallback mechanisms.
 */

import { vi } from 'vitest';
import { Point3D, Building, Railway, RailwayNode, RailwayConnectionPoint } from '../../types';
import type { BenchmarkResult, ComprehensiveBenchmarkReport } from '../benchmarks/performanceBenchmarks';
import type { ValidationResult, ValidationReport } from '../validation/rustIntegrationTests';

// Mock Tauri commands with realistic implementations
export const mockTauriCommands = {
  // Distance calculations
  calculateDistance3D: vi.fn().mockImplementation(async (p1: Point3D, p2: Point3D): Promise<number> => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }),

  calculateDistance3DSquared: vi.fn().mockImplementation(async (p1: Point3D, p2: Point3D): Promise<number> => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return dx * dx + dy * dy + dz * dz;
  }),

  calculateDistance2D: vi.fn().mockImplementation(async (p1: Point3D, p2: Point3D): Promise<number> => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }),

  calculateDistance2DSquared: vi.fn().mockImplementation(async (p1: Point3D, p2: Point3D): Promise<number> => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
  }),

  // Bulk operations
  calculateDistancesBulk: vi.fn().mockImplementation(async (pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> => {
    return pointsA.map((p1, i) => {
      const p2 = pointsB[i] || pointsB[0];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    });
  }),

  calculateDistances3DSquaredBulk: vi.fn().mockImplementation(async (pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> => {
    return pointsA.map((p1, i) => {
      const p2 = pointsB[i] || pointsB[0];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      return dx * dx + dy * dy + dz * dz;
    });
  }),

  calculateDistances2DBulk: vi.fn().mockImplementation(async (pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> => {
    return pointsA.map((p1, i) => {
      const p2 = pointsB[i] || pointsB[0];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    });
  }),

  calculateDistances2DSquaredBulk: vi.fn().mockImplementation(async (pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> => {
    return pointsA.map((p1, i) => {
      const p2 = pointsB[i] || pointsB[0];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return dx * dx + dy * dy;
    });
  }),

  // Curve operations
  shouldCreateTurn: vi.fn().mockImplementation(async (p1: Point3D, p2: Point3D, p3: Point3D): Promise<boolean> => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const angleDiff = Math.abs(diff);
    return angleDiff > 0.873;
  }),

  calculateCurveControlPoint: vi.fn().mockImplementation(async (p1: Point3D, p2: Point3D, p3: Point3D): Promise<Point3D> => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (len1 === 0 || len2 === 0) return p2;
    
    v1.x /= len1;
    v1.y /= len1;
    v2.x /= len2;
    v2.y /= len2;
    
    const avgDirection = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
    const avgLen = Math.sqrt(avgDirection.x * avgDirection.x + avgDirection.y * avgDirection.y);
    if (avgLen > 0.001) {
      avgDirection.x /= avgLen;
      avgDirection.y /= avgLen;
    }
    
    const cross = v1.x * v2.y - v1.y * v2.x;
    const offsetDirection = cross > 0 ? 
      { x: -avgDirection.y, y: avgDirection.x } : 
      { x: avgDirection.y, y: -avgDirection.x };
    
    const minDist = Math.min(len1, len2);
    const offsetDistance = Math.min(minDist * 0.3, 2.5);
    
    return {
      x: p2.x + offsetDirection.x * offsetDistance,
      y: p2.y + offsetDirection.y * offsetDistance,
      z: p2.z,
    };
  })
};

// Mock Store for testing
export interface MockStore {
  buildings: Record<string, Building>;
  railways: Record<string, Railway>;
  nodes: Record<string, RailwayNode>;
}

export const createMockStore = (): MockStore => ({
  buildings: {},
  railways: {},
  nodes: {},
});

// Mock Building factory
export const createMockBuilding = (overrides: Partial<Building> = {}): Building => ({
  id: 'test-building',
  type: 'TRAIN_STATION',
  x: 0,
  y: 0,
  z: 0,
  floor: 0,
  rotation: 0,
  connectionPoints: [],
  railwayPoints: [],
  ...overrides,
});

// Mock Railway factory  
export const createMockRailway = (overrides: Partial<Railway> = {}): Railway => ({
  id: 'test-railway',
  segments: [],
  floor: 0,
  stations: [],
  ...overrides,
});

// Mock RailwayNode factory
export const createMockRailwayNode = (overrides: Partial<RailwayNode> = {}): RailwayNode => ({
  id: 'test-node',
  x: 0,
  y: 0,
  z: 0,
  floor: 0,
  ...overrides,
});

// Performance test utilities
export const createPerformanceTestData = (count: number): {
  pointsA: Point3D[];
  pointsB: Point3D[];
} => {
  const pointsA: Point3D[] = [];
  const pointsB: Point3D[] = [];

  for (let i = 0; i < count; i++) {
    pointsA.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100,
    });
    pointsB.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100,
    });
  }

  return { pointsA, pointsB };
};

// Benchmark comparison utilities
export const compareBenchmarkResults = (
  jsResult: BenchmarkResult,
  rustResult: BenchmarkResult
): {
  improvement: number;
  recommendation: 'js' | 'rust';
  report: string;
} => {
  const improvement = jsResult.avgTime / rustResult.avgTime;
  const recommendation = improvement > 1.2 ? 'rust' : 'js';
  
  const report = `
Performance Comparison:
- JavaScript: ${jsResult.avgTime.toFixed(4)}ms avg
- Rust: ${rustResult.avgTime.toFixed(4)}ms avg
- Improvement: ${improvement.toFixed(2)}x
- Recommendation: Use ${recommendation}
  `.trim();

  return { improvement, recommendation, report };
};

// Validation utilities
export const createValidationTestSuite = () => ({
  validateDistance3D: (expected: number, actual: number, tolerance: number = 0.001): ValidationResult => ({
    passed: Math.abs(expected - actual) <= tolerance,
    expected,
    actual,
    tolerance,
    error: Math.abs(expected - actual) > tolerance ? `Expected ${expected}, got ${actual}` : undefined,
  }),

  validateBulkOperation: <T>(
    expectedResults: T[],
    actualResults: T[],
    compareFn: (a: T, b: T) => boolean = (a, b) => a === b
  ): ValidationReport => {
    const results: ValidationResult[] = [];
    const passed = expectedResults.length === actualResults.length;
    
    if (!passed) {
      return {
        passed: false,
        results: [{
          passed: false,
          expected: expectedResults.length,
          actual: actualResults.length,
          error: 'Array length mismatch',
        }],
        summary: `Expected ${expectedResults.length} results, got ${actualResults.length}`,
      };
    }

    for (let i = 0; i < expectedResults.length; i++) {
      const itemPassed = compareFn(expectedResults[i], actualResults[i]);
      results.push({
        passed: itemPassed,
        expected: expectedResults[i],
        actual: actualResults[i],
        error: itemPassed ? undefined : `Mismatch at index ${i}`,
      });
    }

    const allPassed = results.every(r => r.passed);
    const failedCount = results.filter(r => !r.passed).length;

    return {
      passed: allPassed,
      results,
      summary: allPassed 
        ? `All ${results.length} validations passed`
        : `${failedCount} of ${results.length} validations failed`,
    };
  },
});

// Performance test helper class for tracking timing and cleanup
export class PerformanceTestHelper {
  private timings: Map<string, number[]> = new Map();

  startTimer(name: string): void {
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
  }

  endTimer(name: string): number {
    const timings = this.timings.get(name);
    if (timings) {
      const duration = performance.now();
      timings.push(duration);
      return duration;
    }
    return 0;
  }

  getAverageTime(name: string): number {
    const timings = this.timings.get(name);
    if (!timings || timings.length === 0) return 0;
    return timings.reduce((a, b) => a + b, 0) / timings.length;
  }

  clear(): void {
    this.timings.clear();
  }
}

// Mock network topology factory
export const createMockNetworkTopology = (overrides: Record<string, unknown> = {}) => ({
  nodes: [],
  edges: [],
  stations: [],
  bottlenecks: [],
  health: {
    connectivity: 1.0,
    efficiency: 1.0,
    redundancy: 0.0,
  },
  ...overrides,
});

// Export types for external use
export type { BenchmarkResult, ComprehensiveBenchmarkReport, ValidationResult, ValidationReport };