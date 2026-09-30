import React, { useState } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SeverityBadge, StatusBadge } from '../../../components/ui/Badge';
import {
  RotateCcw, CheckCircle2, XCircle, AlertTriangle,
  Play, Terminal, ArrowRight, ShieldCheck, GitCommit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RetestFinding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  endpoint: string;
  project: string;
  commitRef: string;
  devNotes: string;
}

const INITIAL_RETESTS: RetestFinding[] = [
  {
    id: 'F-103',
    title: 'Reflected Cross-Site Scripting (XSS)',
    severity: 'medium',
    endpoint: 'GET /catalog/search?q=',
    project: 'Main Web Portal Security Audit',
    commitRef: 'PR #142: DOMPurify & HTML encoding applied',
    devNotes: 'Sanitized search query reflections using contextual encoding.'
  },
  {
    id: 'F-102',
    title: 'IDOR in User Profile Endpoint',
    severity: 'high',
    endpoint: 'GET /api/v1/users/:id/billing',
    project: 'Mobile API Q3 Review',
    commitRef: 'commit 4a8f9c2: Add req.user context checks',
    devNotes: 'Enforced tenant boundary matching in controller layer.'
  }
];

export const RetestPage: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<RetestFinding[]>(INITIAL_RETESTS);
  const [activeTestingId, setActiveTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; status: 'passed' | 'failed'; log: string } | null>(null);
  const [history, setHistory] = useState([
    { id: 'F-104', title: 'Missing Security Headers (CSP & HSTS)', result: 'passed', date: 'Sep 27, 2026', engineer: 'Jane Smith' },
    { id: 'F-098', title: 'CORS Wildcard Vulnerability', result: 'passed', date: 'Sep 20, 2026', engineer: 'Jane Smith' }
  ]);

  const handleRunRetest = (f: RetestFinding) => {
    setActiveTestingId(f.id);
    setTestResult(null);

    setTimeout(() => {
      setActiveTestingId(null);
      setTestResult({
        id: f.id,
        status: 'passed',
        log: `[RETEST VERIFICATION] Sending target payload probe to ${f.endpoint}...\nHTTP/1.1 200 OK\nPayload was properly encoded. No script execution was triggered.\n[RESULT] Vulnerability successfully mitigated.`
      });
    }, 1800);
  };

  const handleMarkVerified = (findingId: string, passed: boolean) => {
    const verified = queue.find(q => q.id === findingId);
    if (!verified) return;

    setQueue(prev => prev.filter(q => q.id !== findingId));
    setHistory(prev => [
      {
        id: verified.id,
        title: verified.title,
        result: passed ? 'passed' : 'failed',
        date: 'Just now',
        engineer: 'Jane Smith'
      },
      ...prev
    ]);
    setTestResult(null);
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan font-medium mb-1">
            <RotateCcw size={13} /> Security Verification Queue
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Retesting & Verification</h1>
          <p className="text-sm text-text-muted">
            Re-run exact vulnerability payloads against modified target endpoints to confirm patch effectiveness.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/reports')}
          className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
        >
          View Verified Reports <ArrowRight size={14} />
        </button>
      </div>

      {/* Main Retest Queue */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Awaiting Security Retest ({queue.length})</span>
        </h3>

        {queue.map((f) => (
          <GlassCard key={f.id} className="p-5 border-white/10 hover:border-brand-cyan/30 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-text-muted">{f.id}</span>
                  <SeverityBadge severity={f.severity} />
                  <span className="text-xs text-text-muted font-medium">• {f.project}</span>
                </div>
                <h4 className="text-base font-bold text-white truncate">{f.title}</h4>
                <div className="text-xs text-brand-cyan font-mono">{f.endpoint}</div>

                <div className="flex items-center gap-3 pt-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1 font-mono text-green-300 bg-white/5 px-2 py-0.5 rounded-md">
                    <GitCommit size={12} /> {f.commitRef}
                  </span>
                  <span className="truncate">Notes: {f.devNotes}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={activeTestingId === f.id}
                  onClick={() => handleRunRetest(f)}
                  className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 font-semibold"
                >
                  <Play size={14} className={activeTestingId === f.id ? 'animate-spin' : ''} />
                  {activeTestingId === f.id ? 'Verifying Probe...' : 'Execute Retest'}
                </button>
              </div>
            </div>

            {/* Live Verification Console Output */}
            {testResult && testResult.id === f.id && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Terminal size={14} className="text-brand-cyan" /> Retest Probe Execution Log
                  </span>
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Probe Passed (Vulnerability Resolved)
                  </span>
                </div>

                <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-green-300 whitespace-pre overflow-x-auto">
                  {testResult.log}
                </pre>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleMarkVerified(f.id, false)}
                    className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle size={14} /> Reopen (Failed)
                  </button>
                  <button
                    onClick={() => handleMarkVerified(f.id, true)}
                    className="btn-primary text-xs px-4 py-1.5 rounded-xl font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Approve & Mark Fixed
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        ))}

        {queue.length === 0 && (
          <GlassCard className="p-10 text-center text-text-muted">
            <CheckCircle2 size={36} className="text-green-400 mx-auto mb-3" />
            <div className="text-base font-bold text-white mb-1">Queue Clear</div>
            <p className="text-xs">No vulnerabilities currently marked Ready for Retest.</p>
          </GlassCard>
        )}
      </div>

      {/* Retest Verification History */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Verification Audit Trail
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
              <tr>
                <th className="px-5 py-3">Finding</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Verified By</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-5 py-3 text-white font-medium">
                    <span className="text-text-muted font-mono mr-2">{h.id}</span>
                    {h.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 font-semibold text-[10px] uppercase">
                      ✓ {h.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{h.engineer}</td>
                  <td className="px-4 py-3 text-text-muted text-right">{h.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
