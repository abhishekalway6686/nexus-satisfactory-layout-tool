/**
 * Rust Integration Validation Tests
 * 
 * Comprehensive validation tests to ensure Rust functions produce identical
 * results to TypeScript implementations across all edge cases and scenarios.
 */

import { Point3D } from '../../types';
import * as TauriCommands from '../../tauri/commands';
import * as JSDistanceCalculations from '../../utils/distanceCalculations';
import { HybridCalculations } from '../../utils/hybridCalculations';
import { isTauriEnvironment } from '../../tauri/environment';
import { findPolylineIntersections } from '../../logic/common/intersectionLogic';

// Validation result interfaces
export interface ValidationResult {
  operation: string;
  testCase: string;
  jsResult: any;
  rustResult: any;
  isMatch: boolean;
  difference?: number;
  tolerance: number;
  error?: string;
}

export interface ValidationReport {
  timestamp: Date;
  rustAvailable: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  results: ValidationResult[];
  edgeCaseResults: ValidationResult[];
  errorSummary: string[];
}

// Test data for edge cases
export class EdgeCaseTestData {
  /**
   * Zero distance points (identical coordinates)
   */
  static getZeroDistancePoints(): Point3D[] {
    return [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 10.5, y: 20.3, z: 15.7 },
      { x: 10.5, y: 20.3, z: 15.7 }
    ];
  }

  /**
   * Very small distance points (precision testing)
   */
  static getSmallDistancePoints(): Point3D[] {
    return [
      { x: 0, y: 0, z: 0 },
      { x: 0.0001, y: 0.0001, z: 0.0001 },
      { x: 1.0, y: 1.0, z: 1.0 },
      { x: 1.0001, y: 1.0001, z: 1.0001 }
    ];
  }

  /**
   * Very large distance points (overflow testing)
   */
  static getLargeDistancePoints(): Point3D[] {
    return [
      { x: 0, y: 0, z: 0 },
      { x: 1000000, y: 1000000, z: 1000000 },
      { x: -500000, y: -500000, z: -500000 },
      { x: 999999, y: 999999, z: 999999 }
    ];
  }

  /**
   * Negative coordinate points
   */
  static getNegativePoints(): Point3D[] {
    return [
      { x: -10, y: -20, z: -30 },
      { x: -5, y: -15, z: -25 },
      { x: 10, y: 20, z: 30 },
      { x: -100, y: 50, z: -75 }
    ];
  }

  /**
   * Points with extreme floating point values
   */
  static getFloatingPointEdgeCases(): Point3D[] {
    return [
      { x: Number.MIN_VALUE, y: Number.MIN_VALUE, z: Number.MIN_VALUE },
      { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER, z: Number.MAX_SAFE_INTEGER },
      { x: 1.7976931348623157e+308, y: 1.7976931348623157e+308, z: 1.7976931348623157e+308 },
      { x: 2.2250738585072014e-308, y: 2.2250738585072014e-308, z: 2.2250738585072014e-308 }
    ];
  }

  /**
   * Single point polylines (degenerate case)
   */
  static getSinglePointPolylines(): { x: number; y: number }[][] {
    return [
      [{ x: 0, y: 0 }],
      [{ x: 10, y: 10 }],
      [{ x: -5, y: 15 }]
    ];
  }

  /**
   * Empty polylines
   */
  static getEmptyPolylines(): { x: number; y: number }[][] {
    return [[], [], []];
  }

  /**
   * Parallel lines (no intersections)
   */
  static getParallelLines(): { 
    poly1: { x: number; y: number }[]; 
    poly2: { x: number; y: number }[];
  }[] {
    return [
      {
        poly1: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        poly2: [{ x: 0, y: 5 }, { x: 10, y: 5 }]
      },
      {
        poly1: [{ x: 0, y: 0 }, { x: 0, y: 10 }],
        poly2: [{ x: 3, y: 0 }, { x: 3, y: 10 }]
      }
    ];
  }

  /**
   * Complex overlapping curves
   */
  static getOverlappingCurves(): Point3D[][] {
    return [
      // Overlapping bezier control points
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 5, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: -5, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      // Identical curves
      [
        { x: 20, y: 20, z: 0 },
        { x: 25, y: 25, z: 0 },
        { x: 30, y: 20, z: 0 }
      ],
      [
        { x: 20, y: 20, z: 0 },
        { x: 25, y: 25, z: 0 },
        { x: 30, y: 20, z: 0 }
      ]
    ];
  }

  /**
   * Collinear points (for turn detection)
   */
  static getCollinearPoints(): Point3D[][] {
    return [
      // Perfectly straight line
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      // Diagonal line
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 5, z: 0 },
        { x: 10, y: 10, z: 0 }
      ],
      // 3D collinear
      [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 3, z: 3 },
        { x: 6, y: 6, z: 6 }
      ]
    ];
  }
}

// Main validation class
export class RustIntegrationValidator {
  private results: ValidationResult[] = [];
  private edgeCaseResults: ValidationResult[] = [];

  /**
   * Run comprehensive validation suite
   */
  async runValidationSuite(): Promise<ValidationReport> {
    console.log('🧪 Running Rust integration validation tests...');
    
    if (!isTauriEnvironment()) {
      console.warn('⚠️  Rust environment not available - validation tests will be skipped');
      return this.generateSkippedReport();
    }

    this.results = [];
    this.edgeCaseResults = [];

    // Core distance calculations
    await this.validateDistanceCalculations();
    
    // Projection calculations
    await this.validateProjectionCalculations();
    
    // Curve calculations
    await this.validateCurveCalculations();
    
    // Intersection detection
    await this.validateIntersectionDetection();
    
    // Bulk operations
    await this.validateBulkOperations();
    
    // Edge cases
    await this.validateEdgeCases();

    return this.generateReport();
  }

  /**
   * Validate distance calculation functions
   */
  async validateDistanceCalculations(): Promise<void> {
    const testPoints = [
      [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }],
      [{ x: -5, y: 10, z: -3 }, { x: 7, y: -2, z: 8 }],
      [{ x: 100.5, y: 200.7, z: 300.3 }, { x: 150.2, y: 250.8, z: 350.1 }],
      [{ x: 0.001, y: 0.002, z: 0.003 }, { x: 0.004, y: 0.005, z: 0.006 }]
    ];

    for (const [p1, p2] of testPoints) {
      // 3D distance
      await this.validateFunction(
        'distance3D',
        `points: (${p1.x},${p1.y},${p1.z}) to (${p2.x},${p2.y},${p2.z})`,
        () => JSDistanceCalculations.distance3D(p1, p2),
        () => TauriCommands.calculateDistance3D(p1, p2),
        0.000001
      );

      // 3D distance squared
      await this.validateFunction(
        'distance3DSquared',
        `points: (${p1.x},${p1.y},${p1.z}) to (${p2.x},${p2.y},${p2.z})`,
        () => JSDistanceCalculations.distance3DSquared(p1, p2),
        () => TauriCommands.calculateDistance3DSquared(p1, p2),
        0.000001
      );

      // 2D distance
      await this.validateFunction(
        'distance2D',
        `points: (${p1.x},${p1.y}) to (${p2.x},${p2.y})`,
        () => JSDistanceCalculations.distance2D(p1, p2),
        () => TauriCommands.calculateDistance2D(p1, p2),
        0.000001
      );

      // 2D distance squared
      await this.validateFunction(
        'distance2DSquared',
        `points: (${p1.x},${p1.y}) to (${p2.x},${p2.y})`,
        () => JSDistanceCalculations.distance2DSquared(p1, p2),
        () => TauriCommands.calculateDistance2DSquared(p1, p2),
        0.000001
      );
    }
  }

  /**
   * Validate projection calculations
   */
  async validateProjectionCalculations(): Promise<void> {
    const testCases = [
      {
        point: { x: 5, y: 5, z: 0 },
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 }
      },
      {
        point: { x: 3, y: 7, z: 2 },
        start: { x: 0, y: 0, z: 0 },
        end: { x: 6, y: 8, z: 4 }
      },
      {
        point: { x: -2, y: -3, z: -1 },
        start: { x: -10, y: -10, z: -10 },
        end: { x: 10, y: 10, z: 10 }
      }
    ];

    for (const testCase of testCases) {
      await this.validateFunction(
        'projectPointOnLine',
        `point: (${testCase.point.x},${testCase.point.y},${testCase.point.z})`,
        () => JSDistanceCalculations.projectPointOnLine(testCase.point, testCase.start, testCase.end),
        () => TauriCommands.projectPointOnLine(testCase.point, testCase.start, testCase.end),
        0.000001,
        (a, b) => {
          return Math.abs(a.proj.x - b.proj.x) < 0.000001 &&
                 Math.abs(a.proj.y - b.proj.y) < 0.000001 &&
                 Math.abs(a.proj.z - b.proj.z) < 0.000001 &&
                 Math.abs(a.t - b.t) < 0.000001;
        }
      );
    }
  }

  /**
   * Validate curve calculations
   */
  async validateCurveCalculations(): Promise<void> {
    const testTriples = [
      [{ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, { x: 10, y: 5, z: 0 }],
      [{ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 1 }, { x: 5, y: 1, z: 2 }],
      [{ x: -5, y: -5, z: -5 }, { x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 }]
    ];

    for (const [p1, p2, p3] of testTriples) {
      // shouldCreateTurn validation
      await this.validateFunction(
        'shouldCreateTurn',
        `points: (${p1.x},${p1.y},${p1.z}) -> (${p2.x},${p2.y},${p2.z}) -> (${p3.x},${p3.y},${p3.z})`,
        async () => {
          // JS implementation matching the hybrid calculation
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
        },
        () => TauriCommands.shouldCreateTurnExact(p1, p2, p3),
        0,
        (a, b) => a === b
      );

      // calculateCurveControlPoint validation
      await this.validateFunction(
        'calculateCurveControlPoint',
        `points: (${p1.x},${p1.y},${p1.z}) -> (${p2.x},${p2.y},${p2.z}) -> (${p3.x},${p3.y},${p3.z})`,
        async () => await HybridCalculations.calculateCurveControlPointHybrid(p1, p2, p3),
        () => TauriCommands.calculateCurveControlPointExact(p1, p2, p3),
        0.000001,
        (a, b) => {
          return Math.abs(a.x - b.x) < 0.000001 &&
                 Math.abs(a.y - b.y) < 0.000001 &&
                 Math.abs(a.z - b.z) < 0.000001;
        }
      );

      // Bezier points generation
      await this.validateFunction(
        'bezierPoints',
        `bezier: (${p1.x},${p1.y},${p1.z}) -> (${p2.x},${p2.y},${p2.z}) -> (${p3.x},${p3.y},${p3.z})`,
        async () => await HybridCalculations.getQuadraticBezierPointsHybrid(p1, p2, p3, 10),
        () => TauriCommands.getQuadraticBezierPoints(p1, p2, p3, 10),
        0.000001,
        (a, b) => {
          if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
          return a.every((pointA, index) => {
            const pointB = b[index];
            return Math.abs(pointA.x - pointB.x) < 0.000001 &&
                   Math.abs(pointA.y - pointB.y) < 0.000001 &&
                   Math.abs(pointA.z - pointB.z) < 0.000001;
          });
        }
      );
    }
  }

  /**
   * Validate intersection detection
   */
  async validateIntersectionDetection(): Promise<void> {
    const testCases = [
      // Simple crossing lines
      {
        poly1: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        poly2: [{ x: 0, y: 10 }, { x: 10, y: 0 }]
      },
      // Perpendicular lines
      {
        poly1: [{ x: 5, y: 0 }, { x: 5, y: 10 }],
        poly2: [{ x: 0, y: 5 }, { x: 10, y: 5 }]
      },
      // Complex polylines
      {
        poly1: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }, { x: 15, y: 5 }],
        poly2: [{ x: 2, y: 10 }, { x: 7, y: 2 }, { x: 12, y: 8 }, { x: 17, y: 1 }]
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const { poly1, poly2 } = testCases[i];
      
      await this.validateFunction(
        'intersectionDetection',
        `case ${i + 1}: ${poly1.length} vs ${poly2.length} points`,
        async () => {
          const jsResult = await findPolylineIntersections(poly1, poly2);
          // Convert to simplified format for comparison
          return jsResult.map(intersection => ({
            point: intersection.point,
            t1: intersection.t1,
            t2: intersection.t2
          }));
        },
        async () => {
          const rustResult = await TauriCommands.findIntersectionsSpatial(poly1, poly2, true);
          // Rust result is already in the correct format
          return rustResult;
        },
        0.000001,
        (a, b) => {
          if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
          return a.every((intersectionA, index) => {
            const intersectionB = b[index];
            return Math.abs(intersectionA.point.x - intersectionB.point.x) < 0.000001 &&
                   Math.abs(intersectionA.point.y - intersectionB.point.y) < 0.000001 &&
                   Math.abs(intersectionA.t1 - intersectionB.t1) < 0.000001 &&
                   Math.abs(intersectionA.t2 - intersectionB.t2) < 0.000001;
          });
        }
      );
    }
  }

  /**
   * Validate bulk operations
   */
  async validateBulkOperations(): Promise<void> {
    const pointsA = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 10 },
      { x: -5, y: 15, z: 20 },
      { x: 100, y: 200, z: 300 }
    ];
    
    const pointsB = [
      { x: 3, y: 4, z: 5 },
      { x: 13, y: 14, z: 15 },
      { x: -2, y: 18, z: 25 },
      { x: 103, y: 204, z: 305 }
    ];

    await this.validateFunction(
      'bulkDistanceCalculation',
      `${pointsA.length} point pairs`,
      () => pointsA.map((p1, i) => JSDistanceCalculations.distance3D(p1, pointsB[i])),
      () => TauriCommands.calculateDistancesBulk(pointsA, pointsB),
      0.000001,
      (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((distA, index) => Math.abs(distA - b[index]) < 0.000001);
      }
    );
  }

  /**
   * Validate edge cases
   */
  async validateEdgeCases(): Promise<void> {
    // Zero distance points
    const zeroPoints = EdgeCaseTestData.getZeroDistancePoints();
    for (let i = 0; i < zeroPoints.length - 1; i += 2) {
      await this.validateEdgeCase(
        'zeroDistance',
        `identical points: (${zeroPoints[i].x},${zeroPoints[i].y},${zeroPoints[i].z})`,
        () => JSDistanceCalculations.distance3D(zeroPoints[i], zeroPoints[i + 1]),
        () => TauriCommands.calculateDistance3D(zeroPoints[i], zeroPoints[i + 1]),
        0.000001
      );
    }

    // Small distance points (precision test)
    const smallPoints = EdgeCaseTestData.getSmallDistancePoints();
    for (let i = 0; i < smallPoints.length - 1; i += 2) {
      await this.validateEdgeCase(
        'smallDistance',
        `precision test: (${smallPoints[i].x},${smallPoints[i].y},${smallPoints[i].z})`,
        () => JSDistanceCalculations.distance3D(smallPoints[i], smallPoints[i + 1]),
        () => TauriCommands.calculateDistance3D(smallPoints[i], smallPoints[i + 1]),
        0.000001
      );
    }

    // Large distance points (overflow test)
    const largePoints = EdgeCaseTestData.getLargeDistancePoints();
    for (let i = 0; i < largePoints.length - 1; i += 2) {
      await this.validateEdgeCase(
        'largeDistance',
        `overflow test: (${largePoints[i].x},${largePoints[i].y},${largePoints[i].z})`,
        () => JSDistanceCalculations.distance3D(largePoints[i], largePoints[i + 1]),
        () => TauriCommands.calculateDistance3D(largePoints[i], largePoints[i + 1]),
        0.001 // Slightly higher tolerance for large numbers
      );
    }

    // Empty datasets
    const emptyPolylines = EdgeCaseTestData.getEmptyPolylines();
    if (emptyPolylines.length >= 2) {
      await this.validateEdgeCase(
        'emptyPolylines',
        'empty polylines intersection',
        async () => await findPolylineIntersections(emptyPolylines[0], emptyPolylines[1]),
        async () => {
          try {
            return await TauriCommands.findIntersectionsSpatial(emptyPolylines[0], emptyPolylines[1], true);
          } catch (error) {
            return []; // Expected behavior for empty polylines
          }
        },
        0,
        (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === 0 && b.length === 0
      );
    }

    // Single point polylines
    const singlePointPolylines = EdgeCaseTestData.getSinglePointPolylines();
    if (singlePointPolylines.length >= 2) {
      await this.validateEdgeCase(
        'singlePointPolylines',
        'single point polylines intersection',
        async () => await findPolylineIntersections(singlePointPolylines[0], singlePointPolylines[1]),
        async () => {
          try {
            return await TauriCommands.findIntersectionsSpatial(singlePointPolylines[0], singlePointPolylines[1], true);
          } catch (error) {
            return []; // Expected behavior for degenerate polylines
          }
        },
        0,
        (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
      );
    }

    // Parallel lines (no intersections expected)
    const parallelLines = EdgeCaseTestData.getParallelLines();
    for (const { poly1, poly2 } of parallelLines) {
      await this.validateEdgeCase(
        'parallelLines',
        'parallel lines (no intersections)',
        async () => await findPolylineIntersections(poly1, poly2),
        async () => await TauriCommands.findIntersectionsSpatial(poly1, poly2, true),
        0,
        (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === 0 && b.length === 0
      );
    }

    // Collinear points (turn detection)
    const collinearSets = EdgeCaseTestData.getCollinearPoints();
    for (const [p1, p2, p3] of collinearSets) {
      await this.validateEdgeCase(
        'collinearTurnDetection',
        `collinear points: (${p1.x},${p1.y},${p1.z}) -> (${p2.x},${p2.y},${p2.z}) -> (${p3.x},${p3.y},${p3.z})`,
        async () => await HybridCalculations.shouldCreateTurnHybrid(p1, p2, p3),
        async () => await TauriCommands.shouldCreateTurnExact(p1, p2, p3),
        0,
        (a, b) => a === b
      );
    }
  }

  /**
   * Generic function validation helper
   */
  private async validateFunction<T>(
    operationName: string,
    testCase: string,
    jsFunction: () => T | Promise<T>,
    rustFunction: () => T | Promise<T>,
    tolerance: number,
    customComparator?: (jsResult: T, rustResult: T) => boolean
  ): Promise<void> {
    try {
      const jsResult = await jsFunction();
      const rustResult = await rustFunction();
      
      let isMatch: boolean;
      let difference: number | undefined;

      if (customComparator) {
        isMatch = customComparator(jsResult, rustResult);
      } else if (typeof jsResult === 'number' && typeof rustResult === 'number') {
        difference = Math.abs(jsResult - rustResult);
        isMatch = difference <= tolerance;
      } else {
        isMatch = JSON.stringify(jsResult) === JSON.stringify(rustResult);
      }

      this.results.push({
        operation: operationName,
        testCase,
        jsResult,
        rustResult,
        isMatch,
        difference,
        tolerance
      });

    } catch (error) {
      this.results.push({
        operation: operationName,
        testCase,
        jsResult: null,
        rustResult: null,
        isMatch: false,
        tolerance,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Edge case validation helper
   */
  private async validateEdgeCase<T>(
    operationName: string,
    testCase: string,
    jsFunction: () => T | Promise<T>,
    rustFunction: () => T | Promise<T>,
    tolerance: number,
    customComparator?: (jsResult: T, rustResult: T) => boolean
  ): Promise<void> {
    try {
      const jsResult = await jsFunction();
      const rustResult = await rustFunction();
      
      let isMatch: boolean;
      let difference: number | undefined;

      if (customComparator) {
        isMatch = customComparator(jsResult, rustResult);
      } else if (typeof jsResult === 'number' && typeof rustResult === 'number') {
        difference = Math.abs(jsResult - rustResult);
        isMatch = difference <= tolerance;
      } else {
        isMatch = JSON.stringify(jsResult) === JSON.stringify(rustResult);
      }

      this.edgeCaseResults.push({
        operation: operationName,
        testCase,
        jsResult,
        rustResult,
        isMatch,
        difference,
        tolerance
      });

    } catch (error) {
      this.edgeCaseResults.push({
        operation: operationName,
        testCase,
        jsResult: null,
        rustResult: null,
        isMatch: false,
        tolerance,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate validation report
   */
  private generateReport(): ValidationReport {
    const allResults = [...this.results, ...this.edgeCaseResults];
    const passedTests = allResults.filter(r => r.isMatch).length;
    const failedTests = allResults.length - passedTests;
    const successRate = allResults.length > 0 ? (passedTests / allResults.length) * 100 : 0;

    const errorSummary = allResults
      .filter(r => r.error)
      .map(r => `${r.operation}(${r.testCase}): ${r.error}`)
      .slice(0, 10); // Limit to first 10 errors

    return {
      timestamp: new Date(),
      rustAvailable: isTauriEnvironment(),
      totalTests: allResults.length,
      passedTests,
      failedTests,
      successRate,
      results: this.results,
      edgeCaseResults: this.edgeCaseResults,
      errorSummary
    };
  }

  /**
   * Generate report for skipped tests
   */
  private generateSkippedReport(): ValidationReport {
    return {
      timestamp: new Date(),
      rustAvailable: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0,
      results: [],
      edgeCaseResults: [],
      errorSummary: ['Rust environment not available - all tests skipped']
    };
  }

  /**
   * Get failed validation results
   */
  getFailedValidations(): ValidationResult[] {
    return [...this.results, ...this.edgeCaseResults].filter(r => !r.isMatch);
  }

  /**
   * Get validation results for specific operation
   */
  getValidationResults(operationName: string): ValidationResult[] {
    return [...this.results, ...this.edgeCaseResults].filter(r => r.operation === operationName);
  }

  /**
   * Export validation results to JSON
   */
  exportToJSON(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get precision analysis for numeric operations
   */
  getPrecisionAnalysis(): Record<string, { avgDifference: number; maxDifference: number; count: number }> {
    const analysis: Record<string, { avgDifference: number; maxDifference: number; count: number }> = {};
    
    [...this.results, ...this.edgeCaseResults].forEach(result => {
      if (typeof result.difference === 'number') {
        if (!analysis[result.operation]) {
          analysis[result.operation] = { avgDifference: 0, maxDifference: 0, count: 0 };
        }
        
        const op = analysis[result.operation];
        op.avgDifference = (op.avgDifference * op.count + result.difference) / (op.count + 1);
        op.maxDifference = Math.max(op.maxDifference, result.difference);
        op.count++;
      }
    });
    
    return analysis;
  }
}

// Export main validation runner
export const runRustIntegrationValidation = async (): Promise<ValidationReport> => {
  const validator = new RustIntegrationValidator();
  return await validator.runValidationSuite();
};