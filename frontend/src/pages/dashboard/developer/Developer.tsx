import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Code, ClipboardList, Layers, ArrowRightLeft,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, ExternalLink,
  RefreshCw, Globe, Calendar, ArrowRight, User, Sparkles, Building2,
  Check, ChevronRight, Terminal, Filter, Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  createdAt: string;
}

export const Developer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [projects, setProjects] = useState<ServiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDeveloperData = async () => {
    try {
      setRefreshing(true);
      const [ordersRes, projectsRes] = await Promise.allSettled([
        api.get('/service-orders'),
        api.get('/service-projects'),
      ]);

      if (ordersRes.status === 'fulfilled') {
        const rawOrders = ordersRes.value.data?.data?.orders || 
          (Array.isArray(ordersRes.value.data?.data) ? ordersRes.value.data.data : []);
        setOrders(rawOrders);
      }

      if (projectsRes.status === 'fulfilled') {
        const rawProjects = projectsRes.value.data?.data?.projects || 
          (Array.isArray(projectsRes.value.data?.data) ? projectsRes.value.data.data : []);
        setProjects(rawProjects);
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

  // Derived metrics
  const pendingAcceptanceCount = orders.filter(
    o => o.status === 'submitted' || o.status === 'under_review' || o.status === 'accepted'
  ).length;

  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const activeProjectsCount = projects.length;

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch =
        o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.targetUrl?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.clientId?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && (o.status === 'submitted' || o.status === 'under_review' || o.status === 'accepted')) ||
        (statusFilter === 'in_progress' && o.status === 'in_progress') ||
        (statusFilter === 'converted' && o.status === 'converted_to_project');

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
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
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
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

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
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
                Review assigned client orders, accept incoming development work, initialize workspaces, and deliver secure code.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDeveloperData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
            <span>Refresh</span>
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/35 text-xs font-semibold text-brand-cyan transition-all shadow-sm shadow-brand-cyan/10"
            title="Open Analysis Console for scanning and report tools"
          >
            <Sparkles size={14} />
            <span>Analysis Console</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards (Developer Telemetry) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Orders Awaiting Acceptance</span>
            <ClipboardList size={18} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{pendingAcceptanceCount}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Assigned from Admin</span>
            {pendingAcceptanceCount > 0 && (
              <span className="text-emerald-400 font-semibold font-mono">
                {pendingAcceptanceCount} New Orders
              </span>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-brand-cyan/20 bg-brand-cyan/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Active In-Progress</span>
            <Clock size={18} className="text-brand-cyan" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{inProgressCount}</div>
          <div className="mt-1 text-[11px] text-text-muted">Development builds in active coding</div>
        </GlassCard>

        <GlassCard className="p-4 border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Project Workspaces</span>
            <Layers size={18} className="text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{activeProjectsCount}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Assigned sprint pipelines</span>
            <Link to="/dashboard/service-projects" className="text-purple-400 hover:underline font-semibold">
              Open Workspaces &rarr;
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Code Remediation</span>
            <ArrowRightLeft size={18} className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">Active</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Kanban Remediation Board</span>
            <Link to="/dashboard/remediation" className="text-amber-400 hover:underline font-semibold">
              Open Board &rarr;
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* SECTION 1: ASSIGNED ORDERS FROM ADMIN (ACCEPT & INITIALIZE) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList size={20} className="text-emerald-400" />
              <span>Assigned Service Orders ({orders.length})</span>
            </h2>
            <p className="text-xs text-text-muted">
              Service requests assigned to the developer team by Admin. Review specifications and click Accept Order or Start Project.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-text-muted" />
            <span className="text-xs text-text-muted font-medium">Filter:</span>
            {(['all', 'pending', 'in_progress', 'converted'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search orders by number, title, target URL, client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-12 text-center text-text-muted text-sm flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-emerald-400" />
            <span>Loading assigned orders from database...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <GlassCard className="p-8 text-center text-text-muted text-sm space-y-2">
            <ClipboardList size={32} className="mx-auto text-emerald-400 opacity-30" />
            <p className="font-medium text-white">No service orders matching your filter</p>
            <p className="text-xs">
              When the administrator assigns client development requests to you, they will appear here.
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
                      {getStatusBadge(order.status)}
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
                          <Check size={15} />
                          <span>Accept Order</span>
                        </button>

                        <button
                          onClick={() => handleInitializeProject(order._id, order.orderNumber)}
                          disabled={processingOrderId === order._id}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 transition-all flex items-center gap-2 shadow-sm shadow-brand-cyan/10 disabled:opacity-50"
                        >
                          <Layers size={15} />
                          <span>Initialize Project Workspace</span>
                        </button>
                      </>
                    )}

                    {order.status === 'converted_to_project' && (
                      <Link
                        to={`/dashboard/service-projects/${order.projectId?._id || order.projectId}`}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-2 shadow-sm shadow-purple-500/10"
                      >
                        <ExternalLink size={15} />
                        <span>Open Project Workspace ({order.projectId?.projectCode || 'Active'})</span>
                      </Link>
                    )}
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

      {/* SECTION 2: ACTIVE DEVELOPMENT PROJECT WORKSPACES */}
      {projects.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers size={20} className="text-emerald-400" />
              <span>Active Project Workspaces ({projects.length})</span>
            </h2>

            <Link
              to="/dashboard/service-projects"
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <span>View All Workspaces</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(proj => (
              <GlassCard key={proj._id} className="p-5 space-y-4 hover:border-emerald-500/25 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {proj.projectCode}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 capitalize">
                    {proj.status?.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{proj.title}</h3>
                  <p className="text-xs text-text-muted line-clamp-2 mt-1">{proj.description}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Development Progress</span>
                    <span className="font-mono text-emerald-400 font-bold">{proj.progress || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-brand-cyan rounded-full transition-all"
                      style={{ width: `${proj.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    {(proj as any).deadline ? `Due: ${new Date((proj as any).deadline).toLocaleDateString()}` : 'Standard Delivery'}
                  </span>
                  <Link
                    to={`/dashboard/service-projects/${proj._id}`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>Open Workspace</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
