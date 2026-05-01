// Allow dead code - library functions for different build targets
#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[repr(C, align(16))] // SIMD-friendly alignment
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    #[serde(skip)]
    _padding: f64, // Align to 32 bytes for AVX
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LineSegment2D {
    pub start: Point3D,
    pub end: Point3D,
}

impl LineSegment2D {
    #[inline]
    pub fn new(start: Point3D, end: Point3D) -> Self {
        Self { start, end }
    }
    
    #[inline]
    pub fn length(&self) -> f64 {
        self.start.distance(&self.end)
    }
}

impl Point3D {
    #[inline]
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z, _padding: 0.0 }
    }
    
    #[inline]
    pub fn distance_squared(&self, other: &Point3D) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        let dz = self.z - other.z;
        dx * dx + dy * dy + dz * dz
    }
    
    #[inline]
    pub fn distance(&self, other: &Point3D) -> f64 {
        self.distance_squared(other).sqrt()
    }
    
    #[inline]
    pub fn add(&self, other: &Point3D) -> Point3D {
        Point3D::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }
    
    #[inline]
    pub fn subtract(&self, other: &Point3D) -> Point3D {
        Point3D::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }
    
    #[inline]
    pub fn scale(&self, factor: f64) -> Point3D {
        Point3D::new(self.x * factor, self.y * factor, self.z * factor)
    }
    
    #[inline]
    pub fn magnitude(&self) -> f64 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }
    
    #[inline]
    pub fn normalize(&self) -> Point3D {
        let mag = self.magnitude();
        if mag > 0.0 {
            Point3D::new(self.x / mag, self.y / mag, self.z / mag)
        } else {
            *self
        }
    }
}

impl Default for Point3D {
    fn default() -> Self {
        Point3D::new(0.0, 0.0, 0.0)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox3D {
    pub min: Point3D,
    pub max: Point3D,
}

impl BoundingBox3D {
    pub fn new(min: Point3D, max: Point3D) -> Self {
        Self { min, max }
    }
    
    pub fn contains_point(&self, point: &Point3D) -> bool {
        point.x >= self.min.x && point.x <= self.max.x &&
        point.y >= self.min.y && point.y <= self.max.y &&
        point.z >= self.min.z && point.z <= self.max.z
    }
    
    pub fn intersects(&self, other: &BoundingBox3D) -> bool {
        self.min.x <= other.max.x && self.max.x >= other.min.x &&
        self.min.y <= other.max.y && self.max.y >= other.min.y &&
        self.min.z <= other.max.z && self.max.z >= other.min.z
    }
    
    pub fn expand_to_include(&mut self, point: &Point3D) {
        self.min.x = self.min.x.min(point.x);
        self.min.y = self.min.y.min(point.y);
        self.min.z = self.min.z.min(point.z);
        self.max.x = self.max.x.max(point.x);
        self.max.y = self.max.y.max(point.y);
        self.max.z = self.max.z.max(point.z);
    }
    
    pub fn center(&self) -> Point3D {
        Point3D::new(
            (self.min.x + self.max.x) / 2.0,
            (self.min.y + self.max.y) / 2.0,
            (self.min.z + self.max.z) / 2.0,
        )
    }
}

/// Rotation in degrees (0, 90, 180, 270)
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum Rotation {
    Deg0 = 0,
    Deg90 = 90,
    Deg180 = 180,
    Deg270 = 270,
}

impl Default for Rotation {
    fn default() -> Self {
        Rotation::Deg0
    }
}

impl Rotation {
    pub fn to_radians(&self) -> f64 {
        (*self as i32 as f64) * std::f64::consts::PI / 180.0
    }
    
    pub fn from_degrees(degrees: f64) -> Self {
        let normalized = ((degrees % 360.0) + 360.0) % 360.0;
        if normalized < 45.0 || normalized >= 315.0 {
            Rotation::Deg0
        } else if normalized < 135.0 {
            Rotation::Deg90
        } else if normalized < 225.0 {
            Rotation::Deg180
        } else {
            Rotation::Deg270
        }
    }
}
// ============================================================================
// POWERLINE SYSTEM TYPES - Phase 2.1 Implementation
// ============================================================================

/// Power connection types for electrical networks
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum PowerConnectionType {
    /// Power generator output (can only output power)
    Generator,
    /// Power consumer input (can only consume power)  
    Consumer,
    /// Power pole connection (can route power in both directions)
    Pole,
    /// Transformer connection (steps voltage up/down)
    Transformer,
}

impl Default for PowerConnectionType {
    fn default() -> Self {
        PowerConnectionType::Consumer
    }
}

/// Power voltage levels for electrical compatibility
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum PowerVoltageLevel {
    Low,    // Basic power lines
    Medium, // Industrial power lines
    High,   // High-voltage transmission
}

impl Default for PowerVoltageLevel {
    fn default() -> Self {
        PowerVoltageLevel::Low
    }
}

/// Power connection point for buildings and power poles
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowerConnectionPoint {
    /// Relative position from building center
    pub position: Point3D,
    /// Type of power connection (generator, consumer, pole, transformer)
    pub connection_type: PowerConnectionType,
    /// Voltage level for compatibility checking
    pub voltage_level: PowerVoltageLevel,
    /// Maximum power capacity (in MW)
    pub max_power: f64,
    /// Whether this connection point is currently occupied
    pub occupied: bool,
    /// Unique identifier for this connection point
    pub id: String,
}

impl PowerConnectionPoint {
    pub fn new(
        position: Point3D,
        connection_type: PowerConnectionType,
        voltage_level: PowerVoltageLevel,
        max_power: f64,
        id: String,
    ) -> Self {
        Self {
            position,
            connection_type,
            voltage_level,
            max_power,
            occupied: false,
            id,
        }
    }
    
    /// Check if two connection points are electrically compatible
    pub fn is_compatible_with(&self, other: &PowerConnectionPoint) -> bool {
        // Voltage levels must match
        if self.voltage_level != other.voltage_level {
            return false;
        }
        
        // Connection type compatibility rules
        match (self.connection_type, other.connection_type) {
            // Generator can connect to consumer or pole
            (PowerConnectionType::Generator, PowerConnectionType::Consumer) => true,
            (PowerConnectionType::Generator, PowerConnectionType::Pole) => true,
            (PowerConnectionType::Consumer, PowerConnectionType::Generator) => true,
            (PowerConnectionType::Consumer, PowerConnectionType::Pole) => true,
            
            // Pole can connect to anything
            (PowerConnectionType::Pole, _) => true,
            (_, PowerConnectionType::Pole) => true,
            
            // Transformer can connect to anything (voltage conversion)
            (PowerConnectionType::Transformer, _) => true,
            (_, PowerConnectionType::Transformer) => true,
            
            // No direct generator-to-generator or consumer-to-consumer connections
            _ => false,
        }
    }
}

/// Powerline segment connecting two power points
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowerlineSegment {
    /// Unique identifier for this segment
    pub id: String,
    /// Starting connection point
    pub start_point: Point3D,
    /// Ending connection point  
    pub end_point: Point3D,
    /// Voltage level of this powerline
    pub voltage_level: PowerVoltageLevel,
    /// Maximum power capacity (in MW)
    pub max_power: f64,
    /// Current power flow (in MW, negative for reverse flow)
    pub current_power_flow: f64,
    /// Whether this segment uses power poles for routing
    pub uses_poles: bool,
    /// IDs of power poles this segment passes through
    pub pole_ids: Vec<String>,
    /// Length of the powerline in meters
    pub length: f64,
}

impl PowerlineSegment {
    pub fn new(
        id: String,
        start_point: Point3D,
        end_point: Point3D,
        voltage_level: PowerVoltageLevel,
        max_power: f64,
    ) -> Self {
        let length = start_point.distance(&end_point);
        
        Self {
            id,
            start_point,
            end_point,
            voltage_level,
            max_power,
            current_power_flow: 0.0,
            uses_poles: false,
            pole_ids: Vec::new(),
            length,
        }
    }
    
    /// Check if powerline can carry the specified power load
    pub fn can_carry_power(&self, power_demand: f64) -> bool {
        power_demand.abs() <= self.max_power
    }
    
    /// Get bounding box for spatial indexing
    pub fn get_bounding_box(&self) -> BoundingBox3D {
        let bbox = BoundingBox3D::new(self.start_point, self.end_point);
        
        bbox
    }
}

/// Electrical network validation result
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowerlineValidationResult {
    /// Whether the network configuration is valid
    pub is_valid: bool,
    /// List of validation errors
    pub errors: Vec<String>,
    /// List of validation warnings
    pub warnings: Vec<String>,
    /// Maximum power flow capacity
    pub max_capacity: f64,
    /// Whether the network has any loops (not allowed in electrical networks)
    pub has_loops: bool,
    /// Number of isolated sub-networks
    pub sub_network_count: usize,
}

impl Default for PowerlineValidationResult {
    fn default() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
            max_capacity: 0.0,
            has_loops: false,
            sub_network_count: 1,
        }
    }
}

/// Power compatibility information for connection validation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowerCompatibilityInfo {
    /// Whether the voltage levels are compatible
    pub voltage_compatible: bool,
    /// Whether the connection types are compatible
    pub connection_compatible: bool,
    /// Whether the power capacity is sufficient
    pub capacity_sufficient: bool,
    /// Maximum power that can flow through this connection
    pub max_power_flow: f64,
    /// Any compatibility warnings or restrictions
    pub warnings: Vec<String>,
}

impl Default for PowerCompatibilityInfo {
    fn default() -> Self {
        Self {
            voltage_compatible: true,
            connection_compatible: true,
            capacity_sufficient: true,
            max_power_flow: 0.0,
            warnings: Vec::new(),
        }
    }
}

/// Powerline snapping result for user interaction
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowerlineSnapResult {
    /// Type of snap target ("connection_point", "pole", "segment")
    pub snap_type: String,
    /// Target ID (connection point ID, pole ID, or segment ID)
    pub target_id: String,
    /// Distance to snap target
    pub distance: f64,
    /// Snap position in 3D space
    pub snap_point: Point3D,
    /// Parameter along segment for segment snaps (0.0 to 1.0)
    pub segment_t: Option<f64>,
    /// Whether this snap would create a valid electrical connection
    pub is_valid_connection: bool,
    /// Power compatibility information
    pub power_compatibility: PowerCompatibilityInfo,
}

/// High-performance powerline intersection result
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PowerlineIntersectionResult {
    /// Intersection point in 3D space
    pub point: Point3D,
    /// First powerline segment ID
    pub segment1_id: String,
    /// Second powerline segment ID  
    pub segment2_id: String,
    /// Parameter along first segment (0.0 to 1.0)
    pub t1: f64,
    /// Parameter along second segment (0.0 to 1.0)
    pub t2: f64,
    /// Distance between powerlines at intersection
    pub distance: f64,
    /// Whether this is a true intersection or just close proximity
    pub is_true_intersection: bool,
    /// Intersection type (crossing, touching, parallel)
    pub intersection_type: String,
}
