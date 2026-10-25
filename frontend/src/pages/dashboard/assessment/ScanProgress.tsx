import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Scan, ReportFormat, Report } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Pause, Play,
  XCircle, Terminal, ArrowRight, ShieldAlert, Activity,
  Clock, Server, Globe, RotateCcw, ArrowLeft, FileText,
  ExternalLink, Sparkles, Download, Check, Layers, Lock
} from 'lucide-react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useUserTier } from '../../../store/authStore';

interface TelemetryLog {
  id: string;
  time: string;
  level: 'INIT' | 'QUEUE' | 'WORKER' | 'SCOPE' | 'CONFIG' | 'CRAWL' | 'PROBE' | 'ALERT' | 'SUCCESS';
  text: string;
}

export const ScanProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isFree, tier: userTier } = useUserTier();

  const [scan, setScan] = useState<Scan | null>(location.state?.scan || null);
  const [status, setStatus] = useState<string>(location.state?.scan?.status || 'pending');
  const [progress, setProgress] = useState<number>(
    location.state?.scan?.status === 'completed' ? 100 : location.state?.scan?.status === 'running' ? 25 : 10
  );
  const [cancelling, setCancelling] = useState(false);
  const [currentScanner, setCurrentScanner] = useState<string>('Initializing');
  
  // Quick Report Generation State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>(isFree ? 'json' : 'pdf');
  const [generatedReport, setGeneratedReport] = useState<Report | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Real telemetry event stream
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const seenEventKeys = useRef<Set<string>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<any>(null);

  const pushLog = (
    level: TelemetryLog['level'],
    text: string,
    customTime?: string
  ) => {
    const key = `${level}:${text}`;
    if (seenEventKeys.current.has(key)) return;
    seenEventKeys.current.add(key);

    const time = customTime || new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time,
      level,
      text
    }]);
  };

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // 1. Fetch live scan state & real telemetry from backend (API 3: GET /api/v1/scans/:id)
  const fetchScanState = async () => {
    if (!id) return;
    try {
      // 1. Fetch real scan state
      const res = await api.get(`/scans/${id}`);
      if (res.data?.data) {
        const remoteScan: Scan = res.data.data;
        setScan(remoteScan);

        const realStatus = remoteScan.status || 'pending';
        setStatus(realStatus);

        // Derive active scanner name from real outcomes
        if (Array.isArray(remoteScan.scannerOutcomes)) {
          const activeOutcome = remoteScan.scannerOutcomes.find(o => o.status === 'running');
          if (activeOutcome) {
            setCurrentScanner(activeOutcome.scannerId);
          } else if (remoteScan.scannerOutcomes.length > 0) {
            setCurrentScanner(remoteScan.scannerOutcomes[remoteScan.scannerOutcomes.length - 1].scannerId);
          }
        }

        // Progress Calculation - strictly bound to real backend execution state
        if (realStatus === 'completed') {
          setProgress(100);
        } else if (realStatus === 'cancelled' || realStatus === 'failed') {
          setProgress(0);
        } else if (realStatus === 'pending') {
          setProgress(10);
        } else if (realStatus === 'running') {
          if (typeof remoteScan.progress === 'number' && remoteScan.progress > 0) {
            setProgress(Math.min(95, remoteScan.progress));
          } else if (remoteScan.totalScanners && remoteScan.totalScanners > 0) {
            const calculated = Math.round((remoteScan.completedScanners / remoteScan.totalScanners) * 100);
            setProgress(Math.max(15, Math.min(92, calculated)));
          } else {
            setProgress(prev => Math.max(20, Math.min(90, prev + 2)));
          }
        }

        // --- Stream REAL telemetry events ---
        pushLog('INIT', `Assessment registered for target: ${remoteScan.targetUrl}`);
        if (remoteScan.version) {
          pushLog('INIT', `Assigned iteration run counter: v${remoteScan.version}`);
        }

        if (remoteScan.scopeSnapshot) {
          pushLog(
            'SCOPE',
            `Execution boundary locked: Hostnames [${(remoteScan.scopeSnapshot.hostnames || []).join(', ')}] | Target Port: ${remoteScan.scopeSnapshot.targetPort || 443}`
          );
        }

        if (remoteScan.scanSelection) {
          pushLog(
            'CONFIG',
            `Active modules configured: Recon [${(remoteScan.scanSelection.recon || []).join(', ')}] | Security [${(remoteScan.scanSelection.security || []).join(', ')}]`
          );
        }

        if (Array.isArray(remoteScan.statusHistory)) {
          remoteScan.statusHistory.forEach(h => {
            const lvl = h.to === 'completed' ? 'SUCCESS' : h.to === 'running' ? 'WORKER' : 'QUEUE';
            const timeStr = h.changedAt ? new Date(h.changedAt).toLocaleTimeString('en-US', { hour12: false }) : undefined;
            pushLog(
              lvl,
              `Lifecycle transition: ${h.from ? h.from.toUpperCase() : 'INIT'} -> ${h.to.toUpperCase()} (${h.type || 'system'}${h.reason ? ` - ${h.reason}` : ''})`,
              timeStr
            );
          });
        }

        if (Array.isArray(remoteScan.scannerOutcomes)) {
          remoteScan.scannerOutcomes.forEach(o => {
            const lvl = o.status === 'completed' ? 'PROBE' : o.status === 'failed' ? 'ALERT' : 'WORKER';
            const rawTime = o.completedAt || o.startedAt;
            const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString('en-US', { hour12: false }) : undefined;
            pushLog(
              lvl,
              `Scanner module [${o.scannerId}] -> status: ${o.status.toUpperCase()}${o.errorMessage ? `: ${o.errorMessage}` : ''}`,
              timeStr
            );
          });
        }

        if (realStatus === 'completed') {
          pushLog(
            'SUCCESS',
            `Assessment finalized. Completed ${remoteScan.completedScanners || remoteScan.totalScanners || 0} scanners. Risk posture score: ${remoteScan.riskScore ?? 0}/100.`
          );
        }
      }

      // 2. Poll REAL crawled pages for live crawl stream
      try {
        const crawlRes = await api.get(`/crawls/${id}/pages`);
        const pages = crawlRes.data?.data?.pages || (Array.isArray(crawlRes.data?.data) ? crawlRes.data.data : []);
        if (Array.isArray(pages)) {
          pages.forEach((p: any) => {
            pushLog('CRAWL', `Discovered surface: ${p.url} [HTTP ${p.statusCode || 200}] (Depth: ${p.depth ?? 0})`);
          });
        }
      } catch (e) {
        // Crawl data optional while initializing
      }

      // 3. Poll REAL findings to report live security alerts
      try {
        const findingsRes = await api.get(`/findings?scanId=${id}`);
        const findings = findingsRes.data?.data?.findings || (Array.isArray(findingsRes.data?.data) ? findingsRes.data.data : []);
        if (Array.isArray(findings)) {
          findings.forEach((f: any) => {
            pushLog('ALERT', `Identified finding [${(f.severity || 'low').toUpperCase()}]: ${f.title} (${f.url || scan?.targetUrl || 'target'})`);
          });
        }
      } catch (e) {
        // Findings optional while in progress
      }

    } catch (err) {
      console.error('Failed to poll scan telemetry from backend', err);
    }
  };

  useEffect(() => {
    fetchScanState();
    // Poll backend every 2.5 seconds
    pollIntervalRef.current = setInterval(fetchScanState, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [id]);

  // 2. Cancel Scan (API 4: POST /api/v1/scans/:id/cancel)
  const handleCancelScan = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to halt this security assessment?')) return;
    setCancelling(true);
    try {
      const res = await api.post(`/scans/${id}/cancel`);
      const updated = res.data?.data?.scan;
      if (updated) {
        setScan(updated);
        setStatus('cancelled');
      } else {
        setStatus('cancelled');
      }
      setProgress(0);
      pushLog('ALERT', 'Scan execution cancelled by operator request (API 4). Status: Cancelled.');
    } catch (err: any) {
      console.error('Failed to cancel scan', err);
      alert(err.response?.data?.message || 'Failed to cancel scan.');
    } finally {
      setCancelling(false);
    }
  };

  // 3. Quick Report Generation (API 9: POST /api/v1/reports)
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (status !== 'completed') {
      setReportError('Assessment is still in progress. Reports cannot be generated until status reaches Completed.');
      return;
    }

    if (isFree && (selectedFormat === 'pdf' || selectedFormat === 'html')) {
      navigate('/dashboard/billing');
      return;
    }

    setGeneratingReport(true);
    setReportError(null);
    try {
      const res = await api.post('/reports', {
        scanId: id,
        format: selectedFormat
      });
      if (res.data?.data?.report) {
        setGeneratedReport(res.data.data.report);
      }
    } catch (err: any) {
      console.error('Failed to generate report', err);
      setReportError(err.response?.data?.message || err.message || 'Report generation failed.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Retest Target Functionality: prepares existing scan fields and sends via POST /api/v1/scans
  const [retesting, setRetesting] = useState(false);
  const handleRetest = async () => {
    if (!scan || !scan.targetUrl) return;

    setRetesting(true);
    try {
      const isValidHex24 = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

      let reconScanners = scan.scanSelection?.recon || [];
      let securityScanners = scan.scanSelection?.security || [];

      if (reconScanners.length === 0 && securityScanners.length === 0) {
        if (Array.isArray(scan.scannerOutcomes) && scan.scannerOutcomes.length > 0) {
          const outcomeIds = scan.scannerOutcomes.map((o: any) => o.scannerId);
          securityScanners = outcomeIds.filter((sid: string) => !['dns', 'robots', 'sitemap', 'ssl', 'subdomains', 'technology', 'versionDetection', 'webServer'].includes(sid));
          reconScanners = outcomeIds.filter((sid: string) => ['dns', 'robots', 'sitemap', 'ssl', 'subdomains', 'technology', 'versionDetection', 'webServer'].includes(sid));
        }
      }
      if (reconScanners.length === 0 && securityScanners.length === 0) {
        securityScanners = ['securityHeaders', 'xss'];
      }

      if (isFree) {
        if (securityScanners.length > 0) {
          securityScanners = [securityScanners[0]];
          reconScanners = [];
        } else if (reconScanners.length > 0) {
          reconScanners = [reconScanners[0]];
          securityScanners = [];
        } else {
          securityScanners = ['securityHeaders'];
        }
      }

      const payload: {
        targetUrl: string;
        scanSelection: { recon: string[]; security: string[] };
        scopes?: string[];
        companyRuleIds?: string[];
      } = {
        targetUrl: scan.targetUrl.trim(),
        scanSelection: {
          recon: reconScanners,
          security: securityScanners
        }
      };

      if (scan.scopeId && isValidHex24(scan.scopeId)) {
        payload.scopes = [scan.scopeId];
      }

      if (Array.isArray(scan.companyRuleIds)) {
        const validRuleIds = scan.companyRuleIds.map(String).filter(isValidHex24);
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

  // STRICT STATUS ENFORCEMENT: Never show complete unless backend status is strictly completed
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isPending = status === 'pending';
  const isRunning = status === 'running';
  const isFailed = status === 'failed';

  const totalFindings = scan?.findingCounts
    ? (scan.findingCounts.critical || 0) + (scan.findingCounts.high || 0) + (scan.findingCounts.medium || 0) + (scan.findingCounts.low || 0)
    : 0;

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Background Work Notification Banner for Pending / Running Scans */}
      {(isPending || isRunning) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-cyan/10 via-sky-500/10 to-purple-500/10 border border-brand-cyan/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-cyan/20 text-brand-cyan shrink-0">
              <Clock size={20} className={isPending ? 'animate-pulse' : 'animate-spin'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isPending ? 'Assessment Queued (Pending)' : 'Background Assessment Active'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-cyan/20 text-brand-cyan">
                  Asynchronous Job
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isPending
                  ? 'Your assessment is registered and queued for worker execution. You can safely continue other work while it processes.'
                  : 'Scanners are actively evaluating the target in the background. Feel free to navigate away; Sentrix tracks everything.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto border border-white/10"
          >
            <ArrowLeft size={14} /> Run in Background & Continue Work
          </button>
        </div>
      )}

      {/* Top Status Banner */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400'
                : isCancelled || isFailed
                ? 'bg-red-500/20 text-red-400'
                : isPending
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-brand-cyan/20 text-brand-cyan'
            }`}>
              <Activity size={24} className={isRunning ? 'animate-spin' : isPending ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {isCancelled
                    ? 'Security Assessment Cancelled'
                    : isFailed
                    ? 'Security Assessment Failed'
                    : isCompleted
                    ? 'Security Assessment Complete'
                    : isPending
                    ? 'Assessment Queued & Pending Execution'
                    : 'Live Assessment In Progress'}
                </h1>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : isCancelled || isFailed
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : isPending
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30'
                }`}>
                  Status: {status}
                </span>
                <span className="text-xs font-mono text-text-muted px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  Run v{scan?.version || 1}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Target: <span className="font-mono text-white">{scan?.targetUrl || 'Target endpoint'}</span>
              </p>
            </div>
          </div>

          {/* Action buttons: strictly guarded by status === 'completed' */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isCancelled || isFailed ? (
              <button
                disabled={retesting}
                onClick={handleRetest}
                className="btn-primary text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                title="Retest Target using existing parameters (no input needed)"
              >
                <RotateCcw size={14} className={retesting ? 'animate-spin' : ''} />
                {retesting ? 'Launching Retest...' : 'Retest Assessment'}
              </button>
            ) : isCompleted ? null : (
              <>
                {/* During pending or running: report and view findings are strictly disabled/unclickable */}
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-text-muted flex items-center gap-1.5 cursor-not-allowed opacity-50"
                  title="Report generation is locked until assessment status reaches Completed"
                >
                  <Lock size={13} className="text-amber-400" /> Generate Report (Locked)
                </button>

                <button
                  type="button"
                  disabled
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-text-muted flex items-center gap-1.5 cursor-not-allowed opacity-50"
                  title="Findings inspection unlocks once assessment status reaches Completed"
                >
                  <Clock size={13} className="animate-spin text-amber-400" /> View Findings (Scanning...)
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-brand-cyan/20"
                  title="Allow scan to complete asynchronously in background"
                >
                  <ArrowLeft size={14} /> Run in Background
                </button>

                <button
                  disabled={cancelling}
                  onClick={handleCancelScan}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Halting...' : 'Cancel Scan'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-text-muted">
              {isCancelled
                ? 'Assessment Halted by Operator'
                : isFailed
                ? 'Assessment Execution Failed'
                : isCompleted
                ? 'All Scanner Modules Finalized Successfully'
                : isPending
                ? 'Pending: Queued in scanner worker pipeline...'
                : `Executing Scanner Module: ${currentScanner}`}
            </span>
            <span className="font-mono text-brand-cyan">{isCancelled || isFailed ? 0 : progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCancelled || isFailed
                  ? 'bg-red-500/50'
                  : isCompleted
                  ? 'bg-emerald-500'
                  : 'bg-gradient-brand'
              }`}
              style={{ width: `${isCancelled || isFailed ? 100 : progress}%` }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Queue State</div>
          <div className="text-sm font-bold text-white mt-1 capitalize flex items-center gap-1.5">
            {isCancelled ? (
              <><XCircle size={14} className="text-red-400" /> Cancelled</>
            ) : isFailed ? (
              <><AlertTriangle size={14} className="text-red-400" /> Failed</>
            ) : isCompleted ? (
              <><CheckCircle2 size={14} className="text-emerald-400" /> Completed</>
            ) : isPending ? (
              <><Clock size={14} className="text-amber-400 animate-pulse" /> Pending</>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" /> Running</>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Scanner Modules</div>
          <div className="text-sm font-bold text-white mt-1 font-mono">
            {scan?.completedScanners ?? 0} / {scan?.totalScanners || (scan?.scanSelection ? ((scan.scanSelection.recon?.length || 0) + (scan.scanSelection.security?.length || 0)) : 1)} Finished
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Findings Identified</div>
          <div className="text-sm font-bold text-amber-400 mt-1 font-mono">
            {isCompleted
              ? `${totalFindings} Issues Detected`
              : isRunning
              ? 'Scanning Target...'
              : 'Queued in Backlog'}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Risk Posture Score</div>
          <div className="text-sm font-bold text-brand-cyan mt-1 font-mono">
            {isCompleted
              ? `${scan?.riskScore ?? 0} / 100`
              : 'Evaluating...'}
          </div>
        </GlassCard>
      </div>

      {/* When completed, show rich summary & navigation panel */}
      {isCompleted && (
        <GlassCard className="p-6 border-emerald-500/30 bg-emerald-500/[0.03] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>Assessment Completed Successfully</span>
              </div>
              <p className="text-xs text-slate-300">
                All scanner modules have concluded. Findings, evidence exchanges, and audit reports are ready to view.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={retesting}
                onClick={handleRetest}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Retest Target using existing parameters (no input needed)"
              >
                <RotateCcw size={14} className={retesting ? 'animate-spin text-brand-cyan' : 'text-brand-cyan'} />
                {retesting ? 'Retesting...' : 'Retest Target'}
              </button>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FileText size={14} className="text-brand-cyan" /> Generate Report
              </button>

              <button
                onClick={() => navigate(`/dashboard/assessment/${id}/results`)}
                className="btn-primary text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-cyan/20"
              >
                Inspect Results & Evidence <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Terminal Telemetry Log - 100% Real-time Database & Probe Events */}
      <GlassCard className="p-6 border-white/10 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Terminal size={14} className="text-brand-cyan" /> Live Worker Telemetry & Probe Event Stream
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isCompleted
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : isPending
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-green-400 bg-green-500/10 border-green-500/20'
          }`}>
            Worker Status: {isCompleted ? 'Finalized' : isPending ? 'Queued' : 'Active'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-slate-300 space-y-2 max-h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-text-muted text-[11px] py-4 text-center">
              Connecting to worker event pipeline...
            </div>
          ) : (
            logs.map(log => {
              const colorClass =
                log.level === 'ALERT'
                  ? 'text-amber-400'
                  : log.level === 'SUCCESS'
                  ? 'text-emerald-400 font-bold'
                  : log.level === 'CRAWL'
                  ? 'text-sky-300'
                  : log.level === 'PROBE'
                  ? 'text-indigo-300'
                  : log.level === 'WORKER'
                  ? 'text-cyan-300'
                  : log.level === 'QUEUE'
                  ? 'text-amber-300'
                  : 'text-slate-400';

              return (
                <div key={log.id} className="leading-relaxed flex items-start gap-2">
                  <span className="text-[10px] text-text-muted shrink-0 select-none">[{log.time}]</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold shrink-0 ${
                    log.level === 'ALERT'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : log.level === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : log.level === 'CRAWL'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}>
                    {log.level}
                  </span>
                  <span className={`${colorClass} break-all flex-1`}>{log.text}</span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </GlassCard>

      {/* QUICK REPORT GENERATION MODAL (API 9: POST /api/v1/reports) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0f172a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand-cyan" />
                <h3 className="text-base font-bold text-white">Generate Assessment Report</h3>
              </div>
              <button
                onClick={() => {
                  setIsReportModalOpen(false);
                  setGeneratedReport(null);
                }}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="p-6 space-y-4">
              {reportError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{reportError}</span>
                </div>
              )}

              {generatedReport ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 size={16} /> Report Generated Successfully!
                    </div>
                    <p className="text-slate-300">
                      Format: <strong className="uppercase text-white font-mono">{generatedReport.format}</strong> • Status: {generatedReport.status}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/reports?scanId=${id}`)}
                      className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Open in Reports Center
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Select Report Format
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['pdf', 'html', 'json'] as const).map(fmt => {
                        const isLocked = isFree && (fmt === 'pdf' || fmt === 'html');
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setSelectedFormat(fmt)}
                            className={`p-3.5 rounded-xl border text-center transition-all ${
                              selectedFormat === fmt
                                ? 'bg-brand-cyan/20 border-brand-cyan text-white shadow-md shadow-brand-cyan/20'
                                : 'bg-white/5 border-white/10 text-text-muted hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="block font-mono text-xs font-bold uppercase">{fmt}</span>
                            <span className="text-[10px] text-text-muted mt-0.5 block">
                              {fmt === 'pdf' ? 'Executive' : fmt === 'html' ? 'Interactive' : 'Raw Data'}
                            </span>
                            {isLocked && (
                              <span className="text-[9px] text-amber-400 mt-1 block">Pro Required</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                    This report compiles all scanner outcomes, discovered vulnerability findings, evidence trails, and prioritized remediation instructions for <strong className="text-white">{scan?.targetUrl || 'target'}</strong>.
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-text-muted font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generatingReport || status !== 'completed'}
                      className="btn-primary text-xs px-5 py-2 rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingReport
                        ? 'Generating Report...'
                        : status !== 'completed'
                        ? 'Locked (Scan in Progress)'
                        : `Generate ${selectedFormat.toUpperCase()} Report`}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};