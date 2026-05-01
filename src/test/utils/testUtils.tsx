import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { User } from '@testing-library/user-event';

// Test data factories
export const createMockRailway = (overrides = {}) => ({
  id: `railway-${Date.now()}`,
  startX: 0,
  startY: 0,
  endX: 100,
  endY: 100,
  floor: 0,
  type: 'railway' as const,
  nodes: [],
  intersections: [],
  curves: [],
  connections: [],
  ...overrides,
});

export const createMockBuilding = (overrides = {}) => ({
  id: `building-${Date.now()}`,
  type: 'TRAIN_STATION' as const,
  x: 50,
  y: 50,
  floor: 0,
  rotation: 0,
  connections: [],
  railwayPoints: [
    { x: 0, y: 0, type: 'input' as const },
    { x: 100, y: 0, type: 'output' as const },
  ],
  ...overrides,
});

export const createMockIntersection = (overrides = {}) => ({
  id: `intersection-${Date.now()}`,
  x: 50,
  y: 50,
  floor: 0,
  railwayIds: [],
  type: 'cross' as const,
  connections: [],
  ...overrides,
});

export const createMockNetworkTopology = (overrides = {}) => ({
  nodes: [],
  edges: [],
  components: [],
  metrics: {
    totalLength: 0,
    nodeCount: 0,
    connectionEfficiency: 1.0,
    redundancyScore: 0.5,
  },
  ...overrides,
});

// Performance testing utilities
export interface PerformanceMeasurement {
  name: string;
  duration: number;
  memoryUsed?: number;
  renderCount?: number;
}

export class PerformanceTestHelper {
  private measurements: PerformanceMeasurement[] = [];
  private startTime: number = 0;
  private startMemory: number = 0;

  startMeasurement(name: string): void {
    this.startTime = performance.now();
    this.startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  }

  endMeasurement(name: string): PerformanceMeasurement {
    const duration = performance.now() - this.startTime;
    const memoryUsed = ((performance as any).memory?.usedJSHeapSize || 0) - this.startMemory;
    
    const measurement: PerformanceMeasurement = {
      name,
      duration,
      memoryUsed,
    };
    
    this.measurements.push(measurement);
    return measurement;
  }

  getMeasurements(): PerformanceMeasurement[] {
    return [...this.measurements];
  }

  clear(): void {
    this.measurements = [];
  }

  expectPerformance(name: string, maxDuration: number): void {
    const measurement = this.measurements.find(m => m.name === name);
    expect(measurement).toBeDefined();
    expect(measurement!.duration).toBeLessThan(maxDuration);
  }
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  withPerformanceTracking?: boolean;
}

export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof rtlRender> & { user: User; performance: PerformanceTestHelper } {
  const { initialState, withPerformanceTracking = false, ...renderOptions } = options;

  const performance = new PerformanceTestHelper();
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <div data-testid="test-wrapper">
        {children}
      </div>
    );
  };

  if (withPerformanceTracking) {
    performance.startMeasurement('render');
  }

  const result = rtlRender(ui, { wrapper: Wrapper, ...renderOptions });

  if (withPerformanceTracking) {
    performance.endMeasurement('render');
  }

  return {
    ...result,
    user: userEvent.setup(),
    performance,
  };
}

// Async utilities for testing railway operations
export async function waitForRailwayOperation(operationName: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Railway operation '${operationName}' timed out after ${timeout}ms`));
        return;
      }

      // Check for operation completion indicators
      const operationComplete = screen.queryByTestId(`${operationName}-complete`);
      const operationError = screen.queryByTestId(`${operationName}-error`);

      if (operationComplete) {
        resolve();
      } else if (operationError) {
        reject(new Error(`Railway operation '${operationName}' failed`));
      } else {
        setTimeout(check, 50);
      }
    };

    check();
  });
}

// Mock store utilities
export const createMockStore = (initialState = {}) => {
  const state = {
    buildings: [],
    railways: [],
    intersections: [],
    networkTopology: createMockNetworkTopology(),
    isDrawingRailway: false,
    railwayPreview: null,
    selectedTool: 'select',
    ...initialState,
  };

  const actions = {
    addBuilding: vi.fn(),
    updateBuilding: vi.fn(),
    deleteBuilding: vi.fn(),
    addRailway: vi.fn(),
    updateRailway: vi.fn(),
    deleteRailway: vi.fn(),
    setDrawingRailway: vi.fn(),
    setRailwayPreview: vi.fn(),
    calculateIntersections: vi.fn(),
    optimizeNetwork: vi.fn(),
    validateNetwork: vi.fn(),
  };

  return {
    ...state,
    ...actions,
  };
};

// Visual regression testing utilities
export interface VisualTestResult {
  componentName: string;
  passed: boolean;
  differences?: string[];
  screenshot?: string;
}

export class VisualTestHelper {
  async captureComponent(container: HTMLElement, name: string): Promise<VisualTestResult> {
    // Mock implementation for visual testing
    // In a real implementation, this would capture screenshots and compare them
    const hasExpectedElements = container.querySelector('[data-testid]') !== null;
    
    return {
      componentName: name,
      passed: hasExpectedElements,
      differences: hasExpectedElements ? [] : ['Missing test elements'],
    };
  }

  async compareWithBaseline(
    current: VisualTestResult,
    baseline: VisualTestResult
  ): Promise<boolean> {
    return current.passed === baseline.passed;
  }
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { userEvent };

// Export the custom render as default render
export { customRender as render };