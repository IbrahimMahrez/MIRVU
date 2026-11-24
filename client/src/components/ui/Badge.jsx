export function Badge({ 
  children, 
  variant = 'default', 
  className = '', 
  leftIcon,
  rightIcon,
  dot = false,
  dotColor,
  ...props 
}) {
  const variants = {
    default: 'bg-bg-card-hover text-text-secondary border border-border-primary',
    primary: 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30',
    success: 'bg-status-success/15 text-status-success border border-status-success/30',
    warning: 'bg-status-warning/15 text-status-warning border border-status-warning/30',
    danger: 'bg-status-danger/15 text-status-danger border border-status-danger/30',
    muted: 'bg-bg-input text-text-muted border border-border-primary',
    dataset: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    ai: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
    followup: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    outline: 'bg-transparent text-text-primary border-2 border-border-primary',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {dot && (
        <span 
          className={`w-1.5 h-1.5 rounded-full ${dotColor || (variant === 'success' ? 'bg-status-success' : variant === 'warning' ? 'bg-status-warning' : variant === 'danger' ? 'bg-status-danger' : 'bg-accent-primary')}`}
        />
      )}
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </span>
  );
}