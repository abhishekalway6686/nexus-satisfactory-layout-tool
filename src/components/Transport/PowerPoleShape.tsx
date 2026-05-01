// src/components/Transport/PowerPoleShape.tsx
import React, { useMemo, useCallback } from 'react';
import { Group, Rect, Circle, Line, Text, Ring } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { PowerPole, Building, PowerlineSegment } from '../../types';
import { PIXELS_PER_METER, BUILDING_TYPES } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { getPowerConnectionPointWorldPos } from '../../utils/helpers';

interface PowerPoleShapeProps {
  pole?: PowerPole; // Standalone power poles
  building?: Building; // Building-based power poles
  isSelected?: boolean;
  isHovered?: boolean;
  opacity?: number;
  scale: number;
  interactive?: boolean;
  onPoleClick?: (poleId: string) => void;
  onDragEnd?: (poleId: string, e: any) => void;
  draggable?: boolean;
}

/**
 * Power pole tier configurations matching Satisfactory visual style
 * Updated with game-accurate values and Satisfactory industrial colors
 */
interface PoleConfig {
  name: string;
  tier: 'Mk1' | 'Mk2' | 'Mk3' | 'Tower';
  height: number;
  width: number;
  baseColor: string;        // Main pole body color
  accentColor: string;      // Satisfactory orange accent (#FA9549)
  metalColor: string;       // Blue-gray industrial (#5F668C)
  crossbeamColor: string;
  insulatorColor: string;
  insulatorGlow: string;    // Glow color for insulators
  range: number;
  maxConnections: number;
  insulatorCount: number;   // Number of insulators per side
}

const POLE_CONFIGS: Record<string, PoleConfig> = {
  power_pole_mk1: {
    name: 'Power Pole Mk.1',
    tier: 'Mk1',
    height: 35,
    width: 6,
    baseColor: '#5F668C',       // Satisfactory blue-gray
    accentColor: '#FA9549',     // Satisfactory orange
    metalColor: '#7A8299',      // Lighter metallic
    crossbeamColor: '#4A5170',
    insulatorColor: '#e74c3c',  // Red for Mk1
    insulatorGlow: 'rgba(231, 76, 60, 0.6)',
    range: 30,
    maxConnections: 4,
    insulatorCount: 2
  },
  power_pole_mk2: {
    name: 'Power Pole Mk.2',
    tier: 'Mk2',
    height: 40,
    width: 7,
    baseColor: '#5F668C',
    accentColor: '#FA9549',
    metalColor: '#6B7394',
    crossbeamColor: '#3D4460',
    insulatorColor: '#e67e22',  // Orange for Mk2
    insulatorGlow: 'rgba(230, 126, 34, 0.6)',
    range: 35,
    maxConnections: 7,
    insulatorCount: 3
  },
  power_pole_mk3: {
    name: 'Power Pole Mk.3',
    tier: 'Mk3',
    height: 45,
    width: 8,
    baseColor: '#4A5170',
    accentColor: '#FA9549',
    metalColor: '#5F668C',
    crossbeamColor: '#2c3450',
    insulatorColor: '#f39c12',  // Gold for Mk3
    insulatorGlow: 'rgba(243, 156, 18, 0.7)',
    range: 40,
    maxConnections: 10,
    insulatorCount: 4
  },
  power_tower: {
    name: 'Power Tower',
    tier: 'Tower',
    height: 75,
    width: 20,
    baseColor: '#3D4460',
    accentColor: '#FA9549',
    metalColor: '#5F668C',
    crossbeamColor: '#1a252f',
    insulatorColor: '#9b59b6',  // Purple for Tower
    insulatorGlow: 'rgba(155, 89, 182, 0.7)',
    range: 100,
    maxConnections: 8,
    insulatorCount: 3
  }
};

/**
 * Gets power pole visual properties based on type with enhanced styling
 */
const getPowerPoleVisualProps = (poleType: string, isSelected: boolean, isHovered: boolean) => {
  const config = POLE_CONFIGS[poleType] || POLE_CONFIGS.power_pole_mk1;

  return {
    ...config,
    strokeColor: isSelected ? '#ffaa00' : isHovered ? '#66bbff' : config.accentColor,
    glowColor: isSelected ? 'rgba(255, 170, 0, 0.4)' : isHovered ? 'rgba(102, 187, 255, 0.3)' : 'transparent',
    strokeWidth: isSelected ? 3 : isHovered ? 2 : 1,
    powerlineSelected: isSelected
  };
};

/**
 * PowerPoleShape component for rendering building-based power poles
 * Supports: power_pole_mk1, power_pole_mk2, power_pole_mk3, power_tower
 */
/**
 * Helper to count connected powerlines for a pole/building
 */
const useConnectedPowerlineCount = (poleId: string): number => {
  const powerlineSegments = useLayoutStore(state => state.powerlineSegments);

  return useMemo(() => {
    return Object.values(powerlineSegments).filter(
      (segment: PowerlineSegment) => segment.startPole === poleId || segment.endPole === poleId
    ).length;
  }, [powerlineSegments, poleId]);
};


export const PowerPoleShape: React.FC<PowerPoleShapeProps> = ({
  pole,
  building,
  isSelected = false,
  isHovered = false,
  opacity = 1.0,
  scale,
  interactive = true,
  onPoleClick,
  onDragEnd,
  draggable = false
}) => {
  const {
    selectedTool,
    powerlineConnectionState,
    setPowerlineStartPoint,
    createDirectPowerlineConnection,
    clearPowerlineConnectionState,
    deleteBuilding,
    deletePowerPole
  } = useLayoutStore();

  // Track drag state to distinguish click from drag
  const [isDragging, setIsDragging] = React.useState(false);

  // Determine pole type and position from either pole or building
  const poleData = pole || building;
  if (!poleData) {
    throw new Error('PowerPoleShape requires either pole or building prop');
  }
  
  const poleType = poleData.type;
  const x = poleData.x * PIXELS_PER_METER;
  const y = poleData.y * PIXELS_PER_METER;
  const poleId = poleData.id;

  // Get connected powerline count for capacity indicator
  const connectedCount = useConnectedPowerlineCount(poleId);

  // Check if this building is selected for powerline connection
  const isPowerlineSelected = useMemo(() => {
    if (!powerlineConnectionState?.startPoint) return false;
    
    if (powerlineConnectionState.startPoint.type === 'building') {
      return powerlineConnectionState.startPoint.buildingId === poleId;
    }
    if (powerlineConnectionState.startPoint.type === 'pole') {
      return powerlineConnectionState.startPoint.poleId === poleId;
    }
    
    return false;
  }, [powerlineConnectionState, poleId]);

  // Check if this building is a valid powerline connection target
  const isPowerlineConnectable = useMemo(() => {
    if (selectedTool !== 'powerline') return false;
    
    // Power poles are always connectable
    if (building) {
      const buildingDef = BUILDING_TYPES[building.type];
      return !!(buildingDef?.powerData?.powerConnections?.length > 0);
    }
    return true;
  }, [selectedTool, building]);

  // Determine if this should show powerline hover effect
  const shouldShowPowerlineHover = useMemo(() => {
    return selectedTool === 'powerline' && 
           isPowerlineConnectable && 
           !isPowerlineSelected && 
           !powerlineConnectionState?.startPoint;
  }, [selectedTool, isPowerlineConnectable, isPowerlineSelected, powerlineConnectionState]);

  // Get visual properties with aggressive memoization
  const visualProps = useMemo(() => {
    // Show special highlighting for powerline selection
    const effectiveSelected = isSelected || isPowerlineSelected;
    const effectiveHovered = isHovered || shouldShowPowerlineHover;
    return getPowerPoleVisualProps(poleType, effectiveSelected, effectiveHovered);
  }, [poleType, isSelected, isHovered, isPowerlineSelected, shouldShowPowerlineHover]);
  
  // Performance optimizations based on scale
  const renderLevel = useMemo(() => {
    if (scale > 1.0) return 'high';
    if (scale > 0.5) return 'medium';
    if (scale > 0.2) return 'low';
    return 'minimal';
  }, [scale]);

  // Event handlers
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    // Ignore click if we were dragging
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (!interactive) return;

    // Stop event propagation to prevent canvas click handlers from executing
    e.cancelBubble = true;
    e.evt?.stopPropagation?.();
    e.evt?.preventDefault?.();

    if (selectedTool === 'delete') {
      e.evt?.preventDefault?.();
      e.evt?.stopPropagation?.();

      if (building) {
        // Delete building-based power pole
        deleteBuilding(poleId);
      } else if (pole && deletePowerPole) {
        // Delete standalone power pole
        deletePowerPole(poleId);
      }
    } else if (selectedTool === 'select') {
      if (onPoleClick) {
        onPoleClick(poleId);
      }
    } else if (selectedTool === 'powerline') {
      // Handle simple two-click powerline connection
      if (!powerlineConnectionState?.startPoint) {
        // First click: Set start point
        console.log('🟡 FIRST CLICK - Setting powerline start point', { pole: !!pole, building: !!building, poleId, currentState: powerlineConnectionState });

        if (building) {
          // Handle building-based power pole
          const buildingDef = BUILDING_TYPES[building.type];
          const powerConnection = buildingDef?.powerData?.powerConnections?.[0];
          if (powerConnection) {
            // Calculate the actual world position of the power connection point
            // This accounts for building rotation and the connection point offset
            const worldPos = getPowerConnectionPointWorldPos(building, buildingDef, powerConnection);
            setPowerlineStartPoint({
              type: 'building',
              buildingId: poleId,
              powerPointId: powerConnection.id,
              position: worldPos
            });
            console.log('Powerline start point set to building:', poleId, 'at world pos:', worldPos);
          } else {
            console.warn('Building has no power connections:', building.type);
          }
        } else {
          // Handle standalone power pole
          setPowerlineStartPoint({
            type: 'pole',
            poleId: poleId,
            position: { x: poleData.x, y: poleData.y, z: poleData.z }
          });
          console.log('Powerline start point set to pole:', poleId);
        }
      } else {
        // Second click: Create connection
        console.log('🔗 SECOND CLICK - Creating powerline connection', {
          pole: !!pole,
          building: !!building,
          poleId,
          startPoint: powerlineConnectionState.startPoint
        });

        let endPoint: any = null;

        if (building) {
          // Handle building-based power pole
          const buildingDef = BUILDING_TYPES[building.type];
          const powerConnection = buildingDef?.powerData?.powerConnections?.[0];
          if (powerConnection) {
            // Calculate the actual world position of the power connection point
            // This accounts for building rotation and the connection point offset
            const worldPos = getPowerConnectionPointWorldPos(building, buildingDef, powerConnection);
            endPoint = {
              type: 'building',
              buildingId: poleId,
              powerPointId: powerConnection.id,
              position: worldPos
            };
          } else {
            console.warn('Target building has no power connections:', building.type);
          }
        } else {
          // Handle standalone power pole
          endPoint = {
            type: 'pole',
            poleId: poleId,
            position: { x: poleData.x, y: poleData.y, z: poleData.z }
          };
        }

        if (endPoint) {
          console.log('Creating powerline connection', {
            from: powerlineConnectionState.startPoint,
            to: endPoint
          });
          createDirectPowerlineConnection(powerlineConnectionState.startPoint, endPoint);
        } else {
          console.warn('No valid end point for powerline connection');
        }
      }
    }
  };

  const handleMouseEnter = (e: KonvaEventObject<MouseEvent>) => {
    if (!interactive) return;
    
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'pointer';
    }
  };

  const handleMouseLeave = (e: KonvaEventObject<MouseEvent>) => {
    if (!interactive) return;

    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'default';
    }
  };

  // Drag handlers for power pole repositioning
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    // Small delay to ensure isDragging state is checked before click handler
    setTimeout(() => setIsDragging(false), 100);
    if (!interactive || !onDragEnd) return;
    onDragEnd(poleId, e);
  };

  // LOD (Level of Detail) scale-based visibility for performance
  const showDetails = renderLevel !== 'minimal';
  const showLabels = renderLevel === 'high';
  const showRange = isSelected && renderLevel !== 'minimal';
  const showEffects = renderLevel === 'high';
  const showCapacityBadge = renderLevel !== 'minimal';
  const showStatusRing = renderLevel !== 'minimal';
  const showInsulatorGlow = showEffects;

  // Calculate capacity status
  const capacityStatus = useMemo(() => {
    const maxConn = visualProps.maxConnections;
    const current = connectedCount;
    const hasSlots = current < maxConn;
    return {
      current,
      max: maxConn,
      hasSlots,
      isFull: current >= maxConn,
      statusColor: hasSlots ? '#27ae60' : '#e74c3c', // Green if slots available, red if full
      statusText: `${current}/${maxConn}`
    };
  }, [connectedCount, visualProps.maxConnections]);

  // Power status (for future calculator integration)
  // Default to green (connected) if pole exists with any connections
  const powerStatus = useMemo(() => {
    if (connectedCount === 0) {
      return { color: '#7f8c8d', label: 'Isolated', status: 'isolated' as const };
    }
    // Future: Check if connected to generator
    return { color: '#27ae60', label: 'Powered', status: 'powered' as const };
  }, [connectedCount]);

  // Determine if this pole should be draggable
  // Both standalone poles and building-based poles can be dragged in select mode
  const isDraggable = draggable && selectedTool === 'select' && interactive;

  return (
    <Group
      x={x}
      y={y}
      opacity={opacity}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Power status ring - preparation for calculator */}
      {showStatusRing && (
        <Ring
          innerRadius={visualProps.width + 10}
          outerRadius={visualProps.width + 13}
          fill={powerStatus.color}
          opacity={0.6}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Power pole range indicator (when selected) */}
      {showRange && (
        <Circle
          radius={visualProps.range * PIXELS_PER_METER}
          stroke={visualProps.accentColor}
          strokeWidth={1.5}
          opacity={0.4}
          dash={[10, 5]}
          listening={false}
        />
      )}

      {/* Selection glow - enhanced with tier color */}
      {isSelected && showEffects && (
        <Circle
          radius={visualProps.width + 12}
          fill={visualProps.glowColor}
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )}

      {/* Power Tower specific design - Enhanced */}
      {poleType === 'power_tower' && (
        <Group>
          {/* Tower base structure with metallic gradient effect */}
          <Rect
            x={-visualProps.width / 2}
            y={-visualProps.height / 4}
            width={visualProps.width}
            height={visualProps.height / 2}
            fill={visualProps.baseColor}
            stroke={visualProps.strokeColor}
            strokeWidth={visualProps.strokeWidth}
            cornerRadius={2}
            shadowColor={showEffects ? "rgba(0, 0, 0, 0.5)" : "transparent"}
            shadowBlur={showEffects ? 6 : 0}
            shadowOffsetY={showEffects ? 3 : 0}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            listening={interactive}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={showEffects}
          />

          {/* Tower accent stripe - Satisfactory orange */}
          {showDetails && (
            <Rect
              x={-visualProps.width / 2 + 1}
              y={-visualProps.height / 4 + 2}
              width={3}
              height={visualProps.height / 2 - 4}
              fill={visualProps.accentColor}
              cornerRadius={1}
              listening={false}
            />
          )}

          {/* Tower top structure */}
          <Rect
            x={-visualProps.width / 3}
            y={-visualProps.height * 0.75}
            width={visualProps.width * 0.66}
            height={visualProps.height / 2}
            fill={visualProps.metalColor}
            stroke={visualProps.strokeColor}
            strokeWidth={visualProps.strokeWidth}
            cornerRadius={1}
            listening={false}
          />

          {/* Tower crossbeams - lattice structure */}
          {showDetails && (
            <>
              <Line
                points={[-visualProps.width / 2, -visualProps.height / 4, visualProps.width / 2, -visualProps.height * 0.6]}
                stroke={visualProps.crossbeamColor}
                strokeWidth={2}
                listening={false}
              />
              <Line
                points={[visualProps.width / 2, -visualProps.height / 4, -visualProps.width / 2, -visualProps.height * 0.6]}
                stroke={visualProps.crossbeamColor}
                strokeWidth={2}
                listening={false}
              />
              {/* Horizontal support */}
              <Line
                points={[-visualProps.width / 3, -visualProps.height * 0.5, visualProps.width / 3, -visualProps.height * 0.5]}
                stroke={visualProps.crossbeamColor}
                strokeWidth={1.5}
                listening={false}
              />
            </>
          )}

          {/* High voltage insulators with glow effect */}
          {showDetails && [-6, 0, 6].map((offset, index) => (
            <Group key={index} x={offset} y={-visualProps.height * 0.8}>
              {/* Insulator glow */}
              {showInsulatorGlow && (
                <Circle
                  radius={4}
                  fill={visualProps.insulatorGlow}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              )}
              {/* Insulator body */}
              <Circle
                radius={2.5}
                fill={visualProps.insulatorColor}
                stroke="#ffffff"
                strokeWidth={0.5}
                listening={false}
              />
            </Group>
          ))}
        </Group>
      )}

      {/* Standard Power Pole design - Enhanced with tier differences */}
      {poleType !== 'power_tower' && (
        <Group>
          {/* Main pole shaft with metallic look */}
          <Rect
            x={-visualProps.width / 2}
            y={-visualProps.height}
            width={visualProps.width}
            height={visualProps.height}
            fill={visualProps.baseColor}
            stroke={visualProps.strokeColor}
            strokeWidth={visualProps.strokeWidth}
            cornerRadius={visualProps.width / 4}
            shadowColor={showEffects ? "rgba(0, 0, 0, 0.4)" : "transparent"}
            shadowBlur={showEffects ? 4 : 0}
            shadowOffsetY={showEffects ? 2 : 0}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            listening={interactive}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={showEffects}
          />

          {/* Metallic highlight strip */}
          {showDetails && (
            <Rect
              x={-visualProps.width / 2 + 1}
              y={-visualProps.height + 2}
              width={2}
              height={visualProps.height - 4}
              fill={visualProps.metalColor}
              cornerRadius={1}
              opacity={0.5}
              listening={false}
            />
          )}

          {/* Pole crossbeam - wider for higher tiers */}
          {showDetails && (
            <Rect
              x={-visualProps.width * 1.5}
              y={-visualProps.height * 0.8}
              width={visualProps.width * 3}
              height={visualProps.tier === 'Mk3' ? 3 : 2}
              fill={visualProps.crossbeamColor}
              cornerRadius={1}
              listening={false}
            />
          )}

          {/* Secondary crossbeam for Mk2 and Mk3 */}
          {showDetails && (visualProps.tier === 'Mk2' || visualProps.tier === 'Mk3') && (
            <Rect
              x={-visualProps.width * 1.2}
              y={-visualProps.height * 0.65}
              width={visualProps.width * 2.4}
              height={2}
              fill={visualProps.crossbeamColor}
              cornerRadius={1}
              opacity={0.8}
              listening={false}
            />
          )}

          {/* Insulators with glow - count based on tier */}
          {showDetails && Array.from({ length: visualProps.insulatorCount }).map((_, index) => {
            const totalWidth = visualProps.width * 2.4;
            const spacing = totalWidth / (visualProps.insulatorCount + 1);
            const xPos = -totalWidth / 2 + spacing * (index + 1);

            return (
              <Group key={index} x={xPos} y={-visualProps.height * 0.8}>
                {/* Insulator glow effect */}
                {showInsulatorGlow && (
                  <Circle
                    radius={3.5}
                    fill={visualProps.insulatorGlow}
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                )}
                {/* Insulator body */}
                <Circle
                  radius={2}
                  fill={visualProps.insulatorColor}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Pole base with accent */}
          <Rect
            x={-visualProps.width * 0.8}
            y={-2}
            width={visualProps.width * 1.6}
            height={4}
            fill={visualProps.crossbeamColor}
            cornerRadius={1}
            listening={false}
          />

          {/* Orange accent on base */}
          {showDetails && (
            <Rect
              x={-visualProps.width * 0.3}
              y={-1}
              width={visualProps.width * 0.6}
              height={2}
              fill={visualProps.accentColor}
              cornerRadius={0.5}
              listening={false}
            />
          )}
        </Group>
      )}


      {/* Connection capacity indicator badge */}
      {showCapacityBadge && (
        <Group x={visualProps.width + 5} y={-visualProps.height * 0.5}>
          {/* Badge background */}
          <Rect
            x={-12}
            y={-8}
            width={24}
            height={16}
            fill={capacityStatus.statusColor}
            cornerRadius={3}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={1}
            shadowColor={showEffects ? "rgba(0, 0, 0, 0.5)" : "transparent"}
            shadowBlur={showEffects ? 3 : 0}
            listening={false}
          />
          {/* Capacity text */}
          <Text
            text={capacityStatus.statusText}
            fontSize={9}
            fill="#ffffff"
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            width={24}
            align="center"
            offsetX={12}
            y={-5}
            listening={false}
          />
        </Group>
      )}

      {/* Connection point indicator - enhanced */}
      {renderLevel !== 'minimal' && (
        <Group>
          {/* Outer ring */}
          <Circle
            radius={5}
            fill="rgba(0, 0, 0, 0.8)"
            stroke={visualProps.accentColor}
            strokeWidth={1.5}
            listening={false}
            perfectDrawEnabled={false}
          />
          {/* Inner power indicator */}
          <Circle
            radius={2.5}
            fill={powerStatus.color}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      )}

      {/* Powerline selection indicator */}
      {isPowerlineSelected && (
        <Group>
          {/* Pulsing selection ring */}
          <Circle
            radius={18}
            stroke="#ffaa00"
            strokeWidth={3}
            opacity={0.9}
            dash={[8, 4]}
            listening={false}
          />
          {/* Inner glow */}
          <Circle
            radius={22}
            fill="rgba(255, 170, 0, 0.25)"
            listening={false}
          />
          {/* "Connecting..." indicator */}
          <Group y={25}>
            <Rect
              x={-30}
              y={-6}
              width={60}
              height={12}
              fill="rgba(255, 170, 0, 0.9)"
              cornerRadius={3}
              listening={false}
            />
            <Text
              text="Connecting..."
              fontSize={8}
              fill="#000000"
              fontFamily="Inter, Arial, sans-serif"
              fontStyle="bold"
              width={60}
              align="center"
              offsetX={30}
              y={-3}
              listening={false}
            />
          </Group>
        </Group>
      )}

      {/* Pole label and info - enhanced with tier and range */}
      {showLabels && (
        <Group y={poleType === 'power_tower' ? 25 : 20}>
          {/* Label background */}
          <Rect
            x={-40}
            y={-10}
            width={80}
            height={32}
            fill="rgba(0, 0, 0, 0.85)"
            cornerRadius={4}
            stroke={visualProps.accentColor}
            strokeWidth={1}
            shadowBlur={showEffects ? 5 : 0}
            shadowColor={showEffects ? "rgba(0, 0, 0, 0.7)" : "transparent"}
            listening={false}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={showEffects}
          />

          {/* Tier badge - centered, identifies the pole type */}
          <Rect
            x={-15}
            y={-8}
            width={30}
            height={12}
            fill={visualProps.insulatorColor}
            cornerRadius={3}
            listening={false}
          />
          <Text
            text={visualProps.tier}
            fontSize={9}
            fill="#ffffff"
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            x={-15}
            y={-5}
            width={30}
            align="center"
            listening={false}
          />

          {/* Range info */}
          <Text
            text={`Range: ${visualProps.range}m`}
            fontSize={7}
            fill="#95a5a6"
            fontFamily="Inter, Arial, sans-serif"
            width={80}
            align="center"
            offsetX={40}
            y={5}
            listening={false}
          />

          {/* Connection info */}
          <Text
            text={`Connections: ${capacityStatus.statusText}`}
            fontSize={7}
            fill={capacityStatus.hasSlots ? '#27ae60' : '#e74c3c'}
            fontFamily="Inter, Arial, sans-serif"
            width={80}
            align="center"
            offsetX={40}
            y={14}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};

PowerPoleShape.displayName = 'PowerPoleShape';