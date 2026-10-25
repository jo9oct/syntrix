import React, { useState } from "react";
import type { Evidence } from "../../types/sentrix";
import { GlassCard } from "./GlassCard";
import {
  FileCode,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  X,
  ExternalLink,
  Eye,
  ArrowRightLeft,
  Lock,
} from "lucide-react";

interface EvidenceViewerProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidence,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "exchange" | "headers" | "observation"
  >("exchange");

  if (!evidence) return null;

  const copyCurl = () => {
    const curl = `curl -X ${evidence.method || "GET"} "${evidence.url}" \\
${Object.entries(evidence.headers || {})
  .slice(0, 5)
  .map(([k, v]) => `  -H "${k}: ${v}"`)
  .join(" \\\n")}`;

    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b0f19] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Evidence Inspector (HTTP Exchange)
                </h3>
                {evidence.sensitiveDataRedacted && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                    <Lock size={10} /> Redacted
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted font-mono truncate max-w-xl">
                {evidence.method} {evidence.url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCurl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-muted hover:text-white transition-colors"
            >
              {copied ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
              <span>{copied ? "Copied cURL" : "Copy cURL"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-header Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white/[0.01] border-b border-white/10 text-xs">
          <div className="flex items-center gap-1">
            {[
              { id: "exchange", label: "HTTP Exchange" },
              { id: "headers", label: "Response Headers" },
              { id: "observation", label: "Scanner Observation" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 font-semibold"
                    : "text-text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
            <span>
              Status:{" "}
              <strong
                className={
                  evidence.statusCode >= 400
                    ? "text-amber-400"
                    : "text-green-400"
                }
              >
                {evidence.statusCode}
              </strong>
            </span>
            <span>•</span>
            <span>
              Scanner:{" "}
              <strong className="text-brand-cyan">{evidence.scannerId}</strong>
            </span>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "exchange" && (
            <div className="space-y-6">
              {/* Request */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <span>Client Request</span>
                  <span className="font-mono text-white/50">
                    {evidence.method}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                  <div className="text-brand-cyan">
                    {evidence.request?.method || evidence.method || "GET"}{" "}
                    {evidence.request?.url || evidence.url} HTTP/1.1
                  </div>
                  <div className="text-slate-400">
                    Host:{" "}
                    {(() => {
                      try {
                        return new URL(
                          evidence.url.startsWith("http")
                            ? evidence.url
                            : `http://${evidence.url}`,
                        ).host;
                      } catch {
                        return evidence.url;
                      }
                    })()}
                  </div>
                  <div className="text-slate-400">
                    User-Agent: Sentrix-Security-Scanner/2.0
                  </div>
                  <div className="text-slate-400">Accept: */*</div>
                  {evidence.request?.body && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-white">
                      {typeof evidence.request.body === "object"
                        ? JSON.stringify(evidence.request.body, null, 2)
                        : evidence.request.body}
                    </div>
                  )}
                </div>
              </div>

              {/* Response */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <span>Server Response</span>
                  <span
                    className={`font-mono font-bold ${
                      evidence.response?.statusCode === 200
                        ? "text-green-400"
                        : "text-amber-400"
                    }`}
                  >
                    HTTP/1.1{" "}
                    {evidence.response?.statusCode || evidence.statusCode}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                  <div className="text-emerald-400">
                    HTTP/1.1{" "}
                    {evidence.response?.statusCode || evidence.statusCode} OK
                  </div>
                  {Object.entries(
                    evidence.response?.headers || evidence.headers || {},
                  )
                    .slice(0, 10)
                    .map(([k, v]) => (
                      <div key={k} className="text-slate-400">
                        <span className="text-sky-300">{k}:</span> {v}
                      </div>
                    ))}
                  <div className="my-2 border-b border-white/10"></div>
                  <div className="text-white whitespace-pre-wrap">
                    {evidence.response?.bodySnippet ||
                      evidence.bodyExcerpt ||
                      "[REDACTED]"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "headers" && (
            <div className="space-y-3">
              <div className="text-xs text-text-muted">
                Complete response headers captured during the automated security
                exchange:
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5 font-mono text-xs">
                {Object.entries(evidence.headers || {}).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 bg-white/[0.01] hover:bg-white/[0.03]"
                  >
                    <span className="w-64 font-semibold text-brand-cyan shrink-0">
                      {key}
                    </span>
                    <span className="text-slate-300 break-all">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "observation" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20">
                <h4 className="text-xs font-bold text-brand-cyan uppercase tracking-wider mb-1">
                  Scanner Summary & Finding Context
                </h4>
                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                  {evidence.observation?.description || evidence.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">
                    Expected Behavior
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    {evidence.observation?.expected ||
                      "Security header or parameter validation present"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                    Actual Observation
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    {evidence.observation?.actual ||
                      "Target response omitted required defense"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                <div className="font-semibold text-white">
                  Cryptographic Fingerprint & Metadata
                </div>
                <div className="font-mono text-text-muted break-all text-[11px]">
                  Fingerprint: {evidence.fingerprint}
                </div>
                {evidence.metadata && (
                  <div className="font-mono text-[11px] text-text-muted">
                    Metadata: {JSON.stringify(evidence.metadata)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/[0.02] text-xs">
          <span className="text-text-muted">
            Evidence Type:{" "}
            <span className="font-mono text-white capitalize">
              {evidence.type || "HTTP Exchange"}
            </span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
