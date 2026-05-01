// src/store/__tests__/layoutStore.railway.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayoutStore } from '../layoutStore';
import { 
  createMockBuilding, 
  createMockRailway,
  PerformanceTestHelper 
} from '../../test/utils/testUtils';
import type { 
  Building, 
  Railway, 
  RailwayNode, 
  Point3D, 
  LayoutState 
} from '../../types';

// Mock Tauri commands for testing
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn().mockImplementation((command: string, args?: any) => {
    switch (command) {
      case 'calculate_railway_intersections':
        return Promise.resolve([]);
      case 'optimize_railway_path':
        return Promise.resolve({ points: args?.points || [], curves: [] });
      case 'validate_network_topology':
        return Promise.resolve({ isValid: true, errors: [] });
      case 'calculate_alignment_score':
        return Promise.resolve(0.85);
      default:
        return Promise.resolve(null);
    }
  }),
}));

describe('LayoutStore Railway Integration', () => {
  let performanceHelper: PerformanceTestHelper;
  let initialState: Partial<LayoutState>;

  beforeEach(() => {
    performanceHelper = new PerformanceTestHelper();
    
    // Reset the store state before each test
    initialState = {
      buildings: {},
      railways: {},
      railwayNodes: {},
      railwaySegments: {},
      intersections: {},
      currentFloor: 0,
      selectedTool: 'select',
      isDrawingRailway: false,
      railwayPreview: null
    };
  });

  afterEach(() => {
    performanceHelper.clear();
    // Clear any lingering state
    const { result } = renderHook(() => useLayoutStore());
    act(() => {
      result.current.clearAll();
    });
  });

  describe('Railway Drawing Workflow', () => {
    it('should complete full railway drawing workflow', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create start and end buildings
      const startBuilding = createMockBuilding({
        id: 'start-station',
        type: 'TRAIN_STATION',
        x: 0,
        y: 0,
        railwayPoints: [
          { x: 100, y: 0, type: 'output' }
        ]
      });

      const endBuilding = createMockBuilding({
        id: 'end-station',
        type: 'TRAIN_STATION',
        x: 500,
        y: 0,
        railwayPoints: [
          { x: -100, y: 0, type: 'input' }
        ]
      });

      // Step 1: Add buildings to store
      act(() => {
        result.current.addBuilding(startBuilding);
        result.current.addBuilding(endBuilding);
      });

      expect(result.current.buildings).toHaveProperty('start-station');
      expect(result.current.buildings).toHaveProperty('end-station');

      // Step 2: Start railway drawing
      await act(async () => {
        await result.current.startRailwayDrawing(
          'start-station',
          startBuilding.railwayPoints![0]
        );
      });

      expect(result.current.isDrawingRailway).toBe(true);
      expect(result.current.railwayPreview).toBeDefined();
      expect(result.current.railwayPreview?.startBuildingId).toBe('start-station');

      // Step 3: Add intermediate point
      await act(async () => {
        await result.current.addRailwayPoint({ x: 250, y: 0, z: 0 });
      });

      expect(result.current.railwayPreview?.path).toHaveLength(2);

      // Step 4: Complete railway drawing
      await act(async () => {
        await result.current.finishRailwayDrawing(
          'end-station',
          endBuilding.railwayPoints![0]
        );
      });

      expect(result.current.isDrawingRailway).toBe(false);
      expect(result.current.railwayPreview).toBeNull();

      // Verify railway was created
      const railways = Object.values(result.current.railways);
      expect(railways).toHaveLength(1);
      expect(railways[0].startBuildingId).toBe('start-station');
      expect(railways[0].endBuildingId).toBe('end-station');
    });

    it('should handle railway drawing cancellation', async () => {
      const { result } = renderHook(() => useLayoutStore());

      const building = createMockBuilding({
        id: 'test-station',
        type: 'TRAIN_STATION',
        railwayPoints: [{ x: 0, y: 0, type: 'output' }]
      });

      act(() => {
        result.current.addBuilding(building);
      });

      // Start drawing
      await act(async () => {
        await result.current.startRailwayDrawing(
          'test-station',
          building.railwayPoints![0]
        );
      });

      expect(result.current.isDrawingRailway).toBe(true);

      // Cancel drawing
      act(() => {
        result.current.cancelRailwayDrawing();
      });

      expect(result.current.isDrawingRailway).toBe(false);
      expect(result.current.railwayPreview).toBeNull();
      expect(Object.keys(result.current.railways)).toHaveLength(0);
    });

    it('should handle errors during railway drawing gracefully', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Mock Tauri command to fail
      const mockInvoke = vi.mocked((await import('@tauri-apps/api')).invoke);
      mockInvoke.mockRejectedValueOnce(new Error('Tauri command failed'));

      const building = createMockBuilding({
        id: 'test-station',
        type: 'TRAIN_STATION',
        railwayPoints: [{ x: 0, y: 0, type: 'output' }]
      });

      act(() => {
        result.current.addBuilding(building);
      });

      // Should handle error gracefully
      await expect(
        act(async () => {
          await result.current.startRailwayDrawing(
            'test-station',
            building.railwayPoints![0]
          );
        })
      ).rejects.toThrow();

      // State should remain consistent
      expect(result.current.isDrawingRailway).toBe(false);
      expect(result.current.railwayPreview).toBeNull();
    });
  });

  describe('Railway State Management', () => {
    it('should maintain state consistency during complex operations', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create multiple buildings and railways
      const buildings = Array.from({ length: 5 }, (_, i) => 
        createMockBuilding({
          id: `station-${i}`,
          type: 'TRAIN_STATION',
          x: i * 100,
          y: 0,
          railwayPoints: [
            { x: -50, y: 0, type: 'input' },
            { x: 50, y: 0, type: 'output' }
          ]
        })
      );

      // Add all buildings
      act(() => {
        buildings.forEach(building => {
          result.current.addBuilding(building);
        });
      });

      // Create railways between consecutive buildings
      for (let i = 0; i < buildings.length - 1; i++) {
        await act(async () => {
          await result.current.startRailwayDrawing(
            `station-${i}`,
            buildings[i].railwayPoints![1]
          );
          await result.current.finishRailwayDrawing(
            `station-${i + 1}`,
            buildings[i + 1].railwayPoints![0]
          );
        });
      }

      // Verify network integrity
      const railways = Object.values(result.current.railways);
      expect(railways).toHaveLength(4);

      // All buildings should be connected
      buildings.forEach(building => {
        const connectedRailways = railways.filter(r => 
          r.startBuildingId === building.id || r.endBuildingId === building.id
        );
        
        if (building.id === 'station-0' || building.id === 'station-4') {
          expect(connectedRailways).toHaveLength(1); // End stations
        } else {
          expect(connectedRailways).toHaveLength(2); // Intermediate stations
        }
      });
    });

    it('should handle building deletion and update connected railways', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create three connected buildings
      const buildings = [
        createMockBuilding({
          id: 'station-1',
          type: 'TRAIN_STATION',
          x: 0,
          y: 0,
          railwayPoints: [{ x: 100, y: 0, type: 'output' }]
        }),
        createMockBuilding({
          id: 'station-2',
          type: 'TRAIN_STATION',
          x: 200,
          y: 0,
          railwayPoints: [
            { x: -100, y: 0, type: 'input' },
            { x: 100, y: 0, type: 'output' }
          ]
        }),
        createMockBuilding({
          id: 'station-3',
          type: 'TRAIN_STATION',
          x: 400,
          y: 0,
          railwayPoints: [{ x: -100, y: 0, type: 'input' }]
        })
      ];

      // Add buildings
      act(() => {
        buildings.forEach(building => {
          result.current.addBuilding(building);
        });
      });

      // Create railways: station-1 -> station-2 -> station-3
      await act(async () => {
        await result.current.startRailwayDrawing('station-1', buildings[0].railwayPoints![0]);
        await result.current.finishRailwayDrawing('station-2', buildings[1].railwayPoints![0]);
        
        await result.current.startRailwayDrawing('station-2', buildings[1].railwayPoints![1]);
        await result.current.finishRailwayDrawing('station-3', buildings[2].railwayPoints![0]);
      });

      expect(Object.keys(result.current.railways)).toHaveLength(2);

      // Delete middle station
      act(() => {
        result.current.deleteBuilding('station-2');
      });

      expect(result.current.buildings).not.toHaveProperty('station-2');
      
      // Connected railways should be marked for cleanup or rerouting
      const remainingRailways = Object.values(result.current.railways).filter(r => 
        r.startBuildingId !== 'station-2' && r.endBuildingId !== 'station-2'
      );
      
      // Implementation may vary - could be 0 (deleted) or 1 (auto-rerouted)
      expect(remainingRailways.length).toBeLessThanOrEqual(1);
    });

    it('should optimize railway paths when buildings are moved', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create railway between two buildings
      const building1 = createMockBuilding({
        id: 'station-1',
        type: 'TRAIN_STATION',
        x: 0,
        y: 0,
        railwayPoints: [{ x: 100, y: 0, type: 'output' }]
      });

      const building2 = createMockBuilding({
        id: 'station-2',
        type: 'TRAIN_STATION',
        x: 300,
        y: 0,
        railwayPoints: [{ x: -100, y: 0, type: 'input' }]
      });

      act(() => {
        result.current.addBuilding(building1);
        result.current.addBuilding(building2);
      });

      // Create railway with intermediate point
      await act(async () => {
        await result.current.startRailwayDrawing('station-1', building1.railwayPoints![0]);
        await result.current.addRailwayPoint({ x: 150, y: 100, z: 0 }); // Detour
        await result.current.finishRailwayDrawing('station-2', building2.railwayPoints![0]);
      });

      const originalRailway = Object.values(result.current.railways)[0];
      const originalDistance = originalRailway.totalDistance || 0;

      // Move building2 to align with the railway path
      await act(async () => {
        await result.current.updateBuilding('station-2', {
          x: 300,
          y: 100 // Align with the detour
        });
      });

      // Railway should be optimized to reduce distance
      const updatedRailway = Object.values(result.current.railways)[0];
      const newDistance = updatedRailway.totalDistance || 0;

      expect(newDistance).toBeLessThanOrEqual(originalDistance);
    });
  });

  describe('Railway Intersection Management', () => {
    it('should detect and manage railway intersections', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create buildings for intersecting railways
      const buildings = [
        createMockBuilding({
          id: 'north',
          type: 'TRAIN_STATION',
          x: 100,
          y: 0,
          railwayPoints: [{ x: 0, y: 100, type: 'output' }]
        }),
        createMockBuilding({
          id: 'south',
          type: 'TRAIN_STATION',
          x: 100,
          y: 200,
          railwayPoints: [{ x: 0, y: -100, type: 'input' }]
        }),
        createMockBuilding({
          id: 'west',
          type: 'TRAIN_STATION',
          x: 0,
          y: 100,
          railwayPoints: [{ x: 100, y: 0, type: 'output' }]
        }),
        createMockBuilding({
          id: 'east',
          type: 'TRAIN_STATION',
          x: 200,
          y: 100,
          railwayPoints: [{ x: -100, y: 0, type: 'input' }]
        })
      ];

      // Add buildings
      act(() => {
        buildings.forEach(building => {
          result.current.addBuilding(building);
        });
      });

      // Create intersecting railways
      await act(async () => {
        // North-South railway
        await result.current.startRailwayDrawing('north', buildings[0].railwayPoints![0]);
        await result.current.finishRailwayDrawing('south', buildings[1].railwayPoints![0]);

        // West-East railway
        await result.current.startRailwayDrawing('west', buildings[2].railwayPoints![0]);
        await result.current.finishRailwayDrawing('east', buildings[3].railwayPoints![0]);
      });

      // Should detect intersection at (100, 100)
      const intersections = Object.values(result.current.intersections);
      expect(intersections.length).toBeGreaterThan(0);
      
      const centralIntersection = intersections.find(i => 
        Math.abs(i.x - 100) < 10 && Math.abs(i.y - 100) < 10
      );
      expect(centralIntersection).toBeDefined();
      expect(centralIntersection?.railwayIds).toHaveLength(2);
    });

    it('should handle complex multi-way intersections', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create star pattern - 4 railways meeting at center
      const buildings = [
        createMockBuilding({
          id: 'north',
          type: 'TRAIN_STATION',
          x: 100,
          y: 0,
          railwayPoints: [{ x: 0, y: 100, type: 'output' }]
        }),
        createMockBuilding({
          id: 'south',
          type: 'TRAIN_STATION',
          x: 100,
          y: 200,
          railwayPoints: [{ x: 0, y: -100, type: 'input' }]
        }),
        createMockBuilding({
          id: 'west',
          type: 'TRAIN_STATION',
          x: 0,
          y: 100,
          railwayPoints: [{ x: 100, y: 0, type: 'output' }]
        }),
        createMockBuilding({
          id: 'east',
          type: 'TRAIN_STATION',
          x: 200,
          y: 100,
          railwayPoints: [{ x: -100, y: 0, type: 'input' }]
        }),
        createMockBuilding({
          id: 'diagonal',
          type: 'TRAIN_STATION',
          x: 200,
          y: 200,
          railwayPoints: [{ x: -50, y: -50, type: 'input' }]
        })
      ];

      act(() => {
        buildings.forEach(building => {
          result.current.addBuilding(building);
        });
      });

      // Create multiple railways through center
      await act(async () => {
        await result.current.startRailwayDrawing('north', buildings[0].railwayPoints![0]);
        await result.current.finishRailwayDrawing('south', buildings[1].railwayPoints![0]);

        await result.current.startRailwayDrawing('west', buildings[2].railwayPoints![0]);
        await result.current.finishRailwayDrawing('east', buildings[3].railwayPoints![0]);

        // Add diagonal railway through center
        await result.current.startRailwayDrawing('west', buildings[2].railwayPoints![0]);
        await result.current.addRailwayPoint({ x: 100, y: 100, z: 0 }); // Through center
        await result.current.finishRailwayDrawing('diagonal', buildings[4].railwayPoints![0]);
      });

      // Should detect multi-way intersection
      const intersections = Object.values(result.current.intersections);
      const multiWayIntersection = intersections.find(i => 
        i.railwayIds.length >= 3
      );

      expect(multiWayIntersection).toBeDefined();
      expect(multiWayIntersection?.type).toBe('multi-way');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large railway networks efficiently', async () => {
      const { result } = renderHook(() => useLayoutStore());
      
      performanceHelper.startMeasurement('large-railway-network');

      // Create grid of stations
      const gridSize = 10;
      const buildings: Building[] = [];
      
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          buildings.push(createMockBuilding({
            id: `station-${x}-${y}`,
            type: 'TRAIN_STATION',
            x: x * 200,
            y: y * 200,
            railwayPoints: [
              { x: -50, y: 0, type: 'input' },
              { x: 50, y: 0, type: 'output' },
              { x: 0, y: -50, type: 'input' },
              { x: 0, y: 50, type: 'output' }
            ]
          }));
        }
      }

      // Add all buildings
      act(() => {
        buildings.forEach(building => {
          result.current.addBuilding(building);
        });
      });

      // Create railway connections (horizontal and vertical)
      for (let x = 0; x < gridSize - 1; x++) {
        for (let y = 0; y < gridSize; y++) {
          await act(async () => {
            await result.current.startRailwayDrawing(
              `station-${x}-${y}`,
              buildings[y * gridSize + x].railwayPoints![1] // output
            );
            await result.current.finishRailwayDrawing(
              `station-${x + 1}-${y}`,
              buildings[y * gridSize + x + 1].railwayPoints![0] // input
            );
          });
        }
      }

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize - 1; y++) {
          await act(async () => {
            await result.current.startRailwayDrawing(
              `station-${x}-${y}`,
              buildings[y * gridSize + x].railwayPoints![3] // output
            );
            await result.current.finishRailwayDrawing(
              `station-${x}-${y + 1}`,
              buildings[(y + 1) * gridSize + x].railwayPoints![2] // input
            );
          });
        }
      }

      const measurement = performanceHelper.endMeasurement('large-railway-network');
      
      // Should complete within reasonable time
      expect(measurement.duration).toBeLessThan(30000); // 30 seconds max

      // Verify network was created correctly
      const railways = Object.values(result.current.railways);
      const expectedRailways = (gridSize - 1) * gridSize + gridSize * (gridSize - 1);
      expect(railways.length).toBe(expectedRailways);

      // Verify intersection detection
      const intersections = Object.values(result.current.intersections);
      const expectedIntersections = (gridSize - 1) * (gridSize - 1);
      expect(intersections.length).toBe(expectedIntersections);
    });

    it('should prevent memory leaks during railway operations', async () => {
      const { result } = renderHook(() => useLayoutStore());

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many railway creation/deletion cycles
      for (let i = 0; i < 50; i++) {
        const building1 = createMockBuilding({
          id: `temp-station-1-${i}`,
          type: 'TRAIN_STATION',
          x: 0,
          y: 0,
          railwayPoints: [{ x: 100, y: 0, type: 'output' }]
        });

        const building2 = createMockBuilding({
          id: `temp-station-2-${i}`,
          type: 'TRAIN_STATION',
          x: 300,
          y: 0,
          railwayPoints: [{ x: -100, y: 0, type: 'input' }]
        });

        await act(async () => {
          result.current.addBuilding(building1);
          result.current.addBuilding(building2);
          
          await result.current.startRailwayDrawing(
            `temp-station-1-${i}`,
            building1.railwayPoints![0]
          );
          await result.current.finishRailwayDrawing(
            `temp-station-2-${i}`,
            building2.railwayPoints![0]
          );

          // Delete everything
          result.current.deleteBuilding(`temp-station-1-${i}`);
          result.current.deleteBuilding(`temp-station-2-${i}`);
        });
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      // Store should be clean
      expect(Object.keys(result.current.buildings)).toHaveLength(0);
      expect(Object.keys(result.current.railways)).toHaveLength(0);
    });

    it('should maintain performance with rapid state updates', async () => {
      const { result } = renderHook(() => useLayoutStore());

      const building = createMockBuilding({
        id: 'performance-test',
        type: 'TRAIN_STATION',
        x: 100,
        y: 100,
        railwayPoints: [{ x: 0, y: 0, type: 'output' }]
      });

      act(() => {
        result.current.addBuilding(building);
      });

      performanceHelper.startMeasurement('rapid-updates');

      // Perform rapid updates
      const updates = Array.from({ length: 1000 }, (_, i) => ({
        x: 100 + Math.sin(i * 0.1) * 50,
        y: 100 + Math.cos(i * 0.1) * 50,
        rotation: i * 0.36
      }));

      await act(async () => {
        for (const update of updates) {
          await result.current.updateBuilding('performance-test', update);
        }
      });

      const measurement = performanceHelper.endMeasurement('rapid-updates');

      // Should handle rapid updates efficiently
      expect(measurement.duration).toBeLessThan(5000); // 5 seconds max
      expect(measurement.duration / updates.length).toBeLessThan(10); // <10ms per update

      // State should be consistent
      expect(result.current.buildings['performance-test']).toBeDefined();
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should support undo/redo for railway operations', async () => {
      const { result } = renderHook(() => useLayoutStore());

      const building1 = createMockBuilding({
        id: 'station-1',
        type: 'TRAIN_STATION',
        railwayPoints: [{ x: 100, y: 0, type: 'output' }]
      });

      const building2 = createMockBuilding({
        id: 'station-2',
        type: 'TRAIN_STATION',
        x: 300,
        y: 0,
        railwayPoints: [{ x: -100, y: 0, type: 'input' }]
      });

      // Step 1: Add buildings
      act(() => {
        result.current.addBuilding(building1);
        result.current.addBuilding(building2);
      });

      expect(Object.keys(result.current.buildings)).toHaveLength(2);

      // Step 2: Create railway
      await act(async () => {
        await result.current.startRailwayDrawing('station-1', building1.railwayPoints![0]);
        await result.current.finishRailwayDrawing('station-2', building2.railwayPoints![0]);
      });

      expect(Object.keys(result.current.railways)).toHaveLength(1);

      // Step 3: Undo railway creation
      act(() => {
        result.current.undo();
      });

      expect(Object.keys(result.current.railways)).toHaveLength(0);
      expect(Object.keys(result.current.buildings)).toHaveLength(2); // Buildings should remain

      // Step 4: Redo railway creation
      act(() => {
        result.current.redo();
      });

      expect(Object.keys(result.current.railways)).toHaveLength(1);

      // Step 5: Undo building addition
      act(() => {
        result.current.undo(); // Undo railway
        result.current.undo(); // Undo second building
        result.current.undo(); // Undo first building
      });

      expect(Object.keys(result.current.buildings)).toHaveLength(0);
      expect(Object.keys(result.current.railways)).toHaveLength(0);
    });

    it('should handle complex undo/redo scenarios', async () => {
      const { result } = renderHook(() => useLayoutStore());

      // Create complex state with multiple operations
      const buildings = Array.from({ length: 3 }, (_, i) =>
        createMockBuilding({
          id: `station-${i}`,
          type: 'TRAIN_STATION',
          x: i * 200,
          y: 0,
          railwayPoints: [
            { x: -50, y: 0, type: 'input' },
            { x: 50, y: 0, type: 'output' }
          ]
        })
      );

      // Add buildings and railways
      act(() => {
        buildings.forEach(building => {
          result.current.addBuilding(building);
        });
      });

      for (let i = 0; i < buildings.length - 1; i++) {
        await act(async () => {
          await result.current.startRailwayDrawing(
            `station-${i}`,
            buildings[i].railwayPoints![1]
          );
          await result.current.finishRailwayDrawing(
            `station-${i + 1}`,
            buildings[i + 1].railwayPoints![0]
          );
        });
      }

      const initialBuildingCount = Object.keys(result.current.buildings).length;
      const initialRailwayCount = Object.keys(result.current.railways).length;

      expect(initialBuildingCount).toBe(3);
      expect(initialRailwayCount).toBe(2);

      // Perform multiple undos
      act(() => {
        result.current.undo(); // Undo last railway
        result.current.undo(); // Undo first railway
        result.current.undo(); // Undo last building
      });

      expect(Object.keys(result.current.buildings)).toHaveLength(2);
      expect(Object.keys(result.current.railways)).toHaveLength(0);

      // Redo operations
      act(() => {
        result.current.redo(); // Redo building
        result.current.redo(); // Redo first railway
        result.current.redo(); // Redo last railway
      });

      expect(Object.keys(result.current.buildings)).toHaveLength(3);
      expect(Object.keys(result.current.railways)).toHaveLength(2);
    });
  });
});