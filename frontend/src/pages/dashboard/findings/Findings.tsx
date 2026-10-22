import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge, SeverityBadge } from '../../../components/ui/Badge';
import type { Finding, Evidence, FindingStatus, FindingSeverity } from '../../../types/sentrix';
import api from '../../../lib/api';
import { EvidenceViewer } from '../../../components/ui/EvidenceViewer';
import {
  ShieldAlert, Plus, Search, Filter, ArrowRight,
  CheckCircle2, RotateCcw, AlertTriangle, User, X,
  Eye, Check, ExternalLink, ShieldCheck, Tag
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useUserTier } from '../../../store/authStore';

export const Findings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tier: userTier, isFree, isPro, isEnterprise } = useUserTier();
  const [searchParams] = useSearchParams();
  const filterScanId = searchParams.get('scanId');

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchFindings = async () => {
    try {
      setLoading(true);
      // API 4 & 5: Get All Findings or by scanId
      const url = filterScanId ? `/findings?scanId=${filterScanId}` : '/findings';
      const res = await api.get(url);
      if (res.data?.data?.findings) {
        setFindings(res.data.data.findings);
      }
    } catch (err) {
      console.error('Failed to fetch findings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [filterScanId]);

  const handleStatusChange = async (findingId: string, newStatus: FindingStatus) => {
    setUpdatingId(findingId);
    try {
      // API 6: Update Finding Status
      await api.patch(`/findings/${findingId}`, {
        status: newStatus
      });
      await fetchFindings();
    } catch (err) {
      console.error('Failed to update finding status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInspectEvidence = async (evidenceId?: string) => {
    try {
      // API 8: Get Evidence by ID
      const targetId = evidenceId || 'ev_ref_01';
      const res = await api.get(`/evidence/${targetId}`);
      if (res.data?.data?.evidence) {
        setSelectedEvidence(res.data.data.evidence);
      }
    } catch (err) {
      console.error('Failed to load evidence', err);
    }
  };

  const filtered = findings.filter(f => {
    const matchSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.scannerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.metadata?.header && f.metadata.header.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchSeverity = severityFilter === 'all' || f.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;

    return matchSearch && matchSeverity && matchStatus;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Evidence Viewer Modal */}
      <EvidenceViewer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <ShieldAlert size={14} /> Vulnerability Intelligence & Triage
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Security Findings
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Audited security flaws, HTTP response headers, injection surfaces, and evidence logs (APIs 4-8).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(user?.role === 'client_owner' || user?.role === 'client_member') && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              userTier === 'enterprise'
                ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                : userTier === 'pro'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
                : 'bg-white/10 text-slate-300 border border-white/20'
            }`}>
              {userTier} Triage
            </span>
          )}
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-colors"
          >
            Export Reports
          </button>
          <button
            onClick={() => navigate('/dashboard/assessment/new')}
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20"
          >
            <Plus size={16} /> New Assessment
          </button>
        </div>
      </div>

      {/* Tier Retention & Capability Banner for client_member & client_owner */}
      {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertTriangle size={18} className="shrink-0" />
            <span>
              <strong>Free Community Tier:</strong> Vulnerability finding logs are retained for 7 days. Upgrade to Pro for automated verification retests, remediation tickets, and executive PDF compliance reports.
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="btn-primary text-xs px-3.5 py-1.5 rounded-xl font-bold shrink-0 shadow-md shadow-brand-cyan/20 self-start sm:self-auto"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            placeholder="Search findings by title, scanner, header..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan capitalize"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="detected">Detected</option>
            <option value="verified">Verified</option>
            <option value="accepted">Accepted (Risk Sign-off)</option>
            <option value="false_positive">False Positive</option>
            <option value="resolved">Resolved / Fixed</option>
          </select>

          <span className="text-xs text-text-muted pl-2">
            Showing <strong className="text-white">{filtered.length}</strong> findings
          </span>
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="text-center py-16 text-text-muted text-xs">Loading vulnerability findings...</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-white/10">
          <ShieldCheck size={40} className="mx-auto text-green-400 mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-white">No security findings found</h3>
          <p className="text-xs text-text-muted mt-1">No vulnerabilities match the current filter criteria.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filtered.map(finding => (
            <GlassCard
              key={finding._id}
              className="p-6 border-white/10 hover:border-brand-cyan/30 transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-bold text-white tracking-tight">{finding.title}</span>
                    <SeverityBadge severity={finding.severity} />
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-cyan font-mono text-[10px]">
                      {finding.scannerId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-text-muted">
                      Confidence: {finding.confidence}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                    {finding.description}
                  </p>

                  {finding.impact && (
                    <div className="text-xs text-text-muted">
                      <strong className="text-white font-medium">Impact:</strong> {finding.impact}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 self-end lg:self-start shrink-0">
                  {/* Status Dropdown (API 6: PATCH /api/v1/findings/:id) */}
                  <div className="relative">
                    <select
                      value={finding.status}
                      disabled={updatingId === finding._id}
                      onChange={e => handleStatusChange(finding._id, e.target.value as FindingStatus)}
                      className="bg-[#1e293b] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-cyan capitalize font-medium cursor-pointer"
                    >
                      <option value="detected">Detected</option>
                      <option value="verified">Verified</option>
                      <option value="accepted">Accepted (Risk Sign-off)</option>
                      <option value="false_positive">False Positive</option>
                      <option value="resolved">Resolved / Fixed</option>
                    </select>
                  </div>

                  {/* Inspect Evidence Button */}
                  <button
                    onClick={() => handleInspectEvidence(finding.evidenceIds?.[0])}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/25 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Eye size={14} /> Evidence Log
                  </button>
                </div>
              </div>

              {/* Remediation Box */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider block">
                  Remediation Action
                </span>
                <p className="text-xs text-slate-300">{finding.remediation}</p>
              </div>

              {/* Metadata row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-text-muted pt-2 border-t border-white/5">
                <div className="flex items-center gap-3 flex-wrap">
                  {finding.metadata?.header && (
                    <span>
                      Observed Header: <strong className="text-sky-300">{finding.metadata.header}</strong>
                    </span>
                  )}
                  {finding.metadata?.responseStatus && (
                    <span>
                      HTTP Status: <strong className="text-amber-300">{finding.metadata.responseStatus}</strong>
                    </span>
                  )}
                  <span>Status: <strong className="text-white capitalize">{finding.status.replace(/_/g, ' ')}</strong></span>
                </div>
                <div className="truncate max-w-sm">
                  Confidence: <span className="text-brand-cyan">{finding.confidence}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
