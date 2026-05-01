/**
 * UpdateNotification - Component displaying update availability and download progress
 *
 * Shows a non-intrusive notification when updates are available,
 * with options to download/install or dismiss.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';

export const UpdateNotification: React.FC = () => {
  const {
    available,
    downloading,
    checking,
    error,
    updateInfo,
    progress,
    downloadAndInstall,
    dismissUpdate,
    clearError,
  } = useAutoUpdater();

  // Don't render if no update available and not in error state
  if (!available && !error && !downloading) {
    return null;
  }

  return (
    <AnimatePresence>
      {(available || error || downloading) && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 right-4 z-[100] w-80 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-600/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {error ? (
                <AlertCircle size={18} className="text-red-400" />
              ) : downloading ? (
                <RefreshCw size={18} className="text-blue-400 animate-spin" />
              ) : (
                <Download size={18} className="text-green-400" />
              )}
              <span className="text-sm font-medium text-white">
                {error ? 'Update Error' : downloading ? 'Downloading Update' : 'Update Available'}
              </span>
            </div>
            {!downloading && (
              <button
                onClick={error ? clearError : dismissUpdate}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {error ? (
              <div className="text-sm text-red-300">
                <p>{error}</p>
                <p className="mt-2 text-slate-400 text-xs">
                  Please check your internet connection and try again.
                </p>
              </div>
            ) : downloading ? (
              <div>
                <div className="flex justify-between text-sm text-slate-300 mb-2">
                  <span>Downloading...</span>
                  <span>{progress?.percent || 0}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress?.percent || 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {progress && (
                  <p className="text-xs text-slate-400 mt-2">
                    {(progress.downloaded / 1024 / 1024).toFixed(1)} MB / {(progress.total / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  The app will restart automatically when complete.
                </p>
              </div>
            ) : updateInfo ? (
              <div>
                <p className="text-sm text-slate-200 mb-1">
                  Version <span className="font-mono text-green-400">{updateInfo.version}</span> is available
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Current: {updateInfo.currentVersion}
                </p>
                {updateInfo.body && (
                  <div className="text-xs text-slate-400 mb-3 max-h-24 overflow-y-auto bg-slate-900/50 rounded p-2">
                    {updateInfo.body}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Actions */}
          {!downloading && !error && available && (
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={downloadAndInstall}
                disabled={checking}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white text-sm font-medium rounded-md transition-colors"
              >
                <Download size={16} />
                Update Now
              </button>
              <button
                onClick={dismissUpdate}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-md transition-colors"
              >
                Later
              </button>
            </div>
          )}

          {error && (
            <div className="px-4 pb-4">
              <button
                onClick={clearError}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-md transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateNotification;
