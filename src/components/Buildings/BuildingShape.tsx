// src/components/Buildings/BuildingShape.tsx - Ultra-optimized with LOD system and enhanced connection points

import React, { useCallback, useMemo } from 'react';
import { Group, Rect, Text, Circle, Arrow, Line } from 'react-konva';
import { Building, ConnectionPoint, RailwayConnectionPoint } from '../../types';
import { BUILDING_TYPES, PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { EnhancedConnectionPointShape } from './EnhancedConnectionPointShape';

// Station building type identifiers
const STATION_BUILDING_TYPES = ['train_station', 'freight_platform', 'fluid_freight_platform', 'empty_platform'] as const;
type StationBuildingType = typeof STATION_BUILDING_TYPES[number];

// Check if a building type is a station/platform type
const isStationBuilding = (type: string): type is StationBuildingType => {
  return STATION_BUILDING_TYPES.includes(type as StationBuildingType);
};

// Calculate the bounding box of a rotated rectangle
// For buildings that only rotate in 90-degree increments, this gives the exact bounding box
const getRotatedBoundingBox = (width: number, height: number, rotationDegrees: number): { width: number; height: number } => {
  // Normalize rotation to 0-360
  const normalizedRotation = ((rotationDegrees % 360) + 360) % 360;

  // For 90-degree increments (common in this app), use exact values
  if (normalizedRotation === 0 || normalizedRotation === 180) {
    return { width, height };
  }
  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return { width: height, height: width };
  }

  // For arbitrary angles, calculate the actual bounding box
  const radians = (normalizedRotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos
  };
};

// Performance constants for LOD system
const LOD_HIGH_DETAIL_THRESHOLD = 1.5;
const LOD_MEDIUM_DETAIL_THRESHOLD = 0.5;

type LODLevel = 'low' | 'medium' | 'high';

// Determine LOD level based on zoom scale and performance mode's lodBias
// lodBias acts as a multiplier: higher values = more detail at lower zoom
// - high mode: lodBias = 1.0 (normal thresholds)
// - medium mode: lodBias = 0.7 (need higher zoom for same detail)
// - low mode: lodBias = 0.25 (much higher zoom needed for detail)
const getLODLevel = (scale: number, lodBias: number = 1.0): LODLevel => {
  // Effective scale is increased by lodBias, so lower lodBias = lower effective scale = lower LOD
  const effectiveScale = scale * lodBias;
  if (effectiveScale >= LOD_HIGH_DETAIL_THRESHOLD) return 'high';
  if (effectiveScale >= LOD_MEDIUM_DETAIL_THRESHOLD) return 'medium';
  return 'low';
};

interface BuildingShapeProps {
  building: Building;
  isSelected: boolean;
  isGhost?: boolean;
  opacity?: number;
  scale?: number; // Add scale prop for LOD system
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (e: any) => void;
}

// Ultra-simplified connection point component - MASSIVE shape reduction (15-25 shapes -> 1-2 shapes)
// Colors swapped to match Satisfactory game: INPUTS = ORANGE, OUTPUTS = GREEN
// Fluid ports now use BLUE color scheme
const SIMPLE_CONNECTION_COLORS = {
  input: '#FA9549',           // Satisfactory orange (inputs)
  output: '#4a7c59',          // Muted green (outputs)
  bidirectional: '#7CD2B9',   // Satisfactory teal
  fluid_input: '#3b82f6',     // Blue for fluid inputs
  fluid_output: '#06b6d4',    // Cyan for fluid outputs
  fluid_bidirectional: '#8b5cf6', // Purple for fluid bidirectional
};

const ConnectionPointShape = React.memo<{
  cp: ConnectionPoint;
  cpX: number;
  cpY: number;
  lodLevel: LODLevel;
  isHighlighted: boolean;
  isActive: boolean;
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
}>(({ cp, cpX, cpY, lodLevel, isHighlighted, isActive, onMouseDown, onMouseUp }) => {
  // Skip rendering connection points at low detail
  if (lodLevel === 'low') {
    return (
      <Circle
        x={cpX}
        y={cpY}
        radius={20}
        fill="transparent"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        name="connection"
      />
    );
  }

  // Simplified visual for medium/high detail with industrial colors
  const radius = lodLevel === 'high' ? 7 : 5;
  const colorKey = cp.isFluid
    ? `fluid_${cp.type}` as keyof typeof SIMPLE_CONNECTION_COLORS
    : cp.type as keyof typeof SIMPLE_CONNECTION_COLORS;
  const color = SIMPLE_CONNECTION_COLORS[colorKey] || SIMPLE_CONNECTION_COLORS.bidirectional;

  return (
    <Group>
      {/* Single shape for connection indicator */}
      <Circle
        x={cpX}
        y={cpY}
        radius={radius}
        fill={color}
        stroke={isHighlighted ? '#ffffff' : 'rgba(0,0,0,0.3)'}
        strokeWidth={isHighlighted ? 2 : 1}
        opacity={isActive ? 1 : 0.85}
        listening={false}
      />

      {/* Hitbox */}
      <Circle
        x={cpX}
        y={cpY}
        radius={20}
        fill="transparent"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        name="connection"
      />
    </Group>
  );
});

ConnectionPointShape.displayName = 'ConnectionPointShape';

// Specialized rendering for train station/freight platform buildings
const StationBuildingDetails = React.memo<{
  buildingType: StationBuildingType;
  pixelWidth: number;
  pixelHeight: number;
  lodLevel: LODLevel;
  isSelected: boolean;
  isGhost: boolean;
}>(({ buildingType, pixelWidth, pixelHeight, lodLevel, isSelected, isGhost }) => {
  // Station buildings are 16m wide x 34m deep
  // Railway runs left-to-right through the center (y = 17m = center)
  const trackCenterY = pixelHeight / 2; // Center of building (17m scaled)
  const trackWidth = pixelWidth; // Full width (16m scaled)
  const railOffset = 3; // Rail spacing from center

  // Color schemes for different building types
  const colorSchemes = {
    train_station: {
      platform: '#2d3a4a',      // Dark blue-gray platform
      platformEdge: '#4a5a6a',  // Lighter edge
      trackBed: '#3d2d1d',      // Dark brown track bed
      rails: '#a0a0a0',         // Steel gray rails
      accent: '#f59e0b',        // Amber accent (station marker)
      stripe: '#475569',        // Platform stripe
      canopy: 'rgba(74, 90, 106, 0.6)', // Semi-transparent canopy
    },
    freight_platform: {
      platform: '#3a4a3a',      // Dark green-gray platform
      platformEdge: '#5a6a5a',  // Lighter green edge
      trackBed: '#3d2d1d',      // Dark brown track bed
      rails: '#a0a0a0',         // Steel gray rails
      accent: '#22c55e',        // Green accent (cargo)
      stripe: '#4a5a4a',        // Platform stripe
      cargo: '#6b7280',         // Cargo container color
    },
    fluid_freight_platform: {
      platform: '#2a3a4a',      // Dark blue-gray platform
      platformEdge: '#4a6a7a',  // Lighter blue edge
      trackBed: '#3d2d1d',      // Dark brown track bed
      rails: '#a0a0a0',         // Steel gray rails
      accent: '#3b82f6',        // Blue accent (fluid)
      stripe: '#4a5a6a',        // Platform stripe
      tank: '#4a6a7a',          // Tank color
      pipe: '#6b8a9a',          // Pipe color
    },
    empty_platform: {
      platform: '#3a3a3a',      // Neutral gray platform
      platformEdge: '#5a5a5a',  // Lighter gray edge
      trackBed: '#3d2d1d',      // Dark brown track bed
      rails: '#a0a0a0',         // Steel gray rails
      accent: '#6b7280',        // Gray accent
      stripe: '#4a4a4a',        // Platform stripe
    }
  };

  const colors = colorSchemes[buildingType];
  const ghostOpacity = isGhost ? 0.5 : 1;

  // Skip most details at low LOD
  if (lodLevel === 'low') {
    return (
      <Group opacity={ghostOpacity}>
        {/* Simple track indicator */}
        <Line
          points={[0, trackCenterY, pixelWidth, trackCenterY]}
          stroke={colors.trackBed}
          strokeWidth={20}
          listening={false}
        />
        <Line
          points={[0, trackCenterY - railOffset, pixelWidth, trackCenterY - railOffset]}
          stroke={colors.rails}
          strokeWidth={3}
          listening={false}
        />
        <Line
          points={[0, trackCenterY + railOffset, pixelWidth, trackCenterY + railOffset]}
          stroke={colors.rails}
          strokeWidth={3}
          listening={false}
        />
      </Group>
    );
  }

  // Calculate tie positions for track
  const tieSpacing = 15; // pixels between ties
  const numTies = Math.floor(trackWidth / tieSpacing);

  return (
    <Group opacity={ghostOpacity}>
      {/* ========== TRACK BED & RAILS ========== */}
      {/* Track ballast/bed - full width */}
      <Rect
        x={-5}
        y={trackCenterY - 12}
        width={pixelWidth + 10}
        height={24}
        fill={colors.trackBed}
        cornerRadius={2}
        shadowBlur={lodLevel === 'high' ? 4 : 0}
        shadowColor="rgba(0,0,0,0.4)"
        shadowOffsetY={2}
        listening={false}
      />

      {/* Track ballast texture */}
      <Rect
        x={-3}
        y={trackCenterY - 10}
        width={pixelWidth + 6}
        height={20}
        fill="#4a3a2a"
        opacity={0.6}
        listening={false}
      />

      {/* Railway ties/sleepers */}
      {Array.from({ length: numTies + 1 }).map((_, i) => {
        const tieX = i * tieSpacing;
        return (
          <Group key={`tie-${i}`}>
            {/* Tie shadow */}
            <Rect
              x={tieX - 2}
              y={trackCenterY - 9}
              width={4}
              height={19}
              fill="rgba(0,0,0,0.3)"
              listening={false}
            />
            {/* Main tie */}
            <Rect
              x={tieX - 2}
              y={trackCenterY - 10}
              width={4}
              height={20}
              fill="#5d4e37"
              cornerRadius={1}
              listening={false}
            />
          </Group>
        );
      })}

      {/* Left rail */}
      <Line
        points={[-5, trackCenterY - railOffset, pixelWidth + 5, trackCenterY - railOffset]}
        stroke={colors.rails}
        strokeWidth={4}
        shadowBlur={2}
        shadowColor="rgba(0,0,0,0.5)"
        listening={false}
      />
      {/* Left rail highlight */}
      <Line
        points={[-5, trackCenterY - railOffset - 1, pixelWidth + 5, trackCenterY - railOffset - 1]}
        stroke="#d0d0d0"
        strokeWidth={1}
        opacity={0.7}
        listening={false}
      />

      {/* Right rail */}
      <Line
        points={[-5, trackCenterY + railOffset, pixelWidth + 5, trackCenterY + railOffset]}
        stroke={colors.rails}
        strokeWidth={4}
        shadowBlur={2}
        shadowColor="rgba(0,0,0,0.5)"
        listening={false}
      />
      {/* Right rail highlight */}
      <Line
        points={[-5, trackCenterY + railOffset - 1, pixelWidth + 5, trackCenterY + railOffset - 1]}
        stroke="#d0d0d0"
        strokeWidth={1}
        opacity={0.7}
        listening={false}
      />

      {/* ========== PLATFORM AREAS ========== */}
      {/* Front platform (top in 2D) */}
      <Rect
        x={2}
        y={2}
        width={pixelWidth - 4}
        height={trackCenterY - 18}
        fill={colors.platform}
        stroke={colors.platformEdge}
        strokeWidth={1}
        cornerRadius={2}
        listening={false}
      />

      {/* Back platform (bottom in 2D) */}
      <Rect
        x={2}
        y={trackCenterY + 16}
        width={pixelWidth - 4}
        height={pixelHeight - trackCenterY - 18}
        fill={colors.platform}
        stroke={colors.platformEdge}
        strokeWidth={1}
        cornerRadius={2}
        listening={false}
      />

      {/* Platform edge markings (safety lines) */}
      <Line
        points={[4, trackCenterY - 16, pixelWidth - 4, trackCenterY - 16]}
        stroke={colors.accent}
        strokeWidth={2}
        dash={[8, 4]}
        opacity={0.8}
        listening={false}
      />
      <Line
        points={[4, trackCenterY + 14, pixelWidth - 4, trackCenterY + 14]}
        stroke={colors.accent}
        strokeWidth={2}
        dash={[8, 4]}
        opacity={0.8}
        listening={false}
      />

      {/* ========== TYPE-SPECIFIC DETAILS ========== */}
      {buildingType === 'train_station' && (
        <Group>
          {/* Station canopy/roof indicator */}
          <Rect
            x={pixelWidth * 0.2}
            y={6}
            width={pixelWidth * 0.6}
            height={trackCenterY - 26}
            fill={colors.canopy}
            stroke={colors.platformEdge}
            strokeWidth={1}
            cornerRadius={3}
            listening={false}
          />
          {/* Station marker posts */}
          <Rect x={8} y={8} width={4} height={trackCenterY - 30} fill={colors.accent} cornerRadius={1} listening={false} />
          <Rect x={pixelWidth - 12} y={8} width={4} height={trackCenterY - 30} fill={colors.accent} cornerRadius={1} listening={false} />

          {/* Control booth indicator on back platform */}
          <Rect
            x={pixelWidth * 0.35}
            y={trackCenterY + 20}
            width={pixelWidth * 0.3}
            height={30}
            fill="#4a5568"
            stroke="#64748b"
            strokeWidth={1}
            cornerRadius={2}
            listening={false}
          />
          {lodLevel === 'high' && (
            <Text
              x={pixelWidth * 0.35}
              y={trackCenterY + 30}
              width={pixelWidth * 0.3}
              text="CTRL"
              fontSize={10}
              fill="#94a3b8"
              align="center"
              listening={false}
            />
          )}
        </Group>
      )}

      {buildingType === 'freight_platform' && (
        <Group>
          {/* Cargo loading areas */}
          {[0.15, 0.5, 0.85].map((pos, i) => (
            <Group key={`cargo-${i}`}>
              {/* Front platform cargo area */}
              <Rect
                x={pixelWidth * pos - 20}
                y={10}
                width={40}
                height={trackCenterY - 35}
                fill={colors.cargo}
                stroke="#9ca3af"
                strokeWidth={1}
                cornerRadius={2}
                opacity={0.8}
                listening={false}
              />
              {/* Cargo crate visual */}
              {lodLevel === 'high' && (
                <Rect
                  x={pixelWidth * pos - 15}
                  y={15}
                  width={30}
                  height={25}
                  fill="#78716c"
                  stroke="#57534e"
                  strokeWidth={1}
                  cornerRadius={1}
                  listening={false}
                />
              )}

              {/* Back platform cargo area */}
              <Rect
                x={pixelWidth * pos - 20}
                y={trackCenterY + 22}
                width={40}
                height={pixelHeight - trackCenterY - 32}
                fill={colors.cargo}
                stroke="#9ca3af"
                strokeWidth={1}
                cornerRadius={2}
                opacity={0.8}
                listening={false}
              />
            </Group>
          ))}

          {/* Loading crane rails */}
          <Line
            points={[8, 8, pixelWidth - 8, 8]}
            stroke="#6b7280"
            strokeWidth={3}
            listening={false}
          />
          <Line
            points={[8, pixelHeight - 8, pixelWidth - 8, pixelHeight - 8]}
            stroke="#6b7280"
            strokeWidth={3}
            listening={false}
          />
        </Group>
      )}

      {buildingType === 'fluid_freight_platform' && (
        <Group>
          {/* Fluid tanks */}
          {[0.25, 0.75].map((pos, i) => (
            <Group key={`tank-${i}`}>
              {/* Front platform tank */}
              <Circle
                x={pixelWidth * pos}
                y={trackCenterY / 2}
                radius={25}
                fill={colors.tank}
                stroke={colors.pipe}
                strokeWidth={2}
                listening={false}
              />
              {lodLevel === 'high' && (
                <Circle
                  x={pixelWidth * pos}
                  y={trackCenterY / 2}
                  radius={18}
                  fill="rgba(59, 130, 246, 0.3)"
                  listening={false}
                />
              )}

              {/* Back platform tank */}
              <Circle
                x={pixelWidth * pos}
                y={trackCenterY + (pixelHeight - trackCenterY) / 2 + 8}
                radius={25}
                fill={colors.tank}
                stroke={colors.pipe}
                strokeWidth={2}
                listening={false}
              />
              {lodLevel === 'high' && (
                <Circle
                  x={pixelWidth * pos}
                  y={trackCenterY + (pixelHeight - trackCenterY) / 2 + 8}
                  radius={18}
                  fill="rgba(59, 130, 246, 0.3)"
                  listening={false}
                />
              )}
            </Group>
          ))}

          {/* Pipe connections indicator */}
          <Line
            points={[pixelWidth * 0.25, trackCenterY / 2, pixelWidth * 0.75, trackCenterY / 2]}
            stroke={colors.pipe}
            strokeWidth={4}
            dash={[6, 3]}
            listening={false}
          />
          <Line
            points={[pixelWidth * 0.25, trackCenterY + (pixelHeight - trackCenterY) / 2 + 8,
                     pixelWidth * 0.75, trackCenterY + (pixelHeight - trackCenterY) / 2 + 8]}
            stroke={colors.pipe}
            strokeWidth={4}
            dash={[6, 3]}
            listening={false}
          />

          {/* Fluid indicator labels */}
          {lodLevel === 'high' && (
            <>
              <Text
                x={pixelWidth * 0.5 - 20}
                y={8}
                width={40}
                text="FLUID"
                fontSize={8}
                fill="#94a3b8"
                align="center"
                listening={false}
              />
            </>
          )}
        </Group>
      )}

      {buildingType === 'empty_platform' && (
        <Group>
          {/* Empty platform markings - simple grid pattern */}
          {lodLevel !== 'low' && (
            <>
              {/* Grid lines on front platform */}
              {Array.from({ length: 4 }).map((_, i) => (
                <Line
                  key={`grid-h-front-${i}`}
                  points={[4, 20 + i * 25, pixelWidth - 4, 20 + i * 25]}
                  stroke={colors.stripe}
                  strokeWidth={1}
                  opacity={0.3}
                  listening={false}
                />
              ))}
              {/* Grid lines on back platform */}
              {Array.from({ length: 4 }).map((_, i) => (
                <Line
                  key={`grid-h-back-${i}`}
                  points={[4, trackCenterY + 30 + i * 25, pixelWidth - 4, trackCenterY + 30 + i * 25]}
                  stroke={colors.stripe}
                  strokeWidth={1}
                  opacity={0.3}
                  listening={false}
                />
              ))}
            </>
          )}
        </Group>
      )}

      {/* ========== STRUCTURAL DETAILS ========== */}
      {lodLevel === 'high' && (
        <Group>
          {/* Corner structural supports */}
          <Rect x={0} y={0} width={6} height={6} fill="#475569" cornerRadius={1} listening={false} />
          <Rect x={pixelWidth - 6} y={0} width={6} height={6} fill="#475569" cornerRadius={1} listening={false} />
          <Rect x={0} y={pixelHeight - 6} width={6} height={6} fill="#475569" cornerRadius={1} listening={false} />
          <Rect x={pixelWidth - 6} y={pixelHeight - 6} width={6} height={6} fill="#475569" cornerRadius={1} listening={false} />

          {/* Mid-span supports along track */}
          <Rect x={pixelWidth / 2 - 3} y={trackCenterY - 14} width={6} height={28} fill="#374151" cornerRadius={1} opacity={0.7} listening={false} />
        </Group>
      )}

      {/* ========== SELECTION HIGHLIGHT ========== */}
      {isSelected && (
        <Rect
          x={-3}
          y={-3}
          width={pixelWidth + 6}
          height={pixelHeight + 6}
          stroke={colors.accent}
          strokeWidth={3}
          fill="transparent"
          cornerRadius={4}
          dash={[8, 4]}
          listening={false}
        />
      )}
    </Group>
  );
});

StationBuildingDetails.displayName = 'StationBuildingDetails';

export const BuildingShape: React.FC<BuildingShapeProps> = React.memo(({
  building,
  isSelected,
  isGhost = false,
  opacity = 1,
  scale = 1, // Default scale for LOD
  onSelect,
  onDragStart,
  onDragEnd
}) => {
  const buildingDef = BUILDING_TYPES[building.type];
  if (!buildingDef) return null;

  // Get performance mode for conditional styling and LOD bias
  const { isLowPerformance, config } = usePerformanceMode();

  // Determine LOD level based on scale AND performance mode's lodBias
  // This ensures that lower performance modes render simpler connection points
  const lodLevel = useMemo(() => getLODLevel(scale, config.lodBias), [scale, config.lodBias]);

  // Building label text styling based on performance mode
  // High/Medium modes get modern fonts with bold styling
  // Low mode keeps simple styling for speed
  const labelStyle = useMemo(() => {
    if (isLowPerformance) {
      // Low performance mode - simple, fast rendering
      return {
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'normal' as const,
        fill: '#e2e8f0',
      };
    }
    // High/Medium performance mode - modern font with bold styling for readability
    return {
      fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
      fontStyle: 'bold' as const,
      fill: '#f8fafc',
    };
  }, [isLowPerformance]);
  
  // Get color based on material for foundations
  const buildingColor = useMemo(() => {
    if (building.type === 'foundation' && building.material) {
      const materialColors = {
        default: '#95a5a6',
        concrete: '#7f8c8d',
        coated: '#34495e',
        asphalt: '#2c3e50',
        grip_metal: '#95a5a6'
      };
      return materialColors[building.material] || buildingDef.color;
    }
    return buildingDef.color;
  }, [building.type, building.material, buildingDef.color]);
  
  // Combined store selectors for better performance
  const { 
    selectedTool, 
    drawingState, 
    conveyorBelts,
    conveyorSegments,
    conveyorPoles,
    pipelines,
    pipeSegments,
    pipeSupports,
    railways,
    railwaySegments,
    powerlineConnectionState,
    startConveyorDrawing,
    finishConveyorDrawing,
    startPipeDrawing,
    finishPipeDrawing,
    startRailwayDrawing,
    finishRailwayDrawing,
    setPowerlineStartPoint,
    createDirectPowerlineConnection,
    clearPowerlineConnectionState,
    updateBuilding
  } = useLayoutStore(
    useShallow(state => ({
      selectedTool: state.selectedTool,
      drawingState: state.drawingState,
      conveyorBelts: state.conveyorBelts,
      conveyorSegments: state.conveyorSegments,
      conveyorPoles: state.conveyorPoles,
      pipelines: state.pipelines,
      pipeSegments: state.pipeSegments,
      pipeSupports: state.pipeSupports,
      railways: state.railways,
      railwaySegments: state.railwaySegments,
      powerlineConnectionState: state.powerlineConnectionState,
      startConveyorDrawing: state.startConveyorDrawing,
      finishConveyorDrawing: state.finishConveyorDrawing,
      startPipeDrawing: state.startPipeDrawing,
      finishPipeDrawing: state.finishPipeDrawing,
      startRailwayDrawing: state.startRailwayDrawing,
      finishRailwayDrawing: state.finishRailwayDrawing,
      setPowerlineStartPoint: state.setPowerlineStartPoint,
      createDirectPowerlineConnection: state.createDirectPowerlineConnection,
      clearPowerlineConnectionState: state.clearPowerlineConnectionState,
      updateBuilding: state.updateBuilding,
    }))
  );
  
  const pixelWidth = buildingDef.width * PIXELS_PER_METER;
  const pixelHeight = buildingDef.height * PIXELS_PER_METER;
  
  // Skip complex calculations at low detail
  if (lodLevel === 'low') {
    // Calculate rotation-aware hitbox for low LOD - uses actual rotated bounding box
    const rotatedBoundsLow = getRotatedBoundingBox(pixelWidth, pixelHeight, building.rotation);
    const isSmallBuildingLow = pixelWidth < 50 || pixelHeight < 50;
    const isVerySmallBuildingLow = pixelWidth < 45 || pixelHeight < 45;
    const dragPaddingLow = isVerySmallBuildingLow ? 30 : isSmallBuildingLow ? 20 : 20;
    // Add padding to the rotated bounding box, not a massive square
    const hitboxWidthLow = rotatedBoundsLow.width + dragPaddingLow;
    const hitboxHeightLow = rotatedBoundsLow.height + dragPaddingLow;

    return (
      <Group
        x={(building.x + buildingDef.width / 2) * PIXELS_PER_METER}
        y={(building.y + buildingDef.height / 2) * PIXELS_PER_METER}
        draggable={selectedTool === 'select' && !isGhost && !drawingState.isDrawing && !drawingState.drawingRailway && !drawingState.drawingPipe}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        opacity={opacity}
        name="building"
      >
        {/* Hitbox outside cached group for proper event capture - uses rotated bounding box */}
        <Rect
          x={-hitboxWidthLow / 2}
          y={-hitboxHeightLow / 2}
          width={hitboxWidthLow}
          height={hitboxHeightLow}
          fill="transparent"
          name="building-hitbox"
        />
        <Group
          rotation={building.rotation}
          offsetX={pixelWidth / 2}
          offsetY={pixelHeight / 2}
          cache={true} // Cache static low-detail buildings
        >
          {/* Basic shape only at low detail */}
          <Rect
            x={0}
            y={0}
            width={pixelWidth}
            height={pixelHeight}
            fill={buildingColor}
            stroke={isSelected ? '#fa9549' : 'rgba(0,0,0,0.3)'}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={2}
            listening={false}
          />

          {/* Simplified station details for low LOD */}
          {isStationBuilding(building.type) && (
            <StationBuildingDetails
              buildingType={building.type as StationBuildingType}
              pixelWidth={pixelWidth}
              pixelHeight={pixelHeight}
              lodLevel={lodLevel}
              isSelected={isSelected}
              isGhost={isGhost}
            />
          )}

          {/* Simplified name text - counter-rotated to stay upright */}
          {/* Skip center label for train buildings (they have railway tracks through the center) */}
          {!buildingDef.railwayPoints && (
            <Group
              x={pixelWidth / 2}
              y={pixelHeight / 2}
              rotation={-building.rotation}
            >
              <Text
                text={buildingDef.name}
                fontSize={Math.max(8, Math.min(12, pixelWidth / 8))}
                fontFamily={labelStyle.fontFamily}
                fontStyle={labelStyle.fontStyle}
                fill={labelStyle.fill}
                width={pixelWidth}
                height={pixelHeight}
                offsetX={pixelWidth / 2}
                offsetY={pixelHeight / 2}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          )}

          {/* Train Building Header for low LOD - counter-rotated */}
          {buildingDef.railwayPoints && (
            <Group
              x={pixelWidth / 2}
              y={-35}
              rotation={-building.rotation}
            >
              <Rect
                x={-Math.min(pixelWidth * 0.7, 200) / 2}
                y={-10}
                width={Math.min(pixelWidth * 0.7, 200)}
                height={20}
                fill="rgba(30, 41, 59, 0.9)"
                cornerRadius={4}
                listening={false}
              />
              <Text
                text={`🚂 ${buildingDef.name}`}
                x={-Math.min(pixelWidth * 0.7, 200) / 2}
                y={-10}
                width={Math.min(pixelWidth * 0.7, 200)}
                height={20}
                fontSize={10}
                fill="#e2e8f0"
                fontFamily="Arial, sans-serif"
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          )}

          {/* Basic connection points as hitboxes only */}
          {buildingDef.connectionPoints.map((cp) => {
            const cpX = cp.x * PIXELS_PER_METER;
            const cpY = cp.y * PIXELS_PER_METER;
            return (
              <Circle
                key={cp.id}
                x={cpX}
                y={cpY}
                radius={15}
                fill="transparent"
                name="connection"
              />
            );
          })}
        </Group>

        {/* TOP LAYER DRAG HITBOX - rendered last so it's on top of everything.
            Only visible in select mode to enable drag. Hidden in conveyor/pipe/railway
            modes so connection points can receive click events for drawing. */}
        {selectedTool === 'select' && !isGhost && (
          <Rect
            x={-hitboxWidthLow / 2}
            y={-hitboxHeightLow / 2}
            width={hitboxWidthLow}
            height={hitboxHeightLow}
            fill="transparent"
            name="drag-hitbox-top"
          />
        )}
      </Group>
    );
  }

  // Powerline connection state checks
  const isPowerlineConnectable = useMemo(() => {
    return !!(buildingDef.powerData?.powerConnections?.length > 0);
  }, [buildingDef.powerData]);

  const isPowerlineSelected = useMemo(() => {
    if (!powerlineConnectionState?.startPoint) return false;
    return powerlineConnectionState.startPoint.type === 'building' && 
           powerlineConnectionState.startPoint.buildingId === building.id;
  }, [powerlineConnectionState, building.id]);

  const shouldShowPowerlineHighlight = useMemo(() => {
    return selectedTool === 'powerline' && isPowerlineConnectable;
  }, [selectedTool, isPowerlineConnectable]);
  
  // Increase overlap for draggable area, especially for small buildings
  // Small buildings (like splitters at 4m x 4m = ~40px) need larger hitboxes to cover text
  const isSmallBuilding = pixelWidth < 50 || pixelHeight < 50;
  const isVerySmallBuilding = pixelWidth < 45 || pixelHeight < 45;
  const dragPadding = isVerySmallBuilding ? 30 : isSmallBuilding ? 20 : 20;
  const clickWidth = pixelWidth + dragPadding;
  const clickHeight = pixelHeight + dragPadding;
  
  // Enhanced rotation handler that properly breaks and updates connections - memoized
  const handleRotation = useCallback(() => {
    // Find all conveyor belts connected to this building
    const connectedBelts = Object.values(conveyorBelts).filter(belt => 
      belt.fromBuildingId === building.id || belt.toBuildingId === building.id
    );
    
    // Find all pipelines connected to this building
    const connectedPipelines = Object.values(pipelines).filter(pipeline => 
      pipeline.fromBuildingId === building.id || pipeline.toBuildingId === building.id
    );
    
    // Find all railways connected to this building
    const connectedRailways = Object.values(railways).filter(railway => 
      railway.stations.includes(building.id)
    );
    
    // Break all connected belts, pipelines and railways
    if (connectedBelts.length > 0 || connectedPipelines.length > 0 || connectedRailways.length > 0) {
      // Use reactive state instead of getState() call
      const newBelts = { ...conveyorBelts };
      const newSegments = { ...conveyorSegments };
      const newPoles = { ...conveyorPoles };
      const newPipelines = { ...pipelines };
      const newPipeSegments = { ...pipeSegments };
      const newPipeSupports = { ...pipeSupports };
      const newRailways = { ...railways };
      const newRailwaySegments = { ...railwaySegments };
      
      // Remove conveyor belts
      connectedBelts.forEach(belt => {
        // Delete segments and their poles
        belt.segments.forEach(segmentId => {
          const segment = newSegments[segmentId];
          if (segment) {
            // Delete non-anchor poles
            const startPole = newPoles[segment.startPole];
            const endPole = newPoles[segment.endPole];
            
            if (startPole && !startPole.isAnchor) {
              delete newPoles[startPole.id];
            }
            if (endPole && !endPole.isAnchor) {
              delete newPoles[endPole.id];
            }
            
            // Delete anchor poles connected to this building
            if (startPole && startPole.isAnchor && startPole.id.includes(building.id)) {
              delete newPoles[startPole.id];
            }
            if (endPole && endPole.isAnchor && endPole.id.includes(building.id)) {
              delete newPoles[endPole.id];
            }
            
            delete newSegments[segmentId];
          }
        });
        
        delete newBelts[belt.id];
      });
      
      // Remove pipelines
      connectedPipelines.forEach(pipeline => {
        // Delete segments and their supports
        pipeline.segments.forEach(segmentId => {
          const segment = newPipeSegments[segmentId];
          if (segment) {
            // Delete non-anchor supports
            const startSupport = newPipeSupports[segment.startSupport];
            const endSupport = newPipeSupports[segment.endSupport];
            
            if (startSupport && !startSupport.isAnchor) {
              delete newPipeSupports[startSupport.id];
            }
            if (endSupport && !endSupport.isAnchor) {
              delete newPipeSupports[endSupport.id];
            }
            
            // Delete anchor supports connected to this building
            if (startSupport && startSupport.isAnchor && startSupport.id.includes(building.id)) {
              delete newPipeSupports[startSupport.id];
            }
            if (endSupport && endSupport.isAnchor && endSupport.id.includes(building.id)) {
              delete newPipeSupports[endSupport.id];
            }
            
            delete newPipeSegments[segmentId];
          }
        });
        
        delete newPipelines[pipeline.id];
      });
      
      // Remove railway connections
      connectedRailways.forEach(railway => {
        // Remove segments connected to this building
        const segmentsToRemove = railway.segments.filter(segId => {
          const segment = newRailwaySegments[segId];
          return segment && (segment.fromStation === building.id || segment.toStation === building.id);
        });
        
        segmentsToRemove.forEach(segId => {
          delete newRailwaySegments[segId];
        });
        
        // Update railway
        const updatedRailway = {
          ...railway,
          stations: railway.stations.filter(stationId => stationId !== building.id),
          segments: railway.segments.filter(segId => !segmentsToRemove.includes(segId))
        };
        
        // If railway has no segments or stations left, delete it
        if (updatedRailway.stations.length === 0 || updatedRailway.segments.length === 0) {
          delete newRailways[railway.id];
        } else {
          newRailways[railway.id] = updatedRailway;
        }
      });
      
      // Apply the state updates using set function
      useLayoutStore.setState({
        conveyorBelts: newBelts,
        conveyorSegments: newSegments,
        conveyorPoles: newPoles,
        pipelines: newPipelines,
        pipeSegments: newPipeSegments,
        pipeSupports: newPipeSupports,
        railways: newRailways,
        railwaySegments: newRailwaySegments
      });
    }
    
    // Now rotate the building
    const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
    const currentIndex = rotations.indexOf(building.rotation);
    const newRotation = rotations[(currentIndex + 1) % 4];
    
    updateBuilding(building.id, { rotation: newRotation });
  }, [building.id, building.rotation, conveyorBelts, pipelines, railways, updateBuilding]);
  
  const handleConnectionMouseDown = useCallback((e: any, connectionPoint: ConnectionPoint) => {
    e.cancelBubble = true;

    // Only start new drawing if not already drawing
    if (connectionPoint.isFluid && selectedTool === 'pipe' && !drawingState.drawingPipe) {
      startPipeDrawing(building.id, connectionPoint.id);
    } else if (!connectionPoint.isFluid && selectedTool === 'conveyor' && !drawingState.isDrawing) {
      startConveyorDrawing(building.id, connectionPoint.id);
    }
  }, [building.id, selectedTool, drawingState, startPipeDrawing, startConveyorDrawing]);
  
  const handleConnectionMouseUp = useCallback((e: any, connectionPoint: ConnectionPoint) => {
    e.cancelBubble = true;
    
    if (connectionPoint.isFluid && drawingState.drawingPipe && drawingState.pipeStartBuildingId !== building.id) {
      finishPipeDrawing(building.id, connectionPoint.id);
    } else if (!connectionPoint.isFluid && drawingState.isDrawing && drawingState.startBuildingId !== building.id) {
      finishConveyorDrawing(building.id, connectionPoint.id);
    }
  }, [building.id, drawingState, finishPipeDrawing, finishConveyorDrawing]);
  
  const handleRailwayConnectionMouseDown = useCallback((e: any, railwayPoint: RailwayConnectionPoint) => {
    e.cancelBubble = true;
    
    // Only start new drawing if not already drawing
    if (selectedTool === "railway" && !drawingState.drawingRailway) {
      startRailwayDrawing(building.id, railwayPoint.id);
    }
  }, [building.id, selectedTool, drawingState, startRailwayDrawing]);
  const handleRailwayConnectionMouseUp = useCallback((e: any, railwayPoint: RailwayConnectionPoint) => {
    e.cancelBubble = true;
    
    if (drawingState.drawingRailway && drawingState.railwayStartStation !== building.id) {
      finishRailwayDrawing(building.id, railwayPoint.id);
    }
  }, [building.id, drawingState, finishRailwayDrawing]);
  
  // Enhanced select handler - memoized
  const handleSelect = useCallback(() => {
    if (selectedTool === 'rotate') {
      handleRotation();
    } else if (selectedTool === 'powerline') {
      // Check if building has power connections
      const powerConnection = buildingDef.powerData?.powerConnections?.[0];
      if (!powerConnection) {
        console.warn('Building has no power connections:', building.type);
        return;
      }

      if (!powerlineConnectionState?.startPoint) {
        // First click: Set start point
        console.log('Setting powerline start point to building:', building.id);
        setPowerlineStartPoint({
          type: 'building',
          buildingId: building.id,
          powerPointId: powerConnection.id,
          position: { x: building.x, y: building.y, z: building.z }
        });
      } else {
        // Second click: Create connection
        console.log('Creating powerline connection to building:', building.id);
        const endPoint = {
          type: 'building' as const,
          buildingId: building.id,
          powerPointId: powerConnection.id,
          position: { x: building.x, y: building.y, z: building.z }
        };
        createDirectPowerlineConnection(powerlineConnectionState.startPoint, endPoint);
      }
    } else if (onSelect) {
      onSelect();
    }
  }, [selectedTool, handleRotation, onSelect, building, buildingDef, powerlineConnectionState, setPowerlineStartPoint, createDirectPowerlineConnection]);

  // Calculate rotation-aware hitbox size using actual rotated bounding box
  // This gives the exact bounding box for 90-degree rotations (0, 90, 180, 270)
  // which is much more accurate than using maxDimension * sqrt(2)
  const rotatedBounds = getRotatedBoundingBox(pixelWidth, pixelHeight, building.rotation);
  const hitboxWidth = rotatedBounds.width + dragPadding;
  const hitboxHeight = rotatedBounds.height + dragPadding;

  return (
    <Group
      x={(building.x + buildingDef.width / 2) * PIXELS_PER_METER}
      y={(building.y + buildingDef.height / 2) * PIXELS_PER_METER}
      draggable={selectedTool === 'select' && !isGhost && !drawingState.isDrawing && !drawingState.drawingRailway && !drawingState.drawingPipe}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleSelect}
      opacity={opacity}
      name="building"
    >
      {/* Hitbox OUTSIDE cached group - Konva caching breaks hit detection, so this must be
          in the outer non-cached group. Uses rotation-aware bounding box. */}
      <Rect
        x={-hitboxWidth / 2}
        y={-hitboxHeight / 2}
        width={hitboxWidth}
        height={hitboxHeight}
        fill="transparent"
        name="building-hitbox"
      />
      <Group
        rotation={building.rotation}
        offsetX={pixelWidth / 2}
        offsetY={pixelHeight / 2}
        cache={!isSelected && !isGhost && lodLevel !== 'high'} // Cache non-interactive medium detail buildings
      >
        
        {/* Simplified shadow - only at medium/high detail */}
        {!isGhost && lodLevel !== 'low' && (
          <Rect
            x={2}
            y={2}
            width={pixelWidth}
            height={pixelHeight}
            fill="rgba(0,0,0,0.3)"
            cornerRadius={2}
            listening={false}
          />
        )}
        
        {/* Main building shape with glassmorphism */}
        <Rect
          x={0}
          y={0}
          width={pixelWidth}
          height={pixelHeight}
          fill={buildingColor}
          stroke={
            isSelected ? '#fa9549' : 
            isPowerlineSelected ? '#ffaa00' :
            shouldShowPowerlineHighlight ? '#66aaff' :
            isGhost ? 'rgba(250, 149, 73, 0.3)' : 
            'rgba(0,0,0,0.3)'
          }
          strokeWidth={
            isSelected ? 3 : 
            isPowerlineSelected ? 3 :
            shouldShowPowerlineHighlight ? 2 :
            1
          }
          shadowBlur={
            isSelected ? 12 : 
            isPowerlineSelected ? 8 :
            shouldShowPowerlineHighlight ? 4 :
            0
          }
          shadowColor={
            isSelected ? 'rgba(250, 149, 73, 0.5)' : 
            isPowerlineSelected ? 'rgba(255, 170, 0, 0.5)' :
            shouldShowPowerlineHighlight ? 'rgba(102, 170, 255, 0.3)' :
            'black'
          }
          cornerRadius={buildingDef.category === 'architecture' ? 2 : 4}
          listening={false}
        />

        {/* Specialized station/platform building details */}
        {isStationBuilding(building.type) && (
          <StationBuildingDetails
            buildingType={building.type as StationBuildingType}
            pixelWidth={pixelWidth}
            pixelHeight={pixelHeight}
            lodLevel={lodLevel}
            isSelected={isSelected}
            isGhost={isGhost}
          />
        )}

        {/* Powerline connection indicator */}
        {isPowerlineSelected && (
          <Group>
            {/* Pulsing selection ring */}
            <Rect
              x={-8}
              y={-8}
              width={pixelWidth + 16}
              height={pixelHeight + 16}
              stroke="#ffaa00"
              strokeWidth={3}
              opacity={0.8}
              dash={[8, 4]}
              cornerRadius={6}
              listening={false}
            />
            {/* Inner glow */}
            <Rect
              x={-4}
              y={-4}
              width={pixelWidth + 8}
              height={pixelHeight + 8}
              fill="rgba(255, 170, 0, 0.1)"
              cornerRadius={4}
              listening={false}
            />
            {/* Power symbol indicator */}
            <Group x={pixelWidth / 2} y={pixelHeight / 2}>
              <Circle
                radius={12}
                fill="rgba(255, 170, 0, 0.8)"
                stroke="#ffffff"
                strokeWidth={2}
                listening={false}
              />
              <Text
                text="⚡"
                fontSize={16}
                fill="#ffffff"
                fontFamily="Arial"
                width={24}
                height={24}
                align="center"
                verticalAlign="middle"
                offsetX={12}
                offsetY={12}
                listening={false}
              />
            </Group>
          </Group>
        )}
        
        {/* Power connection availability indicator */}
        {shouldShowPowerlineHighlight && !isPowerlineSelected && (
          <Group x={pixelWidth - 8} y={8}>
            <Circle
              radius={6}
              fill="rgba(102, 170, 255, 0.6)"
              stroke="#ffffff"
              strokeWidth={1}
              listening={false}
            />
            <Text
              text="⚡"
              fontSize={8}
              fill="#ffffff"
              fontFamily="Arial"
              width={12}
              height={12}
              align="center"
              verticalAlign="middle"
              offsetX={6}
              offsetY={6}
              listening={false}
            />
          </Group>
        )}
        
        {/* Remove all decorative elements - keep only essential visuals at high detail */}
        {!isGhost && lodLevel === 'high' && (
          <Rect
            x={1}
            y={1}
            width={pixelWidth - 2}
            height={4}
            fill="rgba(255,255,255,0.15)"
            listening={false}
          />
        )}
        
        {/* Remove debug visual to reduce shapes */}

        {/* Simplified building name - counter-rotated to stay upright */}
        {/* Skip center label for train buildings (they have railway tracks through the center) */}
        {!buildingDef.railwayPoints && (
          <Group
            x={pixelWidth / 2}
            y={pixelHeight / 2}
            rotation={-building.rotation}
          >
            <Text
              text={buildingDef.name}
              fontSize={Math.max(8, Math.min(12, pixelWidth / 8))}
              fontFamily={labelStyle.fontFamily}
              fontStyle={labelStyle.fontStyle}
              fill={isGhost ? "rgba(244, 244, 244, 0.6)" : labelStyle.fill}
              width={pixelWidth}
              height={pixelHeight}
              offsetX={pixelWidth / 2}
              offsetY={pixelHeight / 2}
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )}

        {/* Train Building Header - shows building type and custom name above the building */}
        {/* Positioned higher to avoid overlapping with power connection indicators */}
        {!isGhost && buildingDef.railwayPoints && (
          <Group
            x={pixelWidth / 2}
            y={-45}
            rotation={-building.rotation} // Counter-rotate to stay upright
          >
            {/* Header Background */}
            <Rect
              x={-(Math.min(pixelWidth * 0.8, 280)) / 2}
              y={building.text ? -22 : -14}
              width={Math.min(pixelWidth * 0.8, 280)}
              height={building.text ? 44 : 28}
              fill="rgba(30, 41, 59, 0.95)"
              stroke="#475569"
              strokeWidth={2}
              cornerRadius={6}
              shadowBlur={8}
              shadowColor="rgba(0,0,0,0.7)"
              shadowOffsetY={3}
              listening={false}
            />

            {/* Train Icon with Background */}
            <Circle
              x={-(Math.min(pixelWidth * 0.8, 280)) / 2 + 18}
              y={building.text ? -10 : 0}
              radius={12}
              fill="rgba(245, 158, 11, 0.2)"
              stroke="#f59e0b"
              strokeWidth={1.5}
              listening={false}
            />
            <Text
              text="🚂"
              x={-(Math.min(pixelWidth * 0.8, 280)) / 2 + 10}
              y={building.text ? -17 : -7}
              fontSize={14}
              listening={false}
            />

            {/* Building Type Label */}
            <Text
              text={buildingDef.name}
              x={-(Math.min(pixelWidth * 0.8, 280)) / 2 + 36}
              y={building.text ? -20 : -12}
              width={Math.min(pixelWidth * 0.8, 280) - 44}
              height={building.text ? 20 : 24}
              fontSize={12}
              fill="#e2e8f0"
              fontFamily={isLowPerformance ? 'Arial, sans-serif' : 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif'}
              fontStyle="bold"
              align="left"
              verticalAlign="middle"
              listening={false}
            />

            {/* Custom Station Name (if set) */}
            {building.text && (
              <Text
                text={building.text}
                x={-(Math.min(pixelWidth * 0.8, 280)) / 2 + 8}
                y={2}
                width={Math.min(pixelWidth * 0.8, 280) - 16}
                height={18}
                fontSize={11}
                fill="#f59e0b"
                fontFamily={isLowPerformance ? 'Arial, sans-serif' : 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif'}
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
                wrap="none"
                ellipsis={true}
                listening={false}
              />
            )}
          </Group>
        )}
        
        {/* Ultra-simplified Railway connection points (25-30 shapes -> 2-3 shapes) */}
        {!isGhost && buildingDef.railwayPoints && lodLevel !== 'low' && buildingDef.railwayPoints.map((rp) => {
          const isHighlighted = selectedTool === 'railway';
          const isActive = drawingState.drawingRailway && 
                          drawingState.railwayStartStation === building.id && 
                          drawingState.railwayStartRailPoint === rp.id;
          
          const isPotentialTarget = drawingState.drawingRailway && 
                                  drawingState.railwayStartStation && 
                                  drawingState.railwayStartStation !== building.id;
          
          const rpX = rp.x * PIXELS_PER_METER;
          const rpY = rp.y * PIXELS_PER_METER;
          
          return (
            <Group key={rp.id}>
              {/* Simplified railway track - single line representation */}
              {lodLevel === 'high' && (
                <Group x={rpX} y={rpY}>
                  {/* Simple track line */}
                  <Line
                    points={[-20, 0, 20, 0]}
                    stroke="#8b7355"
                    strokeWidth={8}
                    listening={false}
                  />
                  {/* Direction indicator */}
                  {rp.direction === 'in' && (
                    <Circle x={-15} y={0} radius={3} fill="#22c55e" listening={false} />
                  )}
                  {rp.direction === 'out' && (
                    <Circle x={15} y={0} radius={3} fill="#ef4444" listening={false} />
                  )}
                </Group>
              )}
              
              {/* Hitbox */}
              <Circle
                x={rpX}
                y={rpY}
                radius={25}
                fill={isActive || isPotentialTarget ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}
                stroke={isHighlighted || isPotentialTarget ? '#3b82f6' : 'transparent'}
                strokeWidth={2}
                onMouseDown={(e) => handleRailwayConnectionMouseDown(e, rp)}
                onMouseUp={(e) => handleRailwayConnectionMouseUp(e, rp)}
                name="railway-connection"
              />
            </Group>
          );
        })}
        
        {/* Enhanced connection points with directional arrows and type-based styling */}
        {!isGhost && buildingDef.connectionPoints.map((cp) => {
          const isConveyorHighlighted = selectedTool === 'conveyor' && !cp.isFluid;
          const isPipeHighlighted = selectedTool === 'pipe' && cp.isFluid;
          const isHighlighted = isConveyorHighlighted || isPipeHighlighted;

          const isConveyorActive = drawingState.isDrawing &&
                          drawingState.startBuildingId === building.id &&
                          drawingState.startConnectionPoint === cp.id;
          const isPipeActive = drawingState.drawingPipe &&
                          drawingState.pipeStartBuildingId === building.id &&
                          drawingState.pipeStartConnectionPoint === cp.id;
          const isActive = isConveyorActive || isPipeActive;

          // Determine if we're in drawing mode (conveyor or pipe)
          const isDrawingMode = (selectedTool === 'conveyor' && !cp.isFluid) ||
                                (selectedTool === 'pipe' && cp.isFluid);

          const cpX = cp.x * PIXELS_PER_METER;
          const cpY = cp.y * PIXELS_PER_METER;

          // Use enhanced connection points for medium/high detail, simplified for low
          if (lodLevel === 'low' || isLowPerformance) {
            return (
              <ConnectionPointShape
                key={cp.id}
                cp={cp}
                cpX={cpX}
                cpY={cpY}
                lodLevel={lodLevel}
                isHighlighted={!!isHighlighted}
                isActive={!!isActive}
                onMouseDown={(e) => handleConnectionMouseDown(e, cp)}
                onMouseUp={(e) => handleConnectionMouseUp(e, cp)}
              />
            );
          }

          return (
            <EnhancedConnectionPointShape
              key={cp.id}
              cp={cp}
              cpX={cpX}
              cpY={cpY}
              lodLevel={lodLevel}
              isHighlighted={!!isHighlighted}
              isActive={!!isActive}
              isDrawingMode={isDrawingMode}
              buildingRotation={building.rotation}
              onMouseDown={(e) => handleConnectionMouseDown(e, cp)}
              onMouseUp={(e) => handleConnectionMouseUp(e, cp)}
            />
          );
        })}
        
        {/* Simplified rotation indicator */}
        {isSelected && selectedTool === 'rotate' && lodLevel !== 'low' && (
          <Circle
            x={pixelWidth / 2}
            y={pixelHeight / 2}
            radius={Math.min(pixelWidth, pixelHeight) / 2 + 10}
            stroke="#fa9549"
            strokeWidth={2}
            dash={[8, 4]}
            listening={false}
          />
        )}
      </Group>

      {/* TOP LAYER DRAG HITBOX - rendered last so it's on top of everything.
          Only visible in select mode to enable drag. Hidden in conveyor/pipe/railway
          modes so connection points can receive click events for drawing. */}
      {selectedTool === 'select' && !isGhost && (
        <Rect
          x={-hitboxWidth / 2}
          y={-hitboxHeight / 2}
          width={hitboxWidth}
          height={hitboxHeight}
          fill="transparent"
          name="drag-hitbox-top"
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return prevProps.building === nextProps.building &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isGhost === nextProps.isGhost &&
         prevProps.opacity === nextProps.opacity &&
         prevProps.onSelect === nextProps.onSelect &&
         prevProps.onDragEnd === nextProps.onDragEnd;
});