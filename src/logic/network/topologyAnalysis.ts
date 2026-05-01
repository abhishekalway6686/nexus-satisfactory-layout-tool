// Network Topology Analysis and Optimization

import {
  StationNetwork,
  NetworkStation,
  NetworkConnection,
  NetworkTopologyType,
  NetworkBottleneck,
  NetworkSuggestion,
  NetworkHealthMetrics,
  Point3D
} from '../../types';
import { distance3D } from '../../utils/helpers';
import { calculateNetworkDensity, findCriticalStations } from './networkUtils';

/**
 * Analyzes the topology of a station network
 */
export function analyzeNetworkTopology(network: StationNetwork): {
  topology: NetworkTopologyType;
  metrics: NetworkTopologyMetrics;
  characteristics: TopologyCharacteristics;
} {
  const metrics = calculateTopologyMetrics(network);
  const topology = determineTopologyType(network, metrics);
  const characteristics = analyzeTopologyCharacteristics(network, topology, metrics);

  return {
    topology,
    metrics,
    characteristics
  };
}

/**
 * Detects bottlenecks in the network topology
 */
export function detectBottlenecks(
  network: StationNetwork,
  healthMetrics: NetworkHealthMetrics
): NetworkBottleneck[] {
  const bottlenecks: NetworkBottleneck[] = [];

  // Detect structural bottlenecks
  bottlenecks.push(...detectStructuralBottlenecks(network));
  
  // Detect capacity bottlenecks
  bottlenecks.push(...detectCapacityBottlenecks(network));
  
  // Detect efficiency bottlenecks
  bottlenecks.push(...detectEfficiencyBottlenecks(network));
  
  // Detect critical point bottlenecks
  bottlenecks.push(...detectCriticalPointBottlenecks(network));

  return bottlenecks.sort((a, b) => {
    // Sort by severity then by impact
    if (b.severity !== a.severity) {
      return b.severity - a.severity;
    }
    return b.impact - a.impact;
  });
}

/**
 * Suggests optimizations for network topology
 */
export function suggestOptimizations(
  network: StationNetwork,
  bottlenecks: NetworkBottleneck[],
  healthMetrics: NetworkHealthMetrics
): NetworkSuggestion[] {
  const suggestions: NetworkSuggestion[] = [];

  // Topology-specific optimizations
  suggestions.push(...suggestTopologyOptimizations(network));
  
  // Bottleneck-specific optimizations
  bottlenecks.forEach(bottleneck => {
    suggestions.push(...suggestBottleneckOptimizations(bottleneck, network));
  });
  
  // General structural optimizations
  suggestions.push(...suggestStructuralOptimizations(network, healthMetrics));
  
  // Load balancing optimizations
  suggestions.push(...suggestLoadBalancingOptimizations(network));

  return suggestions
    .filter((suggestion, index, self) => 
      // Remove duplicates
      index === self.findIndex(s => s.id === suggestion.id)
    )
    .sort((a, b) => {
      // Sort by priority then by improvement
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }
      return b.estimatedImprovement - a.estimatedImprovement;
    });
}

// Types for topology analysis

interface NetworkTopologyMetrics {
  density: number; // Connections per station
  diameter: number; // Maximum shortest path between any two stations
  averagePathLength: number; // Average shortest path length
  clusteringCoefficient: number; // How interconnected station neighborhoods are
  centralityScores: Map<string, number>; // Betweenness centrality of each station
  redundancy: number; // Alternative path availability (0-100)
  efficiency: number; // Global efficiency score (0-100)
}

interface TopologyCharacteristics {
  isLinear: boolean;
  hasHubs: boolean;
  isHighlyConnected: boolean;
  hasCriticalPoints: boolean;
  isBalanced: boolean;
  redundancyLevel: 'none' | 'low' | 'medium' | 'high';
  scalabilityRating: 'poor' | 'fair' | 'good' | 'excellent';
}

// Implementation functions

function calculateTopologyMetrics(network: StationNetwork): NetworkTopologyMetrics {
  const stations = Array.from(network.stations.keys());
  const stationCount = stations.length;
  
  if (stationCount === 0) {
    return {
      density: 0,
      diameter: 0,
      averagePathLength: 0,
      clusteringCoefficient: 0,
      centralityScores: new Map(),
      redundancy: 0,
      efficiency: 0
    };
  }

  const density = calculateNetworkDensity(network);
  const pathLengths = calculateAllShortestPaths(network);
  const diameter = calculateNetworkDiameter(pathLengths);
  const averagePathLength = calculateAveragePathLength(pathLengths);
  const clusteringCoefficient = calculateClusteringCoefficient(network);
  const centralityScores = calculateBetweennessCentrality(network);
  const redundancy = calculateNetworkRedundancy(network);
  const efficiency = calculateGlobalEfficiency(pathLengths);

  return {
    density,
    diameter,
    averagePathLength,
    clusteringCoefficient,
    centralityScores,
    redundancy,
    efficiency
  };
}

function determineTopologyType(
  network: StationNetwork,
  metrics: NetworkTopologyMetrics
): NetworkTopologyType {
  const stationCount = network.stations.size;
  const connectionCount = network.connections.size;

  // Single station or empty network
  if (stationCount <= 1) {
    return 'chain';
  }

  // Analyze connection patterns
  const connectionCounts = new Map<string, number>();
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

  const maxConnections = Math.max(...Array.from(connectionCounts.values()));
  const avgConnections = metrics.density;

  // Hub-and-spoke: One or few stations with many connections
  const hubStations = Array.from(connectionCounts.entries())
    .filter(([_, count]) => count >= Math.max(3, stationCount / 3));
  
  if (hubStations.length >= 1 && maxConnections >= stationCount / 2) {
    return 'hub_spoke';
  }

  // Mesh: High connectivity
  if (avgConnections > 2.5 && metrics.clusteringCoefficient > 0.6) {
    return 'mesh';
  }

  // Loop: Circular patterns with good redundancy
  if (hasCircularStructure(network) && metrics.redundancy > 50) {
    return 'loop';
  }

  // Branching: Tree-like structure
  if (avgConnections < 2 && !hasCircularStructure(network)) {
    return 'branching';
  }

  // Default to chain
  return 'chain';
}

function analyzeTopologyCharacteristics(
  network: StationNetwork,
  topology: NetworkTopologyType,
  metrics: NetworkTopologyMetrics
): TopologyCharacteristics {
  const stationCount = network.stations.size;
  const avgConnections = metrics.density;

  const isLinear = topology === 'chain' || (avgConnections < 1.5 && !hasCircularStructure(network));
  const hasHubs = topology === 'hub_spoke' || 
    Array.from(getConnectionCounts(network).values()).some(count => count >= stationCount / 3);
  const isHighlyConnected = avgConnections > 3 || metrics.clusteringCoefficient > 0.7;
  const hasCriticalPoints = findCriticalStations(network).length > 0;
  const isBalanced = metrics.clusteringCoefficient > 0.4 && 
    Math.max(...Array.from(getConnectionCounts(network).values())) < stationCount / 2;

  let redundancyLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (metrics.redundancy > 75) redundancyLevel = 'high';
  else if (metrics.redundancy > 50) redundancyLevel = 'medium';
  else if (metrics.redundancy > 25) redundancyLevel = 'low';

  let scalabilityRating: 'poor' | 'fair' | 'good' | 'excellent' = 'poor';
  if (isHighlyConnected && !hasCriticalPoints && redundancyLevel === 'high') {
    scalabilityRating = 'excellent';
  } else if (hasHubs && redundancyLevel === 'medium') {
    scalabilityRating = 'good';
  } else if (!isLinear && redundancyLevel === 'low') {
    scalabilityRating = 'fair';
  }

  return {
    isLinear,
    hasHubs,
    isHighlyConnected,
    hasCriticalPoints,
    isBalanced,
    redundancyLevel,
    scalabilityRating
  };
}

function detectStructuralBottlenecks(network: StationNetwork): NetworkBottleneck[] {
  const bottlenecks: NetworkBottleneck[] = [];
  const criticalStations = findCriticalStations(network);

  criticalStations.forEach(stationId => {
    const station = network.stations.get(stationId);
    if (station) {
      bottlenecks.push({
        id: `structural_bottleneck_${stationId}`,
        type: 'station',
        targetId: stationId,
        severity: 80, // Critical points are high severity
        impact: calculateCriticalStationImpact(stationId, network),
        description: `Station ${stationId} is a critical network point - its removal would fragment the network`,
        suggestions: [
          {
            id: `bypass_${stationId}`,
            type: 'add_route',
            title: 'Add bypass route',
            description: `Create alternative routes to reduce dependency on station ${stationId}`,
            estimatedImprovement: 60,
            cost: 70,
            priority: 'high'
          }
        ],
        affectedRoutes: getRoutesThoughStation(stationId, network)
      });
    }
  });

  return bottlenecks;
}

function detectCapacityBottlenecks(network: StationNetwork): NetworkBottleneck[] {
  const bottlenecks: NetworkBottleneck[] = [];

  // Find overloaded connections
  network.connections.forEach(connection => {
    const utilization = connection.currentLoad / connection.capacity;
    if (utilization > 0.9) {
      bottlenecks.push({
        id: `capacity_bottleneck_${connection.id}`,
        type: 'connection',
        targetId: connection.id,
        severity: Math.min(100, utilization * 100),
        impact: calculateConnectionImpact(connection, network),
        description: `Connection ${connection.from} → ${connection.to} is at ${(utilization * 100).toFixed(1)}% capacity`,
        suggestions: [
          {
            id: `parallel_route_${connection.id}`,
            type: 'add_route',
            title: 'Add parallel route',
            description: 'Build additional track to increase capacity',
            estimatedImprovement: 50,
            cost: 60,
            priority: 'high'
          }
        ],
        affectedRoutes: connection.routes.map(r => r.id)
      });
    }
  });

  // Find overloaded stations
  network.stations.forEach((station, stationId) => {
    if (station.throughput.utilization > 90) {
      bottlenecks.push({
        id: `capacity_bottleneck_station_${stationId}`,
        type: 'station',
        targetId: stationId,
        severity: station.throughput.utilization,
        impact: calculateStationImpact(station, network),
        description: `Station ${stationId} is at ${station.throughput.utilization}% capacity`,
        suggestions: [
          {
            id: `expand_station_${stationId}`,
            type: 'add_station',
            title: 'Expand station capacity',
            description: 'Add additional platforms or build parallel station',
            estimatedImprovement: 40,
            cost: 80,
            priority: 'medium'
          }
        ],
        affectedRoutes: getRoutesThoughStation(stationId, network)
      });
    }
  });

  return bottlenecks;
}

function detectEfficiencyBottlenecks(network: StationNetwork): NetworkBottleneck[] {
  const bottlenecks: NetworkBottleneck[] = [];

  network.routes.forEach(route => {
    if (route.efficiency < 60) {
      bottlenecks.push({
        id: `efficiency_bottleneck_${route.id}`,
        type: 'route',
        targetId: route.id,
        severity: 100 - route.efficiency,
        impact: calculateRouteImpact(route, network),
        description: `Route ${route.id} has low efficiency (${route.efficiency.toFixed(1)}%)`,
        suggestions: [
          {
            id: `optimize_route_${route.id}`,
            type: 'optimize_path',
            title: 'Optimize route path',
            description: 'Create more direct connections between stations',
            estimatedImprovement: Math.min(40, 80 - route.efficiency),
            cost: 50,
            priority: route.efficiency < 40 ? 'high' : 'medium'
          }
        ],
        affectedRoutes: [route.id]
      });
    }
  });

  return bottlenecks;
}

function detectCriticalPointBottlenecks(network: StationNetwork): NetworkBottleneck[] {
  const bottlenecks: NetworkBottleneck[] = [];
  const metrics = calculateTopologyMetrics(network);

  // Identify stations with high betweenness centrality
  metrics.centralityScores.forEach((centrality, stationId) => {
    if (centrality > 0.3 && network.stations.size > 4) { // Threshold for significant centrality
      const station = network.stations.get(stationId);
      if (station) {
        bottlenecks.push({
          id: `centrality_bottleneck_${stationId}`,
          type: 'station',
          targetId: stationId,
          severity: Math.min(100, centrality * 100),
          impact: centrality * 100,
          description: `Station ${stationId} handles a disproportionate amount of network traffic`,
          suggestions: [
            {
              id: `distribute_load_${stationId}`,
              type: 'rebalance_load',
              title: 'Distribute network load',
              description: 'Create alternative routes to reduce traffic through this station',
              estimatedImprovement: 30,
              cost: 60,
              priority: 'medium'
            }
          ],
          affectedRoutes: getRoutesThoughStation(stationId, network)
        });
      }
    }
  });

  return bottlenecks;
}

function suggestTopologyOptimizations(network: StationNetwork): NetworkSuggestion[] {
  const suggestions: NetworkSuggestion[] = [];
  const metrics = calculateTopologyMetrics(network);

  switch (network.topology) {
    case 'chain':
      if (network.stations.size > 4) {
        suggestions.push({
          id: `topology_opt_chain_${network.id}`,
          type: 'add_route',
          title: 'Add cross-connections',
          description: 'Create shortcuts between non-adjacent stations to improve efficiency',
          estimatedImprovement: 25,
          cost: 50,
          priority: 'medium'
        });
      }
      break;

    case 'hub_spoke':
      if (metrics.redundancy < 30) {
        suggestions.push({
          id: `topology_opt_hub_${network.id}`,
          type: 'add_route',
          title: 'Add spoke-to-spoke connections',
          description: 'Connect spoke stations directly to improve reliability and reduce hub load',
          estimatedImprovement: 35,
          cost: 60,
          priority: 'medium'
        });
      }
      break;

    case 'branching':
      if (network.stations.size > 6) {
        suggestions.push({
          id: `topology_opt_branch_${network.id}`,
          type: 'add_route',
          title: 'Add redundant connections',
          description: 'Create loops in the tree structure to improve fault tolerance',
          estimatedImprovement: 40,
          cost: 70,
          priority: 'low'
        });
      }
      break;

    case 'mesh':
      if (metrics.efficiency < 70) {
        suggestions.push({
          id: `topology_opt_mesh_${network.id}`,
          type: 'optimize_path',
          title: 'Optimize route selection',
          description: 'Review highly connected network for optimal routing',
          estimatedImprovement: 20,
          cost: 30,
          priority: 'low'
        });
      }
      break;
  }

  return suggestions;
}

function suggestBottleneckOptimizations(
  bottleneck: NetworkBottleneck,
  network: StationNetwork
): NetworkSuggestion[] {
  // Return suggestions already included in the bottleneck
  return bottleneck.suggestions;
}

function suggestStructuralOptimizations(
  network: StationNetwork,
  healthMetrics: NetworkHealthMetrics
): NetworkSuggestion[] {
  const suggestions: NetworkSuggestion[] = [];

  // Suggest improvements based on overall health
  if (healthMetrics.overallHealth < 70) {
    if (healthMetrics.averageEfficiency < 60) {
      suggestions.push({
        id: `structural_opt_efficiency_${network.id}`,
        type: 'optimize_path',
        title: 'Network-wide efficiency improvements',
        description: 'Review and optimize routes across the entire network',
        estimatedImprovement: Math.min(30, 80 - healthMetrics.averageEfficiency),
        cost: 40,
        priority: 'medium'
      });
    }

    if (healthMetrics.utilizationDistribution.bottlenecked > 0) {
      suggestions.push({
        id: `structural_opt_capacity_${network.id}`,
        type: 'upgrade_connection',
        title: 'Address capacity constraints',
        description: 'Upgrade bottlenecked connections to improve flow',
        estimatedImprovement: 25,
        cost: 70,
        priority: 'high'
      });
    }
  }

  return suggestions;
}

function suggestLoadBalancingOptimizations(network: StationNetwork): NetworkSuggestion[] {
  const suggestions: NetworkSuggestion[] = [];
  const connectionCounts = getConnectionCounts(network);
  const maxConnections = Math.max(...Array.from(connectionCounts.values()));
  const avgConnections = calculateNetworkDensity(network);

  // Suggest load balancing if network is heavily centralized
  if (maxConnections > avgConnections * 2 && network.stations.size > 3) {
    suggestions.push({
      id: `load_balance_${network.id}`,
      type: 'rebalance_load',
      title: 'Balance network load',
      description: 'Distribute connections more evenly across stations',
      estimatedImprovement: 20,
      cost: 50,
      priority: 'low'
    });
  }

  return suggestions;
}

// Helper functions

function calculateAllShortestPaths(network: StationNetwork): Map<string, Map<string, number>> {
  const stations = Array.from(network.stations.keys());
  const paths = new Map<string, Map<string, number>>();

  // Initialize with direct connections
  stations.forEach(station => {
    paths.set(station, new Map());
    stations.forEach(target => {
      if (station === target) {
        paths.get(station)!.set(target, 0);
      } else {
        paths.get(station)!.set(target, Infinity);
      }
    });
  });

  // Set direct connection distances
  network.connections.forEach(connection => {
    paths.get(connection.from)!.set(connection.to, connection.distance);
    paths.get(connection.to)!.set(connection.from, connection.distance);
  });

  // Floyd-Warshall algorithm
  stations.forEach(k => {
    stations.forEach(i => {
      stations.forEach(j => {
        const pathIK = paths.get(i)!.get(k)!;
        const pathKJ = paths.get(k)!.get(j)!;
        const pathIJ = paths.get(i)!.get(j)!;
        
        if (pathIK + pathKJ < pathIJ) {
          paths.get(i)!.set(j, pathIK + pathKJ);
        }
      });
    });
  });

  return paths;
}

function calculateNetworkDiameter(pathLengths: Map<string, Map<string, number>>): number {
  let maxPath = 0;
  
  pathLengths.forEach(fromPaths => {
    fromPaths.forEach(distance => {
      if (distance !== Infinity && distance > maxPath) {
        maxPath = distance;
      }
    });
  });

  return maxPath;
}

function calculateAveragePathLength(pathLengths: Map<string, Map<string, number>>): number {
  let totalDistance = 0;
  let pathCount = 0;

  pathLengths.forEach(fromPaths => {
    fromPaths.forEach((distance, target) => {
      if (distance !== Infinity && distance > 0) {
        totalDistance += distance;
        pathCount++;
      }
    });
  });

  return pathCount > 0 ? totalDistance / pathCount : 0;
}

function calculateClusteringCoefficient(network: StationNetwork): number {
  if (network.stations.size === 0) return 0;

  let totalClustering = 0;
  let stationCount = 0;

  network.stations.forEach((station, stationId) => {
    const neighbors = getNeighbors(stationId, network);
    if (neighbors.length >= 2) {
      const possibleConnections = neighbors.length * (neighbors.length - 1) / 2;
      const actualConnections = countConnectionsBetweenStations(neighbors, network);
      const clustering = actualConnections / possibleConnections;
      totalClustering += clustering;
    }
    stationCount++;
  });

  return stationCount > 0 ? totalClustering / stationCount : 0;
}

function calculateBetweennessCentrality(network: StationNetwork): Map<string, number> {
  const centrality = new Map<string, number>();
  const stations = Array.from(network.stations.keys());

  // Initialize centrality scores
  stations.forEach(station => {
    centrality.set(station, 0);
  });

  // Calculate for all pairs of stations
  for (let s = 0; s < stations.length; s++) {
    for (let t = s + 1; t < stations.length; t++) {
      const source = stations[s];
      const target = stations[t];
      
      // Find all shortest paths between source and target
      const shortestPaths = findAllShortestPaths(source, target, network);
      const totalPaths = shortestPaths.length;
      
      if (totalPaths > 0) {
        // Count how many shortest paths pass through each station
        shortestPaths.forEach(path => {
          for (let i = 1; i < path.length - 1; i++) { // Exclude source and target
            const intermediate = path[i];
            const currentScore = centrality.get(intermediate) || 0;
            centrality.set(intermediate, currentScore + 1 / totalPaths);
          }
        });
      }
    }
  }

  // Normalize by the number of station pairs
  const normalizationFactor = stations.length > 2 ? (stations.length - 1) * (stations.length - 2) / 2 : 1;
  centrality.forEach((score, station) => {
    centrality.set(station, score / normalizationFactor);
  });

  return centrality;
}

function calculateNetworkRedundancy(network: StationNetwork): number {
  const stations = Array.from(network.stations.keys());
  let pathsWithAlternatives = 0;
  let totalPaths = 0;

  // Check each pair of stations
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const source = stations[i];
      const target = stations[j];
      
      // Find alternative paths
      const paths = findAlternativePaths(source, target, network);
      totalPaths++;
      
      if (paths.length > 1) {
        pathsWithAlternatives++;
      }
    }
  }

  return totalPaths > 0 ? (pathsWithAlternatives / totalPaths) * 100 : 0;
}

function calculateGlobalEfficiency(pathLengths: Map<string, Map<string, number>>): number {
  let totalEfficiency = 0;
  let pathCount = 0;

  pathLengths.forEach(fromPaths => {
    fromPaths.forEach((distance, target) => {
      if (distance !== Infinity && distance > 0) {
        totalEfficiency += 1 / distance;
        pathCount++;
      }
    });
  });

  return pathCount > 0 ? (totalEfficiency / pathCount) * 100 : 0;
}

function hasCircularStructure(network: StationNetwork): boolean {
  // Use DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (stationId: string, parent: string | null): boolean => {
    if (recursionStack.has(stationId)) {
      return true;
    }
    if (visited.has(stationId)) {
      return false;
    }

    visited.add(stationId);
    recursionStack.add(stationId);

    const neighbors = getNeighbors(stationId, network);
    for (const neighbor of neighbors) {
      if (neighbor !== parent && hasCycle(neighbor, stationId)) {
        return true;
      }
    }

    recursionStack.delete(stationId);
    return false;
  };

  // Check each unvisited station
  for (const stationId of network.stations.keys()) {
    if (!visited.has(stationId)) {
      if (hasCycle(stationId, null)) {
        return true;
      }
    }
  }

  return false;
}

function getConnectionCounts(network: StationNetwork): Map<string, number> {
  const counts = new Map<string, number>();

  // Initialize all stations with 0 connections
  network.stations.forEach((_, stationId) => {
    counts.set(stationId, 0);
  });

  // Count connections
  network.connections.forEach(connection => {
    counts.set(connection.from, (counts.get(connection.from) || 0) + 1);
    counts.set(connection.to, (counts.get(connection.to) || 0) + 1);
  });

  return counts;
}

function getNeighbors(stationId: string, network: StationNetwork): string[] {
  const neighbors: string[] = [];

  network.connections.forEach(connection => {
    if (connection.from === stationId) {
      neighbors.push(connection.to);
    } else if (connection.to === stationId) {
      neighbors.push(connection.from);
    }
  });

  return neighbors;
}

function countConnectionsBetweenStations(stationIds: string[], network: StationNetwork): number {
  let count = 0;
  
  for (let i = 0; i < stationIds.length; i++) {
    for (let j = i + 1; j < stationIds.length; j++) {
      const hasConnection = Array.from(network.connections.values()).some(connection =>
        (connection.from === stationIds[i] && connection.to === stationIds[j]) ||
        (connection.from === stationIds[j] && connection.to === stationIds[i])
      );
      
      if (hasConnection) {
        count++;
      }
    }
  }

  return count;
}

function findAllShortestPaths(
  source: string,
  target: string,
  network: StationNetwork
): string[][] {
  // Simple BFS to find all shortest paths
  const queue: { station: string; path: string[] }[] = [{ station: source, path: [source] }];
  const visited = new Set<string>();
  const shortestPaths: string[][] = [];
  let shortestLength = Infinity;

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.path.length > shortestLength) {
      continue; // Skip longer paths
    }

    if (current.station === target) {
      if (current.path.length < shortestLength) {
        shortestLength = current.path.length;
        shortestPaths.length = 0; // Clear previous longer paths
        shortestPaths.push([...current.path]);
      } else if (current.path.length === shortestLength) {
        shortestPaths.push([...current.path]);
      }
      continue;
    }

    if (visited.has(current.station) && current.station !== source) {
      continue;
    }
    visited.add(current.station);

    const neighbors = getNeighbors(current.station, network);
    neighbors.forEach(neighbor => {
      if (!current.path.includes(neighbor)) {
        queue.push({
          station: neighbor,
          path: [...current.path, neighbor]
        });
      }
    });
  }

  return shortestPaths;
}

function findAlternativePaths(
  source: string,
  target: string,
  network: StationNetwork
): string[][] {
  // This is a simplified version - in practice, you'd want more sophisticated path finding
  return findAllShortestPaths(source, target, network);
}

function calculateCriticalStationImpact(stationId: string, network: StationNetwork): number {
  const connections = getNeighbors(stationId, network);
  const totalStations = network.stations.size;
  
  // Impact based on how many stations would be affected
  return Math.min(100, (connections.length / totalStations) * 100);
}

function calculateConnectionImpact(connection: NetworkConnection, network: StationNetwork): number {
  // Impact based on how many routes use this connection
  const routeCount = connection.routes.length;
  const totalRoutes = network.routes.size;
  
  return totalRoutes > 0 ? Math.min(100, (routeCount / totalRoutes) * 100) : 0;
}

function calculateStationImpact(station: NetworkStation, network: StationNetwork): number {
  // Impact based on throughput relative to network capacity
  const totalCapacity = Array.from(network.stations.values())
    .reduce((sum, s) => sum + s.throughput.capacity, 0);
  
  return totalCapacity > 0 ? (station.throughput.capacity / totalCapacity) * 100 : 0;
}

function calculateRouteImpact(route: NetworkRoute, network: StationNetwork): number {
  // Impact based on route distance relative to total network distance
  const totalDistance = Array.from(network.routes.values())
    .reduce((sum, r) => sum + r.distance, 0);
  
  return totalDistance > 0 ? (route.distance / totalDistance) * 100 : 0;
}

function getRoutesThoughStation(stationId: string, network: StationNetwork): string[] {
  const routes: string[] = [];
  
  network.routes.forEach(route => {
    if (route.stations.includes(stationId)) {
      routes.push(route.id);
    }
  });
  
  return routes;
}