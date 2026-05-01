// Allow dead code and unused imports - library for different build targets
#![allow(dead_code, unused_imports)]

use serde::{Deserialize, Serialize};
use crate::types::Point3D;

// Conveyor Belt Types

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorPole {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>, // Poles at building connections
}

impl ConveyorPole {
    pub fn is_anchor(&self) -> bool {
        self.is_anchor.unwrap_or(false)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorSegment {
    pub id: String,
    #[serde(rename = "type")]
    pub segment_type: SegmentType,
    pub start_pole: String, // Pole ID
    pub end_pole: String,
    pub control_points: Option<Vec<Point3D>>, // For curved segments
    pub length: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SegmentType {
    Straight,
    Turn,
    Incline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorBelt {
    pub id: String,
    pub segments: Vec<String>, // Segment IDs
    pub from_building_id: Option<String>,
    pub from_connection_point: Option<String>,
    pub to_building_id: Option<String>,
    pub to_connection_point: Option<String>,
    pub floor: i32,
    pub mark: u8, // Belt tier (1-6)
    pub direction: ConveyorDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConveyorDirection {
    Forward,
    Reverse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorLift {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub start_floor: i32,
    pub end_floor: i32,
    pub mark: u8, // Lift tier (1-6)
    pub direction: LiftDirection,
    pub height: f64,
    pub cost: f64,
    pub connection_points: Vec<crate::types::ConnectionPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LiftDirection {
    Up,
    Down,
}

// Pipeline Types

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipeSupport {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>,
    pub is_pump: Option<bool>,
    pub pump_direction: Option<PumpDirection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PumpDirection {
    Up,
    Down,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipeSegment {
    pub id: String,
    #[serde(rename = "type")]
    pub segment_type: PipeSegmentType,
    pub start_support: String, // Support ID
    pub end_support: String,
    pub control_points: Option<Vec<Point3D>>,
    pub length: f64,
    pub head_lift: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PipeSegmentType {
    Straight,
    Turn,
    Incline,
    Vertical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pipeline {
    pub id: String,
    pub segments: Vec<String>, // Segment IDs
    pub from_building_id: Option<String>,
    pub from_connection_point: Option<String>,
    pub to_building_id: Option<String>,
    pub to_connection_point: Option<String>,
    pub floor: i32,
    pub mark: u8, // Pipe tier (1-2)
    pub fluid_type: Option<FluidType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FluidType {
    Water,
    Oil,
    Fuel,
    Acid,
    Alumina,
    Nitrogen,
}

// Railway Types

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayNode {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>,
    pub snapped_segment: Option<String>,
    pub snapped_t: Option<f64>,
    #[serde(rename = "type")]
    pub node_type: Option<RailwayNodeType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RailwayNodeType {
    Straight,
    Curve,
}

// Re-export as NodeType for compatibility
pub use RailwayNodeType as NodeType;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwaySegment {
    pub id: String,
    #[serde(rename = "type")]
    pub segment_type: RailwaySegmentType,
    pub start_node: String, // Node ID
    pub end_node: String,
    pub start_point: Point3D,
    pub end_point: Point3D,
    pub control_points: Option<Vec<Point3D>>,
    pub length: f64,
    pub from_station: Option<String>,
    pub to_station: Option<String>,
    pub from_rail_point: Option<String>,
    pub to_rail_point: Option<String>,
    pub direction: Option<RailwaySegmentDirection>,
    pub show_arrows: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RailwaySegmentType {
    Straight,
    Curve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RailwaySegmentDirection {
    Forward,
    Reverse,
    Bidirectional,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Railway {
    pub id: String,
    pub segments: Vec<String>, // Segment IDs
    pub floor: i32,
    pub connected_buildings: Vec<String>, // Building IDs
}

// Truck Path Types

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TruckNode {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>,
    #[serde(rename = "type")]
    pub node_type: Option<TruckNodeType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TruckNodeType {
    Waypoint,
    Station,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TruckSegment {
    pub id: String,
    pub start_node: String,
    pub end_node: String,
    pub control_points: Option<Vec<Point3D>>,
    pub length: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TruckPath {
    pub id: String,
    pub segments: Vec<String>,
    pub floor: i32,
    pub is_loop: bool,
    pub connected_stations: Vec<String>, // Building IDs of truck stations
}