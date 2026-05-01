// src/components/UI/MobileDrawingControls.tsx - Mobile-specific drawing controls

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RotateCw, Square, Zap, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';

export const MobileDrawingControls: React.FC = () => {
  const { 
    drawingState,
    conveyorMode,
    setConveyorMode,
    finishConveyorDrawing,
    cancelDrawing,
    finishPipeDrawing,
    cancelPipeDrawing,
    finishRailwayDrawing,
    cancelRailwayDrawing,
    finishFoundationDrawing,
    cancelFoundationDrawing,
    finishWallDrawing,
    cancelWallDrawing
  } = useLayoutStore();

  const [showHelp, setShowHelp] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-show help for first 3 seconds, then minimize
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Determine drawing type and progress
  const getDrawingInfo = () => {
    if (drawingState.drawingRailway) {
      return {
        type: '🚂 Railway Track',
        progress: `${drawingState.railwayPath?.length || 0} points placed`,
        canFinish: (drawingState.railwayPath?.length || 0) >= 2,
        color: 'slate',
        icon: '🚂'
      };
    } else if (drawingState.drawingPipe) {
      return {
        type: '🚰 Fluid Pipeline',
        progress: `${drawingState.pipePath?.length || 0} supports placed`,
        canFinish: (drawingState.pipePath?.length || 0) >= 2,
        color: 'blue',
        icon: '🚰'
      };
    } else if (drawingState.isDrawing) {
      return {
        type: '⚙️ Conveyor Belt',
        progress: `${drawingState.currentPath.length} poles placed`,
        canFinish: drawingState.currentPath.length >= 2,
        color: 'orange',
        icon: '⚙️'
      };
    } else if (drawingState.drawingFoundation) {
      return {
        type: '🏗️ Foundation',
        progress: drawingState.foundationStartPoint ? 'Drag to set size' : 'Click to start',
        canFinish: drawingState.foundationStartPoint !== undefined,
        color: 'gray',
        icon: '🏗️'
      };
    } else if (drawingState.drawingWall) {
      return {
        type: '🧱 Wall',
        progress: `${drawingState.wallSegments?.length || 0} segments`,
        canFinish: (drawingState.wallSegments?.length || 0) >= 1,
        color: 'gray',
        icon: '🧱'
      };
    }
    return null;
  };

  const drawingInfo = getDrawingInfo();
  
  if (!drawingInfo) return null;

  const handleFinish = () => {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    
    if (drawingState.drawingRailway) {
      finishRailwayDrawing();
    } else if (drawingState.drawingPipe) {
      finishPipeDrawing();
    } else if (drawingState.isDrawing) {
      finishConveyorDrawing();
    } else if (drawingState.drawingFoundation) {
      // For foundation, we need to provide a default material
      const mousePos = { x: 0, y: 0 }; // This would need proper implementation
      finishFoundationDrawing(mousePos, 'default');
    } else if (drawingState.drawingWall) {
      finishWallDrawing('default');
    }
  };

  const handleCancel = () => {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    
    if (drawingState.drawingRailway) {
      cancelRailwayDrawing();
    } else if (drawingState.drawingPipe) {
      cancelPipeDrawing();
    } else if (drawingState.drawingFoundation) {
      cancelFoundationDrawing();
    } else if (drawingState.drawingWall) {
      cancelWallDrawing();
    } else if (drawingState.isDrawing) {
      cancelDrawing();
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-400/50',
          text: 'text-blue-300',
          glow: 'glow-blue'
        };
      case 'slate':
        return {
          bg: 'bg-slate-500/20',
          border: 'border-slate-400/50',
          text: 'text-slate-300',
          glow: 'glow-green'
        };
      case 'gray':
        return {
          bg: 'bg-gray-500/20',
          border: 'border-gray-400/50',
          text: 'text-gray-300',
          glow: 'glow-gray'
        };
      default: // orange
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-400/50',
          text: 'text-orange-300',
          glow: 'glow-orange'
        };
    }
  };

  const colors = getColorClasses(drawingInfo.color);

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom pointer-events-none"
    >
      {/* Main Control Panel */}
      <div className={`glass-panel border-t ${colors.border} backdrop-blur-xl pointer-events-auto`}>
        {/* Minimize/Expand Button */}
        <div className="flex justify-center py-2 border-b border-white/10">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="text-slate-400 hover:text-slate-200 p-2"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </motion.button>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Status Header */}
              <div className="p-4 text-center border-b border-white/10">
                <div className={`text-lg font-bold ${colors.text} mb-2 flex items-center justify-center gap-3`}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap size={24} />
                  </motion.div>
                  {drawingInfo.type}
                </div>
                <div className="text-sm text-slate-400">
                  {drawingInfo.progress}
                </div>
                {!drawingInfo.canFinish && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Place at least 2 points to finish
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-4 border-b border-white/10">
                <div className="text-center space-y-2">
                  <div className="text-2xl mb-2">{drawingInfo.icon}</div>
                  <div className="text-sm font-medium text-slate-300">
                    Tap canvas to continue drawing
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Tap empty areas to place new points</div>
                    <div>• Tap existing poles/supports to connect</div>
                    <div>• Use controls below when ready</div>
                  </div>
                </div>
              </div>

              {/* Conveyor Mode Toggle (only for conveyors) */}
              {drawingState.isDrawing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 border-b border-white/10"
                >
                  <div className="text-xs font-bold text-orange-300 mb-3 text-center tracking-wider">
                    CONVEYOR MODE
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        sci-fi-button p-4 text-sm transition-all min-h-[60px] flex flex-col items-center gap-2
                        ${conveyorMode === 'default' 
                          ? 'active bg-orange-500/30 border-orange-400 glow-orange' 
                          : 'hover:bg-orange-500/20'
                        }
                      `}
                      onClick={() => setConveyorMode('default')}
                    >
                      <RotateCw size={20} />
                      <span className="text-xs font-medium">Auto Curves</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        sci-fi-button p-4 text-sm transition-all min-h-[60px] flex flex-col items-center gap-2
                        ${conveyorMode === 'straight' 
                          ? 'active bg-orange-500/30 border-orange-400 glow-orange' 
                          : 'hover:bg-orange-500/20'
                        }
                      `}
                      onClick={() => setConveyorMode('straight')}
                    >
                      <Square size={20} />
                      <span className="text-xs font-medium">Straight Only</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="p-4 grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    sci-fi-button p-4 text-base font-medium transition-all min-h-[64px] flex items-center justify-center gap-3
                    ${drawingInfo.canFinish 
                      ? 'bg-green-500/30 border-green-400/70 text-green-200 hover:bg-green-500/40 glow-green' 
                      : 'bg-slate-600/20 border-slate-600/30 text-slate-500 cursor-not-allowed'
                    }
                  `}
                  onClick={handleFinish}
                  disabled={!drawingInfo.canFinish}
                >
                  <CheckCircle size={24} />
                  <span>Finish</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="sci-fi-button p-4 text-base font-medium transition-all min-h-[64px] bg-red-500/30 border-red-400/70 text-red-200 hover:bg-red-500/40 glow-red flex items-center justify-center gap-3"
                  onClick={handleCancel}
                >
                  <XCircle size={24} />
                  <span>Cancel</span>
                </motion.button>
              </div>

              {/* Help Toggle */}
              <div className="p-2 border-t border-white/10">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full sci-fi-button p-2 text-sm flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200"
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle size={16} />
                  {showHelp ? 'Hide Help' : 'Show Drawing Help'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized State */}
        {isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className={colors.text}
                >
                  <Zap size={20} />
                </motion.div>
                <div>
                  <div className={`font-bold ${colors.text} text-sm`}>
                    {drawingInfo.type}
                  </div>
                  <div className="text-xs text-slate-400">
                    {drawingInfo.progress}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className={`
                    sci-fi-button p-2 text-sm
                    ${drawingInfo.canFinish 
                      ? 'bg-green-500/30 border-green-400/70 text-green-200 glow-green' 
                      : 'bg-slate-600/20 border-slate-600/30 text-slate-500 cursor-not-allowed'
                    }
                  `}
                  onClick={handleFinish}
                  disabled={!drawingInfo.canFinish}
                >
                  <CheckCircle size={16} />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="sci-fi-button p-2 text-sm bg-red-500/30 border-red-400/70 text-red-200 glow-red"
                  onClick={handleCancel}
                >
                  <XCircle size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Help Overlay */}
      <AnimatePresence>
        {showHelp && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-4 right-4 mb-2 pointer-events-auto"
          >
            <div className="glass-panel p-4 border border-yellow-400/30 bg-yellow-400/5">
              <div className="text-sm font-bold text-yellow-300 mb-3 flex items-center gap-2">
                <HelpCircle size={16} />
                Drawing Help
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400">👆</span>
                  <span><strong>Tap empty canvas:</strong> Place new {drawingState.isDrawing ? 'poles' : drawingState.drawingPipe ? 'supports' : 'points'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">🎯</span>
                  <span><strong>Tap existing {drawingState.isDrawing ? 'poles' : drawingState.drawingPipe ? 'supports' : 'stations'}:</strong> Connect and finish</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400">🤏</span>
                  <span><strong>Pinch:</strong> Zoom in/out for precision</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400">📳</span>
                  <span><strong>Vibration:</strong> Confirms successful actions</span>
                </div>
                {drawingState.isDrawing && (
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400">⚙️</span>
                    <span><strong>Curve Mode:</strong> Auto-creates curves at turns 45°</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};