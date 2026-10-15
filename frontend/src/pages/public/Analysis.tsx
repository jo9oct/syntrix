import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui';
import { ShieldCheck, Bug, Search, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { SeverityBadge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const Analysis: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('https://demo.sentrix.local');
  const [scanMode, setScanMode] = useState<'specific' | 'full'>('specific');
  const [selectedTests, setSelectedTests] = useState<string[]>([
    'Authentication',
    'SQL Injection',
    'XSS Testing',
    'Security Headers'
  ]);
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
    <div className="min-h-screen bg-background-darker pt-32 pb-20 px-6 relative overflow-hidden">
      <PublicHeader />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan mb-4 font-medium">
            <ShieldCheck size={14} /> Guest Security Sandbox
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Live Public Analysis</h1>
          <p className="text-text-muted max-w-xl mx-auto">
            Zero-installation surface analysis and malware inspection. Sign in to your workspace for permanent storage, automated retesting, and certified PDF reports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Web Scan */}
          <GlassCard className="flex flex-col border-white/10 hover:border-brand-cyan/30 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-cyan/20 rounded-xl text-brand-cyan">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Live Website Scanner</h2>
                <p className="text-xs text-text-muted">Dynamic HTTP & endpoint security checks</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Target Domain or URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Scan Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScanMode('specific')}
                    className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                      scanMode === 'specific'
                        ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-sm shadow-brand-cyan/20'
                        : 'border-white/10 bg-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    Select Specific Tests
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('full')}
                    className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                      scanMode === 'full'
                        ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-sm shadow-brand-cyan/20'
                        : 'border-white/10 bg-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    Full Scan (Auto)
                  </button>
                </div>
              </div>

              {scanMode === 'specific' ? (
                <div className="grid grid-cols-2 gap-2 text-sm text-text-muted bg-white/5 p-4 rounded-xl border border-white/10">
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
                <div className="bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan p-4 rounded-xl text-xs leading-relaxed">
                  ✓ Full Scan will automatically classify the target stack and execute all applicable OWASP Top 10 and API security test vectors.
                </div>
              )}
            </div>

            <Button
              onClick={startScan}
              loading={isScanning}
              className="w-full py-3"
              icon={<Search size={18} />}
            >
              {isScanning ? `Scanning Target (${scanProgress}%)...` : 'Execute Security Scan'}
            </Button>

            {isScanning && (
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-brand h-full transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {scanResults && (
              <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand-cyan" /> Scan Completed
                  </span>
                  <span className="text-xs text-yellow-400 font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10">
                    {scanResults.length} Issues Identified
                  </span>
                </div>

                <div className="space-y-3">
                  {scanResults.map((r, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{r.title}</span>
                        <SeverityBadge severity={r.severity} />
                      </div>
                      <div className="text-xs text-text-muted font-mono">{r.path}</div>
                      <div className="text-xs text-brand-cyan pt-1">{r.recommendation}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-text-muted">Temporary guest results</span>
                  <Link to="/register" className="text-brand-cyan hover:underline font-semibold flex items-center gap-1">
                    Save to workspace <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Malware Static Analysis */}
          <GlassCard className="flex flex-col border-white/10 hover:border-brand-purple/30 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-purple/20 rounded-xl text-brand-purple">
                <Bug size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Malware Static Analysis</h2>
                <p className="text-xs text-text-muted">Headers, strings, sections, and hash classification</p>
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="malware-file-input"
                className="border-2 border-dashed border-white/15 hover:border-brand-purple/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.05]"
              >
                <input
                  id="malware-file-input"
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple mb-4">
                  <UploadCloud size={28} />
                </div>
                <div className="text-white font-medium mb-1">
                  {uploadedFile ? uploadedFile.name : 'Select or drop sample file'}
                </div>
                <div className="text-xs text-text-muted">
                  Supports binaries (.exe, .dll), documents (.pdf, .docx), scripts (.ps1, .sh), and archives
                </div>
              </label>

              <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
                <span>Guest mode runs static heuristic checks only. Safe sandbox execution requires workspace access.</span>
              </div>
            </div>

            <Button
              onClick={() => simulateMalwareAnalysis(uploadedFile?.name || 'sample_suspicious.exe', uploadedFile?.size || 48200)}
              loading={isUploading}
              className="w-full py-3"
              variant="secondary"
              icon={<Bug size={18} />}
            >
              {isUploading ? `Extracting Artifacts (${uploadProgress}%)...` : 'Run Static Inspection'}
            </Button>

            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-brand h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {malwareResult && (
              <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-sm font-bold text-white truncate max-w-[200px]">
                    {malwareResult.name}
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                    Risk {malwareResult.riskScore}/100
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <div className="text-text-muted">Classification</div>
                    <div className="text-white font-medium truncate">{malwareResult.classification}</div>
                  </div>
                  <div className="p-2 bg-white/5 rounded-lg">
                    <div className="text-text-muted">Entropy</div>
                    <div className="text-white font-medium">{malwareResult.entropy}</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-text-muted">SHA-256 Hash</div>
                  <div className="font-mono text-brand-cyan bg-black/40 p-2 rounded-lg truncate">
                    {malwareResult.sha256}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-text-muted">Extracted Suspicious Strings</div>
                  <div className="flex flex-wrap gap-1.5">
                    {malwareResult.suspiciousStrings.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 font-mono text-[11px] text-red-300 border border-white/10">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-text-muted">Static Heuristics Only</span>
                  <Link to="/dashboard/malware" className="text-brand-purple hover:underline font-semibold flex items-center gap-1">
                    Open in Malware Lab <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
