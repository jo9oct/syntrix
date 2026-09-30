import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors font-sans ${
          error ? 'border-red-500/50 focus:border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-text-muted">{helperText}</p>}
    </div>
  );
};
