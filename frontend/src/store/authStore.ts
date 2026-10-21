import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export type UserRole = 'admin' | 'client_owner' | 'client_member' | 'security_engineer' | 'developer' | 'malware_analyst';

export const UserRole = {
  ADMIN: 'admin' as const,
  CLIENT_OWNER: 'client_owner' as const,
  CLIENT_MEMBER: 'client_member' as const,
  SECURITY_ENGINEER: 'security_engineer' as const,
  DEVELOPER: 'developer' as const,
  MALWARE_ANALYST: 'malware_analyst' as const,
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface DemoActor {
  name: string;
  email: string;
  role: UserRole;
  title: string;
  defaultPath: string;
  description: string;
  badgeColor: string;
}

export const DEMO_ACTORS: Record<UserRole, DemoActor> = {
  admin: {
    name: 'System Admin',
    email: 'admin@sentrix.local',
    role: 'admin',
    title: 'Platform Administrator',
    defaultPath: '/dashboard/admin',
    description: 'System-wide governance, user provisioning, tenant control and platform audits.',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30'
  },
  security_engineer: {
    name: 'Jane Smith',
    email: 'jane@sentrix.local',
    role: 'security_engineer',
    title: 'Senior Security Engineer',
    defaultPath: '/dashboard',
    description: 'Vulnerability assessment, 25-scanner execution, scopes, company rules, and finding triage.',
    badgeColor: 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30'
  },
  developer: {
    name: 'Alex Rivera',
    email: 'dev@sentrix.local',
    role: 'developer',
    title: 'Remediation Developer',
    defaultPath: '/dashboard/remediation',
    description: 'Kanban remediation tickets, patch development, and 1-click verification retest requests.',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  },
  malware_analyst: {
    name: 'Sarah Connor',
    email: 'sarah@sentrix.local',
    role: 'malware_analyst',
    title: 'Lead Malware Analyst',
    defaultPath: '/dashboard/malware',
    description: 'Static binary disassembly, behavioral traces, dynamic sandbox emulation, and IOC extraction.',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  },
  client_owner: {
    name: 'John Doe',
    email: 'john@acmecorp.local',
    role: 'client_owner',
    title: 'Acme Corp Client Owner',
    defaultPath: '/dashboard/billing',
    description: 'Executive project overview, asset risk monitoring, and Chapa subscription billing.',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  },
  client_member: {
    name: 'Team Member',
    email: 'member@acmecorp.local',
    role: 'client_member',
    title: 'Client Stakeholder',
    defaultPath: '/dashboard/findings',
    description: 'View reported findings and compliance reports for assigned organizational assets.',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  }
};

/**
 * Returns the designated landing route for each role when they log in.
 */
export const getRoleLandingPath = (role?: string): string => {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'developer':
      return '/dashboard/remediation';
    case 'malware_analyst':
      return '/dashboard/malware';
    case 'client_owner':
      return '/dashboard/billing';
    case 'client_member':
      return '/dashboard/findings';
    case 'security_engineer':
    default:
      return '/dashboard';
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  switchRole: (role: UserRole) => User;
  register: (data: { name: string; email: string; password: string; organization: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'usr_sec',
        name: 'Jane Smith',
        email: 'jane@sentrix.local',
        role: 'security_engineer'
      },
      token: 'sentrix_demo_auth_token',
      isAuthenticated: true,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { token, user } = data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, isAuthenticated: true, isLoading: false });
          return user;
        } catch (err: any) {
          const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      switchRole: (role: UserRole) => {
        const actor = DEMO_ACTORS[role] || DEMO_ACTORS.security_engineer;
        const user: User = {
          id: `usr_${actor.role}`,
          name: actor.name,
          email: actor.email,
          role: actor.role,
        };
        const token = `sentrix_token_${actor.role}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token, isAuthenticated: true, isLoading: false, error: null });
        return user;
      },

      register: async (formData: any) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', formData);
          const { token, user } = data.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          const msg = err.response?.data?.error || 'Registration failed. Please try again.';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sentrix-auth',
      partialize: (state: any) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
