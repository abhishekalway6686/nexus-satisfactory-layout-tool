import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Point3D, Building, ConnectionPoint, RailwayNode, RailwaySegment, ConveyorPole, ConveyorSegment, PipeSupport, PipeSegment } from '../types';
import { isTauriEnvironment } from './environment';

// Extended command interface for full feature integration

// File operations with native dialogs
export async function openLayoutFile(): Promise<string | null> {
  if (!isTauriEnvironment()) return null;
  
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Satisfactory Layout',
      extensions: ['slt', 'json']
    }]
  });
  
  if (selected && typeof selected === 'string') {
    await invoke('load_layout', { file_path: selected });
    return selected;
  }
  
  return null;
}

export async function saveLayoutFile(defaultPath?: string): Promise<string | null> {
  if (!isTauriEnvironment()) return null;
  
  const filePath = await save({
    defaultPath,
    filters: [{
      name: 'Satisfactory Layout',
      extensions: ['slt']
    }]
  });
  
  if (filePath) {
    await invoke('save_layout', { file_path: filePath });
    return filePath;
  }
  
  return null;
}

// Batch operations for performance
export async function updateBuildingsBatch(updates: Array<{ id: string; position?: Point3D; rotation?: number }>): Promise<void> {
  if (!isTauriEnvironment()) return;
  
  return await invoke('update_buildings_batch', { updates });
}

export async function createConveyorsBatch(conveyors: Array<{
  id: string;
  poles: ConveyorPole[];
  segments: ConveyorSegment[];
}>): Promise<void> {
  if (!isTauriEnvironment()) return;
  
  return await invoke('create_conveyors_batch', { conveyors });
}

export async function createPipesBatch(pipes: Array<{
  id: string;
  supports: PipeSupport[];
  segments: PipeSegment[];
}>): Promise<void> {
  if (!isTauriEnvironment()) return;
  
  return await invoke('create_pipes_batch', { pipes });
}

// Railway operations
export async function createRailwayNodesBatch(nodes: RailwayNode[]): Promise<void> {
  if (!isTauriEnvironment()) return;
  
  return await invoke('create_railway_nodes_batch', { nodes });
}

export async function createRailwaySegmentsBatch(segments: RailwaySegment[]): Promise<void> {
  if (!isTauriEnvironment()) return;
  
  return await invoke('create_railway_segments_batch', { segments });
}

export async function updateRailwayGeometry(
  nodeUpdates: Array<{ id: string; position: Point3D }>,
  segmentIds: string[]
): Promise<{ updatedSegments: RailwaySegment[] }> {
  if (!isTauriEnvironment()) return { updatedSegments: [] };
  
  return await invoke('update_railway_geometry', { 
    node_updates: nodeUpdates,
    segment_ids: segmentIds 
  });
}

// Advanced spatial queries
export async function findBuildingsInArea(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  floor: number
): Promise<string[]> {
  if (!isTauriEnvironment()) return [];
  
  return await invoke('find_buildings_in_area', { 
    min_x: minX,
    min_y: minY,
    max_x: maxX,
    max_y: maxY,
    floor 
  });
}

export async function findConnectableBuildings(
  position: Point3D,
  connectionType: 'input' | 'output' | 'bidirectional',
  isFluid: boolean,
  maxDistance: number
): Promise<Array<{ buildingId: string; connectionPoint: ConnectionPoint; distance: number }>> {
  if (!isTauriEnvironment()) return [];
  
  return await invoke('find_connectable_buildings', {
    position,
    connection_type: connectionType,
    is_fluid: isFluid,
    max_distance: maxDistance
  });
}

// Collision detection
export async function checkBuildingCollision(
  buildingType: string,
  position: Point3D,
  rotation: number,
  excludeId?: string
): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  
  return await invoke('check_building_collision', {
    building_type: buildingType,
    position,
    rotation,
    exclude_id: excludeId
  });
}

export async function findLineIntersections(
  lines: Array<{ start: Point3D; end: Point3D; id: string }>
): Promise<Array<{ line1Id: string; line2Id: string; intersection: Point3D }>> {
  if (!isTauriEnvironment()) return [];
  
  return await invoke('find_line_intersections', { lines });
}

// Path finding
export async function findOptimalConveyorPath(
  start: Point3D,
  end: Point3D,
  obstacles: string[]
): Promise<Point3D[]> {
  if (!isTauriEnvironment()) return [start, end];
  
  return await invoke('find_optimal_conveyor_path', {
    start,
    end,
    obstacle_ids: obstacles
  });
}

export async function findOptimalRailwayPath(
  start: Point3D,
  end: Point3D,
  existingNodes: Record<string, RailwayNode>,
  maxCurveRadius: number
): Promise<{ nodes: Point3D[]; shouldMerge: boolean; mergeNodeId?: string }> {
  if (!isTauriEnvironment()) {
    return { nodes: [start, end], shouldMerge: false };
  }
  
  return await invoke('find_optimal_railway_path', {
    start,
    end,
    existing_nodes: existingNodes,
    max_curve_radius: maxCurveRadius
  });
}

// Performance analytics
export async function getLayoutStatistics(): Promise<{
  totalBuildings: number;
  totalConveyors: number;
  totalPipes: number;
  totalRailways: number;
  memoryUsage: number;
  spatialIndexSize: number;
}> {
  if (!isTauriEnvironment()) {
    return {
      totalBuildings: 0,
      totalConveyors: 0,
      totalPipes: 0,
      totalRailways: 0,
      memoryUsage: 0,
      spatialIndexSize: 0
    };
  }
  
  return await invoke('get_layout_statistics');
}

// Validation and repair
export async function validateLayout(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  if (!isTauriEnvironment()) {
    return { isValid: true, errors: [], warnings: [] };
  }
  
  return await invoke('validate_layout');
}

export async function repairLayout(): Promise<{
  repaired: boolean;
  changes: string[];
}> {
  if (!isTauriEnvironment()) {
    return { repaired: false, changes: [] };
  }
  
  return await invoke('repair_layout');
}