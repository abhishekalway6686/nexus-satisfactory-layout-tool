// Railway Performance Benchmarking System
// Validates and tracks the 20-50x performance improvements from Rust optimization

import { RailwayNode, RailwaySegment, Point3D } from '../types';
import { detectSnapTargetRustOptimized, benchmarkRailwaySnapping } from '../logic/railway/railwaySnappingRustOptimized';
import { detectSnapTarget } from '../logic/railway/railwaySnapping';

export interface BenchmarkResult {
  testName: string;
  jsTime: number;
  rustTime: number;
  improvement: number;
  nodeCount: number;
  segmentCount: number;
  targetAchieved: boolean;
  timestamp: number;
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    averageImprovement: number;
    targetAchievements: number;
    rustyFallbacks: number;
  };
  results: BenchmarkResult[];
  recommendations: string[];
}

// Performance targets
const PERFORMANCE_TARGETS = {
  MIN_IMPROVEMENT: 5,      // Minimum 5x improvement expected
  TARGET_IMPROVEMENT: 20,  // Target 20x improvement
  OPTIMAL_IMPROVEMENT: 50, // Optimal 50x improvement
  MAX_FRAME_TIME: 16.67,   // 60fps = 16.67ms per frame
  CRITICAL_FRAME_TIME: 33.33, // 30fps = 33.33ms per frame
};

/**
 * Generate synthetic railway data for benchmarking
 */
const generateBenchmarkData = (nodeCount: number, segmentCount: number) => {
  const nodes: Record<string, RailwayNode> = {};
  const segments: Record<string, RailwaySegment> = {};
  
  // Generate nodes in a grid pattern
  const gridSize = Math.ceil(Math.sqrt(nodeCount));
  for (let i = 0; i < nodeCount; i++) {
    const x = (i % gridSize) * 10;
    const y = Math.floor(i / gridSize) * 10;
    const z = Math.random() * 20; // Random height variation
    
    nodes[`node-${i}`] = {
      id: `node-${i}`,
      x,
      y,
      z,
      floor: Math.floor(z / 4),
      isAnchor: Math.random() < 0.1, // 10% anchors
    };
  }
  
  // Generate segments connecting nearby nodes
  const nodeIds = Object.keys(nodes);
  for (let i = 0; i < segmentCount; i++) {
    const startId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let endId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    
    // Ensure different start and end
    while (endId === startId) {
      endId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    }
    
    const startNode = nodes[startId];
    const endNode = nodes[endId];
    
    // Create curve for some segments
    const isCurved = Math.random() < 0.3; // 30% curved
    
    segments[`segment-${i}`] = {
      id: `segment-${i}`,
      type: isCurved ? 'curve' : 'straight',
      startNode: startId,
      endNode: endId,
      startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
      endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
      length: Math.sqrt(
        Math.pow(endNode.x - startNode.x, 2) +
        Math.pow(endNode.y - startNode.y, 2) +
        Math.pow(endNode.z - startNode.z, 2)
      ),
      controlPoints: isCurved ? [{
        x: (startNode.x + endNode.x) / 2 + (Math.random() - 0.5) * 10,
        y: (startNode.y + endNode.y) / 2 + (Math.random() - 0.5) * 10,
        z: (startNode.z + endNode.z) / 2 + (Math.random() - 0.5) * 5,
      }] : undefined,
    };
  }
  
  return { nodes, segments };
};

/**
 * Run a single performance benchmark test
 */
export const runBenchmarkTest = async (
  testName: string,
  nodeCount: number,
  segmentCount: number,
  iterations: number = 10
): Promise<BenchmarkResult> => {
  console.log(`[Benchmark] Running ${testName}: ${nodeCount} nodes, ${segmentCount} segments`);
  
  const { nodes, segments } = generateBenchmarkData(nodeCount, segmentCount);
  const testPoint: Point3D = { x: 50, y: 50, z: 10 };
  
  // Measure JavaScript performance
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await detectSnapTarget(testPoint, nodes, segments);
  }
  const jsTime = (performance.now() - jsStart) / iterations;
  
  // Measure Rust performance
  const rustStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await detectSnapTargetRustOptimized(testPoint, nodes, segments);
  }
  const rustTime = (performance.now() - rustStart) / iterations;
  
  const improvement = jsTime / rustTime;
  const targetAchieved = improvement >= PERFORMANCE_TARGETS.MIN_IMPROVEMENT;
  
  const result: BenchmarkResult = {
    testName,
    jsTime,
    rustTime,
    improvement,
    nodeCount,
    segmentCount,
    targetAchieved,
    timestamp: Date.now(),
  };
  
  console.log(`[Benchmark] ${testName}: ${improvement.toFixed(1)}x improvement (${jsTime.toFixed(2)}ms → ${rustTime.toFixed(2)}ms)`);
  
  return result;
};

/**
 * Run comprehensive performance benchmark suite
 */
export const runComprehensiveBenchmark = async (): Promise<PerformanceReport> => {
  console.log('[Benchmark] Starting comprehensive railway performance benchmark...');
  
  const results: BenchmarkResult[] = [];
  
  // Test cases covering different scenarios
  const testCases = [
    { name: 'Small Layout', nodes: 50, segments: 25 },
    { name: 'Medium Layout', nodes: 200, segments: 100 },
    { name: 'Large Layout', nodes: 500, segments: 250 },
    { name: 'Very Large Layout', nodes: 1000, segments: 500 },
    { name: 'Extreme Layout', nodes: 2000, segments: 1000 },
    { name: 'Node Heavy', nodes: 1500, segments: 200 },
    { name: 'Segment Heavy', nodes: 200, segments: 800 },
  ];
  
  // Run each test case
  for (const testCase of testCases) {
    try {
      const result = await runBenchmarkTest(
        testCase.name,
        testCase.nodes,
        testCase.segments,
        5 // Fewer iterations for large datasets
      );
      results.push(result);
    } catch (error) {
      console.error(`[Benchmark] Failed ${testCase.name}:`, error);
      results.push({
        testName: testCase.name,
        jsTime: -1,
        rustTime: -1,
        improvement: 0,
        nodeCount: testCase.nodes,
        segmentCount: testCase.segments,
        targetAchieved: false,
        timestamp: Date.now(),
      });
    }
  }
  
  // Calculate summary statistics
  const validResults = results.filter(r => r.improvement > 0);
  const averageImprovement = validResults.length > 0 
    ? validResults.reduce((sum, r) => sum + r.improvement, 0) / validResults.length
    : 0;
  const targetAchievements = validResults.filter(r => r.targetAchieved).length;
  const rustyFallbacks = results.length - validResults.length;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (averageImprovement < PERFORMANCE_TARGETS.MIN_IMPROVEMENT) {
    recommendations.push('⚠️ Performance improvement below minimum target. Check Rust command implementation.');
  }
  
  if (averageImprovement >= PERFORMANCE_TARGETS.OPTIMAL_IMPROVEMENT) {
    recommendations.push('🚀 Optimal performance achieved! Rust optimization is highly effective.');
  } else if (averageImprovement >= PERFORMANCE_TARGETS.TARGET_IMPROVEMENT) {
    recommendations.push('✅ Target performance achieved. Consider enabling for all users.');
  }
  
  if (rustyFallbacks > 0) {
    recommendations.push(`⚠️ ${rustyFallbacks} tests failed to use Rust optimization. Check error handling.`);
  }
  
  // Check frame rate implications
  const largeLayoutResult = validResults.find(r => r.testName === 'Large Layout');
  if (largeLayoutResult) {
    if (largeLayoutResult.rustTime > PERFORMANCE_TARGETS.CRITICAL_FRAME_TIME) {
      recommendations.push('🐌 Large layout performance may impact 30fps. Consider spatial indexing.');
    } else if (largeLayoutResult.rustTime < PERFORMANCE_TARGETS.MAX_FRAME_TIME) {
      recommendations.push('⚡ Large layout performance supports 60fps drawing!');
    }
  }
  
  const report: PerformanceReport = {
    summary: {
      totalTests: results.length,
      averageImprovement,
      targetAchievements,
      rustyFallbacks,
    },
    results,
    recommendations,
  };
  
  console.log('[Benchmark] Comprehensive benchmark complete:', report.summary);
  
  return report;
};

/**
 * Real-time performance monitoring during actual use
 */
export class RailwayPerformanceMonitor {
  private measurements: Array<{ timestamp: number; time: number; entities: number }> = [];
  private maxMeasurements = 100;
  
  recordMeasurement(time: number, nodeCount: number, segmentCount: number) {
    this.measurements.push({
      timestamp: Date.now(),
      time,
      entities: nodeCount + segmentCount,
    });
    
    // Keep only recent measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements = this.measurements.slice(-this.maxMeasurements);
    }
  }
  
  getPerformanceStats() {
    if (this.measurements.length === 0) return null;
    
    const recent = this.measurements.slice(-10); // Last 10 measurements
    const avgTime = recent.reduce((sum, m) => sum + m.time, 0) / recent.length;
    const avgEntities = recent.reduce((sum, m) => sum + m.entities, 0) / recent.length;
    const maxTime = Math.max(...recent.map(m => m.time));
    
    const frameRateImpact = maxTime > PERFORMANCE_TARGETS.MAX_FRAME_TIME;
    
    return {
      averageTime: avgTime,
      maxTime,
      averageEntities: avgEntities,
      measurements: recent.length,
      frameRateImpact,
      recommendation: frameRateImpact 
        ? 'Consider reducing detail level or implementing LOD'
        : 'Performance is optimal for real-time drawing',
    };
  }
  
  clear() {
    this.measurements = [];
  }
}

// Global performance monitor instance
export const railwayPerformanceMonitor = new RailwayPerformanceMonitor();

/**
 * Integration test to validate correctness of optimizations
 */
export const runCorrectnessTest = async (
  iterations: number = 20
): Promise<{ passed: boolean; errors: string[] }> => {
  console.log('[Correctness Test] Validating Rust optimization correctness...');
  
  const errors: string[] = [];
  let passed = true;
  
  for (let i = 0; i < iterations; i++) {
    try {
      const { nodes, segments } = generateBenchmarkData(100, 50);
      const testPoint: Point3D = { 
        x: Math.random() * 100, 
        y: Math.random() * 100, 
        z: Math.random() * 20 
      };
      
      // Get results from both implementations
      const jsResult = await detectSnapTarget(testPoint, nodes, segments);
      const rustResult = await detectSnapTargetRustOptimized(testPoint, nodes, segments);
      
      // Compare key properties
      if (jsResult.shouldSnap !== rustResult.shouldSnap) {
        errors.push(`Iteration ${i}: shouldSnap mismatch (JS: ${jsResult.shouldSnap}, Rust: ${rustResult.shouldSnap})`);
        passed = false;
      }
      
      if (jsResult.shouldSnap && rustResult.shouldSnap) {
        const jsTarget = jsResult.snapTarget!;
        const rustTarget = rustResult.snapTarget!;
        
        if (jsTarget.type !== rustTarget.type) {
          errors.push(`Iteration ${i}: snap type mismatch (JS: ${jsTarget.type}, Rust: ${rustTarget.type})`);
          passed = false;
        }
        
        if (jsTarget.targetId !== rustTarget.targetId) {
          errors.push(`Iteration ${i}: target ID mismatch (JS: ${jsTarget.targetId}, Rust: ${rustTarget.targetId})`);
          passed = false;
        }
      }
    } catch (error) {
      errors.push(`Iteration ${i}: Exception - ${error}`);
      passed = false;
    }
  }
  
  console.log(`[Correctness Test] ${passed ? 'PASSED' : 'FAILED'} (${errors.length} errors)`);
  
  return { passed, errors };
};

/**
 * Quick performance validation for CI/CD
 */
export const runQuickValidation = async (): Promise<boolean> => {
  console.log('[Quick Validation] Running performance validation...');
  
  try {
    const result = await runBenchmarkTest('Quick Validation', 200, 100, 3);
    const passed = result.improvement >= PERFORMANCE_TARGETS.MIN_IMPROVEMENT;
    
    console.log(`[Quick Validation] ${passed ? 'PASSED' : 'FAILED'} (${result.improvement.toFixed(1)}x improvement)`);
    
    return passed;
  } catch (error) {
    console.error('[Quick Validation] FAILED with exception:', error);
    return false;
  }
};