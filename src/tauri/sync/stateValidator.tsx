import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { LayoutState } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

export interface ValidationError {
  type: 'missing_reference' | 'invalid_position' | 'duplicate_id' | 'type_mismatch';
  entityType: string;
  entityId: string;
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'orphaned_infrastructure' | 'overlapping_entities' | 'performance_concern';
  message: string;
  entityIds?: string[];
}

export interface ValidationStats {
  totalEntities: number;
  buildingCount: number;
  conveyorCount: number;
  pipeCount: number;
  railwayCount: number;
  stickyNoteCount: number;
  connectionCount: number;
  orphanedCount: number;
}

export class StateValidator {
  private store: any;
  private validationCache: Map<string, ValidationResult> = new Map();
  private lastValidationTime: number = 0;
  private validationInterval: number = 10000; // 10 seconds

  constructor(store: any) {
    this.store = store;
  }

  // Comprehensive state validation
  async validateState(force: boolean = false): Promise<ValidationResult> {
    const now = Date.now();
    
    // Use cache if recent and not forced
    if (!force && now - this.lastValidationTime < this.validationInterval) {
      const cached = this.validationCache.get('latest');
      if (cached) return cached;
    }

    const state = this.store.getState();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const stats: ValidationStats = this.calculateStats(state);

    // Validate buildings
    this.validateBuildings(state, errors, warnings);

    // Validate infrastructure
    this.validateConveyors(state, errors, warnings);
    this.validatePipelines(state, errors, warnings);
    this.validateRailways(state, errors, warnings);

    // Check for orphaned infrastructure
    this.checkOrphanedInfrastructure(state, warnings);

    // Check for overlapping entities
    await this.checkOverlappingEntities(state, warnings);

    // Performance checks
    this.checkPerformanceConcerns(state, warnings, stats);

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats,
    };

    // Cache result
    this.validationCache.set('latest', result);
    this.lastValidationTime = now;

    return result;
  }

  // Validate buildings
  private validateBuildings(
    state: LayoutState,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    const buildingIds = new Set<string>();

    Object.entries(state.buildings).forEach(([id, building]) => {
      // Check for duplicate IDs
      if (buildingIds.has(id)) {
        errors.push({
          type: 'duplicate_id',
          entityType: 'building',
          entityId: id,
          message: `Duplicate building ID: ${id}`,
        });
      }
      buildingIds.add(id);

      // Validate position
      if (!this.isValidPosition(building.x, building.y, building.z)) {
        errors.push({
          type: 'invalid_position',
          entityType: 'building',
          entityId: id,
          message: `Invalid position for building ${id}`,
          details: { x: building.x, y: building.y, z: building.z },
        });
      }

      // Validate floor consistency
      const expectedZ = building.floor * 4; // FLOOR_HEIGHT
      if (Math.abs(building.z - expectedZ) > 0.1) {
        warnings.push({
          type: 'performance_concern',
          message: `Building ${id} z-coordinate doesn't match floor height`,
          entityIds: [id],
        });
      }
    });
  }

  // Validate conveyors
  private validateConveyors(
    state: LayoutState,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    Object.entries(state.conveyorSystems).forEach(([id, conveyor]: [string, any]) => {
      // Check building references
      if (conveyor.fromBuildingId && !state.buildings[conveyor.fromBuildingId]) {
        errors.push({
          type: 'missing_reference',
          entityType: 'conveyor',
          entityId: id,
          message: `Conveyor ${id} references missing building: ${conveyor.fromBuildingId}`,
        });
      }

      if (conveyor.toBuildingId && !state.buildings[conveyor.toBuildingId]) {
        errors.push({
          type: 'missing_reference',
          entityType: 'conveyor',
          entityId: id,
          message: `Conveyor ${id} references missing building: ${conveyor.toBuildingId}`,
        });
      }

      // Validate path
      if (!conveyor.points || conveyor.points.length < 2) {
        errors.push({
          type: 'invalid_position',
          entityType: 'conveyor',
          entityId: id,
          message: `Conveyor ${id} has invalid path`,
        });
      }
    });
  }

  // Validate pipelines
  private validatePipelines(
    state: LayoutState,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    Object.entries(state.pipeSystems).forEach(([id, pipe]: [string, any]) => {
      // Similar to conveyor validation
      if (pipe.fromBuildingId && !state.buildings[pipe.fromBuildingId]) {
        errors.push({
          type: 'missing_reference',
          entityType: 'pipe',
          entityId: id,
          message: `Pipeline ${id} references missing building: ${pipe.fromBuildingId}`,
        });
      }

      if (pipe.toBuildingId && !state.buildings[pipe.toBuildingId]) {
        errors.push({
          type: 'missing_reference',
          entityType: 'pipe',
          entityId: id,
          message: `Pipeline ${id} references missing building: ${pipe.toBuildingId}`,
        });
      }
    });
  }

  // Validate railways
  private validateRailways(
    state: LayoutState,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    Object.entries(state.railways).forEach(([id, railway]: [string, any]) => {
      // Check connected buildings exist
      railway.connectedBuildings?.forEach((buildingId: string) => {
        if (!state.buildings[buildingId]) {
          errors.push({
            type: 'missing_reference',
            entityType: 'railway',
            entityId: id,
            message: `Railway ${id} references missing building: ${buildingId}`,
          });
        }
      });

      // Validate nodes
      if (!railway.nodes || railway.nodes.length < 2) {
        errors.push({
          type: 'invalid_position',
          entityType: 'railway',
          entityId: id,
          message: `Railway ${id} has insufficient nodes`,
        });
      }
    });
  }

  // Check for orphaned infrastructure
  private checkOrphanedInfrastructure(state: LayoutState, warnings: ValidationWarning[]) {
    const orphanedConveyors: string[] = [];
    const orphanedPipes: string[] = [];

    // Check conveyors
    Object.entries(state.conveyorSystems).forEach(([id, conveyor]: [string, any]) => {
      if (!conveyor.fromBuildingId && !conveyor.toBuildingId) {
        orphanedConveyors.push(id);
      }
    });

    // Check pipelines
    Object.entries(state.pipeSystems).forEach(([id, pipe]: [string, any]) => {
      if (!pipe.fromBuildingId && !pipe.toBuildingId) {
        orphanedPipes.push(id);
      }
    });

    if (orphanedConveyors.length > 0) {
      warnings.push({
        type: 'orphaned_infrastructure',
        message: `Found ${orphanedConveyors.length} orphaned conveyor(s)`,
        entityIds: orphanedConveyors,
      });
    }

    if (orphanedPipes.length > 0) {
      warnings.push({
        type: 'orphaned_infrastructure',
        message: `Found ${orphanedPipes.length} orphaned pipeline(s)`,
        entityIds: orphanedPipes,
      });
    }
  }

  // Check for overlapping entities using spatial index
  private async checkOverlappingEntities(state: LayoutState, warnings: ValidationWarning[]) {
    try {
      const overlaps = await invoke<Array<[string, string]>>('find_overlapping_entities');
      
      if (overlaps.length > 0) {
        warnings.push({
          type: 'overlapping_entities',
          message: `Found ${overlaps.length} overlapping entity pairs`,
          entityIds: overlaps.flat(),
        });
      }
    } catch (error) {
      console.error('Failed to check overlapping entities:', error);
    }
  }

  // Performance checks
  private checkPerformanceConcerns(
    state: LayoutState,
    warnings: ValidationWarning[],
    stats: ValidationStats
  ) {
    // Too many entities on single floor
    const entitiesPerFloor = new Map<number, number>();
    Object.values(state.buildings).forEach(building => {
      const floor = building.floor;
      entitiesPerFloor.set(floor, (entitiesPerFloor.get(floor) || 0) + 1);
    });

    entitiesPerFloor.forEach((count, floor) => {
      if (count > 500) {
        warnings.push({
          type: 'performance_concern',
          message: `Floor ${floor} has ${count} buildings (may impact performance)`,
        });
      }
    });

    // Very long infrastructure paths
    Object.entries(state.conveyorSystems).forEach(([id, conveyor]: [string, any]) => {
      if (conveyor.points && conveyor.points.length > 100) {
        warnings.push({
          type: 'performance_concern',
          message: `Conveyor ${id} has ${conveyor.points.length} points (consider splitting)`,
          entityIds: [id],
        });
      }
    });
  }

  // Helpers
  private isValidPosition(x: any, y: any, z: any): boolean {
    return (
      typeof x === 'number' && !isNaN(x) && isFinite(x) &&
      typeof y === 'number' && !isNaN(y) && isFinite(y) &&
      typeof z === 'number' && !isNaN(z) && isFinite(z)
    );
  }

  private calculateStats(state: LayoutState): ValidationStats {
    const buildings = Object.keys(state.buildings).length;
    const conveyors = Object.keys(state.conveyorSystems).length;
    const pipes = Object.keys(state.pipeSystems).length;
    const railways = Object.keys(state.railways).length;
    const stickyNotes = Object.keys(state.stickyNotes).length;

    // Count connections
    let connectionCount = 0;
    Object.values(state.conveyorSystems).forEach((conveyor: any) => {
      if (conveyor.fromBuildingId) connectionCount++;
      if (conveyor.toBuildingId) connectionCount++;
    });
    Object.values(state.pipeSystems).forEach((pipe: any) => {
      if (pipe.fromBuildingId) connectionCount++;
      if (pipe.toBuildingId) connectionCount++;
    });

    // Count orphaned
    let orphanedCount = 0;
    Object.values(state.conveyorSystems).forEach((conveyor: any) => {
      if (!conveyor.fromBuildingId && !conveyor.toBuildingId) orphanedCount++;
    });
    Object.values(state.pipeSystems).forEach((pipe: any) => {
      if (!pipe.fromBuildingId && !pipe.toBuildingId) orphanedCount++;
    });

    return {
      totalEntities: buildings + conveyors + pipes + railways + stickyNotes,
      buildingCount: buildings,
      conveyorCount: conveyors,
      pipeCount: pipes,
      railwayCount: railways,
      stickyNoteCount: stickyNotes,
      connectionCount,
      orphanedCount,
    };
  }

  // Export validation report
  async exportValidationReport(): Promise<string> {
    const result = await this.validateState(true);
    const timestamp = new Date().toISOString();

    const report = {
      timestamp,
      version: this.store.getState().version || 0,
      result,
      metadata: {
        validatorVersion: '1.0.0',
        platform: 'tauri',
      },
    };

    return JSON.stringify(report, null, 2);
  }
}

// Debugging component for development
export function StateDebugPanel({ validator }: { validator: StateValidator }) {
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const result = await validator.validateState(true);
      setValidationResult(result);
    } finally {
      setIsValidating(false);
    }
  };

  const exportReport = async () => {
    const report = await validator.exportValidationReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="state-debug-panel">
      <h3>State Validation</h3>
      
      <button onClick={runValidation} disabled={isValidating}>
        {isValidating ? 'Validating...' : 'Run Validation'}
      </button>
      
      {validationResult && (
        <div>
          <div className={`status ${validationResult.isValid ? 'valid' : 'invalid'}`}>
            State is {validationResult.isValid ? 'VALID' : 'INVALID'}
          </div>
          
          {validationResult.errors.length > 0 && (
            <div className="errors">
              <h4>Errors ({validationResult.errors.length})</h4>
              {validationResult.errors.map((error, i) => (
                <div key={i} className="error">
                  {error.type}: {error.message}
                </div>
              ))}
            </div>
          )}
          
          {validationResult.warnings.length > 0 && (
            <div className="warnings">
              <h4>Warnings ({validationResult.warnings.length})</h4>
              {validationResult.warnings.map((warning, i) => (
                <div key={i} className="warning">
                  {warning.type}: {warning.message}
                </div>
              ))}
            </div>
          )}
          
          <div className="stats">
            <h4>Statistics</h4>
            <ul>
              <li>Total Entities: {validationResult.stats.totalEntities}</li>
              <li>Buildings: {validationResult.stats.buildingCount}</li>
              <li>Conveyors: {validationResult.stats.conveyorCount}</li>
              <li>Pipelines: {validationResult.stats.pipeCount}</li>
              <li>Railways: {validationResult.stats.railwayCount}</li>
              <li>Connections: {validationResult.stats.connectionCount}</li>
              <li>Orphaned: {validationResult.stats.orphanedCount}</li>
            </ul>
          </div>
          
          <button onClick={exportReport}>Export Report</button>
        </div>
      )}
    </div>
  );
}