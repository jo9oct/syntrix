import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Pause, Play,
  XCircle, Terminal, ArrowRight, ShieldAlert, Activity
} from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const SCAN_STEPS = [
  { name: 'Target Classification & DNS Resolution', category: 'Discovery', status: 'done', detail: 'Identified Nginx 1.25.3 reverse proxy & Express Node API' },
  { name: 'SSL / TLS Cipher Suites & Certificate Chain', category: 'TLS', status: 'done', detail: 'TLS 1.3 supported, valid Let\'s Encrypt certificate' },
  { name: 'HTTP Defensive Security Headers Audit', category: 'Headers', status: 'done', detail: 'Missing Content-Security-Policy & Strict-Transport-Security' },
  { name: 'CORS Origin Reflection & Wildcard Probes', category: 'CORS', status: 'done', detail: 'Origin reflection tested safe on /api/v1/auth' },
  { name: 'SQL Injection Dynamic Polyglot Fuzzing', category: 'Injection', status: 'running', detail: 'Injecting boolean-blind SQL payloads on parameter "username"' },
  { name: 'Cross-Site Scripting (Reflected & DOM XSS)', category: 'Injection', status: 'queued', detail: 'Queued for GET /search?q=' },
  { name: 'Broken Object-Level Auth (BOLA/IDOR)', category: 'Auth', status: 'queued', detail: 'Queued for GET /api/v1/users/:id' },
  { name: 'Rate Limiting & Token Exhaustion Throttling', category: 'Throttling', status: 'queued', detail: 'Queued for POST /api/v1/auth/login' },
];

export const ScanProgress: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [progress, setProgress] = useState(25);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(4);
  const [findingsFound, setFindingsFound] = useState(2);
  const [logs, setLogs] = useState<string[]>([
    '[INIT] Security assessment job started: ' + (id || 'scan-101'),
    '[DISCOVERY] Fingerprinted server: Linux x86_64, Node.js v20.11',
    '[PASSED] TLS 1.3 verification passed without weak ciphers',
    '[ALERT] Flagged Low finding: Missing Content-Security-Policy',
    '[ALERT] Flagged Medium finding: Missing Strict-Transport-Security',
    '[EXEC] Running SQLi probe module on POST /api/v1/auth/login...',
  ]);

  useEffect(() => {
    if (isPaused || progress >= 100) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(timer);
          setLogs((l) => [
            ...l,
            '[ALERT] Flagged Critical finding: SQL Injection detected in login username parameter!',
            '[ALERT] Flagged High finding: Reflected XSS detected in search query parameter',
            '[SUCCESS] All test vectors executed. Assessment report ready.',
          ]);
          setFindingsFound(4);
          return 100;
        }

        if (next === 50) {
          setCurrentStepIndex(5);
          setLogs((l) => [...l, '[EXEC] Running Reflected XSS payload test matrix...']);
        } else if (next === 75) {
          setCurrentStepIndex(6);
          setLogs((l) => [...l, '[EXEC] Probing BOLA/IDOR user access control permutations...']);
        }
        return next;
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isPaused, progress]);

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Status Banner */}
      <GlassCard className="p-6 border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              progress === 100 ? 'bg-green-500/20 text-green-400' : 'bg-brand-cyan/20 text-brand-cyan'
            }`}>
              <Activity size={22} className={progress < 100 ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {progress === 100 ? 'Scan Complete' : 'Live Assessment In Progress'}
                </h1>
                <span className="text-xs font-mono text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10">
                  {id || 'scan-101'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Target: <span className="font-mono text-white">https://portal.acmecorp.local</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {progress < 100 ? (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  {isPaused ? <Play size={14} className="text-green-400" /> : <Pause size={14} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => setProgress(100)}
                  className="btn-primary text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5"
                >
                  Skip to Results <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate(`/dashboard/assessment/${id || 'scan-101'}/results`)}
                className="btn-primary text-xs px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-brand-cyan/30"
              >
                View Assessment Results <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted flex items-center gap-2 font-medium">
              <span>Overall Execution</span>
              {progress < 100 && <span className="text-brand-cyan font-mono animate-pulse">Running test queue...</span>}
            </span>
            <span className="font-bold text-white font-mono">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-brand rounded-full transition-all duration-500 shadow-lg shadow-brand-cyan/30"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-white/10 text-center text-xs">
          <div>
            <div className="text-text-muted text-[10px] uppercase">Vulnerabilities Detected</div>
            <div className="text-lg font-bold text-red-400 mt-0.5">{findingsFound}</div>
          </div>
          <div>
            <div className="text-text-muted text-[10px] uppercase">Current Running Vector</div>
            <div className="text-xs font-semibold text-brand-cyan mt-1 truncate">
              {progress === 100 ? 'All Completed' : SCAN_STEPS[currentStepIndex]?.name}
            </div>
          </div>
          <div>
            <div className="text-text-muted text-[10px] uppercase">Tests Executed</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {progress === 100 ? SCAN_STEPS.length : currentStepIndex} / {SCAN_STEPS.length}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Two Column Layout: Steps vs Terminal Log */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Test Steps Execution Queue */}
        <GlassCard className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            Test Vector Queue
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {SCAN_STEPS.map((s, idx) => {
              const isFinished = progress === 100 || idx < currentStepIndex;
              const isCurrent = progress < 100 && idx === currentStepIndex;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? 'bg-brand-cyan/10 border-brand-cyan/40 text-white'
                      : isFinished
                      ? 'bg-white/5 border-white/5 text-text-muted'
                      : 'bg-white/[0.01] border-white/5 text-text-muted/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="flex items-center gap-2">
                      {isFinished ? (
                        <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                      ) : isCurrent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-ping shrink-0" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-white/20 shrink-0" />
                      )}
                      <span className={isCurrent ? 'text-brand-cyan' : isFinished ? 'text-white' : ''}>
                        {s.name}
                      </span>
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/5 font-mono">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted pl-6">{s.detail}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Live Terminal Log */}
        <GlassCard className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <Terminal size={14} className="text-brand-cyan" />
              <span>Engine Console Log</span>
            </div>
            <span className="text-[10px] text-green-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Streaming
            </span>
          </div>

          <div className="flex-1 bg-black/60 rounded-xl p-3.5 font-mono text-[11px] text-green-300/90 overflow-y-auto space-y-1.5 border border-white/10 max-h-80">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes('[ALERT]')
                    ? 'text-red-400 font-semibold'
                    : log.includes('[SUCCESS]')
                    ? 'text-cyan-300 font-bold'
                    : 'text-green-300/80'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
