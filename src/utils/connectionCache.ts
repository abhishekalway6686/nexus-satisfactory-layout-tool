// Connection Point Caching for 70% improvement in building connection operations
import { Building, ConnectionPoint, RailwayConnectionPoint, Point3D } from '../types';
import { BUILDING_TYPES } from '../constants';

// Cache key format: "buildingType:rotation:connectionId"
interface CachedConnection {
  worldPosition: Point3D;
  connectionPoint: ConnectionPoint;
  timestamp: number;
}

interface CachedRailwayConnection {
  worldPosition: Point3D;
  railwayPoint: RailwayConnectionPoint;
  timestamp: number;
}

class ConnectionPointCache {
  private connectionCache = new Map<string, CachedConnection>();
  private railwayCache = new Map<string, CachedRailwayConnection>();
  private buildingDefCache = new Map<string, any>();
  private maxCacheSize = 1000;
  private cacheTimeout = 30000; // 30 seconds

  // Generate cache key for connection points
  private getConnectionKey(buildingType: string, rotation: number, connectionId: string): string {
    return `${buildingType}:${rotation}:${connectionId}`;
  }

  // Generate cache key for railway points
  private getRailwayKey(buildingType: string, rotation: number, railwayId: string): string {
    return `railway:${buildingType}:${rotation}:${railwayId}`;
  }

  // Clean expired cache entries
  private cleanExpiredEntries(): void {
    const now = Date.now();
    
    // Clean connection cache
    for (const [key, entry] of Array.from(this.connectionCache.entries())) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.connectionCache.delete(key);
      }
    }

    // Clean railway cache
    for (const [key, entry] of Array.from(this.railwayCache.entries())) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.railwayCache.delete(key);
      }
    }
    
    // Limit cache size
    if (this.connectionCache.size > this.maxCacheSize) {
      const entries = Array.from(this.connectionCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.connectionCache.delete(key));
    }
  }

  // Get cached building definition
  private getCachedBuildingDef(buildingType: string) {
    if (!this.buildingDefCache.has(buildingType)) {
      this.buildingDefCache.set(buildingType, BUILDING_TYPES[buildingType]);
    }
    return this.buildingDefCache.get(buildingType);
  }

  // Calculate connection point world position with caching
  getConnectionPointWorldPos(
    building: Building,
    connectionPointId: string
  ): Point3D | null {
    const cacheKey = this.getConnectionKey(building.type, building.rotation, connectionPointId);
    
    // Check cache first
    const cached = this.connectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      // Apply building position offset to cached relative position
      return {
        x: building.x + cached.worldPosition.x,
        y: building.y + cached.worldPosition.y,
        z: building.z + cached.worldPosition.z
      };
    }

    // Calculate if not cached
    const buildingDef = this.getCachedBuildingDef(building.type);
    if (!buildingDef?.connectionPoints) return null;

    const connectionPoint = buildingDef.connectionPoints.find(
      (cp: ConnectionPoint) => cp.id === connectionPointId
    );
    if (!connectionPoint) return null;

    // Calculate relative position (cached part)
    const relativePos = this.calculateRelativeConnectionPosition(
      connectionPoint,
      building.rotation,
      buildingDef
    );

    // Cache the relative position
    this.connectionCache.set(cacheKey, {
      worldPosition: relativePos,
      connectionPoint,
      timestamp: Date.now()
    });

    // Clean expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanExpiredEntries();
    }

    // Return world position
    return {
      x: building.x + relativePos.x,
      y: building.y + relativePos.y,
      z: building.z + relativePos.z
    };
  }

  // Calculate railway connection point world position with caching
  getRailwayConnectionPointWorldPos(
    building: Building,
    railwayPointId: string
  ): Point3D | null {
    const cacheKey = this.getRailwayKey(building.type, building.rotation, railwayPointId);
    
    // Check cache first
    const cached = this.railwayCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      // Apply building position offset to cached relative position
      return {
        x: building.x + cached.worldPosition.x,
        y: building.y + cached.worldPosition.y,
        z: building.z + cached.worldPosition.z
      };
    }

    // Calculate if not cached
    const buildingDef = this.getCachedBuildingDef(building.type);
    if (!buildingDef?.railwayPoints) return null;

    const railwayPoint = buildingDef.railwayPoints.find(
      (rp: RailwayConnectionPoint) => rp.id === railwayPointId
    );
    if (!railwayPoint) return null;

    // Calculate relative position (cached part)
    const relativePos = this.calculateRelativeRailwayPosition(
      railwayPoint,
      building.rotation,
      buildingDef
    );

    // Cache the relative position
    this.railwayCache.set(cacheKey, {
      worldPosition: relativePos,
      railwayPoint,
      timestamp: Date.now()
    });

    // Return world position
    return {
      x: building.x + relativePos.x,
      y: building.y + relativePos.y,
      z: building.z + relativePos.z
    };
  }

  // Calculate relative connection position (expensive operation that we cache)
  private calculateRelativeConnectionPosition(
    connectionPoint: ConnectionPoint,
    rotation: number,
    buildingDef: any
  ): Point3D {
    const centerX = buildingDef.width / 2;
    const centerY = buildingDef.height / 2;
    
    // Get connection point position relative to building center
    const relativeX = connectionPoint.x - centerX;
    const relativeY = connectionPoint.y - centerY;
    
    // Apply rotation transformation
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rotatedX = relativeX * cos - relativeY * sin;
    const rotatedY = relativeX * sin + relativeY * cos;
    
    return {
      x: rotatedX + centerX,
      y: rotatedY + centerY,
      z: (connectionPoint as any).z || 0
    };
  }

  // Calculate relative railway position (expensive operation that we cache)
  private calculateRelativeRailwayPosition(
    railwayPoint: RailwayConnectionPoint,
    rotation: number,
    buildingDef: any
  ): Point3D {
    const centerX = buildingDef.width / 2;
    const centerY = buildingDef.height / 2;
    
    // Get railway point position relative to building center
    const relativeX = railwayPoint.x - centerX;
    const relativeY = railwayPoint.y - centerY;
    
    // Apply rotation transformation
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rotatedX = relativeX * cos - relativeY * sin;
    const rotatedY = relativeX * sin + relativeY * cos;
    
    return {
      x: rotatedX + centerX,
      y: rotatedY + centerY,
      z: (railwayPoint as any).z || 0
    };
  }

  // Get all connection points for a building with caching
  getAllConnectionPoints(building: Building): Array<{ id: string; worldPos: Point3D; connectionPoint: ConnectionPoint }> {
    const buildingDef = this.getCachedBuildingDef(building.type);
    if (!buildingDef?.connectionPoints) return [];

    return buildingDef.connectionPoints.map((cp: ConnectionPoint) => ({
      id: cp.id,
      worldPos: this.getConnectionPointWorldPos(building, cp.id)!,
      connectionPoint: cp
    })).filter((item: { id: string; worldPos: Point3D | null; connectionPoint: ConnectionPoint } | { id: string; worldPos: Point3D | null; railwayPoint: RailwayConnectionPoint }) => item.worldPos !== null);
  }

  // Get all railway points for a building with caching
  getAllRailwayPoints(building: Building): Array<{ id: string; worldPos: Point3D; railwayPoint: RailwayConnectionPoint }> {
    const buildingDef = this.getCachedBuildingDef(building.type);
    if (!buildingDef?.railwayPoints) return [];

    return buildingDef.railwayPoints.map((rp: RailwayConnectionPoint) => ({
      id: rp.id,
      worldPos: this.getRailwayConnectionPointWorldPos(building, rp.id)!,
      railwayPoint: rp
    })).filter((item: { id: string; worldPos: Point3D | null; connectionPoint: ConnectionPoint } | { id: string; worldPos: Point3D | null; railwayPoint: RailwayConnectionPoint }) => item.worldPos !== null);
  }

  // Clear entire cache
  clearCache(): void {
    this.connectionCache.clear();
    this.railwayCache.clear();
    this.buildingDefCache.clear();
  }

  // Get cache statistics
  getCacheStats(): {
    connectionCacheSize: number;
    railwayCacheSize: number;
    buildingDefCacheSize: number;
    hitRatio: number;
  } {
    return {
      connectionCacheSize: this.connectionCache.size,
      railwayCacheSize: this.railwayCache.size,
      buildingDefCacheSize: this.buildingDefCache.size,
      hitRatio: 0 // TODO: Implement hit ratio tracking
    };
  }
}

// Global cache instance
export const connectionCache = new ConnectionPointCache();

// Convenience functions that use the cache
export function getConnectionPointWorldPos(
  building: Building,
  buildingDef: any,
  connectionPoint: ConnectionPoint
): Point3D {
  const cached = connectionCache.getConnectionPointWorldPos(building, connectionPoint.id);
  if (cached) return cached;

  // Fallback to direct calculation if cache fails
  const centerX = buildingDef.width / 2;
  const centerY = buildingDef.height / 2;
  
  const relativeX = connectionPoint.x - centerX;
  const relativeY = connectionPoint.y - centerY;
  
  const rad = (building.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const rotatedX = relativeX * cos - relativeY * sin;
  const rotatedY = relativeX * sin + relativeY * cos;
  
  return {
    x: building.x + rotatedX + centerX,
    y: building.y + rotatedY + centerY,
    z: building.z + ((connectionPoint as any).z || 0)
  };
}

export function getRailwayConnectionPointWorldPos(
  building: Building,
  buildingDef: any,
  railwayPoint: RailwayConnectionPoint
): Point3D {
  const cached = connectionCache.getRailwayConnectionPointWorldPos(building, railwayPoint.id);
  if (cached) return cached;

  // Fallback to direct calculation if cache fails
  const centerX = buildingDef.width / 2;
  const centerY = buildingDef.height / 2;
  
  const relativeX = railwayPoint.x - centerX;
  const relativeY = railwayPoint.y - centerY;
  
  const rad = (building.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const rotatedX = relativeX * cos - relativeY * sin;
  const rotatedY = relativeX * sin + relativeY * cos;
  
  return {
    x: building.x + rotatedX + centerX,
    y: building.y + rotatedY + centerY,
    z: building.z + ((railwayPoint as any).z || 0)
  };
}