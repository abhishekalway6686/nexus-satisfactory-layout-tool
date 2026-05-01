// Universal Commands Wrapper
// Automatically detects environment and routes calls to either Tauri invoke or HTTP Bridge

import { isTauriEnvironment, isHttpBridgeAvailable } from './environment';
import type { 
  Point3D, 
  Building, 
  SpatialQueryOptions,
  UniversalSpatialResult,
  BulkQueryResult,
  BulkSpatialQuery
} from './commands';

// Import Tauri commands
import * as TauriCommands from './commands';

// Import HTTP Bridge client
import { 
  getHttpBridgeClient,
  testRustConnectionHttp,
  calculateDistance3DHttp,
  calculateCurveControlPointExactHttp,
  getQuadraticBezierPointsHttp,
  spatialQueryBuildingsHttp,
  universalSpatialQueryHttp
} from '../utils/httpBridge';

// Environment detection cache
let environmentCache: {
  isTauri: boolean;
  hasHttpBridge: boolean;
  initialized: boolean;
} | null = null;

/**
 * Initialize environment detection
 * This is called once and cached for performance
 */
async function initializeEnvironment(): Promise<void> {
  if (environmentCache && environmentCache.initialized) {
    return;
  }

  const isTauri = isTauriEnvironment();
  let hasHttpBridge = false;

  if (!isTauri) {
    try {
      hasHttpBridge = await isHttpBridgeAvailable();
    } catch (error) {
      console.warn('HTTP Bridge availability check failed:', error);
      hasHttpBridge = false;
    }
  }

  environmentCache = {
    isTauri,
    hasHttpBridge,
    initialized: true
  };

  console.log(`🔧 Universal Commands initialized: Tauri=${isTauri}, HTTP Bridge=${hasHttpBridge}`);
}

/**
 * Get current environment state
 */
async function getEnvironment(): Promise<{ isTauri: boolean; hasHttpBridge: boolean }> {
  await initializeEnvironment();
  return {
    isTauri: environmentCache!.isTauri,
    hasHttpBridge: environmentCache!.hasHttpBridge
  };
}

// Enhanced error context for debugging
interface CommandError extends Error {
  functionName: string;
  attemptedBackends: string[];
  originalErrors: { backend: string; error: any }[];
  recoveryAttempted: boolean;
}

// Circuit breaker state for failing backends
const backendHealthState = {
  tauri: { failures: 0, lastFailure: 0, isHealthy: true },
  httpBridge: { failures: 0, lastFailure: 0, isHealthy: true },
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_TIME = 30000; // 30 seconds

// Check if a backend is healthy (circuit breaker pattern)
function isBackendHealthy(backend: 'tauri' | 'httpBridge'): boolean {
  const state = backendHealthState[backend];
  
  // Reset circuit breaker if enough time has passed
  if (!state.isHealthy && Date.now() - state.lastFailure > CIRCUIT_BREAKER_RESET_TIME) {
    state.failures = 0;
    state.isHealthy = true;
    console.log(`🔧 Circuit breaker reset for ${backend} backend`);
  }
  
  return state.isHealthy;
}

// Record backend failure
function recordBackendFailure(backend: 'tauri' | 'httpBridge', error: any) {
  const state = backendHealthState[backend];
  state.failures += 1;
  state.lastFailure = Date.now();
  
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isHealthy = false;
    console.warn(`⚠️ Circuit breaker opened for ${backend} backend after ${state.failures} failures`);
  }
}

/**
 * Universal error wrapper with enhanced error boundaries and state recovery
 */
function createUniversalWrapper<T extends any[], R>(
  functionName: string,
  tauriFunction: (...args: T) => Promise<R>,
  httpBridgeFunction?: (...args: T) => Promise<R>,
  fallbackFunction?: (...args: T) => Promise<R> | R
) {
  return async (...args: T): Promise<R> => {
    const attemptedBackends: string[] = [];
    const originalErrors: { backend: string; error: any }[] = [];
    let lastError: any = null;

    try {
      const env = await getEnvironment();

      // Try Tauri first if available and healthy
      if (env.isTauri && isBackendHealthy('tauri')) {
        attemptedBackends.push('Tauri');
        try {
          const result = await tauriFunction(...args);
          // Success - reset failure count
          backendHealthState.tauri.failures = 0;
          return result;
        } catch (error) {
          lastError = error;
          originalErrors.push({ backend: 'Tauri', error });
          recordBackendFailure('tauri', error);
          console.warn(`Tauri ${functionName} failed:`, error);
        }
      }

      // Try HTTP Bridge if available and healthy
      if (env.hasHttpBridge && httpBridgeFunction && isBackendHealthy('httpBridge')) {
        attemptedBackends.push('HTTP Bridge');
        try {
          const result = await httpBridgeFunction(...args);
          // Success - reset failure count
          backendHealthState.httpBridge.failures = 0;
          return result;
        } catch (error) {
          lastError = error;
          originalErrors.push({ backend: 'HTTP Bridge', error });
          recordBackendFailure('httpBridge', error);
          console.warn(`HTTP Bridge ${functionName} failed:`, error);
        }
      }

      // Use JavaScript fallback if available
      if (fallbackFunction) {
        attemptedBackends.push('JavaScript Fallback');
        try {
          const result = fallbackFunction(...args);
          return result instanceof Promise ? await result : result;
        } catch (error) {
          lastError = error;
          originalErrors.push({ backend: 'JavaScript Fallback', error });
          console.error(`Fallback ${functionName} failed:`, error);
        }
      }

      // All backends failed - create comprehensive error
      const commandError = new Error(
        `All backends failed for ${functionName}. Attempted: ${attemptedBackends.join(', ')}`
      ) as CommandError;
      
      commandError.name = 'CommandError';
      commandError.functionName = functionName;
      commandError.attemptedBackends = attemptedBackends;
      commandError.originalErrors = originalErrors;
      commandError.recoveryAttempted = false;
      
      throw commandError;

    } catch (error) {
      // If it's already a CommandError, just rethrow
      if ((error as CommandError).functionName) {
        throw error;
      }

      // Environment detection failed or other unexpected error
      const commandError = new Error(
        `Critical failure in ${functionName}: ${error.message}`
      ) as CommandError;
      
      commandError.name = 'CommandError';
      commandError.functionName = functionName;
      commandError.attemptedBackends = attemptedBackends;
      commandError.originalErrors = [{ backend: 'System', error }];
      commandError.recoveryAttempted = false;
      
      throw commandError;
    }
  };
}

/**
 * Error recovery utility for handling CommandError instances
 * This can be called by the store or components to attempt recovery
 */
export function handleCommandError(error: CommandError, retryFunction?: () => Promise<void>): {
  shouldShowError: boolean;
  userMessage: string;
  technicalDetails: string;
  canRetry: boolean;
} {
  console.error('Command failed:', {
    functionName: error.functionName,
    attemptedBackends: error.attemptedBackends,
    originalErrors: error.originalErrors
  });

  // Determine user-friendly message based on failure patterns
  let userMessage = 'Operation failed';
  let canRetry = false;

  if (error.attemptedBackends.includes('JavaScript Fallback')) {
    // If even JavaScript fallback failed, this is a serious issue
    userMessage = 'Critical system error - please refresh the application';
    canRetry = false;
  } else if (error.attemptedBackends.length === 0) {
    // No backends were available
    userMessage = 'No backend available - application may be starting up';
    canRetry = true;
  } else {
    // Backend(s) failed but fallback might work
    userMessage = 'Backend service temporarily unavailable - using fallback mode';
    canRetry = true;
  }

  const technicalDetails = `Function: ${error.functionName}\nAttempted: ${error.attemptedBackends.join(', ')}\nErrors: ${
    error.originalErrors.map(e => `${e.backend}: ${e.error.message || e.error}`).join('; ')
  }`;

  return {
    shouldShowError: !error.recoveryAttempted,
    userMessage,
    technicalDetails,
    canRetry: canRetry && !!retryFunction
  };
}

/**
 * Export the CommandError type for use in error handling
 */
export type { CommandError };

/**
 * Test connection to Rust backend
 */
export const testRustConnection = createUniversalWrapper(
  'testRustConnection',
  TauriCommands.testRustConnection,
  testRustConnectionHttp,
  async () => 'JavaScript fallback - no Rust backend available'
);

/**
 * Calculate 3D distance between two points
 */
export const calculateDistance3D = createUniversalWrapper(
  'calculateDistance3D',
  TauriCommands.calculateDistance3D,
  calculateDistance3DHttp,
  async (p1: Point3D, p2: Point3D) => {
    // JavaScript fallback for distance calculation
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
);

/**
 * Calculate exact curve control point
 */
export const calculateCurveControlPointExact = createUniversalWrapper(
  'calculateCurveControlPointExact',
  TauriCommands.calculateCurveControlPointExact,
  calculateCurveControlPointExactHttp,
  async (p1: Point3D, p2: Point3D, p3: Point3D) => {
    // JavaScript fallback - simplified curve control point calculation
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 === 0 || len2 === 0) return p2;

    // Normalize vectors
    v1.x /= len1;
    v1.y /= len1;
    v2.x /= len2;
    v2.y /= len2;

    // Calculate angle between vectors
    const dot = v1.x * v2.x + v1.y * v2.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle < 0.1) return p2;

    // Calculate average direction
    const avgDirection = {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2,
    };

    const avgLen = Math.sqrt(avgDirection.x * avgDirection.x + avgDirection.y * avgDirection.y);
    if (avgLen > 0.001) {
      avgDirection.x /= avgLen;
      avgDirection.y /= avgLen;
    }

    // Determine offset direction
    const cross = v1.x * v2.y - v1.y * v2.x;
    const offsetDirection = cross > 0 
      ? { x: -avgDirection.y, y: avgDirection.x }
      : { x: avgDirection.y, y: -avgDirection.x };

    // Calculate offset distance
    const minDist = Math.min(len1, len2);
    const turnSharpness = Math.sin(angle / 2);
    const offsetDistance = Math.min(minDist * 0.3, 2.5) * (0.5 + turnSharpness * 0.5);

    return {
      x: p2.x + offsetDirection.x * offsetDistance,
      y: p2.y + offsetDirection.y * offsetDistance,
      z: p2.z,
    };
  }
);

/**
 * Get quadratic Bezier curve points
 */
export const getQuadraticBezierPoints = createUniversalWrapper(
  'getQuadraticBezierPoints',
  TauriCommands.getQuadraticBezierPoints,
  getQuadraticBezierPointsHttp,
  async (start: Point3D, cp: Point3D, end: Point3D, numPoints: number = 20) => {
    // JavaScript fallback for Bezier curve generation
    const points: Point3D[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const u = 1 - t;
      const x = u * u * start.x + 2 * u * t * cp.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * cp.y + t * t * end.y;
      const z = u * u * start.z + 2 * u * t * cp.z + t * t * end.z;
      points.push({ x, y, z });
    }
    return points;
  }
);

/**
 * Spatial query for buildings with radius
 */
export const spatialQueryBuildings = createUniversalWrapper(
  'spatialQueryBuildings',
  async (center: Point3D, radius: number, excludeIds: string[] = []) => {
    const buildings = await TauriCommands.queryBuildingsRadius(center, radius, excludeIds);
    return {
      buildings,
      queryTimeMs: 0 // Tauri doesn't return timing info for this specific function
    };
  },
  async (center: Point3D, radius: number, excludeIds: string[] = []) => {
    return await spatialQueryBuildingsHttp(center, radius, excludeIds);
  },
  async (center: Point3D, radius: number, excludeIds: string[] = []) => {
    // JavaScript fallback - return empty results
    console.warn('No spatial indexing backend available, returning empty results');
    return {
      buildings: [] as Building[],
      queryTimeMs: 0
    };
  }
);

/**
 * Universal spatial query across all entity types
 */
export const universalSpatialQuery = createUniversalWrapper(
  'universalSpatialQuery',
  async (center: Point3D, radius: number, options: SpatialQueryOptions) => {
    return await TauriCommands.universalSpatialQuery(center, radius, options);
  },
  async (center: Point3D, radius: number, options: SpatialQueryOptions) => {
    // Convert options format for HTTP Bridge
    const httpOptions = {
      includeBuildings: options.include_buildings,
      includeRailwayNodes: options.include_railway_nodes,
      includeConveyorPoles: options.include_conveyor_poles,
      includePipeSupports: options.include_pipe_supports,
      excludeIds: options.exclude_ids
    };
    
    const result = await universalSpatialQueryHttp(center, radius, httpOptions);
    
    // Convert back to Tauri format
    return {
      buildings: result.buildings,
      railway_nodes: result.railwayNodes,
      conveyor_poles: result.conveyorPoles,
      pipe_supports: result.pipeSupports
    } as UniversalSpatialResult;
  },
  async (center: Point3D, radius: number, options: SpatialQueryOptions) => {
    // JavaScript fallback - return empty results
    console.warn('No spatial indexing backend available, returning empty results');
    return {
      buildings: [],
      railway_nodes: [],
      conveyor_poles: [],
      pipe_supports: []
    } as UniversalSpatialResult;
  }
);

/**
 * Check if should create turn at point
 */
export const shouldCreateTurnExact = createUniversalWrapper(
  'shouldCreateTurnExact',
  TauriCommands.shouldCreateTurnExact,
  undefined, // No HTTP Bridge equivalent yet
  async (p1: Point3D, p2: Point3D, p3: Point3D) => {
    // JavaScript fallback - exact 0.873 radians threshold
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const angleDiff = Math.abs(diff);
    
    const minDistance = 2.0;
    const dist1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const dist2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    return angleDiff > 0.873 && dist1 >= minDistance && dist2 >= minDistance;
  }
);

/**
 * Split Bezier curve at parameter t
 */
export const splitBezierAtT = createUniversalWrapper(
  'splitBezierAtT',
  TauriCommands.splitBezierAtT,
  undefined, // No HTTP Bridge equivalent yet
  async (start: Point3D, cp: Point3D, end: Point3D, t: number) => {
    // JavaScript fallback for Bezier curve subdivision
    const p1: Point3D = {
      x: start.x + t * (cp.x - start.x),
      y: start.y + t * (cp.y - start.y),
      z: start.z + t * (cp.z - start.z),
    };
    const p2: Point3D = {
      x: cp.x + t * (end.x - cp.x),
      y: cp.y + t * (end.y - cp.y),
      z: cp.z + t * (end.z - cp.z),
    };
    const r: Point3D = {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
      z: p1.z + t * (p2.z - p1.z),
    };

    return {
      first: { control_points: [p1] },
      second: { control_points: [p2] },
      point: r,
    };
  }
);

/**
 * Query railway nodes within radius
 */
export const queryRailwayNodesOptimized = createUniversalWrapper(
  'queryRailwayNodesOptimized',
  TauriCommands.queryRailwayNodesOptimized,
  undefined, // No HTTP Bridge equivalent yet
  async (center: Point3D, radius: number, excludeIds: string[] = []) => {
    // JavaScript fallback - return empty results
    console.warn('No railway node indexing backend available, returning empty results');
    return [];
  }
);

/**
 * Bulk spatial query for buildings
 */
export const bulkSpatialQueryBuildings = createUniversalWrapper(
  'bulkSpatialQueryBuildings',
  TauriCommands.bulkSpatialQueryBuildings,
  undefined, // No HTTP Bridge equivalent yet
  async (queries: BulkSpatialQuery[], options?: SpatialQueryOptions) => {
    // JavaScript fallback - return empty results for all queries
    console.warn('No bulk spatial query backend available, returning empty results');
    return {
      entities: queries.map(() => []),
      query_time_ms: 0,
      entities_checked: 0
    } as BulkQueryResult<any[][]>;
  }
);

/**
 * Get spatial indexing statistics
 */
export const getSpatialStats = createUniversalWrapper(
  'getSpatialStats',
  TauriCommands.getSpatialStats,
  async () => {
    const { getSpatialStatsHttp } = await import('../utils/httpBridge');
    return getSpatialStatsHttp();
  },
  async () => {
    // JavaScript fallback - return minimal stats
    console.warn('No spatial stats backend available, returning minimal stats');
    return {
      buildings: {
        total_entities: 0,
        total_cells: 0,
        avg_entities_per_cell: 0,
        max_entities_in_cell: 0,
        cell_size: 10.0
      },
      railway_nodes: {
        total_entities: 0,
        total_cells: 0,
        avg_entities_per_cell: 0,
        max_entities_in_cell: 0,
        cell_size: 10.0
      },
      conveyor_poles: {
        total_entities: 0,
        total_cells: 0,
        avg_entities_per_cell: 0,
        max_entities_in_cell: 0,
        cell_size: 10.0
      },
      pipe_supports: {
        total_entities: 0,
        total_cells: 0,
        avg_entities_per_cell: 0,
        max_entities_in_cell: 0,
        cell_size: 10.0
      }
    };
  }
);

/**
 * Environment information for debugging
 */
export async function getEnvironmentInfo(): Promise<{
  isTauri: boolean;
  hasHttpBridge: boolean;
  backendAvailable: boolean;
}> {
  const env = await getEnvironment();
  return {
    ...env,
    backendAvailable: env.isTauri || env.hasHttpBridge
  };
}

/**
 * Force re-initialization of environment detection
 * Useful for testing or when environment changes
 */
export function clearEnvironmentCache(): void {
  environmentCache = null;
}

// Re-export types for convenience
export type {
  Point3D,
  Building,
  SpatialQueryOptions,
  UniversalSpatialResult,
  BulkQueryResult,
  BulkSpatialQuery
} from './commands';