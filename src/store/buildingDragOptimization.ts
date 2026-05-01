/**
 * Building Drag Optimization Module
 * 
 * This module provides optimized building update functions that defer expensive
 * calculations during drag operations to improve performance.
 * 
 * Key optimizations:
 * - During drag: Only update building position, no cascade updates
 * - On drag end: Perform all infrastructure updates in one batch
 * - Maintains visual responsiveness while avoiding 100-1000ms lag
 */

import { Building } from '../types';
import { BUILDING_TYPES } from '../constants';
import { 
  getConnectionPointWorldPos, 
  getRailwayConnectionPointWorldPos,
  distance3D
} from '../utils/helpers';

// Track whether we're currently dragging a building
let isDraggingBuilding = false;
let draggedBuildingId: string | null = null;

/**
 * Start tracking a building drag operation
 */
export function startBuildingDrag(buildingId: string) {
  isDraggingBuilding = true;
  draggedBuildingId = buildingId;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Drag Optimization] Started dragging building: ${buildingId}`);
  }
}

/**
 * End tracking a building drag operation and return building ID for cascade updates
 */
export function endBuildingDrag() {
  const wasDragging = isDraggingBuilding;
  const buildingId = draggedBuildingId;

  isDraggingBuilding = false;
  draggedBuildingId = null;

  if (process.env.NODE_ENV === 'development' && wasDragging) {
    console.log(`[Drag Optimization] Ended dragging building: ${buildingId}`);
  }

  return { wasDragging, buildingId };
}


/**
 * Check if we're currently dragging a building
 */
export function isDragging(buildingId?: string): boolean {
  if (buildingId) {
    return isDraggingBuilding && draggedBuildingId === buildingId;
  }
  return isDraggingBuilding;
}


/**
 * Performance metrics for drag operations
 */
export interface DragPerformanceMetrics {
  dragStartTime: number;
  dragEndTime: number;
  updateCount: number;
  totalDragDuration: number;
  averageUpdateTime: number;
  deferredUpdates: number;
}

class DragPerformanceTracker {
  private metrics: Map<string, DragPerformanceMetrics> = new Map();
  private currentDragStart: number = 0;
  private updateTimes: number[] = [];
  private deferredCount: number = 0;
  
  startDrag(buildingId: string) {
    this.currentDragStart = performance.now();
    this.updateTimes = [];
    this.deferredCount = 0;
    
    this.metrics.set(buildingId, {
      dragStartTime: this.currentDragStart,
      dragEndTime: 0,
      updateCount: 0,
      totalDragDuration: 0,
      averageUpdateTime: 0,
      deferredUpdates: 0
    });
  }
  
  recordUpdate(buildingId: string, updateTime: number, wasDeferred: boolean = false) {
    const metric = this.metrics.get(buildingId);
    if (metric) {
      this.updateTimes.push(updateTime);
      metric.updateCount++;
      
      if (wasDeferred) {
        this.deferredCount++;
        metric.deferredUpdates++;
      }
    }
  }
  
  endDrag(buildingId: string) {
    const metric = this.metrics.get(buildingId);
    if (metric) {
      metric.dragEndTime = performance.now();
      metric.totalDragDuration = metric.dragEndTime - metric.dragStartTime;
      metric.averageUpdateTime = this.updateTimes.length > 0 
        ? this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length
        : 0;
      
      if (process.env.NODE_ENV === 'development' && metric.updateCount > 0) {
        console.log(`[Drag Performance] Building ${buildingId}:`, {
          duration: `${metric.totalDragDuration.toFixed(2)}ms`,
          updates: metric.updateCount,
          deferred: metric.deferredUpdates,
          avgUpdateTime: `${metric.averageUpdateTime.toFixed(2)}ms`,
          improvement: `${((metric.deferredUpdates / metric.updateCount) * 100).toFixed(0)}% updates deferred`
        });
      }
    }
  }
  
  getMetrics(buildingId: string): DragPerformanceMetrics | undefined {
    return this.metrics.get(buildingId);
  }
  
  clear() {
    this.metrics.clear();
  }
}

export const dragPerformanceTracker = new DragPerformanceTracker();

/**
 * Configuration for drag optimization behavior
 */
export interface DragOptimizationConfig {
  enabled: boolean;
  deferCascadeUpdates: boolean;
  updateThrottleMs: number;
  logPerformance: boolean;
}

const defaultConfig: DragOptimizationConfig = {
  enabled: true,
  deferCascadeUpdates: true,
  updateThrottleMs: 16, // ~60fps
  logPerformance: process.env.NODE_ENV === 'development'
};

let currentConfig = { ...defaultConfig };

export function setDragOptimizationConfig(config: Partial<DragOptimizationConfig>) {
  currentConfig = { ...currentConfig, ...config };
  
  if (currentConfig.logPerformance) {
    console.log('[Drag Optimization] Config updated:', currentConfig);
  }
}

export function getDragOptimizationConfig(): DragOptimizationConfig {
  return { ...currentConfig };
}

/**
 * Reset drag optimization state (useful for cleanup)
 */
export function resetDragOptimization() {
  isDraggingBuilding = false;
  draggedBuildingId = null;
  dragPerformanceTracker.clear();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Drag Optimization] State reset');
  }
}