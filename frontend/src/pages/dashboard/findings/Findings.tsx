import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge, SeverityBadge } from '../../../components/ui/Badge';
import {
  ShieldAlert, Plus, Search, Filter, ArrowRight,
  CheckCircle2, RotateCcw, AlertTriangle, User, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';

export interface FindingItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'ready_for_retest' | 'fixed';
  project: string;
  asset: string;
  date: string;
  cvss: number;
  description: string;
  evidence: string;
  recommendation: string;
  assignee: string;
}

const INITIAL_FINDINGS: FindingItem[] = [
  {
    id: 'F-101',
    title: 'SQL Injection in Login Form',
    severity: 'critical',
    status: 'open',
    project: 'Main Web Portal Security Audit',
    asset: 'POST /api/v1/auth/login',
    date: 'Today',
    cvss: 9.8,
    description: 'Authentication bypass possible via unsanitized SQL concatenation on the username field.',
    evidence: "POST /api/login HTTP/1.1\nContent-Type: application/json\n\n{\"username\": \"admin' OR '1'='1' --\", \"password\": \"test\"}",
    recommendation: 'Use parameterized queries / prepared statements with ORM bindings.',
    assignee: 'Alex Rivera'
  },
  {
    id: 'F-102',
    title: 'IDOR in User Profile Endpoint',
    severity: 'high',
    status: 'in_progress',
    project: 'Mobile API Q3 Review',
    asset: 'GET /api/v1/users/:id/billing',
    date: 'Yesterday',
    cvss: 8.5,
    description: 'Access control check is absent when querying billing information by ID, allowing horizontal privilege escalation.',
    evidence: 'GET /api/v1/users/usr-9812/billing HTTP/1.1\nAuthorization: Bearer token_for_usr_1024',
    recommendation: 'Verify requester user context against the target resource owner ID.',
    assignee: 'Alex Rivera'
  },
  {
    id: 'F-103',
    title: 'Reflected Cross-Site Scripting (XSS)',
    severity: 'medium',
    status: 'ready_for_retest',
    project: 'Main Web Portal Security Audit',
    asset: 'GET /catalog/search?q=',
    date: 'Sep 27',
    cvss: 6.1,
    description: 'The search query parameter is reflected into the HTML DOM without sanitization.',
    evidence: 'GET /search?q=%3Cscript%3Ealert(document.domain)%3C/script%3E',
    recommendation: 'Contextually HTML-encode user input before rendering in DOM.',
    assignee: 'Dev Team'
  },
  {
    id: 'F-104',
    title: 'Missing Security Headers (CSP & HSTS)',
    severity: 'low',
    status: 'fixed',
    project: 'Payment Gateway Integration',
    asset: 'Global Response Headers',
    date: 'Sep 25',
    cvss: 3.4,
    description: 'Strict-Transport-Security and Content-Security-Policy headers were not enforced in HTTP responses.',
    evidence: 'HTTP/1.1 200 OK\nServer: nginx\n(Missing HSTS & CSP)',
    recommendation: 'Configure strict HSTS (max-age=31536000) and CSP headers.',
    assignee: 'Devops Lead'
  },
  {
    id: 'F-105',
    title: 'Exposed Internal Metrics Endpoint',
    severity: 'medium',
    status: 'open',
    project: 'Internal HR Tool Assessment',
    asset: 'GET /metrics',
    date: 'Sep 24',
    cvss: 5.3,
    description: 'Prometheus metrics endpoint is publicly reachable without authentication.',
    evidence: 'GET /metrics HTTP/1.1\nHTTP/1.1 200 OK\nprocess_cpu_seconds_total 1420.21',
    recommendation: 'Restrict /metrics to internal management VPC CIDR.',
    assignee: 'Alex Rivera'
  },
  {
    id: 'F-106',
    title: 'Weak JWT Secret Key Generation',
    severity: 'high',
    status: 'open',
    project: 'Mobile API Q3 Review',
    asset: 'POST /api/v1/auth/token',
    date: 'Sep 22',
    cvss: 7.9,
    description: 'JWT signing secret key was determined to be brute-forceable with offline dictionary attacks.',
    evidence: 'JWT Header: {"alg":"HS256","typ":"JWT"}\nPayload: {"id":"admin"}\nRecovered Key: "secret123"',
    recommendation: 'Generate minimum 256-bit entropy random keys stored in encrypted secrets vault.',
    assignee: 'Security Lead'
  }
];

export const Findings: React.FC = () => {
  const navigate = useNavigate();
  const [findings, setFindings] = useState<FindingItem[]>(INITIAL_FINDINGS);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null);

  // Load findings from MongoDB
  useEffect(() => {
    const fetchFindings = async () => {
      try {
        const { data } = await api.get('/findings');
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: FindingItem[] = data.data.map((f: any, idx: number) => ({
            id: f._id || `F-${101 + idx}`,
            title: f.title,
            severity: (f.severity === 'informational' ? 'low' : f.severity) as FindingItem['severity'],
            status: (['open', 'in_progress', 'ready_for_retest', 'fixed'].includes(f.status) ? f.status : 'open') as FindingItem['status'],
            project: f.projectId?.name || 'Main Web Portal Security Audit',
            asset: f.affectedEndpoint || f.affectedAsset || 'Target Endpoint',
            date: new Date(f.createdAt || Date.now()).toLocaleDateString(),
            cvss: f.severity === 'critical' ? 9.8 : f.severity === 'high' ? 8.2 : f.severity === 'medium' ? 5.5 : 3.0,
            description: f.description || '',
            evidence: f.evidence || '',
            recommendation: f.recommendation || '',
            assignee: f.assignedDeveloper?.name || 'Alex Rivera'
          }));
          setFindings(mapped);
        }
      } catch (err) {
        // Fallback to initial
      }
    };
    fetchFindings();
  }, []);

  // Create Finding Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFinding, setNewFinding] = useState({
    title: '',
    severity: 'high' as FindingItem['severity'],
    project: 'Main Web Portal Security Audit',
    asset: '',
    description: '',
    recommendation: '',
  });

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFinding.title) return;

    try {
      // Find a project to associate with
      let targetProjectId = '';
      try {
        const pRes = await api.get('/projects');
        if (pRes.data?.data?.[0]?._id) {
          targetProjectId = pRes.data.data[0]._id;
        }
      } catch (err) {}

      if (targetProjectId) {
        const res = await api.post('/findings', {
          title: newFinding.title,
          severity: newFinding.severity,
          projectId: targetProjectId,
          affectedEndpoint: newFinding.asset || 'POST /api/v1/resource',
          description: newFinding.description || 'Vulnerability identified during automated scan.',
          recommendation: newFinding.recommendation || 'Follow defense-in-depth principles.',
          status: 'open'
        });
        if (res.data?.data) {
          const f = res.data.data;
          const created: FindingItem = {
            id: f._id || 'F-' + (100 + findings.length + 1),
            title: f.title,
            severity: f.severity,
            status: 'open',
            project: newFinding.project,
            asset: f.affectedEndpoint,
            date: 'Just now',
            cvss: f.severity === 'critical' ? 9.2 : f.severity === 'high' ? 7.5 : 5.0,
            description: f.description,
            evidence: 'Manual penetration test verification.',
            recommendation: f.recommendation,
            assignee: 'Alex Rivera'
          };
          setFindings(prev => [created, ...prev]);
        }
      } else {
        throw new Error('No project found');
      }
    } catch (err) {
      const created: FindingItem = {
        id: 'F-' + (100 + findings.length + 1),
        title: newFinding.title,
        severity: newFinding.severity,
        status: 'open',
        project: newFinding.project,
        asset: newFinding.asset || 'Target Asset',
        date: 'Just now',
        cvss: newFinding.severity === 'critical' ? 9.2 : newFinding.severity === 'high' ? 7.5 : 5.0,
        description: newFinding.description || 'Manually logged security finding.',
        evidence: 'Manual penetration test verification.',
        recommendation: newFinding.recommendation || 'Remediate vulnerability according to OWASP guidelines.',
        assignee: 'Alex Rivera'
      };
      setFindings([created, ...findings]);
    }

    setShowCreateModal(false);
    setNewFinding({
      title: '',
      severity: 'high',
      project: 'Main Web Portal Security Audit',
      asset: '',
      description: '',
      recommendation: '',
    });
  };

  const updateFindingStatus = (findingId: string, newStatus: FindingItem['status']) => {
    setFindings(prev =>
      prev.map(f => (f.id === findingId ? { ...f, status: newStatus } : f))
    );
    if (selectedFinding && selectedFinding.id === findingId) {
      setSelectedFinding(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const filtered = findings.filter(f => {
    const matchSev = severityFilter === 'All' || f.severity === severityFilter.toLowerCase();
    const matchStat = statusFilter === 'All' || f.status === statusFilter.toLowerCase().replace(/ /g, '_');
    const matchSearch =
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.asset.toLowerCase().includes(search.toLowerCase()) ||
      f.project.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchStat && matchSearch;
  });

  const criticalCount = findings.filter(f => f.severity === 'critical' && f.status !== 'fixed').length;
  const highCount = findings.filter(f => f.severity === 'high' && f.status !== 'fixed').length;
  const mediumCount = findings.filter(f => f.severity === 'medium' && f.status !== 'fixed').length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Vulnerability Findings</h1>
          <p className="text-sm text-text-muted">Review, assign, and verify security findings across all target scopes.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> {criticalCount} Critical
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> {highCount} High
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs font-bold text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span> {mediumCount} Medium
            </span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
          >
            <Plus size={16} /> Create Finding
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <GlassCard className="p-4 border-white/10 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Filter size={14} />
          <span>Filters:</span>
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-background-darker border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-cyan"
        >
          <option>All Severities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background-darker border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-cyan"
        >
          <option>All Statuses</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Ready for Retest</option>
          <option>Fixed</option>
        </select>

        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, path, CVE, or ID..."
            className="w-full bg-background-darker border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-text-muted outline-none focus:border-brand-cyan"
          />
        </div>
      </GlassCard>

      {/* Findings Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">ID & Title</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">CVSS</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Project</th>
                <th className="px-4 py-3.5">Asset / Endpoint</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedFinding(f)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-muted font-bold text-[11px]">{f.id}</span>
                      <span className="font-semibold text-white group-hover:text-brand-cyan transition-colors truncate max-w-sm">
                        {f.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-white">
                    {f.cvss}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="px-4 py-4 text-text-muted truncate max-w-[150px]">
                    {f.project}
                  </td>
                  <td className="px-4 py-4 font-mono text-text-muted truncate max-w-[180px]">
                    {f.asset}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-brand-cyan group-hover:underline font-semibold flex items-center justify-end gap-1">
                      Inspect <ArrowRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-text-muted">
          <span>Showing {filtered.length} of {findings.length} findings</span>
          <span className="text-brand-cyan font-medium">Click row for full drawer & status workflow</span>
        </div>
      </GlassCard>

      {/* Finding Detail Modal / Drawer */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-2xl p-6 border-brand-cyan/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedFinding(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-text-muted">{selectedFinding.id}</span>
              <SeverityBadge severity={selectedFinding.severity} />
              <StatusBadge status={selectedFinding.status} />
              <span className="text-xs text-text-muted ml-auto font-mono">CVSS {selectedFinding.cvss}</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{selectedFinding.title}</h2>
            <div className="text-xs text-brand-cyan font-mono mb-4">{selectedFinding.asset}</div>

            {/* Quick Status Workflow Changer */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-text-muted font-medium">Update Finding Status:</span>
              <div className="flex items-center gap-1.5">
                {(['open', 'in_progress', 'ready_for_retest', 'fixed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateFindingStatus(selectedFinding.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      selectedFinding.status === st
                        ? 'bg-brand-cyan text-black shadow-sm'
                        : 'bg-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Impact & Description</div>
                <p className="text-white leading-relaxed">{selectedFinding.description}</p>
              </div>

              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Technical Proof of Concept</div>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-green-300 overflow-x-auto whitespace-pre">
                  {selectedFinding.evidence}
                </pre>
              </div>

              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">AI Remediation Recommendation</div>
                <div className="p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan leading-relaxed">
                  💡 {selectedFinding.recommendation}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-text-muted border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-brand-purple" /> Assigned: <strong className="text-white">{selectedFinding.assignee}</strong>
                </span>
                <span>Project: <strong className="text-white">{selectedFinding.project}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedFinding(null)}
                className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedFinding(null);
                  navigate('/dashboard/retest');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} className="text-brand-cyan" /> Retesting Queue
              </button>
              <button
                onClick={() => {
                  setSelectedFinding(null);
                  navigate('/dashboard/remediation');
                }}
                className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
              >
                Remediation Board <ArrowRight size={14} />
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Create Finding Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-brand-cyan/30 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={20} className="text-brand-cyan" />
              <h3 className="text-lg font-bold text-white">Log Manual Finding</h3>
            </div>

            <form onSubmit={handleCreateFinding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Vulnerability Title</label>
                <input
                  type="text"
                  value={newFinding.title}
                  onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                  placeholder="e.g. Cross-Site Scripting in Comment Field"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Severity</label>
                  <select
                    value={newFinding.severity}
                    onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value as any })}
                    className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Affected Endpoint</label>
                  <input
                    type="text"
                    value={newFinding.asset}
                    onChange={(e) => setNewFinding({ ...newFinding, asset: e.target.value })}
                    placeholder="e.g. POST /api/comments"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono outline-none focus:border-brand-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Impact & Description</label>
                <textarea
                  value={newFinding.description}
                  onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                  placeholder="Explain the security risk and impact..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs text-text-muted">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2 rounded-xl">Save Finding</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
