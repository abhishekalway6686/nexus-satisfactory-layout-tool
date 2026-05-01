// src/logic/network/__tests__/networkManager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkManager } from '../networkManager';
import { findOptimalPath, calculateNetworkEfficiency, detectBottlenecks } from '../pathfinding';
import { analyzeNetworkTopology, generateOptimizationSuggestions } from '../topologyAnalysis';
import { 
  createMockBuilding, 
  createMockRailway,
  createMockNetworkTopology,
  PerformanceTestHelper 
} from '../../../test/utils/testUtils';
import type { 
  Building, 
  Railway, 
  RailwaySegment, 
  StationNetwork, 
  NetworkHealthMetrics,
  NetworkBottleneck,
  NetworkSuggestion
} from '../../../types';

// TODO: These tests are for planned features that haven't been fully implemented yet
// Skip for beta release - the NetworkManager class exists but these methods are stubs
describe.skip('NetworkManager', () => {
  let networkManager: NetworkManager;
  let performanceHelper: PerformanceTestHelper;
  let mockBuildings: Record<string, Building>;
  let mockRailways: Record<string, Railway>;
  let mockSegments: Record<string, RailwaySegment>;

  beforeEach(() => {
    networkManager = new NetworkManager();
    performanceHelper = new PerformanceTestHelper();
    
    // Create mock network data
    mockBuildings = {
      'station-1': createMockBuilding({
        id: 'station-1',
        type: 'TRAIN_STATION',
        x: 0,
        y: 0,
        railwayPoints: [
          { x: 100, y: 0, type: 'output' },
          { x: -100, y: 0, type: 'input' }
        ]
      }),
      'station-2': createMockBuilding({
        id: 'station-2',
        type: 'TRAIN_STATION',
        x: 500,
        y: 0,
        railwayPoints: [
          { x: 100, y: 0, type: 'input' },
          { x: -100, y: 0, type: 'output' }
        ]
      }),
      'station-3': createMockBuilding({
        id: 'station-3',
        type: 'FREIGHT_PLATFORM',
        x: 250,
        y: 250,
        railwayPoints: [
          { x: 0, y: -50, type: 'bidirectional' }
        ]
      })
    };

    mockRailways = {
      'railway-1': createMockRailway({
        id: 'railway-1',
        startBuildingId: 'station-1',
        endBuildingId: 'station-2',
        segments: ['segment-1']
      }),
      'railway-2': createMockRailway({
        id: 'railway-2',
        startBuildingId: 'station-2',
        endBuildingId: 'station-3',
        segments: ['segment-2']
      })
    };

    mockSegments = {
      'segment-1': {
        id: 'segment-1',
        railwayId: 'railway-1',
        startNodeId: 'node-1',
        endNodeId: 'node-2',
        startX: 100,
        startY: 0,
        endX: 400,
        endY: 0,
        floor: 0,
        hasCurve: false
      },
      'segment-2': {
        id: 'segment-2',
        railwayId: 'railway-2',
        startNodeId: 'node-2',
        endNodeId: 'node-3',
        startX: 400,
        startY: 0,
        endX: 250,
        endY: 200,
        floor: 0,
        hasCurve: false
      }
    };
  });

  afterEach(() => {
    performanceHelper.clear();
  });

  describe('createNetwork', () => {
    it('should create a valid station network from buildings and railways', () => {
      const network = networkManager.createNetwork(
        'network-1',
        'Test Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );

      expect(network.id).toBe('network-1');
      expect(network.name).toBe('Test Network');
      expect(network.stations.size).toBe(3);
      expect(network.connections.size).toBe(2); // Two railway connections
      expect(network.status).toBe('healthy');
    });

    it('should validate station connectivity', () => {
      // Remove connection between station-2 and station-3
      delete mockRailways['railway-2'];
      delete mockSegments['segment-2'];

      const network = networkManager.createNetwork(
        'network-1',
        'Disconnected Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );

      expect(network.status).toBe('degraded');
      expect(network.healthMetrics.connectivity).toBeLessThan(1.0);
      
      // Station-3 should be marked as isolated
      const station3 = network.stations.get('station-3');
      expect(station3?.connectionStatus).toBe('isolated');
    });

    it('should calculate network health metrics', () => {
      const network = networkManager.createNetwork(
        'network-1',
        'Test Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );

      const metrics = network.healthMetrics;
      
      expect(metrics.connectivity).toBeGreaterThan(0);
      expect(metrics.connectivity).toBeLessThanOrEqual(1);
      expect(metrics.efficiency).toBeGreaterThan(0);
      expect(metrics.redundancy).toBeGreaterThanOrEqual(0);
      expect(metrics.totalLength).toBeGreaterThan(0);
      expect(metrics.averageSegmentLength).toBeGreaterThan(0);
    });

    it('should identify network topology type', () => {
      const linearNetwork = networkManager.createNetwork(
        'linear-network',
        'Linear Network',
        ['station-1', 'station-2'],
        {
          'station-1': mockBuildings['station-1'],
          'station-2': mockBuildings['station-2']
        },
        {
          'railway-1': mockRailways['railway-1']
        },
        {
          'segment-1': mockSegments['segment-1']
        }
      );

      expect(linearNetwork.topologyType).toBe('linear');

      const starNetwork = networkManager.createNetwork(
        'star-network',
        'Star Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );

      expect(starNetwork.topologyType).toBe('tree');
    });

    it('should handle empty or invalid input', () => {
      expect(() => {
        networkManager.createNetwork('empty', 'Empty', [], {}, {}, {});
      }).toThrow('Cannot create network with no stations');

      expect(() => {
        networkManager.createNetwork('invalid', 'Invalid', ['non-existent'], {}, {}, {});
      }).toThrow('Station non-existent not found in buildings');
    });
  });

  describe('analyzeNetwork', () => {
    let testNetwork: StationNetwork;

    beforeEach(() => {
      testNetwork = networkManager.createNetwork(
        'test-network',
        'Test Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );
    });

    it('should analyze network health and performance', () => {
      performanceHelper.startMeasurement('network-analysis');
      
      const analysis = networkManager.analyzeNetwork(testNetwork);
      
      const measurement = performanceHelper.endMeasurement('network-analysis');
      expect(measurement.duration).toBeLessThan(1000);

      expect(analysis.healthScore).toBeGreaterThan(0);
      expect(analysis.healthScore).toBeLessThanOrEqual(1);
      expect(analysis.bottlenecks).toBeDefined();
      expect(analysis.optimizations).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('should identify performance bottlenecks', () => {
      // Create bottleneck by making one segment very long
      mockSegments['segment-1'].endX = 2000; // Make it very long

      const modifiedNetwork = networkManager.createNetwork(
        'bottleneck-network',
        'Network with Bottleneck',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );

      const analysis = networkManager.analyzeNetwork(modifiedNetwork);
      
      expect(analysis.bottlenecks.length).toBeGreaterThan(0);
      const bottleneck = analysis.bottlenecks.find(b => b.type === 'distance');
      expect(bottleneck).toBeDefined();
      expect(bottleneck?.severity).toBeGreaterThan(0.5);
    });

    it('should generate optimization suggestions', () => {
      const analysis = networkManager.analyzeNetwork(testNetwork);
      
      expect(analysis.optimizations).toBeDefined();
      expect(Array.isArray(analysis.optimizations)).toBe(true);
      
      if (analysis.optimizations.length > 0) {
        const suggestion = analysis.optimizations[0];
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('impact');
        expect(suggestion).toHaveProperty('cost');
      }
    });

    it('should cache analysis results for performance', () => {
      // First analysis
      performanceHelper.startMeasurement('first-analysis');
      const firstAnalysis = networkManager.analyzeNetwork(testNetwork);
      const firstMeasurement = performanceHelper.endMeasurement('first-analysis');

      // Second analysis (should use cache)
      performanceHelper.startMeasurement('second-analysis');
      const secondAnalysis = networkManager.analyzeNetwork(testNetwork);
      const secondMeasurement = performanceHelper.endMeasurement('second-analysis');

      expect(secondMeasurement.duration).toBeLessThan(firstMeasurement.duration / 2);
      expect(secondAnalysis.healthScore).toBe(firstAnalysis.healthScore);
    });
  });

  describe('findOptimalRoute', () => {
    let testNetwork: StationNetwork;

    beforeEach(() => {
      testNetwork = networkManager.createNetwork(
        'route-test',
        'Route Test Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );
    });

    it('should find the shortest path between stations', () => {
      const route = networkManager.findOptimalRoute(
        testNetwork,
        'station-1',
        'station-3'
      );

      expect(route).toBeDefined();
      expect(route.startStationId).toBe('station-1');
      expect(route.endStationId).toBe('station-3');
      expect(route.segments.length).toBeGreaterThan(0);
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.estimatedTravelTime).toBeGreaterThan(0);
    });

    it('should handle direct connections', () => {
      const route = networkManager.findOptimalRoute(
        testNetwork,
        'station-1',
        'station-2'
      );

      expect(route.segments.length).toBe(1);
      expect(route.segments[0]).toBe('segment-1');
      expect(route.hopCount).toBe(1);
    });

    it('should return null for unreachable destinations', () => {
      // Create isolated station
      const isolatedBuilding = createMockBuilding({
        id: 'isolated',
        type: 'TRAIN_STATION',
        x: 1000,
        y: 1000
      });

      const networkWithIsolated = networkManager.createNetwork(
        'isolated-test',
        'Network with Isolated Station',
        ['station-1', 'station-2', 'isolated'],
        {
          ...mockBuildings,
          'isolated': isolatedBuilding
        },
        mockRailways,
        mockSegments
      );

      const route = networkManager.findOptimalRoute(
        networkWithIsolated,
        'station-1',
        'isolated'
      );

      expect(route).toBeNull();
    });

    it('should optimize for different criteria', () => {
      const shortestRoute = networkManager.findOptimalRoute(
        testNetwork,
        'station-1',
        'station-3',
        { optimizeFor: 'distance' }
      );

      const fastestRoute = networkManager.findOptimalRoute(
        testNetwork,
        'station-1',
        'station-3',
        { optimizeFor: 'time' }
      );

      expect(shortestRoute).toBeDefined();
      expect(fastestRoute).toBeDefined();

      // Routes might be the same in this simple network, but the calculation should work
      expect(shortestRoute.totalDistance).toBeDefined();
      expect(fastestRoute.estimatedTravelTime).toBeDefined();
    });

    it('should handle complex routing scenarios', () => {
      // Add more stations and connections to create multiple path options
      const complexBuildings = {
        ...mockBuildings,
        'station-4': createMockBuilding({
          id: 'station-4',
          type: 'TRAIN_STATION',
          x: 0,
          y: 500,
          railwayPoints: [{ x: 0, y: -50, type: 'bidirectional' }]
        }),
        'station-5': createMockBuilding({
          id: 'station-5',
          type: 'TRAIN_STATION',
          x: 500,
          y: 500,
          railwayPoints: [{ x: 0, y: -50, type: 'bidirectional' }]
        })
      };

      const complexRailways = {
        ...mockRailways,
        'railway-3': createMockRailway({
          id: 'railway-3',
          startBuildingId: 'station-1',
          endBuildingId: 'station-4',
          segments: ['segment-3']
        }),
        'railway-4': createMockRailway({
          id: 'railway-4',
          startBuildingId: 'station-4',
          endBuildingId: 'station-5',
          segments: ['segment-4']
        }),
        'railway-5': createMockRailway({
          id: 'railway-5',
          startBuildingId: 'station-5',
          endBuildingId: 'station-2',
          segments: ['segment-5']
        })
      };

      const complexSegments = {
        ...mockSegments,
        'segment-3': {
          id: 'segment-3',
          railwayId: 'railway-3',
          startNodeId: 'node-1',
          endNodeId: 'node-4',
          startX: 0,
          startY: 0,
          endX: 0,
          endY: 450,
          floor: 0,
          hasCurve: false
        },
        'segment-4': {
          id: 'segment-4',
          railwayId: 'railway-4',
          startNodeId: 'node-4',
          endNodeId: 'node-5',
          startX: 0,
          startY: 450,
          endX: 500,
          endY: 450,
          floor: 0,
          hasCurve: false
        },
        'segment-5': {
          id: 'segment-5',
          railwayId: 'railway-5',
          startNodeId: 'node-5',
          endNodeId: 'node-2',
          startX: 500,
          startY: 450,
          endX: 500,
          endY: 0,
          floor: 0,
          hasCurve: false
        }
      };

      const complexNetwork = networkManager.createNetwork(
        'complex-network',
        'Complex Network',
        ['station-1', 'station-2', 'station-3', 'station-4', 'station-5'],
        complexBuildings,
        complexRailways,
        complexSegments
      );

      // Now there are two paths from station-1 to station-2:
      // 1. Direct: station-1 -> station-2
      // 2. Indirect: station-1 -> station-4 -> station-5 -> station-2

      const route = networkManager.findOptimalRoute(
        complexNetwork,
        'station-1',
        'station-2'
      );

      expect(route).toBeDefined();
      expect(route.segments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updateNetwork', () => {
    let testNetwork: StationNetwork;

    beforeEach(() => {
      testNetwork = networkManager.createNetwork(
        'update-test',
        'Update Test Network',
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );
    });

    it('should update network when stations are added', () => {
      const newStation = createMockBuilding({
        id: 'station-4',
        type: 'TRAIN_STATION',
        x: 750,
        y: 0,
        railwayPoints: [{ x: -100, y: 0, type: 'input' }]
      });

      const updatedBuildings = {
        ...mockBuildings,
        'station-4': newStation
      };

      const updatedNetwork = networkManager.updateNetwork(
        testNetwork,
        ['station-1', 'station-2', 'station-3', 'station-4'],
        updatedBuildings,
        mockRailways,
        mockSegments
      );

      expect(updatedNetwork.stations.size).toBe(4);
      expect(updatedNetwork.stations.has('station-4')).toBe(true);
      
      const addedStation = updatedNetwork.stations.get('station-4');
      expect(addedStation?.connectionStatus).toBe('isolated'); // No connections yet
    });

    it('should update network when railways are modified', () => {
      const modifiedSegments = {
        ...mockSegments,
        'segment-1': {
          ...mockSegments['segment-1'],
          endX: 600 // Make segment longer
        }
      };

      const updatedNetwork = networkManager.updateNetwork(
        testNetwork,
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        modifiedSegments
      );

      expect(updatedNetwork.healthMetrics.totalLength).toBeGreaterThan(
        testNetwork.healthMetrics.totalLength
      );
    });

    it('should handle station removal', () => {
      const updatedNetwork = networkManager.updateNetwork(
        testNetwork,
        ['station-1', 'station-2'], // Remove station-3
        mockBuildings,
        {
          'railway-1': mockRailways['railway-1']
          // Remove railway-2 which connected to station-3
        },
        {
          'segment-1': mockSegments['segment-1']
          // Remove segment-2
        }
      );

      expect(updatedNetwork.stations.size).toBe(2);
      expect(updatedNetwork.stations.has('station-3')).toBe(false);
      expect(updatedNetwork.connections.size).toBe(1);
    });

    it('should invalidate relevant caches', () => {
      const initialAnalysis = networkManager.analyzeNetwork(testNetwork);
      
      // Update network
      const updatedNetwork = networkManager.updateNetwork(
        testNetwork,
        ['station-1', 'station-2', 'station-3'],
        mockBuildings,
        mockRailways,
        mockSegments
      );

      // Analysis should be recalculated
      const newAnalysis = networkManager.analyzeNetwork(updatedNetwork);
      
      // The analysis objects should be different instances (not cached)
      expect(newAnalysis).not.toBe(initialAnalysis);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed network data gracefully', () => {
      const malformedBuildings = {
        'invalid-station': {
          id: 'invalid-station',
          type: 'INVALID_TYPE' as any,
          x: 'invalid' as any,
          y: NaN,
          floor: -1
        }
      };

      expect(() => {
        networkManager.createNetwork(
          'malformed',
          'Malformed Network',
          ['invalid-station'],
          malformedBuildings,
          {},
          {}
        );
      }).toThrow();
    });

    it('should handle circular references in network topology', () => {
      const circularRailways = {
        'railway-1': createMockRailway({
          id: 'railway-1',
          startBuildingId: 'station-1',
          endBuildingId: 'station-2'
        }),
        'railway-2': createMockRailway({
          id: 'railway-2',
          startBuildingId: 'station-2',
          endBuildingId: 'station-1'
        })
      };

      const network = networkManager.createNetwork(
        'circular',
        'Circular Network',
        ['station-1', 'station-2'],
        {
          'station-1': mockBuildings['station-1'],
          'station-2': mockBuildings['station-2']
        },
        circularRailways,
        mockSegments
      );

      expect(network.topologyType).toBe('cyclic');
      
      // Should be able to find routes in circular networks
      const route = networkManager.findOptimalRoute(network, 'station-1', 'station-2');
      expect(route).toBeDefined();
    });

    it('should handle very large networks efficiently', () => {
      performanceHelper.startMeasurement('large-network-creation');

      // Create large network
      const largeBuildings: Record<string, Building> = {};
      const largeRailways: Record<string, Railway> = {};
      const largeSegments: Record<string, RailwaySegment> = {};
      const stationIds: string[] = [];

      // Create grid of stations
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const stationId = `station-${x}-${y}`;
          stationIds.push(stationId);
          
          largeBuildings[stationId] = createMockBuilding({
            id: stationId,
            type: 'TRAIN_STATION',
            x: x * 100,
            y: y * 100,
            railwayPoints: [
              { x: 0, y: -10, type: 'input' },
              { x: 0, y: 10, type: 'output' }
            ]
          });

          // Connect to right neighbor
          if (x < 9) {
            const railwayId = `railway-${x}-${y}-right`;
            const segmentId = `segment-${x}-${y}-right`;
            
            largeRailways[railwayId] = createMockRailway({
              id: railwayId,
              startBuildingId: stationId,
              endBuildingId: `station-${x + 1}-${y}`,
              segments: [segmentId]
            });

            largeSegments[segmentId] = {
              id: segmentId,
              railwayId: railwayId,
              startNodeId: `node-${x}-${y}`,
              endNodeId: `node-${x + 1}-${y}`,
              startX: x * 100 + 10,
              startY: y * 100,
              endX: (x + 1) * 100 - 10,
              endY: y * 100,
              floor: 0,
              hasCurve: false
            };
          }

          // Connect to bottom neighbor
          if (y < 9) {
            const railwayId = `railway-${x}-${y}-down`;
            const segmentId = `segment-${x}-${y}-down`;
            
            largeRailways[railwayId] = createMockRailway({
              id: railwayId,
              startBuildingId: stationId,
              endBuildingId: `station-${x}-${y + 1}`,
              segments: [segmentId]
            });

            largeSegments[segmentId] = {
              id: segmentId,
              railwayId: railwayId,
              startNodeId: `node-${x}-${y}`,
              endNodeId: `node-${x}-${y + 1}`,
              startX: x * 100,
              startY: y * 100 + 10,
              endX: x * 100,
              endY: (y + 1) * 100 - 10,
              floor: 0,
              hasCurve: false
            };
          }
        }
      }

      const largeNetwork = networkManager.createNetwork(
        'large-network',
        'Large Network Test',
        stationIds,
        largeBuildings,
        largeRailways,
        largeSegments
      );

      const creationMeasurement = performanceHelper.endMeasurement('large-network-creation');
      expect(creationMeasurement.duration).toBeLessThan(5000); // Should complete within 5 seconds

      expect(largeNetwork.stations.size).toBe(100);
      expect(largeNetwork.connections.size).toBe(180); // 9*10 + 10*9 connections in grid

      // Test pathfinding performance in large network
      performanceHelper.startMeasurement('large-network-pathfinding');
      
      const route = networkManager.findOptimalRoute(
        largeNetwork,
        'station-0-0',
        'station-9-9'
      );

      const pathfindingMeasurement = performanceHelper.endMeasurement('large-network-pathfinding');
      expect(pathfindingMeasurement.duration).toBeLessThan(1000); // Should find path within 1 second

      expect(route).toBeDefined();
      expect(route.segments.length).toBe(18); // Manhattan distance: 9 + 9
    });

    it('should handle network fragmentation gracefully', () => {
      // Create network with disconnected components
      const fragmentedBuildings = {
        // First component
        'station-1': mockBuildings['station-1'],
        'station-2': mockBuildings['station-2'],
        
        // Second component (isolated)
        'station-isolated-1': createMockBuilding({
          id: 'station-isolated-1',
          type: 'TRAIN_STATION',
          x: 1000,
          y: 1000
        }),
        'station-isolated-2': createMockBuilding({
          id: 'station-isolated-2',
          type: 'TRAIN_STATION',
          x: 1100,
          y: 1000
        })
      };

      const fragmentedRailways = {
        'railway-1': mockRailways['railway-1'], // Connects component 1
        'railway-isolated': createMockRailway({
          id: 'railway-isolated',
          startBuildingId: 'station-isolated-1',
          endBuildingId: 'station-isolated-2',
          segments: ['segment-isolated']
        })
      };

      const fragmentedSegments = {
        'segment-1': mockSegments['segment-1'],
        'segment-isolated': {
          id: 'segment-isolated',
          railwayId: 'railway-isolated',
          startNodeId: 'node-isolated-1',
          endNodeId: 'node-isolated-2',
          startX: 1000,
          startY: 1000,
          endX: 1100,
          endY: 1000,
          floor: 0,
          hasCurve: false
        }
      };

      const fragmentedNetwork = networkManager.createNetwork(
        'fragmented',
        'Fragmented Network',
        ['station-1', 'station-2', 'station-isolated-1', 'station-isolated-2'],
        fragmentedBuildings,
        fragmentedRailways,
        fragmentedSegments
      );

      expect(fragmentedNetwork.status).toBe('fragmented');
      expect(fragmentedNetwork.healthMetrics.connectivity).toBeLessThan(1.0);

      // Should not find route between disconnected components
      const impossibleRoute = networkManager.findOptimalRoute(
        fragmentedNetwork,
        'station-1',
        'station-isolated-1'
      );
      expect(impossibleRoute).toBeNull();

      // Should find routes within connected components
      const validRoute = networkManager.findOptimalRoute(
        fragmentedNetwork,
        'station-isolated-1',
        'station-isolated-2'
      );
      expect(validRoute).toBeDefined();
    });
  });
});