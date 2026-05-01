// Performance test for hybrid calculations optimization
import { Point3D } from '../types';
import { HybridCalculations } from '../utils/hybridCalculations';
import { distance3D } from '../utils/helpers';

// Test data
const testPoints: Point3D[] = [
  { x: 0, y: 0, z: 0 },
  { x: 10, y: 10, z: 10 },
  { x: 20, y: 20, z: 20 },
  { x: 30, y: 30, z: 30 },
  { x: 40, y: 40, z: 40 },
];

// Performance test function
export async function performanceTest() {
  console.log('Starting performance tests...');
  
  // Test 1: Individual distance calculations (should be very fast now)
  console.log('\n--- Test 1: Individual Distance Calculations ---');
  const iterations = 10000;
  
  // Test old approach (direct JS)
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    distance3D(testPoints[0], testPoints[1]);
  }
  const jsTime = performance.now() - jsStart;
  
  // Test new hybrid approach (should be same speed as JS)
  const hybridStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    HybridCalculations.distance3D(testPoints[0], testPoints[1]);
  }
  const hybridTime = performance.now() - hybridStart;
  
  console.log(`Direct JS: ${(jsTime / iterations * 1000).toFixed(3)}μs per operation`);
  console.log(`Hybrid (optimized): ${(hybridTime / iterations * 1000).toFixed(3)}μs per operation`);
  console.log(`Ratio: ${(hybridTime / jsTime).toFixed(2)}x (should be ~1.0)`);
  
  // Test 2: Connection point calculations
  console.log('\n--- Test 2: Connection Point Calculations ---');
  const mockBuilding = {
    id: 'test-building',
    type: 'Constructor',
    x: 100,
    y: 100,
    z: 0,
    rotation: 0,
    floor: 0,
  };
  
  const mockConnectionPoint = {
    id: 'input-1',
    x: 2,
    y: 2,
    direction: 'input' as const,
    isFluid: false,
  };
  
  const connectionStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    HybridCalculations.getConnectionPointWorldPos(mockBuilding, mockConnectionPoint);
  }
  const connectionTime = performance.now() - connectionStart;
  
  console.log(`Connection point calculation: ${(connectionTime / 1000 * 1000).toFixed(3)}μs per operation`);
  console.log('Expected: <50μs per operation (massive improvement from 25ms)');
  
  // Test 3: Bezier curve calculations
  console.log('\n--- Test 3: Bezier Curve Calculations ---');
  const curveStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    HybridCalculations.interpolateBezierCurve(
      testPoints[0],
      testPoints[1],
      testPoints[2],
      0.5
    );
  }
  const curveTime = performance.now() - curveStart;
  
  console.log(`Bezier interpolation: ${(curveTime / 1000 * 1000).toFixed(3)}μs per operation`);
  console.log('Expected: Very fast (no async overhead)');
  
  // Test 4: Bulk operations (should prefer JS for reasonable sizes)
  console.log('\n--- Test 4: Bulk Distance Calculations ---');
  const bulkPoints1 = Array(50).fill(null).map((_, i) => ({
    x: i * 10,
    y: i * 10,
    z: i * 10,
  }));
  const bulkPoints2 = Array(50).fill(null).map((_, i) => ({
    x: i * 10 + 5,
    y: i * 10 + 5,
    z: i * 10 + 5,
  }));
  
  const bulkStart = performance.now();
  await HybridCalculations.calculateDistancesBulk(bulkPoints1, bulkPoints2);
  const bulkTime = performance.now() - bulkStart;
  
  console.log(`Bulk calculation (50 items): ${bulkTime.toFixed(3)}ms`);
  console.log('Expected: Fast (should use JS for medium-sized operations)');
  
  // Generate performance report
  console.log('\n--- Performance Report ---');
  const report = HybridCalculations.getPerformanceReport();
  console.log('Call frequencies:', report.callFrequencies);
  console.log('Performance metrics:', report.performanceMetrics);
  console.log('Recommendations:', report.recommendations);
  
  console.log('\nPerformance tests completed!');
  
  return {
    individualDistanceTime: hybridTime / iterations * 1000000, // microseconds
    connectionPointTime: connectionTime / 1000 * 1000000, // microseconds
    bezierTime: curveTime / 1000 * 1000000, // microseconds
    bulkTime: bulkTime,
    jsToHybridRatio: hybridTime / jsTime,
  };
}

// Run performance test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for manual testing
  (window as any).runPerformanceTest = performanceTest;
  console.log('Performance test available at window.runPerformanceTest()');
}