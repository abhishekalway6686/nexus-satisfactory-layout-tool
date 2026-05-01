// Save file compatibility utilities for handling different file formats

interface SaveFileV1 {
  buildings?: Record<string, any>;
  conveyorPoles?: Record<string, any>;
  conveyorSegments?: Record<string, any>;
  conveyorBelts?: Record<string, any>;
  pipeSupports?: Record<string, any>;
  pipeSegments?: Record<string, any>;
  pipelines?: Record<string, any>;
  railwayNodes?: Record<string, any>;
  railwaySegments?: Record<string, any>;
  railways?: Record<string, any>;
  stickyNotes?: Record<string, any>;
  truckPaths?: Record<string, any>;
  foundations?: Record<string, any>;
  wallSegments?: Record<string, any>;
  railingSegments?: Record<string, any>;
  currentFloor?: number;
}

// SaveFileV2 interface removed - not currently used

export enum SaveFileFormat {
  V1 = 'v1',
  V2 = 'v2',
  Unknown = 'unknown'
}

/**
 * Detects the format of a save file
 */
export function detectSaveFileFormat(data: any): SaveFileFormat {
  if (!data || typeof data !== 'object') {
    return SaveFileFormat.Unknown;
  }

  // Check for V2 format (has version and layout fields)
  if (data.version && data.layout) {
    return SaveFileFormat.V2;
  }

  // Check for V1 format (has buildings or other top-level fields)
  if (data.buildings || data.conveyorBelts || data.pipelines || data.railways) {
    return SaveFileFormat.V1;
  }

  return SaveFileFormat.Unknown;
}

/**
 * Validates a save file structure
 */
export function validateSaveFile(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid save file: not an object');
    return { valid: false, errors };
  }

  const format = detectSaveFileFormat(data);
  
  if (format === SaveFileFormat.Unknown) {
    errors.push('Unknown save file format');
    return { valid: false, errors };
  }

  // For V1 format, check basic structure
  if (format === SaveFileFormat.V1) {
    // At least one data category should exist
    const hasData = data.buildings || data.conveyorBelts || 
                   data.pipelines || data.railways || data.stickyNotes;
    if (!hasData) {
      errors.push('Save file contains no data');
    }
  }

  // For V2 format, validate version info
  if (format === SaveFileFormat.V2) {
    if (!data.version || typeof data.version.format_version !== 'number') {
      errors.push('Invalid version information');
    }
    if (!data.layout) {
      errors.push('Missing layout data');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Migrates a V1 save file to the current format expected by the store
 * The store still uses V1 format, so this is mostly validation
 */
export function migrateSaveFile(data: any): SaveFileV1 {
  const format = detectSaveFileFormat(data);

  if (format === SaveFileFormat.V2) {
    // Extract layout from V2 format
    return data.layout;
  }

  if (format === SaveFileFormat.V1) {
    // Already in the correct format
    return data;
  }

  // Return empty layout for unknown formats
  return {
    buildings: {},
    conveyorPoles: {},
    conveyorSegments: {},
    conveyorBelts: {},
    pipeSupports: {},
    pipeSegments: {},
    pipelines: {},
    railwayNodes: {},
    railwaySegments: {},
    railways: {},
    stickyNotes: {}
  };
}

/**
 * Creates a backup of the current state before migration
 */
export function createBackup(data: any): string {
  const backup = {
    timestamp: Date.now(),
    original_format: detectSaveFileFormat(data),
    data: data
  };
  
  return JSON.stringify(backup, null, 2);
}

/**
 * Safely loads a save file with error handling and migration
 */
export async function loadSaveFileWithMigration(
  fileContent: string,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; data?: SaveFileV1; error?: string }> {
  try {
    onProgress?.('Parsing save file...');
    const parsed = JSON.parse(fileContent);

    onProgress?.('Detecting file format...');
    const format = detectSaveFileFormat(parsed);
    
    if (format === SaveFileFormat.Unknown) {
      return { success: false, error: 'Unknown save file format' };
    }

    onProgress?.(`Detected format: ${format}`);
    
    onProgress?.('Validating save file...');
    const validation = validateSaveFile(parsed);
    
    if (!validation.valid) {
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      };
    }

    onProgress?.('Migrating to current format...');
    const migrated = migrateSaveFile(parsed);

    onProgress?.('Migration complete!');
    return { success: true, data: migrated };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Performance metrics for large file handling
 */
export function measureLoadPerformance(fileSize: number, loadTime: number): {
  sizeInMB: number;
  loadTimeInSeconds: number;
  throughputMBps: number;
  meetsRequirements: boolean;
} {
  const sizeInMB = fileSize / (1024 * 1024);
  const loadTimeInSeconds = loadTime / 1000;
  const throughputMBps = sizeInMB / loadTimeInSeconds;
  const meetsRequirements = loadTimeInSeconds < 2; // Must load in < 2 seconds

  return {
    sizeInMB,
    loadTimeInSeconds,
    throughputMBps,
    meetsRequirements
  };
}