import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bug, Wrench, Trash2, Shield, ChevronDown, ChevronUp, ExternalLink, Heart } from 'lucide-react';
import { APP_VERSION } from '../../constants/version';
import { useLayoutStore } from '../../store/layoutStore';
import releasesData from '../../data/releases.json';

interface ReleaseSection {
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'security';
  items: string[];
}

interface Release {
  version: string;
  date: string;
  sections: ReleaseSection[];
}

// Import release notes from JSON file - use the add-release script to add new releases
const RELEASES: Release[] = releasesData as Release[];

const STORAGE_KEY = 'lastSeenVersion';

const sectionConfig = {
  added: { icon: Sparkles, color: 'text-green-400', bg: 'bg-green-400/10', label: 'New Features' },
  changed: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Changes' },
  fixed: { icon: Bug, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Bug Fixes' },
  removed: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Removed' },
  security: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Security' }
};

interface ReleaseNotesProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ forceOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedReleases, setExpandedReleases] = useState<Set<string>>(new Set([APP_VERSION]));
  const { isReleaseNotesOpen, setIsReleaseNotesOpen } = useLayoutStore();

  // Check for forceOpen prop or store state
  const shouldShow = forceOpen ?? isReleaseNotesOpen ?? isVisible;

  useEffect(() => {
    // Only auto-show on version change if not controlled externally
    if (forceOpen !== undefined || isReleaseNotesOpen) return;

    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

    // Show if this is a new version or first time
    if (lastSeenVersion !== APP_VERSION) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [forceOpen, isReleaseNotesOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setIsReleaseNotesOpen(false);
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    onClose?.();
  };

  const toggleRelease = (version: string) => {
    setExpandedReleases(prev => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  // Show all releases
  const releasesToShow = RELEASES;

  return (
    <AnimatePresence>
      {shouldShow && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
            onClick={handleClose}
          />

          {/* Modal - centered using flexbox container for reliable centering */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[1001] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl max-h-[85vh] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
            >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-orange-500/10 to-transparent flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-orange-400" size={24} />
                  What's New in neXus
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Version {APP_VERSION}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 palette-scrollbar">
              {releasesToShow.map((release) => {
                const isExpanded = expandedReleases.has(release.version);
                const isCurrent = release.version === APP_VERSION;

                return (
                  <div
                    key={release.version}
                    className={`rounded-lg border ${
                      isCurrent ? 'border-orange-400/30 bg-orange-400/5' : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    {/* Release Header */}
                    <button
                      onClick={() => toggleRelease(release.version)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${isCurrent ? 'text-orange-400' : 'text-slate-300'}`}>
                          v{release.version}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs bg-orange-400/20 text-orange-400 rounded-full">
                            Current
                          </span>
                        )}
                        <span className="text-sm text-slate-500">{release.date}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </button>

                    {/* Release Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {release.sections.map((section, sectionIndex) => {
                              const config = sectionConfig[section.type];
                              const Icon = config.icon;

                              return (
                                <div key={sectionIndex} className={`rounded-lg p-3 ${config.bg}`}>
                                  <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                                    <Icon size={16} />
                                    <span className="font-medium text-sm">{config.label}</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {section.items.map((item, itemIndex) => (
                                      <li
                                        key={itemIndex}
                                        className="text-sm text-slate-300 flex items-start gap-2"
                                      >
                                        <span className="text-slate-500 mt-1.5">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Footer with donate button */}
            <div className="px-6 py-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/anthropics/satisfactory-layout-tool/blob/main/CHANGELOG.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1"
                >
                  Full changelog
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-pink-500/20"
                >
                  <Heart size={16} className="fill-current" />
                  Support Development
                </a>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
