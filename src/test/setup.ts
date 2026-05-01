import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs for testing
global.window.__TAURI__ = {};
global.window.__TAURI_INTERNALS__ = {};

// Mock performance APIs
if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  } as any;
}

// Mock ResizeObserver for canvas testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock canvas context for Konva testing
HTMLCanvasElement.prototype.getContext = vi.fn((contextId) => {
  if (contextId === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: [] })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      fillText: vi.fn(),
      strokeText: vi.fn(),
    };
  }
  return null;
}) as any;

// Global test utilities
global.createMockRailway = (overrides = {}) => ({
  id: 'railway-1',
  startX: 0,
  startY: 0,
  endX: 100,
  endY: 100,
  floor: 0,
  type: 'railway',
  nodes: [],
  intersections: [],
  ...overrides,
});

global.createMockBuilding = (overrides = {}) => ({
  id: 'building-1',
  type: 'TRAIN_STATION',
  x: 50,
  y: 50,
  floor: 0,
  rotation: 0,
  ...overrides,
});

global.createMockIntersection = (overrides = {}) => ({
  id: 'intersection-1',
  x: 50,
  y: 50,
  railwayIds: ['railway-1', 'railway-2'],
  type: 'cross',
  ...overrides,
});