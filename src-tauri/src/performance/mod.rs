use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceStats {
    pub avg_ms: u64,
    pub min_ms: u64,
    pub max_ms: u64,
    pub count: usize,
    pub total_ms: u64,
}

#[derive(Debug)]
pub struct PerformanceTracker {
    operations: HashMap<String, Vec<u64>>,
}

impl PerformanceTracker {
    pub fn new() -> Self {
        Self {
            operations: HashMap::new(),
        }
    }
    
    /// Time an operation and return its result along with the duration
    pub fn time_operation<F, R>(&mut self, operation_name: &str, operation: F) -> (R, u64)
    where
        F: FnOnce() -> R,
    {
        let start = Instant::now();
        let result = operation();
        let duration_ms = start.elapsed().as_millis() as u64;
        
        self.operations
            .entry(operation_name.to_string())
            .or_insert_with(Vec::new)
            .push(duration_ms);
        
        (result, duration_ms)
    }
    
    /// Record a manual timing
    pub fn record_timing(&mut self, operation_name: &str, duration_ms: u64) {
        self.operations
            .entry(operation_name.to_string())
            .or_insert_with(Vec::new)
            .push(duration_ms);
    }
    
    /// Get performance statistics for all operations
    pub fn get_performance_stats(&self) -> HashMap<String, PerformanceStats> {
        self.operations
            .iter()
            .map(|(name, times)| {
                let total_ms: u64 = times.iter().sum();
                let avg_ms = if times.is_empty() { 0 } else { total_ms / times.len() as u64 };
                let min_ms = times.iter().min().copied().unwrap_or(0);
                let max_ms = times.iter().max().copied().unwrap_or(0);
                
                (
                    name.clone(),
                    PerformanceStats {
                        avg_ms,
                        min_ms,
                        max_ms,
                        count: times.len(),
                        total_ms,
                    },
                )
            })
            .collect()
    }
    
    /// Clear all recorded performance data
    pub fn clear(&mut self) {
        self.operations.clear();
    }
    
    /// Clear performance data for a specific operation
    pub fn clear_operation(&mut self, operation_name: &str) {
        self.operations.remove(operation_name);
    }
}

impl Default for PerformanceTracker {
    fn default() -> Self {
        Self::new()
    }
}