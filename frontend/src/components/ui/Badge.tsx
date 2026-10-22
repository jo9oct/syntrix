import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'info' |
            'success' | 'warning' | 'active' | 'completed' | 'archived';
  size?: 'sm' | 'md';
}

const variantClasses: Record<string, string> = {
  default: 'bg-white/10 text-white',
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  info: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  completed: 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30',
  archived: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm' }) => {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    } ${variantClasses[variant] || variantClasses.default}`}>
      {children}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const s = severity.toLowerCase() as BadgeProps['variant'];
  return <Badge variant={s}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    open: 'critical',
    in_progress: 'warning',
    ready_for_retest: 'medium',
    fixed: 'success',
    reopened: 'high',
    accepted_risk: 'info',
    closed: 'completed',
    active: 'active',
    completed: 'completed',
    archived: 'archived',
    new: 'low',
    running: 'warning',
    pending: 'info',
    failed: 'critical',
    cancelled: 'critical',
    verified: 'success',
    false_positive: 'info',
    accepted: 'info',
    detected: 'warning',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <Badge variant={(map[status] || 'default') as BadgeProps['variant']}>{label}</Badge>;
};
