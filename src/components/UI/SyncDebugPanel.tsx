import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStatus, useStateValidation } from '../../store/synchronizedStore';
import { isTauriEnvironment } from '../../tauri/environment';
import { ValidationResult } from '../../tauri/sync/stateValidator';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Download,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export const SyncDebugPanel: React.FC = () => {
  const { status, forceSync } = useSyncStatus();
  const { validate, exportReport } = useStateValidation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Only show in Tauri environment and development mode
  if (!isTauriEnvironment() || import.meta.env.PROD) {
    return null;
  }
  
  const runValidation = async () => {
    if (!validate) return;
    
    setIsValidating(true);
    try {
      const result = await validate(true);
      setValidationResult(result);
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleExportReport = async () => {
    if (!exportReport) return;
    
    const report = await exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            {status.connected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-200">
              Sync Debug Panel
            </span>
            <span className="text-xs text-gray-400">
              v{status.version}
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {/* Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 border-t border-gray-700">
                {/* Connection Status */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">
                    Connection Status
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-300">
                      {status.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last sync: {new Date(status.lastSync).toLocaleTimeString()}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={runValidation}
                    disabled={isValidating}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    {isValidating ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Activity className="w-3 h-3" />
                    )}
                    Validate
                  </button>
                  
                  <button
                    onClick={handleForceSync}
                    disabled={isSyncing}
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Force Sync
                  </button>
                </div>
                
                {/* Validation Results */}
                {validationResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase">
                        Validation Results
                      </h3>
                      <button
                        onClick={handleExportReport}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                    
                    <div className={`p-2 rounded text-xs ${
                      validationResult.isValid 
                        ? 'bg-green-900/30 text-green-400 border border-green-800' 
                        : 'bg-red-900/30 text-red-400 border border-red-800'
                    }`}>
                      <div className="flex items-center gap-1">
                        {validationResult.isValid ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        State is {validationResult.isValid ? 'VALID' : 'INVALID'}
                      </div>
                    </div>
                    
                    {/* Errors */}
                    {validationResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-red-400">
                          Errors ({validationResult.errors.length})
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {validationResult.errors.map((error, i) => (
                            <div key={i} className="text-xs text-gray-400">
                              • {error.type}: {error.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Warnings */}
                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-yellow-400">
                          Warnings ({validationResult.warnings.length})
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {validationResult.warnings.map((warning, i) => (
                            <div key={i} className="text-xs text-gray-400">
                              • {warning.type}: {warning.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Total Entities:</span>
                        <span className="ml-1 text-gray-300">
                          {validationResult.stats.totalEntities}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Buildings:</span>
                        <span className="ml-1 text-gray-300">
                          {validationResult.stats.buildingCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Conveyors:</span>
                        <span className="ml-1 text-gray-300">
                          {validationResult.stats.conveyorCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pipelines:</span>
                        <span className="ml-1 text-gray-300">
                          {validationResult.stats.pipeCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Connections:</span>
                        <span className="ml-1 text-gray-300">
                          {validationResult.stats.connectionCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Orphaned:</span>
                        <span className="ml-1 text-orange-400">
                          {validationResult.stats.orphanedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};