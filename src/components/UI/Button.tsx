import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { QuickTooltip } from './Tooltip';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  tooltip?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-orange-500 to-orange-600 
    hover:from-orange-600 hover:to-orange-700 
    text-white border border-transparent
    shadow-lg shadow-orange-500/20
    hover:shadow-xl hover:shadow-orange-500/30
    backdrop-blur-sm
    before:absolute before:inset-0 before:bg-white/10 before:opacity-0 before:transition-opacity hover:before:opacity-100
  `,
  secondary: `
    bg-gradient-to-r from-slate-700 to-slate-800
    hover:from-slate-800 hover:to-slate-900
    text-white border border-slate-600/50
    shadow-md shadow-slate-900/50
    backdrop-blur-sm
  `,
  outline: `
    bg-transparent border-2 border-orange-500/50
    hover:border-orange-500 hover:bg-orange-500/10
    text-orange-400 hover:text-orange-300
    hover:shadow-[0_0_20px_rgba(250,149,73,0.3)]
    backdrop-blur-sm
  `,
  ghost: `
    bg-transparent border border-transparent
    hover:bg-slate-800/50 hover:border-slate-700/50
    text-slate-300 hover:text-white
    backdrop-blur-sm
  `,
  danger: `
    bg-gradient-to-r from-red-500 to-red-600
    hover:from-red-600 hover:to-red-700
    text-white border border-transparent
    shadow-lg shadow-red-500/20
    hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]
    backdrop-blur-sm
  `
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-4 text-lg gap-3'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  tooltip,
  disabled,
  children,
  className = '',
  ...props
}, ref) => {
  const button = (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center overflow-hidden
        font-medium rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
        disabled:opacity-50 disabled:cursor-not-allowed disabled:backdrop-filter-none
        interactive-feedback
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {/* Enhanced shine effect */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
          initial={{ x: '-200%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0"
        style={{ 
          background: variant === 'primary' ? 'radial-gradient(circle at center, rgba(250,149,73,0.3), transparent 70%)' :
                     variant === 'danger' ? 'radial-gradient(circle at center, rgba(239,68,68,0.3), transparent 70%)' :
                     'none'
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        {loading ? (
          <Loader2 className="animate-spin" size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </div>
    </motion.button>
  );

  if (tooltip) {
    return (
      <QuickTooltip text={tooltip}>
        {button}
      </QuickTooltip>
    );
  }

  return button;
});

Button.displayName = 'Button';

// Icon button variant
interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition' | 'children'> {
  icon: React.ReactNode;
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  label,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const iconSizeStyles: Record<ButtonSize, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  return (
    <Button
      ref={ref}
      size={size}
      tooltip={label}
      aria-label={label}
      className={`
        !p-0 aspect-square
        ${iconSizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

// Button group component
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return (
    <motion.div 
      className={`inline-flex rounded-lg overflow-hidden shadow-lg backdrop-blur-sm border border-slate-700/50 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${child.props.className || ''} !rounded-none ${
              index > 0 ? 'border-l border-slate-700/50' : ''
            }`,
            initial: undefined,
            animate: undefined
          });
        }
        return child;
      })}
    </motion.div>
  );
};