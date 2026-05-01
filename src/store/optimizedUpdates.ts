// Optimized update methods for selective state updates
import { LayoutState, Building, RelationshipIndexes } from '../types';
import { BUILDING_TYPES } from '../constants';
import { 
  getConnectionPointWorldPos, 
  getRailwayConnectionPointWorldPos, 
  distance3D,
  recalculateSegmentCurveControlPoints,
  findSegmentsWithBuildingAnchors,
  updateRailwaySegmentMetadata,
  findAdjacentSegmentsForCurveRecalculation,
  validateAndRepairRailwayConnections,
} from '../utils/helpers';

// Optimized updateBuilding with selective updates
export function optimizedUpdateBuilding(
  state: LayoutState,
  buildingId: string,
  updates: Partial<Building>,
  indexes?: RelationshipIndexes
): Partial<LayoutState> {
  // Early exit if building doesn't exist
  const existingBuilding = state.buildings[buildingId];
  if (!existingBuilding) return state;

  // Only clone buildings if needed
  const updatedBuilding = { ...existingBuilding, ...updates };
  
  // If only non-positional updates, just update the building
  const isPositionalUpdate = updates.x !== undefined || updates.y !== undefined || updates.rotation !== undefined;
  if (!isPositionalUpdate) {
    return {
      buildings: {
        ...state.buildings,
        [buildingId]: updatedBuilding,
      },
    };
  }

  // Performance optimization: Pre-calculate building info once
  const buildingDef = BUILDING_TYPES[existingBuilding.type];
  if (!buildingDef) return state;

  // Use provided indexes (should always be provided from state)
  if (!indexes) {
    console.error('No indexes provided to optimizedUpdateBuilding!');
    return state;
  }
  const connectionIndexes = indexes;

  // Pre-build connection point lookups for efficiency
  const connectionPointMap = new Map(buildingDef.connectionPoints?.map(cp => [cp.id, cp]) || []);
  const railwayPointMap = new Map(buildingDef.railwayPoints?.map(rp => [rp.id, rp]) || []);

  // Create minimal state updates - only clone what's needed
  const stateUpdates: Partial<LayoutState> = {
    buildings: {
      ...state.buildings,
      [buildingId]: updatedBuilding,
    },
  };

  // Find affected conveyor belts using index
  const affectedBeltIds = connectionIndexes.buildingToConveyors.get(buildingId) || new Set();
  const affectedPoleIds = new Set<string>();

  if (affectedBeltIds.size > 0) {
    affectedBeltIds.forEach(beltId => {
      const belt = state.conveyorBelts[beltId];
      if (belt.fromBuildingId === buildingId && belt.fromConnectionPoint) {
        affectedPoleIds.add(`pole-anchor-${buildingId}-${belt.fromConnectionPoint}`);
      }
      if (belt.toBuildingId === buildingId && belt.toConnectionPoint) {
        affectedPoleIds.add(`pole-anchor-end-${buildingId}-${belt.toConnectionPoint}`);
      }
    });

    // Update only affected poles
    if (affectedPoleIds.size > 0) {
      const polesUpdate: typeof state.conveyorPoles = {};
      
      for (const poleId of affectedPoleIds) {
        const pole = state.conveyorPoles[poleId];
        if (!pole) continue;

        // Extract connection point from pole ID
        const parts = poleId.split('-');
        const connectionPointId = parts[parts.length - 1];
        const connectionPoint = connectionPointMap.get(connectionPointId);
        
        if (connectionPoint) {
          const worldPos = getConnectionPointWorldPos(updatedBuilding, buildingDef, connectionPoint);
          polesUpdate[poleId] = {
            ...pole,
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z,
          };
        }
      }

      if (Object.keys(polesUpdate).length > 0) {
        stateUpdates.conveyorPoles = {
          ...state.conveyorPoles,
          ...polesUpdate,
        };
      }
    }
  }

  // Find affected pipelines using index
  const affectedPipelineIds = connectionIndexes.buildingToPipelines.get(buildingId) || new Set();
  const affectedSupportIds = new Set<string>();

  if (affectedPipelineIds.size > 0) {
    affectedPipelineIds.forEach(pipelineId => {
      const pipeline = state.pipelines[pipelineId];
      if (pipeline.fromBuildingId === buildingId && pipeline.fromConnectionPoint) {
        affectedSupportIds.add(`support-anchor-${buildingId}-${pipeline.fromConnectionPoint}`);
      }
      if (pipeline.toBuildingId === buildingId && pipeline.toConnectionPoint) {
        affectedSupportIds.add(`support-anchor-end-${buildingId}-${pipeline.toConnectionPoint}`);
      }
    });

    // Update only affected supports
    if (affectedSupportIds.size > 0) {
      const supportsUpdate: typeof state.pipeSupports = {};
      
      for (const supportId of affectedSupportIds) {
        const support = state.pipeSupports[supportId];
        if (!support) continue;

        // Extract connection point from support ID
        const parts = supportId.split('-');
        const connectionPointId = parts[parts.length - 1];
        const connectionPoint = connectionPointMap.get(connectionPointId);
        
        if (connectionPoint) {
          const worldPos = getConnectionPointWorldPos(updatedBuilding, buildingDef, connectionPoint);
          supportsUpdate[supportId] = {
            ...support,
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z,
          };
        }
      }

      if (Object.keys(supportsUpdate).length > 0) {
        stateUpdates.pipeSupports = {
          ...state.pipeSupports,
          ...supportsUpdate,
        };
      }
    }
  }

  // Find affected railway nodes using index
  const affectedNodeIds = connectionIndexes.buildingToRailNodes.get(buildingId) || new Set();

  if (affectedNodeIds.size > 0) {
    const nodesUpdate: typeof state.railwayNodes = {};
    
    for (const nodeId of affectedNodeIds) {
      const node = state.railwayNodes[nodeId];
      if (!node) continue;

      // Extract rail point ID from node ID
      const railPointId = nodeId.split('-')[3];
      const railPoint = railwayPointMap.get(railPointId);
      
      if (railPoint) {
        const worldPos = getRailwayConnectionPointWorldPos(updatedBuilding, buildingDef, railPoint);
        nodesUpdate[nodeId] = {
          ...node,
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
        };
      }
    }

    if (Object.keys(nodesUpdate).length > 0) {
      stateUpdates.railwayNodes = {
        ...state.railwayNodes,
        ...nodesUpdate,
      };
      
      // Find affected segments using index
      const affectedSegments = new Set<string>();
      affectedNodeIds.forEach(nodeId => {
        const segments = connectionIndexes.nodeToSegments.get(nodeId) || new Set();
        segments.forEach(segId => affectedSegments.add(segId));
      });

      if (affectedSegments.size > 0) {
        const segmentsUpdate: typeof state.railwaySegments = {};
        const finalNodes = stateUpdates.railwayNodes!;

        for (const segmentId of affectedSegments) {
          const segment = state.railwaySegments[segmentId];
          const startNode = finalNodes[segment.startNode] || state.railwayNodes[segment.startNode];
          const endNode = finalNodes[segment.endNode] || state.railwayNodes[segment.endNode];

          if (startNode && endNode) {
            segmentsUpdate[segmentId] = {
              ...segment,
              startPoint: { x: startNode.x, y: startNode.y, z: startNode.z },
              endPoint: { x: endNode.x, y: endNode.y, z: endNode.z },
              length: distance3D(startNode, endNode),
            };

            // Handle curve segments
            if (segment.type === 'curve') {
              const updatedSegment = recalculateSegmentCurveControlPoints(
                segmentId,
                { ...state.railwaySegments, ...segmentsUpdate },
                finalNodes,
                state.railways
              );
              
              if (updatedSegment) {
                segmentsUpdate[segmentId] = updatedSegment;
              }
            }
          }
        }

        // Find and update adjacent segments that might need curve recalculation
        const adjacentSegmentIds = findAdjacentSegmentsForCurveRecalculation(
          buildingId, 
          { ...state.railwaySegments, ...segmentsUpdate }, 
          finalNodes, 
          state.railways
        );
        
        adjacentSegmentIds.forEach((adjacentSegmentId) => {
          // Skip if we already processed this segment
          if (affectedSegments.has(adjacentSegmentId)) return;
          
          const segment = state.railwaySegments[adjacentSegmentId];
          if (segment && segment.type === 'curve') {
            const updatedSegment = recalculateSegmentCurveControlPoints(
              adjacentSegmentId,
              { ...state.railwaySegments, ...segmentsUpdate },
              finalNodes,
              state.railways
            );
            
            if (updatedSegment) {
              segmentsUpdate[adjacentSegmentId] = updatedSegment;
            }
          }
        });

        // Update metadata for segments that reference this building
        const updatedMetadataSegments = updateRailwaySegmentMetadata(
          buildingId, 
          { ...state.railwaySegments, ...segmentsUpdate }, 
          finalNodes
        );
        Object.assign(segmentsUpdate, updatedMetadataSegments);
        
        // Validate and repair railway connections after the update
        const validationResult = validateAndRepairRailwayConnections(
          buildingId, 
          { ...state.railwaySegments, ...segmentsUpdate }, 
          finalNodes, 
          state.railways
        );
        Object.assign(segmentsUpdate, validationResult.repairedSegments);
        
        // Log any validation errors for debugging
        if (validationResult.validationErrors.length > 0) {
          console.warn('Railway validation errors after building update:', validationResult.validationErrors);
        }

        if (Object.keys(segmentsUpdate).length > 0) {
          stateUpdates.railwaySegments = {
            ...state.railwaySegments,
            ...segmentsUpdate,
          };
        }
      }
    }
  }

  return stateUpdates;
}

// Batched update support for multiple buildings
export function batchUpdateBuildings(
  state: LayoutState,
  updates: Array<{ id: string; updates: Partial<Building> }>
): Partial<LayoutState> {
  // Use indexes from state
  const indexes = state.indexes;
  
  // Accumulate all updates
  let accumulatedState = state;
  const mergedUpdates: Partial<LayoutState> = {};

  for (const update of updates) {
    const partialUpdate = optimizedUpdateBuilding(accumulatedState, update.id, update.updates, indexes);
    
    // Merge updates efficiently
    Object.keys(partialUpdate).forEach(key => {
      const k = key as keyof LayoutState;
      if (k === 'buildings' && mergedUpdates.buildings) {
        mergedUpdates.buildings = { ...mergedUpdates.buildings, ...partialUpdate.buildings };
      } else if (k === 'conveyorPoles' && mergedUpdates.conveyorPoles) {
        mergedUpdates.conveyorPoles = { ...mergedUpdates.conveyorPoles, ...partialUpdate.conveyorPoles };
      } else if (k === 'pipeSupports' && mergedUpdates.pipeSupports) {
        mergedUpdates.pipeSupports = { ...mergedUpdates.pipeSupports, ...partialUpdate.pipeSupports };
      } else if (k === 'railwayNodes' && mergedUpdates.railwayNodes) {
        mergedUpdates.railwayNodes = { ...mergedUpdates.railwayNodes, ...partialUpdate.railwayNodes };
      } else if (k === 'railwaySegments' && mergedUpdates.railwaySegments) {
        mergedUpdates.railwaySegments = { ...mergedUpdates.railwaySegments, ...partialUpdate.railwaySegments };
      } else {
        (mergedUpdates as any)[k] = (partialUpdate as any)[k];
      }
    });
    
    // Update accumulated state for next iteration
    accumulatedState = { ...accumulatedState, ...partialUpdate };
  }

  return mergedUpdates;
}

// Create connection indexes for fast lookups
export function createConnectionIndexes(state: LayoutState): RelationshipIndexes {
  const buildingToConveyors = new Map<string, Set<string>>();
  const buildingToPipelines = new Map<string, Set<string>>();
  const buildingToRailways = new Map<string, Set<string>>();
  const buildingToRailNodes = new Map<string, Set<string>>();
  
  const conveyorToBuildingFrom = new Map<string, string>();
  const conveyorToBuildingTo = new Map<string, string>();
  const pipelineToBuildingFrom = new Map<string, string>();
  const pipelineToBuildingTo = new Map<string, string>();
  const nodeToSegments = new Map<string, Set<string>>();
  const segmentToNodes = new Map<string, [string, string]>();
  const stationToSegments = new Map<string, Set<string>>();
  const railwayToStations = new Map<string, Set<string>>();
  const liftToConveyors = new Map<string, Set<string>>();
  const floorConnectionToPipes = new Map<string, Set<string>>();

  // Index conveyor belts
  Object.entries(state.conveyorBelts).forEach(([beltId, belt]) => {
    if (belt.fromBuildingId) {
      if (!buildingToConveyors.has(belt.fromBuildingId)) {
        buildingToConveyors.set(belt.fromBuildingId, new Set());
      }
      buildingToConveyors.get(belt.fromBuildingId)!.add(beltId);
      conveyorToBuildingFrom.set(beltId, belt.fromBuildingId);
    }
    if (belt.toBuildingId) {
      if (!buildingToConveyors.has(belt.toBuildingId)) {
        buildingToConveyors.set(belt.toBuildingId, new Set());
      }
      buildingToConveyors.get(belt.toBuildingId)!.add(beltId);
      conveyorToBuildingTo.set(beltId, belt.toBuildingId);
    }
  });

  // Index pipelines
  Object.entries(state.pipelines).forEach(([pipelineId, pipeline]) => {
    if (pipeline.fromBuildingId) {
      if (!buildingToPipelines.has(pipeline.fromBuildingId)) {
        buildingToPipelines.set(pipeline.fromBuildingId, new Set());
      }
      buildingToPipelines.get(pipeline.fromBuildingId)!.add(pipelineId);
      pipelineToBuildingFrom.set(pipelineId, pipeline.fromBuildingId);
    }
    if (pipeline.toBuildingId) {
      if (!buildingToPipelines.has(pipeline.toBuildingId)) {
        buildingToPipelines.set(pipeline.toBuildingId, new Set());
      }
      buildingToPipelines.get(pipeline.toBuildingId)!.add(pipelineId);
      pipelineToBuildingTo.set(pipelineId, pipeline.toBuildingId);
    }
  });

  // Index railways
  Object.entries(state.railways).forEach(([railwayId, railway]) => {
    // Set up railway to stations index
    if (!railwayToStations.has(railwayId)) {
      railwayToStations.set(railwayId, new Set());
    }
    
    railway.stations.forEach(stationId => {
      // Extract building ID from station string or get building from stations array
      if (typeof stationId === 'string') {
        if (!buildingToRailways.has(stationId)) {
          buildingToRailways.set(stationId, new Set());
        }
        buildingToRailways.get(stationId)!.add(railwayId);
        railwayToStations.get(railwayId)!.add(stationId);
      }
    });
  });

  // Index conveyor lifts
  Object.entries(state.conveyorLifts || {}).forEach(([liftId, lift]) => {
    // Conveyor lifts may be connected to conveyor belts
    // This would need to be implemented based on actual lift structure
    if (!liftToConveyors.has(liftId)) {
      liftToConveyors.set(liftId, new Set());
    }
  });

  // Index pipe floor connections
  Object.entries(state.pipeFloorConnections || {}).forEach(([connectionId, connection]) => {
    // Pipe floor connections may be connected to pipelines
    // This would need to be implemented based on actual connection structure
    if (!floorConnectionToPipes.has(connectionId)) {
      floorConnectionToPipes.set(connectionId, new Set());
    }
  });

  // Index railway nodes
  Object.entries(state.railwayNodes).forEach(([nodeId, node]) => {
    // Extract building ID from anchor nodes (format: rail-anchor-{buildingId}-{railPointId})
    if (nodeId.startsWith('rail-anchor-')) {
      const parts = nodeId.split('-');
      if (parts.length >= 4) {
        const buildingId = parts[2];
        if (!buildingToRailNodes.has(buildingId)) {
          buildingToRailNodes.set(buildingId, new Set());
        }
        buildingToRailNodes.get(buildingId)!.add(nodeId);
      }
    }
  });

  // Index node to segments relationships
  Object.entries(state.railwaySegments).forEach(([segmentId, segment]) => {
    if (!nodeToSegments.has(segment.startNode)) {
      nodeToSegments.set(segment.startNode, new Set());
    }
    nodeToSegments.get(segment.startNode)!.add(segmentId);

    if (!nodeToSegments.has(segment.endNode)) {
      nodeToSegments.set(segment.endNode, new Set());
    }
    nodeToSegments.get(segment.endNode)!.add(segmentId);
    
    // Also create reverse mapping
    segmentToNodes.set(segmentId, [segment.startNode, segment.endNode]);
  });

  return {
    buildingToConveyors,
    buildingToPipelines,
    buildingToRailways,
    buildingToRailNodes,
    conveyorToBuildingFrom,
    conveyorToBuildingTo,
    pipelineToBuildingFrom,
    pipelineToBuildingTo,
    nodeToSegments,
    segmentToNodes,
    stationToSegments,
    railwayToStations,
    liftToConveyors,
    floorConnectionToPipes,
  };
}

// Index management functions for maintaining relationships
export function indexConveyorBelt(indexes: RelationshipIndexes, beltId: string, belt: any) {
  if (belt.fromBuildingId) {
    if (!indexes.buildingToConveyors.has(belt.fromBuildingId)) {
      indexes.buildingToConveyors.set(belt.fromBuildingId, new Set());
    }
    indexes.buildingToConveyors.get(belt.fromBuildingId)!.add(beltId);
    indexes.conveyorToBuildingFrom.set(beltId, belt.fromBuildingId);
  }
  if (belt.toBuildingId) {
    if (!indexes.buildingToConveyors.has(belt.toBuildingId)) {
      indexes.buildingToConveyors.set(belt.toBuildingId, new Set());
    }
    indexes.buildingToConveyors.get(belt.toBuildingId)!.add(beltId);
    indexes.conveyorToBuildingTo.set(beltId, belt.toBuildingId);
  }
}

export function indexPipeline(indexes: RelationshipIndexes, pipelineId: string, pipeline: any) {
  if (pipeline.fromBuildingId) {
    if (!indexes.buildingToPipelines.has(pipeline.fromBuildingId)) {
      indexes.buildingToPipelines.set(pipeline.fromBuildingId, new Set());
    }
    indexes.buildingToPipelines.get(pipeline.fromBuildingId)!.add(pipelineId);
    indexes.pipelineToBuildingFrom.set(pipelineId, pipeline.fromBuildingId);
  }
  if (pipeline.toBuildingId) {
    if (!indexes.buildingToPipelines.has(pipeline.toBuildingId)) {
      indexes.buildingToPipelines.set(pipeline.toBuildingId, new Set());
    }
    indexes.buildingToPipelines.get(pipeline.toBuildingId)!.add(pipelineId);
    indexes.pipelineToBuildingTo.set(pipelineId, pipeline.toBuildingId);
  }
}

export function indexRailway(indexes: RelationshipIndexes, railwayId: string, railway: any) {
  if (railway.stations) {
    railway.stations.forEach((stationId: string) => {
      if (typeof stationId === 'string') {
        if (!indexes.buildingToRailways.has(stationId)) {
          indexes.buildingToRailways.set(stationId, new Set());
        }
        indexes.buildingToRailways.get(stationId)!.add(railwayId);
      }
    });
  }
}

export function indexRailwayNode(indexes: RelationshipIndexes, nodeId: string, node: any) {
  // Extract building ID from anchor nodes (format: rail-anchor-{buildingId}-{railPointId})
  if (nodeId.startsWith('rail-anchor-')) {
    const parts = nodeId.split('-');
    if (parts.length >= 4) {
      const buildingId = parts[2];
      if (!indexes.buildingToRailNodes.has(buildingId)) {
        indexes.buildingToRailNodes.set(buildingId, new Set());
      }
      indexes.buildingToRailNodes.get(buildingId)!.add(nodeId);
    }
  }
}

export function indexRailwaySegment(indexes: RelationshipIndexes, segmentId: string, segment: any) {
  if (segment.startNode) {
    if (!indexes.nodeToSegments.has(segment.startNode)) {
      indexes.nodeToSegments.set(segment.startNode, new Set());
    }
    indexes.nodeToSegments.get(segment.startNode)!.add(segmentId);
  }
  if (segment.endNode) {
    if (!indexes.nodeToSegments.has(segment.endNode)) {
      indexes.nodeToSegments.set(segment.endNode, new Set());
    }
    indexes.nodeToSegments.get(segment.endNode)!.add(segmentId);
  }
  if (segment.startNode && segment.endNode) {
    indexes.segmentToNodes.set(segmentId, [segment.startNode, segment.endNode]);
  }
}

// Unindex functions for cleanup
export function unindexConveyorBelt(indexes: RelationshipIndexes, beltId: string, belt: any) {
  if (belt.fromBuildingId) {
    const set = indexes.buildingToConveyors.get(belt.fromBuildingId);
    if (set) {
      set.delete(beltId);
      if (set.size === 0) {
        indexes.buildingToConveyors.delete(belt.fromBuildingId);
      }
    }
    indexes.conveyorToBuildingFrom.delete(beltId);
  }
  if (belt.toBuildingId) {
    const set = indexes.buildingToConveyors.get(belt.toBuildingId);
    if (set) {
      set.delete(beltId);
      if (set.size === 0) {
        indexes.buildingToConveyors.delete(belt.toBuildingId);
      }
    }
    indexes.conveyorToBuildingTo.delete(beltId);
  }
}

export function unindexPipeline(indexes: RelationshipIndexes, pipelineId: string, pipeline: any) {
  if (pipeline.fromBuildingId) {
    const set = indexes.buildingToPipelines.get(pipeline.fromBuildingId);
    if (set) {
      set.delete(pipelineId);
      if (set.size === 0) {
        indexes.buildingToPipelines.delete(pipeline.fromBuildingId);
      }
    }
    indexes.pipelineToBuildingFrom.delete(pipelineId);
  }
  if (pipeline.toBuildingId) {
    const set = indexes.buildingToPipelines.get(pipeline.toBuildingId);
    if (set) {
      set.delete(pipelineId);
      if (set.size === 0) {
        indexes.buildingToPipelines.delete(pipeline.toBuildingId);
      }
    }
    indexes.pipelineToBuildingTo.delete(pipelineId);
  }
}

export function unindexRailway(indexes: RelationshipIndexes, railwayId: string, railway: any) {
  if (railway.stations) {
    railway.stations.forEach((stationId: string) => {
      if (typeof stationId === 'string') {
        const set = indexes.buildingToRailways.get(stationId);
        if (set) {
          set.delete(railwayId);
          if (set.size === 0) {
            indexes.buildingToRailways.delete(stationId);
          }
        }
      }
    });
  }
}

export function unindexRailwayNode(indexes: RelationshipIndexes, nodeId: string) {
  // Extract building ID from anchor nodes (format: rail-anchor-{buildingId}-{railPointId})
  if (nodeId.startsWith('rail-anchor-')) {
    const parts = nodeId.split('-');
    if (parts.length >= 4) {
      const buildingId = parts[2];
      const set = indexes.buildingToRailNodes.get(buildingId);
      if (set) {
        set.delete(nodeId);
        if (set.size === 0) {
          indexes.buildingToRailNodes.delete(buildingId);
        }
      }
    }
  }
}

export function unindexRailwaySegment(indexes: RelationshipIndexes, segmentId: string, segment: any) {
  if (segment.startNode) {
    const set = indexes.nodeToSegments.get(segment.startNode);
    if (set) {
      set.delete(segmentId);
      if (set.size === 0) {
        indexes.nodeToSegments.delete(segment.startNode);
      }
    }
  }
  if (segment.endNode) {
    const set = indexes.nodeToSegments.get(segment.endNode);
    if (set) {
      set.delete(segmentId);
      if (set.size === 0) {
        indexes.nodeToSegments.delete(segment.endNode);
      }
    }
  }
  indexes.segmentToNodes.delete(segmentId);
}

// Helper functions for common queries
export function getConnectedItems(indexes: RelationshipIndexes, buildingId: string) {
  return {
    conveyors: indexes.buildingToConveyors.get(buildingId) || new Set(),
    pipelines: indexes.buildingToPipelines.get(buildingId) || new Set(),
    railways: indexes.buildingToRailways.get(buildingId) || new Set(),
    railNodes: indexes.buildingToRailNodes.get(buildingId) || new Set(),
  };
}

export function getNodeSegments(indexes: RelationshipIndexes, nodeId: string) {
  return indexes.nodeToSegments.get(nodeId) || new Set();
}

// Create empty indexes helper
export function createEmptyIndexes(): RelationshipIndexes {
  return {
    buildingToConveyors: new Map(),
    buildingToPipelines: new Map(),
    buildingToRailways: new Map(),
    buildingToRailNodes: new Map(),
    conveyorToBuildingFrom: new Map(),
    conveyorToBuildingTo: new Map(),
    pipelineToBuildingFrom: new Map(),
    pipelineToBuildingTo: new Map(),
    nodeToSegments: new Map(),
    segmentToNodes: new Map(),
    stationToSegments: new Map(),
    railwayToStations: new Map(),
    liftToConveyors: new Map(),
    floorConnectionToPipes: new Map(),
  };
}

// Build indexes from state
export function buildIndexes(state: LayoutState): RelationshipIndexes {
  return createConnectionIndexes(state);
}