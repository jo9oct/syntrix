import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  CreditCard, ShieldCheck, Check, Sparkles, AlertTriangle,
  RotateCcw, Download, ArrowRight, ExternalLink, Smartphone,
  Building, Clock, CheckCircle2, X, RefreshCw, Lock
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../lib/api';

interface PlanInfo {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  badge: string;
  priceMonthlyETB: number;
  priceAnnualETB: number;
  features: string[];
}

const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free Community',
    badge: 'Basic Tier',
    priceMonthlyETB: 0,
    priceAnnualETB: 0,
    features: ['1 Target Asset', 'OWASP Top 10 Dynamic Scans', 'Community Threat Intel', '7-Day History']
  },
  {
    id: 'pro',
    name: 'Pro Security Engineer',
    badge: 'Recommended',
    priceMonthlyETB: 2500,
    priceAnnualETB: 25000,
    features: [
      'Unlimited Target Projects',
      'Automated API Security Fuzzing',
      'Remediation Kanban & Git Commits',
      '1-Click Automated Verification Retest',
      'Static & Dynamic Malware Sandbox',
      'Executive & Technical PDF/HTML Reports'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise SecOps',
    badge: 'Full Operations',
    priceMonthlyETB: 14900,
    priceAnnualETB: 149000,
    features: [
      'All Pro Features Included',
      'All 5 Expert Role Workspaces',
      'Unlimited Seats & Custom RBAC',
      'CI/CD Pipeline Security Gate',
      'Dedicated Isolated Malware Detonation',
      '24/7 Incident Response Hotline & SLA'
    ]
  }
];

export const Billing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [currentTier, setCurrentTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'trial' | 'canceled'>('active');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanInfo | null>(null);

  // Chapa modal form state
  const [customerName, setCustomerName] = useState(user?.name || 'Jane Smith');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'jane@sentrix.local');
  const [customerPhone, setCustomerPhone] = useState('0911234567');
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbebirr' | 'card' | 'bank'>('telebirr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Distinct channel-specific states
  // 1. Telebirr
  const [telebirrPhone, setTelebirrPhone] = useState('0911234567');
  const [telebirrName, setTelebirrName] = useState(user?.name || 'Jane Smith');
  const [telebirrUssdPrompt, setTelebirrUssdPrompt] = useState(true);

  // 2. CBEBirr
  const [cbePhone, setCbePhone] = useState('0922334455');
  const [cbeAccount, setCbeAccount] = useState('1000284719283');
  const [cbeHolderName, setCbeHolderName] = useState(user?.name || 'Jane Smith');
  const [cbeDistrict, setCbeDistrict] = useState('Addis Ababa Central');

  // 3. Credit / Debit Card
  const [cardHolder, setCardHolder] = useState(user?.name || 'Jane Smith');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPostal, setCardPostal] = useState('1000');

  // 4. Bank Transfer / Slip
  const [selectedBank, setSelectedBank] = useState('Commercial Bank of Ethiopia (CBE)');
  const [bankSenderName, setBankSenderName] = useState(user?.name || 'Jane Smith');
  const [bankRefCode, setBankRefCode] = useState('FT2684910283');
  const [bankTransferDate, setBankTransferDate] = useState(new Date().toISOString().split('T')[0]);

  // Transaction history
  const [transactions, setTransactions] = useState([
    {
      id: 'tx-sentrix-pro-1727601',
      date: 'Today',
      amount: '2,500 ETB',
      tier: 'Pro',
      method: 'Telebirr',
      status: 'success'
    },
    {
      id: 'tx-sentrix-free-1725000',
      date: 'Sep 01, 2026',
      amount: '0 ETB',
      tier: 'Free',
      method: 'System Activation',
      status: 'success'
    }
  ]);

  // Load subscription from API
  useEffect(() => {
    const fetchSub = async () => {
      try {
        const { data } = await api.get('/payment/subscription');
        if (data?.data?.tier) {
          setCurrentTier(data.data.tier);
          setSubscriptionStatus(data.data.status || 'active');
        }
      } catch (e) {
        // Fallback to local default
      }
    };
    fetchSub();

    // Check URL parameters for return from Chapa or quick plan select
    const planParam = searchParams.get('plan');
    if (planParam === 'pro' || planParam === 'enterprise') {
      const match = PLANS.find(p => p.id === planParam);
      if (match) setSelectedPlanForCheckout(match);
    }

    const txRefParam = searchParams.get('tx_ref') || searchParams.get('verify_simulated');
    if (txRefParam) {
      verifyTransaction(txRefParam);
    }
  }, [searchParams]);

  const verifyTransaction = async (txRef: string) => {
    setIsProcessing(true);
    try {
      const { data } = await api.get(`/payment/chapa/verify/${txRef}`);
      if (data?.success) {
        setCurrentTier(data.data.tier || 'pro');
        setVerificationSuccess(data.data);
        setTransactions(prev => [
          {
            id: txRef,
            date: 'Just now',
            amount: `${data.data.amount || 2500} ${data.data.currency || 'ETB'}`,
            tier: (data.data.tier || 'pro').toUpperCase(),
            method: (data.data.paymentMethod || 'telebirr').toUpperCase(),
            status: 'success'
          },
          ...prev
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || 'Verification failed. Please check your transaction reference.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInitializeChapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForCheckout) return;

    setIsProcessing(true);
    setErrorMessage(null);

    let submitName = customerName;
    let submitPhone = customerPhone;

    if (paymentMethod === 'telebirr') {
      submitName = telebirrName;
      submitPhone = telebirrPhone;
    } else if (paymentMethod === 'cbebirr') {
      submitName = cbeHolderName;
      submitPhone = cbePhone;
    } else if (paymentMethod === 'card') {
      submitName = cardHolder;
      submitPhone = customerPhone || '0911234567';
    } else if (paymentMethod === 'bank') {
      submitName = bankSenderName;
      submitPhone = customerPhone || '0911234567';
    }

    try {
      const { data } = await api.post('/payment/chapa/initialize', {
        tier: selectedPlanForCheckout.id,
        billingCycle,
        customerName: submitName,
        customerEmail,
        customerPhone: submitPhone,
        currency: 'ETB'
      });

      if (data?.success && data?.data) {
        const { checkoutUrl, tx_ref, isSimulated } = data.data;

        if (isSimulated || checkoutUrl.startsWith('/')) {
          // Internal simulation mode: verify directly
          setTimeout(() => {
            verifyTransaction(tx_ref);
            setSelectedPlanForCheckout(null);
          }, 1200);
        } else {
          // Real live hosted Chapa page: redirect user
          window.location.href = checkoutUrl;
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || 'Failed to initiate Chapa transaction.');
      setIsProcessing(false);
    }
  };


  const handleDowngrade = async () => {
    if (window.confirm('Are you sure you want to revert to the Free Community plan?')) {
      try {
        await api.post('/payment/subscription/cancel');
        setCurrentTier('free');
        setSubscriptionStatus('canceled');
      } catch (e) {
        setCurrentTier('free');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs font-semibold text-brand-cyan mb-2">
            <CreditCard size={14} /> Chapa Subscription & Invoicing
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Billing & Workspace Tier
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Manage your operational capacity, license status, and instant Chapa payments via Telebirr or CBEBirr.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                billingCycle === 'monthly' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                billingCycle === 'annual' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              Annual <span className="text-[10px] text-green-400 font-bold">-17%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscription Overview Card */}
      <GlassCard className="p-6 sm:p-8 border-brand-cyan/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-brand opacity-10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Current Plan:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentTier === 'enterprise'
                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-lg shadow-brand-purple/20'
                  : currentTier === 'pro'
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-lg shadow-brand-cyan/20'
                  : 'bg-white/10 text-slate-300 border border-white/20'
              }`}>
                Sentrix {currentTier.toUpperCase()}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                {subscriptionStatus === 'active' ? 'Active Subscription' : 'Trialing'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {currentTier === 'enterprise'
                ? 'Enterprise SecOps Console'
                : currentTier === 'pro'
                ? 'Pro Security Operations'
                : 'Free Community Workspace'}
            </h2>

            <p className="text-xs text-text-muted max-w-xl leading-relaxed">
              {currentTier === 'free'
                ? 'You are currently on the community tier with 1 monitored asset. Upgrade to Pro for automated API security fuzzing, verification retesting, and static malware triage.'
                : 'Your organization has full access to automated pentesting, developer remediation boards, and executive compliance reports.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentTier === 'free' ? (
              <button
                onClick={() => setSelectedPlanForCheckout(PLANS[1])}
                className="btn-primary text-xs px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-cyan/30"
              >
                <Sparkles size={16} /> Upgrade to Pro via Chapa
              </button>
            ) : (
              <button
                onClick={handleDowngrade}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-text-muted hover:text-white border border-white/10 transition-colors"
              >
                Downgrade to Free
              </button>
            )}
          </div>
        </div>

        {/* Operational Limit Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
          <div>
            <div className="flex justify-between text-text-muted mb-1.5">
              <span>Target Assets</span>
              <span className="text-white font-bold">{currentTier === 'free' ? '1 / 1' : 'Unlimited'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${currentTier === 'free' ? 'w-full bg-amber-400' : 'w-1/3 bg-brand-cyan'}`} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-text-muted mb-1.5">
              <span>Scans This Month</span>
              <span className="text-white font-bold">{currentTier === 'free' ? '2 / 5' : 'Unlimited'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${currentTier === 'free' ? 'w-2/5 bg-brand-purple' : 'w-1/4 bg-brand-purple'}`} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-text-muted mb-1.5">
              <span>Team Seats</span>
              <span className="text-white font-bold">{currentTier === 'enterprise' ? 'Unlimited' : currentTier === 'pro' ? '5 Seats' : '1 Seat'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="w-1/5 h-full bg-green-400" />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Plan Selection Cards */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Available Subscription Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const price = billingCycle === 'annual'
              ? Math.round(plan.priceAnnualETB / 12)
              : plan.priceMonthlyETB;

            return (
              <GlassCard
                key={plan.id}
                className={`p-6 border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-brand-cyan/40 bg-brand-cyan/[0.04]'
                    : plan.id === 'pro'
                    ? 'border-brand-purple/30 hover:border-brand-cyan/40'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-white">{plan.name}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-brand-cyan">
                      {plan.badge}
                    </span>
                  </div>

                  <div className="text-2xl font-extrabold text-white mb-4">
                    {price.toLocaleString()} ETB{' '}
                    <span className="text-xs text-text-muted font-normal">/ mo</span>
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isCurrent}
                  onClick={() => {
                    if (plan.id === 'free') handleDowngrade();
                    else setSelectedPlanForCheckout(plan);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-white/10 text-white cursor-default'
                      : plan.id === 'pro'
                      ? 'btn-primary'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/15'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Select ${plan.name}`}
                </button>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Transaction & Invoice History */}
      <GlassCard className="p-0 overflow-hidden border-white/10">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-base font-bold text-white">Chapa Transaction History</h3>
            <p className="text-xs text-text-muted mt-0.5">Verified receipts, Telebirr confirmations, and invoicing records</p>
          </div>
          <span className="text-xs font-mono text-text-muted">{transactions.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
              <tr>
                <th className="px-5 py-3">Reference ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-mono text-white font-medium">{tx.id}</td>
                  <td className="px-4 py-3.5 text-text-muted">{tx.date}</td>
                  <td className="px-4 py-3.5 font-semibold text-brand-cyan">{tx.tier}</td>
                  <td className="px-4 py-3.5 font-bold text-white">{tx.amount}</td>
                  <td className="px-4 py-3.5">{tx.method}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold text-[10px] border border-green-500/30">
                      <CheckCircle2 size={10} /> Paid
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => alert(`Downloading official VAT invoice for ${tx.id}`)}
                      className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                      title="Download Invoice"
                    >
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Chapa Checkout Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 sm:p-8 border-brand-cyan/40 shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPlanForCheckout(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-lg shadow-brand-cyan/20">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Chapa Secure Checkout</h3>
                <p className="text-xs text-text-muted">Instant activation for {selectedPlanForCheckout.name}</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleInitializeChapa} className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-text-muted block">Selected Tier</span>
                  <span className="text-base font-bold text-white">{selectedPlanForCheckout.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-muted block">Amount Due</span>
                  <span className="text-xl font-extrabold text-brand-cyan">
                    {billingCycle === 'annual'
                      ? `${selectedPlanForCheckout.priceAnnualETB.toLocaleString()} ETB`
                      : `${selectedPlanForCheckout.priceMonthlyETB.toLocaleString()} ETB`}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Select Chapa Payment Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'telebirr', label: 'Telebirr', desc: 'Direct USSD/App' },
                    { id: 'cbebirr', label: 'CBEBirr', desc: 'Commercial Bank' },
                    { id: 'bank', label: 'Awash / BOA', desc: 'Mobile Banking' },
                    { id: 'card', label: 'Visa / MC', desc: 'Debit / Credit' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        paymentMethod === m.id
                          ? 'bg-brand-cyan/20 border-brand-cyan text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] text-text-muted">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Distinct Payment Method Forms */}
              {paymentMethod === 'telebirr' && (
                <div className="space-y-3 p-4 rounded-2xl bg-brand-cyan/[0.04] border border-brand-cyan/25">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 font-semibold text-brand-cyan">
                      <Smartphone size={16} /> Telebirr Mobile Payment
                    </div>
                    <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 font-mono">
                      USSD *127# & App
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Telebirr Phone Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={telebirrPhone}
                          onChange={(e) => setTelebirrPhone(e.target.value)}
                          required
                          placeholder="0911234567 or 07..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-green-400 font-bold">
                          ETH
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Registered Account Name
                      </label>
                      <input
                        type="text"
                        value={telebirrName}
                        onChange={(e) => setTelebirrName(e.target.value)}
                        required
                        placeholder="Full Name on Telebirr"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Billing Email for Chapa Receipt
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={telebirrUssdPrompt}
                      onChange={(e) => setTelebirrUssdPrompt(e.target.checked)}
                      className="rounded border-white/20 text-brand-cyan focus:ring-0 bg-white/5"
                    />
                    <span>Automatically trigger push authorization PIN prompt to mobile</span>
                  </label>
                </div>
              )}

              {paymentMethod === 'cbebirr' && (
                <div className="space-y-3 p-4 rounded-2xl bg-amber-400/[0.04] border border-amber-400/25">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 font-semibold text-amber-400">
                      <Building size={16} /> Commercial Bank of Ethiopia (CBEBirr)
                    </div>
                    <span className="text-[10px] bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono">
                      CBE Mobile / Wallet
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        CBEBirr Registered Mobile
                      </label>
                      <input
                        type="tel"
                        value={cbePhone}
                        onChange={(e) => setCbePhone(e.target.value)}
                        required
                        placeholder="09..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        CBE Account Number (13-Digit)
                      </label>
                      <input
                        type="text"
                        value={cbeAccount}
                        onChange={(e) => setCbeAccount(e.target.value)}
                        placeholder="1000..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Account Holder Full Name
                      </label>
                      <input
                        type="text"
                        value={cbeHolderName}
                        onChange={(e) => setCbeHolderName(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        CBE Branch / District
                      </label>
                      <select
                        value={cbeDistrict}
                        onChange={(e) => setCbeDistrict(e.target.value)}
                        className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                      >
                        <option value="Addis Ababa Central">Addis Ababa Central</option>
                        <option value="Addis Ababa North">Addis Ababa North</option>
                        <option value="Addis Ababa South">Addis Ababa South</option>
                        <option value="Hawassa District">Hawassa District</option>
                        <option value="Adama District">Adama District</option>
                        <option value="Bahir Dar District">Bahir Dar District</option>
                        <option value="Dire Dawa District">Dire Dawa District</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Billing Email for CBE Receipt
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-3 p-4 rounded-2xl bg-brand-purple/[0.04] border border-brand-purple/25">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 font-semibold text-brand-purple">
                      <CreditCard size={16} /> Credit & Debit Card Checkout
                    </div>
                    <span className="text-[10px] bg-brand-purple/15 text-brand-purple px-2 py-0.5 rounded-full border border-brand-purple/30">
                      Visa / MC / UnionPay
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      required
                      placeholder="Name as printed on card"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono tracking-wider"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={cardPostal}
                        onChange={(e) => setCardPostal(e.target.value)}
                        placeholder="1000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Billing Email for E-Receipt
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="space-y-3 p-4 rounded-2xl bg-white/[0.04] border border-white/20">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <Building size={16} className="text-brand-cyan" /> Direct Bank Transfer / Deposit Slip
                    </div>
                    <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full border border-white/10 font-mono">
                      Awash / BOA / CBE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Receiving Bank
                      </label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                      >
                        <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="Awash Bank">Awash Bank</option>
                        <option value="Bank of Abyssinia (BOA)">Bank of Abyssinia (BOA)</option>
                        <option value="Dashen Bank">Dashen Bank</option>
                        <option value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Depositor / Sender Name
                      </label>
                      <input
                        type="text"
                        value={bankSenderName}
                        onChange={(e) => setBankSenderName(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Bank FT / Reference Code
                      </label>
                      <input
                        type="text"
                        value={bankRefCode}
                        onChange={(e) => setBankRefCode(e.target.value)}
                        required
                        placeholder="FT26..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        Transfer Date
                      </label>
                      <input
                        type="date"
                        value={bankTransferDate}
                        onChange={(e) => setBankTransferDate(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Billing Email for Confirmation
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan"
                    />
                  </div>
                </div>
              )}


              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <Lock size={12} className="text-green-400" /> 256-bit TLS Chapa encryption
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanForCheckout(null)}
                    className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-cyan/20"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Initializing...
                      </>
                    ) : (
                      <>
                        Pay with Chapa <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Verification Success Celebration Dialog */}
      {verificationSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 text-center border-green-500/40 shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Payment Verified!</h3>
            <p className="text-xs text-text-muted mb-4">
              Your Chapa transaction has been confirmed. Your Sentrix workspace is upgraded to{' '}
              <strong className="text-brand-cyan uppercase">{verificationSuccess.tier}</strong>.
            </p>

            <div className="p-3 mb-6 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-left space-y-1">
              <div className="text-text-muted">Transaction: <span className="text-white">{verificationSuccess.tx_ref}</span></div>
              <div className="text-text-muted">Channel: <span className="text-white uppercase">{verificationSuccess.paymentMethod || 'Telebirr'}</span></div>
              <div className="text-text-muted">Amount: <span className="text-green-400 font-bold">{verificationSuccess.amount} {verificationSuccess.currency || 'ETB'}</span></div>
            </div>

            <button
              onClick={() => setVerificationSuccess(null)}
              className="btn-primary text-xs w-full py-2.5 rounded-xl font-bold shadow-lg shadow-brand-cyan/20"
            >
              Continue to Workspace
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
