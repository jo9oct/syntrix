import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, LayoutDashboard, Menu, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const PublicHeader: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/features', label: 'Features' },
    { to: '/analysis', label: 'Live Scanner' },
    { to: '/pricing', label: 'Pricing & Plans' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 pointer-events-none">
      <div className="max-w-7xl mx-auto glass-panel px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between pointer-events-auto shadow-2xl border border-white/10 backdrop-blur-2xl bg-background-darker/90 rounded-2xl">
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-transform">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">Sentrix.</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`transition-colors font-medium ${
                    isActive ? 'text-brand-cyan font-semibold' : 'text-text-muted hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Desktop CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated && user ? (
            <Link
              to="/dashboard"
              className="btn-primary text-xs flex items-center gap-2 px-4 py-2"
            >
              Workspace ({user?.name ? user.name.split(' ')[0] : 'User'}) <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs sm:text-sm font-medium text-text-muted hover:text-white px-2.5 py-2 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary text-xs flex items-center gap-1.5 px-3.5 py-2"
              >
                Get started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileOpen && (
        <div className="sm:hidden mt-2 p-4 rounded-2xl glass-card border border-white/15 bg-background-darker/95 backdrop-blur-2xl pointer-events-auto space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-1 pb-3 border-b border-white/10">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-cyan/15 text-brand-cyan font-bold' : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-1 flex flex-col gap-2">


            {isAuthenticated && user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2"
              >
                Go to Workspace ({user?.name ? user.name.split(' ')[0] : 'User'}) <ArrowRight size={14} />
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white text-center"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary py-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1"
                >
                  Get started <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
