import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Heart, X } from 'lucide-react';

export const DonationNudge: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Logic to show "every so often"
    try {
      const launchCountKey = 'nexus_launch_count';
      const lastSeenKey = 'nexus_donation_last_seen';
      
      const currentCount = parseInt(localStorage.getItem(launchCountKey) || '0', 10) + 1;
      localStorage.setItem(launchCountKey, currentCount.toString());

      // Show every 5th launch, but not if we just showed it (simple debounce)
      // Also waiting a few seconds after load so it's not annoying immediately
      if (currentCount > 0 && currentCount % 5 === 0) {
        const timer = setTimeout(() => {
          setIsVisible(true);
          localStorage.setItem(lastSeenKey, new Date().toISOString());
        }, 5000); // Wait 5 seconds after app load
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Failed to track launch count for donation nudge', e);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -50, y: 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-20 left-4 z-40 max-w-sm"
      >
        <div className="bg-slate-800/90 backdrop-blur-md border border-amber-500/20 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500/20 to-transparent p-3 flex items-center justify-between border-b border-amber-500/10">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Heart size={16} className="fill-amber-400/20" />
              <span>Enjoying Nexus?</span>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Coffee size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                neXus is free and open source, but developing it takes a lot of caffeine! ☕
              </p>
              <p className="text-xs text-slate-400 mb-3">
                If you'd like to support the development, consider buying me a coffee.
              </p>
              
              <div className="flex gap-2">
                <a 
                  href="https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                >
                  <Coffee size={14} />
                  Support
                </a>
                <button 
                  onClick={() => setIsVisible(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
