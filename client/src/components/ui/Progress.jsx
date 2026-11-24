import { forwardRef } from 'react';

export const ProgressBar = forwardRef(function ProgressBar({ 
  value = 0, 
  max = 100, 
  label, 
  showValue = true,
  variant = 'default',
  size = 'md',
  className = '',
  animated = true,
  stripes = false,
  ...props 
}, ref) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  
  const variants = {
    default: 'bg-accent-primary',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    cyan: 'bg-accent-secondary',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
    xl: 'h-6',
  };

  const trackSizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
    xl: 'h-6',
  };

  return (
    <div className="w-full" {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          {label && <span className="text-text-secondary">{label}</span>}
          {showValue && <span className="text-text-primary font-mono">{Math.round(percent)}%</span>}
        </div>
      )}
      <div className={`relative overflow-hidden rounded-full bg-bg-input ${trackSizes[size]}`}>
        <div
          ref={ref}
          className={`
            h-full rounded-full transition-all duration-700 ease-out
            ${variants[variant]} ${animated ? 'animate-in' : ''} ${stripes ? 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[pulse_1s_linear_infinite]' : ''}
          `}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export const CircularProgress = forwardRef(function CircularProgress({ 
  value = 0, 
  max = 100, 
  size = 80, 
  strokeWidth = 6,
  label,
  subLabel,
  variant = 'default',
  className = '',
  showBackground = true,
  animated = true,
  ...props 
}, ref) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth);
  const offset = circumference - (percent / 100) * circumference;
  
  const variants = {
    default: 'stroke-accent-primary',
    success: 'stroke-status-success',
    warning: 'stroke-status-warning',
    danger: 'stroke-status-danger',
    cyan: 'stroke-accent-secondary',
  };

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }} {...props}>
      <svg ref={ref} width={size} height={size} className="transform -rotate-90">
        {showBackground && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth}
            fill="none"
            stroke="#14243A"
            strokeWidth={strokeWidth}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`
            ${variants[variant]} transition-all duration-700 ease-out
            ${animated ? 'animate-in' : ''}
          `}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="text-2xl font-bold text-text-primary font-mono">{Math.round(percent)}%</span>
        )}
        {subLabel && (
          <span className="text-xs text-text-muted">{subLabel}</span>
        )}
      </div>
    </div>
  );
});

CircularProgress.displayName = 'CircularProgress';

export const StepProgress = forwardRef(function StepProgress({ 
  steps = [], 
  currentStep = 0, 
  variant = 'default',
  className = '',
  ...props 
}, ref) {
  const variants = {
    default: 'bg-accent-primary',
    success: 'bg-status-success',
  };

  return (
    <div className={`flex items-center ${className}`} {...props}>
      {steps.map((step, index) => (
        <div key={step.id || index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`
              relative flex items-center justify-center rounded-full border-2 transition-all duration-300
              ${index < currentStep 
                ? `bg-${variants[variant]} border-${variants[variant]} text-white` 
                : index === currentStep 
                  ? `bg-bg-card border-accent-primary text-accent-primary shadow-glow-sm` 
                  : `bg-bg-input border-border-primary text-text-muted`
              }
            `} style={{ width: 36, height: 36 }}>
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="font-mono font-bold text-sm">{index + 1}</span>
              )}
            </div>
            <span className={`
              mt-2 text-xs font-medium text-center max-w-[80px]
              ${index <= currentStep ? 'text-text-primary' : 'text-text-muted'}
            `}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`
              flex-1 h-1 mx-2 rounded transition-colors duration-300
              ${index < currentStep ? `bg-${variants[variant]}` : 'bg-border-primary'}
            `} />
          )}
        </div>
      ))}
    </div>
  );
});

StepProgress.displayName = 'StepProgress';