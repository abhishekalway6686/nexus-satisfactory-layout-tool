// Index management utilities for maintaining relationship indexes
import { 
  RelationshipIndexes, 
  LayoutState, 
  ConveyorBelt, 
  Pipeline, 
  Railway, 
  RailwaySegment,
  RailwayNode,
  Building,
  ConveyorLift,
  PipeFloorConnection
} from '../types';

// Create empty indexes
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

// Helper to add item to a set in a map
function addToSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  map.get(key)!.add(value);
}

// Helper to remove item from a set in a map
function removeFromSetMap<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  const set = map.get(key);
  if (set) {
    set.delete(value);
    if (set.size === 0) {
      map.delete(key);
    }
  }
}

// Build complete indexes from current state
export function buildIndexes(state: Partial<LayoutState>): RelationshipIndexes {
  const indexes = createEmptyIndexes();

  // Index conveyors
  if (state.conveyorBelts) {
    Object.entries(state.conveyorBelts).forEach(([beltId, belt]) => {
      indexConveyorBelt(indexes, beltId, belt);
    });
  }

  // Index pipelines
  if (state.pipelines) {
    Object.entries(state.pipelines).forEach(([pipelineId, pipeline]) => {
      indexPipeline(indexes, pipelineId, pipeline);
    });
  }

  // Index railways and their components
  if (state.railways && state.railwaySegments && state.railwayNodes) {
    Object.entries(state.railways).forEach(([railwayId, railway]) => {
      indexRailway(indexes, railwayId, railway);
    });

    Object.entries(state.railwaySegments).forEach(([segmentId, segment]) => {
      indexRailwaySegment(indexes, segmentId, segment);
    });

    Object.entries(state.railwayNodes).forEach(([nodeId, node]) => {
      indexRailwayNode(indexes, nodeId, node);
    });
  }

  // Index conveyor lifts
  if (state.conveyorLifts) {
    Object.entries(state.conveyorLifts).forEach(([liftId, lift]) => {
      indexConveyorLift(indexes, liftId, lift, state.conveyorBelts || {});
    });
  }

  // Index pipe floor connections
  if (state.pipeFloorConnections) {
    Object.entries(state.pipeFloorConnections).forEach(([connectionId, connection]) => {
      indexPipeFloorConnection(indexes, connectionId, connection, state.pipelines || {});
    });
  }

  return indexes;
}

// Index a single conveyor belt
export function indexConveyorBelt(indexes: RelationshipIndexes, beltId: string, belt: ConveyorBelt): void {
  if (belt.fromBuildingId) {
    addToSetMap(indexes.buildingToConveyors, belt.fromBuildingId, beltId);
    indexes.conveyorToBuildingFrom.set(beltId, belt.fromBuildingId);
  }
  if (belt.toBuildingId) {
    addToSetMap(indexes.buildingToConveyors, belt.toBuildingId, beltId);
    indexes.conveyorToBuildingTo.set(beltId, belt.toBuildingId);
  }
}

// Remove a conveyor belt from indexes
export function unindexConveyorBelt(indexes: RelationshipIndexes, beltId: string, belt: ConveyorBelt): void {
  if (belt.fromBuildingId) {
    removeFromSetMap(indexes.buildingToConveyors, belt.fromBuildingId, beltId);
    indexes.conveyorToBuildingFrom.delete(beltId);
  }
  if (belt.toBuildingId) {
    removeFromSetMap(indexes.buildingToConveyors, belt.toBuildingId, beltId);
    indexes.conveyorToBuildingTo.delete(beltId);
  }
}

// Index a single pipeline
export function indexPipeline(indexes: RelationshipIndexes, pipelineId: string, pipeline: Pipeline): void {
  if (pipeline.fromBuildingId) {
    addToSetMap(indexes.buildingToPipelines, pipeline.fromBuildingId, pipelineId);
    indexes.pipelineToBuildingFrom.set(pipelineId, pipeline.fromBuildingId);
  }
  if (pipeline.toBuildingId) {
    addToSetMap(indexes.buildingToPipelines, pipeline.toBuildingId, pipelineId);
    indexes.pipelineToBuildingTo.set(pipelineId, pipeline.toBuildingId);
  }
}

// Remove a pipeline from indexes
export function unindexPipeline(indexes: RelationshipIndexes, pipelineId: string, pipeline: Pipeline): void {
  if (pipeline.fromBuildingId) {
    removeFromSetMap(indexes.buildingToPipelines, pipeline.fromBuildingId, pipelineId);
    indexes.pipelineToBuildingFrom.delete(pipelineId);
  }
  if (pipeline.toBuildingId) {
    removeFromSetMap(indexes.buildingToPipelines, pipeline.toBuildingId, pipelineId);
    indexes.pipelineToBuildingTo.delete(pipelineId);
  }
}

// Index a railway
export function indexRailway(indexes: RelationshipIndexes, railwayId: string, railway: Railway): void {
  railway.stations.forEach(stationId => {
    addToSetMap(indexes.buildingToRailways, stationId, railwayId);
    addToSetMap(indexes.railwayToStations, railwayId, stationId);
  });
}

// Remove a railway from indexes
export function unindexRailway(indexes: RelationshipIndexes, railwayId: string, railway: Railway): void {
  railway.stations.forEach(stationId => {
    removeFromSetMap(indexes.buildingToRailways, stationId, railwayId);
  });
  indexes.railwayToStations.delete(railwayId);
}

// Index a railway segment
export function indexRailwaySegment(indexes: RelationshipIndexes, segmentId: string, segment: RailwaySegment): void {
  // Index nodes
  addToSetMap(indexes.nodeToSegments, segment.startNode, segmentId);
  addToSetMap(indexes.nodeToSegments, segment.endNode, segmentId);
  indexes.segmentToNodes.set(segmentId, [segment.startNode, segment.endNode]);

  // Index stations
  if (segment.fromStation) {
    addToSetMap(indexes.stationToSegments, segment.fromStation, segmentId);
  }
  if (segment.toStation) {
    addToSetMap(indexes.stationToSegments, segment.toStation, segmentId);
  }
}

// Remove a railway segment from indexes
export function unindexRailwaySegment(indexes: RelationshipIndexes, segmentId: string, segment: RailwaySegment): void {
  removeFromSetMap(indexes.nodeToSegments, segment.startNode, segmentId);
  removeFromSetMap(indexes.nodeToSegments, segment.endNode, segmentId);
  indexes.segmentToNodes.delete(segmentId);

  if (segment.fromStation) {
    removeFromSetMap(indexes.stationToSegments, segment.fromStation, segmentId);
  }
  if (segment.toStation) {
    removeFromSetMap(indexes.stationToSegments, segment.toStation, segmentId);
  }
}

// Index a railway node
export function indexRailwayNode(indexes: RelationshipIndexes, nodeId: string, node: RailwayNode): void {
  if (node.isAnchor && nodeId.includes('rail-anchor-')) {
    const buildingMatch = nodeId.match(/rail-anchor-([^-]+)-/);
    if (buildingMatch) {
      const buildingId = buildingMatch[1];
      addToSetMap(indexes.buildingToRailNodes, buildingId, nodeId);
    }
  }
}

// Remove a railway node from indexes
export function unindexRailwayNode(indexes: RelationshipIndexes, nodeId: string, node: RailwayNode): void {
  if (node.isAnchor && nodeId.includes('rail-anchor-')) {
    const buildingMatch = nodeId.match(/rail-anchor-([^-]+)-/);
    if (buildingMatch) {
      const buildingId = buildingMatch[1];
      removeFromSetMap(indexes.buildingToRailNodes, buildingId, nodeId);
    }
  }
}

// Index a conveyor lift
export function indexConveyorLift(
  indexes: RelationshipIndexes, 
  liftId: string, 
  lift: ConveyorLift,
  conveyorBelts: Record<string, ConveyorBelt>
): void {
  // Find belts connected to this lift
  Object.entries(conveyorBelts).forEach(([beltId, belt]) => {
    // Check if belt connects to lift via lift's connection points
    // This is a simplified version - in reality you'd check connection points
    if (belt.fromBuildingId === liftId || belt.toBuildingId === liftId) {
      addToSetMap(indexes.liftToConveyors, liftId, beltId);
    }
  });
}

// Remove a conveyor lift from indexes
export function unindexConveyorLift(indexes: RelationshipIndexes, liftId: string): void {
  indexes.liftToConveyors.delete(liftId);
}

// Index a pipe floor connection
export function indexPipeFloorConnection(
  indexes: RelationshipIndexes,
  connectionId: string,
  connection: PipeFloorConnection,
  pipelines: Record<string, Pipeline>
): void {
  // Find pipelines connected to this floor connection
  Object.entries(pipelines).forEach(([pipelineId, pipeline]) => {
    if (pipeline.fromBuildingId === connectionId || pipeline.toBuildingId === connectionId) {
      addToSetMap(indexes.floorConnectionToPipes, connectionId, pipelineId);
    }
  });
}

// Remove a pipe floor connection from indexes
export function unindexPipeFloorConnection(indexes: RelationshipIndexes, connectionId: string): void {
  indexes.floorConnectionToPipes.delete(connectionId);
}

// Remove all references to a building from indexes
export function unindexBuilding(indexes: RelationshipIndexes, buildingId: string): void {
  // Clear all sets associated with this building
  indexes.buildingToConveyors.delete(buildingId);
  indexes.buildingToPipelines.delete(buildingId);
  indexes.buildingToRailways.delete(buildingId);
  indexes.buildingToRailNodes.delete(buildingId);
  indexes.stationToSegments.delete(buildingId);
  
  // Also clean up reverse mappings
  indexes.conveyorToBuildingFrom.forEach((fromId, beltId) => {
    if (fromId === buildingId) {
      indexes.conveyorToBuildingFrom.delete(beltId);
    }
  });
  
  indexes.conveyorToBuildingTo.forEach((toId, beltId) => {
    if (toId === buildingId) {
      indexes.conveyorToBuildingTo.delete(beltId);
    }
  });
  
  indexes.pipelineToBuildingFrom.forEach((fromId, pipelineId) => {
    if (fromId === buildingId) {
      indexes.pipelineToBuildingFrom.delete(pipelineId);
    }
  });
  
  indexes.pipelineToBuildingTo.forEach((toId, pipelineId) => {
    if (toId === buildingId) {
      indexes.pipelineToBuildingTo.delete(pipelineId);
    }
  });
}

// Get all items connected to a building (O(1) lookup)
export function getConnectedItems(indexes: RelationshipIndexes, buildingId: string) {
  return {
    conveyors: Array.from(indexes.buildingToConveyors.get(buildingId) || []),
    pipelines: Array.from(indexes.buildingToPipelines.get(buildingId) || []),
    railways: Array.from(indexes.buildingToRailways.get(buildingId) || []),
    railNodes: Array.from(indexes.buildingToRailNodes.get(buildingId) || []),
    railSegments: Array.from(indexes.stationToSegments.get(buildingId) || []),
  };
}

// Get segments connected to a node (O(1) lookup)
export function getNodeSegments(indexes: RelationshipIndexes, nodeId: string): string[] {
  return Array.from(indexes.nodeToSegments.get(nodeId) || []);
}

// Get nodes for a segment (O(1) lookup)
export function getSegmentNodes(indexes: RelationshipIndexes, segmentId: string): [string, string] | null {
  return indexes.segmentToNodes.get(segmentId) || null;
}