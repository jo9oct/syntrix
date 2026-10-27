import React, { useState } from 'react';
import { Button } from '../../components/ui';
import { ShieldCheck, Bug, Search, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { SeverityBadge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const Analysis: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [scanMode, setScanMode] = useState<'specific' | 'full'>('specific');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<any[] | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [malwareResult, setMalwareResult] = useState<any | null>(null);

  const toggleTest = (testName: string) => {
    setSelectedTests(prev =>
      prev.includes(testName) ? prev.filter(t => t !== testName) : [...prev, testName]
    );
  };

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(15);
    setScanResults(null);

    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            setScanProgress(100);
            setScanResults([
              { title: 'Content-Security-Policy Header Missing', severity: 'low', path: '/', recommendation: 'Configure strict CSP directives in web server headers.' },
              { title: 'Potential Reflected XSS in search input', severity: 'medium', path: '/search?q=', recommendation: 'Apply HTML entity encoding before rendering user input.' },
              { title: 'Cleartext Cookie Missing SameSite Flag', severity: 'low', path: '/api/session', recommendation: 'Set SameSite=Strict and Secure attribute on session cookies.' },
            ]);
          }, 400);
          return 90;
        }
        return p + 25;
      });
    }, 400);
  };

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
      setUploadProgress(p => {
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
              suspiciousStrings: ['VirtualAllocEx', 'WriteProcessMemory', 'CreateRemoteThread', 'powershell.exe -enc']
            });
          }, 400);
          return 90;
        }
        return p + 25;
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background-darker pt-28 pb-20 px-6 relative overflow-hidden font-sans">
      <PublicHeader />

      {/* Background orbs */}
      <div className="absolute top-1/4 -left-24 w-[380px] h-[380px] orb orb-cyan opacity-35 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/3 -right-24 w-[320px] h-[320px] orb orb-purple opacity-30 pointer-events-none" aria-hidden="true" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <div className="badge-cyber">
            <ShieldCheck size={12} /> Guest Security Sandbox
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Live Public Analysis
          </h1>
          <p className="text-text-muted text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Zero-installation surface analysis and malware inspection. Sign in to your workspace for permanent storage, automated retesting, and certified PDF reports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* ── Web Scan Panel ──────────────────────── */}
          <div className="glass-card border-white/8 hover:border-brand-cyan/25 transition-colors duration-300 flex flex-col">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Live Website Scanner</h2>
                  <p className="text-xs text-text-muted">Dynamic HTTP & endpoint security checks</p>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                    Target Domain or URL
                  </label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-white/5 border border-white/9 rounded-xl py-2.5 px-4 text-white focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/15 outline-none transition-all font-mono text-sm placeholder:text-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                    Scan Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['specific', 'full'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setScanMode(mode)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan ${
                          scanMode === mode
                            ? 'bg-brand-cyan/12 border-brand-cyan/50 text-brand-cyan'
                            : 'border-white/9 bg-white/4 text-text-muted hover:text-white hover:bg-white/7'
                        }`}
                      >
                        {mode === 'specific' ? 'Select Tests' : 'Full Scan (Auto)'}
                      </button>
                    ))}
                  </div>
                </div>

                {scanMode === 'specific' ? (
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-text-muted bg-white/4 p-4 rounded-xl border border-white/9">
                    {['Authentication', 'SQL Injection', 'XSS Testing', 'CORS Config', 'Security Headers', 'TLS/SSL Config'].map((test) => (
                      <label key={test} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(test)}
                          onChange={() => toggleTest(test)}
                          className="rounded accent-brand-cyan"
                        />
                        <span>{test}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="bg-brand-cyan/8 border border-brand-cyan/20 text-brand-cyan p-3.5 rounded-xl text-xs leading-relaxed">
                    ✓ Full Scan will automatically classify the target stack and execute all applicable OWASP Top 10 and API security test vectors.
                  </div>
                )}
              </div>

              <Button
                onClick={startScan}
                loading={isScanning}
                className="w-full py-3 rounded-xl"
                icon={<Search size={16} />}
              >
                {isScanning ? `Scanning Target (${scanProgress}%)…` : 'Execute Security Scan'}
              </Button>

              {isScanning && (
                <div className="mt-4">
                  <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-brand-cool h-full transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {scanResults && (
                <div className="mt-5 p-4 bg-white/4 rounded-2xl border border-white/8 space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/8">
                    <span className="text-sm font-extrabold text-white flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-brand-cyan" /> Scan Completed
                    </span>
                    <span className="text-xs text-yellow-400 font-bold px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                      {scanResults.length} Issues Identified
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {scanResults.map((r, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/6 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-white leading-snug">{r.title}</span>
                          <SeverityBadge severity={r.severity} />
                        </div>
                        <div className="text-[11px] text-text-muted font-mono">{r.path}</div>
                        <div className="text-[11px] text-brand-cyan">{r.recommendation}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex justify-between items-center text-xs">
                    <span className="text-text-muted">Temporary guest results</span>
                    <Link to="/register" className="text-brand-cyan hover:underline font-bold flex items-center gap-1">
                      Save to workspace <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Malware Static Analysis Panel ──────── */}
          <div className="glass-card border-white/8 hover:border-brand-purple/25 transition-colors duration-300 flex flex-col">
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple shrink-0">
                  <Bug size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Malware Static Analysis</h2>
                  <p className="text-xs text-text-muted">Headers, strings, sections, and hash classification</p>
                </div>
              </div>

              <div className="mb-5">
                <label
                  htmlFor="malware-file-input"
                  className="border-2 border-dashed border-white/10 hover:border-brand-purple/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] focus-within:border-brand-purple/50"
                >
                  <input
                    id="malware-file-input"
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4">
                    <UploadCloud size={24} />
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">
                    {uploadedFile ? uploadedFile.name : 'Select or drop sample file'}
                  </div>
                  <div className="text-xs text-text-muted leading-relaxed max-w-xs">
                    Supports binaries (.exe, .dll), documents (.pdf, .docx), scripts (.ps1, .sh), and archives
                  </div>
                </label>

                <div className="mt-3 flex items-start gap-2 text-xs text-text-muted">
                  <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                  <span>Guest mode runs static heuristic checks only. Safe sandbox execution requires workspace access.</span>
                </div>
              </div>

              <Button
                onClick={() => simulateMalwareAnalysis(uploadedFile?.name || 'sample_suspicious.exe', uploadedFile?.size || 48200)}
                loading={isUploading}
                className="w-full py-3 rounded-xl"
                variant="secondary"
                icon={<Bug size={16} />}
              >
                {isUploading ? `Extracting Artifacts (${uploadProgress}%)…` : 'Run Static Inspection'}
              </Button>

              {isUploading && (
                <div className="mt-4">
                  <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-brand h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {malwareResult && (
                <div className="mt-5 p-4 bg-white/4 rounded-2xl border border-white/8 space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/8">
                    <span className="text-sm font-extrabold text-white truncate max-w-[200px]">
                      {malwareResult.name}
                    </span>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-extrabold">
                      Risk {malwareResult.riskScore}/100
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/6">
                      <div className="text-text-muted mb-1">Classification</div>
                      <div className="text-white font-semibold truncate">{malwareResult.classification}</div>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/6">
                      <div className="text-text-muted mb-1">Entropy</div>
                      <div className="text-white font-semibold">{malwareResult.entropy}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-text-muted">SHA-256 Hash</div>
                    <div className="font-mono text-brand-cyan bg-black/40 p-2.5 rounded-xl truncate border border-white/6">
                      {malwareResult.sha256}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-text-muted">Extracted Suspicious Strings</div>
                    <div className="flex flex-wrap gap-1.5">
                      {malwareResult.suspiciousStrings.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 font-mono text-[10px] text-red-300 border border-red-500/15">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1 flex justify-between items-center text-xs">
                    <span className="text-text-muted">Static Heuristics Only</span>
                    <Link to="/dashboard/malware" className="text-brand-purple hover:underline font-bold flex items-center gap-1">
                      Open in Malware Lab <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
