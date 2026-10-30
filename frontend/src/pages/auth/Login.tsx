import React, { useState, useEffect } from 'react';
import {
  Mail,
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
  Activity,
  Globe
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, getRoleLandingPath } from '../../store/authStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const successMessage = (location.state as any)?.message;
  const prefillEmail = (location.state as any)?.prefillEmail || '';
  const queryError = new URLSearchParams(location.search).get('error');

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(queryError);

  useEffect(() => {
    if (queryError) {
      setError(queryError);
    }
  }, [queryError]);

  // Check for visual green indicator (valid email or username)
  const isInputValid = email.trim().length >= 3;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      if (user) {
        const destination = getRoleLandingPath(user.role);
        navigate(destination, { replace: true });
      } else {
        setError('Invalid email or password.');
      }
    } catch (err: any) {
      if (err?.isVerified === false || err?.response?.data?.isVerified === false) {
        navigate('/verify', {
          state: {
            message: 'Your email is not verified yet. Please enter the 6-digit verification code sent to your email to continue.',
            email: err?.email || err?.response?.data?.email || email.trim(),
          },
        });
        return;
      }
      setError(err?.message || 'Invalid email or password.');
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

      {/* Main Centered Authentication Container */}
      <div className="w-full max-w-5xl rounded-[2.5rem] bg-[#0b1528]/95 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.65)] overflow-hidden relative z-10 flex flex-col lg:flex-row backdrop-blur-2xl">

        {/* ════════════════════════════════════════════════════════════
            LEFT SECTION: Login Form
            ════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative bg-[#0b1528]">

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
              Need a workspace?{' '}
              <Link
                to="/register"
                className="text-brand-cyan hover:text-brand-cyan/80 font-bold transition-colors underline decoration-brand-cyan/40 hover:decoration-brand-cyan"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Header & Subtitle */}
          <div className="mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Sign In
            </h1>
            <p className="text-text-muted text-sm">
              Secure your attack surface and telemetry with Sentrix
            </p>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed font-medium">{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Address or Username Input */}
            <div>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-brand-cyan transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                  placeholder="Email or username"
                  required
                  autoComplete="username email"
                />
                {isInputValid && (
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border-b-2 border-white/10 focus:border-brand-cyan hover:border-white/20 rounded-t-xl py-3 pl-12 pr-11 text-white text-sm focus:outline-none transition-all placeholder:text-text-muted/40 font-medium"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
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

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs text-text-muted hover:text-brand-cyan transition-colors underline decoration-brand-cyan/30 hover:decoration-brand-cyan font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Action Button & Social Login */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-w-[170px] py-3.5 px-8 rounded-full font-bold text-sm text-white bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple hover:opacity-95 shadow-lg shadow-brand-cyan/20 hover:shadow-brand-cyan/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                <span className="text-xs text-text-muted/60 font-medium mr-0.5">Or</span>
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'}/api/v1/auth/google`}
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-sm cursor-pointer"
                  title="Sign in with Google"
                  aria-label="Sign in with Google"
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
                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'}/api/v1/auth/github`}
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all shadow-sm cursor-pointer hover:text-brand-cyan"
                  title="Sign in with GitHub"
                  aria-label="Sign in with GitHub"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </form>

          {/* Bottom Footer Language & Security Status */}
          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-text-muted/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-brand-cyan/70" />
              <span>ENG • Zero-Trust Session</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <Shield size={12} className="text-emerald-400" />
              <span>SOC 2 Type II</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT SECTION: Branded Promotional & Telemetry Visual Panel
            ════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-[#122247] via-[#101b38] to-[#1a1236] p-8 sm:p-10 lg:p-12 relative overflow-hidden flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10">

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
                      stroke="url(#sparklineGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="sparklineGradient" x1="0" y1="0" x2="1" y2="0">
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

      </div>
    </div>
  );
};
