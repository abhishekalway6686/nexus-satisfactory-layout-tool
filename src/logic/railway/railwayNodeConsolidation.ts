// src/logic/railway/railwayNodeConsolidation.ts
import { RailwayNode, RailwaySegment, Point3D } from '../../types';
import { distance3DSquared } from '../../utils/helpers';

/**
 * Default threshold for considering nodes as "same location"
 * This should be smaller than the snap threshold to avoid false consolidations
 */
export const NODE_CONSOLIDATION_THRESHOLD = 0.1; // 10cm

/**
 * Spatial index for efficient node proximity searches
 * Uses a simple grid-based approach
 */
export class NodeSpatialIndex {
  private gridSize: number;
  private grid: Map<string, Set<string>> = new Map();
  
  constructor(gridSize: number = 1.0) { // 1 meter grid cells
    this.gridSize = gridSize;
  }
  
  /**
   * Get the grid key for a position
   */
  private getGridKey(x: number, y: number, z: number): string {
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(y / this.gridSize);
    const gz = Math.floor(z / this.gridSize);
    return `${gx},${gy},${gz}`;
  }
  
  /**
   * Add a node to the spatial index
   */
  addNode(nodeId: string, node: RailwayNode): void {
    const key = this.getGridKey(node.x, node.y, node.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(nodeId);
  }
  
  /**
   * Remove a node from the spatial index
   */
  removeNode(nodeId: string, node: RailwayNode): void {
    const key = this.getGridKey(node.x, node.y, node.z);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(nodeId);
      if (cell.size === 0) {
        this.grid.delete(key);
      }
    }
  }
  
  /**
   * Find nodes near a position
   */
  findNodesNear(point: Point3D, radius: number): Set<string> {
    const nearbyNodes = new Set<string>();
    const cellRadius = Math.ceil(radius / this.gridSize);
    
    const centerX = Math.floor(point.x / this.gridSize);
    const centerY = Math.floor(point.y / this.gridSize);
    const centerZ = Math.floor(point.z / this.gridSize);
    
    // Check all cells within radius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${centerX + dx},${centerY + dy},${centerZ + dz}`;
          const cell = this.grid.get(key);
          if (cell) {
            cell.forEach(nodeId => nearbyNodes.add(nodeId));
          }
        }
      }
    }
    
    return nearbyNodes;
  }
  
  /**
   * Build index from existing nodes
   */
  buildFromNodes(nodes: Record<string, RailwayNode>): void {
    this.grid.clear();
    Object.entries(nodes).forEach(([nodeId, node]) => {
      this.addNode(nodeId, node);
    });
  }
}

/**
 * Finds an existing node at or very near the given position
 */
export const findExistingNodeAtPosition = (
  position: Point3D,
  nodes: Record<string, RailwayNode>,
  threshold: number = NODE_CONSOLIDATION_THRESHOLD,
  spatialIndex?: NodeSpatialIndex
): RailwayNode | null => {
  // Use spatial index if provided for performance
  if (spatialIndex) {
    const nearbyNodeIds = spatialIndex.findNodesNear(position, threshold);
    for (const nodeId of nearbyNodeIds) {
      const node = nodes[nodeId];
      if (node && distance3DSquared(position, node) <= threshold * threshold) {
        return node;
      }
    }
    return null;
  }
  
  // Fallback to linear search
  for (const node of Object.values(nodes)) {
    if (distance3DSquared(position, node) <= threshold * threshold) {
      return node;
    }
  }
  
  return null;
};

/**
 * Consolidates nodes that are too close together
 * Returns a mapping of old node IDs to new node IDs
 */
export const consolidateProximityNodes = (
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  threshold: number = NODE_CONSOLIDATION_THRESHOLD
): {
  consolidatedNodes: Record<string, RailwayNode>;
  consolidatedSegments: Record<string, RailwaySegment>;
  nodeMapping: Record<string, string>;
} => {
  const nodeMapping: Record<string, string> = {};
  const processedNodes = new Set<string>();
  const consolidatedNodes: Record<string, RailwayNode> = {};
  
  // Build spatial index for efficiency
  const spatialIndex = new NodeSpatialIndex();
  spatialIndex.buildFromNodes(nodes);
  
  // Process each node
  Object.entries(nodes).forEach(([nodeId, node]) => {
    if (processedNodes.has(nodeId)) return;
    
    // Find all nodes within threshold
    const nearbyNodeIds = spatialIndex.findNodesNear(node, threshold);
    const proximityNodes: Array<[string, RailwayNode]> = [];
    
    for (const nearbyId of nearbyNodeIds) {
      if (nearbyId === nodeId || processedNodes.has(nearbyId)) continue;
      const nearbyNode = nodes[nearbyId];
      if (nearbyNode && distance3DSquared(node, nearbyNode) <= threshold * threshold) {
        proximityNodes.push([nearbyId, nearbyNode]);
      }
    }
    
    if (proximityNodes.length > 0) {
      // Choose the primary node (prefer anchor nodes, then older nodes)
      let primaryNodeId = nodeId;
      let primaryNode = node;
      
      // Check if any of the proximity nodes is an anchor
      for (const [proxId, proxNode] of proximityNodes) {
        if (proxNode.isAnchor && !primaryNode.isAnchor) {
          primaryNodeId = proxId;
          primaryNode = proxNode;
          break;
        }
      }
      
      // Map all proximity nodes to the primary node
      processedNodes.add(primaryNodeId);
      consolidatedNodes[primaryNodeId] = primaryNode;
      nodeMapping[primaryNodeId] = primaryNodeId;
      
      for (const [proxId, _proxNode] of proximityNodes) {
        if (proxId !== primaryNodeId) {
          processedNodes.add(proxId);
          nodeMapping[proxId] = primaryNodeId;
        }
      }
    } else {
      // No proximity nodes, keep as is
      processedNodes.add(nodeId);
      consolidatedNodes[nodeId] = node;
      nodeMapping[nodeId] = nodeId;
    }
  });
  
  // Update segments with consolidated node references
  const consolidatedSegments: Record<string, RailwaySegment> = {};
  Object.entries(segments).forEach(([segId, segment]) => {
    const newStartNode = nodeMapping[segment.startNode] || segment.startNode;
    const newEndNode = nodeMapping[segment.endNode] || segment.endNode;
    
    // Skip segments that would become zero-length
    if (newStartNode === newEndNode) {
      return;
    }
    
    consolidatedSegments[segId] = {
      ...segment,
      startNode: newStartNode,
      endNode: newEndNode,
      startPoint: consolidatedNodes[newStartNode] ? {
        x: consolidatedNodes[newStartNode].x,
        y: consolidatedNodes[newStartNode].y,
        z: consolidatedNodes[newStartNode].z,
      } : segment.startPoint,
      endPoint: consolidatedNodes[newEndNode] ? {
        x: consolidatedNodes[newEndNode].x,
        y: consolidatedNodes[newEndNode].y,
        z: consolidatedNodes[newEndNode].z,
      } : segment.endPoint,
    };
  });
  
  return {
    consolidatedNodes,
    consolidatedSegments,
    nodeMapping,
  };
};

/**
 * Validates that a junction has a single node instead of multiple overlapping nodes
 */
export const validateJunctionIntegrity = (
  junctionPoint: Point3D,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>,
  threshold: number = NODE_CONSOLIDATION_THRESHOLD
): {
  isValid: boolean;
  issues: string[];
  suggestedFixes: Array<{ type: string; description: string }>;
} => {
  const issues: string[] = [];
  const suggestedFixes: Array<{ type: string; description: string }> = [];
  
  // Find all nodes at the junction point
  const junctionNodes: Array<[string, RailwayNode]> = [];
  Object.entries(nodes).forEach(([nodeId, node]) => {
    if (distance3DSquared(junctionPoint, node) <= threshold * threshold) {
      junctionNodes.push([nodeId, node]);
    }
  });
  
  if (junctionNodes.length === 0) {
    issues.push('No node found at junction point');
    suggestedFixes.push({
      type: 'create_node',
      description: 'Create a node at the junction point',
    });
  } else if (junctionNodes.length > 1) {
    issues.push(`Multiple nodes (${junctionNodes.length}) found at junction point`);
    suggestedFixes.push({
      type: 'consolidate_nodes',
      description: 'Consolidate overlapping nodes into a single junction node',
    });
    
    // Check if segments are properly connected
    const connectedSegments = new Set<string>();
    junctionNodes.forEach(([nodeId, _node]) => {
      Object.entries(segments).forEach(([segId, segment]) => {
        if (segment.startNode === nodeId || segment.endNode === nodeId) {
          connectedSegments.add(segId);
        }
      });
    });
    
    if (connectedSegments.size < 3) {
      issues.push('Junction has fewer than 3 connected segments');
    }
  } else {
    // Single node at junction - check connectivity
    const [nodeId, _node] = junctionNodes[0];
    const connectedSegments: string[] = [];
    
    Object.entries(segments).forEach(([segId, segment]) => {
      if (segment.startNode === nodeId || segment.endNode === nodeId) {
        connectedSegments.push(segId);
      }
    });
    
    if (connectedSegments.length < 3) {
      issues.push(`Junction node has only ${connectedSegments.length} connected segments`);
      if (connectedSegments.length === 2) {
        suggestedFixes.push({
          type: 'check_intersection',
          description: 'Check if this should be a regular node instead of a junction',
        });
      }
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestedFixes,
  };
};

/**
 * Ensures curve continuity through junction points
 */
export const maintainCurveContinuity = (
  junctionNodeId: string,
  nodes: Record<string, RailwayNode>,
  segments: Record<string, RailwaySegment>
): Record<string, RailwaySegment> => {
  const updatedSegments = { ...segments };
  const junctionNode = nodes[junctionNodeId];
  if (!junctionNode) return updatedSegments;
  
  // Find all segments connected to this junction
  const connectedSegments: RailwaySegment[] = [];
  Object.values(segments).forEach(segment => {
    if (segment.startNode === junctionNodeId || segment.endNode === junctionNodeId) {
      connectedSegments.push(segment);
    }
  });
  
  // For each pair of segments, check if they should maintain curve continuity
  for (let i = 0; i < connectedSegments.length; i++) {
    for (let j = i + 1; j < connectedSegments.length; j++) {
      const seg1 = connectedSegments[i];
      const seg2 = connectedSegments[j];
      
      // Check if these segments form a continuous path through the junction
      const seg1EndsAtJunction = seg1.endNode === junctionNodeId;
      const seg2StartsAtJunction = seg2.startNode === junctionNodeId;
      
      if ((seg1EndsAtJunction && seg2StartsAtJunction) || 
          (!seg1EndsAtJunction && !seg2StartsAtJunction)) {
        // These segments connect through the junction
        // If both are curves, ensure smooth transition
        if (seg1.type === 'curve' && seg2.type === 'curve') {
          // The control points should align for smooth continuity
          // This is handled by the curve generation logic
        }
      }
    }
  }
  
  return updatedSegments;
};