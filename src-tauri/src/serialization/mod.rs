// Serialization module for handling different file formats
// Currently uses serde_json directly in commands
// This module can be expanded for custom serialization formats

pub use serde_json;

// Future expansion:
// - Binary format for faster loading
// - Compressed format for smaller file sizes
// - Export to game-compatible formats
// - Import from third-party tools