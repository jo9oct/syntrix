import React, { useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ArrowRight, ShieldCheck, Activity, Shield, ChevronUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { About } from './About';
import { Contact } from './Contact';

export const Home: React.FC = () => {
  const location = useLocation();

  // Handle hash scrolling when landing or navigating to a hash
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    }
  }, [location.hash]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background-darker flex flex-col relative overflow-hidden font-sans">
      <PublicHeader />

      {/* Hero Section */}
      <section id="hero" className="min-h-screen flex flex-col justify-center items-center px-6 pt-32 pb-20 relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan font-medium mb-2">
              <ShieldCheck size={14} className="text-brand-cyan" />
              Unified Security Operations Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
              One platform.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-brand">
                Five expert<br/>
                workspaces.
              </span>
            </h1>
            <p className="text-text-muted text-base sm:text-lg max-w-lg leading-relaxed">
              Sentrix brings client reporting, dynamic attack surface discovery, developer remediation boards, and binary malware inspection into a single autonomous console.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
               <Link to="/login" className="btn-primary flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold shadow-lg shadow-brand-cyan/25 hover:scale-105 transition-all">
                 Sign in to workspace <ArrowRight size={16} />
               </Link>
               <Link to="/analysis" className="px-6 py-3 rounded-full text-white border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all font-semibold text-sm">
                 Live Scanner
               </Link>
               <button
                 onClick={() => scrollToSection('features')}
                 className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/15 text-text-muted hover:text-white border border-white/10 transition-all text-sm font-medium"
               >
                 Explore Features ↓
               </button>
            </div>
          </div>

          <div className="relative">
             <div className="absolute -inset-4 bg-gradient-glow opacity-50 blur-2xl pointer-events-none"></div>
             <GlassCard className="h-96 relative z-10 border-brand-purple/30 p-6 flex flex-col justify-between shadow-2xl">
               <div className="flex gap-4">
                 <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                   <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider mb-1">THREATS MITIGATED</div>
                   <div className="text-3xl font-extrabold text-white">12.4K</div>
                   <div className="text-xs text-green-400 mt-1 font-medium">+8.2% past 7 days</div>
                 </div>
                 <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                   <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider mb-1">MTTR RESOLUTION</div>
                   <div className="text-3xl font-extrabold text-white">6m 20s</div>
                   <div className="text-xs text-brand-cyan mt-1 font-medium">-14% vs baseline</div>
                 </div>
               </div>

               <div className="mt-4 flex-1 flex flex-col justify-end">
                 <div className="text-xs font-semibold text-text-muted mb-2 flex items-center justify-between">
                   <span>Real-time threat telemetry</span>
                   <span className="text-green-400 flex items-center gap-1">● Live</span>
                 </div>
                 <div className="h-32 flex items-end gap-2 relative">
                    <svg viewBox="0 0 100 50" className="w-full h-full preserve-3d absolute inset-0 overflow-visible">
                      <path d="M0,40 Q20,20 40,30 T80,10 T100,20" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                      <path d="M0,45 Q20,25 40,35 T80,20 T100,25" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
                    </svg>
                 </div>
               </div>
             </GlassCard>
          </div>
        </div>
      </section>

      {/* Features Section (Vertical Scroll target) */}
      <Features embedded={true} />

      {/* Pricing Section (Vertical Scroll target) */}
      <Pricing embedded={true} />

      {/* About Section (Vertical Scroll target) */}
      <About embedded={true} />

      {/* Contact Section (Vertical Scroll target) */}
      <Contact embedded={true} />

      {/* Public Footer */}
      <footer className="border-t border-white/10 bg-background-darker/90 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Sentrix" className="w-8 h-8 rounded-lg object-contain shadow-md shadow-brand-cyan/20" />
            <span className="text-lg font-bold text-white tracking-tight">Sentrix.</span>
            <span className="text-xs text-text-muted pl-2 border-l border-white/10">
              Autonomous Cybersecurity & Attack Surface Platform
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-text-muted">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
              Features
            </button>
            <Link to="/analysis" className="hover:text-white transition-colors">
              Live Scanner
            </Link>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">
              About
            </button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-white transition-colors">
              Contact
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-1 ml-2"
              title="Back to Top"
            >
              <ChevronUp size={14} /> Top
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-white/5 text-center text-xs text-text-muted/60">
          © {new Date().getFullYear()} Sentrix Platform. All rights reserved. Zero-Trust Cloud & On-Premises Architecture.
        </div>
      </footer>
    </div>
  );
};
