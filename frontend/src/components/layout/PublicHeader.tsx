import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const PublicHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { to: '#features', targetId: 'features', label: 'Features', isScroll: true },
    { to: '/analysis', targetId: '', label: 'Live Scanner', isScroll: false },
    { to: '#pricing', targetId: 'pricing', label: 'Pricing', isScroll: true },
    { to: '#about', targetId: 'about', label: 'About', isScroll: true },
    { to: '#contact', targetId: 'contact', label: 'Contact', isScroll: true },
  ];

  // Scroll depth for nav shadow change
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        e.preventDefault();
        navigate(`/#${link.targetId}`);
      }
    }
    setMobileOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4 pointer-events-none">
      <div
        className={`max-w-7xl mx-auto nav-glass px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between pointer-events-auto transition-all duration-300 ${
          scrolled ? 'shadow-[0_12px_40px_-4px_rgba(0,0,0,0.7)]' : ''
        }`}
      >
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-5 lg:gap-7">
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
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-brand-cyan/25 blur-sm group-hover:bg-brand-cyan/35 transition-all duration-300" />
              <img
                src="/logo.png"
                alt="Sentrix"
                className="relative w-8 h-8 sm:w-8 sm:h-8 rounded-xl object-contain transition-transform group-hover:scale-105 duration-300"
              />
            </div>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight">
              Sentrix<span className="text-brand-cyan">.</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = link.isScroll
                ? location.pathname === '/' && activeSection === link.targetId
                : location.pathname === link.to;

              return (
                <a
                  key={link.label}
                  href={link.isScroll ? `/#${link.targetId}` : link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`relative px-3 py-1.5 rounded-xl font-medium transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                    isActive
                      ? 'text-brand-cyan bg-brand-cyan/10'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-brand-cyan opacity-70" />
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right Desktop CTAs */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <Link
              to="/dashboard"
              className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 rounded-xl"
            >
              Workspace ({user?.name ? user.name.split(' ')[0] : 'User'}) <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs sm:text-sm font-medium text-text-muted hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary text-xs flex items-center gap-1.5 px-3.5 py-2 rounded-xl"
              >
                Get started <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan"
            aria-label="Toggle Navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileOpen && (
        <div className="sm:hidden mt-2 mx-3 p-3 rounded-2xl glass-elevated border border-white/10 pointer-events-auto space-y-2 shadow-2xl animate-slide-down">
          <nav className="flex flex-col gap-0.5 pb-2.5 border-b border-white/8" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const isActive = link.isScroll
                ? location.pathname === '/' && activeSection === link.targetId
                : location.pathname === link.to;

              return (
                <a
                  key={link.label}
                  href={link.isScroll ? `/#${link.targetId}` : link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                    isActive
                      ? 'bg-brand-cyan/12 text-brand-cyan'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="pt-0.5 flex flex-col gap-2">
            {isAuthenticated && user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2"
              >
                Go to Workspace ({user?.name ? user.name.split(' ')[0] : 'User'}) <ArrowRight size={14} />
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white text-center hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary py-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1"
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
