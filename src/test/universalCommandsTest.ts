// Universal Commands Test
// Simple test to verify the universal commands wrapper works correctly

import * as UniversalCommands from '../tauri/universalCommands';
import { isTauriEnvironment, isHttpBridgeAvailable } from '../tauri/environment';

/**
 * Test the universal commands wrapper functionality
 */
export async function testUniversalCommands(): Promise<void> {
  console.log('🔬 Testing Universal Commands Wrapper');
  
  // Test environment detection
  console.log('\n1. Testing Environment Detection:');
  const isTauri = isTauriEnvironment();
  const httpBridge = await isHttpBridgeAvailable();
  const envInfo = await UniversalCommands.getEnvironmentInfo();
  
  console.log(`   - Tauri Environment: ${isTauri}`);
  console.log(`   - HTTP Bridge Available: ${httpBridge}`);
  console.log(`   - Backend Available: ${envInfo.backendAvailable}`);
  console.log(`   - Environment Info:`, envInfo);

  // Test basic connection
  console.log('\n2. Testing Rust Connection:');
  try {
    const connectionResult = await UniversalCommands.testRustConnection();
    console.log(`   ✅ Connection Test: ${connectionResult}`);
  } catch (error) {
    console.log(`   ❌ Connection Test Failed: ${error}`);
  }

  // Test distance calculation
  console.log('\n3. Testing Distance Calculation:');
  try {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 3, y: 4, z: 0 }; // Should be distance 5 (3-4-5 triangle)
    
    const distance = await UniversalCommands.calculateDistance3D(p1, p2);
    console.log(`   ✅ Distance (0,0,0) to (3,4,0): ${distance} (expected: 5)`);
    
    if (Math.abs(distance - 5) < 0.001) {
      console.log(`   ✅ Distance calculation correct!`);
    } else {
      console.log(`   ⚠️ Distance calculation may be incorrect`);
    }
  } catch (error) {
    console.log(`   ❌ Distance Calculation Failed: ${error}`);
  }

  // Test curve control point calculation
  console.log('\n4. Testing Curve Control Point:');
  try {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 1, y: 0, z: 0 };
    const p3 = { x: 1, y: 1, z: 0 };
    
    const controlPoint = await UniversalCommands.calculateCurveControlPointExact(p1, p2, p3);
    console.log(`   ✅ Curve Control Point:`, controlPoint);
    console.log(`   - Should be near (1,0,0) with slight offset for the 90° turn`);
  } catch (error) {
    console.log(`   ❌ Curve Control Point Failed: ${error}`);
  }

  // Test Bezier curve generation
  console.log('\n5. Testing Bezier Curve Generation:');
  try {
    const start = { x: 0, y: 0, z: 0 };
    const control = { x: 0.5, y: 0.5, z: 0 };
    const end = { x: 1, y: 0, z: 0 };
    
    const points = await UniversalCommands.getQuadraticBezierPoints(start, control, end, 5);
    console.log(`   ✅ Bezier Curve Points (5 points):`, points.length);
    console.log(`   - First point:`, points[0]);
    console.log(`   - Last point:`, points[points.length - 1]);
    
    if (points.length === 6) { // 0 to 5 inclusive = 6 points
      console.log(`   ✅ Correct number of points generated`);
    } else {
      console.log(`   ⚠️ Unexpected number of points: ${points.length} (expected 6)`);
    }
  } catch (error) {
    console.log(`   ❌ Bezier Curve Generation Failed: ${error}`);
  }

  // Test spatial query
  console.log('\n6. Testing Spatial Query:');
  try {
    const center = { x: 0, y: 0, z: 0 };
    const radius = 10;
    
    const result = await UniversalCommands.spatialQueryBuildings(center, radius, []);
    console.log(`   ✅ Spatial Query Result:`, {
      buildingCount: result.buildings.length,
      queryTime: result.queryTimeMs
    });
  } catch (error) {
    console.log(`   ❌ Spatial Query Failed: ${error}`);
  }

  // Test universal spatial query
  console.log('\n7. Testing Universal Spatial Query:');
  try {
    const center = { x: 0, y: 0, z: 0 };
    const radius = 10;
    const options = {
      exclude_ids: [],
      include_buildings: true,
      include_railway_nodes: true,
      include_conveyor_poles: true,
      include_pipe_supports: true,
    };
    
    const result = await UniversalCommands.universalSpatialQuery(center, radius, options);
    console.log(`   ✅ Universal Spatial Query Result:`, {
      buildings: result.buildings.length,
      railwayNodes: result.railway_nodes.length,
      conveyorPoles: result.conveyor_poles.length,
      pipeSupports: result.pipe_supports.length
    });
  } catch (error) {
    console.log(`   ❌ Universal Spatial Query Failed: ${error}`);
  }

  console.log('\n🎯 Universal Commands Test Complete!');
}

/**
 * Run the test when this module is executed directly
 */
if (typeof window !== 'undefined') {
  // Browser environment - add to window object for manual testing
  (window as any).testUniversalCommands = testUniversalCommands;
  
  // Auto-run the test after a short delay to allow initialization
  setTimeout(() => {
    testUniversalCommands().catch(error => {
      console.error('Universal Commands Test Failed:', error);
    });
  }, 1000);
}

export default testUniversalCommands;