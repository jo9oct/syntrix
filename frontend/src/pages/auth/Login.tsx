import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  ShieldCheck, Mail, Lock, ArrowRight, CheckCircle2,
  UserCheck, Shield, Bug, Code, CreditCard, Sparkles
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, getRoleLandingPath, DEMO_ACTORS, type UserRole } from '../../store/authStore';
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

  const handleQuickLogin = async (actorRole: UserRole) => {
    const actor = DEMO_ACTORS[actorRole];
    if (!actor) return;
    setEmail(actor.email);
    setPassword('password123');
    setLoading(true);
    setError(null);
    try {
      const user = await login(actor.email, 'password123');
      const destination = getRoleLandingPath(user.role);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts: { role: UserRole; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { role: 'admin', icon: ShieldCheck },
    { role: 'security_engineer', icon: Shield },
    { role: 'developer', icon: Code },
    { role: 'malware_analyst', icon: Bug },
    { role: 'client_owner', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background-darker flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <PublicHeader />
      <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>

      <div className="w-full max-w-xl relative z-10 pt-24 pb-12">
        <GlassCard className="p-8 border-brand-cyan/20 shadow-2xl backdrop-blur-3xl">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-3 shadow-lg shadow-brand-cyan/20">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to Sentrix</h2>
            <p className="text-text-muted mt-1 text-sm max-w-md">
              Each actor is routed directly to their specialized workspace and assigned operational responsibilities.
            </p>
          </div>

          {/* Quick Demo Actor Fast-Sign-In */}
          <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-cyan" />
                Select Actor Role (1-Click Direct Redirect)
              </span>
              <span className="text-[11px] text-text-muted">Pass: password123</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map(({ role, icon: Icon }) => {
                const actor = DEMO_ACTORS[role];
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleQuickLogin(role)}
                    disabled={loading}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-cyan/40 text-left transition-all group"
                  >
                    <div className="p-1.5 rounded-lg bg-white/5 text-brand-cyan group-hover:scale-105 transition-transform shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate flex items-center justify-between">
                        <span>{actor.name}</span>
                        <span className="text-[10px] text-text-muted font-mono">{actor.defaultPath.replace('/dashboard', '~')}</span>
                      </div>
                      <div className="text-[11px] text-text-muted truncate">{actor.title}</div>
                      <div className="text-[10px] text-brand-cyan font-mono truncate">{actor.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
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

          <div className="relative my-4 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-xs text-text-muted uppercase tracking-wider font-mono">
              or sign in with credentials
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

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
              {loading ? 'Authenticating & Routing...' : 'Sign In to My Workspace'} <ArrowRight size={18} />
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
