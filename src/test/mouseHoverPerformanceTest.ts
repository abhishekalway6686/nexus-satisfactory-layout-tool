// Performance test for mouse hover optimization
// This test validates that mouse hover maintains 50+ FPS

export interface PerformanceTestResult {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameDrops: number;
  testDuration: number;
  mouseMovements: number;
}

export class MouseHoverPerformanceTest {
  private frameCount = 0;
  private startTime = 0;
  private minFPS = Infinity;
  private maxFPS = 0;
  private frameDrops = 0;
  private mouseMovements = 0;
  private lastFrameTime = 0;
  private isRunning = false;
  private testDuration = 0;

  startTest(durationMs: number = 10000): Promise<PerformanceTestResult> {
    return new Promise((resolve) => {
      this.resetCounters();
      this.isRunning = true;
      this.startTime = performance.now();

      const measureFrame = () => {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        if (this.lastFrameTime > 0) {
          const fps = 1000 / deltaTime;
          
          this.minFPS = Math.min(this.minFPS, fps);
          this.maxFPS = Math.max(this.maxFPS, fps);
          
          // Count frame drops (below 50 FPS)
          if (fps < 50) {
            this.frameDrops++;
          }
          
          this.frameCount++;
        }
        
        this.lastFrameTime = now;
        this.testDuration = now - this.startTime;

        if (this.testDuration < durationMs) {
          requestAnimationFrame(measureFrame);
        } else {
          this.stopTest();
          resolve(this.getResults());
        }
      };

      // Start the frame measurement
      requestAnimationFrame(measureFrame);

      // Simulate mouse movements during test
      this.simulateMouseMovements(durationMs);
    });
  }

  private simulateMouseMovements(durationMs: number) {
    const moveInterval = 16; // ~60fps mouse movements
    const totalMoves = Math.floor(durationMs / moveInterval);
    let moveCount = 0;

    const mouseTimer = setInterval(() => {
      if (!this.isRunning || moveCount >= totalMoves) {
        clearInterval(mouseTimer);
        return;
      }

      // Simulate mouse movement events
      const mockEvent = new MouseEvent('mousemove', {
        clientX: 100 + Math.sin(moveCount * 0.1) * 500,
        clientY: 100 + Math.cos(moveCount * 0.1) * 300
      });

      // Dispatch to any canvas elements found
      const canvasElements = document.querySelectorAll('canvas');
      canvasElements.forEach(canvas => {
        canvas.dispatchEvent(mockEvent);
      });

      this.mouseMovements++;
      moveCount++;
    }, moveInterval);
  }

  private resetCounters() {
    this.frameCount = 0;
    this.minFPS = Infinity;
    this.maxFPS = 0;
    this.frameDrops = 0;
    this.mouseMovements = 0;
    this.lastFrameTime = 0;
    this.testDuration = 0;
  }

  private stopTest() {
    this.isRunning = false;
  }

  private getResults(): PerformanceTestResult {
    const averageFPS = this.frameCount > 0 ? (this.frameCount * 1000) / this.testDuration : 0;
    
    return {
      averageFPS: Math.round(averageFPS * 100) / 100,
      minFPS: this.minFPS === Infinity ? 0 : Math.round(this.minFPS * 100) / 100,
      maxFPS: Math.round(this.maxFPS * 100) / 100,
      frameDrops: this.frameDrops,
      testDuration: Math.round(this.testDuration),
      mouseMovements: this.mouseMovements
    };
  }
}

// Helper function to run the test
export async function testMouseHoverPerformance(durationMs: number = 10000): Promise<PerformanceTestResult> {
  const test = new MouseHoverPerformanceTest();
  return test.startTest(durationMs);
}

// Console test runner for development
if (typeof window !== 'undefined') {
  (window as any).runMouseHoverPerformanceTest = async (duration = 10000) => {
    console.log('🚀 Starting mouse hover performance test...');
    console.log(`📊 Test duration: ${duration}ms`);
    
    const result = await testMouseHoverPerformance(duration);
    
    console.log('📈 Performance Test Results:');
    console.log(`  Average FPS: ${result.averageFPS}`);
    console.log(`  Min FPS: ${result.minFPS}`);
    console.log(`  Max FPS: ${result.maxFPS}`);
    console.log(`  Frame drops (< 50 FPS): ${result.frameDrops}`);
    console.log(`  Mouse movements: ${result.mouseMovements}`);
    console.log(`  Test duration: ${result.testDuration}ms`);
    
    const passThreshold = 50; // 50 FPS minimum
    const passed = result.averageFPS >= passThreshold && result.frameDrops < result.frameCount * 0.1;
    
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Average FPS ${passed ? '>=' : '<'} ${passThreshold}`);
    
    return result;
  };
}