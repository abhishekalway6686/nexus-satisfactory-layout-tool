// Network Management System - Core Logic
// Implements the Multi-Building Station Connection System

import { 
  Point3D, 
  Building, 
  Railway, 
  RailwaySegment, 
  StationNetwork, 
  NetworkStation, 
  NetworkConnection, 
  NetworkRoute, 
  NetworkHealthMetrics, 
  NetworkBottleneck, 
  NetworkSuggestion, 
  NetworkTopologyType,
  NetworkStatus,
  ConnectionStatus,
  NetworkAnalysisCache
} from '../../types';
import { distance3D } from '../../utils/helpers';
import { BUILDING_TYPES } from '../../constants';

export class NetworkManager {
  private cache: NetworkAnalysisCache;
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor() {
    this.cache = {
      pathCache: new Map(),
      efficiencyCache: new Map(),
      topologyCache: new Map(),
      lastInvalidation: Date.now()
    };
  }

  /**
   * Creates a new station network from a collection of train stations
   */
  createNetwork(
    id: string, 
    name: string, 
    stationIds: string[], 
    buildings: Record<string, Building>,
    railways: Record<string, Railway>,
    railwaySegments: Record<string, RailwaySegment>
  ): StationNetwork {
    const stations = new Map<string, NetworkStation>();
    
    // Create network stations from buildings
    stationIds.forEach(stationId => {
      const building = buildings[stationId];
      if (building && this.isTrainStation(building)) {
        const networkStation = this.createNetworkStation(building, railways, railwaySegments);
        stations.set(stationId, networkStation);
      }
    });

    // Analyze initial connections
    const connections = this.detectConnections(stations, railways, railwaySegments);
    const routes = this.calculateRoutes(stations, connections, railwaySegments);
    const topology = this.detectTopology(stations, connections);
    const healthMetrics = this.analyzeHealth(stations, connections, routes);

    return {
      id,
      name,
      stations,
      connections,
      routes,
      topology,
      healthMetrics,
      lastOptimization: Date.now(),
      autoOptimize: true,
      version: 1
    };
  }

  /**
   * Analyzes network health and identifies bottlenecks
   */
  analyzeNetworkHealth(
    network: StationNetwork,
    buildings: Record<string, Building>,
    railways: Record<string, Railway>,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkHealthMetrics {
    const cacheKey = `health_${network.id}_${network.version}`;
    
    // Check cache first
    if (this.isCacheValid() && this.cache.efficiencyCache.has(cacheKey)) {
      const cached = this.cache.efficiencyCache.get(cacheKey);
      if (cached && typeof cached === 'object') {
        return cached as NetworkHealthMetrics;
      }
    }

    const bottlenecks: NetworkBottleneck[] = [];
    const stations = Array.from(network.stations.values());
    const connections = Array.from(network.connections.values());
    const routes = Array.from(network.routes.values());

    // Analyze station bottlenecks
    stations.forEach(station => {
      if (station.throughput.utilization > 90) {
        bottlenecks.push(this.createStationBottleneck(station, network));
      }
    });

    // Analyze connection bottlenecks
    connections.forEach(connection => {
      if (connection.currentLoad / connection.capacity > 0.9) {
        bottlenecks.push(this.createConnectionBottleneck(connection, network));
      }
    });

    // Calculate utilization distribution
    const utilizationDistribution = this.calculateUtilizationDistribution(connections);

    // Calculate overall health score
    const overallHealth = this.calculateOverallHealthScore(
      stations, 
      connections, 
      routes, 
      bottlenecks
    );

    const healthMetrics: NetworkHealthMetrics = {
      overallHealth,
      totalStations: stations.length,
      totalConnections: connections.length,
      totalRoutes: routes.length,
      averageEfficiency: this.calculateAverageEfficiency(routes),
      bottlenecks,
      utilizationDistribution,
      topologyType: network.topology,
      lastAnalysis: Date.now()
    };

    // Cache the result
    this.cache.efficiencyCache.set(cacheKey, healthMetrics);
    return healthMetrics;
  }

  /**
   * Generates optimization suggestions for a network
   */
  generateOptimizationSuggestions(
    network: StationNetwork,
    healthMetrics: NetworkHealthMetrics
  ): NetworkSuggestion[] {
    const suggestions: NetworkSuggestion[] = [];

    // Analyze bottlenecks and create suggestions
    healthMetrics.bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'station':
          suggestions.push(...this.createStationOptimizationSuggestions(bottleneck, network));
          break;
        case 'connection':
          suggestions.push(...this.createConnectionOptimizationSuggestions(bottleneck, network));
          break;
        case 'route':
          suggestions.push(...this.createRouteOptimizationSuggestions(bottleneck, network));
          break;
      }
    });

    // Analyze topology for structural improvements
    suggestions.push(...this.createTopologyOptimizationSuggestions(network, healthMetrics));

    // Sort suggestions by priority and impact
    return suggestions.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      return b.estimatedImprovement - a.estimatedImprovement; // Higher improvement first
    });
  }

  /**
   * Calculates optimal route between two stations
   */
  calculateOptimalRoute(
    network: StationNetwork,
    fromStationId: string,
    toStationId: string,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkRoute | null {
    const cacheKey = `route_${fromStationId}_${toStationId}_${network.version}`;
    
    // Check cache first
    if (this.isCacheValid() && this.cache.pathCache.has(cacheKey)) {
      return this.cache.pathCache.get(cacheKey) || null;
    }

    const fromStation = network.stations.get(fromStationId);
    const toStation = network.stations.get(toStationId);
    
    if (!fromStation || !toStation) {
      return null;
    }

    // Use Dijkstra's algorithm to find optimal path
    const route = this.dijkstraPathfinding(
      network, 
      fromStationId, 
      toStationId, 
      railwaySegments
    );

    // Cache the result
    if (route) {
      this.cache.pathCache.set(cacheKey, route);
    }

    return route;
  }

  /**
   * Detects network topology type
   */
  detectNetworkTopology(
    stations: Map<string, NetworkStation>,
    connections: Map<string, NetworkConnection>
  ): NetworkTopologyType {
    const stationCount = stations.size;
    const connectionCount = connections.size;
    
    if (stationCount <= 1) {
      return 'chain';
    }

    // Analyze connection patterns
    const connectionCounts = new Map<string, number>();
    connections.forEach(connection => {
      connectionCounts.set(connection.from, (connectionCounts.get(connection.from) || 0) + 1);
      connectionCounts.set(connection.to, (connectionCounts.get(connection.to) || 0) + 1);
    });

    const maxConnections = Math.max(...Array.from(connectionCounts.values()));
    const averageConnections = connectionCount * 2 / stationCount;

    // Detect hub-and-spoke (one station with many connections)
    const hubStations = Array.from(connectionCounts.entries())
      .filter(([_, count]) => count >= stationCount / 2);
    
    if (hubStations.length >= 1 && maxConnections >= stationCount / 2) {
      return 'hub_spoke';
    }

    // Detect loop (roughly equal connections, forms circuits)
    if (this.hasLoops(stations, connections) && averageConnections >= 1.8) {
      return 'loop';
    }

    // Detect mesh (highly interconnected)
    if (averageConnections > 2.5) {
      return 'mesh';
    }

    // Detect branching (tree-like structure)
    if (averageConnections < 1.5 && this.hasTreeStructure(stations, connections)) {
      return 'branching';
    }

    // Default to chain for linear structures
    return 'chain';
  }

  /**
   * Invalidates network analysis cache
   */
  invalidateCache(networkId?: string): void {
    if (networkId) {
      // Invalidate specific network cache entries
      const keysToDelete: string[] = [];
      this.cache.pathCache.forEach((_, key) => {
        if (key.includes(networkId)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.pathCache.delete(key));
    } else {
      // Clear all cache
      this.cache.pathCache.clear();
      this.cache.efficiencyCache.clear();
      this.cache.topologyCache.clear();
    }
    this.cache.lastInvalidation = Date.now();
  }

  // Private helper methods

  private isTrainStation(building: Building): boolean {
    const buildingType = BUILDING_TYPES[building.type];
    return buildingType?.category === 'transport' && 
           buildingType.name.toLowerCase().includes('station');
  }

  private createNetworkStation(
    building: Building,
    railways: Record<string, Railway>,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkStation {
    const buildingType = BUILDING_TYPES[building.type];
    const connections: NetworkConnection[] = [];
    
    // Calculate throughput based on building type
    const throughput = this.calculateStationThroughput(building);
    
    return {
      id: building.id,
      type: building.type,
      position: { x: building.x, y: building.y, z: building.z },
      floor: building.floor,
      connectionPoints: building.railwayPoints || [],
      connections,
      throughput,
      materials: this.getStationMaterials(building),
      status: 'healthy' as NetworkStatus
    };
  }

  private detectConnections(
    stations: Map<string, NetworkStation>,
    railways: Record<string, Railway>,
    railwaySegments: Record<string, RailwaySegment>
  ): Map<string, NetworkConnection> {
    const connections = new Map<string, NetworkConnection>();

    // Analyze railways to find station connections
    Object.values(railways).forEach(railway => {
      const connectedStations = railway.stations.filter(stationId => 
        stations.has(stationId)
      );

      // Create connections between adjacent stations in the railway
      for (let i = 0; i < connectedStations.length - 1; i++) {
        const fromStation = connectedStations[i];
        const toStation = connectedStations[i + 1];
        
        const connectionId = `${fromStation}_${toStation}`;
        if (!connections.has(connectionId)) {
          const connection = this.createNetworkConnection(
            connectionId,
            fromStation,
            toStation,
            railway,
            railwaySegments
          );
          connections.set(connectionId, connection);
        }
      }
    });

    return connections;
  }

  private createNetworkConnection(
    id: string,
    fromStation: string,
    toStation: string,
    railway: Railway,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkConnection {
    const relevantSegments = railway.segments.map(segId => railwaySegments[segId]);
    const distance = this.calculateTotalDistance(relevantSegments);
    const travelTime = this.estimateTravelTime(distance);
    
    return {
      id,
      from: fromStation,
      to: toStation,
      routes: [],
      capacity: this.calculateConnectionCapacity(relevantSegments),
      currentLoad: 0,
      efficiency: this.calculateConnectionEfficiency(relevantSegments),
      status: 'connected' as ConnectionStatus,
      distance,
      travelTime,
      lastUpdated: Date.now()
    };
  }

  private calculateRoutes(
    stations: Map<string, NetworkStation>,
    connections: Map<string, NetworkConnection>,
    railwaySegments: Record<string, RailwaySegment>
  ): Map<string, NetworkRoute> {
    const routes = new Map<string, NetworkRoute>();

    connections.forEach(connection => {
      const route = this.createNetworkRoute(
        connection,
        stations,
        railwaySegments
      );
      routes.set(route.id, route);
      connection.routes.push(route);
    });

    return routes;
  }

  private createNetworkRoute(
    connection: NetworkConnection,
    stations: Map<string, NetworkStation>,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkRoute {
    const fromStation = stations.get(connection.from);
    const toStation = stations.get(connection.to);
    
    if (!fromStation || !toStation) {
      throw new Error(`Invalid station IDs in connection ${connection.id}`);
    }

    const waypoints = this.calculateRouteWaypoints(fromStation, toStation);
    
    return {
      id: `route_${connection.id}`,
      stations: [connection.from, connection.to],
      railwaySegments: [],
      efficiency: connection.efficiency,
      travelTime: connection.travelTime,
      capacity: connection.capacity,
      currentLoad: 0,
      distance: connection.distance,
      materials: [],
      waypoints,
      isOptimal: true,
      alternatives: []
    };
  }

  private calculateRouteWaypoints(
    fromStation: NetworkStation,
    toStation: NetworkStation
  ): Point3D[] {
    return [
      fromStation.position,
      toStation.position
    ];
  }

  private detectTopology(
    stations: Map<string, NetworkStation>,
    connections: Map<string, NetworkConnection>
  ): NetworkTopologyType {
    return this.detectNetworkTopology(stations, connections);
  }

  private analyzeHealth(
    stations: Map<string, NetworkStation>,
    connections: Map<string, NetworkConnection>,
    routes: Map<string, NetworkRoute>
  ): NetworkHealthMetrics {
    const bottlenecks: NetworkBottleneck[] = [];
    const stationsArray = Array.from(stations.values());
    const connectionsArray = Array.from(connections.values());
    const routesArray = Array.from(routes.values());

    const utilizationDistribution = this.calculateUtilizationDistribution(connectionsArray);
    const overallHealth = this.calculateOverallHealthScore(
      stationsArray,
      connectionsArray,
      routesArray,
      bottlenecks
    );

    return {
      overallHealth,
      totalStations: stations.size,
      totalConnections: connections.size,
      totalRoutes: routes.size,
      averageEfficiency: this.calculateAverageEfficiency(routesArray),
      bottlenecks,
      utilizationDistribution,
      topologyType: this.detectTopology(stations, connections),
      lastAnalysis: Date.now()
    };
  }

  private calculateStationThroughput(building: Building) {
    const buildingType = BUILDING_TYPES[building.type];
    // Base throughput calculation - could be extended with actual game data
    const baseCapacity = 780; // Items per minute for standard train station
    
    return {
      capacity: baseCapacity,
      current: 0,
      utilization: 0
    };
  }

  private getStationMaterials(building: Building): string[] {
    // For now, return empty array - could be extended to analyze connected buildings
    return [];
  }

  private calculateTotalDistance(segments: RailwaySegment[]): number {
    return segments.reduce((total, segment) => total + segment.length, 0);
  }

  private estimateTravelTime(distance: number): number {
    // Assume average train speed of 120 km/h = 33.33 m/s
    const averageSpeed = 33.33; // meters per second
    return distance / averageSpeed;
  }

  private calculateConnectionCapacity(segments: RailwaySegment[]): number {
    // Base capacity - trains per hour on a single track
    return 12; // Conservative estimate for single track
  }

  private calculateConnectionEfficiency(segments: RailwaySegment[]): number {
    // Basic efficiency calculation based on directness
    if (segments.length === 0) return 100;
    
    const totalLength = this.calculateTotalDistance(segments);
    const directDistance = distance3D(
      segments[0].startPoint,
      segments[segments.length - 1].endPoint
    );
    
    return Math.max(0, Math.min(100, (directDistance / totalLength) * 100));
  }

  private calculateUtilizationDistribution(connections: NetworkConnection[]) {
    const distribution = {
      underutilized: 0,
      optimal: 0,
      stressed: 0,
      bottlenecked: 0
    };

    connections.forEach(connection => {
      const utilization = connection.currentLoad / connection.capacity;
      if (utilization < 0.25) {
        distribution.underutilized++;
      } else if (utilization < 0.75) {
        distribution.optimal++;
      } else if (utilization < 0.90) {
        distribution.stressed++;
      } else {
        distribution.bottlenecked++;
      }
    });

    return distribution;
  }

  private calculateOverallHealthScore(
    stations: NetworkStation[],
    connections: NetworkConnection[],
    routes: NetworkRoute[],
    bottlenecks: NetworkBottleneck[]
  ): number {
    if (stations.length === 0) return 0;

    let score = 100;

    // Penalize bottlenecks
    bottlenecks.forEach(bottleneck => {
      score -= bottleneck.severity * 0.5;
    });

    // Factor in average efficiency
    const avgEfficiency = this.calculateAverageEfficiency(routes);
    score = (score + avgEfficiency) / 2;

    return Math.max(0, Math.min(100, score));
  }

  private calculateAverageEfficiency(routes: NetworkRoute[]): number {
    if (routes.length === 0) return 100;
    
    const totalEfficiency = routes.reduce((sum, route) => sum + route.efficiency, 0);
    return totalEfficiency / routes.length;
  }

  private createStationBottleneck(
    station: NetworkStation,
    network: StationNetwork
  ): NetworkBottleneck {
    return {
      id: `bottleneck_station_${station.id}`,
      type: 'station',
      targetId: station.id,
      severity: Math.min(100, station.throughput.utilization),
      impact: this.calculateBottleneckImpact(station, network),
      description: `Station ${station.id} is operating at ${station.throughput.utilization}% capacity`,
      suggestions: [
        {
          id: `suggestion_${station.id}_capacity`,
          type: 'add_station',
          title: 'Add parallel station',
          description: 'Build an additional station to distribute load',
          estimatedImprovement: 40,
          cost: 60,
          priority: 'medium'
        }
      ],
      affectedRoutes: this.getAffectedRoutes(station.id, network)
    };
  }

  private createConnectionBottleneck(
    connection: NetworkConnection,
    network: StationNetwork
  ): NetworkBottleneck {
    const utilization = (connection.currentLoad / connection.capacity) * 100;
    
    return {
      id: `bottleneck_connection_${connection.id}`,
      type: 'connection',
      targetId: connection.id,
      severity: Math.min(100, utilization),
      impact: this.calculateConnectionBottleneckImpact(connection, network),
      description: `Connection ${connection.from} → ${connection.to} is ${utilization.toFixed(1)}% utilized`,
      suggestions: [
        {
          id: `suggestion_${connection.id}_parallel`,
          type: 'add_route',
          title: 'Add parallel route',
          description: 'Build additional track to increase capacity',
          estimatedImprovement: 50,
          cost: 70,
          priority: 'high'
        }
      ],
      affectedRoutes: connection.routes.map(r => r.id)
    };
  }

  private calculateBottleneckImpact(station: NetworkStation, network: StationNetwork): number {
    // Calculate impact based on how many connections this station has
    const connectionCount = station.connections.length;
    const totalConnections = network.connections.size;
    
    if (totalConnections === 0) return 0;
    
    return Math.min(100, (connectionCount / totalConnections) * 100);
  }

  private calculateConnectionBottleneckImpact(
    connection: NetworkConnection, 
    network: StationNetwork
  ): number {
    // Impact based on how critical this connection is to overall network
    const routes = connection.routes.length;
    const totalRoutes = network.routes.size;
    
    if (totalRoutes === 0) return 0;
    
    return Math.min(100, (routes / totalRoutes) * 100);
  }

  private getAffectedRoutes(stationId: string, network: StationNetwork): string[] {
    const affectedRoutes: string[] = [];
    
    network.routes.forEach(route => {
      if (route.stations.includes(stationId)) {
        affectedRoutes.push(route.id);
      }
    });
    
    return affectedRoutes;
  }

  private createStationOptimizationSuggestions(
    bottleneck: NetworkBottleneck,
    network: StationNetwork
  ): NetworkSuggestion[] {
    return bottleneck.suggestions;
  }

  private createConnectionOptimizationSuggestions(
    bottleneck: NetworkBottleneck,
    network: StationNetwork
  ): NetworkSuggestion[] {
    return bottleneck.suggestions;
  }

  private createRouteOptimizationSuggestions(
    bottleneck: NetworkBottleneck,
    network: StationNetwork
  ): NetworkSuggestion[] {
    return bottleneck.suggestions;
  }

  private createTopologyOptimizationSuggestions(
    network: StationNetwork,
    healthMetrics: NetworkHealthMetrics
  ): NetworkSuggestion[] {
    const suggestions: NetworkSuggestion[] = [];

    // Suggest topology improvements based on current structure
    switch (network.topology) {
      case 'chain':
        if (healthMetrics.totalStations > 4) {
          suggestions.push({
            id: `topology_${network.id}_hub`,
            type: 'add_station',
            title: 'Create hub station',
            description: 'Add a central hub to improve network efficiency',
            estimatedImprovement: 30,
            cost: 80,
            priority: 'medium'
          });
        }
        break;
      
      case 'hub_spoke':
        suggestions.push({
          id: `topology_${network.id}_redundancy`,
          type: 'add_route',
          title: 'Add redundant connections',
          description: 'Connect spoke stations to improve reliability',
          estimatedImprovement: 25,
          cost: 60,
          priority: 'low'
        });
        break;
    }

    return suggestions;
  }

  private dijkstraPathfinding(
    network: StationNetwork,
    fromStationId: string,
    toStationId: string,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkRoute | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize distances
    network.stations.forEach((_, stationId) => {
      distances.set(stationId, stationId === fromStationId ? 0 : Infinity);
      previous.set(stationId, null);
      unvisited.add(stationId);
    });

    while (unvisited.size > 0) {
      // Find unvisited station with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;
      
      unvisited.forEach(stationId => {
        const distance = distances.get(stationId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          current = stationId;
        }
      });

      if (!current || minDistance === Infinity) {
        break; // No path found
      }

      unvisited.delete(current);

      if (current === toStationId) {
        // Found target, reconstruct path
        return this.reconstructPath(
          previous,
          fromStationId,
          toStationId,
          network,
          railwaySegments
        );
      }

      // Check neighbors
      const currentStation = network.stations.get(current);
      if (currentStation) {
        currentStation.connections.forEach(connection => {
          const neighbor = connection.from === current ? connection.to : connection.from;
          if (unvisited.has(neighbor)) {
            const alt = minDistance + connection.distance;
            if (alt < (distances.get(neighbor) || Infinity)) {
              distances.set(neighbor, alt);
              previous.set(neighbor, current);
            }
          }
        });
      }
    }

    return null; // No path found
  }

  private reconstructPath(
    previous: Map<string, string | null>,
    fromStationId: string,
    toStationId: string,
    network: StationNetwork,
    railwaySegments: Record<string, RailwaySegment>
  ): NetworkRoute {
    const stations: string[] = [];
    let current: string | null = toStationId;

    while (current !== null) {
      stations.unshift(current);
      current = previous.get(current) || null;
    }

    const totalDistance = this.calculatePathDistance(stations, network);
    const travelTime = this.estimateTravelTime(totalDistance);

    return {
      id: `route_${fromStationId}_${toStationId}_${Date.now()}`,
      stations,
      railwaySegments: [], // Could be populated with actual segments
      efficiency: this.calculatePathEfficiency(stations, network),
      travelTime,
      capacity: this.calculatePathCapacity(stations, network),
      currentLoad: 0,
      distance: totalDistance,
      materials: [],
      waypoints: this.calculatePathWaypoints(stations, network),
      isOptimal: true,
      alternatives: []
    };
  }

  private calculatePathDistance(stationIds: string[], network: StationNetwork): number {
    let totalDistance = 0;
    
    for (let i = 0; i < stationIds.length - 1; i++) {
      const connectionId = `${stationIds[i]}_${stationIds[i + 1]}`;
      const connection = network.connections.get(connectionId);
      if (connection) {
        totalDistance += connection.distance;
      }
    }
    
    return totalDistance;
  }

  private calculatePathEfficiency(stationIds: string[], network: StationNetwork): number {
    if (stationIds.length < 2) return 100;
    
    const fromStation = network.stations.get(stationIds[0]);
    const toStation = network.stations.get(stationIds[stationIds.length - 1]);
    
    if (!fromStation || !toStation) return 0;
    
    const directDistance = distance3D(fromStation.position, toStation.position);
    const pathDistance = this.calculatePathDistance(stationIds, network);
    
    if (pathDistance === 0) return 100;
    
    return Math.min(100, (directDistance / pathDistance) * 100);
  }

  private calculatePathCapacity(stationIds: string[], network: StationNetwork): number {
    let minCapacity = Infinity;
    
    for (let i = 0; i < stationIds.length - 1; i++) {
      const connectionId = `${stationIds[i]}_${stationIds[i + 1]}`;
      const connection = network.connections.get(connectionId);
      if (connection) {
        minCapacity = Math.min(minCapacity, connection.capacity);
      }
    }
    
    return minCapacity === Infinity ? 0 : minCapacity;
  }

  private calculatePathWaypoints(stationIds: string[], network: StationNetwork): Point3D[] {
    return stationIds.map(stationId => {
      const station = network.stations.get(stationId);
      return station ? station.position : { x: 0, y: 0, z: 0 };
    });
  }

  private hasLoops(
    stations: Map<string, NetworkStation>,
    connections: Map<string, NetworkConnection>
  ): boolean {
    // Simple cycle detection using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stationId: string): boolean => {
      if (recursionStack.has(stationId)) {
        return true; // Back edge found, cycle exists
      }
      if (visited.has(stationId)) {
        return false; // Already processed
      }

      visited.add(stationId);
      recursionStack.add(stationId);

      // Check all connections from this station
      const station = stations.get(stationId);
      if (station) {
        for (const connection of station.connections) {
          const neighbor = connection.from === stationId ? connection.to : connection.from;
          if (hasCycle(neighbor)) {
            return true;
          }
        }
      }

      recursionStack.delete(stationId);
      return false;
    };

    // Check each unvisited station
    for (const stationId of stations.keys()) {
      if (!visited.has(stationId)) {
        if (hasCycle(stationId)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasTreeStructure(
    stations: Map<string, NetworkStation>,
    connections: Map<string, NetworkConnection>
  ): boolean {
    // A tree has exactly n-1 edges for n nodes and no cycles
    const stationCount = stations.size;
    const connectionCount = connections.size;
    
    if (connectionCount !== stationCount - 1) {
      return false;
    }
    
    return !this.hasLoops(stations, connections);
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastInvalidation < this.CACHE_TTL;
  }
}

// Export singleton instance
export const networkManager = new NetworkManager();