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

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; organization: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'usr_owner_sentrix',
        name: 'Alex Rivera',
        email: 'alex.rivera@sentrix-cyber.io',
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
        } catch (err: any) {
          const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
          set({ error: msg, isLoading: false });
        }
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
