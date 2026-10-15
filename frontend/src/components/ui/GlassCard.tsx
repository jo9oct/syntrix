import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false, onClick }) => {
  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-purple to-brand-cyan rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      )}
      <div className="relative glass-card p-6 h-full w-full">
        {children}
      </div>
    </div>
  );
};
