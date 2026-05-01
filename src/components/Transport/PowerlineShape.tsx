// src/components/Transport/PowerlineShape.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import { Group, Path, Circle, Rect, Text } from 'react-konva';
import { PowerlineSegment } from '../../types';
import { PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { getPoleData } from '../../utils/powerlineHelpers';
import { getCachedPowerNetworks, PowerNetworkInfo } from '../../logic/powerline/powerlineLogic';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';

interface PowerlineShapeProps {
  segment: PowerlineSegment;
  isSelected?: boolean;
  opacity?: number;
  scale: number;
}


/**
 * Gets powerline visual properties based on voltage and load
 */
const getPowerlineVisualProps = (
  voltage: string,
  currentLoad: number,
  capacity: number,
  isSelected: boolean
) => {
  const loadPercentage = capacity > 0 ? (currentLoad / capacity) : 0;
  
  // Base colors by voltage type - more realistic electrical system colors
  const voltageColors = {
    low: { base: '#00ff88', bright: '#44ffaa', dark: '#00cc66', name: 'Low Voltage' },
    medium: { base: '#0088ff', bright: '#44aaff', dark: '#0066cc', name: 'Medium Voltage' },
    high: { base: '#ff6600', bright: '#ff8844', dark: '#cc4400', name: 'High Voltage' }
  };
  
  const colors = voltageColors[voltage as keyof typeof voltageColors] || voltageColors.low;
  
  // Override for selection
  if (isSelected) {
    return {
      primary: '#ffaa00',
      secondary: '#ff8800',
      glow: 'rgba(255, 170, 0, 0.6)',
      strokeWidth: 5,
      name: `${colors.name} (Selected)`
    };
  }
  
  // Load-based modifications
  if (loadPercentage > 0.9) {
    return {
      primary: '#ff4444',
      secondary: '#cc2222',
      glow: 'rgba(255, 68, 68, 0.4)',
      strokeWidth: 4,
      name: `${colors.name} (Overloaded)`
    };
  }
  
  if (loadPercentage > 0.7) {
    return {
      primary: '#ffaa00',
      secondary: '#cc8800',
      glow: 'rgba(255, 170, 0, 0.3)',
      strokeWidth: 3.5,
      name: `${colors.name} (High Load)`
    };
  }
  
  // Normal operation
  const strokeWidth = voltage === 'high' ? 4 : voltage === 'medium' ? 3 : 2.5;
  
  // Simplified glow colors for each voltage type
  const glowColors = {
    low: 'rgba(0, 255, 136, 0.3)',
    medium: 'rgba(0, 136, 255, 0.3)',
    high: 'rgba(255, 102, 0, 0.3)'
  };
  
  return {
    primary: colors.base,
    secondary: colors.dark,
    glow: glowColors[voltage as keyof typeof glowColors] || glowColors.low,
    strokeWidth,
    name: colors.name
  };
};

/**
 * PowerlineShape component with simplified straight-line rendering
 */
export const PowerlineShape: React.FC<PowerlineShapeProps> = React.memo(({
  segment,
  isSelected = false,
  opacity = 1.0,
  scale
}) => {
  // Performance mode for animation control
  const { mode: performanceMode, isLowPerformance } = usePerformanceMode();

  // Animation state for power flow
  const [dashOffset, setDashOffset] = React.useState(0);
  const animationRef = useRef<number | null>(null);

  // Performance: Move useLayoutStore outside render to prevent unnecessary re-renders
  const buildings = useLayoutStore(state => state.buildings);
  const powerPoles = useLayoutStore(state => state.powerPoles);
  const powerlineSegments = useLayoutStore(state => state.powerlineSegments);
  const powerlineVisibility = useLayoutStore(state => state.powerlineVisibility);
  const { setSelectedPowerlineSegment, selectedTool, deletePowerlineSegment } = useLayoutStore();

  // If powerline visibility is 'hide', don't render anything
  if (powerlineVisibility === 'hide') {
    return null;
  }

  // Calculate effective opacity based on visibility setting
  const effectiveOpacity = powerlineVisibility === 'semi-transparent' ? opacity * 0.3 : opacity;

  // Performance: Memoize pole data lookup to prevent recalculation on every render
  const startPole = useMemo(() => getPoleData(segment.startPole, buildings, powerPoles), [segment.startPole, buildings, powerPoles]);
  const endPole = useMemo(() => getPoleData(segment.endPole, buildings, powerPoles), [segment.endPole, buildings, powerPoles]);

  // Calculate power network info for this segment
  const networkInfo = useMemo((): PowerNetworkInfo | null => {
    const networks = getCachedPowerNetworks(buildings, powerPoles, powerlineSegments);
    // Find which network contains this segment's poles
    for (const network of networks) {
      if (network.connectedPoleIds.includes(segment.startPole) ||
          network.connectedPoleIds.includes(segment.endPole)) {
        return network;
      }
    }
    return null;
  }, [buildings, powerPoles, powerlineSegments, segment.startPole, segment.endPole]);

  // Determine if power is flowing (generation exists and net power >= 0)
  const isPowerFlowing = networkInfo && networkInfo.totalGeneration > 0 && networkInfo.netPower >= 0;

  // Animation for power flow - only in balanced and high performance modes
  useEffect(() => {
    // Don't animate in low performance mode or if no power is flowing
    if (isLowPerformance || !isPowerFlowing) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Animation speed based on power level
    const speed = Math.min(networkInfo.totalGeneration / 500, 2) + 0.5; // 0.5 to 2.5 speed

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update dash offset (12 is the dash pattern length)
      setDashOffset(prev => (prev + speed * deltaTime * 0.03) % 24);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isLowPerformance, isPowerFlowing, networkInfo?.totalGeneration]);


  // Path generation supporting both straight lines and L-shaped (right-angle) routing
  const pathData = useMemo(() => {
    if (!startPole || !endPole) {
      return '';
    }

    const startX = startPole.x * PIXELS_PER_METER;
    const startY = startPole.y * PIXELS_PER_METER;
    const endX = endPole.x * PIXELS_PER_METER;
    const endY = endPole.y * PIXELS_PER_METER;

    // Check if segment has control points (L-shaped routing)
    if (segment.controlPoints && segment.controlPoints.length > 0) {
      // L-shaped path through control points
      let path = `M ${startX} ${startY}`;
      for (const cp of segment.controlPoints) {
        path += ` L ${cp.x * PIXELS_PER_METER} ${cp.y * PIXELS_PER_METER}`;
      }
      path += ` L ${endX} ${endY}`;
      return path;
    }

    // Direct straight line path
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }, [startPole, endPole, segment.controlPoints]);

  // Determine visual properties - updated to use new visual props system
  const strokeWidth = useMemo(() => {
    const visualProps = getPowerlineVisualProps(segment.voltage, 0, segment.capacity, isSelected);
    // Scale stroke width based on zoom level
    return Math.max(visualProps.strokeWidth * Math.min(scale, 2), 1);
  }, [segment.voltage, segment.capacity, isSelected, scale]);

  // Safety check: don't render if poles are missing
  if (!startPole || !endPole) {
    console.warn(`[PowerlineShape] Missing poles for segment ${segment.id}: start=${segment.startPole}, end=${segment.endPole}`);
    return null;
  }

  const visualProps = useMemo(() => {
    // Use actual power consumption from network if available
    const currentLoad = networkInfo ? networkInfo.totalConsumption : 0;
    const effectiveCapacity = networkInfo ? networkInfo.totalGeneration : segment.capacity;
    const baseProps = getPowerlineVisualProps(
      segment.voltage,
      currentLoad,
      effectiveCapacity > 0 ? effectiveCapacity : segment.capacity,
      isSelected
    );

    // Override colors to red if network is underpowered (short on power)
    if (networkInfo && networkInfo.netPower < 0) {
      return {
        ...baseProps,
        primary: '#e74c3c',      // Red for underpowered
        secondary: '#c0392b',    // Darker red
        glow: 'rgba(231, 76, 60, 0.4)',
        name: `${baseProps.name} (Underpowered)`
      };
    }

    return baseProps;
  }, [segment.voltage, segment.capacity, isSelected, networkInfo]);

  return (
    <Group opacity={effectiveOpacity}>
      {/* Selection glow effect - rendered behind main line */}
      {isSelected && (
        <Path
          data={pathData}
          stroke={visualProps.glow}
          strokeWidth={visualProps.strokeWidth + 4}
          lineCap="round"
          lineJoin="round"
          opacity={0.4}
          blur={6}
          listening={false}
        />
      )}
      
      {/* Powerline shadow for depth */}
      <Path
        data={pathData}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth={visualProps.strokeWidth + 1}
        lineCap="round"
        lineJoin="round"
        offsetY={2}
        blur={1}
        listening={false}
      />
      
      {/* Main powerline conductor with realistic appearance */}
      <Path
        data={pathData}
        stroke={visualProps.secondary}
        strokeWidth={visualProps.strokeWidth + 0.5}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      
      {/* Primary powerline with metallic appearance */}
      <Path
        data={pathData}
        stroke={visualProps.primary}
        strokeWidth={visualProps.strokeWidth}
        lineCap="round"
        lineJoin="round"
        listening={true}
        // Enhanced hover and click handlers
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'pointer';
          }
          // TODO: Show powerline info tooltip
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'default';
          }
        }}
        onClick={(e) => {
          e.cancelBubble = true;
          // Actions are now available from component-level hook
          
          if (selectedTool === 'select') {
            setSelectedPowerlineSegment(segment.id);
          } else if (selectedTool === 'delete') {
            deletePowerlineSegment(segment.id);
          }
        }}
      />
      
      {/* Power flow visualization - animated effect when power is flowing */}
      {scale > 0.8 && isPowerFlowing && !isLowPerformance && (
        <Path
          data={pathData}
          stroke={networkInfo.netPower >= 0 ? 'rgba(39, 174, 96, 0.8)' : 'rgba(231, 76, 60, 0.8)'} // Green for surplus, red for deficit
          strokeWidth={Math.max(2, visualProps.strokeWidth / 2)}
          lineCap="round"
          lineJoin="round"
          dash={[8, 16]}
          dashOffset={-dashOffset}
          opacity={0.9}
          listening={false}
        />
      )}
      {/* Static power flow indicator for low performance mode */}
      {scale > 0.8 && isPowerFlowing && isLowPerformance && (
        <Path
          data={pathData}
          stroke={networkInfo.netPower >= 0 ? 'rgba(39, 174, 96, 0.6)' : 'rgba(231, 76, 60, 0.6)'}
          strokeWidth={Math.max(1, visualProps.strokeWidth / 3)}
          lineCap="round"
          lineJoin="round"
          dash={[4, 8]}
          opacity={0.7}
          listening={false}
        />
      )}
      
      {/* Connection point indicators at endpoints */}
      {scale > 0.5 && (
        <>
          {/* Start connection indicator */}
          <Group x={startPole.x * PIXELS_PER_METER} y={startPole.y * PIXELS_PER_METER}>
            <Circle
              radius={8}
              fill="rgba(0, 0, 0, 0.6)"
              stroke={visualProps.primary}
              strokeWidth={2}
              listening={false}
            />
            <Circle
              radius={4}
              fill={visualProps.primary}
              opacity={0.8}
              listening={false}
            />
            <Circle
              radius={2}
              fill="rgba(255, 255, 255, 0.9)"
              listening={false}
            />
          </Group>
          
          {/* End connection indicator */}
          <Group x={endPole.x * PIXELS_PER_METER} y={endPole.y * PIXELS_PER_METER}>
            <Circle
              radius={8}
              fill="rgba(0, 0, 0, 0.6)"
              stroke={visualProps.primary}
              strokeWidth={2}
              listening={false}
            />
            <Circle
              radius={4}
              fill={visualProps.primary}
              opacity={0.8}
              listening={false}
            />
            <Circle
              radius={2}
              fill="rgba(255, 255, 255, 0.9)"
              listening={false}
            />
          </Group>
        </>
      )}
      
      
      {/* Power network indicator for normal zoom levels */}
      {scale > 0.6 && (
        <Group
          x={(startPole.x + endPole.x) / 2 * PIXELS_PER_METER}
          y={(startPole.y + endPole.y) / 2 * PIXELS_PER_METER - 20}
        >
          {/* Indicator background - wider to accommodate text */}
          <Rect
            x={-55}
            y={-12}
            width={110}
            height={24}
            fill="rgba(0, 0, 0, 0.9)"
            cornerRadius={6}
            stroke={networkInfo ? (networkInfo.status === 'powered' || networkInfo.status === 'surplus' ? '#27ae60' : networkInfo.status === 'underpowered' ? '#e74c3c' : '#7f8c8d') : visualProps.primary}
            strokeWidth={2}
            shadowBlur={6}
            shadowColor="rgba(0, 0, 0, 0.8)"
            listening={false}
          />

          {/* Power status indicator */}
          <Circle
            x={-42}
            y={0}
            radius={6}
            fill={networkInfo ? (networkInfo.status === 'powered' || networkInfo.status === 'surplus' ? '#27ae60' : networkInfo.status === 'underpowered' ? '#e74c3c' : '#7f8c8d') : visualProps.primary}
            stroke="white"
            strokeWidth={1}
            listening={false}
          />

          {/* Power generation and consumption label */}
          <Text
            text={networkInfo ? `⚡${networkInfo.totalGeneration}` : 'No Power'}
            fontSize={10}
            fill={networkInfo?.totalGeneration ? '#27ae60' : '#7f8c8d'}
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            width={40}
            align="left"
            x={-32}
            y={-8}
            listening={false}
          />
          <Text
            text={networkInfo ? `🔌${networkInfo.totalConsumption}` : ''}
            fontSize={10}
            fill={networkInfo?.totalConsumption ? '#e67e22' : '#7f8c8d'}
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            width={40}
            align="right"
            x={5}
            y={-8}
            listening={false}
          />

          {/* Net power status label */}
          <Text
            text={networkInfo ? (networkInfo.netPower > 0 ? `${networkInfo.netPower} MW free` : networkInfo.netPower < 0 ? `${Math.abs(networkInfo.netPower)} MW short` : 'Balanced') : 'Isolated'}
            fontSize={9}
            fill={networkInfo ? (networkInfo.netPower >= 0 ? '#27ae60' : '#e74c3c') : '#7f8c8d'}
            fontFamily="Inter, Arial, sans-serif"
            fontStyle="bold"
            width={65}
            align="center"
            x={-32}
            y={2}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Performance: Optimized memo comparison - check most likely to change first
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (Math.abs(prevProps.scale - nextProps.scale) >= 0.05) return false;
  if (Math.abs(prevProps.opacity - nextProps.opacity) >= 0.01) return false;
  if (prevProps.segment.id !== nextProps.segment.id) return false;
  
  // These are less likely to change during scroll, so check last
  if (prevProps.segment.capacity !== nextProps.segment.capacity) return false;
  if (prevProps.segment.voltage !== nextProps.segment.voltage) return false;
  if (prevProps.segment.startPole !== nextProps.segment.startPole) return false;
  if (prevProps.segment.endPole !== nextProps.segment.endPole) return false;
  
  return true;
});

PowerlineShape.displayName = 'PowerlineShape';