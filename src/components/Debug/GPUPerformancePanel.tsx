/**
 * GPU Performance Panel - Debug component for monitoring GPU compute performance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  gpuComputeMonitor, 
  initializeGPUMonitor, 
  runGPUBenchmarks, 
  runGPUDiagnostic,
  type GPUPerformanceMetrics,
  type ComputeDeviceInfo
} from '../../utils/gpuComputeMonitor';
import { HybridCalculations } from '../../utils/hybridCalculations';

interface GPUPerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GPUPerformancePanel: React.FC<GPUPerformancePanelProps> = ({ isOpen, onClose }) => {
  const [deviceInfo, setDeviceInfo] = useState<ComputeDeviceInfo | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<GPUPerformanceMetrics[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<Map<string, any>>(new Map());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Initialize GPU monitor on component mount
  useEffect(() => {
    if (isOpen) {
      initializeGPUMonitor().then(() => {
        loadDeviceInfo();
        loadCurrentMetrics();
      });
    }
  }, [isOpen]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(() => {
      loadCurrentMetrics();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, isOpen]);

  const loadDeviceInfo = useCallback(async () => {
    try {
      const info = await gpuComputeMonitor.getDeviceInfo();
      setDeviceInfo(info);
    } catch (error) {
      console.error('Failed to load device info:', error);
    }
  }, []);

  const loadCurrentMetrics = useCallback(() => {
    try {
      const metrics = gpuComputeMonitor.getCurrentPerformanceMetrics();
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  }, []);

  const runBenchmarks = useCallback(async () => {
    setIsRunningBenchmark(true);
    try {
      const results = await runGPUBenchmarks();
      setBenchmarkResults(results);
      loadCurrentMetrics(); // Refresh metrics after benchmark
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsRunningBenchmark(false);
    }
  }, [loadCurrentMetrics]);

  const runDiagnostic = useCallback(async () => {
    try {
      const results = await runGPUDiagnostic();
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    }
  }, []);

  const clearHistory = useCallback(() => {
    gpuComputeMonitor.clearHistory();
    setBenchmarkResults([]);
    setPerformanceMetrics(new Map());
    loadCurrentMetrics();
  }, [loadCurrentMetrics]);

  const formatTime = (ms: number): string => {
    if (ms === Infinity) return 'N/A';
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatSpeedup = (speedup: number): string => {
    if (speedup === Infinity || isNaN(speedup)) return 'N/A';
    return `${speedup.toFixed(1)}x`;
  };

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'gpu': return 'text-green-400';
      case 'tauri': return 'text-blue-400';
      case 'js': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg w-5/6 h-5/6 max-w-6xl max-h-screen overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold">GPU Performance Monitor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 h-full overflow-y-auto">
          {/* Device Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Device Information</h3>
            <div className="bg-gray-700 rounded p-4">
              {deviceInfo ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-300">Status:</span>
                    <span className={`ml-2 ${deviceInfo.available ? 'text-green-400' : 'text-red-400'}`}>
                      {deviceInfo.available ? '✅ Available' : '❌ Unavailable'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Device Type:</span>
                    <span className="ml-2 text-blue-400">{deviceInfo.deviceType}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Max Workgroup Size:</span>
                    <span className="ml-2">{deviceInfo.capabilities.maxWorkgroupSize}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Float Textures:</span>
                    <span className={`ml-2 ${deviceInfo.capabilities.supportsFloatTextures ? 'text-green-400' : 'text-red-400'}`}>
                      {deviceInfo.capabilities.supportsFloatTextures ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">SIMD Support:</span>
                    <span className={`ml-2 ${deviceInfo.capabilities.supportsSIMD ? 'text-green-400' : 'text-red-400'}`}>
                      {deviceInfo.capabilities.supportsSIMD ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Max Buffer Size:</span>
                    <span className="ml-2">{(deviceInfo.capabilities.maxStorageBufferSize / (1024 * 1024)).toFixed(0)}MB</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">Loading device information...</div>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Controls</h3>
            <div className="bg-gray-700 rounded p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={runBenchmarks}
                  disabled={isRunningBenchmark}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
                >
                  {isRunningBenchmark ? '🔄 Running...' : '⚡ Run Full Benchmarks'}
                </button>
                <button
                  onClick={runDiagnostic}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
                >
                  🔍 Quick Diagnostic
                </button>
                <button
                  onClick={clearHistory}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
                >
                  🗑️ Clear History
                </button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto Refresh (2s)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Diagnostic Results */}
          {diagnosticResults && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Quick Diagnostic</h3>
              <div className="bg-gray-700 rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-300">GPU Available:</span>
                    <span className={`ml-2 ${diagnosticResults.gpuAvailable ? 'text-green-400' : 'text-red-400'}`}>
                      {diagnosticResults.gpuAvailable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Device Type:</span>
                    <span className="ml-2 text-blue-400">{diagnosticResults.deviceType}</span>
                  </div>
                  {diagnosticResults.basicPerformanceTest && (
                    <>
                      <div>
                        <span className="text-gray-300">GPU Time:</span>
                        <span className="ml-2">{formatTime(diagnosticResults.basicPerformanceTest.gpuTime)}</span>
                      </div>
                      <div>
                        <span className="text-gray-300">JS Time:</span>
                        <span className="ml-2">{formatTime(diagnosticResults.basicPerformanceTest.jsTime)}</span>
                      </div>
                      <div>
                        <span className="text-gray-300">Speedup:</span>
                        <span className="ml-2 text-green-400">
                          {formatSpeedup(diagnosticResults.basicPerformanceTest.speedup)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Performance Metrics */}
          {performanceMetrics.size > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Current Performance Metrics</h3>
              <div className="bg-gray-700 rounded p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-2">Operation</th>
                      <th className="text-left p-2">GPU Time</th>
                      <th className="text-left p-2">Tauri Time</th>
                      <th className="text-left p-2">JS Time</th>
                      <th className="text-left p-2">Best Method</th>
                      <th className="text-left p-2">GPU Speedup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(performanceMetrics.entries()).map(([operation, metrics]) => {
                      const gpuSpeedup = metrics.js > 0 && metrics.gpu > 0 ? metrics.js / metrics.gpu : 0;
                      const bestMethod = HybridCalculations.getBestComputeMethod(operation, 1000);
                      
                      return (
                        <tr key={operation} className="border-b border-gray-600">
                          <td className="p-2 font-mono text-blue-300">{operation}</td>
                          <td className="p-2">{formatTime(metrics.gpu)}</td>
                          <td className="p-2">{formatTime(metrics.tauri)}</td>
                          <td className="p-2">{formatTime(metrics.js)}</td>
                          <td className={`p-2 font-semibold ${getMethodColor(bestMethod)}`}>
                            {bestMethod.toUpperCase()}
                          </td>
                          <td className="p-2 text-green-400">{formatSpeedup(gpuSpeedup)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Benchmark Results */}
          {benchmarkResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Benchmark Results</h3>
              <div className="bg-gray-700 rounded p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-2">Operation</th>
                      <th className="text-left p-2">Sample Size</th>
                      <th className="text-left p-2">GPU Time</th>
                      <th className="text-left p-2">Tauri Time</th>
                      <th className="text-left p-2">JS Time</th>
                      <th className="text-left p-2">Speedup</th>
                      <th className="text-left p-2">Recommended</th>
                      <th className="text-left p-2">Error Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkResults.map((result, index) => (
                      <tr key={index} className="border-b border-gray-600">
                        <td className="p-2 font-mono text-blue-300">{result.operationName}</td>
                        <td className="p-2">{result.sampleSize.toLocaleString()}</td>
                        <td className="p-2">{formatTime(result.avgTimeGPU)}</td>
                        <td className="p-2">{formatTime(result.avgTimeTauri)}</td>
                        <td className="p-2">{formatTime(result.avgTimeJS)}</td>
                        <td className="p-2 text-green-400">{formatSpeedup(result.gpuSpeedup)}</td>
                        <td className={`p-2 font-semibold ${getMethodColor(result.recommendedMethod)}`}>
                          {result.recommendedMethod.toUpperCase()}
                        </td>
                        <td className={`p-2 ${result.errorRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {(result.errorRate * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Performance Tips</h3>
            <div className="bg-gray-700 rounded p-4">
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                <li>GPU acceleration is most effective for bulk operations (100+ items)</li>
                <li>WebGPU provides better performance than WebGL2 compute</li>
                <li>For small datasets (&lt;50 items), JavaScript is often faster due to reduced overhead</li>
                <li>Spatial queries and intersection detection benefit most from GPU acceleration</li>
                <li>GPU speedup varies significantly between different graphics cards</li>
                <li>If GPU is unavailable, Tauri (Rust) provides good fallback performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPUPerformancePanel;