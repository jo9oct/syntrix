import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, getRoleLandingPath } from '../../store/authStore';
import {
  Building,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  Users,
  Globe,
  Sparkles,
  LogOut,
  Layers,
} from 'lucide-react';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding, logout, isLoading } = useAuthStore();

  const [hasNoOrganization, setHasNoOrganization] = useState(false);
  const [organization, setOrganization] = useState(user?.organization || '');
  const [isSecurityResponsible, setIsSecurityResponsible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.organizationOnboarded || (user?.organization && user.organization.trim().length > 0)) {
      navigate(getRoleLandingPath(user?.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasNoOrganization && !organization.trim()) {
      setError('Please enter your company or organization name, or check Independent Practitioner.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await completeOnboarding({
        organization: hasNoOrganization ? '' : organization.trim(),
        hasNoOrganization,
        isSecurityResponsible,
      });

      if (updatedUser) {
        const landing = getRoleLandingPath(updatedUser.role);
        navigate(landing, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to complete workspace setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#060d1a] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-[600px] h-[350px] bg-brand-cyan/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-brand-purple/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl bg-[#0a1324]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl flex flex-col lg:flex-row relative z-10">
        
        {/* Left Section: Onboarding Organization Form */}
        <div className="w-full lg:w-7/12 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            {/* Top Bar with User Info & Logout */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan font-bold text-xs flex items-center justify-center uppercase">
                  {user?.name ? user.name.slice(0, 2) : 'UX'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-none">
                    {user?.name || 'Authorized Member'}
                  </div>
                  <div className="text-[11px] text-text-muted font-mono leading-none mt-1">
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-text-muted hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch Account"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-bold font-mono uppercase tracking-wider mb-3">
                <Sparkles size={12} />
                <span>Step 2 • Organization Profile</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                Workspace Setup
              </h1>
              <p className="text-text-muted text-xs sm:text-sm">
                Enter your company name to establish your security attack surface or proceed as an independent practitioner.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                          setOrganization('');
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
                    value={hasNoOrganization ? 'Independent Practitioner / No Organization' : organization}
                    onChange={(e) => setOrganization(e.target.value)}
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
                    checked={isSecurityResponsible}
                    onChange={(e) => setIsSecurityResponsible(e.target.checked)}
                    className="rounded accent-brand-cyan w-4 h-4 mt-0.5 shrink-0"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-white">Authorized to perform automated security scans</div>
                    <div className="text-text-muted text-[11px]">Required compliance acknowledgement before target scanning.</div>
                  </div>
                </label>
              </div>

              {/* Dynamic Role Preview Box */}
              <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl space-y-2 mt-4">
                <div className="flex items-center gap-2 text-brand-cyan font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 size={15} />
                  <span>Role Determination Policy</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-brand-cyan/15">
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
                    <span className="text-white font-bold truncate block">
                      {hasNoOrganization ? 'Independent Staff' : organization || 'Pending Entry'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-brand-cyan/90 hover:to-blue-600/90 text-white font-bold text-sm shadow-lg shadow-brand-cyan/20 hover:shadow-brand-cyan/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting || isLoading ? (
                    <span>Provisioning Workspace...</span>
                  ) : (
                    <>
                      <span>Complete Setup & Launch Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-text-muted/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Globe size={12} className="text-brand-cyan/70" />
              <span>Zero-Trust RBAC Governance</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield size={12} className="text-emerald-400" />
              <span>SOC 2 Type II Certified</span>
            </div>
          </div>
        </div>

        {/* Right Section: Visual Branded Context */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-[#122247] via-[#101b38] to-[#1a1236] p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="relative z-10 space-y-6 my-auto">
            <div className="glass-card bg-[#142347]/85 border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono tracking-wider text-brand-cyan uppercase font-bold flex items-center gap-1.5">
                  <Layers size={13} />
                  Organization Surface
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
                Multi-Tenant Scopes
              </div>
              <p className="text-text-muted text-xs leading-relaxed">
                Organizations enable your team to share target scopes, automated vulnerability scans, and remediation verification workflows in one central dashboard.
              </p>
            </div>

            <div className="glass-card bg-[#142347]/85 border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2 text-brand-purple font-bold text-xs uppercase tracking-wider">
                <Users size={14} />
                <span>Role Capabilities</span>
              </div>
              <div className="space-y-2 text-xs text-text-muted">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold font-mono">OWNER:</span>
                  <span>New organizations grant full management over team members and billing.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-brand-cyan font-bold font-mono">MEMBER:</span>
                  <span>Joining an existing team connects you directly to active security operations.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;
