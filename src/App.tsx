// src/App.tsx - Updated with Performance Mode Integration

import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toolbar } from './components/UI/Toolbar';
import { FactoryCanvas } from './components/Canvas/FactoryCanvas';
import { DesktopLayout } from './components/Desktop/DesktopLayout';
import { useLayoutStore } from './store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import { usePerformanceMode } from './hooks/usePerformanceMode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Home, Package, Settings, Info } from 'lucide-react';
import { RustFallbackDiagnostic } from './components/UI/RustFallbackDiagnostic';
import { FeedbackButton } from './components/UI/FeedbackButton';
import { preloadGPUComputeEngine } from './utils/hybridCalculations';
// Removed TauriConnectionTest since we migrated to standalone HTTP server
// import { TauriConnectionTest } from './components/Debug/TauriConnectionTest';

import { DonationNudge } from './components/UI/DonationNudge';

// Lazy load heavy components for better initial load
const BuildingPalette = lazy(() => import('./components/UI/BuildingPalette'));
const PropertiesPanel = lazy(() => import('./components/UI/PropertiesPanel'));
const KeyboardShortcutsPanel = lazy(() => import('./components/UI/KeyboardShortcutsPanel'));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="loading-spinner"></div>
  </div>
);

// Main app component with performance mode integration
export default function App() {
  const { propertiesPanelWidth, selectedBuilding, selectedPole, selectedPipeSupport, selectedStickyNote } = useLayoutStore(
    useShallow(state => ({
      propertiesPanelWidth: state.propertiesPanelWidth,
      selectedBuilding: state.selectedBuilding,
      selectedPole: state.selectedPole,
      selectedPipeSupport: state.selectedPipeSupport,
      selectedStickyNote: state.selectedStickyNote,
    }))
  );
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [activeMobileTab, setActiveMobileTab] = useState<'canvas' | 'buildings' | 'properties' | 'help'>('canvas');
  
  // Performance mode integration
  const { mode, setPerformanceMode, config } = usePerformanceMode();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Preload GPU compute engine on app startup to avoid first-frame stutter
  useEffect(() => {
    preloadGPUComputeEngine().then(result => {
      if (result.success) {
        console.log(`🚀 GPU Compute ready: ${result.initTimeMs.toFixed(1)}ms`);
      }
    });
  }, []);

  // Monitor screen size changes
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      const desktop = width >= 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsDesktop(desktop);
      
      // Reset mobile state when switching to desktop
      if (!mobile) {
        setActiveMobileTab('canvas');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasSelection = selectedBuilding || selectedPole || selectedPipeSupport || selectedStickyNote;
  
  // Performance-based panel class
  const panelClass = config.enableBackdropBlur ? 'glass-panel' : 'glass-panel-solid';
  
  // Use desktop layout for larger screens
  if (isDesktop) {
    return <DesktopLayout />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 overflow-hidden relative">
      {/* Animated Background Pattern - Only show on high performance */}
      {config.enableComplexGradients && (
        <div className="absolute inset-0 hex-bg opacity-30"></div>
      )}
      
      {/* Ambient Glow Effects - Only show on medium+ performance */}
      {config.shadowQuality !== 'low' && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-orange-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        </>
      )}
      
      {/* Toolbar with performance mode toggle */}
      <motion.div
        initial={config.enableAnimations ? { y: -100, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={config.enableAnimations ? { duration: 0.8, ease: "easeOut" } : { duration: 0.01 }}
        className="relative z-50 flex-shrink-0"
      >
        <div className={`${panelClass} border-b border-orange-400/20 backdrop-blur-xl`}>
          <Toolbar performanceMode={mode} onPerformanceModeChange={setPerformanceMode} />
        </div>
      </motion.div>
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Layout */}
        {!isMobile && (
          <>
            {/* Desktop Left Panel - Building Palette */}
            {!isTablet && (
              <motion.div
                initial={config.enableAnimations ? { x: -300, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                transition={config.enableAnimations ? { duration: 0.6, ease: "easeOut", delay: 0.2 } : { duration: 0.01 }}
                className="flex-shrink-0 relative z-40"
              >
                <div className={`${panelClass} border-r border-orange-400/20 h-full backdrop-blur-xl`}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <BuildingPalette />
                  </Suspense>
                </div>
              </motion.div>
            )}

            {/* Desktop Center: Main Canvas Area */}
            <motion.div
              initial={config.enableAnimations ? { scale: 0.95, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={config.enableAnimations ? { duration: 0.8, ease: "easeOut", delay: 0.3 } : { duration: 0.01 }}
              className="flex-1 relative overflow-hidden"
            >
              <div className="relative h-full bg-gradient-to-br from-slate-900/50 via-gray-900/50 to-slate-800/50 backdrop-blur-sm">
                <CanvasContent config={config} />
              </div>
            </motion.div>
            
            {/* Desktop Right Panel - Properties Panel */}
            {!isTablet && (
              <motion.div
                initial={config.enableAnimations ? { x: 300, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                transition={config.enableAnimations ? { duration: 0.6, ease: "easeOut", delay: 0.4 } : { duration: 0.01 }}
                className="flex-shrink-0 relative z-40"
                style={{ width: propertiesPanelWidth }}
              >
                <div className={`${panelClass} border-l border-orange-400/20 h-full backdrop-blur-xl`}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PropertiesPanel />
                  </Suspense>
                </div>
              </motion.div>
            )}

            {/* Tablet Floating Building Palette */}
            {isTablet && (
              <motion.div
                initial={config.enableAnimations ? { y: 100, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={config.enableAnimations ? { duration: 0.6, ease: "easeOut", delay: 0.5 } : { duration: 0.01 }}
                className="fixed inset-x-4 bottom-4 z-50 max-h-64 overflow-hidden"
              >
                <div className={`${panelClass} border border-orange-400/20 backdrop-blur-xl rounded-xl`}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <BuildingPalette />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <>
            {/* Mobile Canvas - Always visible */}
            <div className="flex-1 relative overflow-hidden">
              <CanvasContent config={config} />
            </div>

            {/* Mobile Panel Slides */}
            <AnimatePresence mode="wait">
              {activeMobileTab === 'buildings' && (
                <motion.div
                  key="buildings"
                  initial={config.enableAnimations ? { y: '100%' } : false}
                  animate={{ y: 0 }}
                  exit={config.enableAnimations ? { y: '100%' } : { opacity: 0 }}
                  transition={config.enableAnimations ? { type: 'spring', damping: 30, stiffness: 300 } : { duration: 0.01 }}
                  className="fixed inset-x-0 bottom-20 top-20 z-40"
                >
                  <div className="h-full bg-slate-900/98 backdrop-blur-xl border-t border-orange-400/20">
                    <Suspense fallback={<LoadingSpinner />}>
                      <BuildingPalette />
                    </Suspense>
                  </div>
                </motion.div>
              )}

              {activeMobileTab === 'properties' && (
                <motion.div
                  key="properties"
                  initial={config.enableAnimations ? { y: '100%' } : false}
                  animate={{ y: 0 }}
                  exit={config.enableAnimations ? { y: '100%' } : { opacity: 0 }}
                  transition={config.enableAnimations ? { type: 'spring', damping: 30, stiffness: 300 } : { duration: 0.01 }}
                  className="fixed inset-x-0 bottom-20 top-20 z-40"
                >
                  <div className="h-full bg-slate-900/98 backdrop-blur-xl border-t border-orange-400/20">
                    <Suspense fallback={<LoadingSpinner />}>
                      <PropertiesPanel />
                    </Suspense>
                  </div>
                </motion.div>
              )}

              {activeMobileTab === 'help' && (
                <motion.div
                  key="help"
                  initial={config.enableAnimations ? { y: '100%' } : false}
                  animate={{ y: 0 }}
                  exit={config.enableAnimations ? { y: '100%' } : { opacity: 0 }}
                  transition={config.enableAnimations ? { type: 'spring', damping: 30, stiffness: 300 } : { duration: 0.01 }}
                  className="fixed inset-x-0 bottom-20 top-20 z-40"
                >
                  <div className="h-full bg-slate-900/98 backdrop-blur-xl border-t border-orange-400/20">
                    <MobileHelpPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Bottom Tab Bar */}
            <motion.div
              initial={config.enableAnimations ? { y: 100, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={config.enableAnimations ? { duration: 0.6, delay: 0.3 } : { duration: 0.01 }}
              className="fixed bottom-0 left-0 right-0 z-50"
            >
              <div className={`${panelClass} border-t border-orange-400/20 backdrop-blur-xl`}>
                <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
                  {/* Canvas Tab */}
                  <motion.button
                    whileHover={config.enableAnimations ? { scale: 1.05 } : undefined}
                    whileTap={config.enableAnimations ? { scale: 0.95 } : undefined}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all min-w-[70px] min-h-[60px] relative ${
                      activeMobileTab === 'canvas' 
                        ? 'bg-orange-400/20 border border-orange-400/50 text-orange-300' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveMobileTab('canvas')}
                  >
                    <Home size={20} />
                    <span className="text-xs mt-1 font-medium">Canvas</span>
                  </motion.button>

                  {/* Buildings Tab */}
                  <motion.button
                    whileHover={config.enableAnimations ? { scale: 1.05 } : undefined}
                    whileTap={config.enableAnimations ? { scale: 0.95 } : undefined}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all min-w-[70px] min-h-[60px] ${
                      activeMobileTab === 'buildings' 
                        ? 'bg-orange-400/20 border border-orange-400/50 text-orange-300' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveMobileTab(activeMobileTab === 'buildings' ? 'canvas' : 'buildings')}
                  >
                    <Package size={20} />
                    <span className="text-xs mt-1 font-medium">Build</span>
                  </motion.button>

                  {/* Properties Tab */}
                  <motion.button
                    whileHover={config.enableAnimations ? { scale: 1.05 } : undefined}
                    whileTap={config.enableAnimations ? { scale: 0.95 } : undefined}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all min-w-[70px] min-h-[60px] relative ${
                      activeMobileTab === 'properties' 
                        ? 'bg-orange-400/20 border border-orange-400/50 text-orange-300' 
                        : hasSelection ? 'text-orange-300 bg-orange-400/10' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveMobileTab(activeMobileTab === 'properties' ? 'canvas' : 'properties')}
                  >
                    <Settings size={20} />
                    <span className="text-xs mt-1 font-medium">Edit</span>
                    {hasSelection && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </motion.button>

                  {/* Help Tab */}
                  <motion.button
                    whileHover={config.enableAnimations ? { scale: 1.05 } : undefined}
                    whileTap={config.enableAnimations ? { scale: 0.95 } : undefined}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all min-w-[70px] min-h-[60px] ${
                      activeMobileTab === 'help' 
                        ? 'bg-orange-400/20 border border-orange-400/50 text-orange-300' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveMobileTab(activeMobileTab === 'help' ? 'canvas' : 'help')}
                  >
                    <Info size={20} />
                    <span className="text-xs mt-1 font-medium">Help</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Subtle Particle Effect Overlay - Only on high performance */}
      {config.shadowQuality === 'high' && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {[...Array(isMobile ? 5 : 20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-orange-400/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={config.enableAnimations ? {
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              } : false}
              transition={config.enableAnimations ? {
                duration: 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              } : { duration: 0.01 }}
            />
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Panel */}
      <Suspense fallback={<LoadingSpinner />}>
        <KeyboardShortcutsPanel />
      </Suspense>
      
      {/* Rust Fallback Diagnostic (only in development) */}
      {process.env.NODE_ENV === 'development' && <RustFallbackDiagnostic />}

      {/* Tauri Connection Test - Removed since we migrated to standalone HTTP server */}
      {/* {process.env.NODE_ENV === 'development' && <TauriConnectionTest />} */}

      <FeedbackButton />
    </div>
  );
}

// Shared Canvas Content Component with performance config
const CanvasContent: React.FC<{ config: any }> = ({ config }) => (
  <>
    {/* Grid Pattern Overlay */}
    {config.shadowQuality !== 'low' && (
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(250, 149, 73, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(250, 149, 73, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        ></div>
      </div>
    )}
    
    {/* Main Canvas */}
    <div className="relative z-10 h-full" data-drop-target="true">
      <FactoryCanvas />
    </div>
    
    {/* Corner Decorative Elements - Only on medium+ performance */}
    {config.shadowQuality !== 'low' && (
      <>
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-orange-400/40"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-orange-400/40"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-orange-400/40"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-orange-400/40"></div>
      </>
    )}
  </>
);

// Mobile Help Panel Component
const MobileHelpPanel: React.FC = () => {
  const { config } = usePerformanceMode();
  const panelClass = config.enableBackdropBlur ? 'glass-panel' : 'glass-panel-solid';
  
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📱</div>
          <h2 className="text-2xl font-bold gradient-text mb-2">Mobile Guide</h2>
          <p className="text-slate-400">How to use neXus on your phone</p>
        </div>

        {/* Basic Controls */}
        <div className={panelClass + " p-4"}>
          <h3 className="font-bold text-orange-300 mb-3 flex items-center gap-2">
            <Home size={16} />
            Basic Controls
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">👆</span>
              <span className="text-slate-300">Tap to select objects</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🤏</span>
              <span className="text-slate-300">Pinch to zoom in/out</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">👆👆</span>
              <span className="text-slate-300">Double-tap to toggle zoom</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">👋</span>
              <span className="text-slate-300">Drag to pan the canvas</span>
            </div>
          </div>
        </div>

        {/* Building */}
        <div className={panelClass + " p-4"}>
          <h3 className="font-bold text-orange-300 mb-3 flex items-center gap-2">
            <Package size={16} />
            Building
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">📱</span>
              <span className="text-slate-300">Tap buildings to place at origin</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">👆</span>
              <span className="text-slate-300">Hold & drag to canvas for precise placement</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">📳</span>
              <span className="text-slate-300">Feel haptic feedback when dropping</span>
            </div>
          </div>
        </div>

        {/* Drawing */}
        <div className={panelClass + " p-4"}>
          <h3 className="font-bold text-orange-300 mb-3 flex items-center gap-2">
            <Settings size={16} />
            Drawing Systems
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              <span className="text-slate-300">Use drawing tools from floating menu</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">👆</span>
              <span className="text-slate-300">Tap canvas to place points</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <span className="text-slate-300">Drawing controls appear at bottom</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">❌</span>
              <span className="text-slate-300">Finish or cancel with bottom controls</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className={panelClass + " p-4"}>
          <h3 className="font-bold text-orange-300 mb-3 flex items-center gap-2">
            <Info size={16} />
            Navigation
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏠</span>
              <span className="text-slate-300">Canvas - Main drawing area</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="text-slate-300">Build - Select buildings to place</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              <span className="text-slate-300">Edit - Properties when selected</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">ℹ️</span>
              <span className="text-slate-300">Help - This screen</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className={panelClass + " p-4 border-green-400/20 bg-green-400/5"}>
          <h3 className="font-bold text-green-300 mb-3">💡 Pro Tips</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div>• Drawing controls appear at bottom during drawing</div>
            <div>• Green dot means something is selected</div>
            <div>• Objects snap to grid automatically</div>
            <div>• Zoom in for more precise placement</div>
            <div>• Canvas stays visible during drawing</div>
          </div>
        </div>
        
        {/* Performance Mode Info */}
        <div className={panelClass + " p-4 border-blue-400/20 bg-blue-400/5"}>
          <h3 className="font-bold text-blue-300 mb-3">⚡ Performance Mode</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div>Current mode: <span className="text-orange-300 font-bold">{config.shadowQuality === 'high' ? 'High Quality' : config.shadowQuality === 'medium' ? 'Balanced' : 'Performance'}</span></div>
            <div>• Access performance settings in the menu</div>
            <div>• Auto mode detects your device capabilities</div>
            <div>• Lower settings for smoother experience</div>
          </div>
        </div>
      </div>
    </div>
  );
};