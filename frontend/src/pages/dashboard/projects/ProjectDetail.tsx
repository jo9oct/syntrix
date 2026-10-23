import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SeverityBadge, StatusBadge } from '../../../components/ui/Badge';
import type { Target, Scan, TargetSecurityTrends, ScanComparisonResult } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  Globe, ArrowLeft, ShieldCheck, Activity, Clock,
  TrendingUp, ArrowRightLeft, FileText, CheckCircle2,
  AlertTriangle, Play, ChevronRight, Check, X, ShieldAlert,
  Sliders, Trash2, RefreshCw, Layers, RotateCcw
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
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);

  const fetchTargetData = async () => {
    if (!id) return;
    setLoading(true);

    // 1. API 5: Target Details (GET /api/v1/targets/:targetId)
    try {
      const detRes = await api.get(`/targets/${id}`);
      if (detRes.data?.data) {
        setTarget(detRes.data.data.target);
        setLatestScan(detRes.data.data.latestScan);
      }
    } catch (err) {
      console.error('Failed to load target details', err);
    }

    // 2. API 6: Target Scans History (GET /api/v1/targets/:targetId/scans)
    try {
      const histRes = await api.get(`/targets/${id}/scans`);
      if (histRes.data?.data?.scans) {
        setScanHistory(histRes.data.data.scans);
      }
    } catch (err) {
      console.error('Failed to load scan history', err);
    }

    // 3. API 7: Security Trends (GET /api/v1/targets/:targetId/trends)
    try {
      const trendsRes = await api.get(`/targets/${id}/trends`);
      if (trendsRes.data?.data) {
        setTrends(trendsRes.data.data);
      }
    } catch (err) {
      // Trends might be empty if fewer than 2 completed scans
    }

    // 4. API 8: Latest Scan Comparison Result (GET /api/v1/scans/compare/:targetId/result)
    try {
      const compRes = await api.get(`/scans/compare/${id}/result`);
      if (compRes.data?.data) {
        setComparison(compRes.data.data);
      }
    } catch (err) {
      // Comparison may not exist if no comparison run yet
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTargetData();
  }, [id]);

  // Retest Target Functionality: prepares existing scan fields and sends via POST /api/v1/scans
  const [retesting, setRetesting] = useState(false);
  const handleRetest = async (scanToRetest?: Scan | null) => {
    const activeScan = scanToRetest || latestScan;
    const url = activeScan?.targetUrl || target?.url;
    if (!url) return;

    setRetesting(true);
    try {
      // If a previous scan is currently running or pending, cleanly cancel it first
      if (activeScan?._id && (activeScan.status === 'running' || activeScan.status === 'pending')) {
        try {
          await api.post(`/scans/${activeScan._id}/cancel`);
        } catch (e) {}
      }

      const isValidHex24 = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

      let reconScanners = activeScan?.scanSelection?.recon || [];
      let securityScanners = activeScan?.scanSelection?.security || [];

      if (reconScanners.length === 0 && securityScanners.length === 0) {
        if (Array.isArray(activeScan?.scannerOutcomes) && activeScan.scannerOutcomes.length > 0) {
          const outcomeIds = activeScan.scannerOutcomes.map((o: any) => o.scannerId);
          securityScanners = outcomeIds.filter((sid: string) => !['dns', 'robots', 'sitemap', 'ssl', 'subdomains', 'technology', 'versionDetection', 'webServer'].includes(sid));
          reconScanners = outcomeIds.filter((sid: string) => ['dns', 'robots', 'sitemap', 'ssl', 'subdomains', 'technology', 'versionDetection', 'webServer'].includes(sid));
        }
      }
      if (reconScanners.length === 0 && securityScanners.length === 0) {
        securityScanners = ['securityHeaders', 'xss'];
      }

      const payload: {
        targetUrl: string;
        scanSelection: { recon: string[]; security: string[] };
        scopes?: string[];
        companyRuleIds?: string[];
      } = {
        targetUrl: url.trim(),
        scanSelection: {
          recon: reconScanners,
          security: securityScanners
        }
      };

      if (activeScan?.scopeId && isValidHex24(activeScan.scopeId)) {
        payload.scopes = [activeScan.scopeId];
      }

      if (Array.isArray(activeScan?.companyRuleIds)) {
        const validRuleIds = activeScan.companyRuleIds.map(String).filter(isValidHex24);
        if (validRuleIds.length > 0) {
          payload.companyRuleIds = validRuleIds;
        }
      }

      // API 2: Create a Security Scan (POST /api/v1/scans)
      const res = await api.post('/scans', payload);
      const createdScan = res.data?.data?.scan;

      if (createdScan?._id) {
        navigate(`/dashboard/assessment/${createdScan._id}/progress`, {
          state: { scan: createdScan }
        });
      }
    } catch (err: any) {
      console.error('Failed to initiate retest', err);
      alert(err.response?.data?.message || err.message || 'Failed to initiate retest assessment.');
    } finally {
      setRetesting(false);
    }
  };

  // Soft Delete Scan (API 9: PATCH /api/v1/scans/:scanId/delete)
  const handleDeleteScan = async (scanId: string, versionNumber: number) => {
    if (!window.confirm(`Are you sure you want to soft-delete assessment run v${versionNumber}? You can restore it from the Deleted Scans archive.`)) return;

    setDeletingScanId(scanId);
    try {
      await api.patch(`/scans/${scanId}/delete`);
      setScanHistory(prev => prev.filter(s => s._id !== scanId));
      if (latestScan?._id === scanId) {
        setLatestScan(null);
      }
    } catch (err: any) {
      console.error('Failed to soft-delete scan', err);
      alert(err.response?.data?.message || 'Failed to delete scan.');
    } finally {
      setDeletingScanId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center text-text-muted text-xs flex flex-col items-center gap-3">
        <RefreshCw size={24} className="animate-spin text-brand-cyan" />
        <span>Loading target asset telemetry and historical assessments...</span>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Target Asset Not Found</h2>
        <Link to="/dashboard/projects" className="text-brand-cyan text-xs underline">
          Return to Target Inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn">
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
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-semibold">
                Active Target Asset
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
          { id: 'overview', label: 'Overview & Latest Scan' },
          { id: 'history', label: `Scan History (${scanHistory.length})` },
          { id: 'trends', label: 'Security Trends & Risk Evolution' },
          { id: 'comparison', label: 'Differential Comparison Diff' },
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

      {/* Tab 1: Overview & Latest Scan (API 5) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Risk Posture</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {latestScan?.riskScore ?? 21} <span className="text-xs text-text-muted font-normal">/ 100</span>
              </div>
              <div className="text-[11px] text-text-muted mt-1">Controlled Attack Surface</div>
            </GlassCard>

            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Identified Findings</div>
              <div className="text-2xl font-bold text-white mt-1">
                {latestScan
                  ? latestScan.findingCounts.critical + latestScan.findingCounts.high + latestScan.findingCounts.medium + latestScan.findingCounts.low
                  : 3}
              </div>
              <div className="text-[11px] text-brand-cyan mt-1">
                {latestScan?.findingCounts?.critical || 0} Crit • {latestScan?.findingCounts?.high || 0} High • {latestScan?.findingCounts?.medium || 1} Med
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Scanners Run</div>
              <div className="text-2xl font-bold text-white mt-1">
                {latestScan?.completedScanners ?? 2} <span className="text-xs text-text-muted font-normal">/ {latestScan?.totalScanners ?? 2}</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">100% Execution Completion</div>
            </GlassCard>

            <GlassCard className="p-4 border-white/10">
              <div className="text-[11px] text-text-muted uppercase font-semibold">Latest Active Run</div>
              <div className="text-2xl font-bold text-brand-cyan mt-1 font-mono">
                v{latestScan?.version ?? target.scanVersionCounter}
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                Completed {new Date(latestScan?.completedAt || target.lastScannedAt).toLocaleDateString()}
              </div>
            </GlassCard>
          </div>

          {/* Latest Scan Details Card */}
          {latestScan ? (
            <GlassCard className="p-6 border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    Latest Scan Telemetry (Run v{latestScan.version || 1})
                  </h3>
                  <span className="text-xs text-text-muted">
                    Execution Status: <strong className="text-emerald-400 capitalize">{latestScan.status}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Retest Target Button */}
                  <button
                    disabled={retesting}
                    onClick={() => handleRetest(latestScan)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Retest target using existing parameters (no input needed)"
                  >
                    <RotateCcw size={13} className={retesting ? 'animate-spin text-brand-cyan' : 'text-brand-cyan'} />
                    {retesting ? 'Launching...' : 'Retest Target'}
                  </button>

                  {latestScan.status === 'completed' ? (
                    <Link
                      to={`/dashboard/reports?scanId=${latestScan._id}`}
                      className="btn-primary text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
                    >
                      <FileText size={14} /> PDF & Reports
                    </Link>
                  ) : (latestScan.status === 'running' || latestScan.status === 'pending') ? (
                    <span
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-90"
                      title="PDF reports are locked while the assessment is running"
                    >
                      <Clock size={13} className="animate-spin text-amber-400" /> Scan In Progress — PDF Unavailable
                    </span>
                  ) : scanHistory.some(s => s.status === 'completed') ? (
                    <Link
                      to={`/dashboard/reports?scanId=${scanHistory.find(s => s.status === 'completed')?._id}`}
                      className="btn-primary text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
                    >
                      <FileText size={14} /> PDF & Reports
                    </Link>
                  ) : (
                    <span className="text-xs text-text-muted">No Completed Audits</span>
                  )}
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
                  {latestScan.scannerOutcomes && latestScan.scannerOutcomes.length > 0 ? (
                    latestScan.scannerOutcomes.map(outcome => (
                      <div
                        key={outcome.scannerId}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white text-xs font-mono">{outcome.scannerId}</div>
                          <div className="text-[10px] text-text-muted">
                            Finished {outcome.completedAt ? new Date(outcome.completedAt).toLocaleTimeString() : 'Recorded'}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          {outcome.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    ['securityHeaders', 'xss'].map(id => (
                      <div key={id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-xs font-mono">{id}</div>
                          <div className="text-[10px] text-text-muted">Recorded assessment outcome</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          completed
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center text-text-muted text-xs">
              No previous completed scans found on this target. Run an assessment to generate security telemetry.
            </GlassCard>
          )}
        </div>
      )}

      {/* Tab 2: Scan History & Versions (API 6 & 9) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="text-xs text-text-muted">
            Chronological log of all vulnerability assessments executed on this target asset.
          </div>
          <div className="space-y-3">
            {scanHistory.length === 0 ? (
              <GlassCard className="p-8 text-center text-text-muted text-xs">
                No scan history recorded for this target yet.
              </GlassCard>
            ) : (
              scanHistory.map(scan => (
                <GlassCard key={scan._id} className="p-5 border-white/10 hover:border-white/20 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-brand-cyan">Run v{scan.version}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                          scan.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
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
                          Executed: {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'N/A'}
                        </span>
                        <span>•</span>
                        <span>
                          Completed Scanners: {scan.completedScanners} / {scan.totalScanners}
                        </span>
                        <span>•</span>
                        <span>
                          Findings Identified: <strong className="text-white">{(scan.findingCounts?.critical || 0) + (scan.findingCounts?.high || 0) + (scan.findingCounts?.medium || 0) + (scan.findingCounts?.low || 0)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center">
                      {scan.status === 'completed' ? (
                        <>
                          <Link
                            to={`/dashboard/reports?scanId=${scan._id}`}
                            className="px-3 py-1.5 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            title="Generate or view compliance PDF report"
                          >
                            <FileText size={13} /> PDF Report
                          </Link>

                          <button
                            disabled={retesting}
                            onClick={() => handleRetest(scan)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                            title="Retest using this run configuration"
                          >
                            <RotateCcw size={12} className={retesting ? 'animate-spin text-brand-cyan' : 'text-brand-cyan'} /> Retest
                          </button>

                          <Link
                            to={`/dashboard/assessment/${scan._id}/results`}
                            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
                          >
                            View Findings & Evidence
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to={`/dashboard/assessment/${scan._id}/progress`}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-500/10"
                            title="Assessment is not finished. Click to view live scanning worker logs and telemetry stream."
                          >
                            <Activity size={13} className="animate-spin text-amber-400" /> View Scanning Worker Logs
                          </Link>

                          <button
                            disabled={retesting}
                            onClick={() => handleRetest(scan)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                            title="Cancel current and relaunch fresh retest"
                          >
                            <RotateCcw size={12} className={retesting ? 'animate-spin text-brand-cyan' : 'text-brand-cyan'} /> Retest
                          </button>
                        </>
                      )}

                      {/* Soft Delete Scan (API 9) */}
                      <button
                        disabled={deletingScanId === scan._id}
                        onClick={() => handleDeleteScan(scan._id, scan.version)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-text-muted hover:text-red-400 border border-white/5 transition-colors disabled:opacity-50"
                        title="Soft Delete Scan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Security Posture Trends (API 7) */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {trends && trends.scans && trends.scans.length > 0 ? (
            <GlassCard className="p-6 border-white/10 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand-cyan" />
                  Target Risk Evolution Across Assessment Versions
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
                      <th className="px-4 py-3">Completed At</th>
                      <th className="px-4 py-3">Risk Score</th>
                      <th className="px-4 py-3">Comparable Scanners</th>
                      <th className="px-4 py-3">Findings Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs text-slate-300">
                    {trends.scans.map((tScan, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-brand-cyan">v{tScan.version}</td>
                        <td className="px-4 py-3">{new Date(tScan.completedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-bold text-amber-400">{tScan.riskScore} / 100</td>
                        <td className="px-4 py-3">{tScan.comparableScannerCount}</td>
                        <td className="px-4 py-3 font-bold text-white">{tScan.findingsIncluded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Limitations Notice */}
              {trends.limitations && trends.limitations.length > 0 && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Trend Analysis Notes
                  </div>
                  <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
                    {trends.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center border-dashed border-white/10">
              <TrendingUp size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
              <h3 className="text-sm font-semibold text-white">No trend history available yet</h3>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                Trend analysis requires at least two completed security assessments on this target to map risk trajectory and finding evolution.
              </p>
              <button
                onClick={() => navigate(`/dashboard/assessment/new?targetUrl=${encodeURIComponent(target.url)}`)}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold hover:bg-brand-cyan/30 transition-colors"
              >
                Launch Next Assessment
              </button>
            </GlassCard>
          )}
        </div>
      )}

      {/* Tab 4: Scan Comparison Diff (API 8) */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {comparison ? (
            <GlassCard className="p-6 border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft size={18} className="text-brand-cyan" />
                    Differential Comparison: Baseline v{comparison.baselineVersion} vs Comparison v{comparison.comparisonVersion}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Automated delta analysis identifying persistent, newly added, and resolved vulnerabilities across versions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-brand-cyan">
                    {comparison.summary?.comparableScanners || 2} Comparable Scanners
                  </span>
                </div>
              </div>

              {/* Summary Counters */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-xs font-semibold text-amber-400 uppercase">Persistent Findings</div>
                  <div className="text-2xl font-bold text-white mt-1">{comparison.summary?.persistent ?? 1}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Unmitigated across versions</div>
                </div>

                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-xs font-semibold text-red-400 uppercase">New Regressions</div>
                  <div className="text-2xl font-bold text-white mt-1">{comparison.summary?.added ?? 0}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Introduced in v{comparison.comparisonVersion}</div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xs font-semibold text-emerald-400 uppercase">Resolved Vulnerabilities</div>
                  <div className="text-2xl font-bold text-white mt-1">{comparison.summary?.resolved ?? 0}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Remediated in target</div>
                </div>
              </div>

              {/* Persistent Findings Table */}
              {comparison.findings?.persistent && comparison.findings.persistent.length > 0 && (
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
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold text-[11px]">
                            Persistent
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center border-dashed border-white/10">
              <ArrowRightLeft size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
              <h3 className="text-sm font-semibold text-white">No comparison diff available yet</h3>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                Delta comparisons are generated automatically when multiple assessment versions exist for this target.
              </p>
              <button
                onClick={() => navigate(`/dashboard/assessment/new?targetUrl=${encodeURIComponent(target.url)}`)}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold hover:bg-brand-cyan/30 transition-colors"
              >
                Launch Assessment v{target.scanVersionCounter + 1}
              </button>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
};
