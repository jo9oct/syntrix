import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
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

      // Logout and redirect strictly to login page so user authenticates into their role
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

  return (
    <div className="min-h-screen bg-background-darker flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <PublicHeader />
      <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>

      <div className="w-full max-w-xl relative z-10 pt-20">
        <GlassCard className="p-8 border-brand-purple/30 shadow-2xl backdrop-blur-3xl">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="Sentrix" className="w-14 h-14 rounded-2xl object-contain mb-3 shadow-lg shadow-brand-purple/20" />
            <h2 className="text-2xl font-bold text-white">Create Your Workspace</h2>
            <p className="text-text-muted mt-1 text-sm text-center">
              Step {step} of 3 — {step === 1 ? 'Account Setup' : step === 2 ? 'Organization Questionnaire' : 'Role & Confirmation'}
            </p>

            {/* Stepper Progress */}
            <div className="flex items-center gap-2 mt-4 w-full max-w-xs">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-gradient-brand' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleNext} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-brand-cyan transition-colors text-sm"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-brand-cyan transition-colors text-sm"
                      placeholder="jane@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-brand-cyan transition-colors text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
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
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      type="text"
                      disabled={hasNoOrganization}
                      value={hasNoOrganization ? 'Independent Practitioner / No Organization' : formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className={`w-full bg-white/5 border rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none transition-colors text-sm ${
                        hasNoOrganization
                          ? 'border-white/5 bg-white/[0.02] text-text-muted cursor-not-allowed'
                          : 'border-white/10 focus:border-brand-cyan'
                      }`}
                      placeholder={hasNoOrganization ? 'No organization (Independent staff)' : 'Acme Security Corp or Organization Name'}
                      required={!hasNoOrganization}
                    />
                  </div>
                  {hasNoOrganization && (
                    <div className="mt-2 p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan flex items-center gap-2">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>Individual / Independent Staff Mode: You will register as personal staff without an organization affiliation.</span>
                    </div>
                  )}
                </div>

                {!hasNoOrganization && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                        Company Size
                      </label>
                      <select
                        value={formData.employees}
                        onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                        className="w-full bg-background-darker border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-brand-cyan"
                      >
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="50-250">50-250 employees</option>
                        <option value="250+">250+ employees</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                        Security Users
                      </label>
                      <select
                        value={formData.platformUsers}
                        onChange={(e) => setFormData({ ...formData, platformUsers: e.target.value })}
                        className="w-full bg-background-darker border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-brand-cyan"
                      >
                        <option value="1-5">1-5 users</option>
                        <option value="5-20">5-20 users</option>
                        <option value="20+">20+ users</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  {!hasNoOrganization && (
                    <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.isOwner}
                        onChange={(e) => setFormData({ ...formData, isOwner: e.target.checked })}
                        className="rounded accent-brand-cyan w-4 h-4"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-white">I am the organization owner or primary security lead</div>
                        <div className="text-text-muted">Grants Client Owner permissions to create projects and invite team members.</div>
                      </div>
                    </label>
                  )}

                  <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isSecurityResponsible}
                      onChange={(e) => setFormData({ ...formData, isSecurityResponsible: e.target.checked })}
                      className="rounded accent-brand-cyan w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-white">I have authorization to perform automated security assessments</div>
                      <div className="text-text-muted">Required by platform compliance before initiating target scans.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 text-brand-cyan">
                    <CheckCircle2 size={20} />
                    <span className="font-bold text-sm">Account Type Ready For Provisioning</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <div className="text-text-muted">Assigned Role:</div>
                      <div className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                        <Shield size={14} className="text-brand-cyan" />
                        {hasNoOrganization ? 'Client Member (Independent)' : formData.isOwner ? 'Client Owner' : 'Client Member'}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">Organization:</div>
                      <div className="text-white font-semibold mt-0.5 truncate">
                        {hasNoOrganization ? 'Independent Staff (None)' : formData.organization || 'None'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-text-muted space-y-2">
                  <div className="text-white font-medium">Included with your workspace:</div>
                  <ul className="space-y-1.5 list-disc list-inside">
                    <li>Dynamic OWASP Top 10 & API Assessment Builder</li>
                    <li>Malware Static Analysis & Artifact Inspector</li>
                    <li>Developer Remediation Kanban & Retest Verification</li>
                    <li>Certified Executive & Technical Security PDF Reports</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-colors text-sm flex items-center gap-1.5"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-brand-cyan/20 transition-all"
              >
                {step < 3 ? (
                  <>Continue to Step {step + 1} <ArrowRight size={18} /></>
                ) : (
                  <>{loading ? 'Provisioning...' : 'Launch Workspace'} <CheckCircle2 size={18} /></>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-cyan hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
