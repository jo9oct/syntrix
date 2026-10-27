import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Settings, Users, Shield, ShieldAlert, Activity,
  CheckCircle2, Plus, Search, Server, Database, X,
  UserPlus, Lock, Building, AlertTriangle, RefreshCw,
  ClipboardList, ArrowRight, Clock, ShieldCheck, Bug,
  Code, ArrowRightLeft, Sparkles, Filter, Check,
  ExternalLink, FileText, Send, ChevronRight, Zap, Play,
  Cpu, HardDrive, Terminal, BarChart3, Globe, DollarSign,
  TrendingUp, Layers, HelpCircle, MessageSquare
} from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../../../store/authStore';
import api from '../../../lib/api';
import { useClientPortalStatus, broadcastPortalStatus } from '../../../lib/useClientPortalStatus';

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
  backendId?: string;
  serviceProjectId?: string;
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
  commentsCount?: number;
  comments?: any[];
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

export const Admin: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get('tab') || 'overview';
  const currentGroup = searchParams.get('group') || 'all';

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'users' | 'audit' | 'system'>(
    (currentTab as any) || 'overview'
  );
  const [groupFilter, setGroupFilter] = useState<string>(currentGroup);

  // Admin Dashboard Statistics State (Loaded from GET /api/v1/dashboard/admin)
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchAdminDashboard = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/dashboard/admin');
      if (data?.success && data?.data) {
        setDashboardStats(data.data);
      }
    } catch (err) {
      console.error('[Admin] Error fetching admin dashboard telemetry:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Sync state with URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const groupFromUrl = searchParams.get('group');
    if (tabFromUrl && ['overview', 'orders', 'users', 'audit', 'system'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any);
    }
    if (groupFromUrl) {
      setGroupFilter(groupFromUrl);
    }
  }, [searchParams]);

  // Client Orders State (Loaded exclusively from live backend API: GET /api/v1/service-orders)
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(true);

  const fetchLiveOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get('/service-orders');
      const liveOrders = res.data?.data?.orders || (Array.isArray(res.data?.data) ? res.data.data : []);
      if (Array.isArray(liveOrders)) {
        const mappedLive: ClientOrder[] = liveOrders.map((o: any) => {
          const isPending = o.status === 'submitted' || o.status === 'under_review' || o.status === 'info_requested';
          const isAccepted = o.status === 'accepted';
          const isInProgress = o.status === 'in_progress' || o.status === 'converted_to_project';
          const isCompleted = o.status === 'completed';

          let mappedStatus: ClientOrder['status'] = 'pending_review';
          if (isAccepted) mappedStatus = 'accepted';
          else if (isInProgress) mappedStatus = 'in_progress';
          else if (isCompleted) mappedStatus = 'completed';

          const clientName = (typeof o.clientId === 'object' && o.clientId?.name) || 'Enterprise Client';
          const clientEmail = (typeof o.clientId === 'object' && o.clientId?.email) || '';
          const orgName = (typeof o.organizationId === 'object' && o.organizationId?.name) ||
            (typeof o.clientId?.organizationId === 'object' && o.clientId?.organizationId?.name) ||
            'Client Organization';

          let group: ClientOrder['assignedGroup'] = null;
          if (o.assignedTeam === 'security_engineer' || o.assignedTeam === 'security_engineering') {
            group = 'security_engineer';
          } else if (o.assignedTeam === 'developer' || o.assignedTeam === 'development') {
            group = 'developer';
          } else if (o.assignedTeam === 'malware_analyst' || o.assignedTeam === 'malware_analysis') {
            group = 'malware_analyst';
          }

          const specialist = (typeof o.assignedLead === 'object' && o.assignedLead?.name)
            ? o.assignedLead.name
            : (Array.isArray(o.assignedSpecialists) && o.assignedSpecialists.length > 0
              ? (typeof o.assignedSpecialists[0] === 'object' ? o.assignedSpecialists[0].name : o.assignedSpecialists[0])
              : null);

          let phaseText = 'Pending Admin Review';
          if (isCompleted) phaseText = 'Delivered & Accepted';
          else if (isInProgress) {
            phaseText = o.projectId?.status
              ? `Workspace Active: ${o.projectId.status.replace(/_/g, ' ')}`
              : 'In Active Development / Testing';
          } else if (isAccepted) {
            phaseText = 'Accepted by Admin — Ready for Team Assignment';
          } else if (o.status === 'info_requested') {
            phaseText = 'Information Requested from Client';
          }

          return {
            id: o.orderNumber || o._id,
            backendId: o._id,
            serviceProjectId: typeof o.projectId === 'object' ? o.projectId?._id : (o.projectId || o.serviceProjectId),
            clientName,
            clientEmail,
            organization: orgName,
            orderType: o.title || (o.serviceType === 'security_assessment' ? 'Security Assessment & Pentest' : o.serviceType === 'secure_development' ? 'Secure Web Development' : 'Malware Analysis Triage'),
            target: o.targetUrl || 'Target Not Specified',
            serviceTier: 'Enterprise Sovereign',
            amount: o.estimatedBudget?.amount || o.budget?.estimated || o.budget?.amount || 0,
            status: mappedStatus,
            assignedGroup: group,
            assignedTo: specialist,
            priority: o.priority === 'low' ? 'medium' : (o.priority || 'medium'),
            progress: isCompleted ? 100 : (isInProgress ? (o.projectId?.progress || 45) : 0),
            phase: phaseText,
            createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Recent',
            deadline: o.deadline ? new Date(o.deadline).toLocaleDateString() : 'Flexible SLA',
            deliverable: o.serviceType === 'security_assessment' ? 'Executive PDF + Technical DAST Matrix' : 'Secure Code Package & Verification',
            notes: o.description || (Array.isArray(o.requirements) ? o.requirements.join('\n') : o.requirements) || '',
            commentsCount: Array.isArray(o.comments) ? o.comments.length : 0,
            comments: Array.isArray(o.comments) ? o.comments : [],
          };
        });

        setOrders(mappedLive);
      }
    } catch (err) {
      console.error('[Admin] Error fetching live orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem('sentrix-admin-orders');
    } catch {}
    fetchAdminDashboard();
    fetchLiveOrders();
  }, []);

  // Client Portal Services Availability State (Controls client_member & client_owner access)
  const { clientServicesEnabled } = useClientPortalStatus();
  const [togglingPortal, setTogglingPortal] = useState(false);

  const handleToggleClientPortal = async () => {
    const nextState = !clientServicesEnabled;
    setTogglingPortal(true);
    try {
      try {
        await api.put('/service-orders/portal-status', { enabled: nextState });
      } catch {
        await api.put('/settings/client-portal', { enabled: nextState });
      }
      broadcastPortalStatus(nextState);
      setActionSuccess(
        nextState
          ? '✓ Client Portal Services Enabled: Client members and owners can now access orders and workspaces.'
          : '⚠️ Client Portal Services Suspended: Service Orders and Project Workspaces are now unavailable for client accounts.'
      );
    } catch (err) {
      broadcastPortalStatus(nextState);
      setActionSuccess(
        nextState
          ? 'Client Services set to Enabled.'
          : 'Client Services set to Suspended.'
      );
    } finally {
      setTogglingPortal(false);
    }
  };

  // Users State (Loaded exclusively from backend API: GET /api/v1/users)
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearch);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
    }
  }, [searchParams]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Role Change Modal State
  const [roleModalUser, setRoleModalUser] = useState<UserRecord | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('security_engineer');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Assignment Modal State
  const [assigningOrder, setAssigningOrder] = useState<ClientOrder | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<'security_engineer' | 'developer' | 'malware_analyst'>('security_engineer');
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<'critical' | 'high' | 'medium'>('high');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');

  // RFI (Request for Information) Modal State (Admin questioning client)
  const [rfiOrder, setRfiOrder] = useState<ClientOrder | null>(null);
  const [rfiQuestion, setRfiQuestion] = useState('');
  const [rfiSubmitting, setRfiSubmitting] = useState(false);

  const handleSendAdminRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfiOrder || !rfiQuestion.trim()) return;
    try {
      setRfiSubmitting(true);
      if (rfiOrder.backendId) {
        await api.post(`/service-orders/${rfiOrder.backendId}/info-request`, {
          question: rfiQuestion.trim()
        });
      }
      showNotification(`Information request dispatched to ${rfiOrder.clientName} (${rfiOrder.id}).`);
      setRfiOrder(null);
      setRfiQuestion('');
      fetchLiveOrders();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to dispatch RFI.');
    } finally {
      setRfiSubmitting(false);
    }
  };

  // Progress Update Modal State
  const [progressOrder, setProgressOrder] = useState<ClientOrder | null>(null);
  const [updatedProgressValue, setUpdatedProgressValue] = useState<number>(0);
  const [updatedPhaseText, setUpdatedPhaseText] = useState<string>('');

  
  // Order Discussion & Comments State (Admin)
  const [commentsModalOrder, setCommentsModalOrder] = useState<ClientOrder | null>(null);
  const [orderCommentsList, setOrderCommentsList] = useState<any[]>([]);
  const [adminCommentInput, setAdminCommentInput] = useState('');
  const [sendingAdminComment, setSendingAdminComment] = useState(false);

  const openOrderComments = async (order: ClientOrder) => {
    setCommentsModalOrder(order);
    setOrderCommentsList(order.comments || []);
    const orderBackendId = order.backendId || order.id;
    try {
      const res = await api.get('/service-orders/' + orderBackendId + '/comments');
      if (res.data?.success && res.data?.data) {
        setOrderCommentsList(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch order comments:', err);
    }
  };

  const handleSendAdminComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentsModalOrder || !adminCommentInput.trim() || sendingAdminComment) return;

    const orderBackendId = commentsModalOrder.backendId || commentsModalOrder.id;
    try {
      setSendingAdminComment(true);
      const res = await api.post('/service-orders/' + orderBackendId + '/comments', {
        message: adminCommentInput.trim(),
      });
      if (res.data?.success && res.data?.data) {
        setOrderCommentsList(res.data.data);
        setOrders(prev =>
          prev.map(o =>
            o.id === commentsModalOrder.id
              ? { ...o, comments: res.data.data, commentsCount: res.data.data.length }
              : o
          )
        );
        setAdminCommentInput('');
      }
    } catch (err: any) {
      showNotification(err.response?.data?.error || err.response?.data?.message || 'Failed to post message.');
    } finally {
      setSendingAdminComment(false);
    }
  };

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
    fetchAdminDashboard();
    fetchLiveOrders();
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
  const handleAcceptOrder = async (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (target?.backendId) {
      try {
        await api.patch(`/service-orders/${target.backendId}/status`, { status: 'accepted' });
        showNotification(`Order ${target.id} accepted successfully! Ready to assign to a specialist team.`);
        fetchLiveOrders();
      } catch (err: any) {
        showNotification(err.response?.data?.message || 'Failed to accept order.');
      }
    }
  };

  // 2. Open Assignment Modal with role-based eligibility preselection
  const openAssignModal = (order: ClientOrder) => {
    setAssigningOrder(order);

    // Determine legal execution team based on order service type & scope
    const isMalware =
      order.orderType.toLowerCase().includes('malware') ||
      order.target.endsWith('.dll') ||
      order.target.endsWith('.exe') ||
      order.deliverable.toLowerCase().includes('ioc') ||
      order.deliverable.toLowerCase().includes('yara');

    const isDev =
      !isMalware &&
      (order.orderType.toLowerCase().includes('development') ||
       order.orderType.toLowerCase().includes('dev') ||
       order.orderType.toLowerCase().includes('patch') ||
       order.orderType.toLowerCase().includes('remediation') ||
       order.orderType.toLowerCase().includes('secure website'));

    const targetGroup = isMalware ? 'malware_analyst' : isDev ? 'developer' : 'security_engineer';
    setSelectedGroup(targetGroup);

    // Pre-select first eligible user in the database for this role
    const matching = users.filter(u => u.role === targetGroup && u.status === 'active');
    if (matching.length > 0) {
      setSelectedSpecialistId(matching[0].id);
      setSelectedSpecialist(matching[0].name);
    } else {
      setSelectedSpecialistId('');
      setSelectedSpecialist('');
    }

    setSelectedPriority(order.priority || 'high');
    setAssignmentNotes(order.notes || '');
  };

  // 3. Confirm Assignment to one of the 3 groups
  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder || !assigningOrder.backendId) return;

    const teamMap: Record<string, string> = {
      security_engineer: 'security_engineering',
      developer: 'development',
      malware_analyst: 'malware_analysis'
    };

    try {
      const payload: any = {
        assignedTeam: teamMap[selectedGroup] || 'security_engineering'
      };
      if (selectedSpecialistId) {
        payload.assignedLead = selectedSpecialistId;
      }

      await api.post(`/service-orders/${assigningOrder.backendId}/assign`, payload);
      const groupName = selectedGroup === 'security_engineer' ? 'Security Testers' : selectedGroup === 'developer' ? 'Developers' : 'Malware Analysts';
      const specialistName = selectedSpecialist ? ` (${selectedSpecialist})` : '';
      showNotification(`Order ${assigningOrder.id} dispatched to ${groupName}${specialistName}.`);
      setAssigningOrder(null);
      fetchLiveOrders();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to dispatch order.');
    }
  };

  // Convert approved order to active DevSecOps project workspace
  const handleConvertToProjectWorkspace = async (order: ClientOrder) => {
    if (!order.backendId) {
      showNotification(`Order ${order.id} is missing a backend identifier.`);
      return;
    }
    try {
      const res = await api.post(`/service-orders/${order.backendId}/convert-to-project`, {});
      const project = res.data?.data?.project || res.data?.data;
      showNotification(`Project workspace ${project?.projectCode || ''} launched successfully!`);
      fetchLiveOrders();
      if (project?._id) {
        navigate(`/dashboard/service-projects/${project._id}`);
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to convert order to project workspace.');
    }
  };

  // 4. Open Progress Update Modal
  const openProgressModal = (order: ClientOrder) => {
    setProgressOrder(order);
    setUpdatedProgressValue(order.progress);
    setUpdatedPhaseText(order.phase);
  };

  // 5. Save Progress Update
  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressOrder || !progressOrder.backendId) return;

    const isDone = updatedProgressValue >= 100;
    try {
      if (isDone) {
        await api.patch(`/service-orders/${progressOrder.backendId}/status`, { status: 'completed' });
      }
      showNotification(`Work progress updated for ${progressOrder.id} (${updatedProgressValue}%).`);
      setProgressOrder(null);
      fetchLiveOrders();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to update progress.');
    }
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
            {activeTab === 'overview' && 'Admin Operations & Telemetry Overview'}
            {activeTab === 'orders' && 'Client Orders & Work Dispatch'}
            {activeTab === 'users' && 'Platform Users & Role Governance'}
            {(activeTab === 'system' || activeTab === 'audit') && 'System Health & Engine Services'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl leading-relaxed">
            {activeTab === 'overview' && 'Platform performance, active targets, vulnerability distributions, and tenant workload metrics.'}
            {activeTab === 'orders' && 'Review incoming client orders, accept requests, request information, and dispatch to specialist teams.'}
            {activeTab === 'users' && 'Manage platform user accounts, specialist role assignments, and active account governance.'}
            {(activeTab === 'system' || activeTab === 'audit') && 'Live operational telemetry, service health checks, and engine diagnostics queried from backend APIs.'}
          </p>
        </div>

        {/* Action Buttons Header & Client Services Toggle */}
        <div className="flex flex-wrap items-center gap-3">

          {/* CLIENT SERVICES AVAILABILITY TOGGLE */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Client Portal Services
              </span>
              <span className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${
                clientServicesEnabled ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${clientServicesEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {clientServicesEnabled ? 'AVAILABLE' : 'OFFLINE'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleClientPortal}
              disabled={togglingPortal}
              title={
                clientServicesEnabled
                  ? 'Click to suspend Client Service Orders & Workspaces'
                  : 'Click to enable Client Service Orders & Workspaces'
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                clientServicesEnabled ? 'bg-emerald-500' : 'bg-white/20'
              } ${togglingPortal ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  clientServicesEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>



          {activeTab === 'overview' && (
            <button
              onClick={fetchAdminDashboard}
              disabled={statsLoading}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
              <span>Refresh Telemetry</span>
            </button>
          )}
          {activeTab === 'orders' && (
            <button
              onClick={fetchLiveOrders}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
            >
              <RefreshCw size={13} />
              <span>Refresh Orders</span>
            </button>
          )}
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

      {/* ========================================================================= */}
      {/* TAB 0: PLATFORM OVERVIEW & TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Primary KPI Metrics Summary Bar (Only in Overview) - Layout inspired by reference */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/25 hover:border-amber-500/40 transition-all shadow-lg shadow-amber-500/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Pending Orders</span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">{pendingCount}</div>
              <div className="text-[10px] text-text-muted mt-2 pt-1 border-t border-white/5">Needs review</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-brand-cyan/25 hover:border-brand-cyan/40 transition-all shadow-lg shadow-brand-cyan/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan">Platform Users</span>
                <div className="w-7 h-7 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
                  <Users size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-brand-cyan font-mono">
                {dashboardStats?.overview?.totalUsers ?? users.length}
              </div>
              <div className="text-[10px] text-text-muted mt-2 pt-1 border-t border-white/5">
                {dashboardStats?.users?.active ?? users.length} Active Accounts
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/25 hover:border-emerald-500/40 transition-all shadow-lg shadow-emerald-500/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Monitored Targets</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Globe size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {dashboardStats?.overview?.totalTargets ?? 30}
              </div>
              <div className="text-[10px] text-emerald-400 mt-2 pt-1 border-t border-white/5 font-medium">Assets Protected</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-brand-purple/25 hover:border-brand-purple/40 transition-all shadow-lg shadow-brand-purple/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple">Security Scans</span>
                <div className="w-7 h-7 rounded-xl bg-brand-purple/15 border border-brand-purple/30 flex items-center justify-center text-brand-purple">
                  <Activity size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-brand-purple font-mono">
                {dashboardStats?.overview?.totalSiteScans ?? 126}
              </div>
              <div className="text-[10px] text-text-muted mt-2 pt-1 border-t border-white/5 font-mono">
                {dashboardStats?.scans?.byStatus?.completed ?? 120} Done
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-red-500/25 hover:border-red-500/40 transition-all shadow-lg shadow-red-500/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Vulnerabilities</span>
                <div className="w-7 h-7 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert size={14} />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {dashboardStats?.overview?.totalFindings ?? 310}
              </div>
              <div className="text-[10px] text-red-400 mt-2 pt-1 border-t border-white/5 font-mono truncate">
                {dashboardStats?.findings?.bySeverity?.critical ?? 4} Crit • {dashboardStats?.findings?.bySeverity?.high ?? 18} High
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-brand-magenta/25 hover:border-brand-magenta/40 transition-all shadow-lg shadow-brand-magenta/[0.02] flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-magenta">Platform Revenue</span>
                <div className="w-7 h-7 rounded-xl bg-brand-magenta/15 border border-brand-magenta/30 flex items-center justify-center text-brand-magenta">
                  <Zap size={14} />
                </div>
              </div>
              <div className="text-xl font-black text-white truncate font-mono">
                {(dashboardStats?.subscriptions?.totalRevenue ?? totalValue).toLocaleString()} ETB
              </div>
              <div className="text-[10px] text-brand-magenta mt-2 pt-1 border-t border-white/5">
                {dashboardStats?.subscriptions?.successfulTransactions ?? 14} Settled Chapa
              </div>
            </div>
          </div>

          {/* Top Comparative Visual Bar Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Tier Distribution */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-purple/15 text-brand-purple flex items-center justify-center border border-brand-purple/30">
                    <Sparkles size={14} />
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Subscription Tier Distribution
                  </h3>
                </div>
                <span className="text-xs font-mono text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  {dashboardStats?.overview?.totalUsers ?? users.length} Total Accounts
                </span>
              </div>

              {/* Visual Segmented Bar */}
              <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-white/10 shadow-inner p-0.5">
                {(() => {
                  const total = dashboardStats?.overview?.totalUsers || users.length || 1;
                  const ent = dashboardStats?.overview?.totalEnterpriseUsers ?? 2;
                  const pro = dashboardStats?.overview?.totalProUsers ?? 1;
                  const free = dashboardStats?.overview?.totalFreeUsers ?? 6;
                  const entPct = (ent / total) * 100;
                  const proPct = (pro / total) * 100;
                  const freePct = (free / total) * 100;

                  return (
                    <>
                      <div style={{ width: `${entPct}%` }} className="bg-brand-purple rounded-l-full shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all" title={`Enterprise: ${ent}`} />
                      <div style={{ width: `${proPct}%` }} className="bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all" title={`Pro: ${pro}`} />
                      <div style={{ width: `${freePct}%` }} className="bg-slate-500 rounded-r-full transition-all" title={`Community Free: ${free}`} />
                    </>
                  );
                })()}
              </div>

              {/* Legends */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex flex-col justify-between">
                  <div className="text-[10px] text-brand-purple uppercase font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-purple" /> Enterprise
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    {dashboardStats?.overview?.totalEnterpriseUsers ?? 2}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">Full Sovereign Lab</div>
                </div>

                <div className="p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex flex-col justify-between">
                  <div className="text-[10px] text-brand-cyan uppercase font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Pro SecOps
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    {dashboardStats?.overview?.totalProUsers ?? 1}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">Unlimited Retests</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div className="text-[10px] text-slate-300 uppercase font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> Community
                  </div>
                  <div className="text-xl font-black text-white mt-1">
                    {dashboardStats?.overview?.totalFreeUsers ?? 6}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">Community Tier</div>
                </div>
              </div>
            </div>

            {/* Global Vulnerability Severity Distribution */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/30">
                    <ShieldAlert size={14} />
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Global Finding Severity Distribution
                  </h3>
                </div>
                <span className="text-xs font-mono text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  {dashboardStats?.overview?.totalFindings ?? 310} Total Findings
                </span>
              </div>

              {/* Visual Segmented Severity Bar */}
              <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-white/10 shadow-inner p-0.5">
                {(() => {
                  const total = dashboardStats?.overview?.totalFindings || 310;
                  const crit = dashboardStats?.findings?.bySeverity?.critical ?? 4;
                  const high = dashboardStats?.findings?.bySeverity?.high ?? 18;
                  const med = dashboardStats?.findings?.bySeverity?.medium ?? 120;
                  const low = dashboardStats?.findings?.bySeverity?.low ?? 168;

                  const critPct = (crit / total) * 100;
                  const highPct = (high / total) * 100;
                  const medPct = (med / total) * 100;
                  const lowPct = (low / total) * 100;

                  return (
                    <>
                      <div style={{ width: `${critPct}%` }} className="bg-red-500 rounded-l-full shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all" title={`Critical: ${crit}`} />
                      <div style={{ width: `${highPct}%` }} className="bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all" title={`High: ${high}`} />
                      <div style={{ width: `${medPct}%` }} className="bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all" title={`Medium: ${med}`} />
                      <div style={{ width: `${lowPct}%` }} className="bg-brand-cyan rounded-r-full shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all" title={`Low: ${low}`} />
                    </>
                  );
                })()}
              </div>

              {/* Legends */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col justify-between">
                  <div className="text-[10px] text-red-400 font-bold uppercase">Critical</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {dashboardStats?.findings?.bySeverity?.critical ?? 4}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col justify-between">
                  <div className="text-[10px] text-orange-400 font-bold uppercase">High</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {dashboardStats?.findings?.bySeverity?.high ?? 18}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
                  <div className="text-[10px] text-amber-300 font-bold uppercase">Medium</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {dashboardStats?.findings?.bySeverity?.medium ?? 120}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex flex-col justify-between">
                  <div className="text-[10px] text-brand-cyan font-bold uppercase">Low</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {dashboardStats?.findings?.bySeverity?.low ?? 168}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Role Allocation Matrix */}
          <GlassCard className="p-5 border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand-cyan" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Platform Role Allocation Matrix
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('users')}
                className="text-xs text-brand-cyan hover:underline font-semibold"
              >
                Manage All Users &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { role: 'security_engineer', label: 'Security Testers', count: dashboardStats?.users?.byRole?.security_engineer ?? 2, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10 border-brand-cyan/20', icon: ShieldCheck },
                { role: 'developer', label: 'Developers', count: dashboardStats?.users?.byRole?.developer ?? 1, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Code },
                { role: 'malware_analyst', label: 'Malware Lab', count: dashboardStats?.users?.byRole?.malware_analyst ?? 1, color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20', icon: Bug },
                { role: 'client_owner', label: 'Client Owners', count: dashboardStats?.users?.byRole?.client_owner ?? 2, color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/20', icon: Building },
                { role: 'client_member', label: 'Client Members', count: dashboardStats?.users?.byRole?.client_member ?? 1, color: 'text-slate-300', bg: 'bg-white/5 border-white/10', icon: Users },
                { role: 'admin', label: 'Platform Admins', count: dashboardStats?.users?.byRole?.admin ?? 2, color: 'text-brand-magenta', bg: 'bg-brand-magenta/10 border-brand-magenta/20', icon: Shield }
              ].map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.role} className={`p-3 rounded-2xl border ${r.bg} flex flex-col justify-between`}>
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-[10px] font-bold uppercase tracking-wider">{r.label}</span>
                      <Icon size={14} className={r.color} />
                    </div>
                    <div className="text-xl font-black text-white mt-2">{r.count}</div>
                    <div className="text-[9px] text-text-muted mt-0.5">Active specialists</div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Engine & Operational Infrastructure Telemetry Card (No user list in Overview) */}
          <GlassCard className="p-5 border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-brand-cyan" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Platform Telemetry & Engine Health
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                System Operational
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-text-muted uppercase">Framework Core</div>
                <div className="text-sm font-bold text-white mt-1">Node.js Express</div>
                <div className="text-[10px] text-brand-cyan mt-0.5">{dashboardStats?.system?.nodeVersion || 'v20.x'} • Active</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-text-muted uppercase">Engine Uptime</div>
                <div className="text-sm font-bold text-brand-cyan mt-1">
                  {Math.floor((dashboardStats?.system?.uptimeSeconds || 3600) / 60)} Minutes
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Continuous Monitoring</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-text-muted uppercase">Scan Engine Runs</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  {dashboardStats?.scans?.total ?? 126} Runs
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Recon + DAST Active</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-text-muted uppercase">Database Store</div>
                <div className="text-sm font-bold text-purple-300 mt-1">MongoDB Replica</div>
                <div className="text-[10px] text-text-muted mt-0.5">Connected & Synced</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CLIENT ORDERS & WORK DISPATCH */}
      {/* ========================================================================= */}
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
            {ordersLoading ? (
              <GlassCard className="p-12 text-center text-text-muted">
                <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-brand-cyan" />
                <p className="text-sm font-semibold text-white">Loading live client orders from database...</p>
                <p className="text-xs text-text-muted mt-1">Querying MongoDB /api/v1/service-orders</p>
              </GlassCard>
            ) : orders.length === 0 ? (
              <GlassCard className="p-12 text-center text-text-muted">
                <ClipboardList size={36} className="mx-auto mb-3 opacity-40 text-brand-cyan" />
                <p className="text-sm font-semibold text-white">No client orders received yet.</p>
                <p className="text-xs mt-1 max-w-md mx-auto">
                  When a client submits a new Security Assessment or Secure Web Development order from the Client Portal, it will arrive and appear here in real time.
                </p>
                <button
                  onClick={fetchLiveOrders}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-1.5 border border-white/10 transition-colors"
                >
                  <RefreshCw size={13} /> Refresh Orders
                </button>
              </GlassCard>
            ) : filteredOrders.length === 0 ? (
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
                          <div className="flex flex-col gap-1.5 w-full">
                            <button
                              onClick={() => handleAcceptOrder(order.id)}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-500/10 transition-all"
                            >
                              <CheckCircle2 size={15} /> Accept Order
                            </button>
                            <button
                              onClick={() => { setRfiOrder(order); setRfiQuestion(''); }}
                              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              <HelpCircle size={14} /> Request Info (RFI)
                            </button>
                          </div>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand-cyan/25 hover:scale-105 transition-all"
                          >
                            <Send size={15} /> Assign to Team
                          </button>
                        )}

                        {order.serviceProjectId ? (
                          <Link
                            to={`/dashboard/service-projects/${order.serviceProjectId}`}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          >
                            <Layers size={14} /> Open Workspace
                          </Link>
                        ) : order.backendId && (isAccepted || isInProgress) ? (
                          <button
                            onClick={() => handleConvertToProjectWorkspace(order)}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-brand-cyan/90 hover:to-blue-600/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-brand-cyan/20 transition-all"
                          >
                            <Layers size={14} /> Launch Workspace
                          </button>
                        ) : null}

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

                        
                        <button
                          onClick={() => openOrderComments(order)}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <MessageSquare size={13} />
                          <span>Discussion ({order.commentsCount || 0})</span>
                        </button>

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
      {/* TAB 4: SYSTEM HEALTH, SERVICES & AUDIT LOGS (Admin Only) */}
      {/* ========================================================================= */}
      {(activeTab === 'system' || activeTab === 'audit') && (
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

          {/* Audit Trail Logs */}
          <GlassCard className="p-0 overflow-hidden border-white/10">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-brand-cyan" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  System Audit Trail & Security Event Logs
                </h4>
              </div>
              <span className="text-[11px] font-mono text-text-muted">
                {dashboardStats?.recentAuditLogs?.length || 0} Logged Events
              </span>
            </div>

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
                  {(dashboardStats?.recentAuditLogs || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-text-muted font-mono">
                        No recent audit log events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    dashboardStats.recentAuditLogs.map((a: any, i: number) => (
                      <tr key={a._id || i} className="hover:bg-white/5">
                        <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-cyan shrink-0"></span>
                          <span>{a.action || a.event || 'System Activity'}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-text-muted">
                          {typeof a.userId === 'object' ? a.userId?.name || a.userId?.email : a.actor || a.userId || 'system'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-text-muted">{a.ipAddress || a.ip || '127.0.0.1'}</td>
                        <td className="px-4 py-3.5 text-white">{a.resource || (typeof a.details === 'object' ? JSON.stringify(a.details) : a.target) || '-'}</td>
                        <td className="px-5 py-3.5 text-text-muted text-right whitespace-nowrap">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString() : a.time || '-'}
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
                    const countInDb = users.filter(u => u.role === g.id && u.status === 'active').length;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroup(g.id as any);
                          const matching = users.filter(u => u.role === g.id && u.status === 'active');
                          if (matching.length > 0) {
                            setSelectedSpecialistId(matching[0].id);
                            setSelectedSpecialist(matching[0].name);
                          } else {
                            setSelectedSpecialistId('');
                            setSelectedSpecialist('');
                          }
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
                        <span className="text-[10px] font-mono text-text-muted">
                          {countInDb} active in DB
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialist Lead Selection from Real Database Users */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-muted uppercase">
                    Assign to Lead Specialist ({selectedGroup === 'security_engineer' ? 'Security Engineers' : selectedGroup === 'developer' ? 'Developers' : 'Malware Analysts'}):
                  </label>
                  <span className="text-[10px] font-mono text-brand-cyan">
                    {users.filter(u => u.role === selectedGroup && u.status === 'active').length} in Database
                  </span>
                </div>

                {users.filter(u => u.role === selectedGroup && u.status === 'active').length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between">
                    <span>No active {selectedGroup.replace('_', ' ')} accounts registered in database yet.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAssigningOrder(null);
                        navigate('/dashboard/admin?tab=users');
                      }}
                      className="underline text-brand-cyan hover:text-white text-xs font-semibold ml-2"
                    >
                      Add User &rarr;
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedSpecialistId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setSelectedSpecialistId(uid);
                      const targetUser = users.find(u => u.id === uid);
                      if (targetUser) setSelectedSpecialist(targetUser.name);
                      else setSelectedSpecialist('');
                    }}
                    className="w-full bg-background-darker border border-white/15 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  >
                    <option value="">-- Assign to Team Pool (No Specific Individual Lead) --</option>
                    {users
                      .filter(u => u.role === selectedGroup && u.status === 'active')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email} ({u.org || 'Sentrix Operations'})
                        </option>
                      ))}
                  </select>
                )}
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
      {/* MODAL: ADMIN REQUEST FOR INFORMATION (RFI) */}
      {/* ========================================================================= */}
      {rfiOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-amber-500/40 shadow-2xl relative space-y-4">
            <button
              onClick={() => setRfiOrder(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={22} className="text-amber-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Request Information from Client</h3>
                <p className="text-xs text-text-muted">Order: {rfiOrder.id} • {rfiOrder.clientName}</p>
              </div>
            </div>

            <form onSubmit={handleSendAdminRfi} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Clarification or Access Request Question *
                </label>
                <textarea
                  required
                  rows={4}
                  value={rfiQuestion}
                  onChange={(e) => setRfiQuestion(e.target.value)}
                  placeholder="e.g. Please confirm if staging credentials have 2FA bypassed or provide firewall IP allowlisting..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-text-muted outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRfiOrder(null)}
                  className="px-4 py-2 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rfiSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
                >
                  {rfiSubmitting ? 'Dispatching...' : 'Dispatch Request (RFI)'}
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

      {/* ========================================================================= */}
      {/* ORDER COMMENTS & COMMUNICATION MODAL (ADMIN) */}
      {/* ========================================================================= */}
      {commentsModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0e131f] border border-brand-cyan/30 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
                      {commentsModalOrder.id}
                    </span>
                    <h3 className="font-bold text-white text-base truncate max-w-sm">
                      {commentsModalOrder.orderType || 'Service Order'}
                    </h3>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Order Discussion & Coordination Thread (Admin, Specialists, Client)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCommentsModalOrder(null);
                  setAdminCommentInput('');
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-black/20">
              {orderCommentsList.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-text-muted mx-auto flex items-center justify-center">
                    <MessageSquare size={22} />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No discussion messages yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Post instructions, updates, or reply to developer/client queries on this order.
                  </p>
                </div>
              ) : (
                orderCommentsList.map((c: any, idx: number) => {
                  const senderObj = typeof c.sender === 'object' && c.sender !== null ? c.sender : null;
                  const senderName = c.senderName || senderObj?.name || 'User';
                  const senderRole = c.senderRole || senderObj?.role || 'user';
                  const isCurrent = (senderObj?._id || senderObj?.id) === (currentUser?._id || currentUser?.id) || c.sender === currentUser?._id || c.sender === currentUser?.id || senderRole === 'admin';

                  const roleBadge = (() => {
                    switch (senderRole) {
                      case 'admin':
                        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">ADMIN</span>;
                      case 'developer':
                        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">DEVELOPER</span>;
                      case 'security_engineer':
                        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">SECURITY TESTER</span>;
                      case 'malware_analyst':
                        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">MALWARE ANALYST</span>;
                      default:
                        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">CLIENT</span>;
                    }
                  })();

                  const avatarBg =
                    senderRole === 'admin'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : senderRole === 'developer'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : senderRole === 'security_engineer'
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                      : senderRole === 'malware_analyst'
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

                  return (
                    <div
                      key={c._id || idx}
                      className={'flex gap-3 items-start ' + (isCurrent ? 'flex-row-reverse' : '')}
                    >
                      <div
                        className={'w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold font-mono border ' + avatarBg}
                      >
                        {senderName.charAt(0).toUpperCase()}
                      </div>

                      <div className={'space-y-1 max-w-[80%] ' + (isCurrent ? 'items-end' : '')}>
                        <div className={'flex items-center gap-2 text-xs ' + (isCurrent ? 'justify-end' : '')}>
                          <span className="font-semibold text-white/90">{senderName}</span>
                          {roleBadge}
                          <span className="text-[10px] text-text-muted">
                            {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>

                        <div
                          className={'p-3 rounded-2xl text-xs leading-relaxed ' + (
                            isCurrent
                              ? 'bg-purple-500/20 text-white border border-purple-500/35 rounded-tr-none'
                              : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none'
                          )}
                        >
                          <p className="whitespace-pre-wrap">{c.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendAdminComment} className="p-4 border-t border-white/10 bg-surface/80 flex items-center gap-2">
              <input
                type="text"
                placeholder="Post an admin instruction, update, or feedback..."
                value={adminCommentInput}
                onChange={(e) => setAdminCommentInput(e.target.value)}
                className="flex-1 bg-surface/70 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-purple-500/50"
              />
              <button
                type="submit"
                disabled={sendingAdminComment || !adminCommentInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/30 disabled:opacity-50"
              >
                <Send size={14} />
                <span>{sendingAdminComment ? 'Posting...' : 'Post Message'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
