import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={areaId} className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors resize-none ${
          error ? 'border-red-500/50' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
};
