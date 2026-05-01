import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { LayoutState } from '../../types';
import { sha256 } from 'js-sha256';

// Sync event types matching Rust definitions
export interface StateSnapshot {
  type: 'StateSnapshot';
  version: number;
  checksum: string;
  data: {
    buildings: Record<string, any>;
    conveyor_belts: Record<string, any>;
    pipelines: Record<string, any>;
    railways: Record<string, any>;
    sticky_notes: Record<string, any>;
  };
}

export interface StateDelta {
  type: 'StateDelta';
  from_version: number;
  to_version: number;
  operations: DeltaOperation[];
}

export interface StateChecksum {
  type: 'StateChecksum';
  version: number;
  checksum: string;
}

export interface EventBatch {
  type: 'EventBatch';
  events: LayoutEvent[];
  timestamp: number;
}

export type SyncEvent = StateSnapshot | StateDelta | StateChecksum | EventBatch;

export interface DeltaOperation {
  op: 'Add' | 'Update' | 'Remove' | 'Move';
  collection: string;
  id: string;
  data?: any;
  old_pos?: [number, number, number];
  new_pos?: [number, number, number];
}

export interface LayoutEvent {
  type: string;
  building_id?: string;
  conveyor_id?: string;
  pipeline_id?: string;
  railway_id?: string;
  note_id?: string;
  old_position?: { x: number; y: number; z: number };
}

// State synchronization configuration
interface SyncConfig {
  checksumInterval: number; // ms between checksum validations
  recoveryTimeout: number; // ms to wait before requesting recovery
  maxDesyncRetries: number; // max attempts to recover from desync
  enableOptimisticUpdates: boolean;
}

export class StateSynchronizer {
  private storeInstance: any;
  private currentVersion: number = 0;
  private lastChecksum: string = '';
  private unsubscribers: UnlistenFn[] = [];
  private checksumTimer?: NodeJS.Timeout;
  private pendingOperations: Map<string, DeltaOperation> = new Map();
  private desyncRetries: number = 0;
  
  private config: SyncConfig = {
    checksumInterval: 5000, // 5 seconds
    recoveryTimeout: 1000, // 1 second
    maxDesyncRetries: 3,
    enableOptimisticUpdates: true,
  };

  constructor(store: any) {
    this.storeInstance = store;
  }

  async initialize() {
    // Setup sync event listener
    const unsubSync = await listen<SyncEvent>('sync-event', (event) => {
      this.handleSyncEvent(event.payload);
    });
    this.unsubscribers.push(unsubSync);

    // Start periodic checksum validation
    this.startChecksumValidation();

    // Request initial state sync
    await this.requestStateSync();
  }

  private async handleSyncEvent(event: SyncEvent) {
    switch (event.type) {
      case 'StateSnapshot':
        await this.handleStateSnapshot(event);
        break;
      
      case 'StateDelta':
        await this.handleStateDelta(event);
        break;
      
      case 'StateChecksum':
        await this.handleStateChecksum(event);
        break;
      
      case 'EventBatch':
        await this.handleEventBatch(event);
        break;
    }
  }

  private async handleStateSnapshot(snapshot: StateSnapshot) {
    console.log(`Received state snapshot v${snapshot.version}`);
    
    // Verify checksum
    const calculatedChecksum = this.calculateStateChecksum(snapshot.data);
    if (calculatedChecksum !== snapshot.checksum) {
      console.error('State snapshot checksum mismatch!');
      this.handleDesync();
      return;
    }

    // Apply snapshot to store
    this.storeInstance.setState({
      buildings: snapshot.data.buildings || {},
      conveyorSystems: this.transformConveyors(snapshot.data.conveyor_belts || {}),
      pipeSystems: this.transformPipelines(snapshot.data.pipelines || {}),
      railways: snapshot.data.railways || {},
      stickyNotes: snapshot.data.sticky_notes || {},
    });

    // Update sync state
    this.currentVersion = snapshot.version;
    this.lastChecksum = snapshot.checksum;
    this.desyncRetries = 0;
    this.pendingOperations.clear();

    console.log('State synchronized successfully');
  }

  private async handleStateDelta(delta: StateDelta) {
    // Verify we can apply this delta
    if (delta.from_version !== this.currentVersion) {
      console.warn(`Delta version mismatch: expected ${this.currentVersion}, got ${delta.from_version}`);
      await this.requestRecovery();
      return;
    }

    // Apply operations
    const state = this.storeInstance.getState();
    const newState = { ...state };

    for (const op of delta.operations) {
      this.applyDeltaOperation(newState, op);
    }

    // Update store
    this.storeInstance.setState(newState);
    this.currentVersion = delta.to_version;
  }

  private applyDeltaOperation(state: any, op: DeltaOperation) {
    const collection = this.getCollectionName(op.collection);
    
    switch (op.op) {
      case 'Add':
        if (!state[collection]) state[collection] = {};
        state[collection][op.id] = op.data;
        break;
      
      case 'Update':
        if (state[collection] && state[collection][op.id]) {
          state[collection][op.id] = { ...state[collection][op.id], ...op.data };
        }
        break;
      
      case 'Remove':
        if (state[collection]) {
          delete state[collection][op.id];
        }
        break;
      
      case 'Move':
        if (state[collection] && state[collection][op.id] && op.new_pos) {
          state[collection][op.id] = {
            ...state[collection][op.id],
            x: op.new_pos[0],
            y: op.new_pos[1],
            z: op.new_pos[2],
          };
        }
        break;
    }
  }

  private async handleStateChecksum(checksum: StateChecksum) {
    if (checksum.version === this.currentVersion) {
      const localChecksum = this.calculateCurrentStateChecksum();
      if (localChecksum !== checksum.checksum) {
        console.warn('State checksum mismatch detected');
        this.handleDesync();
      }
    }
  }

  private async handleEventBatch(batch: EventBatch) {
    // Process events in order
    for (const event of batch.events) {
      await this.processLayoutEvent(event);
    }
  }

  private async processLayoutEvent(event: LayoutEvent) {
    // This is handled by the existing event system in tauriStoreAdapter
    // We just ensure version tracking here
    this.currentVersion++;
  }

  private startChecksumValidation() {
    this.checksumTimer = setInterval(async () => {
      try {
        const isValid = await invoke<boolean>('verify_state_checksum', {
          version: this.currentVersion,
          clientChecksum: this.calculateCurrentStateChecksum(),
        });

        if (!isValid) {
          console.warn('Checksum validation failed');
          this.handleDesync();
        }
      } catch (error) {
        console.error('Checksum validation error:', error);
      }
    }, this.config.checksumInterval);
  }

  private calculateStateChecksum(state: any): string {
    // Sort keys for consistent ordering
    const sortedState = {
      buildings: this.sortObject(state.buildings || {}),
      conveyor_belts: this.sortObject(state.conveyor_belts || {}),
      pipelines: this.sortObject(state.pipelines || {}),
      railways: this.sortObject(state.railways || {}),
      sticky_notes: this.sortObject(state.sticky_notes || {}),
    };

    const stateString = JSON.stringify(sortedState);
    return sha256(stateString + this.currentVersion);
  }

  private calculateCurrentStateChecksum(): string {
    const state = this.storeInstance.getState();
    return this.calculateStateChecksum({
      buildings: state.buildings,
      conveyor_belts: this.reverseTransformConveyors(state.conveyorSystems),
      pipelines: this.reverseTransformPipelines(state.pipeSystems),
      railways: state.railways,
      sticky_notes: state.stickyNotes,
    });
  }

  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  private async handleDesync() {
    this.desyncRetries++;
    
    if (this.desyncRetries > this.config.maxDesyncRetries) {
      console.error('Max desync retries exceeded, forcing full sync');
      await this.forceFullSync();
      return;
    }

    console.log(`Handling desync (attempt ${this.desyncRetries})`);
    
    // Request recovery with exponential backoff
    const delay = this.config.recoveryTimeout * Math.pow(2, this.desyncRetries - 1);
    setTimeout(() => this.requestRecovery(), delay);
  }

  private async requestRecovery() {
    try {
      await invoke('request_state_recovery', {
        lastKnownVersion: this.currentVersion,
      });
    } catch (error) {
      console.error('Recovery request failed:', error);
      await this.forceFullSync();
    }
  }

  private async requestStateSync() {
    try {
      await invoke('force_state_sync');
    } catch (error) {
      console.error('State sync request failed:', error);
    }
  }

  private async forceFullSync() {
    console.log('Forcing full state synchronization');
    this.desyncRetries = 0;
    await this.requestStateSync();
  }

  // Optimistic update support
  async performOptimisticUpdate<T>(
    operation: () => T,
    rollback: (result: T) => void,
    confirm: (result: T) => Promise<void>
  ): Promise<void> {
    if (!this.config.enableOptimisticUpdates) {
      await confirm(operation());
      return;
    }

    // Apply update optimistically
    const result = operation();
    
    try {
      // Confirm with backend
      await confirm(result);
    } catch (error) {
      // Rollback on failure
      console.error('Optimistic update failed, rolling back:', error);
      rollback(result);
      throw error;
    }
  }

  // Transform helpers for data format differences
  private transformConveyors(rustConveyors: Record<string, any>): Record<string, any> {
    // Transform Rust conveyor format to React format if needed
    return rustConveyors;
  }

  private transformPipelines(rustPipelines: Record<string, any>): Record<string, any> {
    // Transform Rust pipeline format to React format if needed
    return rustPipelines;
  }

  private reverseTransformConveyors(reactConveyors: Record<string, any>): Record<string, any> {
    // Transform React conveyor format to Rust format if needed
    return reactConveyors;
  }

  private reverseTransformPipelines(reactPipelines: Record<string, any>): Record<string, any> {
    // Transform React pipeline format to Rust format if needed
    return reactPipelines;
  }

  private getCollectionName(rustCollection: string): string {
    const mapping: Record<string, string> = {
      'buildings': 'buildings',
      'conveyor_belts': 'conveyorSystems',
      'pipelines': 'pipeSystems',
      'railways': 'railways',
      'sticky_notes': 'stickyNotes',
    };
    return mapping[rustCollection] || rustCollection;
  }

  // Cleanup
  destroy() {
    if (this.checksumTimer) {
      clearInterval(this.checksumTimer);
    }
    
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    
    this.unsubscribers = [];
    this.pendingOperations.clear();
  }

  // Public API for debugging
  getDebugInfo() {
    return {
      currentVersion: this.currentVersion,
      lastChecksum: this.lastChecksum,
      pendingOperations: this.pendingOperations.size,
      desyncRetries: this.desyncRetries,
    };
  }
}