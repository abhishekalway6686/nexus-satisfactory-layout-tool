// Allow unused imports - these are used by different build configurations
#![allow(unused_imports)]

pub mod geometry;
pub mod buildings;
pub mod infrastructure;

// Re-export all types for easier access
pub use geometry::{
    Point3D, BoundingBox3D,
};
pub use buildings::{
    Building, ConnectionPoint, ConnectionType, ConnectionSide,
    RailwayConnectionPoint, RailwayDirection, StickyNote
};

// Alias for compatibility
pub use ConnectionSide as Side;
pub use infrastructure::ConveyorDirection as Direction;

pub use infrastructure::{
    // Conveyor types
    ConveyorPole, ConveyorSegment, ConveyorBelt,
    ConveyorDirection, SegmentType,
    // Pipeline types
    PipeSupport, PipeSegment, Pipeline, PumpDirection, PipeSegmentType, FluidType,
    // Railway types
    RailwayNode, RailwaySegment, Railway, RailwayNodeType, RailwaySegmentType, RailwaySegmentDirection,
};
