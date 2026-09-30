import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Shield, Eye, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background-darker pt-32 pb-20 px-6 relative overflow-hidden">
      <PublicHeader />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Built for security professionals, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-brand">by security professionals</span>
          </h1>
          <p className="text-text-muted text-lg leading-relaxed">
            Sentrix was created out of a need to unify disconnected cybersecurity tools. We believe that security operations shouldn't require jumping between ten different dashboards. Our mission is to provide a single, cohesive platform where clients, engineers, and analysts can collaborate seamlessly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <GlassCard className="text-center">
            <Shield className="w-10 h-10 text-brand-cyan mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Security First</h3>
            <p className="text-sm text-text-muted">Every component is built with zero-trust principles and robust access controls.</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Eye className="w-10 h-10 text-brand-purple mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Complete Visibility</h3>
            <p className="text-sm text-text-muted">From executive summaries to technical IOCs, see exactly what matters to your role.</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Zap className="w-10 h-10 text-brand-magenta mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Expert Workflows</h3>
            <p className="text-sm text-text-muted">Automated reporting and intelligent routing get findings to developers faster.</p>
          </GlassCard>
        </div>

        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Platform Workflow</h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Asset Discovery', desc: 'Map your web applications and APIs automatically.' },
              { step: 2, title: 'Vulnerability Assessment', desc: 'Run comprehensive dynamic tests against targets.' },
              { step: 3, title: 'Developer Remediation', desc: 'Assign findings to developers with AI-assisted guidance.' },
              { step: 4, title: 'Verification & Retest', desc: 'Security engineers verify fixes in a single click.' }
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-bold">
                  {s.step}
                </div>
                <div>
                  <h4 className="text-white font-medium">{s.title}</h4>
                  <p className="text-sm text-text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
