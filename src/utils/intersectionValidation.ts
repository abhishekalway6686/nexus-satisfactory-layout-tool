// src/utils/intersectionValidation.ts
import { Point, Point3D } from '../types';

// Import both implementations for validation
import * as Original from '../logic/common/intersectionLogic';
import * as Async from '../logic/common/intersectionLogicAsync';

/**
 * Validation suite for Rust intersection migration
 * Ensures exact functional equivalence with original TypeScript implementation
 */

export interface ValidationResult {
  testName: string;
  passed: boolean;
  originalResult: any;
  asyncResult: any;
  error?: string;
  performanceGain?: number;
}

/**
 * Test cases designed to validate critical precision requirements
 */
const TEST_CASES = {
  linesIntersect: [
    // Basic intersection
    {
      name: 'perpendicular_intersection',
      a1: { x: 0, y: 0 },
      a2: { x: 10, y: 0 },
      b1: { x: 5, y: -5 },
      b2: { x: 5, y: 5 },
      expected: { x: 5, y: 0 }
    },
    // Near-parallel lines (epsilon test)
    {
      name: 'near_parallel_epsilon_test',
      a1: { x: 0, y: 0 },
      a2: { x: 10, y: 0 },
      b1: { x: 0, y: 0.0000005 }, // Within 1e-6 epsilon
      b2: { x: 10, y: 0.0000005 },
      expected: null
    },
    // Parameter bounds test
    {
      name: 'parameter_bounds_test',
      a1: { x: 0, y: 0 },
      a2: { x: 1, y: 0 },
      b1: { x: 2, y: -1 }, // Outside [0,1] parameter range
      b2: { x: 2, y: 1 },
      expected: null
    }
  ],
  
  approximateBezier: [
    {
      name: 'default_20_steps',
      start: { x: 0, y: 0 },
      cp: { x: 5, y: 10 },
      end: { x: 10, y: 0 },
      steps: 20
    },
    {
      name: 'custom_steps',
      start: { x: 0, y: 0 },
      cp: { x: 0, y: 5 },
      end: { x: 5, y: 5 },
      steps: 50
    }
  ],
  
  isRightTrianglePattern: [
    // Perfect right triangle
    {
      name: 'perfect_right_triangle',
      p1: { x: 0, y: 0, z: 0 },
      p2: { x: 5, y: 0, z: 0 },
      p3: { x: 5, y: 5, z: 0 },
      expected: true
    },
    // Too small triangle (1m minimum test)
    {
      name: 'too_small_triangle',
      p1: { x: 0, y: 0, z: 0 },
      p2: { x: 0.5, y: 0, z: 0 }, // 0.5m < 1m minimum
      p3: { x: 0.5, y: 0.5, z: 0 },
      expected: false
    },
    // 15-degree tolerance test
    {
      name: 'tolerance_boundary',
      p1: { x: 0, y: 0, z: 0 },
      p2: { x: 5, y: 0, z: 0 },
      p3: { x: 5, y: 1.34, z: 0 }, // ~15 degrees from right angle
      expected: true
    }
  ]
};

/**
 * Validates linesIntersect function equivalence
 */
export const validateLinesIntersect = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];
  
  for (const testCase of TEST_CASES.linesIntersect) {
    const startTime = performance.now();
    const originalResult = Original.linesIntersect(testCase.a1, testCase.a2, testCase.b1, testCase.b2);
    const originalTime = performance.now() - startTime;
    
    const asyncStartTime = performance.now();
    const asyncResult = await Async.linesIntersect(testCase.a1, testCase.a2, testCase.b1, testCase.b2);
    const asyncTime = performance.now() - asyncStartTime;
    
    const passed = JSON.stringify(originalResult) === JSON.stringify(asyncResult);
    
    results.push({
      testName: `linesIntersect_${testCase.name}`,
      passed,
      originalResult,
      asyncResult,
      performanceGain: originalTime > 0 ? asyncTime / originalTime : 1
    });
  }
  
  return results;
};

/**
 * Validates approximateBezier function equivalence
 */
export const validateApproximateBezier = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];
  
  for (const testCase of TEST_CASES.approximateBezier) {
    const startTime = performance.now();
    const originalResult = Original.approximateBezier(testCase.start, testCase.cp, testCase.end, testCase.steps);
    const originalTime = performance.now() - startTime;
    
    const asyncStartTime = performance.now();
    const asyncResult = await Async.approximateBezier(testCase.start, testCase.cp, testCase.end, testCase.steps);
    const asyncTime = performance.now() - asyncStartTime;
    
    // Check array lengths match
    const lengthsMatch = originalResult.length === asyncResult.length;
    
    // Check all points match within floating-point precision
    let pointsMatch = true;
    if (lengthsMatch) {
      for (let i = 0; i < originalResult.length; i++) {
        const orig = originalResult[i];
        const async = asyncResult[i];
        if (Math.abs(orig.x - async.x) > 1e-10 || Math.abs(orig.y - async.y) > 1e-10) {
          pointsMatch = false;
          break;
        }
      }
    }
    
    const passed = lengthsMatch && pointsMatch;
    
    results.push({
      testName: `approximateBezier_${testCase.name}`,
      passed,
      originalResult: originalResult.length,
      asyncResult: asyncResult.length,
      performanceGain: originalTime > 0 ? asyncTime / originalTime : 1,
      error: passed ? undefined : 'Point arrays do not match'
    });
  }
  
  return results;
};

/**
 * Validates isRightTrianglePattern function equivalence
 */
export const validateIsRightTrianglePattern = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];
  
  for (const testCase of TEST_CASES.isRightTrianglePattern) {
    const startTime = performance.now();
    const originalResult = Original.isRightTrianglePattern(testCase.p1, testCase.p2, testCase.p3);
    const originalTime = performance.now() - startTime;
    
    const asyncStartTime = performance.now();
    const asyncResult = await Async.isRightTrianglePattern(testCase.p1, testCase.p2, testCase.p3);
    const asyncTime = performance.now() - asyncStartTime;
    
    const passed = originalResult === asyncResult;
    
    results.push({
      testName: `isRightTrianglePattern_${testCase.name}`,
      passed,
      originalResult,
      asyncResult,
      performanceGain: originalTime > 0 ? asyncTime / originalTime : 1
    });
  }
  
  return results;
};

/**
 * Performance benchmark for complex intersection scenarios
 */
export const benchmarkComplexIntersections = async (): Promise<ValidationResult> => {
  // Generate complex polylines for performance testing
  const generatePolyline = (points: number, scale: number): Point[] => {
    const poly: Point[] = [];
    for (let i = 0; i < points; i++) {
      poly.push({
        x: Math.sin(i * 0.1) * scale + i * 2,
        y: Math.cos(i * 0.1) * scale + i
      });
    }
    return poly;
  };
  
  const poly1 = generatePolyline(100, 50);
  const poly2 = generatePolyline(100, 50);
  
  const startTime = performance.now();
  const originalResult = Original.findIntersections(poly1, poly2);
  const originalTime = performance.now() - startTime;
  
  const asyncStartTime = performance.now();
  const asyncResult = await Async.findIntersections(poly1, poly2);
  const asyncTime = performance.now() - asyncStartTime;
  
  // Validate intersection count matches
  const passed = originalResult.length === asyncResult.length;
  
  return {
    testName: 'complex_intersection_benchmark',
    passed,
    originalResult: `${originalResult.length} intersections in ${originalTime.toFixed(2)}ms`,
    asyncResult: `${asyncResult.length} intersections in ${asyncTime.toFixed(2)}ms`,
    performanceGain: originalTime > 0 ? originalTime / asyncTime : 1
  };
};

/**
 * Run complete validation suite
 */
export const runIntersectionValidation = async (): Promise<{
  allPassed: boolean;
  results: ValidationResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    averagePerformanceGain: number;
  };
}> => {
  const allResults: ValidationResult[] = [];
  
  // Run all validation tests
  allResults.push(...await validateLinesIntersect());
  allResults.push(...await validateApproximateBezier());
  allResults.push(...await validateIsRightTrianglePattern());
  allResults.push(await benchmarkComplexIntersections());
  
  const passedTests = allResults.filter(r => r.passed).length;
  const allPassed = passedTests === allResults.length;
  
  const validPerformanceGains = allResults
    .map(r => r.performanceGain)
    .filter(gain => gain !== undefined && gain > 0) as number[];
  
  const averagePerformanceGain = validPerformanceGains.length > 0
    ? validPerformanceGains.reduce((sum, gain) => sum + gain, 0) / validPerformanceGains.length
    : 1;
  
  return {
    allPassed,
    results: allResults,
    summary: {
      totalTests: allResults.length,
      passedTests,
      averagePerformanceGain
    }
  };
};

/**
 * Get performance statistics from the async implementation
 */
export const getPerformanceStats = () => {
  return Async.getIntersectionPerformanceStats();
};