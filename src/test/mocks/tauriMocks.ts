/**
 * Tauri API Mocks for Testing
 * 
 * Comprehensive mocks for Tauri commands and environment detection
 * that can be used across all performance and integration tests.
 */

import { vi } from 'vitest';
import type { Point3D } from '../../types';

// Mock Tauri invoke function
export const mockInvoke = vi.fn();

// Mock Tauri API structure
export const mockTauriAPI = {
  invoke: mockInvoke,
  listen: vi.fn(),
  emit: vi.fn(),
  convertFileSrc: vi.fn((filePath: string) => `tauri://localhost/${filePath}`),
};

// Mock window.__TAURI__ object
export const setupTauriMocks = () => {
  (global as any).__TAURI__ = mockTauriAPI;
  (global as any).__TAURI_INTERNALS__ = {
    invoke: mockInvoke,
    metadata: {
      windows: [],
      currentWindow: { label: 'main' },
    },
  };
};

// Mock Tauri commands with realistic behavior
export const createMockTauriCommands = () => {
  const commands = {
    // Test connection
    test_rust_connection: vi.fn().mockResolvedValue('Rust connection successful'),

    // Distance calculations
    calculate_distance_3d: vi.fn().mockImplementation(({ p1, p2 }: { p1: Point3D; p2: Point3D }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      return Promise.resolve(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }),

    calculate_distance_3d_squared: vi.fn().mockImplementation(({ p1, p2 }: { p1: Point3D; p2: Point3D }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      return Promise.resolve(dx * dx + dy * dy + dz * dz);
    }),

    calculate_distance_2d: vi.fn().mockImplementation(({ p1, p2 }: { p1: Point3D; p2: Point3D }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Promise.resolve(Math.sqrt(dx * dx + dy * dy));
    }),

    calculate_distance_2d_squared: vi.fn().mockImplementation(({ p1, p2 }: { p1: Point3D; p2: Point3D }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Promise.resolve(dx * dx + dy * dy);
    }),

    // Bulk operations
    calculate_distances_bulk: vi.fn().mockImplementation(({ points_a, points_b }: { points_a: Point3D[]; points_b: Point3D[] }) => {
      const results = points_a.map((p1, i) => {
        const p2 = points_b[i] || points_b[0];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      });
      return Promise.resolve(results);
    }),

    // Curve calculations
    should_create_turn_exact: vi.fn().mockImplementation(({ p1, p2, p3 }: { p1: Point3D; p2: Point3D; p3: Point3D }) => {
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
      
      return Promise.resolve(angleDiff > 0.873 && dist1 >= minDistance && dist2 >= minDistance);
    }),

    calculate_curve_control_point_exact: vi.fn().mockImplementation(({ p1, p2, p3 }: { p1: Point3D; p2: Point3D; p3: Point3D }) => {
      // Simplified control point calculation for testing
      return Promise.resolve({
        x: (p1.x + p2.x + p3.x) / 3,
        y: (p1.y + p2.y + p3.y) / 3,
        z: (p1.z + p2.z + p3.z) / 3,
      });
    }),

    get_quadratic_bezier_points: vi.fn().mockImplementation(({ start, cp, end, num_points }: { 
      start: Point3D; 
      cp: Point3D; 
      end: Point3D; 
      num_points: number;
    }) => {
      const points: Point3D[] = [];
      for (let i = 0; i <= num_points; i++) {
        const t = i / num_points;
        const u = 1 - t;
        const x = u * u * start.x + 2 * u * t * cp.x + t * t * end.x;
        const y = u * u * start.y + 2 * u * t * cp.y + t * t * end.y;
        const z = u * u * start.z + 2 * u * t * cp.z + t * t * end.z;
        points.push({ x, y, z });
      }
      return Promise.resolve(points);
    }),

    // Intersection detection
    find_intersections_spatial: vi.fn().mockImplementation(({ poly1, poly2, use_spatial_optimization }: {
      poly1: { x: number; y: number }[];
      poly2: { x: number; y: number }[];
      use_spatial_optimization: boolean;
    }) => {
      const intersections: Array<{ point: { x: number; y: number }; t1: number; t2: number }> = [];
      
      // Simple intersection detection for testing
      for (let i = 0; i < poly1.length - 1; i++) {
        for (let j = 0; j < poly2.length - 1; j++) {
          const p1 = poly1[i];
          const p2 = poly1[i + 1];
          const p3 = poly2[j];
          const p4 = poly2[j + 1];
          
          const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
          if (Math.abs(denom) > 1e-6) {
            const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
            const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;
            
            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
              intersections.push({
                point: {
                  x: p1.x + t * (p2.x - p1.x),
                  y: p1.y + t * (p2.y - p1.y)
                },
                t1: t,
                t2: u
              });
            }
          }
        }
      }
      
      return Promise.resolve(intersections);
    }),

    // Spatial queries
    bulk_spatial_query_buildings: vi.fn().mockResolvedValue({ 
      entities: [], 
      query_time_ms: 1.0,
      entities_checked: 0 
    }),

    query_railway_nodes_optimized: vi.fn().mockImplementation(({ center, radius, exclude_ids }: {
      center: Point3D;
      radius: number;
      exclude_ids: string[];
    }) => {
      return Promise.resolve([]);
    }),

    universal_spatial_query: vi.fn().mockResolvedValue({
      buildings: [],
      railway_nodes: [],
      conveyor_poles: [],
      pipe_supports: []
    }),

    get_spatial_stats: vi.fn().mockResolvedValue({
      buildings: { total_entities: 0, total_cells: 0, avg_entities_per_cell: 0, max_entities_in_cell: 0, cell_size: 10 },
      railway_nodes: { total_entities: 0, total_cells: 0, avg_entities_per_cell: 0, max_entities_in_cell: 0, cell_size: 10 },
      conveyor_poles: { total_entities: 0, total_cells: 0, avg_entities_per_cell: 0, max_entities_in_cell: 0, cell_size: 10 },
      pipe_supports: { total_entities: 0, total_cells: 0, avg_entities_per_cell: 0, max_entities_in_cell: 0, cell_size: 10 }
    }),

    benchmark_spatial_performance: vi.fn().mockResolvedValue({
      iterations: 1000,
      total_benchmark_time_ms: 100.0,
      avg_query_time_ms: 0.1,
      total_results: 500,
      queries_per_second: 10000
    }),

    // SIMD operations
    calculate_segment_lengths_simd: vi.fn().mockImplementation(({ points }: { points: Point3D[] }) => {
      const lengths = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        lengths.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
      }
      return Promise.resolve(lengths);
    }),

    approximate_bezier_simd: vi.fn().mockImplementation(({ start, control, end, steps }: {
      start: Point3D;
      control: Point3D;
      end: Point3D;
      steps: number;
    }) => {
      const points: Point3D[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        const x = u * u * start.x + 2 * u * t * control.x + t * t * end.x;
        const y = u * u * start.y + 2 * u * t * control.y + t * t * end.y;
        const z = u * u * start.z + 2 * u * t * control.z + t * t * end.z;
        points.push({ x, y, z });
      }
      return Promise.resolve(points);
    }),

    calculate_railway_curves_batch: vi.fn().mockResolvedValue({
      optimizedPoints: [],
      curveSegments: [],
      processingTimeMs: 1.0,
      pointsOptimized: 0,
      curvesCreated: 0,
      performanceGain: 1.0
    }),
  };

  // Set up the mock invoke function to route to the appropriate command
  mockInvoke.mockImplementation(async (command: string, args: any = {}) => {
    const commandFn = commands[command as keyof typeof commands];
    if (commandFn && vi.isMockFunction(commandFn)) {
      return await commandFn(args);
    }
    throw new Error(`Unknown command: ${command}`);
  });

  return commands;
};

// Environment detection mocks
export const createMockEnvironment = () => {
  const environment = {
    isTauriEnvironment: vi.fn(() => false),
    isRustBackendAvailable: vi.fn(() => Promise.resolve(false)),
    isHttpBridgeAvailable: vi.fn(() => Promise.resolve(false)),
    PerformanceConfig: {
      useNativeCalculations: false,
    },
  };

  return environment;
};

// Performance timing mocks
export const createPerformanceMocks = () => {
  let callCount = 0;
  const timings: number[] = [];

  const mockPerformanceNow = vi.fn(() => {
    const baseTime = 1000 + callCount * 0.1; // Incremental timing
    callCount++;
    timings.push(baseTime);
    return baseTime;
  });

  global.performance.now = mockPerformanceNow;

  return {
    mockPerformanceNow,
    getTimings: () => [...timings],
    resetTimings: () => {
      timings.length = 0;
      callCount = 0;
    },
    setCustomTiming: (times: number[]) => {
      let index = 0;
      mockPerformanceNow.mockImplementation(() => {
        const time = times[index % times.length];
        index++;
        return time;
      });
    },
  };
};

// Failure simulation utilities
export const createFailureSimulator = () => {
  const commands = createMockTauriCommands();
  
  return {
    simulateAllFailures: (errorMessage = 'Simulated failure') => {
      Object.values(commands).forEach(command => {
        if (vi.isMockFunction(command)) {
          command.mockRejectedValue(new Error(errorMessage));
        }
      });
    },

    simulateSpecificFailure: (commandName: string, errorMessage = 'Simulated failure') => {
      const command = commands[commandName as keyof typeof commands];
      if (command && vi.isMockFunction(command)) {
        command.mockRejectedValue(new Error(errorMessage));
      }
    },

    simulateTimeoutFailure: (commandName: string, timeoutMs = 5000) => {
      const command = commands[commandName as keyof typeof commands];
      if (command && vi.isMockFunction(command)) {
        command.mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
          )
        );
      }
    },

    simulateIntermittentFailure: (commandName: string, failureRate = 0.5) => {
      const command = commands[commandName as keyof typeof commands];
      const originalImpl = command?.getMockImplementation();
      
      if (command && vi.isMockFunction(command) && originalImpl) {
        command.mockImplementation((...args) => {
          if (Math.random() < failureRate) {
            return Promise.reject(new Error('Intermittent failure'));
          }
          return originalImpl(...args);
        });
      }
    },

    restoreAllCommands: () => {
      Object.values(commands).forEach(command => {
        if (vi.isMockFunction(command)) {
          command.mockRestore();
        }
      });
    },
  };
};

// Export utilities for test setup
export const setupTestEnvironment = () => {
  setupTauriMocks();
  const commands = createMockTauriCommands();
  const environment = createMockEnvironment();
  const performance = createPerformanceMocks();
  const failureSimulator = createFailureSimulator();

  return {
    commands,
    environment,
    performance,
    failureSimulator,
    cleanup: () => {
      vi.clearAllMocks();
      performance.resetTimings();
      failureSimulator.restoreAllCommands();
      delete (global as any).__TAURI__;
      delete (global as any).__TAURI_INTERNALS__;
    },
  };
};

// Export individual utilities
export {
  mockInvoke,
  mockTauriAPI,
};