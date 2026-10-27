import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Shield, Bug, Code, FileText, Users, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';

const features = [
  {
    icon: <Shield size={22} />,
    iconColor: 'text-brand-cyan',
    iconBg: 'bg-brand-cyan/10 border-brand-cyan/20',
    accentLine: 'from-brand-cyan/40 to-transparent',
    title: 'Security Assessment',
    description: 'Comprehensive web application and API penetration testing with automated vulnerability discovery.',
    link: '/dashboard/assessment/new',
    actionText: 'Launch Assessment'
  },
  {
    icon: <Bug size={22} />,
    iconColor: 'text-brand-purple',
    iconBg: 'bg-brand-purple/10 border-brand-purple/20',
    accentLine: 'from-brand-purple/40 to-transparent',
    title: 'Malware Analysis',
    description: 'Advanced static and dynamic malware analysis with IOC extraction and MITRE ATT&CK mapping.',
    link: '/dashboard/malware',
    actionText: 'Inspect Samples'
  },
  {
    icon: <Code size={22} />,
    iconColor: 'text-brand-magenta',
    iconBg: 'bg-brand-magenta/10 border-brand-magenta/20',
    accentLine: 'from-brand-magenta/40 to-transparent',
    title: 'Secure Development',
    description: 'Integrate security testing directly into your SDLC with threat modeling and code review tools.',
    link: '/dashboard/remediation',
    actionText: 'Remediation Board'
  },
  {
    icon: <FileText size={22} />,
    iconColor: 'text-brand-cyan',
    iconBg: 'bg-brand-cyan/10 border-brand-cyan/20',
    accentLine: 'from-brand-cyan/40 to-transparent',
    title: 'Client Reporting',
    description: 'Generate beautiful, executive-ready PDF reports with actionable remediation advice.',
    link: '/dashboard/reports',
    actionText: 'View Reports'
  },
  {
    icon: <Users size={22} />,
    iconColor: 'text-brand-purple',
    iconBg: 'bg-brand-purple/10 border-brand-purple/20',
    accentLine: 'from-brand-purple/40 to-transparent',
    title: 'Role-Based Access',
    description: 'Five specialized expert workspaces designed for different roles in your security operations.',
    link: '/dashboard/admin',
    actionText: 'Explore RBAC'
  },
  {
    icon: <Bot size={22} />,
    iconColor: 'text-brand-magenta',
    iconBg: 'bg-brand-magenta/10 border-brand-magenta/20',
    accentLine: 'from-brand-magenta/40 to-transparent',
    title: 'Live Scanner',
    description: 'Instant zero-configuration external surface analysis for public endpoints and suspicious files.',
    link: '/analysis',
    actionText: 'Run Free Scan'
  }
];

export const Features: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const content = (
    <div id="features" className="max-w-7xl mx-auto relative z-10 scroll-mt-28 px-4 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="text-center mb-14 space-y-4">
        <div className="section-badge bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
          <Sparkles size={12} /> Platform Capabilities
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
          Everything you need for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-brand">
            modern security ops
          </span>
        </h2>
        <p className="text-text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Sentrix unifies disconnected security tools into a single, cohesive platform designed for every role on your team.
        </p>
      </div>

      {/* Feature cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {features.map((feature, i) => (
          <div
            key={i}
            className="glass-card glass-card-hover flex flex-col relative overflow-hidden group"
          >
            {/* Top accent line */}
            <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${feature.accentLine} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="p-6 flex flex-col h-full">
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 ${feature.iconBg} ${feature.iconColor}`}>
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-base font-bold text-white mb-2.5">{feature.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed flex-1 mb-5">{feature.description}</p>

              {/* Action link */}
              <Link
                to={feature.link}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-all ${feature.iconColor} hover:opacity-80 group/link`}
              >
                {feature.actionText}
                <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* CTA banner */}
      <div className="glass-elevated rounded-3xl border border-white/8 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 bg-gradient-glow opacity-20 pointer-events-none" aria-hidden="true" />
        <div className="absolute right-0 top-0 w-64 h-64 orb orb-cyan opacity-30 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 p-8 sm:p-12 text-center">
          <div className="max-w-xl mx-auto space-y-5">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
              Ready to test your security posture?
            </h3>
            <p className="text-text-muted text-sm sm:text-base leading-relaxed">
              Explore the full interactive platform with preloaded demo data and simulated security assessment engines.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link
                to="/dashboard"
                className="btn-primary flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold"
              >
                Enter Console <ArrowRight size={15} />
              </Link>
              <Link
                to="/analysis"
                className="btn-secondary flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
              >
                Try Live Scanner
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="py-20 sm:py-24 relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 section-glow-left opacity-40 pointer-events-none" aria-hidden="true" />
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
