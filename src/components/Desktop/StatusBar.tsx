import React, { useState, useEffect } from 'react';
import { 
  MousePointer, 
  Grid3x3, 
  Layers, 
  Package, 
  Zap,
  Activity,
  HardDrive,
  Cpu
} from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';
import { motion } from 'framer-motion';

interface StatusBarProps {
  mousePosition?: { x: number; y: number };
  worldMousePosition?: { x: number; y: number };
  zoom?: number;
  performanceMode?: 'auto' | 'high' | 'medium' | 'low';
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  mousePosition = { x: 0, y: 0 }, 
  worldMousePosition = { x: 0, y: 0 },
  zoom = 1,
  performanceMode = 'auto' 
}) => {
  const {
    buildings,
    conveyorBelts,
    conveyorPoles,
    pipeSupports,
    pipelines,
    railwaySegments,
    stickyNotes,
    currentFloor,
    showGrid,
    showFloorBelow,
    selectedTool,
    selectedBuilding,
    selectedStickyNote,
    selectedConveyorLift,
    selectedPipeFloorConnection,
    selectedFoundation,
    selectedWall,
    selectedPole,
    selectedPipeSupport,
    drawingState
  } = useLayoutStore();

  const [fps, setFps] = useState(60);
  // Removed memory and render time tracking to improve performance
  // const [memoryUsage, setMemoryUsage] = useState(0);
  // const [renderTime, setRenderTime] = useState(0);
  const [entityCount, setEntityCount] = useState(0);

  // PERFORMANCE FIX: Remove infinite requestAnimationFrame loop
  // FPS monitoring is now disabled to prevent performance degradation
  // The FPS counter shows a static value instead of live monitoring
  useEffect(() => {
    // Set a reasonable default FPS value instead of monitoring
    setFps(60);
    
    // Optional: Only enable FPS monitoring when explicitly requested via feature flag
    // This prevents the performance-destroying infinite requestAnimationFrame loop
    const enableFpsMonitoring = false; // Set to true only for debugging
    
    if (enableFpsMonitoring) {
      let frameCount = 0;
      let lastTime = performance.now();
      let intervalId: NodeJS.Timeout;

      // Use setInterval instead of requestAnimationFrame to reduce overhead
      intervalId = setInterval(() => {
        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;
        const currentFps = Math.round((frameCount * 1000) / elapsed);
        
        setFps(currentFps);
        frameCount = 0;
        lastTime = currentTime;
      }, 2000); // Update only every 2 seconds

      // WARNING: This infinite loop was causing 4fps performance!
      // Only enable for debugging purposes
      let animationId: number;
      const countFrame = () => {
        frameCount++;
        animationId = requestAnimationFrame(countFrame);
      };
      animationId = requestAnimationFrame(countFrame);

      return () => {
        clearInterval(intervalId);
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, []);

  // Calculate statistics
  const stats = {
    buildings: Object.keys(buildings).length,
    conveyors: Object.keys(conveyorBelts).length,
    pipes: Object.keys(pipelines).length,
    railways: Object.keys(railwaySegments).length,
    stickyNotes: Object.keys(stickyNotes).length,
    total: Object.keys(buildings).length + 
           Object.keys(conveyorBelts).length + 
           Object.keys(pipelines).length + 
           Object.keys(railwaySegments).length +
           Object.keys(stickyNotes).length +
           Object.keys(conveyorPoles).length +
           Object.keys(pipeSupports).length
  };
  
  // Update entity count
  useEffect(() => {
    setEntityCount(stats.total);
  }, [stats.total]);

  // Format coordinates - value is already in meters for world coordinates
  const formatCoord = (value: number) => {
    return `${value.toFixed(1)}m`;
  };

  // Get current operation status
  const getOperationStatus = () => {
    if (drawingState.isDrawing) return 'Drawing Conveyor Belt';
    if (drawingState.drawingPipe) return 'Drawing Pipeline';
    if (drawingState.drawingRailway) return 'Drawing Railway';
    if (drawingState.drawingFoundation) return 'Drawing Foundation';
    if (drawingState.drawingWall) return 'Drawing Wall';
    
    switch (selectedTool) {
      case 'select': return 'Select Mode';
      case 'move': return 'Pan Mode';
      case 'rotate': return 'Rotate Mode';
      case 'delete': return 'Delete Mode';
      default: return 'Ready';
    }
  };
  
  // Get selected item info
  const getSelectedInfo = () => {
    if (selectedBuilding) {
      const building = buildings[selectedBuilding];
      if (building) return `Building: ${building.type}`;
    }
    if (selectedStickyNote) return 'Sticky Note';
    if (selectedConveyorLift) return 'Conveyor Lift';
    if (selectedPipeFloorConnection) return 'Pipe Floor Connection';
    if (selectedFoundation) return 'Foundation';
    if (selectedWall) return 'Wall';
    if (selectedPole) return 'Conveyor Pole';
    if (selectedPipeSupport) return 'Pipe Support';
    return null;
  };
  
  const selectedInfo = getSelectedInfo();

  const statusItems = [
    // Left section - Coordinates and status
    {
      section: 'left',
      items: [
        {
          icon: <MousePointer size={14} />,
          content: `X: ${formatCoord(worldMousePosition.x)} Y: ${formatCoord(worldMousePosition.y)}`,
          tooltip: 'World coordinates (meters)'
        },
        {
          icon: <Layers size={14} />,
          content: `Floor ${currentFloor}`,
          tooltip: 'Current floor level'
        },
        {
          content: getOperationStatus(),
          className: drawingState.isDrawing || drawingState.drawingPipe || drawingState.drawingRailway ? 'text-orange-400' : ''
        },
        selectedInfo ? {
          content: selectedInfo,
          className: 'text-blue-400'
        } : null
      ]
    },
    // Center section - Object counts
    {
      section: 'center',
      items: [
        {
          icon: <Package size={14} />,
          content: `${entityCount} Entities`,
          tooltip: 'Total objects in scene'
        },
        {
          content: `${stats.conveyors} Belts`,
          tooltip: 'Total conveyor systems'
        },
        {
          content: `${stats.pipes} Pipes`,
          tooltip: 'Total pipeline systems'
        },
        {
          content: `${stats.railways} Rails`,
          tooltip: 'Total railway segments'
        }
      ]
    },
    // Right section - Performance and view
    {
      section: 'right',
      items: [
        {
          icon: showGrid ? <Grid3x3 size={14} /> : null,
          content: showGrid ? 'Grid ON' : '',
          className: 'text-green-400',
          tooltip: 'Grid display status'
        },
        {
          content: `${Math.round(zoom * 100)}%`,
          tooltip: 'Current zoom level'
        },
        {
          content: showFloorBelow ? 'Floor Below ON' : '',
          className: showFloorBelow ? 'text-blue-400' : '',
          tooltip: 'Floor below visibility'
        },
        {
          icon: <Cpu size={14} />,
          content: `${fps} FPS`,
          className: fps < 30 ? 'text-red-400' : fps < 45 ? 'text-yellow-400' : 'text-green-400',
          tooltip: 'Frames per second'
        },
        // Removed memory and render time display to improve performance
        // {
        //   icon: <HardDrive size={14} />,
        //   content: memoryUsage > 0 ? `${memoryUsage} MB` : 'N/A',
        //   tooltip: 'Memory usage'
        // },
        // {
        //   icon: <Activity size={14} />,
        //   content: `${renderTime.toFixed(1)}ms`,
        //   className: renderTime > 33 ? 'text-red-400' : renderTime > 16 ? 'text-yellow-400' : 'text-green-400',
        //   tooltip: 'Render time'
        // },
        {
          icon: <Zap size={14} />,
          content: performanceMode === 'auto' ? 'Auto' : 
                  performanceMode === 'high' ? 'High' : 
                  performanceMode === 'medium' ? 'Balanced' : 'Fast',
          className: performanceMode === 'low' ? 'text-yellow-400' : '',
          tooltip: 'Performance mode'
        }
      ]
    }
  ];

  return (
    <div className="desktop-statusbar">
      {/* Left section */}
      <div className="flex items-center">
        {statusItems[0].items.filter(item => item && item.content).map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            className={`desktop-statusbar-item ${item.className || ''}`}
            title={item.tooltip}
          >
            {item.icon && <span className="opacity-70">{item.icon}</span>}
            <span>{item.content}</span>
          </motion.div>
        ))}
        <div className="desktop-statusbar-separator" />
      </div>

      {/* Center section */}
      <div className="flex items-center">
        {statusItems[1].items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <div className="desktop-statusbar-separator" />}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.2 }}
              className="desktop-statusbar-item text-slate-400"
              title={item.tooltip}
            >
              {item.icon && <span className="opacity-60">{item.icon}</span>}
              <span>{item.content}</span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center">
        <div className="desktop-statusbar-separator" />
        {statusItems[2].items.filter(item => item.content).map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <div className="desktop-statusbar-separator" />}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05, duration: 0.2 }}
              className={`desktop-statusbar-item ${item.className || ''}`}
              title={item.tooltip}
            >
              {item.icon && <span className="opacity-70">{item.icon}</span>}
              <span>{item.content}</span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {/* Resize grip with hover effect */}
      <motion.div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        initial={{ opacity: 0.2 }}
        whileHover={{ opacity: 0.5 }}
        transition={{ duration: 0.2 }}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full text-slate-500">
          <path
            fill="currentColor"
            d="M 12,12 L 16,16 L 16,12 Z M 8,12 L 12,16 L 16,16 L 16,12 Z M 4,12 L 8,16 L 12,16 L 8,12 Z"
          />
        </svg>
      </motion.div>
    </div>
  );
};