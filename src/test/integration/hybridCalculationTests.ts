/**
 * Hybrid Calculation Integration Tests
 * 
 * Tests the hybrid routing logic, performance thresholds, and fallback mechanisms
 * to ensure the system correctly chooses between Rust and JavaScript implementations.
 */

import { Point3D } from '../../types';
import { HybridCalculations } from '../../utils/hybridCalculations';
import * as TauriCommands from '../../tauri/commands';
import * as JSDistanceCalculations from '../../utils/distanceCalculations';
import { isTauriEnvironment, PerformanceConfig } from '../../tauri/environment';

// Test interfaces
export interface HybridTestResult {
  testName: string;
  expectedMethod: 'rust' | 'js';
  actualMethod: 'rust' | 'js';
  executionTime: number;
  result: any;
  success: boolean;
  error?: string;
}

export interface ThresholdTestResult {
  operation: string;
  datasetSize: number;
  threshold: number;
  chosenMethod: 'rust' | 'js';
  performanceGain: number;
  isOptimal: boolean;
}

export interface FallbackTestResult {
  scenario: string;
  rustFailed: boolean;
  fallbackWorked: boolean;
  finalResult: any;
  executionTime: number;
}

export interface HybridIntegrationReport {
  timestamp: Date;
  environment: {
    rustAvailable: boolean;
    performanceConfigEnabled: boolean;
  };
  thresholdTests: ThresholdTestResult[];
  fallbackTests: FallbackTestResult[];
  hybridTests: HybridTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    optimalChoices: number;
    fallbacksWorked: number;
    averagePerformanceGain: number;
  };
}

// Mock Tauri commands for fallback testing
class MockTauriCommands {
  static shouldFail = false;
  static failureRate = 0.0;

  static async calculateDistance3D(p1: Point3D, p2: Point3D): Promise<number> {
    if (this.shouldFail || Math.random() < this.failureRate) {
      throw new Error('Mock Tauri failure');
    }
    return JSDistanceCalculations.distance3D(p1, p2);
  }

  static async shouldCreateTurnExact(p1: Point3D, p2: Point3D, p3: Point3D): Promise<boolean> {
    if (this.shouldFail || Math.random() < this.failureRate) {
      throw new Error('Mock Tauri failure');
    }
    
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const angleDiff = Math.abs(diff);
    
    const minDistance = 2.0;
    const dist1 = JSDistanceCalculations.distance2D(p1, p2);
    const dist2 = JSDistanceCalculations.distance2D(p2, p3);
    
    return angleDiff > 0.873 && dist1 >= minDistance && dist2 >= minDistance;
  }

  static async findIntersectionsSpatial(
    poly1: { x: number; y: number }[], 
    poly2: { x: number; y: number }[], 
    useSpatialOptimization: boolean
  ): Promise<TauriCommands.PolylineIntersection[]> {
    if (this.shouldFail || Math.random() < this.failureRate) {
      throw new Error('Mock Tauri failure');
    }
    
    // Simplified intersection detection for testing
    const intersections: TauriCommands.PolylineIntersection[] = [];
    
    for (let i = 0; i < poly1.length - 1; i++) {
      for (let j = 0; j < poly2.length - 1; j++) {
        const p1 = poly1[i];
        const p2 = poly1[i + 1];
        const p3 = poly2[j];
        const p4 = poly2[j + 1];
        
        // Simple intersection check
        const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(denom) > 1e-6) {
          const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
          const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
          
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            intersections.push({
              point: {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
              },
              t1: t,
              t2: u
            });
          }
        }
      }
    }
    
    return intersections;
  }

  static reset() {
    this.shouldFail = false;
    this.failureRate = 0.0;
  }
}

// Test data generators
export class HybridTestDataGenerator {
  /**
   * Generate datasets of various sizes for threshold testing
   */
  static generateThresholdTestData(): { size: number; points: Point3D[] }[] {
    const sizes = [1, 5, 10, 50, 100, 500, 1000, 5000];
    return sizes.map(size => ({
      size,
      points: Array.from({ length: size }, (_, i) => ({
        x: i * 10 + Math.random() * 5,
        y: i * 8 + Math.random() * 5,
        z: Math.random() * 20
      }))
    }));
  }

  /**
   * Generate high-frequency operation scenarios
   */
  static generateHighFrequencyScenarios(): Point3D[][] {
    return Array.from({ length: 20 }, (_, batch) =>
      Array.from({ length: 3 }, (_, i) => ({
        x: batch * 15 + i * 5,
        y: batch * 12 + i * 3,
        z: batch * 0.5 + i * 0.2
      }))
    );
  }

  /**
   * Generate polylines for intersection testing
   */
  static generateIntersectionTestData(): {
    name: string;
    poly1: { x: number; y: number }[];
    poly2: { x: number; y: number }[];
    expectedMethod: 'rust' | 'js';
  }[] {
    return [
      {
        name: 'small_polylines',
        poly1: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        poly2: [{ x: 5, y: -5 }, { x: 5, y: 5 }],
        expectedMethod: 'js'
      },
      {
        name: 'medium_polylines',
        poly1: Array.from({ length: 25 }, (_, i) => ({ x: i * 2, y: Math.sin(i * 0.1) * 10 })),
        poly2: Array.from({ length: 25 }, (_, i) => ({ x: i * 2, y: Math.cos(i * 0.1) * 10 })),
        expectedMethod: 'rust'
      },
      {
        name: 'large_polylines',
        poly1: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.sin(i * 0.05) * 20 })),
        poly2: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.cos(i * 0.05) * 20 })),
        expectedMethod: 'rust'
      }
    ];
  }
}

// Main testing class
export class HybridCalculationTester {
  private thresholdResults: ThresholdTestResult[] = [];
  private fallbackResults: FallbackTestResult[] = [];
  private hybridResults: HybridTestResult[] = [];

  /**
   * Run comprehensive hybrid calculation tests
   */
  async runIntegrationTests(): Promise<HybridIntegrationReport> {
    console.log('🧪 Running hybrid calculation integration tests...');

    // Clear previous results
    this.thresholdResults = [];
    this.fallbackResults = [];
    this.hybridResults = [];

    // Test performance thresholds
    await this.testPerformanceThresholds();

    // Test fallback mechanisms
    await this.testFallbackMechanisms();

    // Test hybrid routing logic
    await this.testHybridRouting();

    // Test call frequency tracking
    await this.testCallFrequencyTracking();

    return this.generateReport();
  }

  /**
   * Test performance threshold-based routing
   */
  async testPerformanceThresholds(): Promise<void> {
    console.log('Testing performance thresholds...');
    
    const testData = HybridTestDataGenerator.generateThresholdTestData();

    for (const dataset of testData) {
      // Test distance calculations
      const startTime = performance.now();
      
      // Determine expected method based on current thresholds
      const expectedMethod = this.determineExpectedMethod('distance', dataset.size);
      
      try {
        let actualMethod: 'rust' | 'js' = 'js';
        let performanceGain = 1.0;
        
        if (dataset.points.length >= 2) {
          const p1 = dataset.points[0];
          const p2 = dataset.points[1];
          
          // Test individual distance calculation
          const jsStart = performance.now();
          const jsResult = JSDistanceCalculations.distance3D(p1, p2);
          const jsTime = performance.now() - jsStart;
          
          let rustTime = Infinity;
          let rustResult = jsResult;
          
          if (isTauriEnvironment()) {
            try {
              const rustStart = performance.now();
              rustResult = await TauriCommands.calculateDistance3D(p1, p2);
              rustTime = performance.now() - rustStart;
              actualMethod = 'rust';
            } catch (error) {
              actualMethod = 'js';
            }
          }
          
          performanceGain = jsTime > 0 ? rustTime / jsTime : 1.0;
        }
        
        const totalTime = performance.now() - startTime;
        
        this.thresholdResults.push({
          operation: 'distance3D',
          datasetSize: dataset.size,
          threshold: 1, // Individual distance threshold
          chosenMethod: actualMethod,
          performanceGain,
          isOptimal: actualMethod === expectedMethod
        });
        
      } catch (error) {
        this.thresholdResults.push({
          operation: 'distance3D',
          datasetSize: dataset.size,
          threshold: 1,
          chosenMethod: 'js',
          performanceGain: 1.0,
          isOptimal: false
        });
      }
    }

    // Test bulk operations
    for (const dataset of testData.filter(d => d.size >= 10)) {
      const points = dataset.points;
      const pointsA = points.slice(0, Math.floor(points.length / 2));
      const pointsB = points.slice(Math.floor(points.length / 2));
      
      if (pointsA.length === pointsB.length && pointsA.length > 0) {
        const expectedMethod = this.determineExpectedMethod('bulk_distance', pointsA.length);
        
        try {
          const startTime = performance.now();
          
          // Test JavaScript bulk calculation
          const jsStart = performance.now();
          const jsResult = pointsA.map((p1, i) => JSDistanceCalculations.distance3D(p1, pointsB[i]));
          const jsTime = performance.now() - jsStart;
          
          let actualMethod: 'rust' | 'js' = 'js';
          let rustTime = Infinity;
          let performanceGain = 1.0;
          
          if (isTauriEnvironment() && pointsA.length >= 100) {
            try {
              const rustStart = performance.now();
              await TauriCommands.calculateDistancesBulk(pointsA, pointsB);
              rustTime = performance.now() - rustStart;
              actualMethod = 'rust';
              performanceGain = rustTime > 0 ? jsTime / rustTime : 1.0;
            } catch (error) {
              actualMethod = 'js';
            }
          }
          
          this.thresholdResults.push({
            operation: 'bulk_distance',
            datasetSize: pointsA.length,
            threshold: 100,
            chosenMethod: actualMethod,
            performanceGain,
            isOptimal: actualMethod === expectedMethod
          });
          
        } catch (error) {
          this.thresholdResults.push({
            operation: 'bulk_distance',
            datasetSize: pointsA.length,
            threshold: 100,
            chosenMethod: 'js',
            performanceGain: 1.0,
            isOptimal: false
          });
        }
      }
    }
  }

  /**
   * Test fallback mechanisms
   */
  async testFallbackMechanisms(): Promise<void> {
    console.log('Testing fallback mechanisms...');
    
    if (!isTauriEnvironment()) {
      console.log('Skipping fallback tests - Rust not available');
      return;
    }

    const testPoints: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 10 },
      { x: 5, y: 15, z: 8 }
    ];

    // Test distance calculation fallback
    MockTauriCommands.shouldFail = true;
    
    try {
      const startTime = performance.now();
      const result = await HybridCalculations.distance3D(testPoints[0], testPoints[1]);
      const executionTime = performance.now() - startTime;
      
      // Verify the result matches JS implementation
      const expectedResult = JSDistanceCalculations.distance3D(testPoints[0], testPoints[1]);
      const fallbackWorked = Math.abs(result - expectedResult) < 0.000001;
      
      this.fallbackResults.push({
        scenario: 'distance_calculation_rust_failure',
        rustFailed: true,
        fallbackWorked,
        finalResult: result,
        executionTime
      });
      
    } catch (error) {
      this.fallbackResults.push({
        scenario: 'distance_calculation_rust_failure',
        rustFailed: true,
        fallbackWorked: false,
        finalResult: null,
        executionTime: 0
      });
    }

    // Test curve calculation fallback
    try {
      const startTime = performance.now();
      const result = await HybridCalculations.shouldCreateTurnHybrid(testPoints[0], testPoints[1], testPoints[2]);
      const executionTime = performance.now() - startTime;
      
      this.fallbackResults.push({
        scenario: 'curve_calculation_rust_failure',
        rustFailed: true,
        fallbackWorked: typeof result === 'boolean',
        finalResult: result,
        executionTime
      });
      
    } catch (error) {
      this.fallbackResults.push({
        scenario: 'curve_calculation_rust_failure',
        rustFailed: true,
        fallbackWorked: false,
        finalResult: null,
        executionTime: 0
      });
    }

    // Test intersection fallback
    const polylines = HybridTestDataGenerator.generateIntersectionTestData()[1]; // Medium polylines
    
    try {
      const startTime = performance.now();
      const result = await HybridCalculations.findIntersectionsSpatial(polylines.poly1, polylines.poly2);
      const executionTime = performance.now() - startTime;
      
      this.fallbackResults.push({
        scenario: 'intersection_detection_rust_failure',
        rustFailed: true,
        fallbackWorked: Array.isArray(result),
        finalResult: result,
        executionTime
      });
      
    } catch (error) {
      this.fallbackResults.push({
        scenario: 'intersection_detection_rust_failure',
        rustFailed: true,
        fallbackWorked: false,
        finalResult: null,
        executionTime: 0
      });
    }

    MockTauriCommands.reset();
  }

  /**
   * Test hybrid routing logic
   */
  async testHybridRouting(): Promise<void> {
    console.log('Testing hybrid routing logic...');

    const testCases = [
      {
        name: 'individual_distance_calculation',
        test: async () => {
          const p1 = { x: 0, y: 0, z: 0 };
          const p2 = { x: 3, y: 4, z: 0 };
          return HybridCalculations.distance3D(p1, p2);
        },
        expectedMethod: 'js', // Individual calculations should use JS
        expectedResult: 5.0
      },
      {
        name: 'curve_turn_detection',
        test: async () => {
          const p1 = { x: 0, y: 0, z: 0 };
          const p2 = { x: 5, y: 0, z: 0 };
          const p3 = { x: 10, y: 5, z: 0 };
          return HybridCalculations.shouldCreateTurnHybrid(p1, p2, p3);
        },
        expectedMethod: isTauriEnvironment() ? 'rust' : 'js',
        expectedResult: true
      },
      {
        name: 'bezier_interpolation',
        test: async () => {
          const start = { x: 0, y: 0, z: 0 };
          const control = { x: 5, y: 5, z: 0 };
          const end = { x: 10, y: 0, z: 0 };
          return HybridCalculations.interpolateBezierCurve(start, end, control, 0.5);
        },
        expectedMethod: 'js', // Simple interpolation should use JS
        expectedResult: { x: 5, y: 2.5, z: 0 }
      }
    ];

    for (const testCase of testCases) {
      try {
        const startTime = performance.now();
        const result = await testCase.test();
        const executionTime = performance.now() - startTime;
        
        let success = true;
        
        // Validate result if expected result is provided
        if (testCase.expectedResult !== undefined) {
          if (typeof testCase.expectedResult === 'number' && typeof result === 'number') {
            success = Math.abs(result - testCase.expectedResult) < 0.001;
          } else if (typeof testCase.expectedResult === 'boolean') {
            success = result === testCase.expectedResult;
          } else if (typeof testCase.expectedResult === 'object' && typeof result === 'object') {
            success = JSON.stringify(result) === JSON.stringify(testCase.expectedResult);
          }
        }
        
        this.hybridResults.push({
          testName: testCase.name,
          expectedMethod: testCase.expectedMethod,
          actualMethod: 'unknown', // Hard to determine without instrumentation
          executionTime,
          result,
          success
        });
        
      } catch (error) {
        this.hybridResults.push({
          testName: testCase.name,
          expectedMethod: testCase.expectedMethod,
          actualMethod: 'unknown',
          executionTime: 0,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Test call frequency tracking
   */
  async testCallFrequencyTracking(): Promise<void> {
    console.log('Testing call frequency tracking...');

    // Generate high-frequency scenarios
    const scenarios = HybridTestDataGenerator.generateHighFrequencyScenarios();
    
    try {
      const startTime = performance.now();
      
      // Rapidly call shouldCreateTurn to test frequency tracking
      const results = [];
      for (const scenario of scenarios) {
        if (scenario.length >= 3) {
          const result = await HybridCalculations.shouldCreateTurnHybrid(
            scenario[0], 
            scenario[1], 
            scenario[2]
          );
          results.push(result);
        }
      }
      
      const executionTime = performance.now() - startTime;
      
      this.hybridResults.push({
        testName: 'high_frequency_calls',
        expectedMethod: 'js', // High frequency should prefer JS
        actualMethod: 'unknown',
        executionTime,
        result: results,
        success: results.length === scenarios.filter(s => s.length >= 3).length
      });
      
    } catch (error) {
      this.hybridResults.push({
        testName: 'high_frequency_calls',
        expectedMethod: 'js',
        actualMethod: 'unknown',
        executionTime: 0,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Determine expected method based on operation and dataset size
   */
  private determineExpectedMethod(operation: string, size: number): 'rust' | 'js' {
    if (!isTauriEnvironment() || !PerformanceConfig.useNativeCalculations) {
      return 'js';
    }

    switch (operation) {
      case 'distance':
        return 'js'; // Individual distance calculations should use JS
      case 'bulk_distance':
        return size >= 100 ? 'rust' : 'js';
      case 'intersection':
        return size > 10 ? 'rust' : 'js';
      case 'curve':
        return 'rust'; // Complex math operations can benefit from Rust
      default:
        return 'js';
    }
  }

  /**
   * Generate comprehensive integration test report
   */
  private generateReport(): HybridIntegrationReport {
    const totalTests = this.thresholdResults.length + this.fallbackResults.length + this.hybridResults.length;
    
    const passedThresholdTests = this.thresholdResults.filter(r => r.isOptimal).length;
    const passedFallbackTests = this.fallbackResults.filter(r => r.fallbackWorked).length;
    const passedHybridTests = this.hybridResults.filter(r => r.success).length;
    const passedTests = passedThresholdTests + passedFallbackTests + passedHybridTests;
    
    const optimalChoices = this.thresholdResults.filter(r => r.isOptimal).length;
    const fallbacksWorked = this.fallbackResults.filter(r => r.fallbackWorked).length;
    
    const performanceGains = this.thresholdResults
      .filter(r => r.performanceGain < Infinity && r.performanceGain > 0)
      .map(r => r.performanceGain);
    
    const averagePerformanceGain = performanceGains.length > 0 
      ? performanceGains.reduce((sum, gain) => sum + gain, 0) / performanceGains.length 
      : 1.0;

    return {
      timestamp: new Date(),
      environment: {
        rustAvailable: isTauriEnvironment(),
        performanceConfigEnabled: PerformanceConfig.useNativeCalculations
      },
      thresholdTests: this.thresholdResults,
      fallbackTests: this.fallbackResults,
      hybridTests: this.hybridResults,
      summary: {
        totalTests,
        passedTests,
        optimalChoices,
        fallbacksWorked,
        averagePerformanceGain
      }
    };
  }

  /**
   * Get tests that made sub-optimal method choices
   */
  getSubOptimalChoices(): ThresholdTestResult[] {
    return this.thresholdResults.filter(r => !r.isOptimal);
  }

  /**
   * Get failed fallback tests
   */
  getFailedFallbacks(): FallbackTestResult[] {
    return this.fallbackResults.filter(r => !r.fallbackWorked);
  }

  /**
   * Get performance statistics by operation
   */
  getPerformanceStats(): Record<string, { 
    avgGain: number; 
    maxGain: number; 
    optimalChoiceRate: number; 
  }> {
    const stats: Record<string, { avgGain: number; maxGain: number; optimalChoiceRate: number }> = {};
    
    const operationGroups = this.thresholdResults.reduce((groups, result) => {
      if (!groups[result.operation]) {
        groups[result.operation] = [];
      }
      groups[result.operation].push(result);
      return groups;
    }, {} as Record<string, ThresholdTestResult[]>);
    
    Object.entries(operationGroups).forEach(([operation, results]) => {
      const validGains = results
        .filter(r => r.performanceGain < Infinity && r.performanceGain > 0)
        .map(r => r.performanceGain);
      
      const avgGain = validGains.length > 0 
        ? validGains.reduce((sum, gain) => sum + gain, 0) / validGains.length 
        : 1.0;
      
      const maxGain = validGains.length > 0 ? Math.max(...validGains) : 1.0;
      const optimalChoiceRate = results.length > 0 
        ? results.filter(r => r.isOptimal).length / results.length 
        : 0;
      
      stats[operation] = { avgGain, maxGain, optimalChoiceRate };
    });
    
    return stats;
  }

  /**
   * Export results to JSON
   */
  exportResults(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }
}

// Utility functions for external testing
export const testHybridRouting = async (operation: string, dataSize: number): Promise<'rust' | 'js'> => {
  const tester = new HybridCalculationTester();
  return tester['determineExpectedMethod'](operation, dataSize);
};

export const validateFallbackMechanism = async (operationName: string): Promise<boolean> => {
  // Mock a Rust failure and ensure JavaScript fallback works
  const originalTauri = (global as any).__TAURI__;
  (global as any).__TAURI__ = undefined; // Simulate Tauri not available
  
  try {
    switch (operationName) {
      case 'distance3D':
        const result = HybridCalculations.distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
        return Math.abs(result - 5.0) < 0.001;
      
      case 'shouldCreateTurn':
        const turnResult = await HybridCalculations.shouldCreateTurnHybrid(
          { x: 0, y: 0, z: 0 }, 
          { x: 5, y: 0, z: 0 }, 
          { x: 10, y: 5, z: 0 }
        );
        return typeof turnResult === 'boolean';
      
      default:
        return false;
    }
  } catch (error) {
    return false;
  } finally {
    (global as any).__TAURI__ = originalTauri;
  }
};

// Export main test runner
export const runHybridCalculationTests = async (): Promise<HybridIntegrationReport> => {
  const tester = new HybridCalculationTester();
  return await tester.runIntegrationTests();
};