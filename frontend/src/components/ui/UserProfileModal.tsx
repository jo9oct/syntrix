import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User as UserIcon,
  Mail,
  Shield,
  CreditCard,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  Lock,
  Cpu,
  Layers,
  FileText
} from 'lucide-react';
import { useAuthStore, useUserTier } from '../../store/authStore';
import api from '../../lib/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { tier, isFree, isPro, isEnterprise, status } = useUserTier();

  const [copiedId, setCopiedId] = useState(false);
  const [profileData, setProfileData] = useState<any>(user);

  useEffect(() => {
    if (!isOpen) return;
    setProfileData(user);

    // Refresh profile data from backend if authenticated
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data?.data) {
          setProfileData(res.data.data);
        }
      })
      .catch(() => {
        // Fallback to local store user
      });
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentName = profileData?.name || user?.name || 'Authorized User';
  const currentEmail = profileData?.email || user?.email || 'user@sentrix.local';
  const currentRole = (profileData?.role || user?.role || 'security_engineer').replace('_', ' ');
  const accountId = profileData?.id || profileData?._id || user?.id || user?._id || 'usr_6ade35fac622';
  const orgId = profileData?.organizationId || user?.organizationId || 'Default Organization';

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(accountId));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = () => {
    onClose();
    logout();
    navigate('/login');
  };

  const handleGoToBilling = () => {
    onClose();
    navigate('/dashboard/billing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#0b0f19] border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-white animate-scaleIn">
        {/* Modal Top Banner */}
        <div className="h-24 bg-gradient-to-r from-brand-cyan/20 via-brand-primary/25 to-brand-purple/20 border-b border-white/10 relative p-4 flex justify-end items-start">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-text-muted hover:text-white border border-white/10 transition-colors"
            title="Close profile"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Avatar & Primary Info */}
        <div className="px-6 pb-6 relative pt-0">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-primary flex items-center justify-center text-2xl font-bold text-white shadow-xl border-4 border-[#0b0f19]">
                {currentName.charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0b0f19]"
                title="Active session"
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  isEnterprise
                    ? 'bg-brand-purple/20 text-brand-purple border-brand-purple/40 shadow-sm shadow-brand-purple/20'
                    : isPro
                    ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40 shadow-sm shadow-brand-cyan/20'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {tier} Plan
              </span>
            </div>
          </div>

          <div className="space-y-1 mb-5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {currentName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1 text-slate-300">
                <Mail size={13} className="text-brand-cyan" />
                {currentEmail}
              </span>
              <span className="flex items-center gap-1 text-brand-cyan capitalize font-medium">
                <Shield size={13} />
                {currentRole}
              </span>
            </div>
          </div>

          {/* Subscription & Capability Status Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <CreditCard size={14} className="text-brand-cyan" />
                <span>Subscription & Entitlements</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold capitalize">
                {status || 'active'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-text-muted uppercase font-bold block">AI Intelligence</span>
                {isFree ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                    <Lock size={12} /> Pro Exclusive
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <Sparkles size={12} /> Unlocked
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-text-muted uppercase font-bold block">Compliance Reports</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 size={12} /> PDF, HTML, JSON
                </span>
              </div>
            </div>

            {isFree && (
              <div className="pt-1 flex items-center justify-between text-xs text-amber-200/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[11px]">Unlock Groq AI advisories and verification retests.</span>
                <button
                  onClick={handleGoToBilling}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] shrink-0 border border-amber-500/30 transition-colors"
                >
                  Upgrade
                </button>
              </div>
            )}
          </div>

          {/* Account Identifiers Grid */}
          <div className="space-y-2 mb-6 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-text-muted">Account ID:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-semibold">{String(accountId).slice(0, 16)}...</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                  title="Copy full account ID"
                >
                  {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-text-muted">Workspace:</span>
              <span className="text-slate-300 font-semibold truncate max-w-[200px]">{orgId}</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <button
              onClick={handleGoToBilling}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CreditCard size={14} className="text-brand-cyan" />
              <span>Billing & Plan</span>
            </button>

            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

