import React, { useState } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SeverityBadge, StatusBadge } from '../../../components/ui/Badge';
import {
  ShieldCheck, AlertTriangle, ArrowRight, FileText,
  RotateCcw, Download, CheckCircle2, Bug, ArrowLeft, X
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const DISCOVERED_FINDINGS = [
  {
    id: 'F-101',
    title: 'SQL Injection in Login Form',
    severity: 'critical',
    status: 'open',
    cvss: 9.8,
    endpoint: 'POST /api/v1/auth/login',
    description: 'The username parameter is directly concatenated into a dynamic SQL query without parameterization.',
    evidence: "POST /api/v1/auth/login HTTP/1.1\nHost: portal.acmecorp.local\nContent-Type: application/json\n\n{\"username\": \"admin' OR '1'='1' --\", \"password\": \"test\"}",
    recommendation: 'Use parameterized queries / prepared statements with ORM bindings.'
  },
  {
    id: 'F-102',
    title: 'IDOR in User Profile Endpoint',
    severity: 'high',
    status: 'in_progress',
    cvss: 8.5,
    endpoint: 'GET /api/v1/users/:id/billing',
    description: 'Access control check is absent when querying billing information by ID, allowing horizontal privilege escalation.',
    evidence: 'GET /api/v1/users/usr-9812/billing HTTP/1.1\nAuthorization: Bearer token_for_usr_1024',
    recommendation: 'Verify requester user context against the target resource owner ID.'
  },
  {
    id: 'F-103',
    title: 'Reflected Cross-Site Scripting (XSS)',
    severity: 'medium',
    status: 'ready_for_retest',
    cvss: 6.1,
    endpoint: 'GET /search?q=',
    description: 'The search query parameter is reflected into the HTML DOM without sanitization.',
    evidence: 'GET /search?q=%3Cscript%3Ealert(document.domain)%3C/script%3E',
    recommendation: 'Contextually HTML-encode user input before rendering in DOM.'
  },
  {
    id: 'F-104',
    title: 'Missing Content-Security-Policy & Strict-Transport-Security',
    severity: 'low',
    status: 'open',
    cvss: 3.8,
    endpoint: 'Global Response Headers',
    description: 'Defensive headers are omitted, leaving clients vulnerable to clickjacking and MITM downgrade attacks.',
    evidence: 'HTTP/1.1 200 OK\nServer: Nginx\n(Missing CSP & HSTS)',
    recommendation: 'Enforce Content-Security-Policy and Strict-Transport-Security: max-age=31536000.'
  }
];

export const ScanResults: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <Link to="/dashboard/projects" className="hover:text-white flex items-center gap-1">
              <ArrowLeft size={12} /> Projects
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Assessment {id || 'scan-101'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck size={24} className="text-green-400" /> Assessment Results & Findings
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Audit finished against <span className="text-white font-mono">https://portal.acmecorp.local</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/dashboard/remediation')}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            Remediation Board <ArrowRight size={14} />
          </button>
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="btn-primary text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-lg shadow-brand-cyan/20"
          >
            <FileText size={14} /> Generate Report
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-red-500/20 bg-red-500/5">
          <div className="text-xs text-text-muted font-medium">Critical Risk</div>
          <div className="text-3xl font-bold text-red-400 mt-1">1</div>
          <div className="text-[11px] text-text-muted mt-1">Requires immediate hotfix</div>
        </GlassCard>

        <GlassCard className="p-4 border-orange-500/20 bg-orange-500/5">
          <div className="text-xs text-text-muted font-medium">High Risk</div>
          <div className="text-3xl font-bold text-orange-400 mt-1">1</div>
          <div className="text-[11px] text-text-muted mt-1">Access control violation</div>
        </GlassCard>

        <GlassCard className="p-4 border-yellow-500/20 bg-yellow-500/5">
          <div className="text-xs text-text-muted font-medium">Medium Risk</div>
          <div className="text-3xl font-bold text-yellow-400 mt-1">1</div>
          <div className="text-[11px] text-text-muted mt-1">Reflected input sanitation</div>
        </GlassCard>

        <GlassCard className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="text-xs text-text-muted font-medium">Low / Informational</div>
          <div className="text-3xl font-bold text-blue-400 mt-1">1</div>
          <div className="text-[11px] text-text-muted mt-1">Defensive header tuning</div>
        </GlassCard>
      </div>

      {/* Vulnerabilities Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-base font-bold text-white">Discovered Vulnerability Details</h3>
            <p className="text-xs text-text-muted mt-0.5">Click any finding to view technical proof-of-concept and remediation</p>
          </div>
          <span className="text-xs text-text-muted font-mono">4 Findings Generated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
              <tr>
                <th className="px-5 py-3">ID & Title</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">CVSS</th>
                <th className="px-4 py-3">Affected Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {DISCOVERED_FINDINGS.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedFinding(f)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white group-hover:text-brand-cyan transition-colors">
                      <span className="text-text-muted font-mono mr-2">{f.id}</span>
                      {f.title}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-white">
                    {f.cvss}
                  </td>
                  <td className="px-4 py-3.5 text-text-muted font-mono truncate max-w-[200px]">
                    {f.endpoint}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-brand-cyan group-hover:underline font-semibold flex items-center justify-end gap-1">
                      Inspect <ArrowRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Finding Detail Modal */}
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
              <span className="text-xs font-mono text-text-muted">{selectedFinding.id}</span>
              <SeverityBadge severity={selectedFinding.severity} />
              <StatusBadge status={selectedFinding.status} />
              <span className="text-xs text-text-muted ml-auto font-mono">CVSS {selectedFinding.cvss}</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{selectedFinding.title}</h2>
            <div className="text-xs text-brand-cyan font-mono mb-4">{selectedFinding.endpoint}</div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Vulnerability Impact</div>
                <p className="text-white leading-relaxed">{selectedFinding.description}</p>
              </div>

              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Technical Proof of Concept</div>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-green-300 overflow-x-auto whitespace-pre">
                  {selectedFinding.evidence}
                </pre>
              </div>

              <div>
                <div className="text-text-muted font-semibold uppercase tracking-wider mb-1">Remediation Guidance</div>
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
                Send to Remediation Kanban <ArrowRight size={14} />
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
