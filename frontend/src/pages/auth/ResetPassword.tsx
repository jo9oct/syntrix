import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Check,
  Terminal,
  Globe
} from 'lucide-react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const ResetPassword: React.FC = () => {
  const { token: routeToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const [manualToken, setManualToken] = useState('');

  const token = (routeToken || queryToken || manualToken || '').trim();
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!hasMinLength || !hasNumberOrSymbol || !hasUpperAndLower) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      navigate('/login', {
        state: {
          message: 'Password reset successfully! Please sign in with your new credentials.',
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060d1a] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-36 w-[520px] h-[520px] orb orb-blue opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 -right-36 w-[550px] h-[550px] orb orb-cyan opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-purple/5 blur-[160px] pointer-events-none" aria-hidden="true" />

      {/* Main Container */}
      <div className="w-full max-w-5xl rounded-[2.5rem] bg-[#0b1528]/95 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.65)] overflow-hidden relative z-10 flex flex-col lg:flex-row backdrop-blur-2xl">

        {/* LEFT SECTION */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative bg-[#0b1528]">

          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <Link
              to="/login"
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-text-muted hover:text-white transition-all shadow-sm group cursor-pointer"
              title="Return to Login"
              aria-label="Return to Login"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div className="text-xs sm:text-sm text-text-muted">
              Back to{' '}
              <Link
                to="/login"
                className="text-brand-cyan hover:text-brand-cyan/80 font-bold transition-colors underline decoration-brand-cyan/40 hover:decoration-brand-cyan"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Header & Subtitle */}
          <div className="mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Set New Password
            </h1>
            <p className="text-text-muted text-sm">
              Please enter and confirm your new secure password
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                  placeholder="New password"
                  required
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

              {/* Password Checklist */}
              <div className="mt-2.5 space-y-1.5 pl-1">
                <div className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${hasMinLength ? 'text-emerald-400 font-medium' : 'text-text-muted/50'}`}>
                  <Check size={12} className={hasMinLength ? 'text-emerald-400' : 'text-text-muted/30'} />
                  <span>Least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${hasNumberOrSymbol ? 'text-emerald-400 font-medium' : 'text-text-muted/50'}`}>
                  <Check size={12} className={hasNumberOrSymbol ? 'text-emerald-400' : 'text-text-muted/30'} />
                  <span>Least one number (0–9) or a symbol</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${hasUpperAndLower ? 'text-emerald-400 font-medium' : 'text-text-muted/50'}`}>
                  <Check size={12} className={hasUpperAndLower ? 'text-emerald-400' : 'text-text-muted/30'} />
                  <span>Lowercase (a–z) and uppercase (A–Z)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                  placeholder="Re-type new password"
                  required
                />
                {passwordsMatch && (
                  <CheckCircle2
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 animate-fadeIn"
                  />
                )}
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !hasMinLength || !hasNumberOrSymbol || !hasUpperAndLower || !passwordsMatch}
                className="w-full sm:w-auto min-w-[200px] py-3.5 px-8 rounded-full font-bold text-sm text-white bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple hover:opacity-95 shadow-lg shadow-brand-cyan/20 hover:shadow-brand-cyan/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting Password…</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Footer */}
          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-text-muted/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-brand-cyan/70" />
              <span>ENG • Sovereign Enclave</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <Shield size={12} className="text-emerald-400" />
              <span>SOC 2 Type II</span>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Promotional Panel */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-[#122247] via-[#101b38] to-[#1a1236] p-8 sm:p-10 lg:p-12 relative overflow-hidden flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-brand-cyan/15 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-brand-purple/20 blur-[70px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 space-y-6 my-auto py-4">
            <div className="relative">
              <div className="glass-card bg-[#142347]/85 border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden max-w-[270px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono tracking-wider text-brand-cyan uppercase font-bold">
                    Credential Vault
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                  Argon2id
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Military-grade key derivation protects passwords against brute-force and rainbow table attacks.
                </p>
              </div>

              <div className="absolute -top-3 -right-2 sm:right-2 w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-cyan/20 to-brand-blue/30 border border-brand-cyan/40 backdrop-blur-md flex items-center justify-center text-brand-cyan shadow-lg">
                <Shield size={20} />
              </div>

              <div className="absolute top-16 -right-4 sm:right-0 w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-purple/20 to-pink-500/20 border border-brand-purple/40 backdrop-blur-md flex items-center justify-center text-brand-purple shadow-lg">
                <Terminal size={19} />
              </div>
            </div>

            <div className="glass-card bg-[#142347]/85 border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                  <KeyRound size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white">
                    Instant Invalidation
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Changing your password terminates active sessions across all untrusted devices.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-text-muted/60 pt-4">
            <span className="font-mono text-brand-cyan font-bold tracking-wider">SENTRIX DEFENSE</span>
            <span>v2.4 Sovereign Enclave</span>
          </div>
        </div>

      </div>
    </div>
  );
};
