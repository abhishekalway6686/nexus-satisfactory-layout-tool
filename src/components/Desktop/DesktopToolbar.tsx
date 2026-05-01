import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer,
  Move,
  RotateCw,
  Trash2,
  Grid3x3,
  Layers,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Package,
  Wrench,
  Gauge,
  Cable,
  Train,
  StickyNote,
  Square,
  Home,
  Undo,
  Redo,
  Copy,
  ClipboardPaste,
  Settings,
  ChevronUp,
  ChevronDown,
  Zap,
  BarChart3
} from 'lucide-react';
import { RichTooltip } from '../UI/Tooltip';
import { useLayoutStore } from '../../store/layoutStore';
import { FLOOR_HEIGHT } from '../../constants';
import { Tool, PowerlineVisibility } from '../../types';

interface ToolbarButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  action?: () => void;
  active?: boolean;
  disabled?: boolean;
  separator?: boolean;
  dropdown?: ToolbarButton[];
}

interface DesktopToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleFullscreen?: () => void;
}

export const DesktopToolbar: React.FC<DesktopToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleFullscreen
}) => {
  const {
    selectedTool,
    setSelectedTool,
    showGrid,
    showFloorBelow,
    toggleGrid,
    toggleFloorBelow,
    undo,
    redo,
    canUndo,
    canRedo,
    copyBuilding,
    pasteBuilding,
    canPaste,
    selectedBuilding,
    addStickyNote,
    currentFloor,
    setCurrentFloor,
    powerlineVisibility,
    setPowerlineVisibility,
    productionOverlaySettings,
    toggleProductionOverlays,
    isProductionPanelOpen,
    toggleProductionPanel
  } = useLayoutStore();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Cycle through powerline visibility modes: show -> semi-transparent -> hide -> show
  const cyclePowerlineVisibility = () => {
    const modes: PowerlineVisibility[] = ['show', 'semi-transparent', 'hide'];
    const currentIndex = modes.indexOf(powerlineVisibility);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPowerlineVisibility(modes[nextIndex]);
  };

  // Get appropriate icon and label for current powerline visibility
  const getPowerlineVisibilityInfo = () => {
    switch (powerlineVisibility) {
      case 'show':
        return { icon: <Zap size={20} />, label: 'Powerlines: Visible', tooltip: 'Powerlines Visible (Click to cycle)' };
      case 'semi-transparent':
        return { icon: <Zap size={20} className="opacity-50" />, label: 'Powerlines: Semi', tooltip: 'Powerlines Semi-transparent (Click to cycle)' };
      case 'hide':
        return { icon: <Zap size={20} className="opacity-25" />, label: 'Powerlines: Hidden', tooltip: 'Powerlines Hidden (Click to cycle)' };
      default:
        return { icon: <Zap size={20} />, label: 'Powerlines', tooltip: 'Toggle Powerline Visibility' };
    }
  };

  const toolGroups: ToolbarButton[][] = [
    // File operations
    [
      { 
        id: 'undo', 
        icon: <Undo size={20} />, 
        label: 'Undo', 
        tooltip: 'Undo (Ctrl+Z)',
        action: undo,
        disabled: !canUndo()
      },
      { 
        id: 'redo', 
        icon: <Redo size={20} />, 
        label: 'Redo', 
        tooltip: 'Redo (Ctrl+Y)',
        action: redo,
        disabled: !canRedo()
      }
    ],
    // Edit operations
    [
      { 
        id: 'copy', 
        icon: <Copy size={20} />, 
        label: 'Copy', 
        tooltip: 'Copy (Ctrl+C)',
        action: copyBuilding,
        disabled: !selectedBuilding
      },
      { 
        id: 'paste', 
        icon: <ClipboardPaste size={20} />, 
        label: 'Paste', 
        tooltip: 'Paste (Ctrl+V)',
        action: pasteBuilding,
        disabled: !canPaste()
      }
    ],
    // Selection tools
    [
      {
        id: 'select',
        icon: <MousePointer size={20} />,
        label: 'Select',
        tooltip: 'Select Tool (V)',
        action: () => setSelectedTool('select'),
        active: selectedTool === 'select'
      },
      {
        id: 'move',
        icon: <Move size={20} />,
        label: 'Pan',
        tooltip: 'Pan Tool (H)',
        action: () => setSelectedTool('move'),
        active: selectedTool === 'move'
      },
      {
        id: 'rotate',
        icon: <RotateCw size={20} />,
        label: 'Rotate',
        tooltip: 'Rotate Tool (R)',
        action: () => setSelectedTool('rotate'),
        active: selectedTool === 'rotate'
      },
      {
        id: 'delete',
        icon: <Trash2 size={20} />,
        label: 'Delete',
        tooltip: 'Delete Tool (Del)',
        action: () => setSelectedTool('delete'),
        active: selectedTool === 'delete'
      }
    ],
    // Drawing tools
    [
      {
        id: 'conveyor',
        icon: <Gauge size={20} />,
        label: 'Conveyor',
        tooltip: 'Draw Conveyor Belt (C)',
        action: () => setSelectedTool('conveyor'),
        active: selectedTool === 'conveyor'
      },
      {
        id: 'pipe',
        icon: <Cable size={20} />,
        label: 'Pipeline',
        tooltip: 'Draw Pipeline (P)',
        action: () => setSelectedTool('pipe'),
        active: selectedTool === 'pipe'
      },
      {
        id: 'railway',
        icon: <Train size={20} />,
        label: 'Railway',
        tooltip: 'Draw Railway (R)',
        action: () => setSelectedTool('railway'),
        active: selectedTool === 'railway'
      },
      {
        id: 'pipe_support',
        icon: <div className="w-5 h-5 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="6" fill="currentColor"/>
            <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.6"/>
            <rect x="9" y="2" width="2" height="6" fill="currentColor"/>
            <rect x="9" y="12" width="2" height="6" fill="currentColor"/>
            <rect x="2" y="9" width="6" height="2" fill="currentColor"/>
            <rect x="12" y="9" width="6" height="2" fill="currentColor"/>
          </svg>
        </div>,
        label: 'Pipe Support',
        tooltip: 'Place Pipe Support',
        action: () => setSelectedTool('pipe_support'),
        active: selectedTool === 'pipe_support'
      },
      {
        id: 'foundation',
        icon: <Square size={20} />,
        label: 'Foundation',
        tooltip: 'Draw Foundation (F)',
        action: () => setSelectedTool('foundation'),
        active: selectedTool === 'foundation'
      },
      {
        id: 'wall',
        icon: <div className="w-5 h-5 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="2" width="4" height="16" fill="currentColor"/>
            <rect x="7" y="6" width="6" height="2" fill="currentColor" opacity="0.5"/>
            <rect x="7" y="10" width="6" height="2" fill="currentColor" opacity="0.5"/>
            <rect x="7" y="14" width="6" height="2" fill="currentColor" opacity="0.5"/>
          </svg>
        </div>,
        label: 'Wall',
        tooltip: 'Draw Wall',
        action: () => setSelectedTool('wall'),
        active: selectedTool === 'wall'
      },
      {
        id: 'note',
        icon: <StickyNote size={20} />,
        label: 'Note',
        tooltip: 'Add Sticky Note (N)',
        action: () => {
          const note = {
            id: `note-${Date.now()}`,
            x: 0,
            y: 0,
            z: currentFloor * 4,
            floor: currentFloor,
            width: 8,
            height: 6,
            text: 'New Note',
            color: '#ffeb3b',
            rotation: 0 as const
          };
          addStickyNote(note);
        }
      }
    ],
    // View controls
    [
      {
        id: 'grid',
        icon: showGrid ? <Grid3x3 size={20} /> : <Grid3x3 size={20} />,
        label: 'Grid',
        tooltip: 'Toggle Grid (G)',
        action: toggleGrid,
        active: showGrid
      },
      {
        id: 'floor',
        icon: <Layers size={20} />,
        label: 'Floor Below',
        tooltip: 'Toggle Floor Below (B)',
        action: toggleFloorBelow,
        active: showFloorBelow
      },
      {
        id: 'powerline-visibility',
        icon: getPowerlineVisibilityInfo().icon,
        label: getPowerlineVisibilityInfo().label,
        tooltip: getPowerlineVisibilityInfo().tooltip,
        action: cyclePowerlineVisibility,
        active: powerlineVisibility !== 'show'
      },
      {
        id: 'production-overlay',
        icon: <BarChart3 size={20} className={productionOverlaySettings.showProductionBadges ? '' : 'opacity-50'} />,
        label: 'Production Overlay',
        tooltip: 'Toggle Production Overlays (O)',
        action: toggleProductionOverlays,
        active: productionOverlaySettings.showProductionBadges
      },
      {
        id: 'production-panel',
        icon: <BarChart3 size={20} />,
        label: 'Production Panel',
        tooltip: 'Production Overview Panel (Shift+O)',
        action: toggleProductionPanel,
        active: isProductionPanelOpen
      }
    ],
    // Zoom controls (fullscreen moved to floor selector section)
    [
      {
        id: 'zoomIn',
        icon: <ZoomIn size={20} />,
        label: 'Zoom In',
        tooltip: 'Zoom In (Ctrl++)',
        action: onZoomIn
      },
      {
        id: 'zoomOut',
        icon: <ZoomOut size={20} />,
        label: 'Zoom Out',
        tooltip: 'Zoom Out (Ctrl+-)',
        action: onZoomOut
      },
      {
        id: 'zoomReset',
        icon: <Home size={20} />,
        label: 'Reset View',
        tooltip: 'Reset View (Ctrl+0)',
        action: onZoomReset
      }
    ]
  ];

  // Floor control handlers
  const handleFloorUp = () => {
    setCurrentFloor(currentFloor + 1);
  };

  const handleFloorDown = () => {
    if (currentFloor > 0) {
      setCurrentFloor(currentFloor - 1);
    }
  };

  const renderButton = (button: ToolbarButton, index: number) => {
    if (button.separator) {
      return <div key={`sep-${index}`} className="toolbar-separator" />;
    }

    const shortcut = button.tooltip.match(/\(([^)]+)\)/)?.[1];
    const tooltipText = button.tooltip.replace(/\s*\([^)]+\)/, '');

    return (
      <RichTooltip
        key={button.id}
        title={tooltipText}
        shortcut={shortcut}
        placement="bottom"
      >
        <motion.button
          className={`
            toolbar-button
            ${button.active ? 'active' : ''}
            ${button.disabled ? 'disabled' : ''}
          `}
          onClick={button.action}
          disabled={button.disabled}
          whileHover={{ scale: button.disabled ? 1 : 1.02 }}
          whileTap={{ scale: button.disabled ? 1 : 0.98 }}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.2,
            delay: index * 0.02
          }}
        >
          <span className="flex items-center justify-center w-5 h-5">
            {button.icon}
          </span>
        </motion.button>
      </RichTooltip>
    );
  };

  return (
    <motion.div 
      className="desktop-toolbar"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-1">
        {toolGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && <div className="toolbar-separator" />}
            <motion.div 
              className="flex items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              {group.map((button, buttonIndex) => renderButton(button, buttonIndex))}
            </motion.div>
          </React.Fragment>
        ))}

        {/* Right side - Fullscreen, Floor Selector, Settings */}
        <div className="ml-auto flex items-center gap-1">
          {/* Fullscreen Toggle */}
          <RichTooltip title="Toggle Fullscreen" shortcut="F11" placement="bottom">
            <motion.button
              className="toolbar-button"
              onClick={onToggleFullscreen}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Maximize2 size={18} />
            </motion.button>
          </RichTooltip>

          {/* Divider */}
          <div className="toolbar-separator" />

          {/* Compact Floor Selector */}
          <motion.div
            className="floor-selector-compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <RichTooltip title="Floor Down" shortcut="PgDn" placement="bottom">
              <motion.button
                className={`floor-btn ${currentFloor <= 0 ? 'disabled' : ''}`}
                onClick={handleFloorDown}
                disabled={currentFloor <= 0}
                whileHover={{ scale: currentFloor <= 0 ? 1 : 1.05 }}
                whileTap={{ scale: currentFloor <= 0 ? 1 : 0.95 }}
              >
                <ChevronDown size={14} />
              </motion.button>
            </RichTooltip>

            <div className="floor-display">
              <Layers size={12} className="floor-icon" />
              <span className="floor-value">F{currentFloor}</span>
              <span className="floor-alt">{currentFloor * FLOOR_HEIGHT}m</span>
            </div>

            <RichTooltip title="Floor Up" shortcut="PgUp" placement="bottom">
              <motion.button
                className="floor-btn"
                onClick={handleFloorUp}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronUp size={14} />
              </motion.button>
            </RichTooltip>
          </motion.div>

          {/* Divider */}
          <div className="toolbar-separator" />

          {/* Settings button */}
          <RichTooltip title="Settings" placement="bottom">
            <motion.button
              className="toolbar-button"
              whileHover={{ scale: 1.02, rotate: 180 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <Settings size={18} />
            </motion.button>
          </RichTooltip>
        </div>
      </div>
    </motion.div>
  );
};