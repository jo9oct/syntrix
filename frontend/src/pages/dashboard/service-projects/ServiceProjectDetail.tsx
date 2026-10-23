import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Layers, ArrowLeft, Shield, Code, CheckCircle2, Clock,
  AlertTriangle, RefreshCw, Plus, MessageSquare, UserCheck,
  Send, ExternalLink, Calendar, CheckSquare, Award,
  FileText, Star, Sparkles, X, ChevronRight, AlertCircle,
  TrendingUp, Users, ArrowRightLeft, Bug, Paperclip, ThumbsUp
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type {
  ServiceProject, ProjectTask, TaskStatus, TaskType,
  ServicePriority, UserSummary, DeliverableItem
} from '../../../types/serviceManagement';

export const ServiceProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [project, setProject] = useState<ServiceProject | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [specialists, setSpecialists] = useState<UserSummary[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'findings' | 'deliverables' | 'signoffs'>('kanban');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [showSubmitTestingModal, setShowSubmitTestingModal] = useState(false);
  const [showSecuritySignoffModal, setShowSecuritySignoffModal] = useState(false);
  const [showAdminApprovalModal, setShowAdminApprovalModal] = useState(false);
  const [showClientAcceptanceModal, setShowClientAcceptanceModal] = useState(false);
  const [showAddDeliverableModal, setShowAddDeliverableModal] = useState(false);

  // Forms
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    taskType: 'vulnerability_fix' as TaskType,
    priority: 'medium' as ServicePriority,
    assignedTo: '',
    dueDate: '',
    estimatedHours: 4,
    findingId: '',
  });

  const [taskComment, setTaskComment] = useState('');
  const [testingNotes, setTestingNotes] = useState('');
  const [securitySignoffForm, setSecuritySignoffForm] = useState({
    approved: true,
    notes: '',
  });
  const [adminApprovalNotes, setAdminApprovalNotes] = useState('');
  const [clientFeedbackForm, setClientFeedbackForm] = useState({
    rating: 5,
    feedback: '',
  });
  const [deliverableForm, setDeliverableForm] = useState({
    name: '',
    fileUrl: '',
    fileType: 'report',
  });

  const [submitting, setSubmitting] = useState(false);

  const currentUserRole = user?.role || 'security_engineer';
  const isAdmin = currentUserRole === 'admin';
  const isSecurity = currentUserRole === 'security_engineer' || isAdmin;
  const isDeveloper = currentUserRole === 'developer' || isAdmin;
  const isClient = currentUserRole === 'client_owner' || currentUserRole === 'client_member' || isAdmin;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch project details, tasks, specialists, and available platform findings
  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [projRes, tasksRes, usersRes, findingsRes] = await Promise.allSettled([
        api.get(`/service-projects/${id}`),
        api.get(`/project-tasks?serviceProjectId=${id}`),
        api.get('/users'),
        api.get('/findings'),
      ]);

      if (projRes.status === 'fulfilled') {
        const rawProj = projRes.value.data?.data?.project || projRes.value.data?.data || null;
        if (rawProj && !rawProj.phase) {
          rawProj.phase = rawProj.status === 'completed' ? 'delivered' : (rawProj.status || 'in_progress');
        }
        setProject(rawProj);
      }
      if (tasksRes.status === 'fulfilled') {
        const tList = tasksRes.value.data?.data?.tasks || (Array.isArray(tasksRes.value.data?.data) ? tasksRes.value.data.data : []);
        setTasks(tList);
      }
      if (usersRes.status === 'fulfilled') {
        const uList = usersRes.value.data?.data?.users || (Array.isArray(usersRes.value.data?.data) ? usersRes.value.data.data : []);
        setSpecialists(uList);
      }
      if (findingsRes.status === 'fulfilled') {
        const fList = findingsRes.value.data?.data?.findings || findingsRes.value.data?.data?.items || (Array.isArray(findingsRes.value.data?.data) ? findingsRes.value.data.data : []);
        setFindings(fList);
      }
    } catch (err: any) {
      console.error('Failed to load project details', err);
      showToast('Error loading project workspace data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Keep selectedTask updated when tasks list refreshes
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => (t._id || t.id) === (selectedTask._id || selectedTask.id));
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newTask.title.trim()) return;

    try {
      setSubmitting(true);
      const payload: any = {
        serviceProjectId: project._id,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        taskType: newTask.taskType,
        priority: newTask.priority,
        estimatedHours: Number(newTask.estimatedHours) || 0,
      };

      if (newTask.assignedTo) payload.assignedTo = newTask.assignedTo;
      if (newTask.dueDate) payload.dueDate = newTask.dueDate;
      if (newTask.findingId) payload.findingId = newTask.findingId;

      const res = await api.post('/project-tasks', payload);
      const created = res.data?.data?.task;
      showToast(`Task ${created?.taskCode || 'created'} added to board!`);
      setShowCreateTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        taskType: 'vulnerability_fix',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
        estimatedHours: 4,
        findingId: '',
      });
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Advance Task Status
  const handleUpdateTaskStatus = async (taskId: string, nextStatus: TaskStatus) => {
    try {
      await api.patch(`/project-tasks/${taskId}`, { status: nextStatus });
      showToast(`Task moved to ${nextStatus.replace('_', ' ')}`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update task status', 'error');
    }
  };

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !taskComment.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/project-tasks/${selectedTask._id}/comments`, {
        message: taskComment.trim(),
      });
      showToast('Comment posted');
      setTaskComment('');
      // update task in state immediately
      const updatedComments = res.data?.data?.task?.comments;
      if (updatedComments) {
        setSelectedTask(prev => prev ? { ...prev, comments: updatedComments } : null);
      }
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // DevSecOps Action: Developer Submits for Security Testing
  const handleSubmitForTesting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSubmitting(true);
      await api.post(`/service-projects/${project._id}/submit-for-testing`, {
        notes: testingNotes.trim(),
      });
      showToast('Project submitted to Security Engineering team for testing!');
      setShowSubmitTestingModal(false);
      setTestingNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit for testing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // DevSecOps Action: Security Lead Sign-off
  const handleSecuritySignoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSubmitting(true);
      await api.post(`/service-projects/${project._id}/security-signoff`, {
        approved: securitySignoffForm.approved,
        notes: securitySignoffForm.notes.trim(),
      });
      showToast(
        securitySignoffForm.approved
          ? 'Security testing sign-off recorded! Sent to Admin Operations for review.'
          : 'Security testing returned to Development team with required fixes.'
      );
      setShowSecuritySignoffModal(false);
      setSecuritySignoffForm({ approved: true, notes: '' });
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record security signoff', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // DevSecOps Action: Admin Approval
  const handleAdminApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSubmitting(true);
      await api.post(`/service-projects/${project._id}/admin-approval`, {
        notes: adminApprovalNotes.trim(),
      });
      showToast('Admin Operations approved! Ready for Client final delivery acceptance.');
      setShowAdminApprovalModal(false);
      setAdminApprovalNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record admin approval', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // DevSecOps Action: Client Acceptance
  const handleClientAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSubmitting(true);
      await api.post(`/service-projects/${project._id}/client-acceptance`, {
        feedback: clientFeedbackForm.feedback.trim(),
        rating: Number(clientFeedbackForm.rating) || 5,
      });
      showToast('Project deliverable accepted! Project marked as delivered & completed.');
      setShowClientAcceptanceModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record acceptance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Deliverable
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !deliverableForm.name.trim() || !deliverableForm.fileUrl.trim()) return;

    try {
      setSubmitting(true);
      await api.post(`/service-projects/${project._id}/deliverable`, deliverableForm);
      showToast('Deliverable artifact linked successfully!');
      setShowAddDeliverableModal(false);
      setDeliverableForm({ name: '', fileUrl: '', fileType: 'report' });
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to attach deliverable', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTaskTypeBadge = (type: TaskType) => {
    switch (type) {
      case 'development':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Development</span>;
      case 'security_audit':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">Security Audit</span>;
      case 'vulnerability_fix':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25">Vulnerability Fix</span>;
      case 'retest_verification':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">Retest Verification</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white/80">Documentation</span>;
    }
  };

  const getPriorityBadge = (p: ServicePriority) => {
    switch (p) {
      case 'critical':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">MED</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">LOW</span>;
    }
  };

  // Pipeline phases list
  const PIPELINE_STEPS = [
    { key: 'planning', label: '1. Intake & Scope' },
    { key: 'in_progress', label: '2. Dev / Assessment' },
    { key: 'security_review', label: '3. Security Testing' },
    { key: 'admin_review', label: '4. Admin Review' },
    { key: 'client_acceptance', label: '5. Client Acceptance' },
    { key: 'delivered', label: '6. Delivered' },
  ];

  const getStepIndex = (phase: string) => {
    if (phase === 'intake') return 0;
    const idx = PIPELINE_STEPS.findIndex(s => s.key === phase);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = project ? getStepIndex(project.phase) : 0;

  if (loading && !project) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3">
        <RefreshCw size={36} className="text-brand-cyan animate-spin" />
        <p className="text-sm text-text-muted">Loading DevSecOps workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Project workspace not found</h2>
        <Link to="/dashboard/service-projects" className="text-brand-cyan hover:underline text-sm inline-flex items-center gap-1">
          <ArrowLeft size={16} /> Return to Projects
        </Link>
      </div>
    );
  }

  // Kanban Columns
  const columns: { id: TaskStatus; title: string; countColor: string }[] = [
    { id: 'todo', title: 'To Do', countColor: 'text-white/60 bg-white/10' },
    { id: 'in_progress', title: 'In Progress', countColor: 'text-brand-cyan bg-brand-cyan/15' },
    { id: 'review', title: 'Under Review / Retest', countColor: 'text-amber-300 bg-amber-500/15' },
    { id: 'done', title: 'Completed', countColor: 'text-emerald-400 bg-emerald-500/15' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast */}
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

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/service-projects"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-white transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
                {project.projectCode}
              </span>
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                DevSecOps Workspace
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2">
              {project.title}
            </h1>
          </div>
        </div>

        {/* Global Project Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            title="Reload Workspace"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowAddDeliverableModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-all"
          >
            <Paperclip size={14} className="text-brand-cyan" />
            <span>Add Deliverable</span>
          </button>

          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-brand-cyan/90 hover:to-blue-600/90 text-white text-xs font-semibold shadow-md shadow-brand-cyan/20 transition-all hover:scale-[1.02]"
          >
            <Plus size={15} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Interactive DevSecOps Pipeline Stepper */}
      <GlassCard className="p-4 sm:p-5 border-white/10 bg-surface/40">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
          <span className="font-bold uppercase tracking-wider text-text-muted">DevSecOps Continuous Flow</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-text-muted">Progress:</span>
            <span className="text-brand-cyan font-bold">{project.progress || 0}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div
                key={step.key}
                className={`p-2.5 rounded-xl border transition-all text-center flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-brand-cyan/15 border-brand-cyan shadow-lg shadow-brand-cyan/15 text-brand-cyan font-bold scale-[1.02]'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-text-muted opacity-60'
                }`}
              >
                <div className="text-[11px] truncate">{step.label}</div>
                <div className="text-[10px] mt-1 font-mono uppercase">
                  {isCurrent ? 'Active Stage' : isCompleted ? 'Completed' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Contextual DevSecOps Gate Hand-off Banners */}
      {/* 1. Developer ready to hand off to Security */}
      {isDeveloper && (project.phase === 'in_progress' || project.phase === 'planning') && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-brand-cyan/10 to-blue-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Work in Progress / Ready for Testing?</div>
              <div className="text-xs text-text-muted">
                Developers can submit completed work to the Security Engineering team for technical penetration testing.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSubmitTestingModal(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Shield size={14} />
            <span>Submit for Security Testing</span>
          </button>
        </div>
      )}

      {/* 2. Security Engineer Testing Gate */}
      {isSecurity && project.phase === 'security_review' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-brand-cyan/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 animate-pulse">
              <Shield size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Security Technical Audit Gate Active</div>
              <div className="text-xs text-text-muted">
                Security Engineers: Validate fixes, run retests, and sign off to advance to Admin review (or return with reported flaws).
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSecuritySignoffModal(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all"
          >
            <CheckCircle2 size={14} />
            <span>Security Lead Sign-Off</span>
          </button>
        </div>
      )}

      {/* 3. Admin Review Gate */}
      {isAdmin && project.phase === 'admin_review' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-blue-500/10 to-brand-cyan/15 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
              <Award size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Admin Operations Review Active</div>
              <div className="text-xs text-text-muted">
                Platform administration review of all testing evidence, deliverables, and compliance before client delivery.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAdminApprovalModal(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white font-semibold text-xs hover:bg-purple-400 shadow-lg shadow-purple-500/20 transition-all"
          >
            <CheckCircle2 size={14} />
            <span>Admin Final Approval</span>
          </button>
        </div>
      )}

      {/* 4. Client Acceptance Gate */}
      {isClient && project.phase === 'client_acceptance' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-cyan/15 via-blue-500/15 to-emerald-500/15 border border-brand-cyan/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan animate-pulse">
              <ThumbsUp size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Ready for Client Acceptance & Delivery</div>
              <div className="text-xs text-text-muted">
                Review the completed deliverables and security findings summary. Confirm final acceptance.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowClientAcceptanceModal(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-xs hover:bg-brand-cyan/90 shadow-lg shadow-brand-cyan/20 transition-all"
          >
            <Star size={14} />
            <span>Confirm Acceptance</span>
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'kanban'
              ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 shadow-sm'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckSquare size={15} />
          <span>Kanban Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'findings'
              ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 shadow-sm'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Bug size={15} />
          <span>Vulnerability Registry</span>
        </button>

        <button
          onClick={() => setActiveTab('deliverables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'deliverables'
              ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 shadow-sm'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={15} />
          <span>Deliverables ({project.deliverables?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('signoffs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'signoffs'
              ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 shadow-sm'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Award size={15} />
          <span>Sign-Offs & Audit</span>
        </button>
      </div>

      {/* TAB 1: KANBAN BOARD */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col bg-surface/30 border border-white/10 rounded-2xl p-3 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {col.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${col.countColor}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs border border-dashed border-white/10 rounded-xl">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const assignee =
                        typeof task.assignedTo === 'object' && task.assignedTo !== null
                          ? (task.assignedTo as any).name
                          : 'Unassigned';

                      return (
                        <div
                          key={task._id || task.id}
                          onClick={() => setSelectedTask(task)}
                          className="p-3.5 rounded-xl bg-surface/80 border border-white/10 hover:border-brand-cyan/40 hover:shadow-lg hover:shadow-brand-cyan/5 transition-all cursor-pointer space-y-2 group"
                        >
                          {/* Task Top Badges */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] text-white/70">
                              {task.taskCode}
                            </span>
                            <div className="flex items-center gap-1">
                              {getPriorityBadge(task.priority)}
                              {getTaskTypeBadge(task.taskType)}
                            </div>
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-bold text-white group-hover:text-brand-cyan transition-colors line-clamp-2">
                            {task.title}
                          </h4>

                          {/* Linked Finding Tag */}
                          {task.findingId && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              <Bug size={11} />
                              <span className="truncate">Linked Security Flaw</span>
                            </div>
                          )}

                          {/* Footer: Assignee & Comments */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-text-muted">
                            <span className="truncate max-w-[110px]">{assignee}</span>

                            <div className="flex items-center gap-2">
                              {task.comments && task.comments.length > 0 && (
                                <div className="flex items-center gap-1 text-white/70">
                                  <MessageSquare size={11} />
                                  <span>{task.comments.length}</span>
                                </div>
                              )}

                              {/* Quick Move Button */}
                              {col.id !== 'done' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next =
                                      col.id === 'todo'
                                        ? 'in_progress'
                                        : col.id === 'in_progress'
                                        ? 'review'
                                        : 'done';
                                    handleUpdateTaskStatus(task._id || task.id!, next);
                                  }}
                                  className="p-1 rounded hover:bg-white/10 text-brand-cyan transition-colors"
                                  title="Advance to next stage"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: FINDINGS REGISTRY */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Vulnerability Findings Linked to Scope
            </h3>
            <button
              onClick={() => {
                setNewTask({
                  ...newTask,
                  taskType: 'vulnerability_fix',
                  title: 'Remediate Security Vulnerability',
                });
                setShowCreateTaskModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 text-xs font-semibold"
            >
              <Plus size={14} />
              <span>Create Remediation Task</span>
            </button>
          </div>

          {findings.length === 0 ? (
            <GlassCard className="py-12 text-center text-text-muted text-sm border-dashed">
              No security findings recorded for this project target yet.
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {findings.map((f: any) => (
                <GlassCard key={f._id || f.id} className="p-4 border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        f.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        f.severity === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {f.severity || 'Medium'}
                      </span>
                      <h4 className="font-bold text-white text-sm">{f.title || f.name}</h4>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-1">{f.description || f.affectedUrl || 'No description provided'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setNewTask({
                        title: `Remediate: ${f.title || f.name}`,
                        description: f.description || '',
                        taskType: 'vulnerability_fix',
                        priority: f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'high' : 'medium',
                        assignedTo: '',
                        dueDate: '',
                        estimatedHours: 6,
                        findingId: f._id || f.id,
                      });
                      setShowCreateTaskModal(true);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand-cyan/15 text-white hover:text-brand-cyan border border-white/10 hover:border-brand-cyan/30 text-xs font-medium transition-all"
                  >
                    Spawn Fix Task
                  </button>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DELIVERABLES */}
      {activeTab === 'deliverables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Project Deliverables & Artifacts
            </h3>
            <button
              onClick={() => setShowAddDeliverableModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 text-xs font-semibold"
            >
              <Plus size={14} />
              <span>Link Artifact</span>
            </button>
          </div>

          {(!project.deliverables || project.deliverables.length === 0) ? (
            <GlassCard className="py-12 text-center text-text-muted text-sm border-dashed">
              No deliverables attached yet. Use the Link Artifact button above.
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.deliverables.map((item: any, idx: number) => {
                const name = item.name || item.title || 'Deliverable Artifact';
                const fileUrl = item.fileUrl || item.url || '#';
                const fileType = item.fileType || 'Artifact';
                const uploadDate = item.uploadedAt || item.submittedAt;

                return (
                  <GlassCard key={item._id || idx} className="p-4 border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-brand-cyan" />
                        <span className="font-bold text-white text-sm">{name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-white/70">
                        {fileType}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted truncate font-mono">
                      {fileUrl}
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">
                        {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Ready'}
                      </span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-brand-cyan/15 text-brand-cyan hover:bg-brand-cyan/25 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <span>Access</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SIGNOFFS & GOVERNANCE */}
      {activeTab === 'signoffs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Security Lead Signoff */}
          <GlassCard className="p-5 border-brand-cyan/20 bg-brand-cyan/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-brand-cyan">1. Technical Security Sign-Off</span>
              <Shield size={18} className="text-brand-cyan" />
            </div>

            <div className="text-sm font-bold text-white">
              {((project.signOffs?.securityLead as any)?.isApproved ?? project.signOffs?.securityLead?.approved) ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Approved by Security Lead
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Clock size={16} /> Pending Security Verification
                </span>
              )}
            </div>

            {project.signOffs?.securityLead?.notes && (
              <p className="text-xs text-text-muted bg-white/5 p-2.5 rounded-lg">
                "{project.signOffs.securityLead.notes}"
              </p>
            )}

            {(project.signOffs?.securityLead?.approvedAt || (project.signOffs?.securityLead as any)?.signedAt) ? (
              <div className="text-[11px] text-text-muted">
                Signed on: {new Date(project.signOffs?.securityLead?.approvedAt || (project.signOffs?.securityLead as any)?.signedAt).toLocaleString()}
              </div>
            ) : null}
          </GlassCard>

          {/* 2. Admin Operations Signoff */}
          <GlassCard className="p-5 border-purple-500/20 bg-purple-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-purple-400">2. Admin Operations Approval</span>
              <Award size={18} className="text-purple-400" />
            </div>

            <div className="text-sm font-bold text-white">
              {((project.signOffs?.adminLead as any)?.isApproved ?? project.signOffs?.adminLead?.approved) ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Approved by Platform Admin
                </span>
              ) : (
                <span className="text-text-muted flex items-center gap-1.5">
                  <Clock size={16} /> Pending Admin Review
                </span>
              )}
            </div>

            {project.signOffs?.adminLead?.notes && (
              <p className="text-xs text-text-muted bg-white/5 p-2.5 rounded-lg">
                "{project.signOffs.adminLead.notes}"
              </p>
            )}

            {(project.signOffs?.adminLead?.approvedAt || (project.signOffs?.adminLead as any)?.signedAt) ? (
              <div className="text-[11px] text-text-muted">
                Signed on: {new Date(project.signOffs?.adminLead?.approvedAt || (project.signOffs?.adminLead as any)?.signedAt).toLocaleString()}
              </div>
            ) : null}
          </GlassCard>

          {/* 3. Client Acceptance */}
          <GlassCard className="p-5 border-emerald-500/20 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-emerald-400">3. Client Final Acceptance</span>
              <ThumbsUp size={18} className="text-emerald-400" />
            </div>

            <div className="text-sm font-bold text-white">
              {((project.signOffs?.clientAcceptance as any)?.isAccepted ?? project.signOffs?.clientAcceptance?.accepted) ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Accepted by Client
                </span>
              ) : (
                <span className="text-text-muted flex items-center gap-1.5">
                  <Clock size={16} /> Awaiting Client Delivery Confirmation
                </span>
              )}
            </div>

            {project.signOffs?.clientAcceptance?.rating && (
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(project.signOffs.clientAcceptance.rating)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
            )}

            {project.signOffs?.clientAcceptance?.feedback && (
              <p className="text-xs text-text-muted bg-white/5 p-2.5 rounded-lg">
                "{project.signOffs.clientAcceptance.feedback}"
              </p>
            )}
          </GlassCard>
        </div>
      )}

      {/* TASK DETAIL & DISCUSSION MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-cyan">{selectedTask.taskCode}</span>
                  {getPriorityBadge(selectedTask.priority)}
                  {getTaskTypeBadge(selectedTask.taskType)}
                </div>
                <h3 className="text-lg font-bold text-white">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-text-muted">Description</label>
              <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl">
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>

            {/* Status & Assignment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-text-muted">Workflow Status</label>
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    handleUpdateTaskStatus(selectedTask._id || selectedTask.id!, e.target.value as TaskStatus);
                    setSelectedTask({ ...selectedTask, status: e.target.value as TaskStatus });
                  }}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review / Retest</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-text-muted">Assigned Specialist</label>
                <div className="text-xs text-white bg-surface/70 border border-white/10 rounded-xl px-3 py-2">
                  {typeof selectedTask.assignedTo === 'object' && selectedTask.assignedTo !== null
                    ? (selectedTask.assignedTo as any).name
                    : 'Unassigned'}
                </div>
              </div>
            </div>

            {/* Threaded Discussion Comments */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>Discussion & Retest Logs ({selectedTask.comments?.length || 0})</span>
              </label>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                  <div className="text-xs text-text-muted italic py-3 text-center">
                    No comments yet. Post an update or verification note below.
                  </div>
                ) : (
                  selectedTask.comments.map((c, i) => {
                    const authorName = (c as any).authorName || (typeof c.author === 'object' && c.author !== null ? (c.author as any).name : c.author) || 'Collaborator';
                    return (
                      <div key={c._id || i} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="font-semibold text-brand-cyan">{authorName}</span>
                          <span className="text-[10px]">{c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ''}</span>
                        </div>
                        <p className="text-white/90">{c.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add comment box */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Post comment or fix evidence..."
                  value={taskComment}
                  onChange={(e) => setTaskComment(e.target.value)}
                  className="flex-1 bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
                <button
                  type="submit"
                  disabled={submitting || !taskComment.trim()}
                  className="px-3.5 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-xs hover:bg-brand-cyan/90 transition-all disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Create Board Task</h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patch SQL injection in /api/v1/auth"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/90 block mb-1">Task Type</label>
                  <select
                    value={newTask.taskType}
                    onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value as TaskType })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                  >
                    <option value="vulnerability_fix">Vulnerability Fix</option>
                    <option value="security_audit">Security Audit</option>
                    <option value="development">Development Work</option>
                    <option value="retest_verification">Retest Verification</option>
                    <option value="documentation">Documentation</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/90 block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as ServicePriority })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Assign Specialist</label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="">-- Unassigned --</option>
                  {specialists.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Description / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Steps to remediate, exploit details, or test criteria..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-xs hover:bg-brand-cyan/90 transition-all shadow-md shadow-brand-cyan/20"
                >
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT FOR TESTING MODAL */}
      {showSubmitTestingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Submit Work for Security Testing</h3>
              <button onClick={() => setShowSubmitTestingModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitForTesting} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Developer Testing Notes & URLs *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail completed fixes, staging branches, test user accounts, or endpoint modifications..."
                  value={testingNotes}
                  onChange={(e) => setTestingNotes(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSubmitTestingModal(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 shadow-md">
                  {submitting ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY SIGNOFF MODAL */}
      {showSecuritySignoffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Security Technical Audit Sign-Off</h3>
              <button onClick={() => setShowSecuritySignoffModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSecuritySignoff} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 block">Testing Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSecuritySignoffForm({ ...securitySignoffForm, approved: true })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      securitySignoffForm.approved
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-text-muted'
                    }`}
                  >
                    Pass & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecuritySignoffForm({ ...securitySignoffForm, approved: false })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      !securitySignoffForm.approved
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-white/5 border-white/10 text-text-muted'
                    }`}
                  >
                    Reject (Flaws Remain)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Audit Notes & Retest Summary *</label>
                <textarea
                  required
                  rows={4}
                  placeholder={securitySignoffForm.approved ? 'Confirm all critical/high vulnerabilities verified resolved...' : 'Detail remaining flaws that must be fixed by developers...'}
                  value={securitySignoffForm.notes}
                  onChange={(e) => setSecuritySignoffForm({ ...securitySignoffForm, notes: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSecuritySignoffModal(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 shadow-md">
                  {submitting ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN APPROVAL MODAL */}
      {showAdminApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Admin Operations Final Approval</h3>
              <button onClick={() => setShowAdminApprovalModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdminApproval} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Admin Operations Sign-off Notes *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Platform review notes, authorization to release deliverables to client..."
                  value={adminApprovalNotes}
                  onChange={(e) => setAdminApprovalNotes(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdminApprovalModal(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-purple-500 text-white font-semibold text-xs hover:bg-purple-400 shadow-md">
                  {submitting ? 'Approving...' : 'Authorize Client Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT ACCEPTANCE MODAL */}
      {showClientAcceptanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Confirm Final Acceptance & Delivery</h3>
              <button onClick={() => setShowClientAcceptanceModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleClientAcceptance} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Satisfaction Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setClientFeedbackForm({ ...clientFeedbackForm, rating: star })}
                      className={`p-2 rounded-lg transition-colors ${
                        star <= clientFeedbackForm.rating ? 'text-amber-400' : 'text-white/20'
                      }`}
                    >
                      <Star size={22} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Feedback & Acceptance Notes</label>
                <textarea
                  rows={3}
                  placeholder="Share feedback on the testing thoroughness or development quality..."
                  value={clientFeedbackForm.feedback}
                  onChange={(e) => setClientFeedbackForm({ ...clientFeedbackForm, feedback: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowClientAcceptanceModal(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-xs hover:bg-brand-cyan/90 shadow-md">
                  {submitting ? 'Accepting...' : 'Sign Off & Complete Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DELIVERABLE MODAL */}
      {showAddDeliverableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-surface/95 border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">Attach Project Deliverable</h3>
              <button onClick={() => setShowAddDeliverableModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddDeliverable} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Deliverable Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Penetration Test Audit Report (PDF)"
                  value={deliverableForm.name}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, name: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">File / Download URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://reports.sentrix.local/archive/audit-2026.pdf"
                  value={deliverableForm.fileUrl}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, fileUrl: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Deliverable Type</label>
                <select
                  value={deliverableForm.fileType}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, fileType: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="report">Executive Security Audit Report</option>
                  <option value="code_patch">Secure Code Patch / Archive</option>
                  <option value="certificate">Certification of Compliance</option>
                  <option value="evidence">Technical Retest Evidence</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddDeliverableModal(false)} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-text-muted hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-xs hover:bg-brand-cyan/90 shadow-md">
                  {submitting ? 'Attaching...' : 'Attach Deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
