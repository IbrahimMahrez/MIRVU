import { forwardRef } from 'react';

export const Select = forwardRef(function Select({ 
  label, 
  error, 
  hint, 
  options = [], 
  placeholder,
  className = '', 
  ...props 
}, ref) {
  const id = props.id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`
          w-full px-4 py-3 rounded-lg bg-bg-input border transition-all duration-200 appearance-none
          text-text-primary
          focus:outline-none focus:ring-2 focus:ring-accent-primary/50
          ${error 
            ? 'border-status-danger focus:ring-status-danger/50 focus:border-status-danger' 
            : 'border-border-primary focus:border-accent-primary'
          }
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-status-danger flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-text-muted">{hint}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';