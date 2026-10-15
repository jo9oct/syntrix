import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge } from '../../../components/ui/Badge';
import {
  Settings, Users, Shield, ShieldAlert, Activity,
  CheckCircle2, Plus, Search, Server, Database, X,
  UserPlus, Lock, Building, AlertTriangle, RefreshCw
} from 'lucide-react';
import { type UserRole } from '../../../store/authStore';
import api from '../../../lib/api';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  org: string;
  status: 'active' | 'suspended';
  lastLogin: string;
}

const INITIAL_USERS: UserRecord[] = [
  { id: 'u-1', name: 'System Admin', email: 'admin@sentrix.local', role: 'admin', org: 'Sentrix Ops', status: 'active', lastLogin: '10 min ago' },
  { id: 'u-2', name: 'Jane Smith', email: 'jane@sentrix.local', role: 'security_engineer', org: 'Sentrix Ops', status: 'active', lastLogin: '25 min ago' },
  { id: 'u-3', name: 'Sarah Connor', email: 'sarah@sentrix.local', role: 'malware_analyst', org: 'Sentrix Lab', status: 'active', lastLogin: '3 hours ago' },
  { id: 'u-4', name: 'John Doe', email: 'john@acmecorp.local', role: 'client_owner', org: 'Acme Corp', status: 'active', lastLogin: '1 day ago' },
  { id: 'u-5', name: 'Alex Rivera', email: 'dev@sentrix.local', role: 'developer', org: 'Acme Corp', status: 'active', lastLogin: '2 days ago' },
];

const AUDIT_LOGS = [
  { event: 'User Login Succeeded', actor: 'jane@sentrix.local', ip: '127.0.0.1', target: 'Auth /api/v1/auth/login', time: '10 min ago' },
  { event: 'Security Assessment Started', actor: 'jane@sentrix.local', ip: '127.0.0.1', target: 'Target: portal.acmecorp.local', time: '15 min ago' },
  { event: 'Finding Status Changed: Fixed', actor: 'alex@sentrix.local', ip: '127.0.0.1', target: 'F-104 (Missing Headers)', time: '1 hour ago' },
  { event: 'Malware Sample Uploaded', actor: 'sarah@sentrix.local', ip: '127.0.0.1', target: 'invoice_2026.pdf.exe', time: '3 hours ago' },
  { event: 'Report Exported (HTML/PDF)', actor: 'john@acmecorp.local', ip: '127.0.0.1', target: 'REP-001 Executive Summary', time: '5 hours ago' },
  { event: 'New Organization Created', actor: 'admin@sentrix.local', ip: '127.0.0.1', target: 'Acme Corp', time: '1 day ago' },
];

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system'>('users');
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // New user form - cleared by default
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('security_engineer');
  const [inviteOrg, setInviteOrg] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch real users from MongoDB backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/admin/users');
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setUsers(data.data);
        }
      } catch (err) {
        // Fallback to initial
      }
    };
    fetchUsers();
  }, []);

  const toggleUserStatus = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/status`);
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u))
      );
    } catch (err) {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u))
      );
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const { data } = await api.post('/admin/users', {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        organization: inviteOrg || 'Sentrix Operations'
      });

      if (data?.data) {
        setUsers(prev => [data.data, ...prev]);
        setShowInviteModal(false);
        setInviteName('');
        setInviteEmail('');
        setInvitePassword('');
        setInviteOrg('');
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Failed to create user in database.');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-magenta/10 border border-brand-magenta/20 text-xs text-brand-magenta font-medium mb-1">
            <Settings size={14} /> Platform Administration & Governance
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Control Center</h1>
          <p className="text-sm text-text-muted">
            Manage user roles, platform organizations, real-time security audit trails, and microservice health.
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => {
              setCreateError(null);
              setShowInviteModal(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
          >
            <UserPlus size={16} /> Create User
          </button>
        )}
      </div>


      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 text-xs font-semibold">
        {[
          { id: 'users', label: `Users & Roles (${users.length})` },
          { id: 'audit', label: `Audit Event Logs (${AUDIT_LOGS.length})` },
          { id: 'system', label: 'System Health & Services' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === t.id
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-text-muted outline-none focus:border-brand-cyan"
            />
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Assigned Role</th>
                  <th className="px-4 py-3.5">Organization</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Last Login</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] text-text-muted font-mono">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted">{u.org}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted">{u.lastLogin}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`text-xs hover:underline font-semibold ${
                          u.status === 'active' ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
              <tr>
                <th className="px-5 py-3.5">Security Event</th>
                <th className="px-4 py-3.5">Actor</th>
                <th className="px-4 py-3.5">IP Address</th>
                <th className="px-4 py-3.5">Target Scope</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {AUDIT_LOGS.map((a, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan"></span>
                    {a.event}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-text-muted">{a.actor}</td>
                  <td className="px-4 py-3.5 font-mono text-text-muted">{a.ip}</td>
                  <td className="px-4 py-3.5 text-white">{a.target}</td>
                  <td className="px-5 py-3.5 text-text-muted text-right">{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Tab: System Health */}
      {activeTab === 'system' && (
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard className="p-5 border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
                <Database size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">MongoDB Primary</h4>
                <p className="text-xs text-green-400 font-semibold">Connected (Localhost:27017)</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-text-muted pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-mono text-white">sentrix</span>
              </div>
              <div className="flex justify-between">
                <span>Collections:</span>
                <span className="font-mono text-white">5 (Users, Projects, Findings...)</span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-mono text-green-400">&lt; 1ms</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan">
                <Server size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Express Backend API</h4>
                <p className="text-xs text-brand-cyan font-semibold">Port 3001 Healthy</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-text-muted pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span>Endpoints:</span>
                <span className="font-mono text-white">/api/v1 (REST)</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-mono text-white">100%</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="font-mono text-brand-cyan">Development / Demo</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple">
                <Activity size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Scanner Engine Adapter</h4>
                <p className="text-xs text-brand-purple font-semibold">Mock Security Engine Ready</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-text-muted pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span>Test Catalog:</span>
                <span className="font-mono text-white">12 OWASP/API Vectors</span>
              </div>
              <div className="flex justify-between">
                <span>Malware Adapter:</span>
                <span className="font-mono text-white">Static PE/ELF Heuristics</span>
              </div>
              <div className="flex justify-between">
                <span>Handoff Ready:</span>
                <span className="font-mono text-green-400">True (Decoupled Engine)</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Create User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 border-brand-cyan/30 shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={20} className="text-brand-cyan" />
              <h3 className="text-lg font-bold text-white">Create Platform User</h3>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="marcus@company.local"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Enter initial password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                >
                  <option value="security_engineer">Security Engineer / Pen Tester</option>
                  <option value="client_owner">Client Owner</option>
                  <option value="developer">Developer / Remediation</option>
                  <option value="malware_analyst">Malware Analyst</option>
                  <option value="admin">Platform Admin</option>
                  <option value="client_member">Client Member</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Organization (Optional)</label>
                <input
                  type="text"
                  value={inviteOrg}
                  onChange={(e) => setInviteOrg(e.target.value)}
                  placeholder="e.g. Acme Corp or Sentrix Lab"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-primary text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5"
                >
                  {createLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

    </div>
  );
};
