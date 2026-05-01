// Performance validation test for building detection optimizations
// Tests the improvements made to prevent FPS drops from 61fps to 20fps during mouse hover

import { SpatialIndexManager } from '../store/spatialIndexManager';
import { BUILDING_TYPES } from '../constants';
import { Building, Point3D } from '../types';

interface PerformanceTestResult {
  averageTime: number;
  minTime: number;
  maxTime: number;
  operations: number;
  fps: number;
}

// Mock buildings for testing
const createMockBuildings = (count: number): Record<string, Building> => {
  const buildings: Record<string, Building> = {};
  
  for (let i = 0; i < count; i++) {
    const buildingId = `building_${i}`;
    buildings[buildingId] = {
      id: buildingId,
      type: 'train_station',
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: 0,
      floor: 0,
      rotation: 0,
    };
  }
  
  return buildings;
};

// Test O(n) building detection (original approach)
const testLinearDetection = (buildings: Record<string, Building>, testPoint: Point3D, iterations: number): PerformanceTestResult => {
  const times: number[] = [];
  const threshold = 5.0; // 5 meter threshold
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    // Simulate original O(n) approach
    const potentialConnections = [];
    for (const [buildingId, building] of Object.entries(buildings)) {
      // Floor validation
      if (Math.abs(building.z - testPoint.z) > 0.1) continue;
      
      const buildingDef = BUILDING_TYPES[building.type];
      if (!buildingDef?.railwayPoints || buildingDef.railwayPoints.length === 0) continue;
      
      // Distance calculation
      const buildingCenter = {
        x: building.x + buildingDef.width / 2,
        y: building.y + buildingDef.height / 2,
        z: building.z
      };
      const dx = testPoint.x - buildingCenter.x;
      const dy = testPoint.y - buildingCenter.y;
      const dz = testPoint.z - buildingCenter.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const maxBuildingDimension = Math.max(buildingDef.width, buildingDef.height);
      if (distance <= threshold + maxBuildingDimension) {
        potentialConnections.push({ buildingId, distance });
      }
    }
    
    const endTime = performance.now();
    times.push(endTime - startTime);
  }
  
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return {
    averageTime,
    minTime,
    maxTime,
    operations: iterations,
    fps: 1000 / averageTime // Approximate FPS if this ran every frame
  };
};

// Test O(log n) spatial index detection (optimized approach)
const testSpatialDetection = (spatialManager: SpatialIndexManager, testPoint: Point3D, iterations: number): PerformanceTestResult => {
  const times: number[] = [];
  const threshold = 5.0; // 5 meter threshold
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    // Use spatial indexing
    const candidateBuildings = spatialManager.findNearbyBuildings(testPoint, threshold + 15, []);
    
    // Process only spatially-filtered candidates
    const potentialConnections = [];
    for (const building of candidateBuildings) {
      // Floor validation
      if (Math.abs(building.z - testPoint.z) > 0.1) continue;
      
      const buildingDef = BUILDING_TYPES[building.type];
      if (!buildingDef?.railwayPoints || buildingDef.railwayPoints.length === 0) continue;
      
      // Distance calculation
      const buildingCenter = {
        x: building.x + buildingDef.width / 2,
        y: building.y + buildingDef.height / 2,
        z: building.z
      };
      const dx = testPoint.x - buildingCenter.x;
      const dy = testPoint.y - buildingCenter.y;
      const dz = testPoint.z - buildingCenter.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const maxBuildingDimension = Math.max(buildingDef.width, buildingDef.height);
      if (distance <= threshold + maxBuildingDimension) {
        potentialConnections.push({ buildingId: building.id, distance });
      }
    }
    
    const endTime = performance.now();
    times.push(endTime - startTime);
  }
  
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return {
    averageTime,
    minTime,
    maxTime,
    operations: iterations,
    fps: 1000 / averageTime // Approximate FPS if this ran every frame
  };
};

// Run performance comparison test
export const validatePerformanceImprovements = (buildingCount: number = 1000, iterations: number = 100): {
  linear: PerformanceTestResult;
  spatial: PerformanceTestResult;
  improvement: {
    speedupFactor: number;
    fpsImprovement: number;
    timeReduction: number;
  };
} => {
  console.log(`🧪 Running performance validation with ${buildingCount} buildings, ${iterations} iterations`);
  
  // Create test data
  const buildings = createMockBuildings(buildingCount);
  const testPoint: Point3D = { x: 500, y: 500, z: 0 };
  
  // Initialize spatial index
  const spatialManager = new SpatialIndexManager();
  spatialManager.initializeBuildings(buildings);
  
  console.log('⚡ Testing linear O(n) detection...');
  const linearResults = testLinearDetection(buildings, testPoint, iterations);
  
  console.log('🚀 Testing spatial O(log n) detection...');
  const spatialResults = testSpatialDetection(spatialManager, testPoint, iterations);
  
  const speedupFactor = linearResults.averageTime / spatialResults.averageTime;
  const fpsImprovement = spatialResults.fps - linearResults.fps;
  const timeReduction = ((linearResults.averageTime - spatialResults.averageTime) / linearResults.averageTime) * 100;
  
  console.log('📊 Performance Results:');
  console.log(`Linear (O(n)): ${linearResults.averageTime.toFixed(3)}ms avg, ~${linearResults.fps.toFixed(1)}fps`);
  console.log(`Spatial (O(log n)): ${spatialResults.averageTime.toFixed(3)}ms avg, ~${spatialResults.fps.toFixed(1)}fps`);
  console.log(`🎯 Improvement: ${speedupFactor.toFixed(1)}x faster, +${fpsImprovement.toFixed(1)} FPS, ${timeReduction.toFixed(1)}% time reduction`);
  
  return {
    linear: linearResults,
    spatial: spatialResults,
    improvement: {
      speedupFactor,
      fpsImprovement,
      timeReduction
    }
  };
};

// Verify that optimizations maintain 60fps target
export const validateFPSTarget = (buildingCount: number = 1000): boolean => {
  const testPoint: Point3D = { x: 500, y: 500, z: 0 };
  const buildings = createMockBuildings(buildingCount);
  
  const spatialManager = new SpatialIndexManager();
  spatialManager.initializeBuildings(buildings);
  
  // Test single operation time
  const startTime = performance.now();
  const candidates = spatialManager.findNearbyBuildings(testPoint, 20, []);
  const endTime = performance.now();
  
  const operationTime = endTime - startTime;
  const estimatedFPS = 1000 / operationTime;
  
  console.log(`🎯 FPS Validation: ${operationTime.toFixed(3)}ms per operation, estimated ~${estimatedFPS.toFixed(1)}fps`);
  
  // Should maintain >60fps even with large building counts
  const targetMet = estimatedFPS > 60;
  console.log(`✅ 60fps target: ${targetMet ? 'PASSED' : 'FAILED'}`);
  
  return targetMet;
};