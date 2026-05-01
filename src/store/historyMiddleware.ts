import { LayoutState } from '../types';
import { extractHistoryState } from './historyTypes';
import { recordState } from './historySystem';
import { HistorySystem } from './historyTypes';

// Actions that should trigger history recording
const HISTORY_ACTIONS = new Set([
  'addBuilding',
  'updateBuilding',
  'deleteBuilding',
  'rotateBuilding',
  'addPole',
  'updatePole',
  'deletePole',
  'addPipeSupport',
  'updatePipeSupport',
  'deletePipeSupport',
  'addStickyNote',
  'updateStickyNote',
  'deleteStickyNote',
  'addConveyorLift',
  'updateConveyorLift',
  'deleteConveyorLift',
  'addPipeFloorConnection',
  'updatePipeFloorConnection',
  'deletePipeFloorConnection',
  'updateRailwaySegment',
  'updateRailwaySegmentPoint',
  'deleteRailwayNode',
  'addFoundation',
  'updateFoundation',
  'deleteFoundation',
  'addWallSegment',
  'updateWallSegment',
  'deleteWallSegment',
  'finishConveyorDrawing',
  'finishPipeDrawing',
  'finishRailwayDrawing',
  'reverseBeltDirection',
]);

// Actions that should be recorded with special handling
const DRAWING_FINISH_ACTIONS = new Set([
  'finishConveyorDrawing',
  'finishPipeDrawing',
  'finishRailwayDrawing',
]);

export function shouldRecordAction(actionName: string): boolean {
  return HISTORY_ACTIONS.has(actionName);
}

export function getActionDescription(actionName: string): string {
  const descriptions: Record<string, string> = {
    addBuilding: 'Add building',
    updateBuilding: 'Update building',
    deleteBuilding: 'Delete building',
    rotateBuilding: 'Rotate building',
    addPole: 'Add conveyor pole',
    updatePole: 'Update conveyor pole',
    deletePole: 'Delete conveyor pole',
    addPipeSupport: 'Add pipe support',
    updatePipeSupport: 'Update pipe support',
    deletePipeSupport: 'Delete pipe support',
    addStickyNote: 'Add sticky note',
    updateStickyNote: 'Update sticky note',
    deleteStickyNote: 'Delete sticky note',
    addConveyorLift: 'Add conveyor lift',
    updateConveyorLift: 'Update conveyor lift',
    deleteConveyorLift: 'Delete conveyor lift',
    addPipeFloorConnection: 'Add pipe floor connection',
    updatePipeFloorConnection: 'Update pipe floor connection',
    deletePipeFloorConnection: 'Delete pipe floor connection',
    updateRailwaySegment: 'Update railway segment',
    updateRailwaySegmentPoint: 'Update railway point',
    deleteRailwayNode: 'Delete railway node',
    addFoundation: 'Add foundation',
    updateFoundation: 'Update foundation',
    deleteFoundation: 'Delete foundation',
    addWallSegment: 'Add wall',
    updateWallSegment: 'Update wall',
    deleteWallSegment: 'Delete wall',
    finishConveyorDrawing: 'Draw conveyor',
    finishPipeDrawing: 'Draw pipeline',
    finishRailwayDrawing: 'Draw railway',
    reverseBeltDirection: 'Reverse belt direction',
  };
  
  return descriptions[actionName] || actionName;
}

// Wrapper to add history recording to an action
export function withHistory<T extends (...args: any[]) => any>(
  actionName: string,
  action: T,
  getState: () => LayoutState,
  getHistorySystem: () => HistorySystem,
  setHistorySystem: (system: HistorySystem) => void
): T {
  if (!shouldRecordAction(actionName)) {
    return action;
  }

  return ((...args: Parameters<T>) => {
    const state = getState();
    const historySystem = getHistorySystem();
    
    // Don't record if we're in the middle of undo/redo
    if (!historySystem.isRecording) {
      return action(...args);
    }
    
    // For drawing finish actions, record state before the action
    if (DRAWING_FINISH_ACTIONS.has(actionName)) {
      const historyState = extractHistoryState(state);
      const description = getActionDescription(actionName);
      const newSystem = recordState(historySystem, historyState, description);
      setHistorySystem(newSystem);
    }
    
    // Execute the action
    const result = action(...args);
    
    // For non-drawing actions, record state after the action
    // We need to do this in the next tick to ensure state is updated
    if (!DRAWING_FINISH_ACTIONS.has(actionName)) {
      setTimeout(() => {
        const updatedState = getState();
        const historyState = extractHistoryState(updatedState);
        const description = getActionDescription(actionName);
        const newSystem = recordState(getHistorySystem(), historyState, description);
        setHistorySystem(newSystem);
      }, 0);
    }
    
    return result;
  }) as T;
}