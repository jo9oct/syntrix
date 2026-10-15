import React from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Shield, Bug, Code, FileText, Users, Bot, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';

const features = [
  {
    icon: <Shield className="text-brand-cyan" size={24} />,
    title: 'Security Assessment',
    description: 'Comprehensive web application and API penetration testing with automated vulnerability discovery.',
    link: '/dashboard/assessment/new',
    actionText: 'Launch Assessment'
  },
  {
    icon: <Bug className="text-brand-purple" size={24} />,
    title: 'Malware Analysis',
    description: 'Advanced static and dynamic malware analysis with IOC extraction and MITRE ATT&CK mapping.',
    link: '/dashboard/malware',
    actionText: 'Inspect Samples'
  },
  {
    icon: <Code className="text-brand-magenta" size={24} />,
    title: 'Secure Development',
    description: 'Integrate security testing directly into your SDLC with threat modeling and code review tools.',
    link: '/dashboard/remediation',
    actionText: 'Remediation Board'
  },
  {
    icon: <FileText className="text-brand-cyan" size={24} />,
    title: 'Client Reporting',
    description: 'Generate beautiful, executive-ready PDF reports with actionable remediation advice.',
    link: '/dashboard/reports',
    actionText: 'View Reports'
  },
  {
    icon: <Users className="text-brand-purple" size={24} />,
    title: 'Role-Based Access',
    description: 'Five specialized expert workspaces designed for different roles in your security operations.',
    link: '/dashboard/admin',
    actionText: 'Explore RBAC'
  },
  {
    icon: <Bot className="text-brand-magenta" size={24} />,
    title: 'Live Scanner',
    description: 'Instant zero-configuration external surface analysis for public endpoints and suspicious files.',
    link: '/analysis',
    actionText: 'Run Free Scan'
  }
];

export const Features: React.FC = () => {
  return (
    <div className="min-h-screen bg-background-darker pt-32 pb-20 px-6 relative overflow-hidden">
      <PublicHeader />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything you need for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-brand">modern cybersecurity operations</span>
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Sentrix unifies disconnected security tools into a single, cohesive platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, i) => (
            <GlassCard key={i} className="hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-text-muted mb-6 flex-1">{feature.description}</p>
              <Link
                to={feature.link}
                className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-white transition-colors font-medium"
              >
                {feature.actionText} <ArrowRight size={14} />
              </Link>
            </GlassCard>
          ))}
        </div>

        {/* CTA banner */}
        <div className="glass-panel p-10 text-center rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-20"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to test your security posture?</h2>
            <p className="text-text-muted mb-8">
              Explore the full interactive platform with preloaded demo data and simulated security assessment engines.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/dashboard" className="btn-primary flex items-center gap-2 px-6 py-3 rounded-full">
                Enter Console <ArrowRight size={16} />
              </Link>
              <Link to="/analysis" className="px-6 py-3 rounded-full text-white border border-white/20 hover:bg-white/5 transition-colors font-medium">
                Try Live Scanner
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
