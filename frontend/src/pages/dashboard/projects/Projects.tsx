import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button, Input, Badge, StatusBadge } from '../../../components/ui';
import { ShieldCheck, Plus, Search, Filter, ArrowRight, Shield, Globe, Server, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';

export interface ProjectItem {
  id: string;
  name: string;
  env: 'Production' | 'Staging' | 'Development' | 'Sandbox';
  type: 'Web App' | 'API' | 'Malware' | 'Infrastructure';
  status: 'active' | 'in_progress' | 'completed' | 'archived';
  critical: number;
  high: number;
  medium: number;
  progress: number;
  updated: string;
  targetUrl: string;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  { id: '1', name: 'Main Web Portal Security Audit', env: 'Production', type: 'Web App', status: 'active', critical: 1, high: 2, medium: 5, progress: 65, updated: '2 hours ago', targetUrl: 'https://portal.acmecorp.local' },
  { id: '2', name: 'Mobile API Q3 Review', env: 'Staging', type: 'API', status: 'in_progress', critical: 0, high: 1, medium: 4, progress: 40, updated: '1 day ago', targetUrl: 'https://api-staging.acmecorp.local' },
  { id: '3', name: 'Legacy System Retirement Scan', env: 'Production', type: 'Web App', status: 'completed', critical: 0, high: 0, medium: 0, progress: 100, updated: '1 week ago', targetUrl: 'https://legacy-billing.acmecorp.local' },
  { id: '4', name: 'Suspicious Document Analysis', env: 'Sandbox', type: 'Malware', status: 'active', critical: 1, high: 0, medium: 0, progress: 85, updated: '5 hours ago', targetUrl: 'invoice_2026.pdf.exe' },
  { id: '5', name: 'Internal HR Tool Assessment', env: 'Development', type: 'Web App', status: 'active', critical: 0, high: 1, medium: 3, progress: 50, updated: '1 month ago', targetUrl: 'http://hr-internal.corp' },
  { id: '6', name: 'Payment Gateway Integration', env: 'Staging', type: 'API', status: 'active', critical: 0, high: 0, medium: 1, progress: 15, updated: 'Just now', targetUrl: 'https://pay.acmecorp.local' },
];

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load real projects from MongoDB backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: ProjectItem[] = data.data.map((p: any) => ({
            id: p._id || p.id,
            name: p.name,
            env: 'Production',
            type: p.serviceType === 'web_app' ? 'Web App' : p.serviceType === 'api' ? 'API' : 'Malware',
            status: p.status || 'active',
            critical: p.riskSummary?.critical || 0,
            high: p.riskSummary?.high || 0,
            medium: p.riskSummary?.medium || 0,
            progress: p.status === 'completed' ? 100 : 65,
            updated: new Date(p.updatedAt || p.createdAt || Date.now()).toLocaleDateString(),
            targetUrl: p.description || 'https://' + p.name.toLowerCase().replace(/\s+/g, '-') + '.local'
          }));
          setProjects(mapped);
        }
      } catch (err) {
        // Fallback to initial projects if backend unreachable
      }
    };
    fetchProjects();
  }, []);

  // New Project Form
  const [newProject, setNewProject] = useState({
    name: '',
    type: 'Web App' as ProjectItem['type'],
    env: 'Staging' as ProjectItem['env'],
    targetUrl: '',
    description: ''
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;

    let serviceType = 'web_app';
    if (newProject.type === 'API') serviceType = 'api';
    else if (newProject.type === 'Malware') serviceType = 'malware';

    try {
      const { data } = await api.post('/projects', {
        name: newProject.name,
        serviceType,
        description: newProject.targetUrl || newProject.description,
        status: 'active'
      });
      if (data?.data) {
        const p = data.data;
        const created: ProjectItem = {
          id: p._id || String(Date.now()),
          name: p.name,
          type: newProject.type,
          env: newProject.env,
          status: 'active',
          critical: 0,
          high: 0,
          medium: 0,
          progress: 10,
          updated: 'Just now',
          targetUrl: newProject.targetUrl || 'https://target.local'
        };
        setProjects(prev => [created, ...prev]);
      }
    } catch (err) {
      const created: ProjectItem = {
        id: String(Date.now()),
        name: newProject.name,
        type: newProject.type,
        env: newProject.env,
        status: 'active',
        critical: 0,
        high: 0,
        medium: 0,
        progress: 10,
        updated: 'Just now',
        targetUrl: newProject.targetUrl || 'https://target.local'
      };
      setProjects(prev => [created, ...prev]);
    }

    setShowCreateModal(false);
    setNewProject({
      name: '',
      type: 'Web App',
      env: 'Staging',
      targetUrl: '',
      description: ''
    });
  };


  const filtered = projects.filter(p => {
    const matchesFilter =
      filter === 'All'
        ? true
        : filter === 'Active'
        ? ['active', 'in_progress'].includes(p.status)
        : filter === 'Completed'
        ? p.status === 'completed'
        : p.status === 'archived';

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Security Projects</h1>
          <p className="text-sm text-text-muted">Manage target boundaries, active assessments, and pentest scopes.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-brand-cyan/20"
        >
          <Plus size={16} /> Create Project
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-fit text-xs">
          {['All', 'Active', 'Completed', 'Archived'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f ? 'bg-white/10 text-white font-semibold' : 'text-text-muted hover:text-white'
              }`}
            >
              {f} ({
                f === 'All'
                  ? projects.length
                  : f === 'Active'
                  ? projects.filter(p => ['active', 'in_progress'].includes(p.status)).length
                  : projects.filter(p => p.status === f.toLowerCase()).length
              })
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, URL, or type..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(project => (
          <GlassCard key={project.id} className="flex flex-col border-white/10 hover:border-brand-cyan/30 transition-all duration-200">
            <div className="flex justify-between items-start mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5">
                {project.type === 'Web App' ? <Globe size={13} className="text-brand-cyan" /> : <Server size={13} className="text-brand-purple" />}
                {project.type}
              </span>
              <StatusBadge status={project.status} />
            </div>

            <h3
              onClick={() => navigate(`/dashboard/projects/${project.id}`)}
              className="text-lg font-bold text-white mb-1 hover:text-brand-cyan cursor-pointer transition-colors line-clamp-1"
            >
              {project.name}
            </h3>
            <p className="text-xs text-brand-cyan font-mono truncate mb-4">{project.targetUrl}</p>

            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 mb-5 text-center">
              <div>
                <div className="text-base font-bold text-red-400">{project.critical}</div>
                <div className="text-[10px] text-text-muted uppercase">Critical</div>
              </div>
              <div>
                <div className="text-base font-bold text-orange-400">{project.high}</div>
                <div className="text-[10px] text-text-muted uppercase">High</div>
              </div>
              <div>
                <div className="text-base font-bold text-yellow-400">{project.medium}</div>
                <div className="text-[10px] text-text-muted uppercase">Medium</div>
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
                  <span>Audit Progress</span>
                  <span className="font-semibold text-white">{project.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-brand rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="text-[11px] text-text-muted">Updated {project.updated}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/assessment/new?project=${project.id}`)}
                    className="p-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan hover:bg-brand-cyan/25 transition-colors text-xs font-semibold"
                    title="Launch scan on this project"
                  >
                    Scan
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1"
                  >
                    View <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-text-muted glass-panel rounded-2xl border border-white/10">
            No projects found matching your criteria.
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-brand-cyan/30 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create New Project</h2>
                <p className="text-xs text-text-muted">Configure a new assessment target boundary</p>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g. Customer Portal Redesign Audit"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Service Type
                  </label>
                  <select
                    value={newProject.type}
                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value as any })}
                    className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  >
                    <option value="Web App">Web Application</option>
                    <option value="API">REST / GraphQL API</option>
                    <option value="Malware">Malware Inspection</option>
                    <option value="Infrastructure">Cloud Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Environment
                  </label>
                  <select
                    value={newProject.env}
                    onChange={(e) => setNewProject({ ...newProject, env: e.target.value as any })}
                    className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    <option value="Development">Development</option>
                    <option value="Sandbox">Sandbox</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Target Endpoint or Root URL
                </label>
                <input
                  type="url"
                  value={newProject.targetUrl}
                  onChange={(e) => setNewProject({ ...newProject, targetUrl: e.target.value })}
                  placeholder="https://app.example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-5 py-2.5 rounded-xl font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} /> Create Project
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
