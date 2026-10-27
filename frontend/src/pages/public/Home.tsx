import React, { useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ArrowRight, ShieldCheck, Activity, Shield, ChevronUp, TrendingUp, Zap } from 'lucide-react';
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

      {/* ── Hero Section ─────────────────────────────── */}
      <section
        id="hero"
        className="min-h-screen flex flex-col justify-center items-center px-6 pt-28 sm:pt-32 pb-20 relative z-10 max-w-7xl mx-auto w-full"
      >
        {/* Background decorative orbs */}
        <div className="absolute -top-20 -left-24 w-[520px] h-[520px] orb orb-blue opacity-60 animate-pulse-slow pointer-events-none" aria-hidden="true" />
        <div className="absolute top-40 -right-32 w-[440px] h-[440px] orb orb-cyan opacity-50 animate-pulse-slow pointer-events-none" style={{ animationDelay: '1.5s' }} aria-hidden="true" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] orb orb-purple opacity-30 pointer-events-none" aria-hidden="true" />

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center w-full relative">
          {/* Left: Headline + CTA */}
          <div className="space-y-7">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan font-semibold tracking-wide">
              <ShieldCheck size={13} />
              Unified Security Operations Platform
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.06] tracking-tight">
                One platform.
              </h1>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.06] tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-brand-cool">
                  Five expert
                </span>
              </h1>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.06] tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-brand-cool">
                  workspaces.
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-text-muted text-base sm:text-lg max-w-lg leading-relaxed">
              Sentrix brings client reporting, dynamic attack surface discovery, developer remediation boards,
              and binary malware inspection into a single autonomous console.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/login"
                className="btn-primary flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold"
              >
                Sign in to workspace <ArrowRight size={15} />
              </Link>
              <Link
                to="/analysis"
                className="btn-secondary flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
              >
                Live Scanner
              </Link>
              <button
                onClick={() => scrollToSection('features')}
                className="px-5 py-3 rounded-full text-text-muted hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan"
              >
                Explore Features ↓
              </button>
            </div>

            {/* Social proof strip */}
            <div className="flex items-center gap-5 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                Platform online
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="text-xs text-text-muted">OWASP Top 10 coverage</div>
              <div className="w-px h-4 bg-white/10" />
              <div className="text-xs text-text-muted">Zero-trust architecture</div>
            </div>
          </div>

          {/* Right: Stats Card */}
          <div className="relative">
            {/* Glow behind card */}
            <div className="absolute -inset-8 bg-gradient-glow-cyan opacity-60 blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="relative z-10 glass-elevated border border-brand-cyan/15 rounded-3xl p-6 shadow-glow-cyan flex flex-col gap-5">
              {/* Top stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card rounded-xl p-4">
                  <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">THREATS MITIGATED</div>
                  <div className="text-3xl font-extrabold text-white tabular-nums">12.4K</div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1.5 font-semibold">
                    <TrendingUp size={11} /> +8.2% past 7 days
                  </div>
                </div>
                <div className="stat-card rounded-xl p-4">
                  <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">MTTR RESOLUTION</div>
                  <div className="text-3xl font-extrabold text-white tabular-nums">6m 20s</div>
                  <div className="flex items-center gap-1 text-xs text-brand-cyan mt-1.5 font-semibold">
                    <Zap size={11} /> -14% vs baseline
                  </div>
                </div>
              </div>

              {/* Chart area */}
              <div className="rounded-2xl bg-black/25 border border-white/5 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-muted">Real-time threat telemetry</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)] animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="h-28 w-full relative">
                  <svg viewBox="0 0 200 60" className="w-full h-full" aria-hidden="true" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                    <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                    {/* Fill areas */}
                    <defs>
                      <linearGradient id="grad-purple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22"/>
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="grad-cyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M0,45 Q25,30 50,38 T100,18 T150,25 T200,10 L200,60 L0,60 Z" fill="url(#grad-purple)" />
                    <path d="M0,50 Q30,38 55,44 T110,28 T160,35 T200,22 L200,60 L0,60 Z" fill="url(#grad-cyan)" />
                    {/* Lines */}
                    <path d="M0,45 Q25,30 50,38 T100,18 T150,25 T200,10" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M0,50 Q30,38 55,44 T110,28 T160,35 T200,22" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round"/>
                    {/* End dots */}
                    <circle cx="200" cy="10" r="2.5" fill="#a855f7"/>
                    <circle cx="200" cy="22" r="2.5" fill="#06b6d4"/>
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded bg-brand-purple inline-block"/>Threat Events</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded bg-brand-cyan inline-block"/>Mitigations</span>
                </div>
              </div>

              {/* Bottom capability tags */}
              <div className="flex flex-wrap gap-2">
                {['DAST Engine', 'API Fuzzing', 'Malware Lab', 'RBAC', 'PDF Reports'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] font-semibold text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Embedded Sections ─────────────────────────── */}
      <Features embedded={true} />
      <Pricing embedded={true} />
      <About embedded={true} />
      <Contact embedded={true} />

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-white/7 bg-background-darker/95 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-brand-cyan/20 blur-sm" />
              <img src="/logo.png" alt="Sentrix" className="relative w-8 h-8 rounded-xl object-contain" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              Sentrix<span className="text-brand-cyan">.</span>
            </span>
            <span className="text-xs text-text-muted pl-3 border-l border-white/10 hidden sm:block">
              Autonomous Cybersecurity & Attack Surface Platform
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-text-muted">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
            >
              Features
            </button>
            <Link to="/analysis" className="hover:text-white transition-colors">Live Scanner</Link>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
            >
              Contact
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-1 ml-1 border border-white/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan"
              title="Back to Top"
            >
              <ChevronUp size={13} /> Top
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-5 border-t border-white/5 text-center text-xs text-text-muted/50">
          © {new Date().getFullYear()} Sentrix Platform. All rights reserved. Zero-Trust Cloud & On-Premises Architecture.
        </div>
      </footer>
    </div>
  );
};
