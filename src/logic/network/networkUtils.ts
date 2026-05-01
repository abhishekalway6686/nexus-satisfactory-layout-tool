// Network Utility Functions

import { 
  Building, 
  StationNetwork, 
  NetworkStation, 
  NetworkConnection,
  Point3D,
  NetworkHealthMetrics
} from '../../types';
import { BUILDING_TYPES } from '../../constants';
import { distance3D } from '../../utils/helpers';

/**
 * Checks if a building is a train station
 */
export function isTrainStation(building: Building): boolean {
  const buildingType = BUILDING_TYPES[building.type];
  if (!buildingType) return false;
  
  return buildingType.category === 'transport' && 
         (buildingType.name.toLowerCase().includes('station') ||
          buildingType.name.toLowerCase().includes('freight'));
}

/**
 * Calculates overall network efficiency score
 */
export function calculateNetworkEfficiency(network: StationNetwork): number {
  if (network.routes.size === 0) return 100;
  
  let totalEfficiency = 0;
  let totalWeight = 0;
  
  network.routes.forEach(route => {
    const weight = route.distance; // Weight by distance
    totalEfficiency += route.efficiency * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? totalEfficiency / totalWeight : 100;
}

/**
 * Optimizes network paths by suggesting improvements
 */
export function optimizeNetworkPaths(network: StationNetwork): {
  optimizedRoutes: string[];
  estimatedImprovement: number;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  const optimizedRoutes: string[] = [];
  let estimatedImprovement = 0;

  // Analyze each route for optimization opportunities
  network.routes.forEach(route => {
    if (route.efficiency < 80) {
      optimizedRoutes.push(route.id);
      
      // Suggest more direct paths
      if (route.stations.length > 2) {
        suggestions.push(`Route ${route.id}: Consider direct connection between ${route.stations[0]} and ${route.stations[route.stations.length - 1]}`);
        estimatedImprovement += (80 - route.efficiency) * 0.5;
      }
      
      // Suggest alternative routing
      if (route.alternatives.length > 0) {
        suggestions.push(`Route ${route.id}: Alternative paths available with potentially better efficiency`);
        estimatedImprovement += 10;
      }
    }
  });

  // Analyze network topology for structural improvements
  switch (network.topology) {
    case 'chain':
      if (network.stations.size > 5) {
        suggestions.push('Consider adding hub station to reduce average travel distance');
        estimatedImprovement += 20;
      }
      break;
    
    case 'hub_spoke':
      const hubConnections = findHubStation(network);
      if (hubConnections && hubConnections.connectionCount > network.stations.size * 0.8) {
        suggestions.push('Hub station may be overloaded - consider load balancing');
        estimatedImprovement += 15;
      }
      break;
  }

  return {
    optimizedRoutes,
    estimatedImprovement: Math.min(100, estimatedImprovement),
    suggestions
  };
}

/**
 * Validates network integrity and finds issues
 */
export function validateNetworkIntegrity(network: StationNetwork): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for disconnected stations
  const connectedStations = new Set<string>();
  network.connections.forEach(connection => {
    connectedStations.add(connection.from);
    connectedStations.add(connection.to);
  });

  network.stations.forEach((station, stationId) => {
    if (!connectedStations.has(stationId) && network.stations.size > 1) {
      errors.push(`Station ${stationId} is not connected to the network`);
    }
  });

  // Check for invalid connections
  network.connections.forEach(connection => {
    if (!network.stations.has(connection.from)) {
      errors.push(`Connection ${connection.id} references non-existent station ${connection.from}`);
    }
    if (!network.stations.has(connection.to)) {
      errors.push(`Connection ${connection.id} references non-existent station ${connection.to}`);
    }
    
    // Check for efficiency issues
    if (connection.efficiency < 50) {
      warnings.push(`Connection ${connection.id} has low efficiency (${connection.efficiency}%)`);
    }
    
    // Check for capacity issues
    if (connection.currentLoad / connection.capacity > 0.9) {
      warnings.push(`Connection ${connection.id} is near capacity (${Math.round(connection.currentLoad / connection.capacity * 100)}%)`);
    }
  });

  // Check for circular references in routes
  network.routes.forEach(route => {
    const stationSet = new Set(route.stations);
    if (stationSet.size !== route.stations.length) {
      errors.push(`Route ${route.id} contains duplicate stations`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Finds the hub station in a hub-and-spoke network
 */
export function findHubStation(network: StationNetwork): {
  stationId: string;
  connectionCount: number;
} | null {
  let maxConnections = 0;
  let hubStationId: string | null = null;

  const connectionCounts = new Map<string, number>();
  
  // Count connections for each station
  network.connections.forEach(connection => {
    connectionCounts.set(
      connection.from, 
      (connectionCounts.get(connection.from) || 0) + 1
    );
    connectionCounts.set(
      connection.to, 
      (connectionCounts.get(connection.to) || 0) + 1
    );
  });

  // Find station with most connections
  connectionCounts.forEach((count, stationId) => {
    if (count > maxConnections) {
      maxConnections = count;
      hubStationId = stationId;
    }
  });

  return hubStationId ? {
    stationId: hubStationId,
    connectionCount: maxConnections
  } : null;
}

/**
 * Calculates the shortest physical distance between two stations
 */
export function calculateStationDistance(
  station1: NetworkStation,
  station2: NetworkStation
): number {
  return distance3D(station1.position, station2.position);
}

/**
 * Finds all stations within a given radius of a point
 */
export function findStationsInRadius(
  center: Point3D,
  radius: number,
  stations: Map<string, NetworkStation>
): NetworkStation[] {
  const nearbyStations: NetworkStation[] = [];

  stations.forEach(station => {
    if (distance3D(center, station.position) <= radius) {
      nearbyStations.push(station);
    }
  });

  return nearbyStations.sort((a, b) => 
    distance3D(center, a.position) - distance3D(center, b.position)
  );
}

/**
 * Estimates travel time between stations based on distance and network efficiency
 */
export function estimateStationTravelTime(
  fromStation: NetworkStation,
  toStation: NetworkStation,
  networkEfficiency: number = 100
): number {
  const distance = calculateStationDistance(fromStation, toStation);
  const baseSpeed = 120 / 3.6; // 120 km/h in m/s
  const effectiveSpeed = baseSpeed * (networkEfficiency / 100);
  
  return distance / effectiveSpeed;
}

/**
 * Analyzes network load distribution
 */
export function analyzeNetworkLoadDistribution(network: StationNetwork): {
  averageLoad: number;
  loadVariance: number;
  underutilizedStations: string[];
  overloadedStations: string[];
} {
  const stationLoads: number[] = [];
  const underutilizedStations: string[] = [];
  const overloadedStations: string[] = [];

  network.stations.forEach((station, stationId) => {
    const utilization = station.throughput.utilization;
    stationLoads.push(utilization);

    if (utilization < 25) {
      underutilizedStations.push(stationId);
    } else if (utilization > 90) {
      overloadedStations.push(stationId);
    }
  });

  const averageLoad = stationLoads.length > 0 ? 
    stationLoads.reduce((sum, load) => sum + load, 0) / stationLoads.length : 0;

  const loadVariance = stationLoads.length > 0 ?
    stationLoads.reduce((sum, load) => sum + Math.pow(load - averageLoad, 2), 0) / stationLoads.length : 0;

  return {
    averageLoad,
    loadVariance,
    underutilizedStations,
    overloadedStations
  };
}

/**
 * Generates network performance report
 */
export function generateNetworkPerformanceReport(network: StationNetwork): {
  overallScore: number;
  efficiency: number;
  connectivity: number;
  loadBalance: number;
  recommendations: string[];
} {
  const efficiency = calculateNetworkEfficiency(network);
  const loadAnalysis = analyzeNetworkLoadDistribution(network);
  const integrity = validateNetworkIntegrity(network);
  
  // Calculate connectivity score (0-100)
  const totalPossibleConnections = network.stations.size * (network.stations.size - 1) / 2;
  const connectivity = totalPossibleConnections > 0 ? 
    (network.connections.size / totalPossibleConnections) * 100 : 100;

  // Calculate load balance score (lower variance = higher score)
  const maxVariance = 2500; // Variance when some stations are at 0% and others at 100%
  const loadBalance = Math.max(0, 100 - (loadAnalysis.loadVariance / maxVariance) * 100);

  const overallScore = (efficiency + connectivity + loadBalance) / 3;

  const recommendations: string[] = [];

  if (efficiency < 80) {
    recommendations.push('Optimize routing to improve overall efficiency');
  }
  if (connectivity < 50) {
    recommendations.push('Add more connections to improve network resilience');
  }
  if (loadBalance < 70) {
    recommendations.push('Balance station loads by redistributing traffic');
  }
  if (integrity.warnings.length > 0) {
    recommendations.push('Address network warnings to prevent future issues');
  }

  return {
    overallScore,
    efficiency,
    connectivity,
    loadBalance,
    recommendations
  };
}

/**
 * Calculates network density (connections per station)
 */
export function calculateNetworkDensity(network: StationNetwork): number {
  if (network.stations.size === 0) return 0;
  return (network.connections.size * 2) / network.stations.size; // *2 because each connection connects 2 stations
}

/**
 * Finds critical stations (removal would fragment network)
 */
export function findCriticalStations(network: StationNetwork): string[] {
  const criticalStations: string[] = [];

  network.stations.forEach((station, stationId) => {
    // A station is critical if removing it would increase the number of connected components
    if (wouldFragmentNetwork(network, stationId)) {
      criticalStations.push(stationId);
    }
  });

  return criticalStations;
}

/**
 * Checks if removing a station would fragment the network
 */
function wouldFragmentNetwork(network: StationNetwork, stationId: string): boolean {
  // Count connected components before removal
  const beforeComponents = countConnectedComponents(network);

  // Simulate removal and count components after
  const afterComponents = countConnectedComponentsWithoutStation(network, stationId);

  return afterComponents > beforeComponents;
}

/**
 * Counts connected components in the network
 */
function countConnectedComponents(network: StationNetwork): number {
  const visited = new Set<string>();
  let components = 0;

  network.stations.forEach((_, stationId) => {
    if (!visited.has(stationId)) {
      dfsVisit(network, stationId, visited);
      components++;
    }
  });

  return components;
}

/**
 * Counts connected components excluding a specific station
 */
function countConnectedComponentsWithoutStation(
  network: StationNetwork, 
  excludeStation: string
): number {
  const visited = new Set<string>();
  visited.add(excludeStation); // Mark as visited to exclude from search
  let components = 0;

  network.stations.forEach((_, stationId) => {
    if (!visited.has(stationId)) {
      dfsVisitExcluding(network, stationId, visited, excludeStation);
      components++;
    }
  });

  return components;
}

/**
 * DFS visit for connected components calculation
 */
function dfsVisit(
  network: StationNetwork, 
  stationId: string, 
  visited: Set<string>
): void {
  visited.add(stationId);

  network.connections.forEach(connection => {
    let neighbor: string | null = null;
    if (connection.from === stationId && !visited.has(connection.to)) {
      neighbor = connection.to;
    } else if (connection.to === stationId && !visited.has(connection.from)) {
      neighbor = connection.from;
    }

    if (neighbor) {
      dfsVisit(network, neighbor, visited);
    }
  });
}

/**
 * DFS visit excluding a specific station
 */
function dfsVisitExcluding(
  network: StationNetwork, 
  stationId: string, 
  visited: Set<string>,
  excludeStation: string
): void {
  visited.add(stationId);

  network.connections.forEach(connection => {
    // Skip connections involving the excluded station
    if (connection.from === excludeStation || connection.to === excludeStation) {
      return;
    }

    let neighbor: string | null = null;
    if (connection.from === stationId && !visited.has(connection.to)) {
      neighbor = connection.to;
    } else if (connection.to === stationId && !visited.has(connection.from)) {
      neighbor = connection.from;
    }

    if (neighbor) {
      dfsVisitExcluding(network, neighbor, visited, excludeStation);
    }
  });
}