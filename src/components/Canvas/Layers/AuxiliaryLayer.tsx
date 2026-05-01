// src/components/Canvas/layers/AuxiliaryLayer.tsx
import React from 'react';
import { Layer } from 'react-konva';
import { ConveyorLiftShape } from '../../Conveyors/ConveyorLiftShape';
import { PipeFloorConnectionShape } from '../../Pipes/PipeFloorConnectionShape';
import { PowerlineShape } from '../../Transport/PowerlineShape';
import { 
  ConveyorLift, 
  PipeFloorConnection, 
  PowerlineSegment
} from '../../../types';

// Memoized components for better performance
const MemoizedConveyorLiftShape = React.memo(ConveyorLiftShape);
const MemoizedPipeFloorConnectionShape = React.memo(PipeFloorConnectionShape);
const MemoizedPowerlineShape = React.memo(PowerlineShape);

interface AuxiliaryLayerProps {
  // Conveyor lifts
  conveyorLifts: Record<string, ConveyorLift>;

  // Pipe floor connections
  pipeFloorConnections: Record<string, PipeFloorConnection>;

  // Powerlines
  currentFloorPowerlineSegments: PowerlineSegment[];
  selectedPowerlineSegment: string | null;
  scale: number;
}

export const AuxiliaryLayer = React.memo<AuxiliaryLayerProps>(({
  conveyorLifts,
  pipeFloorConnections,
  currentFloorPowerlineSegments,
  selectedPowerlineSegment,
  scale
}) => {
  return (
    <Layer>
      {/* Render conveyor lifts */}
      {conveyorLifts && Object.values(conveyorLifts).map(lift => (
        <MemoizedConveyorLiftShape
          key={lift.id}
          lift={lift}
        />
      ))}

      {/* Render pipe floor connections */}
      {pipeFloorConnections && Object.values(pipeFloorConnections).map(connection => (
        <MemoizedPipeFloorConnectionShape
          key={connection.id}
          connection={connection}
        />
      ))}
      
      {/* Render powerline segments */}
      {currentFloorPowerlineSegments && currentFloorPowerlineSegments.map(segment => (
        <MemoizedPowerlineShape
          key={segment.id}
          segment={segment}
          isSelected={selectedPowerlineSegment === segment.id}
          opacity={1}
          scale={scale}
        />
      ))}
    </Layer>
  );
});

AuxiliaryLayer.displayName = 'AuxiliaryLayer';