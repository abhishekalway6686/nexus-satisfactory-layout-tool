// src/logic/production/bottleneckDetection.ts
// Bottleneck detection for production simulation

import { Building } from '../../types';
import { FlowState, DemandState, BELT_CAPACITIES } from './flowCalculation';
import { RECIPES } from '../../data/recipes';
import { getRecipeBuildingType } from '../../data/recipesByBuilding';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Type of bottleneck detected
 */
export type BottleneckType =
  | 'starved'      // Building not receiving enough inputs
  | 'blocked'      // Building output cannot flow (backed up)
  | 'belt-limit'   // Belt tier is limiting throughput
  | 'pipe-limit'   // Pipe tier is limiting throughput
  | 'no-recipe'    // Production building has no recipe selected
  | 'no-power'     // Building has no power (future feature)
  | 'inefficient'  // Building running below optimal efficiency
  | 'overclocked'  // Building overclocked beyond sustainable rate
  | 'underclocked' // Building underclocked when more capacity needed
  | 'disconnected'; // Building has no connections

/**
 * Severity of the bottleneck
 */
export type BottleneckSeverity = 'info' | 'warning' | 'critical';

/**
 * Result of bottleneck detection for a single building or connection
 */
export interface BottleneckResult {
  /** ID of the affected building or conveyor */
  id: string;
  /** Type of entity (building, conveyor, pipe) */
  entityType: 'building' | 'conveyor' | 'pipe';
  /** Type of bottleneck */
  type: BottleneckType;
  /** Severity level */
  severity: BottleneckSeverity;
  /** Human-readable description */
  message: string;
  /** Actual rate being achieved (items/min or m3/min) */
  actualRate: number;
  /** Required/desired rate (items/min or m3/min) */
  requiredRate: number;
  /** Percentage of required rate being achieved */
  achievedPercentage: number;
  /** Item or fluid ID involved (if applicable) */
  itemId?: string;
  /** Suggestion for fixing the bottleneck */
  suggestion?: string;
  /** Additional data for UI rendering */
  metadata?: Record<string, unknown>;
}

/**
 * Summary of all bottlenecks in the factory
 */
export interface BottleneckSummary {
  /** All detected bottlenecks */
  bottlenecks: BottleneckResult[];
  /** Count by severity */
  countBySeverity: Record<BottleneckSeverity, number>;
  /** Count by type */
  countByType: Record<BottleneckType, number>;
  /** Overall factory health score (0-100) */
  healthScore: number;
  /** Most critical bottleneck (if any) */
  mostCritical: BottleneckResult | null;
  /** Timestamp of analysis */
  analyzedAt: number;
}

// ============================================
// BOTTLENECK DETECTION LOGIC
// ============================================

/**
 * Detect bottlenecks by comparing push flow (actual) vs pull demand (required)
 *
 * This is the core detection algorithm that identifies:
 * - Starved buildings (actual < required)
 * - Blocked buildings (output can't flow)
 * - Belt/pipe limitations
 * - Missing recipes
 * - Efficiency issues
 */
export function detectBottlenecks(
  pushFlow: FlowState,
  pullDemand: DemandState,
  buildings: Record<string, Building>
): BottleneckResult[] {
  const bottlenecks: BottleneckResult[] = [];

  // Check each building for issues
  for (const [buildingId, node] of Object.entries(pushFlow.nodes)) {
    const building = buildings[buildingId];
    if (!building) continue;

    const demand = pullDemand.nodes[buildingId];
    const buildingType = building.type;

    // Check for missing recipe on production buildings
    if (isProductionBuilding(buildingType) && !building.selectedRecipeId) {
      bottlenecks.push({
        id: buildingId,
        entityType: 'building',
        type: 'no-recipe',
        severity: 'warning',
        message: `${getBuildingDisplayName(buildingType)} has no recipe selected`,
        actualRate: 0,
        requiredRate: 0,
        achievedPercentage: 0,
        suggestion: 'Select a recipe to start production',
        metadata: { buildingType },
      });
      continue; // No point checking other issues if no recipe
    }

    // Check for disconnected buildings (no inputs or outputs when expected)
    if (isProductionBuilding(buildingType) && building.selectedRecipeId) {
      const hasInputConnections = node.inputConnections.length > 0;
      const hasOutputConnections = node.outputConnections.length > 0;
      const recipe = RECIPES[building.selectedRecipeId];

      if (recipe && recipe.inputs.length > 0 && !hasInputConnections) {
        bottlenecks.push({
          id: buildingId,
          entityType: 'building',
          type: 'disconnected',
          severity: 'critical',
          message: `${getBuildingDisplayName(buildingType)} has no input connections`,
          actualRate: 0,
          requiredRate: Object.values(node.maxInput)[0] || 0,
          achievedPercentage: 0,
          suggestion: 'Connect conveyor belts to input ports',
          metadata: { buildingType, missingConnection: 'input' },
        });
      }

      if (recipe && recipe.outputs.length > 0 && !hasOutputConnections) {
        bottlenecks.push({
          id: buildingId,
          entityType: 'building',
          type: 'disconnected',
          severity: 'warning',
          message: `${getBuildingDisplayName(buildingType)} has no output connections`,
          actualRate: Object.values(node.actualOutput)[0] || 0,
          requiredRate: Object.values(node.maxOutput)[0] || 0,
          achievedPercentage: 100, // It's producing, just nowhere for it to go
          suggestion: 'Connect conveyor belts to output ports or add storage',
          metadata: { buildingType, missingConnection: 'output' },
        });
      }
    }

    // Check for starved buildings (not getting enough inputs)
    if (demand) {
      for (const [itemId, requiredRate] of Object.entries(demand.requiredInputs)) {
        if (requiredRate <= 0) continue;

        const actualRate = node.actualInput[itemId] || 0;
        const achievedPercentage = (actualRate / requiredRate) * 100;

        if (achievedPercentage < 99) { // Allow 1% tolerance
          const severity = getSeverityForShortfall(achievedPercentage);

          bottlenecks.push({
            id: buildingId,
            entityType: 'building',
            type: 'starved',
            severity,
            message: `${getBuildingDisplayName(buildingType)} is starved for ${getItemDisplayName(itemId)}`,
            actualRate,
            requiredRate,
            achievedPercentage,
            itemId,
            suggestion: getStarvedSuggestion(achievedPercentage, itemId),
            metadata: { buildingType, itemId },
          });
        }
      }
    }

    // Check for efficiency issues
    if (node.efficiency < 100 && node.efficiency > 0 && node.type === 'building') {
      const severity: BottleneckSeverity = node.efficiency < 50 ? 'warning' : 'info';

      bottlenecks.push({
        id: buildingId,
        entityType: 'building',
        type: 'inefficient',
        severity,
        message: `${getBuildingDisplayName(buildingType)} is running at ${node.efficiency.toFixed(0)}% efficiency`,
        actualRate: node.efficiency,
        requiredRate: 100,
        achievedPercentage: node.efficiency,
        suggestion: 'Increase input supply or reduce clock speed to match available inputs',
        metadata: { buildingType, efficiency: node.efficiency },
      });
    }
  }

  // Check conveyor belt bottlenecks
  for (const [conveyorId, flow] of Object.entries(pushFlow.conveyorFlows)) {
    if (flow.utilization > 95) {
      const severity: BottleneckSeverity = flow.utilization > 99 ? 'critical' : 'warning';

      bottlenecks.push({
        id: conveyorId,
        entityType: 'conveyor',
        type: 'belt-limit',
        severity,
        message: `Conveyor belt at ${flow.utilization.toFixed(0)}% capacity (${flow.rate.toFixed(0)}/${flow.capacity} items/min)`,
        actualRate: flow.rate,
        requiredRate: flow.capacity, // We don't know exact demand here
        achievedPercentage: 100 - (flow.utilization - 100),
        itemId: flow.itemId,
        suggestion: getBeltUpgradeSuggestion(flow.capacity),
        metadata: { itemId: flow.itemId, capacity: flow.capacity },
      });
    }
  }

  // Check pipe bottlenecks
  for (const [pipeId, flow] of Object.entries(pushFlow.pipeFlows)) {
    if (flow.utilization > 95) {
      const severity: BottleneckSeverity = flow.utilization > 99 ? 'critical' : 'warning';

      bottlenecks.push({
        id: pipeId,
        entityType: 'pipe',
        type: 'pipe-limit',
        severity,
        message: `Pipeline at ${flow.utilization.toFixed(0)}% capacity (${flow.rate.toFixed(0)}/${flow.capacity} m3/min)`,
        actualRate: flow.rate,
        requiredRate: flow.capacity,
        achievedPercentage: 100 - (flow.utilization - 100),
        itemId: flow.fluidId,
        suggestion: getPipeUpgradeSuggestion(flow.capacity),
        metadata: { fluidId: flow.fluidId, capacity: flow.capacity },
      });
    }
  }

  return bottlenecks;
}

/**
 * Create a summary of all bottlenecks
 */
export function createBottleneckSummary(bottlenecks: BottleneckResult[]): BottleneckSummary {
  const countBySeverity: Record<BottleneckSeverity, number> = {
    info: 0,
    warning: 0,
    critical: 0,
  };

  const countByType: Record<BottleneckType, number> = {
    starved: 0,
    blocked: 0,
    'belt-limit': 0,
    'pipe-limit': 0,
    'no-recipe': 0,
    'no-power': 0,
    inefficient: 0,
    overclocked: 0,
    underclocked: 0,
    disconnected: 0,
  };

  let mostCritical: BottleneckResult | null = null;

  for (const bottleneck of bottlenecks) {
    countBySeverity[bottleneck.severity]++;
    countByType[bottleneck.type]++;

    if (bottleneck.severity === 'critical' && !mostCritical) {
      mostCritical = bottleneck;
    } else if (bottleneck.severity === 'warning' && !mostCritical) {
      mostCritical = bottleneck;
    }
  }

  // Calculate health score (100 = perfect, 0 = critical issues everywhere)
  const healthScore = calculateHealthScore(bottlenecks, countBySeverity);

  return {
    bottlenecks,
    countBySeverity,
    countByType,
    healthScore,
    mostCritical,
    analyzedAt: Date.now(),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isProductionBuilding(buildingType: string): boolean {
  return getRecipeBuildingType(buildingType) !== null;
}

function getBuildingDisplayName(buildingType: string): string {
  // Convert building_type to Building Type
  return buildingType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getItemDisplayName(itemId: string): string {
  // Convert item_id to Item Id
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSeverityForShortfall(achievedPercentage: number): BottleneckSeverity {
  if (achievedPercentage < 25) return 'critical';
  if (achievedPercentage < 75) return 'warning';
  return 'info';
}

function getStarvedSuggestion(achievedPercentage: number, itemId: string): string {
  if (achievedPercentage < 25) {
    return `Critical shortage of ${getItemDisplayName(itemId)}. Add more production or extractors.`;
  }
  if (achievedPercentage < 75) {
    return `Need more ${getItemDisplayName(itemId)}. Consider adding parallel production lines.`;
  }
  return `Slightly short on ${getItemDisplayName(itemId)}. Minor adjustment may help.`;
}

function getBeltUpgradeSuggestion(currentCapacity: number): string {
  // Find next belt tier
  const tiers = Object.entries(BELT_CAPACITIES);
  for (const [tier, capacity] of tiers) {
    if (capacity > currentCapacity) {
      return `Upgrade to Mk.${tier} conveyor belt (${capacity} items/min)`;
    }
  }
  return 'Consider splitting into parallel belt lines';
}

function getPipeUpgradeSuggestion(currentCapacity: number): string {
  if (currentCapacity < 600) {
    return 'Upgrade to Mk.2 pipeline (600 m3/min)';
  }
  return 'Consider splitting into parallel pipelines';
}

function calculateHealthScore(
  bottlenecks: BottleneckResult[],
  countBySeverity: Record<BottleneckSeverity, number>
): number {
  if (bottlenecks.length === 0) {
    return 100;
  }

  // Weighted penalty for each severity
  const criticalPenalty = countBySeverity.critical * 15;
  const warningPenalty = countBySeverity.warning * 5;
  const infoPenalty = countBySeverity.info * 1;

  const totalPenalty = criticalPenalty + warningPenalty + infoPenalty;

  // Health score with diminishing penalty (log scale)
  const score = Math.max(0, 100 - Math.min(100, totalPenalty));

  return Math.round(score);
}

/**
 * Get bottlenecks for a specific building
 */
export function getBottlenecksForBuilding(
  buildingId: string,
  bottlenecks: BottleneckResult[]
): BottleneckResult[] {
  return bottlenecks.filter(b => b.id === buildingId);
}

/**
 * Get bottlenecks by severity
 */
export function getBottlenecksBySeverity(
  severity: BottleneckSeverity,
  bottlenecks: BottleneckResult[]
): BottleneckResult[] {
  return bottlenecks.filter(b => b.severity === severity);
}

/**
 * Get the most impactful bottlenecks (sorted by impact)
 */
export function getMostImpactfulBottlenecks(
  bottlenecks: BottleneckResult[],
  limit: number = 5
): BottleneckResult[] {
  return [...bottlenecks]
    .sort((a, b) => {
      // Sort by severity first (critical > warning > info)
      const severityOrder: Record<BottleneckSeverity, number> = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by achieved percentage (lower = more impactful)
      return a.achievedPercentage - b.achievedPercentage;
    })
    .slice(0, limit);
}

/**
 * Create an empty bottleneck summary (for when no analysis has run)
 */
export function createEmptyBottleneckSummary(): BottleneckSummary {
  return {
    bottlenecks: [],
    countBySeverity: { info: 0, warning: 0, critical: 0 },
    countByType: {
      starved: 0,
      blocked: 0,
      'belt-limit': 0,
      'pipe-limit': 0,
      'no-recipe': 0,
      'no-power': 0,
      inefficient: 0,
      overclocked: 0,
      underclocked: 0,
      disconnected: 0,
    },
    healthScore: 100,
    mostCritical: null,
    analyzedAt: Date.now(),
  };
}
