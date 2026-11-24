import { forwardRef } from 'react';

export const Button = forwardRef(function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  ...props 
}, ref) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-40 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary/90 active:bg-accent-primary/100 shadow-glow-sm',
    secondary: 'bg-bg-card-hover text-text-primary border border-border-primary hover:bg-bg-card hover:border-border-active',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-card-hover hover:text-text-primary',
    danger: 'bg-status-danger text-white hover:bg-status-danger/90 active:bg-status-danger shadow-[0_0_10px_rgba(255,70,92,0.3)]',
    outline: 'bg-transparent border-2 border-border-primary text-text-primary hover:border-accent-primary hover:bg-accent-primary/5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
    xl: 'px-8 py-4 text-lg rounded-xl',
    icon: 'p-2.5 rounded-xl',
    'icon-sm': 'p-2 rounded-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';