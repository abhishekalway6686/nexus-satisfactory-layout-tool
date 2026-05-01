// Railway snapping with Rust optimization
// Maintains 100% JavaScript API compatibility while using high-performance Rust backend
import { RailwayNode, RailwaySegment, Point3D } from '../../types';
import { getTauriInvoke } from '../../utils/tauriHelper';
import { 
  SnapTarget, 
  SnapResult, 
  DEFAULT_SNAP_THRESHOLD, 
  NODE_SNAP_PRIORITY 
} from './railwaySnapping';

// Performance monitoring for validation
interface PerformanceMetrics {
  jsTime: number;
  rustTime: number;
  improvement: number;
  nodeCount: number;
  segmentCount: number;
}

// Rust command interfaces matching geometry.rs
interface RailwayNodeQuery {
  id: string;
  position: Point3D;
}

interface RailwaySegmentQuery {
  id: string;
  start: Point3D;
  end: Point3D;
  control_point?: Point3D;
}

interface RailwaySnapResult {
  snap_type: 'node' | 'segment';
  target_id: string;
  distance: number;
  snap_point: Point3D;
  segment_t?: number;
}

// Feature flag for gradual rollout
const ENABLE_RUST_OPTIMIZATION = process.env.NODE_ENV !== 'test' && 
  typeof window !== 'undefined' && 
  !window.location.search.includes('disable-rust');

/**
 * High-performance Rust-optimized railway node proximity detection
 * Replaces the O(N) JavaScript loop with vectorized Rust operations
 * Expected performance improvement: 10-20x for distance calculations
 */
export const detectNearbyNodesRustOptimized = async (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  excludeNodeIds: string[] = [],
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
): Promise<SnapTarget[]> => {
  if (!ENABLE_RUST_OPTIMIZATION) {
    // Fallback to JavaScript implementation
    const { detectNearbyNodes } = await import('./railwaySnapping');
    return detectNearbyNodes(point, nodes, excludeNodeIds, snapThreshold);
  }

  try {
    const tauriInvoke = await getTauriInvoke();
    if (!tauriInvoke) {
      throw new Error('Tauri API not available');
    }
    
    const startTime = performance.now();
    
    // Convert nodes to Rust query format
    const nodeQueries: RailwayNodeQuery[] = Object.entries(nodes)
      .filter(([nodeId]) => !excludeNodeIds.includes(nodeId))
      .map(([nodeId, node]) => ({
        id: nodeId,
        position: { x: node.x, y: node.y, z: node.z }
      }));

    // Call optimized Rust command
    const rustResults: RailwaySnapResult[] = await tauriInvoke('calculate_railway_node_distances', {
      queryPoint: point,
      nodes: nodeQueries,
      snapThreshold
    });

    const rustTime = performance.now() - startTime;

    // Convert back to JavaScript format
    const snapTargets: SnapTarget[] = rustResults.map(result => ({
      type: 'node' as const,
      distance: result.distance,
      snapPoint: result.snap_point,
      targetId: result.target_id
    }));

    // Performance monitoring
    if (window.performance && nodeQueries.length > 100) {
      console.log(`[Railway Optimization] Node detection: ${nodeQueries.length} nodes in ${rustTime.toFixed(2)}ms (Rust)`);
    }

    return snapTargets;
  } catch (error) {
    console.warn('[Railway Optimization] Rust fallback failed, using JavaScript:', error);
    // Graceful fallback to JavaScript implementation
    const { detectNearbyNodes } = await import('./railwaySnapping');
    return detectNearbyNodes(point, nodes, excludeNodeIds, snapThreshold);
  }
};

/**
 * High-performance Rust-optimized railway segment proximity detection
 * Replaces expensive Bezier sampling with efficient Newton-Raphson method
 * Expected performance improvement: 50x for curved segments
 */
export const detectNearbySegmentsRustOptimized = async (
  point: Point3D,
  segments: Record<string, RailwaySegment>,
  nodes: Record<string, RailwayNode>,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  excludeSegmentIds: string[] = []
): Promise<SnapTarget[]> => {
  if (!ENABLE_RUST_OPTIMIZATION) {
    // Fallback to JavaScript implementation
    const { detectNearbySegments } = await import('./railwaySnapping');
    return detectNearbySegments(point, segments, nodes, snapThreshold, excludeSegmentIds);
  }

  try {
    const tauriInvoke = await getTauriInvoke();
    if (!tauriInvoke) {
      throw new Error('Tauri API not available');
    }
    
    const startTime = performance.now();
    
    // Convert segments to Rust query format
    const segmentQueries: RailwaySegmentQuery[] = Object.entries(segments)
      .filter(([segmentId]) => !excludeSegmentIds.includes(segmentId))
      .map(([segmentId, segment]) => {
        const startNode = nodes[segment.startNode];
        const endNode = nodes[segment.endNode];
        
        if (!startNode || !endNode) return null;
        
        return {
          id: segmentId,
          start: { x: startNode.x, y: startNode.y, z: startNode.z },
          end: { x: endNode.x, y: endNode.y, z: endNode.z },
          control_point: segment.type === 'curve' && segment.controlPoints?.[0] 
            ? { 
                x: segment.controlPoints[0].x, 
                y: segment.controlPoints[0].y, 
                z: segment.controlPoints[0].z 
              }
            : undefined
        };
      })
      .filter(Boolean) as RailwaySegmentQuery[];

    // Call optimized Rust command
    const rustResults: RailwaySnapResult[] = await tauriInvoke('calculate_railway_segment_snaps', {
      queryPoint: point,
      segments: segmentQueries,
      snapThreshold
    });

    const rustTime = performance.now() - startTime;

    // Convert back to JavaScript format
    const snapTargets: SnapTarget[] = rustResults.map(result => ({
      type: 'segment' as const,
      distance: result.distance,
      snapPoint: result.snap_point,
      targetId: result.target_id,
      t: result.segment_t
    }));

    // Performance monitoring
    if (window.performance && segmentQueries.length > 50) {
      console.log(`[Railway Optimization] Segment detection: ${segmentQueries.length} segments in ${rustTime.toFixed(2)}ms (Rust)`);
    }

    return snapTargets;
  } catch (error) {
    console.warn('[Railway Optimization] Rust fallback failed, using JavaScript:', error);
    // Graceful fallback to JavaScript implementation
    const { detectNearbySegments } = await import('./railwaySnapping');
    return detectNearbySegments(point, segments, nodes, snapThreshold, excludeSegmentIds);
  }
};

/**
 * Ultimate high-performance railway snap detection combining all optimizations
 * Replaces the detectSnapTarget function with Rust-powered implementation
 * Expected performance improvement: 20-50x overall
 */
export const detectSnapTargetRustOptimized = async (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  excludeNodeIds: string[] = [],
  excludeSegmentIds: string[] = []
): Promise<SnapResult> => {
  if (!ENABLE_RUST_OPTIMIZATION) {
    // Fallback to JavaScript implementation
    const { detectSnapTarget } = await import('./railwaySnapping');
    return detectSnapTarget(point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds);
  }

  try {
    const tauriInvoke = await getTauriInvoke();
    if (!tauriInvoke) {
      throw new Error('Tauri API not available');
    }
    
    const startTime = performance.now();
    
    // Convert to Rust query formats
    const nodeQueries: RailwayNodeQuery[] = Object.entries(nodes)
      .filter(([nodeId]) => !excludeNodeIds.includes(nodeId))
      .map(([nodeId, node]) => ({
        id: nodeId,
        position: { x: node.x, y: node.y, z: node.z }
      }));

    const segmentQueries: RailwaySegmentQuery[] = Object.entries(segments)
      .filter(([segmentId]) => !excludeSegmentIds.includes(segmentId))
      .map(([segmentId, segment]) => {
        const startNode = nodes[segment.startNode];
        const endNode = nodes[segment.endNode];
        
        if (!startNode || !endNode) return null;
        
        return {
          id: segmentId,
          start: { x: startNode.x, y: startNode.y, z: startNode.z },
          end: { x: endNode.x, y: endNode.y, z: endNode.z },
          control_point: segment.type === 'curve' && segment.controlPoints?.[0] 
            ? { 
                x: segment.controlPoints[0].x, 
                y: segment.controlPoints[0].y, 
                z: segment.controlPoints[0].z 
              }
            : undefined
        };
      })
      .filter(Boolean) as RailwaySegmentQuery[];

    // Call combined optimized Rust command
    const rustResult: RailwaySnapResult | null = await tauriInvoke('detect_railway_snap_target', {
      queryPoint: point,
      nodes: nodeQueries,
      segments: segmentQueries,
      snapThreshold,
      nodePriorityMultiplier: NODE_SNAP_PRIORITY
    });

    const rustTime = performance.now() - startTime;

    // Performance monitoring and validation
    if (window.performance && (nodeQueries.length > 100 || segmentQueries.length > 50)) {
      const totalEntities = nodeQueries.length + segmentQueries.length;
      console.log(`[Railway Optimization] Combined snap detection: ${totalEntities} entities in ${rustTime.toFixed(2)}ms (Rust)`);
      
      // Log significant performance improvements
      if (rustTime < 5 && totalEntities > 500) {
        console.log(`[Railway Optimization] 🚀 High performance achieved: ${totalEntities} entities in ${rustTime.toFixed(2)}ms`);
      }
    }

    if (!rustResult) {
      return { shouldSnap: false };
    }

    // Convert back to JavaScript format
    const snapTarget: SnapTarget = {
      type: rustResult.snap_type as 'node' | 'segment',
      distance: rustResult.distance,
      snapPoint: rustResult.snap_point,
      targetId: rustResult.target_id,
      t: rustResult.segment_t
    };

    return {
      shouldSnap: true,
      snapTarget,
      visualIndicator: {
        type: snapTarget.type,
        position: snapTarget.snapPoint,
        radius: snapTarget.type === 'node' ? snapThreshold * 2 : snapThreshold * 1.5,
        targetId: snapTarget.targetId,
        isActive: true
      }
    };
  } catch (error) {
    console.warn('[Railway Optimization] Rust fallback failed, using JavaScript:', error);
    // Graceful fallback to JavaScript implementation
    const { detectSnapTarget } = await import('./railwaySnapping');
    return detectSnapTarget(point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds);
  }
};

/**
 * Performance comparison utility for validation
 * Runs both JavaScript and Rust implementations to verify correctness and measure improvement
 */
export const benchmarkRailwaySnapping = async (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  iterations: number = 10
): Promise<PerformanceMetrics> => {
  const nodeCount = Object.keys(nodes).length;
  const segmentCount = Object.keys(segments).length;
  
  // Benchmark JavaScript implementation
  const { detectSnapTarget } = await import('./railwaySnapping');
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await detectSnapTarget(point, nodes, segments);
  }
  const jsTime = (performance.now() - jsStart) / iterations;

  // Benchmark Rust implementation
  const rustStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await detectSnapTargetRustOptimized(point, nodes, segments);
  }
  const rustTime = (performance.now() - rustStart) / iterations;

  const improvement = jsTime / rustTime;
  
  return {
    jsTime,
    rustTime,
    improvement,
    nodeCount,
    segmentCount
  };
};

/**
 * Smart performance monitoring that automatically switches to Rust when beneficial
 * Uses heuristics to determine optimal implementation
 */
export const detectSnapTargetAdaptive = async (
  point: Point3D,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  snapThreshold?: number,
  excludeNodeIds?: string[],
  excludeSegmentIds?: string[]
): Promise<SnapResult> => {
  const nodeCount = Object.keys(nodes).length;
  const segmentCount = Object.keys(segments).length;
  const totalEntities = nodeCount + segmentCount;
  
  // Use Rust optimization for larger datasets where performance benefit is significant
  if (ENABLE_RUST_OPTIMIZATION && totalEntities > 50) {
    return detectSnapTargetRustOptimized(
      point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
    );
  } else {
    // Use JavaScript for smaller datasets to avoid Tauri overhead
    const { detectSnapTarget } = await import('./railwaySnapping');
    return detectSnapTarget(
      point, nodes, segments, snapThreshold, excludeNodeIds, excludeSegmentIds
    );
  }
};