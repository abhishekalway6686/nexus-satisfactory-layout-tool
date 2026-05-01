import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Moon,
  Sun,
  Monitor,
  Eye,
  Type,
  Volume2,
  Zap,
  Palette,
  Contrast,
  Cpu
} from 'lucide-react';
import { useThemeStore } from '../../theme';
import { useAccessibilityStore } from '../../hooks/useAccessibility';
import { usePerformanceMode } from '../../hooks/usePerformanceMode';
import { useLayoutStore } from '../../store/layoutStore';
import { animations } from './animations';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { theme, setThemeMode } = useThemeStore();
  const {
    highContrast,
    reducedMotion,
    largeText,
    screenReaderMode,
    setHighContrast,
    setReducedMotion,
    setLargeText,
    setScreenReaderMode
  } = useAccessibilityStore();
  const { mode, setPerformanceMode } = usePerformanceMode();
  const { rendererType, toggleRenderer, powerlineVisibility, setPowerlineVisibility, powerlineRoutingMode, setPowerlineRoutingMode } = useLayoutStore();

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Settings Panel */}
      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-orange-500/20 rounded-xl shadow-2xl overflow-hidden"
        variants={animations.modalAnimation}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-8">
            {/* Theme Section */}
            <section>
              <h3 className="text-sm font-medium text-orange-400 mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <ThemeOption
                  icon={<Sun className="w-5 h-5" />}
                  label="Light"
                  isActive={theme.mode === 'light'}
                  onClick={() => setThemeMode('light')}
                />
                <ThemeOption
                  icon={<Moon className="w-5 h-5" />}
                  label="Dark"
                  isActive={theme.mode === 'dark'}
                  onClick={() => setThemeMode('dark')}
                />
                <ThemeOption
                  icon={<Monitor className="w-5 h-5" />}
                  label="System"
                  isActive={false}
                  onClick={() => {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    setThemeMode(prefersDark ? 'dark' : 'light');
                  }}
                />
              </div>
            </section>

            {/* Performance Section */}
            <section>
              <h3 className="text-sm font-medium text-orange-400 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Performance
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <PerformanceOption
                  label="Low"
                  description="Best performance"
                  isActive={mode === 'low'}
                  onClick={() => setPerformanceMode('low')}
                />
                <PerformanceOption
                  label="Medium"
                  description="Balanced"
                  isActive={mode === 'medium'}
                  onClick={() => setPerformanceMode('medium')}
                />
                <PerformanceOption
                  label="High"
                  description="Best quality"
                  isActive={mode === 'high'}
                  onClick={() => setPerformanceMode('high')}
                />
              </div>
            </section>

            {/* Renderer Section */}
            <section>
              <h3 className="text-sm font-medium text-orange-400 mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Renderer
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <RendererOption
                  label="Canvas (Konva)"
                  description="Stable & compatible"
                  isActive={rendererType === 'konva'}
                  onClick={() => rendererType !== 'konva' && toggleRenderer()}
                />
                <RendererOption
                  label="WebGL"
                  description="High performance"
                  isActive={rendererType === 'webgl'}
                  onClick={() => rendererType !== 'webgl' && toggleRenderer()}
                  experimental={true}
                />
              </div>
              
              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400">
                  {rendererType === 'konva'
                    ? 'Using Canvas renderer for maximum compatibility. Switch to WebGL for better performance with large layouts.'
                    : 'Using WebGL renderer for high performance. If you experience issues, switch back to Canvas.'
                  }
                </p>
              </div>
            </section>

            {/* Powerline Display Section */}
            <section>
              <h3 className="text-sm font-medium text-orange-400 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Powerline Display
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <VisibilityOption
                  label="Show"
                  description="Full visibility"
                  isActive={powerlineVisibility === 'show'}
                  onClick={() => setPowerlineVisibility('show')}
                />
                <VisibilityOption
                  label="Semi-transparent"
                  description="Reduced opacity"
                  isActive={powerlineVisibility === 'semi-transparent'}
                  onClick={() => setPowerlineVisibility('semi-transparent')}
                />
                <VisibilityOption
                  label="Hide"
                  description="Not visible"
                  isActive={powerlineVisibility === 'hide'}
                  onClick={() => setPowerlineVisibility('hide')}
                />
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Routing Mode</h4>
                <div className="grid grid-cols-2 gap-3">
                  <RoutingModeOption
                    label="Direct"
                    description="Straight line"
                    isActive={powerlineRoutingMode === 'direct'}
                    onClick={() => setPowerlineRoutingMode('direct')}
                  />
                  <RoutingModeOption
                    label="Right-Angle"
                    description="L-shaped routing"
                    isActive={powerlineRoutingMode === 'right-angle'}
                    onClick={() => setPowerlineRoutingMode('right-angle')}
                  />
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400">
                  {powerlineVisibility === 'hide'
                    ? 'Powerlines are hidden. This can improve performance for complex layouts.'
                    : powerlineVisibility === 'semi-transparent'
                    ? 'Powerlines are semi-transparent for better viewing of underlying elements.'
                    : 'Powerlines are fully visible with power flow indicators.'
                  }
                </p>
              </div>
            </section>

            {/* Accessibility Section */}
            <section>
              <h3 className="text-sm font-medium text-orange-400 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Accessibility
              </h3>
              
              <div className="space-y-3">
                <ToggleOption
                  icon={<Contrast className="w-5 h-5" />}
                  label="High Contrast"
                  description="Increase color contrast for better visibility"
                  isEnabled={highContrast}
                  onChange={setHighContrast}
                />
                
                <ToggleOption
                  icon={<Type className="w-5 h-5" />}
                  label="Large Text"
                  description="Increase text size throughout the application"
                  isEnabled={largeText}
                  onChange={setLargeText}
                />
                
                <ToggleOption
                  icon={<Zap className="w-5 h-5" />}
                  label="Reduced Motion"
                  description="Minimize animations and transitions"
                  isEnabled={reducedMotion}
                  onChange={setReducedMotion}
                />
                
                <ToggleOption
                  icon={<Volume2 className="w-5 h-5" />}
                  label="Screen Reader Mode"
                  description="Optimize for screen reader compatibility"
                  isEnabled={screenReaderMode}
                  onChange={setScreenReaderMode}
                />
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section>
              <h3 className="text-sm font-medium text-orange-400 mb-4">
                Keyboard Shortcuts
              </h3>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <ShortcutItem shortcut="Ctrl+N" description="New layout" />
                <ShortcutItem shortcut="Ctrl+S" description="Save layout" />
                <ShortcutItem shortcut="Ctrl+O" description="Open layout" />
                <ShortcutItem shortcut="Ctrl+Z" description="Undo" />
                <ShortcutItem shortcut="Ctrl+Y" description="Redo" />
                <ShortcutItem shortcut="Delete" description="Delete selected" />
                <ShortcutItem shortcut="Ctrl++" description="Zoom in" />
                <ShortcutItem shortcut="Ctrl+-" description="Zoom out" />
                <ShortcutItem shortcut="Ctrl+0" description="Reset zoom" />
                <ShortcutItem shortcut="F11" description="Fullscreen" />
                <ShortcutItem shortcut="G" description="Toggle grid" />
                <ShortcutItem shortcut="B" description="Toggle floor below" />
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Theme option component
const ThemeOption: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      p-4 rounded-lg border transition-all duration-200
      ${isActive 
        ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' 
        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
      }
    `}
  >
    <div className="flex flex-col items-center gap-2">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  </motion.button>
);

// Performance option component
const PerformanceOption: React.FC<{
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, description, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      p-4 rounded-lg border transition-all duration-200
      ${isActive 
        ? 'bg-orange-500/20 border-orange-500/50' 
        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }
    `}
  >
    <div className="text-left">
      <div className={`font-medium ${isActive ? 'text-orange-300' : 'text-slate-300'}`}>
        {label}
      </div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  </motion.button>
);

// Renderer option component
const RendererOption: React.FC<{
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  experimental?: boolean;
}> = ({ label, description, isActive, onClick, experimental }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      p-4 rounded-lg border transition-all duration-200 relative
      ${isActive 
        ? 'bg-orange-500/20 border-orange-500/50' 
        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }
    `}
  >
    <div className="text-left">
      <div className={`font-medium flex items-center gap-2 ${isActive ? 'text-orange-300' : 'text-slate-300'}`}>
        {label}
        {experimental && (
          <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
            BETA
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  </motion.button>
);

// Toggle option component
const ToggleOption: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ icon, label, description, isEnabled, onChange }) => (
  <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-lg">
    <div className="text-slate-400 mt-0.5">{icon}</div>
    <div className="flex-1">
      <div className="font-medium text-slate-200">{label}</div>
      <div className="text-sm text-slate-500 mt-0.5">{description}</div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={isEnabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
    </label>
  </div>
);

// Visibility option component for powerline visibility
const VisibilityOption: React.FC<{
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, description, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      p-4 rounded-lg border transition-all duration-200
      ${isActive
        ? 'bg-orange-500/20 border-orange-500/50'
        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }
    `}
  >
    <div className="text-left">
      <div className={`font-medium ${isActive ? 'text-orange-300' : 'text-slate-300'}`}>
        {label}
      </div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  </motion.button>
);

// Routing mode option component for powerline routing
const RoutingModeOption: React.FC<{
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, description, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      p-4 rounded-lg border transition-all duration-200
      ${isActive
        ? 'bg-orange-500/20 border-orange-500/50'
        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }
    `}
  >
    <div className="text-left">
      <div className={`font-medium ${isActive ? 'text-orange-300' : 'text-slate-300'}`}>
        {label}
      </div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  </motion.button>
);

// Keyboard shortcut item
const ShortcutItem: React.FC<{
  shortcut: string;
  description: string;
}> = ({ shortcut, description }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-slate-400">{description}</span>
    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300">
      {shortcut}
    </kbd>
  </div>
);