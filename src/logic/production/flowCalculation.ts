// src/logic/production/flowCalculation.ts
// Flow calculation for production simulation - push and pull analysis

import { Building, ConveyorBelt, ConveyorPole, Pipeline, ConveyorLift, PipeSupport } from '../../types';
import { RECIPES, Recipe } from '../../data/recipes';
import { calculateOutputAtClockSpeed, calculateInputAtClockSpeed } from './clockSpeedHelpers';
import { isExtractionBuilding, getExtractorOutputRate } from '../../data/recipesByBuilding';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Represents a node in the production flow graph
 */
export interface FlowNode {
  id: string;
  type: 'building' | 'splitter' | 'merger' | 'source' | 'sink' | 'storage' | 'junction' | 'station_source';
  buildingType?: string;
  recipeId?: string | null;
  clockSpeed: number;
  /** Actual output rates by item ID (items/min or m³/min for fluids) */
  actualOutput: Record<string, number>;
  /** Actual input rates by item ID (items/min or m³/min for fluids) */
  actualInput: Record<string, number>;
  /** Maximum possible output based on recipe (items/min or m³/min) */
  maxOutput: Record<string, number>;
  /** Maximum possible input based on recipe (items/min or m³/min) */
  maxInput: Record<string, number>;
  /** Connected input conveyor/pipe IDs */
  inputConnections: string[];
  /** Connected output conveyor/pipe IDs */
  outputConnections: string[];
  /** Current efficiency (0-100) */
  efficiency: number;
  /** Whether this node handles fluids */
  isFluid?: boolean;
  /** For station sources: configured resource info */
  stationConfig?: {
    resourceId: string;
    isFluid: boolean;
    rate: number;
  };
  /** For storage: accumulation tracking */
  storageInfo?: {
    /** Rate at which items/fluids are accumulating (positive) or depleting (negative) */
    accumulationRate: number;
    /** Estimated time to fill/empty in hours (null if not accumulating) */
    fillTime: number | null;
  };
}

/**
 * Represents flow through a conveyor belt or pipe
 */
export interface ConveyorFlow {
  itemId: string;
  rate: number; // items per minute
  capacity: number; // max throughput of belt tier
  utilization: number; // 0-100
}

export interface PipeFlow {
  fluidId: string;
  rate: number; // m3 per minute
  capacity: number; // max throughput of pipe tier
  utilization: number; // 0-100
}

/**
 * Complete flow state for the factory
 */
export interface FlowState {
  nodes: Record<string, FlowNode>;
  conveyorFlows: Record<string, ConveyorFlow>;
  pipeFlows: Record<string, PipeFlow>;
  /** Total items produced per minute by item ID */
  totalProduction: Record<string, number>;
  /** Total items consumed per minute by item ID */
  totalConsumption: Record<string, number>;
  /** Total fluid production per minute by fluid ID (m³/min) */
  totalFluidProduction: Record<string, number>;
  /** Total fluid consumption per minute by fluid ID (m³/min) */
  totalFluidConsumption: Record<string, number>;
  /** Station sources contributing to the flow */
  stationSources: Record<string, {
    buildingId: string;
    resourceId: string;
    isFluid: boolean;
    rate: number;
  }>;
  /** Storage accumulation summary */
  storageAccumulation: Record<string, {
    buildingId: string;
    resourceId: string;
    isFluid: boolean;
    rate: number;
    fillTime: number | null;
  }>;
  /** Timestamp of calculation */
  calculatedAt: number;
}

/**
 * Demand state from pull analysis
 */
export interface DemandState {
  nodes: Record<string, {
    /** Required input rates to run at full capacity */
    requiredInputs: Record<string, number>;
    /** Required output rates to satisfy downstream demand */
    requiredOutputs: Record<string, number>;
    /** Whether demand is satisfied */
    demandSatisfied: boolean;
  }>;
  /** Total demand by item ID */
  totalDemand: Record<string, number>;
  calculatedAt: number;
}

// ============================================
// CONVEYOR/PIPE CAPACITY CONSTANTS
// ============================================

/** Belt tier max throughput (items/min) */
export const BELT_CAPACITIES: Record<number, number> = {
  1: 60,    // Mk.1
  2: 120,   // Mk.2
  3: 270,   // Mk.3
  4: 480,   // Mk.4
  5: 780,   // Mk.5
  6: 1200,  // Mk.6
};

/** Pipe tier max throughput (m3/min) */
export const PIPE_CAPACITIES: Record<number, number> = {
  1: 300,   // Mk.1
  2: 600,   // Mk.2
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the node type for a building
 */
function getNodeType(buildingType: string, hasStationConfig?: boolean): FlowNode['type'] {
  if (buildingType === 'splitter' || buildingType === 'smart_splitter' || buildingType === 'programmable_splitter') {
    return 'splitter';
  }
  if (buildingType === 'merger') {
    return 'merger';
  }
  if (buildingType.startsWith('miner_') || buildingType === 'water_extractor' ||
      buildingType === 'oil_extractor' || buildingType === 'resource_well_extractor') {
    return 'source';
  }
  if (buildingType === 'awesome_sink') {
    return 'sink';
  }
  if (buildingType === 'storage' || buildingType === 'industrial_storage' ||
      buildingType === 'fluid_buffer' || buildingType === 'industrial_fluid_buffer') {
    return 'storage';
  }
  if (buildingType === 'pipeline_junction') {
    return 'junction';
  }
  // Train stations and freight platforms with resource config act as sources
  if (hasStationConfig && (
      buildingType === 'train_station' ||
      buildingType === 'freight_platform' ||
      buildingType === 'fluid_freight_platform' ||
      buildingType === 'empty_platform' ||
      buildingType.includes('train_station') ||
      buildingType.includes('freight')
  )) {
    return 'station_source';
  }
  return 'building';
}

/**
 * Check if a building type is a fluid-related building
 */
function isFluidBuilding(buildingType: string): boolean {
  return buildingType === 'fluid_freight_platform' ||
         buildingType === 'fluid_buffer' ||
         buildingType === 'industrial_fluid_buffer' ||
         buildingType === 'pipeline_junction' ||
         buildingType === 'water_extractor' ||
         buildingType === 'oil_extractor' ||
         buildingType === 'packager' ||
         buildingType === 'refinery' ||
         buildingType === 'blender';
}

/**
 * Get recipe for a building if it has one selected
 */
function getBuildingRecipe(building: Building): Recipe | null {
  if (!building.selectedRecipeId) {
    return null;
  }
  return RECIPES[building.selectedRecipeId] ?? null;
}

/**
 * Calculate theoretical output rates for a building based on its recipe and clock speed
 */
function calculateBuildingOutputRates(building: Building): Record<string, number> {
  const recipe = getBuildingRecipe(building);
  if (!recipe) {
    return {};
  }

  const clockSpeed = building.clockSpeed ?? 100;
  const rates: Record<string, number> = {};

  for (const output of recipe.outputs) {
    rates[output.itemId] = calculateOutputAtClockSpeed(output.ratePerMinute, clockSpeed);
  }

  return rates;
}

/**
 * Calculate theoretical input rates for a building based on its recipe and clock speed
 */
function calculateBuildingInputRates(building: Building): Record<string, number> {
  const recipe = getBuildingRecipe(building);
  if (!recipe) {
    return {};
  }

  const clockSpeed = building.clockSpeed ?? 100;
  const rates: Record<string, number> = {};

  for (const input of recipe.inputs) {
    rates[input.itemId] = calculateInputAtClockSpeed(input.ratePerMinute, clockSpeed);
  }

  return rates;
}

/**
 * Build a map of building connections via conveyors
 */
function buildConnectionGraph(
  buildings: Record<string, Building>,
  conveyorBelts: Record<string, ConveyorBelt>,
  conveyorLifts: Record<string, ConveyorLift>,
  pipelines: Record<string, Pipeline>
): {
  buildingInputs: Record<string, string[]>; // building ID -> conveyor/pipe IDs
  buildingOutputs: Record<string, string[]>;
  conveyorSourceBuilding: Record<string, string | null>;
  conveyorTargetBuilding: Record<string, string | null>;
  pipeSourceBuilding: Record<string, string | null>;
  pipeTargetBuilding: Record<string, string | null>;
} {
  const buildingInputs: Record<string, string[]> = {};
  const buildingOutputs: Record<string, string[]> = {};
  const conveyorSourceBuilding: Record<string, string | null> = {};
  const conveyorTargetBuilding: Record<string, string | null> = {};
  const pipeSourceBuilding: Record<string, string | null> = {};
  const pipeTargetBuilding: Record<string, string | null> = {};

  // Initialize building connection arrays
  for (const buildingId of Object.keys(buildings)) {
    buildingInputs[buildingId] = [];
    buildingOutputs[buildingId] = [];
  }

  // Map conveyor belt connections
  for (const belt of Object.values(conveyorBelts)) {
    const sourceId = belt.direction === 'forward' ? belt.fromBuildingId : belt.toBuildingId;
    const targetId = belt.direction === 'forward' ? belt.toBuildingId : belt.fromBuildingId;

    conveyorSourceBuilding[belt.id] = sourceId ?? null;
    conveyorTargetBuilding[belt.id] = targetId ?? null;

    if (sourceId && buildingOutputs[sourceId]) {
      buildingOutputs[sourceId].push(belt.id);
    }
    if (targetId && buildingInputs[targetId]) {
      buildingInputs[targetId].push(belt.id);
    }
  }

  // Map conveyor lift connections (treat as conveyors)
  // Lifts have connectionPoints - need to check what they connect to
  // For now, lifts are handled as pass-through, not tracked separately
  // TODO: Track lift connections when belt->lift->belt chains are implemented
  void conveyorLifts; // Mark as intentionally unused for now

  // Map pipeline connections
  for (const pipe of Object.values(pipelines)) {
    const sourceId = pipe.fromBuildingId;
    const targetId = pipe.toBuildingId;

    pipeSourceBuilding[pipe.id] = sourceId ?? null;
    pipeTargetBuilding[pipe.id] = targetId ?? null;

    if (sourceId && buildingOutputs[sourceId]) {
      buildingOutputs[sourceId].push(pipe.id);
    }
    if (targetId && buildingInputs[targetId]) {
      buildingInputs[targetId].push(pipe.id);
    }
  }

  return {
    buildingInputs,
    buildingOutputs,
    conveyorSourceBuilding,
    conveyorTargetBuilding,
    pipeSourceBuilding,
    pipeTargetBuilding,
  };
}

// ============================================
// PUSH FLOW ANALYSIS
// ============================================

/**
 * Calculate push-based flow through the factory
 *
 * This analysis starts from source buildings (miners, extractors) and
 * propagates flow downstream through conveyors to determine actual throughput.
 *
 * Key behaviors:
 * - Belt tier limits cap throughput
 * - Splitters divide flow evenly among outputs
 * - Mergers sum inputs (capped by output belt)
 * - Production buildings consume inputs and produce outputs
 */
export function calculatePushFlow(
  buildings: Record<string, Building>,
  conveyorBelts: Record<string, ConveyorBelt>,
  _conveyorPoles: Record<string, ConveyorPole>,
  conveyorLifts: Record<string, ConveyorLift>,
  pipelines: Record<string, Pipeline>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pipeSupports: Record<string, PipeSupport>
): FlowState {
  // Note: conveyorPoles and pipeSupports are reserved for future use
  // when we implement more detailed path analysis

  const flowState: FlowState = {
    nodes: {},
    conveyorFlows: {},
    pipeFlows: {},
    totalProduction: {},
    totalConsumption: {},
    totalFluidProduction: {},
    totalFluidConsumption: {},
    stationSources: {},
    storageAccumulation: {},
    calculatedAt: Date.now(),
  };

  // Build connection graph
  const connections = buildConnectionGraph(buildings, conveyorBelts, conveyorLifts, pipelines);

  // Initialize flow nodes for all buildings
  for (const [buildingId, building] of Object.entries(buildings)) {
    const hasStationConfig = !!building.stationResourceConfig?.enabled;
    const nodeType = getNodeType(building.type, hasStationConfig);
    const maxOutput = calculateBuildingOutputRates(building);
    const maxInput = calculateBuildingInputRates(building);
    const isFluid = isFluidBuilding(building.type) || building.stationResourceConfig?.isFluid;

    // Build station config if applicable
    let stationConfig: FlowNode['stationConfig'];
    if (hasStationConfig && building.stationResourceConfig) {
      stationConfig = {
        resourceId: building.stationResourceConfig.resourceId,
        isFluid: building.stationResourceConfig.isFluid,
        rate: building.stationResourceConfig.rate,
      };
      // Add to station sources tracking
      flowState.stationSources[buildingId] = {
        buildingId,
        resourceId: building.stationResourceConfig.resourceId,
        isFluid: building.stationResourceConfig.isFluid,
        rate: building.stationResourceConfig.rate,
      };
    }

    flowState.nodes[buildingId] = {
      id: buildingId,
      type: nodeType,
      buildingType: building.type,
      recipeId: building.selectedRecipeId,
      clockSpeed: building.clockSpeed ?? 100,
      actualOutput: {},
      actualInput: {},
      maxOutput,
      maxInput,
      inputConnections: connections.buildingInputs[buildingId] || [],
      outputConnections: connections.buildingOutputs[buildingId] || [],
      efficiency: 0,
      isFluid,
      stationConfig,
    };
  }

  // Initialize conveyor flows
  for (const belt of Object.values(conveyorBelts)) {
    flowState.conveyorFlows[belt.id] = {
      itemId: '', // Will be determined by source
      rate: 0,
      capacity: BELT_CAPACITIES[belt.mark] || 60,
      utilization: 0,
    };
  }

  // Initialize pipe flows
  for (const pipe of Object.values(pipelines)) {
    flowState.pipeFlows[pipe.id] = {
      fluidId: pipe.fluidType || '',
      rate: 0,
      capacity: PIPE_CAPACITIES[pipe.mark] || 300,
      utilization: 0,
    };
  }

  // Find TRUE source buildings (miners, extractors, and station sources)
  // Production buildings will be discovered via BFS as we follow conveyor connections
  const sourceBuildings: string[] = [];
  for (const [buildingId, node] of Object.entries(flowState.nodes)) {
    // Add actual source types (miners, extractors) and station sources
    if (node.type === 'source' || node.type === 'station_source') {
      sourceBuildings.push(buildingId);
    }
  }

  // Also find buildings with no input connections but have outputs (disconnected sources)
  // These are production buildings that aren't receiving from anything upstream
  for (const [buildingId, node] of Object.entries(flowState.nodes)) {
    if (node.type === 'building' &&
        node.inputConnections.length === 0 &&
        Object.keys(node.maxOutput).length > 0 &&
        !sourceBuildings.includes(buildingId)) {
      sourceBuildings.push(buildingId);
    }
  }

  // Process queue for BFS traversal
  const processQueue: string[] = [...sourceBuildings];
  const processed = new Set<string>();
  const processingOrder: string[] = [];

  // Track available input at each node
  const availableInput: Record<string, Record<string, number>> = {};
  for (const buildingId of Object.keys(buildings)) {
    availableInput[buildingId] = {};
  }

  // BFS to determine processing order
  while (processQueue.length > 0) {
    const buildingId = processQueue.shift()!;
    if (processed.has(buildingId)) continue;

    processed.add(buildingId);
    processingOrder.push(buildingId);

    const node = flowState.nodes[buildingId];
    if (!node) continue;

    // Add downstream buildings to queue
    for (const conveyorId of node.outputConnections) {
      const targetId = connections.conveyorTargetBuilding[conveyorId] ||
                       connections.pipeTargetBuilding[conveyorId];
      if (targetId && !processed.has(targetId)) {
        processQueue.push(targetId);
      }
    }
  }

  // Process buildings in order
  for (const buildingId of processingOrder) {
    const node = flowState.nodes[buildingId];
    const building = buildings[buildingId];
    if (!node || !building) continue;

    // Calculate actual output based on node type
    if (node.type === 'source') {
      // Sources (miners/extractors) produce at their configured rate
      // Check if building has extractedResourceId set
      if (isExtractionBuilding(building.type) && building.extractedResourceId) {
        const clockSpeed = building.clockSpeed ?? 100;
        const outputRate = getExtractorOutputRate(building.type, clockSpeed);
        node.actualOutput = { [building.extractedResourceId]: outputRate };
        node.maxOutput = { [building.extractedResourceId]: outputRate };
        node.efficiency = 100;
      } else if (Object.keys(node.maxOutput).length > 0) {
        // Fallback to maxOutput if already set (for compatibility)
        node.actualOutput = { ...node.maxOutput };
        node.efficiency = 100;
      } else {
        // No resource selected - source produces nothing
        node.actualOutput = {};
        node.efficiency = 0;
      }
    } else if (node.type === 'station_source') {
      // Train stations configured as sources produce at their configured rate
      if (node.stationConfig) {
        const { resourceId, rate, isFluid } = node.stationConfig;
        node.actualOutput = { [resourceId]: rate };
        node.maxOutput = { [resourceId]: rate };
        node.efficiency = 100;
        node.isFluid = isFluid;

        // Track in appropriate production totals
        if (isFluid) {
          flowState.totalFluidProduction[resourceId] =
            (flowState.totalFluidProduction[resourceId] || 0) + rate;
        } else {
          flowState.totalProduction[resourceId] =
            (flowState.totalProduction[resourceId] || 0) + rate;
        }
      } else {
        node.actualOutput = {};
        node.efficiency = 0;
      }
    } else if (node.type === 'splitter') {
      // Splitters divide input evenly among outputs
      const inputItems = availableInput[buildingId];
      // numOutputs is used below when propagating to downstream belts

      for (const [itemId, rate] of Object.entries(inputItems)) {
        node.actualInput[itemId] = rate;
        node.actualOutput[itemId] = rate; // Total output equals input
      }
    } else if (node.type === 'merger') {
      // Mergers sum all inputs
      const inputItems = availableInput[buildingId];
      for (const [itemId, rate] of Object.entries(inputItems)) {
        node.actualInput[itemId] = rate;
        node.actualOutput[itemId] = rate;
      }
    } else if (node.type === 'storage') {
      // Storage buildings can accumulate items or pass them through
      const inputItems = availableInput[buildingId];
      node.actualInput = { ...inputItems };

      // Check if storage has outputs connected
      const hasOutputs = node.outputConnections.length > 0;

      if (hasOutputs) {
        // Pass through mode - storage acts as buffer
        node.actualOutput = { ...inputItems };
        node.efficiency = 100;
      } else {
        // Terminal storage - accumulates items (acts as sink)
        node.actualOutput = {};
        node.efficiency = 100;

        // Track accumulation for each resource
        for (const [resourceId, rate] of Object.entries(inputItems)) {
          if (rate > 0) {
            // Determine if fluid based on building type
            const isFluid = node.isFluid ||
              building.type.includes('fluid') ||
              building.type.includes('buffer');

            // Estimate fill time (assuming standard capacities)
            // Storage: 2400 items, Industrial: 4800 items
            // Fluid Buffer: 400 m³, Industrial: 2400 m³
            let capacity: number;
            if (isFluid) {
              capacity = building.type.includes('industrial') ? 2400 : 400;
            } else {
              capacity = building.type.includes('industrial') ? 4800 : 2400;
            }
            const fillTimeMinutes = capacity / rate;
            const fillTimeHours = fillTimeMinutes / 60;

            node.storageInfo = {
              accumulationRate: rate,
              fillTime: fillTimeHours,
            };

            flowState.storageAccumulation[buildingId] = {
              buildingId,
              resourceId,
              isFluid,
              rate,
              fillTime: fillTimeHours,
            };

            // Track in consumption totals (storage consumes from the flow)
            if (isFluid) {
              flowState.totalFluidConsumption[resourceId] =
                (flowState.totalFluidConsumption[resourceId] || 0) + rate;
            } else {
              flowState.totalConsumption[resourceId] =
                (flowState.totalConsumption[resourceId] || 0) + rate;
            }
          }
        }
      }
    } else if (node.type === 'building') {
      // Production buildings consume inputs and produce outputs
      const recipe = getBuildingRecipe(building);

      if (recipe) {
        // Check if we have enough inputs
        let inputSatisfaction = 1.0;
        for (const [itemId, requiredRate] of Object.entries(node.maxInput)) {
          const availableRate = availableInput[buildingId][itemId] || 0;
          if (requiredRate > 0) {
            inputSatisfaction = Math.min(inputSatisfaction, availableRate / requiredRate);
          }
        }

        // Calculate actual rates based on input satisfaction
        for (const [itemId, maxRate] of Object.entries(node.maxInput)) {
          node.actualInput[itemId] = maxRate * inputSatisfaction;
        }
        for (const [itemId, maxRate] of Object.entries(node.maxOutput)) {
          node.actualOutput[itemId] = maxRate * inputSatisfaction;
        }

        node.efficiency = inputSatisfaction * 100;
      } else {
        // No recipe - pass through
        node.actualInput = { ...availableInput[buildingId] };
        node.actualOutput = { ...availableInput[buildingId] };
        node.efficiency = 100;
      }
    } else if (node.type === 'sink') {
      // Sinks consume all input
      node.actualInput = { ...availableInput[buildingId] };
      node.efficiency = 100;

      // Track in consumption totals
      for (const [itemId, rate] of Object.entries(node.actualInput)) {
        // Check if this is a fluid building
        if (node.isFluid) {
          flowState.totalFluidConsumption[itemId] =
            (flowState.totalFluidConsumption[itemId] || 0) + rate;
        } else {
          flowState.totalConsumption[itemId] =
            (flowState.totalConsumption[itemId] || 0) + rate;
        }
      }
    } else if (node.type === 'junction') {
      // Junctions pass through fluids
      node.actualInput = { ...availableInput[buildingId] };
      node.actualOutput = { ...availableInput[buildingId] };
      node.efficiency = 100;
    }

    // Propagate output to downstream conveyors and buildings
    for (const conveyorId of node.outputConnections) {
      const belt = conveyorBelts[conveyorId];
      const pipe = pipelines[conveyorId];

      if (belt) {
        const flow = flowState.conveyorFlows[conveyorId];
        const targetId = connections.conveyorTargetBuilding[conveyorId];

        // Determine what item flows through this belt
        // For splitters, divide evenly
        const numOutputs = node.type === 'splitter' ? node.outputConnections.length : 1;

        for (const [itemId, rate] of Object.entries(node.actualOutput)) {
          const ratePerOutput = rate / numOutputs;
          const cappedRate = Math.min(ratePerOutput, flow.capacity);

          flow.itemId = itemId;
          flow.rate = cappedRate;
          flow.utilization = (cappedRate / flow.capacity) * 100;

          // Add to downstream building's available input
          if (targetId && availableInput[targetId]) {
            availableInput[targetId][itemId] = (availableInput[targetId][itemId] || 0) + cappedRate;
          }
        }
      } else if (pipe) {
        const flow = flowState.pipeFlows[conveyorId];
        const targetId = connections.pipeTargetBuilding[conveyorId];

        for (const [fluidId, rate] of Object.entries(node.actualOutput)) {
          const cappedRate = Math.min(rate, flow.capacity);

          flow.fluidId = fluidId;
          flow.rate = cappedRate;
          flow.utilization = (cappedRate / flow.capacity) * 100;

          if (targetId && availableInput[targetId]) {
            availableInput[targetId][fluidId] = (availableInput[targetId][fluidId] || 0) + cappedRate;
          }
        }
      }
    }

    // Update totals
    for (const [itemId, rate] of Object.entries(node.actualOutput)) {
      if (node.type === 'source' || node.type === 'building') {
        flowState.totalProduction[itemId] = (flowState.totalProduction[itemId] || 0) + rate;
      }
    }
    for (const [itemId, rate] of Object.entries(node.actualInput)) {
      if (node.type === 'building' || node.type === 'sink') {
        flowState.totalConsumption[itemId] = (flowState.totalConsumption[itemId] || 0) + rate;
      }
    }
  }

  return flowState;
}

// ============================================
// PULL DEMAND ANALYSIS
// ============================================

/**
 * Calculate pull-based demand through the factory
 *
 * This analysis starts from buildings with recipes and calculates
 * what inputs they require to run at full capacity, then propagates
 * that demand upstream.
 */
export function calculatePullDemand(
  buildings: Record<string, Building>,
  conveyorBelts: Record<string, ConveyorBelt>,
  conveyorLifts: Record<string, ConveyorLift>,
  pipelines: Record<string, Pipeline>
): DemandState {
  const demandState: DemandState = {
    nodes: {},
    totalDemand: {},
    calculatedAt: Date.now(),
  };

  // Build connection graph
  const connections = buildConnectionGraph(buildings, conveyorBelts, conveyorLifts, pipelines);

  // Initialize demand nodes for all buildings
  for (const [buildingId, building] of Object.entries(buildings)) {
    const requiredInputs = calculateBuildingInputRates(building);
    const requiredOutputs = calculateBuildingOutputRates(building);

    demandState.nodes[buildingId] = {
      requiredInputs,
      requiredOutputs,
      demandSatisfied: false, // Will be calculated
    };

    // Add to total demand
    for (const [itemId, rate] of Object.entries(requiredInputs)) {
      demandState.totalDemand[itemId] = (demandState.totalDemand[itemId] || 0) + rate;
    }
  }

  // Find terminal nodes (no outputs, or sinks) and work backwards
  const terminalBuildings: string[] = [];
  for (const [buildingId, building] of Object.entries(buildings)) {
    const outputs = connections.buildingOutputs[buildingId] || [];
    const nodeType = getNodeType(building.type);
    if (outputs.length === 0 || nodeType === 'sink') {
      terminalBuildings.push(buildingId);
    }
  }

  // BFS backwards from terminal nodes
  const processQueue: string[] = [...terminalBuildings];
  const processed = new Set<string>();

  // Track accumulated demand at each node
  const accumulatedDemand: Record<string, Record<string, number>> = {};
  for (const buildingId of Object.keys(buildings)) {
    accumulatedDemand[buildingId] = { ...demandState.nodes[buildingId].requiredInputs };
  }

  while (processQueue.length > 0) {
    const buildingId = processQueue.shift()!;
    if (processed.has(buildingId)) continue;

    processed.add(buildingId);

    const demand = accumulatedDemand[buildingId];

    // Propagate demand upstream
    const inputs = connections.buildingInputs[buildingId] || [];

    for (const conveyorId of inputs) {
      const sourceId = connections.conveyorSourceBuilding[conveyorId] ||
                       connections.pipeSourceBuilding[conveyorId];

      if (sourceId && !processed.has(sourceId)) {
        // Add this building's demand to the source
        for (const [itemId, rate] of Object.entries(demand)) {
          accumulatedDemand[sourceId][itemId] = (accumulatedDemand[sourceId][itemId] || 0) + rate;
        }
        processQueue.push(sourceId);
      }
    }
  }

  // Update required outputs based on accumulated demand
  for (const [buildingId, demand] of Object.entries(accumulatedDemand)) {
    demandState.nodes[buildingId].requiredOutputs = { ...demand };
  }

  return demandState;
}

/**
 * Create an empty flow state (for when no buildings exist)
 */
export function createEmptyFlowState(): FlowState {
  return {
    nodes: {},
    conveyorFlows: {},
    pipeFlows: {},
    totalProduction: {},
    totalConsumption: {},
    totalFluidProduction: {},
    totalFluidConsumption: {},
    stationSources: {},
    storageAccumulation: {},
    calculatedAt: Date.now(),
  };
}

/**
 * Create an empty demand state (for when no buildings exist)
 */
export function createEmptyDemandState(): DemandState {
  return {
    nodes: {},
    totalDemand: {},
    calculatedAt: Date.now(),
  };
}
