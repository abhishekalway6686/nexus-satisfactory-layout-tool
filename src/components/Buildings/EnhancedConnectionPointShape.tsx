// src/components/Buildings/EnhancedConnectionPointShape.tsx
// Enhanced connection point visualization with REALISTIC 3D industrial-style ports
// Inspired by actual Satisfactory game conveyor inputs/outputs and pipe connections

import React from 'react';
import { Group, Circle, Rect, Line, Text, Shape } from 'react-konva';
import { ConnectionPoint } from '../../types';

type LODLevel = 'low' | 'medium' | 'high';

// Industrial color palette for realistic 3D ports
const PORT_COLORS = {
  // Solid material ports - conveyor belt style
  solid_input: {
    frame: '#c45a20',        // Orange metallic frame
    frameDark: '#8a3d15',    // Dark edge of frame
    frameLight: '#e87a3a',   // Light highlight
    recess: '#1a1412',       // Dark recessed center
    recessEdge: '#3d2e28',   // Edge of recess
    glow: '#FA9549',         // Orange glow
    chevron: '#FA9549',      // Orange chevron
  },
  solid_output: {
    frame: '#3d6b4a',        // Green metallic frame
    frameDark: '#2a4a33',    // Dark edge of frame
    frameLight: '#5a9468',   // Light highlight
    recess: '#121a14',       // Dark recessed center
    recessEdge: '#283d2e',   // Edge of recess
    glow: '#4CAF50',         // Green glow
    chevron: '#6dd47a',      // Green chevron
  },
  solid_bidirectional: {
    frame: '#4a7a6a',        // Teal metallic frame
    frameDark: '#365a4d',    // Dark edge of frame
    frameLight: '#6a9a8a',   // Light highlight
    recess: '#12181a',       // Dark recessed center
    recessEdge: '#283a35',   // Edge of recess
    glow: '#7CD2B9',         // Teal glow
    chevron: '#7CD2B9',      // Teal chevron
  },
  // Fluid ports - pipe flange style
  fluid_input: {
    flange: '#3a5a7a',       // Blue metallic flange
    flangeDark: '#2a4058',   // Dark edge
    flangeLight: '#5a8aaa',  // Light highlight
    pipe: '#0a1018',         // Dark pipe interior
    pipeRing: '#1a2a38',     // Pipe edge ring
    bolt: '#4a5a6a',         // Bolt head color
    boltHighlight: '#6a7a8a',// Bolt highlight
    glow: '#4aa8ff',         // Blue glow
    chevron: '#6ac8ff',      // Blue chevron
  },
  fluid_output: {
    flange: '#3a5a7a',       // Blue metallic flange
    flangeDark: '#2a4058',   // Dark edge
    flangeLight: '#5a8aaa',  // Light highlight
    pipe: '#0a1018',         // Dark pipe interior
    pipeRing: '#1a2a38',     // Pipe edge ring
    bolt: '#4a5a6a',         // Bolt head color
    boltHighlight: '#6a7a8a',// Bolt highlight
    glow: '#4aa8ff',         // Blue glow
    chevron: '#6ac8ff',      // Blue chevron
  },
  fluid_bidirectional: {
    flange: '#3a5a7a',       // Blue metallic flange
    flangeDark: '#2a4058',   // Dark edge
    flangeLight: '#5a8aaa',  // Light highlight
    pipe: '#0a1018',         // Dark pipe interior
    pipeRing: '#1a2a38',     // Pipe edge ring
    bolt: '#4a5a6a',         // Bolt head color
    boltHighlight: '#6a7a8a',// Bolt highlight
    glow: '#4aa8ff',         // Blue glow
    chevron: '#7CD2B9',      // Teal chevron for bidirectional
  },
};

// Get the color scheme based on connection type and fluid status
const getPortColors = (cp: ConnectionPoint) => {
  if (cp.isFluid) {
    switch (cp.type) {
      case 'input': return PORT_COLORS.fluid_input;
      case 'output': return PORT_COLORS.fluid_output;
      default: return PORT_COLORS.fluid_bidirectional;
    }
  }
  switch (cp.type) {
    case 'input': return PORT_COLORS.solid_input;
    case 'output': return PORT_COLORS.solid_output;
    default: return PORT_COLORS.solid_bidirectional;
  }
};

// Get chevron rotation based on side and direction
// Chevrons show material FLOW direction: into building for inputs, out of building for outputs
const getChevronAngle = (cp: ConnectionPoint): number => {
  // Base angles for each side (pointing OUTWARD, away from building center)
  // In canvas coords: Y increases downward, so front=top (low Y), back=bottom (high Y)
  const sideAngles: Record<string, number> = {
    front: -90,   // Front/top edge: points UP (away from building)
    back: 90,     // Back/bottom edge: points DOWN (away from building)
    left: 180,    // Left edge: points LEFT (away from building)
    right: 0,     // Right edge: points RIGHT (away from building)
  };

  const baseAngle = sideAngles[cp.side] ?? 0;

  // Output: chevron points outward (material flows OUT of building)
  // Input: chevron points inward (material flows INTO building) - flip 180 degrees
  return cp.type === 'input' ? baseAngle + 180 : baseAngle;
};

interface EnhancedConnectionPointShapeProps {
  cp: ConnectionPoint;
  cpX: number;
  cpY: number;
  lodLevel: LODLevel;
  isHighlighted: boolean;
  isActive: boolean;
  isDrawingMode: boolean;
  buildingRotation: number;
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
}

// Chevron/arrow component drawn INSIDE the port
const InternalChevron = React.memo<{
  size: number;
  color: string;
  strokeWidth: number;
  opacity?: number;
}>(({ size, color, strokeWidth, opacity = 1 }) => {
  // Draw a chevron pointing right (will be rotated by parent)
  const halfSize = size / 2;
  return (
    <Line
      points={[
        -halfSize * 0.6, -halfSize * 0.5,  // Top left
        halfSize * 0.4, 0,                   // Right point
        -halfSize * 0.6, halfSize * 0.5,    // Bottom left
      ]}
      stroke={color}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      opacity={opacity}
      listening={false}
    />
  );
});

InternalChevron.displayName = 'InternalChevron';

export const EnhancedConnectionPointShape = React.memo<EnhancedConnectionPointShapeProps>(({
  cp,
  cpX,
  cpY,
  lodLevel,
  isHighlighted,
  isActive,
  isDrawingMode,
  buildingRotation,
  onMouseDown,
  onMouseUp
}) => {
  const colors = getPortColors(cp);
  const chevronAngle = getChevronAngle(cp);
  const isFluid = cp.isFluid;
  const isInput = cp.type === 'input';
  const isOutput = cp.type === 'output';
  const isBidirectional = cp.type === 'bidirectional';

  // Size multiplier for highlighted/active states
  const sizeMultiplier = isHighlighted || isActive ? 1.15 : 1;

  // ===========================================
  // LOW LOD - Simple flat colored shapes
  // ===========================================
  if (lodLevel === 'low') {
    const lowSize = 10 * sizeMultiplier;
    return (
      <Group x={cpX} y={cpY}>
        {isFluid ? (
          <Circle
            x={0}
            y={0}
            radius={lowSize * 0.6}
            fill={(colors as typeof PORT_COLORS.fluid_input).flange}
            stroke={(colors as typeof PORT_COLORS.fluid_input).flangeDark}
            strokeWidth={1}
            listening={false}
          />
        ) : (
          <Rect
            x={-lowSize * 0.6}
            y={-lowSize * 0.4}
            width={lowSize * 1.2}
            height={lowSize * 0.8}
            fill={(colors as typeof PORT_COLORS.solid_input).frame}
            stroke={(colors as typeof PORT_COLORS.solid_input).frameDark}
            strokeWidth={1}
            cornerRadius={2}
            listening={false}
          />
        )}
        {/* Hitbox */}
        <Circle
          x={0}
          y={0}
          radius={20}
          fill="transparent"
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          name="connection"
        />
      </Group>
    );
  }

  // ===========================================
  // MEDIUM LOD - Simplified 3D with depth
  // ===========================================
  if (lodLevel === 'medium') {
    if (isFluid) {
      // Fluid port - simplified pipe flange
      const fluidRadius = 9 * sizeMultiplier;
      const fluidColors = colors as typeof PORT_COLORS.fluid_input;

      return (
        <Group x={cpX} y={cpY}>
          {/* Glow on highlight */}
          {(isHighlighted || isActive) && (
            <Circle
              x={0}
              y={0}
              radius={fluidRadius + 6}
              fill={`${fluidColors.glow}30`}
              listening={false}
            />
          )}

          {/* Outer flange ring */}
          <Circle
            x={0}
            y={0}
            radius={fluidRadius}
            fill={fluidColors.flange}
            stroke={fluidColors.flangeDark}
            strokeWidth={2}
            listening={false}
          />

          {/* Inner pipe ring */}
          <Circle
            x={0}
            y={0}
            radius={fluidRadius * 0.6}
            fill={fluidColors.pipeRing}
            listening={false}
          />

          {/* Pipe interior (dark hole) */}
          <Circle
            x={0}
            y={0}
            radius={fluidRadius * 0.35}
            fill={fluidColors.pipe}
            listening={false}
          />

          {/* Internal chevron */}
          <Group rotation={chevronAngle}>
            <InternalChevron
              size={fluidRadius * 1.2}
              color={fluidColors.chevron}
              strokeWidth={1.5}
              opacity={0.9}
            />
          </Group>

          {/* Hitbox */}
          <Circle
            x={0}
            y={0}
            radius={22}
            fill="transparent"
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            name="connection"
          />
        </Group>
      );
    } else {
      // Solid port - simplified conveyor opening
      const solidWidth = 14 * sizeMultiplier;
      const solidHeight = 10 * sizeMultiplier;
      const solidColors = colors as typeof PORT_COLORS.solid_input;

      return (
        <Group x={cpX} y={cpY}>
          {/* Glow on highlight */}
          {(isHighlighted || isActive) && (
            <Circle
              x={0}
              y={0}
              radius={Math.max(solidWidth, solidHeight) / 2 + 6}
              fill={`${solidColors.glow}30`}
              listening={false}
            />
          )}

          {/* Outer metallic frame */}
          <Rect
            x={-solidWidth / 2}
            y={-solidHeight / 2}
            width={solidWidth}
            height={solidHeight}
            fill={solidColors.frame}
            stroke={solidColors.frameDark}
            strokeWidth={2}
            cornerRadius={2}
            listening={false}
          />

          {/* Recessed center */}
          <Rect
            x={-solidWidth / 2 + 3}
            y={-solidHeight / 2 + 2}
            width={solidWidth - 6}
            height={solidHeight - 4}
            fill={solidColors.recess}
            cornerRadius={1}
            listening={false}
          />

          {/* Internal chevron */}
          <Group rotation={chevronAngle}>
            <InternalChevron
              size={solidHeight * 0.9}
              color={solidColors.chevron}
              strokeWidth={1.5}
              opacity={0.85}
            />
          </Group>

          {/* Hitbox */}
          <Circle
            x={0}
            y={0}
            radius={22}
            fill="transparent"
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            name="connection"
          />
        </Group>
      );
    }
  }

  // ===========================================
  // HIGH LOD - Full 3D industrial detail
  // ===========================================
  if (isFluid) {
    // ===== FLUID PORT - Industrial pipe flange =====
    const fluidRadius = 11 * sizeMultiplier;
    const fluidColors = colors as typeof PORT_COLORS.fluid_input;
    const boltRadius = fluidRadius * 0.85;
    const boltSize = 2;

    // Bolt positions (4 bolts at cardinal directions)
    const boltPositions = [
      { x: 0, y: -boltRadius },           // Top
      { x: boltRadius, y: 0 },            // Right
      { x: 0, y: boltRadius },            // Bottom
      { x: -boltRadius, y: 0 },           // Left
    ];

    return (
      <Group x={cpX} y={cpY}>
        {/* Outer glow for active/highlighted state */}
        {(isHighlighted || isActive) && (
          <Circle
            x={0}
            y={0}
            radius={fluidRadius + 8}
            fill={`${fluidColors.glow}40`}
            listening={false}
          />
        )}

        {/* Subtle ambient glow (always visible) */}
        <Circle
          x={0}
          y={0}
          radius={fluidRadius + 3}
          fill={`${fluidColors.glow}15`}
          listening={false}
        />

        {/* Outer flange body - dark metallic border */}
        <Circle
          x={0}
          y={0}
          radius={fluidRadius}
          fill={fluidColors.flangeDark}
          listening={false}
        />

        {/* Main flange ring with gradient effect (using shape) */}
        <Shape
          sceneFunc={(ctx, shape) => {
            const gradient = ctx.createRadialGradient(
              -fluidRadius * 0.3, -fluidRadius * 0.3, 0,
              0, 0, fluidRadius
            );
            gradient.addColorStop(0, fluidColors.flangeLight);
            gradient.addColorStop(0.5, fluidColors.flange);
            gradient.addColorStop(1, fluidColors.flangeDark);

            ctx.beginPath();
            ctx.arc(0, 0, fluidRadius - 1, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = fluidColors.flangeDark;
            ctx.lineWidth = 1;
            ctx.stroke();
          }}
          listening={false}
        />

        {/* Inner pipe edge ring */}
        <Circle
          x={0}
          y={0}
          radius={fluidRadius * 0.55}
          fill={fluidColors.pipeRing}
          stroke={fluidColors.flangeDark}
          strokeWidth={1}
          listening={false}
        />

        {/* Pipe interior (dark hole) with depth effect */}
        <Shape
          sceneFunc={(ctx, shape) => {
            const gradient = ctx.createRadialGradient(
              0, 0, 0,
              0, 0, fluidRadius * 0.4
            );
            gradient.addColorStop(0, '#000008');
            gradient.addColorStop(0.7, fluidColors.pipe);
            gradient.addColorStop(1, fluidColors.pipeRing);

            ctx.beginPath();
            ctx.arc(0, 0, fluidRadius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          }}
          listening={false}
        />

        {/* Flange bolts */}
        {boltPositions.map((pos, i) => (
          <Group key={i} x={pos.x} y={pos.y}>
            {/* Bolt body */}
            <Circle
              x={0}
              y={0}
              radius={boltSize}
              fill={fluidColors.bolt}
              stroke={fluidColors.flangeDark}
              strokeWidth={0.5}
              listening={false}
            />
            {/* Bolt highlight */}
            <Circle
              x={-boltSize * 0.3}
              y={-boltSize * 0.3}
              radius={boltSize * 0.4}
              fill={fluidColors.boltHighlight}
              opacity={0.6}
              listening={false}
            />
          </Group>
        ))}

        {/* Top highlight arc (3D lighting effect) */}
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.arc(0, 0, fluidRadius - 2, -Math.PI * 0.8, -Math.PI * 0.2);
            ctx.strokeStyle = `${fluidColors.flangeLight}60`;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
          }}
          listening={false}
        />

        {/* Internal direction chevron */}
        <Group rotation={chevronAngle}>
          {isBidirectional ? (
            // Bidirectional: two chevrons pointing opposite directions
            <>
              <Group x={fluidRadius * 0.15}>
                <InternalChevron
                  size={fluidRadius * 0.8}
                  color={fluidColors.chevron}
                  strokeWidth={1.8}
                  opacity={0.9}
                />
              </Group>
              <Group x={-fluidRadius * 0.15} rotation={180}>
                <InternalChevron
                  size={fluidRadius * 0.8}
                  color={fluidColors.chevron}
                  strokeWidth={1.8}
                  opacity={0.9}
                />
              </Group>
            </>
          ) : (
            <InternalChevron
              size={fluidRadius * 1.1}
              color={fluidColors.chevron}
              strokeWidth={2}
              opacity={0.95}
            />
          )}
        </Group>

        {/* Type label on hover */}
        {isHighlighted && (
          <Group y={-fluidRadius - 16}>
            <Rect
              x={-32}
              y={-10}
              width={64}
              height={18}
              fill="rgba(20, 25, 35, 0.95)"
              cornerRadius={3}
              stroke={fluidColors.flangeDark}
              strokeWidth={1}
              listening={false}
            />
            <Text
              x={-32}
              y={-8}
              width={64}
              height={18}
              text={isInput ? 'Fluid In' : isOutput ? 'Fluid Out' : 'Fluid Bi'}
              fontSize={10}
              fill="#c0d0e0"
              fontFamily="Arial, sans-serif"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )}

        {/* Hitbox */}
        <Circle
          x={0}
          y={0}
          radius={22}
          fill="transparent"
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          name="connection"
        />
      </Group>
    );
  } else {
    // ===== SOLID MATERIAL PORT - Industrial conveyor opening =====
    const solidWidth = 16 * sizeMultiplier;
    const solidHeight = 12 * sizeMultiplier;
    const solidColors = colors as typeof PORT_COLORS.solid_input;

    return (
      <Group x={cpX} y={cpY}>
        {/* Outer glow for active/highlighted state */}
        {(isHighlighted || isActive) && (
          <Circle
            x={0}
            y={0}
            radius={Math.max(solidWidth, solidHeight) / 2 + 8}
            fill={`${solidColors.glow}40`}
            listening={false}
          />
        )}

        {/* Subtle ambient glow (always visible) */}
        <Circle
          x={0}
          y={0}
          radius={Math.max(solidWidth, solidHeight) / 2 + 3}
          fill={`${solidColors.glow}15`}
          listening={false}
        />

        {/* Outer metallic bezel (dark border) */}
        <Rect
          x={-solidWidth / 2 - 1}
          y={-solidHeight / 2 - 1}
          width={solidWidth + 2}
          height={solidHeight + 2}
          fill={solidColors.frameDark}
          cornerRadius={3}
          listening={false}
        />

        {/* Main metallic frame with gradient */}
        <Shape
          sceneFunc={(ctx, shape) => {
            const w = solidWidth;
            const h = solidHeight;
            const r = 2;

            // Create rounded rect path
            ctx.beginPath();
            ctx.moveTo(-w/2 + r, -h/2);
            ctx.lineTo(w/2 - r, -h/2);
            ctx.arcTo(w/2, -h/2, w/2, -h/2 + r, r);
            ctx.lineTo(w/2, h/2 - r);
            ctx.arcTo(w/2, h/2, w/2 - r, h/2, r);
            ctx.lineTo(-w/2 + r, h/2);
            ctx.arcTo(-w/2, h/2, -w/2, h/2 - r, r);
            ctx.lineTo(-w/2, -h/2 + r);
            ctx.arcTo(-w/2, -h/2, -w/2 + r, -h/2, r);
            ctx.closePath();

            // Vertical gradient for 3D effect
            const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
            gradient.addColorStop(0, solidColors.frameLight);
            gradient.addColorStop(0.3, solidColors.frame);
            gradient.addColorStop(0.7, solidColors.frame);
            gradient.addColorStop(1, solidColors.frameDark);

            ctx.fillStyle = gradient;
            ctx.fill();
          }}
          listening={false}
        />

        {/* Inner recessed edge */}
        <Rect
          x={-solidWidth / 2 + 2}
          y={-solidHeight / 2 + 1.5}
          width={solidWidth - 4}
          height={solidHeight - 3}
          fill={solidColors.recessEdge}
          cornerRadius={1}
          listening={false}
        />

        {/* Deep recessed center (material goes here) */}
        <Shape
          sceneFunc={(ctx, shape) => {
            const w = solidWidth - 6;
            const h = solidHeight - 5;
            const r = 1;

            ctx.beginPath();
            ctx.moveTo(-w/2 + r, -h/2);
            ctx.lineTo(w/2 - r, -h/2);
            ctx.arcTo(w/2, -h/2, w/2, -h/2 + r, r);
            ctx.lineTo(w/2, h/2 - r);
            ctx.arcTo(w/2, h/2, w/2 - r, h/2, r);
            ctx.lineTo(-w/2 + r, h/2);
            ctx.arcTo(-w/2, h/2, -w/2, h/2 - r, r);
            ctx.lineTo(-w/2, -h/2 + r);
            ctx.arcTo(-w/2, -h/2, -w/2 + r, -h/2, r);
            ctx.closePath();

            // Gradient for depth effect
            const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
            gradient.addColorStop(0, solidColors.recess);
            gradient.addColorStop(0.5, '#0a0808');
            gradient.addColorStop(1, solidColors.recessEdge);

            ctx.fillStyle = gradient;
            ctx.fill();
          }}
          listening={false}
        />

        {/* Top edge highlight (3D lighting) */}
        <Line
          points={[
            -solidWidth / 2 + 3, -solidHeight / 2 + 1,
            solidWidth / 2 - 3, -solidHeight / 2 + 1
          ]}
          stroke={`${solidColors.frameLight}80`}
          strokeWidth={1}
          lineCap="round"
          listening={false}
        />

        {/* Bottom edge shadow */}
        <Line
          points={[
            -solidWidth / 2 + 3, solidHeight / 2 - 1,
            solidWidth / 2 - 3, solidHeight / 2 - 1
          ]}
          stroke={`${solidColors.frameDark}80`}
          strokeWidth={1}
          lineCap="round"
          listening={false}
        />

        {/* Internal direction chevron */}
        <Group rotation={chevronAngle}>
          {isBidirectional ? (
            // Bidirectional: two chevrons pointing opposite directions
            <>
              <Group x={solidWidth * 0.08}>
                <InternalChevron
                  size={solidHeight * 0.65}
                  color={solidColors.chevron}
                  strokeWidth={1.8}
                  opacity={0.9}
                />
              </Group>
              <Group x={-solidWidth * 0.08} rotation={180}>
                <InternalChevron
                  size={solidHeight * 0.65}
                  color={solidColors.chevron}
                  strokeWidth={1.8}
                  opacity={0.9}
                />
              </Group>
            </>
          ) : (
            <InternalChevron
              size={solidHeight * 0.85}
              color={solidColors.chevron}
              strokeWidth={2}
              opacity={0.95}
            />
          )}
        </Group>

        {/* Type label on hover */}
        {isHighlighted && (
          <Group y={-solidHeight / 2 - 16}>
            <Rect
              x={-28}
              y={-10}
              width={56}
              height={18}
              fill="rgba(25, 22, 20, 0.95)"
              cornerRadius={3}
              stroke={solidColors.frameDark}
              strokeWidth={1}
              listening={false}
            />
            <Text
              x={-28}
              y={-8}
              width={56}
              height={18}
              text={isInput ? 'Input' : isOutput ? 'Output' : 'Bi-Dir'}
              fontSize={10}
              fill="#e0d0c0"
              fontFamily="Arial, sans-serif"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )}

        {/* Hitbox */}
        <Circle
          x={0}
          y={0}
          radius={22}
          fill="transparent"
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          name="connection"
        />
      </Group>
    );
  }
});

EnhancedConnectionPointShape.displayName = 'EnhancedConnectionPointShape';

// Connection point legend component for UI overlay
export const ConnectionPointLegend = React.memo<{ x: number; y: number; visible: boolean }>(({
  x,
  y,
  visible
}) => {
  if (!visible) return null;

  const legendItems = [
    {
      label: 'Input (Solid)',
      colors: PORT_COLORS.solid_input,
      isFluid: false
    },
    {
      label: 'Output (Solid)',
      colors: PORT_COLORS.solid_output,
      isFluid: false
    },
    {
      label: 'Bidirectional',
      colors: PORT_COLORS.solid_bidirectional,
      isFluid: false
    },
    {
      label: 'Fluid Port',
      colors: PORT_COLORS.fluid_input,
      isFluid: true
    },
  ];

  return (
    <Group x={x} y={y}>
      {/* Legend background - industrial dark panel */}
      <Rect
        x={0}
        y={0}
        width={140}
        height={legendItems.length * 24 + 36}
        fill="rgba(20, 22, 28, 0.95)"
        cornerRadius={4}
        stroke="rgba(80, 90, 100, 0.5)"
        strokeWidth={1}
        listening={false}
      />

      {/* Legend title */}
      <Text
        x={10}
        y={8}
        text="Connection Types"
        fontSize={11}
        fill="#a0b0c0"
        fontStyle="bold"
        fontFamily="Arial, sans-serif"
        listening={false}
      />

      {/* Legend items */}
      {legendItems.map((item, index) => (
        <Group key={item.label} x={12} y={32 + index * 24}>
          {/* Mini port representation */}
          {item.isFluid ? (
            // Fluid - circle with dark center
            <Group>
              <Circle
                x={0}
                y={0}
                radius={7}
                fill={(item.colors as typeof PORT_COLORS.fluid_input).flange}
                stroke={(item.colors as typeof PORT_COLORS.fluid_input).flangeDark}
                strokeWidth={1.5}
                listening={false}
              />
              <Circle
                x={0}
                y={0}
                radius={3}
                fill={(item.colors as typeof PORT_COLORS.fluid_input).pipe}
                listening={false}
              />
            </Group>
          ) : (
            // Solid - rect with recessed center
            <Group>
              <Rect
                x={-8}
                y={-5}
                width={16}
                height={10}
                fill={(item.colors as typeof PORT_COLORS.solid_input).frame}
                stroke={(item.colors as typeof PORT_COLORS.solid_input).frameDark}
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
              />
              <Rect
                x={-5}
                y={-3}
                width={10}
                height={6}
                fill={(item.colors as typeof PORT_COLORS.solid_input).recess}
                cornerRadius={1}
                listening={false}
              />
            </Group>
          )}
          {/* Label text */}
          <Text
            x={14}
            y={-5}
            text={item.label}
            fontSize={10}
            fill="#90a0b0"
            fontFamily="Arial, sans-serif"
            listening={false}
          />
        </Group>
      ))}
    </Group>
  );
});

ConnectionPointLegend.displayName = 'ConnectionPointLegend';
