import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-background-darker flex flex-col relative overflow-hidden">
      <PublicHeader />

      {/* Hero Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 pt-32 pb-20 relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-text-muted mb-4">
              <ShieldCheck size={14} className="text-brand-purple" />
              Security operations, unified
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              One platform.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-brand">
                Five expert<br/>
                workspaces.
              </span>
            </h1>
            <p className="text-text-muted text-lg max-w-lg leading-relaxed">
              Sentrix brings client reporting, detection engineering, secure delivery, malware research and platform governance into a single console — each role sees exactly the surface it needs.
            </p>
            <div className="flex items-center gap-4 pt-4">
               <Link to="/login" className="btn-primary flex items-center gap-2 px-6 py-3 rounded-full text-base">
                 Sign in to your workspace <ArrowRight size={18} />
               </Link>
               <Link to="/analysis" className="px-6 py-3 rounded-full text-white border border-white/20 hover:bg-white/5 transition-colors font-medium">
                 Live Scanner
               </Link>
               <Link to="/dashboard" className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-brand-cyan font-medium transition-colors">
                 Open Console
               </Link>
            </div>
          </div>

          <div className="relative">
             <div className="absolute -inset-4 bg-gradient-glow opacity-50 blur-2xl"></div>
             <GlassCard className="h-96 relative z-10 border-brand-purple/30">
               <div className="flex gap-4 mb-4">
                 <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                   <div className="text-xs text-text-muted mb-2">THREATS BLOCKED</div>
                   <div className="text-3xl font-bold text-white">12.4K</div>
                   <div className="text-xs text-green-400 mt-1">+8.2% 7 days</div>
                 </div>
                 <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                   <div className="text-xs text-text-muted mb-2">MEAN TIME TO RESPOND</div>
                   <div className="text-3xl font-bold text-white">6m 20s</div>
                   <div className="text-xs text-green-400 mt-1">-14% vs last week</div>
                 </div>
               </div>
               
               <div className="mt-6">
                 <div className="text-sm font-medium text-white mb-4">Detections vs. mitigations</div>
                 {/* Chart mockup */}
                 <div className="h-40 flex items-end gap-2 relative">
                    <svg viewBox="0 0 100 50" className="w-full h-full preserve-3d absolute inset-0 overflow-visible">
                      <path d="M0,40 Q20,20 40,30 T80,10 T100,20" fill="none" stroke="#a855f7" strokeWidth="2" />
                      <path d="M0,45 Q20,25 40,35 T80,20 T100,25" fill="none" stroke="#06b6d4" strokeWidth="2" />
                    </svg>
                 </div>
               </div>
             </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
};
