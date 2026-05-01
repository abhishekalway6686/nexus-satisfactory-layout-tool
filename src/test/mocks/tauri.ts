import { vi } from 'vitest';

// Mock Tauri core API
export const invoke = vi.fn().mockResolvedValue(null);
export const transformCallback = vi.fn((callback: any) => callback);

// Mock Tauri event system
export const listen = vi.fn().mockResolvedValue(() => {});
export const emit = vi.fn().mockResolvedValue(null);
export const once = vi.fn().mockResolvedValue(() => {});

// Mock window management
export const appWindow = {
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(null),
  isMaximized: vi.fn().mockResolvedValue(false),
  maximize: vi.fn().mockResolvedValue(null),
  unmaximize: vi.fn().mockResolvedValue(null),
  minimize: vi.fn().mockResolvedValue(null),
  close: vi.fn().mockResolvedValue(null),
  setTitle: vi.fn().mockResolvedValue(null),
};

// Mock core APIs
export const core = {
  invoke,
  transformCallback,
};

// Mock geometry calculation commands (Rust SIMD optimizations)
export const mockTauriGeometryCommands = {
  calculate_railway_intersections: vi.fn().mockResolvedValue([]),
  optimize_railway_path: vi.fn().mockResolvedValue({ points: [], curves: [] }),
  validate_network_topology: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
  calculate_alignment_score: vi.fn().mockResolvedValue(0.85),
  find_station_connections: vi.fn().mockResolvedValue([]),
};

// Configure invoke mock to handle geometry commands
invoke.mockImplementation((command: string, args?: any) => {
  switch (command) {
    case 'calculate_railway_intersections':
      return Promise.resolve(mockTauriGeometryCommands.calculate_railway_intersections(args));
    case 'optimize_railway_path':
      return Promise.resolve(mockTauriGeometryCommands.optimize_railway_path(args));
    case 'validate_network_topology':
      return Promise.resolve(mockTauriGeometryCommands.validate_network_topology(args));
    case 'calculate_alignment_score':
      return Promise.resolve(mockTauriGeometryCommands.calculate_alignment_score(args));
    case 'find_station_connections':
      return Promise.resolve(mockTauriGeometryCommands.find_station_connections(args));
    default:
      return Promise.resolve(null);
  }
});

export default {
  invoke,
  listen,
  emit,
  once,
  appWindow,
  core,
  mockTauriGeometryCommands,
};