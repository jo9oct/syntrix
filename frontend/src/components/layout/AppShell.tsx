import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bug,
  FileText, Settings, LogOut, Bell,
  ShieldCheck, ArrowRightLeft, RotateCcw, Search, Globe,
  Shield, Code, CreditCard, Menu, X, Sparkles, Network, Sliders, Trash2,
  Users, Activity, ClipboardList, Layers, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuthStore, type UserRole, useUserTier } from '../../store/authStore';
import { UserProfileModal } from '../ui/UserProfileModal';

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  roles?: UserRole[];
}

// Enterprise analysis console navigation items (Billing & Plans is excluded for admin)
const enterpriseNavItems: NavItemDef[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/projects', label: 'Targets & Inventory', icon: Globe },
  { to: '/dashboard/assessment/new', label: 'New Assessment', icon: ShieldCheck },
  { to: '/dashboard/scopes', label: 'Security Scopes', icon: Network },
  { to: '/dashboard/rules', label: 'Company Policies', icon: Sliders },
  { to: '/dashboard/reports', label: 'Reports', icon: FileText },
  { to: '/dashboard/scans/deleted', label: 'Deleted Scans', icon: Trash2 },
  { to: '/dashboard/remediation', label: 'Remediation', icon: ArrowRightLeft },
  { to: '/dashboard/retest', label: 'Retesting', icon: RotateCcw },
  { to: '/dashboard/malware', label: 'Malware Analysis', icon: Bug },
];

// Standard role-filtered navigation items for non-admin actors
const standardNavItems: NavItemDef[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['security_engineer', 'developer', 'malware_analyst', 'client_owner', 'client_member'] },
  { to: '/dashboard/service-orders', label: 'Service Orders', icon: ClipboardList, roles: ['client_owner', 'client_member'] },
  { to: '/dashboard/service-projects', label: 'Project Workspaces', icon: Layers, roles: ['client_owner', 'client_member'] },
  { to: '/dashboard/projects', label: 'Targets & Inventory', icon: Globe, roles: ['security_engineer', 'developer', 'malware_analyst', 'client_owner', 'client_member'] },
  { to: '/dashboard/assessment/new', label: 'New Assessment', icon: ShieldCheck, roles: ['security_engineer', 'client_owner', 'client_member'] },
  { to: '/dashboard/scopes', label: 'Security Scopes', icon: Network, roles: ['security_engineer', 'client_owner', 'client_member'] },
  { to: '/dashboard/rules', label: 'Company Policies', icon: Sliders, roles: ['security_engineer', 'client_owner'] },
  { to: '/dashboard/reports', label: 'Reports', icon: FileText, roles: ['security_engineer', 'developer', 'malware_analyst', 'client_owner', 'client_member'] },
  { to: '/dashboard/scans/deleted', label: 'Deleted Scans', icon: Trash2, roles: ['security_engineer', 'client_owner', 'client_member'] },
  { to: '/dashboard/remediation', label: 'Remediation', icon: ArrowRightLeft, roles: ['developer', 'security_engineer', 'client_owner', 'client_member'] },
  { to: '/dashboard/retest', label: 'Retesting', icon: RotateCcw, roles: ['security_engineer', 'developer', 'client_owner', 'client_member'] },
  { to: '/dashboard/malware', label: 'Malware Analysis', icon: Bug, roles: ['malware_analyst', 'security_engineer', 'client_owner', 'client_member'] },
  { to: '/dashboard/billing', label: 'Billing & Plans', icon: CreditCard, roles: ['client_owner', 'client_member'] },
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
  const { tier: userTier } = useUserTier();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    useAuthStore.getState().fetchMe();
  }, []);

  const currentUser = {
    name: (user && user.name) || 'User',
    email: (user && user.email) || '',
    role: ((user && user.role) || 'security_engineer') as UserRole
  };

  const isAdmin = currentUser.role === 'admin';
  const isAdminSection = isAdmin && (location.pathname.startsWith('/dashboard/admin') || location.pathname.startsWith('/dashboard/service-projects'));

  // Configuration for specialist operation switcher button at top navbar
  const getSpecialistSwitcher = () => {
    switch (currentUser.role) {
      case 'admin':
        return {
          isOnOperation: location.pathname.startsWith('/dashboard/admin') || location.pathname.startsWith('/dashboard/service-projects'),
          operationPath: '/dashboard/admin',
          operationLabel: 'Admin Operations',
          operationIcon: Settings,
          badgeColor: 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/35 text-purple-300',
        };
      case 'developer':
        return {
          isOnOperation: location.pathname.startsWith('/dashboard/developer') || location.pathname.startsWith('/dashboard/remediation') || location.pathname.startsWith('/dashboard/retest') || location.pathname.startsWith('/dashboard/service-projects'),
          operationPath: '/dashboard/developer',
          operationLabel: 'Developer Operations',
          operationIcon: Code,
          badgeColor: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-400',
        };
      case 'malware_analyst':
        return {
          isOnOperation: location.pathname.startsWith('/dashboard/malware') || location.pathname.startsWith('/dashboard/service-projects'),
          operationPath: '/dashboard/malware',
          operationLabel: 'Malware Operations',
          operationIcon: Bug,
          badgeColor: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-400',
        };
      case 'security_engineer':
        return {
          isOnOperation: location.pathname.startsWith('/dashboard/security') || location.pathname.startsWith('/dashboard/retest') || location.pathname.startsWith('/dashboard/service-projects'),
          operationPath: '/dashboard/security',
          operationLabel: 'Security Operations',
          operationIcon: ShieldCheck,
          badgeColor: 'bg-brand-cyan/15 hover:bg-brand-cyan/25 border-brand-cyan/35 text-brand-cyan',
        };
      default:
        return null;
    }
  };

  const switcher = getSpecialistSwitcher();

  // Any specialist (Admin, Developer, Malware Analyst, Security Tester) entering Analysis Console gains the exact same interface
  const isSpecialistRole = ['admin', 'developer', 'malware_analyst', 'security_engineer'].includes(currentUser.role);
  const isAnalysisMode = isSpecialistRole ? (switcher ? !switcher.isOnOperation : false) : false;

  const filteredNavItems = standardNavItems.filter(item => !item.roles || item.roles.includes(currentUser.role));

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
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 shrink-0 flex flex-col border-r border-white/10 bg-background-darker/95 lg:bg-background/50 backdrop-blur-2xl transition-all duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-[4.5rem]' : 'w-72 lg:w-64'}`}
      >
        {/* Logo Header */}
        <div className={`flex items-center border-b border-white/10 ${sidebarCollapsed ? 'justify-between px-2.5 py-3.5' : 'justify-between px-5 py-4'}`}>
          <Link to="/dashboard" onClick={() => setMobileSidebarOpen(false)} title="Sentrix" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Sentrix" className="w-7 h-7 rounded-lg object-contain shadow-md shadow-brand-cyan/20" />
            {!sidebarCollapsed && <span className="text-lg font-bold text-white tracking-tight">Sentrix.</span>}
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse / Expand toggle — replaces the globe icon on desktop */}
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Items - Dynamically rendered based on active mode & actor */}
        <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'px-2 py-3' : 'px-3 py-4'} space-y-4`}>
          {isAdmin && isAdminSection ? (
            /* ADMIN OPERATIONS & DISPATCH CENTER NAVIGATION */
            <div className="space-y-4">
              {/* Dispatch & Orders Section */}
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                  <span>Operations & Orders</span>
                  <span className="text-[9px] bg-brand-cyan/20 text-brand-cyan px-1.5 py-0.2 rounded font-mono font-bold">Admin</span>
                </div>
                <div className="space-y-1">
                  <Link
                    to="/dashboard/admin?tab=overview"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/admin' && (!location.search || location.search === '' || location.search.includes('tab=overview'))
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LayoutDashboard size={18} className="shrink-0" />
                    <span className="truncate">Admin Control</span>
                  </Link>

                  <Link
                    to="/dashboard/admin?tab=orders"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.search.includes('tab=orders') && !location.search.includes('group=')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ClipboardList size={18} className="shrink-0" />
                    <span className="truncate">Client Orders</span>
                  </Link>

                  <Link
                    to="/dashboard/service-projects"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname.startsWith('/dashboard/service-projects')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers size={18} className="shrink-0" />
                    <span className="truncate">Project Workspaces</span>
                  </Link>
                </div>
              </div>

              {/* Specialist Teams Section */}
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Specialist Teams
                </div>
                <div className="space-y-1">
                  <Link
                    to="/dashboard/admin?tab=orders&group=security_engineer"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.search.includes('group=security_engineer')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ShieldCheck size={18} className="shrink-0 text-brand-cyan" />
                      <span className="truncate">Security Testers</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20">
                      Pen-Test
                    </span>
                  </Link>

                  <Link
                    to="/dashboard/admin?tab=orders&group=developer"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.search.includes('group=developer')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Code size={18} className="shrink-0 text-emerald-400" />
                      <span className="truncate">Developers</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      Patches
                    </span>
                  </Link>

                  <Link
                    to="/dashboard/admin?tab=orders&group=malware_analyst"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.search.includes('group=malware_analyst')
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Bug size={18} className="shrink-0 text-amber-400" />
                      <span className="truncate">Malware Analysts</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      Lab
                    </span>
                  </Link>
                </div>
              </div>

              {/* Platform Governance Section */}
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Platform Governance
                </div>
                <div className="space-y-1">
                  <Link
                    to="/dashboard/admin?tab=users"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.search.includes('tab=users')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Users size={18} className="shrink-0" />
                    <span className="truncate">Users & Roles</span>
                  </Link>

                  <Link
                    to="/dashboard/admin?tab=system"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.search.includes('tab=system') || location.search.includes('tab=audit')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Activity size={18} className="shrink-0" />
                    <span className="truncate">System Health & Logs</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : currentUser.role === 'developer' && !isAnalysisMode ? (
            /* DEVELOPER OPERATIONS & ASSIGNED ORDERS DISPATCH NAVIGATION */
            <div className="space-y-4">
              {/* Dev Workspace & Assigned Orders */}
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                  <span>Developer Operations</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">DevSecOps</span>
                </div>
                <div className="space-y-1">
                  {/* Developer Dashboard */}
                  <Link
                    to="/dashboard/developer"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/developer' && (!location.search || location.search === '' || location.search === '?tab=overview')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LayoutDashboard size={18} className="shrink-0" />
                    <span className="truncate">Developer Dashboard</span>
                  </Link>

                  {/* Accept Orders from Admin */}
                  <Link
                    to="/dashboard/developer?tab=orders"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/developer' && location.search.includes('tab=orders')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList size={18} className="shrink-0 text-emerald-400" />
                      <span className="truncate">Assigned Orders</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold">
                      Accept
                    </span>
                  </Link>

                  {/* Project Workspaces */}
                  <Link
                    to="/dashboard/service-projects"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname.startsWith('/dashboard/service-projects')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers size={18} className="shrink-0" />
                    <span className="truncate">Project Workspaces</span>
                  </Link>
                </div>
              </div>

              {/* Code Remediation */}
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Remediation & Fixes
                </div>
                <div className="space-y-1">
                  <Link
                    to="/dashboard/remediation"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname.startsWith('/dashboard/remediation')
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Code size={18} className="shrink-0 text-emerald-400" />
                    <span className="truncate">Code Remediation</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : currentUser.role === 'security_engineer' && !isAnalysisMode ? (
            /* SECURITY OPERATIONS & ASSIGNED AUDITS NAVIGATION */
            <div className="space-y-4">
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                  <span>Security Operations</span>
                  <span className="text-[9px] bg-brand-cyan/20 text-brand-cyan px-1.5 py-0.2 rounded font-mono font-bold">SecOps</span>
                </div>
                <div className="space-y-1">
                  {/* Security Dashboard */}
                  <Link
                    to="/dashboard/security"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/security' && (!location.search || location.search === '' || location.search === '?tab=overview')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LayoutDashboard size={18} className="shrink-0" />
                    <span className="truncate">Security Dashboard</span>
                  </Link>

                  {/* Accept Orders from Admin */}
                  <Link
                    to="/dashboard/security?tab=orders"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/security' && location.search.includes('tab=orders')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList size={18} className="shrink-0 text-brand-cyan" />
                      <span className="truncate">Assigned Orders</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20 font-bold">
                      Accept
                    </span>
                  </Link>

                  {/* Project Workspaces */}
                  <Link
                    to="/dashboard/service-projects"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname.startsWith('/dashboard/service-projects')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers size={18} className="shrink-0" />
                    <span className="truncate">Project Workspaces</span>
                  </Link>
                </div>
              </div>

              {/* Retest Verification */}
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Audits & Retest
                </div>
                <div className="space-y-1">
                  <Link
                    to="/dashboard/retest"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname.startsWith('/dashboard/retest')
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <RotateCcw size={18} className="shrink-0 text-brand-cyan" />
                    <span className="truncate">Retest Verification</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : currentUser.role === 'malware_analyst' && !isAnalysisMode ? (
            /* MALWARE OPERATIONS & ASSIGNED LAB DISPATCH NAVIGATION */
            <div className="space-y-4">
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                  <span>Malware Operations</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-mono font-bold">MalLab</span>
                </div>
                <div className="space-y-1">
                  {/* Malware Dashboard */}
                  <Link
                    to="/dashboard/malware"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/malware' && (!location.search || location.search === '' || location.search === '?tab=overview')
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LayoutDashboard size={18} className="shrink-0" />
                    <span className="truncate">Malware Dashboard</span>
                  </Link>

                  {/* Accept Orders from Admin */}
                  <Link
                    to="/dashboard/malware?tab=orders"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname === '/dashboard/malware' && location.search.includes('tab=orders')
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList size={18} className="shrink-0 text-amber-400" />
                      <span className="truncate">Assigned Orders</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold">
                      Accept
                    </span>
                  </Link>

                  {/* Project Workspaces */}
                  <Link
                    to="/dashboard/service-projects"
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      location.pathname.startsWith('/dashboard/service-projects')
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers size={18} className="shrink-0" />
                    <span className="truncate">Project Workspaces</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : isAnalysisMode ? (
            /* ADMIN IN USER DASHBOARD / ANALYSIS CONSOLE (Billing & Plans Removed) */
            <div className="space-y-1">
              {enterpriseNavItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileSidebarOpen(false)}
                  title={sidebarCollapsed ? label : undefined}
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center ${sidebarCollapsed ? 'justify-center px-0 h-10' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ) : (
            /* STANDARD ROLE-FILTERED NAVIGATION */
            <div className="space-y-1">
              {filteredNavItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileSidebarOpen(false)}
                  title={sidebarCollapsed ? label : undefined}
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center ${sidebarCollapsed ? 'justify-center px-0 h-10' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-sm shadow-brand-cyan/10 font-semibold'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  {!sidebarCollapsed && label === 'Billing & Plans' && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                      Chapa
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Workspace Plan & Capacity Status - Shown ONLY for client users when sidebar is expanded */}
        {!sidebarCollapsed && !isSpecialistRole && (currentUser.role === 'client_owner' || currentUser.role === 'client_member') && (
          <div className="p-3 mx-3 mb-2 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Workspace Plan</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                userTier === 'enterprise'
                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-sm shadow-brand-purple/20'
                  : userTier === 'pro'
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm shadow-brand-cyan/20'
                  : 'bg-white/10 text-slate-300 border border-white/20'
              }`}>
                {userTier}
              </span>
            </div>

            <div className="text-[11px] text-text-muted leading-tight">
              {userTier === 'free' && '1 Target Monitored • 5 Scans/mo'}
              {userTier === 'pro' && 'Unlimited Targets • 5 Seats • Retests'}
              {userTier === 'enterprise' && 'Sovereign Lab • Dedicated Detonation'}
            </div>

            {userTier !== 'enterprise' && currentUser.role === 'client_owner' && (
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/dashboard/billing');
                }}
                className="w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all btn-primary shadow-sm shadow-brand-cyan/20"
              >
                <Sparkles size={12} />
                <span>{userTier === 'free' ? 'Upgrade to Pro' : 'Upgrade to Enterprise'}</span>
              </button>
            )}
          </div>
        )}

        {/* User profile & Sign Out */}
        <div className={`border-t border-white/10 ${sidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}>
          {sidebarCollapsed ? (
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shadow-md hover:ring-2 hover:ring-brand-cyan/50 transition-all cursor-pointer focus:outline-none"
              title={`View Profile (${currentUser.name})`}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </button>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-brand-cyan/20 transition-all">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-85 transition-opacity group cursor-pointer focus:outline-none"
                title="Click to view user profile"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0 group-hover:ring-2 group-hover:ring-brand-cyan/50 transition-all">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate group-hover:text-brand-cyan transition-colors">{currentUser.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-brand-cyan capitalize truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
                    {currentUser.role?.replace('_', ' ')}
                  </div>
                </div>
              </button>
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
          )}
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
            {/* Specialist & Admin Operation Mode Switcher Pill */}
            {switcher && (
              switcher.isOnOperation ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/35 text-brand-cyan text-xs font-semibold transition-all shadow-sm shadow-brand-cyan/10"
                  title="Switch to Analysis Console"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span>Analysis Console</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate(switcher.operationPath)}
                  className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-sm ${switcher.badgeColor}`}
                  title={`Return to ${switcher.operationLabel}`}
                >
                  <switcher.operationIcon size={13} />
                  <span>{switcher.operationLabel}</span>
                </button>
              )
            )}

            {/* User Role Badge (Read-Only) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs"
                title={`Logged in as ${currentUser.role?.replace('_', ' ')}`}
              >
                <Shield size={13} className="text-brand-cyan" />
                <span className="text-text-muted hidden sm:inline">Role:</span>
                <span className="text-white font-semibold capitalize truncate max-w-[130px]">
                  {currentUser.role?.replace('_', ' ')}
                </span>
              </div>

              {/* Tier Badge - Shown ONLY for client users (NEVER for admin/specialists) */}
              {!isSpecialistRole && (currentUser.role === 'client_owner' || currentUser.role === 'client_member') && (
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    userTier === 'enterprise'
                      ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-sm shadow-brand-purple/20'
                      : userTier === 'pro'
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm shadow-brand-cyan/20'
                      : 'bg-white/10 text-slate-300 border border-white/20'
                  }`}>
                    {userTier}
                  </span>

                  {userTier === 'free' && currentUser.role === 'client_owner' && (
                    <button
                      onClick={() => navigate('/dashboard/billing')}
                      className="btn-primary text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm shadow-brand-cyan/20"
                      title="Upgrade to Pro via Chapa"
                    >
                      <Sparkles size={11} />
                      <span className="hidden sm:inline">Upgrade</span>
                    </button>
                  )}
                </div>
              )}
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

              {/* Invisible click-away overlay */}
              {showNotifications && (
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowNotifications(false)}
                />
              )}

              {/* Notification Popover */}
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
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 hover:opacity-85 transition-opacity group cursor-pointer text-left focus:outline-none"
                title="Click to view user profile"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shadow-md group-hover:ring-2 group-hover:ring-brand-cyan/50 transition-all">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight group-hover:text-brand-cyan transition-colors">{currentUser.name}</div>
                  <div className="text-[10px] text-text-muted leading-tight">{currentUser.email}</div>
                </div>
              </button>
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

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};
