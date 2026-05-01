// src/components/Canvas/layers/MainContentLayer.tsx
import React, { useMemo } from 'react';
import { Layer } from 'react-konva';
import { FoundationShape } from '../../Architecture/FoundationShape';
import { BuildingShape } from '../../Buildings/BuildingShape';
import { PowerPoleShape } from '../../Transport/PowerPoleShape';
import { WallShape } from '../../Architecture/WallShape';
import { RailingShape } from '../../Architecture/RailingShape';
import { ConveyorBeltShape } from '../../Conveyors/ConveyorBeltShape';
import { PipelineShape } from '../../Pipes/PipelineShape';
import { ConveyorPoleShape } from '../../Conveyors/ConveyorPoleShape';
import { EndpointNodeShape } from '../../Conveyors/EndpointNodeShape';
import { PipeSupportShape } from '../../Pipes/PipeSupportShape';
import { RailwayShape } from '../../Transport/RailwayShape';
import { RailwayDebugOverlay } from '../../Transport/RailwayDebugOverlay';
import { useLayoutStore } from '../../../store/layoutStore';
import { getUnconnectedBeltEndpoints } from '../../../logic/conveyor/endpointDetection';
import {
  Foundation,
  Building,
  PowerPole,
  Wall,
  Railing,
  ConveyorBelt,
  Pipeline,
  ConveyorPole,
  PipeSupport,
  Railway
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
const MemoizedEndpointNodeShape = React.memo(EndpointNodeShape);
const MemoizedPipeSupportShape = React.memo(PipeSupportShape);
const MemoizedRailwayShape = React.memo(RailwayShape);

interface MainContentLayerProps {
  // Foundations
  currentFloorFoundations: Foundation[];
  selectedFoundation: string | null;
  handleFoundationSelect: (id: string) => void;
  handleFoundationDragEnd: (id: string, e: any) => void;

  // Buildings
  currentFloorBuildings: Building[];
  selectedBuilding: string | null;
  getBuildingOpacity: (building: Building, isFloorBelow: boolean) => number;
  handleBuildingSelect: (id: string) => void;
  handleBuildingDragStart: (id: string) => void;
  handleBuildingDragEnd: (id: string, e: any) => void;
  scale: number;

  // Walls
  currentFloorWalls: Wall[];
  selectedWall: string | null;
  handleWallSelect: (id: string) => void;
  handleWallDragEnd: (id: string, e: any) => void;

  // Railings
  currentFloorRailings: Railing[];
  selectedRailing: string | null;
  handleRailingSelect: (id: string) => void;
  handleRailingDragEnd: (id: string, e: any) => void;

  // Conveyors
  currentFloorConveyors: ConveyorBelt[];
  handleBeltClick: (belt: ConveyorBelt) => void;

  // Pipelines
  currentFloorPipelines: Pipeline[];

  // Poles and supports
  currentFloorPoles: ConveyorPole[];
  selectedPole: string | null;
  handlePoleSelect: (id: string) => void;

  currentFloorPipeSupports: PipeSupport[];
  selectedPipeSupport: string | null;
  handlePipeSupportSelect: (id: string) => void;

  // Power Poles
  currentFloorPowerPoles: PowerPole[];
  selectedPowerPole: string | null;
  handlePowerPoleSelect: (id: string) => void;
  handlePowerPoleDragEnd?: (poleId: string, e: any) => void;

  // Railways
  currentFloorRailways: Railway[];
  showRailwayDebug: boolean;
}

export const MainContentLayer = React.memo<MainContentLayerProps>(({
  // Foundations
  currentFloorFoundations,
  selectedFoundation,
  handleFoundationSelect,
  handleFoundationDragEnd,

  // Buildings
  currentFloorBuildings,
  selectedBuilding,
  getBuildingOpacity,
  handleBuildingSelect,
  handleBuildingDragStart,
  handleBuildingDragEnd,
  scale,

  // Walls
  currentFloorWalls,
  selectedWall,
  handleWallSelect,
  handleWallDragEnd,

  // Railings
  currentFloorRailings,
  selectedRailing,
  handleRailingSelect,
  handleRailingDragEnd,

  // Conveyors
  currentFloorConveyors,
  handleBeltClick,

  // Pipelines
  currentFloorPipelines,

  // Poles and supports
  currentFloorPoles,
  selectedPole,
  handlePoleSelect,

  currentFloorPipeSupports,
  selectedPipeSupport,
  handlePipeSupportSelect,

  // Power Poles
  currentFloorPowerPoles,
  selectedPowerPole,
  handlePowerPoleSelect,
  handlePowerPoleDragEnd,

  // Railways
  currentFloorRailways,
  showRailwayDebug
}) => {
  // Get conveyor data from store for endpoint detection
  const conveyorBelts = useLayoutStore(state => state.conveyorBelts);
  const conveyorSegments = useLayoutStore(state => state.conveyorSegments);
  const conveyorPoles = useLayoutStore(state => state.conveyorPoles);
  const currentFloor = useLayoutStore(state => state.currentFloor);

  // Compute unconnected endpoints for current floor
  const currentFloorEndpoints = useMemo(() => {
    return getUnconnectedBeltEndpoints(conveyorBelts, conveyorSegments, conveyorPoles, currentFloor);
  }, [conveyorBelts, conveyorSegments, conveyorPoles, currentFloor]);

  return (
    <Layer>
      {/* Render foundations (bottom layer) */}
      {currentFloorFoundations.map(foundation => (
        <MemoizedFoundationShape
          key={foundation.id}
          foundation={foundation}
          isSelected={selectedFoundation === foundation.id}
          opacity={1}
          onSelect={() => handleFoundationSelect(foundation.id)}
          onDragEnd={(e) => handleFoundationDragEnd(foundation.id, e)}
        />
      ))}

      {/* Render linear infrastructure BEFORE buildings so buildings are on top for drag events */}
      {/* Conveyor belts - visual paths rendered below buildings */}
      {currentFloorConveyors.map(belt => (
        <MemoizedConveyorBeltShape
          key={belt.id}
          beltId={belt.id}
          opacity={1}
          interactive={true}
          onBeltClick={handleBeltClick}
        />
      ))}

      {/* Pipelines - visual paths rendered below buildings */}
      {currentFloorPipelines.map(pipeline => (
        <MemoizedPipelineShape
          key={pipeline.id}
          pipelineId={pipeline.id}
          opacity={1}
          interactive={true}
        />
      ))}

      {/* Railways - FIRST PASS: ballast/roadbed rendered UNDER buildings */}
      {/* This creates the effect of tracks running through station buildings */}
      {currentFloorRailways.map(railway => {
        return (
          <MemoizedRailwayShape
            key={`${railway.id}-under`}
            railway={railway}
            opacity={1}
            interactive={false}
            renderLayer="under"
          />
        );
      })}

      {/* Render walls */}
      {currentFloorWalls.map(wall => (
        <MemoizedWallShape
          key={wall.id}
          wall={wall}
          isSelected={selectedWall === wall.id}
          opacity={1}
          onSelect={() => handleWallSelect(wall.id)}
          onDragEnd={(e) => handleWallDragEnd(wall.id, e)}
        />
      ))}

      {/* Render railings */}
      {currentFloorRailings.map(railing => (
        <MemoizedRailingShape
          key={railing.id}
          railing={railing}
          isSelected={selectedRailing === railing.id}
          opacity={1}
          onSelect={() => handleRailingSelect(railing.id)}
          onDragEnd={(e) => handleRailingDragEnd(railing.id, e)}
        />
      ))}

      {/* Render buildings ON TOP of infrastructure for proper drag event capture */}
      {currentFloorBuildings.map(building => {
        // Use PowerPoleShape for power pole buildings, BuildingShape for others
        const isPowerPole = ['power_pole_mk1', 'power_pole_mk2', 'power_pole_mk3', 'power_tower'].includes(building.type);

        if (isPowerPole) {
          return (
            <MemoizedPowerPoleShape
              key={building.id}
              building={building}
              isSelected={selectedBuilding === building.id}
              opacity={getBuildingOpacity(building, false)}
              scale={scale}
              interactive={true}
              draggable={true}
              onPoleClick={() => handleBuildingSelect(building.id)}
              onDragEnd={handlePowerPoleDragEnd ? (poleId, e) => handlePowerPoleDragEnd(poleId, e) : undefined}
            />
          );
        }

        return (
          <MemoizedBuildingShape
            key={building.id}
            building={building}
            isSelected={selectedBuilding === building.id}
            opacity={getBuildingOpacity(building, false)}
            scale={scale}
            onSelect={() => handleBuildingSelect(building.id)}
            onDragStart={() => handleBuildingDragStart(building.id)}
            onDragEnd={(e) => handleBuildingDragEnd(building.id, e)}
          />
        );
      })}

      {/* Railways - SECOND PASS: rails/ties rendered OVER buildings */}
      {/* This creates visible rails running through station buildings */}
      {currentFloorRailways.map(railway => {
        return (
          <MemoizedRailwayShape
            key={`${railway.id}-over`}
            railway={railway}
            opacity={1}
            interactive={true}
            renderLayer="over"
          />
        );
      })}

      {/* Render conveyor poles with proper mobile selection */}
      {currentFloorPoles.map(pole => (
        <MemoizedConveyorPoleShape
          key={pole.id}
          pole={pole}
          isSelected={selectedPole === pole.id}
          opacity={1}
          interactive={true}
          onSelect={() => handlePoleSelect(pole.id)}
        />
      ))}

      {/* Render unconnected conveyor belt endpoints */}
      {/* These show clickable nodes at the ends of belts that aren't connected to buildings */}
      {currentFloorEndpoints.map(endpoint => (
        <MemoizedEndpointNodeShape
          key={`endpoint-${endpoint.poleId}-${endpoint.beltId}`}
          endpoint={endpoint}
          scale={scale}
          interactive={true}
        />
      ))}

      {/* Render pipe supports with proper mobile selection */}
      {currentFloorPipeSupports.map(support => (
        <MemoizedPipeSupportShape
          key={support.id}
          support={support}
          isSelected={selectedPipeSupport === support.id}
          opacity={1}
          interactive={true}
          onSelect={() => handlePipeSupportSelect(support.id)}
        />
      ))}

      {/* Render power poles with proper mobile selection and dragging */}
      {currentFloorPowerPoles.map(pole => (
        <MemoizedPowerPoleShape
          key={pole.id}
          pole={pole}
          isSelected={selectedPowerPole === pole.id}
          opacity={1}
          scale={scale}
          interactive={true}
          draggable={true}
          onPoleClick={() => handlePowerPoleSelect(pole.id)}
          onDragEnd={handlePowerPoleDragEnd ? (poleId, e) => handlePowerPoleDragEnd(poleId, e) : undefined}
        />
      ))}

      {/* Railway debug overlay - shows overlapping nodes and junction info */}
      <RailwayDebugOverlay visible={showRailwayDebug} />
    </Layer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders during canvas drag
  // Critical: Compare array references, not contents (arrays are memoized upstream)
  return (
    prevProps.currentFloorFoundations === nextProps.currentFloorFoundations &&
    prevProps.selectedFoundation === nextProps.selectedFoundation &&
    prevProps.handleFoundationSelect === nextProps.handleFoundationSelect &&
    prevProps.handleFoundationDragEnd === nextProps.handleFoundationDragEnd &&
    prevProps.currentFloorBuildings === nextProps.currentFloorBuildings &&
    prevProps.selectedBuilding === nextProps.selectedBuilding &&
    prevProps.getBuildingOpacity === nextProps.getBuildingOpacity &&
    prevProps.handleBuildingSelect === nextProps.handleBuildingSelect &&
    prevProps.handleBuildingDragStart === nextProps.handleBuildingDragStart &&
    prevProps.handleBuildingDragEnd === nextProps.handleBuildingDragEnd &&
    prevProps.scale === nextProps.scale &&
    prevProps.currentFloorWalls === nextProps.currentFloorWalls &&
    prevProps.selectedWall === nextProps.selectedWall &&
    prevProps.handleWallSelect === nextProps.handleWallSelect &&
    prevProps.handleWallDragEnd === nextProps.handleWallDragEnd &&
    prevProps.currentFloorRailings === nextProps.currentFloorRailings &&
    prevProps.selectedRailing === nextProps.selectedRailing &&
    prevProps.handleRailingSelect === nextProps.handleRailingSelect &&
    prevProps.handleRailingDragEnd === nextProps.handleRailingDragEnd &&
    prevProps.currentFloorConveyors === nextProps.currentFloorConveyors &&
    prevProps.handleBeltClick === nextProps.handleBeltClick &&
    prevProps.currentFloorPipelines === nextProps.currentFloorPipelines &&
    prevProps.currentFloorPoles === nextProps.currentFloorPoles &&
    prevProps.selectedPole === nextProps.selectedPole &&
    prevProps.handlePoleSelect === nextProps.handlePoleSelect &&
    prevProps.currentFloorPipeSupports === nextProps.currentFloorPipeSupports &&
    prevProps.selectedPipeSupport === nextProps.selectedPipeSupport &&
    prevProps.handlePipeSupportSelect === nextProps.handlePipeSupportSelect &&
    prevProps.currentFloorPowerPoles === nextProps.currentFloorPowerPoles &&
    prevProps.selectedPowerPole === nextProps.selectedPowerPole &&
    prevProps.handlePowerPoleSelect === nextProps.handlePowerPoleSelect &&
    prevProps.handlePowerPoleDragEnd === nextProps.handlePowerPoleDragEnd &&
    prevProps.currentFloorRailways === nextProps.currentFloorRailways &&
    prevProps.showRailwayDebug === nextProps.showRailwayDebug
  );
});

MainContentLayer.displayName = 'MainContentLayer';