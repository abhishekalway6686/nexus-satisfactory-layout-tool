// Format conversion utilities for save files

import { saveAs } from 'file-saver';
import { 
  detectSaveFileFormat, 
  migrateSaveFile, 
  SaveFileFormat 
} from './saveFileCompatibility';

export interface ConversionOptions {
  compress?: boolean;
  prettify?: boolean;
  includeMetadata?: boolean;
}

/**
 * Converts a save file between formats
 */
export async function convertSaveFile(
  inputContent: string,
  targetFormat: 'v1' | 'v2',
  options: ConversionOptions = {}
): Promise<string> {
  const parsed = JSON.parse(inputContent);
  const currentFormat = detectSaveFileFormat(parsed);

  if (targetFormat === 'v1') {
    // Convert to V1 format
    let v1Data;
    
    if (currentFormat === SaveFileFormat.V2) {
      // Extract layout from V2
      v1Data = parsed.layout;
    } else if (currentFormat === SaveFileFormat.V1) {
      // Already V1
      v1Data = parsed;
    } else {
      throw new Error('Unknown source format');
    }

    return JSON.stringify(
      v1Data, 
      null, 
      options.prettify ? 2 : 0
    );

  } else if (targetFormat === 'v2') {
    // Convert to V2 format
    let layoutData;
    
    if (currentFormat === SaveFileFormat.V1) {
      layoutData = parsed;
    } else if (currentFormat === SaveFileFormat.V2) {
      layoutData = parsed.layout;
    } else {
      throw new Error('Unknown source format');
    }

    const v2Data = {
      version: {
        format_version: 2,
        app_version: '2.0.0',
        created_at: Date.now()
      },
      layout: layoutData,
      metadata: options.includeMetadata ? {
        converted_at: new Date().toISOString(),
        original_format: currentFormat,
        file_stats: {
          buildings_count: Object.keys(layoutData.buildings || {}).length,
          conveyors_count: Object.keys(layoutData.conveyorBelts || {}).length,
          railways_count: Object.keys(layoutData.railways || {}).length,
          pipes_count: Object.keys(layoutData.pipelines || {}).length,
        }
      } : {}
    };

    const json = JSON.stringify(
      v2Data, 
      null, 
      options.prettify ? 2 : 0
    );

    if (options.compress) {
      // TODO: Implement compression when Tauri backend supports it
      return json;
    }

    return json;
  }

  throw new Error(`Invalid target format: ${targetFormat}`);
}

/**
 * Batch converts multiple files
 */
export async function batchConvertFiles(
  files: File[],
  targetFormat: 'v1' | 'v2',
  options: ConversionOptions = {}
): Promise<{ 
  successful: string[];
  failed: Array<{ filename: string; error: string }>;
}> {
  const successful: string[] = [];
  const failed: Array<{ filename: string; error: string }> = [];

  for (const file of files) {
    try {
      const content = await file.text();
      const converted = await convertSaveFile(content, targetFormat, options);
      
      // Determine new filename
      const baseName = file.name.replace(/\.(json|slt)$/i, '');
      const extension = targetFormat === 'v1' ? 'json' : 'slt';
      const newFilename = `${baseName}.${extension}`;
      
      // Save converted file
      const blob = new Blob([converted], { type: 'application/json' });
      saveAs(blob, newFilename);
      
      successful.push(newFilename);
    } catch (error) {
      failed.push({
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { successful, failed };
}

/**
 * Creates a converter UI component
 */
export function createConverterModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'save-file-converter-modal';
  modal.innerHTML = `
    <div class="converter-content">
      <h2>Save File Converter</h2>
      <p>Convert between save file formats</p>
      
      <div class="converter-dropzone" id="converter-dropzone">
        <p>Drop save files here or click to select</p>
        <input type="file" id="converter-input" multiple accept=".json,.slt" style="display: none">
      </div>
      
      <div class="converter-options">
        <label>
          <input type="radio" name="format" value="v1" checked>
          Convert to V1 (.json) - Compatible with web version
        </label>
        <label>
          <input type="radio" name="format" value="v2">
          Convert to V2 (.slt) - New Tauri format
        </label>
        
        <label>
          <input type="checkbox" id="prettify" checked>
          Pretty print (readable formatting)
        </label>
        
        <label>
          <input type="checkbox" id="metadata">
          Include metadata (V2 only)
        </label>
      </div>
      
      <div class="converter-actions">
        <button id="convert-btn" disabled>Convert Files</button>
        <button id="close-btn">Close</button>
      </div>
      
      <div id="conversion-results" class="conversion-results" style="display: none">
        <h3>Conversion Results</h3>
        <div id="results-content"></div>
      </div>
    </div>
  `;

  // Add event listeners
  const dropzone = modal.querySelector('#converter-dropzone') as HTMLElement;
  const input = modal.querySelector('#converter-input') as HTMLInputElement;
  const convertBtn = modal.querySelector('#convert-btn') as HTMLButtonElement;
  const closeBtn = modal.querySelector('#close-btn') as HTMLButtonElement;
  
  let selectedFiles: File[] = [];

  dropzone.addEventListener('click', () => input.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer?.files || []);
    handleFiles(files);
  });
  
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    handleFiles(files);
  });
  
  function handleFiles(files: File[]) {
    selectedFiles = files.filter(f => 
      f.name.endsWith('.json') || f.name.endsWith('.slt')
    );
    
    if (selectedFiles.length > 0) {
      convertBtn.disabled = false;
      dropzone.innerHTML = `<p>${selectedFiles.length} file(s) selected</p>`;
    }
  }
  
  convertBtn.addEventListener('click', async () => {
    const format = (modal.querySelector('input[name="format"]:checked') as HTMLInputElement).value as 'v1' | 'v2';
    const prettify = (modal.querySelector('#prettify') as HTMLInputElement).checked;
    const metadata = (modal.querySelector('#metadata') as HTMLInputElement).checked;
    
    convertBtn.disabled = true;
    convertBtn.textContent = 'Converting...';
    
    const results = await batchConvertFiles(selectedFiles, format, {
      prettify,
      includeMetadata: metadata
    });
    
    // Show results
    const resultsDiv = modal.querySelector('#conversion-results') as HTMLElement;
    const resultsContent = modal.querySelector('#results-content') as HTMLElement;
    
    resultsContent.innerHTML = `
      <p>✅ Successfully converted: ${results.successful.length} file(s)</p>
      ${results.successful.map(f => `<div class="success">✓ ${f}</div>`).join('')}
      
      ${results.failed.length > 0 ? `
        <p>❌ Failed: ${results.failed.length} file(s)</p>
        ${results.failed.map(f => `<div class="error">✗ ${f.filename}: ${f.error}</div>`).join('')}
      ` : ''}
    `;
    
    resultsDiv.style.display = 'block';
    convertBtn.textContent = 'Convert More Files';
    convertBtn.disabled = false;
  });
  
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  return modal;
}

// Export for use in other components
export { saveAs };