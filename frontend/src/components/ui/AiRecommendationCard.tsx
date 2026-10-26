// STATUS: UPDATED
// FILE: frontend/src/components/ui/AiRecommendationCard.tsx
// PURPOSE: Reusable UI component for displaying on-demand AI Recommendations, Impact, Root Cause, and Step-by-Step Remediation Actions with tier gating (Pro & Enterprise)

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Cpu,
  RefreshCw,
  ListChecks,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useUserTier } from '../../store/authStore';
import type { AiAnalysisData } from '../../types/sentrix';

interface AiRecommendationCardProps {
  findingId: string;
  initialAnalysis?: AiAnalysisData | null;
  baselineRemediation?: string | null;
  onAnalysisUpdated?: (updatedAnalysis: AiAnalysisData) => void;
  defaultExpanded?: boolean;
}

export const AiRecommendationCard: React.FC<AiRecommendationCardProps> = ({
  findingId,
  initialAnalysis = null,
  baselineRemediation = null,
  onAnalysisUpdated,
  defaultExpanded = true,
}) => {
  const navigate = useNavigate();
  const { isFree } = useUserTier();

  const [analysis, setAnalysis] = useState<AiAnalysisData | null>(initialAnalysis || null);
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize state when initialAnalysis prop updates (e.g., from batch scan analysis)
  useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    }
  }, [initialAnalysis]);

  // Trigger on-demand AI analysis for this finding
  const handleRunAiAnalysis = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isFree) {
      setError('AI Security Advisory is exclusive to Pro and Enterprise tiers. Please upgrade your subscription.');
      navigate('/dashboard/billing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/ai-analysis/findings/${findingId}/analyze`);
      const resultData = res.data?.data?.analysis || res.data?.data?.result;

      if (resultData) {
        const normalized: AiAnalysisData = {
          summary: resultData.summary || null,
          impact: resultData.impact || null,
          rootCause: resultData.rootCause || null,
          uncertainty: resultData.uncertainty || null,
          remediation: resultData.remediation || null,
          status: 'completed',
          provider: res.data?.data?.provider || 'groq',
          model: res.data?.data?.model || 'openai/gpt-oss-20b',
          completedAt: new Date().toISOString(),
        };

        setAnalysis(normalized);
        setExpanded(true);
        if (onAnalysisUpdated) {
          onAnalysisUpdated(normalized);
        }
      } else {
        setError('AI analysis completed without detailed results.');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to generate AI recommendations.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const hasAnalysis = Boolean(
    analysis &&
      (analysis.summary ||
        analysis.rootCause ||
        analysis.impact ||
        analysis.remediation)
  );

  return (
    <div className="rounded-xl border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/5 via-white/[0.02] to-transparent p-3.5 transition-all shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-cyan/20 text-brand-cyan">
            <Sparkles size={14} className={loading ? 'animate-spin text-brand-cyan' : ''} />
          </div>
          <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            AI Remediation & Security Intelligence
          </span>
          {hasAnalysis ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={10} /> Ready
            </span>
          ) : isFree ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Lock size={10} /> Pro & Enterprise
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-text-muted border border-white/10">
              On-Demand
            </span>
          )}
          {analysis?.model && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-text-muted bg-white/5 border border-white/10">
              <Cpu size={10} /> {analysis.model}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Action button: locked upgrade for free, active generator for pro/enterprise */}
          {isFree ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/dashboard/billing');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              title="AI Security Advisory is exclusive to Pro and Enterprise tiers"
            >
              <Lock size={11} />
              Upgrade for AI Advisory
            </button>
          ) : (
            <button
              onClick={handleRunAiAnalysis}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
              title="Generate or refresh defensive remediation instructions using Groq AI"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Analyzing...' : hasAnalysis ? 'Re-Analyze AI' : 'Generate AI Advisory'}
            </button>
          )}

          {hasAnalysis && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              title={expanded ? 'Collapse Advisory' : 'Expand Advisory'}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2.5 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
          {isFree && (
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="shrink-0 px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-semibold text-[10px]"
            >
              Upgrade
            </button>
          )}
        </div>
      )}

      {/* Expanded Content when AI has analyzed */}
      {expanded && hasAnalysis && (
        <div className="mt-3 space-y-3 pt-2.5 border-t border-white/5 text-xs">
          {/* 1. Summary */}
          {analysis?.summary && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Executive Vulnerability Summary
              </span>
              <p className="text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5 font-sans">
                {analysis.summary}
              </p>
            </div>
          )}

          {/* 2. Grid for Root Cause & Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {analysis?.rootCause && (
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <AlertCircle size={12} /> Root Cause Analysis
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {analysis.rootCause}
                </p>
              </div>
            )}

            {analysis?.impact && (
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> Threat & Business Impact
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {analysis.impact}
                </p>
              </div>
            )}
          </div>

          {/* 3. Actionable Remediation Checklist */}
          {analysis?.remediation && (
            <div className="space-y-2 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <ListChecks size={13} /> Defensive Remediation Checklist
              </span>

              {analysis.remediation.summary && (
                <p className="text-slate-200 font-medium text-[11px] leading-relaxed">
                  {analysis.remediation.summary}
                </p>
              )}

              {Array.isArray(analysis.remediation.actions) &&
                analysis.remediation.actions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {analysis.remediation.actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-slate-300 text-[11px] leading-snug"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                )}

              {/* References */}
              {Array.isArray(analysis.remediation.references) &&
                analysis.remediation.references.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/10 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="text-text-muted">Standards & References:</span>
                    {analysis.remediation.references.map((ref, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-cyan hover:underline"
                      >
                        <ExternalLink size={9} />
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Baseline / On-Demand State when no AI analysis requested yet */}
      {!hasAnalysis && !loading && !error && (
        <div className="mt-2.5 space-y-2">
          {baselineRemediation && (
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Baseline Remediation Guidance
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {baselineRemediation}
              </p>
            </div>
          )}

          {isFree ? (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Lock size={12} /> AI Security Advisory (Pro & Enterprise)
                </span>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Automated AI threat impact analysis, root cause diagnosis, and tailored defensive code remediation steps are exclusive to Pro and Enterprise tiers.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/billing')}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all shadow-sm"
              >
                Upgrade Plan
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-text-muted">
              <span>
                AI analysis is kept on-demand: click <strong>&quot;Generate AI Advisory&quot;</strong> above to generate deep root cause analysis, impact breakdown, and defensive developer steps.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
