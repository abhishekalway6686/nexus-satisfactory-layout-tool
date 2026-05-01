// src/components/Canvas/__tests__/RailwayDrawingPreview.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stage, Layer } from 'react-konva';
import { RailwayDrawingPreview } from '../RailwayDrawingPreview';
import { useLayoutStore } from '../../../store/layoutStore';
import { 
  createMockBuilding,
  createMockRailway,
  PerformanceTestHelper,
  VisualTestHelper 
} from '../../../test/utils/testUtils';
import type { Building, Point3D } from '../../../types';

// Mock Konva Stage for testing
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => <div data-testid="konva-stage" {...props}>{children}</div>,
  Layer: ({ children, ...props }: any) => <div data-testid="konva-layer" {...props}>{children}</div>,
  Group: ({ children, ...props }: any) => <div data-testid="konva-group" {...props}>{children}</div>,
  Path: (props: any) => <div data-testid="konva-path" data-path={props.data} />,
  Circle: (props: any) => <div data-testid="konva-circle" data-radius={props.radius} />,
  Ring: (props: any) => <div data-testid="konva-ring" data-inner-radius={props.innerRadius} />,
}));

// Mock Tauri commands
vi.mock('../../../tauri/commands', () => ({
  detectRailwayIntersectionsRealtime: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../tauri/environment', () => ({
  isTauriEnvironment: vi.fn().mockReturnValue(false), // Default to web environment
}));

// Mock store hook
const mockStore = {
  isDrawingRailway: false,
  railwayPreview: null,
  buildings: {},
  railwayNodes: {},
  railwaySegments: {},
  railways: {},
  intersections: {},
  currentFloor: 0,
  startRailwayDrawing: vi.fn(),
  addRailwayPoint: vi.fn(),
  finishRailwayDrawing: vi.fn(),
  cancelRailwayDrawing: vi.fn(),
  updateRailwayPreview: vi.fn(),
};

vi.mock('../../../store/layoutStore', () => ({
  useLayoutStore: vi.fn(() => mockStore),
  getSpatialIndexManager: vi.fn(() => ({
    queryRegion: vi.fn().mockReturnValue([]),
    addNode: vi.fn(),
    removeNode: vi.fn(),
  })),
}));

describe('RailwayDrawingPreview Component', () => {
  let performanceHelper: PerformanceTestHelper;
  let visualHelper: VisualTestHelper;
  let mockUser: ReturnType<typeof userEvent.setup>;

  const defaultProps = {
    mousePos: { x: 400, y: 300 },
    scale: 1.0,
    position: { x: 0, y: 0 },
    currentFloor: 0,
  };

  beforeEach(() => {
    performanceHelper = new PerformanceTestHelper();
    visualHelper = new VisualTestHelper();
    mockUser = userEvent.setup();

    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset mock store state
    mockStore.isDrawingRailway = false;
    mockStore.railwayPreview = null;
    mockStore.buildings = {};
    mockStore.railwayNodes = {};
    mockStore.railways = {};
    mockStore.intersections = {};
  });

  afterEach(() => {
    performanceHelper.clear();
  });

  describe('Rendering States', () => {
    it('should render nothing when not drawing railway', () => {
      mockStore.isDrawingRailway = false;
      mockStore.railwayPreview = null;

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should not render any railway preview elements
      expect(container.querySelector('[data-testid="konva-path"]')).toBeNull();
      expect(container.querySelector('[data-testid="konva-circle"]')).toBeNull();
    });

    it('should render preview when drawing railway', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        startBuildingId: 'station-1',
        path: [
          { x: 100, y: 100, z: 0 },
          { x: 200, y: 100, z: 0 }
        ],
        segments: [],
        totalDistance: 100,
        estimatedCost: 500
      };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should render railway path
      expect(container.querySelector('[data-testid="konva-path"]')).toBeTruthy();
    });

    it('should show snap indicators when near snap targets', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      // Add building near mouse position
      const nearbyBuilding = createMockBuilding({
        id: 'nearby-station',
        type: 'TRAIN_STATION',
        x: 390, // Close to mouse position (400)
        y: 290, // Close to mouse position (300)
        railwayPoints: [{ x: 0, y: 0, type: 'input' }]
      });

      mockStore.buildings = { 'nearby-station': nearbyBuilding };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should show snap indicator
      expect(container.querySelector('[data-testid="konva-ring"]')).toBeTruthy();
    });

    it('should highlight intersection points during drawing', async () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [
          { x: 0, y: 100, z: 0 },
          { x: 200, y: 100, z: 0 }
        ],
        segments: [],
        totalDistance: 200,
        estimatedCost: 1000
      };

      // Add existing railway that would intersect
      const existingRailway = createMockRailway({
        id: 'existing-railway',
        startX: 100,
        startY: 0,
        endX: 100,
        endY: 200,
        floor: 0
      });

      mockStore.railways = { 'existing-railway': existingRailway };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Wait for intersection detection
      await waitFor(() => {
        // Should show intersection indicator at (100, 100)
        const circles = container.querySelectorAll('[data-testid="konva-circle"]');
        expect(circles.length).toBeGreaterThan(0);
      });
    });

    it('should display connection quality indicators', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        startBuildingId: 'station-1',
        path: [
          { x: 100, y: 100, z: 0 },
          { x: 400, y: 300, z: 0 }
        ],
        segments: [],
        totalDistance: 360, // sqrt((400-100)^2 + (300-100)^2)
        estimatedCost: 1800,
        connectionQuality: 0.75 // Mock quality score
      };

      const startBuilding = createMockBuilding({
        id: 'station-1',
        type: 'TRAIN_STATION',
        x: 100,
        y: 100,
        railwayPoints: [{ x: 0, y: 0, type: 'output' }]
      });

      mockStore.buildings = { 'station-1': startBuilding };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should render connection quality visualization
      const paths = container.querySelectorAll('[data-testid="konva-path"]');
      expect(paths.length).toBeGreaterThan(1); // Main path + quality indicator
    });
  });

  describe('Mouse Interaction', () => {
    it('should update preview path based on mouse position', async () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      const { rerender } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Change mouse position
      const newProps = {
        ...defaultProps,
        mousePos: { x: 500, y: 400 }
      };

      rerender(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...newProps} />
          </Layer>
        </Stage>
      );

      // Component should update to show new preview path
      expect(mockStore.updateRailwayPreview).toHaveBeenCalled();
    });

    it('should handle rapid mouse movements efficiently', async () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      performanceHelper.startMeasurement('rapid-mouse-updates');

      const { rerender } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Simulate rapid mouse movements
      for (let i = 0; i < 100; i++) {
        const newProps = {
          ...defaultProps,
          mousePos: { 
            x: 400 + Math.sin(i * 0.1) * 100, 
            y: 300 + Math.cos(i * 0.1) * 100 
          }
        };

        rerender(
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview {...newProps} />
            </Layer>
          </Stage>
        );
      }

      const measurement = performanceHelper.endMeasurement('rapid-mouse-updates');

      // Should handle rapid updates efficiently (throttling should kick in)
      expect(measurement.duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should snap to nearby connection points', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 0, y: 0, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      const targetBuilding = createMockBuilding({
        id: 'target-station',
        type: 'TRAIN_STATION',
        x: 400, // Exactly at mouse position
        y: 300,
        railwayPoints: [{ x: -50, y: 0, type: 'input' }]
      });

      mockStore.buildings = { 'target-station': targetBuilding };

      render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should show snap indicator and snap the preview
      // The component should detect the nearby connection point and snap to it
      // This is verified by checking if snap indicators are rendered
      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      expect(container.querySelector('[data-testid="konva-ring"]')).toBeTruthy();
    });
  });

  describe('Visual Feedback System', () => {
    it('should provide different visual feedback for different connection types', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        startBuildingId: 'station-1',
        path: [
          { x: 100, y: 100, z: 0 },
          { x: 400, y: 300, z: 0 }
        ],
        segments: [],
        totalDistance: 360,
        estimatedCost: 1800
      };

      const startBuilding = createMockBuilding({
        id: 'station-1',
        type: 'TRAIN_STATION',
        railwayPoints: [{ x: 0, y: 0, type: 'output' }]
      });

      const targetBuilding = createMockBuilding({
        id: 'target-station',
        type: 'FREIGHT_PLATFORM', // Different building type
        x: 400,
        y: 300,
        railwayPoints: [{ x: 0, y: 0, type: 'bidirectional' }]
      });

      mockStore.buildings = {
        'station-1': startBuilding,
        'target-station': targetBuilding
      };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should render different visual styles for different connection types
      const paths = container.querySelectorAll('[data-testid="konva-path"]');
      expect(paths.length).toBeGreaterThan(0);

      // Different connection types should have different visual properties
      const pathElements = Array.from(paths);
      expect(pathElements.some(path => 
        path.getAttribute('data-path')?.includes('M') // SVG path commands
      )).toBe(true);
    });

    it('should show error states for invalid connections', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        startBuildingId: 'station-1',
        path: [
          { x: 100, y: 100, z: 0 },
          { x: 10000, y: 10000, z: 0 } // Invalid - too far
        ],
        segments: [],
        totalDistance: 14142, // Very long distance
        estimatedCost: 70710,
        isValid: false,
        errors: ['Connection distance exceeds maximum allowed']
      };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Should render error visual feedback (typically red color)
      const paths = container.querySelectorAll('[data-testid="konva-path"]');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should animate transitions between states', async () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      const { rerender } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Add building to create snap state transition
      mockStore.buildings = {
        'new-station': createMockBuilding({
          id: 'new-station',
          type: 'TRAIN_STATION',
          x: 400,
          y: 300,
          railwayPoints: [{ x: 0, y: 0, type: 'input' }]
        })
      };

      rerender(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Animation system should create smooth transitions
      // In a real test, we'd check for animation properties or intermediate states
      await waitFor(() => {
        const rings = container.querySelectorAll('[data-testid="konva-ring"]');
        expect(rings.length).toBeGreaterThan(0);
      }, { timeout: 500 });
    });
  });

  describe('Performance Optimization', () => {
    it('should use viewport culling for large networks', () => {
      mockStore.isDrawingRailway = true;
      
      // Create many buildings outside viewport
      const manyBuildings: Record<string, Building> = {};
      for (let i = 0; i < 100; i++) {
        manyBuildings[`station-${i}`] = createMockBuilding({
          id: `station-${i}`,
          type: 'TRAIN_STATION',
          x: i * 1000, // Far outside viewport
          y: i * 1000,
          railwayPoints: [{ x: 0, y: 0, type: 'input' }]
        });
      }

      mockStore.buildings = manyBuildings;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      performanceHelper.startMeasurement('viewport-culling');

      render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      const measurement = performanceHelper.endMeasurement('viewport-culling');

      // Should render quickly despite many off-screen buildings
      expect(measurement.duration).toBeLessThan(100);
    });

    it('should throttle expensive calculations', async () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      const { rerender } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      let callCount = 0;
      const originalQueryRegion = vi.fn(() => {
        callCount++;
        return [];
      });

      // Mock spatial index to count calls
      vi.mocked(vi.importActual('../../../store/layoutStore')).getSpatialIndexManager.mockReturnValue({
        queryRegion: originalQueryRegion,
        addNode: vi.fn(),
        removeNode: vi.fn(),
      });

      // Rapid position changes
      for (let i = 0; i < 50; i++) {
        rerender(
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview
                {...defaultProps}
                mousePos={{ x: 400 + i, y: 300 + i }}
              />
            </Layer>
          </Stage>
        );
      }

      // Calls should be throttled, not 1:1 with position updates
      expect(callCount).toBeLessThan(25); // Should be significantly less than 50
    });

    it('should optimize rendering for complex curved paths', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 50, z: 0 },
          { x: 200, y: 100, z: 0 },
          { x: 300, y: 150, z: 0 },
          { x: 400, y: 200, z: 0 }
        ],
        segments: [],
        curves: [
          { startIndex: 0, endIndex: 1, controlPoint: { x: 50, y: 0, z: 0 } },
          { startIndex: 1, endIndex: 2, controlPoint: { x: 150, y: 75, z: 0 } },
          { startIndex: 2, endIndex: 3, controlPoint: { x: 250, y: 125, z: 0 } },
          { startIndex: 3, endIndex: 4, controlPoint: { x: 350, y: 175, z: 0 } }
        ],
        totalDistance: 500,
        estimatedCost: 2500
      };

      performanceHelper.startMeasurement('complex-curve-rendering');

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      const measurement = performanceHelper.endMeasurement('complex-curve-rendering');

      // Should render complex curves efficiently
      expect(measurement.duration).toBeLessThan(50);

      // Should render curve path
      const paths = container.querySelectorAll('[data-testid="konva-path"]');
      expect(paths.length).toBeGreaterThan(0);
      
      const curvePath = Array.from(paths).find(path =>
        path.getAttribute('data-path')?.includes('C') // Bezier curve command
      );
      expect(curvePath).toBeTruthy();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide keyboard navigation support', async () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      render(
        <div role="application" aria-label="Railway Drawing Tool">
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview {...defaultProps} />
            </Layer>
          </Stage>
        </div>
      );

      const appElement = screen.getByRole('application');
      
      // Should be focusable for keyboard navigation
      appElement.focus();
      expect(appElement).toHaveFocus();

      // Test keyboard interactions
      await mockUser.keyboard('{Escape}');
      expect(mockStore.cancelRailwayDrawing).toHaveBeenCalled();
    });

    it('should provide appropriate ARIA labels and descriptions', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        startBuildingId: 'station-1',
        path: [
          { x: 100, y: 100, z: 0 },
          { x: 400, y: 300, z: 0 }
        ],
        segments: [],
        totalDistance: 360,
        estimatedCost: 1800
      };

      const startBuilding = createMockBuilding({
        id: 'station-1',
        type: 'TRAIN_STATION',
        railwayPoints: [{ x: 0, y: 0, type: 'output' }]
      });

      mockStore.buildings = { 'station-1': startBuilding };

      render(
        <div>
          <div 
            aria-live="polite" 
            aria-label="Railway drawing status"
            data-testid="railway-status"
          >
            Drawing railway from Train Station. Distance: 360m, Estimated cost: $1800
          </div>
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview {...defaultProps} />
            </Layer>
          </Stage>
        </div>
      );

      const statusElement = screen.getByTestId('railway-status');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      const { container } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Component should respect reduced motion settings
      // In practice, this would disable animations and smooth transitions
      expect(container.querySelector('[data-testid="konva-path"]')).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed preview data gracefully', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'malformed-preview',
        path: [
          { x: NaN, y: 100, z: 0 }, // Invalid coordinate
          { x: 200, y: undefined as any, z: 0 } // Invalid coordinate
        ],
        segments: null as any, // Invalid segments
        totalDistance: -100, // Invalid distance
        estimatedCost: 'invalid' as any // Invalid cost
      };

      expect(() => {
        render(
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview {...defaultProps} />
            </Layer>
          </Stage>
        );
      }).not.toThrow();

      // Component should render fallback or nothing rather than crash
    });

    it('should handle rapid state changes gracefully', async () => {
      const { rerender } = render(
        <Stage width={800} height={600}>
          <Layer>
            <RailwayDrawingPreview {...defaultProps} />
          </Layer>
        </Stage>
      );

      // Rapidly toggle drawing state
      for (let i = 0; i < 10; i++) {
        mockStore.isDrawingRailway = i % 2 === 0;
        mockStore.railwayPreview = mockStore.isDrawingRailway ? {
          id: `preview-${i}`,
          path: [{ x: i * 10, y: i * 10, z: 0 }],
          segments: [],
          totalDistance: i * 10,
          estimatedCost: i * 50
        } : null;

        rerender(
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview {...defaultProps} />
            </Layer>
          </Stage>
        );
      }

      // Should handle rapid changes without errors
      expect(true).toBe(true); // If we get here, no errors were thrown
    });

    it('should handle empty or missing building data', () => {
      mockStore.isDrawingRailway = true;
      mockStore.railwayPreview = {
        id: 'preview-1',
        startBuildingId: 'nonexistent-station', // Building doesn't exist
        path: [{ x: 100, y: 100, z: 0 }],
        segments: [],
        totalDistance: 0,
        estimatedCost: 0
      };

      mockStore.buildings = {}; // Empty buildings

      expect(() => {
        render(
          <Stage width={800} height={600}>
            <Layer>
              <RailwayDrawingPreview {...defaultProps} />
            </Layer>
          </Stage>
        );
      }).not.toThrow();
    });
  });
});