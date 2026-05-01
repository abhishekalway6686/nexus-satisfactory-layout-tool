// src/components/Canvas/ProductionBadge.tsx
// Production overlay badge component for displaying building efficiency and output rates

import React, { useMemo } from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import { PIXELS_PER_METER } from '../../constants';

// ============================================
// STATUS COLORS
// ============================================

export const STATUS_COLORS = {
  running: '#22c55e',      // Green - 100% efficiency
  underutilized: '#eab308', // Yellow - 50-99%
  starved: '#ef4444',       // Red - <50% or blocked
  idle: '#6b7280',          // Gray - no recipe
  noPower: '#a855f7',       // Purple - unpowered
} as const;

export type ProductionStatus = keyof typeof STATUS_COLORS;

// ============================================
// TYPES
// ============================================

export interface ProductionBadgeProps {
  /** X position in world coordinates (meters) */
  x: number;
  /** Y position in world coordinates (meters) */
  y: number;
  /** Current efficiency percentage (0-100) */
  efficiency: number;
  /** Output rate string (e.g., "60/min") */
  outputRate?: string;
  /** Input rate string (optional, for showing input/output) */
  inputRate?: string;
  /** Production status */
  status: ProductionStatus;
  /** Badge size mode */
  size?: 'compact' | 'normal' | 'large';
  /** Current canvas scale for responsive sizing */
  scale?: number;
  /** Whether the badge should be visible */
  visible?: boolean;
  /** X offset from building position (positive = right) */
  offsetX?: number;
  /** Y offset from building position (positive = down) */
  offsetY?: number;
  /** Building name for display (optional) */
  buildingName?: string;
}

// ============================================
// BADGE SIZE CONFIGURATIONS
// ============================================

const BADGE_SIZES = {
  compact: {
    width: 42,
    height: 16,
    fontSize: 7,
    efficiencySize: 6,
    iconSize: 4,
    padding: 2,
    cornerRadius: 4,
    statusDotSize: 3,
  },
  normal: {
    width: 55,
    height: 22,
    fontSize: 8,
    efficiencySize: 7,
    iconSize: 5,
    padding: 4,
    cornerRadius: 5,
    statusDotSize: 4,
  },
  large: {
    width: 75,
    height: 30,
    fontSize: 10,
    efficiencySize: 9,
    iconSize: 7,
    padding: 6,
    cornerRadius: 6,
    statusDotSize: 5,
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * ProductionBadge - Konva component for displaying production status on canvas
 *
 * Shows:
 * - Output rate (e.g., "60/min")
 * - Efficiency percentage
 * - Color-coded status indicator
 * - Optional connector line to building
 *
 * Scale-aware: automatically adjusts size at different zoom levels
 */
export const ProductionBadge = React.memo<ProductionBadgeProps>(({
  x,
  y,
  efficiency,
  outputRate,
  inputRate,
  status,
  size = 'normal',
  scale = 1,
  visible = true,
  offsetX = 0,
  offsetY = 0,
  // buildingName is available for future use (e.g., tooltips)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  buildingName,
}) => {
  // Get size configuration
  const sizeConfig = BADGE_SIZES[size];

  // Calculate scale-adjusted dimensions
  // At low zoom, make badges relatively larger so they remain readable
  const scaleAdjustment = useMemo(() => {
    if (scale < 0.3) return 2.0 / scale;
    if (scale < 0.5) return 1.5 / scale;
    if (scale < 0.75) return 1.2 / scale;
    if (scale > 1.5) return 0.8 / scale;
    return 1;
  }, [scale]);

  // Background color based on status
  const backgroundColor = useMemo(() => {
    switch (status) {
      case 'running':
        return 'rgba(15, 35, 25, 0.95)';
      case 'underutilized':
        return 'rgba(35, 30, 12, 0.95)';
      case 'starved':
        return 'rgba(40, 15, 15, 0.95)';
      case 'noPower':
        return 'rgba(30, 15, 40, 0.95)';
      default:
        return 'rgba(25, 30, 35, 0.95)';
    }
  }, [status]);

  // Don't render if not visible
  if (!visible) return null;

  const adjustedWidth = sizeConfig.width * scaleAdjustment;
  const adjustedHeight = sizeConfig.height * scaleAdjustment;
  const adjustedFontSize = sizeConfig.fontSize * scaleAdjustment;
  const adjustedEfficiencySize = sizeConfig.efficiencySize * scaleAdjustment;
  const adjustedPadding = sizeConfig.padding * scaleAdjustment;
  const adjustedCornerRadius = sizeConfig.cornerRadius * scaleAdjustment;
  const adjustedStatusDotSize = sizeConfig.statusDotSize * scaleAdjustment;

  // Calculate position in pixels (with offset)
  const pixelX = (x + offsetX / PIXELS_PER_METER) * PIXELS_PER_METER;
  const pixelY = (y + offsetY / PIXELS_PER_METER) * PIXELS_PER_METER;

  // Building connection point (for connector line)
  const buildingPixelX = x * PIXELS_PER_METER;
  const buildingPixelY = y * PIXELS_PER_METER;

  // Get status color
  const statusColor = STATUS_COLORS[status];

  // Format efficiency text
  const efficiencyText = `${Math.round(efficiency)}%`;

  // Determine if we should show connector line (when badge is offset significantly)
  // Increased threshold since badges are now more compact
  const showConnector = Math.abs(offsetX) > 30 || Math.abs(offsetY) > 30;

  // Check if we have meaningful data to show
  const hasOutput = outputRate && outputRate !== '0/min' && outputRate !== '0.0/min';
  // inputRate available for future multi-line display
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _hasInput = inputRate && inputRate !== '0/min' && inputRate !== '0.0/min';

  return (
    <Group listening={false}>
      {/* Connector line from building to badge */}
      {showConnector && (
        <Line
          points={[
            buildingPixelX,
            buildingPixelY,
            pixelX - adjustedWidth / 2 - 1,
            pixelY,
          ]}
          stroke={statusColor}
          strokeWidth={1 * Math.min(scaleAdjustment, 1.2)}
          opacity={0.3}
          dash={[3, 3]}
        />
      )}

      {/* Main badge group */}
      <Group x={pixelX} y={pixelY}>
        {/* Subtle glow effect for active states */}
        {(status === 'running' || status === 'starved') && (
          <Rect
            x={-adjustedWidth / 2 - 1}
            y={-adjustedHeight / 2 - 1}
            width={adjustedWidth + 2}
            height={adjustedHeight + 2}
            fill="transparent"
            stroke={statusColor}
            strokeWidth={0.5}
            cornerRadius={adjustedCornerRadius + 1}
            shadowBlur={4}
            shadowColor={statusColor}
            opacity={0.25}
          />
        )}

        {/* Background rectangle */}
        <Rect
          x={-adjustedWidth / 2}
          y={-adjustedHeight / 2}
          width={adjustedWidth}
          height={adjustedHeight}
          fill={backgroundColor}
          stroke={statusColor}
          strokeWidth={1}
          cornerRadius={adjustedCornerRadius}
          shadowBlur={3}
          shadowColor="rgba(0, 0, 0, 0.3)"
          shadowOffsetY={1}
        />

        {/* Status indicator dot */}
        <Circle
          x={-adjustedWidth / 2 + adjustedPadding + adjustedStatusDotSize}
          y={0}
          radius={adjustedStatusDotSize}
          fill={statusColor}
          shadowBlur={status === 'running' ? 3 : 0}
          shadowColor={statusColor}
        />

        {/* Main content area */}
        <Group x={-adjustedWidth / 2 + adjustedPadding * 2 + adjustedStatusDotSize * 2.5}>
          {/* Output rate text (primary) */}
          {hasOutput && (
            <Text
              x={0}
              y={size === 'compact' ? -adjustedFontSize / 2 : -adjustedFontSize / 2 - 2}
              text={outputRate}
              fontSize={adjustedFontSize}
              fontFamily="Inter, system-ui, sans-serif"
              fontStyle="bold"
              fill="#f8fafc"
              listening={false}
            />
          )}

          {/* Efficiency percentage (show when no output or in larger sizes) */}
          {(!hasOutput || size !== 'compact') && (
            <Text
              x={hasOutput && size !== 'compact' ? 0 : 0}
              y={hasOutput && size !== 'compact' ? adjustedFontSize / 2 + 1 : -adjustedEfficiencySize / 2}
              text={efficiencyText}
              fontSize={adjustedEfficiencySize}
              fontFamily="Inter, system-ui, sans-serif"
              fontStyle={hasOutput ? 'normal' : 'bold'}
              fill={hasOutput ? statusColor : '#f8fafc'}
              opacity={hasOutput ? 0.9 : 1}
              listening={false}
            />
          )}
        </Group>

        {/* Efficiency bar for larger sizes */}
        {size === 'large' && (
          <Group y={adjustedHeight / 2 - adjustedPadding - 3}>
            {/* Background bar */}
            <Rect
              x={-adjustedWidth / 2 + adjustedPadding}
              y={-3}
              width={adjustedWidth - adjustedPadding * 2}
              height={4}
              fill="rgba(100, 116, 139, 0.3)"
              cornerRadius={2}
            />
            {/* Fill bar */}
            <Rect
              x={-adjustedWidth / 2 + adjustedPadding}
              y={-3}
              width={(adjustedWidth - adjustedPadding * 2) * (efficiency / 100)}
              height={4}
              fill={statusColor}
              cornerRadius={2}
            />
          </Group>
        )}
      </Group>
    </Group>
  );
});

ProductionBadge.displayName = 'ProductionBadge';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine production status from efficiency and other factors
 */
export function getProductionStatus(
  efficiency: number,
  hasRecipe: boolean,
  hasPower: boolean = true,
  hasInputs: boolean = true,
): ProductionStatus {
  if (!hasRecipe) return 'idle';
  if (!hasPower) return 'noPower';
  if (!hasInputs || efficiency < 50) return 'starved';
  if (efficiency >= 95) return 'running';
  return 'underutilized';
}

/**
 * Format output rate for display
 */
export function formatOutputRate(rate: number, unit: string = '/min'): string {
  if (rate >= 1000) {
    return `${(rate / 1000).toFixed(1)}k${unit}`;
  }
  if (rate >= 100) {
    return `${Math.round(rate)}${unit}`;
  }
  if (rate >= 10) {
    return `${rate.toFixed(1)}${unit}`;
  }
  return `${rate.toFixed(2)}${unit}`;
}

/**
 * Determine the best side to place the badge based on connection points
 * Returns 'top' | 'bottom' | 'left' | 'right'
 */
function getBestBadgeSide(
  connectionPoints: Array<{ side: 'front' | 'back' | 'left' | 'right' }> | undefined
): 'top' | 'bottom' | 'left' | 'right' {
  if (!connectionPoints || connectionPoints.length === 0) {
    return 'right'; // Default to right if no connection points
  }

  // Count connections per side
  const sideCounts = { front: 0, back: 0, left: 0, right: 0 };
  for (const cp of connectionPoints) {
    sideCounts[cp.side]++;
  }

  // Map sides to badge positions (front = top in default orientation)
  // Priority: prefer sides with NO connections, then fewest connections
  // Prefer top-right corner area (right or top) as secondary preference
  const sidePreferences: Array<{ side: 'top' | 'bottom' | 'left' | 'right'; count: number }> = [
    { side: 'right', count: sideCounts.right },
    { side: 'top', count: sideCounts.front },    // front = top (north)
    { side: 'left', count: sideCounts.left },
    { side: 'bottom', count: sideCounts.back },  // back = bottom (south)
  ];

  // Sort by count ascending, keeping preference order for ties
  sidePreferences.sort((a, b) => a.count - b.count);

  return sidePreferences[0].side;
}

/**
 * Calculate badge offset with rotation-awareness and smart positioning
 *
 * @param buildingWidth - Building width in meters
 * @param buildingHeight - Building height in meters
 * @param badgeSize - Size preset for the badge
 * @param rotation - Building rotation (0, 90, 180, 270)
 * @param connectionPoints - Building connection points for smart positioning
 */
export function calculateBadgeOffset(
  buildingWidth: number,
  buildingHeight: number,
  badgeSize: 'compact' | 'normal' | 'large' = 'normal',
  rotation: 0 | 90 | 180 | 270 = 0,
  connectionPoints?: Array<{ side: 'front' | 'back' | 'left' | 'right' }>
): { offsetX: number; offsetY: number } {
  const sizeConfig = BADGE_SIZES[badgeSize];
  const margin = 4; // Reduced margin between building and badge in pixels

  // Determine the best side to place the badge (in building's local coordinate system)
  const bestSide = getBestBadgeSide(connectionPoints);

  // Calculate effective dimensions based on rotation
  // At 90 or 270 degrees, width and height swap visually
  const rotated90 = rotation === 90 || rotation === 270;
  const effectiveWidth = rotated90 ? buildingHeight : buildingWidth;
  const effectiveHeight = rotated90 ? buildingWidth : buildingHeight;

  // Transform the best side based on rotation
  // Rotation rotates the building clockwise, so we need to rotate the side placement
  const sideRotationMap: Record<0 | 90 | 180 | 270, Record<string, string>> = {
    0: { top: 'top', right: 'right', bottom: 'bottom', left: 'left' },
    90: { top: 'right', right: 'bottom', bottom: 'left', left: 'top' },
    180: { top: 'bottom', right: 'left', bottom: 'top', left: 'right' },
    270: { top: 'left', right: 'top', bottom: 'right', left: 'bottom' },
  };

  const rotatedSide = sideRotationMap[rotation][bestSide] as 'top' | 'bottom' | 'left' | 'right';

  // Calculate offset based on the rotated side position
  const halfBadgeWidth = sizeConfig.width / 2;
  const halfBadgeHeight = sizeConfig.height / 2;

  switch (rotatedSide) {
    case 'top':
      return {
        offsetX: 0,
        offsetY: -(effectiveHeight / 2) * PIXELS_PER_METER - margin - halfBadgeHeight,
      };
    case 'bottom':
      return {
        offsetX: 0,
        offsetY: (effectiveHeight / 2) * PIXELS_PER_METER + margin + halfBadgeHeight,
      };
    case 'left':
      return {
        offsetX: -(effectiveWidth / 2) * PIXELS_PER_METER - margin - halfBadgeWidth,
        offsetY: 0,
      };
    case 'right':
    default:
      return {
        offsetX: (effectiveWidth / 2) * PIXELS_PER_METER + margin + halfBadgeWidth,
        offsetY: 0,
      };
  }
}
