// src/components/UI/RustFallbackDiagnostic.tsx
import React, { useState, useEffect } from 'react';
import { getHybridCalculationErrors, resetHybridCalculationErrors } from '../../utils/hybridCalculations';
import { isTauriEnvironment } from '../../tauri/environment';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorInfo {
  command: string;
  count: number;
  lastError: string;
  lastErrorTime: number;
}

export const RustFallbackDiagnostic: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const getErrorReport = () => ({});
  const resetErrorMetrics = () => {};
  
  useEffect(() => {
    if (!isOpen) return;
    
    const updateErrors = () => {
      const hookErrors = getErrorReport();
      const hybridErrors = getHybridCalculationErrors();
      
      const allErrors: ErrorInfo[] = [];
      
      // Collect hook errors
      Object.entries(hookErrors).forEach(([command, info]) => {
        allErrors.push({ command, count: 0, lastError: '', lastErrorTime: 0 });
      });
      
      // Collect hybrid calculation errors
      hybridErrors.forEach((info, command) => {
        allErrors.push({ command, count: 0, lastError: '', lastErrorTime: 0 });
      });
      
      // Sort by count descending
      allErrors.sort((a, b) => b.count - a.count);
      setErrors(allErrors);
    };
    
    updateErrors();
    const interval = setInterval(updateErrors, 2000);
    
    return () => clearInterval(interval);
  }, [isOpen, getErrorReport]);
  
  const handleReset = () => {
    resetErrorMetrics();
    resetHybridCalculationErrors();
    setErrors([]);
  };
  
  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  if (!isTauriEnvironment()) {
    return null; // Only show in Tauri environment
  }
  
  return (
    <>
      {/* Diagnostic Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700 transition-colors"
        title="Rust/JS Fallback Diagnostics"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${errors.length > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />
          <span>Rust Status</span>
        </div>
      </button>
      
      {/* Diagnostic Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-gray-900 text-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Rust/JS Fallback Status</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Monitoring Rust command failures and JS fallbacks
              </p>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {errors.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-400 text-2xl mb-2">✓</div>
                  <p className="text-gray-400">All Rust commands working properly</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div
                      key={`${error.command}-${index}`}
                      className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-yellow-400">{error.command}</h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(error.lastErrorTime)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-300 mb-1">
                          Failed {error.count} time{error.count !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {error.lastError}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Actions */}
            {errors.length > 0 && (
              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleReset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Clear Error History
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Errors indicate JS fallback is being used
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};