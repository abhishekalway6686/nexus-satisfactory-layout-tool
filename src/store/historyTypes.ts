import { LayoutState } from '../types';

// Define what parts of the state we want to track in history
export interface HistoryState {
  buildings: LayoutState['buildings'];
  conveyorPoles: LayoutState['conveyorPoles'];
  conveyorSegments: LayoutState['conveyorSegments'];
  conveyorBelts: LayoutState['conveyorBelts'];
  conveyorLifts: LayoutState['conveyorLifts'];
  pipeSupports: LayoutState['pipeSupports'];
  pipeSegments: LayoutState['pipeSegments'];
  pipelines: LayoutState['pipelines'];
  pipeFloorConnections: LayoutState['pipeFloorConnections'];
  stickyNotes: LayoutState['stickyNotes'];
  truckPaths: LayoutState['truckPaths'];
  railways: LayoutState['railways'];
  railwaySegments: LayoutState['railwaySegments'];
  railwayNodes: LayoutState['railwayNodes'];
  foundations: LayoutState['foundations'];
  wallSegments: LayoutState['wallSegments'];
}

export interface HistoryEntry {
  timestamp: number;
  state: HistoryState;
  description?: string; // Optional description of the action
}

export interface HistorySystem {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
  isRecording: boolean; // Flag to prevent recording during undo/redo
}

// Helper to extract only the state we want to track
export function extractHistoryState(state: LayoutState): HistoryState {
  return {
    buildings: state.buildings,
    conveyorPoles: state.conveyorPoles,
    conveyorSegments: state.conveyorSegments,
    conveyorBelts: state.conveyorBelts,
    conveyorLifts: state.conveyorLifts,
    pipeSupports: state.pipeSupports,
    pipeSegments: state.pipeSegments,
    pipelines: state.pipelines,
    pipeFloorConnections: state.pipeFloorConnections,
    stickyNotes: state.stickyNotes,
    truckPaths: state.truckPaths,
    railways: state.railways,
    railwaySegments: state.railwaySegments,
    railwayNodes: state.railwayNodes,
    foundations: state.foundations,
    wallSegments: state.wallSegments,
  };
}

// Deep clone helper to ensure history entries are immutable
export function deepCloneHistoryState(state: HistoryState): HistoryState {
  return JSON.parse(JSON.stringify(state));
}