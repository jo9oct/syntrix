import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  ShieldCheck, Bug, Activity, CheckCircle2, ArrowRight,
  TrendingUp, ShieldAlert, FileText, Plus, ExternalLink, X,
  Globe, Sliders, Trash2, Eye, Network, AlertTriangle, Sparkles,
  Settings, RefreshCw, Zap, Layers, Lock, Shield
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useUserTier } from '../../store/authStore';
import type { Target, Scan, Finding, AvailableScannersResponse, Evidence } from '../../types/sentrix';
import api from '../../lib/api';
import { EvidenceViewer } from '../../components/ui/EvidenceViewer';

interface UserDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    organization?: string;
  };
  overview: {
    riskScore: number;
    postureLevel: string;
    totalTargets: number;
    activeTargets: number;
    totalScans: number;
    runningScans: number;
    completedScans: number;
    failedScans: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    infoFindings: number;
    resolvedFindings: number;
    detectedFindings: number;
    totalScanners: number;
  };
  targets: {
    total: number;
    active: number;
    limit: string | number;
    items: Array<{
      id: string;
      _id: string;
      url: string;
      hostname: string;
      isActive: boolean;
      scanCount: number;
      scanVersionCounter: number;
      lastScannedAt: string | null;
      createdAt: string;
    }>;
  };
  scans: {
    total: number;
    running: number;
    completed: number;
    failed: number;
    latestCompleted: {
      id: string;
      targetUrl: string;
      riskScore: number;
      status: string;
      createdAt: string;
    } | null;
    items: Array<{
      id: string;
      _id: string;
      targetUrl: string;
      targetHostname?: string;
      status: string;
      riskScore: number;
      scanVersion: number;
      createdAt: string;
      completedAt: string | null;
    }>;
  };
  findings: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    byStatus: {
      detected: number;
      resolved: number;
    };
    items: Array<{
      id: string;
      _id: string;
      title: string;
      category: string;
      severity: string;
      confidence: string;
      status: string;
      createdAt: string;
      description?: string;
      scannerId?: string;
      evidenceIds?: string[];
    }>;
  };
  scanners: {
    total: number;
    recon: number;
    security: number;
    tierAllowed: number;
  };
  quotaAndLimits: {
    tier: string;
    status: string;
    maxTargets: string | number;
    allowedScannerEngines: number;
    canRunParallelScans: boolean;
    canRetest: boolean;
    canGeneratePdfReports: boolean;
    canUseMalwareSandbox: boolean;
  };
}

// Circular Risk Posture Gauge
const PostureGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  const color =
    validScore > 65 ? '#ef4444' : validScore > 35 ? '#f59e0b' : validScore > 0 ? '#10b981' : '#06b6d4';

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/10"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-white leading-none">{validScore}</span>
          <span className="text-[9px] font-mono text-text-muted mt-0.5">/ 100</span>
        </div>
      </div>
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Target Posture Score</div>
        <div className="text-sm font-bold text-white mt-0.5">{level}</div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium" style={{ color }}>
          <Shield size={13} />
          <span>{validScore <= 35 ? 'Controlled Exposure' : validScore <= 65 ? 'Action Required' : 'Critical Risk'}</span>
        </div>
      </div>
    </div>
  );
};

// Vulnerability Severity Breakdown Bar
const SeverityBreakdownBar: React.FC<{
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}> = ({ critical, high, medium, low, info, total }) => {
  if (total === 0) {
    return (
      <div className="py-2 text-center text-xs text-text-muted bg-white/[0.02] rounded-xl border border-white/5">
        No active vulnerabilities detected across monitored targets
      </div>
    );
  }

  const critPct = (critical / total) * 100;
  const highPct = (high / total) * 100;
  const medPct = (medium / total) * 100;
  const lowPct = (low / total) * 100;
  const infoPct = (info / total) * 100;

  return (
    <div className="space-y-2">
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/10 shadow-inner">
        {critPct > 0 && <div style={{ width: `${critPct}%` }} className="bg-red-500 transition-all" title={`Critical: ${critical}`} />}
        {highPct > 0 && <div style={{ width: `${highPct}%` }} className="bg-orange-500 transition-all" title={`High: ${high}`} />}
        {medPct > 0 && <div style={{ width: `${medPct}%` }} className="bg-amber-400 transition-all" title={`Medium: ${medium}`} />}
        {lowPct > 0 && <div style={{ width: `${lowPct}%` }} className="bg-brand-cyan transition-all" title={`Low: ${low}`} />}
        {infoPct > 0 && <div style={{ width: `${infoPct}%` }} className="bg-slate-400 transition-all" title={`Info: ${info}`} />}
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted flex-wrap gap-2 pt-1">
        <span className="flex items-center gap-1.5 text-red-400 font-semibold"><span className="w-2 h-2 rounded-full bg-red-500" /> {critical} Critical</span>
        <span className="flex items-center gap-1.5 text-orange-400 font-semibold"><span className="w-2 h-2 rounded-full bg-orange-500" /> {high} High</span>
        <span className="flex items-center gap-1.5 text-amber-300 font-semibold"><span className="w-2 h-2 rounded-full bg-amber-400" /> {medium} Medium</span>
        <span className="flex items-center gap-1.5 text-brand-cyan font-semibold"><span className="w-2 h-2 rounded-full bg-brand-cyan" /> {low} Low</span>
      </div>
    </div>
  );
};

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tier: userTier, isFree } = useUserTier();

  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Fetch telemetry exclusively from backend User Dashboard API: GET /api/v1/dashboard/user
  const fetchDashboardTelemetry = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/user');
      if (res.data?.success && res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load user dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardTelemetry();
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

  const overview = dashboardData?.overview;
  const targets = dashboardData?.targets?.items || [];
  const scans = dashboardData?.scans?.items || [];
  const findings = dashboardData?.findings?.items || [];
  const scanners = dashboardData?.scanners;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Evidence Viewer Modal */}
      <EvidenceViewer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />

      {/* Free Tier Workspace Banner Notice (Shown only for client_owner who has billing authority) */}
      {user?.role === 'client_owner' && isFree && (
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
      )}

      {/* Top Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            Sentrix Autonomous Engine: Operational & Compliant
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Security Command Center
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Real-time vulnerability telemetry, monitored target environments, and automated security scans.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDashboardTelemetry}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white border border-white/10 transition-colors"
            title="Refresh dashboard telemetry"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-brand-cyan' : ''} />
          </button>
          <Link
            to="/dashboard/scopes"
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Network size={14} /> Scopes
          </Link>
          <Link
            to="/dashboard/rules"
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sliders size={14} /> Policies
          </Link>
          <Link
            to="/dashboard/assessment/new"
            className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20 font-bold"
          >
            <Plus size={15} /> New Assessment
          </Link>
        </div>
      </div>

      {/* 4 Core Hero Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Posture Score Meter */}
        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <PostureGauge
            score={overview?.riskScore ?? 21}
            level={overview?.postureLevel ?? 'Controlled Exposure Level'}
          />
        </GlassCard>

        {/* Monitored Targets */}
        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Monitored Targets</span>
              <Globe size={18} className="text-brand-cyan" />
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {overview?.totalTargets ?? targets.length}
              {isFree && <span className="text-xs text-amber-400 font-bold ml-1.5 font-mono">/ 1 Max</span>}
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-3 flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-green-400 font-semibold">{overview?.activeTargets ?? targets.length} Active Targets</span>
            <Link to="/dashboard/projects" className="text-brand-cyan hover:underline text-[11px]">
              Inventory &rarr;
            </Link>
          </div>
        </GlassCard>

        {/* Total Scans & Activity */}
        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Security Scans</span>
              <Activity size={18} className="text-green-400" />
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {overview?.totalScans ?? scans.length}
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-3 flex items-center justify-between pt-2 border-t border-white/5 font-mono">
            <span className="text-green-400">{overview?.completedScans ?? scans.length} Completed</span>
            {overview?.runningScans ? (
              <span className="text-amber-400 animate-pulse">{overview.runningScans} Running</span>
            ) : (
              <span className="text-text-muted">0 Active</span>
            )}
          </div>
        </GlassCard>

        {/* Active Vulnerabilities */}
        <GlassCard className="p-5 border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Findings</span>
              <ShieldAlert size={18} className="text-red-400" />
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {overview?.totalFindings ?? findings.length}
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-3 flex items-center justify-between pt-2 border-t border-white/5 font-mono">
            <span className="text-red-400 font-semibold">{overview?.criticalFindings ?? 0} Crit</span>
            <span className="text-orange-400 font-semibold">{overview?.highFindings ?? 0} High</span>
            <span className="text-amber-300 font-semibold">{overview?.mediumFindings ?? 0} Med</span>
            <span className="text-brand-cyan font-semibold">{overview?.lowFindings ?? 0} Low</span>
          </div>
        </GlassCard>
      </div>

      {/* Vulnerability Severity Stacked Progress Visual Card */}
      <GlassCard className="p-5 border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-cyan" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Vulnerability Risk Distribution across Assets
            </h3>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {overview?.totalFindings ?? findings.length} Total Findings Recorded
          </span>
        </div>
        <SeverityBreakdownBar
          critical={overview?.criticalFindings ?? 0}
          high={overview?.highFindings ?? 0}
          medium={overview?.mediumFindings ?? 0}
          low={overview?.lowFindings ?? 0}
          info={overview?.infoFindings ?? 0}
          total={overview?.totalFindings ?? findings.length}
        />
      </GlassCard>

      {/* Main Grid: Active Targets (Left) and Assessments & Findings (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Target Inventory & Autonomous Engines */}
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
            {targets.length === 0 ? (
              <GlassCard className="p-6 border-white/10 text-center text-text-muted">
                <Globe size={32} className="mx-auto text-white/20 mb-2" />
                <p className="text-xs">No target environments registered yet.</p>
                <button
                  onClick={() => navigate('/dashboard/projects')}
                  className="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold mt-3"
                >
                  Add Target Asset
                </button>
              </GlassCard>
            ) : (
              targets.slice(0, 4).map((tgt) => (
                <GlassCard
                  key={tgt.id || tgt._id}
                  className="p-4 border-white/10 hover:border-brand-cyan/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/dashboard/projects/${tgt.id || tgt._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="font-bold text-xs text-white truncate group-hover:text-brand-cyan transition-colors">
                        {tgt.hostname}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted truncate">
                        {tgt.url}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan font-bold shrink-0">
                      v{tgt.scanVersionCounter || 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-text-muted mt-3 pt-2 border-t border-white/5 font-mono">
                    <span>{tgt.scanCount || 0} Scans executed</span>
                    <span>{tgt.lastScannedAt ? new Date(tgt.lastScannedAt).toLocaleDateString() : 'Pending'}</span>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {/* Autonomous Scanner Capabilities */}
          <GlassCard className="p-5 border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} /> Scanner Engines
              </h3>
              <span className="text-[11px] font-mono text-green-400 font-bold">25 Active Probes</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Equipped with 10 Recon probes (Subdomains, DNS, Ports, SSL/TLS) and 15 Security testing engines (SQLi, XSS, SSRF, CORS, Security Headers).
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pt-2 border-t border-white/5">
              <span>10 Recon Engines</span>
              <span>15 Security Probes</span>
            </div>
            <button
              onClick={() => navigate('/dashboard/assessment/new')}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors"
            >
              Launch Assessment Wizard &rarr;
            </button>
          </GlassCard>
        </div>

        {/* Right Column: Recent Security Assessments & Findings */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Scans Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-green-400" />
                Recent Security Assessments
              </h2>
              <Link to="/dashboard/scans/deleted" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
                <Trash2 size={12} /> Deleted Archive
              </Link>
            </div>

            <div className="space-y-2.5">
              {scans.length === 0 ? (
                <GlassCard className="p-6 border-white/10 text-center text-text-muted">
                  <Activity size={32} className="mx-auto text-white/20 mb-2" />
                  <p className="text-xs">No scan history recorded for this user.</p>
                  <button
                    onClick={() => navigate('/dashboard/assessment/new')}
                    className="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold mt-3"
                  >
                    Start First Assessment
                  </button>
                </GlassCard>
              ) : (
                scans.slice(0, 4).map((scan) => (
                  <GlassCard
                    key={scan.id || scan._id}
                    className="p-4 border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">Assessment Run</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            scan.status === 'completed'
                              ? 'bg-green-500/10 text-green-400 border-green-500/25'
                              : scan.status === 'deleted'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              : scan.status === 'running' || scan.status === 'crawling'
                              ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/35 animate-pulse'
                              : 'bg-red-500/10 text-red-400 border-red-500/25'
                          }`}
                        >
                          {scan.status}
                        </span>
                        <span className="text-brand-cyan text-[10px] font-mono">v{scan.scanVersion || 1}</span>
                      </div>
                      <div className="text-[11px] text-text-muted font-mono truncate max-w-md">
                        {scan.targetUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {scan.riskScore !== undefined && scan.riskScore !== null && (
                        <span className="text-xs font-mono text-amber-300 font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                          Score {scan.riskScore}/100
                        </span>
                      )}
                      <Link
                        to={`/dashboard/assessment/${scan.id || scan._id}/results`}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium transition-colors"
                      >
                        Results &rarr;
                      </Link>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          {/* Critical & High Findings Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                Vulnerability Findings
              </h2>
              <Link to="/dashboard/findings" className="text-xs text-brand-cyan hover:underline">
                View all findings &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {findings.length === 0 ? (
                <GlassCard className="p-6 border-white/10 text-center text-text-muted">
                  <CheckCircle2 size={32} className="mx-auto text-green-400/30 mb-2" />
                  <p className="text-xs">No unresolved vulnerabilities detected on monitored targets.</p>
                </GlassCard>
              ) : (
                findings.slice(0, 3).map((f) => (
                  <GlassCard key={f.id || f._id} className="p-4 border-white/10 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white">{f.title}</span>
                          <SeverityBadge severity={f.severity as any} />
                          <span className="font-mono text-[10px] text-brand-cyan">{f.category || f.scannerId}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                          {f.description || 'Vulnerability verified during automated probe detonation.'}
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
                      <span>Category: <strong className="text-sky-300">{f.category || 'Security Probe'}</strong></span>
                      <span>Status: <strong className="text-white capitalize">{f.status || 'detected'}</strong></span>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
