// src/components/UI/OverlayToolbar.tsx - Completely simplified for mobile with better UX

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, Car, StickyNote, Settings, X, CornerDownRight, Minus } from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';
import { Tool } from '../../types';

interface ToolDefinition {
  id: Tool;
  icon: React.ComponentType<{ size?: number }> | (() => React.JSX.Element);
  label: string;
  disabled?: boolean;
  color?: string;
}

// Reusable icon components with consistent sizing
const ConveyorIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="9" width="16" height="2" fill="currentColor" rx="1"/>
    <rect x="4" y="8" width="2" height="4" fill="currentColor" opacity="0.6"/>
    <rect x="8" y="8" width="2" height="4" fill="currentColor" opacity="0.6"/>
    <rect x="12" y="8" width="2" height="4" fill="currentColor" opacity="0.6"/>
    <rect x="16" y="8" width="2" height="4" fill="currentColor" opacity="0.6"/>
    <path d="M15 10L13 8V12L15 10Z" fill="currentColor"/>
  </svg>
);

const ConveyorPoleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="4" width="2" height="12" fill="currentColor"/>
    <rect x="6" y="5" width="8" height="2" fill="currentColor" opacity="0.6"/>
    <circle cx="10" cy="6" r="2" fill="currentColor"/>
    <rect x="8" y="14" width="4" height="2" fill="currentColor" opacity="0.8"/>
  </svg>
);

const PipeIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="16" height="4" fill="currentColor" rx="2"/>
    <rect x="4" y="9" width="12" height="2" fill="currentColor" opacity="0.4" rx="1"/>
    <circle cx="6" cy="10" r="1" fill="currentColor" opacity="0.6"/>
    <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.6"/>
    <circle cx="14" cy="10" r="1" fill="currentColor" opacity="0.6"/>
  </svg>
);

const PipeSupportIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6" fill="currentColor"/>
    <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.6"/>
    <rect x="9" y="2" width="2" height="6" fill="currentColor"/>
    <rect x="9" y="12" width="2" height="6" fill="currentColor"/>
    <rect x="2" y="9" width="6" height="2" fill="currentColor"/>
    <rect x="12" y="9" width="6" height="2" fill="currentColor"/>
  </svg>
);

const PipeLiftIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="4" height="12" fill="currentColor" rx="2"/>
    <rect x="6" y="6" width="8" height="2" fill="currentColor" opacity="0.3"/>
    <rect x="6" y="10" width="8" height="2" fill="currentColor" opacity="0.3"/>
    <rect x="6" y="14" width="8" height="2" fill="currentColor" opacity="0.3"/>
    <path d="M10 6L8 4H12L10 6Z" fill="currentColor"/>
    <circle cx="7" cy="5" r="1" fill="currentColor"/>
    <circle cx="13" cy="15" r="1" fill="currentColor"/>
  </svg>
);

const ConveyorLiftIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="4" height="12" fill="currentColor" rx="1"/>
    <rect x="6" y="6" width="8" height="2" fill="currentColor" opacity="0.3"/>
    <rect x="6" y="10" width="8" height="2" fill="currentColor" opacity="0.3"/>
    <rect x="6" y="14" width="8" height="2" fill="currentColor" opacity="0.3"/>
    <path d="M10 6L8 4H12L10 6Z" fill="currentColor"/>
    <circle cx="7" cy="5" r="1" fill="currentColor"/>
    <circle cx="13" cy="15" r="1" fill="currentColor"/>
  </svg>
);

const PowerPoleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="2" height="16" fill="currentColor"/>
    <rect x="4" y="6" width="12" height="2" fill="currentColor"/>
    <rect x="6" y="10" width="8" height="2" fill="currentColor"/>
    <circle cx="5" cy="7" r="1" fill="currentColor"/>
    <circle cx="15" cy="7" r="1" fill="currentColor"/>
    <circle cx="7" cy="11" r="1" fill="currentColor"/>
    <circle cx="13" cy="11" r="1" fill="currentColor"/>
  </svg>
);

const PowerlineIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2L7 10H10L9 18L15 8H11L13 2H11Z" fill="currentColor"/>
  </svg>
);

const FoundationIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="16" height="12" fill="currentColor" opacity="0.3"/>
    <rect x="2" y="4" width="16" height="12" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="6" y1="4" x2="6" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    <line x1="14" y1="4" x2="14" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    <line x1="2" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
  </svg>
);

const WallIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="2" width="4" height="16" fill="currentColor"/>
    <rect x="7" y="6" width="6" height="2" fill="currentColor" opacity="0.5"/>
    <rect x="7" y="10" width="6" height="2" fill="currentColor" opacity="0.5"/>
    <rect x="7" y="14" width="6" height="2" fill="currentColor" opacity="0.5"/>
  </svg>
);

const RailingIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="16" height="1" fill="currentColor"/>
    <rect x="2" y="11" width="16" height="1" fill="currentColor"/>
    <rect x="4" y="6" width="1" height="8" fill="currentColor"/>
    <rect x="9" y="6" width="1" height="8" fill="currentColor"/>
    <rect x="15" y="6" width="1" height="8" fill="currentColor"/>
  </svg>
);

export const OverlayToolbar: React.FC = () => {
  const store = useLayoutStore();
  const {
    selectedTool,
    setSelectedTool,
    conveyorMode,
    setConveyorMode,
    powerPoleTier,
    setPowerPoleTier,
    powerlineRoutingMode,
    setPowerlineRoutingMode,
    drawingState,
    addStickyNote,
    currentFloor
  } = store;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isExpanded, setIsExpanded] = useState(false);

  // Monitor screen size changes
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const desktop = window.innerWidth >= 1024;
      setIsMobile(mobile);
      setIsDesktop(desktop);
      if (!mobile) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStickyNoteClick = () => {
    const note = {
      id: `note-${Date.now()}`,
      x: 20,
      y: 20,
      z: currentFloor * 4,
      floor: currentFloor,
      width: 8,
      height: 6,
      text: 'New Note',
      color: '#ffeb3b',
      rotation: 0 as const
    };
    console.log('Adding sticky note:', note);
    addStickyNote(note);

    if (isMobile) {
      setIsExpanded(false);
    }
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  const handleConveyorModeChange = (mode: 'default' | 'straight') => {
    setConveyorMode(mode);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  // Simplified tool list for mobile
  const mobileTools: Array<ToolDefinition> = [
    {
      id: 'conveyor',
      icon: () => <ConveyorIcon size={24} />,
      label: 'Conveyor',
      color: 'orange'
    },
    {
      id: 'conveyor_pole',
      icon: () => <ConveyorPoleIcon size={24} />,
      label: 'Support',
      color: 'orange'
    },
    {
      id: 'pipe',
      icon: () => <PipeIcon size={24} />,
      label: 'Pipeline',
      color: 'blue'
    },
    {
      id: 'pipe_support',
      icon: () => <PipeSupportIcon size={24} />,
      label: 'Support',
      color: 'blue'
    },
    {
      id: 'pipe_floor_connection',
      icon: () => <PipeLiftIcon size={24} />,
      label: 'Pipe Lift',
      color: 'blue'
    },
    {
      id: 'conveyor_lift',
      icon: () => <ConveyorLiftIcon size={24} />,
      label: 'Lift',
      color: 'purple'
    },
    {
      id: 'railway',
      icon: Train,
      label: 'Railway',
      color: 'slate'
    }
  ];

  // Desktop tools organized by group
  const desktopToolGroups: Array<{
    id: string;
    name: string;
    color: string;
    tools: ToolDefinition[];
  }> = [
    {
      id: 'conveyor',
      name: 'CONVEYOR',
      color: 'orange',
      tools: [
        {
          id: 'conveyor' as Tool,
          icon: () => <ConveyorIcon size={18} />,
          label: 'Belt'
        },
        {
          id: 'conveyor_pole' as Tool,
          icon: () => <ConveyorPoleIcon size={18} />,
          label: 'Support'
        },
      ]
    },
    {
      id: 'pipe',
      name: 'PIPELINE',
      color: 'blue',
      tools: [
        {
          id: 'pipe' as Tool,
          icon: () => <PipeIcon size={18} />,
          label: 'Pipe'
        },
        {
          id: 'pipe_support' as Tool,
          icon: () => <PipeSupportIcon size={18} />,
          label: 'Support'
        },
        {
          id: 'pipe_floor_connection' as Tool,
          icon: () => <PipeLiftIcon size={18} />,
          label: 'Pipe Lift'
        }
      ]
    },
    {
      id: 'transport',
      name: 'TRANSPORT',
      color: 'slate',
      tools: [
        { id: 'railway' as Tool, icon: Train, label: 'Railway' },
        { id: 'truck_path' as Tool, icon: Car, label: 'Truck', disabled: true }
      ]
    },
    {
      id: 'power',
      name: 'POWER',
      color: 'yellow',
      tools: [
        {
          id: 'power_pole' as Tool,
          icon: () => <PowerPoleIcon size={18} />,
          label: 'Pole'
        },
        {
          id: 'powerline' as Tool,
          icon: () => <PowerlineIcon size={18} />,
          label: 'Line'
        }
      ]
    },
    {
      id: 'architecture',
      name: 'ARCHITECTURE',
      color: 'gray',
      tools: [
        {
          id: 'foundation' as Tool,
          icon: () => <FoundationIcon size={18} />,
          label: 'Foundation'
        },
        {
          id: 'wall' as Tool,
          icon: () => <WallIcon size={18} />,
          label: 'Wall'
        },
        {
          id: 'railing' as Tool,
          icon: () => <RailingIcon size={18} />,
          label: 'Railing'
        }
      ]
    }
  ];

  const getGroupColor = (color: string) => {
    switch (color) {
      case 'orange': return {
        border: 'border-orange-400/40',
        bg: 'bg-orange-400/10',
        text: 'text-orange-300',
        hover: 'hover:bg-orange-400/20 hover:border-orange-400/60',
        active: 'bg-orange-400/30 border-orange-400',
        indicator: 'bg-orange-400'
      };
      case 'blue': return {
        border: 'border-blue-400/40',
        bg: 'bg-blue-400/10',
        text: 'text-blue-300',
        hover: 'hover:bg-blue-400/20 hover:border-blue-400/60',
        active: 'bg-blue-400/30 border-blue-400',
        indicator: 'bg-blue-400'
      };
      case 'slate': return {
        border: 'border-slate-400/40',
        bg: 'bg-slate-400/10',
        text: 'text-slate-300',
        hover: 'hover:bg-slate-400/20 hover:border-slate-400/60',
        active: 'bg-slate-400/30 border-slate-400',
        indicator: 'bg-slate-400'
      };
      case 'gray': return {
        border: 'border-gray-400/40',
        bg: 'bg-gray-400/10',
        text: 'text-gray-300',
        hover: 'hover:bg-gray-400/20 hover:border-gray-400/60',
        active: 'bg-gray-400/30 border-gray-400',
        indicator: 'bg-gray-400'
      };
      case 'yellow': return {
        border: 'border-yellow-400/40',
        bg: 'bg-yellow-400/10',
        text: 'text-yellow-300',
        hover: 'hover:bg-yellow-400/20 hover:border-yellow-400/60',
        active: 'bg-yellow-400/30 border-yellow-400',
        indicator: 'bg-yellow-400'
      };
      default: return {
        border: 'border-orange-400/40',
        bg: 'bg-orange-400/10',
        text: 'text-orange-300',
        hover: 'hover:bg-orange-400/20 hover:border-orange-400/60',
        active: 'bg-orange-400/30 border-orange-400',
        indicator: 'bg-orange-400'
      };
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile Quick Tools Floating Button */}
        {!isExpanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            whileTap={{ scale: 0.95 }}
            className="fixed top-4 left-1 z-50 glass-panel p-3 sci-fi-button min-h-[56px] min-w-[56px] border-orange-400/50"
            style={{ borderRadius: '8px' }}
            onClick={() => setIsExpanded(true)}
          >
            <Settings size={24} />
          </motion.button>
        )}

        {/* Mobile Simplified Menu */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setIsExpanded(false)}
              />

              {/* Simplified Mobile Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute top-4 right-4 z-50 w-72 max-w-[calc(100vw-2rem)]"
              >
                <div className="glass-panel p-5 space-y-5 border border-orange-400/30" style={{ borderRadius: '8px' }}>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-orange-400/20">
                    <h3 className="text-lg font-bold gradient-text">Drawing Tools</h3>
                    <button
                      className="sci-fi-button p-2"
                      style={{ borderRadius: '6px' }}
                      onClick={() => setIsExpanded(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Simplified Tools Grid */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {mobileTools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = selectedTool === tool.id;
                        const isDisabled = tool.disabled ?? false;

                        return (
                          <motion.button
                            key={tool.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            whileHover={!isDisabled ? { scale: 1.02 } : {}}
                            whileTap={!isDisabled ? { scale: 0.98 } : {}}
                            className={`
                              sci-fi-button p-3 text-sm transition-all duration-200 focus-ring relative w-full min-h-[72px] flex flex-col items-center justify-center gap-2
                              ${isDisabled ?
                                'opacity-50 cursor-not-allowed bg-slate-600/20 border-slate-600/30' :
                                isActive ? 'active border-orange-400 bg-orange-400/20' : `border-${tool.color}-400/40 bg-${tool.color}-400/10 hover:bg-${tool.color}-400/20`
                              }
                            `}
                            style={{ borderRadius: '6px' }}
                            onClick={() => !isDisabled && handleToolSelect(tool.id)}
                            disabled={isDisabled}
                          >
                            {typeof Icon === 'function' && Icon.prototype ?
                              <Icon size={24} /> :
                              <Icon />
                            }
                            <div className="text-xs font-medium">{tool.label}</div>

                            {/* Active indicator */}
                            {isActive && (
                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></div>
                            )}

                            {/* Coming Soon Chip */}
                            {isDisabled && (
                              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-yellow-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-orange-400/50">
                                Soon
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Conveyor Mode - Only show if conveyor tool selected */}
                    {selectedTool === 'conveyor' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-orange-400/20 pt-3"
                      >
                        <div className="text-xs text-orange-300 mb-2 font-medium uppercase tracking-wider">Conveyor Mode</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className={`
                              sci-fi-button px-3 py-2.5 text-sm transition-all min-h-[52px] flex flex-col items-center justify-center gap-0.5
                              ${conveyorMode === 'default' ? 'active border-orange-400 bg-orange-400/20' : 'border-orange-400/40 bg-orange-400/10 hover:bg-orange-400/20'}
                            `}
                            style={{ borderRadius: '6px' }}
                            onClick={() => handleConveyorModeChange('default')}
                          >
                            <div className="font-medium text-sm">Auto</div>
                            <div className="text-[10px] text-slate-400">Curves</div>
                          </button>
                          <button
                            className={`
                              sci-fi-button px-3 py-2.5 text-sm transition-all min-h-[52px] flex flex-col items-center justify-center gap-0.5
                              ${conveyorMode === 'straight' ? 'active border-orange-400 bg-orange-400/20' : 'border-orange-400/40 bg-orange-400/10 hover:bg-orange-400/20'}
                            `}
                            style={{ borderRadius: '6px' }}
                            onClick={() => handleConveyorModeChange('straight')}
                          >
                            <div className="font-medium text-sm">Straight</div>
                            <div className="text-[10px] text-slate-400">No curves</div>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Sticky Note Tool */}
                    <div className="border-t border-orange-400/20 pt-3">
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="sci-fi-button p-3 text-sm transition-all duration-200 focus-ring border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20 w-full min-h-[52px] flex items-center justify-center gap-3"
                        style={{ borderRadius: '6px' }}
                        onClick={handleStickyNoteClick}
                      >
                        <StickyNote size={20} />
                        <div className="text-sm font-medium">Add Sticky Note</div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Help Text */}
                  <div className="text-[11px] text-slate-400 text-center space-y-1 border-t border-orange-400/20 pt-3">
                    <div><strong>Tap tools</strong> to select drawing mode</div>
                    <div><strong>Tap canvas</strong> to place objects</div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Layout (compact, left-aligned)
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="absolute top-4 left-4 z-50 flex flex-col gap-1.5"
    >
      {desktopToolGroups.map((group, groupIndex) => {
        const colors = getGroupColor(group.color);

        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.25 + groupIndex * 0.08 }}
            className="glass-panel p-1.5 min-w-[110px]"
            style={{ borderRadius: '8px' }}
          >
            {/* Group Header */}
            <div className={`text-[9px] font-semibold ${colors.text} mb-1 tracking-wider flex items-center px-0.5`}>
              <div className={`w-1 h-1 rounded-full ${colors.indicator} mr-1`}></div>
              {group.name}
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-3 gap-0.5">
              {group.tools.map((tool, toolIndex) => {
                const Icon = tool.icon;
                const isActive = selectedTool === tool.id;
                const isDisabled = tool.disabled ?? false;

                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.3 + groupIndex * 0.08 + toolIndex * 0.03 }}
                    className="relative"
                  >
                    <motion.button
                      whileHover={!isDisabled ? { scale: 1.05 } : {}}
                      whileTap={!isDisabled ? { scale: 0.95 } : {}}
                      className={`
                        p-1 text-xs transition-all duration-200 relative w-full flex flex-col items-center justify-center
                        border rounded-md
                        ${isDisabled ?
                          'opacity-50 cursor-not-allowed bg-slate-600/20 border-slate-600/30' :
                          isActive ? `${colors.active} shadow-sm` : `${colors.bg} ${colors.border} ${colors.hover}`
                        }
                      `}
                      style={{ borderRadius: '4px' }}
                      onClick={() => !isDisabled && setSelectedTool(tool.id)}
                      disabled={isDisabled}
                      title={isDisabled ? 'Coming Soon' : tool.label}
                    >
                      <div className="flex items-center justify-center w-[18px] h-[18px]">
                        {typeof Icon === 'function' && Icon.prototype ?
                          <Icon size={14} /> :
                          <Icon />
                        }
                      </div>
                      <div className="text-[8px] mt-0.5 leading-none truncate max-w-full">{tool.label}</div>
                    </motion.button>

                    {/* Coming Soon Chip */}
                    {isDisabled && (
                      <motion.div
                        className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold px-1 py-0.5 shadow-lg border border-orange-400/50"
                        style={{
                          fontSize: '5px',
                          lineHeight: '1',
                          whiteSpace: 'nowrap',
                          borderRadius: '3px'
                        }}
                      >
                        Soon
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Conveyor Mode Selector and Lift Tool */}
            {group.id === 'conveyor' && selectedTool === 'conveyor' && (
              <>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-1.5 pt-1 border-t border-orange-400/20"
                >
                  <div className="text-[8px] text-orange-300 mb-0.5 font-medium px-0.5">MODE</div>
                  <div className="grid grid-cols-2 gap-0.5">
                    <button
                      className={`
                        px-1 py-0.5 text-[8px] transition-all border rounded
                        ${conveyorMode === 'default' ? 'bg-orange-400/30 border-orange-400' : `bg-orange-400/10 border-orange-400/40 hover:bg-orange-400/20`}
                      `}
                      style={{ borderRadius: '3px' }}
                      onClick={() => setConveyorMode('default')}
                      title="Automatic curves at direction changes"
                    >
                      Auto
                    </button>
                    <button
                      className={`
                        px-1 py-0.5 text-[8px] transition-all border rounded
                        ${conveyorMode === 'straight' ? 'bg-orange-400/30 border-orange-400' : `bg-orange-400/10 border-orange-400/40 hover:bg-orange-400/20`}
                      `}
                      style={{ borderRadius: '3px' }}
                      onClick={() => setConveyorMode('straight')}
                      title="No curves, only straight segments"
                    >
                      Straight
                    </button>
                  </div>
                </motion.div>

                {/* Conveyor Lift Tool */}
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-1 pt-1 border-t border-orange-400/20"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      p-1 text-xs transition-all duration-200 w-full flex flex-col items-center border rounded
                      ${store.selectedTool === 'conveyor_lift' ? 'bg-purple-400/30 border-purple-400' : 'bg-purple-400/10 border-purple-400/40 hover:bg-purple-400/20'}
                    `}
                    style={{ borderRadius: '4px' }}
                    onClick={() => setSelectedTool('conveyor_lift')}
                    title="Conveyor Lift - Connect conveyors between floors"
                  >
                    <ConveyorLiftIcon size={14} />
                    <div className="text-[8px] mt-0.5 leading-none">Lift</div>
                  </motion.button>
                </motion.div>
              </>
            )}
          </motion.div>
        );
      })}

      {/* Special Tools Section */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="glass-panel p-1.5"
        style={{ borderRadius: '8px' }}
      >
        <div className="text-[9px] font-semibold text-yellow-300 mb-1 tracking-wider flex items-center px-0.5">
          <div className="w-1 h-1 rounded-full bg-yellow-400 mr-1"></div>
          SPECIAL
        </div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.65 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-1 text-xs transition-all duration-200 border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20 hover:border-yellow-400/60 w-full flex flex-col items-center border rounded"
          style={{ borderRadius: '4px' }}
          onClick={handleStickyNoteClick}
          title="Add Sticky Note"
        >
          <StickyNote size={14} className="mx-auto" />
          <div className="text-[8px] mt-0.5 leading-none">Note</div>
        </motion.button>
      </motion.div>

      {/* Tool Status Indicators - Compact */}
      {selectedTool === 'pipe' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-[9px] text-blue-300">
              {drawingState.drawingPipe ? 'Continue' : 'Click connections'}
            </span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'railway' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div>
            <span className="text-[9px] text-slate-300">
              {drawingState.drawingRailway ? 'Continue' : 'Click to start'}
            </span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'powerline' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></div>
            <span className="text-[9px] text-slate-300">
              {drawingState.drawingPowerline ? 'Continue' : 'Click poles'}
            </span>
          </div>
          {/* Powerline Routing Mode Toggle */}
          <div className="mt-1 pt-1 border-t border-yellow-400/20">
            <div className="text-[8px] text-yellow-300 mb-0.5">ROUTING</div>
            <div className="grid grid-cols-2 gap-0.5">
              <button
                className={`
                  px-1 py-0.5 text-[8px] transition-all flex items-center justify-center gap-0.5 border rounded
                  ${powerlineRoutingMode === 'direct' ? 'bg-yellow-400/30 border-yellow-400' : 'bg-yellow-400/10 border-yellow-400/40'}
                `}
                style={{ borderRadius: '3px' }}
                onClick={() => setPowerlineRoutingMode('direct')}
                title="Direct line between poles"
              >
                <Minus size={8} />
                Direct
              </button>
              <button
                className={`
                  px-1 py-0.5 text-[8px] transition-all flex items-center justify-center gap-0.5 border rounded
                  ${powerlineRoutingMode === 'right-angle' ? 'bg-yellow-400/30 border-yellow-400' : 'bg-yellow-400/10 border-yellow-400/40'}
                `}
                style={{ borderRadius: '3px' }}
                onClick={() => setPowerlineRoutingMode('right-angle')}
                title="L-shaped routing"
              >
                <CornerDownRight size={8} />
                L-Shape
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {selectedTool === 'power_pole' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="text-[8px] text-yellow-300 mb-0.5">Click to place</div>
          <div className="grid grid-cols-4 gap-0.5">
            {(['mk1', 'mk2', 'mk3', 'tower'] as const).map((tier) => (
              <button
                key={tier}
                className={`
                  px-0.5 py-0.5 text-[7px] transition-all border rounded
                  ${powerPoleTier === tier ? 'bg-yellow-400/30 border-yellow-400' : 'bg-yellow-400/10 border-yellow-400/40'}
                `}
                style={{ borderRadius: '3px' }}
                onClick={() => setPowerPoleTier(tier)}
              >
                {tier === 'tower' ? 'Twr' : tier.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {selectedTool === 'conveyor' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
            <span className="text-[9px] text-orange-300">
              {drawingState.isDrawing ? 'Continue' : 'Click connections'}
            </span>
          </div>
          <div className="text-[7px] text-gray-400 mt-0.5">Shift: H/V | Ctrl: 45 deg</div>
        </motion.div>
      )}

      {selectedTool === 'conveyor_pole' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
            <span className="text-[9px] text-orange-300">Click to place support</span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'conveyor_lift' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
            <span className="text-[9px] text-purple-300">Click to place lift</span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'pipe_floor_connection' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-[9px] text-blue-300">Click to place pipe lift</span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'foundation' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></div>
            <span className="text-[9px] text-gray-300">
              {drawingState.drawingFoundation ? 'Drag to size' : 'Click & drag'}
            </span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'wall' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></div>
            <span className="text-[9px] text-gray-300">
              {drawingState.drawingWall ? 'Add points' : 'Click to start'} ({drawingState.wallHeight || 4}m)
            </span>
          </div>
        </motion.div>
      )}

      {selectedTool === 'railing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-1.5"
          style={{ borderRadius: '6px' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></div>
            <span className="text-[9px] text-gray-300">
              {drawingState.drawingRailing ? 'Add points' : 'Click to start'}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
