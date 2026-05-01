import { invoke } from '@tauri-apps/api/core';

// Type definitions that match Rust backend
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Building {
  id: string;
  buildingType: string;
  position: Point3D;
  rotation: number;
  floor: number;
}

export interface ConveyorBelt {
  id: string;
  startPoint: Point3D;
  endPoint: Point3D;
  beltType: string;
}

// Test connection
export async function testRustConnection(): Promise<string> {
  return await invoke<string>('test_rust_connection');
}

// Type definitions for projection result
export interface ProjectionResult {
  proj: Point3D;
  t: number;
}

// Core distance calculation functions
export async function calculateDistance3D(p1: Point3D, p2: Point3D): Promise<number> {
  return await invoke<number>('calculate_distance_3d', { p1, p2 });
}

export async function calculateDistance3DSquared(p1: Point3D, p2: Point3D): Promise<number> {
  return await invoke<number>('calculate_distance_3d_squared', { p1, p2 });
}

export async function calculateDistance2D(p1: Point3D, p2: Point3D): Promise<number> {
  return await invoke<number>('calculate_distance_2d', { p1, p2 });
}

export async function calculateDistance2DSquared(p1: Point3D, p2: Point3D): Promise<number> {
  return await invoke<number>('calculate_distance_2d_squared', { p1, p2 });
}

export async function projectPointOnLine(point: Point3D, start: Point3D, end: Point3D): Promise<ProjectionResult> {
  return await invoke<ProjectionResult>('project_point_on_line', { point, start, end });
}

// Bulk distance calculation functions
export async function calculateDistancesBulk(pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> {
  return await invoke<number[]>('calculate_distances_bulk', { 
    points_a: pointsA, 
    points_b: pointsB 
  });
}

export async function calculateDistances2DBulk(pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> {
  return await invoke<number[]>('calculate_distances_2d_bulk', { 
    points_a: pointsA, 
    points_b: pointsB 
  });
}

export async function calculateDistances2DSquaredBulk(pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> {
  return await invoke<number[]>('calculate_distances_2d_squared_bulk', { 
    points_a: pointsA, 
    points_b: pointsB 
  });
}

export async function calculateDistances3DSquaredBulk(pointsA: Point3D[], pointsB: Point3D[]): Promise<number[]> {
  return await invoke<number[]>('calculate_distances_3d_squared_bulk', { 
    points_a: pointsA, 
    points_b: pointsB 
  });
}

export async function generateCurveControlPoint(
  start: Point3D, 
  end: Point3D, 
  curveHeightFactor: number
): Promise<Point3D | null> {
  return await invoke<Point3D | null>('generate_curve_control_point', { 
    start, 
    end, 
    curve_height_factor: curveHeightFactor 
  });
}

export async function interpolateBezierCurve(
  start: Point3D,
  end: Point3D,
  control: Point3D,
  t: number
): Promise<Point3D> {
  return await invoke<Point3D>('interpolate_bezier_curve', { start, end, control, t });
}

export async function shouldCreateTurn(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D
): Promise<boolean> {
  return await invoke<boolean>('should_create_turn', { p1, p2, p3 });
}

export async function findLineIntersection(
  line1Start: Point3D,
  line1End: Point3D,
  line2Start: Point3D,
  line2End: Point3D
): Promise<{ point: Point3D; t1: number; t2: number } | null> {
  return await invoke<{ point: Point3D; t1: number; t2: number } | null>('find_line_intersection', {
    line1_start: line1Start,
    line1_end: line1End,
    line2_start: line2Start,
    line2_end: line2End,
  });
}

// Building operations
export async function createBuilding(
  id: string,
  buildingType: string,
  position: Point3D
): Promise<Building> {
  return await invoke<Building>('create_building', {
    id,
    building_type: buildingType,
    position,
  });
}

export async function updateBuildingPosition(
  buildingId: string,
  newPosition: Point3D
): Promise<void> {
  return await invoke<void>('update_building_position', {
    building_id: buildingId,
    new_position: newPosition,
  });
}

export async function deleteBuilding(buildingId: string): Promise<void> {
  return await invoke<void>('delete_building', { building_id: buildingId });
}

export async function getBuilding(buildingId: string): Promise<Building | null> {
  return await invoke<Building | null>('get_building', { building_id: buildingId });
}

export async function getAllBuildings(): Promise<Building[]> {
  return await invoke<Building[]>('get_all_buildings');
}

// ===== HIGH-PERFORMANCE SPATIAL INDEXING =====

// Type definitions for spatial operations
export interface BulkSpatialQuery {
  center: Point3D;
  radius: number;
}

export interface SpatialQueryOptions {
  exclude_ids: string[];
  include_buildings: boolean;
  include_railway_nodes: boolean;
  include_conveyor_poles: boolean;
  include_pipe_supports: boolean;
}

export interface BulkQueryResult<T> {
  entities: T;
  query_time_ms: number;
  entities_checked: number;
}

export interface SpatialStats {
  total_entities: number;
  total_cells: number;
  avg_entities_per_cell: number;
  max_entities_in_cell: number;
  cell_size: number;
}

export interface SpatialIndexStats {
  buildings: SpatialStats;
  railway_nodes: SpatialStats;
  conveyor_poles: SpatialStats;
  pipe_supports: SpatialStats;
}

export interface UniversalSpatialResult {
  buildings: any[];
  railway_nodes: any[];
  conveyor_poles: any[];
  pipe_supports: any[];
}

export interface SpatialBenchmarkResult {
  iterations: number;
  total_benchmark_time_ms: number;
  avg_query_time_ms: number;
  total_results: number;
  queries_per_second: number;
}

// High-performance bulk spatial queries
export async function bulkSpatialQueryBuildings(
  queries: BulkSpatialQuery[],
  options?: SpatialQueryOptions
): Promise<BulkQueryResult<any[][]>> {
  return await invoke<BulkQueryResult<any[][]>>('bulk_spatial_query_buildings', {
    queries,
    options
  });
}

// Ultra-fast individual spatial queries
export async function queryBuildingsRadius(
  center: Point3D,
  radius: number,
  excludeIds: string[] = []
): Promise<any[]> {
  return await invoke<any[]>('query_buildings_radius', {
    center,
    radius,
    exclude_ids: excludeIds
  });
}

// Railway node queries (most performance-critical)
export async function queryRailwayNodesOptimized(
  center: Point3D,
  radius: number,
  excludeIds: string[] = []
): Promise<any[]> {
  return await invoke<any[]>('query_railway_nodes_optimized', {
    center,
    radius,
    exclude_ids: excludeIds
  });
}

// Bulk railway node queries for drawing operations
export async function bulkQueryRailwayNodes(
  queries: BulkSpatialQuery[],
  excludeIds: string[] = []
): Promise<BulkQueryResult<any[][]>> {
  return await invoke<BulkQueryResult<any[][]>>('bulk_query_railway_nodes', {
    queries,
    exclude_ids: excludeIds
  });
}

// Universal spatial query across all entity types
export async function universalSpatialQuery(
  center: Point3D,
  radius: number,
  options: SpatialQueryOptions
): Promise<UniversalSpatialResult> {
  return await invoke<UniversalSpatialResult>('universal_spatial_query', {
    center,
    radius,
    options
  });
}

// Spatial index statistics
export async function getSpatialStats(): Promise<SpatialIndexStats> {
  return await invoke<SpatialIndexStats>('get_spatial_stats');
}

// Rebuild spatial indices
export async function rebuildSpatialIndex(): Promise<SpatialIndexStats> {
  return await invoke<SpatialIndexStats>('rebuild_spatial_index');
}

// Performance benchmarking
export async function benchmarkSpatialPerformance(
  iterations: number = 1000,
  queryRadius: number = 10.0
): Promise<SpatialBenchmarkResult> {
  return await invoke<SpatialBenchmarkResult>('benchmark_spatial_performance', {
    iterations,
    query_radius: queryRadius
  });
}

// Legacy compatibility functions
export async function findBuildingsInRadius(
  center: Point3D,
  radius: number
): Promise<string[]> {
  return await invoke<string[]>('find_buildings_in_radius', { center, radius });
}

export async function findNearestBuilding(
  position: Point3D,
  maxDistance: number
): Promise<string | null> {
  return await invoke<string | null>('find_nearest_building', { 
    position, 
    max_distance: maxDistance 
  });
}

// Infrastructure operations
export async function createConveyorBelt(
  id: string,
  startPoint: Point3D,
  endPoint: Point3D,
  beltType: string
): Promise<ConveyorBelt> {
  return await invoke<ConveyorBelt>('create_conveyor_belt', {
    id,
    start_point: startPoint,
    end_point: endPoint,
    belt_type: beltType,
  });
}

// Layout serialization
export async function saveLayout(filePath: string): Promise<void> {
  return await invoke<void>('save_layout', { file_path: filePath });
}

export async function loadLayout(filePath: string): Promise<void> {
  return await invoke<void>('load_layout', { file_path: filePath });
}

export async function exportToJson(): Promise<string> {
  return await invoke<string>('export_to_json');
}

export async function importFromJson(jsonData: string): Promise<void> {
  return await invoke<void>('import_from_json', { json_data: jsonData });
}

// Performance monitoring
export async function getPerformanceStats(): Promise<Record<string, any>> {
  return await invoke<Record<string, any>>('get_performance_stats');
}

// Spatial performance monitoring
export async function getSpatialPerformanceStats(): Promise<{
  totalQueries: number;
  avgQueryTime: number;
  cacheHitRate: number;
  spatialIndexStats: SpatialIndexStats;
}> {
  const stats = await getSpatialStats();
  const perfStats = await getPerformanceStats();
  
  return {
    totalQueries: perfStats.spatial_queries || 0,
    avgQueryTime: perfStats.avg_spatial_query_time || 0,
    cacheHitRate: perfStats.spatial_cache_hit_rate || 0,
    spatialIndexStats: stats
  };
}

// ============================================================================
// NEW: High-performance curve calculation commands - Rust Migration
// ============================================================================

// Type definitions for curve subdivision result
export interface BezierCurveSegment {
  control_points: Point3D[];
}

export interface BezierSubdivisionResult {
  first: BezierCurveSegment;
  second: BezierCurveSegment;
  point: Point3D;
}

// Exact shouldCreateTurn implementation with 0.873 radians threshold
export async function shouldCreateTurnExact(p1: Point3D, p2: Point3D, p3: Point3D): Promise<boolean> {
  return await invoke<boolean>('should_create_turn_exact', { p1, p2, p3 });
}

// Exact calculateCurveControlPoint implementation matching TypeScript algorithm
export async function calculateCurveControlPointExact(p1: Point3D, p2: Point3D, p3: Point3D): Promise<Point3D> {
  return await invoke<Point3D>('calculate_curve_control_point_exact', { p1, p2, p3 });
}

// SIMD-optimized getQuadraticBezierPoints with exact algorithm match
export async function getQuadraticBezierPoints(
  start: Point3D, 
  cp: Point3D, 
  end: Point3D, 
  numPoints: number
): Promise<Point3D[]> {
  return await invoke<Point3D[]>('get_quadratic_bezier_points', { 
    start, 
    cp, 
    end, 
    num_points: numPoints 
  });
}

// Exact splitBezierAtT curve subdivision implementation
export async function splitBezierAtT(
  start: Point3D,
  cp: Point3D,
  end: Point3D,
  t: number
): Promise<BezierSubdivisionResult> {
  return await invoke<BezierSubdivisionResult>('split_bezier_at_t', { start, cp, end, t });
}

// Railway snapping optimization types
export interface RailwayNodeQuery {
  id: string;
  position: Point3D;
}

export interface RailwaySegmentQuery {
  id: string;
  start: Point3D;
  end: Point3D;
  control_point?: Point3D;
}

export interface RailwaySnapResult {
  snap_type: string; // "node" or "segment"
  target_id: string;
  distance: number;
  snap_point: Point3D;
  segment_t?: number; // Parameter for segment snaps
}

// High-performance batch node distance calculation for railway snapping
export async function calculateRailwayNodeDistances(
  queryPoint: Point3D,
  nodes: RailwayNodeQuery[],
  snapThreshold: number
): Promise<RailwaySnapResult[]> {
  return await invoke<RailwaySnapResult[]>('calculate_railway_node_distances', {
    query_point: queryPoint,
    nodes,
    snap_threshold: snapThreshold
  });
}

// High-performance railway segment snapping with optimized closest-point calculations
export async function calculateRailwaySegmentSnaps(
  queryPoint: Point3D,
  segments: RailwaySegmentQuery[],
  snapThreshold: number
): Promise<RailwaySnapResult[]> {
  return await invoke<RailwaySnapResult[]>('calculate_railway_segment_snaps', {
    query_point: queryPoint,
    segments,
    snap_threshold: snapThreshold
  });
}

// Combined high-performance railway snap detection
export async function detectRailwaySnapTarget(
  queryPoint: Point3D,
  nodes: RailwayNodeQuery[],
  segments: RailwaySegmentQuery[],
  snapThreshold: number,
  nodePriorityMultiplier: number = 1.2
): Promise<RailwaySnapResult | null> {
  return await invoke<RailwaySnapResult | null>('detect_railway_snap_target', {
    query_point: queryPoint,
    nodes,
    segments,
    snap_threshold: snapThreshold,
    node_priority_multiplier: nodePriorityMultiplier
  });
}

// ===== HIGH-PERFORMANCE RAILWAY INTERSECTION OPTIMIZATION =====

export interface LineSegment2D {
  start: Point3D;
  end: Point3D;
}

export interface IntersectionResult {
  point: Point3D;
  t1: number;
  t2: number;
  segment_index: number;
}

/// High-performance railway intersection detection using SIMD optimization
export async function detectRailwayIntersectionsBulkSIMD(
  previewSegment: LineSegment2D,
  existingSegments: LineSegment2D[],
  intersectionThreshold: number = 0.1
): Promise<IntersectionResult[]> {
  return await invoke<IntersectionResult[]>('detect_railway_intersections_bulk_simd', {
    preview_segment: previewSegment,
    existing_segments: existingSegments,
    intersection_threshold: intersectionThreshold
  });
}

/// High-performance real-time intersection preview for drawing (optimized for 60fps)
export async function detectRailwayIntersectionsRealtime(
  previewStart: Point3D,
  previewEnd: Point3D,
  segmentPolylines: Point3D[][],
  currentFloor: number
): Promise<Point3D[]> {
  return await invoke<Point3D[]>('detect_railway_intersections_realtime', {
    preview_start: previewStart,
    preview_end: previewEnd,
    segment_polylines: segmentPolylines,
    current_floor: currentFloor
  });
}

/// High-performance multiple intersection support - returns ALL intersections
export async function findAllRailwayIntersectionsSIMD(
  segmentPairs: [LineSegment2D, LineSegment2D][]
): Promise<IntersectionResult[][]> {
  return await invoke<IntersectionResult[][]>('find_all_railway_intersections_simd', {
    segment_pairs: segmentPairs
  });
}

// ============================================================================
// NEW: Power System Commands - Rust Backend Integration
// ============================================================================

// Type definitions for powerline system
export interface PowerPole {
  id: string;
  position: Point3D;
  poleType: string;
  range: number;
  maxConnections: number;
  connections: string[];
}

export interface PowerlineSegment {
  id: string;
  startPole: string;
  endPole: string;
  startPoint: Point3D;
  endPoint: Point3D;
  controlPoints?: Point3D[];
  length: number;
  capacity: number;
  voltage: string;
  floor: number;
}

export interface Powerline {
  id: string;
  segments: string[];
  fromBuildingId?: string;
  fromPowerPoint?: string;
  toBuildingId?: string;
  toPowerPoint?: string;
  capacity: number;
  currentLoad: number;
  efficiency: number;
  voltage: string;
}

export interface PowerValidationResult {
  isValid: boolean;
  canConnect: boolean;
  reason?: string;
  distanceToTarget: number;
  withinRange: boolean;
  capacityValid: boolean;
  voltageCompatible: boolean;
  suggestions?: string[];
}

export interface PowerNetworkAnalysis {
  totalGeneration: number;
  totalConsumption: number;
  efficiency: number;
  bottlenecks: string[];
  suggestions: string[];
}

// Power pole operations
export async function createPowerPole(
  id: string,
  position: Point3D,
  poleType: string
): Promise<PowerPole> {
  return await invoke<PowerPole>('create_power_pole', {
    id,
    position,
    pole_type: poleType,
  });
}

export async function updatePowerPolePosition(
  poleId: string,
  newPosition: Point3D
): Promise<void> {
  return await invoke<void>('update_power_pole_position', {
    pole_id: poleId,
    new_position: newPosition,
  });
}

export async function deletePowerPole(poleId: string): Promise<void> {
  return await invoke<void>('delete_power_pole', { pole_id: poleId });
}

export async function getPowerPole(poleId: string): Promise<PowerPole | null> {
  return await invoke<PowerPole | null>('get_power_pole', { pole_id: poleId });
}

export async function getAllPowerPoles(): Promise<PowerPole[]> {
  return await invoke<PowerPole[]>('get_all_power_poles');
}

// Powerline operations
export async function createPowerline(
  id: string,
  startPole: string,
  endPole: string,
  voltage: string
): Promise<Powerline> {
  return await invoke<Powerline>('create_powerline', {
    id,
    start_pole: startPole,
    end_pole: endPole,
    voltage,
  });
}

export async function updatePowerline(
  powerlineId: string,
  updates: Partial<Powerline>
): Promise<void> {
  return await invoke<void>('update_powerline', {
    powerline_id: powerlineId,
    updates,
  });
}

export async function deletePowerline(powerlineId: string): Promise<void> {
  return await invoke<void>('delete_powerline', { powerline_id: powerlineId });
}

export async function getPowerline(powerlineId: string): Promise<Powerline | null> {
  return await invoke<Powerline | null>('get_powerline', { powerline_id: powerlineId });
}

export async function getAllPowerlines(): Promise<Powerline[]> {
  return await invoke<Powerline[]>('get_all_powerlines');
}

// Power validation operations
export async function validatePowerConnection(
  fromId: string,
  toId: string,
  connectionType: string
): Promise<PowerValidationResult> {
  return await invoke<PowerValidationResult>('validate_power_connection', {
    from_id: fromId,
    to_id: toId,
    connection_type: connectionType,
  });
}

export async function calculatePowerDistance(
  from: Point3D,
  to: Point3D
): Promise<number> {
  const { isTauriEnvironment } = await import('./environment');
  
  if (!isTauriEnvironment()) {
    // Fallback to frontend calculation in web environment
    const { distance3D } = await import('../utils/helpers');
    return distance3D(from, to);
  }
  
  return await invoke<number>('calculate_power_distance', { from, to });
}

export async function findOptimalPowerPath(
  startPoint: Point3D,
  endPoint: Point3D,
  obstacles: Point3D[],
  maxSegmentLength: number
): Promise<Point3D[]> {
  return await invoke<Point3D[]>('find_optimal_power_path', {
    start_point: startPoint,
    end_point: endPoint,
    obstacles,
    max_segment_length: maxSegmentLength,
  });
}

// Power network analysis
export async function analyzePowerNetwork(
  buildingIds: string[],
  powerlineIds: string[]
): Promise<PowerNetworkAnalysis> {
  return await invoke<PowerNetworkAnalysis>('analyze_power_network', {
    building_ids: buildingIds,
    powerline_ids: powerlineIds,
  });
}

export async function calculatePowerFlow(
  networkId: string
): Promise<{ flow: number; efficiency: number; bottlenecks: string[] }> {
  return await invoke<{ flow: number; efficiency: number; bottlenecks: string[] }>('calculate_power_flow', {
    network_id: networkId,
  });
}

export async function optimizePowerNetwork(
  networkId: string
): Promise<{ suggestions: string[]; estimatedImprovement: number }> {
  return await invoke<{ suggestions: string[]; estimatedImprovement: number }>('optimize_power_network', {
    network_id: networkId,
  });
}

// High-performance power pole queries (similar to railway system)
export async function queryPowerPolesRadius(
  center: Point3D,
  radius: number,
  excludeIds: string[] = []
): Promise<PowerPole[]> {
  return await invoke<PowerPole[]>('query_power_poles_radius', {
    center,
    radius,
    exclude_ids: excludeIds
  });
}

export async function findNearestPowerPole(
  position: Point3D,
  maxDistance: number
): Promise<PowerPole | null> {
  return await invoke<PowerPole | null>('find_nearest_power_pole', { 
    position, 
    max_distance: maxDistance 
  });
}

// Powerline segment operations
export async function createPowerlineSegment(
  id: string,
  startPole: string,
  endPole: string,
  segmentType: string
): Promise<PowerlineSegment> {
  return await invoke<PowerlineSegment>('create_powerline_segment', {
    id,
    start_pole: startPole,
    end_pole: endPole,
    segment_type: segmentType,
  });
}

export async function updatePowerlineSegment(
  segmentId: string,
  updates: Partial<PowerlineSegment>
): Promise<void> {
  return await invoke<void>('update_powerline_segment', {
    segment_id: segmentId,
    updates,
  });
}

export async function deletePowerlineSegment(segmentId: string): Promise<void> {
  return await invoke<void>('delete_powerline_segment', { segment_id: segmentId });
}

// Power connection validation with building integration
export async function validateBuildingPowerConnection(
  buildingId: string,
  powerPointId: string,
  targetId: string,
  targetType: 'building' | 'pole'
): Promise<PowerValidationResult> {
  const { isTauriEnvironment } = await import('./environment');
  
  if (!isTauriEnvironment()) {
    // Fallback validation in web environment
    return {
      isValid: true,
      canConnect: true,
      distanceToTarget: 0,
      withinRange: true,
      capacityValid: true,
      voltageCompatible: true,
      suggestions: []
    };
  }
  
  return await invoke<PowerValidationResult>('validate_building_power_connection', {
    building_id: buildingId,
    power_point_id: powerPointId,
    target_id: targetId,
    target_type: targetType,
  });
}

export async function getBuildingPowerConnections(
  buildingId: string
): Promise<string[]> {
  return await invoke<string[]>('get_building_power_connections', {
    building_id: buildingId,
  });
}

export async function calculatePowerCapacity(
  startPoint: Point3D,
  endPoint: Point3D,
  wireType: string
): Promise<{ capacity: number; efficiency: number; loss: number }> {
  const { isTauriEnvironment } = await import('./environment');
  
  if (!isTauriEnvironment()) {
    // Fallback to frontend calculation in web environment
    const { distance3D } = await import('../utils/helpers');
    const distance = distance3D(startPoint, endPoint);
    
    // Simple fallback capacity calculation based on wire type
    const wireCapacities = {
      'power_pole_mk1': 1000,
      'power_pole_mk2': 2000,
      'power_pole_mk3': 5000,
      'power_tower': 10000,
    };
    
    const baseCapacity = wireCapacities[wireType as keyof typeof wireCapacities] || 1000;
    const lengthPenalty = distance > 50 ? 0.9 : 1.0;
    const capacity = Math.floor(baseCapacity * lengthPenalty);
    
    return {
      capacity,
      efficiency: Math.max(80, 100 - (distance * 0.1)),
      loss: Math.min(20, distance * 0.1)
    };
  }
  
  return await invoke<{ capacity: number; efficiency: number; loss: number }>('calculate_power_capacity', {
    start_point: startPoint,
    end_point: endPoint,
    wire_type: wireType,
  });
}

// Bulk powerline operations for performance
export async function createMultiplePowerlines(
  powerlines: Array<{
    id: string;
    startPole: string;
    endPole: string;
    voltage: string;
  }>
): Promise<Powerline[]> {
  return await invoke<Powerline[]>('create_multiple_powerlines', {
    powerlines,
  });
}

export async function validateMultiplePowerConnections(
  connections: Array<{
    fromId: string;
    toId: string;
    connectionType: string;
  }>
): Promise<PowerValidationResult[]> {
  return await invoke<PowerValidationResult[]>('validate_multiple_power_connections', {
    connections,
  });
}

// ============================================================================
// NEW RUST PERFORMANCE OPTIMIZATION COMMANDS
// ============================================================================

// Interface for spatial intersection detection
export interface PolylineIntersection {
  point: { x: number; y: number };
  t1: number;
  t2: number;
}

// Interface for railway curve optimization
export interface RailwayCurveOptimization {
  optimizedPoints: Point3D[];
  curveSegments: CurveSegment[];
  processingTimeMs: number;
  pointsOptimized: number;
  curvesCreated: number;
  performanceGain: number;
}

export interface CurveSegment {
  startPoint: Point3D;
  endPoint: Point3D;
  controlPoint: Point3D;
  segmentType: 'straight' | 'curve';
}

// SIMD-optimized spatial intersection detection
export async function findIntersectionsSpatial(
  poly1: { x: number; y: number }[],
  poly2: { x: number; y: number }[],
  useSpatialOptimization: boolean = true
): Promise<PolylineIntersection[]> {
  return await invoke<PolylineIntersection[]>('find_intersections_spatial', {
    poly1,
    poly2,
    use_spatial_optimization: useSpatialOptimization
  });
}

// Batch railway curve calculations with SIMD
export async function calculateRailwayCurvesBatch(
  points: Point3D[],
  curveThreshold: number = 0.873,
  minCurveRadius: number = 2.0
): Promise<RailwayCurveOptimization> {
  return await invoke<RailwayCurveOptimization>('calculate_railway_curves_batch', {
    points,
    curve_threshold: curveThreshold,
    min_curve_radius: minCurveRadius
  });
}

// SIMD-optimized segment length calculations
export async function calculateSegmentLengthsSimd(
  points: Point3D[]
): Promise<number[]> {
  return await invoke<number[]>('calculate_segment_lengths_simd', {
    points
  });
}

// SIMD-optimized Bezier approximation
export async function approximateBezierSimd(
  start: Point3D,
  control: Point3D,
  end: Point3D,
  steps: number = 20
): Promise<Point3D[]> {
  return await invoke<Point3D[]>('approximate_bezier_simd', {
    start,
    control,
    end,
    steps
  });
}

// ============================================================================
// GPU-ACCELERATED COMMANDS - HIGH-PERFORMANCE IMPLEMENTATIONS
// ============================================================================

// GPU calculation result wrapper
export interface GpuCalculationResult<T> {
  result: T;
  used_gpu: boolean;
  gpu_time_ms?: number;
  total_time_ms: number;
  fallback_reason?: string;
}

// Line intersection types for GPU calculations
export interface LineSegmentInput {
  start: Point3D;
  end: Point3D;
}

export interface LineIntersectionResult {
  point: Point3D;
  t1: number;
  t2: number;
}

// Spatial query types for GPU calculations
export interface SpatialBounds {
  min: Point3D;
  max: Point3D;
}

export interface SpatialQueryObject {
  id: number;
  object_type: number;
  bounds: SpatialBounds;
}

export interface SpatialQueryResultItem {
  object_id: number;
  object_type: number;
  distance: number;
}

// GPU status and diagnostics
export interface GpuStatusInfo {
  is_available: boolean;
  adapter_name?: string;
  backend?: string;
  device_type?: string;
  memory_usage_mb: number;
  peak_memory_mb: number;
  max_buffer_size_mb: number;
  features_supported: string[];
  warnings: string[];
  errors: string[];
}

export interface GpuBenchmarkReport {
  adapter_name: string;
  backend: string;
  overall_speedup?: number;
  distance_speedup?: number;
  curve_speedup?: number;
  intersection_speedup?: number;
  spatial_speedup?: number;
  benchmark_duration_ms: number;
}

// GPU-accelerated bulk distance calculations with automatic fallback
export async function calculateDistancesBulkGpu(
  pointsA: Point3D[],
  pointsB: Point3D[],
  distanceType: '3d' | '3d_squared' | '2d' | '2d_squared' = '3d'
): Promise<GpuCalculationResult<number[]>> {
  return await invoke<GpuCalculationResult<number[]>>('calculate_distances_bulk_gpu', {
    points_a: pointsA,
    points_b: pointsB,
    distance_type: distanceType
  });
}

// GPU-accelerated Bezier curve generation with automatic fallback
export async function generateBezierCurvesBulkGpu(
  starts: Point3D[],
  controls: Point3D[],
  ends: Point3D[],
  numPointsPerCurve: number,
  adaptiveTessellation: boolean = false
): Promise<GpuCalculationResult<Point3D[][]>> {
  return await invoke<GpuCalculationResult<Point3D[][]>>('generate_bezier_curves_bulk_gpu', {
    starts,
    controls,
    ends,
    num_points_per_curve: numPointsPerCurve,
    adaptive_tessellation: adaptiveTessellation
  });
}

// GPU-accelerated line intersection detection with automatic fallback
export async function findLineIntersectionsBulkGpu(
  linesA: LineSegmentInput[],
  linesB: LineSegmentInput[],
  epsilon: number = 1e-6,
  maxResults?: number
): Promise<GpuCalculationResult<LineIntersectionResult[]>> {
  return await invoke<GpuCalculationResult<LineIntersectionResult[]>>('find_line_intersections_bulk_gpu', {
    lines_a: linesA,
    lines_b: linesB,
    epsilon,
    max_results: maxResults
  });
}

// GPU-accelerated spatial queries with automatic fallback
export async function spatialQueryGpu(
  queryType: 'point' | 'radius' | 'bbox',
  queryPoint: Point3D,
  objects: SpatialQueryObject[],
  options: {
    queryRadius?: number;
    queryBbox?: SpatialBounds;
    maxResults?: number;
  } = {}
): Promise<GpuCalculationResult<SpatialQueryResultItem[]>> {
  return await invoke<GpuCalculationResult<SpatialQueryResultItem[]>>('spatial_query_gpu', {
    query_type: queryType,
    query_point: queryPoint,
    query_radius: options.queryRadius,
    query_bbox: options.queryBbox,
    objects,
    max_results: options.maxResults
  });
}

// Get GPU compute status and diagnostics
export async function getGpuStatus(): Promise<GpuStatusInfo> {
  return await invoke<GpuStatusInfo>('get_gpu_status');
}

// Run comprehensive GPU benchmark
export async function runGpuBenchmark(): Promise<GpuBenchmarkReport> {
  return await invoke<GpuBenchmarkReport>('run_gpu_benchmark');
}

// Utility function to check if GPU acceleration is available
export async function isGpuAvailable(): Promise<boolean> {
  try {
    const status = await getGpuStatus();
    return status.is_available;
  } catch (error) {
    console.warn('Failed to check GPU status:', error);
    return false;
  }
}

// Utility function to get GPU performance summary
export async function getGpuPerformanceSummary(): Promise<{
  isAvailable: boolean;
  adapter?: string;
  overallSpeedup?: number;
  memoryUsage?: string;
  recommendedForWorkload?: boolean;
}> {
  try {
    const status = await getGpuStatus();
    
    if (!status.is_available) {
      return {
        isAvailable: false,
        recommendedForWorkload: false
      };
    }

    let overallSpeedup: number | undefined;
    try {
      const benchmark = await runGpuBenchmark();
      overallSpeedup = benchmark.overall_speedup;
    } catch (error) {
      console.warn('GPU benchmark failed:', error);
    }

    return {
      isAvailable: true,
      adapter: status.adapter_name,
      overallSpeedup,
      memoryUsage: `${status.memory_usage_mb}MB / ${status.max_buffer_size_mb}MB`,
      recommendedForWorkload: overallSpeedup ? overallSpeedup > 2.0 : undefined
    };
  } catch (error) {
    console.warn('Failed to get GPU performance summary:', error);
    return {
      isAvailable: false,
      recommendedForWorkload: false
    };
  }
}

// Example usage functions demonstrating GPU acceleration
export async function demonstrateGpuAcceleration(): Promise<void> {
  console.log('GPU Acceleration Demonstration');
  console.log('===============================');

  // Check GPU availability
  const status = await getGpuStatus();
  console.log('GPU Available:', status.is_available);
  if (status.adapter_name) {
    console.log('GPU Adapter:', status.adapter_name);
    console.log('Backend:', status.backend);
  }

  if (!status.is_available) {
    console.log('GPU not available, will use CPU fallback');
    return;
  }

  // Demonstrate distance calculations
  const pointsA = Array.from({ length: 1000 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 20
  }));
  
  const pointsB = Array.from({ length: 1000 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 20
  }));

  console.log('\nTesting GPU distance calculations...');
  const distanceResult = await calculateDistancesBulkGpu(pointsA, pointsB, '3d');
  console.log('Used GPU:', distanceResult.used_gpu);
  console.log('GPU Time:', distanceResult.gpu_time_ms, 'ms');
  console.log('Total Time:', distanceResult.total_time_ms, 'ms');
  if (distanceResult.fallback_reason) {
    console.log('Fallback Reason:', distanceResult.fallback_reason);
  }

  // Demonstrate curve generation
  console.log('\nTesting GPU curve generation...');
  const starts = pointsA.slice(0, 100);
  const controls = pointsB.slice(0, 100);
  const ends = pointsA.slice(100, 200);

  const curveResult = await generateBezierCurvesBulkGpu(starts, controls, ends, 20);
  console.log('Used GPU:', curveResult.used_gpu);
  console.log('GPU Time:', curveResult.gpu_time_ms, 'ms');
  console.log('Generated curves:', curveResult.result.length);

  // Run benchmark
  console.log('\nRunning GPU benchmark...');
  try {
    const benchmark = await runGpuBenchmark();
    console.log('Overall Speedup:', benchmark.overall_speedup?.toFixed(2) + 'x');
    console.log('Distance Speedup:', benchmark.distance_speedup?.toFixed(2) + 'x');
    console.log('Curve Speedup:', benchmark.curve_speedup?.toFixed(2) + 'x');
    console.log('Intersection Speedup:', benchmark.intersection_speedup?.toFixed(2) + 'x');
    console.log('Spatial Speedup:', benchmark.spatial_speedup?.toFixed(2) + 'x');
  } catch (error) {
    console.warn('Benchmark failed:', error);
  }

  console.log('\nGPU Acceleration demonstration complete!');
}