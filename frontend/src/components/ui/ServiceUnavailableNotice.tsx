import React from 'react';
import { GlassCard } from './GlassCard';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceUnavailableNoticeProps {
  message?: string;
  moduleName?: string;
}

export const ServiceUnavailableNotice: React.FC<ServiceUnavailableNoticeProps> = ({
  message = 'service now not avlible',
}) => {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto animate-fadeIn py-20">
      <GlassCard className="p-8 sm:p-12 border-amber-500/30 text-center space-y-6 relative overflow-hidden bg-surface/60 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
          <AlertTriangle size={32} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {message}
          </h2>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
          >
            <ArrowLeft size={14} /> Return to Dashboard
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
