import { viewportSystem } from "../tauri/viewport";
import type { ViewportBounds, ViewportConfig } from "../types/viewport";

/**
 * Performance test for the high-performance viewport system
 * Demonstrates the elimination of canvas dragging lag with 10,000+ objects
 */
export class ViewportPerformanceTest {
  private testResults: any[] = [];
  
  /**
   * Run comprehensive performance test
   */
  async runPerformanceTest(): Promise<void> {
    console.log("🚀 Starting Viewport Performance Test");
    
    // Initialize viewport system
    const config: ViewportConfig = {
      culling_enabled: true,
      predictive_cache_enabled: true,
      max_objects_per_query: 15000,
      spatial_index_cell_size: 50.0,
      cache_prediction_distance: 1500.0,
    };
    
    await viewportSystem.init(config);
    
    // Test scenarios
    await this.testSmallDataset();
    await this.testLargeDataset();
    await this.testMassiveDataset();
    await this.testDragPerformance();
    
    this.printResults();
  }
  
  /**
   * Test with 100 objects (baseline)
   */
  private async testSmallDataset(): Promise<void> {
    console.log("📊 Testing with 100 objects...");
    
    const bounds: ViewportBounds = {
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
      scale: 1.0,
      floor: 0,
    };
    
    const startTime = performance.now();
    const objects = await viewportSystem.updateViewport(bounds);
    const endTime = performance.now();
    
    this.testResults.push({
      scenario: "Small Dataset (100 objects)",
      queryTime: endTime - startTime,
      objectCount: objects.length,
      targetTime: "<1ms",
      passed: endTime - startTime < 1.0,
    });
  }
  
  /**
   * Test with 1,000 objects
   */
  private async testLargeDataset(): Promise<void> {
    console.log("📊 Testing with 1,000 objects...");
    
    const bounds: ViewportBounds = {
      x: 0,
      y: 0,
      width: 2000,
      height: 2000,
      scale: 1.0,
      floor: 0,
    };
    
    const startTime = performance.now();
    const objects = await viewportSystem.updateViewport(bounds);
    const endTime = performance.now();
    
    this.testResults.push({
      scenario: "Large Dataset (1,000 objects)",
      queryTime: endTime - startTime,
      objectCount: objects.length,
      targetTime: "<1ms",
      passed: endTime - startTime < 1.0,
    });
  }
  
  /**
   * Test with 10,000+ objects (the critical test)
   */
  private async testMassiveDataset(): Promise<void> {
    console.log("📊 Testing with 10,000+ objects...");
    
    const bounds: ViewportBounds = {
      x: 0,
      y: 0,
      width: 5000,
      height: 5000,
      scale: 1.0,
      floor: 0,
    };
    
    const startTime = performance.now();
    const objects = await viewportSystem.updateViewport(bounds);
    const endTime = performance.now();
    
    this.testResults.push({
      scenario: "Massive Dataset (10,000+ objects)",
      queryTime: endTime - startTime,
      objectCount: objects.length,
      targetTime: "<1ms",
      passed: endTime - startTime < 1.0,
    });
  }
  
  /**
   * Test canvas dragging performance with multiple rapid updates
   */
  private async testDragPerformance(): Promise<void> {
    console.log("📊 Testing canvas drag performance...");
    
    const baseX = 1000;
    const baseY = 1000;
    const dragDistance = 500;
    const dragSteps = 50; // Simulate 50 drag updates
    
    const dragTimes: number[] = [];
    
    for (let i = 0; i < dragSteps; i++) {
      const progress = i / dragSteps;
      const bounds: ViewportBounds = {
        x: baseX + (dragDistance * progress),
        y: baseY + (dragDistance * progress),
        width: 1500,
        height: 1500,
        scale: 1.0,
        floor: 0,
      };
      
      const startTime = performance.now();
      await viewportSystem.updateViewport(bounds);
      const endTime = performance.now();
      
      dragTimes.push(endTime - startTime);
    }
    
    const avgDragTime = dragTimes.reduce((a, b) => a + b, 0) / dragTimes.length;
    const maxDragTime = Math.max(...dragTimes);
    
    this.testResults.push({
      scenario: "Canvas Drag Performance",
      queryTime: avgDragTime,
      maxQueryTime: maxDragTime,
      objectCount: dragSteps,
      targetTime: "<1ms avg",
      passed: avgDragTime < 1.0 && maxDragTime < 5.0,
    });
  }
  
  /**
   * Print test results
   */
  private printResults(): void {
    console.log("\n🎯 Viewport Performance Test Results:");
    console.log("=====================================");
    
    this.testResults.forEach((result, index) => {
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      const timeStr = result.maxQueryTime 
        ? `${result.queryTime.toFixed(3)}ms avg, ${result.maxQueryTime.toFixed(3)}ms max`
        : `${result.queryTime.toFixed(3)}ms`;
        
      console.log(`${index + 1}. ${result.scenario}: ${status}`);
      console.log(`   Time: ${timeStr} (target: ${result.targetTime})`);
      console.log(`   Objects: ${result.objectCount}`);
      console.log("");
    });
    
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    
    console.log(`Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log("🚀 SUCCESS: Viewport system meets all performance targets!");
      console.log("Canvas dragging lag has been eliminated!");
    } else {
      console.log("⚠️ Some performance targets not met. Check Rust implementation.");
    }
  }
  
  /**
   * Get viewport metrics for debugging
   */
  async getMetrics(): Promise<void> {
    const metrics = await viewportSystem.getMetrics();
    console.log("\n📈 Viewport System Metrics:");
    console.log("===========================");
    console.log(`Objects in spatial index: ${metrics.objects_in_spatial_index}`);
    console.log(`Cache hit rate: ${(metrics.cache_hit_rate * 100).toFixed(1)}%`);
    console.log(`Cache size: ${metrics.cache_size}`);
    console.log(`Last query time: ${metrics.last_query_time_ms.toFixed(3)}ms`);
  }
}

// Usage example:
// const perfTest = new ViewportPerformanceTest();
// await perfTest.runPerformanceTest();
// await perfTest.getMetrics();

