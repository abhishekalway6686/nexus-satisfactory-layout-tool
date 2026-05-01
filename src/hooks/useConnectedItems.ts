// Hook for efficient O(1) connected items lookup
import { useLayoutStore } from '../store/layoutStore';
import { getConnectedItems, getNodeSegments } from '../store/indexManager';

export function useConnectedItems(buildingId: string | null | undefined) {
  const indexes = useLayoutStore(state => state.indexes);
  
  if (!buildingId) {
    return {
      conveyors: [],
      pipelines: [],
      railways: [],
      railNodes: [],
      railSegments: [],
    };
  }
  
  return getConnectedItems(indexes, buildingId);
}

export function useNodeSegments(nodeId: string | null | undefined) {
  const indexes = useLayoutStore(state => state.indexes);
  
  if (!nodeId) {
    return [];
  }
  
  return getNodeSegments(indexes, nodeId);
}

// Get all conveyors connected to a building
export function useBuildingConveyors(buildingId: string | null | undefined) {
  const indexes = useLayoutStore(state => state.indexes);
  const conveyorBelts = useLayoutStore(state => state.conveyorBelts);
  
  if (!buildingId) {
    return [];
  }
  
  const conveyorIds = Array.from(indexes.buildingToConveyors.get(buildingId) || []);
  return conveyorIds.map(id => conveyorBelts[id]).filter(Boolean);
}

// Get all pipelines connected to a building
export function useBuildingPipelines(buildingId: string | null | undefined) {
  const indexes = useLayoutStore(state => state.indexes);
  const pipelines = useLayoutStore(state => state.pipelines);
  
  if (!buildingId) {
    return [];
  }
  
  const pipelineIds = Array.from(indexes.buildingToPipelines.get(buildingId) || []);
  return pipelineIds.map(id => pipelines[id]).filter(Boolean);
}

// Get all railways connected to a building (station)
export function useBuildingRailways(buildingId: string | null | undefined) {
  const indexes = useLayoutStore(state => state.indexes);
  const railways = useLayoutStore(state => state.railways);
  
  if (!buildingId) {
    return [];
  }
  
  const railwayIds = Array.from(indexes.buildingToRailways.get(buildingId) || []);
  return railwayIds.map(id => railways[id]).filter(Boolean);
}