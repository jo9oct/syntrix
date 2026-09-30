import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', loading = false,
  icon, className = '', disabled, ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary: 'bg-gradient-to-r from-brand to-brand-purple text-white hover:opacity-90 shadow-lg shadow-brand-purple/20',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
    ghost: 'text-text-muted hover:text-white hover:bg-white/5',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-text-muted mb-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>}
      <input
        className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-2 ${icon ? 'pl-10' : 'pl-3'} pr-3 text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-text-muted mb-1">{label}</label>}
    <select
      className={`w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors appearance-none ${className}`}
      {...props}
    >
      {options.map(o => <option key={o.value} value={o.value} className="bg-background-lighter">{o.label}</option>)}
    </select>
  </div>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-text-muted mb-1">{label}</label>}
    <textarea
      className={`w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors resize-none ${className}`}
      {...props}
    />
  </div>
);

interface ProgressBarProps { value: number; max?: number; className?: string; gradient?: boolean }
export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, className = '', gradient = true }) => (
  <div className={`w-full h-2 bg-white/10 rounded-full overflow-hidden ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-500 ${gradient ? 'bg-gradient-to-r from-brand-cyan to-brand-purple' : 'bg-brand-cyan'}`}
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
);

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }> = ({
  icon, title, description, action
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-text-muted">{icon}</div>}
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    {description && <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className = '' }) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="h-12 bg-white/5 rounded-xl" style={{ opacity: 1 - i * 0.2 }} />
    ))}
  </div>
);

interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-background-lighter border border-white/10 rounded-2xl shadow-2xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export * from './Badge';
export * from './GlassCard';

