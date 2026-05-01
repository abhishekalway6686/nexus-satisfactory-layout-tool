import { invoke } from '@tauri-apps/api/tauri';
import { Building, ConveyorSystem, Pipeline, Railway } from '../../types';
import { StateSynchronizer } from './stateSynchronizer';

export interface BatchOperation {
  id: string;
  type: 'move' | 'rotate' | 'delete' | 'create';
  entities: EntityOperation[];
  timestamp: number;
}

export interface EntityOperation {
  entityType: 'building' | 'conveyor' | 'pipe' | 'railway';
  entityId: string;
  operation: any;
  dependencies?: string[]; // IDs of entities this operation depends on
}

export interface UndoableOperation {
  id: string;
  forward: () => Promise<void>;
  backward: () => Promise<void>;
  description: string;
}

export class ComplexOperationCoordinator {
  private store: any;
  private synchronizer: StateSynchronizer;
  private pendingOperations: Map<string, BatchOperation> = new Map();
  private operationHistory: UndoableOperation[] = [];
  private redoStack: UndoableOperation[] = [];
  private isExecuting: boolean = false;

  constructor(store: any, synchronizer: StateSynchronizer) {
    this.store = store;
    this.synchronizer = synchronizer;
  }

  // Move multiple buildings with cascading infrastructure updates
  async moveBuildingsWithInfrastructure(
    buildingMoves: Array<{ id: string; dx: number; dy: number; dz?: number }>
  ): Promise<void> {
    const operationId = this.generateOperationId();
    const entities: EntityOperation[] = [];
    const state = this.store.getState();

    // First, collect all affected buildings
    const affectedBuildings = new Set<string>();
    const infrastructureUpdates = new Map<string, any>();

    for (const move of buildingMoves) {
      affectedBuildings.add(move.id);
      
      // Find connected infrastructure
      const building = state.buildings[move.id];
      if (!building) continue;

      // Check conveyors
      Object.entries(state.conveyorSystems).forEach(([conveyorId, conveyor]: [string, any]) => {
        if (conveyor.fromBuildingId === move.id || conveyor.toBuildingId === move.id) {
          infrastructureUpdates.set(`conveyor-${conveyorId}`, {
            type: 'conveyor',
            id: conveyorId,
            updates: this.calculateConveyorUpdate(conveyor, move, building),
          });
        }
      });

      // Check pipelines
      Object.entries(state.pipeSystems).forEach(([pipeId, pipe]: [string, any]) => {
        if (pipe.fromBuildingId === move.id || pipe.toBuildingId === move.id) {
          infrastructureUpdates.set(`pipe-${pipeId}`, {
            type: 'pipe',
            id: pipeId,
            updates: this.calculatePipeUpdate(pipe, move, building),
          });
        }
      });
    }

    // Create operation batch
    const batch: BatchOperation = {
      id: operationId,
      type: 'move',
      entities: [
        // Building moves
        ...buildingMoves.map(move => ({
          entityType: 'building' as const,
          entityId: move.id,
          operation: move,
        })),
        // Infrastructure updates
        ...Array.from(infrastructureUpdates.values()).map(update => ({
          entityType: update.type,
          entityId: update.id,
          operation: update.updates,
          dependencies: [update.connectedBuildingId],
        })),
      ],
      timestamp: Date.now(),
    };

    // Execute with optimistic updates
    await this.executeBatchOperation(batch);
  }

  // Multi-selection operations
  async performMultiSelection(
    entityIds: string[],
    operation: 'delete' | 'duplicate' | 'group'
  ): Promise<void> {
    const operationId = this.generateOperationId();
    const state = this.store.getState();
    const entities: EntityOperation[] = [];

    // Categorize selected entities
    const selectedBuildings: string[] = [];
    const selectedConveyors: string[] = [];
    const selectedPipes: string[] = [];
    const selectedRailways: string[] = [];

    entityIds.forEach(id => {
      if (state.buildings[id]) selectedBuildings.push(id);
      else if (state.conveyorSystems[id]) selectedConveyors.push(id);
      else if (state.pipeSystems[id]) selectedPipes.push(id);
      else if (state.railways[id]) selectedRailways.push(id);
    });

    switch (operation) {
      case 'delete':
        // Order matters: delete infrastructure before buildings
        [...selectedConveyors, ...selectedPipes, ...selectedRailways].forEach(id => {
          entities.push({
            entityType: this.getEntityType(id, state),
            entityId: id,
            operation: { type: 'delete' },
          });
        });
        
        selectedBuildings.forEach(id => {
          entities.push({
            entityType: 'building',
            entityId: id,
            operation: { type: 'delete' },
          });
        });
        break;

      case 'duplicate':
        // Duplicate buildings first, then infrastructure
        const buildingIdMap = new Map<string, string>();
        
        selectedBuildings.forEach(id => {
          const newId = this.generateEntityId();
          buildingIdMap.set(id, newId);
          
          const building = state.buildings[id];
          entities.push({
            entityType: 'building',
            entityId: newId,
            operation: {
              type: 'create',
              data: {
                ...building,
                id: newId,
                x: building.x + 10, // Offset duplicates
                y: building.y + 10,
              },
            },
          });
        });

        // Duplicate infrastructure with updated references
        selectedConveyors.forEach(id => {
          const conveyor = state.conveyorSystems[id];
          const newId = this.generateEntityId();
          
          entities.push({
            entityType: 'conveyor',
            entityId: newId,
            operation: {
              type: 'create',
              data: {
                ...conveyor,
                id: newId,
                fromBuildingId: buildingIdMap.get(conveyor.fromBuildingId) || conveyor.fromBuildingId,
                toBuildingId: buildingIdMap.get(conveyor.toBuildingId) || conveyor.toBuildingId,
              },
            },
            dependencies: [
              buildingIdMap.get(conveyor.fromBuildingId),
              buildingIdMap.get(conveyor.toBuildingId),
            ].filter(Boolean),
          });
        });
        break;
    }

    const batch: BatchOperation = {
      id: operationId,
      type: operation as any,
      entities,
      timestamp: Date.now(),
    };

    await this.executeBatchOperation(batch);
  }

  // Execute drawing operations with real-time preview
  async executeDrawingOperation(
    type: 'conveyor' | 'pipe' | 'railway',
    points: Array<{ x: number; y: number; z: number }>,
    metadata: any
  ): Promise<void> {
    // Send preview updates during drawing
    const previewId = `preview-${this.generateOperationId()}`;
    
    // Update preview in real-time
    this.store.setState((state: any) => ({
      drawingPreviews: {
        ...state.drawingPreviews,
        [previewId]: {
          type,
          points,
          metadata,
          timestamp: Date.now(),
        },
      },
    }));

    // Finalize drawing
    try {
      const result = await invoke(`create_${type}_system`, {
        points,
        ...metadata,
      });

      // Remove preview and add final result
      this.store.setState((state: any) => {
        const { [previewId]: _, ...remainingPreviews } = state.drawingPreviews;
        return {
          drawingPreviews: remainingPreviews,
          [`${type}Systems`]: {
            ...state[`${type}Systems`],
            [result.id]: result,
          },
        };
      });
    } catch (error) {
      // Remove preview on error
      this.store.setState((state: any) => {
        const { [previewId]: _, ...remainingPreviews } = state.drawingPreviews;
        return { drawingPreviews: remainingPreviews };
      });
      throw error;
    }
  }

  // Undo/Redo synchronization
  async undo(): Promise<void> {
    if (this.operationHistory.length === 0) return;

    const operation = this.operationHistory.pop()!;
    
    try {
      // Execute undo in Rust
      await invoke('undo_operation');
      
      // Move to redo stack
      this.redoStack.push(operation);
    } catch (error) {
      // Restore to history on failure
      this.operationHistory.push(operation);
      throw error;
    }
  }

  async redo(): Promise<void> {
    if (this.redoStack.length === 0) return;

    const operation = this.redoStack.pop()!;
    
    try {
      // Execute redo in Rust
      await invoke('redo_operation');
      
      // Move back to history
      this.operationHistory.push(operation);
    } catch (error) {
      // Restore to redo stack on failure
      this.redoStack.push(operation);
      throw error;
    }
  }

  // Private helper methods
  private async executeBatchOperation(batch: BatchOperation): Promise<void> {
    if (this.isExecuting) {
      throw new Error('Another operation is in progress');
    }

    this.isExecuting = true;
    this.pendingOperations.set(batch.id, batch);

    try {
      // Sort operations by dependencies
      const sortedOps = this.topologicalSort(batch.entities);

      // Execute operations in order
      for (const op of sortedOps) {
        await this.executeSingleOperation(op);
      }

      // Record for undo
      const undoable: UndoableOperation = {
        id: batch.id,
        forward: async () => {
          await invoke('execute_batch_operation', { batch });
        },
        backward: async () => {
          await invoke('undo_batch_operation', { batchId: batch.id });
        },
        description: `${batch.type} ${batch.entities.length} entities`,
      };

      this.operationHistory.push(undoable);
      this.redoStack = []; // Clear redo stack on new operation

    } finally {
      this.pendingOperations.delete(batch.id);
      this.isExecuting = false;
    }
  }

  private async executeSingleOperation(op: EntityOperation): Promise<void> {
    await this.synchronizer.performOptimisticUpdate(
      () => {
        // Apply update to local state immediately
        this.applyOperationToState(op);
      },
      () => {
        // Rollback on failure
        this.rollbackOperation(op);
      },
      async () => {
        // Confirm with backend
        await invoke(`execute_entity_operation`, { operation: op });
      }
    );
  }

  private applyOperationToState(op: EntityOperation): void {
    // Implementation depends on operation type
    // This would update the Zustand store directly
  }

  private rollbackOperation(op: EntityOperation): void {
    // Reverse the operation in local state
  }

  private topologicalSort(operations: EntityOperation[]): EntityOperation[] {
    // Sort operations based on dependencies
    const sorted: EntityOperation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (op: EntityOperation) => {
      if (visited.has(op.entityId)) return;
      if (visiting.has(op.entityId)) {
        throw new Error('Circular dependency detected');
      }

      visiting.add(op.entityId);

      if (op.dependencies) {
        for (const dep of op.dependencies) {
          const depOp = operations.find(o => o.entityId === dep);
          if (depOp) visit(depOp);
        }
      }

      visiting.delete(op.entityId);
      visited.add(op.entityId);
      sorted.push(op);
    };

    operations.forEach(visit);
    return sorted;
  }

  private calculateConveyorUpdate(conveyor: any, move: any, building: any): any {
    // Calculate new anchor points based on building movement
    return {
      type: 'update_anchors',
      anchors: conveyor.points.map((point: any) => {
        if (this.isNearBuilding(point, building)) {
          return {
            x: point.x + move.dx,
            y: point.y + move.dy,
            z: point.z + (move.dz || 0),
          };
        }
        return point;
      }),
    };
  }

  private calculatePipeUpdate(pipe: any, move: any, building: any): any {
    // Similar to conveyor update
    return this.calculateConveyorUpdate(pipe, move, building);
  }

  private isNearBuilding(point: any, building: any): boolean {
    const threshold = 2.0; // meters
    const dx = point.x - building.x;
    const dy = point.y - building.y;
    const dz = point.z - building.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < threshold;
  }

  private getEntityType(id: string, state: any): 'building' | 'conveyor' | 'pipe' | 'railway' {
    if (state.buildings[id]) return 'building';
    if (state.conveyorSystems[id]) return 'conveyor';
    if (state.pipeSystems[id]) return 'pipe';
    if (state.railways[id]) return 'railway';
    throw new Error(`Unknown entity type for ID: ${id}`);
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEntityId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}