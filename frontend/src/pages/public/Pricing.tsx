import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { PublicHeader } from '../../components/layout/PublicHeader';
import {
  ShieldCheck, Check, Sparkles, Zap, Shield, ArrowRight,
  HelpCircle, CreditCard, Building2, Terminal, RefreshCw, Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<'ETB' | 'USD'>('ETB');

  const plans = [
    {
      id: 'free',
      name: 'Free Community',
      tagline: 'Essential surface checks and community intelligence for developers.',
      badge: 'Open Access',
      priceMonthlyETB: 0,
      priceAnnualETB: 0,
      priceMonthlyUSD: 0,
      priceAnnualUSD: 0,
      popular: false,
      accentBorder: 'border-white/10 hover:border-white/20',
      ctaText: 'Get Started Free',
      ctaVariant: 'secondary' as const,
      features: [
        '1 Monitored Target Asset / Project',
        'OWASP Top 10 Dynamic Vulnerability Checks',
        'Manual Security Assessment Scans',
        'Basic HTTP Header & TLS Audits',
        'Community Threat Intelligence Feed',
        '7-Day Telemetry History',
        'Standard Community Discord Support'
      ],
      notIncluded: [
        'Automated REST/GraphQL API Fuzzing',
        'One-Click Verification Retest Queue',
        'Binary Static PE & Malware Sandbox',
        'Executive PDF/HTML Report Export'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Security Engineer',
      tagline: 'Deep automated DAST, API security fuzzing, and malware triage.',
      badge: 'Most Popular',
      priceMonthlyETB: 2500,
      priceAnnualETB: 25000,
      priceMonthlyUSD: 29,
      priceAnnualUSD: 290,
      popular: true,
      accentBorder: 'border-brand-cyan/50 shadow-2xl shadow-brand-cyan/20 ring-1 ring-brand-cyan/40',
      ctaText: 'Upgrade with Chapa',
      ctaVariant: 'primary' as const,
      features: [
        'Unlimited Target Projects & Endpoints',
        'Deep Dynamic Vulnerability Assessment Engine',
        'Automated REST & GraphQL API Fuzzing',
        'Interactive Developer Remediation Kanban',
        'One-Click Automated Patch Verification Retest',
        'Binary Static PE & IOC Malware Inspection',
        'Executive & Technical PDF/HTML Reports',
        '90-Day Audit Logs & Operational Telemetry',
        'Fast Chapa Checkout (Telebirr, CBEBirr, Cards)',
        'Priority Direct Email & Chat Support'
      ],
      notIncluded: [
        'Dedicated Isolated Malware Detonation Sandbox',
        'Custom 24/7 Incident Response SLA'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise SecOps',
      tagline: 'Multi-tenant unified console with 5 specialized expert workspaces.',
      badge: 'Enterprise Grade',
      priceMonthlyETB: 14900,
      priceAnnualETB: 149000,
      priceMonthlyUSD: 149,
      priceAnnualUSD: 1490,
      popular: false,
      accentBorder: 'border-brand-purple/40 hover:border-brand-purple/60',
      ctaText: 'Get Enterprise',
      ctaVariant: 'outline' as const,
      features: [
        'Everything in Pro Included',
        'All 5 Specialized Workspaces (Engineer, Client, Malware, Dev, Admin)',
        'Unlimited Team Seats & Granular RBAC Permissions',
        'CI/CD Pipeline Security Gate (GitHub / GitLab Integration)',
        'Dedicated Isolated Malware Detonation Sandbox',
        'Custom Vulnerability Signatures & YARA Rule Uploads',
        'Full Organization Governance & Tamper-Evident Logs',
        'Enterprise Chapa Invoicing & Bank Wire Support',
        'Dedicated Technical Account Manager & 99.9% SLA'
      ],
      notIncluded: []
    }
  ];

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      navigate(isAuthenticated ? '/dashboard' : '/register');
    } else {
      navigate(isAuthenticated ? `/dashboard/billing?plan=${planId}&cycle=${billingCycle}` : `/login?redirect=/dashboard/billing&plan=${planId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background-darker text-white flex flex-col relative overflow-hidden font-sans">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs font-semibold text-brand-cyan tracking-wide">
            <Sparkles size={14} /> Modern Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Security operations,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-brand">
              scaled for everyone.
            </span>
          </h1>
          <p className="text-text-muted text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Choose the workspace capability that fits your posture. Powered by Chapa for instant checkout via Telebirr, CBEBirr, and debit/credit cards.
          </p>

          {/* Controls: Billing Cycle & Currency Switchers */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-brand text-white shadow-md shadow-brand-cyan/20'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-brand text-white shadow-md shadow-brand-cyan/20'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">
                  Save 17%
                </span>
              </button>
            </div>

            {/* Currency Selector */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setCurrency('ETB')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  currency === 'ETB' ? 'bg-white/15 text-brand-cyan' : 'text-text-muted hover:text-white'
                }`}
              >
                ETB (Br)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  currency === 'USD' ? 'bg-white/15 text-brand-cyan' : 'text-text-muted hover:text-white'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
          {plans.map((plan) => {
            const isAnnual = billingCycle === 'annual';
            const price = currency === 'ETB'
              ? (isAnnual ? Math.round(plan.priceAnnualETB / 12) : plan.priceMonthlyETB)
              : (isAnnual ? Math.round(plan.priceAnnualUSD / 12) : plan.priceMonthlyUSD);

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-300 glass-card ${plan.accentBorder} ${
                  plan.popular ? 'bg-surface/80 md:-translate-y-2' : 'bg-surface/40'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-brand text-white text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-brand-cyan/30 flex items-center gap-1">
                    <Sparkles size={12} /> {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {!plan.popular && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-text-muted">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed min-h-[36px] mb-6">
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                        {currency === 'ETB' ? `${price.toLocaleString()} ETB` : `$${price}`}
                      </span>
                      {plan.priceMonthlyETB > 0 && (
                        <span className="text-xs text-text-muted font-medium">/ month</span>
                      )}
                    </div>
                    {isAnnual && plan.priceMonthlyETB > 0 && (
                      <div className="text-[11px] text-green-400 font-semibold mt-1">
                        Billed annually ({currency === 'ETB' ? `${plan.priceAnnualETB.toLocaleString()} ETB/yr` : `$${plan.priceAnnualUSD}/yr`})
                      </div>
                    )}
                    {plan.priceMonthlyETB === 0 && (
                      <div className="text-[11px] text-brand-cyan font-medium mt-1">
                        Zero setup fee • No credit card required
                      </div>
                    )}
                  </div>

                  {/* Features list */}
                  <div className="space-y-3 mb-8">
                    <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Included Capabilities
                    </div>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <div className="p-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan shrink-0 mt-0.5">
                          <Check size={12} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-text-muted/50 line-through">
                        <div className="w-3.5 h-3.5 rounded-full bg-white/5 shrink-0 mt-0.5"></div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'btn-primary shadow-lg shadow-brand-cyan/20'
                      : plan.id === 'free'
                      ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                      : 'border border-brand-purple/40 hover:bg-brand-purple/10 text-white'
                  }`}
                >
                  {plan.ctaText} <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Chapa Payment Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 mb-16 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-brand opacity-5 pointer-events-none"></div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-cyan/20">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Direct Integration with Chapa Gateway</h3>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">
                  Instant Activation
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 max-w-xl">
                Upgrade in seconds with local payment channels: <strong>Telebirr, CBEBirr, Awash Bank, Bank of Abyssinia, and International Visa / Mastercard</strong>. Automated verification and immediate license activation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end shrink-0 text-xs text-slate-300 font-semibold">
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Telebirr</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">CBEBirr</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Amole</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Visa / MC</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-text-muted mt-1">Everything you need to know about our billing and platform capabilities</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does Chapa payment work on Sentrix?',
                a: 'When you choose the Pro or Enterprise tier, Sentrix generates an authenticated transaction reference and initiates the Chapa checkout session. You can complete payment seamlessly using Telebirr, CBEBirr, or card, and your workspace upgrades instantly.'
              },
              {
                q: 'Can I start with the Free Community tier and upgrade later?',
                a: 'Yes, absolutely. You can run basic surface scans on the Free tier indefinitely. When you need automated API fuzzing, verification retesting, or malware inspection, you can upgrade in one click.'
              },
              {
                q: 'Is there an annual discount?',
                a: 'Yes! Choosing annual billing provides 17% savings (equivalent to 2 full months free) on both Pro and Enterprise plans.'
              },
              {
                q: 'Can I cancel or downgrade my subscription anytime?',
                a: 'Yes. You can manage, cancel, or change your subscription at any time directly inside the Console Billing section without penalties.'
              }
            ].map((faq, idx) => (
              <GlassCard key={idx} className="p-5 border-white/10">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <HelpCircle size={15} className="text-brand-cyan shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-text-muted leading-relaxed pl-6">
                  {faq.a}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
