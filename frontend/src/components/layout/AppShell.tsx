import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, ShieldAlert, Bug,
  FileText, Settings, LogOut, Bell, ChevronDown,
  ShieldCheck, ArrowRightLeft, RotateCcw, Search, Globe,
  CheckCircle2, AlertTriangle, Shield, UserCheck, Code,
  CreditCard, Menu, X, Sparkles
} from 'lucide-react';
import { useAuthStore, type UserRole } from '../../store/authStore';

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  roles?: UserRole[];
}

const navItems: NavItemDef[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { to: '/dashboard/assessment/new', label: 'New Assessment', icon: ShieldCheck, roles: ['admin', 'security_engineer'] },
  { to: '/dashboard/findings', label: 'Findings', icon: ShieldAlert, roles: ['admin', 'security_engineer', 'client_owner', 'developer'] },
  { to: '/dashboard/remediation', label: 'Remediation', icon: ArrowRightLeft, roles: ['admin', 'developer', 'security_engineer'] },
  { to: '/dashboard/retest', label: 'Retesting', icon: RotateCcw, roles: ['admin', 'security_engineer', 'developer'] },
  { to: '/dashboard/reports', label: 'Reports', icon: FileText, roles: ['admin', 'security_engineer', 'client_owner', 'malware_analyst'] },
  { to: '/dashboard/malware', label: 'Malware Analysis', icon: Bug, roles: ['admin', 'malware_analyst', 'security_engineer'] },
  { to: '/dashboard/billing', label: 'Billing & Plans', icon: CreditCard, roles: ['admin', 'client_owner'] },
  { to: '/dashboard/admin', label: 'Administration', icon: Settings, roles: ['admin'] },
];

const DEMO_NOTIFICATIONS = [
  { id: 1, title: 'Critical Finding Reported', desc: 'SQL Injection detected in Main Web App /api/login', time: '10 min ago', unread: true },
  { id: 2, title: 'Retest Verification Requested', desc: 'Developer Alex marked Reflected XSS ready for retest', time: '1 hour ago', unread: true },
  { id: 3, title: 'Chapa Subscription Active', desc: 'Pro Security workspace license confirmed via Telebirr', time: '2 hours ago', unread: false },
  { id: 4, title: 'Malware Analysis Complete', desc: 'invoice_2026.pdf.exe static analysis finished (Risk 88/100)', time: '3 hours ago', unread: false },
];

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentUser = {
    name: (user && user.name) || 'User',
    email: (user && user.email) || '',
    role: ((user && user.role) || 'security_engineer') as UserRole
  };

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(currentUser.role));

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="flex h-screen w-full bg-background-darker overflow-hidden font-sans text-white relative">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar (Desktop pinned, Mobile slide-in drawer) */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 shrink-0 flex flex-col border-r border-white/10 bg-background-darker/95 lg:bg-background/50 backdrop-blur-2xl transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-md shadow-brand-cyan/20">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Sentrix.</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              title="View Public Site"
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <Globe size={16} />
            </Link>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Items - Filtered dynamically by role */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{label}</span>
              {label === 'Billing & Plans' && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                  Chapa
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile & Sign Out */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-brand-cyan capitalize truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
                {currentUser.role?.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar with elevated stacking context */}
        <header className="h-16 shrink-0 border-b border-white/10 bg-background-darker/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 relative z-40">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Quick search on desktop */}
            <div className="relative hidden sm:block w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                placeholder="Search findings, projects, endpoints..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role indicator badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
              <Shield size={13} className="text-brand-cyan" />
              <span className="text-text-muted">Role:</span>
              <span className="text-white font-semibold capitalize truncate max-w-[140px]">
                {currentUser.role?.replace('_', ' ')}
              </span>
            </div>

            {/* Notifications */}
            <div className="relative z-50">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-brand-magenta rounded-full animate-ping" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-brand-magenta rounded-full" />
                )}
              </button>

              {/* Invisible click-away overlay (no shading of existing page) */}
              {showNotifications && (
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowNotifications(false)}
                />
              )}

              {/* Notification Popover - Solid dark opaque container displayed cleanly above everything */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#0f172a] border border-white/20 rounded-2xl p-4 shadow-2xl shadow-black z-50 text-white">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <Bell size={14} className="text-brand-cyan" />
                      Notifications ({unreadCount} unread)
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] text-brand-cyan hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs transition-colors ${
                          n.unread
                            ? 'bg-brand-cyan/15 border-brand-cyan/35 text-white'
                            : 'bg-white/5 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="font-semibold mb-0.5 text-white">{n.title}</div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">{n.desc}</div>
                        <div className="text-[10px] text-text-muted mt-1.5 font-mono">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>


            {/* User pill & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shadow-md">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-text-muted leading-tight">{currentUser.email}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Sign Out"
                className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-white/5 transition-colors ml-1"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content with responsive scroll container */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
