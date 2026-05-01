import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Layers } from "lucide-react";
import { useLayoutStore } from "../../store/layoutStore";
import { FLOOR_HEIGHT } from "../../constants";

export const FloorSelector = () => {
  const { currentFloor, setCurrentFloor } = useLayoutStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFloorPicker, setShowFloorPicker] = useState(false);

  // Monitor screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowFloorPicker(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleFloorChange = (newFloor: number) => {
    const clampedFloor = Math.max(0, newFloor);
    setCurrentFloor(clampedFloor);
    setShowFloorPicker(false);
  };

  const handleDecrementFloor = () => {
    handleFloorChange(Math.max(0, currentFloor - 1));
  };

  // Generate floor options for mobile picker
  const floorOptions = Array.from({ length: 21 }, (_, i) => i); // 0-20 floors

  if (isMobile) {
    return (
      <>
        {/* Mobile Floor Selector */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button p-3 transition-all hover:glow-blue focus-ring min-h-[24px] min-w-[24px] flex items-center justify-center"
            onClick={handleDecrementFloor}
            disabled={currentFloor <= 0}
          >
            <ChevronDown size={12} />
          </motion.button>

          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
            className="glass-panel px-2 py-1 min-w-[140px] text-center active:bg-orange-400/20 transition-all focus-ring"
            onClick={() => setShowFloorPicker(true)}
          >
            <div className="font-bold text-orange-300 text-base">
              Floor {currentFloor}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              ({currentFloor * FLOOR_HEIGHT}m)
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="sci-fi-button p-3 transition-all hover:glow-blue focus-ring min-h-[24px] min-w-[24px] flex items-center justify-center"
            onClick={() => handleFloorChange(currentFloor + 1)}
          >
            <ChevronUp size={12} />
          </motion.button>
        </div>

        {/* Mobile Floor Picker Modal */}
        <AnimatePresence>
          {showFloorPicker && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={() => setShowFloorPicker(false)}
              />

              {/* Floor Picker */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-4 z-[110] flex items-center justify-center mt-2"
              >
                <div className="glass-panel p-6 w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <Layers size={24} className="text-orange-400" />
                    <h3 className="text-lg font-bold text-orange-300">
                      Select Floor
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-3">
                      {floorOptions.map((floor) => (
                        <motion.button
                          key={floor}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`
                            sci-fi-button p-4 text-sm transition-all duration-300 focus-ring min-h-[80px] flex flex-col items-center justify-center
                            ${currentFloor === floor ? "active glow-orange" : "hover:glow-blue"}
                          `}
                          onClick={() => handleFloorChange(floor)}
                        >
                          <div className="font-bold text-lg">{floor}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {floor * FLOOR_HEIGHT}m
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="sci-fi-button p-3 mt-6 w-full min-h-[48px]"
                    onClick={() => setShowFloorPicker(false)}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Floor Selector (original design)
  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="sci-fi-button p-2 transition-all hover:glow-blue focus-ring"
        onClick={() => setCurrentFloor(Math.max(0, currentFloor - 1))}
        disabled={currentFloor <= 0}
      >
        <ChevronDown size={18} />
      </motion.button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-panel px-4 py-2 min-w-[120px] text-center"
      >
        <div className="font-bold text-orange-300 text-sm">
          Floor {currentFloor}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          ({currentFloor * FLOOR_HEIGHT}m)
        </div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="sci-fi-button p-2 transition-all hover:glow-blue focus-ring"
        onClick={() => setCurrentFloor(currentFloor + 1)}
      >
        <ChevronUp size={18} />
      </motion.button>
    </div>
  );
};
