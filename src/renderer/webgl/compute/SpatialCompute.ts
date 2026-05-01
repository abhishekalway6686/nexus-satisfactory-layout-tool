/**
 * GPU-accelerated spatial indexing and query operations
 * Implements high-performance R-tree style queries using compute shaders
 */

import { getGPUComputeManager, ComputeKernel, ComputeBuffer } from './GPUComputeManager';
import { Point3D } from '../../../types';

export interface SpatialComputeOptions {
  readonly maxEntitiesPerBatch: number;
  readonly maxQueriesPerBatch: number;
  readonly enableHierarchicalQueries: boolean;
  readonly spatialGridSize: number;
}

export interface SpatialEntity {
  readonly id: string;
  readonly position: Point3D;
  readonly boundingBox: {
    min: Point3D;
    max: Point3D;
  };
  readonly type: string;
}

export interface SpatialQuery {
  readonly center: Point3D;
  readonly radius: number;
  readonly types?: string[];
  readonly maxResults?: number;
}

export interface SpatialQueryResult {
  readonly entities: SpatialEntity[];
  readonly distances: number[];
  readonly queryIndex: number;
}

export interface SpatialBatch {
  readonly results: SpatialQueryResult[];
  readonly computeTimeMs: number;
  readonly method: 'webgpu' | 'webgl2' | 'cpu_fallback';
  readonly entitiesProcessed: number;
  readonly queriesProcessed: number;
}

const WEBGPU_SPATIAL_QUERY_SHADER = `
struct SpatialEntity {
  position: vec3<f32>,
  minBounds: vec3<f32>,
  maxBounds: vec3<f32>,
  entityType: u32,
  entityId: u32,
}

struct SpatialQuery {
  center: vec3<f32>,
  radius: f32,
  typeFilter: u32,
  maxResults: u32,
}

struct QueryResult {
  entityId: u32,
  distance: f32,
  valid: u32,
  padding: u32,
}

@group(0) @binding(0) var<storage, read> entities: array<SpatialEntity>;
@group(0) @binding(1) var<storage, read> queries: array<SpatialQuery>;
@group(0) @binding(2) var<storage, read_write> results: array<QueryResult>;
@group(0) @binding(3) var<storage, read_write> resultCounts: array<u32>;
@group(0) @binding(4) var<uniform> params: vec4<u32>; // [entityCount, queryCount, useHierarchy, gridSize]

const MAX_RESULTS_PER_QUERY: u32 = 64u;

fn sphereIntersectsAABB(center: vec3<f32>, radius: f32, minBounds: vec3<f32>, maxBounds: vec3<f32>) -> bool {
  let closest = clamp(center, minBounds, maxBounds);
  let distance = length(center - closest);
  return distance <= radius;
}

fn pointInSphere(point: vec3<f32>, center: vec3<f32>, radius: f32) -> bool {
  return length(point - center) <= radius;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let queryIndex = global_id.x;
  let entityIndex = global_id.y;
  let entityCount = params.x;
  let queryCount = params.y;
  let useHierarchy = params.z;
  
  if (queryIndex >= queryCount || entityIndex >= entityCount) {
    return;
  }
  
  let query = queries[queryIndex];
  let entity = entities[entityIndex];
  
  // Type filtering
  if (query.typeFilter != 0u && entity.entityType != query.typeFilter) {
    return;
  }
  
  // Hierarchical culling - first check bounding box
  if (useHierarchy == 1u) {
    if (!sphereIntersectsAABB(query.center, query.radius, entity.minBounds, entity.maxBounds)) {
      return;
    }
  }
  
  // Check if entity position is within query radius
  let distance = length(entity.position - query.center);
  if (distance > query.radius) {
    return;
  }
  
  // Find insertion point in results array for this query
  let resultOffset = queryIndex * MAX_RESULTS_PER_QUERY;
  let currentCount = atomicLoad(&resultCounts[queryIndex]);
  
  if (currentCount >= query.maxResults || currentCount >= MAX_RESULTS_PER_QUERY) {
    return;
  }
  
  // Atomic increment to reserve a slot
  let insertIndex = atomicAdd(&resultCounts[queryIndex], 1u);
  
  if (insertIndex < query.maxResults && insertIndex < MAX_RESULTS_PER_QUERY) {
    let resultIndex = resultOffset + insertIndex;
    results[resultIndex] = QueryResult(
      entity.entityId,
      distance,
      1u,
      0u
    );
  }
}
`;

const WEBGPU_SPATIAL_SORT_SHADER = `
struct QueryResult {
  entityId: u32,
  distance: f32,
  valid: u32,
  padding: u32,
}

@group(0) @binding(0) var<storage, read_write> results: array<QueryResult>;
@group(0) @binding(1) var<storage, read> resultCounts: array<u32>;
@group(0) @binding(2) var<uniform> params: vec4<u32>; // [queryCount, maxResultsPerQuery, padding, padding]

const MAX_RESULTS_PER_QUERY: u32 = 64u;

// Simple bubble sort for small arrays (GPU parallel sort is complex)
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let queryIndex = global_id.x;
  let queryCount = params.x;
  
  if (queryIndex >= queryCount) {
    return;
  }
  
  let resultOffset = queryIndex * MAX_RESULTS_PER_QUERY;
  let count = resultCounts[queryIndex];
  
  // Bubble sort by distance
  for (var i = 0u; i < count; i++) {
    for (var j = 0u; j < count - 1u - i; j++) {
      let idx1 = resultOffset + j;
      let idx2 = resultOffset + j + 1u;
      
      if (results[idx1].distance > results[idx2].distance) {
        // Swap
        let temp = results[idx1];
        results[idx1] = results[idx2];
        results[idx2] = temp;
      }
    }
  }
}
`;

const WEBGL_SPATIAL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_entities;
uniform sampler2D u_queries;
uniform ivec2 u_textureSize;
uniform int u_entityCount;
uniform int u_queryCount;
uniform bool u_useHierarchy;
uniform int u_gridSize;

out vec4 fragColor;

struct SpatialEntity {
  vec3 position;
  vec3 minBounds;
  vec3 maxBounds;
  int entityType;
  int entityId;
};

struct SpatialQuery {
  vec3 center;
  float radius;
  int typeFilter;
  int maxResults;
};

SpatialEntity getEntity(int index) {
  // Each entity takes 3 pixels: position+type, minBounds+id, maxBounds
  int basePixel = index * 3;
  int y = basePixel / u_textureSize.x;
  int x = basePixel % u_textureSize.x;
  
  vec4 positionPixel = texelFetch(u_entities, ivec2(x, y), 0);
  vec4 minBoundsPixel = texelFetch(u_entities, ivec2(x + 1, y), 0);
  vec4 maxBoundsPixel = texelFetch(u_entities, ivec2(x + 2, y), 0);
  
  return SpatialEntity(
    positionPixel.xyz,
    minBoundsPixel.xyz,
    maxBoundsPixel.xyz,
    int(positionPixel.w),
    int(minBoundsPixel.w)
  );
}

SpatialQuery getQuery(int index) {
  // Each query takes 2 pixels: center+radius, typeFilter+maxResults
  int basePixel = index * 2;
  int y = basePixel / u_textureSize.x;
  int x = basePixel % u_textureSize.x;
  
  vec4 centerPixel = texelFetch(u_queries, ivec2(x, y), 0);
  vec4 paramsPixel = texelFetch(u_queries, ivec2(x + 1, y), 0);
  
  return SpatialQuery(
    centerPixel.xyz,
    centerPixel.w,
    int(paramsPixel.x),
    int(paramsPixel.y)
  );
}

bool sphereIntersectsAABB(vec3 center, float radius, vec3 minBounds, vec3 maxBounds) {
  vec3 closest = clamp(center, minBounds, maxBounds);
  float distance = length(center - closest);
  return distance <= radius;
}

void main() {
  ivec2 fragCoord = ivec2(gl_FragCoord.xy);
  int pixelIndex = fragCoord.y * u_textureSize.x + fragCoord.x;
  
  // Decode query and entity indices
  int queryIndex = pixelIndex / u_entityCount;
  int entityIndex = pixelIndex % u_entityCount;
  
  if (queryIndex >= u_queryCount || entityIndex >= u_entityCount) {
    fragColor = vec4(0.0);
    return;
  }
  
  SpatialQuery query = getQuery(queryIndex);
  SpatialEntity entity = getEntity(entityIndex);
  
  // Type filtering
  if (query.typeFilter != 0 && entity.entityType != query.typeFilter) {
    fragColor = vec4(0.0);
    return;
  }
  
  // Hierarchical culling
  if (u_useHierarchy) {
    if (!sphereIntersectsAABB(query.center, query.radius, entity.minBounds, entity.maxBounds)) {
      fragColor = vec4(0.0);
      return;
    }
  }
  
  // Check distance
  float distance = length(entity.position - query.center);
  if (distance > query.radius) {
    fragColor = vec4(0.0);
    return;
  }
  
  // Encode result: entityId in R, distance in G, valid flag in B
  fragColor = vec4(float(entity.entityId), distance, 1.0, 1.0);
}
`;

export class SpatialCompute {
  private computeManager: Awaited<ReturnType<typeof getGPUComputeManager>> | null = null;
  private queryKernel: ComputeKernel | null = null;
  private sortKernel: ComputeKernel | null = null;
  private initialized = false;
  private options: SpatialComputeOptions;

  constructor(options: Partial<SpatialComputeOptions> = {}) {
    this.options = {
      maxEntitiesPerBatch: 4096,
      maxQueriesPerBatch: 256,
      enableHierarchicalQueries: true,
      spatialGridSize: 64,
      ...options
    };
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Get GPU manager
      this.computeManager = await getGPUComputeManager();

      // WAIT for GPU initialization to complete
      await this.computeManager.waitForInitialization();

      // NOW it's safe to check support
      if (!this.computeManager.isSupported()) {
        console.warn('GPU Compute not supported, spatial queries will fall back to CPU');
        this.initialized = true; // Mark as initialized even without GPU
        return false;
      }

      const device = this.computeManager.getDevice()!;
      
      if (device.type === 'webgpu') {
        this.queryKernel = await this.computeManager.createKernel(
          'spatial_query',
          WEBGPU_SPATIAL_QUERY_SHADER
        );
        
        this.sortKernel = await this.computeManager.createKernel(
          'spatial_sort',
          WEBGPU_SPATIAL_SORT_SHADER
        );
      } else if (device.type === 'webgl2') {
        this.queryKernel = await this.computeManager.createKernel(
          'spatial_query',
          WEBGL_SPATIAL_FRAGMENT_SHADER
        );
      }

      this.initialized = true;
      console.log(`✅ SpatialCompute initialized with ${device.type}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize SpatialCompute:', error);
      this.initialized = true; // Prevent retry loop
      return false;
    }
  }

  /**
   * Execute multiple spatial queries against a set of entities
   */
  async executeQueries(
    entities: SpatialEntity[],
    queries: SpatialQuery[]
  ): Promise<SpatialBatch> {
    const startTime = performance.now();

    // Fall back to CPU for small datasets or when GPU is not available
    if (!this.initialized || !this.computeManager?.isSupported() || 
        entities.length < 100 || queries.length < 10) {
      return this.executeQueriesCPU(entities, queries, startTime);
    }

    try {
      // Process in batches if necessary
      if (entities.length > this.options.maxEntitiesPerBatch || 
          queries.length > this.options.maxQueriesPerBatch) {
        return await this.executeQueriesBatched(entities, queries, startTime);
      }

      return await this.executeQueriesGPU(entities, queries, startTime);
    } catch (error) {
      console.warn('GPU spatial queries failed, falling back to CPU:', error);
      return this.executeQueriesCPU(entities, queries, startTime);
    }
  }

  /**
   * Execute a single spatial query (convenience method)
   */
  async executeQuery(
    entities: SpatialEntity[],
    query: SpatialQuery
  ): Promise<SpatialQueryResult> {
    const batch = await this.executeQueries(entities, [query]);
    return batch.results[0] || { entities: [], distances: [], queryIndex: 0 };
  }

  private async executeQueriesGPU(
    entities: SpatialEntity[],
    queries: SpatialQuery[],
    startTime: number
  ): Promise<SpatialBatch> {
    const device = this.computeManager!.getDevice()!;

    // Prepare entity data
    const entityData = this.serializeEntities(entities);
    const queryData = this.serializeQueries(queries);

    // Create GPU buffers
    const entitiesBuffer = await this.computeManager!.createBuffer(
      entityData.byteLength,
      'input',
      entityData.buffer
    );

    const queriesBuffer = await this.computeManager!.createBuffer(
      queryData.byteLength,
      'input',
      queryData.buffer
    );

    const maxResultsPerQuery = 64;
    const totalResults = queries.length * maxResultsPerQuery;
    
    const resultsBuffer = await this.computeManager!.createBuffer(
      totalResults * 16, // 4 uint32s per result = 16 bytes
      'output'
    );

    const resultCountsBuffer = await this.computeManager!.createBuffer(
      queries.length * 4, // One uint32 per query
      'output'
    );

    // Create parameters buffer
    const params = new Uint32Array([
      entities.length,
      queries.length,
      this.options.enableHierarchicalQueries ? 1 : 0,
      this.options.spatialGridSize
    ]);
    const paramsBuffer = await this.computeManager!.createBuffer(
      params.byteLength,
      'uniform',
      params.buffer
    );

    // Execute query kernel
    const workgroupsX = Math.ceil(queries.length / 16);
    const workgroupsY = Math.ceil(entities.length / 16);
    await this.queryKernel!.execute(
      { x: workgroupsX, y: workgroupsY },
      [entitiesBuffer, queriesBuffer, resultsBuffer, resultCountsBuffer, paramsBuffer]
    );

    // Sort results by distance (WebGPU only)
    if (device.type === 'webgpu' && this.sortKernel) {
      const sortParams = new Uint32Array([queries.length, maxResultsPerQuery, 0, 0]);
      const sortParamsBuffer = await this.computeManager!.createBuffer(
        sortParams.byteLength,
        'uniform',
        sortParams.buffer
      );

      await this.sortKernel.execute(
        { x: Math.ceil(queries.length / 256) },
        [resultsBuffer, resultCountsBuffer, sortParamsBuffer]
      );

      sortParamsBuffer.dispose();
    }

    // Read back results
    const resultsData = await this.computeManager!.readBuffer(resultsBuffer);
    const countsData = await this.computeManager!.readBuffer(resultCountsBuffer);
    
    const results = this.parseQueryResults(
      resultsData,
      countsData,
      entities,
      queries,
      maxResultsPerQuery
    );

    // Cleanup
    entitiesBuffer.dispose();
    queriesBuffer.dispose();
    resultsBuffer.dispose();
    resultCountsBuffer.dispose();
    paramsBuffer.dispose();

    const computeTimeMs = performance.now() - startTime;

    return {
      results,
      computeTimeMs,
      method: device.type as 'webgpu' | 'webgl2',
      entitiesProcessed: entities.length,
      queriesProcessed: queries.length
    };
  }

  private serializeEntities(entities: SpatialEntity[]): Float32Array {
    // Each entity: position(3) + type(1) + minBounds(3) + id(1) + maxBounds(3) + padding(1) = 12 floats
    const data = new Float32Array(entities.length * 12);
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const offset = i * 12;
      
      // Position + type
      data[offset] = entity.position.x;
      data[offset + 1] = entity.position.y;
      data[offset + 2] = entity.position.z;
      data[offset + 3] = this.hashString(entity.type); // Convert type to number
      
      // Min bounds + ID
      data[offset + 4] = entity.boundingBox.min.x;
      data[offset + 5] = entity.boundingBox.min.y;
      data[offset + 6] = entity.boundingBox.min.z;
      data[offset + 7] = this.hashString(entity.id);
      
      // Max bounds + padding
      data[offset + 8] = entity.boundingBox.max.x;
      data[offset + 9] = entity.boundingBox.max.y;
      data[offset + 10] = entity.boundingBox.max.z;
      data[offset + 11] = 0; // padding
    }
    
    return data;
  }

  private serializeQueries(queries: SpatialQuery[]): Float32Array {
    // Each query: center(3) + radius(1) + typeFilter(1) + maxResults(1) + padding(2) = 8 floats
    const data = new Float32Array(queries.length * 8);
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const offset = i * 8;
      
      data[offset] = query.center.x;
      data[offset + 1] = query.center.y;
      data[offset + 2] = query.center.z;
      data[offset + 3] = query.radius;
      data[offset + 4] = query.types ? this.hashString(query.types[0]) : 0;
      data[offset + 5] = query.maxResults || 64;
      data[offset + 6] = 0; // padding
      data[offset + 7] = 0; // padding
    }
    
    return data;
  }

  private parseQueryResults(
    resultsData: ArrayBuffer,
    countsData: ArrayBuffer,
    entities: SpatialEntity[],
    queries: SpatialQuery[],
    maxResultsPerQuery: number
  ): SpatialQueryResult[] {
    const resultsView = new Uint32Array(resultsData);
    const countsView = new Uint32Array(countsData);
    const results: SpatialQueryResult[] = [];

    // Create entity lookup map
    const entityMap = new Map<number, SpatialEntity>();
    for (const entity of entities) {
      entityMap.set(this.hashString(entity.id), entity);
    }

    for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
      const resultCount = countsView[queryIndex];
      const queryEntities: SpatialEntity[] = [];
      const distances: number[] = [];

      for (let resultIndex = 0; resultIndex < resultCount; resultIndex++) {
        const offset = (queryIndex * maxResultsPerQuery + resultIndex) * 4; // 4 uint32s per result
        const entityId = resultsView[offset];
        const distance = new Float32Array(resultsData.slice(offset * 4 + 4, offset * 4 + 8))[0];
        const valid = resultsView[offset + 2];

        if (valid === 1) {
          const entity = entityMap.get(entityId);
          if (entity) {
            queryEntities.push(entity);
            distances.push(distance);
          }
        }
      }

      results.push({
        entities: queryEntities,
        distances,
        queryIndex
      });
    }

    return results;
  }

  private async executeQueriesBatched(
    entities: SpatialEntity[],
    queries: SpatialQuery[],
    startTime: number
  ): Promise<SpatialBatch> {
    const entityBatchSize = this.options.maxEntitiesPerBatch;
    const queryBatchSize = this.options.maxQueriesPerBatch;
    const allResults: SpatialQueryResult[] = [];

    // Process queries in batches
    for (let queryOffset = 0; queryOffset < queries.length; queryOffset += queryBatchSize) {
      const queryBatch = queries.slice(queryOffset, Math.min(queryOffset + queryBatchSize, queries.length));
      
      // For each query batch, process entities in batches
      const queryResults: SpatialQueryResult[] = queryBatch.map(() => ({
        entities: [],
        distances: [],
        queryIndex: 0
      }));

      for (let entityOffset = 0; entityOffset < entities.length; entityOffset += entityBatchSize) {
        const entityBatch = entities.slice(entityOffset, Math.min(entityOffset + entityBatchSize, entities.length));
        
        const batchResult = await this.executeQueriesGPU(
          entityBatch,
          queryBatch,
          performance.now()
        );

        // Merge results
        for (let i = 0; i < queryBatch.length; i++) {
          queryResults[i].entities.push(...batchResult.results[i].entities);
          queryResults[i].distances.push(...batchResult.results[i].distances);
        }
      }

      // Sort and limit results for each query
      for (let i = 0; i < queryBatch.length; i++) {
        const maxResults = queryBatch[i].maxResults || 64;
        const combined = queryResults[i].entities.map((entity, idx) => ({
          entity,
          distance: queryResults[i].distances[idx]
        }));
        
        combined.sort((a, b) => a.distance - b.distance);
        combined.length = Math.min(combined.length, maxResults);
        
        queryResults[i] = {
          entities: combined.map(item => item.entity),
          distances: combined.map(item => item.distance),
          queryIndex: queryOffset + i
        };
      }

      allResults.push(...queryResults);
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      results: allResults,
      computeTimeMs,
      method: this.computeManager!.getDevice()!.type as 'webgpu' | 'webgl2',
      entitiesProcessed: entities.length,
      queriesProcessed: queries.length
    };
  }

  private executeQueriesCPU(
    entities: SpatialEntity[],
    queries: SpatialQuery[],
    startTime: number
  ): SpatialBatch {
    const results: SpatialQueryResult[] = [];

    for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
      const query = queries[queryIndex];
      const candidates: Array<{ entity: SpatialEntity; distance: number }> = [];

      for (const entity of entities) {
        // Type filtering
        if (query.types && !query.types.includes(entity.type)) {
          continue;
        }

        // Hierarchical culling
        if (this.options.enableHierarchicalQueries) {
          if (!this.sphereIntersectsAABB(query.center, query.radius, entity.boundingBox)) {
            continue;
          }
        }

        // Distance check
        const distance = this.distance3D(entity.position, query.center);
        if (distance <= query.radius) {
          candidates.push({ entity, distance });
        }
      }

      // Sort by distance and limit results
      candidates.sort((a, b) => a.distance - b.distance);
      const maxResults = query.maxResults || 64;
      candidates.length = Math.min(candidates.length, maxResults);

      results.push({
        entities: candidates.map(c => c.entity),
        distances: candidates.map(c => c.distance),
        queryIndex
      });
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      results,
      computeTimeMs,
      method: 'cpu_fallback',
      entitiesProcessed: entities.length,
      queriesProcessed: queries.length
    };
  }

  private sphereIntersectsAABB(center: Point3D, radius: number, boundingBox: { min: Point3D; max: Point3D }): boolean {
    const closest: Point3D = {
      x: Math.max(boundingBox.min.x, Math.min(center.x, boundingBox.max.x)),
      y: Math.max(boundingBox.min.y, Math.min(center.y, boundingBox.max.y)),
      z: Math.max(boundingBox.min.z, Math.min(center.z, boundingBox.max.z))
    };
    
    const distance = this.distance3D(center, closest);
    return distance <= radius;
  }

  private distance3D(p1: Point3D, p2: Point3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Benchmark GPU vs CPU performance for spatial queries
   */
  async benchmark(entityCount: number = 1000, queryCount: number = 100): Promise<{
    cpu: { timeMs: number; throughput: number };
    gpu?: { timeMs: number; throughput: number; speedup: number };
  }> {
    // Generate test entities
    const entities: SpatialEntity[] = Array.from({ length: entityCount }, (_, i) => {
      const position = {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      };
      
      return {
        id: `entity_${i}`,
        position,
        boundingBox: {
          min: {
            x: position.x - 5,
            y: position.y - 5,
            z: position.z - 2
          },
          max: {
            x: position.x + 5,
            y: position.y + 5,
            z: position.z + 2
          }
        },
        type: `type_${i % 5}`
      };
    });

    // Generate test queries
    const queries: SpatialQuery[] = Array.from({ length: queryCount }, () => ({
      center: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 100
      },
      radius: 10 + Math.random() * 50,
      maxResults: 32
    }));

    // Benchmark CPU
    const cpuResult = this.executeQueriesCPU(entities, queries, performance.now());
    const cpuThroughput = (entityCount * queryCount) / cpuResult.computeTimeMs * 1000;

    const result: any = {
      cpu: {
        timeMs: cpuResult.computeTimeMs,
        throughput: cpuThroughput
      }
    };

    // Benchmark GPU if available
    if (this.initialized && this.computeManager?.isSupported()) {
      try {
        const gpuResult = await this.executeQueriesGPU(entities, queries, performance.now());
        const gpuThroughput = (entityCount * queryCount) / gpuResult.computeTimeMs * 1000;
        const speedup = cpuResult.computeTimeMs / gpuResult.computeTimeMs;

        result.gpu = {
          timeMs: gpuResult.computeTimeMs,
          throughput: gpuThroughput,
          speedup
        };
      } catch (error) {
        console.warn('GPU benchmark failed:', error);
      }
    }

    return result;
  }

  dispose(): void {
    if (this.queryKernel) {
      this.queryKernel.dispose();
      this.queryKernel = null;
    }
    if (this.sortKernel) {
      this.sortKernel.dispose();
      this.sortKernel = null;
    }
    this.initialized = false;
  }

  isSupported(): boolean {
    return this.initialized && this.computeManager?.isSupported() || false;
  }

  getStats(): {
    supported: boolean;
    device: string;
    maxEntitiesPerBatch: number;
    maxQueriesPerBatch: number;
    hierarchicalQueries: boolean;
  } {
    return {
      supported: this.isSupported(),
      device: this.computeManager?.getDevice()?.type || 'unsupported',
      maxEntitiesPerBatch: this.options.maxEntitiesPerBatch,
      maxQueriesPerBatch: this.options.maxQueriesPerBatch,
      hierarchicalQueries: this.options.enableHierarchicalQueries
    };
  }
}

// Singleton instance
let spatialCompute: SpatialCompute | null = null;

export async function getSpatialCompute(): Promise<SpatialCompute> {
  if (!spatialCompute) {
    spatialCompute = new SpatialCompute();
    await spatialCompute.initialize();
  }
  return spatialCompute;
}