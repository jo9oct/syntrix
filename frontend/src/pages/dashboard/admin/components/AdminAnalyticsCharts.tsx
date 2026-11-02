import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Users,
  ShieldCheck,
  Code,
  Bug,
  Building,
  Shield,
  ArrowRight,
  Layers,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { GlassCard } from '../../../../components/ui/GlassCard';

// ============================================================================
// 1. SUBSCRIPTION TIER DISTRIBUTION (Interactive Modern Doughnut Chart)
// ============================================================================

export interface SubscriptionTierData {
  enterprise: number;
  pro: number;
  community: number;
  total: number;
}

interface SubscriptionTierDoughnutProps {
  data: SubscriptionTierData;
}

export const SubscriptionTierDoughnutChart: React.FC<SubscriptionTierDoughnutProps> = ({ data }) => {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  const tiers = useMemo(() => {
    const total = data.total > 0 ? data.total : (data.enterprise + data.pro + data.community);
    const validTotal = Math.max(total, 1);

    return [
      {
        id: 'enterprise',
        name: 'Enterprise',
        subtitle: 'Full Sovereign Lab',
        count: data.enterprise,
        percentage: total > 0 ? (data.enterprise / validTotal) * 100 : 0,
        color: '#A855F7', // Purple
        hoverColor: '#C084FC',
        glowColor: 'rgba(168, 85, 247, 0.4)',
        borderColor: 'border-brand-purple/30',
        bgColor: 'bg-brand-purple/10',
        textColor: 'text-brand-purple'
      },
      {
        id: 'pro',
        name: 'Pro SecOps',
        subtitle: 'Unlimited Retests',
        count: data.pro,
        percentage: total > 0 ? (data.pro / validTotal) * 100 : 0,
        color: '#3B82F6', // Blue
        hoverColor: '#60A5FA',
        glowColor: 'rgba(59, 130, 246, 0.4)',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-400'
      },
      {
        id: 'community',
        name: 'Community',
        subtitle: 'Community Tier',
        count: data.community,
        percentage: total > 0 ? (data.community / validTotal) * 100 : 0,
        color: '#06B6D4', // Cyan
        hoverColor: '#22D3EE',
        glowColor: 'rgba(6, 182, 212, 0.4)',
        borderColor: 'border-cyan-500/30',
        bgColor: 'bg-cyan-500/10',
        textColor: 'text-cyan-400'
      }
    ];
  }, [data]);

  const totalAccounts = data.total > 0 ? data.total : (data.enterprise + data.pro + data.community);

  // SVG parameters
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  // Calculate SVG stroke segments
  let cumulativePercentage = 0;
  const segments = tiers.map((tier) => {
    const strokeDasharray = `${(tier.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
    cumulativePercentage += tier.percentage;
    return {
      ...tier,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const activeTier = tiers.find((t) => t.id === hoveredTier);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-purple/15 text-brand-purple flex items-center justify-center border border-brand-purple/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
            <PieChart size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Subscription Tier Distribution
            </h3>
            <span className="text-[10px] text-text-muted">Account allocation by licensed capability</span>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 shadow-inner">
          {totalAccounts} Total Accounts
        </span>
      </div>

      {/* Doughnut Chart + Dynamic Stats Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10 pt-2">
        {/* SVG Interactive Doughnut Graphic */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[190px] h-[190px] flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox={`0 0 ${size} ${size}`}
            >
              {/* Subtle background track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={strokeWidth}
              />

              {/* Data segments */}
              {totalAccounts > 0 ? (
                segments.map((seg) => {
                  if (seg.count === 0) return null;
                  const isHovered = hoveredTier === seg.id;
                  return (
                    <circle
                      key={seg.id}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={isHovered ? seg.hoverColor : seg.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered
                          ? `drop-shadow(0 0 10px ${seg.color})`
                          : `drop-shadow(0 0 3px ${seg.color}66)`
                      }}
                      onMouseEnter={() => setHoveredTier(seg.id)}
                      onMouseLeave={() => setHoveredTier(null)}
                    />
                  );
                })
              ) : (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={strokeWidth}
                  strokeDasharray="6 6"
                />
              )}
            </svg>

            {/* Doughnut Center Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
              <span className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-md">
                {activeTier ? activeTier.count : totalAccounts}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted mt-0.5 max-w-[85px] truncate">
                {activeTier ? activeTier.name : 'Total Accounts'}
              </span>
              <span className="text-[10px] font-mono text-purple-400 font-semibold">
                {activeTier
                  ? `${activeTier.percentage.toFixed(1)}%`
                  : `${totalAccounts > 0 ? '100%' : '0%'}`}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-text-muted text-center font-mono">
            {activeTier ? (
              <span className="text-white font-medium">
                Showing <span className={activeTier.textColor}>{activeTier.name}</span> metrics
              </span>
            ) : (
              <span>Hover over segments to inspect</span>
            )}
          </div>
        </div>

        {/* Legend / Category Distribution Cards */}
        <div className="md:col-span-7 flex flex-col gap-2.5">
          {tiers.map((t) => {
            const isHovered = hoveredTier === t.id;
            return (
              <div
                key={t.id}
                onMouseEnter={() => setHoveredTier(t.id)}
                onMouseLeave={() => setHoveredTier(null)}
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? `${t.bgColor} ${t.borderColor} shadow-lg scale-[1.02]`
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: t.color,
                      boxShadow: isHovered ? `0 0 10px ${t.color}` : `0 0 4px ${t.color}`
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{t.name}</span>
                      <span className="text-[10px] text-text-muted hidden sm:inline">• {t.subtitle}</span>
                    </div>
                    <div className="text-[10px] text-text-muted sm:hidden">{t.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-right">
                  <div>
                    <div className="text-sm font-black text-white">{t.count}</div>
                    <div className="text-[10px] text-text-muted">{t.percentage.toFixed(1)}%</div>
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(t.percentage, t.count > 0 ? 5 : 0)}%`,
                        backgroundColor: t.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. GLOBAL FINDING SEVERITY DISTRIBUTION (Horizontal Ranked Bar Chart)
// ============================================================================

export interface FindingSeverityData {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface SeverityDistributionProps {
  data: FindingSeverityData;
}

export const SeverityDistributionChart: React.FC<SeverityDistributionProps> = ({ data }) => {
  const [hoveredSeverity, setHoveredSeverity] = useState<string | null>(null);

  const totalFindings = data.total > 0 ? data.total : (data.critical + data.high + data.medium + data.low);

  const categories = useMemo(() => {
    const validTotal = Math.max(totalFindings, 1);
    return [
      {
        id: 'critical',
        label: 'Critical',
        count: data.critical,
        percentage: totalFindings > 0 ? (data.critical / validTotal) * 100 : 0,
        color: '#EF4444', // Red
        accentBg: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        hoverBorder: 'hover:border-red-500/50',
        textColor: 'text-red-400',
        glow: 'rgba(239, 68, 68, 0.4)',
        sla: 'Immediate patch required'
      },
      {
        id: 'high',
        label: 'High',
        count: data.high,
        percentage: totalFindings > 0 ? (data.high / validTotal) * 100 : 0,
        color: '#F97316', // Orange
        accentBg: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        hoverBorder: 'hover:border-orange-500/50',
        textColor: 'text-orange-400',
        glow: 'rgba(249, 115, 22, 0.4)',
        sla: 'Within 48 hours'
      },
      {
        id: 'medium',
        label: 'Medium',
        count: data.medium,
        percentage: totalFindings > 0 ? (data.medium / validTotal) * 100 : 0,
        color: '#F59E0B', // Amber
        accentBg: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        hoverBorder: 'hover:border-amber-500/50',
        textColor: 'text-amber-400',
        glow: 'rgba(245, 158, 11, 0.4)',
        sla: 'Within sprint cycle'
      },
      {
        id: 'low',
        label: 'Low',
        count: data.low,
        percentage: totalFindings > 0 ? (data.low / validTotal) * 100 : 0,
        color: '#22C55E', // Green
        accentBg: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        hoverBorder: 'hover:border-emerald-500/50',
        textColor: 'text-emerald-400',
        glow: 'rgba(34, 197, 94, 0.4)',
        sla: 'Hardening & best practice'
      }
    ];
  }, [data, totalFindings]);

  // Determine highest single category count to scale relative bar widths visually
  const maxCategoryCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Global Finding Severity Distribution
            </h3>
            <span className="text-[10px] text-text-muted">Real-time vulnerability risk posture</span>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-inner">
          {totalFindings} Total Findings
        </span>
      </div>

      {/* Complementary Composite Severity Spectrum Strip */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>Overall Spectrum Composition</span>
          <span>{totalFindings > 0 ? '100% Normalized' : 'No findings'}</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/10 shadow-inner p-0.5">
          {totalFindings > 0 ? (
            categories.map((c) => {
              if (c.count === 0) return null;
              return (
                <div
                  key={c.id}
                  style={{
                    width: `${c.percentage}%`,
                    backgroundColor: c.color,
                    boxShadow: hoveredSeverity === c.id ? `0 0 10px ${c.color}` : 'none'
                  }}
                  title={`${c.label}: ${c.count} (${c.percentage.toFixed(1)}%)`}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full cursor-pointer hover:brightness-110"
                  onMouseEnter={() => setHoveredSeverity(c.id)}
                  onMouseLeave={() => setHoveredSeverity(null)}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-white/5 rounded-full" />
          )}
        </div>
      </div>

      {/* Horizontal Severity Ranked Bars */}
      <div className="space-y-3 relative z-10 pt-1">
        {categories.map((cat) => {
          const isHovered = hoveredSeverity === cat.id;
          const relativeWidth = totalFindings > 0 ? (cat.count / maxCategoryCount) * 100 : 0;

          return (
            <div
              key={cat.id}
              onMouseEnter={() => setHoveredSeverity(cat.id)}
              onMouseLeave={() => setHoveredSeverity(null)}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isHovered
                  ? `${cat.accentBg} ${cat.borderColor} shadow-lg scale-[1.01]`
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: cat.color,
                      boxShadow: `0 0 6px ${cat.color}`
                    }}
                  />
                  <span className={`font-bold ${cat.textColor}`}>{cat.label}</span>
                  <span className="text-[10px] text-text-muted hidden sm:inline">({cat.sla})</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-white">{cat.count}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-text-muted border border-white/5 font-semibold">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Scaled Horizontal Bar */}
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(relativeWidth, cat.count > 0 ? 3 : 0)}%`,
                    backgroundColor: cat.color,
                    boxShadow: isHovered ? `0 0 10px ${cat.color}` : `0 0 3px ${cat.color}66`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. PLATFORM ROLE ALLOCATION MATRIX (Interactive Multi-Role Visual Grid)
// ============================================================================

export interface RoleAllocationData {
  security_engineer: number;
  developer: number;
  malware_analyst: number;
  client_owner: number;
  client_member: number;
  admin: number;
  total: number;
}

interface RoleAllocationMatrixProps {
  data: RoleAllocationData;
  onManageUsers: () => void;
}

export const RoleAllocationMatrix: React.FC<RoleAllocationMatrixProps> = ({ data, onManageUsers }) => {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const totalUsers = data.total > 0
    ? data.total
    : (data.security_engineer + data.developer + data.malware_analyst + data.client_owner + data.client_member + data.admin);

  const roles = useMemo(() => {
    const validTotal = Math.max(totalUsers, 1);
    return [
      {
        id: 'security_engineer',
        name: 'Security Testers',
        count: data.security_engineer,
        percentage: totalUsers > 0 ? (data.security_engineer / validTotal) * 100 : 0,
        color: '#06B6D4', // Cyan
        icon: ShieldCheck,
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        text: 'text-cyan-400',
        desc: 'Active penetration specialists'
      },
      {
        id: 'developer',
        name: 'Developers',
        count: data.developer,
        percentage: totalUsers > 0 ? (data.developer / validTotal) * 100 : 0,
        color: '#10B981', // Emerald
        icon: Code,
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        desc: 'Remediation & code engineers'
      },
      {
        id: 'malware_analyst',
        name: 'Malware Lab',
        count: data.malware_analyst,
        percentage: totalUsers > 0 ? (data.malware_analyst / validTotal) * 100 : 0,
        color: '#A855F7', // Purple
        icon: Bug,
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-400',
        desc: 'Binary detonation & threat triage'
      },
      {
        id: 'client_owner',
        name: 'Client Owners',
        count: data.client_owner,
        percentage: totalUsers > 0 ? (data.client_owner / validTotal) * 100 : 0,
        color: '#6366F1', // Indigo
        icon: Building,
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text: 'text-indigo-400',
        desc: 'Organization lead & authority'
      },
      {
        id: 'client_member',
        name: 'Client Members',
        count: data.client_member,
        percentage: totalUsers > 0 ? (data.client_member / validTotal) * 100 : 0,
        color: '#94A3B8', // Slate
        icon: Users,
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        text: 'text-slate-300',
        desc: 'Team collaborators & viewers'
      },
      {
        id: 'admin',
        name: 'Platform Admins',
        count: data.admin,
        percentage: totalUsers > 0 ? (data.admin / validTotal) * 100 : 0,
        color: '#EC4899', // Pink / Magenta
        icon: Shield,
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        text: 'text-pink-400',
        desc: 'Sovereign platform controllers'
      }
    ];
  }, [data, totalUsers]);

  return (
    <GlassCard className="p-6 border-white/10 space-y-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-52 h-52 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Platform Role Allocation Matrix
            </h3>
            <span className="text-[10px] text-text-muted">Distribution of authenticated operational roles</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-inner">
            {totalUsers} Total Users
          </span>
          <button
            onClick={onManageUsers}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/30 text-xs font-semibold text-brand-cyan hover:text-white transition-all duration-200 shadow-sm"
          >
            <span>Manage All Users</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Proportional Role Distribution Progress Strip */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>Composite Role Proportions</span>
          <span>{totalUsers > 0 ? '100% Allocated' : '0 Users'}</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/10 shadow-inner p-0.5">
          {totalUsers > 0 ? (
            roles.map((r) => {
              if (r.count === 0) return null;
              return (
                <div
                  key={r.id}
                  style={{
                    width: `${r.percentage}%`,
                    backgroundColor: r.color,
                    boxShadow: hoveredRole === r.id ? `0 0 10px ${r.color}` : 'none'
                  }}
                  title={`${r.name}: ${r.count} users (${r.percentage.toFixed(1)}%)`}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full cursor-pointer hover:brightness-110"
                  onMouseEnter={() => setHoveredRole(r.id)}
                  onMouseLeave={() => setHoveredRole(null)}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-white/5 rounded-full" />
          )}
        </div>
      </div>

      {/* Six-Role Responsive Visualization Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 relative z-10 pt-1">
        {roles.map((r) => {
          const Icon = r.icon;
          const isHovered = hoveredRole === r.id;

          return (
            <div
              key={r.id}
              onMouseEnter={() => setHoveredRole(r.id)}
              onMouseLeave={() => setHoveredRole(null)}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                isHovered
                  ? `${r.bg} ${r.border} shadow-xl scale-[1.03] -translate-y-0.5`
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: r.color,
                        boxShadow: `0 0 6px ${r.color}`
                      }}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                      {r.name}
                    </span>
                  </div>
                  <Icon size={14} className={r.text} />
                </div>
                <div className="text-[10px] text-text-muted mt-1 truncate" title={r.desc}>
                  {r.desc}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-2xl font-black text-white">{r.count}</span>
                  <span className="text-[10px] font-semibold text-text-muted bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                    {r.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Micro progress bar for each role */}
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(r.percentage, r.count > 0 ? 8 : 0)}%`,
                      backgroundColor: r.color,
                      boxShadow: isHovered ? `0 0 8px ${r.color}` : 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

