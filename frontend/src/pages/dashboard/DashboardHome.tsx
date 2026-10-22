import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  ShieldCheck, Bug, Activity, CheckCircle2, ArrowRight,
  TrendingUp, ShieldAlert, FileText, Plus, ExternalLink, X,
  Globe, Sliders, Trash2, Eye, Network, AlertTriangle, Sparkles, Settings
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useUserTier } from '../../store/authStore';
import type { Target, Scan, Finding, AvailableScannersResponse, Evidence } from '../../types/sentrix';
import api from '../../lib/api';
import { EvidenceViewer } from '../../components/ui/EvidenceViewer';

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tier: userTier, isFree, isPro, isEnterprise } = useUserTier();

  const [targets, setTargets] = useState<Target[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scanners, setScanners] = useState<AvailableScannersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  useEffect(() => {
    if (user?.role === 'developer') {
      navigate('/dashboard/remediation', { replace: true });
      return;
    }
    if (user?.role === 'malware_analyst') {
      navigate('/dashboard/malware', { replace: true });
      return;
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        const [tgtRes, scnRes, fndRes, scnnerRes] = await Promise.all([
          api.get('/targets'),
          api.get('/scans'),
          api.get('/findings'),
          api.get('/scanners')
        ]);

        if (tgtRes.data?.data?.items) setTargets(tgtRes.data.data.items);
        if (scnRes.data?.data?.scans) setScans(scnRes.data.data.scans);
        if (fndRes.data?.data?.findings) setFindings(fndRes.data.data.findings);
        if (scnnerRes.data?.data) setScanners(scnnerRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard telemetry', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
  }, []);

  const handleInspectEvidence = async (evidenceId?: string) => {
    try {
      const targetId = evidenceId || 'ev_ref_01';
      const res = await api.get(`/evidence/${targetId}`);
      if (res.data?.data?.evidence) {
        setSelectedEvidence(res.data.data.evidence);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeTargetsCount = targets.filter(t => t.isActive).length;
  const latestCompletedScan = scans.find(s => s.status === 'completed');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Evidence Viewer Modal */}
      <EvidenceViewer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />

      {/* Admin Enterprise Sovereign Mode Indicator */}
      {user?.role === 'admin' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-brand-cyan/15 via-[#1e1b4b]/30 to-brand-magenta/15 border border-brand-cyan/35 shadow-lg shadow-brand-cyan/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Enterprise Sovereign Analysis Workspace
                <span className="text-[9px] font-mono bg-brand-cyan text-black px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                  Admin Privileges Active
                </span>
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                All 25 scanner engines, zero-day analysis, policy enforcement, and finding triage unlocked in sovereign mode.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-all shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Settings size={14} />
            <span>Admin Operations Center</span>
          </button>
        </div>
      )}

      {/* Client Owner & Client Member Workspace Tier Banner */}
      {(user?.role === 'client_owner' || user?.role === 'client_member') && (
        isFree ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Free Community Workspace
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    1 Target Asset Limit
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Your workspace is currently operating on the community tier. Upgrade to Pro for automated API security fuzzing, unlimited target projects, and verification retesting.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="btn-primary text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-cyan/25 shrink-0 self-start sm:self-auto"
            >
              <Sparkles size={14} /> Upgrade to Pro via Chapa
            </button>
          </div>
        ) : isPro ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 shadow-lg shadow-brand-cyan/5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Pro Security Operations
                  <span className="text-[10px] font-mono bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Active Subscription
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Your team has access to unlimited target assets, automated verification retests, remediation tickets, and full compliance report generation.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-brand-purple border border-brand-purple/30 font-semibold transition-colors shrink-0 self-start sm:self-auto"
            >
              Upgrade to Enterprise &rarr;
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-brand-purple/15 border border-brand-purple/35 shadow-lg shadow-brand-purple/10">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-brand-purple shrink-0">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Enterprise Sovereign SecOps Console
                  <span className="text-[10px] font-mono bg-brand-purple/30 text-brand-purple border border-brand-purple/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Highest Tier Active
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Full enterprise operations unlocked: dedicated isolated malware sandbox, unlimited seats, custom RBAC, CI/CD pipeline gate, and 24/7 SLA.
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            Sentrix Autonomous Engine: Operational & Compliant
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Security Command Center
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time telemetry, 25 scanner engines, and verified authorization boundaries.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/dashboard/scopes"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Network size={15} /> Scopes
          </Link>
          <Link
            to="/dashboard/rules"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Sliders size={15} /> Policies
          </Link>
          <Link
            to="/dashboard/assessment/new"
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20"
          >
            <Plus size={16} /> New Assessment
          </Link>
        </div>
      </div>

      {/* Posture Score & Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Target Posture Score</div>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">
              {latestCompletedScan?.riskScore ?? 21} <span className="text-xs text-text-muted font-normal">/ 100</span>
            </div>
          </div>
          <div className="text-[11px] text-green-400 mt-3 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 size={13} /> Controlled Exposure Level
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Available Scanners</div>
            <div className="text-3xl font-extrabold text-brand-cyan mt-2">
              {scanners?.counts?.total ?? 25} Modules
            </div>
          </div>
          <div className="text-[11px] text-slate-300 mt-3 flex items-center gap-2 font-mono">
            <span>10 Recon</span> • <span>15 Security</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Monitored Targets</div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {targets.length || 1}
              {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree && (
                <span className="text-xs text-amber-400 font-bold ml-1.5 font-mono">/ 1 Max</span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-3">
            {(user?.role === 'client_owner' || user?.role === 'client_member') && isFree ? (
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <AlertTriangle size={12} /> Free tier limit: 1 asset
              </span>
            ) : (
              <span>{activeTargetsCount} Active Environments</span>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-text-muted uppercase font-bold tracking-wider">Active Findings</div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {findings.length || 3}
            </div>
          </div>
          <div className="text-[11px] text-brand-cyan mt-3 font-mono">
            0 Crit • 0 High • 1 Med • 2 Low
          </div>
        </GlassCard>
      </div>

      {/* Main Grid: Active Targets and Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Targets Column */}
        <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe size={18} className="text-brand-cyan" />
              Target Inventory
            </h2>
            <Link to="/dashboard/projects" className="text-xs text-brand-cyan hover:underline">
              View all &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {targets.map(tgt => (
              <GlassCard
                key={tgt._id}
                className="p-4 border-white/10 hover:border-brand-cyan/30 transition-all cursor-pointer"
                onClick={() => navigate(`/dashboard/projects/${tgt._id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-white truncate max-w-[190px]">
                      {tgt.hostname}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted truncate max-w-[210px]">
                      {tgt.url}
                    </div>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-cyan font-bold">
                    v{tgt.scanVersionCounter}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted mt-3 pt-2 border-t border-white/5">
                  <span>{tgt.scanCount} Scans run</span>
                  <span>{new Date(tgt.lastScannedAt).toLocaleDateString()}</span>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Quick Scanner Catalog Teaser */}
          <GlassCard className="p-5 border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
              Autonomous Scanner Modules (API 1)
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Equipped with 10 Recon engines (PortScan, SSL/TLS, DNS, Subdomains, etc.) and 15 Security probes (SQLi, XSS, SecurityHeaders, CORS, SSRF, JWT).
            </p>
            <button
              onClick={() => navigate('/dashboard/assessment/new')}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
            >
              Configure Assessment Wizard &rarr;
            </button>
          </GlassCard>
        </div>

        {/* Recent Scans and Vulnerability Findings */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Scans Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-green-400" />
                Recent Security Assessments (API 2-3)
              </h2>
              <Link to="/dashboard/scans/deleted" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
                <Trash2 size={12} /> Deleted Archive
              </Link>
            </div>

            <div className="space-y-2.5">
              {scans.slice(0, 4).map(scan => (
                <GlassCard
                  key={scan._id}
                  className="p-4 border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">Assessment Run</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        scan.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/25'
                          : scan.status === 'deleted'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          : scan.status === 'cancelled'
                          ? 'bg-red-500/10 text-red-400 border-red-500/25'
                          : scan.status === 'failed'
                          ? 'bg-red-500/10 text-red-400 border-red-500/25'
                          : 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30'
                      }`}>
                        {scan.status}
                      </span>
                      <span className="text-brand-cyan text-[10px] font-mono">v{scan.version || 1}</span>
                    </div>
                    <div className="text-[11px] text-text-muted font-mono truncate max-w-md">
                      {scan.targetUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {scan.riskScore !== null && (
                      <span className="text-xs font-mono text-amber-300 font-bold">
                        Score {scan.riskScore}/100
                      </span>
                    )}
                    <Link
                      to={`/dashboard/assessment/${scan._id}/results`}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium transition-colors"
                    >
                      Results &rarr;
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Critical & High Findings Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                Vulnerability Findings (API 4-8)
              </h2>
              <Link to="/dashboard/findings" className="text-xs text-brand-cyan hover:underline">
                View all findings &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {findings.slice(0, 3).map(f => (
                <GlassCard key={f._id} className="p-4 border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white">{f.title}</span>
                        <SeverityBadge severity={f.severity} />
                        <span className="font-mono text-[10px] text-brand-cyan">{f.scannerId}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                        {f.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleInspectEvidence(f.evidenceIds?.[0])}
                      className="px-2.5 py-1 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/25 text-[11px] font-semibold shrink-0 transition-colors flex items-center gap-1"
                    >
                      <Eye size={12} /> Evidence
                    </button>
                  </div>

                  <div className="text-[10px] font-mono text-text-muted flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Header: <strong className="text-sky-300">{f.metadata?.header || 'N/A'}</strong></span>
                    <span>Status: <strong className="text-white capitalize">{f.status}</strong></span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
