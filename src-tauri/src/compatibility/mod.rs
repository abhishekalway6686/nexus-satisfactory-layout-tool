use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use crate::state::LayoutState;
use crate::types::*;
use crate::errors::AppError;

/// Save file version information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveFileVersion {
    pub format_version: u32,
    pub app_version: String,
    pub created_at: u64,
}

/// V1 (JavaScript) save file format - uses camelCase
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFileV1 {
    pub buildings: HashMap<String, BuildingV1>,
    pub conveyor_poles: HashMap<String, ConveyorPoleV1>,
    pub conveyor_segments: HashMap<String, ConveyorSegmentV1>,
    pub conveyor_belts: HashMap<String, ConveyorBeltV1>,
    pub pipe_supports: HashMap<String, PipeSupportV1>,
    pub pipe_segments: HashMap<String, PipeSegmentV1>,
    pub pipelines: HashMap<String, PipelineV1>,
    pub railway_nodes: HashMap<String, RailwayNodeV1>,
    pub railway_segments: HashMap<String, RailwaySegmentV1>,
    pub railways: HashMap<String, RailwayV1>,
    pub sticky_notes: HashMap<String, StickyNoteV1>,
}

/// V2 (Rust) save file format - uses snake_case with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveFileV2 {
    pub version: SaveFileVersion,
    pub layout: LayoutState,
    pub metadata: HashMap<String, Value>,
}

// V1 type definitions with camelCase
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildingV1 {
    pub id: String,
    #[serde(rename = "type")]
    pub building_type: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub rotation: u16,
    pub connection_points: Vec<ConnectionPointV1>,
    pub railway_points: Option<Vec<RailwayConnectionPointV1>>,
    pub text: Option<String>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub material: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionPointV1 {
    pub id: String,
    pub x: f64,
    pub y: f64,
    #[serde(rename = "type")]
    pub connection_type: String,
    pub side: String,
    pub is_fluid: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayConnectionPointV1 {
    pub id: String,
    pub x: f64,
    pub y: f64,
    #[serde(rename = "type")]
    pub connection_type: String,
    pub side: String,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorPoleV1 {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorSegmentV1 {
    pub id: String,
    #[serde(rename = "type")]
    pub segment_type: String,
    pub start_pole: String,
    pub end_pole: String,
    pub control_points: Option<Vec<Point3DV1>>,
    pub length: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConveyorBeltV1 {
    pub id: String,
    pub segments: Vec<String>,
    pub from_building_id: Option<String>,
    pub from_connection_point: Option<String>,
    pub to_building_id: Option<String>,
    pub to_connection_point: Option<String>,
    pub floor: i32,
    pub mark: u8,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point3DV1 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipeSupportV1 {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>,
    pub is_pump: Option<bool>,
    pub pump_direction: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipeSegmentV1 {
    pub id: String,
    #[serde(rename = "type")]
    pub segment_type: String,
    pub start_support: String,
    pub end_support: String,
    pub control_points: Option<Vec<Point3DV1>>,
    pub length: f64,
    pub head_lift: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineV1 {
    pub id: String,
    pub segments: Vec<String>,
    pub from_building_id: Option<String>,
    pub from_connection_point: Option<String>,
    pub to_building_id: Option<String>,
    pub to_connection_point: Option<String>,
    pub floor: i32,
    pub mark: u8,
    pub fluid_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayNodeV1 {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub is_anchor: Option<bool>,
    pub snapped_segment: Option<String>,
    pub snapped_t: Option<f64>,
    #[serde(rename = "type")]
    pub node_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwaySegmentV1 {
    pub id: String,
    #[serde(rename = "type")]
    pub segment_type: String,
    pub start_node: String,
    pub end_node: String,
    pub start_point: Point3DV1,
    pub end_point: Point3DV1,
    pub control_points: Option<Vec<Point3DV1>>,
    pub length: f64,
    pub from_station: Option<String>,
    pub to_station: Option<String>,
    pub from_rail_point: Option<String>,
    pub to_rail_point: Option<String>,
    pub direction: Option<String>,
    pub show_arrows: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RailwayV1 {
    pub id: String,
    pub segments: Vec<String>,
    pub floor: i32,
    pub stations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickyNoteV1 {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub floor: i32,
    pub text: String,
    pub width: f64,
    pub height: f64,
    pub color: Option<String>,
}

/// Save file format detector
pub fn detect_format(content: &str) -> Result<SaveFileFormat, AppError> {
    // Try to parse as JSON first
    if let Ok(value) = serde_json::from_str::<Value>(content) {
        if let Some(obj) = value.as_object() {
            // Check for V2 format (has version field)
            if obj.contains_key("version") && obj.contains_key("layout") {
                return Ok(SaveFileFormat::V2);
            }
            
            // Check for V1 format (has buildings field at root)
            if obj.contains_key("buildings") || obj.contains_key("conveyorBelts") {
                return Ok(SaveFileFormat::V1);
            }
        }
    }
    
    Err(AppError::ParseError("Unknown save file format".to_string()))
}

#[derive(Debug)]
pub enum SaveFileFormat {
    V1,
    V2,
}

/// Migration from V1 to V2
pub fn migrate_v1_to_v2(v1: SaveFileV1) -> Result<SaveFileV2, AppError> {
    let mut layout = LayoutState::default();
    
    // Migrate buildings
    for (id, building_v1) in v1.buildings {
        let building = Building {
            id: building_v1.id,
            building_type: building_v1.building_type,
            x: building_v1.x,
            y: building_v1.y,
            z: building_v1.z,
            floor: building_v1.floor,
            rotation: building_v1.rotation,
            connection_points: building_v1.connection_points.into_iter()
                .map(|cp| ConnectionPoint {
                    id: cp.id,
                    x: cp.x,
                    y: cp.y,
                    connection_type: match cp.connection_type.as_str() {
                        "input" => ConnectionType::Input,
                        "output" => ConnectionType::Output,
                        "bidirectional" => ConnectionType::Bidirectional,
                        _ => ConnectionType::Bidirectional,
                    },
                    side: match cp.side.as_str() {
                        "left" => ConnectionSide::Left,
                        "right" => ConnectionSide::Right,
                        "front" => ConnectionSide::Front,
                        "back" => ConnectionSide::Back,
                        _ => ConnectionSide::Front,
                    },
                    is_fluid: cp.is_fluid,
                })
                .collect(),
            railway_points: building_v1.railway_points.map(|points| 
                points.into_iter().map(|rp| RailwayConnectionPoint {
                    id: rp.id,
                    x: rp.x,
                    y: rp.y,
                    connection_type: "railway".to_string(),
                    side: match rp.side.as_str() {
                        "left" => ConnectionSide::Left,
                        "right" => ConnectionSide::Right,
                        "front" => ConnectionSide::Front,
                        "back" => ConnectionSide::Back,
                        _ => ConnectionSide::Front,
                    },
                    direction: match rp.direction.as_str() {
                        "in" => RailwayDirection::In,
                        "out" => RailwayDirection::Out,
                        "bidirectional" => RailwayDirection::Bidirectional,
                        _ => RailwayDirection::Bidirectional,
                    },
                })
                .collect()
            ),
            text: building_v1.text,
            width: building_v1.width,
            height: building_v1.height,
            material: building_v1.material,
        };
        layout.buildings.insert(id, building);
    }
    
    // Migrate conveyor system
    for (id, pole_v1) in v1.conveyor_poles {
        let pole = ConveyorPole {
            id: pole_v1.id,
            x: pole_v1.x,
            y: pole_v1.y,
            z: pole_v1.z,
            floor: pole_v1.floor,
            is_anchor: pole_v1.is_anchor,
        };
        layout.conveyor_poles.insert(id, pole);
    }
    
    for (id, segment_v1) in v1.conveyor_segments {
        let segment = ConveyorSegment {
            id: segment_v1.id,
            segment_type: match segment_v1.segment_type.as_str() {
                "straight" => SegmentType::Straight,
                "turn" => SegmentType::Turn,
                "incline" => SegmentType::Incline,
                _ => SegmentType::Straight,
            },
            start_pole: segment_v1.start_pole,
            end_pole: segment_v1.end_pole,
            control_points: segment_v1.control_points.map(|points|
                points.into_iter().map(|p| Point3D::new(p.x, p.y, p.z)).collect()
            ),
            length: segment_v1.length,
        };
        layout.conveyor_segments.insert(id, segment);
    }
    
    for (id, belt_v1) in v1.conveyor_belts {
        let belt = ConveyorBelt {
            id: belt_v1.id,
            segments: belt_v1.segments,
            from_building_id: belt_v1.from_building_id,
            from_connection_point: belt_v1.from_connection_point,
            to_building_id: belt_v1.to_building_id,
            to_connection_point: belt_v1.to_connection_point,
            floor: belt_v1.floor,
            mark: belt_v1.mark,
            direction: match belt_v1.direction.as_str() {
                "forward" => Direction::Forward,
                "reverse" => Direction::Reverse,
                _ => Direction::Forward,
            },
        };
        layout.conveyor_belts.insert(id, belt);
    }
    
    // Migrate pipe system
    for (id, support_v1) in v1.pipe_supports {
        let support = PipeSupport {
            id: support_v1.id,
            x: support_v1.x,
            y: support_v1.y,
            z: support_v1.z,
            floor: support_v1.floor,
            is_anchor: support_v1.is_anchor,
            is_pump: support_v1.is_pump,
            pump_direction: support_v1.pump_direction.map(|dir| match dir.as_str() {
                "up" => PumpDirection::Up,
                "down" => PumpDirection::Down,
                _ => PumpDirection::Up,
            }),
        };
        layout.pipe_supports.insert(id, support);
    }
    
    for (id, segment_v1) in v1.pipe_segments {
        let segment = PipeSegment {
            id: segment_v1.id,
            segment_type: match segment_v1.segment_type.as_str() {
                "straight" => PipeSegmentType::Straight,
                "turn" => PipeSegmentType::Turn,
                "incline" => PipeSegmentType::Incline,
                "vertical" => PipeSegmentType::Vertical,
                _ => PipeSegmentType::Straight,
            },
            start_support: segment_v1.start_support,
            end_support: segment_v1.end_support,
            control_points: segment_v1.control_points.map(|points|
                points.into_iter().map(|p| Point3D::new(p.x, p.y, p.z)).collect()
            ),
            length: segment_v1.length,
            head_lift: segment_v1.head_lift,
        };
        layout.pipe_segments.insert(id, segment);
    }
    
    for (id, pipeline_v1) in v1.pipelines {
        let pipeline = Pipeline {
            id: pipeline_v1.id,
            segments: pipeline_v1.segments,
            from_building_id: pipeline_v1.from_building_id,
            from_connection_point: pipeline_v1.from_connection_point,
            to_building_id: pipeline_v1.to_building_id,
            to_connection_point: pipeline_v1.to_connection_point,
            floor: pipeline_v1.floor,
            mark: pipeline_v1.mark,
            fluid_type: pipeline_v1.fluid_type.map(|ft| match ft.as_str() {
                "water" => FluidType::Water,
                "oil" => FluidType::Oil,
                "fuel" => FluidType::Fuel,
                "acid" => FluidType::Acid,
                "alumina" => FluidType::Alumina,
                "nitrogen" => FluidType::Nitrogen,
                _ => FluidType::Water,
            }),
        };
        layout.pipelines.insert(id, pipeline);
    }
    
    // Migrate railway system
    for (id, node_v1) in v1.railway_nodes {
        let node = RailwayNode {
            id: node_v1.id,
            x: node_v1.x,
            y: node_v1.y,
            z: node_v1.z,
            floor: node_v1.floor,
            is_anchor: node_v1.is_anchor,
            snapped_segment: node_v1.snapped_segment,
            snapped_t: node_v1.snapped_t,
            node_type: node_v1.node_type.map(|nt| match nt.as_str() {
                "straight" => RailwayNodeType::Straight,
                "curve" => RailwayNodeType::Curve,
                _ => RailwayNodeType::Straight,
            }),
        };
        layout.railway_nodes.insert(id, node);
    }
    
    for (id, segment_v1) in v1.railway_segments {
        let segment = RailwaySegment {
            id: segment_v1.id,
            segment_type: match segment_v1.segment_type.as_str() {
                "straight" => RailwaySegmentType::Straight,
                "curve" => RailwaySegmentType::Curve,
                _ => RailwaySegmentType::Straight,
            },
            start_node: segment_v1.start_node,
            end_node: segment_v1.end_node,
            start_point: Point3D::new(segment_v1.start_point.x, segment_v1.start_point.y, segment_v1.start_point.z),
            end_point: Point3D::new(segment_v1.end_point.x, segment_v1.end_point.y, segment_v1.end_point.z),
            control_points: segment_v1.control_points.map(|points|
                points.into_iter().map(|p| Point3D::new(p.x, p.y, p.z)).collect()
            ),
            length: segment_v1.length,
            from_station: segment_v1.from_station,
            to_station: segment_v1.to_station,
            from_rail_point: segment_v1.from_rail_point,
            to_rail_point: segment_v1.to_rail_point,
            direction: segment_v1.direction.map(|dir| match dir.as_str() {
                "forward" => RailwaySegmentDirection::Forward,
                "reverse" => RailwaySegmentDirection::Reverse,
                "bidirectional" => RailwaySegmentDirection::Bidirectional,
                _ => RailwaySegmentDirection::Bidirectional,
            }),
            show_arrows: segment_v1.show_arrows,
        };
        layout.railway_segments.insert(id, segment);
    }
    
    for (id, railway_v1) in v1.railways {
        let railway = Railway {
            id: railway_v1.id,
            segments: railway_v1.segments,
            floor: railway_v1.floor,
            connected_buildings: railway_v1.stations,
        };
        layout.railways.insert(id, railway);
    }
    
    // Migrate sticky notes
    for (id, note_v1) in v1.sticky_notes {
        let note = StickyNote {
            id: note_v1.id,
            x: note_v1.x,
            y: note_v1.y,
            z: note_v1.z,
            floor: note_v1.floor,
            text: note_v1.text,
            width: note_v1.width,
            height: note_v1.height,
            color: note_v1.color,
        };
        layout.sticky_notes.insert(id, note);
    }
    
    // Create V2 save file
    let save_file_v2 = SaveFileV2 {
        version: SaveFileVersion {
            format_version: 2,
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            created_at: chrono::Utc::now().timestamp() as u64,
        },
        layout,
        metadata: HashMap::new(),
    };
    
    Ok(save_file_v2)
}

/// Export V2 to V1 format for backward compatibility
pub fn export_v2_to_v1(v2: &SaveFileV2) -> Result<SaveFileV1, AppError> {
    let layout = &v2.layout;
    let mut v1 = SaveFileV1 {
        buildings: HashMap::new(),
        conveyor_poles: HashMap::new(),
        conveyor_segments: HashMap::new(),
        conveyor_belts: HashMap::new(),
        pipe_supports: HashMap::new(),
        pipe_segments: HashMap::new(),
        pipelines: HashMap::new(),
        railway_nodes: HashMap::new(),
        railway_segments: HashMap::new(),
        railways: HashMap::new(),
        sticky_notes: HashMap::new(),
    };
    
    // Convert buildings
    for (id, building) in &layout.buildings {
        let building_v1 = BuildingV1 {
            id: building.id.clone(),
            building_type: building.building_type.clone(),
            x: building.x,
            y: building.y,
            z: building.z,
            floor: building.floor,
            rotation: building.rotation,
            connection_points: building.connection_points.iter()
                .map(|cp| ConnectionPointV1 {
                    id: cp.id.clone(),
                    x: cp.x,
                    y: cp.y,
                    connection_type: match cp.connection_type {
                        ConnectionType::Input => "input".to_string(),
                        ConnectionType::Output => "output".to_string(),
                        ConnectionType::Bidirectional => "bidirectional".to_string(),
                    },
                    side: match cp.side {
                        Side::Left => "left".to_string(),
                        Side::Right => "right".to_string(),
                        Side::Front => "front".to_string(),
                        Side::Back => "back".to_string(),
                    },
                    is_fluid: cp.is_fluid,
                })
                .collect(),
            railway_points: building.railway_points.as_ref().map(|points|
                points.iter().map(|rp| RailwayConnectionPointV1 {
                    id: rp.id.clone(),
                    x: rp.x,
                    y: rp.y,
                    connection_type: "railway".to_string(),
                    side: match rp.side {
                        Side::Left => "left".to_string(),
                        Side::Right => "right".to_string(),
                        Side::Front => "front".to_string(),
                        Side::Back => "back".to_string(),
                    },
                    direction: match rp.direction {
                        RailwayDirection::In => "in".to_string(),
                        RailwayDirection::Out => "out".to_string(),
                        RailwayDirection::Bidirectional => "bidirectional".to_string(),
                    },
                })
                .collect()
            ),
            text: building.text.clone(),
            width: building.width,
            height: building.height,
            material: building.material.clone(),
        };
        v1.buildings.insert(id.clone(), building_v1);
    }
    
    // Convert conveyor system
    for (id, pole) in &layout.conveyor_poles {
        let pole_v1 = ConveyorPoleV1 {
            id: pole.id.clone(),
            x: pole.x,
            y: pole.y,
            z: pole.z,
            floor: pole.floor,
            is_anchor: pole.is_anchor,
        };
        v1.conveyor_poles.insert(id.clone(), pole_v1);
    }
    
    for (id, segment) in &layout.conveyor_segments {
        let segment_v1 = ConveyorSegmentV1 {
            id: segment.id.clone(),
            segment_type: match segment.segment_type {
                SegmentType::Straight => "straight".to_string(),
                SegmentType::Turn => "turn".to_string(),
                SegmentType::Incline => "incline".to_string(),
            },
            start_pole: segment.start_pole.clone(),
            end_pole: segment.end_pole.clone(),
            control_points: segment.control_points.as_ref().map(|points|
                points.iter().map(|p| Point3DV1 { x: p.x, y: p.y, z: p.z }).collect()
            ),
            length: segment.length,
        };
        v1.conveyor_segments.insert(id.clone(), segment_v1);
    }
    
    for (id, belt) in &layout.conveyor_belts {
        let belt_v1 = ConveyorBeltV1 {
            id: belt.id.clone(),
            segments: belt.segments.clone(),
            from_building_id: belt.from_building_id.clone(),
            from_connection_point: belt.from_connection_point.clone(),
            to_building_id: belt.to_building_id.clone(),
            to_connection_point: belt.to_connection_point.clone(),
            floor: belt.floor,
            mark: belt.mark,
            direction: match belt.direction {
                Direction::Forward => "forward".to_string(),
                Direction::Reverse => "reverse".to_string(),
            },
        };
        v1.conveyor_belts.insert(id.clone(), belt_v1);
    }
    
    // Convert pipe system
    for (id, support) in &layout.pipe_supports {
        let support_v1 = PipeSupportV1 {
            id: support.id.clone(),
            x: support.x,
            y: support.y,
            z: support.z,
            floor: support.floor,
            is_anchor: support.is_anchor,
            is_pump: support.is_pump,
            pump_direction: support.pump_direction.as_ref().map(|dir| match dir {
                PumpDirection::Up => "up".to_string(),
                PumpDirection::Down => "down".to_string(),
            }),
        };
        v1.pipe_supports.insert(id.clone(), support_v1);
    }
    
    for (id, segment) in &layout.pipe_segments {
        let segment_v1 = PipeSegmentV1 {
            id: segment.id.clone(),
            segment_type: match segment.segment_type {
                PipeSegmentType::Straight => "straight".to_string(),
                PipeSegmentType::Turn => "turn".to_string(),
                PipeSegmentType::Incline => "incline".to_string(),
                PipeSegmentType::Vertical => "vertical".to_string(),
            },
            start_support: segment.start_support.clone(),
            end_support: segment.end_support.clone(),
            control_points: segment.control_points.as_ref().map(|points|
                points.iter().map(|p| Point3DV1 { x: p.x, y: p.y, z: p.z }).collect()
            ),
            length: segment.length,
            head_lift: segment.head_lift,
        };
        v1.pipe_segments.insert(id.clone(), segment_v1);
    }
    
    for (id, pipeline) in &layout.pipelines {
        let pipeline_v1 = PipelineV1 {
            id: pipeline.id.clone(),
            segments: pipeline.segments.clone(),
            from_building_id: pipeline.from_building_id.clone(),
            from_connection_point: pipeline.from_connection_point.clone(),
            to_building_id: pipeline.to_building_id.clone(),
            to_connection_point: pipeline.to_connection_point.clone(),
            floor: pipeline.floor,
            mark: pipeline.mark,
            fluid_type: pipeline.fluid_type.as_ref().map(|ft| match ft {
                FluidType::Water => "water".to_string(),
                FluidType::Oil => "oil".to_string(),
                FluidType::Fuel => "fuel".to_string(),
                FluidType::Acid => "acid".to_string(),
                FluidType::Alumina => "alumina".to_string(),
                FluidType::Nitrogen => "nitrogen".to_string(),
            }),
        };
        v1.pipelines.insert(id.clone(), pipeline_v1);
    }
    
    // Convert railway system
    for (id, node) in &layout.railway_nodes {
        let node_v1 = RailwayNodeV1 {
            id: node.id.clone(),
            x: node.x,
            y: node.y,
            z: node.z,
            floor: node.floor,
            is_anchor: node.is_anchor,
            snapped_segment: node.snapped_segment.clone(),
            snapped_t: node.snapped_t,
            node_type: node.node_type.as_ref().map(|nt| match nt {
                RailwayNodeType::Straight => "straight".to_string(),
                RailwayNodeType::Curve => "curve".to_string(),
            }),
        };
        v1.railway_nodes.insert(id.clone(), node_v1);
    }
    
    for (id, segment) in &layout.railway_segments {
        let segment_v1 = RailwaySegmentV1 {
            id: segment.id.clone(),
            segment_type: match segment.segment_type {
                RailwaySegmentType::Straight => "straight".to_string(),
                RailwaySegmentType::Curve => "curve".to_string(),
            },
            start_node: segment.start_node.clone(),
            end_node: segment.end_node.clone(),
            start_point: Point3DV1 {
                x: segment.start_point.x,
                y: segment.start_point.y,
                z: segment.start_point.z,
            },
            end_point: Point3DV1 {
                x: segment.end_point.x,
                y: segment.end_point.y,
                z: segment.end_point.z,
            },
            control_points: segment.control_points.as_ref().map(|points|
                points.iter().map(|p| Point3DV1 { x: p.x, y: p.y, z: p.z }).collect()
            ),
            length: segment.length,
            from_station: segment.from_station.clone(),
            to_station: segment.to_station.clone(),
            from_rail_point: segment.from_rail_point.clone(),
            to_rail_point: segment.to_rail_point.clone(),
            direction: segment.direction.as_ref().map(|dir| match dir {
                RailwaySegmentDirection::Forward => "forward".to_string(),
                RailwaySegmentDirection::Reverse => "reverse".to_string(),
                RailwaySegmentDirection::Bidirectional => "bidirectional".to_string(),
            }),
            show_arrows: segment.show_arrows,
        };
        v1.railway_segments.insert(id.clone(), segment_v1);
    }
    
    for (id, railway) in &layout.railways {
        let railway_v1 = RailwayV1 {
            id: railway.id.clone(),
            segments: railway.segments.clone(),
            floor: railway.floor,
            stations: railway.connected_buildings.clone(),
        };
        v1.railways.insert(id.clone(), railway_v1);
    }
    
    // Convert sticky notes
    for (id, note) in &layout.sticky_notes {
        let note_v1 = StickyNoteV1 {
            id: note.id.clone(),
            x: note.x,
            y: note.y,
            z: note.z,
            floor: note.floor,
            text: note.text.clone(),
            width: note.width,
            height: note.height,
            color: note.color.clone(),
        };
        v1.sticky_notes.insert(id.clone(), note_v1);
    }
    
    Ok(v1)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_format_detection() {
        let v1_json = r#"{"buildings": {}, "conveyorBelts": {}}"#;
        assert!(matches!(detect_format(v1_json).unwrap(), SaveFileFormat::V1));
        
        let v2_json = r#"{"version": {"format_version": 2}, "layout": {}}"#;
        assert!(matches!(detect_format(v2_json).unwrap(), SaveFileFormat::V2));
        
        let invalid_json = r#"{"unknown": "format"}"#;
        assert!(detect_format(invalid_json).is_err());
    }
}