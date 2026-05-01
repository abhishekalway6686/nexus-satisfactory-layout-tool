/**
 * Performance Benchmarks for Rust vs TypeScript Implementations
 * 
 * This comprehensive benchmark suite compares the performance of Rust-optimized
 * functions against their TypeScript counterparts across different dataset sizes
 * and complexity scenarios.
 */

import { Point3D, RailwayNode, RailwaySegment } from '../../types';
import * as TauriCommands from '../../tauri/commands';
import * as JSDistanceCalculations from '../../utils/distanceCalculations';
import { HybridCalculations } from '../../utils/hybridCalculations';
import { findPolylineIntersections } from '../../logic/common/intersectionLogic';
import { isTauriEnvironment } from '../../tauri/environment';

// Test data generators
export class TestDataGenerator {
  /**
   * Generate test points in a grid pattern
   */
  static generateGridPoints(size: number, spacing: number = 10): Point3D[] {
    const points: Point3D[] = [];
    const gridSize = Math.ceil(Math.sqrt(size));
    
    for (let i = 0; i < size; i++) {
      const x = (i % gridSize) * spacing;
      const y = Math.floor(i / gridSize) * spacing;
      const z = Math.random() * 20; // Random floor levels
      
      points.push({ x, y, z });
    }
    
    return points;
  }

  /**
   * Generate random scattered points
   */
  static generateRandomPoints(count: number, bounds: number = 1000): Point3D[] {
    return Array.from({ length: count }, () => ({
      x: Math.random() * bounds,
      y: Math.random() * bounds,
      z: Math.random() * 20
    }));
  }

  /**
   * Generate complex polyline (for intersection testing)
   */
  static generatePolyline(points: number, curviness: number = 0.3): { x: number; y: number }[] {
    const polyline: { x: number; y: number }[] = [];
    
    for (let i = 0; i < points; i++) {
      const baseX = i * 10;
      const baseY = 0;
      
      // Add some curviness
      const curveOffset = Math.sin(i * curviness) * 20;
      
      polyline.push({
        x: baseX,
        y: baseY + curveOffset
      });
    }
    
    return polyline;
  }

  /**
   * Generate intersecting polylines for complex intersection tests
   */
  static generateIntersectingPolylines(complexity: 'simple' | 'medium' | 'complex'): {
    poly1: { x: number; y: number }[];
    poly2: { x: number; y: number }[];
  } {
    const pointCounts = {
      simple: { p1: 5, p2: 5 },
      medium: { p1: 25, p2: 25 },
      complex: { p1: 100, p2: 100 }
    };
    
    const config = pointCounts[complexity];
    
    return {
      poly1: this.generatePolyline(config.p1, 0.2),
      poly2: this.generatePolyline(config.p2, 0.4).map(p => ({ x: p.y, y: p.x })) // Rotated
    };
  }

  /**
   * Generate railway nodes for snapping tests
   */
  static generateRailwayNodes(count: number): Record<string, RailwayNode> {
    const nodes: Record<string, RailwayNode> = {};
    const points = this.generateGridPoints(count);
    
    points.forEach((point, index) => {
      nodes[`node_${index}`] = {
        id: `node_${index}`,
        x: point.x,
        y: point.y,
        z: point.z,
        connectedSegments: []
      };
    });
    
    return nodes;
  }

  /**
   * Generate railway segments connecting nodes
   */
  static generateRailwaySegments(nodes: Record<string, RailwayNode>, complexity: number = 0.5): Record<string, RailwaySegment> {
    const segments: Record<string, RailwaySegment> = {};
    const nodeIds = Object.keys(nodes);
    const segmentCount = Math.floor(nodeIds.length * complexity);
    
    for (let i = 0; i < segmentCount; i++) {
      const startIdx = i % nodeIds.length;
      const endIdx = (i + 1) % nodeIds.length;
      
      const segmentId = `segment_${i}`;
      segments[segmentId] = {
        id: segmentId,
        startNode: nodeIds[startIdx],
        endNode: nodeIds[endIdx],
        type: Math.random() > 0.5 ? 'curve' : 'straight',
        points: [nodes[nodeIds[startIdx]], nodes[nodeIds[endIdx]]],
        controlPoints: Math.random() > 0.5 ? [
          {
            x: (nodes[nodeIds[startIdx]].x + nodes[nodeIds[endIdx]].x) / 2 + (Math.random() - 0.5) * 20,
            y: (nodes[nodeIds[startIdx]].y + nodes[nodeIds[endIdx]].y) / 2 + (Math.random() - 0.5) * 20,
            z: (nodes[nodeIds[startIdx]].z + nodes[nodeIds[endIdx]].z) / 2
          }
        ] : undefined
      };
    }
    
    return segments;
  }
}

// Benchmark result interfaces
export interface BenchmarkResult {
  operation: string;
  datasetSize: 'small' | 'medium' | 'large' | 'xlarge';
  iterations: number;
  
  // Performance metrics
  rustAvgMs: number;
  jsAvgMs: number;
  rustTotalMs: number;
  jsTotalMs: number;
  
  // Comparison metrics
  speedImprovement: number; // How many times faster Rust is
  rustAvailable: boolean;
  
  // Additional metrics
  memoryUsage?: number;
  cacheHitRate?: number;
  
  // Error tracking
  rustErrors: number;
  jsErrors: number;
  resultsMatch: boolean;
  maxDifference?: number;
}

export interface ComprehensiveBenchmarkReport {
  timestamp: Date;
  environment: {
    rustAvailable: boolean;
    platform: string;
    userAgent: string;
  };
  
  results: BenchmarkResult[];
  summary: {
    avgSpeedImprovement: number;
    totalOperationsTested: number;
    reliabilityScore: number;
    recommendedThresholds: Record<string, number>;
  };
}

// Performance benchmark class
export class PerformanceBenchmarks {
  private results: BenchmarkResult[] = [];
  
  /**
   * Run comprehensive benchmark suite
   */
  async runComprehensiveBenchmarks(iterations: number = 1000): Promise<ComprehensiveBenchmarkReport> {
    console.log('🚀 Starting comprehensive performance benchmarks...');
    
    const rustAvailable = isTauriEnvironment();
    this.results = [];
    
    // Distance calculation benchmarks
    await this.benchmarkDistanceCalculations(iterations);
    
    // Intersection detection benchmarks
    await this.benchmarkIntersectionDetection(iterations);
    
    // Curve calculation benchmarks
    await this.benchmarkCurveCalculations(iterations);
    
    // Segment length calculation benchmarks
    await this.benchmarkSegmentLengthCalculations(iterations);
    
    // Power network validation benchmarks
    await this.benchmarkPowerNetworkValidation(iterations);
    
    // Spatial query benchmarks
    if (rustAvailable) {
      await this.benchmarkSpatialQueries(iterations);
    }
    
    return this.generateReport();
  }

  /**
   * Benchmark distance calculations
   */
  async benchmarkDistanceCalculations(iterations: number): Promise<void> {
    const datasets = {
      small: TestDataGenerator.generateRandomPoints(10),
      medium: TestDataGenerator.generateRandomPoints(100),
      large: TestDataGenerator.generateRandomPoints(1000),
      xlarge: TestDataGenerator.generateRandomPoints(10000)
    };

    for (const [size, points] of Object.entries(datasets)) {
      // Single distance calculations
      await this.benchmarkOperation(
        'distance3D_single',
        size as any,
        iterations,
        () => JSDistanceCalculations.distance3D(points[0], points[1]),
        isTauriEnvironment() ? () => TauriCommands.calculateDistance3D(points[0], points[1]) : null,
        (a, b) => Math.abs(a - b) < 0.001
      );

      // Bulk distance calculations
      if (points.length >= 100) {
        const pointsA = points.slice(0, Math.floor(points.length / 2));
        const pointsB = points.slice(Math.floor(points.length / 2));
        
        await this.benchmarkOperation(
          'distance3D_bulk',
          size as any,
          Math.min(100, iterations), // Fewer iterations for bulk operations
          () => pointsA.map((p1, i) => JSDistanceCalculations.distance3D(p1, pointsB[i] || pointsB[0])),
          isTauriEnvironment() ? () => TauriCommands.calculateDistancesBulk(pointsA, pointsB) : null,
          (a, b) => Array.isArray(a) && Array.isArray(b) && 
            a.length === b.length && 
            a.every((val, idx) => Math.abs(val - b[idx]) < 0.001)
        );
      }
    }
  }

  /**
   * Benchmark intersection detection
   */
  async benchmarkIntersectionDetection(iterations: number): Promise<void> {
    const testCases = {
      small: TestDataGenerator.generateIntersectingPolylines('simple'),
      medium: TestDataGenerator.generateIntersectingPolylines('medium'),
      large: TestDataGenerator.generateIntersectingPolylines('complex')
    };

    for (const [size, { poly1, poly2 }] of Object.entries(testCases)) {
      await this.benchmarkOperation(
        'intersection_detection',
        size as any,
        Math.min(100, iterations), // Intersection detection is expensive
        () => findPolylineIntersections(poly1, poly2),
        isTauriEnvironment() ? () => TauriCommands.findIntersectionsSpatial(poly1, poly2, true) : null,
        (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
      );
    }
  }

  /**
   * Benchmark curve calculations
   */
  async benchmarkCurveCalculations(iterations: number): Promise<void> {
    const testPoints = TestDataGenerator.generateRandomPoints(1000);
    
    for (let i = 0; i < Math.min(testPoints.length - 2, 100); i += 10) {
      const p1 = testPoints[i];
      const p2 = testPoints[i + 1];
      const p3 = testPoints[i + 2];

      // shouldCreateTurn benchmark
      await this.benchmarkOperation(
        'shouldCreateTurn',
        'small',
        iterations,
        async () => {
          // JS implementation
          const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
          const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
          const angle1 = Math.atan2(v1.y, v1.x);
          const angle2 = Math.atan2(v2.y, v2.x);
          let diff = angle2 - angle1;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          return Math.abs(diff) > 0.873;
        },
        isTauriEnvironment() ? () => TauriCommands.shouldCreateTurnExact(p1, p2, p3) : null,
        (a, b) => a === b
      );

      // Bezier point generation
      await this.benchmarkOperation(
        'bezier_points',
        'medium',
        Math.min(100, iterations),
        () => HybridCalculations.getQuadraticBezierPoints(p1, p2, p3, 20),
        isTauriEnvironment() ? () => TauriCommands.getQuadraticBezierPoints(p1, p2, p3, 20) : null,
        (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
      );
    }
  }

  /**
   * Benchmark segment length calculations
   */
  async benchmarkSegmentLengthCalculations(iterations: number): Promise<void> {
    const datasets = {
      small: TestDataGenerator.generateRandomPoints(10),
      medium: TestDataGenerator.generateRandomPoints(50),
      large: TestDataGenerator.generateRandomPoints(200)
    };

    for (const [size, points] of Object.entries(datasets)) {
      await this.benchmarkOperation(
        'segment_lengths',
        size as any,
        Math.min(200, iterations),
        () => {
          const lengths = [];
          for (let i = 0; i < points.length - 1; i++) {
            lengths.push(JSDistanceCalculations.distance3D(points[i], points[i + 1]));
          }
          return lengths;
        },
        isTauriEnvironment() ? () => TauriCommands.calculateSegmentLengthsSimd(points) : null,
        (a, b) => Array.isArray(a) && Array.isArray(b) && 
          a.length === b.length && 
          a.every((val, idx) => Math.abs(val - b[idx]) < 0.001)
      );
    }
  }

  /**
   * Benchmark power network validation
   */
  async benchmarkPowerNetworkValidation(iterations: number): Promise<void> {
    const nodes = TestDataGenerator.generateRandomPoints(100);
    
    await this.benchmarkOperation(
      'power_validation',
      'medium',
      Math.min(100, iterations),
      () => {
        // JS power validation simulation
        return nodes.map((node, i) => {
          const target = nodes[(i + 1) % nodes.length];
          const distance = JSDistanceCalculations.distance3D(node, target);
          return {
            isValid: distance < 50,
            canConnect: distance < 100,
            distanceToTarget: distance
          };
        });
      },
      isTauriEnvironment() ? async () => {
        const results = [];
        for (let i = 0; i < Math.min(nodes.length, 20); i++) {
          const result = await TauriCommands.validatePowerConnection(
            `node_${i}`, 
            `node_${(i + 1) % nodes.length}`, 
            'power_pole_mk1'
          );
          results.push(result);
        }
        return results;
      } : null,
      (a, b) => Array.isArray(a) && Array.isArray(b) && a.length > 0 && b.length > 0
    );
  }

  /**
   * Benchmark spatial queries
   */
  async benchmarkSpatialQueries(iterations: number): Promise<void> {
    const testQueries = Array.from({ length: 50 }, (_, i) => ({
      center: { x: i * 20, y: i * 15, z: 0 },
      radius: 25
    }));

    await this.benchmarkOperation(
      'spatial_query_bulk',
      'large',
      Math.min(50, iterations),
      () => {
        // JS spatial query simulation
        return testQueries.map(query => ({
          buildings: [],
          railwayNodes: [],
          queryTime: Math.random() * 10
        }));
      },
      isTauriEnvironment() ? () => TauriCommands.bulkSpatialQueryBuildings(testQueries, {
        exclude_ids: [],
        include_buildings: true,
        include_railway_nodes: true,
        include_conveyor_poles: false,
        include_pipe_supports: false
      }) : null,
      (a, b) => Array.isArray(a) && typeof b === 'object' && b.entities
    );
  }

  /**
   * Generic benchmark operation runner
   */
  private async benchmarkOperation<T>(
    operationName: string,
    datasetSize: 'small' | 'medium' | 'large' | 'xlarge',
    iterations: number,
    jsOperation: () => T | Promise<T>,
    rustOperation: (() => T | Promise<T>) | null,
    resultValidator: (jsResult: T, rustResult: T) => boolean
  ): Promise<void> {
    console.log(`Benchmarking ${operationName} (${datasetSize}, ${iterations} iterations)...`);

    let jsTotal = 0;
    let jsErrors = 0;
    let jsResult: T;

    let rustTotal = 0;
    let rustErrors = 0;
    let rustResult: T;
    let rustAvailable = false;

    // Benchmark JavaScript implementation
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        jsResult = await jsOperation();
        jsTotal += performance.now() - start;
      } catch (error) {
        jsErrors++;
        jsTotal += 50; // Penalty for errors
      }
    }

    // Benchmark Rust implementation if available
    if (rustOperation && isTauriEnvironment()) {
      rustAvailable = true;
      for (let i = 0; i < iterations; i++) {
        try {
          const start = performance.now();
          rustResult = await rustOperation();
          rustTotal += performance.now() - start;
        } catch (error) {
          rustErrors++;
          rustTotal += 100; // Higher penalty for Rust errors (they should be rare)
        }
      }
    } else {
      rustTotal = Number.POSITIVE_INFINITY;
    }

    // Calculate metrics
    const jsAvg = jsTotal / iterations;
    const rustAvg = rustAvailable ? rustTotal / iterations : Number.POSITIVE_INFINITY;
    const speedImprovement = rustAvailable && rustAvg > 0 ? jsAvg / rustAvg : 0;

    // Validate results match
    let resultsMatch = true;
    let maxDifference = 0;

    if (rustAvailable && jsResult! && rustResult!) {
      try {
        resultsMatch = resultValidator(jsResult!, rustResult!);
        
        // Calculate numerical difference if applicable
        if (typeof jsResult === 'number' && typeof rustResult === 'number') {
          maxDifference = Math.abs(jsResult - rustResult);
        }
      } catch (error) {
        resultsMatch = false;
      }
    }

    // Store result
    const benchmarkResult: BenchmarkResult = {
      operation: operationName,
      datasetSize,
      iterations,
      rustAvgMs: rustAvg,
      jsAvgMs: jsAvg,
      rustTotalMs: rustTotal,
      jsTotalMs: jsTotal,
      speedImprovement,
      rustAvailable,
      rustErrors,
      jsErrors,
      resultsMatch,
      maxDifference: maxDifference > 0 ? maxDifference : undefined
    };

    this.results.push(benchmarkResult);

    console.log(`✅ ${operationName}: JS=${jsAvg.toFixed(2)}ms, Rust=${rustAvg.toFixed(2)}ms, ${speedImprovement.toFixed(1)}x faster`);
  }

  /**
   * Generate comprehensive benchmark report
   */
  private generateReport(): ComprehensiveBenchmarkReport {
    const validResults = this.results.filter(r => r.rustAvailable && r.speedImprovement > 0);
    const avgSpeedImprovement = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + r.speedImprovement, 0) / validResults.length 
      : 0;

    const reliabilityScore = this.results.length > 0
      ? this.results.filter(r => r.resultsMatch).length / this.results.length * 100
      : 0;

    // Calculate recommended thresholds based on performance data
    const recommendedThresholds: Record<string, number> = {};
    
    this.results.forEach(result => {
      if (result.speedImprovement >= 2.0) { // 2x improvement
        switch (result.datasetSize) {
          case 'small':
            recommendedThresholds[result.operation + '_small'] = 10;
            break;
          case 'medium':
            recommendedThresholds[result.operation + '_medium'] = 50;
            break;
          case 'large':
            recommendedThresholds[result.operation + '_large'] = 100;
            break;
          case 'xlarge':
            recommendedThresholds[result.operation + '_xlarge'] = 500;
            break;
        }
      }
    });

    return {
      timestamp: new Date(),
      environment: {
        rustAvailable: isTauriEnvironment(),
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'Node.js',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js'
      },
      results: this.results,
      summary: {
        avgSpeedImprovement,
        totalOperationsTested: this.results.length,
        reliabilityScore,
        recommendedThresholds
      }
    };
  }

  /**
   * Export results to CSV format
   */
  exportToCSV(): string {
    const headers = [
      'Operation',
      'Dataset Size',
      'Iterations',
      'JS Avg (ms)',
      'Rust Avg (ms)',
      'Speed Improvement',
      'Results Match',
      'Max Difference',
      'JS Errors',
      'Rust Errors'
    ];

    const rows = this.results.map(result => [
      result.operation,
      result.datasetSize,
      result.iterations.toString(),
      result.jsAvgMs.toFixed(3),
      result.rustAvgMs.toFixed(3),
      result.speedImprovement.toFixed(2),
      result.resultsMatch.toString(),
      result.maxDifference?.toFixed(6) || 'N/A',
      result.jsErrors.toString(),
      result.rustErrors.toString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Get results for specific operation
   */
  getResultsForOperation(operationName: string): BenchmarkResult[] {
    return this.results.filter(r => r.operation === operationName);
  }

  /**
   * Get fastest operations (biggest speed improvements)
   */
  getFastestOperations(limit: number = 10): BenchmarkResult[] {
    return this.results
      .filter(r => r.rustAvailable && r.speedImprovement > 0)
      .sort((a, b) => b.speedImprovement - a.speedImprovement)
      .slice(0, limit);
  }

  /**
   * Get operations that should prefer Rust
   */
  getRecommendedRustOperations(): BenchmarkResult[] {
    return this.results.filter(r => 
      r.rustAvailable && 
      r.speedImprovement >= 2.0 && 
      r.resultsMatch &&
      r.rustErrors === 0
    );
  }
}

// Export main benchmark runner
export const runPerformanceBenchmarks = async (iterations: number = 1000): Promise<ComprehensiveBenchmarkReport> => {
  const benchmarks = new PerformanceBenchmarks();
  return await benchmarks.runComprehensiveBenchmarks(iterations);
};