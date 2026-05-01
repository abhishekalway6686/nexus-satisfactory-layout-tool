import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  ClipboardPaste,
  Trash2,
  RotateCw,
  Settings,
  Layers,
  Eye,
  EyeOff,
  Package,
  Gauge,
  Cable,
  Train,
  Info,
  CopyPlus,
  MousePointer,
  Move
} from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';

interface ContextMenuItem {
  label?: string;
  icon?: React.ReactNode;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  target?: {
    type: 'building' | 'conveyor' | 'pipe' | 'railway' | 'canvas' | 'support';
    id?: string;
  };
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, target }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  const {
    selectedBuilding,
    buildings,
    copyBuilding,
    pasteBuilding,
    deleteBuilding,
    rotateBuilding,
    duplicateBuilding,
    canPaste,
    setSelectedBuilding,
    setSelectedTool,
    currentFloor,
    showFloorBelow,
    toggleFloorBelow,
    setFloor
  } = useLayoutStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const getMenuItems = (): ContextMenuItem[] => {
    // Building context menu
    if (target?.type === 'building' && target.id) {
      const building = buildings[target.id];
      if (!building) return [];

      return [
        {
          label: 'Properties',
          icon: <Settings size={16} />,
          action: () => {
            setSelectedBuilding(target.id);
            onClose();
          },
          shortcut: 'Enter'
        },
        { separator: true },
        {
          label: 'Copy',
          icon: <Copy size={16} />,
          action: () => {
            setSelectedBuilding(target.id);
            copyBuilding();
            onClose();
          },
          shortcut: 'Ctrl+C'
        },
        {
          label: 'Duplicate',
          icon: <CopyPlus size={16} />,
          action: () => {
            setSelectedBuilding(target.id);
            duplicateBuilding();
            onClose();
          },
          shortcut: 'Ctrl+D'
        },
        { separator: true },
        {
          label: 'Rotate 90°',
          icon: <RotateCw size={16} />,
          action: () => {
            rotateBuilding(target.id);
            onClose();
          },
          shortcut: 'R'
        },
        { separator: true },
        {
          label: 'Delete',
          icon: <Trash2 size={16} />,
          action: () => {
            deleteBuilding(target.id);
            onClose();
          },
          shortcut: 'Delete'
        },
        { separator: true },
        {
          label: 'Building Info',
          icon: <Info size={16} />,
          submenu: [
            { label: `Type: ${building.type}` },
            { label: `Size: ${building.width || 8}×${building.height || 8}m` },
            { label: `Floor: ${building.floor}` },
            { label: `Position: ${Math.round(building.x)}m, ${Math.round(building.y)}m` }
          ]
        }
      ];
    }

    // Canvas context menu
    if (target?.type === 'canvas') {
      return [
        {
          label: 'Select Tool',
          icon: <MousePointer size={16} />,
          action: () => {
            setSelectedTool('select');
            onClose();
          },
          shortcut: 'V'
        },
        {
          label: 'Pan Tool',
          icon: <Move size={16} />,
          action: () => {
            setSelectedTool('move');
            onClose();
          },
          shortcut: 'H'
        },
        {
          label: 'Rotate Tool',
          icon: <RotateCw size={16} />,
          action: () => {
            setSelectedTool('rotate');
            onClose();
          },
          shortcut: 'R'
        },
        {
          label: 'Delete Tool',
          icon: <Trash2 size={16} />,
          action: () => {
            setSelectedTool('delete');
            onClose();
          },
          shortcut: 'Del'
        },
        { separator: true },
        {
          label: 'Paste',
          icon: <ClipboardPaste size={16} />,
          action: () => {
            pasteBuilding();
            onClose();
          },
          shortcut: 'Ctrl+V',
          disabled: !canPaste()
        },
        { separator: true },
        {
          label: 'Add Building',
          icon: <Package size={16} />,
          submenu: [
            { label: 'Open Building Palette', shortcut: 'B' }
          ]
        },
        {
          label: 'Draw Conveyor',
          icon: <Gauge size={16} />,
          action: () => {
            setSelectedTool('conveyor');
            onClose();
          },
          shortcut: 'C'
        },
        {
          label: 'Draw Pipeline',
          icon: <Cable size={16} />,
          action: () => {
            setSelectedTool('pipe');
            onClose();
          },
          shortcut: 'P'
        },
        {
          label: 'Draw Railway',
          icon: <Train size={16} />,
          action: () => {
            setSelectedTool('railway');
            onClose();
          },
          shortcut: 'R'
        },
        { separator: true },
        {
          label: showFloorBelow ? 'Hide Floor Below' : 'Show Floor Below',
          icon: showFloorBelow ? <EyeOff size={16} /> : <Eye size={16} />,
          action: () => {
            toggleFloorBelow();
            onClose();
          }
        },
        {
          label: `Current Floor: ${currentFloor}`,
          icon: <Layers size={16} />,
          submenu: [
            {
              label: 'Go Up (PgUp)',
              action: () => {
                setFloor(currentFloor + 1);
                onClose();
              }
            },
            {
              label: 'Go Down (PgDn)',
              action: () => {
                setFloor(currentFloor - 1);
                onClose();
              }
            }
          ]
        }
      ];
    }


    return [];
  };

  const renderMenuItem = (item: ContextMenuItem, index: number): React.ReactNode => {
    if (item.separator) {
      return <div key={`separator-${index}`} className="border-t border-slate-700 my-1" />;
    }

    return (
      <div key={item.label || `item-${index}`} className="relative group">
        <button
          className={`
            w-full px-3 py-1.5 text-left text-sm flex items-center justify-between gap-8
            transition-colors duration-100
            ${item.disabled 
              ? 'text-slate-500 cursor-not-allowed' 
              : 'text-slate-200 hover:bg-slate-700'
            }
          `}
          onClick={() => {
            if (!item.disabled && item.action) {
              item.action();
            }
          }}
          disabled={item.disabled}
        >
          <div className="flex items-center gap-2">
            {item.icon && <span className="opacity-70">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.shortcut && (
              <span className="text-xs text-slate-400 font-mono">{item.shortcut}</span>
            )}
            {item.submenu && <span className="text-slate-400">▶</span>}
          </div>
        </button>

        {/* Submenu with invisible bridge for smooth hover transition */}
        {item.submenu && (
          <div className="absolute left-full top-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
            {/* Invisible bridge to prevent hover gap issues */}
            <div className="absolute -left-3 top-0 w-3 h-full" />
            <div className="bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1 min-w-[200px]">
              {item.submenu.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const menuItems = getMenuItems();

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-50 bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1 min-w-[200px]"
        style={{ left: x, top: y }}
      >
        {menuItems.length > 0 ? (
          menuItems.map((item, index) => renderMenuItem(item, index))
        ) : (
          <div className="px-3 py-2 text-sm text-slate-500">No actions available</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};