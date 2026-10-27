import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Target } from '../../../types/sentrix';
import api from '../../../lib/api';
import { getTargetDisplayName } from '../../../lib/targetUtils';
import {
  Globe, Plus, Shield, Search, ArrowRight,
  Clock, CheckCircle2, AlertTriangle, Activity, Server, Sliders,
  FileText, RefreshCw, Sparkles, Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useUserTier } from '../../../store/authStore';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tier: userTier, isFree, isPro, isEnterprise } = useUserTier();
  const [targets, setTargets] = useState<Target[]>([]);
  const [latestScanMap, setLatestScanMap] = useState<Record<string, { status: string; scanId: string; version: number }>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTargets = async () => {
    try {
      // Fetch targets (API 4) and scans to detect active scan status and link reports
      const [targetsRes, scansRes] = await Promise.allSettled([
        api.get('/targets'),
        api.get('/scans')
      ]);

      let targetItems: Target[] = [];
      if (targetsRes.status === 'fulfilled') {
        targetItems = targetsRes.value.data?.data?.items || targetsRes.value.data?.data?.targets || (Array.isArray(targetsRes.value.data?.data) ? targetsRes.value.data.data : []);
      }

      let scans: any[] = [];
      if (scansRes.status === 'fulfilled') {
        scans = scansRes.value.data?.data?.scans || scansRes.value.data?.data?.items || (Array.isArray(scansRes.value.data?.data) ? scansRes.value.data.data : []);
      }

      // Sort newest scans first
      const sortedScans = [...scans].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const map: Record<string, { status: string; scanId: string; version: number }> = {};
      sortedScans.forEach(s => {
        if (s.targetId && !map[s.targetId]) {
          map[s.targetId] = { status: s.status, scanId: s._id, version: s.version || 1 };
        }
        if (s.targetUrl) {
          const rawUrl = s.targetUrl.trim();
          const cleanUrl = rawUrl.replace(/\/+$/, '');
          if (!map[rawUrl]) map[rawUrl] = { status: s.status, scanId: s._id, version: s.version || 1 };
          if (!map[cleanUrl]) map[cleanUrl] = { status: s.status, scanId: s._id, version: s.version || 1 };
          try {
            const host = new URL(rawUrl).hostname;
            if (host && !map[host]) {
              map[host] = { status: s.status, scanId: s._id, version: s.version || 1 };
            }
          } catch (e) {}
        }
      });

      // Also query per-target scans to guarantee 100% accurate status for every target
      await Promise.allSettled(
        targetItems.map(async t => {
          if (/^[0-9a-fA-F]{24}$/.test(t._id)) {
            try {
              const histRes = await api.get(`/targets/${t._id}/scans`);
              const tScans = histRes.data?.data?.scans;
              if (Array.isArray(tScans) && tScans.length > 0) {
                const newest = tScans[0];
                map[t._id] = { status: newest.status, scanId: newest._id, version: newest.version || 1 };
                if (t.url) {
                  const rawU = t.url.trim();
                  map[rawU] = { status: newest.status, scanId: newest._id, version: newest.version || 1 };
                  map[rawU.replace(/\/+$/, '')] = { status: newest.status, scanId: newest._id, version: newest.version || 1 };
                }
                if (t.hostname) map[t.hostname] = { status: newest.status, scanId: newest._id, version: newest.version || 1 };
              }
            } catch (e) {}
          }
        })
      );

      setTargets(targetItems);
      setLatestScanMap(map);
    } catch (err) {
      console.error('Failed to fetch targets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  // Automatically poll while any assessment is pending or running so the card switches to Completed as soon as it finishes
  useEffect(() => {
    const isAnyActive = Object.values(latestScanMap).some(s => s.status === 'running' || s.status === 'pending');
    if (!isAnyActive) return;

    const timer = setInterval(() => {
      fetchTargets();
    }, 3500);

    return () => clearInterval(timer);
  }, [latestScanMap]);

  const filtered = targets.filter(t => {
    const q = searchTerm.toLowerCase();
    const displayName = getTargetDisplayName(t).toLowerCase();
    return (
      displayName.includes(q) ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.hostname && t.hostname.toLowerCase().includes(q)) ||
      (t.url && t.url.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <Globe size={14} /> Attack Surface Inventory
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Target Assets & Hostnames
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Centralized inventory of authorized web applications, hostnames, and audit lifecycles (API 20).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(user?.role === 'client_owner' || user?.role === 'client_member') && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              userTier === 'enterprise'
                ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                : userTier === 'pro'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
                : 'bg-white/10 text-slate-300 border border-white/20'
            }`}>
              {userTier} Assets
            </span>
          )}
          <Link
            to="/dashboard/scopes"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-colors"
          >
            Manage Scopes
          </Link>
          {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree && targets.length >= 1 ? (
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
              title="Free tier is limited to 1 target. Upgrade to Pro for unlimited target projects."
            >
              <Lock size={15} /> Upgrade to Add Targets
            </button>
          ) : (
            <Link
              to="/dashboard/assessment/new"
              className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20"
            >
              <Plus size={16} /> New Assessment
            </Link>
          )}
        </div>
      </div>

      {/* Free Tier Capacity Limit Alert */}
      {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree && targets.length >= 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertTriangle size={18} className="shrink-0" />
            <span>
              <strong>Free Community Limit (1/1 Asset Reached):</strong> Your workspace is currently utilizing the 1 allowed target asset. To register additional subdomains, APIs, or staging hosts, upgrade to Pro.
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="btn-primary text-xs px-3.5 py-1.5 rounded-xl font-bold shrink-0 shadow-md shadow-brand-cyan/20 self-start sm:self-auto"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* 4 Core Hero Telemetry Cards - Layout inspired by reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monitored Targets */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-brand-cyan/25 hover:border-brand-cyan/40 transition-all shadow-lg shadow-brand-cyan/[0.02] flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan">Monitored Targets</span>
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <Globe size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {targets.length}
            {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree && (
              <span className="text-xs text-amber-400 font-bold ml-1.5 font-mono">/ 1 Max</span>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-text-muted font-mono">
            <span className="text-emerald-400 font-semibold">{targets.filter(t => t.isActive).length} Active</span>
            <span>Target Inventory</span>
          </div>
        </div>

        {/* Card 2: Active Environments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/25 hover:border-emerald-500/40 transition-all shadow-lg shadow-emerald-500/[0.02] flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Active Environments</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {targets.filter(t => t.isActive).length}
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <span>Verified and monitored</span>
          </div>
        </div>

        {/* Card 3: Total Scan Iterations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-brand-purple/25 hover:border-brand-purple/40 transition-all shadow-lg shadow-brand-purple/[0.02] flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple">Scan Iterations</span>
            <div className="w-8 h-8 rounded-xl bg-brand-purple/15 border border-brand-purple/30 flex items-center justify-center text-brand-purple">
              <Activity size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-brand-purple font-mono">
            {targets.reduce((acc, t) => acc + (t.scanCount || 0), 0)}
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-text-muted font-mono">
            Aggregated scan runs
          </div>
        </div>

        {/* Card 4: Latest Version */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-blue-500/25 hover:border-blue-500/40 transition-all shadow-lg shadow-blue-500/[0.02] flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Latest Version</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Server size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            v{Math.max(...targets.map(t => t.scanVersionCounter || 1), 1)}
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-sky-400 font-medium">
            Continuous posture tracking
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            placeholder="Search targets by hostname or URL..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>
        <div className="text-xs text-text-muted">
          Showing <span className="font-semibold text-white">{filtered.length}</span> targets
        </div>
      </div>

      {/* Target Cards */}
      {loading ? (
        <div className="text-center py-16 text-text-muted text-xs">Loading target assets...</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-white/10">
          <Globe size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-white">No targets found</h3>
          <p className="text-xs text-text-muted mt-1">Launch an assessment to register a new target URL.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(target => {
            const cleanUrl = target.url?.trim().replace(/\/+$/, '');
            const scanInfo = latestScanMap[target._id] || latestScanMap[target.url] || (cleanUrl ? latestScanMap[cleanUrl] : undefined) || latestScanMap[target.hostname];
            const isScanning = scanInfo?.status === 'running' || scanInfo?.status === 'pending';
            const isCompleted = (scanInfo && scanInfo.status === 'completed') || (!isScanning && (target.scanCount > 0 || Boolean(target.lastScannedAt)));
            const reportScanId = scanInfo?.scanId;

            return (
              <GlassCard
                key={target._id}
                className="p-6 border-white/10 hover:border-brand-cyan/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 flex items-center justify-center font-bold">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-brand-cyan transition-colors truncate max-w-[220px]">
                          {getTargetDisplayName(target)}
                        </h3>
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Asset
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isScanning ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin text-amber-400" />
                          Scanning
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          target.isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/25'
                            : 'bg-white/5 text-text-muted border-white/10'
                        }`}>
                          {target.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">Target URL</div>
                    <div className="font-mono text-slate-300 break-all bg-white/[0.02] p-2 rounded-lg border border-white/5">
                      {target.url}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Total Scans</span>
                      <span className="font-mono text-white font-bold">{target.scanCount} Runs</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Version Counter</span>
                      <span className="font-mono text-brand-cyan font-bold">v{target.scanVersionCounter}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2">
                    {/* PDF Report button: ONLY visible when completed; REMOVED during scan */}
                    {isCompleted ? (
                      <Link
                        to={reportScanId ? `/dashboard/reports?scanId=${reportScanId}` : `/dashboard/reports?targetId=${target._id}`}
                        className="px-2.5 py-1 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="View PDF & Compliance Reports"
                      >
                        <FileText size={12} /> PDF Report
                      </Link>
                    ) : isScanning ? (
                      <Link
                        to={reportScanId ? `/dashboard/assessment/${reportScanId}/progress` : `/dashboard/projects/${target._id}`}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Assessment is currently in progress. Click to view live scanning worker logs and telemetry."
                      >
                        <Activity size={12} className="animate-spin text-amber-400" /> View Scanning Worker Logs
                      </Link>
                    ) : (
                      <span className="text-[11px] text-text-muted">
                        {target.lastScannedAt ? new Date(target.lastScannedAt).toLocaleDateString() : 'Ready to Scan'}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/dashboard/projects/${target._id}`}
                    className="text-brand-cyan hover:text-white flex items-center gap-1 font-semibold text-xs group-hover:translate-x-0.5 transition-all shrink-0"
                  >
                    View Details <ArrowRight size={14} />
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
