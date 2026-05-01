// src/components/UI/Toolbar.tsx - Updated with Performance Mode Toggle

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3, Grid2x2, Move, MousePointer, Trash2, Save, Upload, RotateCw, Layers, Heart, Menu, X, Settings, Eye, EyeOff, Zap, Check, Undo2, Redo2 } from 'lucide-react';
import { FloorSelector } from './FloorSelector';
import { useLayoutStore } from '../../store/layoutStore';
import { Tool } from '../../types';

type PerformanceMode = 'auto' | 'high' | 'medium' | 'low';

interface ToolbarProps {
  performanceMode?: PerformanceMode;
  onPerformanceModeChange?: (mode: PerformanceMode) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  performanceMode = 'auto', 
  onPerformanceModeChange 
}) => {
  const { 
    selectedTool, 
    setSelectedTool, 
    showGrid, 
    showFloorBelow,
    gridSnappingEnabled,
    toggleGrid,
    toggleFloorBelow,
    toggleGridSnapping,
    clearLayout,
    exportLayout, 
    importLayout,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryDescription
  } = useLayoutStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPerformanceDropdown, setShowPerformanceDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Monitor screen size changes
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const tools: Array<{
    id: Tool;
    icon: React.ComponentType<{ size?: number }>;
    label: string;
  }> = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'move', icon: Move, label: 'Pan' },
    { id: 'rotate', icon: RotateCw, label: 'Rotate' },
    { id: 'delete', icon: Trash2, label: 'Delete' }
  ];
  
  const performanceModes: Array<{
    id: PerformanceMode;
    label: string;
    description: string;
    icon: string;
  }> = [
    { id: 'auto', label: 'Auto-detect', description: 'Automatic optimization', icon: '🔄' },
    { id: 'high', label: 'High Quality', description: 'All effects enabled', icon: '🚀' },
    { id: 'medium', label: 'Balanced', description: 'Good performance & quality', icon: '⚖️' },
    { id: 'low', label: 'Performance', description: 'Best for mobile/low-end', icon: '⚡' }
  ];
  
  const handleExport = () => {
    const data = exportLayout();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'factory-layout.json';
    a.click();
    setIsMobileMenuOpen(false);
  };
  
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.slt';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        const startTime = performance.now();
        const fileSize = file.size;
        
        try {
          const success = await importLayout(e.target.result);
          const loadTime = performance.now() - startTime;
          
          if (success) {
            // Log performance metrics
            if (fileSize > 1024 * 1024) { // Log for files > 1MB
              console.log(`Loaded ${(fileSize / 1024 / 1024).toFixed(2)}MB file in ${(loadTime / 1000).toFixed(2)}s`);
            }
          }
        } catch (error) {
          console.error('Import failed:', error);
          alert('Failed to import save file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
    setIsMobileMenuOpen(false);
  };
  
  const handleClearLayout = () => {
    if (window.confirm('Are you sure you want to clear the entire layout?')) {
      clearLayout();
    }
    setIsMobileMenuOpen(false);
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleToggleGrid = () => {
    toggleGrid();
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleToggleFloorBelow = () => {
    toggleFloorBelow();
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleToggleGridSnapping = () => {
    toggleGridSnapping();
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };
  
  const handlePerformanceModeChange = (mode: PerformanceMode) => {
    onPerformanceModeChange?.(mode);
    setShowPerformanceDropdown(false);
    setIsMobileMenuOpen(false);
  };
  
  // Get current performance mode info
  const currentPerformanceMode = performanceModes.find(m => m.id === performanceMode) || performanceModes[0];
  
  if (isMobile) {
    return (
      <div className="px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          {/* Left Section - Title and Floor Selector */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-shrink-0"
            >
              <h1 className="text-lg font-bold gradient-text tracking-wider" 
                  style={{ fontFamily: 'Orbitron, monospace', fontWeight: 800 }}>
                neXus
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex-shrink-0"
            >
              <FloorSelector />
            </motion.div>
          </div>
          
          {/* Right Section - Menu Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button p-3 text-sm transition-all focus-ring flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
        
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Mobile Menu */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-full left-0 right-0 z-[110] mx-4 mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="glass-panel p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Performance Mode Section - Prominent placement */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-blue-300 tracking-wider flex items-center gap-2">
                      <Zap size={16} />
                      PERFORMANCE MODE
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {performanceModes.map((mode) => (
                        <motion.button
                          key={mode.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            sci-fi-button p-3 text-xs transition-all duration-300 focus-ring flex flex-col items-center gap-1 min-h-[70px]
                            ${performanceMode === mode.id ? 'active glow-blue border-blue-400' : 'hover:glow-blue'}
                          `}
                          onClick={() => handlePerformanceModeChange(mode.id)}
                        >
                          <span className="text-lg">{mode.icon}</span>
                          <span className="font-medium">{mode.label}</span>
                          {performanceMode === mode.id && (
                            <Check size={12} className="text-green-400" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 text-center p-2 glass-panel bg-blue-400/5">
                      Current: <span className="text-blue-300 font-medium">{currentPerformanceMode.label}</span>
                      <br />
                      {currentPerformanceMode.description}
                    </div>
                  </div>
                  
                  {/* Tools Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-orange-300 tracking-wider">CANVAS TOOLS</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = selectedTool === tool.id;
                        
                        return (
                          <motion.button
                            key={tool.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              sci-fi-button p-4 text-sm transition-all duration-300 focus-ring flex flex-col items-center gap-2 min-h-[80px]
                              ${isActive ? 'active glow-orange border-orange-400' : 'hover:glow-blue'}
                            `}
                            onClick={() => handleToolSelect(tool.id)}
                          >
                            <Icon size={24} />
                            <span className="text-xs font-medium">{tool.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* View Options */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-orange-300 tracking-wider">VIEW OPTIONS</h3>
                    <div className="space-y-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          sci-fi-button p-4 text-sm transition-all focus-ring flex items-center justify-between w-full
                          ${showGrid ? 'active glow-orange border-orange-400' : 'hover:glow-blue'}
                        `}
                        onClick={handleToggleGrid}
                      >
                        <div className="flex items-center gap-3">
                          <Grid3x3 size={20} />
                          <span>Grid</span>
                        </div>
                        {showGrid ? <Eye size={16} /> : <EyeOff size={16} />}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          sci-fi-button p-4 text-sm transition-all focus-ring flex items-center justify-between w-full
                          ${showFloorBelow ? 'active glow-orange border-orange-400' : 'hover:glow-blue'}
                        `}
                        onClick={handleToggleFloorBelow}
                      >
                        <div className="flex items-center gap-3">
                          <Layers size={20} />
                          <span>Floor Below</span>
                        </div>
                        {showFloorBelow ? <Eye size={16} /> : <EyeOff size={16} />}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          sci-fi-button p-4 text-sm transition-all focus-ring flex items-center justify-between w-full
                          ${gridSnappingEnabled ? 'active glow-orange border-orange-400' : 'hover:glow-blue'}
                        `}
                        onClick={handleToggleGridSnapping}
                      >
                        <div className="flex items-center gap-3">
                          <Grid2x2 size={20} />
                          <span>Grid Snapping</span>
                        </div>
                        {gridSnappingEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* File Operations */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-orange-300 tracking-wider">FILE OPERATIONS</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            sci-fi-button p-4 text-sm transition-all focus-ring flex flex-col items-center gap-2
                            ${!canUndo() ? 'opacity-50 cursor-not-allowed' : 'hover:glow-blue'}
                          `}
                          onClick={undo}
                          disabled={!canUndo()}
                        >
                          <Undo2 size={20} />
                          <span>Undo</span>
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            sci-fi-button p-4 text-sm transition-all focus-ring flex flex-col items-center gap-2
                            ${!canRedo() ? 'opacity-50 cursor-not-allowed' : 'hover:glow-blue'}
                          `}
                          onClick={redo}
                          disabled={!canRedo()}
                        >
                          <Redo2 size={20} />
                          <span>Redo</span>
                        </motion.button>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="sci-fi-button p-4 text-sm transition-all focus-ring hover:glow-blue flex items-center gap-3 w-full"
                        onClick={handleExport}
                      >
                        <Save size={20} />
                        <span>Export Layout</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="sci-fi-button p-4 text-sm transition-all focus-ring hover:glow-blue flex items-center gap-3 w-full"
                        onClick={handleImport}
                      >
                        <Upload size={20} />
                        <span>Import Layout</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="sci-fi-button p-4 text-sm transition-all focus-ring border-red-400/40 bg-red-400/10 hover:bg-red-400/20 flex items-center gap-3 w-full"
                        onClick={handleClearLayout}
                      >
                        <Trash2 size={20} />
                        <span>Clear All</span>
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Support Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-orange-300 tracking-wider">SUPPORT</h3>
                    <motion.a
                      href="https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="sci-fi-button p-4 text-sm transition-all focus-ring border-pink-400/40 bg-pink-400/10 hover:bg-pink-400/20 flex items-center justify-center gap-3 min-h-[60px] w-full"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Heart size={24} className="fill-current" />
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-semibold">Support Development</span>
                        <span className="text-xs text-slate-400">Help keep this tool free</span>
                      </div>
                    </motion.a>
                  </div>
                  
                  {/* Credits */}
                  <div className="text-center text-xs text-slate-400 pt-3 border-t border-orange-400/20">
                    Made with ❤️ for FICSIT
                  </div>
                  
                  {/* Close Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="sci-fi-button p-3 text-sm transition-all focus-ring w-full flex items-center justify-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X size={18} />
                    <span>Close Menu</span>
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left Section - Title and Floor Selector */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-lg md:text-xl font-bold gradient-text tracking-wider" 
                style={{ fontFamily: 'Orbitron, monospace', fontWeight: 800 }}>
              neXus Satisfactory Planner
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <FloorSelector />
          </motion.div>
          
          {/* Desktop Tool Buttons */}
          <div className="flex gap-1">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              const isActive = selectedTool === tool.id;
              
              return (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    sci-fi-button p-2.5 text-sm transition-all duration-300 focus-ring
                    ${isActive ? 'active glow-orange' : 'hover:glow-blue'}
                  `}
                  onClick={() => setSelectedTool(tool.id)}
                  title={tool.label}
                >
                  <Icon size={18} />
                </motion.button>
              );
            })}
          </div>
          
          {/* Undo/Redo Buttons */}
          <div className="flex gap-1 ml-2">
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                sci-fi-button p-2.5 text-sm transition-all duration-300 focus-ring
                ${!canUndo() ? 'opacity-50 cursor-not-allowed' : 'hover:glow-blue'}
              `}
              onClick={undo}
              disabled={!canUndo()}
              title={canUndo() ? `Undo ${getHistoryDescription().past || ''}` : 'Nothing to undo'}
            >
              <Undo2 size={18} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                sci-fi-button p-2.5 text-sm transition-all duration-300 focus-ring
                ${!canRedo() ? 'opacity-50 cursor-not-allowed' : 'hover:glow-blue'}
              `}
              onClick={redo}
              disabled={!canRedo()}
              title={canRedo() ? `Redo ${getHistoryDescription().future || ''}` : 'Nothing to redo'}
            >
              <Redo2 size={18} />
            </motion.button>
          </div>
        </div>
        
        {/* Right Section - Desktop Controls */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Performance Mode Dropdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="relative"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                sci-fi-button px-3 py-2 text-xs transition-all focus-ring flex items-center gap-2
                ${showPerformanceDropdown ? 'active glow-blue' : 'hover:glow-blue'}
              `}
              onClick={() => setShowPerformanceDropdown(!showPerformanceDropdown)}
            >
              <Settings size={14} />
              <span className="hidden sm:inline">{currentPerformanceMode.icon} {currentPerformanceMode.label}</span>
              <span className="sm:hidden">Perf</span>
            </motion.button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {showPerformanceDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 right-0 z-[200] min-w-[220px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="glass-panel p-2 space-y-1">
                    <div className="text-xs font-bold text-blue-300 px-3 py-2 tracking-wider">
                      PERFORMANCE MODE
                    </div>
                    {performanceModes.map((mode) => (
                      <button
                        key={mode.id}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg transition-all hover:bg-blue-400/10
                          ${performanceMode === mode.id ? 'bg-blue-400/20 text-blue-300' : 'text-slate-300 hover:text-white'}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePerformanceModeChange(mode.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{mode.icon}</span>
                            <div>
                              <div className="text-sm font-medium">{mode.label}</div>
                              <div className="text-xs text-slate-400">{mode.description}</div>
                            </div>
                          </div>
                          {performanceMode === mode.id && (
                            <Check size={16} className="text-green-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <div className="w-px h-8 bg-orange-400/30"></div>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              sci-fi-button px-3 py-2 text-xs transition-all focus-ring
              ${showGrid ? 'active glow-orange' : 'hover:glow-blue'}
            `}
            onClick={toggleGrid}
          >
            <Grid3x3 size={14} className="inline mr-1" />
            <span className="hidden sm:inline">Grid</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              sci-fi-button px-3 py-2 text-xs transition-all focus-ring
              ${showFloorBelow ? 'active glow-orange' : 'hover:glow-blue'}
            `}
            onClick={toggleFloorBelow}
          >
            <Layers size={14} className="inline mr-1" />
            <span className="hidden sm:inline">See Below</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              sci-fi-button px-3 py-2 text-xs transition-all focus-ring
              ${gridSnappingEnabled ? 'active glow-orange' : 'hover:glow-blue'}
            `}
            onClick={toggleGridSnapping}
          >
            <Grid2x2 size={14} className="inline mr-1" />
            <span className="hidden sm:inline">Snap</span>
          </motion.button>
          
          <div className="w-px h-8 bg-orange-400/30 mx-1"></div>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button px-3 py-2 text-xs transition-all focus-ring border-red-400/40 bg-red-400/10 hover:bg-red-400/20"
            onClick={handleClearLayout}
          >
            <Trash2 size={14} className="inline mr-1" />
            <span className="hidden sm:inline">Clear</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button px-3 py-2 text-xs transition-all focus-ring hover:glow-blue"
            onClick={handleExport}
          >
            <Save size={14} className="inline mr-1" />
            <span className="hidden sm:inline">Export</span>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button px-3 py-2 text-xs transition-all focus-ring hover:glow-blue"
            onClick={handleImport}
          >
            <Upload size={14} className="inline mr-1" />
            <span className="hidden sm:inline">Import</span>
          </motion.button>
          
          <div className="w-px h-8 bg-orange-400/30 mx-1"></div>
          
          {/* Donate Button */}
          <motion.a
            href="https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button px-3 py-2 text-xs transition-all focus-ring border-pink-400/40 bg-pink-400/10 hover:bg-pink-400/20 inline-flex items-center"
            title="Support the development of this tool"
          >
            <Heart size={14} className="inline mr-1 fill-current" />
            <span className="hidden sm:inline">Donate</span>
          </motion.a>
          
          {/* Made with love text */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className="hidden lg:flex items-center text-xs text-slate-400 ml-3"
            style={{
              textShadow: `
                0 0 3px rgba(0, 0, 0, 0.5),
                -1px -1px 0.5px rgba(200, 200, 200, 0.35),
                1px 1px 2px rgba(0, 0, 0, 0.9)
              `,
              letterSpacing: '-0.04em',
            }}
          >
            Made with ❤️ for FICSIT
          </motion.div>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {showPerformanceDropdown && (
        <div
          className="fixed inset-0 z-[150]"
          onClick={() => setShowPerformanceDropdown(false)}
        />
      )}
    </div>
  );
};