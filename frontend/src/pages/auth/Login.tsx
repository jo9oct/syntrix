import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
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
      await login(email, password);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        navigate('/dashboard');
      } else {
        setError(useAuthStore.getState().error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-darker flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <PublicHeader />
      <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>

      <div className="w-full max-w-lg relative z-10 pt-20">
        <GlassCard className="p-8 border-brand-cyan/20 shadow-2xl backdrop-blur-3xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-3 shadow-lg shadow-brand-cyan/20">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Sign In to Sentrix</h2>
            <p className="text-text-muted mt-1 text-sm text-center">
              Authenticate with your assigned role credentials
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/15 border border-green-500/30 rounded-xl text-green-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors text-sm"
                  placeholder="name@company.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors text-sm"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-brand-cyan/20 hover:shadow-brand-cyan/40 transition-all mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-text-muted">
            Need an organization setup?{' '}
            <Link to="/register" className="text-brand-cyan hover:underline font-semibold">
              Create a workspace
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
