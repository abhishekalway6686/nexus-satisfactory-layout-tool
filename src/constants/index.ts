// src/constants/index.ts

import { BuildingCategory, ConnectionPoint, RailwayConnectionPoint, BuildingPowerData } from '../types';

export const FOUNDATION_SIZE = 8; // 8x8 meters per foundation
export const GRID_SIZE = 2; // 2 meter snap points (quarter-foundation) for more precise placement
export const PIXELS_PER_METER = 10; // Display scale

// Grid snapping sensitivity - controls how close to a grid line an object must be to snap
// Value is a fraction of grid cell size (0.0-0.5 range)
// 0.5 = always snap to nearest (most aggressive)
// 0.25 = snap when within 25% of grid cell (less aggressive)
// 0.15 = snap when within 15% of grid cell (gentle snapping)
export const GRID_SNAP_THRESHOLD = 0.35; // Snap when within 35% of grid cell (0.7m with 2m grid)
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 1.5;
export const CONVEYOR_MAX_LENGTH = 56; // 56 meter max segment
export const RAILWAY_MAX_LENGTH = 500; // 500 meter max railway segment - increased for realistic long-distance railways
export const RAILWAY_MAX_SEGMENT_LENGTH = 500; // Alias for backward compatibility
export const RAILWAY_TRACK_WIDTH = 1.5; // Railway track width in meters
export const PIPE_MAX_LENGTH = 100; // 100 meter max pipe segment
export const FLOOR_HEIGHT = 4; // 4 meters per floor
export const PUMP_HEAD_LIFT = 20; // Pipeline pump adds 20m head lift

// Conveyor lift constants
export const CONVEYOR_LIFT_MIN_HEIGHT = 4; // 4 meters minimum (1 floor)
export const CONVEYOR_LIFT_MAX_HEIGHT = 48; // 48 meters maximum (12 floors)
export const CONVEYOR_LIFT_BASE_COSTS = {
  1: 50,   // Mk.1 base cost
  2: 75,   // Mk.2 base cost
  3: 100,  // Mk.3 base cost
  4: 150,  // Mk.4 base cost
  5: 200,  // Mk.5 base cost
  6: 300   // Mk.6 base cost
};
export const CONVEYOR_LIFT_THROUGHPUT = {
  1: 60,   // items/min
  2: 120,  // items/min
  3: 270,  // items/min
  4: 480,  // items/min
  5: 780,  // items/min
  6: 1200  // items/min
};

// Production Simulation: Belt and Pipe Throughput Constants
// Belt throughput by tier (items per minute)
export const BELT_THROUGHPUT: Record<number, number> = {
  1: 60,    // Mk.1 - 60 items/min
  2: 120,   // Mk.2 - 120 items/min
  3: 270,   // Mk.3 - 270 items/min
  4: 480,   // Mk.4 - 480 items/min
  5: 780,   // Mk.5 - 780 items/min
  6: 1200   // Mk.6 - 1200 items/min
};

// Pipe throughput by tier (cubic meters per minute)
export const PIPE_THROUGHPUT: Record<number, number> = {
  1: 300,   // Mk.1 - 300 m^3/min
  2: 600    // Mk.2 - 600 m^3/min
};

// Pipe floor connection constants
export const PIPE_FLOOR_CONNECTION_MIN_HEIGHT = 4; // 4 meters minimum (1 floor)
export const PIPE_FLOOR_CONNECTION_MAX_HEIGHT = 48; // 48 meters maximum (12 floors)
export const PIPE_FLOOR_CONNECTION_BASE_COSTS = {
  1: 30,   // Mk.1 base cost (cheaper than conveyor lifts)
  2: 50    // Mk.2 base cost
};
export const PIPE_FLOOR_CONNECTION_THROUGHPUT = {
  1: 300,  // m³/min (Mk.1 Pipeline)
  2: 600   // m³/min (Mk.2 Pipeline)
};

// Railway snapping constants
export const RAILWAY_SNAP_THRESHOLD = 1.5; // Default snap distance in meters - increased for better building connections
export const BUILDING_RAILWAY_SNAP_THRESHOLD = 3.0; // Larger threshold for building-to-building connections
export const RAILWAY_NODE_SNAP_PRIORITY = 1.5; // Multiplier for node snap priority over segment snap
export const RAILWAY_SNAP_VISUAL_RADIUS = 1.0; // Visual indicator radius in meters

// File import constraints
export const MAX_LAYOUT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB max layout file size
export const MAX_LAYOUT_FILE_SIZE_MB = 50; // For display purposes

// Power system constants
export const POWERLINE_MAX_LENGTH = 200; // 200 meter max powerline segment
export const POWER_POLE_MK1_RANGE = 30; // 30 meter range
export const POWER_POLE_MK2_RANGE = 35; // 35 meter range
export const POWER_POLE_MK3_RANGE = 40; // 40 meter range
export const POWER_TOWER_RANGE = 100; // 100 meter range

// Power pole connection limits (matching Satisfactory game)
export const POWER_POLE_MK1_MAX_CONNECTIONS = 4;
export const POWER_POLE_MK2_MAX_CONNECTIONS = 7;
export const POWER_POLE_MK3_MAX_CONNECTIONS = 10;
export const POWER_TOWER_MAX_TOWER_CONNECTIONS = 3; // Connections to other towers
export const POWER_TOWER_MAX_BUILDING_CONNECTIONS = 4; // Connections to buildings
export const POWER_TOWER_MAX_TOTAL_CONNECTIONS = 7; // Total max (3 tower + 4 building)

// Legacy constants for backward compatibility
export const POWER_POLE_MAX_CONNECTIONS = 4; // Use specific pole type constants instead
export const POWER_TOWER_MAX_CONNECTIONS = 7; // Use specific tower constants instead

// Comprehensive building type definitions based on Update 8 research with accurate connection points
export const BUILDING_TYPES: Record<string, {
  name: string;
  width: number; // in meters
  height: number; // in meters  
  depth: number; // in meters (for 3D visualization)
  color: string;
  category: BuildingCategory;
  connectionPoints: ConnectionPoint[];
  railwayPoints?: RailwayConnectionPoint[];
  powerData?: BuildingPowerData;
  hiddenFromPalette?: boolean; // Hide from building palette (use overlay tools instead)
}> = {
  // Production Buildings - Industrial steel blues and grays (machinery aesthetic)
  constructor: {
    name: 'Constructor',
    width: 8,   // 8m wide (east-west)
    height: 10, // 10m deep (north-south)
    depth: 7,   // 7m tall
    color: '#4A5568', // Steel gray - basic production machine
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 4, y: 0.5, type: 'input' as const, side: 'front' as const },      // 1 belt in (north center)
      { id: 'out1', x: 4, y: 9.5, type: 'output' as const, side: 'back' as const }      // 1 belt out (south center)
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 4, // MW
      powerConnections: [
        { id: 'power_in', x: 7, y: 5, type: 'power_input' as const, side: 'right' as const, capacity: 4 } // Power hookup east center, 1m inset
      ],
      efficiency: 100
    }
  },
  assembler: {
    name: 'Assembler',
    width: 10,  // 10m wide (east-west)
    height: 15, // 15m deep (north-south)
    depth: 11,  // 11m tall
    color: '#5A6A7A', // Medium steel blue-gray - more complex than constructor
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 3, y: 0.5, type: 'input' as const, side: 'front' as const },      // Belt in 1 (north)
      { id: 'in2', x: 7, y: 0.5, type: 'input' as const, side: 'front' as const },      // Belt in 2 (north)
      { id: 'out1', x: 5, y: 14.5, type: 'output' as const, side: 'back' as const }     // 1 belt out (south center)
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 15, // MW (Mk.1: 15MW, Mk.2: 37.5MW, Mk.3: 55MW - base shown)
      powerConnections: [
        { id: 'power_in', x: 9, y: 7.5, type: 'power_input' as const, side: 'right' as const, capacity: 55 } // Power hookup east center, 1m inset
      ],
      efficiency: 100
    }
  },
  manufacturer: {
    name: 'Manufacturer',
    width: 18,  // 18m wide (east-west)
    height: 20, // 20m deep (north-south)
    depth: 12,  // 12m tall
    color: '#3D4F5F', // Dark industrial blue-gray - heavy machinery
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 4, y: 0.5, type: 'input' as const, side: 'front' as const },      // Belt in 1 (north)
      { id: 'in2', x: 9, y: 0.5, type: 'input' as const, side: 'front' as const },      // Belt in 2 (north)
      { id: 'in3', x: 14, y: 0.5, type: 'input' as const, side: 'front' as const },     // Belt in 3 (north)
      { id: 'in4', x: 0.5, y: 10, type: 'input' as const, side: 'left' as const },      // Belt in 4 (west side)
      { id: 'out1', x: 9, y: 19.5, type: 'output' as const, side: 'back' as const }     // 1 belt out (south center)
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 55, // MW
      powerConnections: [
        { id: 'power_in', x: 17, y: 10, type: 'power_input' as const, side: 'right' as const, capacity: 55 } // Power hookup east center, 1m inset
      ],
      efficiency: 100
    }
  },
  smelter: {
    name: 'Smelter',
    width: 6,   // 6m wide (east-west)
    height: 9,  // 9m deep (north-south)
    depth: 10,  // 10m tall
    color: '#8B5A3C', // Muted copper-brown - heat/metal processing
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 3, y: 0.5, type: 'input' as const, side: 'front' as const },      // 1 belt in (north center)
      { id: 'out1', x: 3, y: 8.5, type: 'output' as const, side: 'back' as const }      // 1 belt out (south center)
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 4, // MW (Mk.1: 4MW, Mk.2: 12MW - base shown)
      powerConnections: [
        { id: 'power_in', x: 5, y: 4.5, type: 'power_input' as const, side: 'right' as const, capacity: 12 } // Power hookup east center, 1m inset
      ],
      efficiency: 100
    }
  },
  foundry: {
    name: 'Foundry',
    width: 8,   // 8m wide (east-west)
    height: 9,  // 9m deep (north-south)
    depth: 9,   // 9m tall
    color: '#6B4423', // Darker bronze-brown - heavy metal processing
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 2, y: 0.5, type: 'input' as const, side: 'front' as const },      // Belt in 1 (north)
      { id: 'in2', x: 6, y: 0.5, type: 'input' as const, side: 'front' as const },      // Belt in 2 (north)
      { id: 'out1', x: 4, y: 8.5, type: 'output' as const, side: 'back' as const }      // 1 belt out (south center)
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 16, // MW (Mk.1: 16MW, Mk.2: 40MW - base shown)
      powerConnections: [
        { id: 'power_in', x: 7, y: 4.5, type: 'power_input' as const, side: 'right' as const, capacity: 40 } // Power hookup east center, 1m inset
      ],
      efficiency: 100
    }
  },
  refinery: {
    name: 'Refinery',
    width: 10,
    height: 20,
    depth: 21,
    color: '#4E6B5C', // Muted industrial teal - chemical processing
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 2.5, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 7.5, y: 1, type: 'input' as const, side: 'front' as const, isFluid: true },
      { id: 'out1', x: 2.5, y: 19, type: 'output' as const, side: 'back' as const },
      { id: 'out2', x: 7.5, y: 19, type: 'output' as const, side: 'back' as const, isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 30, // MW
      powerConnections: [
        { id: 'power_in', x: 5, y: 10, type: 'power_input' as const, side: 'center' as const, capacity: 30 }
      ],
      efficiency: 100
    }
  },
  blender: {
    name: 'Blender',
    width: 18,
    height: 16,
    depth: 15,
    color: '#5C6B7A', // Blue-gray - fluid/solid mixing
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 3, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 7, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in3', x: 11, y: 1, type: 'input' as const, side: 'front' as const, isFluid: true },
      { id: 'in4', x: 15, y: 1, type: 'input' as const, side: 'front' as const, isFluid: true },
      { id: 'out1', x: 5, y: 15, type: 'output' as const, side: 'back' as const },
      { id: 'out2', x: 13, y: 15, type: 'output' as const, side: 'back' as const, isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 75, // MW
      powerConnections: [
        { id: 'power_in', x: 9, y: 8, type: 'power_input' as const, side: 'center' as const, capacity: 75 }
      ],
      efficiency: 100
    }
  },
  packager: {
    name: 'Packager',
    width: 8,
    height: 8,
    depth: 8,
    color: '#567568', // Muted sage-gray - packaging machine
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 2, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 6, y: 1, type: 'input' as const, side: 'front' as const, isFluid: true },
      { id: 'out1', x: 2, y: 7, type: 'output' as const, side: 'back' as const },
      { id: 'out2', x: 6, y: 7, type: 'output' as const, side: 'back' as const, isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 10, // MW
      powerConnections: [
        { id: 'power_in', x: 4, y: 4, type: 'power_input' as const, side: 'center' as const, capacity: 10 }
      ],
      efficiency: 100
    }
  },
  particle_accelerator: {
    name: 'Particle Accelerator',
    width: 24,
    height: 24,
    depth: 32,
    color: '#3A4A5C', // Dark steel blue - high-tech equipment
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 8, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 16, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in3', x: 12, y: 1, type: 'input' as const, side: 'front' as const, isFluid: true }, // Currently unused
      { id: 'out1', x: 12, y: 23, type: 'output' as const, side: 'back' as const }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 500, // MW (variable 250-1500, using typical mid value)
      powerConnections: [
        { id: 'power_in', x: 12, y: 12, type: 'power_input' as const, side: 'center' as const, capacity: 1500 }
      ],
      efficiency: 100
    }
  },
  quantum_encoder: {
    name: 'Quantum Encoder',
    width: 20,
    height: 20,
    depth: 15,
    color: '#4A5A6A', // Medium steel - advanced tech
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 7, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 13, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'out1', x: 10, y: 19, type: 'output' as const, side: 'back' as const }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 500, // MW (estimated high-tier production)
      powerConnections: [
        { id: 'power_in', x: 10, y: 10, type: 'power_input' as const, side: 'center' as const, capacity: 500 }
      ],
      efficiency: 100
    }
  },
  converter: {
    name: 'Converter',
    width: 12,
    height: 14,
    depth: 10,
    color: '#5A6A70', // Steel gray with hint of teal
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 4, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 8, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'out1', x: 6, y: 13, type: 'output' as const, side: 'back' as const }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 30, // MW (estimated mid-tier production)
      powerConnections: [
        { id: 'power_in', x: 6, y: 7, type: 'power_input' as const, side: 'center' as const, capacity: 30 }
      ],
      efficiency: 100
    }
  },
  somersloop_processor: {
    name: 'Somersloop Processor',
    width: 16,
    height: 16,
    depth: 12,
    color: '#6A5A7A', // Muted purple-gray - alien tech
    category: 'production' as BuildingCategory,
    connectionPoints: [
      { id: 'in1', x: 4, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 8, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'in3', x: 12, y: 1, type: 'input' as const, side: 'front' as const },
      { id: 'out1', x: 8, y: 15, type: 'output' as const, side: 'back' as const }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 75, // MW (estimated alien tech production)
      powerConnections: [
        { id: 'power_in', x: 8, y: 8, type: 'power_input' as const, side: 'center' as const, capacity: 75 }
      ],
      efficiency: 100
    }
  },

  // Extraction Buildings - Earthy browns and rust tones (mining/resource aesthetic)
miner_mk1: {
  name: 'Miner Mk.1',
  width: 7,
  height: 14,
  depth: 14,
  color: '#8B7355', // Light earthy brown - basic miner
  category: 'extraction',
  connectionPoints: [
    { id: 'out1', x: 3.5, y: 13.5, type: 'output', side: 'back' }
  ],
  powerData: {
    classification: 'consumer' as const,
    powerConsumption: 5, // MW
    powerConnections: [
      { id: 'power_in', x: 3.5, y: 7, type: 'power_input' as const, side: 'center' as const, capacity: 5 }
    ],
    efficiency: 100
  }
},
miner_mk2: {
  name: 'Miner Mk.2',
  width: 7,
  height: 14,
  depth: 14,
  color: '#6B5344', // Medium brown - upgraded miner
  category: 'extraction',
  connectionPoints: [
    { id: 'out1', x: 3.5, y: 13.5, type: 'output', side: 'back' }
  ],
  powerData: {
    classification: 'consumer' as const,
    powerConsumption: 12, // MW
    powerConnections: [
      { id: 'power_in', x: 3.5, y: 7, type: 'power_input' as const, side: 'center' as const, capacity: 12 }
    ],
    efficiency: 100
  }
},
miner_mk3: {
  name: 'Miner Mk.3',
  width: 7,
  height: 14,
  depth: 14,
  color: '#5A4233', // Dark brown - advanced miner
  category: 'extraction',
  connectionPoints: [
    { id: 'out1', x: 3.5, y: 13.5, type: 'output', side: 'back' }
  ],
  powerData: {
    classification: 'consumer' as const,
    powerConsumption: 30, // MW
    powerConnections: [
      { id: 'power_in', x: 3.5, y: 7, type: 'power_input' as const, side: 'center' as const, capacity: 30 }
    ],
    efficiency: 100
  }
},
  water_extractor: {
    name: 'Water Extractor',
    width: 20,
    height: 20,
    depth: 5,
    color: '#4A6A7A', // Muted steel blue - water machinery
    category: 'extraction',
    connectionPoints: [
      { id: 'out1', x: 10, y: 19.5, type: 'output', side: 'back', isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 20, // MW
      powerConnections: [
        { id: 'power_in', x: 10, y: 10, type: 'power_input' as const, side: 'center' as const, capacity: 20 }
      ],
      efficiency: 100
    }
  },
  oil_extractor: {
    name: 'Oil Extractor',
    width: 12,
    height: 20,
    depth: 12,
    color: '#3A3A3A', // Dark gray - oil rig aesthetic
    category: 'extraction',
    connectionPoints: [
      { id: 'out1', x: 6, y: 19.5, type: 'output', side: 'back', isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 40, // MW
      powerConnections: [
        { id: 'power_in', x: 6, y: 10, type: 'power_input' as const, side: 'center' as const, capacity: 40 }
      ],
      efficiency: 100
    }
  },
  resource_well_pressurizer: {
    name: 'Resource Well Pressurizer',
    width: 8,
    height: 8,
    depth: 8,
    color: '#5A5A6A', // Gray-blue - industrial pump
    category: 'extraction',
    connectionPoints: [],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 150, // MW
      powerConnections: [
        { id: 'power_in', x: 4, y: 4, type: 'power_input' as const, side: 'center' as const, capacity: 150 }
      ],
      efficiency: 100
    }
  },
  resource_well_extractor: {
    name: 'Resource Well Extractor',
    width: 8,
    height: 8,
    depth: 8,
    color: '#6A6A7A', // Medium gray-blue - extraction equipment
    category: 'extraction',
    connectionPoints: [
      { id: 'out1', x: 4, y: 7.5, type: 'output', side: 'back', isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 30, // MW (estimated)
      powerConnections: [
        { id: 'power_in', x: 4, y: 4, type: 'power_input' as const, side: 'center' as const, capacity: 30 }
      ],
      efficiency: 100
    }
  },

  // Power Buildings - Amber/yellow-gold with dark industrial accents
  biomass_burner: {
    name: 'Biomass Burner',
    width: 4,
    height: 4,
    depth: 6,
    color: '#5A6B4A', // Muted olive-green - organic fuel
    category: 'power',
    connectionPoints: [
      { id: 'in1', x: 2, y: 0.5, type: 'input', side: 'front' }
    ],
    powerData: {
      classification: 'generator' as const,
      powerGeneration: 30, // MW at 100% clock speed
      powerConnections: [
        { id: 'power_out', x: 2, y: 2, type: 'power_output' as const, side: 'center' as const, capacity: 30 }
      ],
      efficiency: 100,
      fuelTypes: ['Biomass', 'Wood', 'Leaves', 'Mycelia', 'Alien Carapace', 'Alien Organs', 'Solid Biofuel', 'Packaged Liquid Biofuel'],
      notes: 'Output scales to power demand (linear with load). Manual fuel loading required.',
      overclockable: false,
      variableOutput: true // Scales with demand
    }
  },
  coal_generator: {
    name: 'Coal Generator',
    width: 10,
    height: 26,
    depth: 20,
    color: '#4A4A4A', // Dark charcoal gray - coal burning
    category: 'power',
    connectionPoints: [
      { id: 'in1', x: 2.5, y: 0.5, type: 'input', side: 'front' },
      { id: 'in2', x: 7.5, y: 0.5, type: 'input', side: 'front', isFluid: true },
    ],
    powerData: {
      classification: 'generator' as const,
      powerGeneration: 75, // MW at 100% clock speed
      powerConnections: [
        { id: 'power_out', x: 5, y: 13, type: 'power_output' as const, side: 'center' as const, capacity: 75 }
      ],
      efficiency: 100,
      fuelTypes: ['Coal', 'Compacted Coal', 'Petroleum Coke'],
      waterConsumption: 45, // m³/min
      notes: 'Requires Water (45 m³/min). Overclockable.',
      overclockable: true
    }
  },
  advanced_coal_generator: {
    name: 'Advanced Coal Generator',
    width: 10,
    height: 26,
    depth: 20,
    color: '#3A3A3A', // Darker charcoal - upgraded coal
    category: 'power',
    connectionPoints: [
      { id: 'in1', x: 2.5, y: 0.5, type: 'input', side: 'front' },
      { id: 'in2', x: 7.5, y: 0.5, type: 'input', side: 'front', isFluid: true },
      { id: 'out1', x: 5, y: 25.5, type: 'output', side: 'back', isFluid: true }
    ],
    powerData: {
      classification: 'generator' as const,
      powerGeneration: 100, // MW - upgraded version
      powerConnections: [
        { id: 'power_out', x: 5, y: 13, type: 'power_output' as const, side: 'center' as const, capacity: 100 }
      ],
      efficiency: 100,
      fuelTypes: ['Coal', 'Compacted Coal', 'Petroleum Coke'],
      waterConsumption: 60, // m³/min - higher for advanced
      notes: 'Advanced version with higher output. Requires Water. Overclockable.',
      overclockable: true
    }
  },
  fuel_generator: {
    name: 'Fuel Generator',
    width: 10,
    height: 20,
    depth: 20,
    color: '#8B6B3A', // Muted amber-brown - liquid fuel
    category: 'power',
    connectionPoints: [
      { id: 'in1', x: 5, y: 0.5, type: 'input', side: 'front', isFluid: true }
    ],
    powerData: {
      classification: 'generator' as const,
      powerGeneration: 250, // MW at 100% clock speed
      powerConnections: [
        { id: 'power_out', x: 5, y: 10, type: 'power_output' as const, side: 'center' as const, capacity: 250 }
      ],
      efficiency: 100,
      fuelTypes: ['Fuel', 'Turbofuel', 'Liquid Biofuel', 'Rocket Fuel', 'Ionized Fuel'],
      notes: 'Fuel consumption varies by fuel type/energy density. Overclockable.',
      overclockable: true
    }
  },
  nuclear_power_plant: {
    name: 'Nuclear Power Plant',
    width: 40,
    height: 40,
    depth: 32,
    color: '#5A5A6A', // Steel gray with hint of blue - nuclear containment
    category: 'power',
    connectionPoints: [
      { id: 'in1', x: 10, y: 0.5, type: 'input', side: 'front' },
      { id: 'in2', x: 30, y: 0.5, type: 'input', side: 'front', isFluid: true },
      { id: 'out1', x: 20, y: 39.5, type: 'output', side: 'back' }
    ],
    powerData: {
      classification: 'generator' as const,
      powerGeneration: 2500, // MW at 100% clock speed
      powerConnections: [
        { id: 'power_out', x: 20, y: 20, type: 'power_output' as const, side: 'center' as const, capacity: 2500 }
      ],
      efficiency: 100,
      fuelTypes: ['Uranium Fuel Rod', 'Plutonium Fuel Rod', 'Ficsonium Fuel Rod'],
      waterConsumption: 240, // m³/min
      notes: 'Requires 240 m³/min Water. Produces Nuclear Waste. Overclockable.',
      overclockable: true,
      producesWaste: true
    }
  },
  plutonium_waste_disposal: {
    name: 'Plutonium Waste Disposal',
    width: 16,
    height: 16,
    depth: 16,
    color: '#6A4A4A', // Muted burgundy-brown - hazardous materials
    category: 'power',
    connectionPoints: [
      { id: 'in1', x: 8, y: 0.5, type: 'input', side: 'front' }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 10, // MW (estimated)
      powerConnections: [
        { id: 'power_in', x: 8, y: 8, type: 'power_input' as const, side: 'center' as const, capacity: 10 }
      ],
      efficiency: 100
    }
  },
  geothermal_generator: {
    name: 'Geothermal Generator',
    width: 19,
    height: 20,
    depth: 34,
    color: '#7A5A4A', // Rust-brown - geothermal/heat
    category: 'power',
    connectionPoints: [],
    powerData: {
      classification: 'generator' as const,
      powerGeneration: 200, // MW average (Normal purity geyser)
      powerGenerationMin: 50, // MW (Impure purity average)
      powerGenerationMax: 600, // MW (Pure purity peak)
      powerByPurity: {
        impure: { average: 50, min: 25, max: 75 },   // 50 MW average, fluctuates 0.5x-1.5x
        normal: { average: 100, min: 50, max: 150 }, // 100 MW average, fluctuates 0.5x-1.5x
        pure: { average: 200, min: 100, max: 300 }   // 200 MW average, fluctuates 0.5x-1.5x
      },
      powerConnections: [
        { id: 'power_out', x: 9.5, y: 10, type: 'power_output' as const, side: 'center' as const, capacity: 600 }
      ],
      efficiency: 100,
      fuelTypes: [], // No fuel - geyser powered
      notes: 'Geyser-powered. Fluctuates 0.5x-1.5x average over 1-min cycle. Not overclockable.',
      overclockable: false,
      variableOutput: true,
      fluctuationCycle: 60 // seconds
    }
  },
  power_storage: {
    name: 'Power Storage',
    width: 8,
    height: 12,
    depth: 8,
    color: '#8A7A3A', // Muted gold-olive - battery storage
    category: 'power',
    connectionPoints: [],
    powerData: {
      classification: 'storage' as const,
      powerConsumption: 0, // No active consumption
      powerConnections: [
        { id: 'power_io', x: 4, y: 6, type: 'power_bidirectional' as const, side: 'center' as const, capacity: 100 }
      ],
      efficiency: 100
    }
  },
  alien_power_augmenter: {
    name: 'Alien Power Augmenter',
    width: 6,
    height: 6,
    depth: 6,
    color: '#6A5A7A', // Muted purple-gray - alien tech
    category: 'power',
    connectionPoints: [],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 50, // MW (alien tech estimated)
      powerConnections: [
        { id: 'power_in', x: 3, y: 3, type: 'power_input' as const, side: 'center' as const, capacity: 50 }
      ],
      efficiency: 100
    }
  },

  // Logistics Buildings - Neutral steel/gunmetal colors
  splitter: {
    name: 'Splitter',
    width: 4,
    height: 4,
    depth: 2,
    color: '#5A6A6A', // Steel gunmetal - basic logistics
    category: 'logistics',
    connectionPoints: [
      { id: 'in1', x: 2, y: 3.5, type: 'input', side: 'back' },
      { id: 'out1', x: 0.5, y: 2, type: 'output', side: 'left' },
      { id: 'out2', x: 2, y: 0.5, type: 'output', side: 'front' },
      { id: 'out3', x: 3.5, y: 2, type: 'output', side: 'right' }
    ]
  },
  smart_splitter: {
    name: 'Smart Splitter',
    width: 4,
    height: 4,
    depth: 2,
    color: '#4A5A6A', // Darker steel blue - smart variant
    category: 'logistics',
    connectionPoints: [
      { id: 'in1', x: 2, y: 3.5, type: 'input', side: 'back' },
      { id: 'out1', x: 0.5, y: 2, type: 'output', side: 'left' },
      { id: 'out2', x: 2, y: 0.5, type: 'output', side: 'front' },
      { id: 'out3', x: 3.5, y: 2, type: 'output', side: 'right' }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 1, // MW (smart routing)
      powerConnections: [
        { id: 'power_in', x: 2, y: 2, type: 'power_input' as const, side: 'center' as const, capacity: 1 }
      ],
      efficiency: 100
    }
  },
  programmable_splitter: {
    name: 'Programmable Splitter',
    width: 4,
    height: 4,
    depth: 2,
    color: '#4A4A5A', // Dark steel with purple tint - programmable
    category: 'logistics',
    connectionPoints: [
      { id: 'in1', x: 2, y: 3.5, type: 'input', side: 'back' },
      { id: 'out1', x: 0.5, y: 2, type: 'output', side: 'left' },
      { id: 'out2', x: 2, y: 0.5, type: 'output', side: 'front' },
      { id: 'out3', x: 3.5, y: 2, type: 'output', side: 'right' }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 1, // MW (logic routing)
      powerConnections: [
        { id: 'power_in', x: 2, y: 2, type: 'power_input' as const, side: 'center' as const, capacity: 1 }
      ],
      efficiency: 100
    }
  },
  merger: {
    name: 'Merger',
    width: 4,
    height: 4,
    depth: 2,
    color: '#6A6A7A', // Medium gunmetal - merger
    category: 'logistics',
    connectionPoints: [
      { id: 'in1', x: 0.5, y: 2, type: 'input', side: 'left' },
      { id: 'in2', x: 2, y: 3.5, type: 'input', side: 'back' },
      { id: 'in3', x: 3.5, y: 2, type: 'input', side: 'right' },
      { id: 'out1', x: 2, y: 0.5, type: 'output', side: 'front' }
    ]
  },
  // Fluid logistics
  pipeline_junction: {
    name: 'Pipeline Junction Cross',
    width: 2,
    height: 2,
    depth: 2,
    color: '#5A7080', // Muted blue-gray - pipe fitting
    category: 'logistics',
    connectionPoints: [
      { id: 'pipe1', x: 1, y: 0.1, type: 'bidirectional' as const, side: 'front' as const, isFluid: true },
      { id: 'pipe2', x: 1.9, y: 1, type: 'bidirectional' as const, side: 'right' as const, isFluid: true },
      { id: 'pipe3', x: 1, y: 1.9, type: 'bidirectional' as const, side: 'back' as const, isFluid: true },
      { id: 'pipe4', x: 0.1, y: 1, type: 'bidirectional' as const, side: 'left' as const, isFluid: true }
    ]
  },
  pipeline_pump: {
    name: 'Pipeline Pump',
    width: 2,
    height: 4,
    depth: 3,
    color: '#4A6070', // Steel blue - fluid pump
    category: 'logistics',
    connectionPoints: [
      { id: 'in1', x: 1, y: 3.5, type: 'input' as const, side: 'back' as const, isFluid: true },
      { id: 'out1', x: 1, y: 0.5, type: 'output' as const, side: 'front' as const, isFluid: true }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 4, // MW
      powerConnections: [
        { id: 'power_in', x: 1, y: 2, type: 'power_input' as const, side: 'center' as const, capacity: 4 }
      ],
      efficiency: 100
    }
  },
  valve: {
    name: 'Valve',
    width: 2,
    height: 2,
    depth: 2,
    color: '#5A6A70', // Blue-gray steel - valve
    category: 'logistics',
    connectionPoints: [
      { id: 'in1', x: 1, y: 1.9, type: 'input' as const, side: 'back' as const, isFluid: true },
      { id: 'out1', x: 1, y: 0.1, type: 'output' as const, side: 'front' as const, isFluid: true }
    ]
  },

  // Storage Buildings - Neutral steel/container colors
  storage: {
    name: 'Storage Container',
    width: 5,
    height: 5,
    depth: 8,
    color: '#6B7280', // Steel gray - standard container
    category: 'storage',
    connectionPoints: [
      { id: 'in1', x: 0.5, y: 2.5, type: 'input', side: 'left' },
      { id: 'out1', x: 4.5, y: 2.5, type: 'output', side: 'right' }
    ]
  },
  industrial_storage: {
    name: 'Industrial Storage',
    width: 10,
    height: 5,
    depth: 16,
    color: '#5A6268', // Darker steel - larger container
    category: 'storage',
    connectionPoints: [
      { id: 'in1', x: 0.5, y: 1.5, type: 'input', side: 'left' },
      { id: 'in2', x: 0.5, y: 3.5, type: 'input', side: 'left' },
      { id: 'out1', x: 9.5, y: 1.5, type: 'output', side: 'right' },
      { id: 'out2', x: 9.5, y: 3.5, type: 'output', side: 'right' }
    ]
  },
  personal_storage: {
    name: 'Personal Storage Box',
    width: 2,
    height: 2,
    depth: 2,
    color: '#7A8288', // Light steel - small box
    category: 'storage',
    connectionPoints: []
  },
  medical_storage: {
    name: 'Medical Storage Box',
    width: 2,
    height: 2,
    depth: 2,
    color: '#8B5A5A', // Muted red-brown - medical cross aesthetic
    category: 'storage',
    connectionPoints: []
  },
  hazard_storage: {
    name: 'Hazard Storage Box',
    width: 2,
    height: 2,
    depth: 2,
    color: '#8B7A3A', // Muted amber-brown - hazard warning tone
    category: 'storage',
    connectionPoints: []
  },
  fluid_buffer: {
    name: 'Fluid Buffer',
    width: 4,
    height: 4,
    depth: 8,
    color: '#4A6A7A', // Muted steel blue - fluid tank
    category: 'storage',
    connectionPoints: [
      { id: 'pipe1', x: 2, y: 0.1, type: 'bidirectional' as const, side: 'front' as const, isFluid: true },
      { id: 'pipe2', x: 2, y: 3.9, type: 'bidirectional' as const, side: 'back' as const, isFluid: true }
    ]
  },
  industrial_fluid_buffer: {
    name: 'Industrial Fluid Buffer',
    width: 8,
    height: 8,
    depth: 12,
    color: '#3A5A6A', // Darker steel blue - large tank
    category: 'storage',
    connectionPoints: [
      { id: 'pipe1', x: 4, y: 0.1, type: 'bidirectional' as const, side: 'front' as const, isFluid: true },
      { id: 'pipe2', x: 4, y: 7.9, type: 'bidirectional' as const, side: 'back' as const, isFluid: true }
    ]
  },
  dimensional_depot: {
    name: 'Dimensional Depot',
    width: 8,
    height: 8,
    depth: 8,
    color: '#5A5A7A', // Muted purple-gray - alien tech storage
    category: 'storage',
    connectionPoints: []
  },
  dimensional_storage_unit: {
    name: 'Dimensional Storage Unit',
    width: 16,
    height: 16,
    depth: 16,
    color: '#4A4A6A', // Darker purple-gray - advanced alien storage
    category: 'storage',
    connectionPoints: []
  },

  // Special Buildings - Distinctive but industrial tones
  hub: {
    name: 'The HUB',
    width: 32,
    height: 32,
    depth: 16,
    color: '#7A6A4A', // Muted bronze-tan - FICSIT brand tone
    category: 'special',
    connectionPoints: []
  },
  mam: {
    name: 'MAM',
    width: 12,
    height: 12,
    depth: 12,
    color: '#5A5A6A', // Muted purple-gray - research facility
    category: 'special',
    connectionPoints: []
  },
  space_elevator: {
    name: 'Space Elevator',
    width: 54,
    height: 54,
    depth: 118,
    color: '#3A4A5A', // Dark steel blue - massive structure
    category: 'special',
    connectionPoints: []
  },
  awesome_sink: {
    name: 'AWESOME Sink',
    width: 8,
    height: 8,
    depth: 8,
    color: '#7A4A4A', // Muted burgundy - distinctive but not neon
    category: 'special',
    connectionPoints: [
      { id: 'in1', x: 4, y: 0.5, type: 'input', side: 'front' }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 30, // MW
      powerConnections: [
        { id: 'power_in', x: 4, y: 4, type: 'power_input' as const, side: 'center' as const, capacity: 30 }
      ],
      efficiency: 100
    }
  },

  // Workstations - Workshop/utility industrial colors
  craft_bench: {
    name: 'Craft Bench',
    width: 4,
    height: 4,
    depth: 4,
    color: '#6A5A4A', // Worn wood-metal tone
    category: 'workstations',
    connectionPoints: []
  },
  equipment_workshop: {
    name: 'Equipment Workshop',
    width: 8,
    height: 8,
    depth: 8,
    color: '#5A5A5A', // Dark steel - workshop machinery
    category: 'workstations',
    connectionPoints: []
  },
  blueprint_designer: {
    name: 'Blueprint Designer',
    width: 10,
    height: 10,
    depth: 8,
    color: '#4A5A6A', // Steel blue-gray - technical equipment
    category: 'workstations',
    connectionPoints: []
  },

  // Transport/Docking Stations with Railway Support - Industrial transport colors
  truck_station: {
    name: 'Truck Station',
    width: 12,
    height: 8,
    depth: 8,
    color: '#7A6A4A', // Muted tan-brown - truck depot aesthetic
    category: 'transport',
    connectionPoints: [
      { id: 'in1', x: 2, y: 0.5, type: 'input', side: 'front', isFluid: true }, // Fuel input
      { id: 'in2', x: 6, y: 0.5, type: 'input', side: 'front' }, // Cargo input 1
      { id: 'in3', x: 10, y: 0.5, type: 'input', side: 'front' }, // Cargo input 2
      { id: 'out1', x: 6, y: 7.5, type: 'output', side: 'back' }, // Cargo output 1
      { id: 'out2', x: 10, y: 7.5, type: 'output', side: 'back' } // Cargo output 2
    ]
  },
  train_station: {
    name: 'Train Station',
    width: 16,   // Accurate: 16m perpendicular to track (short left-to-right)
    height: 34,  // Accurate: 34m along track direction (deep)
    depth: 20,   // Accurate: 20m tall
    color: '#2d3a4a', // Dark blue-gray - main station building (amber accent)
    category: 'transport',
    connectionPoints: [], // Train Station has NO conveyor/pipe connections
    railwayPoints: [
      {
        id: 'rail_in',
        x: 0,   // Left side (track enters)
        y: 17,  // Center of height (34m / 2 = 17m)
        type: 'railway' as const,
        side: 'left' as const,
        direction: 'in' as const
      },
      {
        id: 'rail_out',
        x: 16,  // Right side (track exits)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'right' as const,
        direction: 'out' as const
      }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 50, // MW constant - powers rail network & attached platforms
      powerConnections: [
        // Power hookup on back side, centered
        { id: 'power_in', x: 8, y: 33, type: 'power_input' as const, side: 'back' as const, capacity: 50 }
      ],
      efficiency: 100,
      notes: 'Supplies 50 MW per attached platform during load/unload'
    }
  },
  freight_platform: {
    name: 'Freight Platform',
    width: 16,   // Accurate: 16m perpendicular to track (short left-to-right)
    height: 34,  // Accurate: 34m along track direction (deep)
    depth: 20,   // Accurate: 20m tall
    color: '#3a4a3a', // Dark green-gray - cargo platform (green accent)
    category: 'transport',
    connectionPoints: [
      // All ports on front-right of platform (same side, close together)
      // Inputs slightly left, outputs slightly right - all near front edge
      { id: 'in1', x: 9, y: 30, type: 'input' as const, side: 'front' as const },
      { id: 'in2', x: 9, y: 26, type: 'input' as const, side: 'front' as const },
      { id: 'out1', x: 13, y: 30, type: 'output' as const, side: 'front' as const },
      { id: 'out2', x: 13, y: 26, type: 'output' as const, side: 'front' as const }
    ],
    railwayPoints: [
      {
        id: 'rail_in',
        x: 0,   // Left side (track enters)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'left' as const,
        direction: 'in' as const
      },
      {
        id: 'rail_out',
        x: 16,  // Right side (track exits)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'right' as const,
        direction: 'out' as const
      }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 50, // MW during load/unload (0.1 MW idle)
      powerConnections: [], // Powered by adjacent Train Station (no direct power input)
      efficiency: 100,
      notes: 'Powered by adjacent Train Station; 50 MW during load/unload, 0.1 MW idle'
    }
  },
  fluid_freight_platform: {
    name: 'Fluid Freight Platform',
    width: 16,   // Accurate: 16m perpendicular to track (short left-to-right)
    height: 34,  // Accurate: 34m along track direction (deep)
    depth: 20,   // Accurate: 20m tall
    color: '#2a3a4a', // Dark blue-gray - fluid platform (blue accent)
    category: 'transport',
    connectionPoints: [
      // All fluid ports on front-right of platform (same side, close together)
      // Inputs slightly left, outputs slightly right - all near front edge
      { id: 'in1', x: 9, y: 30, type: 'input' as const, side: 'front' as const, isFluid: true },
      { id: 'in2', x: 9, y: 26, type: 'input' as const, side: 'front' as const, isFluid: true },
      { id: 'out1', x: 13, y: 30, type: 'output' as const, side: 'front' as const, isFluid: true },
      { id: 'out2', x: 13, y: 26, type: 'output' as const, side: 'front' as const, isFluid: true }
    ],
    railwayPoints: [
      {
        id: 'rail_in',
        x: 0,   // Left side (track enters)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'left' as const,
        direction: 'in' as const
      },
      {
        id: 'rail_out',
        x: 16,  // Right side (track exits)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'right' as const,
        direction: 'out' as const
      }
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 50, // MW during transfer (0.1 MW idle)
      powerConnections: [], // Powered by adjacent Train Station (no direct power input)
      efficiency: 100,
      notes: 'Powered by adjacent Train Station; 50 MW during transfer, 0.1 MW idle. Lower output: +10m head lift. Top output: +14m head lift.'
    }
  },
  empty_platform: {
    name: 'Empty Platform',
    width: 16,   // Accurate: 16m perpendicular to track (short left-to-right)
    height: 34,  // Accurate: 34m along track direction (deep)
    depth: 20,   // Accurate: 20m tall
    color: '#3a3a3a', // Neutral dark gray - empty platform (gray accent)
    category: 'transport',
    connectionPoints: [], // Empty platform has no connections
    railwayPoints: [
      {
        id: 'rail_in',
        x: 0,   // Left side (track enters)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'left' as const,
        direction: 'in' as const
      },
      {
        id: 'rail_out',
        x: 16,  // Right side (track exits)
        y: 17,  // Center of height
        type: 'railway' as const,
        side: 'right' as const,
        direction: 'out' as const
      }
    ]
  },
  drone_port: {
    name: 'Drone Port',
    width: 16,
    height: 16,
    depth: 12,
    color: '#5A6A7A', // Steel gray-blue - drone infrastructure
    category: 'transport',
    connectionPoints: [
      { id: 'battery', x: 5, y: 15.5, type: 'input', side: 'back' }, // Battery input - left of center
      { id: 'in1', x: 10, y: 15.5, type: 'input', side: 'back' }, // Input - right of center
      { id: 'out1', x: 12, y: 15.5, type: 'output', side: 'back' } // Output - right of center, close to input
    ],
    powerData: {
      classification: 'consumer' as const,
      powerConsumption: 100, // MW (estimated for drone operations)
      powerConnections: [
        { id: 'power_in', x: 8, y: 8, type: 'power_input' as const, side: 'center' as const, capacity: 100 }
      ],
      efficiency: 100
    }
  },

  // Infrastructure Buildings - Industrial steel and utility colors
  lookout_tower: {
    name: 'Lookout Tower',
    width: 4,
    height: 4,
    depth: 32,
    color: '#6A7A7A', // Light steel - observation structure
    category: 'infrastructure',
    connectionPoints: []
  },
  radar_tower: {
    name: 'Radar Tower',
    width: 8,
    height: 8,
    depth: 40,
    color: '#4A5A6A', // Steel blue-gray - communications tower
    category: 'infrastructure',
    connectionPoints: []
  },

  // Power distribution infrastructure - Hidden from building palette, placed via overlay toolbar
  power_pole_mk1: {
    name: 'Power Pole Mk.1',
    width: 1,
    height: 1,
    depth: 7,
    color: '#6A7A7A', // Light steel - basic pole
    category: 'infrastructure',
    connectionPoints: [],
    powerData: {
      classification: 'pole',
      powerConnections: [
        { id: 'power_hub', x: 0.5, y: 0.5, type: 'power_pole', side: 'center', capacity: 1000 }
      ],
      efficiency: 100
    },
    hiddenFromPalette: true
  },
  power_pole_mk2: {
    name: 'Power Pole Mk.2',
    width: 1,
    height: 1,
    depth: 8,
    color: '#5A6A6A', // Medium steel - upgraded pole
    category: 'infrastructure',
    connectionPoints: [],
    powerData: {
      classification: 'pole',
      powerConnections: [
        { id: 'power_hub', x: 0.5, y: 0.5, type: 'power_pole', side: 'center', capacity: 1000 }
      ],
      efficiency: 100
    },
    hiddenFromPalette: true
  },
  power_pole_mk3: {
    name: 'Power Pole Mk.3',
    width: 1,
    height: 1,
    depth: 9,
    color: '#4A5A5A', // Dark steel - advanced pole
    category: 'infrastructure',
    connectionPoints: [],
    powerData: {
      classification: 'pole',
      powerConnections: [
        { id: 'power_hub', x: 0.5, y: 0.5, type: 'power_pole', side: 'center', capacity: 1000 }
      ],
      efficiency: 100
    },
    hiddenFromPalette: true
  },
  power_tower: {
    name: 'Power Tower',
    width: 4,
    height: 4,
    depth: 15,
    color: '#3A4A5A', // Dark steel blue - large tower
    category: 'infrastructure',
    connectionPoints: [],
    powerData: {
      classification: 'pole',
      powerConnections: [
        { id: 'power_hub', x: 2, y: 2, type: 'power_pole', side: 'center', capacity: 2000 }
      ],
      efficiency: 100
    },
    hiddenFromPalette: true
  },

  // Architecture Buildings - Concrete grays matching Satisfactory foundations
  foundation: {
    name: 'Foundation',
    width: 8,
    height: 8,
    depth: 1,
    color: '#64748B', // Concrete gray - standard foundation
    category: 'architecture',
    connectionPoints: [],
    powerData: {
      classification: 'neutral',
      powerConnections: [],
      efficiency: 100
    }
  },
  foundation_2m: {
    name: 'Foundation 2m',
    width: 8,
    height: 8,
    depth: 2,
    color: '#64748B', // Concrete gray - consistent with foundation
    category: 'architecture',
    connectionPoints: []
  },
  foundation_4m: {
    name: 'Foundation 4m',
    width: 8,
    height: 8,
    depth: 4,
    color: '#64748B', // Concrete gray - consistent with foundation
    category: 'architecture',
    connectionPoints: []
  },
  wall_1m: {
    name: 'Wall 1m',
    width: 8,
    height: 1,
    depth: 1,
    color: '#7A8A9A', // Lighter concrete - wall panels
    category: 'architecture',
    connectionPoints: []
  },
  wall_2m: {
    name: 'Wall 2m',
    width: 8,
    height: 1,
    depth: 2,
    color: '#7A8A9A', // Lighter concrete - wall panels
    category: 'architecture',
    connectionPoints: []
  },
  wall_4m: {
    name: 'Wall 4m',
    width: 8,
    height: 1,
    depth: 4,
    color: '#7A8A9A', // Lighter concrete - wall panels
    category: 'architecture',
    connectionPoints: []
  },
  wall_8m: {
    name: 'Wall 8m',
    width: 8,
    height: 1,
    depth: 8,
    color: '#7A8A9A', // Lighter concrete - wall panels
    category: 'architecture',
    connectionPoints: []
  },
  ramp_1m: {
    name: 'Ramp 1m',
    width: 8,
    height: 8,
    depth: 1,
    color: '#5C6B7A', // Slightly darker concrete - ramps
    category: 'architecture',
    connectionPoints: []
  },
  ramp_2m: {
    name: 'Ramp 2m',
    width: 8,
    height: 8,
    depth: 2,
    color: '#5C6B7A', // Slightly darker concrete - ramps
    category: 'architecture',
    connectionPoints: []
  },
  ramp_4m: {
    name: 'Ramp 4m',
    width: 8,
    height: 8,
    depth: 4,
    color: '#5C6B7A', // Slightly darker concrete - ramps
    category: 'architecture',
    connectionPoints: []
  },
  ramp_8m: {
    name: 'Ramp 8m',
    width: 8,
    height: 8,
    depth: 8,
    color: '#5C6B7A', // Slightly darker concrete - ramps
    category: 'architecture',
    connectionPoints: []
  },
  curved_ramp: {
    name: 'Curved Ramp',
    width: 8,
    height: 8,
    depth: 4,
    color: '#5C6B7A', // Slightly darker concrete - ramps
    category: 'architecture',
    connectionPoints: []
  },
  quarter_pipe: {
    name: 'Quarter Pipe',
    width: 8,
    height: 8,
    depth: 4,
    color: '#5C6B7A', // Slightly darker concrete - ramps
    category: 'architecture',
    connectionPoints: []
  },
  walkway: {
    name: 'Walkway',
    width: 4,
    height: 4,
    depth: 0.1,
    color: '#4A5A6A', // Dark steel - metal grating
    category: 'architecture',
    connectionPoints: []
  },
  catwalk: {
    name: 'Catwalk',
    width: 4,
    height: 4,
    depth: 0.1,
    color: '#3A4A5A', // Darker steel - industrial catwalk
    category: 'architecture',
    connectionPoints: []
  },
  pillar: {
    name: 'Pillar',
    width: 2,
    height: 2,
    depth: 8,
    color: '#5A6A7A', // Steel gray - structural support
    category: 'architecture',
    connectionPoints: []
  },
  beam: {
    name: 'Beam',
    width: 8,
    height: 1,
    depth: 1,
    color: '#6A7A8A', // Light steel - structural beam
    category: 'architecture',
    connectionPoints: []
  },
  railing: {
    name: 'Railing',
    width: 8,
    height: 1,
    depth: 1,
    color: '#4A5A5A', // Dark steel - safety railing
    category: 'architecture',
    connectionPoints: []
  },
  fence: {
    name: 'Fence',
    width: 8,
    height: 1,
    depth: 2,
    color: '#5A6A6A', // Medium steel - perimeter fence
    category: 'architecture',
    connectionPoints: []
  },
  window: {
    name: 'Window',
    width: 8,
    height: 1,
    depth: 4,
    color: '#5A7080', // Muted blue-gray - industrial glass frame
    category: 'architecture',
    connectionPoints: []
  },
  door: {
    name: 'Door',
    width: 4,
    height: 1,
    depth: 4,
    color: '#5A5A6A', // Dark gray - industrial door
    category: 'architecture',
    connectionPoints: []
  },
  ceiling: {
    name: 'Ceiling',
    width: 8,
    height: 8,
    depth: 0.51,
    color: '#64748B', // Concrete gray - matches foundation
    category: 'architecture',
    connectionPoints: []
  },
  frame_floor: {
    name: 'Frame Floor',
    width: 8,
    height: 8,
    depth: 0.4,
    color: '#5A6A7A', // Steel gray - metal frame
    category: 'architecture',
    connectionPoints: []
  },
  ladder: {
    name: 'Ladder',
    width: 1,
    height: 1,
    depth: 8, // Adjustable 2-20m
    color: '#4A5A5A', // Dark steel - ladder rungs
    category: 'architecture',
    connectionPoints: []
  }
};