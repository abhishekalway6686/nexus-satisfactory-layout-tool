import { LayoutState } from '../types';
import { createHistorySystem, undo as undoHistory, redo as redoHistory, canUndo as canUndoHistory, canRedo as canRedoHistory, clearHistory as clearHistorySystem, setRecording } from './historySystem';
import { extractHistoryState, HistorySystem, HistoryState } from './historyTypes';
import { withHistory } from './historyMiddleware';

// Store the history system separately from the main state
let historySystem = createHistorySystem();

// Initialize history with current state
export function initializeHistory(state: LayoutState): void {
  const historyState = extractHistoryState(state);
  historySystem = {
    ...historySystem,
    history: [{
      timestamp: Date.now(),
      state: historyState,
      description: 'Initial state',
    }],
    currentIndex: 0,
  };
}

// Getter for history system (for middleware)
export function getHistorySystem(): HistorySystem {
  return historySystem;
}

// Setter for history system (for middleware)
export function setHistorySystem(system: HistorySystem): void {
  historySystem = system;
}

// Apply history state to the store
function applyHistoryState(
  currentState: LayoutState,
  historyState: HistoryState
): Partial<LayoutState> {
  return {
    buildings: historyState.buildings,
    conveyorPoles: historyState.conveyorPoles,
    conveyorSegments: historyState.conveyorSegments,
    conveyorBelts: historyState.conveyorBelts,
    conveyorLifts: historyState.conveyorLifts,
    pipeSupports: historyState.pipeSupports,
    pipeSegments: historyState.pipeSegments,
    pipelines: historyState.pipelines,
    pipeFloorConnections: historyState.pipeFloorConnections,
    stickyNotes: historyState.stickyNotes,
    truckPaths: historyState.truckPaths,
    railways: historyState.railways,
    railwaySegments: historyState.railwaySegments,
    railwayNodes: historyState.railwayNodes,
    foundations: historyState.foundations,
    wallSegments: historyState.wallSegments,
    // Clear selections when undoing/redoing
    selectedBuilding: null,
    selectedPole: null,
    selectedPipeSupport: null,
    selectedStickyNote: null,
    selectedRailwayNode: null,
    selectedRailwaySegment: null,
    selectedConveyorLift: null,
    selectedPipeFloorConnection: null,
    selectedFoundation: null,
    selectedWall: null,
  };
}

// Create history-aware actions
export function createHistoryActions(set: (updater: (state: LayoutState) => Partial<LayoutState>) => void, get: () => LayoutState) {
  return {
    undo: () => {
      historySystem = setRecording(historySystem, false);
      const result = undoHistory(historySystem);
      
      if (result.state) {
        historySystem = result.system;
        set((currentState: LayoutState) => applyHistoryState(currentState, result.state!));
      }
      
      // Re-enable recording after a short delay
      setTimeout(() => {
        historySystem = setRecording(historySystem, true);
      }, 100);
    },
    
    redo: () => {
      historySystem = setRecording(historySystem, false);
      const result = redoHistory(historySystem);
      
      if (result.state) {
        historySystem = result.system;
        set((currentState: LayoutState) => applyHistoryState(currentState, result.state!));
      }
      
      // Re-enable recording after a short delay
      setTimeout(() => {
        historySystem = setRecording(historySystem, true);
      }, 100);
    },
    
    canUndo: () => canUndoHistory(historySystem),
    canRedo: () => canRedoHistory(historySystem),
    
    clearHistory: () => {
      historySystem = clearHistorySystem(historySystem);
      // Initialize with current state
      const state = get();
      const historyState = extractHistoryState(state);
      historySystem.history = [{
        timestamp: Date.now(),
        state: historyState,
        description: 'Initial state',
      }];
      historySystem.currentIndex = 0;
    },
    
    getHistoryDescription: () => {
      const past = historySystem.currentIndex > 0 
        ? historySystem.history[historySystem.currentIndex - 1].description 
        : undefined;
      const future = historySystem.currentIndex < historySystem.history.length - 1
        ? historySystem.history[historySystem.currentIndex + 1].description
        : undefined;
      return { past, future };
    },
  };
}

// Wrap an action with history recording
export function wrapActionWithHistory<T extends (...args: any[]) => any>(
  actionName: string,
  action: T,
  getState: () => LayoutState
): T {
  return withHistory(actionName, action, getState, getHistorySystem, setHistorySystem);
}