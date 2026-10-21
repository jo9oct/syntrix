import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SeverityBadge, StatusBadge } from '../../../components/ui/Badge';
import type { Target, Scan, TargetSecurityTrends, ScanComparisonResult } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  Globe, ArrowLeft, ShieldCheck, Activity, Clock,
  TrendingUp, ArrowRightLeft, FileText, CheckCircle2,
  AlertTriangle, Play, ChevronRight, Check, X, ShieldAlert, Sliders
} from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [target, setTarget] = useState<Target | null>(null);
  const [latestScan, setLatestScan] = useState<Scan | null>(null);
  const [scanHistory, setScanHistory] = useState<Scan[]>([]);
  const [trends, setTrends] = useState<TargetSecurityTrends | null>(null);
  const [comparison, setComparison] = useState<ScanComparisonResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'trends' | 'comparison'>('overview');

  useEffect(() => {
    const fetchTargetData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // API 21: Target Details
        const detRes = await api.get(`/targets/${id}`);
        if (detRes.data?.data) {
          setTarget(detRes.data.data.target);
          setLatestScan(detRes.data.data.latestScan);
        }

        // API 22: Scan History
        const histRes = await api.get(`/targets/${id}/scans`);
        if (histRes.data?.data?.scans) {
          setScanHistory(histRes.data.data.scans);
        }

        // API 23: Security Trends
        const trendsRes = await api.get(`/targets/${id}/trends`);
        if (trendsRes.data?.data) {
          setTrends(trendsRes.data.data);
        }

        // API 24: Latest Scan Comparison Result
        const compRes = await api.get(`/scans/compare/${id}/result`);
        if (compRes.data?.data) {
          setComparison(compRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load target details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTargetData();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-text-muted text-xs">Loading target telemetry & history...</div>;
  }

  if (!target) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Target Not Found</h2>
        <Link to="/dashboard/projects" className="text-brand-cyan text-xs underline">
          Back to Targets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button and Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link to="/dashboard/projects" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft size={13} /> Targets
        </Link>
        <span>/</span>
        <span className="text-white font-medium">{target.hostname}</span>
      </div>

      {/* Target Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 flex items-center justify-center font-bold shrink-0">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{target.hostname}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 text-[10px] font-semibold">
                Active Target
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-cyan">
                Version Counter: v{target.scanVersionCounter}
              </span>
            </div>
            <p className="text-xs text-text-muted font-mono mt-1 break-all">
              {target.url}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/assessment/new?targetUrl=${encodeURIComponent(target.url)}`)}
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20"
          >
            <Play size={14} /> Run Assessment v{target.scanVersionCounter + 1}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Latest Scan (API 21)' },
          { id: 'history', label: `Scan History (${scanHistory.length}) (API 22)` },
          { id: 'trends', label: 'Security Trends (API 23)' },
          { id: 'comparison', label: 'Scan Comparison Diff (API 24)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 font-bold'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & Latest Scan */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Risk Score</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {latestScan?.riskScore ?? 21} <span className="text-xs text-text-muted font-normal">/ 100</span>
              </div>
              <div className="text-[11px] text-text-muted mt-1">Controlled exposure</div>
            </GlassCard>

            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Findings Count</div>
              <div className="text-2xl font-bold text-white mt-1">
                {latestScan
                  ? latestScan.findingCounts.critical + latestScan.findingCounts.high + latestScan.findingCounts.medium + latestScan.findingCounts.low
                  : 3}
              </div>
              <div className="text-[11px] text-brand-cyan mt-1">0 Critical • 1 Med • 2 Low</div>
            </GlassCard>

            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Scanners Run</div>
              <div className="text-2xl font-bold text-white mt-1">
                {latestScan?.completedScanners ?? 2} <span className="text-xs text-text-muted font-normal">/ {latestScan?.totalScanners ?? 2}</span>
              </div>
              <div className="text-[11px] text-green-400 mt-1">100% Execution Rate</div>
            </GlassCard>

            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Latest Version</div>
              <div className="text-2xl font-bold text-brand-cyan mt-1 font-mono">
                v{latestScan?.version ?? target.scanVersionCounter}
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                Completed {new Date(latestScan?.completedAt || target.lastScannedAt).toLocaleDateString()}
              </div>
            </GlassCard>
          </div>

          {/* Latest Scan Deep Card */}
          {latestScan && (
            <GlassCard className="p-6 border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={18} className="text-green-400" />
                    Latest Scan Telemetry ({latestScan._id})
                  </h3>
                  <span className="text-xs text-text-muted">
                    Execution Status: <strong className="text-white capitalize">{latestScan.status}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/assessment/${latestScan._id}/results`}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold hover:bg-brand-cyan/30 transition-colors"
                  >
                    Explore Scan Results & Crawl &rarr;
                  </Link>
                </div>
              </div>

              {/* Scope Snapshot Details */}
              {latestScan.scopeSnapshot && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
                  <div className="font-semibold text-brand-cyan uppercase tracking-wider text-[11px]">
                    Captured Scope Snapshot
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                    <div>
                      <span className="text-text-muted block">Scope Name:</span>
                      <strong className="text-white">{latestScan.scopeSnapshot.name}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block">Hostnames:</span>
                      <strong className="text-white">{latestScan.scopeSnapshot.hostnames.join(', ')}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block">Target Port & Subdomains:</span>
                      <strong className="text-white">Port {latestScan.scopeSnapshot.targetPort} • Subdomains: {latestScan.scopeSnapshot.includeSubdomains ? 'Yes' : 'No'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanner Outcomes */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Scanner Execution Outcomes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {latestScan.scannerOutcomes.map(outcome => (
                    <div
                      key={outcome.scannerId}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white text-xs font-mono">{outcome.scannerId}</div>
                        <div className="text-[10px] text-text-muted">
                          Finished {outcome.completedAt ? new Date(outcome.completedAt).toLocaleTimeString() : 'N/A'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-green-500/10 text-green-400 border border-green-500/25">
                        {outcome.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Tab 2: Scan History & Versions */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="text-xs text-text-muted">
            Chronological log of all vulnerability assessments executed on this target (API 22).
          </div>
          <div className="space-y-3">
            {scanHistory.map(scan => (
              <GlassCard key={scan._id} className="p-5 border-white/10 hover:border-white/20 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-brand-cyan">v{scan.version}</span>
                      <span className="text-xs font-mono text-white">{scan._id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        scan.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/25'
                          : scan.status === 'failed'
                          ? 'bg-red-500/10 text-red-400 border-red-500/25'
                          : 'bg-white/5 text-text-muted border-white/10'
                      }`}>
                        {scan.status}
                      </span>
                      {scan.riskScore !== null && (
                        <span className="text-[11px] font-mono text-amber-300">
                          Risk: {scan.riskScore}/100
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-text-muted flex-wrap">
                      <span>
                        Started: {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'N/A'}
                      </span>
                      <span>•</span>
                      <span>
                        Completed Scanners: {scan.completedScanners} / {scan.totalScanners}
                      </span>
                      <span>•</span>
                      <span>
                        Findings: <strong className="text-white">{scan.findingCounts.critical + scan.findingCounts.high + scan.findingCounts.medium + scan.findingCounts.low}</strong>
                      </span>
                    </div>

                    {scan.errorMessage && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-mono">
                        Error: {scan.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <Link
                      to={`/dashboard/assessment/${scan._id}/results`}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
                    >
                      View Report / Findings
                    </Link>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Security Posture Trends */}
      {activeTab === 'trends' && trends && (
        <div className="space-y-6">
          <GlassCard className="p-6 border-white/10 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-cyan" />
                Target Risk Evolution Across Scan Versions
              </h3>
              <p className="text-xs text-text-muted mt-1">
                Comparative risk score and finding aggregation tracked across consecutive runs.
              </p>
            </div>

            {/* Trends Table */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-text-muted uppercase text-[10px] font-semibold border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Scan ID</th>
                    <th className="px-4 py-3">Completed At</th>
                    <th className="px-4 py-3">Risk Score</th>
                    <th className="px-4 py-3">Comparable Scanners</th>
                    <th className="px-4 py-3">Findings Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs text-slate-300">
                  {trends.scans.map(tScan => (
                    <tr key={tScan.scanId} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold text-brand-cyan">v{tScan.version}</td>
                      <td className="px-4 py-3 text-text-muted">{tScan.scanId}</td>
                      <td className="px-4 py-3">{new Date(tScan.completedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold text-amber-400">{tScan.riskScore} / 100</td>
                      <td className="px-4 py-3">{tScan.comparableScannerCount}</td>
                      <td className="px-4 py-3 font-bold text-white">{tScan.findingsIncluded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Limitations Notice from API 23 */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} /> Trend Analysis Limitations
              </div>
              <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
                {trends.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 4: Scan Comparison Diff */}
      {activeTab === 'comparison' && comparison && (
        <div className="space-y-6">
          <GlassCard className="p-6 border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-brand-cyan" />
                  Differential Comparison: Baseline v{comparison.baselineVersion} vs Comparison v{comparison.comparisonVersion}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Automated delta analysis identifying persistent, newly added, and resolved vulnerabilities (API 24).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-brand-cyan">
                  {comparison.summary.comparableScanners} Comparable Scanners
                </span>
              </div>
            </div>

            {/* Summary Counters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-xs font-semibold text-amber-400 uppercase">Persistent Findings</div>
                <div className="text-2xl font-bold text-white mt-1">{comparison.summary.persistent}</div>
                <div className="text-[10px] text-text-muted mt-0.5">Unmitigated across versions</div>
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <div className="text-xs font-semibold text-red-400 uppercase">New Regressions (Added)</div>
                <div className="text-2xl font-bold text-white mt-1">{comparison.summary.added}</div>
                <div className="text-[10px] text-text-muted mt-0.5">Introduced in v{comparison.comparisonVersion}</div>
              </div>

              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                <div className="text-xs font-semibold text-green-400 uppercase">Resolved Vulnerabilities</div>
                <div className="text-2xl font-bold text-white mt-1">{comparison.summary.resolved}</div>
                <div className="text-[10px] text-text-muted mt-0.5">Fixed in target</div>
              </div>
            </div>

            {/* Persistent Findings Table */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Persistent Security Findings
              </div>
              <div className="space-y-2">
                {comparison.findings.persistent.map(({ current }, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{current.title}</span>
                        <SeverityBadge severity={current.severity} />
                        <span className="font-mono text-[10px] text-brand-cyan">{current.scannerId}</span>
                      </div>
                      <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
                        {current.description}
                      </p>
                      <div className="text-[11px] text-text-muted font-mono">
                        Header: <span className="text-sky-300">{current.metadata?.header}</span> • Status: <strong className="text-white capitalize">{current.status}</strong>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold text-[11px]">
                        Persistent (v3 &rarr; v4)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
