import { HistorySystem, HistoryState, HistoryEntry, deepCloneHistoryState } from './historyTypes';

const MAX_HISTORY_SIZE = 50; // Maximum number of history entries to keep

export function createHistorySystem(): HistorySystem {
  return {
    history: [],
    currentIndex: -1,
    maxHistorySize: MAX_HISTORY_SIZE,
    isRecording: true,
  };
}

export function canUndo(system: HistorySystem): boolean {
  return system.currentIndex > 0;
}

export function canRedo(system: HistorySystem): boolean {
  return system.currentIndex < system.history.length - 1;
}

export function recordState(system: HistorySystem, state: HistoryState, description?: string): HistorySystem {
  if (!system.isRecording) {
    return system;
  }

  // Clone the state to ensure immutability
  const clonedState = deepCloneHistoryState(state);
  
  // Create new entry
  const newEntry: HistoryEntry = {
    timestamp: Date.now(),
    state: clonedState,
    description,
  };

  // If we're not at the end of history, remove everything after current index
  const newHistory = system.history.slice(0, system.currentIndex + 1);
  
  // Add new entry
  newHistory.push(newEntry);
  
  // Trim history if it exceeds max size
  let finalHistory = newHistory;
  let newIndex = newHistory.length - 1;
  
  if (newHistory.length > system.maxHistorySize) {
    // Remove oldest entries
    finalHistory = newHistory.slice(newHistory.length - system.maxHistorySize);
    newIndex = finalHistory.length - 1;
  }

  return {
    ...system,
    history: finalHistory,
    currentIndex: newIndex,
  };
}

export function undo(system: HistorySystem): { system: HistorySystem; state: HistoryState | null } {
  if (!canUndo(system)) {
    return { system, state: null };
  }

  const newIndex = system.currentIndex - 1;
  const previousState = system.history[newIndex].state;

  return {
    system: {
      ...system,
      currentIndex: newIndex,
    },
    state: deepCloneHistoryState(previousState),
  };
}

export function redo(system: HistorySystem): { system: HistorySystem; state: HistoryState | null } {
  if (!canRedo(system)) {
    return { system, state: null };
  }

  const newIndex = system.currentIndex + 1;
  const nextState = system.history[newIndex].state;

  return {
    system: {
      ...system,
      currentIndex: newIndex,
    },
    state: deepCloneHistoryState(nextState),
  };
}

export function clearHistory(system: HistorySystem): HistorySystem {
  return createHistorySystem();
}

export function setRecording(system: HistorySystem, isRecording: boolean): HistorySystem {
  return {
    ...system,
    isRecording,
  };
}