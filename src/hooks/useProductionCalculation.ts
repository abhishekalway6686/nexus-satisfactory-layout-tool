// src/hooks/useProductionCalculation.ts
// React hook for production simulation calculations

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLayoutStore } from '../store/layoutStore';
import {
  calculatePushFlow,
  calculatePullDemand,
  createEmptyFlowState,
  createEmptyDemandState,
  FlowState,
  DemandState,
} from '../logic/production/flowCalculation';
import {
  detectBottlenecks,
  createBottleneckSummary,
  createEmptyBottleneckSummary,
  BottleneckResult,
  BottleneckSummary,
  getBottlenecksForBuilding,
  getMostImpactfulBottlenecks,
} from '../logic/production/bottleneckDetection';

// ============================================
// CONFIGURATION
// ============================================

/** Debounce delay for calculations (ms) */
const CALCULATION_DEBOUNCE_MS = 300;

/** Minimum time between calculations (ms) */
const MIN_CALCULATION_INTERVAL_MS = 100;

// ============================================
// HOOK TYPES
// ============================================

export interface ProductionCalculationResult {
  /** Current flow state from push analysis */
  flowState: FlowState;
  /** Current demand state from pull analysis */
  demandState: DemandState;
  /** All detected bottlenecks */
  bottlenecks: BottleneckResult[];
  /** Summary of bottleneck analysis */
  bottleneckSummary: BottleneckSummary;
  /** Whether calculation is in progress */
  isCalculating: boolean;
  /** Error message if calculation failed */
  error: string | null;
  /** Timestamp of last successful calculation */
  lastCalculatedAt: number | null;
  /** Force a recalculation */
  recalculate: () => void;
  /** Get bottlenecks for a specific building */
  getBottlenecksForBuilding: (buildingId: string) => BottleneckResult[];
  /** Get the most impactful bottlenecks */
  getMostImpactful: (limit?: number) => BottleneckResult[];
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Hook for production simulation calculations
 *
 * Subscribes to buildings, conveyors, and pipes from the store,
 * debounces calculations, and provides flow/demand/bottleneck analysis.
 *
 * @param enabled - Whether to enable calculations (default: true)
 * @returns Production calculation result
 */
export function useProductionCalculation(enabled: boolean = true): ProductionCalculationResult {
  // State for calculation results
  const [flowState, setFlowState] = useState<FlowState>(createEmptyFlowState);
  const [demandState, setDemandState] = useState<DemandState>(createEmptyDemandState);
  const [bottlenecks, setBottlenecks] = useState<BottleneckResult[]>([]);
  const [bottleneckSummary, setBottleneckSummary] = useState<BottleneckSummary>(createEmptyBottleneckSummary);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<number | null>(null);

  // Refs for debouncing
  const calculationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCalculationTimeRef = useRef<number>(0);
  const pendingCalculationRef = useRef<boolean>(false);

  // Subscribe to store data
  const buildings = useLayoutStore((state) => state.buildings);
  const conveyorBelts = useLayoutStore((state) => state.conveyorBelts);
  const conveyorPoles = useLayoutStore((state) => state.conveyorPoles);
  const conveyorLifts = useLayoutStore((state) => state.conveyorLifts);
  const pipelines = useLayoutStore((state) => state.pipelines);
  const pipeSupports = useLayoutStore((state) => state.pipeSupports);

  /**
   * Perform the actual calculation
   */
  const performCalculation = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();

    // Enforce minimum interval
    if (now - lastCalculationTimeRef.current < MIN_CALCULATION_INTERVAL_MS) {
      pendingCalculationRef.current = true;
      return;
    }

    setIsCalculating(true);
    setError(null);
    pendingCalculationRef.current = false;
    lastCalculationTimeRef.current = now;

    try {
      // Run push flow analysis
      const newFlowState = calculatePushFlow(
        buildings,
        conveyorBelts,
        conveyorPoles,
        conveyorLifts,
        pipelines,
        pipeSupports
      );

      // Run pull demand analysis
      const newDemandState = calculatePullDemand(
        buildings,
        conveyorBelts,
        conveyorLifts,
        pipelines
      );

      // Detect bottlenecks
      const newBottlenecks = detectBottlenecks(
        newFlowState,
        newDemandState,
        buildings
      );

      // Create summary
      const newSummary = createBottleneckSummary(newBottlenecks);

      // Update state
      setFlowState(newFlowState);
      setDemandState(newDemandState);
      setBottlenecks(newBottlenecks);
      setBottleneckSummary(newSummary);
      setLastCalculatedAt(Date.now());
    } catch (err) {
      console.error('Production calculation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown calculation error');
    } finally {
      setIsCalculating(false);

      // Handle pending calculation
      if (pendingCalculationRef.current) {
        setTimeout(performCalculation, MIN_CALCULATION_INTERVAL_MS);
      }
    }
  }, [
    enabled,
    buildings,
    conveyorBelts,
    conveyorPoles,
    conveyorLifts,
    pipelines,
    pipeSupports,
  ]);

  /**
   * Schedule a debounced calculation
   */
  const scheduleCalculation = useCallback(() => {
    // Clear existing timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    // Schedule new calculation
    calculationTimeoutRef.current = setTimeout(
      performCalculation,
      CALCULATION_DEBOUNCE_MS
    );
  }, [performCalculation]);

  /**
   * Force immediate recalculation
   */
  const recalculate = useCallback(() => {
    // Clear debounce timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
      calculationTimeoutRef.current = null;
    }

    // Reset minimum interval check to allow immediate calculation
    lastCalculationTimeRef.current = 0;

    performCalculation();
  }, [performCalculation]);

  // Effect to trigger calculation when dependencies change
  useEffect(() => {
    if (enabled) {
      scheduleCalculation();
    }

    // Cleanup timeout on unmount
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [
    enabled,
    buildings,
    conveyorBelts,
    conveyorPoles,
    conveyorLifts,
    pipelines,
    pipeSupports,
    scheduleCalculation,
  ]);

  // Memoized helper functions
  const getBottlenecksForBuildingMemo = useCallback(
    (buildingId: string) => getBottlenecksForBuilding(buildingId, bottlenecks),
    [bottlenecks]
  );

  const getMostImpactfulMemo = useCallback(
    (limit: number = 5) => getMostImpactfulBottlenecks(bottlenecks, limit),
    [bottlenecks]
  );

  return {
    flowState,
    demandState,
    bottlenecks,
    bottleneckSummary,
    isCalculating,
    error,
    lastCalculatedAt,
    recalculate,
    getBottlenecksForBuilding: getBottlenecksForBuildingMemo,
    getMostImpactful: getMostImpactfulMemo,
  };
}

// ============================================
// ADDITIONAL HOOKS
// ============================================

/**
 * Hook to get production data for a specific building
 */
export function useBuildingProduction(buildingId: string) {
  const { flowState, bottlenecks, isCalculating } = useProductionCalculation();

  return useMemo(() => {
    const node = flowState.nodes[buildingId];
    const buildingBottlenecks = bottlenecks.filter(b => b.id === buildingId);

    return {
      node,
      bottlenecks: buildingBottlenecks,
      isCalculating,
      hasIssues: buildingBottlenecks.length > 0,
      efficiency: node?.efficiency ?? 0,
      actualInput: node?.actualInput ?? {},
      actualOutput: node?.actualOutput ?? {},
    };
  }, [buildingId, flowState, bottlenecks, isCalculating]);
}

/**
 * Hook to get flow data for a specific conveyor
 */
export function useConveyorFlow(conveyorId: string) {
  const { flowState, bottlenecks, isCalculating } = useProductionCalculation();

  return useMemo(() => {
    const flow = flowState.conveyorFlows[conveyorId];
    const conveyorBottlenecks = bottlenecks.filter(
      b => b.id === conveyorId && b.entityType === 'conveyor'
    );

    return {
      flow,
      bottlenecks: conveyorBottlenecks,
      isCalculating,
      isBottleneck: conveyorBottlenecks.length > 0,
      utilization: flow?.utilization ?? 0,
      rate: flow?.rate ?? 0,
      capacity: flow?.capacity ?? 0,
    };
  }, [conveyorId, flowState, bottlenecks, isCalculating]);
}

/**
 * Hook to get flow data for a specific pipeline
 */
export function usePipelineFlow(pipelineId: string) {
  const { flowState, bottlenecks, isCalculating } = useProductionCalculation();

  return useMemo(() => {
    const flow = flowState.pipeFlows[pipelineId];
    const pipeBottlenecks = bottlenecks.filter(
      b => b.id === pipelineId && b.entityType === 'pipe'
    );

    return {
      flow,
      bottlenecks: pipeBottlenecks,
      isCalculating,
      isBottleneck: pipeBottlenecks.length > 0,
      utilization: flow?.utilization ?? 0,
      rate: flow?.rate ?? 0,
      capacity: flow?.capacity ?? 0,
    };
  }, [pipelineId, flowState, bottlenecks, isCalculating]);
}

/**
 * Hook to get overall factory health
 */
export function useFactoryHealth() {
  const { bottleneckSummary, flowState, isCalculating } = useProductionCalculation();

  return useMemo(() => {
    return {
      healthScore: bottleneckSummary.healthScore,
      criticalCount: bottleneckSummary.countBySeverity.critical,
      warningCount: bottleneckSummary.countBySeverity.warning,
      infoCount: bottleneckSummary.countBySeverity.info,
      totalProduction: flowState.totalProduction,
      totalConsumption: flowState.totalConsumption,
      mostCritical: bottleneckSummary.mostCritical,
      isCalculating,
      buildingCount: Object.keys(flowState.nodes).length,
    };
  }, [bottleneckSummary, flowState, isCalculating]);
}

/**
 * Hook to get production statistics
 */
export function useProductionStats() {
  const { flowState, demandState, isCalculating } = useProductionCalculation();

  return useMemo(() => {
    const production = flowState.totalProduction;
    const consumption = flowState.totalConsumption;
    const demand = demandState.totalDemand;

    // Calculate surplus/deficit for each item
    const itemStats: Record<string, {
      produced: number;
      consumed: number;
      demanded: number;
      surplus: number;
    }> = {};

    // Gather all item IDs
    const allItems = new Set([
      ...Object.keys(production),
      ...Object.keys(consumption),
      ...Object.keys(demand),
    ]);

    for (const itemId of allItems) {
      const produced = production[itemId] || 0;
      const consumed = consumption[itemId] || 0;
      const demanded = demand[itemId] || 0;

      itemStats[itemId] = {
        produced,
        consumed,
        demanded,
        surplus: produced - consumed,
      };
    }

    return {
      itemStats,
      totalItemTypes: allItems.size,
      isCalculating,
    };
  }, [flowState, demandState, isCalculating]);
}
