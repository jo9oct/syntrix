import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Code, ClipboardList, Layers, ArrowRightLeft,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, ExternalLink,
  RefreshCw, Globe, Calendar, ArrowRight, User, Sparkles, Building2,
  Check, ChevronRight, Terminal, Filter, Search, Play, X,
  LayoutDashboard, MessageSquare, Send, CheckSquare, Bug, FileCode
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { ServiceProject, ServicePriority, ProjectTask } from '../../../types/serviceManagement';

interface AssignedOrder {
  _id: string;
  orderNumber: string;
  title: string;
  serviceType: string;
  status: string;
  priority: ServicePriority;
  targetUrl?: string;
  description: string;
  requirements?: string;
  deadline?: string;
  clientId?: {
    name?: string;
    email?: string;
    organizationId?: string;
  };
  organizationId?: {
    name?: string;
  };
  assignedLead?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  assignedTeam?: string;
  projectId?: {
    _id?: string;
    projectCode?: string;
    status?: string;
    progress?: number;
  };
  progress?: number;
  phase?: string;
  commentsCount?: number;
  comments?: any[];
  createdAt: string;
}

export const Developer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const currentTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>(currentTab === 'orders' ? 'orders' : 'overview');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [projects, setProjects] = useState<ServiceProject[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Worker Progress Update State
  const [progressModalOrder, setProgressModalOrder] = useState<AssignedOrder | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [phaseValue, setPhaseValue] = useState<string>('');
  const [updatingProgress, setUpdatingProgress] = useState<boolean>(false);

  // Order Discussion Modal State
  const [showCommentsModal, setShowCommentsModal] = useState<AssignedOrder | null>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentMessage, setCommentMessage] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Sync activeTab with URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders') {
      setActiveTab('orders');
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'overview' | 'orders') => {
    setActiveTab(tab);
    setSearchParams(tab === 'orders' ? { tab: 'orders' } : {});
  };

  const fetchDeveloperData = async () => {
    try {
      setRefreshing(true);
      const [ordersRes, projectsRes, tasksRes] = await Promise.allSettled([
        api.get('/service-orders'),
        api.get('/service-projects'),
        api.get('/project-tasks'),
      ]);

      const currentUserId = user?.id || (user as any)?._id;

      if (ordersRes.status === 'fulfilled') {
        const rawOrders = ordersRes.value.data?.data?.orders || 
          (Array.isArray(ordersRes.value.data?.data) ? ordersRes.value.data.data : []);
        // Strictly display tasks assigned to development
        const devOrders = rawOrders.filter((o: any) =>
          o.assignedTeam === 'developer' ||
          o.assignedTeam === 'development' ||
          (o.assignedLead && String(o.assignedLead._id || o.assignedLead) === String(currentUserId))
        ).map((o: any) => ({
          ...o,
          commentsCount: Array.isArray(o.comments) ? o.comments.length : 0,
        }));
        setOrders(devOrders);
      }

      if (projectsRes.status === 'fulfilled') {
        const rawProjects = projectsRes.value.data?.data?.projects || 
          (Array.isArray(projectsRes.value.data?.data) ? projectsRes.value.data.data : []);
        const devProjects = rawProjects.filter((p: any) =>
          p.projectType === 'secure_development' ||
          p.assignedDevelopers?.some((d: any) => String(d._id || d) === String(currentUserId))
        );
        setProjects(devProjects);
      }

      if (tasksRes.status === 'fulfilled') {
        const rawTasks = tasksRes.value.data?.data?.tasks || 
          (Array.isArray(tasksRes.value.data?.data) ? tasksRes.value.data.data : []);
        const devTasks = rawTasks.filter((t: any) =>
          !currentUserId || String(t.assignedTo?._id || t.assignedTo) === String(currentUserId)
        );
        setTasks(devTasks);
      }
    } catch (err) {
      console.error('Failed to load developer data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeveloperData();
  }, []);

  // Developer Accepts Order & Begins Development
  const handleAcceptOrder = async (orderId: string, orderNumber: string) => {
    setProcessingOrderId(orderId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.patch(`/service-orders/${orderId}/status`, {
        status: 'in_progress',
      });
      if (res.data?.success) {
        setActionSuccess(`Order ${orderNumber} accepted! Status transitioned to In Progress.`);
        await fetchDeveloperData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to accept order.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Convert Accepted Order to Project Workspace
  const handleInitializeProject = async (orderId: string, orderNumber: string) => {
    setProcessingOrderId(orderId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.post(`/service-orders/${orderId}/convert-to-project`);
      if (res.data?.success) {
        const project = res.data.data;
        setActionSuccess(`Order ${orderNumber} converted to active project workspace (${project.projectCode || 'Initialized'})!`);
        await fetchDeveloperData();
        if (project._id) {
          navigate(`/dashboard/service-projects/${project._id}`);
        }
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to initialize project workspace.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Open Progress Modal
  const handleOpenProgressModal = (order: AssignedOrder) => {
    setProgressModalOrder(order);
    setProgressValue(order.progress ?? 0);
    setPhaseValue(order.phase || 'Active Development');
  };

  // Save Progress as Worker
  const handleSaveProgress = async () => {
    if (!progressModalOrder) return;
    setUpdatingProgress(true);
    setActionError(null);
    try {
      const res = await api.patch(`/service-orders/${progressModalOrder._id}/status`, {
        progress: progressValue,
        phase: phaseValue.trim(),
        status: progressValue >= 100 ? 'completed' : 'in_progress',
      });
      if (res.data?.success) {
        setActionSuccess(`Order ${progressModalOrder.orderNumber} progress updated to ${progressValue}%!`);
        setProgressModalOrder(null);
        await fetchDeveloperData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to update order progress.');
    } finally {
      setUpdatingProgress(false);
    }
  };

  // Open Order Discussion Modal
  const openOrderComments = async (order: AssignedOrder) => {
    setShowCommentsModal(order);
    setCommentsList(order.comments || []);
    try {
      const res = await api.get(`/service-orders/${order._id}/comments`);
      if (res.data?.success && res.data?.data) {
        setCommentsList(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch comments:', err);
    }
  };

  // Send Comment
  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!showCommentsModal || !commentMessage.trim() || sendingComment) return;
    try {
      setSendingComment(true);
      const res = await api.post(`/service-orders/${showCommentsModal._id}/comments`, {
        message: commentMessage.trim(),
      });
      if (res.data?.success && res.data?.data) {
        setCommentsList(res.data.data);
        setOrders(prev =>
          prev.map(o =>
            o._id === showCommentsModal._id
              ? { ...o, comments: res.data.data, commentsCount: res.data.data.length }
              : o
          )
        );
        setCommentMessage('');
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to post message.');
    } finally {
      setSendingComment(false);
    }
  };

  // Derived counts
  const pendingAcceptanceCount = orders.filter(
    o => o.status === 'submitted' || o.status === 'under_review' || o.status === 'pending_review'
  ).length;

  const inProgressCount = orders.filter(
    o => o.status === 'in_progress' || o.status === 'converted_to_project'
  ).length;

  const fixesCount = orders.filter(
    o => o.status === 'remediation_in_progress' || (o.phase && (o.phase.includes('Fixes') || o.phase.includes('Remediation') || o.phase.includes('Returned')))
  ).length;

  const completedCount = orders.filter(o => o.status === 'completed').length;
  const activeProjectsCount = projects.length;

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Status filter
      if (orderStatusFilter === 'pending') {
        const matches = o.status === 'submitted' || o.status === 'under_review' || o.status === 'pending_review';
        if (!matches) return false;
      } else if (orderStatusFilter === 'in_progress') {
        if (o.status !== 'in_progress' && o.status !== 'converted_to_project') return false;
      } else if (orderStatusFilter === 'fixes') {
        const isFix = o.status === 'remediation_in_progress' || (o.phase && (o.phase.includes('Fixes') || o.phase.includes('Remediation') || o.phase.includes('Returned')));
        if (!isFix) return false;
      } else if (orderStatusFilter === 'completed') {
        if (o.status !== 'completed') return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.title?.toLowerCase().includes(q) ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.targetUrl?.toLowerCase().includes(q) ||
        o.clientId?.name?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
      );
    });
  }, [orders, orderStatusFilter, searchQuery]);

  const getPriorityBadge = (priority: ServicePriority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">Standard</span>;
    }
  };

  const getStatusBadge = (order: AssignedOrder) => {
    const isFixRequired = order.status === 'remediation_in_progress' || (order.phase && (order.phase.includes('Fixes') || order.phase.includes('Remediation') || order.phase.includes('Returned')));
    if (isFixRequired) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/35 animate-pulse">Fixes Required (Returned by Testing)</span>;
    }

    switch (order.status) {
      case 'submitted':
      case 'under_review':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">Assigned by Admin</span>;
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Accepted</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 animate-pulse">In Active Development</span>;
      case 'converted_to_project':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">Project Active</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80">{order.status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header & Dual View Navigation Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-lg shadow-emerald-500/10">
              <Code size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Developer Operations
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  DevSecOps Workbench
                </span>
              </div>
              <p className="text-text-muted text-sm mt-0.5">
                {activeTab === 'overview'
                  ? 'Engineering telemetry, active workspace pipelines, remediation tasks, and tools overview.'
                  : 'Client service requests queue assigned to you by Administrator.'}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Developer Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <ClipboardList size={14} />
              <span>Assigned Orders ({orders.length})</span>
            </button>
          </div>

          <button
            onClick={fetchDeveloperData}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DEVELOPER DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Project Workspaces</span>
                <Layers size={18} className="text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{activeProjectsCount}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Assigned Sprints</span>
                <Link to="/dashboard/service-projects" className="text-purple-400 hover:underline font-semibold flex items-center gap-0.5">
                  Open Hub <ChevronRight size={11} />
                </Link>
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Orders Pending Acceptance</span>
                <ClipboardList size={18} className="text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{pendingAcceptanceCount}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Awaiting your response</span>
                <button onClick={() => handleTabChange('orders')} className="text-emerald-400 hover:underline font-semibold flex items-center gap-0.5">
                  View Orders <ChevronRight size={11} />
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-brand-cyan/20 bg-brand-cyan/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Active In-Development</span>
                <Clock size={18} className="text-brand-cyan" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{inProgressCount}</div>
              <div className="mt-1 text-[11px] text-text-muted">Builds in active implementation</div>
            </GlassCard>

            <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Remediation Velocity</span>
                <ArrowRightLeft size={18} className="text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{fixesCount > 0 ? `${fixesCount} Fixes` : 'Healthy'}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">{fixesCount > 0 ? 'Retest fixes needed' : 'Zero blockers'}</span>
                <Link to="/dashboard/remediation" className="text-amber-400 hover:underline font-semibold flex items-center gap-0.5">
                  Board <ChevronRight size={11} />
                </Link>
              </div>
            </GlassCard>
          </div>


          {/* Active Project Workspaces Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-emerald-400" />
                  <span>Active Sprint Workspaces ({projects.length})</span>
                </h3>
                <p className="text-xs text-text-muted">Ongoing DevSecOps development projects</p>
              </div>

              <Link
                to="/dashboard/service-projects"
                className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All Projects</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {projects.length === 0 ? (
              <GlassCard className="p-8 text-center text-text-muted text-sm space-y-2">
                <Layers size={32} className="mx-auto text-emerald-400 opacity-30" />
                <p className="font-medium text-white">No active development project workspaces yet</p>
                <p className="text-xs">
                  When an assigned order is converted to a workspace, it will appear here with live sprint telemetry.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => {
                  const devProgress = (proj as any).developmentProgress ?? (proj.status === 'in_development' ? proj.progress : 100);
                  const testProgress = (proj as any).securityTestingProgress ?? 0;

                  return (
                    <GlassCard key={proj._id || proj.id} className="p-5 border-white/10 hover:border-emerald-500/30 transition-all space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                              {proj.projectCode}
                            </span>
                            <span className="text-[11px] uppercase font-semibold text-text-muted">
                              {proj.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-base mt-1 truncate max-w-sm">
                            {proj.title}
                          </h4>
                        </div>

                        <Link
                          to={`/dashboard/service-projects/${proj._id || proj.id}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                        >
                          <span>Enter</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>

                      {/* Dual Progress Bars */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between text-text-muted">
                            <span>Dev Progress:</span>
                            <span className="font-mono font-bold text-emerald-400">{devProgress}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${devProgress}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-text-muted">
                            <span>Testing Gate:</span>
                            <span className="font-mono font-bold text-amber-400">{testProgress}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${testProgress}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                        <span>Target: {proj.targetUrl || 'Internal Codebase'}</span>
                        <span>Deliverables: {proj.deliverables?.length || 0}</span>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Developer Assigned Tasks & Remediation Feed */}
          {tasks.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-400" />
                <span>Assigned Tasks & Code Fixes ({tasks.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.slice(0, 6).map((t) => (
                  <GlassCard key={t._id || t.id} className="p-3.5 border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-brand-cyan">{t.taskCode}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        t.priority === 'critical' ? 'text-red-400 bg-red-500/20' : 'text-amber-400 bg-amber-500/20'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span className="capitalize">{t.status.replace(/_/g, ' ')}</span>
                      <span>{t.estimatedHours ? `${t.estimatedHours}h est` : 'Flexible'}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Jump to Orders Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-brand-cyan/10 to-blue-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ClipboardList size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Client Service Orders Queue</h4>
                <p className="text-xs text-text-muted">
                  You have {orders.length} assigned service orders ({pendingAcceptanceCount} awaiting acceptance).
                </p>
              </div>
            </div>

            <button
              onClick={() => handleTabChange('orders')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all shrink-0"
            >
              <span>Manage Assigned Orders</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ASSIGNED ORDERS CONSOLE */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList size={22} className="text-emerald-400" />
                <span>Assigned Development Orders Queue</span>
              </h2>
              <p className="text-xs text-text-muted">
                Inspect client requirements, accept incoming orders, update work progress, and collaborate in order discussions.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search orders, client, target..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `All Orders (${orders.length})` },
              { id: 'pending', label: `Awaiting Acceptance (${pendingAcceptanceCount})` },
              { id: 'in_progress', label: `Active In-Progress (${inProgressCount})` },
              { id: 'fixes', label: `Fixes Required (${fixesCount})` },
              { id: 'completed', label: `Completed (${completedCount})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setOrderStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  orderStatusFilter === f.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 text-text-muted hover:text-white border border-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="py-16 text-center text-text-muted text-sm flex items-center justify-center gap-2">
              <RefreshCw size={20} className="animate-spin text-emerald-400" />
              <span>Loading assigned orders from database...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <GlassCard className="p-12 text-center text-text-muted text-sm space-y-2">
              <ClipboardList size={36} className="mx-auto text-emerald-400 opacity-30" />
              <p className="font-medium text-white">No assigned orders matching this filter</p>
              <p className="text-xs">
                When new client orders are dispatched to you by Administrator, they will appear in this queue.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <GlassCard key={order._id} className="p-5 sm:p-6 space-y-4 border-white/10 hover:border-emerald-500/25 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {order.orderNumber}
                        </span>
                        {getPriorityBadge(order.priority)}
                        {getStatusBadge(order)}
                        <span className="text-xs text-text-muted font-mono">
                          Received {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{order.title}</h3>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.status !== 'converted_to_project' && (
                        <>
                          <button
                            onClick={() => handleAcceptOrder(order._id, order.orderNumber)}
                            disabled={processingOrderId === order._id}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/10 disabled:opacity-50"
                          >
                            {processingOrderId === order._id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>Accept Order</span>
                          </button>

                          <button
                            onClick={() => handleInitializeProject(order._id, order.orderNumber)}
                            disabled={processingOrderId === order._id}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-brand-cyan hover:from-emerald-400 hover:to-brand-cyan/90 text-background-darker font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                          >
                            <Layers size={14} />
                            <span>Launch Workspace</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleOpenProgressModal(order)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-1.5 shadow-sm hover:border-emerald-500/30"
                      >
                        <Play size={13} className="text-emerald-400" />
                        <span>Update Progress</span>
                      </button>

                      <button
                        onClick={() => openOrderComments(order)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <MessageSquare size={13} />
                        <span>Discussion ({order.commentsCount || 0})</span>
                      </button>

                      {order.status === 'converted_to_project' && (
                        <Link
                          to={`/dashboard/service-projects/${order.projectId?._id || order.projectId}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-cyan text-background-darker hover:bg-brand-cyan/90 transition-all flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
                        >
                          <Layers size={14} />
                          <span>Open Workspace</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Worker Progress & Phase Stepper */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-text-muted text-[11px] flex items-center gap-2">
                        <span className="font-semibold text-white">Current Phase:</span>
                        <span className="text-emerald-400">{order.phase || 'Development In Progress'}</span>
                      </span>
                      <span className="font-bold font-mono text-emerald-400">{order.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-brand-cyan rounded-full transition-all duration-300"
                        style={{ width: `${order.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Order Specs & Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-text-muted uppercase tracking-wider text-[10px] font-semibold">Client Details</span>
                      <div className="font-semibold text-white">{order.clientId?.name || 'Client'}</div>
                      <div className="text-text-muted">{order.clientId?.email}</div>
                      {order.organizationId?.name && (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Building2 size={12} /> {order.organizationId.name}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-text-muted uppercase tracking-wider text-[10px] font-semibold">Target & Schedule</span>
                      <div className="text-white font-mono break-all">{order.targetUrl || 'Internal Architecture Scope'}</div>
                      <div className="text-text-muted flex items-center gap-1">
                        <Calendar size={12} />
                        {order.deadline ? `Deadline: ${new Date(order.deadline).toLocaleDateString()}` : 'Standard SLA'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-text-muted uppercase tracking-wider text-[10px] font-semibold">Assigned Specialist</span>
                      <div className="flex items-center gap-1.5 text-white font-medium">
                        <User size={13} className="text-emerald-400" />
                        <span>{order.assignedLead?.name || (user?.name || 'Developer Team')}</span>
                      </div>
                      <div className="text-text-muted capitalize">Team: {order.assignedTeam || 'Development'}</div>
                    </div>
                  </div>

                  {/* Description & Technical Requirements */}
                  {order.description && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Description & Objectives</span>
                      <p className="text-xs text-white/90 whitespace-pre-line leading-relaxed">{order.description}</p>
                    </div>
                  )}

                  {order.requirements && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Technical Requirements & Specifications</span>
                      <p className="text-xs text-text-muted whitespace-pre-line leading-relaxed">{order.requirements}</p>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKER PROGRESS UPDATE MODAL */}
      {progressModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e131f] border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setProgressModalOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {progressModalOrder.orderNumber}
                </span>
                <span className="text-xs text-text-muted">Developer Progress Dispatch</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">Update Development Progress</h2>
              <p className="text-xs text-text-muted">{progressModalOrder.title}</p>
            </div>

            {/* Slider */}
            <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted font-medium">Completion Percentage</span>
                <span className="font-mono text-xl font-black text-emerald-400">{progressValue}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />

              {/* Quick Percentage Presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { pct: 25, label: 'Setup' },
                  { pct: 50, label: 'Coding' },
                  { pct: 75, label: 'Testing' },
                  { pct: 100, label: 'Ready' }
                ].map(item => (
                  <button
                    key={item.pct}
                    type="button"
                    onClick={() => {
                      setProgressValue(item.pct);
                      if (item.pct === 25) setPhaseValue('Scaffolding & Initial Setup');
                      if (item.pct === 50) setPhaseValue('Core Development & Implementation');
                      if (item.pct === 75) setPhaseValue('Security Hardening & Testing');
                      if (item.pct === 100) setPhaseValue('Development Completed - Ready for Verification');
                    }}
                    className={`py-1 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all border ${
                      progressValue === item.pct
                        ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                    }`}
                  >
                    {item.pct}% ({item.label})
                  </button>
                ))}
              </div>
            </div>

            {/* Current Phase Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-medium">Current Phase Label</label>
              <input
                type="text"
                value={phaseValue}
                onChange={(e) => setPhaseValue(e.target.value)}
                placeholder="e.g. Core API Implementation, Unit Testing..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setProgressModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={updatingProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                <Check size={14} />
                <span>{updatingProgress ? 'Saving...' : 'Update & Broadcast Progress'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER COMMENTS & DISCUSSION THREAD MODAL */}
      {showCommentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0e131f] border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      {showCommentsModal.orderNumber}
                    </span>
                    <h3 className="font-bold text-white text-base truncate max-w-sm">
                      {showCommentsModal.title}
                    </h3>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Order Communication & Collaboration (Developer, Client, Admin)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCommentsModal(null);
                  setCommentMessage('');
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-black/20">
              {commentsList.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-text-muted mx-auto flex items-center justify-center">
                    <MessageSquare size={22} />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No discussion messages yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Post questions, status notes, or clarifications on this service order.
                  </p>
                </div>
              ) : (
                commentsList.map((c: any, idx: number) => {
                  const senderObj = typeof c.sender === 'object' && c.sender !== null ? c.sender : null;
                  const senderName = c.senderName || senderObj?.name || 'User';
                  const senderRole = c.senderRole || senderObj?.role || 'user';
                  const isCurrent = senderObj?._id === user?.id || c.sender === user?.id || senderRole === 'developer';

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
                      className={`flex gap-3 items-start ${isCurrent ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold font-mono border ${avatarBg}`}>
                        {senderName.charAt(0).toUpperCase()}
                      </div>

                      <div className={`space-y-1 max-w-[80%] ${isCurrent ? 'items-end' : ''}`}>
                        <div className={`flex items-center gap-2 text-xs ${isCurrent ? 'justify-end' : ''}`}>
                          <span className="font-semibold text-white/90">{senderName}</span>
                          {roleBadge}
                          <span className="text-[10px] text-text-muted">
                            {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isCurrent
                            ? 'bg-emerald-500/20 text-white border border-emerald-500/35 rounded-tr-none'
                            : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{c.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSendComment} className="p-4 border-t border-white/10 bg-surface/80 flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a message to Client or Admin..."
                value={commentMessage}
                onChange={(e) => setCommentMessage(e.target.value)}
                className="flex-1 bg-surface/70 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={sendingComment || !commentMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Send size={14} />
                <span>{sendingComment ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
