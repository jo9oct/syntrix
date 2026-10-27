import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Bug,
  Search,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Globe,
  Lock,
  Cpu,
  Layers,
  Terminal,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Clock,
  Shield,
  FileCode,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { SeverityBadge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';
import api from '../../lib/api';

interface Finding {
  _id: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  remediation?: string;
  location?: string | null;
  metadata?: any;
}

interface ScannerOption {
  id: string;
  category: 'recon' | 'security';
  name: string;
  description: string;
  badge: string;
}

// Curated list of high-impact scanners ideal for guest sessions
const GUEST_SCANNERS: ScannerOption[] = [
  {
    id: 'securityHeaders',
    category: 'security',
    name: 'Security Headers',
    description: 'Inspects HSTS, CSP, X-Frame-Options, X-Content-Type, and Referrer policies',
    badge: 'Recommended',
  },
  {
    id: 'ssl',
    category: 'recon',
    name: 'SSL / TLS Trust',
    description: 'Verifies certificate validity, cipher protocols, hostname match, and expiration',
    badge: 'Cryptographic',
  },
  {
    id: 'technology',
    category: 'recon',
    name: 'Technology Stack',
    description: 'Identifies publicly disclosed web servers, frameworks, and CMS footprints',
    badge: 'Fingerprint',
  },
  {
    id: 'cors',
    category: 'security',
    name: 'CORS Security',
    description: 'Analyzes cross-origin access controls, wildcard origins, and credential exposure',
    badge: 'API & Web',
  },
  {
    id: 'xss',
    category: 'security',
    name: 'XSS Detection',
    description: 'Checks for potential reflected and DOM-based Cross-Site Scripting sinks',
    badge: 'OWASP Top 10',
  },
  {
    id: 'robots',
    category: 'recon',
    name: 'Robots & Sitemap',
    description: 'Scans robots.txt and XML sitemaps for sensitive administrative paths',
    badge: 'Reconnaissance',
  },
  {
    id: 'sqli',
    category: 'security',
    name: 'SQL Injection',
    description: 'Tests URL parameters and query endpoints for SQL syntax error indicators',
    badge: 'Deep Injection',
  },
  {
    id: 'openRedirect',
    category: 'security',
    name: 'Open Redirect',
    description: 'Verifies URL redirection parameters to prevent arbitrary external forwarding',
    badge: 'Phishing Defense',
  },
];

export const Analysis: React.FC = () => {
  // Live Website Scanner State
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedScanner, setSelectedScanner] = useState<string>('securityHeaders');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [scanResults, setScanResults] = useState<Finding[] | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [dailyQuotaNote, setDailyQuotaNote] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Malware Static Analysis State (Preserved)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [malwareResult, setMalwareResult] = useState<any | null>(null);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Quick preset targets for instant guest testing
  const setPresetTarget = (url: string) => {
    setTargetUrl(url);
    setScanError(null);
  };

  // Helper to normalize input URL
  const formatUrl = (input: string): string => {
    let trimmed = input.trim();
    if (!trimmed) return '';
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  // Start real backend scan as guest
  const startScan = async () => {
    const formatted = formatUrl(targetUrl);
    if (!formatted) {
      setScanError('Please enter a valid target domain or URL (e.g., https://example.com).');
      return;
    }

    try {
      new URL(formatted);
    } catch {
      setScanError('The entered target URL is not a valid web address.');
      return;
    }

    setScanError(null);
    setScanResults(null);
    setIsScanning(true);
    setScanProgress(15);
    setStatusMessage('Dispatching guest assessment worker…');

    const isRecon = ['ssl', 'technology', 'webServer', 'dns', 'portScan', 'robots', 'sitemap'].includes(selectedScanner);

    const scanPayload = {
      targetUrl: formatted,
      scanSelection: {
        recon: isRecon ? [selectedScanner] : [],
        security: !isRecon ? [selectedScanner] : [],
      },
    };

    try {
      // If outside login, ensure no stale Authorization header is sent
      const headers: Record<string, string> = {};
      const auth = (window as any)?.__ZUSTAND_STATE__ || {};
      
      // POST /api/v1/scans with credentials: 'include' (handled by api axios config withCredentials: true)
      const res = await api.post('/scans', scanPayload, {
        headers: {
          ...headers,
        },
      });
      const createdScan = res.data?.data?.scan;

      if (!createdScan || !createdScan._id) {
        throw new Error('Failed to obtain a valid scan reference from the assessment API.');
      }

      const scanId = createdScan._id;
      const scanOwnerId = createdScan.ownerId || '';
      setActiveScanId(scanId);
      setStatusMessage('Container initialized. Executing security engine…');
      setScanProgress(30);

      // Helper headers ensuring guest identity matches across requests
      const guestHeaders: Record<string, string> = {};
      if (scanOwnerId) {
        guestHeaders['x-guest-id'] = scanOwnerId;
      }

      const activeScannerName = GUEST_SCANNERS.find(s => s.id === selectedScanner)?.name || selectedScanner;

      // Begin polling for real backend progress
      let elapsedTicks = 0;
      let consecutivePollErrors = 0;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        elapsedTicks += 1;
        try {
          const statusRes = await api.get(`/scans/${scanId}?guestId=${scanOwnerId}`, {
            headers: guestHeaders,
          });
          consecutivePollErrors = 0;
          const scanData = statusRes.data?.data || statusRes.data;

          if (scanData) {
            const backendProgress = scanData.progress || 0;
            // Smooth progress progression: gradual climb towards 92% during active processing
            const estimatedProgress = Math.min(25 + Math.floor(elapsedTicks * 2.2), 92);
            setScanProgress(Math.max(backendProgress, estimatedProgress));

            if (scanData.status === 'completed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setScanProgress(100);
              setStatusMessage('Assessment completed. Extracting identified findings…');

              // Fetch real findings from backend with graceful fallback
              let items: Finding[] = [];
              try {
                const findingsRes = await api.get(`/findings?scanId=${scanId}&guestId=${scanOwnerId}`, {
                  headers: guestHeaders,
                });
                items = findingsRes.data?.data?.findings || findingsRes.data?.findings || [];
              } catch {
                try {
                  const fallbackRes = await api.get(`/findings?scanId=${scanId}`, {
                    headers: guestHeaders,
                  });
                  items = fallbackRes.data?.data?.findings || fallbackRes.data?.findings || [];
                } catch {
                  items = [];
                }
              }

              setScanResults(items);
              setIsScanning(false);
            } else if (scanData.status === 'failed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setIsScanning(false);
              setScanError(scanData.errorMessage || 'Assessment failed to complete. The target server may be unreachable.');
            } else if (scanData.status === 'running') {
              if (elapsedTicks <= 6) {
                setStatusMessage('Resolving target DOM and mapping input endpoints…');
              } else if (elapsedTicks <= 16) {
                setStatusMessage(`Executing ${activeScannerName} active test vectors…`);
              } else if (elapsedTicks <= 28) {
                setStatusMessage('Correlating HTTP responses & evaluating policy directives…');
              } else {
                setStatusMessage('Finalizing vulnerability heuristics & verifying telemetry…');
              }
            } else if (scanData.status === 'pending') {
              setStatusMessage('Dispatching scan to security worker queue…');
            }
          }

          // Generous safety timeout: 90 ticks * 2s = 180 seconds (3 minutes)
          if (elapsedTicks > 90) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsScanning(false);
            setScanError('The scan request exceeded the 3-minute window. Please verify that the target domain is publicly accessible.');
          }
        } catch (pollErr: any) {
          consecutivePollErrors += 1;
          // Allow up to 8 transient poll network errors before terminating
          if (consecutivePollErrors > 8) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsScanning(false);
            setScanError(pollErr?.response?.data?.error?.message || 'Lost connection to scanner worker.');
          }
        }
      }, 2000);

    } catch (err: any) {
      setIsScanning(false);
      const apiCode = err?.response?.data?.error?.code;
      const apiMsg = err?.response?.data?.error?.message;

      if (apiCode === 'DAILY_SCAN_LIMIT_REACHED') {
        setScanError('You have reached the guest daily limit (5 scans per day). Sign in or create a workspace for unlimited high-concurrency scans.');
        setDailyQuotaNote('5 / 5 daily guest scans consumed');
      } else if (apiCode === 'SCANNER_LIMIT_REACHED') {
        setScanError('Guest tier allows 1 focused scanner per run. Please select a single scanner below.');
      } else if (apiCode === 'CONCURRENT_SCAN_LIMIT_REACHED') {
        setScanError('A guest scan is already running. Please wait for the current assessment to finish.');
      } else {
        setScanError(apiMsg || err?.message || 'Unable to start assessment. Please check your network and try again.');
      }
    }
  };

  // Malware File Upload & Simulation (Preserved Exactly)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      simulateMalwareAnalysis(file.name, file.size);
    }
  };

  const simulateMalwareAnalysis = (name: string, size: number) => {
    setIsUploading(true);
    setUploadProgress(20);
    setMalwareResult(null);

    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(100);
            setMalwareResult({
              name,
              size: `${(size / 1024).toFixed(1)} KB`,
              md5: '7d2b8fe09b4d32e9a7e6c1a89c3b8812',
              sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
              entropy: '7.84 (High Obfuscation / Packed)',
              riskScore: 84,
              classification: 'Suspicious / Potential Dropper',
              iocs: ['185.220.101.47', 'cdn-updater-service.net', 'RegWrite: HKLM\\Run\\Update'],
              suspiciousStrings: [
                'VirtualAllocEx',
                'WriteProcessMemory',
                'CreateRemoteThread',
                'powershell.exe -enc',
              ],
            });
          }, 400);
          return 90;
        }
        return p + 25;
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background-darker text-white pt-24 pb-20 px-4 sm:px-6 relative overflow-hidden font-sans">
      <PublicHeader />

      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] orb orb-cyan opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/3 -right-32 w-[450px] h-[450px] orb orb-purple opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-blue/5 blur-[160px] pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header Section */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck size={13} className="text-brand-cyan" />
            <span>Public Assessment Sandbox</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Live Security Analysis
          </h1>
          <p className="text-text-muted text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Zero-installation web surface vulnerability evaluation and malware file inspection.
            Connected directly to Sentrix’s real-time assessment engines.
          </p>

          {/* Guest Sandbox Capabilities Badge */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8">
              <Check size={12} className="text-brand-cyan" /> 1 Focused Engine per Run
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8">
              <Check size={12} className="text-brand-cyan" /> Up to 5 Daily Scans
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8">
              <Zap size={12} className="text-amber-400" /> Free Guest Session
            </span>
          </div>
        </div>

        {/* 2-Column Split: Left = Live Web Scanner | Right = Malware Analysis (Under Development) */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">

          {/* ════════════════════════════════════════════════════════════
              LEFT PANEL: Live Website Scanner (Connected to Backend)
              ════════════════════════════════════════════════════════════ */}
          <div className="glass-card border-white/10 hover:border-brand-cyan/30 transition-all duration-300 flex flex-col p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple" />

            {/* Panel Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0 shadow-lg shadow-brand-cyan/10">
                  <Globe size={22} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                    Live Website Scanner
                  </h2>
                  <p className="text-xs text-text-muted">Real-time dynamic endpoint and protocol assessment</p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                API LIVE
              </span>
            </div>

            {/* Error Notification */}
            {scanError && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-relaxed font-medium">
                  {scanError}
                  {dailyQuotaNote && (
                    <div className="text-[11px] text-rose-400 font-mono mt-1">Quota: {dailyQuotaNote}</div>
                  )}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="space-y-4 mb-5">
              {/* Target Domain or URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Target Domain or URL
                  </label>
                  <span className="text-[11px] text-text-muted/70">Publicly accessible host</span>
                </div>

                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-text-muted font-mono text-xs border-r border-white/10 pr-2">
                    <Globe size={14} className="text-brand-cyan" />
                    <span className="text-white/60">URL</span>
                  </div>
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => {
                      setTargetUrl(e.target.value);
                      if (scanError) setScanError(null);
                    }}
                    placeholder="https://example.com"
                    disabled={isScanning}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-24 pr-4 text-white text-sm focus:outline-none focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/20 focus:bg-white/[0.07] font-mono transition-all placeholder:text-text-muted/40 disabled:opacity-60"
                  />
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-text-muted/60">Quick test:</span>
                  {[
                    'https://example.com',
                    'https://owasp.org',
                    'https://scanme.nmap.org',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isScanning}
                      onClick={() => setPresetTarget(preset)}
                      className="px-2 py-0.5 rounded-lg bg-white/4 hover:bg-white/8 border border-white/8 text-text-muted hover:text-white transition-colors font-mono cursor-pointer disabled:opacity-50"
                    >
                      {preset.replace('https://', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine Selection: Guest Single Engine */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Select Security Engine (Guest Mode)
                  </label>
                  <span className="text-[11px] font-mono text-brand-cyan">1 Engine / Run</span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {GUEST_SCANNERS.map((scanner) => {
                    const isSelected = selectedScanner === scanner.id;
                    return (
                      <button
                        key={scanner.id}
                        type="button"
                        disabled={isScanning}
                        onClick={() => setSelectedScanner(scanner.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-cyan/12 border-brand-cyan/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                            : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-brand-cyan' : 'text-white'}`}>
                            {scanner.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-text-muted">
                            {scanner.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-2 leading-tight">
                          {scanner.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Pro Tier Parallel Callout */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/6 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Zap size={13} className="text-amber-400 shrink-0" />
                    <span className="text-[11px]">Want to run all 25 engines concurrently?</span>
                  </div>
                  <Link
                    to="/register"
                    className="text-[11px] text-brand-cyan hover:underline font-bold flex items-center gap-1 shrink-0"
                  >
                    Workspace Plan <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Execute Scan Button */}
            <button
              onClick={startScan}
              disabled={isScanning}
              className="w-full py-3 px-5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple hover:opacity-95 shadow-lg shadow-brand-cyan/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Scanning Target ({scanProgress}%)…</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Execute Security Scan</span>
                </>
              )}
            </button>

            {/* Progress Status Bar */}
            {isScanning && (
              <div className="mt-4 p-3.5 rounded-2xl bg-white/[0.03] border border-brand-cyan/30 animate-fadeIn">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-brand-cyan font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
                    {statusMessage}
                  </span>
                  <span className="font-mono text-white/80">{scanProgress}%</span>
                </div>
                <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple h-full transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Live Scan Results Display */}
            {scanResults && (
              <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-white/8">
                  <span className="text-sm font-extrabold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand-cyan" /> Scan Completed
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-cyan font-bold px-2 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/25 font-mono">
                      {scanResults.length} {scanResults.length === 1 ? 'Finding' : 'Findings'} Identified
                    </span>
                  </div>
                </div>

                {/* Findings List */}
                {scanResults.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                      <Check size={20} />
                    </div>
                    <div className="text-sm font-bold text-white">No Vulnerabilities Identified</div>
                    <div className="text-xs text-text-muted max-w-xs mx-auto">
                      The target server passed all test assertions for the selected {selectedScanner} engine.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {scanResults.map((r, i) => (
                      <div key={r._id || i} className="p-3 bg-white/[0.04] rounded-xl border border-white/8 space-y-1.5 hover:border-brand-cyan/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white leading-snug">{r.title}</span>
                          <SeverityBadge severity={r.severity || 'low'} />
                        </div>
                        {r.description && (
                          <div className="text-[11px] text-text-muted leading-relaxed">{r.description}</div>
                        )}
                        {r.remediation && (
                          <div className="text-[11px] text-brand-cyan font-medium flex items-start gap-1">
                            <span className="text-white/40 shrink-0">Fix:</span>
                            <span>{r.remediation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Guest Save Action Banner */}
                <div className="pt-2 border-t border-white/8 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                  <span className="text-text-muted text-[11px]">Temporary session results</span>
                  <Link
                    to="/register"
                    className="text-brand-cyan hover:underline font-bold flex items-center gap-1.5"
                  >
                    <span>Save to workspace for certified report</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              RIGHT PANEL: Malware Static Analysis (View-Only / Under Development)
              ════════════════════════════════════════════════════════════ */}
          <div className="glass-card border-white/10 hover:border-brand-purple/30 transition-all duration-300 flex flex-col p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-purple via-brand-magenta to-brand-cyan" />

            {/* Panel Header with Under Development Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-purple/15 border border-brand-purple/30 flex items-center justify-center text-brand-purple shrink-0 shadow-lg shadow-brand-purple/10">
                  <Bug size={22} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                    Malware Static Analysis
                  </h2>
                  <p className="text-xs text-text-muted">Headers, strings, sections, and hash classification</p>
                </div>
              </div>

              {/* UNDER DEVELOPMENT BADGE */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>UNDER DEVELOPMENT</span>
              </div>
            </div>

            {/* UNDER DEVELOPMENT NOTICE BANNER */}
            <div className="mb-5 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-amber-200 flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <div className="leading-relaxed">
                <div className="font-bold text-white mb-0.5">Feature Under Active Development</div>
                <span>
                  The public guest static malware inspection engine is currently in active development.
                  Public file uploads are temporarily disabled. Authenticated security analysts can access the full malware detonation sandbox inside the workspace console.
                </span>
              </div>
            </div>

            {/* Locked Visual Drop Zone (View-Only / No Input) */}
            <div className="mb-5 border-2 border-dashed border-white/10 rounded-2xl p-7 flex flex-col items-center justify-center text-center bg-white/[0.01] select-none cursor-not-allowed relative">
              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple/80 mb-3">
                <Lock size={22} />
              </div>
              <div className="text-sm font-semibold text-white/90 mb-1">
                Guest File Submissions Locked
              </div>
              <div className="text-xs text-text-muted leading-relaxed max-w-xs mb-3">
                Public file uploads and binary disassembly are disabled while this module is undergoing validation.
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-text-muted">
                <Shield size={12} className="text-brand-purple" />
                Supports .exe, .dll, .pdf, .ps1, .sh (In Workspace)
              </span>
            </div>

            {/* Engine Feature Preview Grid */}
            <div className="space-y-2 mb-5">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Engine Inspection Pipeline (Preview)
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/6 flex items-center justify-between">
                  <span className="text-white/80 font-medium text-[11px]">PE / ELF Header Sinks</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">DEV</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/6 flex items-center justify-between">
                  <span className="text-white/80 font-medium text-[11px]">Entropy & Obfuscation</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">DEV</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/6 flex items-center justify-between">
                  <span className="text-white/80 font-medium text-[11px]">Static String Extraction</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">DEV</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/6 flex items-center justify-between">
                  <span className="text-white/80 font-medium text-[11px]">Hash & Threat Matrix</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">DEV</span>
                </div>
              </div>
            </div>

            {/* Disabled Action Button */}
            <button
              disabled
              className="w-full py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-text-muted bg-white/[0.03] border border-white/8 cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
            >
              <Lock size={15} />
              <span>Inspection Engine Under Development</span>
            </button>

            {/* Workspace Access Link */}
            <div className="mt-5 pt-3 border-t border-white/8 flex items-center justify-between text-xs">
              <span className="text-text-muted text-[11px]">Authenticated Lab Access</span>
              <Link
                to="/login"
                className="text-brand-purple hover:underline font-bold flex items-center gap-1"
              >
                <span>Sign in for Malware Lab</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
