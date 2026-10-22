import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { PublicHeader } from '../../components/layout/PublicHeader';
import {
  ShieldCheck, Check, Sparkles, Zap, Shield, ArrowRight,
  HelpCircle, CreditCard, Building2, Terminal, RefreshCw, Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const Pricing: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
        'Multi-Tenant Company Compliance Rule Customizer',
        'Sovereign On-Premise Air-Gapped Deployment'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Sovereign',
      tagline: 'Custom company compliance rules, SLA guarantees, and dedicated infrastructure.',
      badge: 'Sovereign Shield',
      priceMonthlyETB: 8500,
      priceAnnualETB: 85000,
      priceMonthlyUSD: 99,
      priceAnnualUSD: 990,
      popular: false,
      accentBorder: 'border-brand-purple/40 hover:border-brand-purple/60 shadow-xl shadow-brand-purple/10',
      ctaText: 'Contact Enterprise',
      ctaVariant: 'primary' as const,
      features: [
        'Everything in Pro Security Engineer Tier',
        'Custom Corporate Security Rules & Policies Engine',
        'Advanced Automated Crawling with Interactive State',
        'Full Multi-Tenant Governance & Role Allocation',
        'Custom Cloudinary & S3 Storage Isolation',
        '1-Year Audit Log Retention & Telemetry Export',
        'Dedicated 99.9% Scanning Worker Queue SLA',
        'Direct Security Architect Slack/Discord Channel'
      ],
      notIncluded: []
    }
  ];

  const handleSelectPlan = (tierId: string) => {
    if (tierId === 'free') {
      if (!isAuthenticated) {
        navigate('/register');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          intendedTier: tierId,
          intendedBillingCycle: billingCycle,
          message: 'Please authenticate to complete your Chapa tier upgrade.'
        }
      });
      return;
    }

    navigate('/dashboard/billing', {
      state: {
        selectedTier: tierId,
        billingCycle
      }
    });
  };

  const content = (
    <div id="pricing" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 scroll-mt-28">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs font-semibold text-brand-cyan tracking-wide">
          <Sparkles size={14} /> Modern Transparent Pricing
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
          Security operations,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-brand">
            scaled for everyone.
          </span>
        </h2>
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
                  ? 'bg-gradient-brand text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-gradient-brand text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Annual Billing
              <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">
                2 Mo. Free
              </span>
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-xs font-semibold">
            <button
              onClick={() => setCurrency('ETB')}
              className={`px-3 py-2 rounded-xl transition-all ${
                currency === 'ETB'
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              ETB (Chapa)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-2 rounded-xl transition-all ${
                currency === 'USD'
                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
        {plans.map((plan) => {
          const rawPrice =
            currency === 'ETB'
              ? billingCycle === 'annual'
                ? plan.priceAnnualETB
                : plan.priceMonthlyETB
              : billingCycle === 'annual'
              ? plan.priceAnnualUSD
              : plan.priceMonthlyUSD;

          const isFree = rawPrice === 0;

          return (
            <GlassCard
              key={plan.id}
              className={`p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-300 hover:-translate-y-1 ${plan.accentBorder}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-brand text-white text-xs font-bold shadow-lg shadow-brand-cyan/30 flex items-center gap-1.5">
                  <Zap size={12} fill="white" />
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                  {!plan.popular && (
                    <span className="text-[11px] font-semibold text-text-muted px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted leading-relaxed min-h-[36px] mb-6">
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-4xl font-extrabold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-text-muted">
                          {currency === 'ETB' ? 'ETB' : '$'}
                        </span>
                        <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                          {rawPrice.toLocaleString()}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-text-muted font-medium">
                      /{billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                  {billingCycle === 'annual' && !isFree && (
                    <p className="text-[11px] text-green-400 font-medium mt-1.5 flex items-center gap-1">
                      <Check size={12} /> Includes 2 months complimentary
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Included capabilities:
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <div className="w-4 h-4 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}

                  {plan.notIncluded.length > 0 && (
                    <div className="pt-2 space-y-2 opacity-50">
                      {plan.notIncluded.map((notFeat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-text-muted line-through">
                          <div className="w-4 h-4 rounded-full bg-white/5 text-text-muted flex items-center justify-center shrink-0 mt-0.5">
                            ×
                          </div>
                          <span className="leading-snug">{notFeat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  plan.ctaVariant === 'primary'
                    ? 'btn-primary shadow-lg shadow-brand-cyan/20 hover:scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                }`}
              >
                {plan.ctaText} <ArrowRight size={15} />
              </button>
            </GlassCard>
          );
        })}
      </div>

      {/* Trust & Chapa Payment Banner */}
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 mb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-25"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-cyan">
              <Lock size={14} /> PCI-DSS Compliant Chapa Gateway
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Instant activation via local & international payment rails.
            </h3>
            <p className="text-xs sm:text-sm text-text-muted max-w-xl">
              Pay securely in Ethiopian Birr using Telebirr, CBEBirr, Awash Birr, or International Visa & Mastercard.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Telebirr', 'CBEBirr', 'Chapa', 'Visa', 'Mastercard'].map((method) => (
              <span
                key={method}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white shadow-sm"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto space-y-6">
        <h3 className="text-2xl font-bold text-center text-white mb-8">
          Frequently Answered Questions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );

  if (embedded) {
    return <section className="py-20 text-white relative overflow-hidden font-sans">{content}</section>;
  }

  return (
    <div className="min-h-screen bg-background-darker text-white flex flex-col relative overflow-hidden font-sans">
      <PublicHeader />
      <main className="flex-1 pt-32 pb-24">
        {content}
      </main>
    </div>
  );
};
