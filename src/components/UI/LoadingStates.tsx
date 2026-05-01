import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Package, FileSearch, AlertCircle, CheckCircle } from 'lucide-react';
import { shimmerAnimation, pulseAnimation, animations } from './animations';

// Skeleton loader component
export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}> = ({ width = '100%', height = '1rem', className = '', variant = 'text' }) => {
  const baseClasses = 'relative overflow-hidden bg-gradient-to-r from-transparent via-white/5 to-transparent';
  
  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };
  
  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        variants={shimmerAnimation}
        initial="initial"
        animate="animate"
      />
    </motion.div>
  );
};

// Loading spinner component
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  message?: string;
}> = ({ size = 'md', color = 'text-orange-400', message }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-3"
      variants={animations.fadeIn}
      initial="initial"
      animate="animate"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className={`${sizes[size]} ${color}`} />
      </motion.div>
      {message && (
        <motion.p
          className="text-sm text-gray-400"
          variants={pulseAnimation}
          initial="initial"
          animate="animate"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
};

// Progress loader component
export const ProgressLoader: React.FC<{
  progress: number;
  message?: string;
  showPercentage?: boolean;
}> = ({ progress, message, showPercentage = true }) => {
  return (
    <motion.div
      className="w-full space-y-3"
      variants={animations.fadeInUp}
      initial="initial"
      animate="animate"
    >
      {message && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{message}</span>
          {showPercentage && (
            <span className="text-sm font-mono text-orange-400">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            variants={shimmerAnimation}
            initial="initial"
            animate="animate"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

// Empty state component
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      variants={animations.fadeInUp}
      initial="initial"
      animate="animate"
    >
      {icon || (
        <motion.div
          className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Package className="w-8 h-8 text-gray-600" />
        </motion.div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      )}
      
      {action && (
        <motion.button
          className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

// Error state component
export const ErrorState: React.FC<{
  title?: string;
  message: string;
  retry?: () => void;
  details?: string;
}> = ({ title = 'Something went wrong', message, retry, details }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      variants={animations.fadeInUp}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AlertCircle className="w-8 h-8 text-red-400" />
      </motion.div>
      
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
      
      <div className="flex gap-3">
        {retry && (
          <motion.button
            className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={retry}
          >
            Try Again
          </motion.button>
        )}
        
        {details && (
          <motion.button
            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 text-sm font-medium transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </motion.button>
        )}
      </div>
      
      {showDetails && details && (
        <motion.div
          className="mt-4 p-3 bg-gray-900/50 border border-gray-800 rounded-lg max-w-md"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <code className="text-xs text-gray-500 font-mono">{details}</code>
        </motion.div>
      )}
    </motion.div>
  );
};

// Success state component
export const SuccessState: React.FC<{
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ title = 'Success!', message, action }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      variants={animations.scaleInBounce}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CheckCircle className="w-8 h-8 text-green-400" />
        </motion.div>
      </motion.div>
      
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{message}</p>
      
      {action && (
        <motion.button
          className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg text-green-400 text-sm font-medium transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

// Search empty state
export const SearchEmptyState: React.FC<{
  query: string;
  onClear?: () => void;
}> = ({ query, onClear }) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      variants={animations.fadeInUp}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4"
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <FileSearch className="w-8 h-8 text-gray-600" />
      </motion.div>
      
      <h3 className="text-lg font-semibold text-gray-300 mb-2">
        No results found
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        We couldn't find anything matching "{query}"
      </p>
      
      {onClear && (
        <motion.button
          className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 text-sm font-medium transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClear}
        >
          Clear Search
        </motion.button>
      )}
    </motion.div>
  );
};

// Loading card skeleton
export const LoadingCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      <Skeleton height="12rem" variant="rectangular" />
      <Skeleton height="1.5rem" width="70%" />
      <Skeleton height="1rem" width="90%" />
      <Skeleton height="1rem" width="80%" />
      <div className="flex gap-2 pt-2">
        <Skeleton height="2rem" width="5rem" variant="rectangular" />
        <Skeleton height="2rem" width="5rem" variant="rectangular" />
      </div>
    </div>
  );
};

// Pulsing dots loader
export const PulsingDots: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}> = ({ size = 'md', color = 'bg-orange-400' }) => {
  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };
  
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${sizes[size]} ${color} rounded-full`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
};