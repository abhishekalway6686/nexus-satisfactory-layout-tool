// src/components/Buildings/TrainStationDetails.tsx
// Enhanced visual rendering for Train Station, Freight Platform, and Fluid Freight Platform

import React from 'react';
import { Group, Rect, Line, Circle, Text } from 'react-konva';
import { Building } from '../../types';
import { BUILDING_TYPES, PIXELS_PER_METER } from '../../constants';

interface TrainStationDetailsProps {
  building: Building;
  pixelWidth: number;
  pixelHeight: number;
  lodLevel: 'low' | 'medium' | 'high';
  isGhost?: boolean;
}

/**
 * Renders enhanced visual details for train station buildings.
 * Includes platform markings, track bed visualization, safety lines,
 * and type-specific features (cargo areas, fluid tanks, etc.)
 */
export const TrainStationDetails: React.FC<TrainStationDetailsProps> = React.memo(({
  building,
  pixelWidth,
  pixelHeight,
  lodLevel,
  isGhost = false,
}) => {
  const buildingDef = BUILDING_TYPES[building.type];
  if (!buildingDef?.railwayPoints) return null;

  // Skip details in low LOD or ghost mode
  if (lodLevel === 'low' || isGhost) return null;

  // Train buildings: 16m wide x 34m deep
  // Railway track runs through the center at y = 17m (170px)
  const trackCenterY = pixelHeight / 2; // Center of building (170px for 34m height)
  const trackWidth = 24; // Visual track bed width in pixels
  const platformWidth = (pixelHeight - trackWidth) / 2 - 10; // Each platform area

  // Determine building type for specific rendering
  const isTrainStation = building.type === 'train_station';
  const isFreightPlatform = building.type === 'freight_platform';
  const isFluidFreightPlatform = building.type === 'fluid_freight_platform';
  const isEmptyPlatform = building.type === 'empty_platform';

  // Colors based on building type
  const platformColor = isFluidFreightPlatform ? '#3d5a6a' : '#4a5568';
  const accentColor = isFluidFreightPlatform ? '#38bdf8' : isTrainStation ? '#f59e0b' : '#94a3b8';
  const safetyLineColor = '#fbbf24'; // Yellow safety lines

  return (
    <Group>
      {/* Track Bed / Ballast - runs full width of building */}
      <Rect
        x={0}
        y={trackCenterY - trackWidth / 2 - 2}
        width={pixelWidth}
        height={trackWidth + 4}
        fill="#5c4a36"
        listening={false}
      />

      {/* Track bed gravel texture */}
      <Rect
        x={0}
        y={trackCenterY - trackWidth / 2}
        width={pixelWidth}
        height={trackWidth}
        fill="#7a6548"
        listening={false}
      />

      {/* Railway ties/sleepers within the building */}
      {lodLevel === 'high' && Array.from({ length: Math.floor(pixelWidth / 18) + 1 }).map((_, i) => {
        const x = i * 18 + 4;
        if (x > pixelWidth - 4) return null;
        return (
          <Rect
            key={`tie-${i}`}
            x={x}
            y={trackCenterY - 12}
            width={3}
            height={24}
            fill="#4d3d2a"
            listening={false}
          />
        );
      })}

      {/* Steel rails */}
      <Line
        points={[0, trackCenterY - 5, pixelWidth, trackCenterY - 5]}
        stroke="#c0c0c0"
        strokeWidth={3}
        listening={false}
      />
      <Line
        points={[0, trackCenterY + 5, pixelWidth, trackCenterY + 5]}
        stroke="#c0c0c0"
        strokeWidth={3}
        listening={false}
      />

      {/* Rail highlights */}
      <Line
        points={[0, trackCenterY - 5.5, pixelWidth, trackCenterY - 5.5]}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.5}
        listening={false}
      />
      <Line
        points={[0, trackCenterY + 5.5, pixelWidth, trackCenterY + 5.5]}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.5}
        listening={false}
      />

      {/* Platform edges with safety lines */}
      {/* Top platform (front side) */}
      <Rect
        x={2}
        y={trackCenterY - trackWidth / 2 - 8}
        width={pixelWidth - 4}
        height={6}
        fill={platformColor}
        stroke="#374151"
        strokeWidth={1}
        listening={false}
      />
      <Line
        points={[4, trackCenterY - trackWidth / 2 - 4, pixelWidth - 4, trackCenterY - trackWidth / 2 - 4]}
        stroke={safetyLineColor}
        strokeWidth={2}
        dash={[8, 4]}
        listening={false}
      />

      {/* Bottom platform (back side) */}
      <Rect
        x={2}
        y={trackCenterY + trackWidth / 2 + 2}
        width={pixelWidth - 4}
        height={6}
        fill={platformColor}
        stroke="#374151"
        strokeWidth={1}
        listening={false}
      />
      <Line
        points={[4, trackCenterY + trackWidth / 2 + 5, pixelWidth - 4, trackCenterY + trackWidth / 2 + 5]}
        stroke={safetyLineColor}
        strokeWidth={2}
        dash={[8, 4]}
        listening={false}
      />

      {/* Building-specific details */}
      {isTrainStation && (
        <TrainStationSpecificDetails
          pixelWidth={pixelWidth}
          pixelHeight={pixelHeight}
          trackCenterY={trackCenterY}
          trackWidth={trackWidth}
          accentColor={accentColor}
          lodLevel={lodLevel}
        />
      )}

      {isFreightPlatform && (
        <FreightPlatformDetails
          pixelWidth={pixelWidth}
          pixelHeight={pixelHeight}
          trackCenterY={trackCenterY}
          trackWidth={trackWidth}
          lodLevel={lodLevel}
        />
      )}

      {isFluidFreightPlatform && (
        <FluidFreightPlatformDetails
          pixelWidth={pixelWidth}
          pixelHeight={pixelHeight}
          trackCenterY={trackCenterY}
          trackWidth={trackWidth}
          accentColor={accentColor}
          lodLevel={lodLevel}
        />
      )}

      {isEmptyPlatform && (
        <EmptyPlatformDetails
          pixelWidth={pixelWidth}
          pixelHeight={pixelHeight}
          trackCenterY={trackCenterY}
          trackWidth={trackWidth}
          lodLevel={lodLevel}
        />
      )}

      {/* Track alignment indicators at edges - shows where rails connect */}
      <Group>
        {/* Left edge indicator */}
        <Circle
          x={0}
          y={trackCenterY}
          radius={4}
          fill="#3b82f6"
          stroke="#1e40af"
          strokeWidth={1}
          listening={false}
        />
        {/* Right edge indicator */}
        <Circle
          x={pixelWidth}
          y={trackCenterY}
          radius={4}
          fill="#3b82f6"
          stroke="#1e40af"
          strokeWidth={1}
          listening={false}
        />
      </Group>
    </Group>
  );
});

TrainStationDetails.displayName = 'TrainStationDetails';

/**
 * Train Station specific details - control booth, signage
 */
const TrainStationSpecificDetails: React.FC<{
  pixelWidth: number;
  pixelHeight: number;
  trackCenterY: number;
  trackWidth: number;
  accentColor: string;
  lodLevel: 'low' | 'medium' | 'high';
}> = ({ pixelWidth, pixelHeight, trackCenterY, trackWidth, accentColor, lodLevel }) => {
  return (
    <Group>
      {/* Control booth / station building - positioned at back (bottom of visual) */}
      <Rect
        x={pixelWidth / 2 - 25}
        y={pixelHeight - 45}
        width={50}
        height={35}
        fill="#2d3748"
        stroke="#475569"
        strokeWidth={2}
        cornerRadius={4}
        listening={false}
      />

      {/* Control booth windows */}
      {lodLevel === 'high' && (
        <>
          <Rect
            x={pixelWidth / 2 - 18}
            y={pixelHeight - 40}
            width={14}
            height={10}
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth={1}
            listening={false}
          />
          <Rect
            x={pixelWidth / 2 + 4}
            y={pixelHeight - 40}
            width={14}
            height={10}
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth={1}
            listening={false}
          />
          {/* Antenna */}
          <Line
            points={[pixelWidth / 2, pixelHeight - 45, pixelWidth / 2, pixelHeight - 55]}
            stroke="#475569"
            strokeWidth={2}
            listening={false}
          />
          <Circle
            x={pixelWidth / 2}
            y={pixelHeight - 55}
            radius={3}
            fill={accentColor}
            listening={false}
          />
        </>
      )}

      {/* Platform markings - front side (passenger waiting area) */}
      <Group y={20}>
        {/* Waiting area marking */}
        <Rect
          x={10}
          y={0}
          width={pixelWidth - 20}
          height={trackCenterY - trackWidth / 2 - 35}
          fill="rgba(245, 158, 11, 0.1)"
          stroke={accentColor}
          strokeWidth={1}
          dash={[4, 4]}
          cornerRadius={3}
          listening={false}
        />

        {/* Boarding zone indicators */}
        {lodLevel === 'high' && [0.25, 0.5, 0.75].map((pos, i) => (
          <Group key={`boarding-${i}`} x={pixelWidth * pos - 8}>
            <Rect
              x={0}
              y={trackCenterY - trackWidth / 2 - 55}
              width={16}
              height={20}
              fill={accentColor}
              opacity={0.3}
              cornerRadius={2}
              listening={false}
            />
            <Line
              points={[8, trackCenterY - trackWidth / 2 - 35, 8, trackCenterY - trackWidth / 2 - 15]}
              stroke={accentColor}
              strokeWidth={2}
              listening={false}
            />
          </Group>
        ))}
      </Group>

      {/* Power connection indicator at the back */}
      <Group x={pixelWidth / 2} y={pixelHeight - 8}>
        <Circle
          radius={5}
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={1}
          listening={false}
        />
        <Text
          text="⚡"
          fontSize={6}
          fill="#ffffff"
          align="center"
          width={10}
          offsetX={5}
          offsetY={4}
          listening={false}
        />
      </Group>
    </Group>
  );
};

/**
 * Freight Platform specific details - cargo loading areas
 */
const FreightPlatformDetails: React.FC<{
  pixelWidth: number;
  pixelHeight: number;
  trackCenterY: number;
  trackWidth: number;
  lodLevel: 'low' | 'medium' | 'high';
}> = ({ pixelWidth, pixelHeight, trackCenterY, trackWidth, lodLevel }) => {
  const cargoColor = '#64748b';
  const loadingZoneColor = '#475569';

  return (
    <Group>
      {/* Loading crane structure */}
      <Rect
        x={pixelWidth / 2 - 30}
        y={20}
        width={60}
        height={8}
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
        listening={false}
      />

      {/* Crane supports */}
      <Line
        points={[pixelWidth / 2 - 25, 28, pixelWidth / 2 - 25, trackCenterY - trackWidth / 2 - 12]}
        stroke="#374151"
        strokeWidth={4}
        listening={false}
      />
      <Line
        points={[pixelWidth / 2 + 25, 28, pixelWidth / 2 + 25, trackCenterY - trackWidth / 2 - 12]}
        stroke="#374151"
        strokeWidth={4}
        listening={false}
      />

      {/* Cargo loading zones - back side (near connection points) */}
      <Group y={trackCenterY + trackWidth / 2 + 15}>
        {/* Left cargo zone */}
        <Rect
          x={10}
          y={0}
          width={55}
          height={pixelHeight - trackCenterY - trackWidth / 2 - 25}
          fill={loadingZoneColor}
          stroke="#6b7280"
          strokeWidth={1}
          cornerRadius={2}
          listening={false}
        />

        {/* Right cargo zone */}
        <Rect
          x={pixelWidth - 65}
          y={0}
          width={55}
          height={pixelHeight - trackCenterY - trackWidth / 2 - 25}
          fill={loadingZoneColor}
          stroke="#6b7280"
          strokeWidth={1}
          cornerRadius={2}
          listening={false}
        />

        {/* Cargo container representations */}
        {lodLevel === 'high' && (
          <>
            <Rect
              x={15}
              y={5}
              width={20}
              height={12}
              fill={cargoColor}
              stroke="#94a3b8"
              strokeWidth={1}
              listening={false}
            />
            <Rect
              x={40}
              y={5}
              width={20}
              height={12}
              fill={cargoColor}
              stroke="#94a3b8"
              strokeWidth={1}
              listening={false}
            />
            <Rect
              x={pixelWidth - 60}
              y={5}
              width={20}
              height={12}
              fill={cargoColor}
              stroke="#94a3b8"
              strokeWidth={1}
              listening={false}
            />
            <Rect
              x={pixelWidth - 35}
              y={5}
              width={20}
              height={12}
              fill={cargoColor}
              stroke="#94a3b8"
              strokeWidth={1}
              listening={false}
            />
          </>
        )}
      </Group>

      {/* Conveyor connection indicators */}
      {lodLevel === 'high' && (
        <Group y={pixelHeight - 15}>
          {/* Input indicators */}
          <Circle
            x={40}
            y={0}
            radius={4}
            fill="#FA9549"
            stroke="#c2410c"
            strokeWidth={1}
            listening={false}
          />
          <Circle
            x={120}
            y={0}
            radius={4}
            fill="#FA9549"
            stroke="#c2410c"
            strokeWidth={1}
            listening={false}
          />
          {/* Output indicators */}
          <Circle
            x={40}
            y={-10}
            radius={4}
            fill="#4a7c59"
            stroke="#166534"
            strokeWidth={1}
            listening={false}
          />
          <Circle
            x={120}
            y={-10}
            radius={4}
            fill="#4a7c59"
            stroke="#166534"
            strokeWidth={1}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};

/**
 * Fluid Freight Platform specific details - fluid tanks and pipes
 */
const FluidFreightPlatformDetails: React.FC<{
  pixelWidth: number;
  pixelHeight: number;
  trackCenterY: number;
  trackWidth: number;
  accentColor: string;
  lodLevel: 'low' | 'medium' | 'high';
}> = ({ pixelWidth, pixelHeight, trackCenterY, trackWidth, accentColor, lodLevel }) => {
  const tankColor = '#1e3a5f';
  const pipeColor = '#4a6a7a';

  return (
    <Group>
      {/* Fluid storage tanks - front side */}
      <Group y={25}>
        {/* Left tank */}
        <Rect
          x={15}
          y={0}
          width={40}
          height={trackCenterY - trackWidth / 2 - 45}
          fill={tankColor}
          stroke={accentColor}
          strokeWidth={2}
          cornerRadius={4}
          listening={false}
        />
        {/* Tank level indicator */}
        {lodLevel === 'high' && (
          <Rect
            x={18}
            y={(trackCenterY - trackWidth / 2 - 45) * 0.3}
            width={6}
            height={(trackCenterY - trackWidth / 2 - 45) * 0.6}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth={1}
            listening={false}
          />
        )}

        {/* Right tank */}
        <Rect
          x={pixelWidth - 55}
          y={0}
          width={40}
          height={trackCenterY - trackWidth / 2 - 45}
          fill={tankColor}
          stroke={accentColor}
          strokeWidth={2}
          cornerRadius={4}
          listening={false}
        />
        {/* Tank level indicator */}
        {lodLevel === 'high' && (
          <Rect
            x={pixelWidth - 52}
            y={(trackCenterY - trackWidth / 2 - 45) * 0.3}
            width={6}
            height={(trackCenterY - trackWidth / 2 - 45) * 0.6}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth={1}
            listening={false}
          />
        )}
      </Group>

      {/* Fluid transfer arm / loading equipment */}
      <Group>
        <Line
          points={[
            pixelWidth / 2 - 20, trackCenterY - trackWidth / 2 - 15,
            pixelWidth / 2 - 20, trackCenterY - 8,
            pixelWidth / 2 + 20, trackCenterY - 8,
            pixelWidth / 2 + 20, trackCenterY - trackWidth / 2 - 15
          ]}
          stroke={pipeColor}
          strokeWidth={4}
          listening={false}
        />
        {/* Fluid nozzle */}
        <Circle
          x={pixelWidth / 2}
          y={trackCenterY - 8}
          radius={5}
          fill={accentColor}
          stroke="#0369a1"
          strokeWidth={1}
          listening={false}
        />
      </Group>

      {/* Piping on back side (near connection points) */}
      <Group y={trackCenterY + trackWidth / 2 + 15}>
        {/* Left pipe run */}
        <Line
          points={[40, 0, 40, pixelHeight - trackCenterY - trackWidth / 2 - 30]}
          stroke={pipeColor}
          strokeWidth={6}
          listening={false}
        />
        <Circle
          x={40}
          y={pixelHeight - trackCenterY - trackWidth / 2 - 25}
          radius={6}
          fill={accentColor}
          stroke="#0369a1"
          strokeWidth={1}
          listening={false}
        />

        {/* Right pipe run */}
        <Line
          points={[pixelWidth - 40, 0, pixelWidth - 40, pixelHeight - trackCenterY - trackWidth / 2 - 30]}
          stroke={pipeColor}
          strokeWidth={6}
          listening={false}
        />
        <Circle
          x={pixelWidth - 40}
          y={pixelHeight - trackCenterY - trackWidth / 2 - 25}
          radius={6}
          fill={accentColor}
          stroke="#0369a1"
          strokeWidth={1}
          listening={false}
        />
      </Group>

      {/* Fluid warning markings */}
      {lodLevel === 'high' && (
        <Group>
          <Rect
            x={pixelWidth / 2 - 15}
            y={15}
            width={30}
            height={12}
            fill="rgba(56, 189, 248, 0.2)"
            stroke={accentColor}
            strokeWidth={1}
            cornerRadius={2}
            listening={false}
          />
          <Text
            text="FLUID"
            x={pixelWidth / 2 - 15}
            y={17}
            width={30}
            fontSize={7}
            fill={accentColor}
            fontStyle="bold"
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};

/**
 * Empty Platform specific details - minimal markings
 */
const EmptyPlatformDetails: React.FC<{
  pixelWidth: number;
  pixelHeight: number;
  trackCenterY: number;
  trackWidth: number;
  lodLevel: 'low' | 'medium' | 'high';
}> = ({ pixelWidth, pixelHeight, trackCenterY, trackWidth, lodLevel }) => {
  return (
    <Group>
      {/* Simple platform surface markings */}
      <Rect
        x={10}
        y={20}
        width={pixelWidth - 20}
        height={trackCenterY - trackWidth / 2 - 30}
        fill="rgba(100, 116, 139, 0.1)"
        stroke="#64748b"
        strokeWidth={1}
        dash={[8, 4]}
        cornerRadius={3}
        listening={false}
      />

      <Rect
        x={10}
        y={trackCenterY + trackWidth / 2 + 10}
        width={pixelWidth - 20}
        height={pixelHeight - trackCenterY - trackWidth / 2 - 20}
        fill="rgba(100, 116, 139, 0.1)"
        stroke="#64748b"
        strokeWidth={1}
        dash={[8, 4]}
        cornerRadius={3}
        listening={false}
      />

      {/* "EMPTY" indicator */}
      {lodLevel === 'high' && (
        <Group x={pixelWidth / 2} y={trackCenterY}>
          <Rect
            x={-25}
            y={-40}
            width={50}
            height={16}
            fill="rgba(30, 41, 59, 0.8)"
            cornerRadius={3}
            listening={false}
          />
          <Text
            text="EMPTY"
            x={-25}
            y={-38}
            width={50}
            fontSize={9}
            fill="#94a3b8"
            fontStyle="bold"
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};

export default TrainStationDetails;
