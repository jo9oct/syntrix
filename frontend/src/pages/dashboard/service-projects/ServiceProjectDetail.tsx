import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Layers, ArrowLeft, Shield, Code, CheckCircle2, Clock,
  AlertTriangle, RefreshCw, Plus, MessageSquare, UserCheck,
  Send, ExternalLink, Calendar, CheckSquare, Award,
  FileText, Star, Sparkles, X, ChevronRight, AlertCircle,
  TrendingUp, Users, ArrowRightLeft, Bug, Paperclip, ThumbsUp,
  Download, Trash2, UploadCloud, Link2, Play, Check
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { useClientPortalStatus } from '../../../lib/useClientPortalStatus';
import { ServiceUnavailableNotice } from '../../../components/ui/ServiceUnavailableNotice';
import type {
  ServiceProject, ProjectTask, TaskStatus, TaskType,
  ServicePriority, UserSummary, DeliverableItem
} from '../../../types/serviceManagement';

export const ServiceProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clientServicesEnabled } = useClientPortalStatus();

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
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  // Return to Developer / Security Remediation State
  const [showRejectToDevModal, setShowRejectToDevModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSeverity, setRejectSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [rejectResetDevProgress, setRejectResetDevProgress] = useState(50);
  const [rejectAttachmentMode, setRejectAttachmentMode] = useState<'file' | 'link'>('file');
  const [rejectFile, setRejectFile] = useState<File | null>(null);
  const [rejectFileDataUrl, setRejectFileDataUrl] = useState('');
  const [rejectFileName, setRejectFileName] = useState('');
  const [rejectFileSize, setRejectFileSize] = useState('');
  const [rejectLinkUrl, setRejectLinkUrl] = useState('');
  const [rejectLinkName, setRejectLinkName] = useState('');
  const [rejectDragOver, setRejectDragOver] = useState(false);
  const [submittingReject, setSubmittingReject] = useState(false);
  const [selectedRejectDevId, setSelectedRejectDevId] = useState('');


  // Forms
  const [progressStage, setProgressStage] = useState<'development' | 'testing'>('development');
  const [progressForm, setProgressForm] = useState({
    progress: 0,
    status: 'in_development',
  });
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [selectedTesterId, setSelectedTesterId] = useState('');
  const [buildUrl, setBuildUrl] = useState('');
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
  const [deliverableMode, setDeliverableMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);

  const currentUserRole = user?.role || 'user';
  const isAdmin = currentUserRole === 'admin';
  const isDeveloper = currentUserRole === 'developer' || isAdmin;
  const isSecurity = currentUserRole === 'security_engineer' || isAdmin;
  const isMalware = currentUserRole === 'malware_analyst' || isAdmin;
  const isStaff = isAdmin || currentUserRole === 'developer' || currentUserRole === 'security_engineer' || currentUserRole === 'malware_analyst';
  const isClient = currentUserRole === 'client_owner' || currentUserRole === 'client_member' || currentUserRole === 'user';

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

  const securityTesters = specialists.filter(
    (s) => s.role === 'security_engineer' || s.role === 'admin'
  );

  const availableDevelopers = specialists.filter(
    (s) => s.role === 'developer' || s.role === 'admin'
  );

  // Check if project was sent from the developer or assigned directly from admin to security group
  const isSentFromDeveloper = Boolean(
    (project as any)?.submittedByDeveloper ||
    (((project as any)?.projectType === 'secure_development' || (project as any)?.serviceType === 'secure_development') && ((project as any)?.developmentProgress ?? 0) >= 100) ||
    (project?.testingFeedback && project.testingFeedback.length > 0)
  );
  const isDirectFromAdminToSecurity = !isSentFromDeveloper;

  // DevSecOps Action: Developer Submits 100% Work for Security Testing with Tester Selection
  const handleSubmitForTesting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const testerId = selectedTesterId || (project.assignedSecurityEngineers?.[0] as any)?._id || (project.assignedSecurityEngineers?.[0] as any) || (securityTesters[0]?._id);

    try {
      setSubmitting(true);
      await api.post(`/service-projects/${project._id}/submit-for-testing`, {
        notes: testingNotes.trim(),
        buildUrl: buildUrl.trim(),
        assignedSecurityEngineerId: testerId,
      });
      showToast('Development work delivered to Security Tester! Testing progress initialized.');
      setShowSubmitTestingModal(false);
      setTestingNotes('');
      setBuildUrl('');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to deliver to testing', 'error');
    } finally {
      setSubmitting(false);
    }
  };


  // Process Return to Dev File Attachment
  const processRejectFile = (file: File) => {
    setRejectFile(file);
    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 1 ? `${sizeInMB.toFixed(2)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setRejectFileSize(sizeStr);
    if (!rejectFileName) {
      setRejectFileName(file.name);
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRejectFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Rejection / Transfer to Development
  const handleRejectToDevelopment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !rejectReason.trim()) {
      showToast('Please specify the security flaw or reason for assigning to development', 'error');
      return;
    }

    try {
      setSubmittingReject(true);
      const attachments = [];
      if (rejectAttachmentMode === 'file' && rejectFileDataUrl) {
        attachments.push({
          name: rejectFileName.trim() || rejectFile?.name || 'Vulnerability PoC Artifact',
          url: rejectFileDataUrl,
          fileType: 'evidence',
          fileSize: rejectFileSize,
        });
      } else if (rejectAttachmentMode === 'link' && rejectLinkUrl.trim()) {
        attachments.push({
          name: rejectLinkName.trim() || 'Vulnerability Reference Link',
          url: rejectLinkUrl.trim(),
          fileType: 'link',
        });
      }

      const devId = selectedRejectDevId || (project.assignedDevelopers?.[0] as any)?._id || (project.assignedDevelopers?.[0] as any) || (availableDevelopers[0]?._id);

      const res = await api.post(`/service-projects/${project._id}/reject-to-development`, {
        reason: rejectReason.trim(),
        notes: rejectNotes.trim(),
        severity: rejectSeverity,
        resetDevProgress: rejectResetDevProgress,
        assignedDeveloperId: devId,
        isDirectSend: isDirectFromAdminToSecurity,
        attachments,
      });

      showToast(res.data?.message || (isDirectFromAdminToSecurity ? 'Security findings logged! Project sent to Developer for remediation.' : 'Security flaws logged! Project returned to Developer for remediation.'));
      setShowRejectToDevModal(false);
      setRejectReason('');
      setRejectNotes('');
      setRejectFile(null);
      setRejectFileDataUrl('');
      setRejectFileName('');
      setRejectFileSize('');
      setRejectLinkUrl('');
      setRejectLinkName('');
      setSelectedRejectDevId('');
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || (isDirectFromAdminToSecurity ? 'Failed to send project to development' : 'Failed to return project to development');
      showToast(errMsg, 'error');
    } finally {
      setSubmittingReject(false);
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

  // Specialist / Staff Action: Update Project Progress & Phase
  const handleUpdateProjectProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setSubmitting(true);
      const targetProgress = Number(progressForm.progress);
      let targetStatus = progressForm.status;

      // When reaching 100%, if not admin, do not auto-complete/deliver to user
      if (targetProgress >= 100 && !isAdmin) {
        targetStatus = progressStage === 'development' ? 'in_development' : 'final_approval';
      }

      const payload: any = {
        progress: targetProgress,
        status: targetStatus,
        progressStage,
      };

      if (progressStage === 'development') {
        payload.developmentProgress = targetProgress;
      } else {
        payload.securityTestingProgress = targetProgress;
      }

      const res = await api.patch(`/service-projects/${project._id}/phase`, payload);
      if (res.data?.success) {
        if (progressStage === 'development' && targetProgress >= 100) {
          showToast('Development is 100% finished! You can now click "Deliver to Security Testing" to assign a tester.');
        } else if (progressStage === 'testing' && targetProgress >= 100) {
          showToast('Security Testing is 100% complete! Ready to submit to Admin for client delivery.');
        } else {
          showToast(`${progressStage === 'development' ? 'Development' : 'Security Testing'} progress updated to ${targetProgress}%!`);
        }
        setShowUpdateProgressModal(false);
        await loadData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to update progress', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Process Uploaded Deliverable File (PDF, ZIP, Patch, Docs, etc.)
  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 1 ? `${sizeInMB.toFixed(2)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setFileSizeText(sizeStr);

    // Auto-fill Deliverable Name if blank
    if (!deliverableForm.name || deliverableForm.name.trim() === '') {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDeliverableForm(prev => ({ ...prev, name: cleanName }));
    }

    // Auto-detect Deliverable Category from file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
      setDeliverableForm(prev => ({ ...prev, fileType: 'report' }));
    } else if (['zip', 'tar', 'gz', 'patch', 'diff', '7z', 'rar'].includes(ext)) {
      setDeliverableForm(prev => ({ ...prev, fileType: 'code_patch' }));
    } else if (['crt', 'cer', 'pem', 'pfx'].includes(ext)) {
      setDeliverableForm(prev => ({ ...prev, fileType: 'certificate' }));
    } else {
      setDeliverableForm(prev => ({ ...prev, fileType: 'evidence' }));
    }

    // Convert file to Data URL for instant downloadability & preview
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Deliverable (File Upload or External Link)
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const name = deliverableForm.name.trim();
    if (!name) {
      showToast('Please provide a deliverable title', 'error');
      return;
    }

    let finalUrl = '';
    let fileName = '';

    if (deliverableMode === 'file') {
      if (!selectedFile) {
        showToast('Please select or drop a file to attach', 'error');
        return;
      }
      finalUrl = fileDataUrl || `file://${selectedFile.name}`;
      fileName = selectedFile.name;
    } else {
      finalUrl = deliverableForm.fileUrl.trim();
      if (!finalUrl) {
        showToast('Please provide a valid download or repository URL', 'error');
        return;
      }
      fileName = name;
    }

    try {
      setSubmitting(true);
      const payload = {
        name,
        title: name,
        fileUrl: finalUrl,
        url: finalUrl,
        fileName,
        fileSize: fileSizeText,
        fileType: deliverableForm.fileType,
      };
      await api.post(`/service-projects/${project._id}/deliverables`, payload);
      showToast(deliverableMode === 'file' ? 'File artifact attached successfully!' : 'Deliverable link added successfully!');
      setShowAddDeliverableModal(false);
      setDeliverableForm({ name: '', fileUrl: '', fileType: 'report' });
      setSelectedFile(null);
      setFileDataUrl('');
      setFileSizeText('');
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to attach deliverable';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Internal Staff Action: Delete Deliverable (Admin, Developer, Security, Malware only)
  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to delete this deliverable artifact?')) return;

    try {
      setSubmitting(true);
      await api.delete(`/service-projects/${project._id}/deliverables/${deliverableId}`);
      showToast('Deliverable artifact deleted successfully');
      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          deliverables: (prev.deliverables || []).filter((d: any) => String(d._id || d.id) !== String(deliverableId))
        };
      });
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete deliverable';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Action: Officially Deliver Project to Client
  const handleDeliverProject = async () => {
    if (!project) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/service-projects/${project._id}/deliver`, {
        notes: deliveryNotes.trim()
      });
      showToast(res.data?.message || 'Project officially delivered to client!');
      setShowDeliverModal(false);
      setDeliveryNotes('');
      await loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to deliver project';
      showToast(errMsg, 'error');
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
  const latestFeedback = project?.testingFeedback && project.testingFeedback.length > 0 ? project.testingFeedback[project.testingFeedback.length - 1] : null;

  if (isClient && !clientServicesEnabled) {
    return <ServiceUnavailableNotice message="service now not avlible" />;
  }

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

          {/* Admin Official Deliver to Client Button */}
          {isAdmin && (
            (project as any)?.isDeliveredToClient ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>Delivered to Client</span>
              </div>
            ) : (
              <button
                onClick={() => setShowDeliverModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                <Send size={14} />
                <span>Deliver to Client</span>
              </button>
            )
          )}

          {isStaff && (
            <button
              onClick={() => setShowAddDeliverableModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-all"
            >
              <Paperclip size={14} className="text-brand-cyan" />
              <span>Add Deliverable</span>
            </button>
          )}

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
      <GlassCard className="p-4 sm:p-5 border-white/10 bg-surface/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 text-xs gap-3">
          <span className="font-bold uppercase tracking-wider text-text-muted">DevSecOps Continuous Flow</span>
          
          {/* Dual Progress Displays: Dev Progress & Testing Progress */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-xs">
              <span className="text-text-muted">1. Dev Progress:</span>
              <span className={`font-bold ${((project as any)?.developmentProgress ?? (project.status === 'in_development' ? project.progress : 100)) >= 100 ? 'text-emerald-400' : 'text-brand-cyan'}`}>
                {(project as any)?.developmentProgress ?? (project.status === 'in_development' ? project.progress : 100)}%
              </span>
              {((project as any)?.developmentProgress ?? 100) >= 100 && (
                <CheckCircle2 size={13} className="text-emerald-400" />
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-xs">
              <span className="text-text-muted">2. Testing Progress:</span>
              <span className={`font-bold ${(project as any)?.securityTestingProgress >= 100 ? 'text-emerald-400' : (project as any)?.securityTestingProgress > 0 ? 'text-amber-400' : 'text-text-muted'}`}>
                {(project as any)?.securityTestingProgress ?? 0}%
              </span>
              {(project as any)?.securityTestingProgress >= 100 && (
                <CheckCircle2 size={13} className="text-emerald-400" />
              )}
            </div>

            {/* Contextual Update Progress Button */}
            {isStaff && (
              <button
                onClick={() => {
                  const stage = isDeveloper && project.status === 'in_development' ? 'development' : 'testing';
                  setProgressStage(stage);
                  const currentP = stage === 'development'
                    ? ((project as any)?.developmentProgress || project.progress || 0)
                    : ((project as any)?.securityTestingProgress || 0);
                  setProgressForm({
                    progress: currentP,
                    status: project.status || 'in_development',
                  });
                  setShowUpdateProgressModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Play size={12} />
                <span>
                  {isDeveloper && project.status === 'in_development'
                    ? 'Update Dev Progress'
                    : isSecurity
                    ? 'Update Testing Progress'
                    : 'Update Progress'}
                </span>
              </button>
            )}
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
      {/* 1A. Security Flaws Reported - Developer Remediation Required */}
      {isDeveloper && (project.status === 'remediation_in_progress' || (project.testingFeedback && project.testingFeedback.some((f: any) => !f.resolved))) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/20 via-orange-500/15 to-amber-500/15 border-2 border-red-500/40 space-y-3 shadow-xl shadow-red-500/10 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-red-500/25 text-red-400 border border-red-500/40 shrink-0 mt-0.5">
                <AlertTriangle size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">Security Flaws Reported — Fixes Required</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/50 uppercase">
                    {latestFeedback?.severity || 'HIGH'} SEVERITY
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Returned by {typeof latestFeedback?.rejectedBy === 'object' ? (latestFeedback.rejectedBy as any).name : 'Security Tester'}
                  </span>
                </div>
                
                <div className="p-3 rounded-xl bg-black/40 border border-red-500/25 space-y-1">
                  <p className="text-xs font-bold text-white/95">
                    {latestFeedback?.reason || 'Security audit flaws must be remediated.'}
                  </p>
                  {latestFeedback?.notes && (
                    <p className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed">
                      {latestFeedback.notes}
                    </p>
                  )}
                </div>

                {/* Tester Attachments (PoC, Scan Report, Logs, Screenshots) */}
                {latestFeedback?.attachments && latestFeedback.attachments.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-text-muted font-semibold">Tester Finding Artifacts:</span>
                    {latestFeedback.attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/35 text-xs font-mono font-semibold transition-all shadow-sm"
                      >
                        <Paperclip size={13} />
                        <span>{att.name}</span>
                        {att.fileSize && <span className="text-[10px] text-text-muted">({att.fileSize})</span>}
                        <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setProgressStage('development');
                  setProgressForm({
                    progress: (project as any)?.developmentProgress || 50,
                    status: 'remediation_in_progress',
                  });
                  setShowUpdateProgressModal(true);
                }}
                className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Play size={13} className="text-emerald-400" />
                <span>Update Fix Progress</span>
              </button>

              <button
                onClick={() => setShowSubmitTestingModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <Shield size={14} />
                <span>Resend to Security for Re-Testing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1B. Standard Developer Ready Hand-off to Security */}
      {isDeveloper && project.status !== 'remediation_in_progress' && !(project.testingFeedback && project.testingFeedback.some((f: any) => !f.resolved)) && (project.status === 'in_development' || project.status === 'planning' || project.phase === 'in_progress' || project.phase === 'planning') && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-brand-cyan/10 to-blue-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {((project as any)?.developmentProgress ?? project.progress) >= 100
                  ? 'Development Finished (100%) - Deliver to Testing'
                  : 'Development in Progress'}
              </div>
              <div className="text-xs text-text-muted">
                {((project as any)?.developmentProgress ?? project.progress) >= 100
                  ? 'Development is complete! Select a security tester from the team and deliver your build for penetration testing & verification.'
                  : 'Work on assigned development tasks. Once development reaches 100%, deliver the build to the Security Testing team.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSubmitTestingModal(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <Shield size={14} />
            <span>Deliver to Security Testing</span>
          </button>
        </div>
      )}

      {/* 2. Security Engineer Testing Gate */}
      {isSecurity && (project.status === 'in_security_testing' || project.status === 'ready_for_security_review' || project.phase === 'security_review') && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-brand-cyan/15 border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 animate-pulse">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{(project as any)?.securityTestingProgress >= 100 ? 'Security Testing Complete (100%)' : 'Security Penetration Testing Active'}</span>
                {project.testingFeedback && project.testingFeedback.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Cycle #{project.testingFeedback.length + 1}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {(project as any)?.securityTestingProgress >= 100
                  ? 'All tests and re-tests verified complete. If passed, send to Admin for official delivery; if flaws remain, return to Developer.'
                  : 'Validate developer build, test endpoints for vulnerabilities, and record audit results.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setProgressStage('testing');
                setProgressForm({
                  progress: (project as any)?.securityTestingProgress || 0,
                  status: project.status || 'in_security_testing',
                });
                setShowUpdateProgressModal(true);
              }}
              className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all"
            >
              Update Testing Progress
            </button>

            {/* RETURN vs SEND TO DEVELOPER (FLAWS FOUND) */}
            <button
              onClick={() => setShowRejectToDevModal(true)}
              className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-md hover:scale-[1.02] ${
                isDirectFromAdminToSecurity
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-amber-500/10'
                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 shadow-red-500/10'
              }`}
            >
              <AlertTriangle size={14} />
              <span>{isDirectFromAdminToSecurity ? 'Send to Developer (Flaws Found)' : 'Return to Developer (Flaws Found)'}</span>
            </button>

            {/* PASS & SEND TO ADMIN */}
            <button
              onClick={() => setShowSecuritySignoffModal(true)}
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 size={14} />
              <span>Pass & Send to Admin Review</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Admin Delivery Gate */}
      {isAdmin && !(project as any)?.isDeliveredToClient && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-brand-cyan/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
              <Send size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {(project as any)?.securityTestingProgress >= 100
                  ? 'Testing Completed (100%) - Ready to Deliver to Client'
                  : 'Admin Delivery Oversight'}
              </div>
              <div className="text-xs text-text-muted">
                Development Progress: {((project as any)?.developmentProgress ?? 100)}% • Testing Progress: {(project as any)?.securityTestingProgress ?? 0}%.
                {(project as any)?.securityTestingProgress >= 100
                  ? ' The security tester finished testing. Click Deliver to Client to release deliverables and notify the client.'
                  : ' Monitoring specialist progress before final release.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDeliverModal(true)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
          >
            <Send size={14} />
            <span>Deliver to Client</span>
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Project Deliverables & Artifacts
              </h3>
              {(project as any)?.isDeliveredToClient && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={11} /> Officially Delivered
                </span>
              )}
            </div>
            {isStaff && (
              <button
                onClick={() => setShowAddDeliverableModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/25 text-xs font-semibold transition-all"
              >
                <Plus size={14} />
                <span>Link Artifact</span>
              </button>
            )}
          </div>

          {/* Client-facing locked banner before official Admin delivery */}
          {isClient && !(project as any)?.isDeliveredToClient && !isAdmin ? (
            <GlassCard className="py-12 px-6 text-center space-y-3 border-amber-500/30 bg-amber-500/5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center">
                <Clock size={24} />
              </div>
              <h4 className="text-white font-bold text-base">Deliverables Under QA & Administrative Review</h4>
              <p className="text-xs text-text-muted max-w-lg mx-auto">
                Project execution is finalizing. Final security reports, code patches, and verification artifacts will be released here once reviewed and officially delivered by the operations team.
              </p>
            </GlassCard>
          ) : (!project.deliverables || project.deliverables.length === 0) ? (
            <GlassCard className="py-12 text-center text-text-muted text-sm border-dashed">
              No deliverables attached yet. {isStaff && 'Use the Link Artifact button above.'}
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.deliverables.map((item: any, idx: number) => {
                const itemId = item._id || item.id || idx;
                const name = item.name || item.title || 'Deliverable Artifact';
                const fileUrl = item.fileUrl || item.url || '#';
                const fileType = item.fileType || 'report';
                const uploadDate = item.uploadedAt || item.submittedAt;
                const fileName = item.fileName || name;
                const fileSize = item.fileSize || '';
                const isDataUrl = typeof fileUrl === 'string' && fileUrl.startsWith('data:');
                const isPdf = fileName.toLowerCase().endsWith('.pdf') || fileType === 'report';
                const isZip = fileName.toLowerCase().endsWith('.zip') || fileName.toLowerCase().endsWith('.tar') || fileName.toLowerCase().endsWith('.gz') || fileType === 'code_patch';

                return (
                  <GlassCard key={itemId} className="p-4 border-white/10 space-y-3 hover:border-brand-cyan/30 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isPdf
                            ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                            : isZip
                            ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                            : 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25'
                        }`}>
                          {isPdf ? <FileText size={18} /> : isZip ? <Paperclip size={18} /> : <ExternalLink size={18} />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white text-sm block truncate">{name}</span>
                          {fileName && fileName !== name && (
                            <span className="text-[11px] text-text-muted truncate block font-mono">{fileName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {fileSize && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 border border-white/10 text-brand-cyan">
                            {fileSize}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-white/70">
                          {fileType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-text-muted truncate font-mono bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/5">
                      {isDataUrl ? `${fileName} (Direct Document Attachment)` : fileUrl}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">
                        Attached {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Ready'}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Delete button: viewable ONLY for internal staff (Admin, Dev, Security, Malware), NOT for client */}
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliverable(itemId)}
                            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-xs transition-all"
                            title="Delete deliverable"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={fileName}
                          className="px-3 py-1.5 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          {isDataUrl ? <Download size={13} /> : <ExternalLink size={13} />}
                          <span>{isDataUrl ? 'Download File' : 'Open Link'}</span>
                        </a>
                      </div>
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

      {/* SUBMIT / DELIVER FOR TESTING MODAL */}
      {showSubmitTestingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0e131f] border border-emerald-500/30 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Deliver Work to Security Testing</h3>
                  <span className="text-[11px] text-text-muted">Handover completed development build to a security tester</span>
                </div>
              </div>
              <button onClick={() => setShowSubmitTestingModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForTesting} className="space-y-4">
              {/* Select Security Tester */}
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Select Security Tester *</label>
                <select
                  required
                  value={selectedTesterId}
                  onChange={(e) => setSelectedTesterId(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">-- Choose Assigned Security Tester --</option>
                  {securityTesters.map((tester) => (
                    <option key={tester._id || tester.id} value={tester._id || tester.id}>
                      {tester.name} ({tester.email}) - {tester.role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-text-muted mt-1">
                  The selected tester will receive this build, and a fresh 0% to 100% security testing progress bar will open for them.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Build / Repository URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. https://github.com/org/repo/tree/staging or staging URL"
                  value={buildUrl}
                  onChange={(e) => setBuildUrl(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Developer Handover Notes *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail completed fixes, staging branches, test user accounts, or endpoint modifications..."
                  value={testingNotes}
                  onChange={(e) => setTestingNotes(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitTestingModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Shield size={14} />
                  <span>{submitting ? 'Delivering...' : 'Deliver to Security Testing'}</span>
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
                    onClick={() => {
                      setShowSecuritySignoffModal(false);
                      setShowRejectToDevModal(true);
                    }}
                    className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-bold transition-all hover:bg-red-500/20 flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={13} />
                    <span>Reject & Attach Flaws</span>
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
          <div className="w-full max-w-lg bg-[#0e131f] border border-brand-cyan/30 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-cyan/20 text-brand-cyan">
                  <Paperclip size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Attach Project Deliverable</h3>
                  <span className="text-[11px] text-text-muted">Attach PDF reports, patches, archives or link external URLs</span>
                </div>
              </div>
              <button onClick={() => setShowAddDeliverableModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Mode Selector Toggle: File vs Web Link */}
            <div className="grid grid-cols-2 p-1 bg-surface/70 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeliverableMode('file')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  deliverableMode === 'file'
                    ? 'bg-brand-cyan text-background-darker shadow-md font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <UploadCloud size={14} />
                <span>Upload File (PDF, ZIP, Docs)</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliverableMode('link')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                  deliverableMode === 'link'
                    ? 'bg-brand-cyan text-background-darker shadow-md font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <Link2 size={14} />
                <span>External Link / Web URL</span>
              </button>
            </div>

            <form onSubmit={handleAddDeliverable} className="space-y-4">
              {deliverableMode === 'file' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/90 block">Select or Drop Deliverable File *</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      isDragOver
                        ? 'border-brand-cyan bg-brand-cyan/10 scale-[1.01]'
                        : selectedFile
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/15 bg-white/[0.02] hover:border-brand-cyan/40 hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="file"
                      id="deliverableFileInput"
                      className="hidden"
                      accept=".pdf,.zip,.tar,.gz,.patch,.diff,.docx,.doc,.png,.jpg,.jpeg,.json,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processSelectedFile(e.target.files[0]);
                        }
                      }}
                    />

                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                          <CheckCircle2 size={24} />
                        </div>
                        <div className="text-sm font-bold text-white truncate max-w-sm mx-auto">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-brand-cyan font-mono font-semibold">
                          {fileSizeText} • Ready to Attach
                        </div>
                        <label
                          htmlFor="deliverableFileInput"
                          className="inline-block mt-2 px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-white/90 cursor-pointer transition-colors"
                        >
                          Change File
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="deliverableFileInput" className="cursor-pointer block space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-brand-cyan/15 text-brand-cyan mx-auto flex items-center justify-center">
                          <UploadCloud size={24} />
                        </div>
                        <div className="text-xs font-semibold text-white">
                          Click to browse or drop file here
                        </div>
                        <div className="text-[11px] text-text-muted">
                          Supports PDF, ZIP, TAR, Patches, Certificates & Evidence
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-white/90 block mb-1">External File / Download URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://reports.example.com/pentest-q4.pdf or git repo"
                    value={deliverableForm.fileUrl}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, fileUrl: e.target.value })}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Penetration Test Audit Report (PDF)"
                  value={deliverableForm.name}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, name: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Deliverable Category</label>
                <select
                  value={deliverableForm.fileType}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, fileType: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="report">Executive Security Audit Report (PDF)</option>
                  <option value="code_patch">Secure Code Patch / Archive (ZIP/TAR)</option>
                  <option value="certificate">Certification of Compliance</option>
                  <option value="evidence">Technical Retest PoC Evidence</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeliverableModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-bold text-xs hover:bg-brand-cyan/90 shadow-md shadow-brand-cyan/20 flex items-center gap-1.5 transition-all"
                >
                  <Paperclip size={14} />
                  <span>{submitting ? 'Attaching...' : 'Attach Deliverable'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE PROGRESS MODAL */}
      {showUpdateProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0e131f] border border-brand-cyan/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-bold">
                  {project?.projectCode}
                </span>
                <h3 className="font-bold text-white text-base mt-1">Update Workspace Delivery Progress</h3>
              </div>
              <button onClick={() => setShowUpdateProgressModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Stage Selector (Developer vs Security Tester) */}
            <div className="grid grid-cols-2 p-1 bg-surface/70 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setProgressStage('development');
                  setProgressForm({
                    ...progressForm,
                    progress: ((project as any)?.developmentProgress ?? (project?.status === 'in_development' ? project?.progress : 100)) || 0,
                  });
                }}
                className={`py-2 rounded-lg transition-all ${
                  progressStage === 'development'
                    ? 'bg-brand-cyan text-background-darker shadow-md font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                1. Development Progress
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgressStage('testing');
                  setProgressForm({
                    ...progressForm,
                    progress: (project as any)?.securityTestingProgress || 0,
                  });
                }}
                className={`py-2 rounded-lg transition-all ${
                  progressStage === 'testing'
                    ? 'bg-amber-400 text-black shadow-md font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                2. Security Testing Progress
              </button>
            </div>

            <form onSubmit={handleUpdateProjectProgress} className="space-y-4">
              <div className="space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted font-medium">
                    {progressStage === 'development' ? 'Development Completion' : 'Security Testing Completion'}
                  </span>
                  <span className={`font-mono text-xl font-black ${progressStage === 'development' ? 'text-brand-cyan' : 'text-amber-400'}`}>
                    {progressForm.progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressForm.progress}
                  onChange={(e) => setProgressForm({ ...progressForm, progress: Number(e.target.value) })}
                  className="w-full accent-brand-cyan cursor-pointer"
                />

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { pct: 25, label: 'Scope' },
                    { pct: 50, label: 'In Progress' },
                    { pct: 75, label: 'Review' },
                    { pct: 100, label: 'Complete' },
                  ].map((preset) => (
                    <button
                      key={preset.pct}
                      type="button"
                      onClick={() => setProgressForm({ ...progressForm, progress: preset.pct })}
                      className={`py-1 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all border ${
                        progressForm.progress === preset.pct
                          ? progressStage === 'development'
                            ? 'bg-brand-cyan/25 border-brand-cyan/40 text-brand-cyan'
                            : 'bg-amber-400/25 border-amber-400/40 text-amber-300'
                          : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                      }`}
                    >
                      {preset.pct}% ({preset.label})
                    </button>
                  ))}
                </div>
                {progressForm.progress >= 100 && (
                  <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed">
                    {progressStage === 'development'
                      ? 'Development is 100% finished! After saving, use the "Deliver to Security Testing" button to assign a tester and handover the build.'
                      : 'Security Testing is 100% finished! Use the "Send to Admin Review" button to submit for official client delivery.'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">Project Workflow Status</label>
                <select
                  value={progressForm.status}
                  onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50"
                >
                  <option value="planning">1. Intake & Planning</option>
                  <option value="in_development">2. Active Development / Assessment</option>
                  <option value="ready_for_security_review">3. Ready for Security Review</option>
                  <option value="in_security_testing">4. Under Penetration Testing</option>
                  <option value="remediation_in_progress">5. Remediation in Progress</option>
                  <option value="final_approval">6. Ready for Admin Delivery Review</option>
                  {isAdmin && <option value="completed">7. Completed & Delivered to Client</option>}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateProgressModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
                >
                  <Check size={14} />
                  <span>{submitting ? 'Saving...' : 'Broadcast Progress'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELIVER TO CLIENT CONFIRMATION MODAL (Admin Only) */}
      {showDeliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0e131f] border border-emerald-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Deliver Project to Client</h3>
                  <span className="text-[11px] text-text-muted font-mono">{project?.projectCode}</span>
                </div>
              </div>
              <button onClick={() => setShowDeliverModal(false)} className="p-1 rounded-lg text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed space-y-1">
              <p className="font-semibold text-emerald-300">Release Deliverables & Complete Hand-off:</p>
              <p>
                This will officially release all attached security reports, code patches, and verification artifacts to the client organization and mark the service order as Completed / Delivered.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90">Official Delivery Notes (Optional)</label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Assessment and remediation completed. All deliverables and PoC evidence verified."
                className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeliverModal(false)}
                className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeliverProject}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <CheckCircle2 size={14} />
                <span>{submitting ? 'Delivering...' : 'Confirm & Deliver to Client'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN OR SEND TO DEVELOPER (SECURITY FLAWS REPORTED) MODAL */}
      {showRejectToDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-xl bg-[#0e131f] border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
            isDirectFromAdminToSecurity ? 'border-amber-500/40' : 'border-red-500/40'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  isDirectFromAdminToSecurity
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {isDirectFromAdminToSecurity ? 'Send Project to Developer for Fixes' : 'Return Project to Developer for Fixes'}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {isDirectFromAdminToSecurity
                      ? 'Assign security assessment findings, vulnerability artifacts, and dispatch to developer for remediation'
                      : 'Report security testing flaws, attach PoC files/logs, and return to developer for remediation'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRejectToDevModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectToDevelopment} className="space-y-4">
              {/* Finding Title */}
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">
                  Vulnerability Summary / Flaw Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken Authentication in JWT refresh / SQL Injection on search parameter"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Developer Assignment Selector */}
              {availableDevelopers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-white/90 block mb-1">
                    Assign Remediation to Developer *
                  </label>
                  <select
                    value={selectedRejectDevId || (project.assignedDevelopers?.[0] as any)?._id || (project.assignedDevelopers?.[0] as any) || (availableDevelopers[0]?._id) || ''}
                    onChange={(e) => setSelectedRejectDevId(e.target.value)}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    {availableDevelopers.map((dev) => (
                      <option key={dev._id} value={dev._id}>
                        {dev.name} ({dev.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Severity & Reset Dev Progress Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/90 block mb-1">Finding Severity</label>
                  <select
                    value={rejectSeverity}
                    onChange={(e) => setRejectSeverity(e.target.value as any)}
                    className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="critical">Critical (Immediate Blocker)</option>
                    <option value="high">High (Severe Vulnerability)</option>
                    <option value="medium">Medium (Security Flaw)</option>
                    <option value="low">Low (Hardening Required)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/90 block mb-1">
                    Set Developer Progress to: <span className="text-amber-400 font-mono font-bold">{rejectResetDevProgress}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="10"
                    value={rejectResetDevProgress}
                    onChange={(e) => setRejectResetDevProgress(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer mt-1"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>0% (Full Rebuild)</span>
                    <span>50% (Standard Fixes)</span>
                    <span>80% (Minor Patch)</span>
                  </div>
                </div>
              </div>

              {/* Remediation Notes */}
              <div>
                <label className="text-xs font-semibold text-white/90 block mb-1">
                  Remediation Instructions & Vulnerability Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail step-by-step reproduction steps, vulnerable endpoints, payload example, and required mitigation..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Attachment Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/90 block">Attach Testing Artifact (PoC, Report, Log or Link)</label>
                <div className="grid grid-cols-2 p-1 bg-surface/70 rounded-xl border border-white/10 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRejectAttachmentMode('file')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      rejectAttachmentMode === 'file'
                        ? 'bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    <UploadCloud size={13} />
                    <span>Upload File (PDF, ZIP, Log)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectAttachmentMode('link')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                      rejectAttachmentMode === 'link'
                        ? 'bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    <Link2 size={13} />
                    <span>External URL / Reference</span>
                  </button>
                </div>

                {rejectAttachmentMode === 'file' ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setRejectDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setRejectDragOver(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setRejectDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processRejectFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                      rejectDragOver ? 'border-amber-500 bg-amber-500/10' : 'border-white/15 bg-surface/40 hover:border-amber-500/40'
                    }`}
                  >
                    <input
                      type="file"
                      id="rejectFileInput"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processRejectFile(e.target.files[0]);
                        }
                      }}
                    />
                    {rejectFile ? (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white truncate max-w-sm mx-auto">
                          {rejectFile.name}
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono">
                          {rejectFileSize} • Ready to Attach
                        </div>
                        <label
                          htmlFor="rejectFileInput"
                          className="inline-block mt-1 px-2.5 py-0.5 text-[11px] rounded bg-white/10 text-white cursor-pointer hover:bg-white/15"
                        >
                          Change File
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="rejectFileInput" className="cursor-pointer block space-y-1">
                        <UploadCloud size={20} className="mx-auto text-amber-400" />
                        <div className="text-xs text-white font-medium">Click to upload or drop finding evidence</div>
                        <div className="text-[10px] text-text-muted">PDF, ZIP, logs, code diffs, or screenshots</div>
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="url"
                      placeholder="https://vulnerability-db.org/cve-... or git issue"
                      value={rejectLinkUrl}
                      onChange={(e) => setRejectLinkUrl(e.target.value)}
                      className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Link Label / Description (Optional)"
                      value={rejectLinkName}
                      onChange={(e) => setRejectLinkName(e.target.value)}
                      className="w-full bg-surface/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRejectToDevModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50 ${
                    isDirectFromAdminToSecurity
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
                  }`}
                >
                  <AlertTriangle size={14} />
                  <span>
                    {submittingReject
                      ? 'Submitting...'
                      : isDirectFromAdminToSecurity
                      ? 'Send to Developer with Findings'
                      : 'Return to Developer with Findings'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
