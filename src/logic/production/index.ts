// src/logic/production/index.ts
// Barrel export for production logic modules

// Clock Speed Helpers
export {
  POWER_EXPONENT,
  POWER_SHARD_THRESHOLDS,
  calculatePowerAtClockSpeed,
  calculateOutputAtClockSpeed,
  calculateInputAtClockSpeed,
  getPowerShardRequirement,
  getMaxClockSpeedForShards,
  calculateEfficiencyGain,
  calculatePowerPerOutput,
  findClockSpeedForOutput,
  calculateTotalPower,
  calculateBuildingsNeeded,
  compareClockSpeedConfigurations
} from './clockSpeedHelpers';

// Flow Calculation
export {
  // Types
  type FlowNode,
  type ConveyorFlow,
  type PipeFlow,
  type FlowState,
  type DemandState,
  // Constants
  BELT_CAPACITIES,
  PIPE_CAPACITIES,
  // Functions
  calculatePushFlow,
  calculatePullDemand,
  createEmptyFlowState,
  createEmptyDemandState,
} from './flowCalculation';

// Bottleneck Detection
export {
  // Types
  type BottleneckType,
  type BottleneckSeverity,
  type BottleneckResult,
  type BottleneckSummary,
  // Functions
  detectBottlenecks,
  createBottleneckSummary,
  createEmptyBottleneckSummary,
  getBottlenecksForBuilding,
  getBottlenecksBySeverity,
  getMostImpactfulBottlenecks,
} from './bottleneckDetection';
