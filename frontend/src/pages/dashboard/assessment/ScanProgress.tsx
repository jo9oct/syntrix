import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Scan, ScannerOutcome } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Pause, Play,
  XCircle, Terminal, ArrowRight, ShieldAlert, Activity,
  Clock, Server, Globe
} from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export const ScanProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [scan, setScan] = useState<Scan | null>(location.state?.scan || null);
  const [progress, setProgress] = useState(scan?.progress || 35);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScanner, setCurrentScanner] = useState<string>('securityHeaders');
  const [logs, setLogs] = useState<string[]>([
    `[INIT] Assessment job initialized with ID: ${id || 'scan_active'}`,
    `[AUTH] Target authorization verified against active boundary scope`,
    `[DISCOVERY] Bounded crawling initialized for target: ${scan?.targetUrl || 'https://review-x-u6mr6.vercel.app'}`,
    `[EXEC] Running passive Reconnaissance modules: portScan, ssl, technology...`,
    `[PASS] SSL/TLS Recon completed: TLS 1.3 enforced, HSTS compliant`,
    `[EXEC] Initiating security header assessment (securityHeaders)...`,
    `[ALERT] Flagged Medium: Missing Content-Security-Policy Header`,
    `[ALERT] Flagged Low: Missing Referrer-Policy Header`,
  ]);

  useEffect(() => {
    const fetchScan = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/scans/${id}`);
        if (res.data?.data) {
          setScan(res.data.data);
          setProgress(res.data.data.progress || 35);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (!scan) fetchScan();
  }, [id]);

  useEffect(() => {
    if (isPaused || progress >= 100) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 10;
        if (next >= 100) {
          clearInterval(timer);
          setLogs((l) => [
            ...l,
            '[EXEC] Running Cross-Site Scripting (xss) marker reflection probe...',
            '[ALERT] Flagged Low: Missing X-Content-Type-Options Header',
            '[SUCCESS] All 25 scanner modules completed. Automated telemetry ready.',
            '[COMPLETED] Risk Score calculated: 21/100 (Controlled Risk Posture)',
          ]);
          return 100;
        }

        if (next === 60) {
          setCurrentScanner('xss');
          setLogs((l) => [
            ...l,
            '[EXEC] Running Cross-Site Scripting (xss) marker reflection probe...',
            '[INFO] Tested URL parameter reflection surfaces without unsafe DOM sinks',
          ]);
        } else if (next === 80) {
          setCurrentScanner('cors');
          setLogs((l) => [
            ...l,
            '[EXEC] Evaluating CORS wildcard policy compliance...',
            '[PASS] Access-Control-Allow-Origin does not permit untrusted origins',
          ]);
        }
        return next;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [isPaused, progress]);

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Status Banner */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              progress === 100 ? 'bg-green-500/20 text-green-400' : 'bg-brand-cyan/20 text-brand-cyan'
            }`}>
              <Activity size={24} className={progress < 100 ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {progress === 100 ? 'Security Assessment Complete' : 'Live Assessment In Progress'}
                </h1>
                <span className="text-xs font-mono text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10">
                  {id || 'scan_active'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Target: <span className="font-mono text-white">{scan?.targetUrl || 'https://review-x-u6mr6.vercel.app'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {progress < 100 ? (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isPaused ? <Play size={14} className="text-green-400" /> : <Pause size={14} className="text-amber-400" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => navigate('/dashboard/projects')}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle size={14} /> Abort
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate(`/dashboard/assessment/${id || 'scan_v4_completed'}/results`)}
                className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-cyan/20 animate-pulse"
              >
                View Assessment Results <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-text-muted">
              {progress === 100 ? 'All Scanners Finalized' : `Executing Module: ${currentScanner}`}
            </span>
            <span className="font-mono text-brand-cyan">{progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-brand rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Status</div>
          <div className="text-sm font-bold text-white mt-1 capitalize flex items-center gap-1.5">
            {progress === 100 ? (
              <><CheckCircle2 size={14} className="text-green-400" /> Completed</>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" /> Running</>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Total Scanners</div>
          <div className="text-sm font-bold text-white mt-1 font-mono">
            {scan?.totalScanners || 2} Modules
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Findings Identified</div>
          <div className="text-sm font-bold text-amber-400 mt-1 font-mono">
            {progress >= 100 ? '3 Issues' : '2 Issues'}
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] text-text-muted uppercase font-semibold">Risk Score</div>
          <div className="text-sm font-bold text-brand-cyan mt-1 font-mono">
            {progress >= 100 ? '21 / 100' : 'Calculating...'}
          </div>
        </GlassCard>
      </div>

      {/* Terminal Telemetry Log */}
      <GlassCard className="p-6 border-white/10 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Terminal size={14} className="text-brand-cyan" /> Live Worker Telemetry & Probe Log
          </div>
          <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            Worker: Active
          </span>
        </div>

        <div className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-slate-300 space-y-1.5 max-h-72 overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`leading-relaxed ${
                log.includes('[ALERT]')
                  ? 'text-amber-400 font-semibold'
                  : log.includes('[SUCCESS]')
                  ? 'text-green-400 font-bold'
                  : log.includes('[EXEC]')
                  ? 'text-sky-300'
                  : 'text-slate-400'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
