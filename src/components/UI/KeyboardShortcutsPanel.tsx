import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUT_CATEGORIES } from '../../hooks/useKeyboardShortcuts';
import { useLayoutStore } from '../../store/layoutStore';

const KeyboardShortcutsPanel: React.FC = () => {
  const { showKeyboardShortcuts, toggleKeyboardShortcuts } = useLayoutStore();
  const { shortcuts, activeModifiers } = useKeyboardShortcuts();

  if (!showKeyboardShortcuts) return null;

  // Group shortcuts by category
  const shortcutsByCategory = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  const formatKey = (key: string, shortcut: typeof shortcuts[0]) => {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(key === ' ' ? 'Space' : key);
    return parts.join(' + ');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={toggleKeyboardShortcuts}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Keyboard Shortcuts</h2>
              <p className="text-sm text-slate-400 mt-1">Master the layout tool with these handy shortcuts</p>
            </div>
            <button
              onClick={toggleKeyboardShortcuts}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
            {/* Active modifiers indicator */}
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Active Modifiers:</p>
              <div className="flex gap-2">
                <div className={`px-3 py-1 rounded ${activeModifiers.shift ? 'bg-orange-600' : 'bg-slate-600'} text-sm`}>
                  Shift
                </div>
                <div className={`px-3 py-1 rounded ${activeModifiers.ctrl ? 'bg-orange-600' : 'bg-slate-600'} text-sm`}>
                  Ctrl
                </div>
                <div className={`px-3 py-1 rounded ${activeModifiers.alt ? 'bg-orange-600' : 'bg-slate-600'} text-sm`}>
                  Alt
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Shift: Constrain to straight lines • Ctrl: Constrain to 45° angles
              </p>
            </div>

            {/* Shortcuts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-orange-400">
                    {KEYBOARD_SHORTCUT_CATEGORIES[category as keyof typeof KEYBOARD_SHORTCUT_CATEGORIES]}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <span className="text-sm text-slate-300">{shortcut.description}</span>
                        <kbd className="px-3 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono text-slate-200">
                          {formatKey(shortcut.key, shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Special controls */}
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">Special Controls</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Pan view</span>
                  <kbd className="px-3 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono">
                    Space + Drag
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Zoom in/out</span>
                  <kbd className="px-3 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono">
                    Mouse Wheel
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Navigate floors</span>
                  <kbd className="px-3 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono">
                    Page Up/Down
                  </kbd>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-600/20 border border-blue-600/50 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">Pro Tips</h4>
              <ul className="space-y-1 text-xs text-slate-300">
                <li>• Hold Shift while drawing conveyor belts or pipes for straight lines</li>
                <li>• Hold Ctrl while drawing for 45° angle constraints</li>
                <li>• Press R during conveyor drawing to toggle between curve and straight mode</li>
                <li>• Use Q/W/E/T for quick tool switching without reaching for the toolbar</li>
                <li>• Press H anytime to toggle this help panel</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KeyboardShortcutsPanel;