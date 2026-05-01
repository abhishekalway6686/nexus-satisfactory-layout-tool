import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { tooltipAnimation } from './animations';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
  offset?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'auto',
  delay = 500,
  disabled = false,
  className = '',
  offset = 8
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState<TooltipPlacement>(placement);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalPlacement = placement;
    let x = 0;
    let y = 0;

    // Auto placement logic
    if (placement === 'auto') {
      const spaceTop = triggerRect.top;
      const spaceBottom = viewportHeight - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = viewportWidth - triggerRect.right;

      if (spaceTop > tooltipRect.height + offset) {
        finalPlacement = 'top';
      } else if (spaceBottom > tooltipRect.height + offset) {
        finalPlacement = 'bottom';
      } else if (spaceLeft > tooltipRect.width + offset) {
        finalPlacement = 'left';
      } else if (spaceRight > tooltipRect.width + offset) {
        finalPlacement = 'right';
      } else {
        finalPlacement = 'top';
      }
    }

    // Calculate position based on placement
    switch (finalPlacement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - offset;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + offset;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + offset;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Keep tooltip within viewport
    x = Math.max(8, Math.min(x, viewportWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, viewportHeight - tooltipRect.height - 8));

    setPosition({ x, y });
    setActualPlacement(finalPlacement);
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  // Clone the child element and attach event handlers
  const childWithProps = React.cloneElement(children as React.ReactElement<any>, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter,
    onBlur: handleMouseLeave,
    'aria-describedby': isVisible ? 'tooltip' : undefined
  });

  return (
    <>
      {childWithProps}
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={tooltipRef}
              id="tooltip"
              role="tooltip"
              className={`
                fixed z-[9999] pointer-events-none
                px-3 py-2 rounded-md
                bg-slate-900/95 backdrop-blur-sm
                border border-slate-700
                shadow-xl
                ${className}
              `}
              style={{
                left: position.x,
                top: position.y
              }}
              variants={tooltipAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Arrow */}
              <div
                className={`
                  absolute w-2 h-2 bg-slate-900/95 border border-slate-700
                  transform rotate-45
                  ${actualPlacement === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0' : ''}
                  ${actualPlacement === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-b-0 border-r-0' : ''}
                  ${actualPlacement === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-l-0 border-b-0' : ''}
                  ${actualPlacement === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-r-0 border-t-0' : ''}
                `}
              />
              
              {/* Content */}
              <div className="relative text-sm text-slate-200">
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

// Quick tooltip for simple text
export const QuickTooltip: React.FC<{
  text: string;
  children: React.ReactElement;
  placement?: TooltipPlacement;
}> = ({ text, children, placement = 'auto' }) => (
  <Tooltip content={text} placement={placement} delay={300}>
    {children}
  </Tooltip>
);

// Rich tooltip with custom content
export const RichTooltip: React.FC<{
  title?: string;
  description?: string;
  shortcut?: string;
  children: React.ReactElement;
  placement?: TooltipPlacement;
}> = ({ title, description, shortcut, children, placement = 'auto' }) => (
  <Tooltip
    content={
      <div className="space-y-1">
        {title && <div className="font-medium text-white">{title}</div>}
        {description && <div className="text-xs text-slate-400">{description}</div>}
        {shortcut && (
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-slate-500">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs">
              {shortcut}
            </kbd>
          </div>
        )}
      </div>
    }
    placement={placement}
    delay={300}
  >
    {children}
  </Tooltip>
);