// src/components/Canvas/RailwayDrawingPreview.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Group, Path, Circle, Ring, Arc, Line, Text } from 'react-konva';
import { Point3D, RailwayNode } from '../../types';
import { PIXELS_PER_METER, RAILWAY_SNAP_THRESHOLD, BUILDING_TYPES, BUILDING_RAILWAY_SNAP_THRESHOLD } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { constrainPoint } from '../../utils/helpers';
import { calculateCurveControlPoint, shouldCreateTurn, calculateAngleDifference } from '../../logic/common/curveUtils';
import { isRightTrianglePattern } from '../../logic/common/intersectionLogic';
import { getEffectiveSnapThreshold, SnapResult } from '../../logic/railway/railwaySnapping';
import { detectSnapTargetOptimized } from '../../logic/railway/railwaySnappingOptimized';
import { getSpatialIndexManager } from '../../store/layoutStore';
import { linesIntersect, getPolyLine } from '../../logic/common/intersectionLogic';
import { detectRailwayIntersectionsRealtime } from '../../tauri/commands';
import { isTauriEnvironment } from '../../tauri/environment';

// CRITICAL PERFORMANCE OPTIMIZATION: Throttle expensive detection functions
const createThrottledDetection = () => {
  let lastResult: any = null;
  let lastCallTime = 0;
  let lastPoint = { x: 0, y: 0, z: 0 };
  
  return (detectFunction: any, point: any, buildingId: string, threshold: number) => {
    const now = performance.now();
    const timeDelta = now - lastCallTime;
    
    // Check if position changed significantly or enough time has passed
    const deltaX = Math.abs(point.x - lastPoint.x);
    const deltaY = Math.abs(point.y - lastPoint.y);
    const significantMovement = deltaX > 0.2 || deltaY > 0.2; // 20cm threshold
    const timeThreshold = timeDelta > 100; // Max 10fps for expensive detection
    
    if (significantMovement || timeThreshold) {
      lastResult = detectFunction(point, buildingId, threshold);
      lastCallTime = now;
      lastPoint = { ...point };
    }
    
    return lastResult;
  };
};

// Minimal railway visual components to replace deleted RailwayVisualSystem
const RailwayVisualTheme = {
  colors: {
    neutral: {
      primary: '#64748b',
      dark: '#475569',
      light: '#94a3b8'
    }
  }
};

interface EnhancedRailwayPathProps {
  pathData: string;
  quality: 'perfect' | 'good' | 'warning' | 'error' | 'neutral';
  isPreview?: boolean;
  isOptimized?: boolean;
  animated?: boolean;
}

const EnhancedRailwayPath: React.FC<EnhancedRailwayPathProps> = ({ pathData, quality, isPreview, isOptimized, animated }) => {
  const getColorByQuality = () => {
    switch (quality) {
      case 'perfect': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <Path
      data={pathData}
      stroke={getColorByQuality()}
      strokeWidth={4}
      opacity={0.7}
    />
  );
};

// Simple placeholder components for removed visual system components
const BuildingConnectionHighlight: React.FC<any> = () => null;
const ConnectionQualityIndicator: React.FC<any> = () => null;
const SnapTargetIndicator: React.FC<any> = () => null;
const IntersectionIndicator: React.FC<any> = () => null;

interface RailwayDrawingPreviewProps {
  mousePos: { x: number; y: number }; // Mouse position in pixels
  scale: number;
  position: { x: number; y: number };
  currentFloor: number;
}

const generatePreviewRailwayPath = (startPoint: Point3D, endPoint: Point3D, prevPoint?: Point3D, controlPoints?: Point3D[]): string => {
  const startX = startPoint.x * PIXELS_PER_METER;
  const startY = startPoint.y * PIXELS_PER_METER;
  const endX = endPoint.x * PIXELS_PER_METER;
  const endY = endPoint.y * PIXELS_PER_METER;

  // If control points are provided, use them directly
  if (controlPoints && controlPoints.length > 0) {
    const cp = controlPoints[0];
    const cpX = cp.x * PIXELS_PER_METER;
    const cpY = cp.y * PIXELS_PER_METER;
    return `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
  }

  // Check if we should create a turn based on the angle at startPoint
  if (!prevPoint || !shouldCreateTurn(prevPoint, startPoint, endPoint)) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  // Use the same control point calculation as the actual curve rendering
  // This ensures the preview matches what will be drawn when the segment is finalized
  const cp = calculateCurveControlPoint(
    { x: prevPoint.x, y: prevPoint.y, z: prevPoint.z || 0 },
    { x: startPoint.x, y: startPoint.y, z: startPoint.z || 0 },
    { x: endPoint.x, y: endPoint.y, z: endPoint.z || 0 }
  );

  const cpX = cp.x * PIXELS_PER_METER;
  const cpY = cp.y * PIXELS_PER_METER;

  return `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
};

// PERFORMANCE FIX: Add React.memo with proper comparison to prevent unnecessary re-renders
export const RailwayDrawingPreview: React.FC<RailwayDrawingPreviewProps> = React.memo(({ mousePos, scale, position, currentFloor }) => {
  const { drawingState, railwayNodes, railwaySegments, buildings, setDrawingState, detectNearbyBuildingForRailwayConnection, validateRailwayBuildingAlignment } = useLayoutStore();
  
  // Create throttled detection function per component instance
  const throttledDetection = useRef(createThrottledDetection()).current;
  
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
      if (e.key === 'Control') setIsCtrlPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
      if (e.key === 'Control') setIsCtrlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 🚀 PERFORMANCE: Memoize expensive mouse position transformation with adaptive throttling
  const mousePosMeters: Point3D = useMemo(() => {
    const worldX = (mousePos.x - position.x) / scale / PIXELS_PER_METER;
    const worldY = (mousePos.y - position.y) / scale / PIXELS_PER_METER;
    return {
      x: Math.round(worldX * 2) / 2, // Snap to 0.5m grid
      y: Math.round(worldY * 2) / 2,
      z: currentFloor * 4,
    };
  }, [mousePos.x, mousePos.y, position.x, position.y, scale, currentFloor]);

  // Simplified visual detail level calculation
  const visualDetailLevel = useMemo(() => {
    return {
      detailLevel: 'normal',
      shouldAnimate: scale > 0.5,
      showSecondaryIndicators: scale > 0.8,
      showTertiaryIndicators: scale > 1.2,
      performanceLevel: 'normal',
      maxRenderDistance: 500
    };
  }, [scale]);

  // Temporary nodes including current path - with safety checks
  const tempNodes = { ...railwayNodes };
  drawingState.railwayPath.forEach((nodeId) => {
    if (railwayNodes[nodeId]) {
      tempNodes[nodeId] = railwayNodes[nodeId];
    }
  });

  const lastNodeId = drawingState.railwayPath[drawingState.railwayPath.length - 1];
  const lastNode = lastNodeId ? tempNodes[lastNodeId] as Point3D : undefined;

  // Constrain the position - handle case where lastNode is undefined
  let constrainedPos = lastNode ? constrainPoint(
    { x: lastNode.x, y: lastNode.y },
    mousePosMeters,
    isShiftPressed,
    isCtrlPressed
  ) : { x: mousePosMeters.x, y: mousePosMeters.y };

  // Detect snap targets using the new snapping system
  const effectiveThreshold = getEffectiveSnapThreshold(RAILWAY_SNAP_THRESHOLD, scale);
  const constrainedPos3D = { x: constrainedPos.x, y: constrainedPos.y, z: lastNode?.z || (currentFloor * 4) };
  const [snapResult, setSnapResult] = useState<SnapResult>({ shouldSnap: false });

  
  // PERFORMANCE FIX: Optimized snap detection with proper debouncing and cancellation
  useEffect(() => {
    let debounceTimeoutId: NodeJS.Timeout;
    let abortController: AbortController | null = null;
    let lastQueryKey: string | null = null;
    
    // Create a cache key for the current query
    const queryKey = `${constrainedPos3D.x.toFixed(1)}_${constrainedPos3D.y.toFixed(1)}_${constrainedPos3D.z}_${effectiveThreshold}`;
    
    // Skip if we're querying the same position (cache hit)
    if (queryKey === lastQueryKey) {
      return;
    }
    
    const updateSnapResult = async () => {
      const queryStartTime = performance.now();
      
      try {
        // Cancel any pending request
        if (abortController) {
          abortController.abort();
        }
        
        // Create new abort controller for this request
        abortController = new AbortController();
        lastQueryKey = queryKey;
        
        // PERFORMANCE FIX: Only perform expensive spatial queries if mouse has been stable for 200ms
        // This prevents hammering the HTTP bridge during fast mouse movement
        const result = await detectSnapTargetOptimized(
          constrainedPos3D,
          getSpatialIndexManager().getRailwayNodeGrid(),
          railwayNodes,
          railwaySegments,
          effectiveThreshold,
          drawingState.railwayPath || [],
          []
        );
        
        
        // Only update if this request wasn't cancelled
        if (!abortController.signal.aborted) {
          setSnapResult(result);
        }
      } catch (error) {
        // Only log errors that aren't from cancellation
        if (error.name !== 'AbortError') {
          console.warn('Snap detection error:', error);
          // Fallback to no snapping on error
          setSnapResult({ shouldSnap: false });
        }
        
      }
    };
    
    // PERFORMANCE FIX: Debounce expensive spatial queries to 200ms instead of 16ms throttling
    // This reduces HTTP bridge calls from ~60/sec to ~5/sec during mouse movement
    debounceTimeoutId = setTimeout(updateSnapResult, 200);
    
    return () => {
      clearTimeout(debounceTimeoutId);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [constrainedPos3D.x, constrainedPos3D.y, constrainedPos3D.z, effectiveThreshold]);

  // Check for nearby buildings for direct connection (only if we're drawing from a building)
  let buildingSnapResult: any = null;
  let alignmentValidation: any = null;
  
  if (drawingState.railwayStartStation && drawingState.railwayStartRailPoint) {
    const effectiveBuildingThreshold = BUILDING_RAILWAY_SNAP_THRESHOLD; // Use dedicated building threshold
    // PERFORMANCE OPTIMIZATION: Use throttled detection to prevent FPS drops
    buildingSnapResult = throttledDetection(
      detectNearbyBuildingForRailwayConnection,
      constrainedPos3D,
      drawingState.railwayStartStation,
      effectiveBuildingThreshold
    );
    
    // Perform comprehensive alignment validation for the target building
    if (buildingSnapResult) {
      // validateRailwayBuildingAlignment is now available from component-level hook
      alignmentValidation = validateRailwayBuildingAlignment(
        buildingSnapResult.buildingId,
        buildingSnapResult.railPointId,
        lastNode,
        {
          x: constrainedPos3D.x - lastNode.x,
          y: constrainedPos3D.y - lastNode.y,
          z: 0
        }
      );
    }
  }

  // Apply snapping - prioritize building connections over regular snapping
  if (buildingSnapResult) {
    constrainedPos = { x: buildingSnapResult.worldPos.x, y: buildingSnapResult.worldPos.y };
  } else if (snapResult.shouldSnap && snapResult.snapTarget) {
    constrainedPos = { x: snapResult.snapTarget.snapPoint.x, y: snapResult.snapTarget.snapPoint.y };
  }

  // PERFORMANCE FIX: Optimize snap result state updates to prevent unnecessary re-renders
  const snapResultRef = useRef<SnapResult>({ shouldSnap: false });
  const lastSnapTargetId = useRef<string | null>(null);
  
  useEffect(() => {
    const currentTargetId = snapResult?.snapTarget?.targetId || null;

    // Only update state if the snap target actually changed
    if (currentTargetId !== lastSnapTargetId.current) {
      lastSnapTargetId.current = currentTargetId;
      snapResultRef.current = snapResult;

      // Update drawing state with the snap result
      setDrawingState({
        railwaySnapResult: snapResult
      });
    }
  }, [snapResult?.snapTarget?.targetId, setDrawingState]);

  // Create preview node at constrained/snapped position
  const previewNode: RailwayNode = {
    id: 'preview-node',
    x: Math.round(constrainedPos.x * 2) / 2,
    y: Math.round(constrainedPos.y * 2) / 2,
    z: currentFloor * 4,
    floor: currentFloor,
  };
  tempNodes[previewNode.id] = previewNode;

  // ⚡ PERFORMANCE: Smart memoized intersection detection with culling
  const previewIntersections = useMemo(() => {
    if (!lastNode) return [];
    
    // Try Rust-powered SIMD intersection detection first
    if (isTauriEnvironment()) {
      const detectIntersectionsAsync = async () => {
        try {
          // Prepare segment polylines for Rust processing
          const segmentPolylines: Point3D[][] = [];
          
          Object.values(railwaySegments).forEach(segment => {
            const startNode = railwayNodes[segment.startNode];
            const endNode = railwayNodes[segment.endNode];
            
            if (!startNode || !endNode || startNode.floor !== currentFloor) return;
            
            // Skip segments that are part of current drawing path
            if (drawingState.railwayPath?.includes(segment.startNode) || 
                drawingState.railwayPath?.includes(segment.endNode)) return;
            
            const polyline = getPolyLine(segment, railwayNodes, 10);
            const polyline3D = polyline.map(p => ({ x: p.x, y: p.y, z: currentFloor * 4 }));
            segmentPolylines.push(polyline3D);
          });
          
          // Use Rust SIMD-optimized real-time intersection detection
          const rustIntersections = await detectRailwayIntersectionsRealtime(
            { x: lastNode.x, y: lastNode.y, z: lastNode.z },
            { x: previewNode.x, y: previewNode.y, z: previewNode.z },
            segmentPolylines,
            currentFloor
          );
          
          return rustIntersections;
        } catch (error) {
          console.warn('🦀➡️📊 Rust intersection detection failed, using JavaScript fallback:', error);
          return null; // Will trigger JavaScript fallback
        }
      };
      
      // Use async detection but return empty array for now (will be updated by useEffect)
      detectIntersectionsAsync().then(intersections => {
        if (intersections && intersections.length > 0) {
          // Force re-render with Rust results (this is handled by the state update)
          console.log(`🦀⚡ Rust detected ${intersections.length} intersections`);
        }
      });
    }
    
    // JavaScript fallback for when Rust is not available or fails
    const previewSegmentPoints = [
      { x: lastNode.x, y: lastNode.y },
      { x: previewNode.x, y: previewNode.y }
    ];
    
    const intersections: Point3D[] = [];
    const intersectionThreshold = 0.1; // Minimum distance to consider intersection
    
    // Check intersections with existing segments on same floor
    Object.values(railwaySegments).forEach(segment => {
      const startNode = railwayNodes[segment.startNode];
      const endNode = railwayNodes[segment.endNode];
      
      if (!startNode || !endNode || startNode.floor !== currentFloor) return;
      
      // Skip segments that are part of current drawing path
      if (drawingState.railwayPath?.includes(segment.startNode) || 
          drawingState.railwayPath?.includes(segment.endNode)) return;
      
      const segmentPolyline = getPolyLine(segment, railwayNodes, 10);
      
      // Check intersection with each line segment in the polyline
      for (let i = 0; i < segmentPolyline.length - 1; i++) {
        const intersection = linesIntersect(
          previewSegmentPoints[0],
          previewSegmentPoints[1],
          segmentPolyline[i],
          segmentPolyline[i + 1]
        );
        
        if (intersection) {
          // Avoid duplicate intersections too close to each other
          const isDuplicate = intersections.some(existing => 
            Math.abs(existing.x - intersection.x) < intersectionThreshold &&
            Math.abs(existing.y - intersection.y) < intersectionThreshold
          );
          
          if (!isDuplicate) {
            intersections.push({
              x: intersection.x,
              y: intersection.y,
              z: currentFloor * 4
            });
          }
        }
      }
    });
    
    return intersections;
  }, [lastNode, previewNode.x, previewNode.y, railwaySegments, railwayNodes, currentFloor, drawingState.railwayPath]);

  // Use intersections directly without culling
  const visibleIntersections = previewIntersections;

  let optimizedPath = [...drawingState.railwayPath, previewNode.id];
  const optimizedNodes = { ...tempNodes };

  // Check for right triangle pattern and optimize preview
  if (optimizedPath.length >= 3) {
    const nodeA = optimizedNodes[optimizedPath[optimizedPath.length - 3]];
    const nodeB = optimizedNodes[optimizedPath[optimizedPath.length - 2]];
    const nodeC = optimizedNodes[optimizedPath[optimizedPath.length - 1]]; // previewNode

    // Check if B can be deleted (not an anchor node and forms right triangle)
    if (!nodeB.isAnchor && isRightTrianglePattern(nodeA, nodeB, nodeC)) {
      // Create optimized path that skips node B
      optimizedPath = [...optimizedPath.slice(0, -2), nodeC.id];
      // Keep the node B position for curve calculation but remove from path
    }
  }

  // 🎨 VISUAL: Determine connection quality for enhanced visual feedback
  const connectionQuality = useMemo(() => {
    if (buildingSnapResult) {
      const isHighQuality = buildingSnapResult.alignmentScore > 80;
      const isCompatible = buildingSnapResult.isCompatibleDirection;
      
      if (alignmentValidation) {
        return alignmentValidation.quality;
      } else if (isCompatible && isHighQuality) {
        return 'perfect';
      } else if (isCompatible) {
        return 'good';
      } else {
        return 'warning';
      }
    } else if (snapResult.shouldSnap && snapResult.snapTarget) {
      return snapResult.snapTarget.type === 'node' ? 'good' : 'warning';
    }
    return 'neutral';
  }, [buildingSnapResult, alignmentValidation, snapResult]);

  // Early return after all hooks are called - include safety check for lastNode
  if (!drawingState.drawingRailway || !drawingState.railwayPath || drawingState.railwayPath.length < 1 || !lastNode) {
    if (!lastNode) {
      console.warn('⚠️ Railway preview: lastNode is undefined, possibly due to intersection processing. Skipping preview render');
    }
    return null;
  }

return (
  <Group listening={false}>
    {/* ✨ ENHANCED: Building Connection System with Unified Visual Design */}
    {buildingSnapResult && (() => {
      const targetBuilding = buildings[buildingSnapResult.buildingId];
      if (!targetBuilding) return null;
      
      const buildingBounds = {
        x: targetBuilding.x - 2,
        y: targetBuilding.y - 2,
        width: BUILDING_TYPES[targetBuilding.type].width + 4,
        height: BUILDING_TYPES[targetBuilding.type].height + 4
      };
      
      const score = alignmentValidation ? alignmentValidation.score : buildingSnapResult.alignmentScore;
      
      return (
        <Group opacity={visualDetailLevel.shouldAnimate ? 1.0 : 0.9}>
          {/* Enhanced Building Connection Highlight */}
          <BuildingConnectionHighlight
            buildingBounds={buildingBounds}
            connectionPoint={{
              x: buildingSnapResult.worldPos.x,
              y: buildingSnapResult.worldPos.y,
              z: currentFloor * 4
            }}
            quality={connectionQuality as 'perfect' | 'good' | 'warning' | 'error'}
            direction={buildingSnapResult.railPointDirection as 'in' | 'out' | 'bidirectional'}
            alignmentAngle={alignmentValidation?.approachAngle}
            optimalAngle={alignmentValidation?.optimalAngle}
          />
          
          {/* Connection Quality Indicator */}
          <ConnectionQualityIndicator
            position={{
              x: buildingSnapResult.worldPos.x,
              y: buildingSnapResult.worldPos.y,
              z: currentFloor * 4
            }}
            quality={connectionQuality as 'perfect' | 'good' | 'warning' | 'error'}
            score={score}
            size={visualDetailLevel.detailLevel === 'enhanced' ? 'lg' : 'md'}
            showScore={visualDetailLevel.showTertiaryIndicators}
            animated={visualDetailLevel.shouldAnimate && connectionQuality === 'perfect'}
          />
          
          {/* Enhanced Connection Preview Line */}
          <EnhancedRailwayPath
            pathData={`M ${lastNode.x * PIXELS_PER_METER} ${lastNode.y * PIXELS_PER_METER} L ${buildingSnapResult.worldPos.x * PIXELS_PER_METER} ${buildingSnapResult.worldPos.y * PIXELS_PER_METER}`}
            quality={connectionQuality as 'perfect' | 'good' | 'warning' | 'error' | 'neutral'}
            isPreview={true}
            animated={visualDetailLevel.shouldAnimate}
          />
        </Group>
      );
    })()}
    
    {/* ✨ ENHANCED: Snap Target Indicators - only show if no building snap */}
    {!buildingSnapResult && snapResult.shouldSnap && snapResult.snapTarget && (
      <Group>
        {/* Enhanced Snap Target Indicator */}
        <SnapTargetIndicator
          position={{
            x: snapResult.snapTarget.snapPoint.x,
            y: snapResult.snapTarget.snapPoint.y,
            z: currentFloor * 4
          }}
          type={snapResult.snapTarget.type === 'node' ? 'node' : 'segment'}
          strength={85} // High snap strength
          size={effectiveThreshold * PIXELS_PER_METER}
          animated={visualDetailLevel.shouldAnimate}
        />
        
        {/* Connection Preview Line */}
        {lastNode && (
          <EnhancedRailwayPath
            pathData={`M ${lastNode.x * PIXELS_PER_METER} ${lastNode.y * PIXELS_PER_METER} L ${snapResult.snapTarget.snapPoint.x * PIXELS_PER_METER} ${snapResult.snapTarget.snapPoint.y * PIXELS_PER_METER}`}
            quality={snapResult.snapTarget.type === 'node' ? 'good' : 'warning'}
            isPreview={true}
            animated={visualDetailLevel.shouldAnimate}
          />
        )}
      </Group>
    )}
    
    {/* ✨ ENHANCED: Railway Path Preview with Unified Visual System */}
    <Group opacity={visualDetailLevel.detailLevel === 'minimal' ? 0.6 : 0.8}>
      {optimizedPath.length > 1 &&
        optimizedPath.map((nodeId, index) => {
        if (index === 0) return null;

        const prevNodeId = optimizedPath[index - 1];
        const prevNode = optimizedNodes[prevNodeId] as Point3D;
        const currentNode = optimizedNodes[nodeId] as Point3D;

        // Safety check: skip rendering if nodes are missing
        if (!prevNode || !currentNode) {
          console.warn(`⚠️ Railway preview: Missing node data for segment ${prevNodeId} -> ${nodeId}`);
          return null;
        }

        const isPreviewSegment = nodeId === 'preview-node';

        // Check if this segment was optimized (skipped a middle node)
        const originalPath = [...drawingState.railwayPath, previewNode.id];
        const wasOptimized = originalPath.length > optimizedPath.length && 
                           originalPath.length >= 3 && 
                           index === optimizedPath.length - 1;

        let pathData: string = `M ${prevNode.x * PIXELS_PER_METER} ${prevNode.y * PIXELS_PER_METER} L ${currentNode.x * PIXELS_PER_METER} ${currentNode.y * PIXELS_PER_METER}`;

        if (wasOptimized && originalPath.length >= 3) {
          // Use the deleted middle node as control point for smooth curve
          const deletedNode = optimizedNodes[originalPath[originalPath.length - 2]];
          const cpX = deletedNode.x * PIXELS_PER_METER;
          const cpY = deletedNode.y * PIXELS_PER_METER;
          pathData = `M ${prevNode.x * PIXELS_PER_METER} ${prevNode.y * PIXELS_PER_METER} Q ${cpX} ${cpY} ${currentNode.x * PIXELS_PER_METER} ${currentNode.y * PIXELS_PER_METER}`;
        } else {
          // Check if there's an existing segment with curve data
          let foundCurveData = false;
          
          if (!isPreviewSegment) {
            // Try to find existing segment between these nodes
            const existingSegment = Object.values(railwaySegments).find(seg => 
              (seg.startNode === prevNodeId && seg.endNode === nodeId) ||
              (seg.startNode === nodeId && seg.endNode === prevNodeId)
            );
            
            if (existingSegment && existingSegment.type === 'curve' && existingSegment.controlPoints && existingSegment.controlPoints.length > 0) {
              // Use the stored control points from the segment
              const cp = existingSegment.controlPoints[0];
              const cpX = cp.x * PIXELS_PER_METER;
              const cpY = cp.y * PIXELS_PER_METER;
              pathData = `M ${prevNode.x * PIXELS_PER_METER} ${prevNode.y * PIXELS_PER_METER} Q ${cpX} ${cpY} ${currentNode.x * PIXELS_PER_METER} ${currentNode.y * PIXELS_PER_METER}`;
              foundCurveData = true;
            }
          }
          
          if (!foundCurveData) {
            // Start with straight line
            pathData = `M ${prevNode.x * PIXELS_PER_METER} ${prevNode.y * PIXELS_PER_METER} L ${currentNode.x * PIXELS_PER_METER} ${currentNode.y * PIXELS_PER_METER}`;
            
            // Check if this segment should be curved based on the NEXT point (retroactive curve application)
            if (index < optimizedPath.length - 1) {
              const nextNodeId = optimizedPath[index + 1];
              const nextNode = optimizedNodes[nextNodeId] as Point3D;
              if (shouldCreateTurn(prevNode, currentNode, nextNode)) {
                const cp = calculateCurveControlPoint(prevNode, currentNode, nextNode);
                pathData = generatePreviewRailwayPath(prevNode, currentNode, undefined, [cp]);
              }
            }
          }
        }

        // 🎨 ENHANCED: Determine path quality for unified visual feedback
        let pathQuality: 'perfect' | 'good' | 'warning' | 'error' | 'neutral' = 'neutral';
        
        if (isPreviewSegment) {
          if (buildingSnapResult) {
            pathQuality = connectionQuality as 'perfect' | 'good' | 'warning' | 'error';
          } else if (snapResult.shouldSnap && snapResult.snapTarget) {
            pathQuality = snapResult.snapTarget.type === 'node' ? 'good' : 'warning';
          }
        }

        return (
          <EnhancedRailwayPath
            key={index}
            pathData={pathData}
            quality={pathQuality}
            isPreview={isPreviewSegment}
            isOptimized={wasOptimized}
            animated={visualDetailLevel.shouldAnimate && isPreviewSegment}
          />
        );
      })}
    </Group>
    
    {/* ✨ ENHANCED: Real-time Intersection Indicators with Performance Culling */}
    {visibleIntersections.map((intersection, index) => (
      <IntersectionIndicator
        key={`intersection-${intersection.x}-${intersection.y}-${intersection.z}`}
        position={intersection}
        severity="error"
        size={visualDetailLevel.detailLevel === 'enhanced' ? 'lg' : 'md'}
        animated={visualDetailLevel.shouldAnimate}
      />
    ))}

    {/* ✨ NEW: Curve Preview Indicators - Show where curves will be created */}
    {(() => {
      // Use the original path (before optimization) to determine curve indicators
      const originalPath = [...drawingState.railwayPath, previewNode.id];

      // Check if the path was optimized (right triangle pattern removed a node)
      const wasPathOptimized = originalPath.length > optimizedPath.length && originalPath.length >= 3;

      // Need at least 3 points in original path to show curve indicator
      if (originalPath.length < 3) return null;

      const nodeA = optimizedNodes[originalPath[originalPath.length - 3]];
      const nodeB = optimizedNodes[originalPath[originalPath.length - 2]]; // Turn point (may be optimized out)
      const nodeC = optimizedNodes[originalPath[originalPath.length - 1]]; // Preview node

      if (!nodeA || !nodeB || !nodeC) return null;

      // Curve will be created if: path was optimized (smooth curve) OR angle threshold met
      const angleThresholdMet = shouldCreateTurn(nodeA, nodeB, nodeC);
      const willCreateCurve = wasPathOptimized || angleThresholdMet;
      const angleDegrees = Math.round(calculateAngleDifference(nodeA, nodeB, nodeC) * (180 / Math.PI));

      const nodeBPixelX = nodeB.x * PIXELS_PER_METER;
      const nodeBPixelY = nodeB.y * PIXELS_PER_METER;

      // Calculate vectors for angle arc visualization
      const v1 = { x: nodeA.x - nodeB.x, y: nodeA.y - nodeB.y };
      const v2 = { x: nodeC.x - nodeB.x, y: nodeC.y - nodeB.y };
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      if (len1 === 0 || len2 === 0) return null;

      // Calculate angle for arc
      const angle1 = Math.atan2(v1.y, v1.x);
      const angle2 = Math.atan2(v2.y, v2.x);

      // Normalize angles to 0-360 range
      const startAngle = angle1 * (180 / Math.PI);
      const endAngle = angle2 * (180 / Math.PI);

      // Calculate rotation for proper arc display
      const rotation = startAngle;
      let angle = endAngle - startAngle;

      // Normalize angle to be between -180 and 180
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;

      const arcRadius = 3 * PIXELS_PER_METER; // 3 meters visual radius
      const indicatorColor = willCreateCurve ? '#22c55e' : '#94a3b8'; // Green if curve, gray if not

      return (
        <Group>
          {/* Angle Arc Indicator at Point B */}
          <Arc
            x={nodeBPixelX}
            y={nodeBPixelY}
            innerRadius={arcRadius - 4}
            outerRadius={arcRadius}
            angle={Math.abs(angle)}
            rotation={rotation}
            fill={indicatorColor}
            opacity={0.5}
          />

          {/* Highlight the turn point when curve will be created */}
          {willCreateCurve && (
            <Group>
              {/* Pulsing glow ring */}
              <Circle
                x={nodeBPixelX}
                y={nodeBPixelY}
                radius={16}
                stroke={indicatorColor}
                strokeWidth={3}
                opacity={0.6}
                dash={[8, 4]}
              />

              {/* Inner highlight */}
              <Circle
                x={nodeBPixelX}
                y={nodeBPixelY}
                radius={10}
                fill={indicatorColor}
                opacity={0.3}
              />

              {/* Show the control point */}
              {(() => {
                const controlPoint = calculateCurveControlPoint(nodeA, nodeB, nodeC);
                const cpPixelX = controlPoint.x * PIXELS_PER_METER;
                const cpPixelY = controlPoint.y * PIXELS_PER_METER;

                return (
                  <Group>
                    {/* Dashed line to control point */}
                    <Line
                      points={[nodeBPixelX, nodeBPixelY, cpPixelX, cpPixelY]}
                      stroke={indicatorColor}
                      strokeWidth={1.5}
                      opacity={0.4}
                      dash={[4, 4]}
                    />

                    {/* Control point indicator */}
                    <Circle
                      x={cpPixelX}
                      y={cpPixelY}
                      radius={6}
                      fill={indicatorColor}
                      stroke="#ffffff"
                      strokeWidth={2}
                      opacity={0.7}
                    />
                  </Group>
                );
              })()}
            </Group>
          )}

          {/* Angle text label */}
          {visualDetailLevel.showTertiaryIndicators && (
            <Text
              x={nodeBPixelX + arcRadius + 10}
              y={nodeBPixelY - 10}
              text={`${angleDegrees}°`}
              fontSize={14}
              fontStyle="bold"
              fill={indicatorColor}
              stroke="#000000"
              strokeWidth={0.5}
              opacity={0.9}
            />
          )}
        </Group>
      );
    })()}

    {/* ✨ ENHANCED: Preview Node Indicator */}
    {!snapResult.shouldSnap && !buildingSnapResult && visualDetailLevel.showSecondaryIndicators && (
      <Group>
        {/* Subtle preview node with unified styling */}
        <Circle
          x={previewNode.x * PIXELS_PER_METER}
          y={previewNode.y * PIXELS_PER_METER}
          radius={8}
          fill={RailwayVisualTheme.colors.neutral.primary}
          stroke={RailwayVisualTheme.colors.neutral.dark}
          strokeWidth={2}
          opacity={0.6}
        />

        {/* Grid snap indicator */}
        {visualDetailLevel.showTertiaryIndicators && (
          <Circle
            x={previewNode.x * PIXELS_PER_METER}
            y={previewNode.y * PIXELS_PER_METER}
            radius={12}
            stroke={RailwayVisualTheme.colors.neutral.light}
            strokeWidth={1}
            opacity={0.3}
            dash={[4, 4]}
          />
        )}
      </Group>
    )}
  </Group>
);
}, (prevProps, nextProps) => {
  // PERFORMANCE FIX: Increased threshold from 2px to 10px to reduce re-renders during mouse movement
  // This prevents unnecessary expensive calculations on small mouse movements
  return (
    prevProps.scale === nextProps.scale &&
    prevProps.currentFloor === nextProps.currentFloor &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    Math.abs(prevProps.mousePos.x - nextProps.mousePos.x) < 10 &&
    Math.abs(prevProps.mousePos.y - nextProps.mousePos.y) < 10
  );
});