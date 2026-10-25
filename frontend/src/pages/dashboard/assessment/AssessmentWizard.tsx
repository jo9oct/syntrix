import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { AvailableScannersResponse, Scope, CompanySecurityRule, ScannerItem } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  ShieldCheck, Shield, Globe, Server, CheckCircle2,
  AlertTriangle, ArrowRight, ArrowLeft, Play, Lock, Sliders, Layers,
  Search, Check, X, Key, Sparkles
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useUserTier } from '../../../store/authStore';

export const AssessmentWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tier: userTier, isFree, isPro, isEnterprise } = useUserTier();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Loaded from API 1, 29, 13
  const [scannersData, setScannersData] = useState<AvailableScannersResponse | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [companyRules, setCompanyRules] = useState<CompanySecurityRule[]>([]);

  // Form State matching API 2
  const [targetUrl, setTargetUrl] = useState(searchParams.get('targetUrl') || '');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [selectedReconIds, setSelectedReconIds] = useState<string[]>([]);
  const [selectedSecurityIds, setSelectedSecurityIds] = useState<string[]>(['securityHeaders', 'xss']);
  const [scannerCategoryTab, setScannerCategoryTab] = useState<'recon' | 'security'>('security');
  const [scannerSearch, setScannerSearch] = useState('');

  const [confirmedAuth, setConfirmedAuth] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Tier & Role Access Check for Credentialed Cookie Scanning
  const isStaff = user?.role === 'admin' || user?.role === 'security_engineer' || user?.role === 'developer' || user?.role === 'malware_analyst';
  const isCredentialCookieAllowed = !isFree || isStaff;

  // Credential Cookie Name & Value State (Step 1)
  const [cookiePairs, setCookiePairs] = useState<Array<{ name: string; value: string }>>([
    { name: '', value: '' }
  ]);

  const handleCookieChange = (index: number, field: 'name' | 'value', val: string) => {
    setCookiePairs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddCookieRow = () => {
    setCookiePairs(prev => [...prev, { name: '', value: '' }]);
  };

  const handleRemoveCookieRow = (index: number) => {
    setCookiePairs(prev => {
      if (prev.length <= 1) return [{ name: '', value: '' }];
      return prev.filter((_, i) => i !== index);
    });
  };

  // Compile active session cookies into "name=value; name2=value2"
  const activeSessionCookie = cookiePairs
    .filter(c => c.name.trim() && c.value.trim())
    .map(c => `${c.name.trim()}=${c.value.trim()}`)
    .join('; ');

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // API 1: Get Available Scanners from Real Backend
        const scanRes = await api.get('/scanners');
        if (scanRes.data?.data) {
          setScannersData(scanRes.data.data);
          // Set initial default selections respecting the user's tier
          if (isFree) {
            setSelectedSecurityIds(['securityHeaders']);
            setSelectedReconIds([]);
          } else {
            setSelectedSecurityIds(['securityHeaders', 'xss', 'sqli', 'cors']);
            setSelectedReconIds(['ssl', 'technology', 'webServer']);
          }
        }

        // API 29: Get All Security Scopes
        const scopesRes = await api.get('/scopes');
        if (scopesRes.data?.data?.scopes) {
          setScopes(scopesRes.data.data.scopes);
          if (scopesRes.data.data.scopes.length > 0) {
            setSelectedScopeId(scopesRes.data.data.scopes[0]._id);
          }
        }

        // API 13: Get All Company Security Rules
        const rulesRes = await api.get('/company-rules');
        if (rulesRes.data?.data?.rules) {
          setCompanyRules(rulesRes.data.data.rules);
          setSelectedRuleIds(rulesRes.data.data.rules.filter((r: CompanySecurityRule) => r.enabled).map((r: CompanySecurityRule) => r._id));
        }

        // Pre-fill input fields from existing scan when Retest is requested
        const retestScanId = searchParams.get('retestScanId') || searchParams.get('retest');
        if (retestScanId) {
          try {
            const retestRes = await api.get(`/scans/${retestScanId}`);
            const prevScan = retestRes.data?.data;
            if (prevScan) {
              if (prevScan.targetUrl) setTargetUrl(prevScan.targetUrl);
              if (prevScan.scanSelection?.recon) setSelectedReconIds(prevScan.scanSelection.recon);
              if (prevScan.scanSelection?.security) setSelectedSecurityIds(prevScan.scanSelection.security);
              if (prevScan.scopeId) setSelectedScopeId(prevScan.scopeId);
              if (Array.isArray(prevScan.companyRuleIds) && prevScan.companyRuleIds.length > 0) {
                setSelectedRuleIds(prevScan.companyRuleIds.map(String));
              }
              setConfirmedAuth(true);
            }
          } catch (e) {
            console.error('Failed to pre-fill existing scan for retest', e);
          }
        }
      } catch (err) {
        console.error('Failed to load wizard prerequisites', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [isFree]);

  const toggleScanner = (id: string, category: 'recon' | 'security') => {
    if (isFree) {
      // Free tier backend enforces maxScannersPerScan: 1
      if (category === 'recon') {
        if (selectedReconIds.includes(id)) {
          setSelectedReconIds([]);
        } else {
          setSelectedReconIds([id]);
          setSelectedSecurityIds([]);
        }
      } else {
        if (selectedSecurityIds.includes(id)) {
          setSelectedSecurityIds([]);
        } else {
          setSelectedSecurityIds([id]);
          setSelectedReconIds([]);
        }
      }
      return;
    }

    if (category === 'recon') {
      setSelectedReconIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setSelectedSecurityIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  const selectAllCategory = (category: 'recon' | 'security') => {
    if (!scannersData) return;
    if (isFree) {
      setError('Free Community Tier is limited to 1 scanner per assessment. Upgrade to Pro for all 25 parallel scanners.');
      return;
    }
    if (category === 'recon') {
      setSelectedReconIds(scannersData.recon.map(s => s.id));
    } else {
      setSelectedSecurityIds(scannersData.security.map(s => s.id));
    }
  };

  const clearCategory = (category: 'recon' | 'security') => {
    if (category === 'recon') {
      setSelectedReconIds([]);
    } else {
      setSelectedSecurityIds([]);
    }
  };

  const toggleRule = (id: string) => {
    setSelectedRuleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleLaunchScan = async () => {
    if (!confirmedAuth) {
      setError('You must confirm written authorization to run security assessments on the specified target.');
      return;
    }

    const trimmedUrl = targetUrl.trim();
    if (!trimmedUrl || (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://'))) {
      setError('Please provide a valid Target URL beginning with http:// or https://');
      return;
    }

    if (selectedReconIds.length === 0 && selectedSecurityIds.length === 0) {
      setError('Please select at least one security or reconnaissance scanner.');
      return;
    }

    const totalSelected = selectedReconIds.length + selectedSecurityIds.length;
    if (isFree && totalSelected > 1) {
      setError('The Free plan allows a maximum of 1 scanner per assessment. Please select 1 scanner or upgrade to Pro.');
      return;
    }

    setLaunching(true);
    setError(null);

    try {
      // Validate MongoDB 24-character hex IDs for scopes and rules
      const isValidHex24 = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

      // API 2: Create a Security Scan (POST /api/v1/scans)
      const payload: {
        targetUrl: string;
        scanSelection: { recon: string[]; security: string[] };
        scopes?: string[];
        companyRuleIds?: string[];
        credentials?: { sessionCookie?: string; username?: string; password?: string } | null;
      } = {
        targetUrl: trimmedUrl,
        scanSelection: {
          recon: selectedReconIds,
          security: selectedSecurityIds
        }
      };

      if (selectedScopeId && isValidHex24(selectedScopeId)) {
        payload.scopes = [selectedScopeId];
      }

      const validRuleIds = selectedRuleIds.filter(isValidHex24);
      if (validRuleIds.length > 0) {
        payload.companyRuleIds = validRuleIds;
      }

      // Include authentication credentials cookie if provided and allowed by user tier
      if (isCredentialCookieAllowed && activeSessionCookie) {
        payload.credentials = {
          sessionCookie: activeSessionCookie
        };
      }

      const res = await api.post('/scans', payload);
      const createdScan = res.data?.data?.scan;

      if (createdScan?._id) {
        navigate(`/dashboard/assessment/${createdScan._id}/progress`, {
          state: {
            scan: createdScan,
            targetUrl: trimmedUrl,
            reconCount: selectedReconIds.length,
            securityCount: selectedSecurityIds.length
          }
        });
      } else {
        navigate('/dashboard/projects');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      setError(serverMsg || 'Failed to create assessment.');
      setLaunching(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-text-muted text-xs">Loading scanner catalog & boundary scopes...</div>;
  }

  const currentScanners = (scannerCategoryTab === 'recon' ? scannersData?.recon : scannersData?.security) || [];
  const filteredScanners = currentScanners.filter(s =>
    s.name.toLowerCase().includes(scannerSearch.toLowerCase()) ||
    s.description.toLowerCase().includes(scannerSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(scannerSearch.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan font-medium mb-2">
            <ShieldCheck size={14} /> Sentrix Security Assessment Engine (API 1 & 2)
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configure New Security Assessment</h1>
          <p className="text-xs text-text-muted">
            Define target endpoints, authorized boundary scope snapshots, corporate rules, and select from 25 automated security scanners.
          </p>
        </div>

        {(user?.role === 'client_owner' || user?.role === 'client_member') && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              userTier === 'enterprise'
                ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                : userTier === 'pro'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
                : 'bg-white/10 text-slate-300 border border-white/20'
            }`}>
              {userTier} Scan Mode
            </span>
            {isFree && (
              <button
                onClick={() => navigate('/dashboard/billing')}
                className="btn-primary text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm"
              >
                <Sparkles size={11} /> Upgrade
              </button>
            )}
          </div>
        )}
      </div>

      {/* Free Tier Wizard Banner */}
      {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              <strong>Free Tier Scan Limitations:</strong> Single target authorization and basic OWASP scan rules active. Upgrade to Pro for deep API fuzzing, credentialed crawling, and 1-click verification retests.
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="text-xs font-bold underline hover:text-white shrink-0"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Stepper Tabs */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold">
        {[
          { num: 1, label: 'Target, Scopes & Policies' },
          { num: 2, label: `Scanner Selection (${selectedReconIds.length + selectedSecurityIds.length} chosen)` },
          { num: 3, label: 'Authorization & Launch' },
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
        {/* Step 1: Target, Scopes & Company Policies */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Step 1 — Target Definition & Security Boundary</h3>

            {/* Target URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                Target URL (Hostname & Protocol)
              </label>
              <input
                type="text"
                required
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://review-x-u6mr6.vercel.app"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
              />
              <span className="text-[11px] text-text-muted">
                Must be an authorized endpoint within your verified scope snapshot.
              </span>
            </div>

            {/* Scope Selection (API 29) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Associated Boundary Scope (API 28-32)
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/scopes')}
                  className="text-[11px] text-brand-cyan hover:underline"
                >
                  Manage Scopes &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scopes.map(scope => (
                  <div
                    key={scope._id}
                    onClick={() => setSelectedScopeId(scope._id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedScopeId === scope._id
                        ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-sm shadow-brand-cyan/10'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{scope.name}</span>
                      {selectedScopeId === scope._id && <Check size={14} className="text-brand-cyan" />}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono mt-1">
                      {scope.hostnames.join(', ')} • Ports: {scope.ports.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credential Cookie Name & Value (Step 1) */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} className="text-brand-cyan" />
                  <span>Credential Cookie (Name & Value)</span>
                </label>
                {isCredentialCookieAllowed ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <Check size={11} /> {userTier.toUpperCase()} Allowed
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                    <Lock size={10} /> Free Tier Not Allowed
                  </span>
                )}
              </div>

              {!isCredentialCookieAllowed ? (
                /* Free Tier Not Allowed Message */
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                        <Lock size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Credential Cookie Input Not Allowed</span>
                          <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30">
                            {userTier.toUpperCase()} TIER
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-300/90 mt-0.5">
                          This input is not allowed for free tier accounts. Authenticated scanning using credential cookies is restricted to Pro and Enterprise tiers.
                        </p>
                      </div>
                    </div>
                    {user?.role === 'client_owner' && (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/billing')}
                        className="btn-primary text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shrink-0 shadow-sm shadow-brand-cyan/20 self-start sm:self-auto"
                      >
                        <Sparkles size={12} />
                        <span>Upgrade to Pro</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Allowed: Cookie Name and Value Inputs */
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="text-[11px] text-text-muted leading-relaxed">
                    Provide the session cookie <strong>Name</strong> and <strong>Value</strong> to allow the scanner to authenticate and audit protected routes.
                  </div>

                  <div className="space-y-2.5">
                    {cookiePairs.map((pair, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="w-full sm:w-1/3">
                          <input
                            type="text"
                            value={pair.name}
                            onChange={(e) => handleCookieChange(idx, 'name', e.target.value)}
                            placeholder="Cookie Name (e.g. session_id)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-text-muted focus:outline-none focus:border-brand-cyan"
                          />
                        </div>
                        <div className="w-full sm:flex-1">
                          <input
                            type="text"
                            value={pair.value}
                            onChange={(e) => handleCookieChange(idx, 'value', e.target.value)}
                            placeholder="Cookie Value (e.g. e3b0c44298fc1c149af...)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-emerald-300 font-mono placeholder:text-text-muted focus:outline-none focus:border-brand-cyan"
                          />
                        </div>
                        {cookiePairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCookieRow(idx)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-text-muted transition-colors self-end sm:self-auto shrink-0"
                            title="Remove cookie"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddCookieRow}
                      className="text-[11px] text-brand-cyan hover:underline flex items-center gap-1 font-semibold"
                    >
                      + Add Another Cookie
                    </button>
                    {activeSessionCookie && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 size={12} /> Cookie Header Ready ({cookiePairs.filter(c => c.name && c.value).length} set)
                      </span>
                    )}
                  </div>

                  {activeSessionCookie && (
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[10px] text-text-muted font-mono mb-1">
                        Compiled Cookie Header:
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-emerald-300 break-all select-all">
                        {activeSessionCookie}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Corporate Security Policies (Pro & Enterprise) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              {isFree ? (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <Sliders size={14} className="text-brand-cyan" />
                      <span>Corporate Security Policies</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 font-bold">
                        Pro Feature
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Upgrade to Pro to create and enforce custom corporate security policies and compliance rules across assessments.
                    </p>
                  </div>
                  {user?.role === 'client_owner' && (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/billing')}
                      className="btn-primary text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shrink-0 shadow-sm shadow-brand-cyan/20 self-start sm:self-auto"
                    >
                      <Sparkles size={12} />
                      <span>Upgrade to Pro</span>
                    </button>
                  )}
                </div>
              ) : companyRules.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={13} className="text-brand-cyan" />
                      <span>Enforce Corporate Security Policies</span>
                    </label>
                    <span className="text-[11px] text-text-muted">
                      {selectedRuleIds.length} of {companyRules.length} policies selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {companyRules.map(rule => (
                      <div
                        key={rule._id}
                        onClick={() => toggleRule(rule._id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedRuleIds.includes(rule._id)
                            ? 'bg-white/5 border-brand-cyan/40 text-white'
                            : 'bg-white/[0.02] border-white/5 text-text-muted hover:border-white/10'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{rule.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 font-mono text-brand-cyan">
                              {rule.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-muted">{rule.description}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedRuleIds.includes(rule._id)}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-brand-cyan focus:ring-0"
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary text-xs flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
              >
                Next: Select Scanners <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Scanner Selection (API 1: 10 Recon, 15 Security) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Step 2 — Scanner Engine Matrix (25 Scanners)</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Select active scanning modules from the 10 Reconnaissance and 15 Security Scanners.
                </p>
              </div>

              {/* Tier Scanner Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase ${
                  isFree ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30'
                }`}>
                  {isFree ? 'Free Tier: 1 Scanner Limit' : `${userTier.toUpperCase()}: All 25 Unlocked`}
                </span>
              </div>
            </div>

            {isFree && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
                <span>Free tier allows 1 scanner per assessment. Click any scanner to select it.</span>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/billing')}
                  className="font-bold underline hover:text-white shrink-0 ml-2"
                >
                  Upgrade to Pro &rarr;
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Category Switcher Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setScannerCategoryTab('security')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    scannerCategoryTab === 'security'
                      ? 'bg-brand-cyan/20 text-brand-cyan font-bold'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Security Scanners (15) [{selectedSecurityIds.length}]
                </button>
                <button
                  type="button"
                  onClick={() => setScannerCategoryTab('recon')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    scannerCategoryTab === 'recon'
                      ? 'bg-brand-cyan/20 text-brand-cyan font-bold'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Recon Scanners (10) [{selectedReconIds.length}]
                </button>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
                <input
                  type="text"
                  placeholder="Filter scanners..."
                  value={scannerSearch}
                  onChange={e => setScannerSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllCategory(scannerCategoryTab)}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-brand-cyan transition-colors"
                >
                  Select All {scannerCategoryTab}
                </button>
                <button
                  type="button"
                  onClick={() => clearCategory(scannerCategoryTab)}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Scanner Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredScanners.map(s => {
                const isSelected =
                  scannerCategoryTab === 'recon'
                    ? selectedReconIds.includes(s.id)
                    : selectedSecurityIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => toggleScanner(s.id, scannerCategoryTab)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-brand-cyan/15 border-brand-cyan/40 text-white'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/15'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 rounded text-brand-cyan focus:ring-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{s.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-black/40 font-mono text-[10px] text-brand-cyan">
                          {s.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-medium flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary text-xs flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
              >
                Next: Authorization & Launch <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Authorization & Launch */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white">Step 3 — Review Configuration & Execution Consent</h3>

            {/* Summary Box */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-text-muted block">Target Endpoint:</span>
                  <strong className="text-white break-all">{targetUrl}</strong>
                </div>
                <div>
                  <span className="text-text-muted block">Active Scope:</span>
                  <strong className="text-brand-cyan">
                    {scopes.find(s => s._id === selectedScopeId)?.name || 'Default Scope'}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted block">Recon Scanners ({selectedReconIds.length}):</span>
                  <span className="text-slate-300">{selectedReconIds.join(', ') || 'None'}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Security Scanners ({selectedSecurityIds.length}):</span>
                  <span className="text-slate-300">{selectedSecurityIds.join(', ') || 'None'}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Authentication Mode:</span>
                  {activeSessionCookie ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Cookie Configured ({cookiePairs.filter(c => c.name && c.value).length} variable{cookiePairs.filter(c => c.name && c.value).length > 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="text-slate-400">Unauthenticated Scan</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 text-[11px] text-text-muted">
                Corporate Policies Enforced: <strong className="text-white">{selectedRuleIds.length} rules</strong>
              </div>
            </div>

            {/* Written Consent */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <AlertTriangle size={15} /> Authorized Security Testing Agreement
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                By launching this automated assessment, you verify that you are the verified resource owner or have written authorization from the organization to assess the target endpoints and ports defined in the scope snapshot.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="confirmAuthCheck"
                  checked={confirmedAuth}
                  onChange={e => setConfirmedAuth(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-cyan focus:ring-0"
                />
                <label htmlFor="confirmAuthCheck" className="text-xs text-white font-medium cursor-pointer">
                  I confirm full legal authorization to scan <span className="font-mono text-brand-cyan">{targetUrl}</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-medium flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                disabled={launching}
                onClick={handleLaunchScan}
                className="btn-primary text-xs flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-xl shadow-brand-cyan/25"
              >
                <Play size={15} /> {launching ? 'Launching Assessment...' : 'Launch Security Scan'}
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
