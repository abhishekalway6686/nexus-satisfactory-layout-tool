/**
 * Performance Monitor - Tracks WebGL rendering performance metrics
 */

import { RenderStats, PerformanceProfile } from '../types';

export class PerformanceMonitor {
  private frameStartTime: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private profiles: Map<string, PerformanceProfile> = new Map();
  
  private drawCallCount: number = 0;
  private triangleCount: number = 0;
  
  // Configuration
  private maxHistorySize: number = 60; // 1 second at 60fps
  private profileSampleSize: number = 100;

  constructor() {
    this.reset();
  }

  public startFrame(): void {
    this.frameStartTime = performance.now();
    this.resetFrameCounters();
  }

  public endFrame(): void {
    const frameEndTime = performance.now();
    const frameTime = frameEndTime - this.frameStartTime;
    
    this.lastFrameTime = frameTime;
    this.frameCount++;
    
    // Update frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate FPS
    const fps = Math.round(1000 / frameTime);
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
    }
  }

  public startProfile(name: string): void {
    if (!this.profiles.has(name)) {
      this.profiles.set(name, {
        name,
        samples: [],
        average: 0,
        min: Infinity,
        max: 0,
        total: 0
      });
    }
    
    // Store start time on the profile
    const profile = this.profiles.get(name)!;
    (profile as any).startTime = performance.now();
  }

  public endProfile(name: string): void {
    const endTime = performance.now();
    const profile = this.profiles.get(name);
    
    if (!profile || !(profile as any).startTime) {
      console.warn(`Profile not found or not started: ${name}`);
      return;
    }
    
    const duration = endTime - (profile as any).startTime;
    delete (profile as any).startTime;
    
    // Add sample
    profile.samples.push(duration);
    if (profile.samples.length > this.profileSampleSize) {
      profile.samples.shift();
    }
    
    // Update statistics
    profile.total += duration;
    profile.min = Math.min(profile.min, duration);
    profile.max = Math.max(profile.max, duration);
    profile.average = profile.samples.reduce((a, b) => a + b, 0) / profile.samples.length;
  }

  public addDrawCall(triangles: number = 0): void {
    this.drawCallCount++;
    this.triangleCount += triangles;
  }

  public getStats(): RenderStats {
    const currentFps = this.fpsHistory.length > 0 
      ? this.fpsHistory[this.fpsHistory.length - 1] 
      : 0;
    
    return {
      frameTime: this.lastFrameTime,
      drawCalls: this.drawCallCount,
      triangles: this.triangleCount,
      bufferMemory: 0, // Will be updated by BufferManager
      textureMemory: 0, // Will be updated by TextureManager
      fps: currentFps
    };
  }

  public getAverageStats(): {
    averageFps: number;
    averageFrameTime: number;
    minFps: number;
    maxFps: number;
    minFrameTime: number;
    maxFrameTime: number;
  } {
    if (this.fpsHistory.length === 0) {
      return {
        averageFps: 0,
        averageFrameTime: 0,
        minFps: 0,
        maxFps: 0,
        minFrameTime: 0,
        maxFrameTime: 0
      };
    }

    const averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const minFps = Math.min(...this.fpsHistory);
    const maxFps = Math.max(...this.fpsHistory);
    const minFrameTime = Math.min(...this.frameTimeHistory);
    const maxFrameTime = Math.max(...this.frameTimeHistory);

    return {
      averageFps: Math.round(averageFps),
      averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      minFps,
      maxFps,
      minFrameTime: Math.round(minFrameTime * 100) / 100,
      maxFrameTime: Math.round(maxFrameTime * 100) / 100
    };
  }

  public getProfile(name: string): PerformanceProfile | undefined {
    return this.profiles.get(name);
  }

  public getAllProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }

  public getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }

  public getFrameTimeHistory(): number[] {
    return [...this.frameTimeHistory];
  }

  public isPerformanceGood(): boolean {
    const stats = this.getAverageStats();
    return stats.averageFps >= 30 && stats.averageFrameTime <= 16.67; // 60fps target
  }

  public getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const stats = this.getAverageStats();
    
    if (stats.averageFps >= 55) return 'excellent';
    if (stats.averageFps >= 40) return 'good';
    if (stats.averageFps >= 25) return 'fair';
    return 'poor';
  }

  public getBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const stats = this.getStats();
    const averageStats = this.getAverageStats();
    
    if (averageStats.averageFps < 30) {
      bottlenecks.push('Low FPS - Consider reducing quality settings');
    }
    
    if (averageStats.averageFrameTime > 20) {
      bottlenecks.push('High frame time - GPU may be overloaded');
    }
    
    if (stats.drawCalls > 1000) {
      bottlenecks.push('High draw call count - Consider batching');
    }
    
    if (stats.triangles > 1000000) {
      bottlenecks.push('High triangle count - Consider LOD or culling');
    }
    
    return bottlenecks;
  }

  public getMemoryPressure(): 'low' | 'medium' | 'high' {
    const stats = this.getStats();
    const totalMemory = stats.bufferMemory + stats.textureMemory;
    
    // Rough estimates for memory pressure
    if (totalMemory < 50 * 1024 * 1024) return 'low'; // < 50MB
    if (totalMemory < 200 * 1024 * 1024) return 'medium'; // < 200MB
    return 'high';
  }

  public generateReport(): {
    summary: string;
    stats: RenderStats;
    averageStats: ReturnType<typeof this.getAverageStats>;
    profiles: PerformanceProfile[];
    bottlenecks: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const averageStats = this.getAverageStats();
    const profiles = this.getAllProfiles();
    const bottlenecks = this.getBottlenecks();
    const grade = this.getPerformanceGrade();
    
    const recommendations: string[] = [];
    
    if (grade === 'poor') {
      recommendations.push('Consider switching to Canvas renderer');
      recommendations.push('Reduce zoom level to show fewer objects');
      recommendations.push('Close unnecessary browser tabs');
    } else if (grade === 'fair') {
      recommendations.push('Consider enabling performance mode');
      recommendations.push('Close background applications');
    } else if (grade === 'excellent') {
      recommendations.push('Performance is optimal');
    }
    
    if (stats.drawCalls > 500) {
      recommendations.push('Consider enabling batching optimizations');
    }
    
    const summary = `Performance: ${grade.toUpperCase()} - ${averageStats.averageFps} FPS average, ${averageStats.averageFrameTime}ms frame time`;
    
    return {
      summary,
      stats,
      averageStats,
      profiles,
      bottlenecks,
      recommendations
    };
  }

  private resetFrameCounters(): void {
    this.drawCallCount = 0;
    this.triangleCount = 0;
  }

  public reset(): void {
    this.frameStartTime = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.profiles.clear();
    this.resetFrameCounters();
  }

  public dispose(): void {
    this.reset();
    console.log('PerformanceMonitor disposed');
  }
}