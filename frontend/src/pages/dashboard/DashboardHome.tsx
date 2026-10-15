import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  ShieldCheck, Bug, Activity, CheckCircle2, ArrowRight,
  TrendingUp, ShieldAlert, FileText, Plus, ExternalLink, X
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D'>('7D');
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  const findingsList = [
    {
      id: 'F-101',
      title: 'SQL Injection in Login Form',
      severity: 'critical',
      status: 'open',
      project: 'Main Web Portal Security Audit',
      endpoint: 'POST /api/login',
      cvss: 9.8,
      date: 'Today',
      description: 'The username parameter is directly concatenated into a dynamic SQL query without parameterization.',
      evidence: "POST /api/login HTTP/1.1\nHost: portal.sentrix.local\nContent-Type: application/json\n\n{\"username\": \"admin' OR '1'='1' --\", \"password\": \"test\"}",
      recommendation: 'Use parameterized queries / prepared statements with ORM bindings.'
    },
    {
      id: 'F-102',
      title: 'IDOR in User Profile Endpoint',
      severity: 'high',
      status: 'in_progress',
      project: 'Mobile API Q3 Review',
      endpoint: 'GET /api/v1/users/:id/billing',
      cvss: 8.5,
      date: 'Yesterday',
      description: 'Access control check is absent when querying billing information by ID, allowing horizontal privilege escalation.',
      evidence: 'GET /api/v1/users/usr-9812/billing HTTP/1.1\nAuthorization: Bearer token_for_usr_1024',
      recommendation: 'Verify requester user context against the target resource owner ID.'
    },
    {
      id: 'F-103',
      title: 'Reflected Cross-Site Scripting (XSS)',
      severity: 'medium',
      status: 'ready_for_retest',
      project: 'Main Web Portal Security Audit',
      endpoint: 'GET /search?q=',
      cvss: 6.1,
      date: 'Sep 27',
      description: 'The search query parameter is reflected into the HTML DOM without sanitization.',
      evidence: 'GET /search?q=%3Cscript%3Ealert(document.domain)%3C/script%3E',
      recommendation: 'Contextually HTML-encode user input before rendering in DOM.'
    },
    {
      id: 'F-104',
      title: 'Missing Security Headers (CSP & HSTS)',
      severity: 'low',
      status: 'fixed',
      project: 'Payment Gateway Integration',
      endpoint: 'Global Response Headers',
      cvss: 3.4,
      date: 'Sep 25',
      description: 'Strict-Transport-Security and Content-Security-Policy headers were not enforced in HTTP responses.',
      evidence: 'HTTP/1.1 200 OK\nServer: nginx\n(Missing HSTS & CSP)',
      recommendation: 'Configure strict HSTS (max-age=31536000) and CSP headers.'
    },
    {
      id: 'F-105',
      title: 'Exposed Internal Metrics Endpoint',
      severity: 'medium',
      status: 'open',
      project: 'Internal HR Tool Assessment',
      endpoint: 'GET /metrics',
      cvss: 5.3,
      date: 'Sep 24',
      description: 'Prometheus metrics endpoint is publicly reachable without authentication.',
      evidence: 'GET /metrics HTTP/1.1\nHTTP/1.1 200 OK\nprocess_cpu_seconds_total 1420.21',
      recommendation: 'Restrict /metrics to internal management VPC CIDR.'
    }
  ];

  const projectsList = [
    { id: '1', name: 'Main Web Portal Security Audit', env: 'Production', status: 'active', openCount: 3 },
    { id: '2', name: 'Mobile API Q3 Review', env: 'Staging', status: 'in_progress', openCount: 1 },
    { id: '3', name: 'Payment Gateway Integration', env: 'Staging', status: 'active', openCount: 0 },
    { id: '4', name: 'Suspicious Document Analysis', env: 'Sandbox', status: 'completed', openCount: 1 },
    { id: '5', name: 'Internal HR Tool Assessment', env: 'Development', status: 'active', openCount: 1 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            Operational Status: All Systems Operational
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Security Overview
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Welcome back, <span className="text-white font-medium">{user?.name || 'Security Lead'}</span>. Showing real-time posture and telemetry for Acme Corp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/assessment/new"
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20"
          >
            <Plus size={16} /> New Assessment
          </Link>
          <Link
            to="/dashboard/malware"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Bug size={16} className="text-brand-purple" /> Upload Sample
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link to="/dashboard/findings" className="block group">
          <GlassCard className="p-5 border-white/10 group-hover:border-brand-cyan/40 transition-all duration-200">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-medium">
              <span>Threats Mitigated</span>
              <ShieldCheck size={18} className="text-brand-cyan" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">12.4K</span>
              <span className="text-xs text-green-400 font-semibold flex items-center gap-0.5">
                <TrendingUp size={12} /> +8.2%
              </span>
            </div>
            <div className="text-[11px] text-text-muted mt-2">Active defensive rules deployed</div>
          </GlassCard>
        </Link>

        <Link to="/dashboard/projects" className="block group">
          <GlassCard className="p-5 border-white/10 group-hover:border-brand-cyan/40 transition-all duration-200">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-medium">
              <span>Active Projects</span>
              <Activity size={18} className="text-brand-purple" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">6</span>
              <span className="text-xs text-brand-cyan font-semibold">2 Staging / 4 Prod</span>
            </div>
            <div className="text-[11px] text-text-muted mt-2">Continuous penetration scopes</div>
          </GlassCard>
        </Link>

        <Link to="/dashboard/findings" className="block group">
          <GlassCard className="p-5 border-white/10 group-hover:border-brand-cyan/40 transition-all duration-200">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-medium">
              <span>Open Findings</span>
              <ShieldAlert size={18} className="text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">5</span>
              <span className="text-xs text-red-400 font-semibold">1 Critical / 1 High</span>
            </div>
            <div className="text-[11px] text-text-muted mt-2">1 awaiting retest verification</div>
          </GlassCard>
        </Link>

        <Link to="/dashboard/reports" className="block group">
          <GlassCard className="p-5 border-white/10 group-hover:border-brand-cyan/40 transition-all duration-200">
            <div className="flex items-center justify-between text-xs text-text-muted mb-2 font-medium">
              <span>Reports Available</span>
              <FileText size={18} className="text-brand-magenta" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">3</span>
              <span className="text-xs text-green-400 font-semibold">Ready for download</span>
            </div>
            <div className="text-[11px] text-text-muted mt-2">Executive & technical PDFs</div>
          </GlassCard>
        </Link>
      </div>

      {/* Main Grid: Chart & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telemetry Chart Card */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Detection & Mitigation Telemetry</h3>
                <p className="text-xs text-text-muted mt-0.5">Automated probes vs remediated attack surfaces</p>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                {(['7D', '30D', '90D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      chartRange === r ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Chart */}
            <div className="h-64 relative w-full flex items-end justify-between px-2 text-xs text-text-muted pt-4">
              <svg viewBox="0 0 100 45" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="chartPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Cyan Area (Mitigated) */}
                <path
                  d="M0,35 Q15,20 30,28 T60,12 T85,18 T100,8 L100,45 L0,45 Z"
                  fill="url(#chartCyan)"
                />
                <path
                  d="M0,35 Q15,20 30,28 T60,12 T85,18 T100,8"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="0.8"
                />

                {/* Purple Area (Detected) */}
                <path
                  d="M0,30 Q20,15 40,22 T70,8 T90,14 T100,5 L100,45 L0,45 Z"
                  fill="url(#chartPurple)"
                />
                <path
                  d="M0,30 Q20,15 40,22 T70,8 T90,14 T100,5"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="0.8"
                />
              </svg>

              <div className="absolute top-2 right-4 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-brand-cyan">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan"></span> Mitigations Verified
                </span>
                <span className="flex items-center gap-1.5 text-brand-purple">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-purple"></span> Inbound Probes Blocked
                </span>
              </div>

              <span className="absolute bottom-1 left-2 text-[10px]">Mon</span>
              <span className="absolute bottom-1 left-1/4 text-[10px]">Wed</span>
              <span className="absolute bottom-1 left-2/4 text-[10px]">Fri</span>
              <span className="absolute bottom-1 left-3/4 text-[10px]">Sun</span>
              <span className="absolute bottom-1 right-2 text-[10px]">Live</span>
            </div>
          </GlassCard>

          {/* Recent Findings Table with Drawer click */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-base font-bold text-white">Recent Security Findings</h3>
                <p className="text-xs text-text-muted mt-0.5">Click any row to inspect technical details and AI remediation</p>
              </div>
              <Link to="/dashboard/findings" className="text-xs font-semibold text-brand-cyan hover:underline flex items-center gap-1">
                View All Findings <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10 tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Finding</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {findingsList.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFinding(f)}
                      className="hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white group-hover:text-brand-cyan transition-colors truncate max-w-xs">
                          {f.title}
                        </div>
                        <div className="text-xs text-text-muted font-mono">{f.endpoint}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={f.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-muted truncate max-w-[140px]">
                        {f.project}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs text-brand-cyan group-hover:underline font-medium inline-flex items-center gap-1">
                          Inspect <ArrowRight size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Column: Active Projects & Activity */}
        <div className="space-y-6">
          {/* Active Projects */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Active Projects</h3>
              <Link to="/dashboard/projects" className="text-xs text-brand-cyan hover:underline">
                All ({projectsList.length})
              </Link>
            </div>

            <div className="space-y-3">
              {projectsList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/dashboard/projects/${p.id}`)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-brand-cyan/30 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-semibold text-white truncate hover:text-brand-cyan transition-colors">
                      {p.name}
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                        {p.env}
                      </span>
                      <span>{p.openCount} open issues</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>

            <Link
              to="/dashboard/projects"
              className="mt-4 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors block text-center"
            >
              <Plus size={14} /> Create or Manage Projects
            </Link>
          </GlassCard>

          {/* Recent Operations Feed */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-white mb-4">Operations Feed</h3>
            <div className="space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="p-1.5 rounded-lg bg-brand-cyan/20 text-brand-cyan shrink-0 mt-0.5">
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div className="text-white font-medium">Scan completed on Main Web Portal</div>
                  <div className="text-text-muted">3 vulnerabilities identified • 10m ago</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-1.5 rounded-lg bg-green-500/20 text-green-400 shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <div className="text-white font-medium">Developer fixed Missing Headers</div>
                  <div className="text-text-muted">Verified by automated retest • 1h ago</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-purple shrink-0 mt-0.5">
                  <Bug size={14} />
                </div>
                <div>
                  <div className="text-white font-medium">Malware Case: invoice_2026.pdf.exe</div>
                  <div className="text-text-muted">Static indicators classified • 3h ago</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-1.5 rounded-lg bg-brand-magenta/20 text-brand-magenta shrink-0 mt-0.5">
                  <FileText size={14} />
                </div>
                <div>
                  <div className="text-white font-medium">Q3 Assessment Report Generated</div>
                  <div className="text-text-muted">Ready for client stakeholder download • 5h ago</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Finding Detail Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <GlassCard className="w-full max-w-2xl p-6 border-brand-cyan/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedFinding(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-text-muted">{selectedFinding.id}</span>
              <SeverityBadge severity={selectedFinding.severity} />
              <StatusBadge status={selectedFinding.status} />
              <span className="text-xs text-text-muted ml-auto font-mono">CVSS {selectedFinding.cvss}</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{selectedFinding.title}</h2>
            <div className="text-xs text-brand-cyan font-mono mb-4">{selectedFinding.endpoint}</div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Description</div>
                <p className="text-white leading-relaxed">{selectedFinding.description}</p>
              </div>

              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Technical Evidence</div>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-green-300 overflow-x-auto whitespace-pre">
                  {selectedFinding.evidence}
                </pre>
              </div>

              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">AI Remediation Advice</div>
                <div className="p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan leading-relaxed">
                  💡 {selectedFinding.recommendation}
                </div>
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
                  navigate('/dashboard/remediation');
                }}
                className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
              >
                Go to Remediation Board <ArrowRight size={14} />
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
