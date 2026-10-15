import React, { useState } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import {
  ShieldCheck, Shield, Globe, Server, CheckCircle2,
  AlertTriangle, ArrowRight, ArrowLeft, Play, Lock, Sliders, Layers
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

interface TestItem {
  id: string;
  name: string;
  category: string;
  description: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
}

const CATALOG_TESTS: TestItem[] = [
  // Authentication & Access
  { id: 'auth-1', name: 'Authentication Bypass', category: 'Auth', description: 'Checks for broken session fixation and credential stuffing vectors', risk: 'critical' },
  { id: 'auth-2', name: 'BOLA / IDOR Authorization Flaws', category: 'Auth', description: 'Tests horizontal and vertical privilege escalation between tenants', risk: 'critical' },
  { id: 'auth-3', name: 'Weak JWT Signature & None-Algorithm', category: 'Auth', description: 'Validates cryptographic signature verification in tokens', risk: 'high' },

  // Injection
  { id: 'inj-1', name: 'SQL & NoSQL Injection', category: 'Injection', description: 'Fuzzes parameters with SQLi polyglots and error/time-based payloads', risk: 'critical' },
  { id: 'inj-2', name: 'Command & OS Injection', category: 'Injection', description: 'Tests shell parameter delimiters and command execution', risk: 'critical' },
  { id: 'inj-3', name: 'Reflected & Stored XSS', category: 'Injection', description: 'Injects context-aware DOM and script execution payloads', risk: 'high' },
  { id: 'inj-4', name: 'Server-Side Request Forgery (SSRF)', category: 'Injection', description: 'Probes internal cloud metadata (169.254.169.254) and loopback addresses', risk: 'critical' },

  // Configuration
  { id: 'cfg-1', name: 'CORS Wildcard & Null Origin Misconfiguration', category: 'Configuration', description: 'Checks Access-Control-Allow-Origin against untrusted domains', risk: 'medium' },
  { id: 'cfg-2', name: 'Missing Security Headers (CSP, HSTS, X-Frame)', category: 'Configuration', description: 'Audits defensive response headers against modern browser specs', risk: 'low' },
  { id: 'cfg-3', name: 'API Rate Limiting & DoS Resistance', category: 'Configuration', description: 'Sends high-frequency requests to test 429 throttling thresholds', risk: 'medium' },
  { id: 'cfg-4', name: 'Information Disclosure & Stack Traces', category: 'Configuration', description: 'Inspects error responses for framework versions and raw traces', risk: 'low' }
];

export const AssessmentWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);

  // Wizard state
  const [targetType, setTargetType] = useState<'webapp' | 'api' | 'openapi'>('webapp');
  const [targetUrl, setTargetUrl] = useState('https://portal.acmecorp.local');
  const [scopeInclude, setScopeInclude] = useState('*.acmecorp.local');
  const [scopeExclude, setScopeExclude] = useState('*.acmecorp.local/logout, *.stripe.com');

  const [scanMode, setScanMode] = useState<'full' | 'specific'>('full');
  const [intensity, setIntensity] = useState<'light' | 'standard' | 'deep'>('standard');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'cookie'>('bearer');
  const [authToken, setAuthToken] = useState('eyJh...demo_token');

  const [selectedTestIds, setSelectedTestIds] = useState<string[]>(CATALOG_TESTS.map(t => t.id));
  const [confirmedAuth, setConfirmedAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTest = (id: string) => {
    setSelectedTestIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleLaunch = async () => {
    if (!confirmedAuth) {
      setError('You must confirm written authorization to run security assessments.');
      return;
    }
    let scanId = 'scan-' + Math.floor(1000 + Math.random() * 9000);
    try {
      const pRes = await api.get('/projects');
      const targetProjectId = pRes.data?.data?.[0]?._id;
      if (targetProjectId) {
        const res = await api.post('/assessments', {
          name: `${targetType.toUpperCase()} Security Scan`,
          projectId: targetProjectId,
          targetUrl,
          intensity,
          selectedTests: scanMode === 'full' ? CATALOG_TESTS.map(t => t.id) : selectedTestIds
        });
        if (res.data?.data?._id) {
          scanId = res.data.data._id;
        }
      }
    } catch (err) {}

    navigate(`/dashboard/assessment/${scanId}/progress`, {
      state: {
        targetUrl,
        scanMode,
        intensity,
        selectedTestsCount: scanMode === 'full' ? CATALOG_TESTS.length : selectedTestIds.length,
        timestamp: new Date().toISOString()
      }
    });
  };


  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan font-medium mb-2">
          <ShieldCheck size={14} /> Security Assessment Engine
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configure New Assessment</h1>
        <p className="text-sm text-text-muted">Define testing boundaries, target endpoints, scan intensity, and safety parameters.</p>
      </div>

      {/* Stepper Tabs */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold">
        {[
          { num: 1, label: 'Target & Scope' },
          { num: 2, label: 'Scan Mode' },
          { num: 3, label: 'Test Catalog' },
          { num: 4, label: 'Authorization & Launch' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => s.num < step && setStep(s.num)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              step === s.num
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : step > s.num
                ? 'text-white cursor-pointer hover:bg-white/5'
                : 'text-text-muted cursor-not-allowed'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step >= s.num ? 'bg-brand-cyan text-black font-bold' : 'bg-white/10 text-text-muted'
            }`}>
              {s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <GlassCard className="p-8 border-white/10">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Step 1 — Target Definition & Boundaries</h3>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Target Architecture Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'webapp', label: 'Web Application', icon: Globe, desc: 'SPAs, server rendered web portals' },
                  { id: 'api', label: 'REST / GraphQL API', icon: Server, desc: 'Microservices, backend gateways' },
                  { id: 'openapi', label: 'OpenAPI Schema', icon: Layers, desc: 'Swagger 2.0 / OpenAPI 3.x spec' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTargetType(t.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      targetType === t.id
                        ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-md shadow-brand-cyan/10'
                        : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                    }`}
                  >
                    <t.icon size={20} className={targetType === t.id ? 'text-brand-cyan' : 'text-text-muted'} />
                    <div className="font-semibold text-xs mt-2 text-white">{t.label}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Target URL or Root Endpoint
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://app.example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Allowed In-Scope Domains (Whitelist)
                </label>
                <input
                  type="text"
                  value={scopeInclude}
                  onChange={(e) => setScopeInclude(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Excluded Endpoints (Blacklist)
                </label>
                <input
                  type="text"
                  value={scopeExclude}
                  onChange={(e) => setScopeExclude(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Step 2 — Scan Mode & Test Intensity</h3>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Scan Selection Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setScanMode('full')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    scanMode === 'full'
                      ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">Full Scan (Recommended)</span>
                    <CheckCircle2 size={16} className={scanMode === 'full' ? 'text-brand-cyan' : 'text-transparent'} />
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Automatically fingerprints target stack and runs all applicable OWASP Top 10 and API vulnerability checks.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('specific')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    scanMode === 'specific'
                      ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">Select Specific Tests</span>
                    <CheckCircle2 size={16} className={scanMode === 'specific' ? 'text-brand-cyan' : 'text-transparent'} />
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Manually pick test categories (e.g. only Authentication or Injection tests) in Step 3.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Probe Intensity
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', title: 'Light', desc: 'Passive discovery & header inspection with minimal traffic overhead' },
                  { id: 'standard', title: 'Standard', desc: 'Thorough active probing and payload validation without DoS vectors' },
                  { id: 'deep', title: 'Deep Audit', desc: 'Exhaustive polyglot fuzzing, race conditions & high payload concurrency' },
                ].map((int) => (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => setIntensity(int.id as any)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      intensity === int.id
                        ? 'bg-brand-purple/20 border-brand-purple text-white shadow-sm'
                        : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-white mb-1">{int.title}</div>
                    <div className="text-[10px] text-text-muted leading-tight">{int.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Authenticated Scanning Credentials
              </label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {['none', 'bearer', 'cookie'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAuthType(a as any)}
                    className={`py-2 px-3 rounded-xl border text-xs capitalize ${
                      authType === a
                        ? 'bg-white/10 border-white/30 text-white font-semibold'
                        : 'border-white/10 bg-white/5 text-text-muted'
                    }`}
                  >
                    {a === 'none' ? 'Unauthenticated' : a === 'bearer' ? 'Bearer Token' : 'Session Cookie'}
                  </button>
                ))}
              </div>
              {authType !== 'none' && (
                <input
                  type="text"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder={authType === 'bearer' ? 'eyJhbGci...' : 'session_id=...'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                />
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Step 3 — Security Test Catalog</h3>
                <p className="text-xs text-text-muted">
                  {scanMode === 'full' ? 'All tests will run automatically under Full Scan mode.' : 'Choose the test vectors to execute.'}
                </p>
              </div>
              {scanMode === 'specific' && (
                <button
                  type="button"
                  onClick={() => setSelectedTestIds(selectedTestIds.length === CATALOG_TESTS.length ? [] : CATALOG_TESTS.map(t => t.id))}
                  className="text-xs text-brand-cyan hover:underline font-semibold"
                >
                  {selectedTestIds.length === CATALOG_TESTS.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {CATALOG_TESTS.map((test) => {
                const isChecked = scanMode === 'full' || selectedTestIds.includes(test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => scanMode === 'specific' && toggleTest(test.id)}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isChecked
                        ? 'bg-white/5 border-brand-cyan/40 text-white'
                        : 'bg-white/[0.02] border-white/5 text-text-muted'
                    } ${scanMode === 'specific' ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={scanMode === 'full'}
                          onChange={() => scanMode === 'specific' && toggleTest(test.id)}
                          className="rounded accent-brand-cyan shrink-0"
                        />
                        <span className="font-semibold text-xs text-white">{test.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        test.risk === 'critical' ? 'bg-red-500/20 text-red-400' : test.risk === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {test.risk}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1.5 pl-5 leading-relaxed">{test.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Step 4 — Review & Safety Authorization</h3>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-text-muted">Target URL</div>
                <div className="text-white font-mono font-semibold truncate mt-0.5">{targetUrl}</div>
              </div>
              <div>
                <div className="text-text-muted">Scan Mode</div>
                <div className="text-brand-cyan font-semibold mt-0.5 capitalize">{scanMode} Scan</div>
              </div>
              <div>
                <div className="text-text-muted">Intensity</div>
                <div className="text-brand-purple font-semibold mt-0.5 capitalize">{intensity}</div>
              </div>
              <div>
                <div className="text-text-muted">Selected Tests</div>
                <div className="text-white font-semibold mt-0.5">
                  {scanMode === 'full' ? CATALOG_TESTS.length : selectedTestIds.length} vectors
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Mandatory Compliance Authorization Checkbox */}
            <div className="p-4 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/20 space-y-3">
              <div className="flex items-center gap-2 text-brand-cyan font-semibold text-xs">
                <AlertTriangle size={16} /> Strict Authorization Confirmation Required
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedAuth}
                  onChange={(e) => {
                    setConfirmedAuth(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  className="rounded accent-brand-cyan w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="text-xs text-text-muted leading-relaxed">
                  I certify that I am the authorized owner or have explicit written permission from the owner of <strong className="text-white">{targetUrl}</strong> to execute automated penetration and security assessment probes.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Wizard Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-text-muted hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn-primary text-xs px-5 py-2.5 rounded-xl font-semibold flex items-center gap-1.5"
            >
              Next Step <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              className="btn-primary text-xs px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-brand-cyan/30"
            >
              <Play size={16} /> Launch Security Assessment
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
