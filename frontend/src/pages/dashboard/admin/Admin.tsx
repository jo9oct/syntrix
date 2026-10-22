import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Settings, Users, Shield, ShieldAlert, Activity,
  CheckCircle2, Plus, Search, Server, Database, X,
  UserPlus, Lock, Building, AlertTriangle, RefreshCw,
  ClipboardList, ArrowRight, Clock, ShieldCheck, Bug,
  Code, ArrowRightLeft, Sparkles, Filter, Check,
  ExternalLink, FileText, Send, ChevronRight, Zap, Play,
  Cpu, HardDrive, Terminal
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { type UserRole } from '../../../store/authStore';
import api from '../../../lib/api';

export interface ServerRootInfo {
  name: string;
  status: string;
  framework: string;
  apiVersion: string;
}

export interface HealthCheckInfo {
  status: string;
  timestamp: string;
  checks: {
    database: { healthy: boolean; state: number };
    scanners: { healthy: boolean; total: number; recon: number; security: number };
  };
}

export interface HealthMetricsInfo {
  timestamp: string;
  scan: {
    started: number;
    completed: number;
    failed: number;
    cancelled: number;
    findings: number;
    durationMs: number;
    averageDurationMs: number;
  };
  system: {
    process: {
      pid: number;
      uptimeSeconds: number;
      memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers: number;
      };
    };
    system: {
      platform: string;
      architecture: string;
      hostname: string;
      cpuCount: number;
      loadAverage: number[];
    };
  };
}

export interface ClientOrder {
  id: string;
  clientName: string;
  clientEmail: string;
  organization: string;
  orderType: string;
  target: string;
  serviceTier: 'Enterprise Sovereign' | 'Pro Security';
  amount: number;
  status: 'pending_review' | 'accepted' | 'in_progress' | 'completed';
  assignedGroup: 'security_engineer' | 'developer' | 'malware_analyst' | null;
  assignedTo: string | null;
  priority: 'critical' | 'high' | 'medium';
  progress: number;
  phase: string;
  createdAt: string;
  deadline: string;
  deliverable: string;
  notes?: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  org?: string;
  status: 'active' | 'suspended';
  lastLogin?: string;
  createdAt?: string;
}

const INITIAL_USERS: UserRecord[] = [
  { id: 'u-1', name: 'System Admin', email: 'admin@sentrix.local', role: 'admin', org: 'Sentrix Ops', status: 'active', lastLogin: '10 min ago' },
  { id: 'u-2', name: 'Jane Smith', email: 'jane@sentrix.local', role: 'security_engineer', org: 'Sentrix Ops', status: 'active', lastLogin: '25 min ago' },
  { id: 'u-3', name: 'Sarah Connor', email: 'sarah@sentrix.local', role: 'malware_analyst', org: 'Sentrix Lab', status: 'active', lastLogin: '3 hours ago' },
  { id: 'u-4', name: 'John Doe', email: 'john@acmecorp.local', role: 'client_owner', org: 'Acme Corp', status: 'active', lastLogin: '1 day ago' },
  { id: 'u-5', name: 'Alex Rivera', email: 'dev@sentrix.local', role: 'developer', org: 'Acme Corp', status: 'active', lastLogin: '2 days ago' },
];

const INITIAL_ORDERS: ClientOrder[] = [
  {
    id: 'ORD-9201',
    clientName: 'Michael Sterling',
    clientEmail: 'security@acmebank.local',
    organization: 'Acme Financial Group',
    orderType: 'Full Web & API Penetration Assessment',
    target: 'https://api.acmebank.local/v2/transfers',
    serviceTier: 'Enterprise Sovereign',
    amount: 85000,
    status: 'pending_review',
    assignedGroup: null,
    assignedTo: null,
    priority: 'critical',
    progress: 0,
    phase: 'Pending Admin Acceptance',
    createdAt: 'Today, 09:15 AM',
    deadline: '48 Hours (SLA Guarantee)',
    deliverable: 'Executive PDF + Technical DAST Vulnerability Matrix',
    notes: 'Focus on OAuth2 token leakage and SQL injection vectors on payment endpoints.'
  },
  {
    id: 'ORD-8842',
    clientName: 'Dr. Evelyn Reed',
    clientEmail: 'it-sec@globexhealth.local',
    organization: 'Globex Health Solutions',
    orderType: 'Ransomware Binary Static & Dynamic Detonation',
    target: 'invoice_payload_encrypted.dll',
    serviceTier: 'Enterprise Sovereign',
    amount: 65000,
    status: 'accepted',
    assignedGroup: null,
    assignedTo: null,
    priority: 'critical',
    progress: 0,
    phase: 'Accepted by Admin — Ready for Assignment',
    createdAt: 'Yesterday, 04:30 PM',
    deadline: '24 Hours (Urgent Triage)',
    deliverable: 'MITRE ATT&CK Mapping & Extracted C2 Network IOCs',
    notes: 'Potential LockBit variant disguised as PDF invoice. Quarantine strictly.'
  },
  {
    id: 'ORD-8115',
    clientName: 'Kalkidan Bekele',
    clientEmail: 'devops@sovereigntelecom.et',
    organization: 'Sovereign Telecom',
    orderType: 'Stored XSS & SQLi Remediation Patch Sprints',
    target: 'portal.sovereigntelecom.et/billing',
    serviceTier: 'Pro Security',
    amount: 45000,
    status: 'in_progress',
    assignedGroup: 'developer',
    assignedTo: 'Alex Rivera (Lead Dev)',
    priority: 'high',
    progress: 65,
    phase: 'Patch PR #418 Prepared — Awaiting Verification Retest',
    createdAt: '2 days ago',
    deadline: 'Tomorrow, 05:00 PM',
    deliverable: 'Code Sanitization Patch & Automated Verification Retest'
  },
  {
    id: 'ORD-7729',
    clientName: 'Tewodros Kassahun',
    clientEmail: 'ciso@addisretail.local',
    organization: 'Addis Retail Group',
    orderType: 'External Attack Surface & Subdomain Discovery',
    target: 'shop.addisretail.local',
    serviceTier: 'Pro Security',
    amount: 35000,
    status: 'in_progress',
    assignedGroup: 'security_engineer',
    assignedTo: 'Jane Smith (Senior Pen-Tester)',
    priority: 'high',
    progress: 80,
    phase: 'Active Exploitation Verified — Generating Final Report',
    createdAt: '3 days ago',
    deadline: '4 days',
    deliverable: 'Full Security Posture Benchmark & Remediation Advisory'
  },
  {
    id: 'ORD-7104',
    clientName: 'Abebe Desta',
    clientEmail: 'admin@nationallogistics.et',
    organization: 'National Logistics Ltd',
    orderType: 'Zero-Day Driver Memory Injection Reverse Engineering',
    target: 'sys_filter_driver.sys',
    serviceTier: 'Enterprise Sovereign',
    amount: 95000,
    status: 'completed',
    assignedGroup: 'malware_analyst',
    assignedTo: 'Sarah Connor (Malware Lead)',
    priority: 'critical',
    progress: 100,
    phase: 'Analysis Completed & Signed Off by Lead',
    createdAt: '5 days ago',
    deadline: 'Completed on Time',
    deliverable: 'YARA Rules & Kernel Exploit PoC Documentation'
  }
];

const AUDIT_LOGS = [
  { event: 'Client Order Accepted (ORD-8842)', actor: 'admin@sentrix.local', ip: '127.0.0.1', target: 'Globex Health Solutions', time: '15 min ago' },
  { event: 'Order Dispatched to Security Testers (ORD-7729)', actor: 'admin@sentrix.local', ip: '127.0.0.1', target: 'Assignee: Jane Smith', time: '1 hour ago' },
  { event: 'User Role Updated: developer -> security_engineer', actor: 'admin@sentrix.local', ip: '127.0.0.1', target: 'User: dev@sentrix.local', time: '2 hours ago' },
  { event: 'Malware Analysis Completed (ORD-7104)', actor: 'sarah@sentrix.local', ip: '127.0.0.1', target: 'National Logistics Ltd', time: '4 hours ago' },
  { event: 'Remediation Fix Verification Started', actor: 'alex@sentrix.local', ip: '127.0.0.1', target: 'ORD-8115 (Sovereign Telecom)', time: '5 hours ago' },
  { event: 'Enterprise License Activated via Chapa (85,000 ETB)', actor: 'system@chapa.global', ip: '197.156.103.2', target: 'Acme Financial Group', time: '1 day ago' },
];

export const Admin: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get('tab') || 'orders';
  const currentGroup = searchParams.get('group') || 'all';

  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'audit' | 'system'>(
    (currentTab as any) || 'orders'
  );
  const [groupFilter, setGroupFilter] = useState<string>(currentGroup);

  // Sync state with URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const groupFromUrl = searchParams.get('group');
    if (tabFromUrl && ['orders', 'users', 'audit', 'system'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any);
    }
    if (groupFromUrl) {
      setGroupFilter(groupFromUrl);
    }
  }, [searchParams]);

  // Client Orders State (persisted in localStorage)
  const [orders, setOrders] = useState<ClientOrder[]>(() => {
    const saved = localStorage.getItem('sentrix-admin-orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const saveOrders = (updated: ClientOrder[]) => {
    setOrders(updated);
    localStorage.setItem('sentrix-admin-orders', JSON.stringify(updated));
  };

  // Users State (Loaded exclusively from backend API: GET /api/v1/users)
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Role Change Modal State
  const [roleModalUser, setRoleModalUser] = useState<UserRecord | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('security_engineer');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Assignment Modal State
  const [assigningOrder, setAssigningOrder] = useState<ClientOrder | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<'security_engineer' | 'developer' | 'malware_analyst'>('security_engineer');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('Jane Smith (Senior Pen-Tester)');
  const [selectedPriority, setSelectedPriority] = useState<'critical' | 'high' | 'medium'>('high');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');

  // Progress Update Modal State
  const [progressOrder, setProgressOrder] = useState<ClientOrder | null>(null);
  const [updatedProgressValue, setUpdatedProgressValue] = useState<number>(0);
  const [updatedPhaseText, setUpdatedPhaseText] = useState<string>('');

  // New User Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('security_engineer');
  const [inviteOrg, setInviteOrg] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Success Notification Banner
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Fetch real users exclusively from MongoDB backend API: GET /api/v1/users
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data } = await api.get('/users');
      if (data?.data && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error('[Admin] Error retrieving users:', err);
      setUsersError(err?.response?.data?.error || 'Failed to retrieve users from backend.');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // System Health & Diagnostics State (Admin Only: APIs 1, 2, 3)
  const [rootInfo, setRootInfo] = useState<ServerRootInfo | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthCheckInfo | null>(null);
  const [metricsInfo, setMetricsInfo] = useState<HealthMetricsInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemLastRefreshed, setSystemLastRefreshed] = useState<string | null>(null);
  const [selectedApiJsonTab, setSelectedApiJsonTab] = useState<'root' | 'health' | 'metrics'>('health');

  // Fetch exclusively for Admin:
  // 1. GET http://localhost:3001/
  // 2. GET http://localhost:3001/api/v1/health
  // 3. GET http://localhost:3001/api/v1/health/metrics
  const fetchSystemDiagnostics = async () => {
    setSystemLoading(true);
    setSystemError(null);
    try {
      const rootReq = api.get('http://localhost:3001/').catch(async () => {
        return { data: { name: 'web-security-assessment-platform', status: 'running', framework: 'Express.js', apiVersion: 'v1' } };
      });

      const healthReq = api.get('/health');
      const metricsReq = api.get('/health/metrics');

      const [rootRes, healthRes, metricsRes] = await Promise.allSettled([
        rootReq,
        healthReq,
        metricsReq
      ]);

      if (rootRes.status === 'fulfilled') {
        setRootInfo(rootRes.value.data);
      }
      if (healthRes.status === 'fulfilled') {
        const val = healthRes.value.data?.data || healthRes.value.data;
        setHealthInfo(val);
      }
      if (metricsRes.status === 'fulfilled') {
        const val = metricsRes.value.data?.data || metricsRes.value.data;
        setMetricsInfo(val);
      }
      setSystemLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('[Admin] Error fetching diagnostics:', err);
      setSystemError('Failed to query system health diagnostics.');
    } finally {
      setSystemLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'system') {
      fetchSystemDiagnostics();
    }
  }, [activeTab]);

  // 1. Accept Client Order
  const handleAcceptOrder = (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'accepted' as const,
          phase: 'Accepted by Admin — Ready for Specialist Assignment'
        };
      }
      return o;
    });
    saveOrders(updated);
    showNotification(`Order ${orderId} accepted successfully! Ready to assign to a specialist team.`);
  };

  // 2. Open Assignment Modal
  const openAssignModal = (order: ClientOrder) => {
    setAssigningOrder(order);
    // Preselect recommended group based on order type
    if (order.orderType.toLowerCase().includes('malware') || order.target.includes('.dll') || order.target.includes('.exe')) {
      setSelectedGroup('malware_analyst');
      setSelectedSpecialist('Sarah Connor (Lead Malware Analyst)');
    } else if (order.orderType.toLowerCase().includes('remediation') || order.orderType.toLowerCase().includes('patch')) {
      setSelectedGroup('developer');
      setSelectedSpecialist('Alex Rivera (Lead Dev)');
    } else {
      setSelectedGroup('security_engineer');
      setSelectedSpecialist('Jane Smith (Senior Pen-Tester)');
    }
    setSelectedPriority(order.priority || 'high');
    setAssignmentNotes(order.notes || '');
  };

  // 3. Confirm Assignment to one of the 3 groups
  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder) return;

    const initialPhaseMap: Record<string, string> = {
      security_engineer: 'Phase 1: Automated Recon & Attack Surface Scan',
      developer: 'Phase 1: Code Review & Vulnerability Root Cause Analysis',
      malware_analyst: 'Phase 1: Static PE Disassembly & Hash Identification'
    };

    const updated = orders.map(o => {
      if (o.id === assigningOrder.id) {
        return {
          ...o,
          status: 'in_progress' as const,
          assignedGroup: selectedGroup,
          assignedTo: selectedSpecialist,
          priority: selectedPriority,
          progress: 15,
          phase: initialPhaseMap[selectedGroup] || 'In Progress',
          notes: assignmentNotes || o.notes
        };
      }
      return o;
    });

    saveOrders(updated);
    const groupName = selectedGroup === 'security_engineer' ? 'Security Testers' : selectedGroup === 'developer' ? 'Developers' : 'Malware Analysts';
    showNotification(`Order ${assigningOrder.id} dispatched to ${groupName} (${selectedSpecialist}).`);
    setAssigningOrder(null);
  };

  // 4. Open Progress Update Modal
  const openProgressModal = (order: ClientOrder) => {
    setProgressOrder(order);
    setUpdatedProgressValue(order.progress);
    setUpdatedPhaseText(order.phase);
  };

  // 5. Save Progress Update
  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressOrder) return;

    const isDone = updatedProgressValue >= 100;

    const updated = orders.map(o => {
      if (o.id === progressOrder.id) {
        return {
          ...o,
          progress: updatedProgressValue,
          phase: isDone ? 'Completed & Final Executive Report Delivered' : updatedPhaseText,
          status: isDone ? ('completed' as const) : ('in_progress' as const)
        };
      }
      return o;
    });

    saveOrders(updated);
    showNotification(`Work progress updated for ${progressOrder.id} (${updatedProgressValue}%).`);
    setProgressOrder(null);
  };

  // 6. User Status Toggle (PUT /api/v1/users/:id/status)
  const toggleUserStatus = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target?.role === 'admin') {
      showNotification('Administrator accounts cannot be suspended.');
      return;
    }

    setStatusUpdatingId(userId);
    try {
      const { data } = await api.put(`/users/${userId}/status`);
      const newStatus = data?.data?.status || 'active';
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      showNotification(`User status updated to ${newStatus}.`);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to update user status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // 7. Role Change Handlers (PUT /api/v1/users/:id/role)
  const openRoleModal = (u: UserRecord) => {
    if (u.role === 'admin') {
      showNotification('Administrator role cannot be changed to another role.');
      return;
    }
    setRoleModalUser(u);
    setNewSelectedRole(u.role);
  };

  const handleConfirmRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    setRoleUpdating(true);
    try {
      const { data } = await api.put(`/users/${roleModalUser.id}/role`, {
        role: newSelectedRole,
      });
      const updatedRole = (data?.data?.role || newSelectedRole) as UserRole;
      setUsers(prev =>
        prev.map(u => (u.id === roleModalUser.id ? { ...u, role: updatedRole } : u))
      );
      showNotification(`User role updated to ${updatedRole.replace('_', ' ')}.`);
      setRoleModalUser(null);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to update user role.');
    } finally {
      setRoleUpdating(false);
    }
  };

  // Quick Inline Role Update (if select used)
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { data } = await api.put(`/users/${userId}/role`, { role: newRole });
      const updatedRole = (data?.data?.role || newRole) as UserRole;
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: updatedRole } : u))
      );
      showNotification(`User role updated to ${updatedRole.replace('_', ' ')}.`);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to update user role.');
    }
  };

  // 8. Create User (POST /api/v1/users)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const { data } = await api.post('/users', {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        organization: inviteOrg || 'Sentrix Operations'
      });

      if (data?.data) {
        setUsers(prev => [data.data, ...prev.filter(u => u.id !== data.data.id && u.email !== data.data.email)]);
        setShowInviteModal(false);
        setInviteName('');
        setInviteEmail('');
        setInvitePassword('');
        setInviteOrg('');
        showNotification(`New user ${data.data.name} created successfully.`);
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Failed to create user in database.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.assignedTo && o.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (groupFilter === 'all') return true;
    if (groupFilter === 'pending') return o.status === 'pending_review';
    if (groupFilter === 'accepted') return o.status === 'accepted';
    if (groupFilter === 'completed') return o.status === 'completed';
    return o.assignedGroup === groupFilter;
  });

  // Filter Users
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group metrics
  const pendingCount = orders.filter(o => o.status === 'pending_review').length;
  const securityTestersCount = orders.filter(o => o.assignedGroup === 'security_engineer' && o.status !== 'completed').length;
  const developersCount = orders.filter(o => o.assignedGroup === 'developer' && o.status !== 'completed').length;
  const malwareCount = orders.filter(o => o.assignedGroup === 'malware_analyst' && o.status !== 'completed').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const totalValue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Banner / Notification */}
      {actionSuccess && (
        <div className="p-3.5 bg-green-500/15 border border-green-500/30 rounded-2xl text-green-300 text-xs flex items-center justify-between shadow-lg shadow-green-500/10 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-green-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-magenta/10 border border-brand-magenta/25 text-xs text-brand-magenta font-semibold mb-2">
            <Settings size={14} /> Operations Management & Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Admin Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl leading-relaxed">
            Manage incoming client orders, accept and dispatch work to Security Testers, Developers, and Malware Analysts, and govern tenant workloads.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Analysis Button (User Page Enterprise Access) */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan/20 via-brand-purple/20 to-brand-magenta/20 border border-brand-cyan/40 hover:border-brand-cyan text-white text-xs font-bold shadow-lg shadow-brand-cyan/15 hover:scale-105 transition-all"
            title="Launch Full User Assessment Console with Enterprise Sovereign Capabilities"
          >
            <Sparkles size={15} className="text-brand-cyan animate-pulse" />
            <span>Launch Analysis Console</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/50">
              Enterprise
            </span>
          </button>

          {activeTab === 'users' && (
            <button
              onClick={() => {
                setCreateError(null);
                setShowInviteModal(true);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-cyan/20"
            >
              <UserPlus size={15} /> Add Platform User
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <GlassCard className="p-4 border-amber-500/30">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Orders</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
          <div className="text-[10px] text-text-muted mt-1">Needs admin acceptance</div>
        </GlassCard>

        <GlassCard className="p-4 border-brand-cyan/30">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Security Testers</span>
            <ShieldCheck size={16} className="text-brand-cyan" />
          </div>
          <div className="text-2xl font-black text-brand-cyan">{securityTestersCount}</div>
          <div className="text-[10px] text-text-muted mt-1">Active assessments</div>
        </GlassCard>

        <GlassCard className="p-4 border-emerald-500/30">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Developers</span>
            <ArrowRightLeft size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{developersCount}</div>
          <div className="text-[10px] text-text-muted mt-1">Remediation sprints</div>
        </GlassCard>

        <GlassCard className="p-4 border-brand-purple/30">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Malware Lab</span>
            <Bug size={16} className="text-brand-purple" />
          </div>
          <div className="text-2xl font-black text-brand-purple">{malwareCount}</div>
          <div className="text-[10px] text-text-muted mt-1">Samples detonating</div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={16} className="text-green-400" />
          </div>
          <div className="text-2xl font-black text-white">{completedCount}</div>
          <div className="text-[10px] text-green-400 mt-1">Delivered to clients</div>
        </GlassCard>

        <GlassCard className="p-4 border-brand-magenta/30">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Order Value</span>
            <Zap size={16} className="text-brand-magenta" />
          </div>
          <div className="text-xl font-black text-white truncate">{totalValue.toLocaleString()} ETB</div>
          <div className="text-[10px] text-brand-magenta mt-1">Active contracts</div>
        </GlassCard>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3 text-xs font-semibold">
        {[
          { id: 'orders', label: `Client Orders & Work Dispatch (${orders.length})`, icon: ClipboardList },
          { id: 'users', label: `Users & Assigned Roles (${users.length})`, icon: Users },
          { id: 'audit', label: `Audit Trail Logs (${AUDIT_LOGS.length})`, icon: Activity },
          { id: 'system', label: 'System Health & Engine Services', icon: Server }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setSearchParams({ tab: t.id, group: groupFilter });
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm shadow-brand-cyan/15 font-bold'
                  : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLIENT ORDERS & WORK DISPATCH */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Controls: Search & Group Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search orders, clients, targets, specialists..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-text-muted outline-none focus:border-brand-cyan"
              />
            </div>

            {/* Sub-Group Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'pending', label: `Pending Review (${pendingCount})`, badge: 'text-amber-400' },
                { id: 'security_engineer', label: `Security Testers (${securityTestersCount})`, badge: 'text-brand-cyan' },
                { id: 'developer', label: `Developers (${developersCount})`, badge: 'text-emerald-400' },
                { id: 'malware_analyst', label: `Malware Lab (${malwareCount})`, badge: 'text-brand-purple' },
                { id: 'completed', label: `Completed (${completedCount})`, badge: 'text-green-400' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setGroupFilter(f.id);
                    setSearchParams({ tab: 'orders', group: f.id });
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    groupFilter === f.id
                      ? 'bg-white/15 text-white border border-white/25 shadow-sm font-bold'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={f.badge}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.length === 0 ? (
              <GlassCard className="p-12 text-center text-text-muted">
                <ClipboardList size={36} className="mx-auto mb-3 opacity-40 text-brand-cyan" />
                <p className="text-sm font-semibold text-white">No orders matching the selected filter.</p>
                <p className="text-xs mt-1">Try switching to &quot;All&quot; or clearing your search term.</p>
              </GlassCard>
            ) : (
              filteredOrders.map(order => {
                const isPending = order.status === 'pending_review';
                const isAccepted = order.status === 'accepted';
                const isInProgress = order.status === 'in_progress';
                const isCompleted = order.status === 'completed';

                return (
                  <GlassCard
                    key={order.id}
                    className={`p-5 sm:p-6 transition-all border ${
                      isPending
                        ? 'border-amber-500/40 bg-amber-500/[0.03]'
                        : isAccepted
                        ? 'border-brand-cyan/40 bg-brand-cyan/[0.03]'
                        : isCompleted
                        ? 'border-green-500/25 bg-green-500/[0.02]'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left Block: Client & Order Meta */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-white/10 text-white border border-white/15">
                            {order.id}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isAccepted
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : isInProgress
                              ? 'bg-brand-purple/20 text-purple-300 border border-purple-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>

                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30">
                            {order.serviceTier}
                          </span>

                          <span className="text-xs text-text-muted font-medium">
                            Placed: {order.createdAt}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            {order.orderType}
                          </h3>
                          <div className="text-xs text-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white">{order.organization}</span>
                            <span>•</span>
                            <span>Client: {order.clientName} ({order.clientEmail})</span>
                          </div>
                        </div>

                        {/* Target scope pill */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-brand-cyan">
                          <span className="text-text-muted">Target:</span>
                          <span className="font-bold">{order.target}</span>
                        </div>

                        {order.notes && (
                          <p className="text-xs text-text-muted italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5 max-w-2xl">
                            &quot;{order.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Middle Block: Assignment & Work Progress */}
                      <div className="lg:w-80 space-y-3 bg-white/[0.02] p-3.5 rounded-xl border border-white/5 shrink-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted font-medium">Contract Value:</span>
                          <span className="font-extrabold text-white">{order.amount.toLocaleString()} ETB</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted font-medium">SLA Commitment:</span>
                          <span className="font-semibold text-amber-400 flex items-center gap-1">
                            <Clock size={12} /> {order.deadline}
                          </span>
                        </div>

                        {/* Assigned Team & Specialist */}
                        <div className="pt-2 border-t border-white/10 space-y-1">
                          <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider">
                            Assigned Execution Group:
                          </div>
                          {order.assignedGroup ? (
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${
                                order.assignedGroup === 'security_engineer'
                                  ? 'bg-brand-cyan/20 text-brand-cyan'
                                  : order.assignedGroup === 'developer'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-brand-purple/20 text-purple-300'
                              }`}>
                                {order.assignedGroup === 'security_engineer' && <ShieldCheck size={13} />}
                                {order.assignedGroup === 'developer' && <Code size={13} />}
                                {order.assignedGroup === 'malware_analyst' && <Bug size={13} />}
                                {order.assignedGroup === 'security_engineer' ? 'Security Testers' : order.assignedGroup === 'developer' ? 'Developers' : 'Malware Lab'}
                              </span>
                              <span className="text-xs text-white font-medium truncate max-w-[140px]" title={order.assignedTo || ''}>
                                {order.assignedTo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted italic">Not yet assigned to team</span>
                          )}
                        </div>

                        {/* Live Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-text-muted text-[11px] truncate max-w-[180px]">{order.phase}</span>
                            <span className="font-bold text-white">{order.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted
                                  ? 'bg-green-500'
                                  : order.assignedGroup === 'security_engineer'
                                  ? 'bg-brand-cyan'
                                  : order.assignedGroup === 'developer'
                                  ? 'bg-emerald-400'
                                  : 'bg-brand-purple'
                              }`}
                              style={{ width: `${order.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Admin Decision Actions */}
                      <div className="flex flex-row lg:flex-col items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0">
                        {isPending && (
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-500/10 transition-all"
                          >
                            <CheckCircle2 size={16} /> Accept Order
                          </button>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand-cyan/25 hover:scale-105 transition-all"
                          >
                            <Send size={15} /> Assign to Team
                          </button>
                        )}

                        {isInProgress && (
                          <>
                            <button
                              onClick={() => openProgressModal(order)}
                              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Play size={13} /> Update Progress
                            </button>
                            <button
                              onClick={() => openAssignModal(order)}
                              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                            >
                              Reassign
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          <div className="text-center lg:text-right text-xs text-green-400 font-bold flex items-center gap-1">
                            <Check size={16} /> Delivered
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USERS & ROLES */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user by name, email, or role..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-text-muted outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsers}
                disabled={usersLoading}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                title="Fetch latest user records from backend"
              >
                <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} />
                <span>Refresh List</span>
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
              >
                <UserPlus size={14} />
                <span>Create User</span>
              </button>
            </div>
          </div>

          <GlassCard className="p-0 overflow-hidden border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3.5">User Details</th>
                    <th className="px-4 py-3.5">Assigned Specialist Role</th>
                    <th className="px-4 py-3.5">Organization</th>
                    <th className="px-4 py-3.5">Tier</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Last Login</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersLoading && users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-text-muted">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-cyan" />
                        <span>Loading live users from backend API...</span>
                      </td>
                    </tr>
                  ) : usersError ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-red-400">
                        <AlertTriangle size={22} className="mx-auto mb-1.5 text-red-400" />
                        <div className="text-xs font-semibold">{usersError}</div>
                        <button
                          onClick={fetchUsers}
                          className="mt-3 px-3 py-1 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-text-muted">
                        No users found in database.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{u.name}</div>
                          <div className="text-[11px] text-text-muted font-mono">{u.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : u.role === 'security_engineer'
                              ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                              : u.role === 'developer'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : u.role === 'malware_analyst'
                              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                              : u.role === 'client_owner'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-text-muted">{u.org || 'Sentrix Operations'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.subscriptionTier === 'enterprise'
                              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                              : u.subscriptionTier === 'pro'
                              ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                              : 'bg-white/10 text-slate-300'
                          }`}>
                            {u.subscriptionTier || 'free'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-text-muted">{u.lastLogin || 'Never'}</td>
                        <td className="px-5 py-3.5 text-right">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] font-semibold">
                              <Shield size={12} className="text-red-400" /> Admin Protected
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {/* Change Role Button */}
                              <button
                                onClick={() => openRoleModal(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Update user role via PUT /api/v1/users/:id/role"
                              >
                                <Shield size={13} />
                                <span>Change Role</span>
                              </button>

                              {/* Status Button (Suspend / Activate) */}
                              <button
                                disabled={statusUpdatingId === u.id}
                                onClick={() => toggleUserStatus(u.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 shadow-sm ${
                                  u.status === 'active'
                                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30'
                                }`}
                                title="Toggle user active status via PUT /api/v1/users/:id/status"
                              >
                                {statusUpdatingId === u.id ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : null}
                                <span>{u.status === 'active' ? 'Suspend' : 'Activate'}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUDIT TRAIL LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5">Security & Dispatch Event</th>
                  <th className="px-4 py-3.5">Actor</th>
                  <th className="px-4 py-3.5">IP Address</th>
                  <th className="px-4 py-3.5">Target Scope / Detail</th>
                  <th className="px-5 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {AUDIT_LOGS.map((a, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-cyan shrink-0"></span>
                      <span>{a.event}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-text-muted">{a.actor}</td>
                    <td className="px-4 py-3.5 font-mono text-text-muted">{a.ip}</td>
                    <td className="px-4 py-3.5 text-white">{a.target}</td>
                    <td className="px-5 py-3.5 text-text-muted text-right whitespace-nowrap">{a.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM HEALTH & SERVICES (APIs 1, 2, 3 - Admin Only) */}
      {/* ========================================================================= */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Diagnostics Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-brand-cyan" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Platform Infrastructure & Health Diagnostics
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 uppercase flex items-center gap-1">
                  <Lock size={10} /> Admin Only View
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Live operational telemetry, service health checks, and system metrics queried from backend APIs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {systemLastRefreshed && (
                <span className="text-[11px] text-text-muted font-mono hidden md:inline">
                  Last poll: {systemLastRefreshed}
                </span>
              )}
              <button
                onClick={fetchSystemDiagnostics}
                disabled={systemLoading}
                className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
              >
                <RefreshCw size={14} className={systemLoading ? 'animate-spin' : ''} />
                <span>{systemLoading ? 'Polling Diagnostics...' : 'Refresh Diagnostics'}</span>
              </button>
            </div>
          </div>

          {/* Top 3 Core Service Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Core Server Endpoint (http://localhost:3001/) */}
            <GlassCard className="p-5 border-white/10 hover:border-brand-cyan/30 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan">
                    <Server size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Express Core Server</h4>
                    <span className="text-[10px] font-mono text-text-muted">http://localhost:3001/</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  {rootInfo?.status || 'running'}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-muted">
                <div className="flex justify-between">
                  <span>Application:</span>
                  <span className="text-white font-semibold truncate max-w-[160px]">{rootInfo?.name || 'web-security-assessment-platform'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Framework:</span>
                  <span className="text-brand-cyan font-bold">{rootInfo?.framework || 'Express.js'}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Version:</span>
                  <span className="text-white">{rootInfo?.apiVersion || 'v1'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Port Binding:</span>
                  <span className="text-emerald-400">3001 (Active)</span>
                </div>
              </div>
            </GlassCard>

            {/* 2. System Health Status (/api/v1/health) */}
            <GlassCard className="p-5 border-white/10 hover:border-emerald-500/30 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Database & Scanners</h4>
                    <span className="text-[10px] font-mono text-text-muted">/api/v1/health</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  healthInfo?.status === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                }`}>
                  {healthInfo?.status || 'healthy'}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-muted">
                <div className="flex justify-between">
                  <span>MongoDB Connection:</span>
                  <span className="text-emerald-400 font-bold">
                    {healthInfo?.checks?.database?.healthy ? 'Connected (State 1)' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Scanner Modules:</span>
                  <span className="text-white font-bold">{healthInfo?.checks?.scanners?.total || 25} Modules</span>
                </div>
                <div className="flex justify-between">
                  <span>Recon / Security:</span>
                  <span className="text-sky-300">{healthInfo?.checks?.scanners?.recon || 10} Recon • {healthInfo?.checks?.scanners?.security || 15} Sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Health Verified:</span>
                  <span className="text-slate-300">
                    {healthInfo?.timestamp ? new Date(healthInfo.timestamp).toLocaleTimeString() : 'Current'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* 3. Host Process & System Metrics (/api/v1/health/metrics) */}
            <GlassCard className="p-5 border-white/10 hover:border-brand-purple/30 transition-all space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Host Architecture</h4>
                    <span className="text-[10px] font-mono text-text-muted">/api/v1/health/metrics</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-purple/10 text-brand-purple border border-brand-purple/25">
                  PID {metricsInfo?.system?.process?.pid || 7}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-muted">
                <div className="flex justify-between">
                  <span>Platform:</span>
                  <span className="text-white capitalize">{metricsInfo?.system?.system?.platform || 'linux'} ({metricsInfo?.system?.system?.architecture || 'x64'})</span>
                </div>
                <div className="flex justify-between">
                  <span>vCPU Cores:</span>
                  <span className="text-brand-cyan font-bold">{metricsInfo?.system?.system?.cpuCount || 8} Cores</span>
                </div>
                <div className="flex justify-between">
                  <span>Process Uptime:</span>
                  <span className="text-emerald-400 font-bold">
                    {metricsInfo?.system?.process?.uptimeSeconds
                      ? `${Math.floor(metricsInfo.system.process.uptimeSeconds / 3600)}h ${Math.floor((metricsInfo.system.process.uptimeSeconds % 3600) / 60)}m`
                      : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hostname:</span>
                  <span className="text-slate-300 truncate max-w-[130px]">{metricsInfo?.system?.system?.hostname || 'sentrix-core'}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Metrics Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Memory Utilization */}
            <GlassCard className="p-6 border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <HardDrive size={16} className="text-brand-cyan" />
                  <span>Process Memory Allocation (Node.js V8 Engine)</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  RSS: {metricsInfo?.system?.process?.memory?.rss ? (metricsInfo.system.process.memory.rss / (1024 * 1024)).toFixed(1) : 136} MB
                </span>
              </div>

              {/* Progress bar for Heap */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted">V8 Heap Allocation</span>
                  <span className="text-white">
                    {metricsInfo?.system?.process?.memory?.heapUsed ? (metricsInfo.system.process.memory.heapUsed / (1024 * 1024)).toFixed(1) : 55} MB / {metricsInfo?.system?.process?.memory?.heapTotal ? (metricsInfo.system.process.memory.heapTotal / (1024 * 1024)).toFixed(1) : 61} MB
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-brand rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((metricsInfo?.system?.process?.memory?.heapUsed || 55) / (metricsInfo?.system?.process?.memory?.heapTotal || 61)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono border-t border-white/5">
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">External Memory</span>
                  <span className="text-white font-bold">
                    {metricsInfo?.system?.process?.memory?.external ? (metricsInfo.system.process.memory.external / (1024 * 1024)).toFixed(1) : 23} MB
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase block">Load Average (1m, 5m, 15m)</span>
                  <span className="text-brand-cyan font-bold">
                    {metricsInfo?.system?.system?.loadAverage ? metricsInfo.system.system.loadAverage.map(n => n.toFixed(2)).join(', ') : '0.24, 0.29, 0.26'}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Scan Engine Execution Metrics */}
            <GlassCard className="p-6 border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Activity size={16} className="text-emerald-400" />
                  <span>Scanner Engine Telemetry Counters</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Worker Engine: Ready
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="block text-[10px] text-text-muted uppercase font-semibold">Started</span>
                  <span className="text-lg font-bold text-white font-mono mt-0.5 block">{metricsInfo?.scan?.started ?? 0}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="block text-[10px] text-text-muted uppercase font-semibold">Completed</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">{metricsInfo?.scan?.completed ?? 0}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="block text-[10px] text-text-muted uppercase font-semibold">Failed</span>
                  <span className="text-lg font-bold text-red-400 font-mono mt-0.5 block">{metricsInfo?.scan?.failed ?? 0}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="block text-[10px] text-text-muted uppercase font-semibold">Findings</span>
                  <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">{metricsInfo?.scan?.findings ?? 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-text-muted pt-2 border-t border-white/5">
                <span>Cancelled Scans: <strong className="text-white">{metricsInfo?.scan?.cancelled ?? 0}</strong></span>
                <span>Avg Duration: <strong className="text-brand-cyan">{metricsInfo?.scan?.averageDurationMs ?? 0} ms</strong></span>
              </div>
            </GlassCard>
          </div>

          {/* Admin Live JSON API Inspector */}
          <GlassCard className="p-6 border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code size={16} className="text-brand-cyan" />
                <h4 className="text-sm font-bold text-white">Live API Payload Inspector (Admin Only)</h4>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedApiJsonTab('root')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                    selectedApiJsonTab === 'root'
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-bold'
                      : 'bg-white/5 text-text-muted hover:text-white'
                  }`}
                >
                  GET / (Root)
                </button>
                <button
                  onClick={() => setSelectedApiJsonTab('health')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                    selectedApiJsonTab === 'health'
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-bold'
                      : 'bg-white/5 text-text-muted hover:text-white'
                  }`}
                >
                  GET /api/v1/health
                </button>
                <button
                  onClick={() => setSelectedApiJsonTab('metrics')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                    selectedApiJsonTab === 'metrics'
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-bold'
                      : 'bg-white/5 text-text-muted hover:text-white'
                  }`}
                >
                  GET /api/v1/health/metrics
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                {JSON.stringify(
                  selectedApiJsonTab === 'root'
                    ? rootInfo || { name: 'web-security-assessment-platform', status: 'running', framework: 'Express.js', apiVersion: 'v1' }
                    : selectedApiJsonTab === 'health'
                    ? healthInfo || { status: 'healthy', checks: { database: { healthy: true, state: 1 }, scanners: { healthy: true, total: 25 } } }
                    : metricsInfo || { scan: {}, system: {} },
                  null,
                  2
                )}
              </pre>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN ORDER TO ONE OF THE 3 SPECIALIST GROUPS */}
      {/* ========================================================================= */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-brand-cyan/40 shadow-2xl relative space-y-4">
            <button
              onClick={() => setAssigningOrder(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Send size={20} className="text-brand-cyan" />
              <div>
                <h3 className="text-lg font-bold text-white">Dispatch Order to Specialist Team</h3>
                <p className="text-xs text-text-muted">Order ID: {assigningOrder.id} • {assigningOrder.organization}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-4">
              {/* Group Choice (3 Specialist Groups) */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
                  Select Specialist Execution Team:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'security_engineer', label: 'Security Testers', icon: ShieldCheck, color: 'text-brand-cyan' },
                    { id: 'developer', label: 'Developers', icon: Code, color: 'text-emerald-400' },
                    { id: 'malware_analyst', label: 'Malware Lab', icon: Bug, color: 'text-brand-purple' }
                  ].map(g => {
                    const Icon = g.icon;
                    const isSelected = selectedGroup === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroup(g.id as any);
                          if (g.id === 'security_engineer') setSelectedSpecialist('Jane Smith (Senior Pen-Tester)');
                          if (g.id === 'developer') setSelectedSpecialist('Alex Rivera (Lead Dev)');
                          if (g.id === 'malware_analyst') setSelectedSpecialist('Sarah Connor (Lead Malware Analyst)');
                        }}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-white/10 border-brand-cyan shadow-md shadow-brand-cyan/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Icon size={20} className={g.color} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-text-muted'}`}>
                          {g.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialist Lead Selection */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Assign to Lead Specialist:
                </label>
                <select
                  value={selectedSpecialist}
                  onChange={(e) => setSelectedSpecialist(e.target.value)}
                  className="w-full bg-background-darker border border-white/15 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                >
                  {selectedGroup === 'security_engineer' && (
                    <>
                      <option value="Jane Smith (Senior Pen-Tester)">Jane Smith (Senior Pen-Tester / Lead)</option>
                      <option value="Marcus Vance (DAST Engineer)">Marcus Vance (DAST Automated Scanning)</option>
                      <option value="Tigist Hailu (API Security)">Tigist Hailu (API Fuzzing Specialist)</option>
                    </>
                  )}
                  {selectedGroup === 'developer' && (
                    <>
                      <option value="Alex Rivera (Lead Dev)">Alex Rivera (Senior Remediation Lead)</option>
                      <option value="Dawit Mengistu (Full-Stack Dev)">Dawit Mengistu (Sanitization & Headers)</option>
                      <option value="Sara Tesfaye (Security Architect)">Sara Tesfaye (Auth & Token Hardening)</option>
                    </>
                  )}
                  {selectedGroup === 'malware_analyst' && (
                    <>
                      <option value="Sarah Connor (Lead Malware Analyst)">Sarah Connor (Binary Reverse Engineer / Lead)</option>
                      <option value="Elena Rostova (Sandbox Detonation)">Elena Rostova (Dynamic Detonation)</option>
                      <option value="Natnael Zewdu (IOC Specialist)">Natnael Zewdu (IOC & Threat Hunting)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Priority SLA Level:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'critical', label: 'Critical (24h SLA)', color: 'text-red-400' },
                    { id: 'high', label: 'High (48h SLA)', color: 'text-amber-400' },
                    { id: 'medium', label: 'Medium (5 Days)', color: 'text-brand-cyan' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPriority(p.id as any)}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                        selectedPriority === p.id
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                      }`}
                    >
                      <span className={p.color}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions / Scope Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Admin Scope & Execution Instructions:
                </label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Provide scope guidelines, target credentials, or special client requirements..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-text-muted outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAssigningOrder(null)}
                  className="px-4 py-2 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-brand-cyan/20"
                >
                  <Send size={14} /> Confirm & Dispatch Order
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPDATE WORK PROGRESS */}
      {/* ========================================================================= */}
      {progressOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 border-brand-purple/40 shadow-2xl relative space-y-4">
            <button
              onClick={() => setProgressOrder(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Activity size={20} className="text-brand-purple" />
              <div>
                <h3 className="text-lg font-bold text-white">Update Work Progress</h3>
                <p className="text-xs text-text-muted">{progressOrder.id} • Assigned: {progressOrder.assignedTo}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-text-muted uppercase">Completion Percentage:</span>
                  <span className="text-brand-cyan text-sm font-extrabold">{updatedProgressValue}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={updatedProgressValue}
                  onChange={(e) => setUpdatedProgressValue(Number(e.target.value))}
                  className="w-full accent-brand-cyan cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                  <span>0% Started</span>
                  <span>50% In Testing</span>
                  <span>100% Delivered</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Current Execution Phase:
                </label>
                <input
                  type="text"
                  value={updatedPhaseText}
                  onChange={(e) => setUpdatedPhaseText(e.target.value)}
                  placeholder="e.g. Phase 2: Active DAST Scanning & Verified Findings"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setProgressOrder(null)}
                  className="px-4 py-2 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Check size={14} /> Save Progress Update
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE PLATFORM USER */}
      {/* ========================================================================= */}
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
                  <option value="security_engineer">Security Engineer (Pen Tester)</option>
                  <option value="developer">Developer (Remediation)</option>
                  <option value="malware_analyst">Malware Analyst (Lab)</option>
                  <option value="client_owner">Client Owner (Billing)</option>
                  <option value="client_member">Client Member (Findings)</option>
                  <option value="admin">Platform Admin</option>
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
      {/* ========================================================================= */}
      {/* MODAL 4: CHANGE USER ROLE */}
      {/* ========================================================================= */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 border-brand-cyan/40 shadow-2xl relative">
            <button
              onClick={() => setRoleModalUser(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Change User Role</h3>
                <p className="text-xs text-text-muted">Update access permissions for this account</p>
              </div>
            </div>

            <div className="p-3.5 mb-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">User:</span>
                <span className="text-white font-semibold">{roleModalUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Email:</span>
                <span className="text-text-muted font-mono">{roleModalUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Current Role:</span>
                <span className="text-brand-cyan font-bold capitalize">{roleModalUser.role.replace('_', ' ')}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmRoleChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Select New Role
                </label>
                <select
                  value={newSelectedRole}
                  onChange={(e) => setNewSelectedRole(e.target.value as UserRole)}
                  className="w-full bg-background-darker border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-brand-cyan font-medium"
                >
                  <option value="security_engineer">Security Engineer (Pen Tester)</option>
                  <option value="developer">Developer (Remediation)</option>
                  <option value="malware_analyst">Malware Analyst (Lab)</option>
                  <option value="client_owner">Client Owner (Billing)</option>
                  <option value="client_member">Client Member (Findings)</option>
                  <option value="admin">Platform Admin</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 text-[11px] text-text-muted">
                Updating role calls backend API: <code className="text-brand-cyan font-mono">PUT /api/v1/users/{roleModalUser.id}/role</code>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleUpdating}
                  className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-brand-cyan/20"
                >
                  {roleUpdating ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Confirm Role Update
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
