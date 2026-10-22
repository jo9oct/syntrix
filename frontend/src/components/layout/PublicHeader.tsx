import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const PublicHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  const navLinks = [
    { to: '#features', targetId: 'features', label: 'Features', isScroll: true },
    { to: '/analysis', targetId: '', label: 'Live Scanner', isScroll: false },
    { to: '#pricing', targetId: 'pricing', label: 'Pricing & Plans', isScroll: true },
    { to: '#about', targetId: 'about', label: 'About', isScroll: true },
    { to: '#contact', targetId: 'contact', label: 'Contact', isScroll: true },
  ];

  // Track active section on scroll when on homepage
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      const sections = ['features', 'pricing', 'about', 'contact'];
      const scrollPos = window.scrollY + 250;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sections[i]);
          return;
        }
      }
      setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (e: React.MouseEvent, link: typeof navLinks[0]) => {
    if (link.isScroll) {
      if (location.pathname === '/') {
        e.preventDefault();
        const el = document.getElementById(link.targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.pushState(null, '', `#${link.targetId}`);
          setActiveSection(link.targetId);
        }
      } else {
        // If from another page, navigate to homepage with hash
        e.preventDefault();
        navigate(`/#${link.targetId}`);
      }
    }
    setMobileOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 pointer-events-none">
      <div className="max-w-7xl mx-auto glass-panel px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between pointer-events-auto shadow-2xl border border-white/10 backdrop-blur-2xl bg-background-darker/90 rounded-2xl">
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.pushState(null, '', '/');
                setActiveSection('');
              }
            }}
            className="flex items-center gap-2.5 group"
          >
            <img src="/logo.png" alt="Sentrix" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-transform" />
            <span className="text-lg sm:text-xl font-bold text-white tracking-tight">Sentrix.</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm">
            {navLinks.map((link) => {
              const isActive = link.isScroll
                ? location.pathname === '/' && activeSection === link.targetId
                : location.pathname === link.to;

              return (
                <a
                  key={link.label}
                  href={link.isScroll ? `/#${link.targetId}` : link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`transition-colors font-medium cursor-pointer ${
                    isActive ? 'text-brand-cyan font-semibold' : 'text-text-muted hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
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
              const isActive = link.isScroll
                ? location.pathname === '/' && activeSection === link.targetId
                : location.pathname === link.to;

              return (
                <a
                  key={link.label}
                  href={link.isScroll ? `/#${link.targetId}` : link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive ? 'bg-brand-cyan/15 text-brand-cyan font-bold' : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </a>
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
