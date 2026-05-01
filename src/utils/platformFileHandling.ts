import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists, createDir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { isTauriEnvironment } from '../tauri/environment';
import { getPlatformInfo } from './platformDetection';

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface SaveFileOptions extends FileDialogOptions {
  content: string;
}

export interface OpenFileOptions extends FileDialogOptions {
  multiple?: boolean;
}

// Platform-specific path handling
export class PlatformPaths {
  static async normalize(path: string): Promise<string> {
    const info = await getPlatformInfo();
    
    if (info.platform === 'windows') {
      // Convert forward slashes to backslashes on Windows
      return path.replace(/\//g, '\\');
    } else {
      // Convert backslashes to forward slashes on Unix-like systems
      return path.replace(/\\/g, '/');
    }
  }

  static async join(...parts: string[]): Promise<string> {
    const info = await getPlatformInfo();
    const separator = info.platform === 'windows' ? '\\' : '/';
    
    // Filter out empty parts and join with platform separator
    const joined = parts
      .filter(part => part && part.length > 0)
      .join(separator);
    
    return this.normalize(joined);
  }

  static async getDocumentsDir(): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('Documents directory is only available in Tauri environment');
    }

    // Tauri provides platform-specific document directory
    return await BaseDirectory.Document;
  }

  static async getAppDataDir(): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('App data directory is only available in Tauri environment');
    }

    return await BaseDirectory.AppData;
  }

  static async ensureDirectory(path: string): Promise<void> {
    if (!isTauriEnvironment()) {
      return;
    }

    const dirExists = await exists(path);
    if (!dirExists) {
      await createDir(path, { recursive: true });
    }
  }
}

// Cross-platform file operations
export class PlatformFileOps {
  static async saveFile(options: SaveFileOptions): Promise<string | null> {
    if (isTauriEnvironment()) {
      // Use Tauri's native file dialog
      const filePath = await save({
        title: options.title,
        defaultPath: options.defaultPath,
        filters: options.filters,
      });

      if (filePath) {
        // Normalize path for platform
        const normalizedPath = await PlatformPaths.normalize(filePath);
        
        // Handle line endings based on platform
        const info = await getPlatformInfo();
        const content = info.platform === 'windows' 
          ? options.content.replace(/\n/g, '\r\n')
          : options.content.replace(/\r\n/g, '\n');
        
        await writeTextFile(normalizedPath, content);
        return normalizedPath;
      }
      return null;
    } else {
      // Web fallback using download
      const blob = new Blob([options.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.defaultPath || 'download.txt';
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return a.download;
    }
  }

  static async openFile(options: OpenFileOptions): Promise<string | string[] | null> {
    if (isTauriEnvironment()) {
      // Use Tauri's native file dialog
      const selected = await open({
        title: options.title,
        defaultPath: options.defaultPath,
        filters: options.filters,
        multiple: options.multiple,
      });

      if (!selected) return null;

      if (Array.isArray(selected)) {
        // Multiple files selected
        const contents = await Promise.all(
          selected.map(async (path) => {
            const normalizedPath = await PlatformPaths.normalize(path);
            const content = await readTextFile(normalizedPath);
            
            // Normalize line endings
            const info = await getPlatformInfo();
            return info.platform === 'windows'
              ? content.replace(/\r\n/g, '\n')
              : content;
          })
        );
        return contents;
      } else {
        // Single file selected
        const normalizedPath = await PlatformPaths.normalize(selected);
        const content = await readTextFile(normalizedPath);
        
        // Normalize line endings
        const info = await getPlatformInfo();
        return info.platform === 'windows'
          ? content.replace(/\r\n/g, '\n')
          : content;
      }
    } else {
      // Web fallback using file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options.multiple || false;
        
        if (options.filters && options.filters.length > 0) {
          // Convert filters to accept attribute
          const extensions = options.filters
            .flatMap(f => f.extensions)
            .map(ext => `.${ext}`)
            .join(',');
          input.accept = extensions;
        }

        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (!files || files.length === 0) {
            resolve(null);
            return;
          }

          if (options.multiple) {
            const contents = await Promise.all(
              Array.from(files).map(file => file.text())
            );
            resolve(contents);
          } else {
            const content = await files[0].text();
            resolve(content);
          }
        };

        input.click();
      });
    }
  }

  static async getFileExtension(filename: string): Promise<string> {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  static async getFileName(path: string): Promise<string> {
    const info = await getPlatformInfo();
    const separator = info.platform === 'windows' ? '\\' : '/';
    const parts = path.split(separator);
    return parts[parts.length - 1];
  }

  static async getFileNameWithoutExtension(path: string): Promise<string> {
    const fileName = await this.getFileName(path);
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }
}

// Platform-specific clipboard operations
export class PlatformClipboard {
  static async writeText(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
      
      document.body.removeChild(textArea);
    }
  }

  static async readText(): Promise<string | null> {
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        return await navigator.clipboard.readText();
      } catch (err) {
        console.error('Failed to read clipboard:', err);
        return null;
      }
    }
    return null;
  }

  static async writeImage(blob: Blob): Promise<void> {
    if (navigator.clipboard && 'write' in navigator.clipboard) {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
    } else {
      throw new Error('Image clipboard operations not supported');
    }
  }
}

// Platform-specific drag and drop handling
export class PlatformDragDrop {
  static async handleDrop(event: DragEvent): Promise<File[]> {
    event.preventDefault();
    
    const files: File[] = [];
    const items = event.dataTransfer?.items;
    
    if (items) {
      // Use DataTransferItemList interface
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
    } else {
      // Fallback to DataTransfer.files
      const fileList = event.dataTransfer?.files;
      if (fileList) {
        for (let i = 0; i < fileList.length; i++) {
          files.push(fileList[i]);
        }
      }
    }
    
    return files;
  }

  static preventDefaults(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  static addHighlight(element: HTMLElement): void {
    element.classList.add('drag-over');
  }

  static removeHighlight(element: HTMLElement): void {
    element.classList.remove('drag-over');
  }
}