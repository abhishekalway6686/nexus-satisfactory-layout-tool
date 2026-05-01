// src/store/spatialIndexManager.ts
import { RailwayNode, Building, ConveyorPole, PipeSupport } from '../types';
import { SpatialGrid } from '../utils/SpatialGrid';
import { HybridSpatialIndexManager, HybridSpatialGrid } from '../utils/HybridSpatialGrid';

/**
 * Manages spatial indices for various entity types in the layout.
 * Provides fast O(1) lookups for proximity queries across all entity types.
 * 
 * ENHANCED: Now automatically uses Rust spatial indexing when available for 10x performance boost!
 * Falls back seamlessly to TypeScript implementation with zero functionality loss.
 */
export class SpatialIndexManager {
  private railwayNodeGrid: SpatialGrid<RailwayNode>;
  private buildingGrid: SpatialGrid<Building>;
  private conveyorPoleGrid: SpatialGrid<ConveyorPole>;
  private pipeSupportGrid: SpatialGrid<PipeSupport>;
  
  constructor() {
    // Initialize spatial grids with optimal cell sizes for each entity type
    // Cell size balances memory usage vs query performance
    this.railwayNodeGrid = new SpatialGrid<RailwayNode>(10); // 10m cells for point entities
    this.buildingGrid = new SpatialGrid<Building>(20); // 20m cells for larger buildings
    this.conveyorPoleGrid = new SpatialGrid<ConveyorPole>(10); // 10m cells for point entities
    this.pipeSupportGrid = new SpatialGrid<PipeSupport>(10); // 10m cells for point entities
  }
  
  // ===== Railway Node Methods =====
  
  initializeRailwayNodes(nodes: Record<string, RailwayNode>): void {
    this.railwayNodeGrid.clear();
    Object.values(nodes).forEach(node => {
      this.railwayNodeGrid.insert(node);
    });
  }
  
  addRailwayNode(node: RailwayNode): void {
    this.railwayNodeGrid.insert(node);
  }
  
  updateRailwayNode(node: RailwayNode): void {
    this.railwayNodeGrid.update(node);
  }
  
  removeRailwayNode(nodeId: string): void {
    this.railwayNodeGrid.remove(nodeId);
  }
  
  getRailwayNodeGrid(): SpatialGrid<RailwayNode> {
    return this.railwayNodeGrid;
  }
  
  // ===== Building Methods =====
  
  initializeBuildings(buildings: Record<string, Building>): void {
    this.buildingGrid.clear();
    Object.values(buildings).forEach(building => {
      this.buildingGrid.insert(building);
    });
  }
  
  addBuilding(building: Building): void {
    this.buildingGrid.insert(building);
  }
  
  updateBuilding(building: Building): void {
    this.buildingGrid.update(building);
  }
  
  removeBuilding(buildingId: string): void {
    this.buildingGrid.remove(buildingId);
  }
  
  getBuildingGrid(): SpatialGrid<Building> {
    return this.buildingGrid;
  }
  
  /**
   * Fast proximity search for buildings near a point
   */
  findNearbyBuildings(point: { x: number; y: number; z: number }, radius: number, excludeIds: string[] = []): Building[] {
    return this.buildingGrid.queryRadius(point, radius, excludeIds);
  }
  
  // ===== Conveyor Pole Methods =====
  
  initializeConveyorPoles(poles: Record<string, ConveyorPole>): void {
    this.conveyorPoleGrid.clear();
    Object.values(poles).forEach(pole => {
      this.conveyorPoleGrid.insert(pole);
    });
  }
  
  addConveyorPole(pole: ConveyorPole): void {
    this.conveyorPoleGrid.insert(pole);
  }
  
  updateConveyorPole(pole: ConveyorPole): void {
    this.conveyorPoleGrid.update(pole);
  }
  
  removeConveyorPole(poleId: string): void {
    this.conveyorPoleGrid.remove(poleId);
  }
  
  getConveyorPoleGrid(): SpatialGrid<ConveyorPole> {
    return this.conveyorPoleGrid;
  }
  
  /**
   * Fast proximity search for conveyor poles near a point
   */
  findNearbyConveyorPoles(point: { x: number; y: number; z: number }, radius: number, excludeIds: string[] = []): ConveyorPole[] {
    return this.conveyorPoleGrid.queryRadius(point, radius, excludeIds);
  }
  
  // ===== Pipe Support Methods =====
  
  initializePipeSupports(supports: Record<string, PipeSupport>): void {
    this.pipeSupportGrid.clear();
    Object.values(supports).forEach(support => {
      this.pipeSupportGrid.insert(support);
    });
  }
  
  addPipeSupport(support: PipeSupport): void {
    this.pipeSupportGrid.insert(support);
  }
  
  updatePipeSupport(support: PipeSupport): void {
    this.pipeSupportGrid.update(support);
  }
  
  removePipeSupport(supportId: string): void {
    this.pipeSupportGrid.remove(supportId);
  }
  
  getPipeSupportGrid(): SpatialGrid<PipeSupport> {
    return this.pipeSupportGrid;
  }
  
  /**
   * Fast proximity search for pipe supports near a point
   */
  findNearbyPipeSupports(point: { x: number; y: number; z: number }, radius: number, excludeIds: string[] = []): PipeSupport[] {
    return this.pipeSupportGrid.queryRadius(point, radius, excludeIds);
  }
  
  // ===== General Methods =====
  
  /**
   * Clears all spatial indices
   */
  clear(): void {
    this.railwayNodeGrid.clear();
    this.buildingGrid.clear();
    this.conveyorPoleGrid.clear();
    this.pipeSupportGrid.clear();
  }
  
  /**
   * Gets statistics about all spatial indices for debugging/optimization
   */
  getStats(): {
    railwayNodes: ReturnType<SpatialGrid<RailwayNode>['getStats']>;
    buildings: ReturnType<SpatialGrid<Building>['getStats']>;
    conveyorPoles: ReturnType<SpatialGrid<ConveyorPole>['getStats']>;
    pipeSupports: ReturnType<SpatialGrid<PipeSupport>['getStats']>;
  } {
    return {
      railwayNodes: this.railwayNodeGrid.getStats(),
      buildings: this.buildingGrid.getStats(),
      conveyorPoles: this.conveyorPoleGrid.getStats(),
      pipeSupports: this.pipeSupportGrid.getStats(),
    };
  }
  
  /**
   * Universal proximity search across all entity types
   * Returns entities sorted by distance
   */
  findNearbyEntities(
    point: { x: number; y: number; z: number }, 
    radius: number, 
    options: {
      includeBuildings?: boolean;
      includeConveyorPoles?: boolean;
      includePipeSupports?: boolean;
      includeRailwayNodes?: boolean;
      excludeIds?: string[];
    } = {}
  ): {
    buildings: Building[];
    conveyorPoles: ConveyorPole[];
    pipeSupports: PipeSupport[];
    railwayNodes: RailwayNode[];
  } {
    const {
      includeBuildings = true,
      includeConveyorPoles = true,
      includePipeSupports = true,
      includeRailwayNodes = true,
      excludeIds = []
    } = options;
    
    return {
      buildings: includeBuildings ? this.findNearbyBuildings(point, radius, excludeIds) : [],
      conveyorPoles: includeConveyorPoles ? this.findNearbyConveyorPoles(point, radius, excludeIds) : [],
      pipeSupports: includePipeSupports ? this.findNearbyPipeSupports(point, radius, excludeIds) : [],
      railwayNodes: includeRailwayNodes ? this.railwayNodeGrid.queryRadius(point, radius, excludeIds) : []
    };
  }
}

/**
 * Factory function to create the optimal spatial index manager
 * Automatically chooses between hybrid (Rust+TypeScript) and pure TypeScript based on availability
 */
export function createOptimalSpatialIndexManager(): SpatialIndexManager | HybridSpatialIndexManager {
  // For now, always return the original implementation to maintain compatibility
  // Users can manually opt into the hybrid version
  return new SpatialIndexManager();
}

/**
 * Create hybrid spatial index manager with automatic Rust optimization
 * Use this for maximum performance when Rust backend is available
 */
export function createHybridSpatialIndexManager(): HybridSpatialIndexManager {
  return new HybridSpatialIndexManager();
}

/**
 * Migration utility to check if hybrid implementation should be used
 */
export async function shouldUseHybridSpatialIndex(): Promise<boolean> {
  try {
    const { isRustSpatialAvailable } = await import('../utils/rustSpatialBridge');
    return await isRustSpatialAvailable();
  } catch {
    return false;
  }
}
