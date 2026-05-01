// src/utils/powerlineHelpers.ts
import { PowerPole, Building } from '../types';
import { BUILDING_TYPES, POWER_POLE_MK1_MAX_CONNECTIONS, POWER_POLE_MK2_MAX_CONNECTIONS, POWER_POLE_MK3_MAX_CONNECTIONS, POWER_TOWER_MAX_TOTAL_CONNECTIONS } from '../constants';
import { getPowerConnectionPointWorldPos } from './helpers';

/**
 * Get max connections for a power pole type
 */
const getMaxConnectionsForPoleType = (poleType: string): number => {
  switch (poleType) {
    case 'power_pole_mk1':
      return POWER_POLE_MK1_MAX_CONNECTIONS; // 4
    case 'power_pole_mk2':
      return POWER_POLE_MK2_MAX_CONNECTIONS; // 7
    case 'power_pole_mk3':
      return POWER_POLE_MK3_MAX_CONNECTIONS; // 10
    case 'power_tower':
      return POWER_TOWER_MAX_TOTAL_CONNECTIONS; // 7
    default:
      return POWER_POLE_MK1_MAX_CONNECTIONS; // Default to 4
  }
};

/**
 * Get pole data from buildings collection only
 * Power poles are now exclusively managed as buildings with power functionality
 *
 * This function handles two ID formats:
 * 1. Direct building IDs (e.g., "building-123")
 * 2. Anchor pole IDs (e.g., "power-anchor-{buildingId}-{powerPointId}")
 */
// Performance: Cache for building definitions to avoid repeated lookups
const buildingDefCache = new Map<string, any>();

/**
 * Parse anchor pole ID format: "power-anchor-{buildingId}-{powerPointId}"
 * Returns { buildingId, powerPointId } or null if not an anchor pole ID
 */
function parseAnchorPoleId(poleId: string): { buildingId: string; powerPointId: string } | null {
  const prefix = 'power-anchor-';
  if (!poleId.startsWith(prefix)) {
    return null;
  }

  // Extract the part after the prefix
  const remainder = poleId.substring(prefix.length);

  // The buildingId might contain hyphens, so we need to find the powerPointId at the end
  // Power point IDs are typically like "power_in", "power_out", "power_pole_1", etc.
  // They often start with "power_" but could be any string
  // The safest approach is to try common power point ID patterns

  // Try to find known power point ID patterns from the end
  const knownPowerPointPrefixes = ['power_in', 'power_out', 'power_pole', 'power_'];

  for (const prefix of knownPowerPointPrefixes) {
    const lastIndex = remainder.lastIndexOf('-' + prefix);
    if (lastIndex !== -1) {
      const buildingId = remainder.substring(0, lastIndex);
      const powerPointId = remainder.substring(lastIndex + 1);
      if (buildingId && powerPointId) {
        return { buildingId, powerPointId };
      }
    }
  }

  // Fallback: assume the last hyphen-separated segment is the power point ID
  const lastHyphenIndex = remainder.lastIndexOf('-');
  if (lastHyphenIndex !== -1) {
    const buildingId = remainder.substring(0, lastHyphenIndex);
    const powerPointId = remainder.substring(lastHyphenIndex + 1);
    if (buildingId && powerPointId) {
      return { buildingId, powerPointId };
    }
  }

  return null;
}

export function getPoleData(
  poleId: string,
  buildings: Record<string, Building>,
  powerPoles?: Record<string, PowerPole>
): PowerPole | null {
  // First, check if this is a standalone power pole (power-pole-xxx format)
  if (poleId.startsWith('power-pole-') && powerPoles) {
    const pole = powerPoles[poleId];
    if (pole) {
      return pole;
    }
  }

  // Check if this is an anchor pole ID format (power-anchor-{buildingId}-{powerPointId})
  const anchorInfo = parseAnchorPoleId(poleId);

  if (anchorInfo) {
    // This is an anchor pole ID - look up the building and calculate position from power connection
    const building = buildings[anchorInfo.buildingId];
    if (!building) {
      // Debug log to help track down issues
      console.warn(`[getPoleData] Building not found for anchor pole: ${poleId}, buildingId: ${anchorInfo.buildingId}`);
      return null;
    }

    // Get building definition
    let buildingDef = buildingDefCache.get(building.type);
    if (!buildingDef) {
      buildingDef = BUILDING_TYPES[building.type];
      if (buildingDef) {
        buildingDefCache.set(building.type, buildingDef);
      }
    }

    if (!buildingDef?.powerData?.powerConnections) {
      console.warn(`[getPoleData] Building has no power connections: ${building.type}`);
      return null;
    }

    // Find the power connection point
    const powerPoint = buildingDef.powerData.powerConnections.find(
      (pp: any) => pp.id === anchorInfo.powerPointId
    );

    if (!powerPoint) {
      console.warn(`[getPoleData] Power point not found: ${anchorInfo.powerPointId} on building ${building.type}`);
      return null;
    }

    // Calculate world position of the power connection point
    const worldPos = getPowerConnectionPointWorldPos(building, buildingDef, powerPoint);

    // Return a PowerPole object representing this anchor point
    return {
      id: poleId, // Keep the original anchor pole ID
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
      floor: building.floor,
      type: 'power_pole_mk1' as any, // Anchor points use mk1 type
      range: powerPoint.capacity || 50,
      maxConnections: getMaxConnectionsForPoleType('power_pole_mk1'),
      connections: [],
      isAnchor: true
    };
  }

  // Standard building lookup (for direct building IDs or power pole buildings)
  const building = buildings[poleId];
  if (!building) return null;

  // Performance: Use cached building definition lookup
  let buildingDef = buildingDefCache.get(building.type);
  if (!buildingDef) {
    buildingDef = BUILDING_TYPES[building.type];
    buildingDefCache.set(building.type, buildingDef);
  }

  // Only return building data if it has power functionality
  if (!buildingDef?.powerData) return null;

  // Convert building to PowerPole-compatible object
  // Use proper max connections based on pole type
  const maxConnections = getMaxConnectionsForPoleType(building.type);

  return {
    id: building.id,
    x: building.x,
    y: building.y,
    z: building.z,
    floor: building.floor,
    type: building.type as any, // Building type but used as pole
    range: buildingDef.powerData.powerConnections?.[0]?.capacity || 50, // Default range based on building
    maxConnections: maxConnections,
    connections: [], // Will be populated by powerline system
    isAnchor: true // Building-based poles are anchor points
  };
}