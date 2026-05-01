// src/logic/conveyor/endpointDetection.ts
import { ConveyorBelt, ConveyorSegment, ConveyorPole } from '../../types';

/**
 * Represents an unconnected endpoint of a conveyor belt
 */
export interface ConveyorEndpoint {
  /** The ID of the pole at this endpoint */
  poleId: string;
  /** The pole data at this endpoint */
  pole: ConveyorPole;
  /** The ID of the belt this endpoint belongs to */
  beltId: string;
  /** Whether this is the start of the belt (true) or end (false) */
  isStart: boolean;
  /** Whether this endpoint is connected to a building */
  isConnected: boolean;
  /** The ID of the segment at this endpoint */
  segmentId: string;
}

/**
 * Gets all unconnected belt endpoints on a specific floor
 *
 * An endpoint is considered unconnected if:
 * - It's at the start of a belt with no fromBuildingId
 * - It's at the end of a belt with no toBuildingId
 * - The pole at the endpoint is not an anchor pole
 *
 * @param belts - Record of all conveyor belts
 * @param segments - Record of all conveyor segments
 * @param poles - Record of all conveyor poles
 * @param floor - Optional floor to filter by (if undefined, returns all floors)
 * @returns Array of unconnected endpoints
 */
export const getUnconnectedBeltEndpoints = (
  belts: Record<string, ConveyorBelt>,
  segments: Record<string, ConveyorSegment>,
  poles: Record<string, ConveyorPole>,
  floor?: number
): ConveyorEndpoint[] => {
  const endpoints: ConveyorEndpoint[] = [];

  Object.values(belts).forEach((belt) => {
    // Skip belts with no segments
    if (!belt.segments || belt.segments.length === 0) {
      return;
    }

    // Filter by floor if specified
    if (floor !== undefined && belt.floor !== floor) {
      return;
    }

    // Get the first and last segment
    const firstSegmentId = belt.segments[0];
    const lastSegmentId = belt.segments[belt.segments.length - 1];
    const firstSegment = segments[firstSegmentId];
    const lastSegment = segments[lastSegmentId];

    if (!firstSegment || !lastSegment) {
      return;
    }

    // Check start endpoint (unconnected if no fromBuildingId)
    const startPoleId = firstSegment.startPole;
    const startPole = poles[startPoleId];

    if (startPole && !belt.fromBuildingId && !startPole.isAnchor) {
      endpoints.push({
        poleId: startPoleId,
        pole: startPole,
        beltId: belt.id,
        isStart: true,
        isConnected: false,
        segmentId: firstSegmentId,
      });
    }

    // Check end endpoint (unconnected if no toBuildingId)
    const endPoleId = lastSegment.endPole;
    const endPole = poles[endPoleId];

    if (endPole && !belt.toBuildingId && !endPole.isAnchor) {
      endpoints.push({
        poleId: endPoleId,
        pole: endPole,
        beltId: belt.id,
        isStart: false,
        isConnected: false,
        segmentId: lastSegmentId,
      });
    }
  });

  return endpoints;
};

/**
 * Checks if a pole is a free endpoint (not connected to any building or lift)
 *
 * @param poleId - The pole ID to check
 * @param belts - Record of all conveyor belts
 * @param segments - Record of all conveyor segments
 * @returns Object with endpoint info or null if not an endpoint
 */
export const getEndpointInfo = (
  poleId: string,
  belts: Record<string, ConveyorBelt>,
  segments: Record<string, ConveyorSegment>
): { beltId: string; isStart: boolean } | null => {
  for (const belt of Object.values(belts)) {
    if (!belt.segments || belt.segments.length === 0) {
      continue;
    }

    const firstSegment = segments[belt.segments[0]];
    const lastSegment = segments[belt.segments[belt.segments.length - 1]];

    if (firstSegment && firstSegment.startPole === poleId && !belt.fromBuildingId) {
      return { beltId: belt.id, isStart: true };
    }

    if (lastSegment && lastSegment.endPole === poleId && !belt.toBuildingId) {
      return { beltId: belt.id, isStart: false };
    }
  }

  return null;
};

/**
 * Checks if connecting at an endpoint would create a valid belt connection
 *
 * @param fromEndpoint - The endpoint where drawing starts
 * @param toEndpoint - The endpoint where drawing ends
 * @returns Whether the connection is valid
 */
export const canConnectEndpoints = (
  fromEndpoint: ConveyorEndpoint,
  toEndpoint: ConveyorEndpoint
): boolean => {
  // Cannot connect to the same belt
  if (fromEndpoint.beltId === toEndpoint.beltId) {
    return false;
  }

  // Cannot connect two start endpoints or two end endpoints directly
  // (would create a conflicting direction)
  // For now, allow any connection - direction can be adjusted after
  return true;
};

/**
 * Gets count of segments connected to a pole
 *
 * @param poleId - The pole ID to check
 * @param segments - Record of all conveyor segments
 * @returns Number of segments connected to this pole
 */
export const getConnectedSegmentCount = (
  poleId: string,
  segments: Record<string, ConveyorSegment>
): number => {
  let count = 0;

  for (const segment of Object.values(segments)) {
    if (segment.startPole === poleId || segment.endPole === poleId) {
      count++;
    }
  }

  return count;
};
