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
      cardClass: 'border-white/8 hover:border-brand-cyan/20',
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
      cardClass: 'border-brand-cyan/40 shadow-glow-cyan ring-1 ring-brand-cyan/25',
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
      cardClass: 'border-brand-purple/30 hover:border-brand-purple/50 shadow-glow-purple',
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
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
        <div className="section-badge bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
          <Sparkles size={12} /> Modern Transparent Pricing
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
          Security operations,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-brand">
            scaled for everyone.
          </span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Choose the workspace capability that fits your posture. Powered by Chapa for instant checkout via Telebirr, CBEBirr, and debit/credit cards.
        </p>

        {/* Billing Cycle & Currency Switchers */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl gap-0.5">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-brand text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                billingCycle === 'annual'
                  ? 'bg-gradient-brand text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                2 Mo. Free
              </span>
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-xs font-bold gap-0.5">
            <button
              onClick={() => setCurrency('ETB')}
              className={`px-3 py-2 rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                currency === 'ETB'
                  ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              ETB (Chapa)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-2 rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                currency === 'USD'
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/30'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-16">
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
            <div
              key={plan.id}
              className={`glass-card flex flex-col justify-between relative transition-all duration-300 ${plan.cardClass} ${
                plan.popular ? 'scale-[1.02] lg:scale-[1.03]' : 'hover:-translate-y-1'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-brand text-white text-[11px] font-extrabold shadow-lg shadow-brand-cyan/30 flex items-center gap-1.5 tracking-wide">
                  <Zap size={11} fill="white" />
                  {plan.badge}
                </div>
              )}

              <div className="p-6 sm:p-7 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold text-white tracking-tight">{plan.name}</h3>
                  {!plan.popular && (
                    <span className="text-[10px] font-bold text-text-muted px-2.5 py-1 rounded-full bg-white/5 border border-white/10 tracking-wide">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted leading-relaxed mb-5">
                  {plan.tagline}
                </p>

                {/* Price */}
                <div className="mb-5 pb-5 border-b border-white/8">
                  <div className="flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-4xl font-extrabold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-text-muted">
                          {currency === 'ETB' ? 'ETB' : '$'}
                        </span>
                        <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight tabular-nums">
                          {rawPrice.toLocaleString()}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-text-muted font-medium ml-0.5">
                      /{billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                  {billingCycle === 'annual' && !isFree && (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                      <Check size={11} /> Includes 2 months complimentary
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2.5 mb-7 flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-3">
                    Included capabilities
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <div className="w-4 h-4 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center shrink-0 mt-0.5 border border-brand-cyan/20">
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}

                  {plan.notIncluded.length > 0 && (
                    <div className="pt-2 space-y-2 opacity-40">
                      {plan.notIncluded.map((notFeat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-text-muted line-through">
                          <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                            ×
                          </div>
                          <span className="leading-snug">{notFeat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                    plan.ctaVariant === 'primary'
                      ? 'btn-primary'
                      : 'btn-secondary hover:border-white/20'
                  }`}
                >
                  {plan.ctaText} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Chapa Payment Banner */}
      <div className="glass-elevated p-7 sm:p-10 rounded-3xl border border-white/8 mb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-20 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-cyan">
              <Lock size={13} /> PCI-DSS Compliant Chapa Gateway
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Instant activation via local & international payment rails.
            </h3>
            <p className="text-xs sm:text-sm text-text-muted max-w-xl leading-relaxed">
              Pay securely in Ethiopian Birr using Telebirr, CBEBirr, Awash Birr, or International Visa & Mastercard.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
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
        <h3 className="text-2xl font-extrabold text-center text-white mb-8 tracking-tight">
          Frequently Asked Questions
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
            <div key={idx} className="glass-card p-5 border-white/8 hover:border-white/14 transition-colors duration-200">
              <h4 className="text-sm font-bold text-white mb-2.5 flex items-start gap-2">
                <HelpCircle size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                {faq.q}
              </h4>
              <p className="text-xs text-text-muted leading-relaxed pl-6">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="py-20 sm:py-24 text-white relative overflow-hidden">
        <div className="absolute inset-0 section-glow-right opacity-40 pointer-events-none" aria-hidden="true" />
        {content}
      </section>
    );
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
