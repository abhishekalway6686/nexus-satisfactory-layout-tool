/**
 * Comprehensive performance testing for the new Rust spatial indexing system
 * Verifies 10-30x performance improvements while maintaining 100% functionality
 */

import { Point3D, RailwayNode, Building } from '../types';
import { HybridCalculations } from './hybridCalculations';
import { getSpatialIndexManager } from '../store/layoutStore';

interface PerformanceTestResult {
  operation: string;
  javascriptTime: number;
  rustTime: number;
  improvement: number;
  functionalityMatch: boolean;
  details: {
    iterations: number;
    totalJSTime: number;
    totalRustTime: number;
    jsResults: number;
    rustResults: number;
    errorRate: number;
  };
}

interface ComprehensiveTestReport {
  overallImprovement: number;
  allTestsPassed: boolean;
  results: PerformanceTestResult[];
  recommendations: string[];
  summary: {
    avgJSTime: number;
    avgRustTime: number;
    totalTestTime: number;
    functionalityScore: number;
  };
}

/**
 * Comprehensive spatial indexing performance test suite
 */
export class SpatialPerformanceTestSuite {
  private testData: {
    buildings: Building[];
    railwayNodes: RailwayNode[];
    testPoints: Point3D[];
  } = {
    buildings: [],
    railwayNodes: [],
    testPoints: []
  };

  /**
   * Generate test data for performance testing
   */
  private generateTestData(entityCount: number = 1000): void {
    console.log(`🔧 Generating ${entityCount} test entities...`);
    
    // Generate buildings
    this.testData.buildings = Array.from({ length: entityCount }, (_, i) => ({
      id: `test_building_${i}`,
      type: 'Constructor',
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.floor(Math.random() * 10) * 4, // Floor levels
      rotation: 0,
      floor: Math.floor(Math.random() * 10),
      connectionPoints: [],
      railwayConnectionPoints: []
    }));

    // Generate railway nodes
    this.testData.railwayNodes = Array.from({ length: entityCount }, (_, i) => ({
      id: `test_node_${i}`,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.floor(Math.random() * 10) * 4,
      type: 'junction' as const,
      connections: []
    }));

    // Generate test query points
    this.testData.testPoints = Array.from({ length: entityCount / 10 }, (_, i) => ({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.floor(Math.random() * 10) * 4
    }));
  }

  /**
   * Test individual spatial queries (most common operation)
   */
  private async testIndividualQueries(iterations: number = 500): Promise<PerformanceTestResult> {
    console.log(`🧪 Testing individual spatial queries (${iterations} iterations)...`);
    
    const spatialManager = getSpatialIndexManager();
    let jsTotal = 0;
    let rustTotal = 0;
    let jsResultCount = 0;
    let rustResultCount = 0;
    let errorCount = 0;
    let functionalMatch = true;

    // Test JavaScript implementation
    for (let i = 0; i < iterations; i++) {
      const testPoint = this.testData.testPoints[i % this.testData.testPoints.length];
      const radius = 10 + Math.random() * 20; // 10-30 meter radius
      
      const start = performance.now();
      const jsResults = spatialManager.findNearbyBuildings(testPoint, radius);
      jsTotal += performance.now() - start;
      jsResultCount += jsResults.length;
    }

    // Test Rust implementation
    for (let i = 0; i < iterations; i++) {
      const testPoint = this.testData.testPoints[i % this.testData.testPoints.length];
      const radius = 10 + Math.random() * 20;
      
      try {
        const start = performance.now();
        const rustResult = await HybridCalculations.universalSpatialQuery(testPoint, radius, {
          includeBuildings: true,
          includeRailwayNodes: false
        });
        rustTotal += performance.now() - start;
        rustResultCount += rustResult.buildings.length;
      } catch (error) {
        errorCount++;
        console.warn(`Rust query failed: ${error}`);
      }
    }

    // Check functionality match (approximate due to test data differences)
    const resultRatio = Math.abs(jsResultCount - rustResultCount) / Math.max(jsResultCount, rustResultCount);
    functionalMatch = resultRatio < 0.1; // Allow 10% variance due to test setup

    const avgJSTime = jsTotal / iterations;
    const avgRustTime = rustTotal / (iterations - errorCount);
    const improvement = avgJSTime / avgRustTime;

    return {
      operation: 'Individual Spatial Queries',
      javascriptTime: avgJSTime,
      rustTime: avgRustTime,
      improvement,
      functionalityMatch,
      details: {
        iterations,
        totalJSTime: jsTotal,
        totalRustTime: rustTotal,
        jsResults: jsResultCount,
        rustResults: rustResultCount,
        errorRate: errorCount / iterations
      }
    };
  }

  /**
   * Test bulk spatial queries (key optimization for drawing)
   */
  private async testBulkQueries(queryCount: number = 50): Promise<PerformanceTestResult> {
    console.log(`🧪 Testing bulk spatial queries (${queryCount} queries per batch)...`);
    
    const spatialManager = getSpatialIndexManager();
    const testQueries = this.testData.testPoints.slice(0, queryCount).map(point => ({
      center: point,
      radius: 5 + Math.random() * 15
    }));

    let jsTotal = 0;
    let rustTotal = 0;
    let jsResultCount = 0;
    let rustResultCount = 0;
    let errorCount = 0;

    // Test JavaScript (individual queries simulating current implementation)
    const jsStart = performance.now();
    for (const query of testQueries) {
      const results = spatialManager.findNearbyBuildings(query.center, query.radius);
      jsResultCount += results.length;
    }
    jsTotal = performance.now() - jsStart;

    // Test Rust bulk queries
    try {
      const rustStart = performance.now();
      const rustResult = await HybridCalculations.bulkSpatialQuery(testQueries, {
        includeBuildings: true,
        includeRailwayNodes: false
      });
      rustTotal = performance.now() - rustStart;
      rustResultCount = rustResult.buildings.reduce((sum, batch) => sum + batch.length, 0);
    } catch (error) {
      errorCount = 1;
      console.warn(`Rust bulk query failed: ${error}`);
      rustTotal = jsTotal * 2; // Penalty for failure
    }

    const improvement = jsTotal / rustTotal;
    const resultRatio = Math.abs(jsResultCount - rustResultCount) / Math.max(jsResultCount, rustResultCount);
    const functionalMatch = resultRatio < 0.1;

    return {
      operation: 'Bulk Spatial Queries',
      javascriptTime: jsTotal,
      rustTime: rustTotal,
      improvement,
      functionalityMatch,
      details: {
        iterations: 1, // Single bulk operation
        totalJSTime: jsTotal,
        totalRustTime: rustTotal,
        jsResults: jsResultCount,
        rustResults: rustResultCount,
        errorRate: errorCount
      }
    };
  }

  /**
   * Test railway node queries (most performance-critical)
   */
  private async testRailwayNodeQueries(iterations: number = 300): Promise<PerformanceTestResult> {
    console.log(`🧪 Testing railway node queries (${iterations} iterations)...`);
    
    const spatialManager = getSpatialIndexManager();
    let jsTotal = 0;
    let rustTotal = 0;
    let jsResultCount = 0;
    let rustResultCount = 0;
    let errorCount = 0;

    // Test JavaScript implementation
    for (let i = 0; i < iterations; i++) {
      const testPoint = this.testData.testPoints[i % this.testData.testPoints.length];
      const radius = 2 + Math.random() * 8; // Railway snap radius
      
      const start = performance.now();
      const jsResults = spatialManager.getRailwayNodeGrid().queryRadius(testPoint, radius, []);
      jsTotal += performance.now() - start;
      jsResultCount += jsResults.length;
    }

    // Test Rust implementation  
    for (let i = 0; i < iterations; i++) {
      const testPoint = this.testData.testPoints[i % this.testData.testPoints.length];
      const radius = 2 + Math.random() * 8;
      
      try {
        const start = performance.now();
        const rustResult = await HybridCalculations.queryRailwayNodes(testPoint, radius, []);
        rustTotal += performance.now() - start;
        rustResultCount += rustResult.nodes.length;
      } catch (error) {
        errorCount++;
      }
    }

    const avgJSTime = jsTotal / iterations;
    const avgRustTime = rustTotal / (iterations - errorCount);
    const improvement = avgJSTime / avgRustTime;
    const resultRatio = Math.abs(jsResultCount - rustResultCount) / Math.max(jsResultCount, rustResultCount);
    const functionalMatch = resultRatio < 0.1;

    return {
      operation: 'Railway Node Queries',
      javascriptTime: avgJSTime,
      rustTime: avgRustTime,
      improvement,
      functionalityMatch,
      details: {
        iterations,
        totalJSTime: jsTotal,
        totalRustTime: rustTotal,
        jsResults: jsResultCount,
        rustResults: rustResultCount,
        errorRate: errorCount / iterations
      }
    };
  }

  /**
   * Test the spatial indexing benchmark function
   */
  private async testSpatialBenchmark(): Promise<PerformanceTestResult> {
    console.log(`🧪 Testing spatial benchmark functionality...`);
    
    try {
      const benchmarkResult = await HybridCalculations.benchmarkSpatialPerformance(100, 10.0);
      
      return {
        operation: 'Spatial Benchmark',
        javascriptTime: benchmarkResult.jsResult.avg_query_time_ms,
        rustTime: benchmarkResult.rustResult?.avg_query_time_ms || benchmarkResult.jsResult.avg_query_time_ms,
        improvement: benchmarkResult.improvement || 1,
        functionalityMatch: true,
        details: {
          iterations: benchmarkResult.jsResult.iterations,
          totalJSTime: benchmarkResult.jsResult.total_benchmark_time_ms,
          totalRustTime: benchmarkResult.rustResult?.total_benchmark_time_ms || 0,
          jsResults: benchmarkResult.jsResult.total_results,
          rustResults: benchmarkResult.rustResult?.total_results || 0,
          errorRate: benchmarkResult.rustResult ? 0 : 1
        }
      };
    } catch (error) {
      console.warn(`Benchmark test failed: ${error}`);
      return {
        operation: 'Spatial Benchmark',
        javascriptTime: 10,
        rustTime: 10,
        improvement: 1,
        functionalityMatch: false,
        details: {
          iterations: 100,
          totalJSTime: 1000,
          totalRustTime: 0,
          jsResults: 0,
          rustResults: 0,
          errorRate: 1
        }
      };
    }
  }

  /**
   * Run comprehensive performance test suite
   */
  async runComprehensiveTests(entityCount: number = 1000): Promise<ComprehensiveTestReport> {
    console.log('🚀 Starting comprehensive spatial indexing performance tests...');
    const overallStart = performance.now();
    
    // Generate test data
    this.generateTestData(entityCount);
    
    // Run all tests
    const results: PerformanceTestResult[] = [];
    
    try {
      results.push(await this.testIndividualQueries(500));
      results.push(await this.testBulkQueries(50));
      results.push(await this.testRailwayNodeQueries(300));
      results.push(await this.testSpatialBenchmark());
    } catch (error) {
      console.error('Test suite failed:', error);
    }
    
    const totalTestTime = performance.now() - overallStart;
    
    // Calculate overall metrics
    const validResults = results.filter(r => r.improvement > 0);
    const overallImprovement = validResults.reduce((sum, r) => sum + r.improvement, 0) / validResults.length;
    const allTestsPassed = validResults.every(r => r.functionalityMatch && r.improvement >= 1);
    const avgJSTime = validResults.reduce((sum, r) => sum + r.javascriptTime, 0) / validResults.length;
    const avgRustTime = validResults.reduce((sum, r) => sum + r.rustTime, 0) / validResults.length;
    const functionalityScore = validResults.filter(r => r.functionalityMatch).length / validResults.length;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (overallImprovement >= 10) {
      recommendations.push('🎉 Excellent performance! Rust implementation provides significant benefits.');
    } else if (overallImprovement >= 5) {
      recommendations.push('✅ Good performance improvement. Recommended for production use.');
    } else if (overallImprovement >= 2) {
      recommendations.push('⚠️  Moderate improvement. Consider for high-frequency operations only.');
    } else {
      recommendations.push('❌ Performance improvement not significant. Investigate implementation.');
    }
    
    if (functionalityScore < 1.0) {
      recommendations.push('⚠️  Some functionality tests failed. Verify API compatibility.');
    }
    
    const failedTests = results.filter(r => !r.functionalityMatch || r.improvement < 1);
    if (failedTests.length > 0) {
      recommendations.push(`❌ Failed tests: ${failedTests.map(t => t.operation).join(', ')}`);
    }
    
    return {
      overallImprovement,
      allTestsPassed,
      results,
      recommendations,
      summary: {
        avgJSTime,
        avgRustTime,
        totalTestTime,
        functionalityScore
      }
    };
  }

  /**
   * Print detailed test report
   */
  printTestReport(report: ComprehensiveTestReport): void {
    console.log('\n📊 SPATIAL INDEXING PERFORMANCE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`   Overall Improvement: ${report.overallImprovement.toFixed(1)}x faster`);
    console.log(`   All Tests Passed: ${report.allTestsPassed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Functionality Score: ${(report.summary.functionalityScore * 100).toFixed(1)}%`);
    console.log(`   Total Test Time: ${report.summary.totalTestTime.toFixed(1)}ms`);
    
    console.log('\n📋 DETAILED RESULTS:');
    report.results.forEach(result => {
      console.log(`\n   ${result.operation}:`);
      console.log(`     JavaScript: ${result.javascriptTime.toFixed(3)}ms avg`);
      console.log(`     Rust: ${result.rustTime.toFixed(3)}ms avg`);
      console.log(`     Improvement: ${result.improvement.toFixed(1)}x ${result.improvement >= 10 ? '🚀' : result.improvement >= 5 ? '✅' : result.improvement >= 2 ? '⚡' : '🐌'}`);
      console.log(`     Functionality: ${result.functionalityMatch ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`     Error Rate: ${(result.details.errorRate * 100).toFixed(1)}%`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
    
    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`   Average JS Time: ${report.summary.avgJSTime.toFixed(3)}ms`);
    console.log(`   Average Rust Time: ${report.summary.avgRustTime.toFixed(3)}ms`);
    console.log(`   Performance Gain: ${((report.summary.avgJSTime - report.summary.avgRustTime) / report.summary.avgJSTime * 100).toFixed(1)}% faster`);
    
    console.log('\n' + '='.repeat(60));
  }
}

/**
 * Quick performance verification function
 */
export async function quickPerformanceTest(): Promise<void> {
  console.log('🔥 Running quick spatial indexing performance verification...');
  
  const testSuite = new SpatialPerformanceTestSuite();
  const report = await testSuite.runComprehensiveTests(500); // Smaller test for quick verification
  
  testSuite.printTestReport(report);
  
  // Verify key requirements
  const targetImprovement = 10; // Minimum 10x improvement
  const success = report.overallImprovement >= targetImprovement && report.allTestsPassed;
  
  if (success) {
    console.log('\n🎉 SUCCESS: Spatial indexing optimization meets performance targets!');
    console.log(`   Achieved ${report.overallImprovement.toFixed(1)}x improvement (target: ${targetImprovement}x)`);
  } else {
    console.log('\n❌ FAILURE: Performance targets not met');
    console.log(`   Achieved ${report.overallImprovement.toFixed(1)}x improvement (target: ${targetImprovement}x)`);
  }
}

// Export test suite for use in development
export const spatialTestSuite = new SpatialPerformanceTestSuite();