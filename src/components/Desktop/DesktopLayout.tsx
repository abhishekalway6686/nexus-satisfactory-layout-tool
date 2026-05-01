import React, { useState, useCallback, useRef, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useLayoutStore } from '../../store/layoutStore';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAutoUpdater } from '../../hooks/useAutoUpdater';
import { MenuBar } from './MenuBar';
import { DesktopToolbar } from './DesktopToolbar';
import { StatusBar } from './StatusBar';
import { ResizablePanel } from './ResizablePanel';
import { ContextMenu } from './ContextMenu';
import { FactoryCanvas } from '../Canvas/FactoryCanvas';
import { Keyboard } from 'lucide-react';
import { RustFallbackDiagnostic } from '../UI/RustFallbackDiagnostic';
import { FeedbackButton } from '../UI/FeedbackButton';
import { UpdateNotification } from '../UI/UpdateNotification';
import { DonationNudge } from '../UI/DonationNudge';
import { ReleaseNotes } from '../UI/ReleaseNotes';

// Lazy load panels for better performance
const BuildingPalette = lazy(() => import('../UI/BuildingPalette'));
const PropertiesPanel = lazy(() => import('../UI/PropertiesPanel'));
const KeyboardShortcutsPanel = lazy(() => import('../UI/KeyboardShortcutsPanel'));
const ProductionPanel = lazy(() => import('../UI/ProductionPanel'));

interface DesktopLayoutProps {
  children?: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ children }) => {
  const { mode, setPerformanceMode, config, detectedMode, currentFPS, reportBuildingCount } = usePerformanceMode();
  const { checkForUpdates, checking: updateChecking } = useAutoUpdater();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [worldMousePosition, setWorldMousePosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target?: any } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const {
    buildingPanelWidth,
    setBuildingPanelWidth,
    propertiesPanelWidth,
    setPropertiesPanelWidth,
    selectedBuilding,
    selectedPole,
    selectedPipeSupport,
    selectedStickyNote,
    buildings,
    isProductionPanelOpen,
    isProductionPanelPinned,
    setProductionPanelOpen,
    toggleProductionPanelPinned
  } = useLayoutStore();

  // Report building count to performance hook for auto-adjustment
  useEffect(() => {
    reportBuildingCount(buildings.length);
  }, [buildings.length, reportBuildingCount]);

  // Handle mouse position tracking with world coordinates
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      setMousePosition({
        x: screenX,
        y: screenY
      });
      
      // Calculate world coordinates (in meters)
      // Using PIXELS_PER_METER = 10 from constants
      const PIXELS_PER_METER = 10;
      const worldX = (screenX - canvasPosition.x) / zoom / PIXELS_PER_METER;
      const worldY = (screenY - canvasPosition.y) / zoom / PIXELS_PER_METER;
      
      setWorldMousePosition({
        x: worldX,
        y: worldY
      });
    }
  }, [zoom, canvasPosition]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Determine what was clicked
    const target = e.target as HTMLElement;
    const contextTarget = { type: 'canvas' as const };
    
    // Check if a building was clicked (you'd need to implement this logic)
    // For now, just show canvas context menu
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: contextTarget
    });
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show keyboard shortcuts with F1
      if (e.key === 'F1') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      
      // Zoom controls
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
        }
      }
      
      // Fullscreen with F11
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset, handleToggleFullscreen]);

  const hasSelection = selectedBuilding || selectedPole || selectedPipeSupport || selectedStickyNote;

  // Loading component
  const LoadingPanel = () => (
    <div className="flex items-center justify-center h-full">
      <div className="loading-spinner"></div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Menu Bar */}
      <MenuBar
        performanceMode={mode}
        detectedMode={detectedMode}
        currentFPS={currentFPS}
        onPerformanceModeChange={setPerformanceMode}
        onCheckForUpdates={checkForUpdates}
        isCheckingForUpdates={updateChecking}
      />

      {/* Update Notification */}
      <UpdateNotification />

      {/* Toolbar */}
      <DesktopToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Building Palette */}
        <ResizablePanel
          side="left"
          width={buildingPanelWidth}
          minWidth={260}
          maxWidth={450}
          onWidthChange={setBuildingPanelWidth}
          className="z-30"
        >
          <Suspense fallback={<LoadingPanel />}>
            <BuildingPalette />
          </Suspense>
        </ResizablePanel>

        {/* Center - Canvas Area */}
        <div 
          ref={canvasRef}
          className="flex-1 relative bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800"
          data-canvas-area="true"
          onMouseMove={handleMouseMove}
          onContextMenu={handleContextMenu}
        >
          {/* Grid overlay for desktop */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(250, 149, 73, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(250, 149, 73, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            />
          </div>

          {/* Canvas */}
          <div className="relative h-full">
            {children || <FactoryCanvas 
              onPositionChange={setCanvasPosition} 
              onZoomChange={setZoom} 
              leftPanelWidth={buildingPanelWidth}
              rightPanelWidth={propertiesPanelWidth}
            />}
          </div>

          {/* Corner markers for professional look */}
          <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-orange-400/30 pointer-events-none" />
          <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-orange-400/30 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-orange-400/30 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-orange-400/30 pointer-events-none" />

          {/* Zoom indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-md text-sm text-slate-300"
          >
            Zoom: {Math.round(zoom * 100)}%
          </motion.div>
        </div>

        {/* Right Panel - Properties */}
        <ResizablePanel
          side="right"
          title="Properties"
          width={propertiesPanelWidth}
          minWidth={280}
          maxWidth={500}
          onWidthChange={setPropertiesPanelWidth}
          className="z-30"
        >
          <Suspense fallback={<LoadingPanel />}>
            <PropertiesPanel />
          </Suspense>
        </ResizablePanel>
      </div>

      {/* Status Bar */}
      <StatusBar 
        mousePosition={mousePosition}
        worldMousePosition={worldMousePosition}
        zoom={zoom}
        performanceMode={mode}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          onClick={() => setShowKeyboardShortcuts(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Keyboard size={20} />
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-3">General</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">New Layout</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+N</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Open</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+O</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Save</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+S</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Undo</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+Z</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Redo</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+Y</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-3">Tools</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Select Tool</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">V</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Pan Tool</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">H</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Rotate</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">R</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Delete</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Delete</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-3">View</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Toggle Grid</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">G</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Toggle Floor Below</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">B</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Zoom In</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl++</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Zoom Out</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+-</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Reset Zoom</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+0</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-orange-400 mb-3">Drawing</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Draw Conveyor</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">C</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Draw Pipeline</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">P</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Draw Railway</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">R</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Cancel Drawing</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Esc</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Keyboard Shortcuts Panel */}
      <Suspense fallback={null}>
        <KeyboardShortcutsPanel />
      </Suspense>

      {/* Production Panel */}
      <Suspense fallback={null}>
        <ProductionPanel
          isOpen={isProductionPanelOpen}
          onClose={() => setProductionPanelOpen(false)}
          isPinned={isProductionPanelPinned}
          onPinToggle={toggleProductionPanelPinned}
        />
      </Suspense>

      {/* Rust Fallback Diagnostic (only in development) */}
      {process.env.NODE_ENV === 'development' && <RustFallbackDiagnostic />}

      <FeedbackButton />

      {/* Donation Nudge - shows periodically */}
      <DonationNudge />

      {/* Release Notes - shows on first launch after update */}
      <ReleaseNotes />
    </div>
  );
};