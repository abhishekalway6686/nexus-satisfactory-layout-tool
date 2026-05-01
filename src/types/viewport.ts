// High-performance viewport system types for Rust backend

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  floor: number;
}

export interface ViewportConfig {
  culling_enabled: boolean;
  predictive_cache_enabled: boolean;
  max_objects_per_query: number;
  spatial_index_cell_size: number;
  cache_prediction_distance: number;
}

export type CanvasObjectType = 
  | "building" 
  | "conveyor_belt" 
  | "pipe" 
  | "railway" 
  | "power_line" 
  | "foundation" 
  | "wall" 
  | "railing" 
  | "sticky_note";

export interface ObjectData {
  type: "Point" | "Line" | "Rectangle" | "Curve";
  point?: Point3D;
  start?: Point3D;
  end?: Point3D;
  min?: Point3D;
  max?: Point3D;
  points?: Point3D[];
}

export interface SpatialQueryResult {
  id: string;
  object_type: CanvasObjectType;
  data: ObjectData;
  distance?: number;
}

export interface GridLine {
  start: Point3D;
  end: Point3D;
  is_major: boolean;
}

export interface TransformResult {
  screen_x: number;
  screen_y: number;
}

export interface BatchTransformResult {
  transforms: TransformResult[];
}

export interface ViewportMetrics {
  objects_in_spatial_index: number;
  cache_hit_rate: number;
  cache_size: number;
  last_query_time_ms: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Viewport system commands
export interface ViewportCommands {
  initViewportSystem(config: ViewportConfig): Promise<void>;
  updateViewportBounds(bounds: ViewportBounds): Promise<SpatialQueryResult[]>;
  getViewportMetrics(): Promise<ViewportMetrics>;
}

// Default viewport configuration for high performance
export const DEFAULT_VIEWPORT_CONFIG: ViewportConfig = {
  culling_enabled: true,
  predictive_cache_enabled: true,
  max_objects_per_query: 10000,
  spatial_index_cell_size: 50.0,
  cache_prediction_distance: 1000.0,
};

