import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  ClipboardList, Plus, Shield, Code, Search, Filter,
  Clock, CheckCircle2, AlertTriangle, ArrowRight, UserCheck,
  Send, RefreshCw, ExternalLink, HelpCircle, FileText, Check,
  X, Sparkles, Building2, Calendar, DollarSign, Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type {
  ServiceOrder, ServiceType, ServicePriority,
  AssignedTeamType, UserSummary
} from '../../../types/serviceManagement';

export const ServiceOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [specialists, setSpecialists] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ServiceType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRfiModal, setShowRfiModal] = useState<ServiceOrder | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<ServiceOrder | null>(null);
  const [showAdminRfiModal, setShowAdminRfiModal] = useState<ServiceOrder | null>(null);

  // New Order Form state
  const [newOrder, setNewOrder] = useState({
    title: '',
    serviceType: 'security_assessment' as ServiceType,
    description: '',
    targetUrl: '',
    requirements: '',
    priority: 'medium' as ServicePriority,
    deadline: '',
    estimatedBudget: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // RFI Reply state
  const [rfiReply, setRfiReply] = useState('');
  const [adminRfiQuestion, setAdminRfiQuestion] = useState('');

  // Assignment Modal state
  const [assignTeam, setAssignTeam] = useState<AssignedTeamType>('security_engineering');
  const [assignSpecialistId, setAssignSpecialistId] = useState('');

  const isAdmin = user?.role === 'admin';
  const isSpecialist = ['developer', 'security_engineer', 'malware_analyst'].includes(user?.role || '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/service-orders');
      const data = res.data?.data?.orders || (Array.isArray(res.data?.data) ? res.data.data : []);
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to fetch service orders', err);
      showToast(err.response?.data?.message || 'Could not load service orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const list = res.data?.data?.users || (Array.isArray(res.data?.data) ? res.data.data : []);
      setSpecialists(list);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchUsers();
  }, []);

  // Handle Create Service Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.title.trim() || !newOrder.targetUrl.trim() || !newOrder.description.trim()) {
      showToast('Please provide a project title, target URL, and scope description', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        title: newOrder.title.trim(),
        serviceType: newOrder.serviceType,
        description: newOrder.description.trim(),
        targetUrl: newOrder.targetUrl.trim(),
        priority: newOrder.priority,
      };

      if (newOrder.requirements.trim()) {
        payload.requirements = newOrder.requirements
          .split('\n')
          .map(r => r.trim())
          .filter(Boolean);
      }
      if (newOrder.deadline) {
        payload.deadline = newOrder.deadline;
      }
      if (newOrder.estimatedBudget) {
        payload.budget = {
          estimated: Number(newOrder.estimatedBudget),
          currency: 'USD'
        };
      }

      const res = await api.post('/service-orders', payload);
      const created = res.data?.data?.order || res.data?.data;
      showToast(`Service order ${created?.orderNumber || 'submitted'} created successfully!`);
      setShowCreateModal(false);
      setNewOrder({
        title: '',
        serviceType: 'security_assessment',
        description: '',
        targetUrl: '',
        requirements: '',
        priority: 'medium',
        deadline: '',
        estimatedBudget: '',
      });
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to create order', err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to submit service order';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Update (Admin)
  const handleUpdateStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      await api.patch(`/service-orders/${orderId}/status`, { status, adminNotes: notes });
      showToast(`Order status updated to ${status.replace('_', ' ')}`);
      fetchOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update order status', 'error');
    }
  };

  // Handle RFI Response (Client)
  const handleAnswerRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRfiModal || !rfiReply.trim()) return;

    try {
      setSubmitting(true);
      await api.post(`/service-orders/${showRfiModal._id}/info-request`, {
        answer: rfiReply.trim()
      });
      showToast('Information response submitted to platform administration');
      setShowRfiModal(null);
      setRfiReply('');
      fetchOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send response', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Admin Asking RFI
  const handleAdminAskRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdminRfiModal || !adminRfiQuestion.trim()) return;

    try {
      setSubmitting(true);
      await api.post(`/service-orders/${showAdminRfiModal._id}/info-request`, {
        question: adminRfiQuestion.trim()
      });
      showToast('Request for information sent to client');
      setShowAdminRfiModal(null);
      setAdminRfiQuestion('');
      fetchOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send question', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assigning Specialist & Team (Admin)
  const handleAssignSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal) return;

    try {
      setSubmitting(true);
      await api.post(`/service-orders/${showAssignModal._id}/assign`, {
        assignedTeam: assignTeam,
        assignedSpecialistId: assignSpecialistId || undefined
      });
      showToast(`Order assigned to ${assignTeam.replace('_', ' ')} successfully!`);
      setShowAssignModal(null);
      fetchOrders();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to assign team', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Convert to Active Project Workspace (Admin)
  const handleConvertToProject = async (orderId: string) => {
    try {
      const res = await api.post(`/service-orders/${orderId}/convert-to-project`, {});
      const project = res.data?.data?.project;
      showToast(`Project workspace ${project?.projectCode || ''} launched successfully!`);
      fetchOrders();
      if (project?._id) {
        navigate(`/dashboard/service-projects/${project._id}`);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to convert order to project', 'error');
    }
  };

  // Filter Logic
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.targetUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || o.serviceType === typeFilter;
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const assessmentCount = orders.filter(o => o.serviceType === 'security_assessment').length;
  const devCount = orders.filter(o => o.serviceType === 'secure_development').length;
  const pendingCount = orders.filter(o => ['pending_review', 'under_review', 'info_requested'].includes(o.status)).length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress' || o.serviceProjectId).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Accepted</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">In Progress</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Completed</span>;
      case 'info_requested':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">Info Requested</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Rejected</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Under Review</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/20">Pending Review</span>;
    }
  };

  const getPriorityBadge = (priority: ServicePriority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">Low</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-red-500/20 border-red-500/40 text-red-200'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-lg shadow-brand-cyan/10">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Service Orders & Engagements
              </h1>
              <p className="text-text-muted text-sm mt-0.5">
                Client intake, administrative dispatch, and continuous DevSecOps collaboration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOrders();
              showToast('Orders refreshed');
            }}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/dashboard/service-projects"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
          >
            <Layers size={17} className="text-brand-cyan" />
            <span>Active Workspaces</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-brand-cyan/90 hover:to-blue-600/90 text-white text-sm font-medium shadow-lg shadow-brand-cyan/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Request New Service</span>
          </button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 relative overflow-hidden border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-text-muted tracking-wider">Total Orders</span>
            <div className="p-2 rounded-lg bg-white/5 text-text-muted">
              <ClipboardList size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{orders.length}</div>
          <div className="text-xs text-text-muted mt-1">Intake requests recorded</div>
        </GlassCard>

        <GlassCard className="p-5 relative overflow-hidden border-brand-cyan/20 bg-brand-cyan/5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-brand-cyan tracking-wider">Security Pentests</span>
            <div className="p-2 rounded-lg bg-brand-cyan/15 text-brand-cyan">
              <Shield size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{assessmentCount}</div>
          <div className="text-xs text-text-muted mt-1">Web vulnerability assessments</div>
        </GlassCard>

        <GlassCard className="p-5 relative overflow-hidden border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Secure Dev Orders</span>
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Code size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{devCount}</div>
          <div className="text-xs text-text-muted mt-1">Hardening & feature builds</div>
        </GlassCard>

        <GlassCard className="p-5 relative overflow-hidden border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">Active Workspaces</span>
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mt-2">{inProgressCount}</div>
          <div className="text-xs text-text-muted mt-1">Projects in active pipeline</div>
        </GlassCard>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Service Type Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-surface/80 border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === 'all'
                ? 'bg-brand-cyan/20 text-brand-cyan font-semibold border border-brand-cyan/30'
                : 'text-text-muted hover:text-white'
            }`}
          >
            All Types ({orders.length})
          </button>
          <button
            onClick={() => setTypeFilter('security_assessment')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === 'security_assessment'
                ? 'bg-brand-cyan/20 text-brand-cyan font-semibold border border-brand-cyan/30'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Shield size={14} />
            <span>Security Assessment ({assessmentCount})</span>
          </button>
          <button
            onClick={() => setTypeFilter('secure_development')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === 'secure_development'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Code size={14} />
            <span>Secure Development ({devCount})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search orders, targets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="under_review">Under Review</option>
            <option value="info_requested">Info Requested</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Orders List / Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw size={32} className="text-brand-cyan animate-spin" />
          <p className="text-sm text-text-muted">Loading service orders from Sentrix...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <GlassCard className="py-16 text-center border-dashed border-white/15">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-text-muted mb-4">
            <ClipboardList size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white">No service orders found</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto mt-1 mb-6">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No service orders match your active search filters.'
              : 'Submit a new cybersecurity assessment or secure development request to get started.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-sm hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20"
          >
            <Plus size={16} />
            <span>Create First Order</span>
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const hasPendingRfi =
              order.infoRequests &&
              order.infoRequests.some(rfi => rfi.status === 'pending');
            const latestPendingRfi = order.infoRequests?.find(rfi => rfi.status === 'pending');
            const projectId =
              typeof order.serviceProjectId === 'object' && order.serviceProjectId !== null
                ? (order.serviceProjectId as any)._id
                : order.serviceProjectId;

            return (
              <GlassCard
                key={order._id}
                className="p-5 sm:p-6 border-white/10 hover:border-brand-cyan/30 transition-all duration-200 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Info & Details */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">
                        {order.orderNumber}
                      </span>

                      {order.serviceType === 'security_assessment' ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
                          <Shield size={13} />
                          Security Assessment
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          <Code size={13} />
                          Secure Development
                        </span>
                      )}

                      {getPriorityBadge(order.priority)}
                      {getStatusBadge(order.status)}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-brand-cyan transition-colors truncate">
                        {order.title}
                      </h3>
                      <p className="text-sm text-text-muted line-clamp-2 mt-1">
                        {order.description}
                      </p>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-text-muted pt-1">
                      <div className="flex items-center gap-1.5 text-white/80">
                        <ExternalLink size={14} className="text-brand-cyan" />
                        <a
                          href={order.targetUrl.startsWith('http') ? order.targetUrl : `https://${order.targetUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline hover:text-brand-cyan font-mono"
                        >
                          {order.targetUrl}
                        </a>
                      </div>

                      {order.deadline && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-amber-400" />
                          <span>Deadline: {new Date(order.deadline).toLocaleDateString()}</span>
                        </div>
                      )}

                      {order.assignedTeam && (
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={14} className="text-emerald-400" />
                          <span className="capitalize">
                            Team: {order.assignedTeam.replace('_', ' ')}
                          </span>
                        </div>
                      )}

                      {order.budget?.estimated && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={14} className="text-purple-400" />
                          <span>Budget: ${order.budget.estimated.toLocaleString()} USD</span>
                        </div>
                      )}
                    </div>

                    {/* RFI Alert Banner if waiting for response */}
                    {hasPendingRfi && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <HelpCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-amber-300">
                              Admin Request for Information (RFI)
                            </div>
                            <div className="text-xs text-white/90 mt-0.5">
                              "{latestPendingRfi?.question}"
                            </div>
                          </div>
                        </div>

                        {!isAdmin && (
                          <button
                            onClick={() => setShowRfiModal(order)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
                          >
                            Answer Request
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                    {/* Right Column: Dynamic Action Buttons */}
                    <div className="flex flex-wrap lg:flex-col items-stretch lg:items-end justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10 shrink-0">
                      {/* If Project Workspace exists -> direct link */}
                      {projectId ? (
                        <Link
                          to={`/dashboard/service-projects/${projectId}`}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold shadow-sm transition-all"
                        >
                          <Layers size={15} />
                          <span>Open Workspace</span>
                          <ArrowRight size={14} />
                        </Link>
                      ) : isAdmin ? (
                        /* Direct link to Admin Operations Center where accept/assign actions belong */
                        <Link
                          to="/dashboard/admin?tab=orders"
                          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/25 text-xs font-medium transition-all"
                        >
                          <span>Manage in Admin Center</span>
                          <ArrowRight size={13} />
                        </Link>
                      ) : (
                        /* Client status tracking */
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted italic">
                            {order.status === 'pending_review'
                              ? 'Awaiting Administrator Review'
                              : order.status === 'accepted'
                              ? 'Accepted • Preparing Project Workspace'
                              : order.status === 'info_requested'
                              ? 'Awaiting Your Clarification'
                              : 'Active Engagement'}
                          </span>
                        </div>
                      )}
                    </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* CREATE NEW SERVICE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Request Professional Service</h2>
                  <p className="text-xs text-text-muted">
                    Commission our certified security testers or senior secure developers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-5">
              {/* Service Type Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Choose Service Engagement Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setNewOrder({ ...newOrder, serviceType: 'security_assessment' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      newOrder.serviceType === 'security_assessment'
                        ? 'bg-brand-cyan/15 border-brand-cyan shadow-lg shadow-brand-cyan/15 text-white'
                        : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                      <Shield className="text-brand-cyan" size={20} />
                      <span>Security Assessment</span>
                    </div>
                    <p className="text-xs mt-1.5 text-text-muted leading-relaxed">
                      Penetration testing, OWASP vulnerability audit, automated & manual exploits, remediation advisory.
                    </p>
                  </div>

                  <div
                    onClick={() => setNewOrder({ ...newOrder, serviceType: 'secure_development' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      newOrder.serviceType === 'secure_development'
                        ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/15 text-white'
                        : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                      <Code className="text-emerald-400" size={20} />
                      <span>Secure Web Development</span>
                    </div>
                    <p className="text-xs mt-1.5 text-text-muted leading-relaxed">
                      Build secure applications, patch vulnerabilities, implement CSP/CORS, and harden codebases.
                    </p>
                  </div>
                </div>
              </div>

              {/* Title & Target URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Project Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fintech Portal OWASP Pentest"
                    value={newOrder.title}
                    onChange={(e) => setNewOrder({ ...newOrder, title: e.target.value })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Target Website URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://app.example.com"
                    value={newOrder.targetUrl}
                    onChange={(e) => setNewOrder({ ...newOrder, targetUrl: e.target.value })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                  />
                </div>
              </div>

              {/* Scope Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">Scope & Objectives Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail your goals, authentication scopes, API routes, or development requirements..."
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              {/* Requirements (Line by Line) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">Specific Requirements (one per line)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Test OAuth2 token grant flow&#10;Verify SQL injection on /search endpoint"
                  value={newOrder.requirements}
                  onChange={(e) => setNewOrder({ ...newOrder, requirements: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              {/* Priority, Deadline, Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Priority</label>
                  <select
                    value={newOrder.priority}
                    onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value as ServicePriority })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan/50"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical (Immediate)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Target Deadline</label>
                  <input
                    type="date"
                    value={newOrder.deadline}
                    onChange={(e) => setNewOrder({ ...newOrder, deadline: e.target.value })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/90">Budget (USD)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={newOrder.estimatedBudget}
                    onChange={(e) => setNewOrder({ ...newOrder, estimatedBudget: e.target.value })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-brand-cyan/90 hover:to-blue-600/90 text-white text-xs font-semibold shadow-lg shadow-brand-cyan/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>Submit Service Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT RFI REPLY MODAL */}
      {showRfiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <HelpCircle size={20} className="text-amber-400" />
                <h3 className="font-bold text-white text-base">Respond to Request for Information</h3>
              </div>
              <button
                onClick={() => setShowRfiModal(null)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-white/90">
              <span className="font-bold text-amber-300 block mb-1">Admin Inquiry:</span>
              {showRfiModal.infoRequests?.find(r => r.status === 'pending')?.question || 'Please provide additional project details.'}
            </div>

            <form onSubmit={handleAnswerRfi} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 mb-1.5 block">Your Clarification *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide requested architecture, access credentials, testing environment URLs..."
                  value={rfiReply}
                  onChange={(e) => setRfiReply(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRfiModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors shadow-md"
                >
                  {submitting ? 'Submitting...' : 'Send Clarification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ASK RFI MODAL */}
      {showAdminRfiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <HelpCircle size={20} className="text-amber-400" />
                <h3 className="font-bold text-white text-base">Request Information from Client</h3>
              </div>
              <button
                onClick={() => setShowAdminRfiModal(null)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminAskRfi} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 mb-1.5 block">Question for Client *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Please confirm if staging credentials have 2FA bypassed for automated testing..."
                  value={adminRfiQuestion}
                  onChange={(e) => setAdminRfiQuestion(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminRfiModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors shadow-md"
                >
                  {submitting ? 'Submitting...' : 'Dispatch Request (RFI)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ASSIGN TEAM & SPECIALIST MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <UserCheck size={20} className="text-brand-cyan" />
                <h3 className="font-bold text-white text-base">Assign Specialist Team</h3>
              </div>
              <button
                onClick={() => setShowAssignModal(null)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSpecialist} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 mb-1.5 block">Department Team</label>
                <select
                  value={assignTeam}
                  onChange={(e) => setAssignTeam(e.target.value as AssignedTeamType)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="security_engineering">Security Engineering (Penetration Testers)</option>
                  <option value="development">Development (Secure Web Developers)</option>
                  <option value="malware_analysis">Malware Analysis (Reverse Engineers)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 mb-1.5 block">Lead Specialist (Optional)</label>
                <select
                  value={assignSpecialistId}
                  onChange={(e) => setAssignSpecialistId(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="">-- Assign Automatically to Department --</option>
                  {specialists.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name} ({s.role}) - {s.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-xs hover:bg-brand-cyan/90 transition-all shadow-md shadow-brand-cyan/20"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

