import { create } from 'zustand';
import { LayoutState } from '../types';
import { createTauriStoreEnhancer } from './tauriStoreAdapter';
import { StateSynchronizer } from '../tauri/sync/stateSynchronizer';
import { ComplexOperationCoordinator } from '../tauri/sync/complexOperations';
import { StateValidator } from '../tauri/sync/stateValidator';
import { isTauriEnvironment } from '../tauri/environment';

// Create the synchronized store with all enhancements
export const useSynchronizedStore = create<LayoutState & {
  // Synchronization state
  synchronizer?: StateSynchronizer;
  operationCoordinator?: ComplexOperationCoordinator;
  stateValidator?: StateValidator;
  
  // Synchronized actions
  initializeSync: () => Promise<void>;
  performSyncedOperation: <T>(operation: () => T) => Promise<T>;
  validateAndRepair: () => Promise<void>;
  getSyncStatus: () => { connected: boolean; version: number; lastSync: number };
  
  // Debug actions
  forceSync: () => Promise<void>;
  exportDebugInfo: () => Promise<string>;
}>((set, get) => {
  // Create base state
  const baseState: LayoutState = {
    buildings: {},
    conveyorSystems: {},
    pipeSystems: {},
    railways: {},
    stickyNotes: {},
    
    // Drawing states
    drawingConveyor: false,
    conveyorPoints: [],
    conveyorStartConnection: null,
    conveyorHeight: 1,
    drawingPipe: false,
    pipePoints: [],
    pipeStartConnection: null,
    pipeHeight: 1,
    drawingRailway: false,
    railwayNodes: [],
    
    // UI state
    currentFloor: 0,
    selectedTool: null,
    buildingRotation: 0,
    leftPanelWidth: 250,
    rightPanelWidth: 250,
    drawingPreviews: {},
  };

  // Create Tauri enhancements if in desktop environment
  let tauriEnhancements = {};
  if (isTauriEnvironment()) {
    tauriEnhancements = createTauriStoreEnhancer(set, get);
  }

  return {
    ...baseState,
    ...tauriEnhancements,
    
    // Initialize synchronization
    initializeSync: async () => {
      if (!isTauriEnvironment()) return;
      
      const state = get();
      
      // Create synchronizer
      const synchronizer = new StateSynchronizer({
        getState: get,
        setState: set,
      });
      
      // Create operation coordinator
      const operationCoordinator = new ComplexOperationCoordinator(
        { getState: get, setState: set },
        synchronizer
      );
      
      // Create state validator
      const stateValidator = new StateValidator({ getState: get });
      
      // Initialize synchronizer
      await synchronizer.initialize();
      
      // Store instances
      set({
        synchronizer,
        operationCoordinator,
        stateValidator,
      });
      
      console.log('State synchronization initialized');
    },
    
    // Perform synchronized operation
    performSyncedOperation: async <T>(operation: () => T): Promise<T> => {
      const { synchronizer } = get();
      
      if (!synchronizer || !isTauriEnvironment()) {
        // Fallback to direct operation
        return operation();
      }
      
      return new Promise((resolve, reject) => {
        synchronizer.performOptimisticUpdate(
          operation,
          (result) => {
            // Rollback - revert state
            console.error('Operation failed, rolling back');
          },
          async (result) => {
            // Confirm - operation succeeded
            resolve(result);
          }
        ).catch(reject);
      });
    },
    
    // Validate and repair state
    validateAndRepair: async () => {
      const { stateValidator, synchronizer } = get();
      
      if (!stateValidator || !synchronizer) return;
      
      const validation = await stateValidator.validateState(true);
      
      if (!validation.isValid) {
        console.error('State validation failed:', validation.errors);
        
        // Attempt recovery
        await synchronizer.requestStateSync();
      }
    },
    
    // Get synchronization status
    getSyncStatus: () => {
      const { synchronizer } = get();
      
      if (!synchronizer) {
        return {
          connected: false,
          version: 0,
          lastSync: 0,
        };
      }
      
      const debugInfo = synchronizer.getDebugInfo();
      
      return {
        connected: true,
        version: debugInfo.currentVersion,
        lastSync: Date.now(), // TODO: Track actual last sync time
      };
    },
    
    // Force synchronization
    forceSync: async () => {
      const { synchronizer } = get();
      
      if (synchronizer) {
        await synchronizer.forceFullSync();
      }
    },
    
    // Export debug information
    exportDebugInfo: async () => {
      const { synchronizer, stateValidator } = get();
      const state = get();
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        platform: 'tauri',
        state: {
          buildingCount: Object.keys(state.buildings).length,
          conveyorCount: Object.keys(state.conveyorSystems).length,
          pipeCount: Object.keys(state.pipeSystems).length,
          railwayCount: Object.keys(state.railways).length,
          stickyNoteCount: Object.keys(state.stickyNotes).length,
        },
        synchronization: synchronizer?.getDebugInfo() || null,
        validation: await stateValidator?.validateState() || null,
      };
      
      return JSON.stringify(debugInfo, null, 2);
    },
    
    // Override standard actions to use synchronization
    addBuilding: (building) => {
      const performOp = () => {
        set((state) => ({
          buildings: { ...state.buildings, [building.id]: building }
        }));
        return building;
      };
      
      return get().performSyncedOperation(performOp);
    },
    
    updateBuildingPosition: (id, x, y) => {
      const performOp = () => {
        set((state) => ({
          buildings: {
            ...state.buildings,
            [id]: { ...state.buildings[id], x, y }
          }
        }));
      };
      
      return get().performSyncedOperation(performOp);
    },
    
    deleteBuilding: (id) => {
      const performOp = () => {
        set((state) => {
          const { [id]: _, ...remainingBuildings } = state.buildings;
          return { buildings: remainingBuildings };
        });
      };
      
      return get().performSyncedOperation(performOp);
    },
  };
});

// Export hooks for specific synchronization features
export function useSyncStatus() {
  return useSynchronizedStore((state) => ({
    status: state.getSyncStatus(),
    forceSync: state.forceSync,
  }));
}

export function useComplexOperations() {
  const coordinator = useSynchronizedStore((state) => state.operationCoordinator);
  
  return {
    moveBuildingsWithInfrastructure: coordinator?.moveBuildingsWithInfrastructure.bind(coordinator),
    performMultiSelection: coordinator?.performMultiSelection.bind(coordinator),
    executeDrawingOperation: coordinator?.executeDrawingOperation.bind(coordinator),
    undo: coordinator?.undo.bind(coordinator),
    redo: coordinator?.redo.bind(coordinator),
  };
}

export function useStateValidation() {
  const validator = useSynchronizedStore((state) => state.stateValidator);
  
  return {
    validate: validator?.validateState.bind(validator),
    exportReport: validator?.exportValidationReport.bind(validator),
  };
}

// Initialize synchronization on store creation
if (isTauriEnvironment()) {
  useSynchronizedStore.getState().initializeSync().catch(console.error);
}