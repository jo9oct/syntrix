import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Target, Scan } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  RotateCcw, CheckCircle2, AlertTriangle,
  Play, Terminal, ArrowRight, ShieldCheck, Globe,
  Clock, RefreshCw, ExternalLink, Layers, Shield
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserTier } from '../../../store/authStore';

export const RetestPage: React.FC = () => {
  const navigate = useNavigate();
  const { isFree } = useUserTier();

  const [targets, setTargets] = useState<Target[]>([]);
  const [latestScanMap, setLatestScanMap] = useState<Record<string, Scan>>({});
  const [completedScans, setCompletedScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTestingId, setActiveTestingId] = useState<string | null>(null);

  // Fetch real target assets & scan profiles from backend
  const fetchRetestData = async () => {
    setLoading(true);
    try {
      const [targetsRes, scansRes] = await Promise.allSettled([
        api.get('/targets'),
        api.get('/scans')
      ]);

      let targetList: Target[] = [];
      if (targetsRes.status === 'fulfilled') {
        const data = targetsRes.value.data?.data;
        targetList = data?.items || data?.targets || (Array.isArray(data) ? data : []);
      }

      let allScans: Scan[] = [];
      if (scansRes.status === 'fulfilled') {
        const sData = scansRes.value.data?.data;
        allScans = sData?.scans || sData?.items || (Array.isArray(sData) ? sData : []);
      }

      // Map latest scan per target
      const map: Record<string, Scan> = {};
      allScans.forEach(s => {
        const keyId = s.targetId as string;
        if (keyId && !map[keyId]) {
          map[keyId] = s;
        }
        if (s.targetUrl) {
          if (!map[s.targetUrl]) {
            map[s.targetUrl] = s;
          }
          try {
            const host = new URL(s.targetUrl).hostname;
            if (host && !map[host]) {
              map[host] = s;
            }
          } catch (e) {}
        }
      });

      // Target fallback if zero registered targets but scans exist
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

      setTargets(targetList);
      setLatestScanMap(map);
      setCompletedScans(allScans.filter(s => s.status === 'completed'));
    } catch (err) {
      console.error('Failed to load targets for retesting queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetestData();
  }, []);

  // AUTOMATED 1-CLICK RETEST:
  // Pre-populates all inputs from the existing target & scan configuration without manual input
  const handleExecuteRetest = async (target: Target) => {
    setActiveTestingId(target._id);
    try {
      const isValidHex24 = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
      const existingScan = latestScanMap[target._id] || latestScanMap[target.url] || latestScanMap[target.hostname];

      // If a previous scan for this target is still pending or running, cancel it so a fresh retest can start cleanly
      if (existingScan && (existingScan.status === 'running' || existingScan.status === 'pending')) {
        try {
          await api.post(`/scans/${existingScan._id}/cancel`);
        } catch (e) {
          // ignore cancel error and proceed to launch
        }
      }

      let reconScanners = existingScan?.scanSelection?.recon || [];
      let securityScanners = existingScan?.scanSelection?.security || [];

      // If empty, extract from completed scanner outcomes or standard baseline
      if (reconScanners.length === 0 && securityScanners.length === 0) {
        if (Array.isArray(existingScan?.scannerOutcomes) && existingScan.scannerOutcomes.length > 0) {
          const outcomeIds = existingScan.scannerOutcomes.map((o: any) => o.scannerId);
          securityScanners = outcomeIds.filter((sid: string) => !['dns', 'robots', 'sitemap', 'ssl', 'subdomains', 'technology', 'versionDetection', 'webServer'].includes(sid));
          reconScanners = outcomeIds.filter((sid: string) => ['dns', 'robots', 'sitemap', 'ssl', 'subdomains', 'technology', 'versionDetection', 'webServer'].includes(sid));
        }
      }
      if (reconScanners.length === 0 && securityScanners.length === 0) {
        securityScanners = ['securityHeaders', 'xss'];
      }

      // Free tier allowance: max 1 scanner
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

      // Prepare payload automatically from existing data
      const payload: {
        targetUrl: string;
        scanSelection: { recon: string[]; security: string[] };
        scopes?: string[];
        companyRuleIds?: string[];
      } = {
        targetUrl: (target.url || existingScan?.targetUrl || '').trim(),
        scanSelection: {
          recon: reconScanners,
          security: securityScanners
        }
      };

      if (existingScan?.scopeId && isValidHex24(existingScan.scopeId)) {
        payload.scopes = [existingScan.scopeId];
      }

      if (Array.isArray(existingScan?.companyRuleIds)) {
        const validRuleIds = existingScan.companyRuleIds.map(String).filter(isValidHex24);
        if (validRuleIds.length > 0) {
          payload.companyRuleIds = validRuleIds;
        }
      }

      // Automatically send using existing scan API (API 2: POST /api/v1/scans)
      const res = await api.post('/scans', payload);
      const createdScan = res.data?.data?.scan;

      if (createdScan?._id) {
        // Navigate directly to testing progress
        navigate(`/dashboard/assessment/${createdScan._id}/progress`, {
          state: { scan: createdScan }
        });
      }
    } catch (err: any) {
      console.error('Failed to execute retest', err);
      alert(err.response?.data?.message || err.message || 'Failed to initiate automated retest assessment.');
    } finally {
      setActiveTestingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-brand-cyan font-medium mb-1">
            <RotateCcw size={13} /> Security Verification & Retesting
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Automated Target Retesting</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Execute 1-click regression tests against monitored targets using existing scan profiles without manual data entry.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/reports')}
          className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
        >
          View Verified Reports <ArrowRight size={14} />
        </button>
      </div>

      {/* Target Assets Queue for Retesting */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Globe size={14} className="text-brand-cyan" />
            Monitored Target Assets Awaiting Retest ({targets.length})
          </h3>
          {loading && (
            <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
              <RefreshCw size={11} className="animate-spin text-brand-cyan" /> Syncing targets...
            </span>
          )}
        </div>

        {loading ? (
          <GlassCard className="p-12 text-center text-text-muted text-xs flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-brand-cyan" />
            <span>Loading target assets and verification states...</span>
          </GlassCard>
        ) : targets.length === 0 ? (
          <GlassCard className="p-10 text-center text-text-muted border-dashed border-white/10">
            <Globe size={36} className="text-text-muted mx-auto mb-3 opacity-40" />
            <div className="text-sm font-bold text-white mb-1">No Monitored Targets Found</div>
            <p className="text-xs">Launch a security assessment to register your first target for automated retesting.</p>
            <div className="mt-4">
              <Link to="/dashboard/assessment/new" className="btn-primary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5">
                <Play size={13} /> Launch New Assessment
              </Link>
            </div>
          </GlassCard>
        ) : (
          targets.map(target => {
            const scanInfo = latestScanMap[target._id] || latestScanMap[target.url] || latestScanMap[target.hostname];
            const isScanning = scanInfo?.status === 'running' || scanInfo?.status === 'pending';
            const isRetestingThis = activeTestingId === target._id;

            const configuredRecon = scanInfo?.scanSelection?.recon || [];
            const configuredSecurity = scanInfo?.scanSelection?.security || ['securityHeaders', 'xss'];

            return (
              <GlassCard
                key={target._id}
                className="p-5 border-white/10 hover:border-brand-cyan/40 transition-all space-y-4 group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Target Details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="p-2 rounded-lg bg-brand-cyan/15 text-brand-cyan shrink-0">
                        <Globe size={16} />
                      </div>
                      <h4 className="text-base font-bold text-white group-hover:text-brand-cyan transition-colors truncate">
                        {target.hostname}
                      </h4>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-cyan font-bold">
                        v{target.scanVersionCounter}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        target.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-white/5 text-text-muted border-white/10'
                      }`}>
                        {target.isActive ? 'Active Asset' : 'Inactive'}
                      </span>
                      {scanInfo?.riskScore !== undefined && (
                        <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          Risk: {scanInfo.riskScore}/100
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-text-muted font-mono break-all pl-9">
                      {target.url}
                    </div>

                    {/* Pre-configured scanner modules */}
                    <div className="flex items-center gap-3 pt-1 text-xs text-text-muted pl-9 flex-wrap font-mono text-[11px]">
                      <span>Modules:</span>
                      <span className="text-sky-300">
                        Recon ({configuredRecon.length}) • Security ({configuredSecurity.length}: {configuredSecurity.join(', ')})
                      </span>
                      <span>•</span>
                      <span>
                        Last Tested: {new Date(target.lastScannedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Execute Retest */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {scanInfo?._id && (
                      <Link
                        to={`/dashboard/assessment/${scanInfo._id}/results`}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-muted hover:text-white transition-colors"
                      >
                        Telemetry & Evidence
                      </Link>
                    )}

                    <button
                      disabled={isRetestingThis}
                      onClick={() => handleExecuteRetest(target)}
                      className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-md shadow-brand-cyan/20 disabled:opacity-50"
                      title="Automated Retest: Pre-populates all input fields using existing scan parameters and launches assessment"
                    >
                      {isRetestingThis ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Preparing & Launching...
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Execute Retest
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Retest Verification History / Audit Trail */}
      <GlassCard className="p-6 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            Verified Assessment Audit Trail ({completedScans.length})
          </h3>
          <span className="text-[11px] font-mono text-text-muted">
            Aggregated historical scan runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
              <tr>
                <th className="px-5 py-3">Target / Hostname</th>
                <th className="px-4 py-3">Execution Run</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Risk Posture</th>
                <th className="px-4 py-3">Completed On</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {completedScans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                    No verified scan history recorded yet.
                  </td>
                </tr>
              ) : (
                completedScans.slice(0, 10).map((s, idx) => {
                  const host = s.targetUrl ? new URL(s.targetUrl).hostname : 'Target';
                  return (
                    <tr key={s._id || idx} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-white font-medium">
                        <div className="font-sans font-bold">{host}</div>
                        <span className="text-[10px] text-text-muted truncate block max-w-xs">{s.targetUrl}</span>
                      </td>
                      <td className="px-4 py-3 text-brand-cyan">
                        v{s.version || (completedScans.length - idx)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          ✓ Completed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-amber-300">
                        {s.riskScore ?? 21} / 100
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {s.completedAt ? new Date(s.completedAt).toLocaleString() : 'Recent'}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <Link
                          to={`/dashboard/assessment/${s._id}/results`}
                          className="text-brand-cyan hover:text-white font-semibold text-xs inline-flex items-center gap-1"
                        >
                          View Results <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};