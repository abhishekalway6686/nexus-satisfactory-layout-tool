import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Save,
  FolderOpen,
  Download,
  Upload,
  Copy,
  ClipboardPaste,
  Undo,
  Redo,
  Grid3x3,
  Layers,
  Eye,
  EyeOff,
  Settings,
  Info,
  HelpCircle,
  Keyboard,
  ExternalLink,
  Heart,
  Zap,
  X,
  RefreshCw,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_VERSION } from '../../constants/version';
import { MAX_LAYOUT_FILE_SIZE, MAX_LAYOUT_FILE_SIZE_MB } from '../../constants';

interface MenuItem {
  label?: string;
  icon?: React.ReactNode;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

interface MenuProps {
  performanceMode?: 'auto' | 'high' | 'medium' | 'low';
  detectedMode?: 'high' | 'medium' | 'low';
  currentFPS?: number;
  onPerformanceModeChange?: (mode: 'auto' | 'high' | 'medium' | 'low') => void;
  onCheckForUpdates?: () => void;
  isCheckingForUpdates?: boolean;
}

export const MenuBar: React.FC<MenuProps> = ({ performanceMode = 'auto', detectedMode, currentFPS, onPerformanceModeChange, onCheckForUpdates, isCheckingForUpdates }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [submenuLock, setSubmenuLock] = useState<string | null>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  
  const {
    exportLayout,
    importLayout,
    clearLayout,
    showGrid,
    showFloorBelow,
    toggleGrid,
    toggleFloorBelow,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedBuilding,
    copyBuilding,
    pasteBuilding,
    canPaste
  } = useLayoutStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setSubmenuLock(null);
        setHoveredItem(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear submenu lock when activeMenu changes
  useEffect(() => {
    setSubmenuLock(null);
    setHoveredItem(null);
    // Clear any pending timeouts
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
  }, [activeMenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        e.preventDefault();
        // Alt+F for File, Alt+E for Edit, etc.
        switch (e.key.toLowerCase()) {
          case 'f':
            setActiveMenu(activeMenu === 'file' ? null : 'file');
            break;
          case 'e':
            setActiveMenu(activeMenu === 'edit' ? null : 'edit');
            break;
          case 'v':
            setActiveMenu(activeMenu === 'view' ? null : 'view');
            break;
          case 't':
            setActiveMenu(activeMenu === 'tools' ? null : 'tools');
            break;
          case 'h':
            setActiveMenu(activeMenu === 'help' ? null : 'help');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMenu]);

  const handleNew = () => {
    if (window.confirm('Create a new layout? This will clear your current work.')) {
      clearLayout();
    }
    setActiveMenu(null);
  };

  const handleOpen = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      // File size validation
      if (file.size === 0) {
        alert('Error: The selected file is empty or corrupted.');
        return;
      }

      if (file.size > MAX_LAYOUT_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        alert(`Error: File too large!\n\nThe selected file is ${fileSizeMB} MB, but the maximum allowed size is ${MAX_LAYOUT_FILE_SIZE_MB} MB.\n\nPlease select a smaller layout file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        importLayout(e.target.result);
      };
      reader.onerror = () => {
        alert('Error: Failed to read the file. The file may be corrupted or inaccessible.');
      };
      reader.readAsText(file);
    };
    input.click();
    setActiveMenu(null);
  };

  const handleSave = () => {
    const data = exportLayout();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factory-layout-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setActiveMenu(null);
  };

  const handleExportImage = () => {
    // TODO: Implement canvas export to PNG
    alert('Export as image coming soon!');
    setActiveMenu(null);
  };

  const menus: Record<string, MenuItem[]> = {
    file: [
      { label: 'New Layout', icon: <FileText size={16} />, action: handleNew, shortcut: 'Ctrl+N' },
      { label: 'Open...', icon: <FolderOpen size={16} />, action: handleOpen, shortcut: 'Ctrl+O' },
      { separator: true },
      { label: 'Save', icon: <Save size={16} />, action: handleSave, shortcut: 'Ctrl+S' },
      { label: 'Save As...', icon: <Download size={16} />, action: handleSave, shortcut: 'Ctrl+Shift+S' },
      { separator: true },
      { label: 'Export as Image', icon: <Upload size={16} />, action: handleExportImage, shortcut: 'Ctrl+E' },
      { separator: true },
      { label: 'Exit', action: () => window.close(), shortcut: 'Alt+F4' }
    ],
    edit: [
      { label: 'Undo', icon: <Undo size={16} />, action: undo, shortcut: 'Ctrl+Z', disabled: !canUndo() },
      { label: 'Redo', icon: <Redo size={16} />, action: redo, shortcut: 'Ctrl+Y', disabled: !canRedo() },
      { separator: true },
      { label: 'Copy', icon: <Copy size={16} />, action: copyBuilding, shortcut: 'Ctrl+C', disabled: !selectedBuilding },
      { label: 'Paste', icon: <ClipboardPaste size={16} />, action: pasteBuilding, shortcut: 'Ctrl+V', disabled: !canPaste() },
      { separator: true },
      { label: 'Select All', shortcut: 'Ctrl+A', disabled: true },
      { label: 'Delete', shortcut: 'Delete', disabled: !selectedBuilding }
    ],
    view: [
      { label: 'Show Grid', icon: <Grid3x3 size={16} />, action: toggleGrid, shortcut: 'G', disabled: false },
      { label: 'Show Floor Below', icon: <Layers size={16} />, action: toggleFloorBelow, shortcut: 'B', disabled: false },
      { separator: true },
      { label: 'Zoom In', icon: <Eye size={16} />, shortcut: 'Ctrl++', disabled: false },
      { label: 'Zoom Out', icon: <EyeOff size={16} />, shortcut: 'Ctrl+-', disabled: false },
      { label: 'Reset Zoom', shortcut: 'Ctrl+0', disabled: false },
      { separator: true },
      {
        label: 'Performance Mode',
        icon: <Zap size={16} />,
        submenu: [
          { label: `${performanceMode === 'auto' ? '✓ ' : '   '}🔄 Auto-detect`, action: () => onPerformanceModeChange?.('auto') },
          { label: `${performanceMode === 'high' ? '✓ ' : '   '}🚀 High Quality`, action: () => onPerformanceModeChange?.('high') },
          { label: `${performanceMode === 'medium' ? '✓ ' : '   '}⚖️ Balanced`, action: () => onPerformanceModeChange?.('medium') },
          { label: `${performanceMode === 'low' ? '✓ ' : '   '}⚡ Performance`, action: () => onPerformanceModeChange?.('low') }
        ]
      }
    ],
    tools: [
      { label: 'Preferences', icon: <Settings size={16} />, shortcut: 'Ctrl+,', disabled: true },
      { label: 'Keyboard Shortcuts', icon: <Keyboard size={16} />, shortcut: 'Ctrl+K', disabled: true },
      { separator: true },
      { label: 'Developer Tools', shortcut: 'F12', action: () => console.log('Dev tools') }
    ],
    help: [
      { label: 'Documentation', icon: <HelpCircle size={16} />, action: () => window.open('https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool#readme', '_blank', 'noopener,noreferrer') },
      { label: 'Keyboard Shortcuts', icon: <Keyboard size={16} />, shortcut: 'F1' },
      { separator: true },
      { label: "What's New", icon: <Sparkles size={16} />, action: () => useLayoutStore.getState().setIsReleaseNotesOpen(true) },
      { label: isCheckingForUpdates ? 'Checking...' : 'Check for Updates', icon: <RefreshCw size={16} className={isCheckingForUpdates ? 'animate-spin' : ''} />, action: onCheckForUpdates, disabled: isCheckingForUpdates },
      { separator: true },
      { label: 'Report Issue', icon: <MessageSquare size={16} />, action: () => useLayoutStore.getState().setIsFeedbackOpen(true) },
      { label: 'Support Development', icon: <Heart size={16} />, action: () => window.open('https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00', '_blank', 'noopener,noreferrer') },
      { separator: true },
      { label: 'About neXus', icon: <Info size={16} />, action: () => alert(`neXus Satisfactory Planner v${APP_VERSION}\nMade with ❤️ for FICSIT`) }
    ]
  };

  const renderMenuItem = (item: MenuItem, menuKey: string, index: number) => {
    if (item.separator) {
      return <div key={`${menuKey}-sep-${index}`} className="border-t border-slate-700 my-1" />;
    }

    const itemKey = `${menuKey}-${item.label || 'item'}`;
    const hasSubmenu = !!item.submenu;
    // Show submenu if this item is hovered OR if it's locked open
    const isSubmenuVisible = hasSubmenu && (hoveredItem === itemKey || submenuLock === itemKey);
    const isHovered = hoveredItem === itemKey || submenuLock === itemKey;

    const handleMouseEnter = () => {
      // Clear any pending timeout
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
        submenuTimeoutRef.current = null;
      }

      // If this item has a submenu, lock it open
      if (hasSubmenu) {
        setSubmenuLock(itemKey);
      } else if (submenuLock && !menuKey.includes('-sub')) {
        // Only start close timer if hovering over a TOP-LEVEL non-submenu item
        // Don't close if we're inside a submenu (menuKey contains '-sub')
        submenuTimeoutRef.current = setTimeout(() => {
          setSubmenuLock(null);
        }, 300);
      }
      // If we're inside a submenu, don't change hoveredItem to avoid visual issues
      // but keep the submenu lock active

      setHoveredItem(itemKey);
    };

    return (
      <div
        key={itemKey}
        className="relative"
        onMouseEnter={handleMouseEnter}
      >
        <button
          className={`
            w-full px-3 py-1.5 text-left text-sm flex items-center justify-between gap-8
            transition-colors duration-100
            ${item.disabled ? 'text-slate-500 cursor-not-allowed' : 'text-slate-200 hover:bg-slate-700'}
            ${isHovered && !item.disabled ? 'bg-slate-700' : ''}
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (!item.disabled && item.action) {
              item.action();
              setActiveMenu(null);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
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

        {/* Submenu */}
        {item.submenu && isSubmenuVisible && !item.disabled && (
          <div
            className="absolute left-full top-0 -ml-1 z-[200]"
            onMouseEnter={() => {
              // Clear any pending close timeout
              if (submenuTimeoutRef.current) {
                clearTimeout(submenuTimeoutRef.current);
                submenuTimeoutRef.current = null;
              }
              // Keep the submenu locked open
              setSubmenuLock(itemKey);
            }}
          >
            {/* Actual submenu - slight overlap with parent dropdown */}
            <div className="min-w-[200px] bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1">
              {item.submenu.map((subItem, subIndex) => renderMenuItem(subItem, `${itemKey}-sub`, subIndex))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={menuBarRef} className="bg-slate-900 border-b border-slate-700 select-none relative z-[300]">
      <div className="flex items-center">
        {/* App Icon/Logo */}
        <div className="px-3 py-1 flex items-center">
          <span className="text-orange-400 font-bold text-sm" style={{ fontFamily: 'Orbitron, monospace' }}>neXus</span>
        </div>

        {/* Menu Items */}
        <div className="flex">
          {Object.entries(menus).map(([key, items]) => (
            <div key={key} className="relative">
              <button
                className={`
                  px-4 py-1.5 text-sm font-medium transition-colors duration-100
                  ${activeMenu === key ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
                onClick={() => setActiveMenu(activeMenu === key ? null : key)}
                onMouseEnter={() => {
                  if (activeMenu && activeMenu !== key) {
                    setActiveMenu(key);
                  }
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {activeMenu === key && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full left-0 mt-0 min-w-[250px] bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1 z-[200]"
                    onMouseLeave={() => {
                      // Small delay before closing submenu to allow moving to it
                      submenuTimeoutRef.current = setTimeout(() => {
                        setSubmenuLock(null);
                      }, 150);
                    }}
                  >
                    {items.map((item, index) => renderMenuItem(item, key, index))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Right side info */}
        <div className="ml-auto px-4 py-1.5 text-xs text-slate-400 flex items-center gap-4">
          <span className="flex items-center gap-1">
            {performanceMode === 'auto' ? (
              <>
                <span>🔄 Auto</span>
                {detectedMode && (
                  <span className="text-slate-500">
                    ({detectedMode === 'high' ? '🚀' : detectedMode === 'medium' ? '⚖️' : '⚡'})
                  </span>
                )}
              </>
            ) : performanceMode === 'high' ? '🚀 High' : performanceMode === 'medium' ? '⚖️ Balanced' : '⚡ Fast'}
          </span>
          {currentFPS !== undefined && (
            <>
              <span className="opacity-50">|</span>
              <span className={currentFPS < 30 ? 'text-orange-400' : currentFPS < 20 ? 'text-red-400' : 'text-slate-400'}>
                {currentFPS} FPS
              </span>
            </>
          )}
          <span className="opacity-50">|</span>
          <button
            onClick={() => useLayoutStore.getState().setIsReleaseNotesOpen(true)}
            className="hover:text-orange-400 transition-colors cursor-pointer"
            title="Click to see what's new"
          >
            v{APP_VERSION}
          </button>
        </div>
      </div>
    </div>
  );
};