import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, getRoleLandingPath } from '../../store/authStore';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const successMessage = (location.state as any)?.message;
  const prefillEmail = (location.state as any)?.prefillEmail || '';

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-darker flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <PublicHeader />

      {/* Background orbs */}
      <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] orb orb-blue opacity-50 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] orb orb-cyan opacity-40 pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10 pt-20">
        {/* Card */}
        <div className="glass-elevated rounded-3xl border border-white/8 shadow-card overflow-hidden">
          {/* Top accent strip */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent" />

          <div className="p-8">
            {/* Brand header */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-2xl bg-brand-cyan/20 blur-md" />
                <img
                  src="/logo.png"
                  alt="Sentrix"
                  className="relative w-14 h-14 rounded-2xl object-contain shadow-lg"
                />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
                Sign In to Sentrix
              </h2>
              <p className="text-text-muted text-sm">
                Authenticate with your assigned role credentials
              </p>
            </div>

            {/* Success message */}
            {successMessage && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm leading-relaxed">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/9 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all text-sm placeholder:text-text-muted/50"
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/9 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 transition-all text-sm placeholder:text-text-muted/50"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Footer link */}
            <div className="mt-6 text-center text-xs text-text-muted">
              Need an organization setup?{' '}
              <Link
                to="/register"
                className="text-brand-cyan hover:underline font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
              >
                Create a workspace
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
