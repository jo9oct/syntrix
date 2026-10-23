import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Bug,
  FileText,
  Settings,
  ShieldCheck,
  ArrowRightLeft,
  RotateCcw,
  LogOut,
  ClipboardList,
  Layers
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { to: '/dashboard/assessment/new', label: 'New Assessment', icon: ShieldCheck },
  { to: '/dashboard/remediation', label: 'Remediation', icon: ArrowRightLeft },
  { to: '/dashboard/retest', label: 'Retesting', icon: RotateCcw },
  { to: '/dashboard/reports', label: 'Reports', icon: FileText },
  { to: '/dashboard/malware', label: 'Malware Analysis', icon: Bug },
  { to: '/dashboard/admin', label: 'Administration', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="w-64 h-screen border-r border-white/10 bg-surface/50 backdrop-blur-xl p-4 flex flex-col">
      <div className="flex items-center gap-3 px-2 mb-6">
        <img src="/logo.png" alt="Sentrix" className="w-8 h-8 rounded-lg object-contain shadow-md shadow-brand-cyan/20" />
        <h1 className="text-xl font-bold text-white tracking-tight">Sentrix.</h1>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <div className="font-medium text-sm text-white">{user?.name || 'Security Lead'}</div>
            <div className="text-xs text-brand-cyan capitalize">{user?.role?.replace('_', ' ') || 'Engineer'}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
