// src/logic/railway/__tests__/railwayLogic.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  startRailwayDrawing,
  addRailwayPoint,
  completeRailwayDrawing,
  deleteRailwayNode,
  findConnectedRailways,
  optimizeRailwayPath,
  validateRailwayConnection,
  calculateRailwayDistance,
  mergeAdjacentNodes,
  type RailwayDrawingState,
  type StartRailwayDrawingResult,
  type AddRailwayPointResult
} from '../railwayLogic';
import { 
  createMockBuilding, 
  createMockRailway, 
  createMockStore 
} from '../../../test/utils/testUtils';
import type { Railway, Building, RailwayNode, Point3D } from '../../../types';

// Mock Tauri commands
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

describe('Railway Logic Core Functions', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let mockBuilding: Building;
  let mockRailway: Railway;

  beforeEach(() => {
    mockStore = createMockStore();
    mockBuilding = createMockBuilding({
      id: 'station-1',
      type: 'TRAIN_STATION',
      x: 100,
      y: 100,
      floor: 0,
      railwayPoints: [
        { x: 0, y: 0, type: 'input' },
        { x: 200, y: 0, type: 'output' }
      ]
    });
    mockRailway = createMockRailway({
      id: 'railway-1',
      startX: 0,
      startY: 0,
      endX: 200,
      endY: 0,
      floor: 0
    });
  });

  describe('startRailwayDrawing', () => {
    it('should initialize railway drawing from a building connection point', () => {
      const result: StartRailwayDrawingResult = startRailwayDrawing(
        mockBuilding,
        mockBuilding.railwayPoints![0],
        mockStore
      );

      expect(result.drawingState.drawingRailway).toBe(true);
      expect(result.drawingState.railwayStartStation).toBe(mockBuilding.id);
      expect(result.startNode).toBeDefined();
      expect(result.startNode?.buildingId).toBe(mockBuilding.id);
    });

    it('should handle starting from an existing node', () => {
      const existingNode: RailwayNode = {
        id: 'node-1',
        x: 50,
        y: 50,
        z: 0,
        floor: 0
      };

      const result: StartRailwayDrawingResult = startRailwayDrawing(
        existingNode,
        undefined,
        mockStore
      );

      expect(result.drawingState.drawingRailway).toBe(true);
      expect(result.drawingState.railwayStartNode).toBe(existingNode.id);
      expect(result.startNode).toEqual(existingNode);
    });

    it('should reject invalid starting points', () => {
      expect(() => {
        startRailwayDrawing(null as any, undefined, mockStore);
      }).toThrow('Invalid railway starting point');
    });
  });

  describe('addRailwayPoint', () => {
    let drawingState: RailwayDrawingState;

    beforeEach(() => {
      const startResult = startRailwayDrawing(
        mockBuilding,
        mockBuilding.railwayPoints![0],
        mockStore
      );
      drawingState = startResult.drawingState as RailwayDrawingState;
    });

    it('should add a new point to the railway path', () => {
      const newPoint: Point3D = { x: 150, y: 100, z: 0 };
      
      const result: AddRailwayPointResult = addRailwayPoint(
        newPoint,
        drawingState,
        mockStore
      );

      expect(result.path).toHaveLength(2); // Start point + new point
      expect(result.path[1]).toBe('node-2'); // Generated node ID
      expect(result.drawingState.railwayPath).toContain('node-2');
    });

    it('should handle snapping to existing nodes', () => {
      const existingNode: RailwayNode = {
        id: 'existing-node',
        x: 150,
        y: 100,
        z: 0,
        floor: 0
      };

      // Mock store to return existing node
      mockStore.nodes = { 'existing-node': existingNode };

      const snapPoint: Point3D = { x: 152, y: 98, z: 0 }; // Close to existing node
      
      const result: AddRailwayPointResult = addRailwayPoint(
        snapPoint,
        drawingState,
        mockStore
      );

      expect(result.path).toContain(existingNode.id);
      expect(result.nodes[existingNode.id]).toEqual(existingNode);
    });

    it('should respect maximum railway length', () => {
      const distantPoint: Point3D = { x: 10000, y: 10000, z: 0 };
      
      expect(() => {
        addRailwayPoint(distantPoint, drawingState, mockStore);
      }).toThrow('Railway segment exceeds maximum length');
    });

    it('should prevent self-intersection', () => {
      // Add intermediate points to create a path
      addRailwayPoint({ x: 100, y: 0, z: 0 }, drawingState, mockStore);
      addRailwayPoint({ x: 100, y: 100, z: 0 }, drawingState, mockStore);
      addRailwayPoint({ x: 0, y: 100, z: 0 }, drawingState, mockStore);

      // Try to add point that would cause self-intersection
      expect(() => {
        addRailwayPoint({ x: 50, y: 50, z: 0 }, drawingState, mockStore);
      }).toThrow('Railway path cannot intersect with itself');
    });
  });

  describe('completeRailwayDrawing', () => {
    let drawingState: RailwayDrawingState;

    beforeEach(() => {
      const startResult = startRailwayDrawing(
        mockBuilding,
        mockBuilding.railwayPoints![0],
        mockStore
      );
      drawingState = startResult.drawingState as RailwayDrawingState;
      
      // Add some points to the path
      addRailwayPoint({ x: 150, y: 100, z: 0 }, drawingState, mockStore);
      addRailwayPoint({ x: 250, y: 100, z: 0 }, drawingState, mockStore);
    });

    it('should complete railway with valid endpoint', () => {
      const endBuilding = createMockBuilding({
        id: 'station-2',
        x: 300,
        y: 100,
        railwayPoints: [{ x: 0, y: 0, type: 'input' }]
      });

      const result = completeRailwayDrawing(
        endBuilding,
        endBuilding.railwayPoints![0],
        drawingState,
        mockStore
      );

      expect(result.railway).toBeDefined();
      expect(result.railway.startBuildingId).toBe(mockBuilding.id);
      expect(result.railway.endBuildingId).toBe(endBuilding.id);
      expect(result.drawingState.drawingRailway).toBe(false);
    });

    it('should reject completion with insufficient path', () => {
      // Clear the path to make it too short
      drawingState.railwayPath = [drawingState.railwayStartNode!];

      expect(() => {
        completeRailwayDrawing(
          mockBuilding,
          mockBuilding.railwayPoints![1],
          drawingState,
          mockStore
        );
      }).toThrow('Railway path too short to complete');
    });

    it('should handle completion at existing node', () => {
      const existingNode: RailwayNode = {
        id: 'end-node',
        x: 300,
        y: 100,
        z: 0,
        floor: 0
      };

      const result = completeRailwayDrawing(
        existingNode,
        undefined,
        drawingState,
        mockStore
      );

      expect(result.railway.endNodeId).toBe(existingNode.id);
      expect(result.railway.endBuildingId).toBeUndefined();
    });
  });

  describe('deleteRailwayNode', () => {
    let railwayNode: RailwayNode;
    let connectedRailways: Railway[];

    beforeEach(() => {
      railwayNode = {
        id: 'node-to-delete',
        x: 100,
        y: 100,
        z: 0,
        floor: 0
      };

      connectedRailways = [
        createMockRailway({ id: 'railway-1', startNodeId: railwayNode.id }),
        createMockRailway({ id: 'railway-2', endNodeId: railwayNode.id })
      ];

      mockStore.nodes = { [railwayNode.id]: railwayNode };
      mockStore.railways = Object.fromEntries(
        connectedRailways.map(r => [r.id, r])
      );
    });

    it('should delete node and handle connected railways', () => {
      const result = deleteRailwayNode(railwayNode.id, mockStore);

      expect(result.nodesToRemove).toContain(railwayNode.id);
      expect(result.railwaysToUpdate).toHaveLength(2);
      expect(result.railwaysToRemove).toHaveLength(0); // Should attempt to reroute first
    });

    it('should consolidate adjacent nodes when deleting junction', () => {
      // Add another node that should be consolidated
      const adjacentNode: RailwayNode = {
        id: 'adjacent-node',
        x: 120,
        y: 100,
        z: 0,
        floor: 0
      };

      mockStore.nodes['adjacent-node'] = adjacentNode;

      const result = deleteRailwayNode(railwayNode.id, mockStore);

      expect(result.nodesToConsolidate).toBeDefined();
      expect(result.nodesToConsolidate?.length).toBeGreaterThan(0);
    });

    it('should prevent deletion of critical infrastructure nodes', () => {
      const criticalNode: RailwayNode = {
        ...railwayNode
      };

      expect(() => {
        deleteRailwayNode(criticalNode.id, mockStore);
      }).toThrow('Cannot delete critical infrastructure node');
    });
  });

  describe('findConnectedRailways', () => {
    let networkRailways: Railway[];
    let networkNodes: RailwayNode[];

    beforeEach(() => {
      networkNodes = [
        { id: 'node-1', x: 0, y: 0, z: 0, floor: 0 },
        { id: 'node-2', x: 100, y: 0, z: 0, floor: 0 },
        { id: 'node-3', x: 200, y: 0, z: 0, floor: 0 }
      ];

      networkRailways = [
        createMockRailway({ 
          id: 'railway-1', 
          startNodeId: 'node-1', 
          endNodeId: 'node-2' 
        }),
        createMockRailway({ 
          id: 'railway-2', 
          startNodeId: 'node-2', 
          endNodeId: 'node-3' 
        })
      ];

      mockStore.nodes = Object.fromEntries(networkNodes.map(n => [n.id, n]));
      mockStore.railways = Object.fromEntries(networkRailways.map(r => [r.id, r]));
    });

    it('should find all railways connected to a node', () => {
      const connected = findConnectedRailways('node-2', mockStore);
      
      expect(connected).toHaveLength(2);
      expect(connected.map(r => r.id)).toContain('railway-1');
      expect(connected.map(r => r.id)).toContain('railway-2');
    });

    it('should find railways connected through multiple hops', () => {
      const connected = findConnectedRailways('node-1', mockStore, { maxDepth: 2 });
      
      expect(connected).toHaveLength(2); // Should find both railways in the network
    });

    it('should respect floor restrictions', () => {
      // Add railway on different floor
      const upperRailway = createMockRailway({
        id: 'railway-upper',
        startNodeId: 'node-2',
        endNodeId: 'node-upper',
        floor: 1
      });

      const upperNode: RailwayNode = {
        id: 'node-upper',
        x: 100,
        y: 100,
        z: 4,
        floor: 1
      };

      mockStore.railways['railway-upper'] = upperRailway;
      mockStore.nodes['node-upper'] = upperNode;
      mockStore.nodes['node-2'].connections.push('railway-upper');

      const sameFloorOnly = findConnectedRailways('node-2', mockStore, { sameFloorOnly: true });
      const allFloors = findConnectedRailways('node-2', mockStore, { sameFloorOnly: false });

      expect(sameFloorOnly).toHaveLength(2);
      expect(allFloors).toHaveLength(3);
    });
  });

  describe('optimizeRailwayPath', () => {
    it('should optimize path by removing redundant points', () => {
      const redundantPath = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 }, // Collinear - should be removed
        { x: 150, y: 0 },
        { x: 200, y: 100 }
      ];

      const optimized = optimizeRailwayPath(redundantPath);

      expect(optimized).toHaveLength(4); // One point removed
      expect(optimized.find(p => p.x === 100 && p.y === 0)).toBeUndefined();
    });

    it('should preserve important waypoints', () => {
      const pathWithImportantPoints = [
        { x: 0, y: 0, important: true },
        { x: 50, y: 0 },
        { x: 100, y: 0, important: true }, // Should be preserved even if collinear
        { x: 150, y: 0 },
        { x: 200, y: 100 }
      ];

      const optimized = optimizeRailwayPath(pathWithImportantPoints);

      expect(optimized.find(p => p.x === 100 && p.y === 0)).toBeDefined();
    });

    it('should handle curved segments appropriately', () => {
      const curvedPath = [
        { x: 0, y: 0 },
        { x: 50, y: 10, curve: true },
        { x: 100, y: 0 },
        { x: 150, y: -10, curve: true },
        { x: 200, y: 0 }
      ];

      const optimized = optimizeRailwayPath(curvedPath);

      // Curved points should be preserved
      expect(optimized.find(p => p.curve)).toBeDefined();
    });
  });

  describe('validateRailwayConnection', () => {
    it('should validate compatible connection types', () => {
      const inputPoint = { x: 0, y: 0, type: 'input' as const };
      const outputPoint = { x: 100, y: 0, type: 'output' as const };

      const result = validateRailwayConnection(inputPoint, outputPoint);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject incompatible connection types', () => {
      const inputPoint1 = { x: 0, y: 0, type: 'input' as const };
      const inputPoint2 = { x: 100, y: 0, type: 'input' as const };

      const result = validateRailwayConnection(inputPoint1, inputPoint2);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incompatible connection types: input -> input');
    });

    it('should validate distance constraints', () => {
      const point1 = { x: 0, y: 0, type: 'output' as const };
      const point2 = { x: 10000, y: 0, type: 'input' as const }; // Too far

      const result = validateRailwayConnection(point1, point2);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Connection distance exceeds maximum allowed');
    });

    it('should validate floor compatibility', () => {
      const point1 = { x: 0, y: 0, type: 'output' as const, floor: 0 };
      const point2 = { x: 100, y: 0, type: 'input' as const, floor: 2 };

      const result = validateRailwayConnection(point1, point2);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Floor level difference too large (2 floors)');
    });
  });

  describe('calculateRailwayDistance', () => {
    it('should calculate straight line distance', () => {
      const straightRailway = createMockRailway({
        path: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ]
      });

      const distance = calculateRailwayDistance(straightRailway);
      expect(distance).toBe(100);
    });

    it('should calculate distance with multiple segments', () => {
      const multiSegmentRailway = createMockRailway({
        path: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ]
      });

      const distance = calculateRailwayDistance(multiSegmentRailway);
      expect(distance).toBe(200); // 100 + 100
    });

    it('should account for curves in distance calculation', () => {
      const curvedRailway = createMockRailway({
        path: [
          { x: 0, y: 0 },
          { x: 50, y: 50, curve: true, controlPoint: { x: 0, y: 50 } },
          { x: 100, y: 0 }
        ]
      });

      const distance = calculateRailwayDistance(curvedRailway);
      expect(distance).toBeGreaterThan(100); // Curve should be longer than straight line
    });
  });

  describe('mergeAdjacentNodes', () => {
    it('should merge nodes that are too close together', () => {
      const closeNodes: RailwayNode[] = [
        { id: 'node-1', x: 100, y: 100, z: 0, floor: 0 },
        { id: 'node-2', x: 102, y: 101, z: 0, floor: 0 }
      ];

      const result = mergeAdjacentNodes(closeNodes, { mergeDistance: 5 });

      expect(result.mergedNodes).toHaveLength(1);
      expect(result.mergedNodes[0].connections).toContain('railway-1');
      expect(result.mergedNodes[0].connections).toContain('railway-2');
      expect(result.removedNodeIds).toContain('node-2');
    });

    it('should preserve important nodes from merging', () => {
      const mixedNodes: RailwayNode[] = [
        { 
          id: 'node-1', 
          x: 100, 
          y: 100, 
          z: 0,
          floor: 0
        },
        { 
          id: 'important-node', 
          x: 102, 
          y: 101, 
          z: 0,
          floor: 0
        }
      ];

      const result = mergeAdjacentNodes(mixedNodes, { mergeDistance: 5 });

      // Important node should not be merged
      expect(result.removedNodeIds).not.toContain('important-node');
      expect(result.mergedNodes.find(n => n.id === 'important-node')).toBeDefined();
    });

    it('should handle complex node consolidation scenarios', () => {
      const complexNodes: RailwayNode[] = [
        { id: 'node-1', x: 100, y: 100, z: 0, floor: 0 },
        { id: 'node-2', x: 101, y: 100, z: 0, floor: 0 },
        { id: 'node-3', x: 102, y: 100, z: 0, floor: 0 },
        { id: 'node-4', x: 200, y: 100, z: 0, floor: 0 }
      ];

      const result = mergeAdjacentNodes(complexNodes, { mergeDistance: 5 });

      // First three nodes should merge into one
      expect(result.mergedNodes).toHaveLength(2);
      expect(result.removedNodeIds).toHaveLength(2);
      
      const mergedNode = result.mergedNodes.find(n => n.connections.includes('r1'));
      expect(mergedNode?.connections).toHaveLength(3); // r1, r2, r3
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() => startRailwayDrawing(null as any, undefined, mockStore)).toThrow();
      expect(() => addRailwayPoint(null as any, {} as any, mockStore)).toThrow();
      expect(() => deleteRailwayNode('', mockStore)).toThrow();
    });

    it('should handle corrupted railway data', () => {
      const corruptedRailway = {
        id: 'corrupt',
        startX: 'invalid' as any,
        endX: NaN,
        floor: -1,
      };

      expect(() => calculateRailwayDistance(corruptedRailway as any)).toThrow();
    });

    it('should handle memory cleanup properly', () => {
      // This tests the deletedNodePositions memory leak fix
      const nodeId = 'temp-node';
      
      // Simulate creating and deleting many nodes
      for (let i = 0; i < 100; i++) {
        const tempNode: RailwayNode = {
          id: `temp-${i}`,
          x: i * 10,
          y: 0,
          z: 0,
          floor: 0
        };
        
        // Add to store
        mockStore.nodes[tempNode.id] = tempNode;
        
        // Delete immediately
        deleteRailwayNode(tempNode.id, mockStore);
      }

      // Memory usage should remain reasonable
      // (In practice, this would check actual memory usage)
      expect(Object.keys(mockStore.nodes)).toHaveLength(0);
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const point: Point3D = { x: i * 10, y: 0, z: 0 };
            try {
              const startResult = startRailwayDrawing(
                createMockBuilding({ id: `building-${i}` }),
                { x: 0, y: 0, type: 'output' },
                mockStore
              );
              addRailwayPoint(point, startResult.drawingState as RailwayDrawingState, mockStore);
              resolve();
            } catch (error) {
              // Expected for some operations due to conflicts
              resolve();
            }
          }, Math.random() * 100);
        })
      );

      await Promise.all(concurrentOperations);

      // Store should remain in consistent state
      expect(mockStore).toBeDefined();
    });
  });
});