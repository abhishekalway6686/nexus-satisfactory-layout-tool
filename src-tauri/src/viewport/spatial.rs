//! Instant spatial query engine for hit testing and object lookups

use super::{SpatialObject, SpatialQueryResult, Point2D};
use crate::types::Point3D;
use rstar::RTree;
use std::collections::HashMap;

/// High-performance spatial query engine
pub struct SpatialQueryEngine {
    /// R-tree spatial index
    rtree: RTree<SpatialObject>,
    /// Object lookup by ID
    objects_by_id: HashMap<String, SpatialObject>,
    /// Cell size for spatial grid optimization
    #[allow(dead_code)]
    cell_size: f64,
}

impl SpatialQueryEngine {
    /// Create new spatial query engine
    pub fn new(cell_size: f64) -> Self {
        Self {
            rtree: RTree::new(),
            objects_by_id: HashMap::new(),
            cell_size,
        }
    }
    
    /// Add objects to spatial index
    pub fn add_objects(&mut self, objects: Vec<SpatialObject>) {
        for object in &objects {
            self.objects_by_id.insert(object.id.clone(), object.clone());
        }
        
        let all_objects: Vec<SpatialObject> = self.objects_by_id.values().cloned().collect();
        self.rtree = RTree::bulk_load(all_objects);
    }
    
    /// Remove objects from spatial index
    pub fn remove_objects(&mut self, object_ids: &[String]) {
        for id in object_ids {
            self.objects_by_id.remove(id);
        }
        
        let remaining_objects: Vec<SpatialObject> = self.objects_by_id.values().cloned().collect();
        self.rtree = RTree::bulk_load(remaining_objects);
    }
    
    /// Find objects near a point within radius
    pub fn find_objects_near_point(
        &self, 
        center: &Point3D, 
        radius: f64,
        floor: i32
    ) -> Vec<SpatialQueryResult> {
        let center_2d = Point2D::from_point3d(center);
        let search_envelope = rstar::AABB::from_corners(
            Point2D::new(center.x - radius, center.y - radius),
            Point2D::new(center.x + radius, center.y + radius),
        );
        
        self.rtree
            .locate_in_envelope_intersecting(&search_envelope)
            .filter(|obj| {
                (obj.floor == floor || obj.floor == -1) && 
                self.distance_to_object(&center_2d, obj) <= radius
            })
            .map(|obj| SpatialQueryResult {
                id: obj.id.clone(),
                object_type: obj.object_type.clone(),
                data: obj.data.clone(),
                distance: Some(self.distance_to_object(&center_2d, obj)),
            })
            .collect()
    }
    
    /// Find closest object to a point
    pub fn find_closest_object(&self, center: &Point3D, floor: i32) -> Option<SpatialQueryResult> {
        let center_2d = Point2D::from_point3d(center);
        
        let mut closest_distance = f64::INFINITY;
        let mut closest_object = None;
        
        for obj in self.rtree.iter() {
            if obj.floor == floor || obj.floor == -1 {
                let distance = self.distance_to_object(&center_2d, obj);
                if distance < closest_distance {
                    closest_distance = distance;
                    closest_object = Some(obj);
                }
            }
        }
        
        closest_object.map(|obj| SpatialQueryResult {
            id: obj.id.clone(),
            object_type: obj.object_type.clone(),
            data: obj.data.clone(),
            distance: Some(self.distance_to_object(&center_2d, obj)),
        })
    }
    
    /// Get snap points within radius (for drawing tools)
    pub fn get_snap_points(&self, center: &Point3D, radius: f64, floor: i32) -> Vec<Point3D> {
        let nearby_objects = self.find_objects_near_point(center, radius, floor);
        
        let mut snap_points = Vec::new();
        
        for obj in nearby_objects {
            match &obj.data {
                super::ObjectData::Point(point) => {
                    snap_points.push(*point);
                }
                super::ObjectData::Line { start, end } => {
                    snap_points.push(*start);
                    snap_points.push(*end);
                }
                super::ObjectData::Rectangle { min, max } => {
                    snap_points.push(*min);
                    snap_points.push(*max);
                    snap_points.push(Point3D::new(min.x, max.y, min.z));
                    snap_points.push(Point3D::new(max.x, min.y, max.z));
                }
                super::ObjectData::Curve { points } => {
                    snap_points.extend(points);
                }
            }
        }
        
        // Filter by distance and deduplicate
        snap_points.into_iter()
            .filter(|point| {
                let dx = point.x - center.x;
                let dy = point.y - center.y;
                (dx * dx + dy * dy).sqrt() <= radius
            })
            .collect()
    }
    
    /// Calculate distance from point to object bounds
    fn distance_to_object(&self, point: &Point2D, object: &SpatialObject) -> f64 {
        let bounds = &object.bounds;
        let closest_x = point.x.clamp(bounds.lower().x, bounds.upper().x);
        let closest_y = point.y.clamp(bounds.lower().y, bounds.upper().y);
        
        let dx = point.x - closest_x;
        let dy = point.y - closest_y;
        (dx * dx + dy * dy).sqrt()
    }
    
    /// Get object count
    pub fn object_count(&self) -> usize {
        self.objects_by_id.len()
    }
}
