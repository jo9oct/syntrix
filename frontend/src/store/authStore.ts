import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../lib/api";
import {
  cookieStorage,
  setAuthToken,
  removeAuthToken,
  getAuthToken,
} from "../lib/cookieStorage";

export type UserRole =
  | "admin"
  | "client_owner"
  | "client_member"
  | "security_engineer"
  | "developer"
  | "malware_analyst";

export const UserRole = {
  ADMIN: "admin" as const,
  CLIENT_OWNER: "client_owner" as const,
  CLIENT_MEMBER: "client_member" as const,
  SECURITY_ENGINEER: "security_engineer" as const,
  DEVELOPER: "developer" as const,
  MALWARE_ANALYST: "malware_analyst" as const,
};

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  organizationId?: string;
  isOwner?: boolean;
  organizationOnboarded?: boolean;
  hasPassword?: boolean;
  provider?: string;
  subscriptionTier?: "free" | "pro" | "enterprise";
  subscriptionStatus?: "active" | "trial" | "canceled";
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
    name: "System Admin",
    email: "admin@sentrix.local",
    role: "admin",
    title: "Platform Administrator",
    defaultPath: "/dashboard/admin",
    description:
      "System-wide governance, user provisioning, tenant control and platform audits.",
    badgeColor: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  security_engineer: {
    name: "Jane Smith",
    email: "jane@sentrix.local",
    role: "security_engineer",
    title: "Senior Security Engineer",
    defaultPath: "/dashboard/security",
    description:
      "Vulnerability assessment, 25-scanner execution, scopes, company rules, and finding triage.",
    badgeColor: "bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30",
  },
  developer: {
    name: "Alex Rivera",
    email: "dev@sentrix.local",
    role: "developer",
    title: "Remediation Developer",
    defaultPath: "/dashboard/developer",
    description:
      "Kanban remediation tickets, patch development, and 1-click verification retest requests.",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  malware_analyst: {
    name: "Sarah Connor",
    email: "sarah@sentrix.local",
    role: "malware_analyst",
    title: "Lead Malware Analyst",
    defaultPath: "/dashboard/malware",
    description:
      "Static binary disassembly, behavioral traces, dynamic sandbox emulation, and IOC extraction.",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  client_owner: {
    name: "John Doe",
    email: "john@acmecorp.local",
    role: "client_owner",
    title: "Acme Corp Client Owner",
    defaultPath: "/dashboard/billing",
    description:
      "Executive project overview, asset risk monitoring, and Chapa subscription billing.",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  client_member: {
    name: "Team Member",
    email: "member@acmecorp.local",
    role: "client_member",
    title: "Client Stakeholder",
    defaultPath: "/dashboard",
    description:
      "View reported findings and compliance reports for assigned organizational assets.",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
};

/**
 * Returns the designated landing route for each role when they log in.
 */
export const getRoleLandingPath = (role?: string): string => {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "developer":
      return "/dashboard/developer";
    case "malware_analyst":
      return "/dashboard/malware";
    case "client_owner":
      return "/dashboard/billing";
    case "client_member":
      return "/dashboard";
    case "security_engineer":
      return "/dashboard/security";
    default:
      return "/dashboard";
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<User>;
  switchRole: (role: UserRole) => User;
  register: (data: {
    name: string;
    email: string;
    password: string;
    organization?: string;
    [key: string]: any;
  }) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, password: string) => Promise<any>;
  verifyEmail: (verificationToken: string) => Promise<any>;
  resendVerification: (email?: string) => Promise<any>;
  updateProfile: (id: string, data: { name?: string; userName?: string; organization?: string }) => Promise<any>;
  changePassword: (id: string, passwords: { oldPassword?: string; newPassword?: string; password?: string }) => Promise<any>;
  deleteAccount: () => Promise<any>;
  checkAuth: () => Promise<any>;
  fetchMe: () => Promise<User | null>;
  handleOAuthToken: (token: string) => Promise<User | null>;
  completeOnboarding: (data: {
    organization?: string;
    hasNoOrganization?: boolean;
    isSecurityResponsible?: boolean;
  }) => Promise<User | null>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (identifier: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/auth/login", {
            email: identifier,
            userName: identifier,
            identifier,
            password,
          });
          const token = data.token || data.data?.token;
          const user = data.user || data.data?.user;
          if (token) {
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }

          let profile = user;
          let tier = user?.subscriptionTier || "free";
          let status = user?.subscriptionStatus || "active";

          try {
            const meRes = await api.get("/auth/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.data?.data) {
              const raw = meRes.data.data;
              if (raw.subscriptionTier) tier = raw.subscriptionTier;
              if (raw.subscriptionStatus) status = raw.subscriptionStatus;

              profile = {
                id: raw._id || raw.id || user?._id || user?.id,
                name: raw.name || user?.name || raw.userName || user?.userName,
                email: raw.email || user?.email,
                role: raw.role || user?.role || "user",
                organization: raw.organization || user?.organization || "",
                organizationId:
                  raw.organizationId ?? user?.organizationId ?? null,
                isOwner: raw.isOwner ?? user?.isOwner ?? false,
                organizationOnboarded:
                  raw.organizationOnboarded ?? user?.organizationOnboarded ?? true,
                hasPassword: raw.hasPassword ?? user?.hasPassword ?? true,
                provider: raw.provider || user?.provider || "local",
                subscriptionTier: tier,
                subscriptionStatus: status,
              };
            }
          } catch {
            // Keep user from login response
          }

          try {
            const subRes = await api.get("/payment/subscription", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (subRes.data?.data?.tier) {
              tier = subRes.data.data.tier;
              status = subRes.data.data.status || status;
              profile = {
                ...profile,
                subscriptionTier: tier,
                subscriptionStatus: status,
              };
            }
          } catch {
            // Subscription fallback
          }

          if (token) {
            setAuthToken(token);
          }
          set({
            user: profile,
            token,
            isAuthenticated: !!token,
            isLoading: false,
            error: null,
          });
          return profile;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Login failed. Please check your credentials.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      fetchMe: async () => {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) return null;
        set({ isLoading: true });
        try {
          const { data } = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${currentToken}` },
          });
          if (data?.data) {
            const raw = data.data;
            let tier: "free" | "pro" | "enterprise" =
              raw.subscriptionTier || "free";
            let status: "active" | "trial" | "canceled" =
              raw.subscriptionStatus || "active";

            try {
              const subRes = await api.get("/payment/subscription", {
                headers: { Authorization: `Bearer ${currentToken}` },
              });
              if (subRes.data?.data?.tier) {
                tier = subRes.data.data.tier;
                status = subRes.data.data.status || status;
              }
            } catch {
              // Ignore fallback
            }

            const updatedUser: User = {
              id: raw._id || raw.id,
              name: raw.name,
              email: raw.email,
              role: raw.role,
              organization: raw.organization || "",
              organizationId: raw.organizationId ?? null,
              isOwner: raw.isOwner ?? false,
              organizationOnboarded: raw.organizationOnboarded ?? true,
              hasPassword:
                raw.hasPassword !== undefined
                  ? Boolean(raw.hasPassword)
                  : raw.provider !== "google",
              provider: raw.provider || "local",
              subscriptionTier: tier,
              subscriptionStatus: status,
            };
            set({
              user: updatedUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return updatedUser;
          }
          return null;
        } catch (err: any) {
          set({ isLoading: false });
          return null;
        }
      },

      handleOAuthToken: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          setAuthToken(token);
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          if (typeof window !== "undefined") {
            (window as any).__SENTRIX_AUTH_TOKEN__ = token;
          }

          const { data } = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (data?.data) {
            const raw = data.data;
            let tier: "free" | "pro" | "enterprise" =
              raw.subscriptionTier || "free";
            let status: "active" | "trial" | "canceled" =
              raw.subscriptionStatus || "active";

            try {
              const subRes = await api.get("/payment/subscription", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (subRes.data?.data?.tier) {
                tier = subRes.data.data.tier;
                status = subRes.data.data.status || status;
              }
            } catch {
              // Ignore fallback
            }

            const updatedUser: User = {
              id: raw._id || raw.id,
              name: raw.name || raw.userName || "User",
              email: raw.email,
              role: raw.role || "client_member",
              organization: raw.organization || "",
              organizationId: raw.organizationId ?? null,
              isOwner: raw.isOwner ?? false,
              organizationOnboarded: raw.organizationOnboarded ?? true,
              hasPassword:
                raw.hasPassword !== undefined
                  ? Boolean(raw.hasPassword)
                  : raw.provider !== "google",
              provider: raw.provider || "local",
              subscriptionTier: tier,
              subscriptionStatus: status,
            };

            set({
              user: updatedUser,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return updatedUser;
          }
          set({ isLoading: false });
          return null;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to complete OAuth sign-in.";
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
      },

      completeOnboarding: async (data: {
        organization?: string;
        hasNoOrganization?: boolean;
        isSecurityResponsible?: boolean;
      }) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post("/auth/onboarding", data);
          const raw = res.data?.data || res.data?.user;
          if (raw) {
            const currentUser = useAuthStore.getState().user;
            let tier: "free" | "pro" | "enterprise" =
              raw.subscriptionTier || currentUser?.subscriptionTier || "free";
            let status: "active" | "trial" | "canceled" =
              raw.subscriptionStatus || currentUser?.subscriptionStatus || "active";

            const updatedUser: User = {
              id: raw._id || raw.id || currentUser?.id || "",
              name: raw.name || currentUser?.name || "User",
              email: raw.email || currentUser?.email || "",
              role: raw.role || currentUser?.role || "client_member",
              organization: raw.organization || "",
              organizationId: raw.organizationId ?? null,
              isOwner: raw.isOwner ?? false,
              organizationOnboarded: true,
              hasPassword: raw.hasPassword ?? currentUser?.hasPassword ?? false,
              provider: raw.provider || currentUser?.provider || "local",
              subscriptionTier: tier,
              subscriptionStatus: status,
            };

            set({
              user: updatedUser,
              isLoading: false,
              error: null,
            });
            return updatedUser;
          }
          set({ isLoading: false });
          return null;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to complete workspace organization setup.";
          set({ isLoading: false, error: msg });
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
        setAuthToken(token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return user;
      },

      register: async (formData: any) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            ...formData,
            userName: formData.userName || formData.name || formData.email?.split("@")[0],
          };
          const { data } = await api.post("/auth/register", payload);
          const token = data.token || data.data?.token;
          const user = data.user || data.data?.user;
          if (token) {
            setAuthToken(token);
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
          set({
            user: user || null,
            token: token || null,
            isAuthenticated: !!token,
            isLoading: false,
          });
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Registration failed. Please try again.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/auth/forgot-password", { email });
          set({ isLoading: false });
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to send password reset email.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post(`/auth/reset-password/${token}`, { password });
          set({ isLoading: false });
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to reset password.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      verifyEmail: async (verificationToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post("/auth/verify", { verificationToken });
          const token = data.token || data.data?.token;
          const user = data.user || data.data?.user;
          if (token) {
            setAuthToken(token);
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
          set({
            user: user || null,
            token: token || null,
            isAuthenticated: !!token,
            isLoading: false,
          });
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Invalid or expired verification code.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      resendVerification: async (email?: string) => {
        try {
          const { data } = await api.post(
            "/auth/resend-verification-code",
            email ? { email } : {}
          );
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to resend verification code.";
          throw new Error(msg);
        }
      },

      updateProfile: async (id: string, updateData: any) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.put(`/auth/update-profile/${id}`, updateData);
          if (data?.user) {
            set((state: any) => ({
              user: state.user ? { ...state.user, ...data.user } : data.user,
              isLoading: false,
            }));
          } else {
            set({ isLoading: false });
          }
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to update profile.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      changePassword: async (id: string, passwords: any) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post(`/auth/change-password/${id}`, passwords);
          set({ isLoading: false });
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to change password.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.delete("/auth/remove-account");
          removeAuthToken();
          delete api.defaults.headers.common["Authorization"];
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return data;
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to delete account.";
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      checkAuth: async () => {
        try {
          const { data } = await api.get("/auth/check-auth");
          if (data?.user) {
            set((state: any) => ({
              user: state.user ? { ...state.user, ...data.user } : data.user,
              isAuthenticated: true,
            }));
          }
          return data;
        } catch {
          return null;
        }
      },

      logout: () => {
        removeAuthToken();
        api.post("/auth/logout").catch(() => {});
        delete api.defaults.headers.common["Authorization"];
        if (typeof window !== "undefined") {
          delete (window as any).__SENTRIX_AUTH_TOKEN__;
        }
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "sentrix-auth",
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state: any) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        user: state.user
          ? {
              id: state.user.id || state.user._id,
              name: state.user.name,
              email: state.user.email,
              role: state.user.role,
              organizationId: state.user.organizationId ?? null,
              subscriptionTier: state.user.subscriptionTier ?? "free",
              subscriptionStatus: state.user.subscriptionStatus ?? "active",
            }
          : null,
      }),
    },
  ),
);

export const useUserTier = () => {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isSpecialistOrAdmin =
    role === "admin" ||
    role === "security_engineer" ||
    role === "developer" ||
    role === "malware_analyst";

  // Admin, Security Engineer, Developer, and Malware Analyst roles equate to Enterprise subscription
  const tier = isSpecialistOrAdmin
    ? "enterprise"
    : ((user?.subscriptionTier || "free") as "free" | "pro" | "enterprise");

  return {
    tier: tier as "free" | "pro" | "enterprise",
    isFree: !isSpecialistOrAdmin && tier === "free",
    isPro: !isSpecialistOrAdmin && tier === "pro",
    isEnterprise: isSpecialistOrAdmin || tier === "enterprise",
    status: user?.subscriptionStatus || "active",
  };
};

if (typeof window !== "undefined") {
  const currentToken = getAuthToken();
  if (currentToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${currentToken}`;
    (window as any).__SENTRIX_AUTH_TOKEN__ = currentToken;
  } else {
    delete api.defaults.headers.common["Authorization"];
    delete (window as any).__SENTRIX_AUTH_TOKEN__;
  }
}
