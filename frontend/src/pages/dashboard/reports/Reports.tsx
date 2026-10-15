import React, { useState } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { StatusBadge } from '../../../components/ui/Badge';
import {
  FileText, Download, Plus, Eye, CheckCircle2,
  ShieldCheck, AlertTriangle, Printer, X, ArrowRight
} from 'lucide-react';

interface ReportItem {
  id: string;
  title: string;
  project: string;
  type: 'Executive' | 'Technical Pentest' | 'Malware Analysis' | 'Retest Verification';
  date: string;
  status: 'completed' | 'in_progress';
  summary: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'REP-001',
    title: 'Executive Security Posture — Q3 Audit',
    project: 'Main Web Portal Security Audit',
    type: 'Executive',
    date: 'Sep 28, 2026',
    status: 'completed',
    summary: 'High-level executive evaluation of external surface resilience for Acme Corp. Highlights 1 critical vulnerability requiring immediate remediation and 4 verified mitigations.',
    criticalCount: 1,
    highCount: 1,
    mediumCount: 2,
    lowCount: 1
  },
  {
    id: 'REP-002',
    title: 'Technical Pentest Findings & Proofs of Concept',
    project: 'Main Web Portal Security Audit',
    type: 'Technical Pentest',
    date: 'Sep 27, 2026',
    status: 'completed',
    summary: 'Comprehensive engineering document containing raw HTTP request/response proofs of concept, CVSS v3.1 vector calculations, and developer source-level remediation guidance.',
    criticalCount: 1,
    highCount: 2,
    mediumCount: 1,
    lowCount: 0
  },
  {
    id: 'REP-003',
    title: 'Malware Triage & Static Artifact Report: invoice_2026.pdf.exe',
    project: 'Suspicious Document Analysis',
    type: 'Malware Analysis',
    date: 'Sep 26, 2026',
    status: 'completed',
    summary: 'Binary reverse engineering breakdown, PE section analysis, and extracted IOCs for Trojan.Downloader variant.',
    criticalCount: 1,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0
  }
];

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // New report form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ReportItem['type']>('Technical Pentest');
  const [newProject, setNewProject] = useState('Main Web Portal Security Audit');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const created: ReportItem = {
      id: 'REP-00' + (reports.length + 1),
      title: newTitle,
      project: newProject,
      type: newType,
      date: 'Just now',
      status: 'completed',
      summary: `Automated assessment summary report generated for ${newProject}.`,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 2,
      lowCount: 1
    };

    setReports([created, ...reports]);
    setShowGenerateModal(false);
    setSelectedReport(created);
    setNewTitle('');
  };

  const handleDownload = (report: ReportItem) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #070B16; color: #F8FAFC; padding: 40px; margin: 0; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    h1 { color: #06b6d4; margin-top: 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #ef4444; color: white; }
    .metric { display: inline-block; margin-right: 24px; }
    .metric strong { display: block; font-size: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${report.title}</h1>
    <p><strong>Project:</strong> ${report.project} | <strong>Type:</strong> ${report.type} | <strong>Date:</strong> ${report.date}</p>
    <p>${report.summary}</p>
    <div style="margin-top: 20px;">
      <div class="metric"><strong style="color: #ef4444;">${report.criticalCount}</strong> Critical</div>
      <div class="metric"><strong style="color: #f97316;">${report.highCount}</strong> High</div>
      <div class="metric"><strong style="color: #eab308;">${report.mediumCount}</strong> Medium</div>
      <div class="metric"><strong style="color: #3b82f6;">${report.lowCount}</strong> Low</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Reports & Deliverables</h1>
          <p className="text-sm text-text-muted">
            Executive summaries, verified technical audit documents, and certification PDF reports.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
        >
          <Plus size={16} /> Generate New Report
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => (
          <GlassCard key={r.id} className="flex flex-col border-white/10 hover:border-brand-cyan/30 transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-brand-cyan">
                <FileText size={20} />
              </div>
              <StatusBadge status={r.status} />
            </div>

            <div className="text-[11px] font-mono text-brand-purple font-semibold uppercase mb-1">
              {r.type}
            </div>
            <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{r.title}</h3>
            <div className="text-xs text-brand-cyan mb-3">{r.project}</div>
            <p className="text-xs text-text-muted line-clamp-2 mb-4 leading-relaxed flex-1">
              {r.summary}
            </p>

            <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs mb-4">
              <div>
                <span className="font-bold text-red-400">{r.criticalCount}</span>
                <span className="block text-[9px] text-text-muted uppercase">Crit</span>
              </div>
              <div>
                <span className="font-bold text-orange-400">{r.highCount}</span>
                <span className="block text-[9px] text-text-muted uppercase">High</span>
              </div>
              <div>
                <span className="font-bold text-yellow-400">{r.mediumCount}</span>
                <span className="block text-[9px] text-text-muted uppercase">Med</span>
              </div>
              <div>
                <span className="font-bold text-blue-400">{r.lowCount}</span>
                <span className="block text-[9px] text-text-muted uppercase">Low</span>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-text-muted">{r.date}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedReport(r)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  onClick={() => handleDownload(r)}
                  className="p-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan hover:bg-brand-cyan/25 transition-colors"
                  title="Download File"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-3xl p-8 border-brand-cyan/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-6 right-6 text-text-muted hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Document Header */}
            <div className="border-b border-white/10 pb-5 mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-2">
                <ShieldCheck size={16} /> Certified Security Deliverable • {selectedReport.id}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedReport.title}</h2>
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span>Scope: <strong className="text-white">{selectedReport.project}</strong></span>
                <span>•</span>
                <span>Type: <strong className="text-white">{selectedReport.type}</strong></span>
                <span>•</span>
                <span>Issued: <strong className="text-white">{selectedReport.date}</strong></span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-6 text-xs">
              <div>
                <h4 className="text-xs font-semibold uppercase text-text-muted tracking-wider mb-2">Executive Summary</h4>
                <p className="text-white text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  {selectedReport.summary}
                </p>
              </div>

              {/* Risk Distribution */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-text-muted tracking-wider mb-2">Discovered Risk Metrics</h4>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-red-400">{selectedReport.criticalCount}</div>
                    <div className="text-[10px] uppercase text-text-muted">Critical Risk</div>
                  </div>
                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-orange-400">{selectedReport.highCount}</div>
                    <div className="text-[10px] uppercase text-text-muted">High Risk</div>
                  </div>
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-400">{selectedReport.mediumCount}</div>
                    <div className="text-[10px] uppercase text-text-muted">Medium Risk</div>
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-blue-400">{selectedReport.lowCount}</div>
                    <div className="text-[10px] uppercase text-text-muted">Low Risk</div>
                  </div>
                </div>
              </div>

              {/* Security Statement */}
              <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl text-xs text-brand-cyan">
                ✓ This deliverable was generated using the Sentrix automated testing and verification engine. All findings have been assigned verification hashes.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs text-text-muted hover:text-white"
              >
                Close Preview
              </button>

              <button
                onClick={() => handleDownload(selectedReport)}
                className="btn-primary text-xs px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2"
              >
                <Download size={14} /> Download HTML / PDF Report
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-md p-6 border-brand-cyan/30 shadow-2xl relative">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-brand-cyan" />
              <h3 className="text-lg font-bold text-white">Generate Deliverable Report</h3>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Report Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Executive Assessment"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Target Project</label>
                <select
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                >
                  <option>Main Web Portal Security Audit</option>
                  <option>Mobile API Q3 Review</option>
                  <option>Payment Gateway Integration</option>
                  <option>Suspicious Document Analysis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Report Format</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                >
                  <option value="Executive">Executive Summary (Board Level)</option>
                  <option value="Technical Pentest">Technical Pentest (Developer/Engineer)</option>
                  <option value="Malware Analysis">Malware Static & Dynamic Triage</option>
                  <option value="Retest Verification">Retest & Verification Certificate</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-xs text-text-muted">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-4 py-2 rounded-xl">Generate & Preview</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
