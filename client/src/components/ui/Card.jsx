import { forwardRef } from 'react';

export const Card = forwardRef(function Card({ 
  children, 
  variant = 'default', 
  className = '', 
  padding = 'p-6',
  hover = false,
  active = false,
  ...props 
}, ref) {
  const variants = {
    default: 'bg-bg-card border border-border-primary',
    elevated: 'bg-bg-card shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_0_1px_rgba(20,36,58,1)]',
    glass: 'bg-bg-card/80 backdrop-blur-md border border-border-primary/50',
    hover: 'bg-bg-card border border-border-primary hover:bg-bg-card-hover hover:border-border-active hover:shadow-glow-sm transition-all duration-200',
    active: 'bg-bg-card-hover border-border-active shadow-glow-sm',
  };

  const hoverClass = hover ? 'hover:bg-bg-card-hover hover:border-border-active hover:shadow-glow-sm transition-all duration-200' : '';

  return (
    <div
      ref={ref}
      className={`
        rounded-xl overflow-hidden ${variants[variant]} ${hoverClass} ${active ? 'border-border-active shadow-glow-sm bg-bg-card-hover' : ''} ${className}
      `}
      {...props}
    >
      <div className={padding}>{children}</div>
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = forwardRef(function CardHeader({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`px-6 py-4 border-b border-border-primary ${className}`} {...props}>
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef(function CardContent({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef(function CardFooter({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`px-6 py-4 border-t border-border-primary bg-bg-card-hover/50 ${className}`} {...props}>
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';