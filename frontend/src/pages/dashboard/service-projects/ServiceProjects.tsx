import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  Layers, Search, Filter, Shield, Code, ArrowRight,
  Clock, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink,
  Users, CheckSquare, Sparkles, Building2, Calendar
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { ServiceProject, ProjectPhase, ServicePriority } from '../../../types/serviceManagement';

export const ServiceProjects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<ServiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/service-projects');
      const list = res.data?.data?.projects || (Array.isArray(res.data?.data) ? res.data.data : []);
      setProjects(list);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getPhaseBadge = (phase: ProjectPhase) => {
    switch (phase) {
      case 'intake':
      case 'planning':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25">Planning & Intake</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 animate-pulse">In Active Development</span>;
      case 'security_review':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25 animate-pulse">Security Audit & Testing</span>;
      case 'admin_review':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25">Admin Operations Review</span>;
      case 'client_acceptance':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">Client Acceptance Stage</span>;
      case 'delivered':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Delivered & Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80">{phase}</span>;
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

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetUrl?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPhase = phaseFilter === 'all' || p.phase === phaseFilter;
    return matchesSearch && matchesPhase;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 shadow-lg shadow-brand-cyan/10">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Project Workspaces & DevSecOps
              </h1>
              <p className="text-text-muted text-sm mt-0.5">
                Multi-stage collaborative pipelines: Developer &rarr; Security Retest &rarr; Admin Review &rarr; Client Acceptance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjects}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            title="Refresh Projects"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            to={user?.role === 'admin' ? '/dashboard/admin?tab=orders' : '/dashboard/service-orders'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
          >
            <span>{user?.role === 'admin' ? 'Back to Admin Orders' : 'View Service Orders'}</span>
          </Link>
        </div>
      </div>

      {/* Pipeline Phase KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="p-4 border-white/10">
          <div className="text-xs text-text-muted uppercase font-bold tracking-wider">Active Workspaces</div>
          <div className="text-2xl font-bold text-white mt-1">{projects.length}</div>
        </GlassCard>

        <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="text-xs text-amber-300 uppercase font-bold tracking-wider">Security Testing</div>
          <div className="text-2xl font-bold text-white mt-1">
            {projects.filter(p => p.phase === 'security_review').length}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-purple-500/20 bg-purple-500/5">
          <div className="text-xs text-purple-300 uppercase font-bold tracking-wider">Admin Review</div>
          <div className="text-2xl font-bold text-white mt-1">
            {projects.filter(p => p.phase === 'admin_review').length}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Delivered & Closed</div>
          <div className="text-2xl font-bold text-white mt-1">
            {projects.filter(p => p.phase === 'delivered' || p.status === 'completed').length}
          </div>
        </GlassCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search projects by code, title, target URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan/50"
          />
        </div>

        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="bg-surface/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-cyan/50"
        >
          <option value="all">All Phases</option>
          <option value="planning">Planning & Intake</option>
          <option value="in_progress">In Progress</option>
          <option value="security_review">Security Testing</option>
          <option value="admin_review">Admin Review</option>
          <option value="client_acceptance">Client Acceptance</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw size={32} className="text-brand-cyan animate-spin" />
          <p className="text-sm text-text-muted">Loading project workspaces...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <GlassCard className="py-16 text-center border-dashed border-white/15">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-text-muted mb-4">
            <Layers size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white">No active project workspaces</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto mt-1 mb-6">
            Convert an approved service order into a project workspace from the Service Orders dashboard.
          </p>
          <Link
            to="/dashboard/service-orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-cyan text-background-darker font-semibold text-sm hover:bg-brand-cyan/90 transition-all shadow-lg shadow-brand-cyan/20"
          >
            <span>Go to Service Orders</span>
            <ArrowRight size={16} />
          </Link>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const devLead = typeof project.developmentLead === 'object' ? (project.developmentLead as any)?.name : null;
            const secLead = typeof project.securityLead === 'object' ? (project.securityLead as any)?.name : null;

            return (
              <GlassCard
                key={project._id}
                className="p-5 border-white/10 hover:border-brand-cyan/40 transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">
                      {project.projectCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {project.serviceType === 'security_assessment' ? (
                        <span title="Security Assessment"><Shield size={14} className="text-brand-cyan" /></span>
                      ) : (
                        <span title="Secure Development"><Code size={14} className="text-emerald-400" /></span>
                      )}
                      {getPriorityBadge(project.priority)}
                    </div>
                  </div>

                  {/* Title & Target */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-brand-cyan transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    {project.targetUrl && (
                      <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5 font-mono truncate">
                        <ExternalLink size={12} className="shrink-0 text-brand-cyan" />
                        <span className="truncate">{project.targetUrl}</span>
                      </div>
                    )}
                  </div>

                  {/* Phase Badge */}
                  <div>{getPhaseBadge(project.phase)}</div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Workflow Progress</span>
                      <span className="font-bold text-brand-cyan">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-cyan to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Team Leads */}
                  <div className="pt-2 border-t border-white/10 text-xs text-text-muted space-y-1">
                    {devLead && (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-medium">Dev Lead:</span>
                        <span className="text-white/80 truncate max-w-[150px]">{devLead}</span>
                      </div>
                    )}
                    {secLead && (
                      <div className="flex items-center justify-between">
                        <span className="text-brand-cyan font-medium">Security Lead:</span>
                        <span className="text-white/80 truncate max-w-[150px]">{secLead}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <Link
                    to={`/dashboard/service-projects/${project._id}`}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-brand-cyan/20 text-white hover:text-brand-cyan border border-white/10 hover:border-brand-cyan/30 text-xs font-semibold transition-all"
                  >
                    <span>Open Project Workspace</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
