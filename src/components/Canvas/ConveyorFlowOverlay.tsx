// src/components/Canvas/ConveyorFlowOverlay.tsx
// Conveyor flow rate overlay for production visualization

import React, { useMemo } from 'react';
import { Group, Rect, Text, Arrow, Circle } from 'react-konva';
import { PIXELS_PER_METER } from '../../constants';
import { ConveyorFlow } from '../../logic/production/flowCalculation';

// ============================================
// TYPES
// ============================================

export interface ConveyorFlowOverlayProps {
  /** Start point in world coordinates (meters) */
  startX: number;
  startY: number;
  /** End point in world coordinates (meters) */
  endX: number;
  endY: number;
  /** Flow data from production calculation */
  flow?: ConveyorFlow;
  /** Current canvas scale */
  scale?: number;
  /** Whether to show flow direction arrow */
  showDirectionArrow?: boolean;
  /** Whether this segment is a bottleneck */
  isBottleneck?: boolean;
  /** Badge size mode */
  size?: 'compact' | 'normal';
  /** Whether the overlay is visible */
  visible?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const FLOW_COLORS = {
  healthy: '#22c55e',      // Green - good utilization
  moderate: '#eab308',     // Yellow - moderate utilization
  bottleneck: '#ef4444',   // Red - at capacity/bottleneck
  empty: '#6b7280',        // Gray - no flow
};

const SIZE_CONFIGS = {
  compact: {
    width: 48,
    height: 18,
    fontSize: 8,
    padding: 4,
    cornerRadius: 5,
  },
  normal: {
    width: 62,
    height: 24,
    fontSize: 10,
    padding: 6,
    cornerRadius: 6,
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * ConveyorFlowOverlay - Shows throughput on conveyor segments
 *
 * Displays:
 * - Actual rate / max capacity (e.g., "45/60")
 * - Color-coded by utilization
 * - Optional flow direction arrow
 * - Bottleneck highlighting
 */
export const ConveyorFlowOverlay = React.memo<ConveyorFlowOverlayProps>(({
  startX,
  startY,
  endX,
  endY,
  flow,
  scale = 1,
  showDirectionArrow = false,
  isBottleneck = false,
  size = 'normal',
  visible = true,
}) => {
  // Calculate midpoint in pixels
  const midX = ((startX + endX) / 2) * PIXELS_PER_METER;
  const midY = ((startY + endY) / 2) * PIXELS_PER_METER;

  // Calculate scale adjustments for readability
  const scaleAdjustment = useMemo(() => {
    if (scale < 0.3) return 2.0 / scale;
    if (scale < 0.5) return 1.5 / scale;
    if (scale < 0.75) return 1.2 / scale;
    if (scale > 1.5) return 0.8 / scale;
    return 1;
  }, [scale]);

  // Get size configuration
  const config = SIZE_CONFIGS[size];

  // Size configurations with scale adjustment
  const adjustedWidth = config.width * scaleAdjustment;
  const adjustedHeight = config.height * scaleAdjustment;
  const adjustedFontSize = config.fontSize * scaleAdjustment;
  const adjustedPadding = config.padding * scaleAdjustment;
  const adjustedCornerRadius = config.cornerRadius * scaleAdjustment;
  const arrowSize = 10 * scaleAdjustment;

  // Calculate arrow direction if needed
  const arrowData = useMemo(() => {
    if (!showDirectionArrow) return null;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return null;

    // Normalized direction
    const nx = dx / length;
    const ny = dy / length;

    // Arrow positioned slightly after midpoint (offset from badge)
    const offsetDistance = adjustedWidth / 2 + 15;
    const arrowMidX = midX + nx * offsetDistance;
    const arrowMidY = midY + ny * offsetDistance;

    return {
      points: [
        arrowMidX - nx * arrowSize,
        arrowMidY - ny * arrowSize,
        arrowMidX + nx * arrowSize,
        arrowMidY + ny * arrowSize,
      ],
    };
  }, [startX, startY, endX, endY, midX, midY, showDirectionArrow, adjustedWidth, arrowSize]);

  // Don't render if not visible
  if (!visible) return null;

  // Get flow values
  const rate = flow?.rate ?? 0;
  const capacity = flow?.capacity ?? 60; // Default to Mk1 belt
  const utilization = flow?.utilization ?? 0;

  // Format display text
  const flowText = `${Math.round(rate)}/${capacity}`;

  // Determine color based on utilization
  const getFlowColor = () => {
    if (isBottleneck) return FLOW_COLORS.bottleneck;
    if (rate === 0) return FLOW_COLORS.empty;
    if (utilization >= 95) return FLOW_COLORS.bottleneck;
    if (utilization >= 70) return FLOW_COLORS.moderate;
    return FLOW_COLORS.healthy;
  };

  const flowColor = getFlowColor();

  // Background color based on state
  const getBgColor = () => {
    if (isBottleneck) return 'rgba(40, 15, 15, 0.95)';
    if (rate === 0) return 'rgba(25, 30, 35, 0.95)';
    if (utilization >= 95) return 'rgba(40, 15, 15, 0.95)';
    if (utilization >= 70) return 'rgba(35, 30, 12, 0.95)';
    return 'rgba(15, 30, 20, 0.95)';
  };

  const bgColor = getBgColor();

  return (
    <Group listening={false}>
      {/* Bottleneck glow effect */}
      {isBottleneck && (
        <Rect
          x={midX - adjustedWidth / 2 - 3}
          y={midY - adjustedHeight / 2 - 3}
          width={adjustedWidth + 6}
          height={adjustedHeight + 6}
          fill="transparent"
          stroke={FLOW_COLORS.bottleneck}
          strokeWidth={2}
          cornerRadius={adjustedCornerRadius + 2}
          shadowBlur={10}
          shadowColor={FLOW_COLORS.bottleneck}
          opacity={0.5}
        />
      )}

      {/* Background pill */}
      <Rect
        x={midX - adjustedWidth / 2}
        y={midY - adjustedHeight / 2}
        width={adjustedWidth}
        height={adjustedHeight}
        fill={bgColor}
        stroke={flowColor}
        strokeWidth={1.5}
        cornerRadius={adjustedCornerRadius}
        shadowBlur={4}
        shadowColor="rgba(0, 0, 0, 0.5)"
        shadowOffsetY={2}
      />

      {/* Utilization indicator dot */}
      <Circle
        x={midX - adjustedWidth / 2 + adjustedPadding + 4 * scaleAdjustment}
        y={midY}
        radius={4 * scaleAdjustment}
        fill={flowColor}
        shadowBlur={rate > 0 ? 4 : 0}
        shadowColor={flowColor}
      />

      {/* Flow rate text */}
      <Text
        x={midX - adjustedWidth / 2 + adjustedPadding + 12 * scaleAdjustment}
        y={midY - adjustedFontSize / 2}
        text={flowText}
        fontSize={adjustedFontSize}
        fontFamily="Inter, system-ui, sans-serif"
        fontStyle="bold"
        fill="#f8fafc"
      />

      {/* Direction arrow */}
      {arrowData && (
        <Arrow
          points={arrowData.points}
          stroke={flowColor}
          strokeWidth={2 * Math.min(scaleAdjustment, 1.5)}
          fill={flowColor}
          pointerLength={5 * scaleAdjustment}
          pointerWidth={5 * scaleAdjustment}
          opacity={0.8}
        />
      )}
    </Group>
  );
});

ConveyorFlowOverlay.displayName = 'ConveyorFlowOverlay';

// ============================================
// PIPELINE FLOW OVERLAY
// ============================================

// Fluid type color palette - matches PipelineShape.tsx colors
const FLUID_COLORS: Record<string, { primary: string; bg: string; name: string }> = {
  water: { primary: '#3498db', bg: 'rgba(52, 152, 219, 0.15)', name: 'H2O' },
  crude_oil: { primary: '#2c3e50', bg: 'rgba(44, 62, 80, 0.15)', name: 'OIL' },
  oil: { primary: '#2c3e50', bg: 'rgba(44, 62, 80, 0.15)', name: 'OIL' },
  heavy_oil_residue: { primary: '#1a252f', bg: 'rgba(26, 37, 47, 0.15)', name: 'HOR' },
  fuel: { primary: '#e67e22', bg: 'rgba(230, 126, 34, 0.15)', name: 'FUEL' },
  turbofuel: { primary: '#f39c12', bg: 'rgba(243, 156, 18, 0.15)', name: 'TURBO' },
  liquid_biofuel: { primary: '#27ae60', bg: 'rgba(39, 174, 96, 0.15)', name: 'BIO' },
  sulfuric_acid: { primary: '#27ae60', bg: 'rgba(39, 174, 96, 0.15)', name: 'H2SO4' },
  acid: { primary: '#27ae60', bg: 'rgba(39, 174, 96, 0.15)', name: 'ACID' },
  nitric_acid: { primary: '#8e44ad', bg: 'rgba(142, 68, 173, 0.15)', name: 'HNO3' },
  alumina_solution: { primary: '#ecf0f1', bg: 'rgba(236, 240, 241, 0.15)', name: 'Al2O3' },
  alumina: { primary: '#ecf0f1', bg: 'rgba(236, 240, 241, 0.15)', name: 'Al2O3' },
  nitrogen_gas: { primary: '#85c1e2', bg: 'rgba(133, 193, 226, 0.15)', name: 'N2' },
  nitrogen: { primary: '#85c1e2', bg: 'rgba(133, 193, 226, 0.15)', name: 'N2' },
  rocket_fuel: { primary: '#e74c3c', bg: 'rgba(231, 76, 60, 0.15)', name: 'ROCKET' },
  ionized_fuel: { primary: '#9b59b6', bg: 'rgba(155, 89, 182, 0.15)', name: 'ION' },
  dissolved_silica: { primary: '#bdc3c7', bg: 'rgba(189, 195, 199, 0.15)', name: 'SiO2' },
  dark_matter_residue: { primary: '#2c3e50', bg: 'rgba(44, 62, 80, 0.15)', name: 'DMR' },
  excited_photonic_matter: { primary: '#f1c40f', bg: 'rgba(241, 196, 15, 0.15)', name: 'EPM' },
  // Default/unknown fluid
  default: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', name: 'FLUID' },
};

/**
 * Get fluid color information by fluid ID
 */
const getFluidColors = (fluidId: string | undefined): { primary: string; bg: string; name: string } => {
  if (!fluidId) return FLUID_COLORS.default;
  return FLUID_COLORS[fluidId] || FLUID_COLORS.default;
};

export interface PipelineFlowOverlayProps {
  /** Start point in world coordinates (meters) */
  startX: number;
  startY: number;
  /** End point in world coordinates (meters) */
  endX: number;
  endY: number;
  /** Fluid type ID (e.g., 'water', 'fuel', 'acid') */
  fluidId?: string;
  /** Flow rate in m3/min */
  rate?: number;
  /** Maximum capacity */
  capacity?: number;
  /** Utilization percentage */
  utilization?: number;
  /** Current canvas scale */
  scale?: number;
  /** Whether this is a bottleneck */
  isBottleneck?: boolean;
  /** Whether the overlay is visible */
  visible?: boolean;
  /** Badge size mode */
  size?: 'compact' | 'normal';
  /** Whether to show fluid type indicator */
  showFluidType?: boolean;
}

// Size configurations for fluid overlay badges
// Redesigned with proper vertical stacking for clear readability
// Font sizes reduced for better balance with badge dimensions
const FLUID_SIZE_CONFIGS = {
  compact: {
    width: 52,
    height: 32,
    fontSize: 7,
    fluidFontSize: 6,
    unitsFontSize: 5,
    padding: 4,
    cornerRadius: 5,
    iconSize: 6,
    lineSpacing: 9,
  },
  normal: {
    width: 62,
    height: 38,
    fontSize: 9,
    fluidFontSize: 7,
    unitsFontSize: 6,
    padding: 5,
    cornerRadius: 6,
    iconSize: 8,
    lineSpacing: 11,
  },
};

/**
 * PipelineFlowOverlay - Enhanced fluid flow visualization for pipes
 *
 * Features:
 * - Flow rate display in m3/min
 * - Utilization percentage indicator
 * - Fluid type color coding
 * - Bottleneck highlighting with glow effect
 * - Fluid type name badge
 */
export const PipelineFlowOverlay = React.memo<PipelineFlowOverlayProps>(({
  startX,
  startY,
  endX,
  endY,
  fluidId,
  rate = 0,
  capacity = 300, // Default Mk1 pipe
  utilization = 0,
  scale = 1,
  isBottleneck = false,
  visible = true,
  size = 'normal',
  showFluidType = true,
}) => {
  // Calculate midpoint in pixels
  const midX = ((startX + endX) / 2) * PIXELS_PER_METER;
  const midY = ((startY + endY) / 2) * PIXELS_PER_METER;

  // Scale adjustments for readability
  const scaleAdjustment = useMemo(() => {
    if (scale < 0.3) return 2.0 / scale;
    if (scale < 0.5) return 1.5 / scale;
    if (scale < 0.75) return 1.2 / scale;
    if (scale > 1.5) return 0.8 / scale;
    return 1;
  }, [scale]);

  // Get fluid colors
  const fluidColors = useMemo(() => getFluidColors(fluidId), [fluidId]);

  // Don't render if not visible
  if (!visible) return null;

  // Get size configuration
  const config = FLUID_SIZE_CONFIGS[size];

  // Adjusted dimensions
  const adjustedWidth = config.width * scaleAdjustment;
  const adjustedHeight = config.height * scaleAdjustment;
  const adjustedFontSize = config.fontSize * scaleAdjustment;
  const adjustedFluidFontSize = config.fluidFontSize * scaleAdjustment;
  const adjustedUnitsFontSize = config.unitsFontSize * scaleAdjustment;
  const adjustedPadding = config.padding * scaleAdjustment;
  const adjustedCornerRadius = config.cornerRadius * scaleAdjustment;
  const adjustedIconSize = config.iconSize * scaleAdjustment;
  const adjustedLineSpacing = config.lineSpacing * scaleAdjustment;

  // Format display (m3/min)
  const flowText = `${Math.round(rate)}/${capacity}`;

  // Determine status color based on utilization
  const getStatusColor = () => {
    if (isBottleneck) return '#ef4444'; // Red for bottleneck
    if (rate === 0) return '#6b7280'; // Gray for no flow
    if (utilization >= 95) return '#ef4444'; // Red for saturated
    if (utilization >= 70) return '#eab308'; // Yellow for high utilization
    return fluidColors.primary; // Fluid color for normal
  };

  const statusColor = getStatusColor();

  // Background color based on state
  const getBgColor = () => {
    if (isBottleneck) return 'rgba(40, 15, 15, 0.95)';
    if (rate === 0) return 'rgba(25, 30, 35, 0.95)';
    if (utilization >= 95) return 'rgba(40, 15, 15, 0.95)';
    if (utilization >= 70) return 'rgba(35, 30, 12, 0.95)';
    // Use fluid-tinted background
    return `rgba(15, 25, 40, 0.95)`;
  };

  const bgColor = getBgColor();

  // Calculate utilization bar width
  const utilizationBarWidth = Math.max(0, Math.min(100, utilization)) / 100 * (adjustedWidth - adjustedPadding * 2);

  return (
    <Group listening={false}>
      {/* Bottleneck glow effect - pulsing highlight */}
      {isBottleneck && (
        <>
          {/* Outer glow */}
          <Rect
            x={midX - adjustedWidth / 2 - 4}
            y={midY - adjustedHeight / 2 - 4}
            width={adjustedWidth + 8}
            height={adjustedHeight + 8}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth={2}
            cornerRadius={adjustedCornerRadius + 3}
            shadowBlur={12}
            shadowColor="#ef4444"
            opacity={0.6}
          />
          {/* Inner pulse glow */}
          <Rect
            x={midX - adjustedWidth / 2 - 2}
            y={midY - adjustedHeight / 2 - 2}
            width={adjustedWidth + 4}
            height={adjustedHeight + 4}
            fill="transparent"
            stroke="#ff6b6b"
            strokeWidth={1}
            cornerRadius={adjustedCornerRadius + 2}
            shadowBlur={6}
            shadowColor="#ef4444"
            opacity={0.4}
          />
        </>
      )}

      {/* High utilization warning glow (>90%) */}
      {!isBottleneck && utilization >= 90 && (
        <Rect
          x={midX - adjustedWidth / 2 - 2}
          y={midY - adjustedHeight / 2 - 2}
          width={adjustedWidth + 4}
          height={adjustedHeight + 4}
          fill="transparent"
          stroke="#f59e0b"
          strokeWidth={1.5}
          cornerRadius={adjustedCornerRadius + 2}
          shadowBlur={8}
          shadowColor="#f59e0b"
          opacity={0.5}
        />
      )}

      {/* Main background pill */}
      <Rect
        x={midX - adjustedWidth / 2}
        y={midY - adjustedHeight / 2}
        width={adjustedWidth}
        height={adjustedHeight}
        fill={bgColor}
        stroke={statusColor}
        strokeWidth={1.5}
        cornerRadius={adjustedCornerRadius}
        shadowBlur={4}
        shadowColor="rgba(0, 0, 0, 0.5)"
        shadowOffsetY={2}
      />

      {/* ===== LINE 1: Fluid type with icon ===== */}
      {/* Fluid type indicator circle */}
      <Circle
        x={midX - adjustedWidth / 2 + adjustedPadding + adjustedIconSize / 2}
        y={midY - adjustedHeight / 2 + adjustedPadding + adjustedIconSize / 2}
        radius={adjustedIconSize / 2}
        fill={fluidColors.primary}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={0.5}
        shadowBlur={rate > 0 ? 3 : 0}
        shadowColor={fluidColors.primary}
      />

      {/* Fluid type label */}
      {showFluidType && (
        <Text
          x={midX - adjustedWidth / 2 + adjustedPadding + adjustedIconSize + 4 * scaleAdjustment}
          y={midY - adjustedHeight / 2 + adjustedPadding}
          text={fluidColors.name}
          fontSize={adjustedFluidFontSize}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="bold"
          fill={fluidColors.primary}
        />
      )}

      {/* ===== LINE 2: Flow rate (prominent) ===== */}
      <Text
        x={midX - adjustedWidth / 2 + adjustedPadding}
        y={midY - adjustedHeight / 2 + adjustedPadding + adjustedLineSpacing}
        text={flowText}
        fontSize={adjustedFontSize}
        fontFamily="Inter, system-ui, sans-serif"
        fontStyle="bold"
        fill="#f8fafc"
      />

      {/* Units label next to flow rate */}
      <Text
        x={midX + adjustedWidth / 2 - adjustedPadding - 18 * scaleAdjustment}
        y={midY - adjustedHeight / 2 + adjustedPadding + adjustedLineSpacing + (adjustedFontSize - adjustedUnitsFontSize)}
        text="m³/m"
        fontSize={adjustedUnitsFontSize}
        fontFamily="Inter, system-ui, sans-serif"
        fill="rgba(248, 250, 252, 0.5)"
      />

      {/* ===== LINE 3: Utilization bar ===== */}
      {/* Utilization bar (background track) */}
      <Rect
        x={midX - adjustedWidth / 2 + adjustedPadding}
        y={midY + adjustedHeight / 2 - adjustedPadding - 3 * scaleAdjustment}
        width={adjustedWidth - adjustedPadding * 2}
        height={3 * scaleAdjustment}
        fill="rgba(255, 255, 255, 0.15)"
        cornerRadius={1.5 * scaleAdjustment}
      />

      {/* Utilization bar (filled) */}
      <Rect
        x={midX - adjustedWidth / 2 + adjustedPadding}
        y={midY + adjustedHeight / 2 - adjustedPadding - 3 * scaleAdjustment}
        width={utilizationBarWidth}
        height={3 * scaleAdjustment}
        fill={statusColor}
        cornerRadius={1.5 * scaleAdjustment}
        shadowBlur={rate > 0 ? 2 : 0}
        shadowColor={statusColor}
      />
    </Group>
  );
});

PipelineFlowOverlay.displayName = 'PipelineFlowOverlay';

// ============================================
// EXPORT FLUID COLORS FOR EXTERNAL USE
// ============================================

export { FLUID_COLORS, getFluidColors };
