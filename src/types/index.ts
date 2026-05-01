// src/types/index.ts

export interface Point {
  x: number;
  y: number;
}

export interface Point3D extends Point {
  z: number;
}

export interface ConnectionPoint {
  id: string;
  x: number; // Relative to building origin
  y: number;
  type: 'input' | 'output' | 'bidirectional';
  side: 'left' | 'right' | 'front' | 'back';
  isFluid?: boolean; // New field to indicate fluid connections
}

export interface RailwayConnectionPoint {
  id: string;
  x: number; // Relative to building origin
  y: number;
  type: 'railway';
  side: 'left' | 'right' | 'front' | 'back';
  direction: 'in' | 'out' | 'bidirectional';
}

// Building Alignment Validation Types
export type AlignmentQuality = 'perfect' | 'good' | 'warning' | 'error';

export interface AlignmentValidationResult {
  score: number; // 0-100, higher is better
  quality: AlignmentQuality;
  isValid: boolean; // Whether connection should be allowed
  approachAngle: number; // Angle of railway approach in degrees
  optimalAngle: number; // Best angle for this connection
  angleDifference: number; // Absolute difference from optimal
  message?: string; // User-friendly description
  suggestions?: AlignmentSuggestion[];
}

export interface AlignmentSuggestion {
  type: 'rotate_building' | 'adjust_path' | 'use_different_connection';
  description: string;
  targetRotation?: 0 | 90 | 180 | 270; // For building rotation suggestions
  alternativeConnectionPoint?: string; // For different connection suggestions
  estimatedImprovement: number; // Expected score improvement (0-100)
}

export interface BuildingAlignmentContext {
  building: Building;
  connectionPoint: RailwayConnectionPoint;
  approachPoint: Point3D; // Where railway is approaching from
  connectionWorldPos: Point3D; // World position of connection point
  buildingRotation: 0 | 90 | 180 | 270;
  railwayDirection: Point3D; // Direction vector of approaching railway
}

export interface RailwayNode {
  id: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  isAnchor?: boolean;
  snappedSegment?: string;
  snappedT?: number;
  type?: 'straight' | 'curve';  // Added to match potential usage in literals
}

// Production Simulation Status Types
export type BuildingProductionStatus =
  | 'idle'           // No recipe selected or no inputs
  | 'running'        // Actively producing
  | 'blocked'        // Output full, cannot produce
  | 'starved'        // Missing inputs
  | 'underpowered'   // Insufficient power
  | 'standby';       // Manually paused

// Station Resource Configuration (for train stations/freight platforms)
export interface StationResourceConfig {
  resourceId: string;           // Item or fluid ID (e.g., 'iron_ore', 'water')
  isFluid: boolean;            // Whether this is a fluid resource
  rate: number;                // Rate in items/min or m³/min
  enabled: boolean;            // Whether this station is active as source
  trainFrequency?: number;     // Optional: trains/hour for calculation display
  cargoPerTrain?: number;      // Optional: items or m³ per train load
}

// Building role in production flow
export type BuildingProductionRole =
  | 'producer'      // Produces items (constructors, assemblers, etc.)
  | 'consumer'      // Consumes items (sinks, awesome sink)
  | 'passthrough'   // Passes items through (splitters, mergers, buffers)
  | 'source'        // Injects items into the system (configured stations, miners)
  | 'sink'          // Final destination for items (storage, trash)
  | 'accumulator';  // Stores items with tracking (storage containers)

export interface BuildingProductionState {
  status: BuildingProductionStatus;
  efficiency: number; // 0-100, actual production rate vs theoretical max
  inputRates: Record<string, number>; // Actual input rates per item
  outputRates: Record<string, number>; // Actual output rates per item
  powerConsumption: number; // Current power draw in MW
  lastUpdated: number; // Timestamp for cache invalidation
}

export interface Building {
  id: string;
  type: string;
  x: number; // In meters
  y: number;
  z: number; // Floor level * 4 meters
  floor: number;
  rotation: 0 | 90 | 180 | 270;
  connectionPoints: ConnectionPoint[];
  railwayPoints?: RailwayConnectionPoint[];
  text?: string; // For sticky notes and train station names
  width?: number; // For resizable sticky notes
  height?: number; // For resizable sticky notes
  material?: 'default' | 'concrete' | 'coated' | 'asphalt' | 'grip_metal'; // For foundation materials
  // Production Simulation Fields
  selectedRecipeId?: string | null; // Currently selected recipe for production buildings
  clockSpeed?: number; // Clock speed percentage (1-250), default 100
  productionState?: BuildingProductionState; // Current production state (computed)
  // Extraction Building Fields
  extractedResourceId?: string | null; // Resource ID for miners/extractors (e.g., 'iron_ore', 'water', 'crude_oil')
  // Station Source Configuration (for train stations/freight platforms)
  stationResourceConfig?: StationResourceConfig; // User-defined incoming resource for stations
  // Storage Tracking
  storageAccumulationRate?: number; // items/min or m³/min being stored (computed)
  storageFillTime?: number; // Time to fill at current rate in hours (computed)
}

export interface ConveyorPole {
  id: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  isAnchor?: boolean; // Poles at building connections
}

export interface ConveyorSegment {
  id: string;
  type: 'straight' | 'turn' | 'incline';
  startPole: string; // Pole ID
  endPole: string;
  controlPoints?: Point3D[]; // For curved segments
  length: number;
  // Production Simulation Fields
  beltTier?: 1 | 2 | 3 | 4 | 5 | 6; // Belt tier (default 1)
  maxThroughput?: number; // Maximum throughput derived from tier (items/min)
  actualThroughput?: number; // Calculated actual throughput (items/min, default 0)
  itemType?: string | null; // What item type is flowing through this segment
  isBottleneck?: boolean; // Whether this segment is a bottleneck (default false)
}

export interface ConveyorBelt {
  id: string;
  segments: string[]; // Segment IDs
  fromBuildingId?: string;
  fromConnectionPoint?: string;
  toBuildingId?: string;
  toConnectionPoint?: string;
  floor: number;
  mark: 1 | 2 | 3 | 4 | 5 | 6; // Belt tier
  direction: 'forward' | 'reverse'; // Direction of flow
}

export interface ConveyorLift {
  id: string;
  x: number; // World position in meters
  y: number;
  startFloor: number; // Bottom floor
  endFloor: number; // Top floor
  mark: 1 | 2 | 3 | 4 | 5 | 6; // Lift tier (determines throughput and cost)
  direction: 'up' | 'down'; // Direction of item flow
  height: number; // Height in meters (calculated from floor difference)
  cost: number; // Total cost based on height and tier
  connectionPoints: ConnectionPoint[]; // Standard connection points (2: one on start floor, one on end floor)
}

export interface PipeFloorConnection {
  id: string;
  x: number; // World position in meters
  y: number;
  startFloor: number; // Bottom floor
  endFloor: number; // Top floor
  mark: 1 | 2; // Pipe tier (Mk.1 or Mk.2)
  direction: 'up' | 'down'; // Direction of fluid flow
  height: number; // Height in meters (calculated from floor difference)
  cost: number; // Total cost based on height and tier
  // Connection points for pipe connections on start and end floors
  bottomConnectionPoint: {
    id: string;
    x: number; // Relative to connection position
    y: number;
    type: 'input' | 'output'; // Based on direction
    isFluid: boolean; // Always true for pipe connections
  };
  topConnectionPoint: {
    id: string;
    x: number; // Relative to connection position
    y: number;
    type: 'input' | 'output'; // Based on direction
    isFluid: boolean; // Always true for pipe connections
  };
}

// Fluid pipe system types
export interface PipeSupport {
  id: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  isAnchor?: boolean; // Supports at building connections
  isPump?: boolean; // Is this a pump location
  pumpDirection?: 'up' | 'down'; // Direction of pump if applicable
}

export interface PipeSegment {
  id: string;
  type: 'straight' | 'turn' | 'incline' | 'vertical';
  startSupport: string; // Support ID
  endSupport: string;
  controlPoints?: Point3D[]; // For curved segments
  length: number;
  headLift?: number; // Vertical distance
  // Production Simulation Fields
  pipeTier?: 1 | 2; // Pipe tier (default 1)
  maxThroughput?: number; // Maximum throughput derived from tier (300 or 600 m^3/min)
  actualThroughput?: number; // Calculated actual throughput (m^3/min, default 0)
  fluidType?: string | null; // What fluid type is flowing through this segment
  isBottleneck?: boolean; // Whether this segment is a bottleneck (default false)
}

export interface Pipeline {
  id: string;
  segments: string[]; // Segment IDs
  fromBuildingId?: string;
  fromConnectionPoint?: string;
  toBuildingId?: string;
  toConnectionPoint?: string;
  floor: number;
  mark: 1 | 2; // Mk.1 (300m³/min) or Mk.2 (600m³/min)
  fluidType?: 'water' | 'oil' | 'fuel' | 'acid' | 'alumina' | 'nitrogen'; // Type of fluid
}

// Enhanced transport system types
export interface RailwaySegment {
  id: string;
  type: 'straight' | 'curve';
  startNode: string;
  endNode: string;
  startPoint: Point3D;
  endPoint: Point3D;
  controlPoints?: Point3D[]; // For curves
  length: number;
  fromStation?: string; // Station building ID
  toStation?: string; // Station building ID
  fromRailPoint?: string; // Railway connection point ID
  toRailPoint?: string; // Railway connection point ID
  direction?: 'forward' | 'reverse' | 'bidirectional'; // Direction of train travel
  showArrows?: boolean; // Whether to display direction arrows
  intersectionPoints?: RailwayIntersectionPoint[]; // For segments with intersections
}

export interface Railway {
  id: string;
  segments: string[]; // Segment IDs
  floor: number;
  stations: string[]; // Connected station building IDs
  junctionNodes?: string[]; // Junction node IDs for complex intersections
}

// Advanced Intersection System Types
export enum IntersectionType {
  SIMPLE_CROSS = 'simple_cross',      // Basic line-to-line intersection
  T_JUNCTION = 't_junction',          // Three-way intersection
  CROSSOVER = 'crossover',            // Four-way intersection (X-shaped)
  STAR_HUB = 'star_hub',             // 5+ way intersection
  CURVE_CROSS = 'curve_cross',        // Curved segment intersection
  CURVE_TO_CURVE = 'curve_to_curve', // Two curved segments intersecting
  GRADE_SEPARATION = 'grade_separation' // Bridge/tunnel intersection
}

export interface RailwayIntersectionPoint {
  id: string;
  position: Point3D;
  intersectionType: IntersectionType;
  connectedSegments: string[]; // Segment IDs that meet at this intersection
  isJunctionNode: boolean; // Whether this point acts as a junction
  t1?: number; // Parameter along first segment (0-1)
  t2?: number; // Parameter along second segment (0-1)
  elevationLevel?: number; // For grade separations (0=ground, 1=bridge, -1=tunnel)
  visualIndicator?: IntersectionVisualType; // How to display this intersection
}

export enum IntersectionVisualType {
  CROSS_MARKER = 'cross_marker',      // Simple X mark for basic intersections
  T_JUNCTION_NODE = 't_junction_node', // T-shaped visual indicator
  HUB_CIRCLE = 'hub_circle',          // Circle for multi-way hubs
  BRIDGE_SYMBOL = 'bridge_symbol',     // Bridge icon for elevated crossings
  TUNNEL_SYMBOL = 'tunnel_symbol',     // Tunnel icon for underground crossings
  CURVE_BLEND = 'curve_blend'          // Blended curve intersection visual
}

export interface JunctionNode extends RailwayNode {
  junctionType: IntersectionType;
  connectedSegments: string[]; // All segments meeting at this junction
  activeConnections: string[]; // Currently active segment connections
  capacity: number; // Maximum number of simultaneous connections
  priority: 'first_come' | 'main_line' | 'signal_controlled'; // Traffic management
  visualRadius: number; // Display radius for junction indicator
}

export interface IntersectionAnalysisResult {
  intersectionType: IntersectionType;
  complexity: 'simple' | 'moderate' | 'complex' | 'critical';
  requiresJunction: boolean;
  suggestedJunctionType?: 'simple' | 't_junction' | 'crossover' | 'hub';
  segmentSplits: SegmentSplitInfo[]; // How segments should be divided
  performanceImpact: 'minimal' | 'moderate' | 'significant';
  recommendations: string[]; // User-facing suggestions
}

export interface SegmentSplitInfo {
  originalSegmentId: string;
  splitAtT: number; // Parameter where to split (0-1)
  splitPoint: Point3D;
  newSegments: {
    beforeSplit: Partial<RailwaySegment>;
    afterSplit: Partial<RailwaySegment>;
  };
  requiresCurveRecalculation: boolean;
}

export interface CurveIntersectionResult {
  intersections: Point3D[]; // Multiple intersection points possible
  segmentParameters: { t1: number; t2: number }[]; // Parameters for each intersection
  intersectionTypes: IntersectionType[]; // Type of each intersection
  curveSubdivisions?: {
    curve1Splits: { t: number; point: Point3D; controlPoint: Point3D }[];
    curve2Splits: { t: number; point: Point3D; controlPoint: Point3D }[];
  };
}

export interface TruckPath {
  id: string;
  stations: string[]; // Array of truck station IDs
  segments: TruckPathSegment[];
  floor: number;
}

export interface TruckPathSegment {
  id: string;
  type: 'straight' | 'curve';
  startPoint: Point3D;
  endPoint: Point3D;
  controlPoints?: Point3D[]; // For curves
}

export interface DrawingState {
  isDrawing: boolean;
  mode: 'default' | 'straight' | 'conveyor';
  currentBeltId: string | null;
  startPole: ConveyorPole | null;
  currentPath: ConveyorPole[];
  startBuildingId?: string;
  startConnectionPoint?: string;
  drawingRailway?: boolean;
  currentRailwayId?: string;
  railwayStartNode?: string; // ID of the starting node
  railwayPath: string[];
  railwayStartStation?: string;
  railwayStartRailPoint?: string;
  railwaySnapResult?: {
    shouldSnap: boolean;
    snapTarget?: {
      type: 'node' | 'segment';
      distance: number;
      snapPoint: Point3D;
      targetId: string;
      t?: number;
    };
  };
  drawingPipe?: boolean;
  currentPipelineId?: string;
  pipeStartSupport?: PipeSupport | null;
  pipePath?: PipeSupport[];
  pipeStartBuildingId?: string;
  pipeStartConnectionPoint?: string;
  drawingConveyorLift?: boolean;
  conveyorLiftStartFloor?: number;
  conveyorLiftEndFloor?: number;
  currentConveyorLiftId?: string;
  drawingPipeFloorConnection?: boolean;
  pipeFloorConnectionStartFloor?: number;
  pipeFloorConnectionEndFloor?: number;
  currentPipeFloorConnectionId?: string;
  drawingFoundation?: boolean;
  foundationStartPoint?: Point;
  currentFoundationId?: string;
  drawingWall?: boolean;
  wallStartPoint?: Point;
  wallSegments?: WallSegment[];
  currentWallId?: string;
  wallHeight?: 1 | 2 | 4 | 8;
  drawingRailing?: boolean;
  railingStartPoint?: Point;
  railingSegments?: RailingSegment[];
  currentRailingId?: string;
  drawingPowerline?: DrawingPowerlineState | null;
}

export type BuildingCategory = 'production' | 'extraction' | 'logistics' | 'power' | 'storage' | 'special' | 'workstations' | 'transport' | 'infrastructure' | 'architecture';

// Parent category that groups multiple subcategories
export type BuildingParentCategory = 'utilities';

// Subcategories that belong to the 'utilities' parent category
export const UTILITIES_SUBCATEGORIES: BuildingCategory[] = ['special', 'infrastructure', 'workstations'];

export type Tool = 'select' | 'move' | 'delete' | 'rotate' | 'conveyor' | 'conveyor_pole' | 'pipe' | 'pipe_support' | 'conveyor_lift' | 'pipe_floor_connection' | 'sticky_note' | 'truck_path' | 'railway' | 'powerline' | 'power_pole' | 'foundation' | 'wall' | 'railing';

// Powerline visibility modes
export type PowerlineVisibility = 'show' | 'semi-transparent' | 'hide';

// Powerline routing modes
export type PowerlineRoutingMode = 'direct' | 'right-angle';

// Production Overlay Settings
export type ProductionBadgeSize = 'compact' | 'normal' | 'large';

export interface ProductionOverlaySettings {
  /** Whether to show production badges on buildings */
  showProductionBadges: boolean;
  /** Whether to show flow rates on conveyors */
  showConveyorRates: boolean;
  /** Whether to show flow rates on pipelines */
  showPipelineRates: boolean;
  /** Badge size mode */
  badgeSize: ProductionBadgeSize;
  /** Whether to highlight bottlenecks */
  highlightBottlenecks: boolean;
  /** Whether to show flow direction arrows */
  showFlowDirections: boolean;
}

export interface Foundation {
  id: string;
  x: number; // Grid-aligned X coordinate (multiple of 8)
  y: number; // Grid-aligned Y coordinate (multiple of 8)
  z: number; // Floor level * 4 meters
  floor: number;
  width: number; // Width in meters (multiple of 8)
  height: number; // Height in meters (multiple of 8)
  material: 'default' | 'concrete' | 'coated' | 'asphalt' | 'grip_metal';
}

export interface WallSegment {
  id: string;
  x: number; // Starting X coordinate
  y: number; // Starting Y coordinate
  z: number; // Floor level * 4 meters
  floor: number;
  endX: number; // Ending X coordinate
  endY: number; // Ending Y coordinate
  height: 1 | 2 | 4 | 8; // Wall height in meters
  material: 'default' | 'concrete' | 'steel' | 'window';
  rotation: number; // Angle in degrees
  length: number; // Always 8 meters for standard walls
  foundationId?: string; // ID of foundation it's snapped to
}

export interface RailingSegment {
  id: string;
  x: number; // Starting X coordinate
  y: number; // Starting Y coordinate
  z: number; // Floor level * 4 meters
  floor: number;
  endX: number; // Ending X coordinate
  endY: number; // Ending Y coordinate
  height: number; // Railing height in meters (always 1m)
  material: 'default' | 'steel';
  rotation: number; // Angle in degrees
  length: number; // Length in meters (8m segments)
  foundationId?: string; // ID of foundation it's snapped to
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  width: number;
  height: number;
  text: string;
  color: string;
  rotation: 0 | 90 | 180 | 270;
}

// Power System Types - Following Railway Pattern
export interface PowerConnectionPoint {
  id: string;
  x: number; // Relative to building origin
  y: number;
  type: 'power_input' | 'power_output' | 'power_pole';
  side: 'left' | 'right' | 'front' | 'back' | 'center';
  capacity?: number; // MW capacity for this connection
}

export interface PowerPole {
  id: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  type: 'power_pole_mk1' | 'power_pole_mk2' | 'power_pole_mk3' | 'power_tower';
  range: number; // Connection range in meters
  maxConnections: number; // Maximum number of connections
  connections: string[]; // Connected powerline IDs
  isAnchor?: boolean; // Poles at building connections
}

export interface PowerlineSegment {
  id: string;
  type: 'straight' | 'curve';
  startPole: string; // Pole ID or building ID
  endPole: string;
  startPoint: Point3D;
  endPoint: Point3D;
  controlPoints?: Point3D[]; // For curved segments
  length: number;
  capacity: number; // MW capacity
  voltage: 'low' | 'medium' | 'high'; // Voltage level
  floor: number;
}

export interface Powerline {
  id: string;
  segments: string[]; // Segment IDs
  fromBuildingId?: string;
  fromPowerPoint?: string;
  toBuildingId?: string;
  toPowerPoint?: string;
  floor: number;
  capacity: number; // Total MW capacity
  currentLoad: number; // Current power flow in MW
  efficiency: number; // 0-100% efficiency
  voltage: 'low' | 'medium' | 'high';
  isGenerator?: boolean; // Is this powerline connected to a generator
}

export interface BuildingPowerData {
  classification: 'generator' | 'consumer' | 'neutral' | 'pole';
  powerGeneration?: number; // MW for generators
  powerConsumption?: number; // MW for consumers
  powerConnections: PowerConnectionPoint[];
  efficiency: number; // 0-100% efficiency rating
  fuelType?: 'coal' | 'fuel' | 'nuclear' | 'biomass' | 'geothermal'; // For generators
  pollutionLevel?: number; // Environmental impact (0-100)
}

export interface PowerNetwork {
  id: string;
  name: string;
  generators: string[]; // Building IDs of power generators
  consumers: string[]; // Building IDs of power consumers
  powerlines: string[]; // Powerline IDs in this network
  poles: string[]; // Power pole IDs in this network
  totalGeneration: number; // Total MW generation capacity
  totalConsumption: number; // Total MW consumption
  currentLoad: number; // Current power flow
  efficiency: number; // Overall network efficiency
  status: 'healthy' | 'overloaded' | 'insufficient' | 'disconnected';
  lastAnalysis: number; // Timestamp
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

export interface DrawingPowerlineState {
  isDrawing: boolean;
  currentPowerlineId: string | null;
  startPole: PowerPole | null;
  powerlinePath: string[]; // Pole IDs in current path
  startBuildingId?: string;
  startPowerPoint?: string;
  targetPole?: PowerPole | null;
  targetBuildingId?: string;
  targetPowerPoint?: string;
  previewSegments?: PowerlineSegment[];
  snapResult?: {
    shouldSnap: boolean;
    snapTarget?: {
      type: 'pole' | 'building';
      distance: number;
      snapPoint: Point3D;
      targetId: string;
      powerPointId?: string;
    };
  };
  isLoading?: boolean; // Loading state for async operations
  error?: string; // Error message for failed operations
}

// Simplified Powerline Connection State for Click-to-Click
export interface PowerlineConnectionPoint {
  type: 'pole' | 'building';
  poleId?: string;
  buildingId?: string;
  powerPointId?: string;
  position: Point3D;
}

export interface PowerlineConnectionState {
  startPoint: PowerlineConnectionPoint | null;
}

// Multi-Building Station Network System Types
export type NetworkTopologyType = 'chain' | 'branching' | 'hub_spoke' | 'loop' | 'mesh';
export type NetworkStatus = 'healthy' | 'stressed' | 'bottleneck' | 'disconnected' | 'error';
export type ConnectionStatus = 'connected' | 'partial' | 'disconnected' | 'conflict';

export interface NetworkStation {
  id: string; // Building ID
  type: string; // Building type
  position: Point3D;
  floor: number;
  connectionPoints: RailwayConnectionPoint[];
  connections: NetworkConnection[];
  throughput: {
    capacity: number; // Max throughput per minute
    current: number; // Current utilization
    utilization: number; // Percentage (0-100)
  };
  materials: string[]; // Materials handled by this station
  status: NetworkStatus;
}

export interface NetworkConnection {
  id: string;
  from: string; // station ID
  to: string; // station ID
  routes: NetworkRoute[];
  capacity: number; // Total capacity of all routes
  currentLoad: number; // Current utilization
  efficiency: number; // 0-100 routing efficiency score
  status: ConnectionStatus;
  distance: number; // Physical distance
  travelTime: number; // Estimated travel time
  lastUpdated: number; // Timestamp for cache invalidation
}

export interface NetworkRoute {
  id: string;
  stations: string[]; // Ordered list of station IDs
  railwaySegments: string[]; // Actual track segment IDs
  efficiency: number; // Path efficiency score (0-100)
  travelTime: number; // Estimated travel time in seconds
  capacity: number; // Route capacity
  currentLoad: number; // Current utilization
  distance: number; // Total physical distance
  materials: string[]; // Materials using this route
  waypoints: Point3D[]; // Key points along the route
  isOptimal: boolean; // Is this the best route for these stations?
  alternatives: string[]; // Alternative route IDs
}

export interface NetworkHealthMetrics {
  overallHealth: number; // 0-100 overall network health score
  totalStations: number;
  totalConnections: number;
  totalRoutes: number;
  averageEfficiency: number;
  bottlenecks: NetworkBottleneck[];
  utilizationDistribution: {
    underutilized: number; // 0-25% utilization
    optimal: number; // 25-75% utilization
    stressed: number; // 75-90% utilization
    bottlenecked: number; // 90%+ utilization
  };
  topologyType: NetworkTopologyType;
  lastAnalysis: number; // Timestamp
}

export interface NetworkBottleneck {
  id: string;
  type: 'station' | 'connection' | 'route';
  targetId: string; // ID of bottlenecked element
  severity: number; // 0-100 bottleneck severity
  impact: number; // 0-100 impact on overall network
  description: string;
  suggestions: NetworkSuggestion[];
  affectedRoutes: string[]; // Routes affected by this bottleneck
}

export interface NetworkSuggestion {
  id: string;
  type: 'add_route' | 'upgrade_connection' | 'rebalance_load' | 'add_station' | 'optimize_path';
  title: string;
  description: string;
  estimatedImprovement: number; // Expected efficiency gain (0-100)
  cost: number; // Implementation cost/complexity (0-100)
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionData?: {
    routePoints?: Point3D[];
    targetStations?: string[];
    alternativePaths?: string[];
    upgradeSpecs?: any;
  };
}

export interface StationNetwork {
  id: string;
  name: string;
  stations: Map<string, NetworkStation>;
  connections: Map<string, NetworkConnection>;
  routes: Map<string, NetworkRoute>;
  topology: NetworkTopologyType;
  healthMetrics: NetworkHealthMetrics;
  lastOptimization: number; // Timestamp of last optimization
  autoOptimize: boolean; // Whether to automatically suggest optimizations
  version: number; // For cache invalidation
}

export interface NetworkVisualization {
  showFlowAnimation: boolean;
  showEfficiencyColors: boolean;
  showBottlenecks: boolean;
  showOptimalPaths: boolean;
  flowAnimationSpeed: number; // 0.1 to 2.0
  highlightedStations: Set<string>;
  highlightedConnections: Set<string>;
  filterByMaterial: string | null;
  filterByEfficiency: number | null; // Show only routes above this efficiency
}

export interface NetworkAnalysisCache {
  pathCache: Map<string, NetworkRoute>; // Cache for pathfinding results
  efficiencyCache: Map<string, number>; // Cache for efficiency calculations
  topologyCache: Map<string, NetworkTopologyType>; // Cache for topology analysis
  lastInvalidation: number; // Timestamp of last cache clear
}

// Network Management UI State
export interface NetworkManagerState {
  isOpen: boolean;
  selectedNetwork: string | null;
  selectedStation: string | null;
  selectedConnection: string | null;
  activeView: 'overview' | 'topology' | 'analytics' | 'optimization';
  visualization: NetworkVisualization;
  showSuggestions: boolean;
  autoApplySuggestions: boolean;
  analysisInProgress: boolean;
  lastAnalysisTime: number;
}

export interface LayoutState {
  buildings: Record<string, Building>;
  conveyorPoles: Record<string, ConveyorPole>;
  conveyorSegments: Record<string, ConveyorSegment>;
  conveyorBelts: Record<string, ConveyorBelt>;
  conveyorLifts: Record<string, ConveyorLift>;
  pipeSupports: Record<string, PipeSupport>;
  pipeSegments: Record<string, PipeSegment>;
  pipelines: Record<string, Pipeline>;
  pipeFloorConnections: Record<string, PipeFloorConnection>;
  stickyNotes: Record<string, StickyNote>;
  truckPaths: Record<string, TruckPath>;
  railways: Record<string, Railway>;
  railwaySegments: Record<string, RailwaySegment>;
  railwayNodes: Record<string, RailwayNode>;
  foundations: Record<string, Foundation>;
  wallSegments: Record<string, WallSegment>;
  railingSegments: Record<string, RailingSegment>;
  // Power System
  powerPoles: Record<string, PowerPole>;
  powerlineSegments: Record<string, PowerlineSegment>;
  powerlines: Record<string, Powerline>;
  powerNetworks: Record<string, PowerNetwork>;
  // Multi-Building Station Network System
  stationNetworks: Record<string, StationNetwork>;
  networkManager: NetworkManagerState;
  networkAnalysisCache: NetworkAnalysisCache;
  currentFloor: number;
  selectedBuilding: string | null;
  selectedPole: string | null;
  selectedPipeSupport: string | null;
  selectedPipeSegment: string | null;
  selectedStickyNote: string | null;
  selectedRailwayNode: string | null;
  selectedRailwaySegment: string | null;
  selectedConveyorLift: string | null;
  selectedConveyorSegment: string | null;
  selectedPipeFloorConnection: string | null;
  selectedFoundation: string | null;
  selectedWall: string | null;
  selectedRailing: string | null;
  selectedPowerPole: string | null;
  selectedPowerlineSegment: string | null;
  selectedPowerline: string | null;
  selectedTool: Tool;
  drawingState: DrawingState;
  powerlineConnectionState: PowerlineConnectionState | null;
  snapIndicator?: { x: number; y: number; z?: number } | null;
  showGrid: boolean;
  gridSnappingEnabled: boolean;
  mobileConstraintMode: string;
  showKeyboardShortcuts: boolean;
  showBuildingPalette: boolean;
  debugOverlay: boolean;
  showFloorBelow: boolean;
  conveyorMode: 'default' | 'straight';
  powerPoleTier: 'mk1' | 'mk2' | 'mk3' | 'tower';
  powerlineVisibility: PowerlineVisibility;
  powerlineRoutingMode: PowerlineRoutingMode;
  // Production Overlay Settings
  productionOverlaySettings: ProductionOverlaySettings;
  // Production Panel State
  isProductionPanelOpen: boolean;
  isProductionPanelPinned: boolean;
  rendererType: 'konva' | 'webgl';
  buildingPanelWidth: number;
  propertiesPanelWidth: number;
  collapsedCategories: Set<BuildingCategory>;
  addBuilding: (building: Building) => void;
  updateBuilding: (id: string, updates: Partial<Building>) => void;
  deleteBuilding: (id: string) => void;
  rotateBuilding: (id: string) => void;
  addPole: (pole: ConveyorPole) => void;
  updatePole: (id: string, updates: Partial<ConveyorPole>) => void;
  deletePole: (id: string) => void;
  updatePipeSupport: (id: string, updates: Partial<PipeSupport>) => void;
  deletePipeSupport: (id: string) => void;
  addStickyNote: (note: StickyNote) => void;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;
  startConveyorDrawing: (buildingId?: string, connectionPointId?: string, poleId?: string, liftId?: string, liftConnectionPointId?: string) => void;
  addPoleToPath: (pole: ConveyorPole) => void;
  finishConveyorDrawing: (buildingId?: string, connectionPointId?: string, poleId?: string, liftId?: string, liftConnectionPointId?: string) => void;
  cancelDrawing: () => void;
  reverseBeltDirection: (beltId: string) => void;
  startPipeDrawing: (buildingId?: string, connectionPointId?: string, supportId?: string) => void;
  addPipeSupport: (support: PipeSupport) => void;
  finishPipeDrawing: (buildingId?: string, connectionPointId?: string, supportId?: string) => void;
  cancelPipeDrawing: () => void;
  startConveyorLiftDrawing: (x: number, y: number, startFloor: number) => void;
  finishConveyorLiftDrawing: (endFloor: number, mark: 1 | 2 | 3 | 4 | 5 | 6, direction: 'up' | 'down') => void;
  cancelConveyorLiftDrawing: () => void;
  addConveyorLift: (lift: ConveyorLift) => void;
  updateConveyorLift: (id: string, updates: Partial<ConveyorLift>) => void;
  deleteConveyorLift: (id: string) => void;
  startPipeFloorConnectionDrawing: (x: number, y: number, startFloor: number) => void;
  finishPipeFloorConnectionDrawing: (endFloor: number, mark: 1 | 2, direction: 'up' | 'down') => void;
  cancelPipeFloorConnectionDrawing: () => void;
  addPipeFloorConnection: (connection: PipeFloorConnection) => void;
  updatePipeFloorConnection: (id: string, updates: Partial<PipeFloorConnection>) => void;
  deletePipeFloorConnection: (id: string) => void;
  startRailwayDrawing: (buildingId?: string, railPointId?: string, nodeId?: string) => void;
  addRailwayPoint: (point: Point3D) => void;
  finishRailwayDrawing: (buildingId?: string, railPointId?: string, nodeId?: string) => void;
  cancelRailwayDrawing: () => void;
  addRailwayNode: (node: RailwayNode) => void;
  updateRailwayNode: (id: string, updates: Partial<RailwayNode>) => void;
  deleteRailwayNode: (id: string) => void;
  setSelectedRailwayNode: (id: string | null) => void;
  setSelectedRailwaySegment: (id: string | null) => void;
  consolidateRailwayNodes: () => void;
  updateRailwaySegmentPoint: (segmentId: string, isStart: boolean, newPoint: Point3D) => void;
  updateRailwaySegment: (id: string, updates: Partial<RailwaySegment>) => void;
  setSelectedBuilding: (id: string | null) => void;
  setSelectedPole: (id: string | null) => void;
  setSelectedPipeSupport: (id: string | null) => void;
  setSelectedPipeSegment: (id: string | null) => void;
  deletePipeSegment: (id: string) => void;
  updatePipeSegment: (id: string, updates: Partial<PipeSegment>) => void;
  setPipeTier: (segmentId: string, tier: 1 | 2) => void;
  setSelectedConveyorSegment: (id: string | null) => void;
  deleteConveyorSegment: (id: string) => void;
  updateConveyorSegment: (id: string, updates: Partial<ConveyorSegment>) => void;
  setBeltTier: (segmentId: string, tier: 1 | 2 | 3 | 4 | 5 | 6) => void;
  setSelectedStickyNote: (id: string | null) => void;
  setSelectedConveyorLift: (id: string | null) => void;
  setSelectedPipeFloorConnection: (id: string | null) => void;
  setSelectedPowerPole: (id: string | null) => void;
  addPowerPole: (pole: PowerPole) => void;
  updatePowerPole: (id: string, updates: Partial<PowerPole>) => void;
  deletePowerPole: (id: string) => void;
  setSelectedTool: (tool: Tool) => void;
  setConveyorMode: (mode: 'default' | 'straight') => void;
  setPowerPoleTier: (tier: 'mk1' | 'mk2' | 'mk3' | 'tower') => void;
  setPowerlineVisibility: (visibility: PowerlineVisibility) => void;
  setPowerlineRoutingMode: (mode: PowerlineRoutingMode) => void;
  // Production Overlay Actions
  setProductionOverlaySetting: <K extends keyof ProductionOverlaySettings>(
    key: K,
    value: ProductionOverlaySettings[K]
  ) => void;
  toggleProductionOverlays: () => void;
  // Production Panel Actions
  toggleProductionPanel: () => void;
  setProductionPanelOpen: (isOpen: boolean) => void;
  toggleProductionPanelPinned: () => void;
  setBuildingPanelWidth: (width: number) => void;
  setPropertiesPanelWidth: (width: number) => void;
  toggleCategory: (category: BuildingCategory) => void;
  toggleGrid: () => void;
  toggleFloorBelow: () => void;
  toggleGridSnapping: () => void;
  setCurrentFloor: (floor: number) => void;
  setMobileConstraintMode: (mode: string) => void;
  toggleKeyboardShortcuts: () => void;
  toggleBuildingPalette: () => void;
  toggleDebugOverlay: () => void;
  toggleRenderer: () => void;
  validateRailwayBuildingAlignment: (
    buildingId: string, 
    railPointId: string, 
    approachPoint: Point3D,
    railwayDirection?: Point3D
  ) => AlignmentValidationResult | null;
  checkAlignmentTolerance: (
    buildingId: string,
    railPointId: string, 
    approachPoint: Point3D,
    railwayDirection?: Point3D,
    strictMode?: boolean
  ) => boolean;
  getAlignmentSuggestions: (
    buildingId: string,
    railPointId: string,
    approachPoint: Point3D,
    railwayDirection?: Point3D
  ) => AlignmentSuggestion[];
  detectNearbyBuildingForRailwayConnection: (point: Point3D, excludeBuildingId: string, threshold: number) => {
    buildingId: string;
    railPointId: string;
    distance: number;
    worldPos: Point3D;
    alignmentScore: number;
    isCompatibleDirection: boolean;
    snapPrecision: number;
    railPointDirection: 'in' | 'out' | 'bidirectional';
    buildingType: string;
    allPotentialConnections: number;
  } | null;
  detectNearbyBuildingForConveyorConnection: (point: Point3D, excludeBuildingId: string, threshold: number) => {
    buildingId: string;
    connectionPointId: string;
    distance: number;
    worldPos: Point3D;
  } | null;
  detectNearbyBuildingForPipeConnection: (point: Point3D, excludeBuildingId: string, threshold: number) => {
    buildingId: string;
    connectionPointId: string;
    distance: number;
    worldPos: Point3D;
  } | null;
  createDirectBuildingToRailwayConnection: (
    fromBuildingId: string,
    fromRailPointId: string,
    toBuildingId: string,
    toRailPointId: string,
    isFinishingDrawing?: boolean
  ) => boolean;
  shouldCreateCurvedRailwayConnection: (
    fromBuilding: Building,
    fromRailPoint: RailwayConnectionPoint,
    toBuilding: Building,
    toRailPoint: RailwayConnectionPoint
  ) => boolean;
  calculateRailwayConnectionControlPoint: (
    fromPos: Point3D,
    toPos: Point3D,
    fromBuilding: Building,
    toBuilding: Building
  ) => Point3D;
  clearLayout: () => void;
  exportLayout: () => string;
  importLayout: (data: string) => Promise<boolean>;
  addFoundation: (foundation: Foundation) => void;
  updateFoundation: (id: string, updates: Partial<Foundation>) => void;
  deleteFoundation: (id: string) => void;
  setSelectedFoundation: (id: string | null) => void;
  startFoundationDrawing: (startPoint: Point) => void;
  finishFoundationDrawing: (endPoint: Point, material: Foundation['material']) => void;
  cancelFoundationDrawing: () => void;
  addWallSegment: (wall: WallSegment) => void;
  updateWallSegment: (id: string, updates: Partial<WallSegment>) => void;
  deleteWallSegment: (id: string) => void;
  setSelectedWall: (id: string | null) => void;
  startWallDrawing: (startPoint: Point, wallHeight: WallSegment['height']) => void;
  addWallPoint: (point: Point) => void;
  finishWallDrawing: (material: WallSegment['material']) => void;
  cancelWallDrawing: () => void;
  deleteWall: (id: string) => void;
  addRailingSegment: (railing: RailingSegment) => void;
  updateRailingSegment: (id: string, updates: Partial<RailingSegment>) => void;
  deleteRailingSegment: (id: string) => void;
  setSelectedRailing: (id: string | null) => void;
  startRailingDrawing: (startPoint: Point) => void;
  addRailingPoint: (point: Point) => void;
  finishRailingDrawing: (material: RailingSegment['material']) => void;
  cancelRailingDrawing: () => void;
  deleteRailing: (id: string) => void;
  finishDrawingConveyor: () => void;
  clearSelection: () => void;
  
  // Desktop-specific actions
  clipboardBuilding: Building | null;
  copyBuilding: () => void;
  pasteBuilding: () => void;
  canPaste: () => boolean;
  duplicateBuilding: () => void;
  
  // History system
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getHistoryDescription: () => { past: string | undefined; future: string | undefined };
  
  setDrawingState: (updates: Partial<DrawingState>) => void;
  
  // Feedback UI State
  isFeedbackOpen: boolean;
  setIsFeedbackOpen: (isOpen: boolean) => void;
  
  // Multi-Building Station Network System Actions
  createStationNetwork: (name: string, stationIds: string[]) => string;
  updateStationNetwork: (networkId: string, updates: Partial<StationNetwork>) => void;
  deleteStationNetwork: (networkId: string) => void;
  addStationToNetwork: (networkId: string, stationId: string) => boolean;
  removeStationFromNetwork: (networkId: string, stationId: string) => boolean;
  createNetworkConnection: (networkId: string, fromStation: string, toStation: string) => string;
  deleteNetworkConnection: (networkId: string, connectionId: string) => void;
  analyzeNetworkHealth: (networkId: string) => NetworkHealthMetrics;
  optimizeNetwork: (networkId: string) => NetworkSuggestion[];
  calculateOptimalRoute: (networkId: string, fromStation: string, toStation: string) => NetworkRoute | null;
  applyNetworkSuggestion: (networkId: string, suggestionId: string) => boolean;
  invalidateNetworkCache: (networkId?: string) => void;
  detectNetworkTopology: (networkId: string) => NetworkTopologyType;
  updateNetworkVisualization: (updates: Partial<NetworkVisualization>) => void;
  setSelectedNetwork: (networkId: string | null) => void;
  setSelectedNetworkStation: (stationId: string | null) => void;
  setSelectedNetworkConnection: (connectionId: string | null) => void;
  openNetworkManager: () => void;
  closeNetworkManager: () => void;
  setNetworkManagerView: (view: NetworkManagerState['activeView']) => void;
  toggleNetworkAutoOptimization: (networkId: string) => void;
  exportNetworkData: (networkId: string) => string;
  importNetworkData: (data: string) => boolean;
  
  // Power System Actions
  setSelectedPowerlineSegment: (id: string | null) => void;
  setSelectedPowerline: (id: string | null) => void;
  startPowerlineDrawing: (buildingId?: string, powerPointId?: string, poleId?: string) => void;
  addPowerlinePoint: (point: Point3D) => void;
  finishPowerlineDrawing: (buildingId?: string, powerPointId?: string, poleId?: string) => Promise<void>;
  cancelPowerlineDrawing: () => void;
  addPowerlineSegment: (segment: PowerlineSegment) => void;
  updatePowerlineSegment: (id: string, updates: Partial<PowerlineSegment>) => void;
  deletePowerlineSegment: (id: string) => void;
  addPowerline: (powerline: Powerline) => void;
  updatePowerline: (id: string, updates: Partial<Powerline>) => void;
  deletePowerline: (id: string) => void;
  createPowerNetwork: (name: string, buildingIds: string[]) => string;
  updatePowerNetwork: (id: string, updates: Partial<PowerNetwork>) => void;
  deletePowerNetwork: (id: string) => void;
  validatePowerlineConnection: (fromId: string, toId: string, powerPointId?: string) => PowerValidationResult;
  calculatePowerDistance: (from: Point3D, to: Point3D) => number;
  findNearbyPowerBuildings: (point: Point3D, radius: number) => Array<{buildingId: string; distance: number; powerData: BuildingPowerData}>;
  getOptimalPowerPath: (fromId: string, toId: string) => Point3D[] | null;
  analyzePowerNetworkHealth: (networkId: string) => { health: number; issues: string[]; suggestions: string[] };
  
  // Simplified Powerline Connection Actions
  setPowerlineStartPoint: (startPoint: PowerlineConnectionPoint) => void;
  clearPowerlineConnectionState: () => void;
  createDirectPowerlineConnection: (startPoint: PowerlineConnectionPoint, endPoint: PowerlineConnectionPoint) => void;

  // Production Simulation Actions
  setSelectedRecipe: (buildingId: string, recipeId: string | null) => void;
  setClockSpeed: (buildingId: string, clockSpeed: number) => void;
  setExtractedResource: (buildingId: string, resourceId: string | null) => void;
  setStationResourceConfig: (buildingId: string, config: StationResourceConfig | null) => void;
}