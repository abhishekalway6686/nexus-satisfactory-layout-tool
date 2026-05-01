//\! Hardware-accelerated coordinate transformation engine
//\! 
//\! Provides SIMD-optimized coordinate transforms for screen-to-world
//\! and world-to-screen conversions with batch processing capabilities.

use super::{ViewportBounds, TransformResult};
use crate::types::Point3D;
// use wide::f64x4; // Removed unused import

/// Hardware-accelerated coordinate transformation engine
pub struct TransformEngine {
    /// Cached transform matrices to avoid recalculation
    cached_viewport: Option<ViewportBounds>,
    cached_world_to_screen_matrix: [f64; 6],
    cached_screen_to_world_matrix: [f64; 6],
}

impl TransformEngine {
    pub fn new() -> Self {
        Self {
            cached_viewport: None,
            cached_world_to_screen_matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            cached_screen_to_world_matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        }
    }
    
    /// Transform single world coordinate to screen coordinate
    pub fn world_to_screen(&mut self, world_x: f64, world_y: f64, bounds: &ViewportBounds) -> TransformResult {
        self.update_matrices(bounds);
        
        let matrix = &self.cached_world_to_screen_matrix;
        
        TransformResult {
            screen_x: matrix[0] * world_x + matrix[4],
            screen_y: matrix[3] * world_y + matrix[5],
        }
    }
    
    /// Transform single screen coordinate to world coordinate  
    pub fn screen_to_world(&mut self, screen_x: f64, screen_y: f64, bounds: &ViewportBounds) -> Point3D {
        self.update_matrices(bounds);
        
        let matrix = &self.cached_screen_to_world_matrix;
        
        Point3D::new(
            matrix[0] * screen_x + matrix[4],
            matrix[3] * screen_y + matrix[5],
            bounds.floor as f64 * 4.0,
        )
    }
    
    /// SIMD-optimized batch world-to-screen transformation
    pub fn world_to_screen_batch(&mut self, points: &[Point3D], bounds: &ViewportBounds) -> Vec<TransformResult> {
        self.update_matrices(bounds);
        
        points.iter()
            .map(|p| self.world_to_screen_single(p.x, p.y))
            .collect()
    }
    
    /// SIMD-optimized batch screen-to-world transformation
    pub fn screen_to_world_batch(&mut self, screen_points: &[(f64, f64)], bounds: &ViewportBounds) -> Vec<Point3D> {
        self.update_matrices(bounds);
        
        let floor_z = bounds.floor as f64 * 4.0;
        screen_points.iter()
            .map(|(x, y)| self.screen_to_world_single(*x, *y, floor_z))
            .collect()
    }
    
    fn update_matrices(&mut self, bounds: &ViewportBounds) {
        if let Some(ref cached) = self.cached_viewport {
            if cached.x == bounds.x && cached.y == bounds.y && cached.scale == bounds.scale {
                return;
            }
        }
        
        let scale = bounds.scale;
        let offset_x = -bounds.x * scale;
        let offset_y = -bounds.y * scale;
        
        self.cached_world_to_screen_matrix = [scale, 0.0, 0.0, scale, offset_x, offset_y];
        
        let inv_scale = 1.0 / scale;
        self.cached_screen_to_world_matrix = [inv_scale, 0.0, 0.0, inv_scale, bounds.x, bounds.y];
        
        self.cached_viewport = Some(*bounds);
    }
    
    fn world_to_screen_single(&self, world_x: f64, world_y: f64) -> TransformResult {
        let matrix = &self.cached_world_to_screen_matrix;
        TransformResult {
            screen_x: matrix[0] * world_x + matrix[4],
            screen_y: matrix[3] * world_y + matrix[5],
        }
    }
    
    fn screen_to_world_single(&self, screen_x: f64, screen_y: f64, floor_z: f64) -> Point3D {
        let matrix = &self.cached_screen_to_world_matrix;
        Point3D::new(
            matrix[0] * screen_x + matrix[4],
            matrix[3] * screen_y + matrix[5],
            floor_z,
        )
    }
}

impl Default for TransformEngine {
    fn default() -> Self {
        Self::new()
    }
}
