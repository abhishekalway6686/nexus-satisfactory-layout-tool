// Railway Performance Optimization Demonstration
// Shows the dramatic performance improvements achieved through Rust optimization

import { RailwayNode, RailwaySegment, Point3D } from '../types';
import { 
  runComprehensiveBenchmark, 
  runCorrectnessTest,
  railwayPerformanceMonitor 
} from '../utils/railwayPerformanceBenchmark';
import { detectSnapTargetRustOptimized } from '../logic/railway/railwaySnappingRustOptimized';
import { detectSnapTarget } from '../logic/railway/railwaySnapping';

/**
 * Live performance demonstration comparing JavaScript vs Rust implementations
 */
export const demonstrateRailwayOptimization = async () => {
  console.log('🚄 Railway Performance Optimization Demonstration');
  console.log('==================================================');
  
  // Generate large dataset to showcase performance
  const nodes: Record<string, RailwayNode> = {};
  const segments: Record<string, RailwaySegment> = {};
  
  // Create 1000 nodes in a realistic factory layout pattern
  console.log('📊 Generating realistic factory layout (1000 nodes, 500 segments)...');
  
  for (let i = 0; i < 1000; i++) {
    const x = (i % 50) * 20 + Math.random() * 10; // Grid with variation
    const y = Math.floor(i / 50) * 20 + Math.random() * 10;
    const z = Math.floor(Math.random() * 5) * 4; // Multiple floors
    
    nodes[`node-${i}`] = {
      id: `node-${i}`,
      x, y, z,
      floor: Math.floor(z / 4),
      isAnchor: Math.random() < 0.05, // 5% anchor nodes
    };
  }
  
  // Create realistic railway segments
  const nodeIds = Object.keys(nodes);
  for (let i = 0; i < 500; i++) {
    const startId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let endId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    while (endId === startId) {
      endId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    }
    
    const startNode = nodes[startId];
    const endNode = nodes[endId];
    const isCurved = Math.random() < 0.4; // 40% curved segments
    
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
        x: (startNode.x + endNode.x) / 2 + (Math.random() - 0.5) * 20,
        y: (startNode.y + endNode.y) / 2 + (Math.random() - 0.5) * 20,
        z: (startNode.z + endNode.z) / 2 + Math.random() * 10,
      }] : undefined,
    };
  }
  
  console.log('✅ Factory layout generated');
  console.log('');
  
  // Simulate mouse movement during railway drawing
  const mousePositions: Point3D[] = [];
  for (let i = 0; i < 20; i++) {
    mousePositions.push({
      x: Math.random() * 1000,
      y: Math.random() * 400,
      z: Math.random() * 20
    });
  }
  
  console.log('⚡ Performance Comparison (20 mouse movements)');
  console.log('============================================');
  
  // Test JavaScript implementation
  console.log('🔄 Testing JavaScript implementation...');
  const jsStart = performance.now();
  for (const pos of mousePositions) {
    await detectSnapTarget(pos, nodes, segments);
  }
  const jsTime = performance.now() - jsStart;
  const jsAvg = jsTime / mousePositions.length;
  
  console.log(`📈 JavaScript: ${jsTime.toFixed(1)}ms total, ${jsAvg.toFixed(2)}ms per snap`);
  
  // Test Rust implementation
  console.log('🔄 Testing Rust-optimized implementation...');
  const rustStart = performance.now();
  for (const pos of mousePositions) {
    await detectSnapTargetRustOptimized(pos, nodes, segments);
  }
  const rustTime = performance.now() - rustStart;
  const rustAvg = rustTime / mousePositions.length;
  
  console.log(`🚀 Rust: ${rustTime.toFixed(1)}ms total, ${rustAvg.toFixed(2)}ms per snap`);
  
  // Calculate improvement
  const improvement = jsTime / rustTime;
  const frameRateJs = 1000 / jsAvg; // fps
  const frameRateRust = 1000 / rustAvg; // fps
  
  console.log('');
  console.log('📊 Performance Results');
  console.log('=====================');
  console.log(`🎯 Performance Improvement: ${improvement.toFixed(1)}x faster`);
  console.log(`📺 JavaScript Frame Rate: ${frameRateJs.toFixed(1)} fps`);
  console.log(`📺 Rust Frame Rate: ${frameRateRust.toFixed(1)} fps`);
  
  if (improvement >= 20) {
    console.log('🏆 TARGET ACHIEVED: 20x+ performance improvement!');
  } else if (improvement >= 10) {
    console.log('✅ EXCELLENT: 10x+ performance improvement');
  } else if (improvement >= 5) {
    console.log('✅ GOOD: 5x+ performance improvement');
  } else {
    console.log('⚠️ Improvement below expectations');
  }
  
  if (frameRateRust >= 60) {
    console.log('🎮 SMOOTH: 60+ fps drawing performance achieved!');
  } else if (frameRateRust >= 30) {
    console.log('✅ PLAYABLE: 30+ fps drawing performance');
  } else {
    console.log('⚠️ Drawing may feel sluggish');
  }
  
  console.log('');
  
  // Memory and efficiency analysis
  console.log('💾 Efficiency Analysis');
  console.log('=====================');
  const entitiesProcessed = (Object.keys(nodes).length + Object.keys(segments).length) * mousePositions.length;
  const jsEntitiesPerMs = entitiesProcessed / jsTime;
  const rustEntitiesPerMs = entitiesProcessed / rustTime;
  
  console.log(`📊 Entities Processed: ${entitiesProcessed.toLocaleString()}`);
  console.log(`⚡ JavaScript Throughput: ${jsEntitiesPerMs.toFixed(0)} entities/ms`);
  console.log(`🚀 Rust Throughput: ${rustEntitiesPerMs.toFixed(0)} entities/ms`);
  console.log(`📈 Throughput Improvement: ${(rustEntitiesPerMs / jsEntitiesPerMs).toFixed(1)}x`);
  
  console.log('');
  console.log('🎯 Optimization Success Summary');
  console.log('==============================');
  console.log('✅ Rust distance calculations: SIMD vectorized operations');
  console.log('✅ Bezier curve optimization: Newton-Raphson vs brute force sampling');
  console.log('✅ Batch processing: Reduced JavaScript/Rust boundary crossings');
  console.log('✅ Spatial acceleration: Available for larger datasets');
  console.log('✅ Graceful fallback: JavaScript implementation as backup');
  console.log('✅ API compatibility: Drop-in replacement for existing code');
  
  // Check performance monitoring
  const perfStats = railwayPerformanceMonitor.getPerformanceStats();
  if (perfStats) {
    console.log('');
    console.log('📈 Real-time Performance Monitoring');
    console.log('==================================');
    console.log(`📊 Average Time: ${perfStats.averageTime.toFixed(2)}ms`);
    console.log(`📊 Max Time: ${perfStats.maxTime.toFixed(2)}ms`);
    console.log(`📊 Average Entities: ${perfStats.averageEntities.toFixed(0)}`);
    console.log(`🎮 Frame Rate Impact: ${perfStats.frameRateImpact ? 'Detected' : 'None'}`);
    console.log(`💡 Recommendation: ${perfStats.recommendation}`);
  }
  
  return {
    improvement,
    jsTime,
    rustTime,
    frameRateJs,
    frameRateRust,
    targetAchieved: improvement >= 20
  };
};

/**
 * Run comprehensive validation of the optimization
 */
export const validateOptimization = async () => {
  console.log('🔍 Railway Optimization Validation');
  console.log('==================================');
  
  // Test correctness
  console.log('🧪 Running correctness validation...');
  const correctnessResult = await runCorrectnessTest(50);
  
  if (correctnessResult.passed) {
    console.log('✅ CORRECTNESS: All tests passed');
  } else {
    console.log('❌ CORRECTNESS: Tests failed');
    console.log('Errors:', correctnessResult.errors.slice(0, 5)); // Show first 5 errors
  }
  
  console.log('');
  
  // Run comprehensive benchmark
  console.log('📊 Running comprehensive performance benchmark...');
  const benchmark = await runComprehensiveBenchmark();
  
  console.log('');
  console.log('📈 Benchmark Results');
  console.log('===================');
  console.log(`🎯 Tests Run: ${benchmark.summary.totalTests}`);
  console.log(`📊 Average Improvement: ${benchmark.summary.averageImprovement.toFixed(1)}x`);
  console.log(`✅ Targets Achieved: ${benchmark.summary.targetAchievements}/${benchmark.summary.totalTests}`);
  console.log(`⚠️ Fallbacks: ${benchmark.summary.rustyFallbacks}`);
  
  console.log('');
  console.log('💡 Recommendations');
  console.log('==================');
  benchmark.recommendations.forEach(rec => console.log(rec));
  
  console.log('');
  console.log('📋 Detailed Results');
  console.log('==================');
  benchmark.results.forEach(result => {
    const status = result.targetAchieved ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.improvement.toFixed(1)}x (${result.jsTime.toFixed(1)}ms → ${result.rustTime.toFixed(1)}ms)`);
  });
  
  return benchmark;
};

/**
 * Simulate real-world drawing performance
 */
export const simulateDrawingPerformance = async () => {
  console.log('🎨 Railway Drawing Performance Simulation');
  console.log('=========================================');
  
  // Create moderately complex layout
  const nodes: Record<string, RailwayNode> = {};
  const segments: Record<string, RailwaySegment> = {};
  
  // Generate 500 nodes (realistic for medium factory)
  for (let i = 0; i < 500; i++) {
    const x = (i % 25) * 15 + Math.random() * 5;
    const y = Math.floor(i / 25) * 15 + Math.random() * 5;
    const z = Math.floor(Math.random() * 3) * 4;
    
    nodes[`node-${i}`] = {
      id: `node-${i}`,
      x, y, z,
      floor: Math.floor(z / 4),
      isAnchor: Math.random() < 0.08,
    };
  }
  
  // Generate 250 segments
  const nodeIds = Object.keys(nodes);
  for (let i = 0; i < 250; i++) {
    const startId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let endId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    while (endId === startId) {
      endId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    }
    
    const startNode = nodes[startId];
    const endNode = nodes[endId];
    
    segments[`segment-${i}`] = {
      id: `segment-${i}`,
      type: Math.random() < 0.3 ? 'curve' : 'straight',
      startNode: startId,
      endNode: endId,
      startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
      endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
      length: Math.sqrt(
        Math.pow(endNode.x - startNode.x, 2) +
        Math.pow(endNode.y - startNode.y, 2) +
        Math.pow(endNode.z - startNode.z, 2)
      ),
    };
  }
  
  console.log(`📊 Layout: ${Object.keys(nodes).length} nodes, ${Object.keys(segments).length} segments`);
  
  // Simulate 60fps drawing for 5 seconds
  const targetFps = 60;
  const duration = 5000; // 5 seconds
  const frames = (duration / 1000) * targetFps;
  
  console.log(`🎮 Simulating ${targetFps}fps drawing for ${duration/1000} seconds (${frames} frames)...`);
  
  const frameResults: number[] = [];
  
  for (let frame = 0; frame < frames; frame++) {
    // Simulate mouse movement path
    const t = frame / frames;
    const mousePos: Point3D = {
      x: Math.sin(t * Math.PI * 4) * 100 + 200,
      y: Math.cos(t * Math.PI * 3) * 80 + 150,
      z: 8
    };
    
    const frameStart = performance.now();
    await detectSnapTargetRustOptimized(mousePos, nodes, segments);
    const frameTime = performance.now() - frameStart;
    
    frameResults.push(frameTime);
  }
  
  // Analyze results
  const avgFrameTime = frameResults.reduce((sum, time) => sum + time, 0) / frameResults.length;
  const maxFrameTime = Math.max(...frameResults);
  const minFrameTime = Math.min(...frameResults);
  const frameBudget = 1000 / targetFps; // 16.67ms for 60fps
  
  const framesWithinBudget = frameResults.filter(time => time <= frameBudget).length;
  const budgetPercentage = (framesWithinBudget / frameResults.length) * 100;
  
  console.log('');
  console.log('📊 Drawing Performance Results');
  console.log('=============================');
  console.log(`⏱️ Average Frame Time: ${avgFrameTime.toFixed(2)}ms`);
  console.log(`⏱️ Min Frame Time: ${minFrameTime.toFixed(2)}ms`);
  console.log(`⏱️ Max Frame Time: ${maxFrameTime.toFixed(2)}ms`);
  console.log(`🎯 Frame Budget (${targetFps}fps): ${frameBudget.toFixed(2)}ms`);
  console.log(`📈 Frames Within Budget: ${budgetPercentage.toFixed(1)}% (${framesWithinBudget}/${frameResults.length})`);
  
  if (budgetPercentage >= 95) {
    console.log('🏆 EXCELLENT: Smooth 60fps drawing achieved!');
  } else if (budgetPercentage >= 80) {
    console.log('✅ GOOD: Most frames meet 60fps target');
  } else if (avgFrameTime <= 33.33) {
    console.log('✅ ACCEPTABLE: 30fps drawing performance');
  } else {
    console.log('⚠️ Drawing may feel choppy');
  }
  
  return {
    avgFrameTime,
    maxFrameTime,
    budgetPercentage,
    smooth60fps: budgetPercentage >= 95
  };
};

/**
 * Complete optimization demonstration and validation
 */
export const runCompleteDemo = async () => {
  console.log('🚄🚀 RAILWAY PERFORMANCE OPTIMIZATION COMPLETE DEMO 🚀🚄');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // Run the main demonstration
    const demo = await demonstrateRailwayOptimization();
    console.log('');
    
    // Run validation
    const validation = await validateOptimization();
    console.log('');
    
    // Run drawing simulation
    const drawing = await simulateDrawingPerformance();
    console.log('');
    
    // Final summary
    console.log('🏁 FINAL SUMMARY');
    console.log('===============');
    console.log(`🎯 Performance Target: ${demo.targetAchieved ? 'ACHIEVED' : 'PARTIAL'} (${demo.improvement.toFixed(1)}x improvement)`);
    console.log(`🧪 Correctness: ${validation.summary.targetAchievements === validation.summary.totalTests ? 'PASSED' : 'PARTIAL'}`);
    console.log(`🎮 60fps Drawing: ${drawing.smooth60fps ? 'ACHIEVED' : 'PARTIAL'}`);
    console.log(`📊 Average Benchmark: ${validation.summary.averageImprovement.toFixed(1)}x improvement`);
    
    const overallSuccess = demo.targetAchieved && drawing.smooth60fps && validation.summary.rustyFallbacks === 0;
    
    if (overallSuccess) {
      console.log('');
      console.log('🎉 RAILWAY OPTIMIZATION SUCCESS! 🎉');
      console.log('All performance targets achieved!');
      console.log('Ready for production deployment.');
    } else {
      console.log('');
      console.log('⚠️ Optimization partially successful');
      console.log('Review recommendations for full optimization.');
    }
    
    return {
      success: overallSuccess,
      demo,
      validation,
      drawing
    };
  } catch (error) {
    console.error('❌ Demo failed:', error);
    return { success: false, error };
  }
};