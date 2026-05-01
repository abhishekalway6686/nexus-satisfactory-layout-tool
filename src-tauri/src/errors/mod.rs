// Allow dead code - Result type is used in other build configurations
#![allow(dead_code)]

use thiserror::Error;
use serde::{Serialize, Deserialize};

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Operation error: {0}")]
    OperationError(String),
    
    #[error("IO error: {0}")]
    IoError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Resource conflict: {0}")]
    ResourceConflict(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Internal error: {0}")]
    InternalError(String),
    
    #[error("Parse error: {0}")]
    ParseError(String),
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::IoError(error.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        AppError::SerializationError(error.to_string())
    }
}

impl From<tokio::task::JoinError> for AppError {
    fn from(error: tokio::task::JoinError) -> Self {
        AppError::InternalError(error.to_string())
    }
}

// Convert AppError to a Tauri-compatible error
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;