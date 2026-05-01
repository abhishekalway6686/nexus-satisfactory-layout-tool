// src/utils/performanceMonitor.ts
// Performance monitoring utilities for canvas drag operations

interface PerformanceMetrics {
  avgFps: number;
  avgFrameTime: number;
  minFps: number;
  maxFrameTime: number;
  frameDrops: number;
  totalFrames: number;
  duration: number;
}

interface PerformanceMonitorOptions {
  duration?: number; // Duration in ms (default: 5000ms)
  frameDropThreshold?: number; // Consider frame dropped if > this ms (default: 20ms)
  logToConsole?: boolean; // Log results to console (default: true)
  onComplete?: (metrics: PerformanceMetrics) => void;
}

/**
 * Monitors frame rate during canvas operations
 * Usage: const monitor = createPerformanceMonitor(); monitor.start();
 */
export class PerformanceMonitor {
  private frames: number[] = [];
  private frameCount = 0;
  private startTime = 0;
  private frameDrops = 0;
  private isRunning = false;
  private rafId: number | null = null;
  private options: Required<PerformanceMonitorOptions>;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.options = {
      duration: options.duration ?? 5000,
      frameDropThreshold: options.frameDropThreshold ?? 20,
      logToConsole: options.logToConsole ?? true,
      onComplete: options.onComplete ?? (() => {}),
    };
  }

  start(): void {
    if (this.isRunning) {
      console.warn('Performance monitor already running');
      return;
    }

    this.reset();
    this.isRunning = true;
    this.startTime = performance.now();

    if (this.options.logToConsole) {
      console.log('🎯 Performance monitoring started...');
      console.log(`Measuring for ${this.options.duration}ms`);
      console.log('Perform canvas drag operation now!');
    }

    this.measureFrame(this.startTime);
  }

  stop(): PerformanceMetrics | null {
    if (!this.isRunning) {
      console.warn('Performance monitor not running');
      return null;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.isRunning = false;
    return this.calculateMetrics();
  }

  private reset(): void {
    this.frames = [];
    this.frameCount = 0;
    this.startTime = 0;
    this.frameDrops = 0;
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private measureFrame = (timestamp: number): void => {
    if (!this.isRunning) return;

    // Calculate frame time
    if (this.frames.length > 0) {
      const frameTime = timestamp - this.frames[this.frames.length - 1];
      this.frameCount++;

      // Detect frame drops
      if (frameTime > this.options.frameDropThreshold) {
        this.frameDrops++;
        if (this.options.logToConsole) {
          console.warn(`⚠️ Frame drop: ${frameTime.toFixed(2)}ms`);
        }
      }
    }

    this.frames.push(timestamp);

    // Check if duration reached
    const elapsed = timestamp - this.startTime;
    if (elapsed >= this.options.duration) {
      const metrics = this.calculateMetrics();
      this.isRunning = false;
      this.logResults(metrics);
      this.options.onComplete(metrics);
      return;
    }

    // Schedule next frame
    this.rafId = requestAnimationFrame(this.measureFrame);
  };

  private calculateMetrics(): PerformanceMetrics {
    if (this.frames.length < 2) {
      return {
        avgFps: 0,
        avgFrameTime: 0,
        minFps: 0,
        maxFrameTime: 0,
        frameDrops: 0,
        totalFrames: 0,
        duration: 0,
      };
    }

    const duration = this.frames[this.frames.length - 1] - this.frames[0];
    const frameTimes: number[] = [];
    let maxFrameTime = 0;

    for (let i = 1; i < this.frames.length; i++) {
      const frameTime = this.frames[i] - this.frames[i - 1];
      frameTimes.push(frameTime);
      maxFrameTime = Math.max(maxFrameTime, frameTime);
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const avgFps = 1000 / avgFrameTime;
    const minFps = 1000 / maxFrameTime;

    return {
      avgFps: Math.round(avgFps * 100) / 100,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      minFps: Math.round(minFps * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100,
      frameDrops: this.frameDrops,
      totalFrames: this.frameCount,
      duration: Math.round(duration),
    };
  }

  private logResults(metrics: PerformanceMetrics): void {
    if (!this.options.logToConsole) return;

    console.log('\n📊 === PERFORMANCE RESULTS ===');
    console.log(`Duration: ${metrics.duration}ms`);
    console.log(`Total Frames: ${metrics.totalFrames}`);
    console.log(`Average FPS: ${metrics.avgFps}`);
    console.log(`Average Frame Time: ${metrics.avgFrameTime}ms`);
    console.log(`Min FPS (worst frame): ${metrics.minFps}`);
    console.log(`Max Frame Time (worst): ${metrics.maxFrameTime}ms`);
    console.log(`Frame Drops (>${this.options.frameDropThreshold}ms): ${metrics.frameDrops}`);
    console.log(`\nTarget: 60fps (16.67ms/frame)`);

    // Determine pass/fail
    const passed = metrics.avgFps >= 58 && metrics.frameDrops < metrics.totalFrames * 0.05;
    console.log(`\nResult: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (!passed) {
      console.log('\n⚠️ Performance issues detected:');
      if (metrics.avgFps < 58) {
        console.log(`- Average FPS too low: ${metrics.avgFps} (need 58+)`);
      }
      if (metrics.frameDrops > metrics.totalFrames * 0.05) {
        console.log(`- Too many frame drops: ${metrics.frameDrops} (>${Math.round(metrics.totalFrames * 0.05)} is bad)`);
      }
      console.log('\nCheck Chrome DevTools Performance tab for details.');
    }
  }
}

/**
 * Quick performance test - run in browser console
 * Returns a promise that resolves with metrics after monitoring
 */
export function testCanvasPerformance(duration = 5000): Promise<PerformanceMetrics> {
  return new Promise((resolve) => {
    const monitor = new PerformanceMonitor({
      duration,
      logToConsole: true,
      onComplete: (metrics) => resolve(metrics),
    });

    monitor.start();
  });
}

/**
 * Expose to window for easy console access
 * Usage: window.testPerformance()
 */
if (typeof window !== 'undefined') {
  (window as any).testPerformance = testCanvasPerformance;
  (window as any).PerformanceMonitor = PerformanceMonitor;
}

// Export for testing
export default PerformanceMonitor;
