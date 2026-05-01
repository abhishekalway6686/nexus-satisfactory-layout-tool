// Example component demonstrating Tauri integration features
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLayoutStoreTauri, Calculations } from '../../store/layoutStoreTauri';
import { isTauriEnvironment, Features } from '../../tauri/environment';
import { findConnectableBuildings, checkBuildingCollision } from '../../tauri/commandsExtended';
import { Activity, Zap, Database, FileSearch } from 'lucide-react';

export const TauriIntegrationExample: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { buildings, addBuilding, saveLayout, loadLayout } = useLayoutStoreTauri();
  
  // Run integration tests
  const runIntegrationTests = async () => {
    if (!isTauriEnvironment()) {
      setTestResults(['Not running in Tauri environment']);
      return;
    }
    
    setIsRunning(true);
    const results: string[] = [];
    
    try {
      // Test 1: Distance calculation comparison
      const start = performance.now();
      const point1 = { x: 0, y: 0, z: 0 };
      const point2 = { x: 100, y: 100, z: 50 };
      
      // Hybrid calculation (uses Rust when available)
      const distance = await Calculations.distance3D(point1, point2);
      const hybridTime = performance.now() - start;
      
      // Pure JS calculation for comparison
      const jsStart = performance.now();
      const jsDistance = Calculations.distance3DSync(point1, point2);
      const jsTime = performance.now() - jsStart;
      
      results.push(`✅ Distance calculation: ${distance.toFixed(2)} (Hybrid: ${hybridTime.toFixed(2)}ms, JS: ${jsTime.toFixed(2)}ms)`);
      
      // Test 2: Building collision detection
      const hasCollision = await checkBuildingCollision(
        'Constructor',
        { x: 50, y: 50, z: 0 },
        0
      );
      results.push(`✅ Collision detection: ${hasCollision ? 'Collision found' : 'No collision'}`);
      
      // Test 3: Spatial query
      const nearbyBuildings = await findConnectableBuildings(
        { x: 100, y: 100, z: 0 },
        'output',
        false,
        200
      );
      results.push(`✅ Spatial query found ${nearbyBuildings.length} connectable buildings`);
      
      // Test 4: Batch distance calculations
      const pointsA = Array.from({ length: 100 }, (_, i) => ({ 
        x: i * 10, 
        y: i * 5, 
        z: 0 
      }));
      const pointsB = Array.from({ length: 100 }, (_, i) => ({ 
        x: i * 15, 
        y: i * 8, 
        z: 10 
      }));
      
      const batchStart = performance.now();
      const distances = await Calculations.calculateDistancesBulk(pointsA, pointsB);
      const batchTime = performance.now() - batchStart;
      
      results.push(`✅ Batch calculation: ${distances.length} distances in ${batchTime.toFixed(2)}ms`);
      
      // Test 5: Performance comparison
      const perfComparison = Calculations.getPerformanceComparison();
      const comparisonStr = Array.from(perfComparison.entries())
        .map(([op, metrics]) => `${op}: T=${metrics.tauri.toFixed(2)}ms, JS=${metrics.js.toFixed(2)}ms`)
        .join(', ');
      results.push(`📊 Performance: ${comparisonStr || 'No data yet'}`);
      
    } catch (error) {
      results.push(`❌ Error: ${error}`);
    }
    
    setTestResults(results);
    setIsRunning(false);
  };
  
  // Test file operations
  const testFileOperations = async () => {
    try {
      // Test save
      const savePath = await saveLayout();
      if (savePath) {
        setTestResults(prev => [...prev, `✅ Saved layout to: ${savePath}`]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Save error: ${error}`]);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="text-green-400" size={24} />
        <h2 className="text-xl font-bold text-slate-100">Tauri Integration Status</h2>
        {isTauriEnvironment() && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
            <Zap size={14} />
            <span>Enhanced Mode</span>
          </div>
        )}
      </div>
      
      {/* Feature Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(Features).map(([feature, enabled]) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${
              enabled 
                ? 'bg-green-400/10 border-green-400/30 text-green-300' 
                : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {enabled ? <Zap size={16} /> : <Database size={16} />}
              <span className="text-xs font-medium capitalize">
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
            <div className="text-xs opacity-70">
              {enabled ? 'Enabled' : 'Web Only'}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Test Controls */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={runIntegrationTests}
          disabled={!isTauriEnvironment() || isRunning}
          className="px-4 py-2 bg-orange-400/20 hover:bg-orange-400/30 text-orange-300 rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Activity size={16} className={isRunning ? 'animate-spin' : ''} />
          Run Integration Tests
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={testFileOperations}
          disabled={!isTauriEnvironment()}
          className="px-4 py-2 bg-blue-400/20 hover:bg-blue-400/30 text-blue-300 rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileSearch size={16} />
          Test File Operations
        </motion.button>
      </div>
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-800/50 rounded-lg p-4 space-y-2"
        >
          <h3 className="text-sm font-medium text-slate-300 mb-3">Test Results:</h3>
          {testResults.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-sm font-mono text-slate-400"
            >
              {result}
            </motion.div>
          ))}
        </motion.div>
      )}
      
      {/* Info Box */}
      <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-4 text-sm text-blue-300">
        <div className="flex items-start gap-3">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              When running in Tauri, calculations are automatically delegated to the Rust backend 
              for improved performance. The hybrid system falls back to JavaScript when needed.
            </p>
            <p className="text-xs opacity-70 mt-2">
              Press Ctrl+Shift+P to toggle the performance monitor overlay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};