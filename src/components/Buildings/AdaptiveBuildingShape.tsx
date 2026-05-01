/**
 * Adaptive Building Shape - Renderer-agnostic building component
 * Uses the renderer abstraction to work with both Konva and WebGL
 */

import React, { useMemo, useCallback } from 'react';
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';
import { Building, ConnectionPoint, RailwayConnectionPoint } from '../../types';
import { BUILDING_TYPES, PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';

// LOD levels for performance optimization
type LODLevel = 'low' | 'medium' | 'high';

interface AdaptiveBuildingShapeProps {
  adapter: RendererAdapter;
  item: Building;
  isSelected: boolean;
  lodLevel: LODLevel;
  renderQuality: number;
  batchIndex?: number;
  batchSize?: number;
}

// Color constants
const BUILDING_COLORS = {
  default: '#4A90E2',
  selected: '#FF6B35',
  hover: '#5BA0F2',
  connection: '#28A745',
  connectionActive: '#FFC107',
  connectionHover: '#17A2B8',
  railway: '#6C757D',
  railwayActive: '#28A745'
};

// Simplified connection point for LOD
const AdaptiveConnectionPoint: React.FC<{
  adapter: RendererAdapter;
  cp: ConnectionPoint;
  buildingX: number;
  buildingY: number;
  buildingRotation: number;
  lodLevel: LODLevel;
  isHighlighted: boolean;
  isActive: boolean;
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
}> = ({ adapter, cp, buildingX, buildingY, buildingRotation, lodLevel, isHighlighted, isActive, onMouseDown, onMouseUp }) => {
  
  // Calculate connection point world position
  const cpPosition = useMemo(() => {
    const rad = (buildingRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const cpX = buildingX + (cp.x * cos - cp.y * sin) * PIXELS_PER_METER;
    const cpY = buildingY + (cp.x * sin + cp.y * cos) * PIXELS_PER_METER;
    
    return { x: cpX, y: cpY };
  }, [cp, buildingX, buildingY, buildingRotation]);

  // Simplify rendering at low detail
  if (lodLevel === 'low') {
    return adapter.createCircle({
      id: `${cp.id}-simple`,
      x: cpPosition.x,
      y: cpPosition.y,
      radius: 20,
      fill: 'transparent',
      stroke: 'transparent',
      events: {
        onPointerDown: onMouseDown,
        onPointerUp: onMouseUp
      }
    });
  }

  // Medium and high detail rendering
  const radius = lodLevel === 'high' ? 8 : 6;
  const strokeWidth = lodLevel === 'high' ? 2 : 1;
  
  let fillColor = BUILDING_COLORS.connection;
  if (isActive) fillColor = BUILDING_COLORS.connectionActive;
  else if (isHighlighted) fillColor = BUILDING_COLORS.connectionHover;

  return adapter.createGroup({
    id: `${cp.id}-group`,
    children: (
      <>
        {/* Main connection circle */}
        {adapter.createCircle({
          id: `${cp.id}-main`,
          x: cpPosition.x,
          y: cpPosition.y,
          radius: radius,
          fill: fillColor,
          stroke: '#FFFFFF',
          strokeWidth: strokeWidth,
          events: {
            onPointerDown: onMouseDown,
            onPointerUp: onMouseUp
          }
        })}
        
        {/* Direction indicator for high detail */}
        {lodLevel === 'high' && cp.direction && adapter.createLine({
          id: `${cp.id}-direction`,
          points: [
            cpPosition.x,
            cpPosition.y,
            cpPosition.x + cp.direction.x * 15,
            cpPosition.y + cp.direction.y * 15
          ],
          stroke: '#FFFFFF',
          strokeWidth: 2,
          lineCap: 'round'
        })}
      </>
    )
  });
};

// Railway connection point component
const AdaptiveRailwayPoint: React.FC<{
  adapter: RendererAdapter;
  rp: RailwayConnectionPoint;
  buildingX: number;
  buildingY: number;
  buildingRotation: number;
  lodLevel: LODLevel;
}> = ({ adapter, rp, buildingX, buildingY, buildingRotation, lodLevel }) => {
  
  const rpPosition = useMemo(() => {
    const rad = (buildingRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rpX = buildingX + (rp.x * cos - rp.y * sin) * PIXELS_PER_METER;
    const rpY = buildingY + (rp.x * sin + rp.y * cos) * PIXELS_PER_METER;
    
    return { x: rpX, y: rpY };
  }, [rp, buildingX, buildingY, buildingRotation]);

  if (lodLevel === 'low') return null;

  const size = lodLevel === 'high' ? 10 : 8;

  return adapter.createRect({
    id: `${rp.id}-railway`,
    x: rpPosition.x - size / 2,
    y: rpPosition.y - size / 2,
    width: size,
    height: size,
    fill: BUILDING_COLORS.railway,
    stroke: '#FFFFFF',
    strokeWidth: 1
  });
};

export const AdaptiveBuildingShape: React.FC<AdaptiveBuildingShapeProps> = ({
  adapter,
  item: building,
  isSelected,
  lodLevel,
  renderQuality,
  batchIndex,
  batchSize
}) => {
  const { 
    selectBuilding, 
    startBuildingDrag, 
    endBuildingDrag,
    startDrawingConveyor,
    startDrawingPipe
  } = useLayoutStore();

  // Get building type configuration
  const buildingType = BUILDING_TYPES[building.type];
  if (!buildingType) return null;

  // Calculate building dimensions and position
  const width = buildingType.width * PIXELS_PER_METER;
  const height = buildingType.height * PIXELS_PER_METER;
  const buildingX = building.x * PIXELS_PER_METER;
  const buildingY = building.y * PIXELS_PER_METER;

  // Performance optimization: reduce visual complexity based on LOD and render quality
  const shouldShowDetails = lodLevel === 'high' && renderQuality > 0.7;
  const shouldShowConnections = lodLevel !== 'low' && renderQuality > 0.5;

  // Color based on selection state
  let fillColor = buildingType.color || BUILDING_COLORS.default;
  if (isSelected) fillColor = BUILDING_COLORS.selected;

  // Event handlers
  const handleClick = useCallback(() => {
    selectBuilding(building.id);
  }, [building.id, selectBuilding]);

  const handleDragStart = useCallback(() => {
    startBuildingDrag(building.id);
  }, [building.id, startBuildingDrag]);

  const handleDragEnd = useCallback((e: any) => {
    const newPos = adapter.screenToWorld({ x: e.target.x(), y: e.target.y() });
    endBuildingDrag(building.id, newPos.x / PIXELS_PER_METER, newPos.y / PIXELS_PER_METER);
  }, [building.id, endBuildingDrag, adapter]);

  const handleConnectionPointMouseDown = useCallback((cp: ConnectionPoint) => (e: any) => {
    e.cancelBubble = true;
    if (cp.type === 'fluid') {
      startDrawingPipe(building.id, cp.id);
    } else {
      startDrawingConveyor(building.id, cp.id);
    }
  }, [building.id, startDrawingPipe, startDrawingConveyor]);

  const handleConnectionPointMouseUp = useCallback((cp: ConnectionPoint) => (e: any) => {
    // Handle connection completion
    e.cancelBubble = true;
  }, []);

  // GPU optimization: use instanced rendering for large batches
  const useInstancedRendering = adapter.isGPURenderer() && batchSize && batchSize > 100;

  // Main building shape
  const buildingShape = adapter.createRect({
    id: `${building.id}-main`,
    x: buildingX - width / 2,
    y: buildingY - height / 2,
    width: width,
    height: height,
    fill: fillColor,
    stroke: isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.2)',
    strokeWidth: isSelected ? 3 : 1,
    cornerRadius: shouldShowDetails ? 4 : 0,
    rotation: building.rotation,
    draggable: true,
    events: {
      onClick: handleClick,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd
    }
  });

  // Building label (only at high detail)
  const buildingLabel = shouldShowDetails ? adapter.createText({
    id: `${building.id}-label`,
    x: buildingX,
    y: buildingY - height / 2 - 20,
    text: buildingType.name,
    fontSize: 12,
    fontFamily: 'Arial',
    fill: '#333',
    align: 'center'
  }) : null;

  // Connection points
  const connectionPoints = shouldShowConnections && buildingType.connectionPoints ? 
    buildingType.connectionPoints.map(cp => (
      <AdaptiveConnectionPoint
        key={cp.id}
        adapter={adapter}
        cp={cp}
        buildingX={buildingX}
        buildingY={buildingY}
        buildingRotation={building.rotation || 0}
        lodLevel={lodLevel}
        isHighlighted={false}
        isActive={false}
        onMouseDown={handleConnectionPointMouseDown(cp)}
        onMouseUp={handleConnectionPointMouseUp(cp)}
      />
    )) : [];

  // Railway points
  const railwayPoints = shouldShowDetails && buildingType.railwayPoints ? 
    buildingType.railwayPoints.map(rp => (
      <AdaptiveRailwayPoint
        key={rp.id}
        adapter={adapter}
        rp={rp}
        buildingX={buildingX}
        buildingY={buildingY}
        buildingRotation={building.rotation || 0}
        lodLevel={lodLevel}
      />
    )) : [];

  // Group all elements
  return adapter.createGroup({
    id: `building-${building.id}`,
    x: 0,
    y: 0,
    children: (
      <>
        {buildingShape}
        {buildingLabel}
        {connectionPoints}
        {railwayPoints}
      </>
    )
  });
};

export default AdaptiveBuildingShape;