import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { testRustConnection } from './commands';

export interface LayoutEvent {
  type: 'BuildingCreated' | 'BuildingUpdated' | 'BuildingDeleted' | 
        'ConveyorCreated' | 'ConveyorUpdated' | 'ConveyorDeleted' |
        'PipeCreated' | 'PipeUpdated' | 'PipeDeleted' |
        'RailwayCreated' | 'RailwayUpdated' | 'RailwayDeleted';
  entityId?: string;
  entityType?: 'building' | 'conveyor' | 'pipe' | 'railway';
  data?: any;
}

export interface PerformanceEvent {
  type: 'PerformanceUpdate';
  operation: string;
  durationMs: number;
  itemCount?: number;
}

export interface SpatialIndexEvent {
  type: 'SpatialIndexUpdate';
  action: 'rebuild' | 'insert' | 'remove' | 'bulk_update';
  affectedCount: number;
}

// Store references to unsubscribe functions
let eventUnsubscribers: UnlistenFn[] = [];

// Event listeners for real-time updates from Rust backend
export async function listenToLayoutEvents(
  callback: (event: LayoutEvent) => void
): Promise<UnlistenFn> {
  return await listen<LayoutEvent>('layout-event', (event) => {
    callback(event.payload);
  });
}

export async function listenToPerformanceEvents(
  callback: (event: PerformanceEvent) => void
): Promise<UnlistenFn> {
  return await listen<PerformanceEvent>('performance-event', (event) => {
    callback(event.payload);
  });
}

export async function listenToSpatialIndexEvents(
  callback: (event: SpatialIndexEvent) => void
): Promise<UnlistenFn> {
  return await listen<SpatialIndexEvent>('spatial-index-event', (event) => {
    callback(event.payload);
  });
}

// Get the store instance for event handling
let storeInstance: any = null;

export function setStoreInstance(store: any) {
  storeInstance = store;
}

// Setup all event listeners
export async function setupEventListeners() {
  // Clear any existing listeners
  for (const unsubscribe of eventUnsubscribers) {
    unsubscribe();
  }
  eventUnsubscribers = [];

  // Layout events
  const layoutUnsub = await listenToLayoutEvents((event) => {
    console.log('Layout event:', event);
    
    if (!storeInstance) {
      console.warn('Store instance not set for event handling');
      return;
    }
    
    // Handle different event types
    switch (event.type) {
      case 'BuildingCreated':
      case 'BuildingUpdated':
        if (event.entityId && event.data) {
          storeInstance.setState((state: any) => ({
            buildings: {
              ...state.buildings,
              [event.entityId!]: event.data
            }
          }));
        }
        break;
        
      case 'BuildingDeleted':
        if (event.entityId) {
          storeInstance.setState((state: any) => {
            const { [event.entityId!]: _, ...rest } = state.buildings;
            return { buildings: rest };
          });
        }
        break;
        
      // Add more cases for other entity types as needed
    }
  });
  eventUnsubscribers.push(layoutUnsub);

  // Performance events
  const perfUnsub = await listenToPerformanceEvents((event) => {
    console.log('Performance:', `${event.operation} took ${event.durationMs}ms` + 
                (event.itemCount ? ` for ${event.itemCount} items` : ''));
  });
  eventUnsubscribers.push(perfUnsub);

  // Spatial index events
  const spatialUnsub = await listenToSpatialIndexEvents((event) => {
    console.log('Spatial index:', `${event.action} affected ${event.affectedCount} items`);
  });
  eventUnsubscribers.push(spatialUnsub);
}

// Cleanup function
export function cleanupEventListeners() {
  for (const unsubscribe of eventUnsubscribers) {
    unsubscribe();
  }
  eventUnsubscribers = [];
}

// Re-export test connection for backwards compatibility
export { testRustConnection };