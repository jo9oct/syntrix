import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Building, ArrowRight, ArrowLeft, CheckCircle2, Users, Shield, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNoOrganization, setHasNoOrganization] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    isOwner: true,
    isSecurityResponsible: true,
    employees: '50-250',
    platformUsers: '5-20',
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organization: hasNoOrganization ? '' : formData.organization,
        isOwner: !hasNoOrganization && formData.isOwner,
        isSecurityResponsible: formData.isSecurityResponsible,
        employees: hasNoOrganization ? null : formData.employees,
        platformUsers: hasNoOrganization ? null : formData.platformUsers,
      });

      useAuthStore.getState().logout();
      navigate('/login', {
        state: {
          message: 'Workspace created successfully! Please sign in with your credentials to access your console.',
          prefillEmail: formData.email
        }
      });
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Account Setup', 'Organization Questionnaire', 'Role & Confirmation'];

  return (
    <div className="min-h-screen bg-background-darker flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <PublicHeader />

      {/* Background orbs */}
      <div className="absolute top-1/3 -right-32 w-[420px] h-[420px] orb orb-purple opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/4 -left-32 w-[360px] h-[360px] orb orb-blue opacity-40 pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-xl relative z-10 pt-20">
        <div className="glass-elevated rounded-3xl border border-white/8 shadow-card overflow-hidden">
          {/* Top accent strip */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-purple/50 to-transparent" />

          <div className="p-8">
            {/* Brand header */}
            <div className="flex flex-col items-center mb-7">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-2xl bg-brand-purple/20 blur-md" />
                <img
                  src="/logo.png"
                  alt="Sentrix"
                  className="relative w-14 h-14 rounded-2xl object-contain"
                />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">Create Your Workspace</h2>
              <p className="text-text-muted text-sm text-center">
                Step {step} of 3 — {stepLabels[step - 1]}
              </p>

              {/* Stepper */}
              <div className="flex items-center gap-2 mt-5 w-full max-w-xs">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-400 ${
                      s < step
                        ? 'bg-gradient-brand opacity-80'
                        : s === step
                        ? 'bg-gradient-brand'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-start gap-2.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleNext} className="space-y-4">
              {/* Step 1: Account Setup */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/9 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all text-sm placeholder:text-text-muted/50"
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/9 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all text-sm placeholder:text-text-muted/50"
                        placeholder="jane@company.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-white/5 border border-white/9 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all text-sm placeholder:text-text-muted/50"
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Organization */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-widest">
                        Company or Organization Name
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-brand-cyan hover:underline">
                        <input
                          type="checkbox"
                          checked={hasNoOrganization}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setHasNoOrganization(checked);
                            if (checked) {
                              setFormData((prev) => ({ ...prev, organization: '', isOwner: false }));
                            }
                          }}
                          className="rounded accent-brand-cyan w-3.5 h-3.5"
                        />
                        <span>I have not organization staff (Independent)</span>
                      </label>
                    </div>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input
                        type="text"
                        disabled={hasNoOrganization}
                        value={hasNoOrganization ? 'Independent Practitioner / No Organization' : formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className={`w-full bg-white/5 border rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none transition-all text-sm ${
                          hasNoOrganization
                            ? 'border-white/5 bg-white/[0.02] text-text-muted cursor-not-allowed'
                            : 'border-white/9 focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15'
                        }`}
                        placeholder={hasNoOrganization ? 'No organization (Independent staff)' : 'Acme Security Corp or Organization Name'}
                        required={!hasNoOrganization}
                      />
                    </div>
                    {hasNoOrganization && (
                      <div className="mt-2 p-3 rounded-xl bg-brand-cyan/8 border border-brand-cyan/20 text-xs text-brand-cyan flex items-center gap-2">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>Individual / Independent Staff Mode: You will register as personal staff without an organization affiliation.</span>
                      </div>
                    )}
                  </div>

                  {!hasNoOrganization && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                          Company Size
                        </label>
                        <select
                          value={formData.employees}
                          onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                          className="w-full bg-background-darker border border-white/9 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all"
                        >
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="50-250">50-250 employees</option>
                          <option value="250+">250+ employees</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                          Security Users
                        </label>
                        <select
                          value={formData.platformUsers}
                          onChange={(e) => setFormData({ ...formData, platformUsers: e.target.value })}
                          className="w-full bg-background-darker border border-white/9 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all"
                        >
                          <option value="1-5">1-5 users</option>
                          <option value="5-20">5-20 users</option>
                          <option value="20+">20+ users</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    {!hasNoOrganization && (
                      <label className="flex items-center gap-3 p-3.5 bg-white/4 rounded-xl border border-white/9 cursor-pointer hover:bg-white/7 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.isOwner}
                          onChange={(e) => setFormData({ ...formData, isOwner: e.target.checked })}
                          className="rounded accent-brand-cyan w-4 h-4 shrink-0"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-white mb-0.5">I am the organization owner or primary security lead</div>
                          <div className="text-text-muted leading-relaxed">Grants Client Owner permissions to create projects and invite team members.</div>
                        </div>
                      </label>
                    )}

                    <label className="flex items-center gap-3 p-3.5 bg-white/4 rounded-xl border border-white/9 cursor-pointer hover:bg-white/7 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.isSecurityResponsible}
                        onChange={(e) => setFormData({ ...formData, isSecurityResponsible: e.target.checked })}
                        className="rounded accent-brand-cyan w-4 h-4 shrink-0"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-white mb-0.5">I have authorization to perform automated security assessments</div>
                        <div className="text-text-muted leading-relaxed">Required by platform compliance before initiating target scans.</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Role & Confirmation */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-5 bg-brand-cyan/8 border border-brand-cyan/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2.5 text-brand-cyan">
                      <CheckCircle2 size={18} />
                      <span className="font-extrabold text-sm">Account Type Ready For Provisioning</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <div className="text-text-muted mb-1">Assigned Role:</div>
                        <div className="text-white font-bold flex items-center gap-1.5">
                          <Shield size={13} className="text-brand-cyan" />
                          {hasNoOrganization ? 'Client Member (Independent)' : formData.isOwner ? 'Client Owner' : 'Client Member'}
                        </div>
                      </div>
                      <div>
                        <div className="text-text-muted mb-1">Organization:</div>
                        <div className="text-white font-bold truncate">
                          {hasNoOrganization ? 'Independent Staff (None)' : formData.organization || 'None'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white/4 rounded-2xl border border-white/9 text-xs text-text-muted space-y-2.5">
                    <div className="text-white font-bold mb-2">Included with your workspace:</div>
                    <ul className="space-y-2 list-none">
                      {[
                        'Dynamic OWASP Top 10 & API Assessment Builder',
                        'Malware Static Analysis & Artifact Inspector',
                        'Developer Remediation Kanban & Retest Verification',
                        'Certified Executive & Technical Security PDF Reports'
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="text-brand-cyan shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center gap-3 pt-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center gap-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan"
                  >
                    <ArrowLeft size={15} /> Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                >
                  {step < 3 ? (
                    <>Continue to Step {step + 1} <ArrowRight size={16} /></>
                  ) : loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Provisioning…
                    </>
                  ) : (
                    <>Launch Workspace <CheckCircle2 size={16} /></>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-xs text-text-muted">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-brand-cyan hover:underline font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Below card — security note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-muted/60">
          <Shield size={11} className="text-brand-cyan/50" />
          Zero-trust session security
        </div>
      </div>
    </div>
  );
};
