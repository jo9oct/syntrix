import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Shield, ClipboardList, Layers, ArrowRightLeft,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, ExternalLink,
  RefreshCw, Globe, Calendar, ArrowRight, User, Sparkles, Building2,
  Check, ChevronRight, Terminal, Filter, Search, Play, X,
  LayoutDashboard, MessageSquare, Send, CheckSquare, Bug, RotateCcw
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { ServiceProject, ServicePriority } from '../../../types/serviceManagement';

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

export const SecurityEngineer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const currentTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>(currentTab === 'orders' ? 'orders' : 'overview');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [projects, setProjects] = useState<ServiceProject[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
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

  const fetchSecurityData = async () => {
    try {
      setRefreshing(true);
      const [ordersRes, projectsRes, findingsRes] = await Promise.allSettled([
        api.get('/service-orders'),
        api.get('/service-projects'),
        api.get('/findings'),
      ]);

      const currentUserId = user?.id || (user as any)?._id;

      if (ordersRes.status === 'fulfilled') {
        const rawOrders = ordersRes.value.data?.data?.orders || 
          (Array.isArray(ordersRes.value.data?.data) ? ordersRes.value.data.data : []);
        const secOrders = rawOrders.filter((o: any) =>
          o.assignedTeam === 'security_engineer' ||
          o.assignedTeam === 'security_engineering' ||
          (o.assignedLead && String(o.assignedLead._id || o.assignedLead) === String(currentUserId))
        ).map((o: any) => ({
          ...o,
          commentsCount: Array.isArray(o.comments) ? o.comments.length : 0,
        }));
        setOrders(secOrders);
      }

      if (projectsRes.status === 'fulfilled') {
        const rawProjects = projectsRes.value.data?.data?.projects || 
          (Array.isArray(projectsRes.value.data?.data) ? projectsRes.value.data.data : []);
        const secProjects = rawProjects.filter((p: any) =>
          p.projectType === 'security_assessment' ||
          p.assignedSecurityEngineers?.some((s: any) => String(s._id || s) === String(currentUserId))
        );
        setProjects(secProjects);
      }

      if (findingsRes.status === 'fulfilled') {
        const rawFindings = findingsRes.value.data?.data?.findings || findingsRes.value.data?.data?.items ||
          (Array.isArray(findingsRes.value.data?.data) ? findingsRes.value.data.data : []);
        setFindings(rawFindings);
      }
    } catch (err) {
      console.error('Failed to load security engineer data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  // Security Engineer Accepts Order & Begins Assessment
  const handleAcceptOrder = async (orderId: string, orderNumber: string) => {
    setProcessingOrderId(orderId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.patch(`/service-orders/${orderId}/status`, {
        status: 'in_progress',
      });
      if (res.data?.success) {
        setActionSuccess(`Order ${orderNumber} accepted! Assessment status transitioned to In Progress.`);
        await fetchSecurityData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to accept security order.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Convert Accepted Order to Assessment Workspace
  const handleInitializeProject = async (orderId: string, orderNumber: string) => {
    setProcessingOrderId(orderId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.post(`/service-orders/${orderId}/convert-to-project`);
      if (res.data?.success) {
        const project = res.data.data;
        setActionSuccess(`Order ${orderNumber} converted to active security workspace (${project.projectCode || 'Initialized'})!`);
        await fetchSecurityData();
        if (project._id) {
          navigate(`/dashboard/service-projects/${project._id}`);
        }
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to initialize security assessment workspace.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Open Progress Modal
  const handleOpenProgressModal = (order: AssignedOrder) => {
    setProgressModalOrder(order);
    setProgressValue(order.progress ?? 0);
    setPhaseValue(order.phase || 'Active Security Assessment');
  };

  // Save Progress as Security Specialist
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
        setActionSuccess(`Order ${progressModalOrder.orderNumber} testing progress updated to ${progressValue}%!`);
        setProgressModalOrder(null);
        await fetchSecurityData();
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

  const retestCount = orders.filter(
    o => o.phase && (o.phase.includes('Retest') || o.phase.includes('Fixes Submitted') || o.phase.includes('Testing'))
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
      } else if (orderStatusFilter === 'retest') {
        const isRetest = o.phase && (o.phase.includes('Retest') || o.phase.includes('Fixes Submitted') || o.phase.includes('Testing'));
        if (!isRetest) return false;
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
    const isRetest = order.phase && (order.phase.includes('Fixes Submitted') || order.phase.includes('Re-Testing'));
    if (isRetest) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/35 animate-pulse">Retest Ready (Fixes Submitted)</span>;
    }

    switch (order.status) {
      case 'submitted':
      case 'under_review':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">Assigned by Admin</span>;
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Accepted</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 animate-pulse">In Active Assessment</span>;
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
            <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-lg shadow-brand-cyan/10">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Security Operations
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-semibold">
                  SecOps Testing Workbench
                </span>
              </div>
              <p className="text-text-muted text-sm mt-0.5">
                {activeTab === 'overview'
                  ? 'Penetration testing telemetry, active audit workspaces, vulnerability findings, and scanner tools.'
                  : 'Security assessment requests queue dispatched to you by Administrator.'}
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
                  ? 'bg-brand-cyan text-background-darker shadow-md shadow-brand-cyan/20 font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Security Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-brand-cyan text-background-darker shadow-md shadow-brand-cyan/20 font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <ClipboardList size={14} />
              <span>Assigned Orders ({orders.length})</span>
            </button>
          </div>

          <button
            onClick={fetchSecurityData}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-brand-cyan' : ''} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SECURITY DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-brand-cyan/20 bg-brand-cyan/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Security Audit Workspaces</span>
                <Layers size={18} className="text-brand-cyan" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{activeProjectsCount}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Active Workbenches</span>
                <Link to="/dashboard/service-projects" className="text-brand-cyan hover:underline font-semibold flex items-center gap-0.5">
                  Open Hub <ChevronRight size={11} />
                </Link>
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Orders Pending Review</span>
                <ClipboardList size={18} className="text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{pendingAcceptanceCount}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Awaiting Acceptance</span>
                <button onClick={() => handleTabChange('orders')} className="text-blue-400 hover:underline font-semibold flex items-center gap-0.5">
                  View Orders <ChevronRight size={11} />
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Active Penetration Tests</span>
                <Clock size={18} className="text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{inProgressCount}</div>
              <div className="mt-1 text-[11px] text-text-muted">Active target audits & fuzzing</div>
            </GlassCard>

            <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Retest Queue</span>
                <RotateCcw size={18} className="text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{retestCount > 0 ? `${retestCount} Audits` : 'Zero Backlog'}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-text-muted">{retestCount > 0 ? 'Fixes waiting audit' : 'All verified'}</span>
                <Link to="/dashboard/retest" className="text-amber-400 hover:underline font-semibold flex items-center gap-0.5">
                  Queue <ChevronRight size={11} />
                </Link>
              </div>
            </GlassCard>
          </div>


          {/* Active Security Audit Workspaces Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-brand-cyan" />
                  <span>Active Assessment Workspaces ({projects.length})</span>
                </h3>
                <p className="text-xs text-text-muted">Ongoing security pentest & audit workspaces</p>
              </div>

              <Link
                to="/dashboard/service-projects"
                className="text-xs text-brand-cyan hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All Projects</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {projects.length === 0 ? (
              <GlassCard className="p-8 text-center text-text-muted text-sm space-y-2">
                <Layers size={32} className="mx-auto text-brand-cyan opacity-30" />
                <p className="font-medium text-white">No active security assessment workspaces yet</p>
                <p className="text-xs">
                  When an assigned order is converted to an assessment workspace, it will appear here.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => {
                  const testProgress = (proj as any).securityTestingProgress ?? 0;
                  const devProgress = (proj as any).developmentProgress ?? 100;

                  return (
                    <GlassCard key={proj._id || proj.id} className="p-5 border-white/10 hover:border-brand-cyan/30 transition-all space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
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
                          className="px-3 py-1.5 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/35 text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                        >
                          <span>Open</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>

                      {/* Progress Steppers */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between text-text-muted">
                            <span>Testing Audit:</span>
                            <span className="font-mono font-bold text-brand-cyan">{testProgress}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-cyan rounded-full" style={{ width: `${testProgress}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-text-muted">
                            <span>Dev Status:</span>
                            <span className="font-mono font-bold text-emerald-400">{devProgress}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${devProgress}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                        <span>Target: {proj.targetUrl || 'Audited Host'}</span>
                        <span>Findings Logged: {proj.findings?.length || 0}</span>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Jump to Orders Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-cyan/15 via-blue-500/10 to-purple-500/15 border border-brand-cyan/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan">
                <ClipboardList size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Client Security Assessment Orders Queue</h4>
                <p className="text-xs text-text-muted">
                  You have {orders.length} assigned assessment orders ({pendingAcceptanceCount} awaiting acceptance).
                </p>
              </div>
            </div>

            <button
              onClick={() => handleTabChange('orders')}
              className="px-4 py-2 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-background-darker font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-cyan/20 transition-all shrink-0"
            >
              <span>Manage Assessment Orders</span>
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
                <ClipboardList size={22} className="text-brand-cyan" />
                <span>Assigned Security Orders Queue</span>
              </h2>
              <p className="text-xs text-text-muted">
                Inspect client target URLs, accept incoming pentests, update assessment progress, and collaborate in order discussions.
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
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `All Orders (${orders.length})` },
              { id: 'pending', label: `Awaiting Acceptance (${pendingAcceptanceCount})` },
              { id: 'in_progress', label: `Active Assessment (${inProgressCount})` },
              { id: 'retest', label: `Retest Ready (${retestCount})` },
              { id: 'completed', label: `Completed (${completedCount})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setOrderStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  orderStatusFilter === f.id
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm'
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
              <RefreshCw size={20} className="animate-spin text-brand-cyan" />
              <span>Loading assigned orders from database...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <GlassCard className="p-12 text-center text-text-muted text-sm space-y-2">
              <ClipboardList size={36} className="mx-auto text-brand-cyan opacity-30" />
              <p className="font-medium text-white">No assigned orders matching this filter</p>
              <p className="text-xs">
                When new security assessment orders are dispatched to you by Administrator, they will appear in this queue.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <GlassCard key={order._id} className="p-5 sm:p-6 space-y-4 border-white/10 hover:border-brand-cyan/25 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">
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
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-brand-cyan/90 hover:to-blue-600/90 text-white font-bold transition-all flex items-center gap-2 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                          >
                            <Layers size={14} />
                            <span>Launch Workspace</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleOpenProgressModal(order)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-1.5 shadow-sm hover:border-brand-cyan/30"
                      >
                        <Play size={13} className="text-brand-cyan" />
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
                        <span className="text-brand-cyan">{order.phase || 'Security Assessment In Progress'}</span>
                      </span>
                      <span className="font-bold font-mono text-brand-cyan">{order.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-cyan to-blue-500 rounded-full transition-all duration-300"
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
                        <div className="flex items-center gap-1 text-brand-cyan">
                          <Building2 size={12} /> {order.organizationId.name}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-text-muted uppercase tracking-wider text-[10px] font-semibold">Assessment Scope & Target</span>
                      <div className="text-white font-mono break-all">{order.targetUrl || 'Target Domain / API Scope'}</div>
                      <div className="text-text-muted flex items-center gap-1">
                        <Calendar size={12} />
                        {order.deadline ? `Deadline: ${new Date(order.deadline).toLocaleDateString()}` : 'Standard SLA'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-text-muted uppercase tracking-wider text-[10px] font-semibold">Assigned Specialist</span>
                      <div className="flex items-center gap-1.5 text-white font-medium">
                        <User size={13} className="text-brand-cyan" />
                        <span>{order.assignedLead?.name || (user?.name || 'Security Testing Team')}</span>
                      </div>
                      <div className="text-text-muted capitalize">Team: {order.assignedTeam || 'Security Engineering'}</div>
                    </div>
                  </div>

                  {/* Description & Technical Requirements */}
                  {order.description && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Assessment Objectives</span>
                      <p className="text-xs text-white/90 whitespace-pre-line leading-relaxed">{order.description}</p>
                    </div>
                  )}

                  {order.requirements && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Scope Rules & Testing Parameters</span>
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
          <div className="bg-[#0e131f] border border-brand-cyan/30 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setProgressModalOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-bold">
                  {progressModalOrder.orderNumber}
                </span>
                <span className="text-xs text-text-muted">Security Tester Progress Dispatch</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">Update Security Assessment Progress</h2>
              <p className="text-xs text-text-muted">{progressModalOrder.title}</p>
            </div>

            {/* Slider */}
            <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted font-medium">Completion Percentage</span>
                <span className="font-mono text-xl font-black text-brand-cyan">{progressValue}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full accent-brand-cyan cursor-pointer"
              />

              {/* Quick Percentage Presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { pct: 25, label: 'Recon' },
                  { pct: 50, label: 'DAST' },
                  { pct: 75, label: 'Exploit' },
                  { pct: 100, label: 'Report' }
                ].map(item => (
                  <button
                    key={item.pct}
                    type="button"
                    onClick={() => {
                      setProgressValue(item.pct);
                      if (item.pct === 25) setPhaseValue('Reconnaissance & Attack Surface Mapping');
                      if (item.pct === 50) setPhaseValue('Active Vulnerability Scanning & Automated Fuzzing');
                      if (item.pct === 75) setPhaseValue('Manual Exploitation & PoC Verification');
                      if (item.pct === 100) setPhaseValue('Pentest Completed - Final Report & Remediation Advised');
                    }}
                    className={`py-1 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all border ${
                      progressValue === item.pct
                        ? 'bg-brand-cyan/25 border-brand-cyan/40 text-brand-cyan'
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
                placeholder="e.g. Exploiting Authentication Bypass, DAST fuzzing..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
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
                className="btn-primary text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-brand-cyan/20"
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
          <div className="w-full max-w-2xl bg-[#0e131f] border border-brand-cyan/30 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
                      {showCommentsModal.orderNumber}
                    </span>
                    <h3 className="font-bold text-white text-base truncate max-w-sm">
                      {showCommentsModal.title}
                    </h3>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Order Communication & Collaboration (Security Tester, Client, Admin)
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
                    Post questions, scope clarifications, or testing updates on this order.
                  </p>
                </div>
              ) : (
                commentsList.map((c: any, idx: number) => {
                  const senderObj = typeof c.sender === 'object' && c.sender !== null ? c.sender : null;
                  const senderName = c.senderName || senderObj?.name || 'User';
                  const senderRole = c.senderRole || senderObj?.role || 'user';
                  const isCurrent = senderObj?._id === user?.id || c.sender === user?.id || senderRole === 'security_engineer';

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
                            ? 'bg-brand-cyan/20 text-white border border-brand-cyan/35 rounded-tr-none'
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
                className="flex-1 bg-surface/70 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
              />
              <button
                type="submit"
                disabled={sendingComment || !commentMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-background-darker font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-brand-cyan/20 disabled:opacity-50"
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
