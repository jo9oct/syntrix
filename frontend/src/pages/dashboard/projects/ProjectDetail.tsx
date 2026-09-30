import React, { useState } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge, SeverityBadge } from '../../../components/ui/Badge';
import {
  FileText, Bug, CheckCircle, ArrowRight, Plus, UploadCloud,
  Globe, Server, Shield, AlertTriangle, ArrowLeft, X
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';

export const ProjectDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Interactive tab data
  const [applications, setApplications] = useState([
    { name: 'Customer Dashboard UI', url: 'https://portal.acmecorp.local/dashboard', tech: 'React / Next.js', env: 'Production', authRequired: true },
    { name: 'Admin Management Panel', url: 'https://admin.acmecorp.local', tech: 'Node / Express', env: 'Production', authRequired: true },
    { name: 'Authentication SSO Service', url: 'https://auth.acmecorp.local', tech: 'OAuth2 / OIDC', env: 'Production', authRequired: true },
  ]);

  const [endpoints, setEndpoints] = useState([
    { method: 'POST', path: '/api/v1/auth/login', auth: 'None', risk: 'High', description: 'User login & JWT generation' },
    { method: 'GET', path: '/api/v1/users/:id', auth: 'Bearer', risk: 'Critical', description: 'User profile endpoint (Tested for IDOR)' },
    { method: 'POST', path: '/api/v1/payments/charge', auth: 'Bearer + Secret', risk: 'High', description: 'Stripe payment processor integration' },
    { method: 'GET', path: '/api/v1/catalog/search', auth: 'None', risk: 'Medium', description: 'Product search with SQL fulltext queries' },
    { method: 'GET', path: '/api/v1/health', auth: 'None', risk: 'Low', description: 'Microservice liveness probe' },
  ]);

  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');

  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [openApiSpec, setOpenApiSpec] = useState('');

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName) return;
    setApplications([
      ...applications,
      { name: newAppName, url: newAppUrl || 'https://new-app.local', tech: 'Node.js', env: 'Production', authRequired: true }
    ]);
    setShowAddAppModal(false);
    setNewAppName('');
    setNewAppUrl('');
  };

  const handleParseOpenApi = (e: React.FormEvent) => {
    e.preventDefault();
    setEndpoints([
      { method: 'POST', path: '/api/v2/orders/checkout', auth: 'Bearer', risk: 'High', description: 'Imported checkout transaction route' },
      { method: 'GET', path: '/api/v2/inventory/:sku', auth: 'None', risk: 'Low', description: 'Public stock check' },
      ...endpoints
    ]);
    setShowOpenApiModal(false);
    setOpenApiSpec('');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link to="/dashboard/projects" className="hover:text-white flex items-center gap-1">
          <ArrowLeft size={12} /> Back to Projects
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Main Web Portal Security Audit</span>
      </div>

      {/* Hero Card */}
      <GlassCard className="p-6 border-white/10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Main Web Portal Security Audit</h1>
              <StatusBadge status="active" />
            </div>
            <p className="text-xs text-text-muted max-w-2xl leading-relaxed mb-4">
              Comprehensive penetration testing and dynamic vulnerability analysis for Acme Corp customer-facing assets, payment gateways, and authentication endpoints.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-text-muted">
                Environment: <strong className="text-white">Production</strong>
              </span>
              <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-text-muted">
                Target: <strong className="text-brand-cyan font-mono">https://portal.acmecorp.local</strong>
              </span>
              <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-text-muted">
                Type: <strong className="text-white">Web App & APIs</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate(`/dashboard/assessment/new?project=${id || '1'}`)}
              className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold shadow-lg shadow-brand-cyan/20"
            >
              <Shield size={16} /> Start Security Assessment
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 text-xs font-medium overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'applications', label: `Applications (${applications.length})` },
          { id: 'apis', label: `Endpoints & OpenAPI (${endpoints.length})` },
          { id: 'findings', label: 'Findings (3)' },
          { id: 'reports', label: 'Reports (2)' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === t.id
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-semibold'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Identified Vulnerabilities</h3>
                <span className="text-xs text-brand-cyan hover:underline cursor-pointer" onClick={() => setActiveTab('findings')}>
                  View all in project
                </span>
              </div>
              <div className="space-y-3">
                <div
                  onClick={() => navigate('/dashboard/findings')}
                  className="flex justify-between items-center p-3.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">SQL Injection in Login Form</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">POST /api/v1/auth/login</div>
                  </div>
                  <SeverityBadge severity="critical" />
                </div>
                <div
                  onClick={() => navigate('/dashboard/findings')}
                  className="flex justify-between items-center p-3.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">Reflected XSS on Search Page</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">GET /catalog/search?q=</div>
                  </div>
                  <SeverityBadge severity="high" />
                </div>
                <div
                  onClick={() => navigate('/dashboard/findings')}
                  className="flex justify-between items-center p-3.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">Missing Security Headers</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">Global Response Headers</div>
                  </div>
                  <SeverityBadge severity="low" />
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-5">
              <div className="text-xs font-semibold uppercase text-text-muted mb-3">Project Metrics</div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-2xl font-bold text-red-400">1</div>
                  <div className="text-[10px] text-text-muted uppercase">Critical</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-2xl font-bold text-orange-400">1</div>
                  <div className="text-[10px] text-text-muted uppercase">High</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-2xl font-bold text-yellow-400">1</div>
                  <div className="text-[10px] text-text-muted uppercase">Medium</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-2xl font-bold text-brand-cyan">1</div>
                  <div className="text-[10px] text-text-muted uppercase">Fixed</div>
                </div>
              </div>

              <button
                onClick={() => navigate('/dashboard/reports')}
                className="w-full mt-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <FileText size={14} className="text-brand-cyan" /> View Certification Report
              </button>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Tab: Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-text-muted">Target web applications mapped into this security scope.</p>
            <button
              onClick={() => setShowAddAppModal(true)}
              className="btn-primary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Target Application
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {applications.map((app, i) => (
              <GlassCard key={i} className="p-5 border-white/10 hover:border-brand-cyan/30 transition-colors">
                <div className="flex items-center gap-2 text-brand-cyan mb-2">
                  <Globe size={18} />
                  <span className="text-xs font-semibold uppercase">{app.env}</span>
                </div>
                <h4 className="text-base font-bold text-white mb-1">{app.name}</h4>
                <div className="text-xs text-brand-cyan font-mono truncate mb-4">{app.url}</div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-text-muted">
                  <span>{app.tech}</span>
                  <span className="text-green-400">Auth Verified</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Tab: APIs & OpenAPI */}
      {activeTab === 'apis' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Discovered API Inventory</h3>
              <p className="text-xs text-text-muted">Routes analyzed during OpenAPI parsing and automated crawler discovery.</p>
            </div>
            <button
              onClick={() => setShowOpenApiModal(true)}
              className="px-3.5 py-2 rounded-xl bg-brand-purple/20 hover:bg-brand-purple/30 text-white border border-brand-purple/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud size={14} className="text-brand-purple" /> Import OpenAPI Spec
            </button>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
                <tr>
                  <th className="px-5 py-3">Method & Path</th>
                  <th className="px-4 py-3">Auth</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {endpoints.map((ep, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-5 py-3 font-mono font-medium text-white flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'POST' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {ep.method}
                      </span>
                      {ep.path}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{ep.auth}</td>
                    <td className="px-4 py-3 text-white">{ep.description}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : ep.risk === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ep.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}

      {/* Tab: Findings */}
      {activeTab === 'findings' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Project Vulnerability Queue</h3>
            <button onClick={() => navigate('/dashboard/findings')} className="text-xs text-brand-cyan hover:underline">
              Open Full Findings Manager
            </button>
          </div>
          <div className="space-y-3">
            {[
              { id: 'F-101', title: 'SQL Injection in Login Form', sev: 'critical', status: 'open' },
              { id: 'F-103', title: 'Reflected XSS on Search Page', sev: 'high', status: 'in_progress' },
              { id: 'F-104', title: 'Missing Security Headers', sev: 'low', status: 'fixed' },
            ].map(f => (
              <div
                key={f.id}
                onClick={() => navigate('/dashboard/findings')}
                className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted">{f.id}</span>
                  <span className="text-sm font-medium text-white">{f.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={f.sev} />
                  <StatusBadge status={f.status} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="grid md:grid-cols-2 gap-4">
          <GlassCard className="p-5 border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan">
                <FileText size={20} />
              </div>
              <StatusBadge status="completed" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Executive Summary — Q3 Audit</h4>
            <p className="text-xs text-text-muted mb-4">Board-level security posture summary and residual risk metrics.</p>
            <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs">
              <span className="text-text-muted">Generated: Sep 28</span>
              <button
                onClick={() => navigate('/dashboard/reports')}
                className="text-brand-cyan hover:underline font-semibold"
              >
                View & Download PDF
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple">
                <FileText size={20} />
              </div>
              <StatusBadge status="completed" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Technical Pentest Findings Log</h4>
            <p className="text-xs text-text-muted mb-4">Raw HTTP proofs of concept, CVSS vectors, and developer patches.</p>
            <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs">
              <span className="text-text-muted">Generated: Sep 26</span>
              <button
                onClick={() => navigate('/dashboard/reports')}
                className="text-brand-cyan hover:underline font-semibold"
              >
                View & Download PDF
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Add App Modal */}
      {showAddAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 border-brand-cyan/30 shadow-2xl relative">
            <button
              onClick={() => setShowAddAppModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Add Target Web Application</h3>
            <form onSubmit={handleAddApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Application Name</label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="e.g. User Billing Microservice"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">URL or Domain</label>
                <input
                  type="url"
                  value={newAppUrl}
                  onChange={(e) => setNewAppUrl(e.target.value)}
                  placeholder="https://billing.acmecorp.local"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono outline-none focus:border-brand-cyan"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowAddAppModal(false)} className="px-4 py-2 text-xs text-text-muted">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2 rounded-xl">Add Application</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* OpenAPI Import Modal */}
      {showOpenApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-brand-purple/40 shadow-2xl relative">
            <button
              onClick={() => setShowOpenApiModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <UploadCloud size={20} className="text-brand-purple" />
              <h3 className="text-lg font-bold text-white">Import OpenAPI / Swagger Spec</h3>
            </div>
            <p className="text-xs text-text-muted mb-4">Paste JSON/YAML OpenAPI definition or select a demo schema to auto-populate endpoints.</p>

            <form onSubmit={handleParseOpenApi} className="space-y-4">
              <textarea
                value={openApiSpec}
                onChange={(e) => setOpenApiSpec(e.target.value)}
                placeholder="openapi: 3.0.0&#10;info:&#10;  title: Acme API&#10;  version: 2.0&#10;paths:&#10;  /api/v2/orders: ..."
                rows={6}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-brand-purple"
              />
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setOpenApiSpec('openapi: 3.0.0\ninfo:\n  title: Acme v2 Core\npaths:\n  /api/v2/orders/checkout:\n    post:\n      summary: Process order\n  /api/v2/inventory/{sku}:\n    get:\n      summary: Check stock')}
                  className="text-xs text-brand-purple hover:underline"
                >
                  Load Sample Spec
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowOpenApiModal(false)} className="px-3 py-1.5 text-xs text-text-muted">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-4 py-2 rounded-xl">Parse & Add Endpoints</button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
