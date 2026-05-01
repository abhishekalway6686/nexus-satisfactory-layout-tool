import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, ChevronLeft, ChevronRight, Pin, PinOff, X } from 'lucide-react';

// Width of the collapsed panel (just the toggle button)
const COLLAPSED_WIDTH = 32;

interface ResizablePanelProps {
  children: React.ReactNode;
  title?: string;
  side: 'left' | 'right';
  width?: number; // Controlled width from parent
  defaultWidth?: number; // Fallback if not controlled
  minWidth?: number;
  maxWidth?: number;
  collapsible?: boolean;
  closable?: boolean;
  pinnable?: boolean;
  onWidthChange?: (width: number) => void;
  onClose?: () => void;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  title,
  side,
  width: controlledWidth,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  collapsible = true,
  closable = false,
  pinnable = true,
  onWidthChange,
  onClose,
  className = ''
}) => {
  // Use controlled width if provided, otherwise use internal state
  const [internalWidth, setInternalWidth] = useState(controlledWidth ?? defaultWidth);
  const width = controlledWidth ?? internalWidth;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPinned, setIsPinned] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Sync internal width with controlled width when it changes
  useEffect(() => {
    if (controlledWidth !== undefined) {
      setInternalWidth(controlledWidth);
    }
  }, [controlledWidth]);

  // Handle resize with refs to avoid stale closure issues
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = side === 'left'
      ? e.clientX - startXRef.current
      : startXRef.current - e.clientX;

    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));

    // Update both internal state and notify parent
    setInternalWidth(newWidth);
    onWidthChange?.(newWidth);
  }, [side, minWidth, maxWidth, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    // Prevent text selection and change cursor during drag
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // Auto-collapse when not pinned and mouse leaves
  useEffect(() => {
    if (!isPinned && !isHovered && !isResizing) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPinned, isHovered, isResizing]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      setIsCollapsed(false);
    }
  };

  // Calculate the actual displayed width based on collapse state
  const displayWidth = isCollapsed ? COLLAPSED_WIDTH : width;

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, width: displayWidth }}
      animate={{
        width: displayWidth,
        opacity: 1
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        flexShrink: 0 // Prevent flex container from shrinking this panel
      }}
      className={`relative flex flex-col bg-slate-800/90 backdrop-blur-sm border-slate-700 ${
        side === 'left' ? 'border-r' : 'border-l'
      } h-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header - hidden when collapsed */}
      {title && !isCollapsed && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <div className="flex items-center gap-1">
            {pinnable && (
              <button
                onClick={togglePin}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title={isPinned ? 'Unpin panel' : 'Pin panel'}
              >
                {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
            )}
            {closable && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Close panel"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content - hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}

      {/* Resize Handle - wider hit area, hidden when collapsed */}
      {!isCollapsed && (
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className={`absolute top-0 bottom-0 w-2 cursor-ew-resize group z-50 ${
            side === 'left' ? '-right-1' : '-left-1'
          }`}
        >
          {/* Visual indicator */}
          <div className={`absolute top-0 bottom-0 w-1 transition-colors ${
            side === 'left' ? 'right-0.5' : 'left-0.5'
          } ${isResizing ? 'bg-orange-400' : 'bg-transparent group-hover:bg-orange-400/50'}`} />

          {/* Grip icon */}
          <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center rounded transition-colors ${
            isResizing ? 'bg-orange-400/20' : 'group-hover:bg-slate-700/50'
          } ${side === 'left' ? '-right-1' : '-left-1'}`}>
            <GripVertical size={14} className={`transition-colors ${
              isResizing ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-300'
            }`} />
          </div>
        </div>
      )}

      {/* Collapse Toggle Button */}
      {collapsible && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleCollapse}
          className={`absolute top-1/2 -translate-y-1/2 w-8 h-16 bg-slate-800 border border-slate-700 rounded flex items-center justify-center hover:bg-slate-700 hover:border-orange-400/50 transition-colors z-40 ${
            isCollapsed
              ? 'left-1/2 -translate-x-1/2'
              : side === 'left'
                ? 'right-0 translate-x-full rounded-l-none border-l-0'
                : 'left-0 -translate-x-full rounded-r-none border-r-0'
          }`}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {side === 'left'
            ? (isCollapsed ? <ChevronRight size={16} className="text-slate-300" /> : <ChevronLeft size={16} className="text-slate-400" />)
            : (isCollapsed ? <ChevronLeft size={16} className="text-slate-300" /> : <ChevronRight size={16} className="text-slate-400" />)
          }
        </motion.button>
      )}

      {/* Resize indicator */}
      {isResizing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1 rounded-md text-sm z-[100] border border-orange-400/30">
          {Math.round(width)}px
        </div>
      )}
    </motion.div>
  );
};
