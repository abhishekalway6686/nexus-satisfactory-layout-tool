// Floating feedback button that opens links to GitHub issue templates.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bug, Lightbulb, X, ExternalLink, Info } from 'lucide-react';
import { APP_VERSION } from '../../constants/version';
import { useLayoutStore } from '../../store/layoutStore';
const GITHUB_REPO = 'https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool';
const BUG_REPORT_URL = `${GITHUB_REPO}/issues/new?template=bug_report.md`;
const FEATURE_REQUEST_URL = `${GITHUB_REPO}/issues/new?template=feature_request.md`;

export const FeedbackButton: React.FC = () => {
  const { isFeedbackOpen, setIsFeedbackOpen } = useLayoutStore();

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsFeedbackOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 right-0 w-64 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-600/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-amber-400" />
                <span className="text-sm font-medium text-white">Feedback</span>
              </div>
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Version info */}
            <div className="px-4 py-2 bg-slate-900/50 text-xs text-slate-400">
              Version {APP_VERSION}
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => openLink(BUG_REPORT_URL)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700/50 rounded-md transition-colors group"
              >
                <Bug size={18} className="text-red-400 group-hover:text-red-300" />
                <div className="flex-1">
                  <div className="font-medium">Report a Bug</div>
                  <div className="text-xs text-slate-400">Something not working?</div>
                </div>
                <ExternalLink size={14} className="text-slate-500" />
              </button>

              <button
                onClick={() => openLink(FEATURE_REQUEST_URL)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700/50 rounded-md transition-colors group"
              >
                <Lightbulb size={18} className="text-amber-400 group-hover:text-amber-300" />
                <div className="flex-1">
                  <div className="font-medium">Request Feature</div>
                  <div className="text-xs text-slate-400">Have an idea?</div>
                </div>
                <ExternalLink size={14} className="text-slate-500" />
              </button>

              <button
                onClick={() => openLink(GITHUB_REPO)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700/50 rounded-md transition-colors group"
              >
                <MessageSquare size={18} className="text-blue-400 group-hover:text-blue-300" />
                <div className="flex-1">
                  <div className="font-medium">View All Issues</div>
                  <div className="text-xs text-slate-400">Browse discussions</div>
                </div>
                <ExternalLink size={14} className="text-slate-500" />
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-600/50 text-xs text-slate-500">
              Thanks for helping improve the tool!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
        className={`
          w-12 h-12 rounded-full shadow-lg flex items-center justify-center
          transition-colors duration-200
          ${isFeedbackOpen
            ? 'bg-slate-700 text-white'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
          }
        `}
        title="Send Feedback"
      >
        {isFeedbackOpen ? (
          <X size={20} />
        ) : (
          <MessageSquare size={20} />
        )}
      </motion.button>
    </div>
  );
};

export default FeedbackButton;
