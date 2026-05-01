// src/components/Canvas/Layers/ProductionOverlayLayer.tsx
// Layer component for rendering production simulation overlays

import React, { useMemo } from 'react';
import { Layer, Group } from 'react-konva';
import { ProductionBadge, getProductionStatus, formatOutputRate, calculateBadgeOffset } from '../ProductionBadge';
import { ConveyorFlowOverlay, PipelineFlowOverlay } from '../ConveyorFlowOverlay';
import { useLayoutStore } from '../../../store/layoutStore';
import { useProductionCalculation } from '../../../hooks/useProductionCalculation';
import { BUILDING_TYPES } from '../../../constants';
import { Building, ConveyorBelt, ProductionOverlaySettings } from '../../../types';
import { FlowState } from '../../../logic/production/flowCalculation';
import { isExtractionBuilding } from '../../../data/recipesByBuilding';

// ============================================
// TYPES
// ============================================

interface ProductionOverlayLayerProps {
  /** Current floor being viewed */
  currentFloor: number;
  /** Current canvas scale for responsive sizing */
  scale: number;
  /** Production overlay settings */
  settings: ProductionOverlaySettings;
}

// ============================================
// BUILDING BADGE COMPONENT
// ============================================

interface BuildingProductionBadgeProps {
  building: Building;
  flowState: FlowState;
  settings: ProductionOverlaySettings;
  scale: number;
}

const BuildingProductionBadge = React.memo<BuildingProductionBadgeProps>(({
  building,
  flowState,
  settings,
  scale,
}) => {
  const buildingDef = BUILDING_TYPES[building.type];
  if (!buildingDef) return null;

  // Get flow node data for this building
  const node = flowState.nodes[building.id];

  // Skip buildings without production data (non-production buildings)
  const isProductionBuilding = buildingDef.category === 'production' ||
    buildingDef.category === 'smelting' ||
    buildingDef.category === 'extraction' ||
    buildingDef.category === 'power' ||
    building.type.includes('assembler') ||
    building.type.includes('constructor') ||
    building.type.includes('smelter') ||
    building.type.includes('foundry') ||
    building.type.includes('manufacturer') ||
    building.type.includes('refinery') ||
    building.type.includes('packager') ||
    building.type.includes('blender') ||
    building.type.includes('particle_accelerator') ||
    building.type.includes('miner') ||
    building.type.includes('extractor');

  if (!isProductionBuilding && !node) return null;

  // Calculate efficiency
  const efficiency = node?.efficiency ?? 0;

  // Determine status
  // For extraction buildings (miners/extractors), check extractedResourceId instead of recipe
  const isExtractor = isExtractionBuilding(building.type);
  const hasRecipeOrResource = isExtractor
    ? !!building.extractedResourceId
    : !!building.selectedRecipeId;
  const status = getProductionStatus(efficiency, hasRecipeOrResource, true, efficiency > 0);

  // Get primary output rate
  let outputRate: string | undefined;
  if (node?.actualOutput) {
    const outputEntries = Object.entries(node.actualOutput);
    if (outputEntries.length > 0) {
      const [, rate] = outputEntries[0];
      if (rate > 0) {
        outputRate = formatOutputRate(rate);
      }
    }
  }

  // Get building dimensions
  const buildingWidth = buildingDef.width;
  const buildingHeight = buildingDef.height;

  // Calculate badge position
  // Building position is at top-left corner, so we need to find center
  // For rotated buildings, the center calculation needs to account for the rotation
  const rotated90 = building.rotation === 90 || building.rotation === 270;
  const effectiveWidth = rotated90 ? buildingHeight : buildingWidth;
  const effectiveHeight = rotated90 ? buildingWidth : buildingHeight;

  const centerX = building.x + effectiveWidth / 2;
  const centerY = building.y + effectiveHeight / 2;

  // Calculate rotation-aware offset based on building dimensions and connection points
  // Pass connection points so badge avoids sides with ports
  const badgeOffset = calculateBadgeOffset(
    buildingWidth,
    buildingHeight,
    settings.badgeSize,
    building.rotation,
    buildingDef.connectionPoints
  );

  return (
    <ProductionBadge
      x={centerX}
      y={centerY}
      efficiency={efficiency}
      outputRate={outputRate}
      status={status}
      size={settings.badgeSize}
      scale={scale}
      visible={true}
      offsetX={badgeOffset.offsetX}
      offsetY={badgeOffset.offsetY}
      buildingName={buildingDef.name}
    />
  );
});

BuildingProductionBadge.displayName = 'BuildingProductionBadge';

// ============================================
// CONVEYOR FLOW BADGE COMPONENT
// ============================================

interface ConveyorFlowBadgeProps {
  belt: ConveyorBelt;
  flowState: FlowState;
  conveyorPoles: Record<string, { x: number; y: number; z: number }>;
  settings: ProductionOverlaySettings;
  scale: number;
  isBottleneck: boolean;
}

const ConveyorFlowBadge = React.memo<ConveyorFlowBadgeProps>(({
  belt,
  flowState,
  conveyorPoles,
  settings,
  scale,
  isBottleneck,
}) => {
  // Get flow data for this belt
  const flow = flowState.conveyorFlows[belt.id];

  // Get start and end positions from connected poles/buildings
  let startX = 0, startY = 0, endX = 0, endY = 0;

  // Get all poles that might be connected to this belt
  const beltPoles = Object.values(conveyorPoles).filter(pole => {
    // Check if pole is related to belt (simplified check)
    return pole.z === belt.floor * 4;
  });

  if (beltPoles.length >= 2) {
    startX = beltPoles[0].x;
    startY = beltPoles[0].y;
    endX = beltPoles[beltPoles.length - 1].x;
    endY = beltPoles[beltPoles.length - 1].y;
  }

  // Skip if we can't determine position
  if (startX === 0 && startY === 0 && endX === 0 && endY === 0) {
    return null;
  }

  return (
    <ConveyorFlowOverlay
      startX={startX}
      startY={startY}
      endX={endX}
      endY={endY}
      flow={flow}
      scale={scale}
      showDirectionArrow={settings.showFlowDirections}
      isBottleneck={isBottleneck && settings.highlightBottlenecks}
      size="compact"
      visible={true}
    />
  );
});

ConveyorFlowBadge.displayName = 'ConveyorFlowBadge';

// ============================================
// MAIN LAYER COMPONENT
// ============================================

export const ProductionOverlayLayer = React.memo<ProductionOverlayLayerProps>(({
  currentFloor,
  scale,
  settings,
}) => {
  // Get data from store
  const buildings = useLayoutStore(state => state.buildings);
  const conveyorBelts = useLayoutStore(state => state.conveyorBelts);
  const conveyorPoles = useLayoutStore(state => state.conveyorPoles);
  const pipelines = useLayoutStore(state => state.pipelines);
  const pipeSupports = useLayoutStore(state => state.pipeSupports);

  // Get production calculation data
  const { flowState, bottlenecks, isCalculating } = useProductionCalculation(
    settings.showProductionBadges || settings.showConveyorRates || settings.showPipelineRates
  );

  // Filter buildings on current floor
  const currentFloorBuildings = useMemo(() => {
    return Object.values(buildings).filter(b => b.floor === currentFloor);
  }, [buildings, currentFloor]);

  // Filter conveyors on current floor
  const currentFloorConveyors = useMemo(() => {
    return Object.values(conveyorBelts).filter(belt => belt.floor === currentFloor);
  }, [conveyorBelts, currentFloor]);

  // Filter pipelines on current floor
  const currentFloorPipelines = useMemo(() => {
    return Object.values(pipelines).filter(pipe => {
      // Check if any support of this pipeline is on the current floor
      const pipelineSupports = Object.values(pipeSupports).filter(s =>
        pipe.segments.some(() => {
          // Simplified check - return true if support is on current floor
          return s.floor === currentFloor;
        })
      );
      return pipelineSupports.length > 0 || pipe.floor === currentFloor;
    });
  }, [pipelines, pipeSupports, currentFloor]);

  // Get bottleneck IDs for quick lookup
  const bottleneckIds = useMemo(() => {
    return new Set(bottlenecks.map(b => b.id));
  }, [bottlenecks]);

  // Don't render if no overlays are enabled
  if (!settings.showProductionBadges && !settings.showConveyorRates && !settings.showPipelineRates) {
    return null;
  }

  return (
    <Layer listening={false}>
      {/* Production badges for buildings */}
      {settings.showProductionBadges && (
        <Group>
          {currentFloorBuildings.map(building => (
            <BuildingProductionBadge
              key={`badge-${building.id}`}
              building={building}
              flowState={flowState}
              settings={settings}
              scale={scale}
            />
          ))}
        </Group>
      )}

      {/* Conveyor flow overlays */}
      {settings.showConveyorRates && (
        <Group>
          {currentFloorConveyors.map(belt => (
            <ConveyorFlowBadge
              key={`conveyor-flow-${belt.id}`}
              belt={belt}
              flowState={flowState}
              conveyorPoles={conveyorPoles}
              settings={settings}
              scale={scale}
              isBottleneck={bottleneckIds.has(belt.id)}
            />
          ))}
        </Group>
      )}

      {/* Pipeline flow overlays */}
      {settings.showPipelineRates && (
        <Group>
          {currentFloorPipelines.map(pipe => {
            const flow = flowState.pipeFlows[pipe.id];
            // Get pipe supports for positioning - filter by pipeline segments
            const pipeSegmentIds = pipe.segments || [];
            const relevantSupports = Object.values(pipeSupports).filter(support => {
              // Check if support is on current floor and belongs to this pipeline's segments
              if (support.floor !== currentFloor) return false;
              // If we have segment IDs, check if support belongs to one of them
              // Otherwise fall back to floor-based filtering
              return pipeSegmentIds.length === 0 || true; // Include all on floor for now
            });

            if (relevantSupports.length < 2) return null;

            // Sort supports by their position to get start/end
            const sortedSupports = [...relevantSupports].sort((a, b) => {
              // Sort by x first, then by y
              if (a.x !== b.x) return a.x - b.x;
              return a.y - b.y;
            });

            const startSupport = sortedSupports[0];
            const endSupport = sortedSupports[sortedSupports.length - 1];

            // Determine fluid ID from flow data or pipeline type
            const fluidId = flow?.fluidId || pipe.fluidType || undefined;

            // Check if this pipe is at high utilization (>90%)
            const isHighUtilization = (flow?.utilization ?? 0) >= 90;
            const isActualBottleneck = bottleneckIds.has(pipe.id);

            return (
              <PipelineFlowOverlay
                key={`pipe-flow-${pipe.id}`}
                startX={startSupport.x}
                startY={startSupport.y}
                endX={endSupport.x}
                endY={endSupport.y}
                fluidId={fluidId}
                rate={flow?.rate ?? 0}
                capacity={flow?.capacity ?? (pipe.mark === 2 ? 600 : 300)}
                utilization={flow?.utilization ?? 0}
                scale={scale}
                isBottleneck={(isActualBottleneck || isHighUtilization) && settings.highlightBottlenecks}
                visible={true}
                size={settings.badgeSize}
                showFluidType={true}
              />
            );
          })}
        </Group>
      )}

      {/* Calculation indicator overlay */}
      {isCalculating && (
        <Group x={20} y={20} listening={false}>
          {/* Small loading indicator in corner - could add visual here */}
        </Group>
      )}
    </Layer>
  );
});

ProductionOverlayLayer.displayName = 'ProductionOverlayLayer';

export default ProductionOverlayLayer;
