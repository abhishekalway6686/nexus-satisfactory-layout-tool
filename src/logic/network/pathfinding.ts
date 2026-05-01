// Advanced Pathfinding Algorithms for Network Systems

import { 
  StationNetwork, 
  NetworkStation, 
  NetworkConnection,
  NetworkRoute,
  Point3D
} from '../../types';
import { distance3D } from '../../utils/helpers';

/**
 * Priority queue implementation for pathfinding algorithms
 */
class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | null {
    const result = this.items.shift();
    return result ? result.item : null;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Dijkstra's algorithm for finding shortest path between stations
 */
export function dijkstraPathfinding(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string,
  weightFunction: (connection: NetworkConnection) => number = (conn) => conn.distance
): NetworkRoute | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const queue = new PriorityQueue<string>();

  // Initialize distances
  network.stations.forEach((_, stationId) => {
    const distance = stationId === fromStationId ? 0 : Infinity;
    distances.set(stationId, distance);
    previous.set(stationId, null);
    queue.enqueue(stationId, distance);
  });

  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    if (!current) break;

    if (current === toStationId) {
      return reconstructRoute(previous, fromStationId, toStationId, network);
    }

    const currentDistance = distances.get(current) || Infinity;
    if (currentDistance === Infinity) break;

    // Check all connections from current station
    network.connections.forEach(connection => {
      let neighbor: string | null = null;
      if (connection.from === current) {
        neighbor = connection.to;
      } else if (connection.to === current) {
        neighbor = connection.from;
      }

      if (neighbor) {
        const weight = weightFunction(connection);
        const alternativeDistance = currentDistance + weight;
        const currentNeighborDistance = distances.get(neighbor) || Infinity;

        if (alternativeDistance < currentNeighborDistance) {
          distances.set(neighbor, alternativeDistance);
          previous.set(neighbor, current);
          queue.enqueue(neighbor, alternativeDistance);
        }
      }
    });
  }

  return null; // No path found
}

/**
 * A* pathfinding algorithm with heuristic
 */
export function aStarPathfinding(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string,
  heuristic?: (station1: NetworkStation, station2: NetworkStation) => number
): NetworkRoute | null {
  const fromStation = network.stations.get(fromStationId);
  const toStation = network.stations.get(toStationId);
  
  if (!fromStation || !toStation) {
    return null;
  }

  // Default heuristic: Euclidean distance
  const defaultHeuristic = (s1: NetworkStation, s2: NetworkStation) => 
    distance3D(s1.position, s2.position);
  
  const h = heuristic || defaultHeuristic;

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const openSet = new PriorityQueue<string>();
  const closedSet = new Set<string>();

  // Initialize
  gScore.set(fromStationId, 0);
  fScore.set(fromStationId, h(fromStation, toStation));
  openSet.enqueue(fromStationId, fScore.get(fromStationId) || 0);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    if (!current) break;

    if (current === toStationId) {
      return reconstructRoute(previous, fromStationId, toStationId, network);
    }

    closedSet.add(current);

    // Check all connections from current station
    network.connections.forEach(connection => {
      let neighbor: string | null = null;
      if (connection.from === current) {
        neighbor = connection.to;
      } else if (connection.to === current) {
        neighbor = connection.from;
      }

      if (neighbor && !closedSet.has(neighbor)) {
        const neighborStation = network.stations.get(neighbor);
        if (!neighborStation) return;

        const tentativeGScore = (gScore.get(current) || 0) + connection.distance;
        const currentGScore = gScore.get(neighbor) || Infinity;

        if (tentativeGScore < currentGScore) {
          previous.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          const fValue = tentativeGScore + h(neighborStation, toStation);
          fScore.set(neighbor, fValue);
          openSet.enqueue(neighbor, fValue);
        }
      }
    });
  }

  return null; // No path found
}

/**
 * Finds multiple alternative paths between stations
 */
export function findAlternativePaths(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string,
  maxPaths: number = 3
): NetworkRoute[] {
  const paths: NetworkRoute[] = [];
  const usedConnections = new Set<string>();

  // Find primary path
  const primaryPath = dijkstraPathfinding(network, fromStationId, toStationId);
  if (primaryPath) {
    paths.push(primaryPath);
    markConnectionsAsUsed(primaryPath, usedConnections, network);
  }

  // Find alternative paths by temporarily removing used connections
  for (let i = 1; i < maxPaths; i++) {
    const alternativePath = dijkstraPathfindingExcluding(
      network,
      fromStationId,
      toStationId,
      usedConnections
    );

    if (alternativePath) {
      paths.push(alternativePath);
      markConnectionsAsUsed(alternativePath, usedConnections, network);
    } else {
      break; // No more paths available
    }
  }

  return paths;
}

/**
 * Finds the most efficient path considering both distance and capacity
 */
export function findMostEfficientPath(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string,
  prioritizeCapacity: boolean = false
): NetworkRoute | null {
  const weightFunction = (connection: NetworkConnection): number => {
    const distanceWeight = connection.distance;
    const capacityWeight = prioritizeCapacity ? 
      (1 / Math.max(0.1, connection.capacity / 100)) : 0;
    const efficiencyWeight = (100 - connection.efficiency) / 10;
    
    return distanceWeight + capacityWeight + efficiencyWeight;
  };

  return dijkstraPathfinding(network, fromStationId, toStationId, weightFunction);
}

/**
 * Finds the fastest path considering travel time
 */
export function findFastestPath(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string
): NetworkRoute | null {
  const weightFunction = (connection: NetworkConnection): number => {
    return connection.travelTime;
  };

  return dijkstraPathfinding(network, fromStationId, toStationId, weightFunction);
}

/**
 * Calculates all shortest paths between all pairs of stations (Floyd-Warshall)
 */
export function calculateAllPairsPaths(network: StationNetwork): Map<string, NetworkRoute> {
  const stations = Array.from(network.stations.keys());
  const distances = new Map<string, Map<string, number>>();
  const next = new Map<string, Map<string, string | null>>();
  const routes = new Map<string, NetworkRoute>();

  // Initialize distance matrix
  stations.forEach(i => {
    distances.set(i, new Map());
    next.set(i, new Map());
    stations.forEach(j => {
      if (i === j) {
        distances.get(i)!.set(j, 0);
      } else {
        distances.get(i)!.set(j, Infinity);
      }
      next.get(i)!.set(j, null);
    });
  });

  // Set direct connection distances
  network.connections.forEach(connection => {
    distances.get(connection.from)!.set(connection.to, connection.distance);
    distances.get(connection.to)!.set(connection.from, connection.distance);
    next.get(connection.from)!.set(connection.to, connection.to);
    next.get(connection.to)!.set(connection.from, connection.from);
  });

  // Floyd-Warshall algorithm
  stations.forEach(k => {
    stations.forEach(i => {
      stations.forEach(j => {
        const distanceIK = distances.get(i)!.get(k)!;
        const distanceKJ = distances.get(k)!.get(j)!;
        const distanceIJ = distances.get(i)!.get(j)!;
        
        if (distanceIK + distanceKJ < distanceIJ) {
          distances.get(i)!.set(j, distanceIK + distanceKJ);
          next.get(i)!.set(j, next.get(i)!.get(k));
        }
      });
    });
  });

  // Reconstruct routes
  stations.forEach(from => {
    stations.forEach(to => {
      if (from !== to && distances.get(from)!.get(to)! < Infinity) {
        const route = reconstructFloydWarshallPath(from, to, next, network);
        if (route) {
          routes.set(`${from}_${to}`, route);
        }
      }
    });
  });

  return routes;
}

/**
 * Finds paths with minimum number of hops
 */
export function findShortestHopPath(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string
): NetworkRoute | null {
  const queue: string[] = [fromStationId];
  const visited = new Set<string>([fromStationId]);
  const previous = new Map<string, string | null>();
  previous.set(fromStationId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === toStationId) {
      return reconstructRoute(previous, fromStationId, toStationId, network);
    }

    // Check all connections from current station
    network.connections.forEach(connection => {
      let neighbor: string | null = null;
      if (connection.from === current) {
        neighbor = connection.to;
      } else if (connection.to === current) {
        neighbor = connection.from;
      }

      if (neighbor && !visited.has(neighbor)) {
        visited.add(neighbor);
        previous.set(neighbor, current);
        queue.push(neighbor);
      }
    });
  }

  return null; // No path found
}

// Helper functions

/**
 * Reconstructs a route from the pathfinding result
 */
function reconstructRoute(
  previous: Map<string, string | null>,
  fromStationId: string,
  toStationId: string,
  network: StationNetwork
): NetworkRoute {
  const stations: string[] = [];
  let current: string | null = toStationId;

  while (current !== null) {
    stations.unshift(current);
    current = previous.get(current) || null;
  }

  const totalDistance = calculateRouteDistance(stations, network);
  const travelTime = estimateRouteTravelTime(stations, network);
  const efficiency = calculateRouteEfficiency(stations, network);

  return {
    id: `route_${fromStationId}_${toStationId}_${Date.now()}`,
    stations,
    railwaySegments: [], // Could be populated with actual segments
    efficiency,
    travelTime,
    capacity: calculateRouteCapacity(stations, network),
    currentLoad: 0,
    distance: totalDistance,
    materials: [],
    waypoints: stations.map(stationId => {
      const station = network.stations.get(stationId);
      return station ? station.position : { x: 0, y: 0, z: 0 };
    }),
    isOptimal: true,
    alternatives: []
  };
}

/**
 * Dijkstra with excluded connections
 */
function dijkstraPathfindingExcluding(
  network: StationNetwork,
  fromStationId: string,
  toStationId: string,
  excludedConnections: Set<string>
): NetworkRoute | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const queue = new PriorityQueue<string>();

  // Initialize
  network.stations.forEach((_, stationId) => {
    const distance = stationId === fromStationId ? 0 : Infinity;
    distances.set(stationId, distance);
    previous.set(stationId, null);
    queue.enqueue(stationId, distance);
  });

  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    if (!current) break;

    if (current === toStationId) {
      return reconstructRoute(previous, fromStationId, toStationId, network);
    }

    const currentDistance = distances.get(current) || Infinity;
    if (currentDistance === Infinity) break;

    // Check connections, excluding blocked ones
    network.connections.forEach(connection => {
      if (excludedConnections.has(connection.id)) return;

      let neighbor: string | null = null;
      if (connection.from === current) {
        neighbor = connection.to;
      } else if (connection.to === current) {
        neighbor = connection.from;
      }

      if (neighbor) {
        const alternativeDistance = currentDistance + connection.distance;
        const currentNeighborDistance = distances.get(neighbor) || Infinity;

        if (alternativeDistance < currentNeighborDistance) {
          distances.set(neighbor, alternativeDistance);
          previous.set(neighbor, current);
          queue.enqueue(neighbor, alternativeDistance);
        }
      }
    });
  }

  return null;
}

/**
 * Marks connections used by a route
 */
function markConnectionsAsUsed(
  route: NetworkRoute,
  usedConnections: Set<string>,
  network: StationNetwork
): void {
  for (let i = 0; i < route.stations.length - 1; i++) {
    const from = route.stations[i];
    const to = route.stations[i + 1];
    
    // Find the connection between these stations
    network.connections.forEach(connection => {
      if ((connection.from === from && connection.to === to) ||
          (connection.from === to && connection.to === from)) {
        usedConnections.add(connection.id);
      }
    });
  }
}

/**
 * Reconstructs path from Floyd-Warshall algorithm
 */
function reconstructFloydWarshallPath(
  from: string,
  to: string,
  next: Map<string, Map<string, string | null>>,
  network: StationNetwork
): NetworkRoute | null {
  const stations: string[] = [];
  let current = from;
  
  while (current !== to) {
    stations.push(current);
    const nextStation = next.get(current)!.get(to);
    if (!nextStation) return null;
    current = nextStation;
  }
  stations.push(to);

  const totalDistance = calculateRouteDistance(stations, network);
  const travelTime = estimateRouteTravelTime(stations, network);
  const efficiency = calculateRouteEfficiency(stations, network);

  return {
    id: `route_${from}_${to}_fw`,
    stations,
    railwaySegments: [],
    efficiency,
    travelTime,
    capacity: calculateRouteCapacity(stations, network),
    currentLoad: 0,
    distance: totalDistance,
    materials: [],
    waypoints: stations.map(stationId => {
      const station = network.stations.get(stationId);
      return station ? station.position : { x: 0, y: 0, z: 0 };
    }),
    isOptimal: false,
    alternatives: []
  };
}

/**
 * Calculate total distance of a route
 */
function calculateRouteDistance(stationIds: string[], network: StationNetwork): number {
  let totalDistance = 0;
  
  for (let i = 0; i < stationIds.length - 1; i++) {
    const connection = findConnection(stationIds[i], stationIds[i + 1], network);
    if (connection) {
      totalDistance += connection.distance;
    }
  }
  
  return totalDistance;
}

/**
 * Estimate travel time for a route
 */
function estimateRouteTravelTime(stationIds: string[], network: StationNetwork): number {
  let totalTime = 0;
  
  for (let i = 0; i < stationIds.length - 1; i++) {
    const connection = findConnection(stationIds[i], stationIds[i + 1], network);
    if (connection) {
      totalTime += connection.travelTime;
    }
  }
  
  return totalTime;
}

/**
 * Calculate route efficiency
 */
function calculateRouteEfficiency(stationIds: string[], network: StationNetwork): number {
  if (stationIds.length < 2) return 100;
  
  const fromStation = network.stations.get(stationIds[0]);
  const toStation = network.stations.get(stationIds[stationIds.length - 1]);
  
  if (!fromStation || !toStation) return 0;
  
  const directDistance = distance3D(fromStation.position, toStation.position);
  const routeDistance = calculateRouteDistance(stationIds, network);
  
  if (routeDistance === 0) return 100;
  
  return Math.min(100, (directDistance / routeDistance) * 100);
}

/**
 * Calculate route capacity (bottleneck)
 */
function calculateRouteCapacity(stationIds: string[], network: StationNetwork): number {
  let minCapacity = Infinity;
  
  for (let i = 0; i < stationIds.length - 1; i++) {
    const connection = findConnection(stationIds[i], stationIds[i + 1], network);
    if (connection) {
      minCapacity = Math.min(minCapacity, connection.capacity);
    }
  }
  
  return minCapacity === Infinity ? 0 : minCapacity;
}

/**
 * Find connection between two stations
 */
function findConnection(fromId: string, toId: string, network: StationNetwork): NetworkConnection | null {
  for (const connection of network.connections.values()) {
    if ((connection.from === fromId && connection.to === toId) ||
        (connection.from === toId && connection.to === fromId)) {
      return connection;
    }
  }
  return null;
}