import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Shield, Eye, Zap, Sparkles } from 'lucide-react';
import { PublicHeader } from '../../components/layout/PublicHeader';

const pillars = [
  {
    icon: <Shield size={22} />,
    iconColor: 'text-brand-cyan',
    iconBg: 'bg-brand-cyan/10 border-brand-cyan/20',
    title: 'Security First',
    desc: 'Every component is built with zero-trust principles and robust access controls at every layer.'
  },
  {
    icon: <Eye size={22} />,
    iconColor: 'text-brand-purple',
    iconBg: 'bg-brand-purple/10 border-brand-purple/20',
    title: 'Complete Visibility',
    desc: 'From executive summaries to technical IOCs, see exactly what matters to your role and team.'
  },
  {
    icon: <Zap size={22} />,
    iconColor: 'text-brand-magenta',
    iconBg: 'bg-brand-magenta/10 border-brand-magenta/20',
    title: 'Expert Workflows',
    desc: 'Automated reporting and intelligent routing get findings to developers faster than ever.'
  }
];

const workflowSteps = [
  { step: 1, title: 'Asset Discovery', desc: 'Map your web applications and APIs automatically.', color: 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30' },
  { step: 2, title: 'Vulnerability Assessment', desc: 'Run comprehensive dynamic tests against targets.', color: 'bg-brand-purple/15 text-brand-purple border-brand-purple/30' },
  { step: 3, title: 'Developer Remediation', desc: 'Assign findings to developers with AI-assisted guidance.', color: 'bg-brand-magenta/15 text-brand-magenta border-brand-magenta/30' },
  { step: 4, title: 'Verification & Retest', desc: 'Security engineers verify fixes in a single click.', color: 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30' }
];

export const About: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const content = (
    <div id="about" className="max-w-5xl mx-auto scroll-mt-28 px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-14 space-y-4">
        <div className="section-badge bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
          <Sparkles size={12} /> Our Mission
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
          Built for security professionals,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-brand">
            by security professionals
          </span>
        </h2>
        <p className="text-text-muted text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
          Sentrix was created out of a need to unify disconnected cybersecurity tools. We believe that security operations shouldn't require jumping between ten different dashboards. Our mission is to provide a single, cohesive platform where clients, engineers, and analysts can collaborate seamlessly.
        </p>
      </div>

      {/* Pillars grid */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {pillars.map((p, i) => (
          <div key={i} className="glass-card glass-card-hover p-6 text-center flex flex-col items-center">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${p.iconBg} ${p.iconColor}`}>
              {p.icon}
            </div>
            <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Platform Workflow */}
      <div className="glass-elevated rounded-3xl border border-white/8 overflow-hidden">
        <div className="p-7 sm:p-8">
          <h3 className="text-xl font-extrabold text-white mb-7 tracking-tight">Platform Workflow</h3>
          <div className="space-y-0">
            {workflowSteps.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line */}
                {i < workflowSteps.length - 1 && (
                  <div className="absolute left-[1.375rem] top-10 bottom-0 w-px bg-white/8" aria-hidden="true" />
                )}
                <div className="flex gap-4 pb-6 last:pb-0">
                  <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center font-extrabold text-sm z-10 relative ${s.color}`}>
                    {s.step}
                  </div>
                  <div className="pt-2.5">
                    <h4 className="text-sm font-bold text-white mb-1">{s.title}</h4>
                    <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 section-glow-left opacity-35 pointer-events-none" aria-hidden="true" />
        {content}
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-background-darker pt-32 pb-20 relative overflow-hidden">
      <PublicHeader />
      {content}
    </div>
  );
};
