// src/logic/common/__tests__/intersectionLogic.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  linesIntersect,
  approximateBezier,
  getPolyLine,
  findIntersections,
  isRightTrianglePattern,
  classifyIntersection,
  detectAdvancedIntersections,
  findMultiWayIntersections,
  analyzeGradeSeparation,
  calculateIntersectionAngle,
  optimizeIntersectionGeometry
} from '../intersectionLogic';
import { 
  createMockRailway,
  createMockIntersection,
  PerformanceTestHelper 
} from '../../../test/utils/testUtils';
import type { Point, RailwaySegment, IntersectionType, IntersectionAnalysisResult } from '../../../types';

describe('Intersection Logic Core Functions', () => {
  let performanceHelper: PerformanceTestHelper;

  beforeEach(() => {
    performanceHelper = new PerformanceTestHelper();
  });

  describe('linesIntersect', () => {
    it('should detect intersection of crossing lines', () => {
      const a1: Point = { x: 0, y: 0 };
      const a2: Point = { x: 100, y: 100 };
      const b1: Point = { x: 0, y: 100 };
      const b2: Point = { x: 100, y: 0 };

      const intersection = linesIntersect(a1, a2, b1, b2);

      expect(intersection).not.toBeNull();
      expect(intersection?.x).toBeCloseTo(50);
      expect(intersection?.y).toBeCloseTo(50);
    });

    it('should return null for parallel lines', () => {
      const a1: Point = { x: 0, y: 0 };
      const a2: Point = { x: 100, y: 0 };
      const b1: Point = { x: 0, y: 10 };
      const b2: Point = { x: 100, y: 10 };

      const intersection = linesIntersect(a1, a2, b1, b2);

      expect(intersection).toBeNull();
    });

    it('should return null for non-intersecting segments', () => {
      const a1: Point = { x: 0, y: 0 };
      const a2: Point = { x: 50, y: 50 };
      const b1: Point = { x: 60, y: 0 };
      const b2: Point = { x: 100, y: 40 };

      const intersection = linesIntersect(a1, a2, b1, b2);

      expect(intersection).toBeNull();
    });

    it('should handle touching endpoints', () => {
      const a1: Point = { x: 0, y: 0 };
      const a2: Point = { x: 50, y: 50 };
      const b1: Point = { x: 50, y: 50 };
      const b2: Point = { x: 100, y: 0 };

      const intersection = linesIntersect(a1, a2, b1, b2);

      expect(intersection).not.toBeNull();
      expect(intersection?.x).toBeCloseTo(50);
      expect(intersection?.y).toBeCloseTo(50);
    });

    it('should handle near-parallel lines within tolerance', () => {
      const a1: Point = { x: 0, y: 0 };
      const a2: Point = { x: 100, y: 0 };
      const b1: Point = { x: 0, y: 0.0001 };
      const b2: Point = { x: 100, y: 0.0001 };

      const intersection = linesIntersect(a1, a2, b1, b2);

      expect(intersection).toBeNull(); // Should be treated as parallel
    });

    it('should perform within acceptable time limits', () => {
      performanceHelper.startMeasurement('line-intersection');

      // Test with many intersection calculations
      for (let i = 0; i < 1000; i++) {
        const a1: Point = { x: Math.random() * 100, y: Math.random() * 100 };
        const a2: Point = { x: Math.random() * 100, y: Math.random() * 100 };
        const b1: Point = { x: Math.random() * 100, y: Math.random() * 100 };
        const b2: Point = { x: Math.random() * 100, y: Math.random() * 100 };
        
        linesIntersect(a1, a2, b1, b2);
      }

      const measurement = performanceHelper.endMeasurement('line-intersection');
      expect(measurement.duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('approximateBezier', () => {
    it('should generate smooth curve approximation', () => {
      const start: Point = { x: 0, y: 0 };
      const control: Point = { x: 50, y: 100 };
      const end: Point = { x: 100, y: 0 };

      const points = approximateBezier(start, control, end, 20);

      expect(points).toHaveLength(21); // 20 steps + 1 for inclusive end
      expect(points[0]).toEqual(start);
      expect(points[20]).toEqual(end);

      // Check curve smoothness - points should follow bezier pattern
      const midPoint = points[10];
      expect(midPoint.y).toBeGreaterThan(0); // Should be above the line connecting start/end
    });

    it('should handle degenerate curves', () => {
      const start: Point = { x: 0, y: 0 };
      const control: Point = { x: 50, y: 0 }; // Control point on line
      const end: Point = { x: 100, y: 0 };

      const points = approximateBezier(start, control, end, 10);

      expect(points).toHaveLength(11);
      // All points should have y=0 for this degenerate case
      points.forEach(point => {
        expect(point.y).toBeCloseTo(0);
      });
    });

    it('should maintain precision with varying step counts', () => {
      const start: Point = { x: 0, y: 0 };
      const control: Point = { x: 50, y: 50 };
      const end: Point = { x: 100, y: 0 };

      const lowRes = approximateBezier(start, control, end, 5);
      const highRes = approximateBezier(start, control, end, 50);

      expect(lowRes).toHaveLength(6);
      expect(highRes).toHaveLength(51);

      // First and last points should always match
      expect(lowRes[0]).toEqual(highRes[0]);
      expect(lowRes[lowRes.length - 1]).toEqual(highRes[highRes.length - 1]);
    });
  });

  describe('getPolyLine', () => {
    it('should convert railway segment to polyline', () => {
      const segment: RailwaySegment = {
        id: 'segment-1',
        railwayId: 'railway-1',
        startNodeId: 'node-1',
        endNodeId: 'node-2',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
        floor: 0,
        hasCurve: false
      };

      const polyline = getPolyLine(segment);

      expect(polyline).toHaveLength(2);
      expect(polyline[0]).toEqual({ x: 0, y: 0 });
      expect(polyline[1]).toEqual({ x: 100, y: 100 });
    });

    it('should handle curved segments with control points', () => {
      const curvedSegment: RailwaySegment = {
        id: 'segment-curved',
        railwayId: 'railway-1',
        startNodeId: 'node-1',
        endNodeId: 'node-2',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 0,
        floor: 0,
        hasCurve: true,
        controlPointX: 50,
        controlPointY: 50
      };

      const polyline = getPolyLine(curvedSegment);

      expect(polyline.length).toBeGreaterThan(2);
      expect(polyline[0]).toEqual({ x: 0, y: 0 });
      expect(polyline[polyline.length - 1]).toEqual({ x: 100, y: 0 });

      // Check that curve goes above the line
      const maxY = Math.max(...polyline.map(p => p.y));
      expect(maxY).toBeGreaterThan(0);
    });

    it('should handle segments with custom resolution', () => {
      const segment: RailwaySegment = {
        id: 'segment-1',
        railwayId: 'railway-1',
        startNodeId: 'node-1',
        endNodeId: 'node-2',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 0,
        floor: 0,
        hasCurve: true,
        controlPointX: 50,
        controlPointY: 25
      };

      const lowRes = getPolyLine(segment, 5);
      const highRes = getPolyLine(segment, 50);

      expect(lowRes.length).toBeLessThan(highRes.length);
      expect(lowRes[0]).toEqual(highRes[0]);
      expect(lowRes[lowRes.length - 1]).toEqual(highRes[highRes.length - 1]);
    });
  });

  describe('findIntersections', () => {
    let segments: RailwaySegment[];

    beforeEach(() => {
      segments = [
        {
          id: 'segment-1',
          railwayId: 'railway-1',
          startNodeId: 'node-1',
          endNodeId: 'node-2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-2',
          railwayId: 'railway-2',
          startNodeId: 'node-3',
          endNodeId: 'node-4',
          startX: 50,
          startY: 0,
          endX: 50,
          endY: 100,
          floor: 0,
          hasCurve: false
        }
      ];
    });

    it('should find simple line intersections', () => {
      const intersections = findIntersections(segments);

      expect(intersections).toHaveLength(1);
      expect(intersections[0].x).toBeCloseTo(50);
      expect(intersections[0].y).toBeCloseTo(50);
      expect(intersections[0].segmentIds).toContain('segment-1');
      expect(intersections[0].segmentIds).toContain('segment-2');
    });

    it('should handle segments on different floors', () => {
      segments[1].floor = 1; // Move second segment to different floor

      const intersections = findIntersections(segments);

      expect(intersections).toHaveLength(0); // No intersections across floors
    });

    it('should detect multiple intersections', () => {
      // Add third segment that intersects both existing ones
      segments.push({
        id: 'segment-3',
        railwayId: 'railway-3',
        startNodeId: 'node-5',
        endNodeId: 'node-6',
        startX: 25,
        startY: 25,
        endX: 75,
        endY: 75,
        floor: 0,
        hasCurve: false
      });

      const intersections = findIntersections(segments);

      expect(intersections.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle curved segment intersections', () => {
      segments[0].hasCurve = true;
      segments[0].controlPointX = 50;
      segments[0].controlPointY = 25;

      const intersections = findIntersections(segments);

      expect(intersections).toHaveLength(1);
      // Intersection should be close to curve
      expect(intersections[0].y).toBeLessThan(50);
    });

    it('should filter out tangential intersections', () => {
      // Create segments that just touch at endpoints
      segments[0].endX = 50;
      segments[0].endY = 0;
      segments[1].startX = 50;
      segments[1].startY = 0;

      const intersections = findIntersections(segments, { ignoreTangential: true });

      expect(intersections).toHaveLength(0); // Tangential intersection ignored
    });

    it('should perform efficiently with large numbers of segments', () => {
      performanceHelper.startMeasurement('find-intersections-performance');

      // Create many segments for performance testing
      const manySegments: RailwaySegment[] = [];
      for (let i = 0; i < 100; i++) {
        manySegments.push({
          id: `segment-${i}`,
          railwayId: `railway-${i}`,
          startNodeId: `node-${i * 2}`,
          endNodeId: `node-${i * 2 + 1}`,
          startX: Math.random() * 1000,
          startY: Math.random() * 1000,
          endX: Math.random() * 1000,
          endY: Math.random() * 1000,
          floor: 0,
          hasCurve: false
        });
      }

      const intersections = findIntersections(manySegments);

      const measurement = performanceHelper.endMeasurement('find-intersections-performance');
      expect(measurement.duration).toBeLessThan(1000); // Should complete within 1 second

      expect(intersections).toBeDefined();
    });
  });

  describe('classifyIntersection', () => {
    it('should classify perpendicular intersections as cross', () => {
      const intersection = createMockIntersection({
        x: 50,
        y: 50,
        railwayIds: ['railway-1', 'railway-2']
      });

      // Create perpendicular segments
      const segments: RailwaySegment[] = [
        {
          id: 'segment-1',
          railwayId: 'railway-1',
          startNodeId: 'node-1',
          endNodeId: 'node-2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-2',
          railwayId: 'railway-2',
          startNodeId: 'node-3',
          endNodeId: 'node-4',
          startX: 50,
          startY: 0,
          endX: 50,
          endY: 100,
          floor: 0,
          hasCurve: false
        }
      ];

      const classification = classifyIntersection(intersection, segments);

      expect(classification.type).toBe('cross');
      expect(classification.angle).toBeCloseTo(90);
    });

    it('should classify acute angle intersections', () => {
      const intersection = createMockIntersection({
        x: 50,
        y: 50,
        railwayIds: ['railway-1', 'railway-2']
      });

      const segments: RailwaySegment[] = [
        {
          id: 'segment-1',
          railwayId: 'railway-1',
          startNodeId: 'node-1',
          endNodeId: 'node-2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-2',
          railwayId: 'railway-2',
          startNodeId: 'node-3',
          endNodeId: 'node-4',
          startX: 50,
          startY: 50,
          endX: 100,
          endY: 75, // Creates acute angle
          floor: 0,
          hasCurve: false
        }
      ];

      const classification = classifyIntersection(intersection, segments);

      expect(classification.type).toBe('acute');
      expect(classification.angle).toBeLessThan(90);
    });

    it('should classify T-junction intersections', () => {
      const intersection = createMockIntersection({
        x: 50,
        y: 50,
        railwayIds: ['railway-1', 'railway-2']
      });

      const segments: RailwaySegment[] = [
        {
          id: 'segment-1',
          railwayId: 'railway-1',
          startNodeId: 'node-1',
          endNodeId: 'node-2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-2',
          railwayId: 'railway-2',
          startNodeId: 'node-3',
          endNodeId: 'node-4',
          startX: 50,
          startY: 50, // Starts at intersection
          endX: 50,
          endY: 100,
          floor: 0,
          hasCurve: false
        }
      ];

      const classification = classifyIntersection(intersection, segments);

      expect(classification.type).toBe('t-junction');
    });
  });

  describe('detectAdvancedIntersections', () => {
    let complexSegments: RailwaySegment[];

    beforeEach(() => {
      complexSegments = [
        // Horizontal line
        {
          id: 'segment-h',
          railwayId: 'railway-h',
          startNodeId: 'node-h1',
          endNodeId: 'node-h2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        // Vertical line
        {
          id: 'segment-v',
          railwayId: 'railway-v',
          startNodeId: 'node-v1',
          endNodeId: 'node-v2',
          startX: 50,
          startY: 0,
          endX: 50,
          endY: 100,
          floor: 0,
          hasCurve: false
        },
        // Diagonal line creating multi-way intersection
        {
          id: 'segment-d',
          railwayId: 'railway-d',
          startNodeId: 'node-d1',
          endNodeId: 'node-d2',
          startX: 25,
          startY: 25,
          endX: 75,
          endY: 75,
          floor: 0,
          hasCurve: false
        }
      ];
    });

    it('should detect multi-way intersections', () => {
      const result = detectAdvancedIntersections(complexSegments);

      expect(result.intersections).toHaveLength(1);
      expect(result.intersections[0].railwayIds).toHaveLength(3);
      expect(result.intersections[0].type).toBe('multi-way');
    });

    it('should detect grade separations', () => {
      // Modify one segment to be on a different floor
      complexSegments[1].floor = 1;

      const result = detectAdvancedIntersections(complexSegments);

      expect(result.gradeSeparations).toHaveLength(1);
      expect(result.gradeSeparations[0].lowerFloor).toBe(0);
      expect(result.gradeSeparations[0].upperFloor).toBe(1);
    });

    it('should identify complex junction patterns', () => {
      // Add more segments to create complex junction
      complexSegments.push(
        {
          id: 'segment-ne',
          railwayId: 'railway-ne',
          startNodeId: 'node-ne1',
          endNodeId: 'node-ne2',
          startX: 50,
          startY: 50,
          endX: 100,
          endY: 0,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-nw',
          railwayId: 'railway-nw',
          startNodeId: 'node-nw1',
          endNodeId: 'node-nw2',
          startX: 50,
          startY: 50,
          endX: 0,
          endY: 0,
          floor: 0,
          hasCurve: false
        }
      );

      const result = detectAdvancedIntersections(complexSegments);

      expect(result.complexJunctions).toHaveLength(1);
      expect(result.complexJunctions[0].connectedRailways).toHaveLength(5);
    });

    it('should calculate intersection difficulty scores', () => {
      const result = detectAdvancedIntersections(complexSegments);

      expect(result.intersections[0]).toHaveProperty('difficultyScore');
      expect(result.intersections[0].difficultyScore).toBeGreaterThan(0);
      expect(result.intersections[0].difficultyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('findMultiWayIntersections', () => {
    it('should identify intersections with more than 2 railways', () => {
      const segments: RailwaySegment[] = [
        // Create star pattern - 4 segments meeting at center
        {
          id: 'segment-n',
          railwayId: 'railway-n',
          startNodeId: 'center',
          endNodeId: 'node-n',
          startX: 50,
          startY: 50,
          endX: 50,
          endY: 0,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-e',
          railwayId: 'railway-e',
          startNodeId: 'center',
          endNodeId: 'node-e',
          startX: 50,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-s',
          railwayId: 'railway-s',
          startNodeId: 'center',
          endNodeId: 'node-s',
          startX: 50,
          startY: 50,
          endX: 50,
          endY: 100,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'segment-w',
          railwayId: 'railway-w',
          startNodeId: 'center',
          endNodeId: 'node-w',
          startX: 50,
          startY: 50,
          endX: 0,
          endY: 50,
          floor: 0,
          hasCurve: false
        }
      ];

      const multiWay = findMultiWayIntersections(segments);

      expect(multiWay).toHaveLength(1);
      expect(multiWay[0].railwayIds).toHaveLength(4);
      expect(multiWay[0].x).toBeCloseTo(50);
      expect(multiWay[0].y).toBeCloseTo(50);
    });

    it('should handle clusters of nearby intersections', () => {
      const clusteredSegments: RailwaySegment[] = [];
      
      // Create multiple intersections in small area
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const startX = 50 + 5 * Math.cos(angle);
        const startY = 50 + 5 * Math.sin(angle);
        const endX = 50 + 50 * Math.cos(angle);
        const endY = 50 + 50 * Math.sin(angle);

        clusteredSegments.push({
          id: `segment-${i}`,
          railwayId: `railway-${i}`,
          startNodeId: `node-${i}-start`,
          endNodeId: `node-${i}-end`,
          startX,
          startY,
          endX,
          endY,
          floor: 0,
          hasCurve: false
        });
      }

      const multiWay = findMultiWayIntersections(clusteredSegments, { clusterTolerance: 10 });

      expect(multiWay.length).toBeGreaterThanOrEqual(1);
      expect(multiWay[0].railwayIds.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('analyzeGradeSeparation', () => {
    let multiFloorSegments: RailwaySegment[];

    beforeEach(() => {
      multiFloorSegments = [
        {
          id: 'ground-segment',
          railwayId: 'ground-railway',
          startNodeId: 'ground-1',
          endNodeId: 'ground-2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 0,
          hasCurve: false
        },
        {
          id: 'elevated-segment',
          railwayId: 'elevated-railway',
          startNodeId: 'elevated-1',
          endNodeId: 'elevated-2',
          startX: 0,
          startY: 50,
          endX: 100,
          endY: 50,
          floor: 1,
          hasCurve: false
        }
      ];
    });

    it('should identify overlapping segments on different floors', () => {
      const result = analyzeGradeSeparation(multiFloorSegments);

      expect(result.separations).toHaveLength(1);
      expect(result.separations[0].lowerSegment.floor).toBe(0);
      expect(result.separations[0].upperSegment.floor).toBe(1);
      expect(result.separations[0].overlapLength).toBeGreaterThan(0);
    });

    it('should calculate clearance requirements', () => {
      const result = analyzeGradeSeparation(multiFloorSegments);

      expect(result.separations[0]).toHaveProperty('clearanceRequired');
      expect(result.separations[0]).toHaveProperty('clearanceProvided');
      expect(result.separations[0].clearanceProvided).toBeGreaterThanOrEqual(4); // 1 floor = 4 meters
    });

    it('should detect potential conflict zones', () => {
      // Add segment that might cause clearance issues
      multiFloorSegments.push({
        id: 'mid-level',
        railwayId: 'mid-railway',
        startNodeId: 'mid-1',
        endNodeId: 'mid-2',
        startX: 25,
        startY: 25,
        endX: 75,
        endY: 75,
        floor: 0.5, // Half-floor might cause clearance issues
        hasCurve: false
      });

      const result = analyzeGradeSeparation(multiFloorSegments);

      expect(result.conflictZones).toHaveLength(1);
      expect(result.conflictZones[0].severity).toBeGreaterThan(0);
    });

    it('should suggest optimization opportunities', () => {
      const result = analyzeGradeSeparation(multiFloorSegments);

      expect(result.optimizations).toBeDefined();
      expect(result.optimizations.length).toBeGreaterThanOrEqual(0);
      
      if (result.optimizations.length > 0) {
        expect(result.optimizations[0]).toHaveProperty('type');
        expect(result.optimizations[0]).toHaveProperty('description');
        expect(result.optimizations[0]).toHaveProperty('estimatedSavings');
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large-scale intersection detection efficiently', () => {
      performanceHelper.startMeasurement('large-scale-intersection');

      // Create grid of intersecting segments
      const gridSegments: RailwaySegment[] = [];
      const gridSize = 20;
      
      // Horizontal lines
      for (let i = 0; i < gridSize; i++) {
        gridSegments.push({
          id: `h-${i}`,
          railwayId: `h-railway-${i}`,
          startNodeId: `h-${i}-start`,
          endNodeId: `h-${i}-end`,
          startX: 0,
          startY: i * 50,
          endX: gridSize * 50,
          endY: i * 50,
          floor: 0,
          hasCurve: false
        });
      }

      // Vertical lines
      for (let i = 0; i < gridSize; i++) {
        gridSegments.push({
          id: `v-${i}`,
          railwayId: `v-railway-${i}`,
          startNodeId: `v-${i}-start`,
          endNodeId: `v-${i}-end`,
          startX: i * 50,
          startY: 0,
          endX: i * 50,
          endY: gridSize * 50,
          floor: 0,
          hasCurve: false
        });
      }

      const intersections = findIntersections(gridSegments);
      const measurement = performanceHelper.endMeasurement('large-scale-intersection');

      expect(intersections).toHaveLength(gridSize * gridSize);
      expect(measurement.duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should optimize memory usage during complex operations', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform memory-intensive operations
      for (let i = 0; i < 100; i++) {
        const segments: RailwaySegment[] = Array.from({ length: 50 }, (_, j) => ({
          id: `segment-${i}-${j}`,
          railwayId: `railway-${i}-${j}`,
          startNodeId: `node-${i}-${j}-start`,
          endNodeId: `node-${i}-${j}-end`,
          startX: Math.random() * 1000,
          startY: Math.random() * 1000,
          endX: Math.random() * 1000,
          endY: Math.random() * 1000,
          floor: 0,
          hasCurve: false
        }));

        findIntersections(segments);
        detectAdvancedIntersections(segments);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should use spatial indexing for performance optimization', () => {
      performanceHelper.startMeasurement('spatial-indexing-test');

      // Create spatially distributed segments
      const spatialSegments: RailwaySegment[] = [];
      for (let x = 0; x < 100; x += 10) {
        for (let y = 0; y < 100; y += 10) {
          spatialSegments.push({
            id: `spatial-${x}-${y}`,
            railwayId: `spatial-railway-${x}-${y}`,
            startNodeId: `spatial-${x}-${y}-start`,
            endNodeId: `spatial-${x}-${y}-end`,
            startX: x,
            startY: y,
            endX: x + 5,
            endY: y + 5,
            floor: 0,
            hasCurve: false
          });
        }
      }

      const intersections = findIntersections(spatialSegments, { useSpatialIndex: true });
      const measurement = performanceHelper.endMeasurement('spatial-indexing-test');

      expect(measurement.duration).toBeLessThan(500); // Spatial indexing should be fast
      expect(intersections).toBeDefined();
    });
  });
});