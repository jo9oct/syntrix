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
import { getTargetDisplayName } from '../../lib/targetUtils';
import {
  UserSeverityDistributionChart,
  RemediationResolutionDoughnut,
  ElevatedPostureGauge
} from './components/UserAnalyticsCharts';

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
      name?: string;
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

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tier: userTier, isFree } = useUserTier();

  const isClientOwner = user?.role === 'client_owner';
  const isClientMember = user?.role === 'client_member';

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
  const quota = dashboardData?.quotaAndLimits;

  // Intelligently select and display only the top 3 newest items in the dashboard
  const displayedTargets = [...targets]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  const displayedScans = [...scans]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  const displayedFindings = [...findings]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  // Calculation for resolution rate
  const resolvedCount = overview?.resolvedFindings ?? 0;
  const totalFindingsCount = overview?.totalFindings ?? findings.length;
  const resolutionRate = totalFindingsCount > 0 
    ? Math.round((resolvedCount / totalFindingsCount) * 100) 
    : 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Evidence Viewer Modal */}
      <EvidenceViewer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />

      {/* Free Tier Workspace Banner Notice (Shown only for client_owner who has billing authority) */}
      {isClientOwner && isFree && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 shadow-lg shadow-amber-500/5 backdrop-blur-sm">
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
              <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Operating on community tier. Upgrade to Pro for automated fuzzing, unlimited targets, and verification retesting.
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

      {/* Top Welcome & Action Header with Role-Specific Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            {isClientMember ? 'Team Workspace • Asset Vulnerability Monitor' : 'Executive Security Command • Attack Surface Telemetry'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isClientMember ? 'Organization Security Monitor' : 'Security Command Center'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {isClientMember
              ? 'Real-time vulnerability findings, scan execution telemetry, and verified evidence for your assigned assets.'
              : 'Holistic risk score analysis, target environment controls, and autonomous assessment execution.'}
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

      {/* 4 Core Hero Telemetry Cards - Styled with layout inspired by reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Posture Score */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-brand-cyan/25 hover:border-brand-cyan/40 transition-all flex flex-col justify-between shadow-lg shadow-brand-cyan/[0.03]">
          <ElevatedPostureGauge
            score={overview?.riskScore ?? 21}
            level={overview?.postureLevel ?? 'Controlled Exposure Level'}
          />
        </div>

        {/* Card 2: Monitored Targets */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-blue-500/25 hover:border-blue-500/40 transition-all flex flex-col justify-between shadow-lg shadow-blue-500/[0.03]">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Monitored Targets</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Globe size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {overview?.totalTargets ?? targets.length}
              {isClientOwner && isFree && (
                <span className="text-xs text-amber-400 font-bold ml-1.5 font-mono">/ 1 Max</span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(overview?.totalTargets ?? targets.length) > 0 ? Math.min(100, (((overview?.activeTargets ?? targets.length) / Math.max(overview?.totalTargets ?? targets.length, 1)) * 100)) : 0}%`
                }}
              />
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-2 flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-emerald-400 font-semibold">{overview?.activeTargets ?? targets.length} Active Targets</span>
            <Link to="/dashboard/projects" className="text-brand-cyan hover:underline text-[11px] font-medium">
              Inventory &rarr;
            </Link>
          </div>
        </div>

        {/* Card 3: Security Scans */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-emerald-500/25 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-lg shadow-emerald-500/[0.03]">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Security Scans</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {overview?.totalScans ?? scans.length}
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-700"
                style={{
                  width: `${(overview?.totalScans ?? scans.length) > 0 ? Math.min(100, (((overview?.completedScans ?? scans.length) / Math.max(overview?.totalScans ?? scans.length, 1)) * 100)) : 0}%`
                }}
              />
              {overview?.runningScans ? (
                <div
                  className="bg-amber-400 h-full animate-pulse transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((overview.runningScans / Math.max(overview?.totalScans ?? scans.length, 1)) * 100))}%`
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-2 flex items-center justify-between pt-2 border-t border-white/5 font-mono">
            <span className="text-emerald-400 font-semibold">{overview?.completedScans ?? scans.length} Completed</span>
            {overview?.runningScans ? (
              <span className="text-amber-400 animate-pulse font-bold">{overview.runningScans} Running</span>
            ) : (
              <span className="text-text-muted">0 Active</span>
            )}
          </div>
        </div>

        {/* Card 4: Active Vulnerabilities */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-red-500/25 hover:border-red-500/40 transition-all flex flex-col justify-between shadow-lg shadow-red-500/[0.03]">
          <div>
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Active Findings</span>
              <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {overview?.totalFindings ?? findings.length}
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden flex">
              {(() => {
                const total = Math.max(overview?.totalFindings ?? findings.length, 1);
                const crit = ((overview?.criticalFindings ?? 0) / total) * 100;
                const high = ((overview?.highFindings ?? 0) / total) * 100;
                const med = ((overview?.mediumFindings ?? 0) / total) * 100;
                const low = ((overview?.lowFindings ?? 0) / total) * 100;
                return (
                  <>
                    <div style={{ width: `${crit}%` }} className="bg-red-500 h-full" />
                    <div style={{ width: `${high}%` }} className="bg-orange-500 h-full" />
                    <div style={{ width: `${med}%` }} className="bg-amber-400 h-full" />
                    <div style={{ width: `${low}%` }} className="bg-brand-cyan h-full" />
                  </>
                );
              })()}
            </div>
          </div>
          <div className="text-[11px] text-text-muted mt-2 flex items-center justify-between pt-2 border-t border-white/5 font-mono">
            <span className="text-red-400 font-semibold">{overview?.criticalFindings ?? 0} Crit</span>
            <span className="text-orange-400 font-semibold">{overview?.highFindings ?? 0} High</span>
            <span className="text-amber-300 font-semibold">{overview?.mediumFindings ?? 0} Med</span>
            <span className="text-brand-cyan font-semibold">{overview?.lowFindings ?? 0} Low</span>
          </div>
        </div>
      </div>

      {/* Dual Analytics Row: Vulnerability Exposure & Remediation Resolution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vulnerability Severity Stacked Progress & Ranked Distribution (2 cols) */}
        <div className="lg:col-span-2">
          <UserSeverityDistributionChart
            data={{
              critical: overview?.criticalFindings ?? 0,
              high: overview?.highFindings ?? 0,
              medium: overview?.mediumFindings ?? 0,
              low: overview?.lowFindings ?? 0,
              info: overview?.infoFindings ?? 0,
              total: overview?.totalFindings ?? findings.length
            }}
          />
        </div>

        {/* Remediation & Verification Resolution Doughnut (1 col) */}
        <div className="lg:col-span-1">
          <RemediationResolutionDoughnut
            data={{
              resolved: resolvedCount,
              detected: overview?.detectedFindings ?? 0,
              total: totalFindingsCount,
              resolutionRate
            }}
          />
        </div>
      </div>

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
              displayedTargets.map((tgt) => (
                <GlassCard
                  key={tgt.id || tgt._id}
                  className="p-4 border-white/10 hover:border-brand-cyan/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/dashboard/projects/${tgt.id || tgt._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="font-bold text-xs text-white truncate group-hover:text-brand-cyan transition-colors">
                        {getTargetDisplayName(tgt)}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted truncate">
                        {tgt.url || tgt.hostname}
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
          <GlassCard className="p-5 border-white/10 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Zap size={14} />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Scanner Engines
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {scanners?.total ?? 25} Active Probes
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Equipped with {scanners?.recon ?? 10} Recon probes (Subdomains, DNS, Ports, SSL/TLS) and {scanners?.security ?? 15} Security testing engines (SQLi, XSS, SSRF, CORS, Security Headers).
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                <span>Engine Allocation</span>
                <span className="text-cyan-400">{scanners?.recon ?? 10} Recon • {scanners?.security ?? 15} Security</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex p-0.5">
                <div style={{ width: `${((scanners?.recon ?? 10) / (scanners?.total ?? 25)) * 100}%` }} className="bg-brand-cyan rounded-l-full shadow-[0_0_6px_rgba(6,182,212,0.5)]" title={`${scanners?.recon ?? 10} Recon Engines`} />
                <div style={{ width: `${((scanners?.security ?? 15) / (scanners?.total ?? 25)) * 100}%` }} className="bg-emerald-500 rounded-r-full shadow-[0_0_6px_rgba(16,185,129,0.5)]" title={`${scanners?.security ?? 15} Security Probes`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                <div className="text-[10px] text-cyan-400 font-bold uppercase">Recon Engines</div>
                <div className="text-lg font-black text-white mt-0.5">{scanners?.recon ?? 10}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Security Probes</div>
                <div className="text-lg font-black text-white mt-0.5">{scanners?.security ?? 15}</div>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard/assessment/new')}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 group"
            >
              <span>Launch Assessment Wizard</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
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
                displayedScans.map((scan) => (
                  <GlassCard
                    key={scan.id || scan._id}
                    className="p-4 border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate max-w-[220px]">
                          {getTargetDisplayName(scan.targetHostname || scan.targetUrl)}
                        </span>
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
                displayedFindings.map((f) => (
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