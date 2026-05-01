// src/utils/SpatialGrid.ts
import { Point3D } from '../types';

/**
 * A spatial indexing data structure that divides 3D space into cells
 * for efficient proximity queries. Optimized for the Satisfactory layout tool
 * where z-levels are discrete (4-meter spacing).
 */
export class SpatialGrid<T extends { id: string; x: number; y: number; z: number }> {
  private cellSize: number;
  private cells: Map<string, Set<T>>;
  private entityToCell: Map<string, string>;
  
  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.entityToCell = new Map();
  }

  /**
   * Generates a unique key for a cell based on 3D coordinates
   * Z coordinate is normalized by floor levels (4-meter spacing)
   */
  private getCellKey(x: number, y: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const cellZ = Math.floor(z / 4); // Normalize by floor height
    return `${cellX},${cellY},${cellZ}`;
  }

  /**
   * Gets all cell keys that could contain entities within the given radius
   */
  private getNearbyCellKeys(point: Point3D, radius: number): string[] {
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(point.x / this.cellSize);
    const centerCellY = Math.floor(point.y / this.cellSize);
    const centerCellZ = Math.floor(point.z / 4);
    
    const nearbyCells: string[] = [];
    
    // Check all cells within the radius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -1; dz <= 1; dz++) { // Usually only check current floor and adjacent
          const cellX = centerCellX + dx;
          const cellY = centerCellY + dy;
          const cellZ = centerCellZ + dz;
          nearbyCells.push(`${cellX},${cellY},${cellZ}`);
        }
      }
    }
    
    return nearbyCells;
  }

  /**
   * Inserts an entity into the spatial grid
   */
  insert(entity: T): void {
    this.remove(entity.id); // Remove from old cell if exists
    
    const cellKey = this.getCellKey(entity.x, entity.y, entity.z);
    
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, new Set());
    }
    
    this.cells.get(cellKey)!.add(entity);
    this.entityToCell.set(entity.id, cellKey);
  }

  /**
   * Removes an entity from the spatial grid by ID
   */
  remove(entityId: string): void {
    const cellKey = this.entityToCell.get(entityId);
    if (!cellKey) return;
    
    const cell = this.cells.get(cellKey);
    if (cell) {
      // Find and remove the entity from the cell
      cell.forEach(entity => {
        if (entity.id === entityId) {
          cell.delete(entity);
        }
      });
      
      // Clean up empty cells
      if (cell.size === 0) {
        this.cells.delete(cellKey);
      }
    }
    
    this.entityToCell.delete(entityId);
  }

  /**
   * Updates an entity's position in the spatial grid
   */
  update(entity: T): void {
    const oldCellKey = this.entityToCell.get(entity.id);
    const newCellKey = this.getCellKey(entity.x, entity.y, entity.z);
    
    if (oldCellKey !== newCellKey) {
      this.insert(entity); // This handles removal from old cell
    } else if (oldCellKey) {
      // Update the entity reference in the same cell
      const cell = this.cells.get(oldCellKey);
      if (cell) {
        // Remove old reference and add new one
        let found = false;
        cell.forEach(e => {
          if (e.id === entity.id && !found) {
            cell.delete(e);
            cell.add(entity);
            found = true;
          }
        });
      }
    }
  }

  /**
   * Queries all entities within a radius of a point
   * Returns entities sorted by distance
   */
  queryRadius(point: Point3D, radius: number, excludeIds: string[] = []): T[] {
    const radiusSquared = radius * radius;
    const results: Array<{ entity: T; distanceSquared: number }> = [];
    const excludeSet = new Set(excludeIds);
    
    // Get all cells that could contain entities within radius
    const nearbyCellKeys = this.getNearbyCellKeys(point, radius);
    
    for (const cellKey of nearbyCellKeys) {
      const cell = this.cells.get(cellKey);
      if (!cell) continue;
      
      cell.forEach(entity => {
        if (excludeSet.has(entity.id)) return;
        
        // Calculate squared distance (avoid sqrt for performance)
        const dx = entity.x - point.x;
        const dy = entity.y - point.y;
        const dz = entity.z - point.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        
        if (distanceSquared <= radiusSquared) {
          results.push({ entity, distanceSquared });
        }
      });
    }
    
    // Sort by distance and return entities
    return results
      .sort((a, b) => a.distanceSquared - b.distanceSquared)
      .map(r => r.entity);
  }

  /**
   * Clears all entities from the grid
   */
  clear(): void {
    this.cells.clear();
    this.entityToCell.clear();
  }

  /**
   * Gets the total number of entities in the grid
   */
  get size(): number {
    return this.entityToCell.size;
  }

  /**
   * Gets statistics about the spatial grid for debugging/optimization
   */
  getStats(): {
    totalEntities: number;
    totalCells: number;
    avgEntitiesPerCell: number;
    maxEntitiesInCell: number;
  } {
    let maxEntitiesInCell = 0;
    let totalEntitiesInCells = 0;
    
    this.cells.forEach(cell => {
      const cellSize = cell.size;
      totalEntitiesInCells += cellSize;
      maxEntitiesInCell = Math.max(maxEntitiesInCell, cellSize);
    });
    
    const totalCells = this.cells.size;
    
    return {
      totalEntities: this.entityToCell.size,
      totalCells,
      avgEntitiesPerCell: totalCells > 0 ? totalEntitiesInCells / totalCells : 0,
      maxEntitiesInCell,
    };
  }
}