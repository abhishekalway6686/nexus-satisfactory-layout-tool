// src/components/Canvas/layers/BackgroundLayer.tsx
import React from 'react';
import { Layer, Group } from 'react-konva';
import { GridBackground } from '../GridBackground';
import { FoundationShape } from '../../Architecture/FoundationShape';
import { BuildingShape } from '../../Buildings/BuildingShape';
import { PowerPoleShape } from '../../Transport/PowerPoleShape';
import { WallShape } from '../../Architecture/WallShape';
import { RailingShape } from '../../Architecture/RailingShape';
import { ConveyorBeltShape } from '../../Conveyors/ConveyorBeltShape';
import { PipelineShape } from '../../Pipes/PipelineShape';
import { ConveyorPoleShape } from '../../Conveyors/ConveyorPoleShape';
import { PipeSupportShape } from '../../Pipes/PipeSupportShape';
import { RailwayShape } from '../../Transport/RailwayShape';
import { PowerlineShape } from '../../Transport/PowerlineShape';
import {
  Foundation,
  Building,
  Wall,
  Railing,
  ConveyorBelt,
  Pipeline,
  ConveyorPole,
  PipeSupport,
  Railway,
  PowerlineSegment
} from '../../../types';

// Memoized components for better performance
const MemoizedFoundationShape = React.memo(FoundationShape);
const MemoizedBuildingShape = React.memo(BuildingShape);
const MemoizedPowerPoleShape = React.memo(PowerPoleShape);
const MemoizedWallShape = React.memo(WallShape);
const MemoizedRailingShape = React.memo(RailingShape);
const MemoizedConveyorBeltShape = React.memo(ConveyorBeltShape);
const MemoizedPipelineShape = React.memo(PipelineShape);
const MemoizedConveyorPoleShape = React.memo(ConveyorPoleShape);
const MemoizedPipeSupportShape = React.memo(PipeSupportShape);
const MemoizedRailwayShape = React.memo(RailwayShape);
const MemoizedPowerlineShape = React.memo(PowerlineShape);

interface BackgroundLayerProps {
  // Grid props
  showGrid: boolean;
  canvasSize: { width: number; height: number };
  scale: number;
  position: { x: number; y: number };
  stageRef: React.RefObject<any>;

  // Floor below props
  floorBelowFoundations: Foundation[];
  floorBelowBuildings: Building[];
  floorBelowWalls: Wall[];
  floorBelowRailings: Railing[];
  floorBelowConveyors: ConveyorBelt[];
  floorBelowPipelines: Pipeline[];
  floorBelowPoles: ConveyorPole[];
  floorBelowPipeSupports: PipeSupport[];
  floorBelowRailways: Railway[];
  floorBelowPowerlineSegments: PowerlineSegment[];
}

export const BackgroundLayer = React.memo<BackgroundLayerProps>(({
  showGrid,
  canvasSize,
  scale,
  position,
  stageRef,
  floorBelowFoundations,
  floorBelowBuildings,
  floorBelowWalls,
  floorBelowRailings,
  floorBelowConveyors,
  floorBelowPipelines,
  floorBelowPoles,
  floorBelowPipeSupports,
  floorBelowRailways,
  floorBelowPowerlineSegments
}) => {
  // Provide sensible defaults if dimensions are not ready
  const safeWidth = canvasSize.width > 0 ? canvasSize.width : window.innerWidth || 800;
  const safeHeight = canvasSize.height > 0 ? canvasSize.height : window.innerHeight || 600;
  const safeScale = scale > 0 ? scale : 1;

  return (
    <Layer listening={false}>
      {/* Grid Background Group */}
      <Group>
        {showGrid && (
          <GridBackground
            width={safeWidth}
            height={safeHeight}
            scale={safeScale}
            showGrid={true}
            stageX={position.x}
            stageY={position.y}
            stageRef={stageRef}
          />
        )}
      </Group>

      {/* Floor Below Group - All floor below objects with faded opacity */}
      <Group>
        {/* Render foundations from floor below with faded opacity (non-interactive) */}
        {floorBelowFoundations.map(foundation => (
          <MemoizedFoundationShape
            key={`below-${foundation.id}`}
            foundation={foundation}
            isSelected={false}
            opacity={0.3}
            onSelect={() => {}} // Non-interactive for floor below
            onDragEnd={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render buildings from floor below with faded opacity (non-interactive) */}
        {floorBelowBuildings.map(building => {
          // Use PowerPoleShape for power pole buildings, BuildingShape for others
          const isPowerPole = ['power_pole_mk1', 'power_pole_mk2', 'power_pole_mk3', 'power_tower'].includes(building.type);

          if (isPowerPole) {
            return (
              <MemoizedPowerPoleShape
                key={`below-${building.id}`}
                building={building}
                isSelected={false}
                opacity={0.3}
                scale={scale}
                interactive={false} // Non-interactive for floor below
                onPoleClick={() => {}}
              />
            );
          }

          return (
            <MemoizedBuildingShape
              key={`below-${building.id}`}
              building={building}
              isSelected={false}
              opacity={0.3}
              onSelect={() => {}} // Non-interactive for floor below
              onDragEnd={() => {}} // Non-interactive for floor below
            />
          );
        })}

        {/* Render walls from floor below with faded opacity (non-interactive) */}
        {floorBelowWalls.map(wall => (
          <MemoizedWallShape
            key={`below-${wall.id}`}
            wall={wall}
            isSelected={false}
            opacity={0.3}
            onSelect={() => {}} // Non-interactive for floor below
            onDragEnd={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render railings from floor below with faded opacity (non-interactive) */}
        {floorBelowRailings.map(railing => (
          <MemoizedRailingShape
            key={`below-${railing.id}`}
            railing={railing}
            isSelected={false}
            opacity={0.3}
            onSelect={() => {}} // Non-interactive for floor below
            onDragEnd={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render conveyor belts from floor below with faded opacity (non-interactive) */}
        {floorBelowConveyors.map(belt => (
          <MemoizedConveyorBeltShape
            key={`below-${belt.id}`}
            beltId={belt.id}
            opacity={0.3}
            interactive={false}
            onBeltClick={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render pipelines from floor below with faded opacity (non-interactive) */}
        {floorBelowPipelines.map(pipeline => (
          <MemoizedPipelineShape
            key={`below-${pipeline.id}`}
            pipelineId={pipeline.id}
            opacity={0.3}
            interactive={false}
            onPipeClick={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render conveyor poles from floor below with faded opacity (non-interactive) */}
        {floorBelowPoles.map(pole => (
          <MemoizedConveyorPoleShape
            key={`below-${pole.id}`}
            pole={pole}
            isSelected={false}
            opacity={0.3}
            interactive={false}
            onSelect={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render pipe supports from floor below with faded opacity (non-interactive) */}
        {floorBelowPipeSupports.map(support => (
          <MemoizedPipeSupportShape
            key={`below-${support.id}`}
            support={support}
            isSelected={false}
            opacity={0.3}
            interactive={false}
            onSelect={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render railways from floor below with faded opacity (non-interactive) */}
        {floorBelowRailways.map(railway => (
          <MemoizedRailwayShape
            key={`below-${railway.id}`}
            railway={railway}
            opacity={0.3}
            interactive={false}
            onRailClick={() => {}} // Non-interactive for floor below
          />
        ))}

        {/* Render powerline segments from floor below with faded opacity (non-interactive) */}
        {floorBelowPowerlineSegments.map(segment => (
          <MemoizedPowerlineShape
            key={`below-${segment.id}`}
            segment={segment}
            isSelected={false}
            opacity={0.3}
            scale={scale}
          />
        ))}
      </Group>
    </Layer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders during canvas drag
  // Only re-render if data actually changes, not on every position change
  return (
    prevProps.showGrid === nextProps.showGrid &&
    prevProps.scale === nextProps.scale &&
    prevProps.canvasSize.width === nextProps.canvasSize.width &&
    prevProps.canvasSize.height === nextProps.canvasSize.height &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.stageRef === nextProps.stageRef &&
    prevProps.floorBelowFoundations === nextProps.floorBelowFoundations &&
    prevProps.floorBelowBuildings === nextProps.floorBelowBuildings &&
    prevProps.floorBelowWalls === nextProps.floorBelowWalls &&
    prevProps.floorBelowRailings === nextProps.floorBelowRailings &&
    prevProps.floorBelowConveyors === nextProps.floorBelowConveyors &&
    prevProps.floorBelowPipelines === nextProps.floorBelowPipelines &&
    prevProps.floorBelowPoles === nextProps.floorBelowPoles &&
    prevProps.floorBelowPipeSupports === nextProps.floorBelowPipeSupports &&
    prevProps.floorBelowRailways === nextProps.floorBelowRailways &&
    prevProps.floorBelowPowerlineSegments === nextProps.floorBelowPowerlineSegments
  );
});

BackgroundLayer.displayName = 'BackgroundLayer';
