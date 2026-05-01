// Railway Snapping Integration Layer
// Provides a unified interface for all railway snapping implementations
// Ensures compatibility with existing railway drawing workflows

import { RailwayNode, RailwaySegment, Point3D } from '../../types';
import type { 
  SnapTarget, 
  SnapResult, 
  SnapVisualIndicator
} from './railwaySnapping';
import { 
  DEFAULT_SNAP_THRESHOLD, 
  NODE_SNAP_PRIORITY
} from './railwaySnapping';

// Integration strategy: Progressive enhancement
// 1. Enhanced Rust implementation (best performance)
// 2. Optimized spatial grid implementation (good performance)
// 3. Basic JavaScript implementation (compatibility)

export interface RailwaySnapIntegrationOptions {
  snapThreshold?: number;
  excludeNodeIds?: string[];
  excludeSegmentIds?: string[];
  preferRustOptimization?: boolean;
  useSpatialIndexing?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface RailwaySnapIntegrationResult extends SnapResult {
  performanceMetrics?: {
    executionTimeMs: number;
    method: 'rust-enhanced' | 'rust-optimized' | 'spatial-grid' | 'javascript';
    entitiesProcessed: number;
    spatialOptimizationUsed: boolean;
  };
}

/**
 * Unified railway snap detection interface
 * Automatically selects the best available implementation
 * Maintains 100% compatibility with existing workflows
 */
export const detectRailwaySnap = async (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  options: RailwaySnapIntegrationOptions = {}
): Promise<RailwaySnapIntegrationResult> => {
  const {
    snapThreshold = DEFAULT_SNAP_THRESHOLD,
    excludeNodeIds = [],
    excludeSegmentIds = [],
    preferRustOptimization = true,
    useSpatialIndexing = true,
    enablePerformanceMonitoring = process.env.NODE_ENV === 'development'
  } = options;

  const startTime = performance.now();
  const nodeCount = Object.keys(nodes).length;
  const segmentCount = Object.keys(segments).length;
  const totalEntities = nodeCount + segmentCount;

  // Strategy 1: Enhanced Rust implementation (Phase 2 optimization)
  if (preferRustOptimization && totalEntities > 10) {
    try {
      const { detectSnapTargetRustEnhanced } = await import('./railwaySnappingRustEnhanced');
      const result = await detectSnapTargetRustEnhanced(
        point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
      );
      
      const duration = performance.now() - startTime;
      
      if (enablePerformanceMonitoring) {
        console.log(`[Railway Integration] Enhanced Rust: ${totalEntities} entities in ${duration.toFixed(2)}ms`);
      }
      
      return {
        ...result,
        performanceMetrics: {
          executionTimeMs: duration,
          method: 'rust-enhanced',
          entitiesProcessed: totalEntities,
          spatialOptimizationUsed: true
        }
      };
    } catch (error) {
      console.warn('[Railway Integration] Enhanced Rust failed, trying optimized implementation:', error);
    }
  }

  // Strategy 2: Optimized spatial grid implementation
  if (useSpatialIndexing && totalEntities > 5) {
    try {
      const { detectSnapTargetOptimized } = await import('./railwaySnappingOptimized');
      const result = await detectSnapTargetOptimized(
        point, null, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
      );
      
      const duration = performance.now() - startTime;
      
      if (enablePerformanceMonitoring) {
        console.log(`[Railway Integration] Optimized: ${totalEntities} entities in ${duration.toFixed(2)}ms`);
      }
      
      return {
        ...result,
        performanceMetrics: {
          executionTimeMs: duration,
          method: 'spatial-grid',
          entitiesProcessed: totalEntities,
          spatialOptimizationUsed: true
        }
      };
    } catch (error) {
      console.warn('[Railway Integration] Optimized implementation failed, using basic implementation:', error);
    }
  }

  // Strategy 3: Basic JavaScript implementation (compatibility fallback)
  try {
    const { detectSnapTarget } = await import('./railwaySnapping');
    const result = detectSnapTarget(
      point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
    );
    
    const duration = performance.now() - startTime;
    
    if (enablePerformanceMonitoring) {
      console.log(`[Railway Integration] JavaScript: ${totalEntities} entities in ${duration.toFixed(2)}ms`);
    }
    
    return {
      ...result,
      performanceMetrics: {
        executionTimeMs: duration,
        method: 'javascript',
        entitiesProcessed: totalEntities,
        spatialOptimizationUsed: false
      }
    };
  } catch (error) {
    console.error('[Railway Integration] All implementations failed:', error);
    return { shouldSnap: false };
  }
};

// Export compatibility interface for existing code
export {
  DEFAULT_SNAP_THRESHOLD,
  NODE_SNAP_PRIORITY,
  SnapTarget,
  SnapResult,
  SnapVisualIndicator
};

// Export unified interface as default
export default {
  detectRailwaySnap
};