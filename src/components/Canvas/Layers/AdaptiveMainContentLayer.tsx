/**
 * Adaptive Main Content Layer - Renders all main content using renderer abstraction
 * Optimizes rendering based on available renderer capabilities (Konva vs WebGL)
 */

import React, { useMemo } from 'react';
import { RendererAdapter } from '../../../renderer/adapters/RendererAdapter';
import { Building, ConveyorPole, ConveyorBelt, ConveyorLift, PipeSupport, Pipeline, PipeFloorConnection, Railway, Powerline, PowerPole, Foundation, Wall, Railing } from '../../../types';

// Adaptive shape components
import { AdaptiveBuildingShape } from '../../Buildings/AdaptiveBuildingShape';
import { AdaptiveConveyorBeltShape } from '../../Conveyors/AdaptiveConveyorBeltShape';
import { AdaptiveConveyorPoleShape } from '../../Conveyors/AdaptiveConveyorPoleShape';
import { AdaptiveConveyorLiftShape } from '../../Conveyors/AdaptiveConveyorLiftShape';
import { AdaptivePipelineShape } from '../../Pipes/AdaptivePipelineShape';
import { AdaptivePipeSupportShape } from '../../Pipes/AdaptivePipeSupportShape';
import { AdaptivePipeFloorConnectionShape } from '../../Pipes/AdaptivePipeFloorConnectionShape';
import { AdaptiveRailwayShape } from '../../Transport/AdaptiveRailwayShape';
import { AdaptivePowerlineShape } from '../../Transport/AdaptivePowerlineShape';
import { AdaptivePowerPoleShape } from '../../Transport/AdaptivePowerPoleShape';
import { AdaptiveFoundationShape } from '../../Architecture/AdaptiveFoundationShape';
import { AdaptiveWallShape } from '../../Architecture/AdaptiveWallShape';
import { AdaptiveRailingShape } from '../../Architecture/AdaptiveRailingShape';

interface AdaptiveMainContentLayerProps {
  adapter: RendererAdapter;
  scale: number;
  currentFloor: number;
  buildings: Building[];
  conveyorPoles: ConveyorPole[];
  conveyorBelts: ConveyorBelt[];
  conveyorLifts: ConveyorLift[];
  pipeSupports: PipeSupport[];
  pipelines: Pipeline[];
  pipeFloorConnections: PipeFloorConnection[];
  railways: Railway[];
  powerlines: Powerline[];
  powerPoles: PowerPole[];
  foundations: Foundation[];
  walls: Wall[];
  railings: Railing[];
  selectedIds: Set<string>;
  renderQuality: number;
}

export const AdaptiveMainContentLayer: React.FC<AdaptiveMainContentLayerProps> = ({
  adapter,
  scale,
  currentFloor,
  buildings,
  conveyorPoles,
  conveyorBelts,
  conveyorLifts,
  pipeSupports,
  pipelines,
  pipeFloorConnections,
  railways,
  powerlines,
  powerPoles,
  foundations,
  walls,
  railings,
  selectedIds,
  renderQuality
}) => {
  // Get current LOD level for performance optimization
  const currentLOD = adapter.getCurrentLOD(scale);
  const isGPURenderer = adapter.isGPURenderer();

  // Filter items by current floor for performance
  const visibleBuildings = useMemo(() => 
    buildings.filter(building => building.z === currentFloor),
    [buildings, currentFloor]
  );

  const visibleConveyorPoles = useMemo(() => 
    conveyorPoles.filter(pole => pole.z === currentFloor),
    [conveyorPoles, currentFloor]
  );

  const visibleConveyorBelts = useMemo(() => 
    conveyorBelts.filter(belt => belt.startZ === currentFloor),
    [conveyorBelts, currentFloor]
  );

  const visibleConveyorLifts = useMemo(() => 
    conveyorLifts.filter(lift => lift.startZ === currentFloor || lift.endZ === currentFloor),
    [conveyorLifts, currentFloor]
  );

  const visiblePipeSupports = useMemo(() => 
    pipeSupports.filter(support => support.z === currentFloor),
    [pipeSupports, currentFloor]
  );

  const visiblePipelines = useMemo(() => 
    pipelines.filter(pipeline => pipeline.startZ === currentFloor),
    [pipelines, currentFloor]
  );

  const visiblePipeFloorConnections = useMemo(() => 
    pipeFloorConnections.filter(connection => connection.z === currentFloor),
    [pipeFloorConnections, currentFloor]
  );

  const visibleRailways = useMemo(() => 
    railways.filter(railway => railway.startZ === currentFloor),
    [railways, currentFloor]
  );

  const visiblePowerlines = useMemo(() => 
    powerlines.filter(powerline => powerline.startZ === currentFloor),
    [powerlines, currentFloor]
  );

  const visiblePowerPoles = useMemo(() => 
    powerPoles.filter(pole => pole.z === currentFloor),
    [powerPoles, currentFloor]
  );

  const visibleFoundations = useMemo(() => 
    foundations.filter(foundation => foundation.z === currentFloor),
    [foundations, currentFloor]
  );

  const visibleWalls = useMemo(() => 
    walls.filter(wall => wall.z === currentFloor),
    [walls, currentFloor]
  );

  const visibleRailings = useMemo(() => 
    railings.filter(railing => railing.z === currentFloor),
    [railings, currentFloor]
  );

  // GPU optimization: batch similar items when using WebGL
  const renderBatchedItems = (items: any[], Component: React.ComponentType<any>, typeKey: string) => {
    if (isGPURenderer && items.length > 50) {
      // For WebGL renderer, we can batch similar items
      return adapter.createGroup({
        id: `${typeKey}-batch-${currentFloor}`,
        children: items.map((item, index) => (
          <Component
            key={item.id}
            adapter={adapter}
            item={item}
            isSelected={selectedIds.has(item.id)}
            lodLevel={currentLOD}
            renderQuality={renderQuality}
            batchIndex={index}
            batchSize={items.length}
          />
        ))
      });
    } else {
      // For Konva or small batches, render individually
      return items.map(item => (
        <Component
          key={item.id}
          adapter={adapter}
          item={item}
          isSelected={selectedIds.has(item.id)}
          lodLevel={currentLOD}
          renderQuality={renderQuality}
        />
      ));
    }
  };

  return (
    <>
      {/* Infrastructure - render first (bottom layer) */}
      {adapter.createGroup({
        id: 'infrastructure-group',
        children: (
          <>
            {/* Foundations */}
            {renderBatchedItems(visibleFoundations, AdaptiveFoundationShape, 'foundations')}
            
            {/* Walls */}
            {renderBatchedItems(visibleWalls, AdaptiveWallShape, 'walls')}
            
            {/* Railings */}
            {renderBatchedItems(visibleRailings, AdaptiveRailingShape, 'railings')}
          </>
        )
      })}

      {/* Transport Infrastructure */}
      {adapter.createGroup({
        id: 'transport-group',
        children: (
          <>
            {/* Railways */}
            {renderBatchedItems(visibleRailways, AdaptiveRailwayShape, 'railways')}
            
            {/* Power Poles */}
            {renderBatchedItems(visiblePowerPoles, AdaptivePowerPoleShape, 'power-poles')}
            
            {/* Powerlines */}
            {renderBatchedItems(visiblePowerlines, AdaptivePowerlineShape, 'powerlines')}
            
            {/* Conveyor Poles */}
            {renderBatchedItems(visibleConveyorPoles, AdaptiveConveyorPoleShape, 'conveyor-poles')}
            
            {/* Pipe Supports */}
            {renderBatchedItems(visiblePipeSupports, AdaptivePipeSupportShape, 'pipe-supports')}
          </>
        )
      })}

      {/* Connection Infrastructure */}
      {adapter.createGroup({
        id: 'connections-group',
        children: (
          <>
            {/* Conveyor Belts */}
            {renderBatchedItems(visibleConveyorBelts, AdaptiveConveyorBeltShape, 'conveyor-belts')}
            
            {/* Conveyor Lifts */}
            {renderBatchedItems(visibleConveyorLifts, AdaptiveConveyorLiftShape, 'conveyor-lifts')}
            
            {/* Pipelines */}
            {renderBatchedItems(visiblePipelines, AdaptivePipelineShape, 'pipelines')}
            
            {/* Pipe Floor Connections */}
            {renderBatchedItems(visiblePipeFloorConnections, AdaptivePipeFloorConnectionShape, 'pipe-floor-connections')}
          </>
        )
      })}

      {/* Buildings - render on top */}
      {adapter.createGroup({
        id: 'buildings-group',
        children: renderBatchedItems(visibleBuildings, AdaptiveBuildingShape, 'buildings')
      })}
    </>
  );
};

export default AdaptiveMainContentLayer;