//! Predictive viewport cache for smooth panning
//! 
//! Caches viewport query results and predicts future viewport positions
//! for zero-latency panning experience.

use super::{ViewportBounds, SpatialQueryResult};
use std::collections::HashMap;
use std::time::{Instant, Duration};

/// Cache entry with expiration
#[derive(Clone)]
struct CacheEntry {
    objects: Vec<SpatialQueryResult>,
    created_at: Instant,
    access_count: u32,
}

/// Predictive viewport cache
pub struct ViewportCache {
    /// Main cache storage
    cache: HashMap<String, CacheEntry>,
    /// Cache hit/miss statistics
    hits: u64,
    misses: u64,
    /// Maximum cache size
    max_cache_size: usize,
    /// Cache expiration time
    cache_ttl: Duration,
    /// Prediction distance for prefetching
    prediction_distance: f64,
}

impl ViewportCache {
    /// Create new viewport cache
    pub fn new(prediction_distance: f64) -> Self {
        Self {
            cache: HashMap::new(),
            hits: 0,
            misses: 0,
            max_cache_size: 100,
            cache_ttl: Duration::from_secs(30),
            prediction_distance,
        }
    }
    
    /// Get cached objects for viewport bounds
    pub fn get_cached_objects(&mut self, bounds: &ViewportBounds) -> Option<Vec<SpatialQueryResult>> {
        let cache_key = self.viewport_cache_key(bounds);
        
        if let Some(entry) = self.cache.get_mut(&cache_key) {
            // Check if cache entry is still valid
            if entry.created_at.elapsed() < self.cache_ttl {
                entry.access_count += 1;
                self.hits += 1;
                return Some(entry.objects.clone());
            } else {
                // Remove expired entry
                self.cache.remove(&cache_key);
            }
        }
        
        self.misses += 1;
        None
    }
    
    /// Cache objects for viewport bounds
    pub fn cache_objects(&mut self, bounds: &ViewportBounds, objects: &[SpatialQueryResult]) {
        self.cleanup_cache();
        
        let cache_key = self.viewport_cache_key(bounds);
        let entry = CacheEntry {
            objects: objects.to_vec(),
            created_at: Instant::now(),
            access_count: 1,
        };
        
        self.cache.insert(cache_key, entry);
    }
    
    /// Update predictions based on viewport movement
    pub fn update_predictions(&mut self, current_bounds: &ViewportBounds) {
        // Simple prediction: cache adjacent viewport areas
        let prediction_offsets = [
            (-self.prediction_distance, 0.0),  // Left
            (self.prediction_distance, 0.0),   // Right
            (0.0, -self.prediction_distance),  // Up
            (0.0, self.prediction_distance),   // Down
        ];
        
        for (dx, dy) in prediction_offsets {
            let predicted_bounds = ViewportBounds::new(
                current_bounds.x + dx,
                current_bounds.y + dy,
                current_bounds.width,
                current_bounds.height,
                current_bounds.scale,
                current_bounds.floor,
            );
            
            // Only predict if not already cached
            let cache_key = self.viewport_cache_key(&predicted_bounds);
            if !self.cache.contains_key(&cache_key) {
                // Placeholder for prediction logic
                // In a real implementation, this would trigger background queries
            }
        }
    }
    
    /// Invalidate all cached objects
    pub fn invalidate_all(&mut self) {
        self.cache.clear();
    }
    
    /// Invalidate cache entries containing specific objects
    pub fn invalidate_by_ids(&mut self, object_ids: &[String]) {
        let mut keys_to_remove = Vec::new();
        
        for (key, entry) in &self.cache {
            for cached_object in &entry.objects {
                if object_ids.contains(&cached_object.id) {
                    keys_to_remove.push(key.clone());
                    break;
                }
            }
        }
        
        for key in keys_to_remove {
            self.cache.remove(&key);
        }
    }
    
    /// Get cache hit rate
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            self.hits as f64 / total as f64
        }
    }
    
    /// Get cache size
    pub fn size(&self) -> usize {
        self.cache.len()
    }
    
    /// Generate cache key for viewport bounds
    fn viewport_cache_key(&self, bounds: &ViewportBounds) -> String {
        // Round to grid for cache efficiency
        let grid_size = 50.0;
        let grid_x = (bounds.x / grid_size).round() * grid_size;
        let grid_y = (bounds.y / grid_size).round() * grid_size;
        let grid_scale = (bounds.scale * 100.0).round() / 100.0;
        
        format!("{}:{}:{}:{}:{}", grid_x, grid_y, bounds.width, bounds.height, grid_scale)
    }
    
    /// Clean up expired cache entries
    fn cleanup_cache(&mut self) {
        if self.cache.len() < self.max_cache_size {
            return;
        }
        
        let now = Instant::now();
        let mut expired_keys = Vec::new();
        
        // Remove expired entries
        for (key, entry) in &self.cache {
            if now.duration_since(entry.created_at) > self.cache_ttl {
                expired_keys.push(key.clone());
            }
        }
        
        for key in expired_keys {
            self.cache.remove(&key);
        }
        
        // If still too large, remove least accessed entries
        if self.cache.len() >= self.max_cache_size {
            let mut entries: Vec<(String, u32)> = self.cache
                .iter()
                .map(|(key, entry)| (key.clone(), entry.access_count))
                .collect();
            
            entries.sort_by_key(|(_, count)| *count);
            
            let remove_count = self.cache.len() - (self.max_cache_size * 3 / 4);
            for (key, _) in entries.into_iter().take(remove_count) {
                self.cache.remove(&key);
            }
        }
    }
}
