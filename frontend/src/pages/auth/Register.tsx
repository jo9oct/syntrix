import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  Terminal,
  Globe,
  Radio,
  Server
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNoOrganization, setHasNoOrganization] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    isSecurityResponsible: true,
  });

  // Real-time password requirement checks for checklist
  const hasMinLength = formData.password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);
  const hasUpperAndLower = /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password);
  const isPasswordValid = hasMinLength && hasNumberOrSymbol && hasUpperAndLower;

  // Field validation checks for visual green checkmarks
  const isNameValid = formData.name.trim().length >= 3;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!isNameValid) {
        setError('Please enter a valid full name (at least 3 characters).');
        return;
      }
      if (!isEmailValid) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!hasMinLength) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!hasNumberOrSymbol) {
        setError('Password must contain at least one number (0–9) or a symbol.');
        return;
      }
      if (!hasUpperAndLower) {
        setError('Password must contain both lowercase (a–z) and uppercase (A–Z) letters.');
        return;
      }
    }

    if (step === 2) {
      if (!hasNoOrganization && !formData.organization.trim()) {
        setError('Please enter your company or organization name, or check Independent Practitioner.');
        return;
      }
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      finishRegistration();
    }
  };

  const finishRegistration = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organization: hasNoOrganization ? '' : formData.organization,
        isSecurityResponsible: formData.isSecurityResponsible,
      });

      useAuthStore.getState().logout();
      navigate('/verify', {
        state: {
          message: 'Workspace created successfully! Please check your email for the 6-digit verification code.',
          email: formData.email,
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Account Setup', 'Organization Profile', 'Confirmation'];

  return (
    <div className="min-h-screen bg-[#060d1a] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -right-36 w-[550px] h-[550px] orb orb-purple opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 -left-36 w-[550px] h-[550px] orb orb-blue opacity-35 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-cyan/5 blur-[160px] pointer-events-none" aria-hidden="true" />

      {/* Main Centered Authentication Container */}
      <div className="w-full max-w-5xl rounded-[2.5rem] bg-[#0b1528]/95 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.65)] overflow-hidden relative z-10 flex flex-col lg:flex-row backdrop-blur-2xl">

        {/* ════════════════════════════════════════════════════════════
            LEFT SECTION: Branded Promotional & Telemetry Visual Panel
            ════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-[#122247] via-[#101b38] to-[#1a1236] p-8 sm:p-10 lg:p-12 relative overflow-hidden flex flex-col justify-between border-t lg:border-t-0 lg:border-r border-white/10 order-2 lg:order-1">

          {/* Stylized organic background waves inspired by reference image */}
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-brand-cyan/15 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-brand-purple/20 blur-[70px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />

          {/* Floating Card 1: Security Recon & Telemetry Card */}
          <div className="relative z-10 space-y-6 my-auto py-4">

            {/* Top Metric Widget */}
            <div className="relative">
              <div className="glass-card bg-[#142347]/85 border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden max-w-[270px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono tracking-wider text-brand-cyan uppercase font-bold">
                    Threat Surface
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                  176,180
                </div>

                {/* Smooth Mini Wave Chart */}
                <div className="h-10 w-full relative flex items-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 160 40" fill="none">
                    <path
                      d="M 0 28 Q 20 8, 40 22 T 80 14 T 120 30 T 160 12"
                      stroke="url(#sparklineGradientReg)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="sparklineGradientReg" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Central Node Badge */}
                  <div className="absolute left-[45%] -top-1 w-6 h-6 rounded-full bg-[#0a1222] border-2 border-brand-cyan flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-md">
                    45
                  </div>
                </div>
              </div>

              {/* Floating micro cyber badge 1 */}
              <div className="absolute -top-3 -right-2 sm:right-2 w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-brand-blue/30 border border-brand-cyan/40 backdrop-blur-md flex items-center justify-center text-brand-cyan shadow-lg">
                <Shield size={20} />
              </div>

              {/* Floating micro cyber badge 2 */}
              <div className="absolute top-16 -right-4 sm:right-0 w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-purple/20 to-pink-500/20 border border-brand-purple/40 backdrop-blur-md flex items-center justify-center text-brand-purple shadow-lg">
                <Terminal size={19} />
              </div>
            </div>

            {/* Bottom Card: "Your data, your rules" Security Assurance */}
            <div className="glass-card bg-[#142347]/85 border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                  <KeyRound size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white">
                    Your data, your rules
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Zero-knowledge cryptographic isolation ensures targets, findings, and exploits remain sovereign.
                  </p>
                </div>
              </div>

              {/* Subtle status lines inspired by the card mockup */}
              <div className="mt-4 pt-3 border-t border-white/8 flex items-center gap-2">
                <div className="h-1.5 w-14 rounded-full bg-brand-cyan" />
                <div className="h-1.5 w-8 rounded-full bg-white/10" />
                <div className="h-1.5 w-5 rounded-full bg-white/10" />
              </div>
            </div>

          </div>

          {/* Bottom Branding Tagline */}
          <div className="relative z-10 flex items-center justify-between text-xs text-text-muted/60 pt-4">
            <span className="font-mono text-brand-cyan font-bold tracking-wider">SENTRIX DEFENSE</span>
            <span>v2.4 Sovereign Enclave</span>
          </div>

        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT SECTION: Registration Form
            ════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative bg-[#0b1528] order-1 lg:order-2">

          {/* Top Bar: Back-to-Home Button & Cross-Link */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            {/* Elegant Back to Home Button */}
            <Link
              to="/"
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-text-muted hover:text-white transition-all shadow-sm group cursor-pointer"
              title="Return to Homepage"
              aria-label="Return to Homepage"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            </Link>

            {/* Header Cross-Link */}
            <div className="text-xs sm:text-sm text-text-muted">
              Already a member?{' '}
              <Link
                to="/login"
                className="text-brand-cyan hover:text-brand-cyan/80 font-bold transition-colors underline decoration-brand-cyan/40 hover:decoration-brand-cyan"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Header & Subtitle */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                Sign Up
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-brand-cyan">
                Step {step} of 3
              </span>
            </div>
            <p className="text-text-muted text-sm">
              Secure your communications and infrastructure with Sentrix
            </p>

            {/* Stepper Progress Bar */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    s < step
                      ? 'bg-gradient-to-r from-brand-blue to-brand-cyan'
                      : s === step
                      ? 'bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-start gap-2.5 animate-shake">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleNext} className="space-y-4">

            {/* STEP 1: Account Setup */}
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                {/* Full Name */}
                <div>
                  <div className="relative group">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                      size={18}
                    />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                      placeholder="Daniel Ahmadi"
                      required
                      minLength={3}
                      autoFocus
                    />
                    {isNameValid && (
                      <CheckCircle2
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 animate-fadeIn"
                      />
                    )}
                  </div>
                </div>

                {/* Work Email */}
                <div>
                  <div className="relative group">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                      size={18}
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                      placeholder="danielahmadi@gmail.com"
                      required
                      autoComplete="email"
                    />
                    {isEmailValid && (
                      <CheckCircle2
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 animate-fadeIn"
                      />
                    )}
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="relative group">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                      size={18}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                      placeholder="••••••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/60 hover:text-white transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements Checklist (Inspired by Reference Image) */}
                <div className="pt-1 pb-1 space-y-1.5 text-xs">
                  <div className={`flex items-center gap-2 transition-colors ${hasMinLength ? 'text-emerald-400' : 'text-text-muted/60'}`}>
                    <Check size={13} className={hasMinLength ? 'text-emerald-400' : 'text-text-muted/40'} />
                    <span>Least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${hasNumberOrSymbol ? 'text-emerald-400' : 'text-text-muted/60'}`}>
                    <Check size={13} className={hasNumberOrSymbol ? 'text-emerald-400' : 'text-text-muted/40'} />
                    <span>Least one number (0–9) or a symbol</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${hasUpperAndLower ? 'text-emerald-400' : 'text-text-muted/60'}`}>
                    <Check size={13} className={hasUpperAndLower ? 'text-emerald-400' : 'text-text-muted/40'} />
                    <span>Lowercase (a–z) and uppercase (A–Z)</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Organization Questionnaire */}
            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Company / Organization Name
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-brand-cyan hover:underline select-none">
                      <input
                        type="checkbox"
                        checked={hasNoOrganization}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setHasNoOrganization(checked);
                          if (checked) {
                            setFormData((prev) => ({ ...prev, organization: '' }));
                          }
                        }}
                        className="rounded accent-brand-cyan w-3.5 h-3.5"
                      />
                      <span>Independent Practitioner</span>
                    </label>
                  </div>

                  <div className="relative group">
                    <Building
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                      size={18}
                    />
                    <input
                      type="text"
                      disabled={hasNoOrganization}
                      value={hasNoOrganization ? 'Independent Practitioner / No Organization' : formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className={`w-full border-b-2 rounded-t-xl py-3 pl-12 pr-4 text-sm transition-all font-medium ${
                        hasNoOrganization
                          ? 'border-white/5 bg-white/[0.02] text-text-muted cursor-not-allowed'
                          : 'bg-white/[0.03] border-white/10 focus:border-brand-cyan hover:border-white/20 text-white focus:outline-none'
                      }`}
                      placeholder={hasNoOrganization ? 'Independent Practitioner' : 'e.g. Acme Cyber Security Inc.'}
                      required={!hasNoOrganization}
                      autoFocus={!hasNoOrganization}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 p-2.5 bg-white/[0.02] rounded-xl border border-white/8 cursor-pointer hover:bg-white/[0.05] transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={formData.isSecurityResponsible}
                      onChange={(e) => setFormData({ ...formData, isSecurityResponsible: e.target.checked })}
                      className="rounded accent-brand-cyan w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-white">Authorized to perform automated security scans</div>
                      <div className="text-text-muted text-[11px]">Required compliance acknowledgement before target scanning.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: Role & Confirmation */}
            {step === 3 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/25 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-brand-cyan font-bold text-sm">
                    <CheckCircle2 size={16} />
                    <span>Workspace Ready for Provisioning</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-brand-cyan/20">
                    <div>
                      <span className="text-text-muted block text-[11px]">Assigned Role:</span>
                      <span className="text-white font-bold">
                        {hasNoOrganization
                          ? 'Client Member (Independent)'
                          : 'Auto-assigned (Owner for new company, Member for existing)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[11px]">Organization:</span>
                      <span className="text-white font-bold truncate">
                        {hasNoOrganization ? 'Independent Staff' : formData.organization || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-white/[0.03] rounded-2xl border border-white/8 text-xs text-text-muted space-y-1.5">
                  <div className="text-white font-bold mb-1">Included with your workspace:</div>
                  <div className="space-y-1">
                    {[
                      'OWASP Top 10 & API Security Scanner',
                      'Static Heuristic Malware Inspector',
                      'Certified PDF Executive & Technical Reports'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={12} className="text-brand-cyan shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons (Pill Style) */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="py-3 px-5 rounded-full border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial min-w-[170px] py-3.5 px-8 rounded-full font-bold text-sm text-white bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple hover:opacity-95 shadow-lg shadow-brand-cyan/20 hover:shadow-brand-cyan/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {step < 3 ? (
                  <>
                    <span>Continue to Step {step + 1}</span>
                    <ArrowRight size={16} />
                  </>
                ) : loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Provisioning…</span>
                  </>
                ) : (
                  <>
                    <span>Sign Up</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {step === 1 && (
                <div className="flex items-center gap-3 ml-1">
                  <span className="text-xs text-text-muted/60 font-medium">Or</span>
                  <a
                    href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'}/api/v1/auth/google`}
                    className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-sm cursor-pointer"
                    title="Sign up with Google"
                    aria-label="Sign up with Google"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </form>

          {/* Bottom Footer Language & Security Status */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-text-muted/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-brand-cyan/70" />
              <span>ENG • Zero-Trust Workspace</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <Shield size={12} className="text-emerald-400" />
              <span>SOC 2 Type II</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
