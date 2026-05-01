// src/utils/stationSnapping.ts
import { Building, Point3D, RailwayConnectionPoint } from '../types';
import { BUILDING_TYPES, BUILDING_RAILWAY_SNAP_THRESHOLD } from '../constants';
import { getRailwayConnectionPointWorldPos, distance3D } from './helpers';

// Types for station snapping
export interface StationSnapTarget {
  building: Building;
  alignmentPosition: Point3D;
  snapDistance: number;
  matchingRailwayPoints: { source: RailwayConnectionPoint; target: RailwayConnectionPoint }[];
}

export interface StationSnapResult {
  shouldSnap: boolean;
  snapTarget?: StationSnapTarget;
  visualIndicator?: StationSnapVisualIndicator;
}

export interface StationSnapVisualIndicator {
  position: Point3D;
  targetPosition: Point3D;
  building: Building;
  isActive: boolean;
}

// Train station types that support railway connections
const TRAIN_STATION_TYPES = [
  'train_station',
  'freight_platform', 
  'fluid_freight_platform',
  'empty_platform'
];

/**
 * Checks if a building type supports railway connections
 */
export const isTrainStation = (buildingType: string): boolean => {
  return TRAIN_STATION_TYPES.includes(buildingType);
};

/**
 * Gets all railway connection points for a building at its current position/rotation
 */
export const getBuildingRailwayPoints = (building: Building): Point3D[] => {
  const buildingDef = BUILDING_TYPES[building.type];
  if (!buildingDef?.railwayPoints) return [];

  return buildingDef.railwayPoints.map(railPoint => 
    getRailwayConnectionPointWorldPos(building, buildingDef, railPoint)
  );
};

/**
 * Calculates the position needed to align two buildings' railway points
 */
export const calculateStationAlignment = (
  sourceBuilding: Building,
  targetBuilding: Building,
  sourceRailPoint: RailwayConnectionPoint,
  targetRailPoint: RailwayConnectionPoint
): Point3D | null => {
  const sourceBuildingDef = BUILDING_TYPES[sourceBuilding.type];
  const targetBuildingDef = BUILDING_TYPES[targetBuilding.type];
  
  if (!sourceBuildingDef?.railwayPoints || !targetBuildingDef?.railwayPoints) {
    return null;
  }

  // Get the target railway point world position
  const targetWorldPos = getRailwayConnectionPointWorldPos(targetBuilding, targetBuildingDef, targetRailPoint);

  // Calculate where the source building center needs to be to align its railway point with the target
  const sourceBuildingCenter = { 
    x: sourceBuildingDef.width / 2, 
    y: sourceBuildingDef.height / 2 
  };

  // Apply rotation to the source railway point to get its offset from building center
  let railPointOffset = { 
    x: sourceRailPoint.x - sourceBuildingCenter.x, 
    y: sourceRailPoint.y - sourceBuildingCenter.y 
  };

  // Apply source building's rotation to the railway point offset
  switch (sourceBuilding.rotation) {
    case 90:
      railPointOffset = { x: -railPointOffset.y, y: railPointOffset.x };
      break;
    case 180:
      railPointOffset = { x: -railPointOffset.x, y: -railPointOffset.y };
      break;
    case 270:
      railPointOffset = { x: railPointOffset.y, y: -railPointOffset.x };
      break;
    // case 0: no change needed
  }

  // Calculate the required building position to align railway points
  const alignedPosition: Point3D = {
    x: targetWorldPos.x - railPointOffset.x,
    y: targetWorldPos.y - railPointOffset.y,
    z: targetBuilding.z, // Keep same floor level
  };

  return alignedPosition;
};

/**
 * Finds railway points that could connect between two train stations
 * Looks for input/output pairs that could logically connect
 */
export const findMatchingRailwayPoints = (
  sourceBuilding: Building,
  targetBuilding: Building
): { source: RailwayConnectionPoint; target: RailwayConnectionPoint }[] => {
  const sourceBuildingDef = BUILDING_TYPES[sourceBuilding.type];
  const targetBuildingDef = BUILDING_TYPES[targetBuilding.type];
  
  if (!sourceBuildingDef?.railwayPoints || !targetBuildingDef?.railwayPoints) {
    return [];
  }

  const matches: { source: RailwayConnectionPoint; target: RailwayConnectionPoint }[] = [];

  // Look for complementary connections (output to input)
  sourceBuildingDef.railwayPoints.forEach(sourcePoint => {
    targetBuildingDef.railwayPoints.forEach(targetPoint => {
      // Connect outputs to inputs when possible
      if (sourcePoint.direction === 'out' && targetPoint.direction === 'in') {
        matches.push({ source: sourcePoint, target: targetPoint });
      }
      // Also allow same-direction connections for flexibility
      else if (sourcePoint.direction === targetPoint.direction) {
        matches.push({ source: sourcePoint, target: targetPoint });
      }
    });
  });

  return matches;
};

/**
 * Detects nearby train stations and calculates optimal alignment position
 */
export const detectNearbyStations = (
  sourceBuilding: Building,
  allBuildings: Record<string, Building>,
  snapThreshold: number = BUILDING_RAILWAY_SNAP_THRESHOLD
): StationSnapResult => {
  if (!isTrainStation(sourceBuilding.type)) {
    return { shouldSnap: false };
  }

  const sourceBuildingDef = BUILDING_TYPES[sourceBuilding.type];
  if (!sourceBuildingDef?.railwayPoints) {
    return { shouldSnap: false };
  }

  let bestSnapTarget: StationSnapTarget | undefined;
  let shortestDistance = snapThreshold;

  Object.values(allBuildings).forEach(targetBuilding => {
    // Skip same building and non-station buildings
    if (targetBuilding.id === sourceBuilding.id) {
      return;
    }
    
    if (!isTrainStation(targetBuilding.type)) {
      return;
    }

    // Skip buildings on different floors
    if (targetBuilding.z !== sourceBuilding.z) {
      return;
    }

    // Find potential railway point matches
    const railwayMatches = findMatchingRailwayPoints(sourceBuilding, targetBuilding);
    
    if (railwayMatches.length === 0) {
      return;
    }

    // Check each possible alignment
    railwayMatches.forEach(match => {
      const alignmentPosition = calculateStationAlignment(
        sourceBuilding, 
        targetBuilding, 
        match.source, 
        match.target
      );

      if (!alignmentPosition) {
        return;
      }

      // Calculate distance from current position to alignment position
      const distance = distance3D(
        { x: sourceBuilding.x, y: sourceBuilding.y, z: sourceBuilding.z },
        alignmentPosition
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        bestSnapTarget = {
          building: targetBuilding,
          alignmentPosition,
          snapDistance: distance,
          matchingRailwayPoints: [match]
        };
      }
    });
  });

  if (bestSnapTarget) {
    return {
      shouldSnap: true,
      snapTarget: bestSnapTarget,
      visualIndicator: {
        position: { x: sourceBuilding.x, y: sourceBuilding.y, z: sourceBuilding.z },
        targetPosition: bestSnapTarget.alignmentPosition,
        building: bestSnapTarget.building,
        isActive: true
      }
    };
  }

  return { shouldSnap: false };
};

/**
 * Snaps a building to align with a nearby train station
 */
export const snapBuildingToStation = (
  building: Building,
  snapResult: StationSnapResult
): Building | null => {
  if (!snapResult.shouldSnap || !snapResult.snapTarget) {
    return null;
  }

  return {
    ...building,
    x: snapResult.snapTarget.alignmentPosition.x,
    y: snapResult.snapTarget.alignmentPosition.y,
    z: snapResult.snapTarget.alignmentPosition.z,
  };
};

/**
 * Connects the prefab railways of two adjacent train stations.
 * When a train station is snapped to another, this function merges their internal
 * railway segments by combining the endpoint nodes that are now at the same position.
 *
 * @param sourceBuilding The building that was just placed/snapped
 * @param targetBuilding The building it snapped to
 * @param sourceRailPoint The railway point on the source building that connects
 * @param targetRailPoint The railway point on the target building that connects
 * @param railwayNodes Current railway nodes
 * @param railwaySegments Current railway segments
 * @param railways Current railways
 * @returns Updated railway data with merged connections, or null if no merge needed
 */
export const connectAdjacentStationRailways = (
  sourceBuilding: Building,
  targetBuilding: Building,
  sourceRailPoint: RailwayConnectionPoint,
  targetRailPoint: RailwayConnectionPoint,
  railwayNodes: Record<string, import('../types').RailwayNode>,
  railwaySegments: Record<string, import('../types').RailwaySegment>,
  railways: Record<string, import('../types').Railway>
): {
  nodes: Record<string, import('../types').RailwayNode>;
  segments: Record<string, import('../types').RailwaySegment>;
  railways: Record<string, import('../types').Railway>;
} | null => {
  // Get the node IDs for the connecting railway points
  const sourceNodeId = `rail-anchor-${sourceBuilding.id}-${sourceRailPoint.id}`;
  const targetNodeId = `rail-anchor-${targetBuilding.id}-${targetRailPoint.id}`;

  const sourceNode = railwayNodes[sourceNodeId];
  const targetNode = railwayNodes[targetNodeId];

  if (!sourceNode || !targetNode) {
    // Nodes don't exist yet - this might be during initial placement
    return null;
  }

  // Check if nodes are close enough to connect (should be at the same position after snapping)
  const distance = Math.sqrt(
    Math.pow(sourceNode.x - targetNode.x, 2) +
    Math.pow(sourceNode.y - targetNode.y, 2) +
    Math.pow(sourceNode.z - targetNode.z, 2)
  );

  // Nodes should be essentially at the same position (within 0.5m tolerance)
  if (distance > 0.5) {
    return null;
  }

  // Merge the nodes - keep the target node and update all references to source node
  const newNodes = { ...railwayNodes };
  const newSegments = { ...railwaySegments };
  const newRailways = { ...railways };

  // Find all segments that reference the source node and update them to use the target node
  Object.entries(newSegments).forEach(([segmentId, segment]) => {
    let updated = false;
    const updatedSegment = { ...segment };

    if (segment.startNode === sourceNodeId) {
      updatedSegment.startNode = targetNodeId;
      updatedSegment.startPoint = { x: targetNode.x, y: targetNode.y, z: targetNode.z };
      updated = true;
    }
    if (segment.endNode === sourceNodeId) {
      updatedSegment.endNode = targetNodeId;
      updatedSegment.endPoint = { x: targetNode.x, y: targetNode.y, z: targetNode.z };
      updated = true;
    }

    if (updated) {
      // Recalculate length if positions changed
      const startNode = newNodes[updatedSegment.startNode] || targetNode;
      const endNode = newNodes[updatedSegment.endNode] || targetNode;
      updatedSegment.length = Math.sqrt(
        Math.pow(startNode.x - endNode.x, 2) +
        Math.pow(startNode.y - endNode.y, 2) +
        Math.pow(startNode.z - endNode.z, 2)
      );
      newSegments[segmentId] = updatedSegment;
    }
  });

  // Remove the source node since it's been merged into target
  delete newNodes[sourceNodeId];

  // Merge the railways that contain these buildings
  const sourceRailwayId = `railway-prefab-${sourceBuilding.id}`;
  const targetRailwayId = `railway-prefab-${targetBuilding.id}`;

  const sourceRailway = newRailways[sourceRailwayId];
  const targetRailway = newRailways[targetRailwayId];

  if (sourceRailway && targetRailway) {
    // Merge segments and stations into the target railway
    targetRailway.segments = [...new Set([...targetRailway.segments, ...sourceRailway.segments])];
    targetRailway.stations = [...new Set([...targetRailway.stations, ...sourceRailway.stations])];

    // Delete the source railway as it's been merged
    delete newRailways[sourceRailwayId];
  }

  return {
    nodes: newNodes,
    segments: newSegments,
    railways: newRailways,
  };
};

/**
 * Checks if two train stations can have their railways connected
 * Returns the matching railway points that would connect
 */
export const canConnectStationRailways = (
  sourceBuilding: Building,
  targetBuilding: Building
): { source: RailwayConnectionPoint; target: RailwayConnectionPoint } | null => {
  if (!isTrainStation(sourceBuilding.type) || !isTrainStation(targetBuilding.type)) {
    return null;
  }

  const sourceBuildingDef = BUILDING_TYPES[sourceBuilding.type];
  const targetBuildingDef = BUILDING_TYPES[targetBuilding.type];

  if (!sourceBuildingDef?.railwayPoints || !targetBuildingDef?.railwayPoints) {
    return null;
  }

  // Get world positions of all railway points
  for (const sourcePoint of sourceBuildingDef.railwayPoints) {
    const sourceWorldPos = getRailwayConnectionPointWorldPos(sourceBuilding, sourceBuildingDef, sourcePoint);

    for (const targetPoint of targetBuildingDef.railwayPoints) {
      const targetWorldPos = getRailwayConnectionPointWorldPos(targetBuilding, targetBuildingDef, targetPoint);

      // Check if these points are close enough to connect (within 1m tolerance)
      const distance = Math.sqrt(
        Math.pow(sourceWorldPos.x - targetWorldPos.x, 2) +
        Math.pow(sourceWorldPos.y - targetWorldPos.y, 2) +
        Math.pow(sourceWorldPos.z - targetWorldPos.z, 2)
      );

      if (distance < 1.0) {
        // Check directional compatibility
        // out -> in is ideal, but same directions also work for platform chaining
        const isCompatible =
          (sourcePoint.direction === 'out' && targetPoint.direction === 'in') ||
          (sourcePoint.direction === 'in' && targetPoint.direction === 'out') ||
          (sourcePoint.direction === targetPoint.direction); // Same direction for platform chaining

        if (isCompatible) {
          return { source: sourcePoint, target: targetPoint };
        }
      }
    }
  }

  return null;
};