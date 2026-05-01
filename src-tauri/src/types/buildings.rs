// Allow dead code - library functions for different build targets
#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use crate::types::{Point3D, BoundingBox3D};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Building {
    pub id: String,
    #[serde(rename = "type")]
    pub building_type: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub rotation: u16, // 0, 90, 180, 270
    pub connection_points: Vec<ConnectionPoint>,
    pub railway_points: Option<Vec<RailwayConnectionPoint>>,
    pub text: Option<String>, // For sticky notes
    pub width: Option<f64>, // For resizable sticky notes
    pub height: Option<f64>, // For resizable sticky notes
    pub material: Option<String>, // For foundation materials
}

impl Building {
    pub fn new(id: String, building_type: String, x: f64, y: f64, floor: i32) -> Self {
        Self {
            id,
            building_type,
            x,
            y,
            z: floor as f64 * 4.0,
            floor,
            rotation: 0,
            connection_points: vec![],
            railway_points: None,
            text: None,
            width: None,
            height: None,
            material: None,
        }
    }
    
    pub fn calculate_bounds(&self) -> BoundingBox3D {
        // Default building size - in real implementation would look up from building definitions
        let default_width = self.width.unwrap_or(8.0);
        let default_height = self.height.unwrap_or(8.0);
        let default_depth = 8.0;
        
        BoundingBox3D::new(
            Point3D::new(self.x, self.y, self.z),
            Point3D::new(
                self.x + default_width,
                self.y + default_height,
                self.z + default_depth,
            ),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionPoint {
    pub id: String,
    pub x: f64, // Relative to building origin
    pub y: f64,
    #[serde(rename = "type")]
    pub connection_type: ConnectionType,
    pub side: ConnectionSide,
    pub is_fluid: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionType {
    Input,
    Output,
    Bidirectional,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionSide {
    Left,
    Right,
    Front,
    Back,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RailwayConnectionPoint {
    pub id: String,
    pub x: f64, // Relative to building origin
    pub y: f64,
    #[serde(rename = "type")]
    pub connection_type: String, // "railway"
    pub side: ConnectionSide,
    pub direction: RailwayDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RailwayDirection {
    In,
    Out,
    Bidirectional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickyNote {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub width: f64,
    pub height: f64,
    pub text: String,
    pub color: Option<String>,
}

impl StickyNote {
    pub fn calculate_bounds(&self) -> BoundingBox3D {
        BoundingBox3D::new(
            Point3D::new(self.x, self.y, self.z),
            Point3D::new(
                self.x + self.width,
                self.y + self.height,
                self.z + 0.1, // Sticky notes are flat
            ),
        )
    }
}