// src/utils/powerlineCache.ts
import { Point3D } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

interface DistanceCacheKey {
  from: Point3D;
  to: Point3D;
}

interface HangingCurveCacheKey {
  from: Point3D;
  to: Point3D;
  sag: number;
}

/**
 * High-performance cache for powerline calculations with automatic expiration
 * Optimized for real-time drawing performance with aggressive memory management
 */
class PowerlineCache {
  private distanceCache = new Map<string, CacheEntry<number>>();
  private hangingCurveCache = new Map<string, CacheEntry<Point3D[]>>();
  private validationCache = new Map<string, CacheEntry<boolean>>();
  
  // Optimized cache configuration for large layouts
  private readonly DISTANCE_CACHE_TTL = 120000; // 2 minutes (longer for distance)
  private readonly CURVE_CACHE_TTL = 60000; // 1 minute
  private readonly VALIDATION_CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 2000; // Increased for large layouts
  private readonly CLEANUP_THRESHOLD = 1500; // Start cleanup earlier
  
  // Performance tracking
  private hits = 0;
  private misses = 0;
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 30000; // More frequent cleanup
  
  // Pre-computed key pools to reduce string allocation
  private keyPool = new Map<string, string>();
  private keyPoolSize = 0;
  private readonly MAX_KEY_POOL_SIZE = 1000;

  /**
   * Optimized cache key generation with pre-computed key pooling
   */
  private generateDistanceKey(from: Point3D, to: Point3D): string {
    // Use integer rounding for better performance and consistent keys
    const fx = Math.round(from.x * 100);
    const fy = Math.round(from.y * 100);
    const fz = Math.round(from.z * 100);
    const tx = Math.round(to.x * 100);
    const ty = Math.round(to.y * 100);
    const tz = Math.round(to.z * 100);
    
    // Ensure consistent ordering for bidirectional lookups (faster comparison)
    let p1x, p1y, p1z, p2x, p2y, p2z;
    if (fx < tx || (fx === tx && fy < ty) || (fx === tx && fy === ty && fz <= tz)) {
      p1x = fx; p1y = fy; p1z = fz;
      p2x = tx; p2y = ty; p2z = tz;
    } else {
      p1x = tx; p1y = ty; p1z = tz;
      p2x = fx; p2y = fy; p2z = fz;
    }
    
    // Use template literal for faster string construction
    const key = `d:${p1x},${p1y},${p1z}-${p2x},${p2y},${p2z}`;
    
    // Check key pool to reuse strings
    const pooledKey = this.keyPool.get(key);
    if (pooledKey) {
      return pooledKey;
    }
    
    // Add to pool if not full
    if (this.keyPoolSize < this.MAX_KEY_POOL_SIZE) {
      this.keyPool.set(key, key);
      this.keyPoolSize++;
    }
    
    return key;
  }

  /**
   * Generates a cache key for hanging curve calculations
   */
  private generateCurveKey(from: Point3D, to: Point3D, sag: number): string {
    const distanceKey = this.generateDistanceKey(from, to);
    const sagRounded = Math.round(sag * 100) / 100;
    return `curve:${distanceKey}:${sagRounded}`;
  }

  /**
   * Generates a cache key for validation results
   */
  private generateValidationKey(from: Point3D, to: Point3D, fromId?: string, toId?: string): string {
    const distanceKey = this.generateDistanceKey(from, to);
    const ids = [fromId || '', toId || ''].sort().join('-');
    return `validation:${distanceKey}:${ids}`;
  }

  /**
   * Checks if a cache entry is valid (not expired)
   */
  private isValidEntry<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    if (!entry) return false;
    const now = Date.now();
    return now < entry.expires;
  }

  /**
   * Aggressive cache cleanup optimized for large layouts
   */
  private performCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;

    this.lastCleanup = now;
    let deletedCount = 0;

    // Batch cleanup for better performance
    const expiredDistanceKeys: string[] = [];
    const expiredCurveKeys: string[] = [];
    const expiredValidationKeys: string[] = [];

    // Collect expired entries in single pass
    for (const [key, entry] of this.distanceCache.entries()) {
      if (!this.isValidEntry(entry)) {
        expiredDistanceKeys.push(key);
      }
    }

    for (const [key, entry] of this.hangingCurveCache.entries()) {
      if (!this.isValidEntry(entry)) {
        expiredCurveKeys.push(key);
      }
    }

    for (const [key, entry] of this.validationCache.entries()) {
      if (!this.isValidEntry(entry)) {
        expiredValidationKeys.push(key);
      }
    }

    // Batch delete expired entries
    expiredDistanceKeys.forEach(key => this.distanceCache.delete(key));
    expiredCurveKeys.forEach(key => this.hangingCurveCache.delete(key));
    expiredValidationKeys.forEach(key => this.validationCache.delete(key));
    
    deletedCount = expiredDistanceKeys.length + expiredCurveKeys.length + expiredValidationKeys.length;

    // More aggressive LRU eviction for large layouts
    this.enforceMaxSize(this.distanceCache, this.MAX_CACHE_SIZE);
    this.enforceMaxSize(this.hangingCurveCache, this.MAX_CACHE_SIZE);
    this.enforceMaxSize(this.validationCache, this.MAX_CACHE_SIZE / 2); // Validation cache smaller

    // Clean key pool periodically
    if (this.keyPoolSize > this.MAX_KEY_POOL_SIZE * 0.8) {
      this.keyPool.clear();
      this.keyPoolSize = 0;
    }

    // Log cleanup statistics in development
    if (process.env.NODE_ENV === 'development' && deletedCount > 0) {
      console.log(`[PowerlineCache] Cleaned ${deletedCount} expired entries, cache sizes: distance=${this.distanceCache.size}, curve=${this.hangingCurveCache.size}, validation=${this.validationCache.size}`);
    }
  }

  /**
   * Optimized LRU eviction for specific cache
   */
  private enforceMaxSize<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
    if (cache.size <= maxSize) return;

    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(cache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);
    
    // Delete oldest entries to get back to target size
    const deleteCount = cache.size - maxSize + Math.floor(maxSize * 0.1); // Delete 10% extra
    for (let i = 0; i < deleteCount && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }

  /**
   * Caches a distance calculation result
   */
  cacheDistance(from: Point3D, to: Point3D, distance: number): void {
    this.performCleanup();
    const key = this.generateDistanceKey(from, to);
    const now = Date.now();
    
    this.distanceCache.set(key, {
      data: distance,
      timestamp: now,
      expires: now + this.DISTANCE_CACHE_TTL
    });
  }

  /**
   * Gets a cached distance calculation result
   */
  getCachedDistance(from: Point3D, to: Point3D): number | null {
    const key = this.generateDistanceKey(from, to);
    const entry = this.distanceCache.get(key);
    
    if (this.isValidEntry(entry)) {
      this.hits++;
      return entry.data;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Caches a hanging curve calculation result
   */
  cacheHangingCurve(from: Point3D, to: Point3D, sag: number, curve: Point3D[]): void {
    this.performCleanup();
    const key = this.generateCurveKey(from, to, sag);
    const now = Date.now();
    
    this.hangingCurveCache.set(key, {
      data: curve,
      timestamp: now,
      expires: now + this.CURVE_CACHE_TTL
    });
  }

  /**
   * Gets a cached hanging curve calculation result
   */
  getCachedHangingCurve(from: Point3D, to: Point3D, sag: number): Point3D[] | null {
    const key = this.generateCurveKey(from, to, sag);
    const entry = this.hangingCurveCache.get(key);
    
    if (this.isValidEntry(entry)) {
      this.hits++;
      return entry.data;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Caches a validation result
   */
  cacheValidation(from: Point3D, to: Point3D, isValid: boolean, fromId?: string, toId?: string): void {
    this.performCleanup();
    const key = this.generateValidationKey(from, to, fromId, toId);
    const now = Date.now();
    
    this.validationCache.set(key, {
      data: isValid,
      timestamp: now,
      expires: now + this.VALIDATION_CACHE_TTL
    });
  }

  /**
   * Gets a cached validation result
   */
  getCachedValidation(from: Point3D, to: Point3D, fromId?: string, toId?: string): boolean | null {
    const key = this.generateValidationKey(from, to, fromId, toId);
    const entry = this.validationCache.get(key);
    
    if (this.isValidEntry(entry)) {
      this.hits++;
      return entry.data;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Clears all caches
   */
  clearCache(): void {
    this.distanceCache.clear();
    this.hangingCurveCache.clear();
    this.validationCache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gets cache performance statistics
   */
  getStats() {
    return {
      distanceCacheSize: this.distanceCache.size,
      hangingCurveCacheSize: this.hangingCurveCache.size,
      validationCacheSize: this.validationCache.size,
      totalHits: this.hits,
      totalMisses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0
    };
  }

  /**
   * Preloads common calculations to improve performance
   */
  preloadCommonCalculations(): void {
    // Pre-calculate common hanging curves for standard distances
    const commonDistances = [10, 20, 30, 50, 75, 100];
    const now = Date.now();
    
    for (const distance of commonDistances) {
      const from: Point3D = { x: 0, y: 0, z: 0 };
      const to: Point3D = { x: distance, y: 0, z: 0 };
      
      // Pre-cache distance
      this.cacheDistance(from, to, distance);
      
      // Pre-cache common sag values
      const commonSags = [0.5, 1.0, 1.5, 2.0];
      for (const sag of commonSags) {
        // Generate a simple hanging curve for preloading
        const points: Point3D[] = [];
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const x = from.x + (to.x - from.x) * t;
          const y = from.y + (to.y - from.y) * t;
          const curveT = 4 * t * (1 - t);
          const z = from.z + (to.z - from.z) * t - (sag * curveT);
          points.push({ x, y, z });
        }
        
        this.cacheHangingCurve(from, to, sag, points);
      }
    }
  }
}

// Export singleton instance
export const powerlineCache = new PowerlineCache();

// Preload common calculations on module load
if (typeof window !== 'undefined') {
  // Only preload in browser environment
  setTimeout(() => {
    powerlineCache.preloadCommonCalculations();
  }, 1000); // Delay to avoid blocking initial render
}