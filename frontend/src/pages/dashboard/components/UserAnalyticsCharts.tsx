import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowRight,
  ShieldAlert,
  PieChart,
  Zap,
  Globe,
  TrendingUp,
  Clock,
  Layers,
  Shield,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../../../components/ui/GlassCard';

// ============================================================================
// 1. VULNERABILITY RISK DISTRIBUTION CHART (Ranked Horizontal Bars + Spectrum)
// ============================================================================

export interface UserFindingSeverityData {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info?: number;
  total: number;
}

interface UserSeverityDistributionProps {
  data: UserFindingSeverityData;
}

export const UserSeverityDistributionChart: React.FC<UserSeverityDistributionProps> = ({ data }) => {
  const [hoveredSeverity, setHoveredSeverity] = useState<string | null>(null);

  const totalFindings = data.total > 0
    ? data.total
    : (data.critical + data.high + data.medium + data.low + (data.info || 0));

  const categories = useMemo(() => {
    const validTotal = Math.max(totalFindings, 1);
    const infoCount = data.info || 0;

    return [
      {
        id: 'critical',
        label: 'Critical',
        count: data.critical,
        percentage: totalFindings > 0 ? (data.critical / validTotal) * 100 : 0,
        color: '#EF4444', // Red
        accentBg: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
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
        textColor: 'text-emerald-400',
        glow: 'rgba(34, 197, 94, 0.4)',
        sla: 'Hardening & best practice'
      },
      ...(infoCount > 0
        ? [
            {
              id: 'info',
              label: 'Informational',
              count: infoCount,
              percentage: totalFindings > 0 ? (infoCount / validTotal) * 100 : 0,
              color: '#64748B', // Slate
              accentBg: 'bg-slate-500/10',
              borderColor: 'border-slate-500/20',
              textColor: 'text-slate-400',
              glow: 'rgba(100, 116, 139, 0.4)',
              sla: 'Advisory notice'
            }
          ]
        : [])
    ];
  }, [data, totalFindings]);

  const maxCategoryCount = Math.max(...categories.map((c) => c.count), 1);

  if (totalFindings === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center border border-brand-cyan/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Vulnerability Risk Distribution
              </h3>
              <span className="text-[10px] text-text-muted">Target environment security posture</span>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            0 Active Findings
          </span>
        </div>

        <div className="py-8 text-center text-xs text-text-muted bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={24} />
          </div>
          <span className="text-sm font-bold text-white">No active vulnerabilities detected across monitored targets</span>
          <span className="text-[11px] text-text-muted max-w-sm">All scanned assets are currently in compliance with defined baseline policies.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center border border-brand-cyan/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Vulnerability Risk Distribution
            </h3>
            <span className="text-[10px] text-text-muted">Target asset severity telemetry</span>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-inner">
          {totalFindings} Total Findings
        </span>
      </div>

      {/* Composite Spectrum Progress Strip */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>Overall Finding Composition</span>
          <span>{totalFindings > 0 ? '100% Normalized' : '0 Findings'}</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/10 shadow-inner p-0.5">
          {categories.map((c) => {
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
          })}
        </div>
      </div>

      {/* Horizontal Ranked Severity Bars */}
      <div className="space-y-2.5 relative z-10 pt-1">
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
// 2. REMEDIATION RESOLUTION DOUGHNUT (Interactive Resolution Health Gauge)
// ============================================================================

export interface UserRemediationData {
  resolved: number;
  detected: number; // in backlog
  total: number;
  resolutionRate: number;
}

interface RemediationResolutionDoughnutProps {
  data: UserRemediationData;
}

export const RemediationResolutionDoughnut: React.FC<RemediationResolutionDoughnutProps> = ({ data }) => {
  const [hoveredSegment, setHoveredSegment] = useState<'resolved' | 'detected' | null>(null);

  const total = data.total > 0 ? data.total : (data.resolved + data.detected);
  const validTotal = Math.max(total, 1);

  const resolvedPct = total > 0 ? (data.resolved / validTotal) * 100 : 100;
  const detectedPct = total > 0 ? (data.detected / validTotal) * 100 : 0;

  // SVG parameters
  const size = 150;
  const center = size / 2;
  const radius = 52;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;

  const resolvedStrokeDasharray = `${(resolvedPct / 100) * circumference} ${circumference}`;
  const detectedStrokeDasharray = `${(detectedPct / 100) * circumference} ${circumference}`;
  const detectedStrokeDashoffset = -((resolvedPct / 100) * circumference);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Remediation Health
            </h3>
            <span className="text-[10px] text-text-muted">Verification & triage efficiency</span>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          {data.resolutionRate}% Rate
        </span>
      </div>

      {/* Center Interactive Doughnut */}
      <div className="flex items-center justify-center relative py-2 z-10">
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
            {/* Background track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Resolved segment (Emerald) */}
            {data.resolved > 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={hoveredSegment === 'resolved' ? '#34D399' : '#10B981'}
                strokeWidth={hoveredSegment === 'resolved' ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={resolvedStrokeDasharray}
                strokeDashoffset={0}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  filter: hoveredSegment === 'resolved'
                    ? 'drop-shadow(0 0 8px rgba(16,185,129,0.7))'
                    : 'drop-shadow(0 0 3px rgba(16,185,129,0.4))'
                }}
                onMouseEnter={() => setHoveredSegment('resolved')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}

            {/* In Backlog segment (Amber) */}
            {data.detected > 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={hoveredSegment === 'detected' ? '#FBBF24' : '#F59E0B'}
                strokeWidth={hoveredSegment === 'detected' ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={detectedStrokeDasharray}
                strokeDashoffset={detectedStrokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  filter: hoveredSegment === 'detected'
                    ? 'drop-shadow(0 0 8px rgba(245,158,11,0.7))'
                    : 'drop-shadow(0 0 3px rgba(245,158,11,0.4))'
                }}
                onMouseEnter={() => setHoveredSegment('detected')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <span className="text-2xl font-black text-white font-mono leading-none">
              {hoveredSegment === 'detected'
                ? data.detected
                : hoveredSegment === 'resolved'
                ? data.resolved
                : `${data.resolutionRate}%`}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted mt-1">
              {hoveredSegment === 'detected'
                ? 'Backlog'
                : hoveredSegment === 'resolved'
                ? 'Resolved'
                : 'Resolved'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono relative z-10">
        <div
          onMouseEnter={() => setHoveredSegment('resolved')}
          onMouseLeave={() => setHoveredSegment(null)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            hoveredSegment === 'resolved'
              ? 'bg-emerald-500/15 border-emerald-500/40 shadow-md'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Resolved</span>
          </div>
          <div className="text-lg font-black text-white mt-1">{data.resolved}</div>
          <div className="text-[9px] text-text-muted mt-0.5">{resolvedPct.toFixed(0)}% verified</div>
        </div>

        <div
          onMouseEnter={() => setHoveredSegment('detected')}
          onMouseLeave={() => setHoveredSegment(null)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            hoveredSegment === 'detected'
              ? 'bg-amber-500/15 border-amber-500/40 shadow-md'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}
        >
          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>In Backlog</span>
          </div>
          <div className="text-lg font-black text-white mt-1">{data.detected}</div>
          <div className="text-[9px] text-text-muted mt-0.5">{detectedPct.toFixed(0)}% pending</div>
        </div>
      </div>

      {/* Action link */}
      <Link
        to="/dashboard/remediation"
        className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors group relative z-10 shadow-sm"
      >
        <span>Open Remediation Board</span>
        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
};

// ============================================================================
// 3. TARGET POSTURE GAUGE (Elevated Cyber Radial Score Meter)
// ============================================================================

export const ElevatedPostureGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  const color =
    validScore > 65 ? '#EF4444' : validScore > 35 ? '#F59E0B' : validScore > 0 ? '#10B981' : '#06B6D4';

  const glowColor =
    validScore > 65
      ? 'rgba(239, 68, 68, 0.4)'
      : validScore > 35
      ? 'rgba(245, 158, 11, 0.4)'
      : validScore > 0
      ? 'rgba(16, 185, 129, 0.4)'
      : 'rgba(6, 182, 212, 0.4)';

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
        <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="8"
            fill="transparent"
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
            style={{
              filter: `drop-shadow(0 0 8px ${glowColor})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-white font-mono leading-none tracking-tight">
            {validScore}
          </span>
          <span className="text-[8px] font-mono font-semibold text-text-muted mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Target Posture Score</div>
        <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{level}</div>
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold" style={{ color }}>
          <Shield size={12} className="shrink-0" />
          <span>
            {validScore <= 35
              ? 'Controlled Exposure'
              : validScore <= 65
              ? 'Action Required'
              : 'Critical Exposure'}
          </span>
        </div>
      </div>
    </div>
  );
};

