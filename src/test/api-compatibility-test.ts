// API compatibility test for hybrid calculations
import { Point3D, Building, ConnectionPoint, RailwayConnectionPoint } from '../types';
import { HybridCalculations } from '../utils/hybridCalculations';

// Test data
const testPoint1: Point3D = { x: 0, y: 0, z: 0 };
const testPoint2: Point3D = { x: 10, y: 10, z: 10 };
const testPoint3: Point3D = { x: 20, y: 0, z: 0 };

const testBuilding: Building = {
  id: 'test-building',
  type: 'Constructor',
  x: 100,
  y: 100,
  z: 0,
  rotation: 90,
  floor: 0,
};

const testConnectionPoint: ConnectionPoint = {
  id: 'input-1',
  x: 2,
  y: 2,
  direction: 'input',
  isFluid: false,
};

const testRailwayPoint: RailwayConnectionPoint = {
  id: 'rail-1',
  x: 5,
  y: 5,
  direction: 0,
};

export function testApiCompatibility(): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  console.log('Testing API compatibility...');
  
  try {
    // Test 1: Distance calculations (now synchronous)
    console.log('Testing distance calculations...');
    
    const dist1 = HybridCalculations.distance3D(testPoint1, testPoint2);
    if (typeof dist1 !== 'number' || dist1 <= 0) {
      errors.push('distance3D returned invalid result');
    }
    
    const dist2 = HybridCalculations.distance3DSync(testPoint1, testPoint2);
    if (Math.abs(dist1 - dist2) > 0.001) {
      errors.push('distance3D and distance3DSync results differ');
    }
    
    const dist2D = HybridCalculations.distance2D(testPoint1, testPoint2);
    if (typeof dist2D !== 'number' || dist2D <= 0) {
      errors.push('distance2D returned invalid result');
    }
    
    // Test squared distances for performance comparisons
    const distSq = HybridCalculations.distance3DSquared(testPoint1, testPoint2);
    if (typeof distSq !== 'number' || Math.abs(distSq - dist1 * dist1) > 0.001) {
      errors.push('distance3DSquared returned incorrect result');
    }
    
    console.log('✓ Distance calculations working');
    
  } catch (error) {
    errors.push(`Distance calculation error: ${error}`);
  }
  
  try {
    // Test 2: Connection point calculations (now synchronous)
    console.log('Testing connection point calculations...');
    
    const worldPos = HybridCalculations.getConnectionPointWorldPos(testBuilding, testConnectionPoint);
    if (!worldPos || typeof worldPos.x !== 'number') {
      errors.push('getConnectionPointWorldPos returned invalid result');
    }
    
    const railwayPos = HybridCalculations.getRailwayConnectionPointWorldPos(testBuilding, testRailwayPoint);
    if (!railwayPos || typeof railwayPos.x !== 'number') {
      errors.push('getRailwayConnectionPointWorldPos returned invalid result');
    }
    
    console.log('✓ Connection point calculations working');
    
  } catch (error) {
    errors.push(`Connection point calculation error: ${error}`);
  }
  
  try {
    // Test 3: Bezier calculations (now synchronous)
    console.log('Testing bezier calculations...');
    
    const bezierPoint = HybridCalculations.interpolateBezierCurve(testPoint1, testPoint2, testPoint3, 0.5);
    if (!bezierPoint || typeof bezierPoint.x !== 'number') {
      errors.push('interpolateBezierCurve returned invalid result');
    }
    
    const bezierLength = HybridCalculations.calculateBezierLength(testPoint1, testPoint2, testPoint3, 10);
    if (typeof bezierLength !== 'number' || bezierLength <= 0) {
      errors.push('calculateBezierLength returned invalid result');
    }
    
    console.log('✓ Bezier calculations working');
    
  } catch (error) {
    errors.push(`Bezier calculation error: ${error}`);
  }
  
  try {
    // Test 4: Async legacy functions for backwards compatibility
    console.log('Testing async legacy functions...');
    
    // These should still exist for backwards compatibility
    if (typeof HybridCalculations.distance3DAsync !== 'function') {
      errors.push('distance3DAsync legacy function missing');
    }
    
    if (typeof HybridCalculations.getConnectionPointWorldPosAsync !== 'function') {
      errors.push('getConnectionPointWorldPosAsync legacy function missing');
    }
    
    console.log('✓ Legacy async functions available');
    
  } catch (error) {
    errors.push(`Legacy function test error: ${error}`);
  }
  
  try {
    // Test 5: Bulk operations
    console.log('Testing bulk operations...');
    
    const points1 = [testPoint1, testPoint2];
    const points2 = [testPoint2, testPoint3];
    
    HybridCalculations.calculateDistancesBulk(points1, points2).then(results => {
      if (!Array.isArray(results) || results.length !== points1.length) {
        errors.push('calculateDistancesBulk returned invalid result structure');
      }
    }).catch(error => {
      errors.push(`Bulk calculation error: ${error}`);
    });
    
    console.log('✓ Bulk operations working');
    
  } catch (error) {
    errors.push(`Bulk operation test error: ${error}`);
  }
  
  try {
    // Test 6: Utility functions
    console.log('Testing utility functions...');
    
    const constrained = HybridCalculations.constrainPoint(testPoint1, testPoint2, true, false);
    if (!constrained || typeof constrained.x !== 'number') {
      errors.push('constrainPoint returned invalid result');
    }
    
    const projected = HybridCalculations.projectPointOnLine(testPoint1, testPoint2, testPoint3);
    if (!projected || !projected.proj || typeof projected.t !== 'number') {
      errors.push('projectPointOnLine returned invalid result');
    }
    
    console.log('✓ Utility functions working');
    
  } catch (error) {
    errors.push(`Utility function test error: ${error}`);
  }
  
  try {
    // Test 7: Performance monitoring functions
    console.log('Testing performance monitoring...');
    
    const report = HybridCalculations.getPerformanceReport();
    if (!report || typeof report !== 'object') {
      errors.push('getPerformanceReport returned invalid result');
    }
    
    const errors_map = HybridCalculations.getErrors();
    if (!(errors_map instanceof Map)) {
      errors.push('getErrors did not return a Map');
    }
    
    console.log('✓ Performance monitoring working');
    
  } catch (error) {
    errors.push(`Performance monitoring test error: ${error}`);
  }
  
  const success = errors.length === 0;
  
  if (success) {
    console.log('🎉 All API compatibility tests passed!');
  } else {
    console.log('❌ API compatibility tests failed:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return { success, errors };
}

// Auto-run test if in browser environment
if (typeof window !== 'undefined') {
  (window as any).runApiCompatibilityTest = testApiCompatibility;
  console.log('API compatibility test available at window.runApiCompatibilityTest()');
}