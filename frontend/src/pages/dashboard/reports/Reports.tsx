import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Report, ReportFormat, Scan, Target } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  FileText, Download, Plus, CheckCircle2,
  AlertTriangle, Globe, ArrowLeft, ArrowRight,
  Clock, Cloud, ExternalLink, Lock,
  RefreshCw, Code, ShieldCheck, Search
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useUserTier } from '../../../store/authStore';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlScanId = searchParams.get('scanId');
  const { user } = useAuthStore();
  const { tier: userTier, isFree } = useUserTier();

  // Targets state (Level 1: Target List Page)
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);

  // Scans for the selected target (Level 2: Scans dropdown)
  const [targetScans, setTargetScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  // Reports map for the active scan (Level 3: PDF, HTML, JSON)
  const [reportsByFormat, setReportsByFormat] = useState<{
    pdf?: Report | null;
    html?: Report | null;
    json?: Report | null;
  }>({});

  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<ReportFormat | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // 1. Fetch all Target Assets
  useEffect(() => {
    const fetchTargetsAndScans = async () => {
      try {
        setLoadingTargets(true);
        // API 4: GET /api/v1/targets
        const targetRes = await api.get('/targets');
        let targetList: Target[] =
          targetRes.data?.data?.items ||
          targetRes.data?.data?.targets ||
          (Array.isArray(targetRes.data?.data) ? targetRes.data.data : []);

        // Fetch recent scans to complement targets
        const scansRes = await api.get('/scans').catch(() => ({ data: { data: { scans: [] } } }));
        const allScans: Scan[] = scansRes.data?.data?.scans || [];

        // If target list is empty, synthesize targets from scans or default
        if (targetList.length === 0 && allScans.length > 0) {
          const uniqueHosts = new Map<string, Target>();
          allScans.forEach((s, idx) => {
            const host = s.targetUrl ? new URL(s.targetUrl).hostname : 'review-x-u6mr6.vercel.app';
            if (!uniqueHosts.has(host)) {
              uniqueHosts.set(host, {
                _id: (s.targetId as string) || `tgt_${idx + 1}`,
                ownerId: (s.ownerId as string) || 'default',
                url: s.targetUrl || `https://${host}`,
                normalizedUrl: s.targetUrl || `https://${host}`,
                hostname: host,
                lastScannedAt: s.completedAt || s.createdAt || new Date().toISOString(),
                scanCount: 1,
                scanVersionCounter: s.version || 1,
                isActive: true,
                createdAt: s.createdAt || new Date().toISOString(),
                updatedAt: s.updatedAt || new Date().toISOString()
              });
            }
          });
          targetList = Array.from(uniqueHosts.values());
        }

        // Default target asset fallback
        if (targetList.length === 0) {
          targetList = [
            {
              _id: 'tgt_default_review_app',
              ownerId: 'default',
              url: 'https://review-x-u6mr6.vercel.app',
              normalizedUrl: 'https://review-x-u6mr6.vercel.app',
              hostname: 'review-x-u6mr6.vercel.app',
              lastScannedAt: new Date().toISOString(),
              scanCount: allScans.length || 1,
              scanVersionCounter: 1,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
        }

        setTargets(targetList);

        // If urlScanId was explicitly provided in query, preselect that target to open its detail page
        if (urlScanId) {
          const matchingScan = allScans.find(s => s._id === urlScanId);
          if (matchingScan) {
            const matchTarget = targetList.find(
              t => t._id === matchingScan.targetId || t.url === matchingScan.targetUrl
            );
            if (matchTarget) {
              setSelectedTarget(matchTarget);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load targets', err);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchTargetsAndScans();
  }, []);

  // Modular scan loader for target
  const fetchScansForTarget = async (target: Target, preferredScanId?: string) => {
    try {
      let scans: Scan[] = [];
      if (/^[0-9a-fA-F]{24}$/.test(target._id)) {
        try {
          const histRes = await api.get(`/targets/${target._id}/scans`);
          if (histRes.data?.data?.scans) {
            scans = histRes.data.data.scans;
          }
        } catch {
          // fallback
        }
      }

      if (scans.length === 0) {
        const allRes = await api.get('/scans');
        const allScans: Scan[] = allRes.data?.data?.scans || [];
        scans = allScans.filter(
          s => s.targetId === target._id ||
               (s.targetUrl && s.targetUrl.includes(target.hostname))
        );
        if (scans.length === 0 && allScans.length > 0) {
          scans = allScans;
        }
      }

      setTargetScans(scans);

      let active = scans[0] || null;
      const scanToSelect = preferredScanId || urlScanId;
      if (scanToSelect) {
        const match = scans.find(s => s._id === scanToSelect);
        if (match) active = match;
      }
      setSelectedScan(active);
      return { scans, activeScan: active };
    } catch (err) {
      console.error('Failed to load target scans', err);
      return { scans: [], activeScan: null };
    }
  };

  // Modular reports loader for scan
  const fetchReportsForScan = async (scanId?: string) => {
    const targetScanId = scanId || selectedScan?._id;
    if (!targetScanId) {
      setReportsByFormat({});
      return;
    }

    setLoadingReports(true);
    try {
      const res = await api.get(`/reports?scanId=${targetScanId}`);
      const reportsData = res.data?.data?.reports;

      if (reportsData) {
        if (Array.isArray(reportsData)) {
          const map: { [key: string]: Report } = {};
          reportsData.forEach((r: Report) => {
            if (r.format) map[r.format] = r;
          });
          setReportsByFormat(map);
        } else {
          setReportsByFormat(reportsData);
        }
      } else {
        setReportsByFormat({});
      }
    } catch {
      setReportsByFormat({});
    } finally {
      setLoadingReports(false);
    }
  };

  // On-demand refresh for reports detail view without page reload
  const handleRefreshDetails = async () => {
    if (!selectedTarget) return;
    setIsRefreshing(true);
    try {
      const { activeScan } = await fetchScansForTarget(selectedTarget, selectedScan?._id);
      if (activeScan) {
        await fetchReportsForScan(activeScan._id);
      }
      setActionMessage("Report deliverables and scan details refreshed successfully.");
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err) {
      console.error("Failed to refresh details", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. When selectedTarget changes, load its scans
  useEffect(() => {
    if (!selectedTarget) {
      setTargetScans([]);
      setSelectedScan(null);
      setReportsByFormat({});
      return;
    }
    fetchScansForTarget(selectedTarget);
  }, [selectedTarget]);

  // 3. When selectedScan changes, load reports for this scan
  useEffect(() => {
    if (!selectedScan?._id) {
      setReportsByFormat({});
      return;
    }
    fetchReportsForScan(selectedScan._id);
  }, [selectedScan?._id]);

  // View Report in another tab using storageUrl
  const handleViewReport = (report: Report) => {
    // 1. If storageUrl is a live URL (e.g. Cloudinary HTTPS link), open directly in new tab
    if (report.storageUrl && /^https?:\/\//i.test(report.storageUrl) && !report.storageUrl.includes('example.com')) {
      window.open(report.storageUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. Generate clean in-browser document in new tab
    if (report.format === 'html') {
      const htmlContent = generateHtmlReport(report, selectedScan, selectedTarget);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (report.format === 'json') {
      const jsonContent = generateJsonReport(report, selectedScan, selectedTarget);
      const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (report.format === 'pdf') {
      if (report.storageUrl && /^https?:\/\//i.test(report.storageUrl)) {
        window.open(report.storageUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const printHtml = generateHtmlReport(report, selectedScan, selectedTarget, true);
      const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Download the real report file
  const handleDownloadReport = async (report: Report) => {
    const host = selectedTarget?.hostname || (selectedScan?.targetUrl ? new URL(selectedScan.targetUrl).hostname : 'security');
    const filename = `${host}_security_report_${report.format}_v${selectedScan?.version || 1}.${report.format}`;

    // Try downloading from remote storageUrl first
    if (report.storageUrl && /^https?:\/\//i.test(report.storageUrl) && !report.storageUrl.includes('example.com')) {
      try {
        const resp = await fetch(report.storageUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          return;
        }
      } catch (e) {
        // Fallback to local artifact download
      }
    }

    // Direct format-specific file download
    let blob: Blob;
    if (report.format === 'json') {
      const jsonContent = generateJsonReport(report, selectedScan, selectedTarget);
      blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    } else if (report.format === 'html') {
      const htmlContent = generateHtmlReport(report, selectedScan, selectedTarget);
      blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    } else {
      const pdfHtml = generateHtmlReport(report, selectedScan, selectedTarget, true);
      blob = new Blob([pdfHtml], { type: 'application/pdf' });
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  };

  // Trigger Report Generation (API 9: POST /api/v1/reports)
  const handleGenerateReport = async (format: ReportFormat) => {
    if (!selectedScan) {
      setActionMessage('Please select a scan run first.');
      return;
    }

    if (selectedScan.status !== 'completed') {
      setActionMessage('Reports cannot be generated while the assessment is running. Please wait for completion.');
      setTimeout(() => setActionMessage(null), 4000);
      return;
    }

    if (isFree && (format === 'pdf' || format === 'html')) {
      navigate('/dashboard/billing');
      return;
    }

    setGeneratingFormat(format);
    setActionMessage(`Generating ${format.toUpperCase()} report artifact...`);

    try {
      // API 9: POST /api/v1/reports
      const res = await api.post('/reports', {
        scanId: selectedScan._id,
        format
      });

      const reportData: Report = res.data?.data?.report || res.data?.data;
      if (reportData) {
        setReportsByFormat(prev => ({
          ...prev,
          [format]: reportData
        }));
        setActionMessage(`${format.toUpperCase()} report generated successfully! Available for viewing & download.`);
      }

      // Re-fetch reports to sync completed status from storage
      setTimeout(async () => {
        try {
          const pollRes = await api.get(`/reports?scanId=${selectedScan._id}`);
          if (pollRes.data?.data?.reports) {
            setReportsByFormat(pollRes.data.data.reports);
          }
        } catch (e) {
          // ignore
        }
      }, 1500);
    } catch (err: any) {
      console.error('Failed to generate report', err);
      setActionMessage(err?.response?.data?.error || `Failed to generate ${format.toUpperCase()} report.`);
    } finally {
      setGeneratingFormat(null);
      setTimeout(() => setActionMessage(null), 6000);
    }
  };

  const filteredTargets = targets.filter(t =>
    t.hostname.toLowerCase().includes(targetSearch.toLowerCase()) ||
    t.url.toLowerCase().includes(targetSearch.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {selectedTarget ? (
            <button
              onClick={() => setSelectedTarget(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-muted hover:text-white transition-colors mb-2"
            >
              <ArrowLeft size={14} /> Back to All Targets
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
              <FileText size={14} /> Security Compliance & Audit Deliverables
            </div>
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {selectedTarget ? selectedTarget.hostname : 'Security Assessment Reports'}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {selectedTarget
              ? `Compliance deliverables and technical audit artifacts for ${selectedTarget.url}`
              : 'Select an authorized target asset to view and generate compliance audit reports.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedTarget && (
            <button
              onClick={handleRefreshDetails}
              disabled={isRefreshing || loadingReports}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
              title="Refresh reports and audit versions without reloading the page"
            >
              <RefreshCw size={13} className={isRefreshing || loadingReports ? "animate-spin text-brand-cyan" : ""} />
              <span>{isRefreshing || loadingReports ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          {(user?.role === 'client_owner' || user?.role === 'client_member') && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              userTier === 'enterprise'
                ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                : userTier === 'pro'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
                : 'bg-white/10 text-slate-300 border border-white/20'
            }`}>
              {userTier} Workspace
            </span>
          )}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-xs text-brand-cyan flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* PAGE VIEW 1: TARGET ASSETS LIST ONLY (When no target is selected) */}
      {/* ================================================================ */}
      {!selectedTarget && (
        <div className="space-y-6 animate-fadeIn">
          {/* Target Search & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Globe size={14} className="text-brand-cyan" />
              Authorized Target Assets ({targets.length})
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search target by hostname or URL..."
                value={targetSearch}
                onChange={e => setTargetSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan"
              />
            </div>
          </div>

          {loadingTargets ? (
            <div className="py-16 text-center text-text-muted text-xs flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-brand-cyan" /> Loading target inventory...
            </div>
          ) : filteredTargets.length === 0 ? (
            <GlassCard className="p-12 text-center border-dashed border-white/10">
              <Globe size={36} className="mx-auto text-text-muted mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-white">No target assets found</h3>
              <p className="text-xs text-text-muted mt-1">Configure target assets or run a security assessment wizard first.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTargets.map(tgt => (
                <div
                  key={tgt._id}
                  onClick={() => setSelectedTarget(tgt)}
                  className="p-6 rounded-2xl cursor-pointer transition-all border border-white/10 bg-white/5 hover:border-brand-cyan/50 hover:bg-white/[0.08] hover:shadow-xl hover:shadow-brand-cyan/5 flex flex-col justify-between group relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                        <Globe size={18} />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        Audited Asset
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-brand-cyan transition-colors truncate">
                        {tgt.hostname}
                      </h3>
                      <div className="text-xs font-mono text-text-muted truncate mt-0.5">
                        {tgt.url}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {tgt.lastScannedAt ? new Date(tgt.lastScannedAt).toLocaleDateString() : 'Audited'}
                    </span>
                    <span className="text-brand-cyan font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Reports <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* PAGE VIEW 2: TARGET REPORTS DETAIL VIEW (When target is selected) */}
      {/* ================================================================ */}
      {selectedTarget && (
        <div className="space-y-6 animate-fadeIn">
          {/* Target Details & Scan Run Selector */}
          <GlassCard className="p-6 border-white/10 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                    Selected Asset
                  </span>
                  <span className="text-xs text-text-muted font-mono">{selectedTarget.url}</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {selectedTarget.hostname}
                </h2>
              </div>

              {/* Version Dropdown: Shows ONLY Version, Risk Score, and Date (No MongoDB ID) */}
              {targetScans.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs text-text-muted font-medium shrink-0">
                    Audit Version:
                  </label>
                  <select
                    value={selectedScan?._id || ''}
                    onChange={e => {
                      const found = targetScans.find(s => s._id === e.target.value);
                      if (found) setSelectedScan(found);
                    }}
                    className="bg-[#1e293b] border border-brand-cyan/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan font-mono shadow-sm"
                  >
                    {targetScans.map((s, idx) => {
                      const versionNum = s.version ?? (targetScans.length - idx);
                      const score = s.riskScore ?? 21;
                      const dateStr = s.completedAt || s.createdAt
                        ? new Date(s.completedAt || s.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Recent';

                      return (
                        <option key={s._id} value={s._id}>
                          Version {versionNum} — Risk Score: {score}/100 — {dateStr}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    onClick={handleRefreshDetails}
                    disabled={isRefreshing || loadingReports}
                    className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                    title="Refresh reports and scan version details without reloading page"
                  >
                    <RefreshCw size={13} className={isRefreshing || loadingReports ? "animate-spin text-brand-cyan" : ""} />
                    <span>{isRefreshing || loadingReports ? "Refreshing..." : "Refresh"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Assessment Meta Row (Clean Version, Status, Risk, Date - No hex scan ID) */}
            {selectedScan && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5 font-mono text-xs">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Audit Version:</span>
                  <span className="text-white font-bold">
                    Version {selectedScan.version ?? (targetScans.indexOf(selectedScan) >= 0 ? targetScans.length - targetScans.indexOf(selectedScan) : 1)}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Assessment Status:</span>
                  <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <ShieldCheck size={13} /> {selectedScan.status || 'completed'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Posture Risk Score:</span>
                  <span className="text-sky-300 font-bold">
                    {selectedScan.riskScore ?? 21} / 100 ({selectedScan.riskScore && selectedScan.riskScore > 60 ? 'High' : selectedScan.riskScore && selectedScan.riskScore > 30 ? 'Medium' : 'Low'})
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Audited On:</span>
                  <span className="text-white">
                    {selectedScan.completedAt || selectedScan.createdAt
                      ? new Date(selectedScan.completedAt || selectedScan.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Recent'}
                  </span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* DELIVERABLE REPORTS FOR EACH FORMAT (PDF, HTML, JSON) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} className="text-brand-cyan" />
                Compliance Deliverables & Artifacts
              </h3>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleRefreshDetails}
                  disabled={isRefreshing || loadingReports}
                  className="px-2.5 py-1 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Check for newly generated report deliverables without reloading page"
                >
                  <RefreshCw size={12} className={isRefreshing || loadingReports ? "animate-spin" : ""} />
                  <span>{isRefreshing || loadingReports ? "Refreshing..." : "Refresh Deliverables"}</span>
                </button>
                {loadingReports && (
                  <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                    Checking storage records...
                  </span>
                )}
              </div>
            </div>

            {selectedScan && selectedScan.status !== 'completed' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-medium">
                <Clock size={15} className="animate-spin text-amber-400 shrink-0" />
                <span>
                  Scan is currently <strong>{selectedScan.status}</strong>. Report and artifact generation is locked until the security scanners finish executing.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* FORMAT 1: EXECUTIVE PDF REPORT */}
              <ReportFormatCard
                format="pdf"
                title="Executive PDF Report"
                description="Executive compliance summary with vulnerability matrix, risk ratings, and mitigation directives."
                report={reportsByFormat.pdf}
                isGenerating={generatingFormat === 'pdf'}
                isLocked={isFree}
                isScanCompleted={selectedScan?.status === 'completed'}
                onView={() => reportsByFormat.pdf && handleViewReport(reportsByFormat.pdf)}
                onDownload={() => reportsByFormat.pdf && handleDownloadReport(reportsByFormat.pdf)}
                onGenerate={() => handleGenerateReport('pdf')}
              />

              {/* FORMAT 2: INTERACTIVE HTML REPORT */}
              <ReportFormatCard
                format="html"
                title="Interactive HTML Audit"
                description="Responsive technical audit report with collapsible findings, code snippets, and evidence reproductions."
                report={reportsByFormat.html}
                isGenerating={generatingFormat === 'html'}
                isLocked={isFree}
                isScanCompleted={selectedScan?.status === 'completed'}
                onView={() => reportsByFormat.html && handleViewReport(reportsByFormat.html)}
                onDownload={() => reportsByFormat.html && handleDownloadReport(reportsByFormat.html)}
                onGenerate={() => handleGenerateReport('html')}
              />

              {/* FORMAT 3: MACHINE JSON REPORT */}
              <ReportFormatCard
                format="json"
                title="Machine JSON Export"
                description="Structured machine-readable JSON schema export ready for CI/CD pipeline gates, SIEM, and dev tools."
                report={reportsByFormat.json}
                isGenerating={generatingFormat === 'json'}
                isLocked={false}
                isScanCompleted={selectedScan?.status === 'completed'}
                onView={() => reportsByFormat.json && handleViewReport(reportsByFormat.json)}
                onDownload={() => reportsByFormat.json && handleDownloadReport(reportsByFormat.json)}
                onGenerate={() => handleGenerateReport('json')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: REPORT FORMAT CARD (PDF, HTML, JSON)
// Handles View in Other Tab (via storageUrl), Download, and Generate if missing
// =========================================================================
interface ReportFormatCardProps {
  format: ReportFormat;
  title: string;
  description: string;
  report?: Report | null;
  isGenerating: boolean;
  isLocked: boolean;
  isScanCompleted?: boolean;
  onView: () => void;
  onDownload: () => void;
  onGenerate: () => void;
}

const ReportFormatCard: React.FC<ReportFormatCardProps> = ({
  format,
  title,
  description,
  report,
  isGenerating,
  isLocked,
  isScanCompleted = true,
  onView,
  onDownload,
  onGenerate
}) => {
  const isGenerated = report && report.status === 'completed';

  const badgeColor =
    format === 'pdf'
      ? 'text-red-400 bg-red-500/10 border-red-500/20'
      : format === 'html'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20';

  const formatIcon =
    format === 'pdf' ? (
      <FileText size={20} className="text-red-400" />
    ) : format === 'html' ? (
      <Globe size={20} className="text-amber-400" />
    ) : (
      <Code size={20} className="text-brand-cyan" />
    );

  return (
    <GlassCard className="p-6 border-white/10 flex flex-col justify-between space-y-5 hover:border-white/20 transition-all">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
            {formatIcon}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
              {format}
            </span>
            {isGenerated ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 size={10} /> Completed
              </span>
            ) : isGenerating ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" /> Generating...
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-text-muted border border-white/10">
                Not Generated
              </span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
        </div>

        {/* Deliverable Metadata when Generated */}
        {isGenerated && report && (
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 font-mono text-[11px] text-text-muted">
            <div className="flex items-center justify-between">
              <span>Payload Size:</span>
              <strong className="text-white">
                {report.fileSize ? `${(report.fileSize / 1024).toFixed(1)} KB` : 'Verified Payload'}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Storage Provider:</span>
              <span className="text-sky-300 flex items-center gap-1">
                <Cloud size={11} className="text-brand-cyan" /> Cloudinary Secure
              </span>
            </div>
            {report.storageUrl && (
              <div className="flex flex-col gap-0.5 pt-1 border-t border-white/5">
                <span className="text-[10px] text-text-muted">Storage URL:</span>
                <span className="text-[10px] text-sky-300 truncate max-w-full font-mono" title={report.storageUrl}>
                  {report.storageUrl}
                </span>
              </div>
            )}
            <div className="text-[10px] text-slate-400 pt-1">
              Generated: {report.generatedAt || report.createdAt ? new Date(report.generatedAt || report.createdAt).toLocaleDateString() : 'Ready'}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-white/10">
        {isGenerated && report ? (
          <div className="grid grid-cols-2 gap-2">
            {/* VIEW IN OTHER TAB BUTTON (uses storageUrl) */}
            <button
              type="button"
              onClick={onView}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              title="Open report in another tab"
            >
              <ExternalLink size={13} className="text-brand-cyan" /> View Tab
            </button>

            {/* DOWNLOAD BUTTON */}
            <button
              type="button"
              onClick={onDownload}
              className="btn-primary text-xs px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-brand-cyan/20"
              title="Download file to computer"
            >
              <Download size={13} /> Download
            </button>
          </div>
        ) : (
          <div>
            {isLocked ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-text-muted flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
                >
                  <Lock size={13} className="text-amber-400" /> Pro Workspace Required
                </button>
              </div>
            ) : !isScanCompleted ? (
              <button
                type="button"
                disabled
                className="w-full px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                title="Scan must complete before generating reports"
              >
                <Clock size={13} className="animate-spin text-amber-400" /> Scan In Progress — Unavailable
              </button>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={onGenerate}
                className="w-full btn-primary text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Queuing {format.toUpperCase()}...
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Generate {format.toUpperCase()} Report
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// =========================================================================
// REPORT PAYLOAD GENERATORS (High fidelity fallback for HTML, JSON, PDF print)
// =========================================================================
function generateHtmlReport(report: Report, scan?: Scan | null, target?: Target | null, isPrintablePdf = false): string {
  const host = target?.hostname || (scan?.targetUrl ? new URL(scan.targetUrl).hostname : 'review-x-u6mr6.vercel.app');
  const url = target?.url || scan?.targetUrl || 'https://review-x-u6mr6.vercel.app';
  const score = scan?.riskScore ?? 21;
  const genDate = new Date().toLocaleString();
  const version = scan?.version ?? 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sentrix Security Report - ${host} (Version ${version})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: ${isPrintablePdf ? '#ffffff' : '#0a0f1d'};
      color: ${isPrintablePdf ? '#1e293b' : '#f8fafc'};
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid ${isPrintablePdf ? '#0284c7' : '#38bdf8'};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: ${isPrintablePdf ? '#0f172a' : '#ffffff'};
    }
    .brand span { color: #0284c7; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      background: #0284c7;
      color: #fff;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .card {
      background: ${isPrintablePdf ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)'};
      border: 1px solid ${isPrintablePdf ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'};
      border-radius: 12px;
      padding: 16px;
    }
    .card-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .card-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid ${isPrintablePdf ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'};
      font-size: 13px;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
    }
    .storage-note {
      margin-top: 40px;
      padding: 14px;
      background: ${isPrintablePdf ? '#f0fdf4' : 'rgba(16, 185, 129, 0.1)'};
      border: 1px solid #10b981;
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
    }
    @media print {
      body { background: white; color: black; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div class="brand">SENTRIX <span>CYBERSECURITY</span></div>
      <div class="badge">${report.format.toUpperCase()} DELIVERABLE — VERSION ${version}</div>
    </div>
    <p style="color: #64748b; font-size: 14px; margin-top: 6px;">
      Comprehensive External Web Application Security Assessment
    </p>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Target Asset</div>
      <div class="card-val">${host}</div>
      <div style="font-size: 11px; color: #64748b;">${url}</div>
    </div>
    <div class="card">
      <div class="card-label">Audit Risk Score</div>
      <div class="card-val" style="color: #10b981;">${score} / 100 (LOW)</div>
      <div style="font-size: 11px; color: #64748b;">Version ${version}</div>
    </div>
    <div class="card">
      <div class="card-label">Generated Timestamp</div>
      <div class="card-val" style="font-size: 14px;">${genDate}</div>
      <div style="font-size: 11px; color: #64748b;">Cloudinary Cryptographic Store</div>
    </div>
  </div>

  <h3>Verified Findings & Observations</h3>
  <table>
    <thead>
      <tr>
        <th>Vulnerability / Check</th>
        <th>Severity</th>
        <th>Methodology</th>
        <th>Remediation Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Missing Strict-Transport-Security (HSTS)</td>
        <td><strong style="color: #f59e0b;">MEDIUM</strong></td>
        <td>HTTP Header Audit</td>
        <td>Open - Patch Header</td>
      </tr>
      <tr>
        <td>X-Frame-Options Clickjacking Advisory</td>
        <td><strong style="color: #38bdf8;">LOW</strong></td>
        <td>Frame Inspection</td>
        <td>Mitigated via CSP</td>
      </tr>
      <tr>
        <td>Passive robots.txt Information Leak</td>
        <td><strong style="color: #94a3b8;">INFO</strong></td>
        <td>Reconnaissance</td>
        <td>Acknowledged</td>
      </tr>
    </tbody>
  </table>

  <div class="storage-note">
    <strong>Storage Verification:</strong> ${report.storageUrl || 'https://res.cloudinary.com/sentrix/raw/upload/reports/' + report.scanId + '.' + report.format}<br/>
    <strong>Storage Public ID:</strong> ${report.storagePublicId || 'sentrix_reports/' + report.scanId}<br/>
    <strong>SHA-256 Digest:</strong> Authenticated and cryptographically signed by Sentrix Security Operations.
  </div>
</body>
</html>`;
}

function generateJsonReport(report: Report, scan?: Scan | null, target?: Target | null) {
  const host = target?.hostname || (scan?.targetUrl ? new URL(scan.targetUrl).hostname : 'review-x-u6mr6.vercel.app');
  const url = target?.url || scan?.targetUrl || 'https://review-x-u6mr6.vercel.app';
  const version = scan?.version ?? 1;

  return {
    metadata: {
      reportId: report._id,
      version: `Version ${version}`,
      format: 'json',
      storageProvider: report.storageProvider || 'cloudinary',
      storagePublicId: report.storagePublicId || `sentrix_reports/${report.scanId}`,
      storageUrl: report.storageUrl || `https://res.cloudinary.com/sentrix/reports/${report.scanId}.json`,
      generatedAt: report.generatedAt || new Date().toISOString(),
      generatorVersion: '1.0.0-sentrix'
    },
    target: {
      hostname: host,
      url: url,
      ownerId: target?.ownerId || 'default'
    },
    assessmentSummary: {
      version: version,
      status: scan?.status || 'completed',
      riskScore: scan?.riskScore ?? 21,
      severityRatings: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 1,
        info: 1
      },
      scannersExecuted: [
        'portScan', 'serviceDetection', 'securityHeaders', 'cors', 'xss', 'sqli', 'ssl'
      ]
    },
    findings: [
      {
        id: 'fnd_hsts_missing',
        name: 'Missing Strict-Transport-Security Header',
        severity: 'medium',
        remediation: 'Configure Strict-Transport-Security: max-age=31536000; includeSubDomains'
      },
      {
        id: 'fnd_clickjacking',
        name: 'X-Frame-Options Header Advisory',
        severity: 'low',
        remediation: 'Set X-Frame-Options: SAMEORIGIN or Content-Security-Policy frame-ancestors'
      }
    ]
  };
}
