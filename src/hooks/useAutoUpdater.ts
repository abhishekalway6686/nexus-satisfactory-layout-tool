/**
 * useAutoUpdater - Hook for managing application auto-updates via Tauri
 *
 * Provides functionality to:
 * - Check for updates on demand or at startup
 * - Download and install updates
 * - Show update progress
 * - Handle update errors gracefully
 */

import { useState, useCallback, useEffect } from 'react';
import { isTauriAvailable } from '../utils/tauriHelper';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percent: number;
}

export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  error: string | null;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
}

const initialState: UpdateState = {
  checking: false,
  available: false,
  downloading: false,
  error: null,
  updateInfo: null,
  progress: null,
};

export const useAutoUpdater = () => {
  const [state, setState] = useState<UpdateState>(initialState);

  const checkForUpdates = useCallback(async () => {
    // Only run in Tauri environment
    if (!isTauriAvailable()) {
      console.log('[AutoUpdater] Not in Tauri environment, skipping update check');
      return null;
    }

    setState(prev => ({ ...prev, checking: true, error: null }));

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update) {
        const updateInfo: UpdateInfo = {
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body || undefined,
          date: update.date || undefined,
        };

        setState(prev => ({
          ...prev,
          checking: false,
          available: true,
          updateInfo,
        }));

        return update;
      } else {
        setState(prev => ({
          ...prev,
          checking: false,
          available: false,
          updateInfo: null,
        }));
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      console.error('[AutoUpdater] Check failed:', errorMessage);

      setState(prev => ({
        ...prev,
        checking: false,
        error: errorMessage,
      }));

      return null;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!isTauriAvailable()) {
      console.log('[AutoUpdater] Not in Tauri environment');
      return false;
    }

    setState(prev => ({ ...prev, downloading: true, error: null, progress: null }));

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');

      const update = await check();

      if (!update) {
        setState(prev => ({ ...prev, downloading: false, error: 'No update available' }));
        return false;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(`[AutoUpdater] Download started, total size: ${contentLength} bytes`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
            setState(prev => ({
              ...prev,
              progress: {
                downloaded,
                total: contentLength,
                percent,
              },
            }));
            break;
          case 'Finished':
            console.log('[AutoUpdater] Download finished');
            break;
        }
      });

      console.log('[AutoUpdater] Update installed, relaunching...');

      // Give the UI a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      await relaunch();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download/install update';
      console.error('[AutoUpdater] Download/install failed:', errorMessage);

      setState(prev => ({
        ...prev,
        downloading: false,
        error: errorMessage,
        progress: null,
      }));

      return false;
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setState(initialState);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check for updates on mount (only in production Tauri builds)
  useEffect(() => {
    // Delay the check slightly to not block app startup
    const timer = setTimeout(() => {
      if (isTauriAvailable()) {
        // Only auto-check in production (not dev mode)
        const isDev = window.location.hostname === 'localhost';
        if (!isDev) {
          checkForUpdates();
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    clearError,
  };
};

export default useAutoUpdater;
