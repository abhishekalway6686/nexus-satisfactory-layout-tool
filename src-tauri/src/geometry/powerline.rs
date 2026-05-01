//! Powerline hanging curve mathematics and electrical network validation

use crate::types::{
    Point3D, PowerlineSegment, PowerConnectionPoint,
    PowerConnectionType, PowerVoltageLevel, PowerlineValidationResult
};
use super::{distance_3d, LineSegment, find_line_intersection_2d};
