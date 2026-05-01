// src/logic/railway/railwaySnappingOptimized.ts
import { RailwayNode, RailwaySegment, Point3D } from '../../types';
import { distance3D } from '../../utils/helpers';
import { SpatialGrid } from '../../utils/SpatialGrid';
import {
  SnapTarget,
  detectNearbySegments,
  DEFAULT_SNAP_THRESHOLD,
  NODE_SNAP_PRIORITY,
  SnapResult
} from './railwaySnapping';
import { detectSnapTargetAdaptive } from './railwaySnappingRustOptimized';
import { detectSnapTargetRustEnhanced } from './railwaySnappingRustEnhanced';
import { railwayPerformanceMonitor } from '../../utils/railwayPerformanceBenchmark';

/**
 * Optimized version of detectNearbyNodes using spatial indexing
 * @param point The point to check for nearby nodes
 * @param spatialGrid The spatial grid containing all railway nodes
 * @param snapThreshold The distance threshold for snapping
 * @param excludeNodeIds Node IDs to exclude from snapping (e.g., current drawing path)
 * @returns Array of nearby nodes within snap threshold, sorted by distance
 */
export const detectNearbyNodesOptimized = (
  point: Point3D,
  spatialGrid: SpatialGrid<RailwayNode>,
  excludeNodeIds: string[] = [],
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
): SnapTarget[] => {
  // Use spatial grid to find nearby nodes efficiently
  const nearbyNodes = spatialGrid.queryRadius(point, snapThreshold, excludeNodeIds);
  
  // Convert to SnapTarget format with actual distances
  return nearbyNodes.map(node => ({
    type: 'node' as const,
    distance: distance3D(point, node),
    snapPoint: { x: node.x, y: node.y, z: node.z },
    targetId: node.id,
  }));
};

/**
 * Ultra-optimized railway snap detection with Rust acceleration
 * Automatically switches between spatial grid and Rust implementations for optimal performance
 * @param point The point to snap from
 * @param spatialGrid The spatial grid containing all railway nodes (legacy fallback)
 * @param nodes All railway nodes
 * @param segments All railway segments
 * @param snapThreshold The distance threshold for snapping
 * @param excludeNodeIds Node IDs to exclude from snapping
 * @param excludeSegmentIds Segment IDs to exclude from snapping
 * @returns The best snap result if any
 */
export const detectSnapTargetOptimized = async (
  point: Point3D,
  spatialGrid: SpatialGrid<RailwayNode> | null,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  excludeNodeIds: string[] = [],
  excludeSegmentIds: string[] = []
): Promise<SnapResult> => {
  const startTime = performance.now();
  const nodeCount = Object.keys(nodes).length;
  const segmentCount = Object.keys(segments).length;
  
  try {
    // Use the enhanced Rust implementation for maximum performance (Phase 2 optimization)
    // Falls back to adaptive implementation if enhanced version is not available
    const result = await detectSnapTargetRustEnhanced(
      point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
    ).catch(() => {
      // Fallback to adaptive implementation
      return detectSnapTargetAdaptive(
        point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
      );
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Record performance metrics
    railwayPerformanceMonitor.recordMeasurement(duration, nodeCount, segmentCount);
    
    // Log performance for debugging (only in development)
    if (process.env.NODE_ENV === 'development' && (nodeCount > 100 || segmentCount > 50)) {
      console.log(`[Railway Optimization] Snap detection: ${nodeCount + segmentCount} entities in ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    console.warn('[Railway Optimization] Rust optimization failed, falling back to spatial grid:', error);
    
    // Fallback to spatial grid implementation
    return detectSnapTargetSpatialFallback(
      point, spatialGrid, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
    );
  }
};

/**
 * Fallback implementation using spatial grid (legacy)
 * Used when Rust optimization is not available
 */
const detectSnapTargetSpatialFallback = (
  point: Point3D,
  spatialGrid: SpatialGrid<RailwayNode> | null,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  excludeNodeIds: string[] = [],
  excludeSegmentIds: string[] = []
): SnapResult => {
  // Find nearby nodes using spatial grid if available
  const nearbyNodes = spatialGrid 
    ? detectNearbyNodesOptimized(point, spatialGrid, excludeNodeIds, snapThreshold)
    : []; // Skip node detection if no spatial grid
  
  // Find nearby segments (still uses original method for now)
  const nearbySegments = detectNearbySegments(point, segments, nodes, snapThreshold, excludeSegmentIds);

  // If we have nearby nodes, prioritize them
  if (nearbyNodes.length > 0) {
    const bestNode = nearbyNodes[0];
    // Check if the node is significantly closer than any segment
    if (nearbySegments.length === 0 || bestNode.distance * NODE_SNAP_PRIORITY < nearbySegments[0].distance) {
      return {
        shouldSnap: true,
        snapTarget: bestNode,
        visualIndicator: {
          type: 'node',
          position: bestNode.snapPoint,
          radius: snapThreshold * 2,
          targetId: bestNode.targetId,
          isActive: true,
        },
      };
    }
  }

  // Otherwise use the closest segment if available
  if (nearbySegments.length > 0) {
    const bestSegment = nearbySegments[0];
    return {
      shouldSnap: true,
      snapTarget: bestSegment,
      visualIndicator: {
        type: 'segment',
        position: bestSegment.snapPoint,
        radius: snapThreshold * 1.5,
        targetId: bestSegment.targetId,
        isActive: true,
      },
    };
  }

  return { shouldSnap: false };
};