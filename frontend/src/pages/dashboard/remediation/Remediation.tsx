import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { SeverityBadge, StatusBadge } from '../../../components/ui/Badge';
import {
  ArrowRightLeft, RotateCcw, CheckCircle2, GitCommit,
  User, ArrowRight, ShieldCheck, Bug, ExternalLink, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';

interface KanbanItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  column: 'open' | 'in_progress' | 'ready_for_retest' | 'fixed';
  assignee: string;
  endpoint: string;
  commitRef?: string;
  notes?: string;
}

const INITIAL_KANBAN: KanbanItem[] = [
  {
    id: 'F-101',
    title: 'SQL Injection in Login Form',
    severity: 'critical',
    column: 'open',
    assignee: 'Alex Rivera',
    endpoint: 'POST /api/v1/auth/login',
    notes: 'Prioritized P0 for immediate hotfix.'
  },
  {
    id: 'F-102',
    title: 'IDOR in User Profile Endpoint',
    severity: 'high',
    column: 'in_progress',
    assignee: 'Alex Rivera',
    endpoint: 'GET /api/v1/users/:id/billing',
    commitRef: 'git commit 4a8f9c2: Add req.user context checks',
    notes: 'Refactoring ownership validation middleware.'
  },
  {
    id: 'F-103',
    title: 'Reflected Cross-Site Scripting (XSS)',
    severity: 'medium',
    column: 'ready_for_retest',
    assignee: 'Dev Team',
    endpoint: 'GET /catalog/search?q=',
    commitRef: 'PR #142: DOMPurify & HTML encoding applied',
    notes: 'Fix merged to staging. Awaiting security retest verification.'
  },
  {
    id: 'F-104',
    title: 'Missing Security Headers (CSP & HSTS)',
    severity: 'low',
    column: 'fixed',
    assignee: 'Devops Lead',
    endpoint: 'Global Response Headers',
    commitRef: 'nginx.conf: add_header Content-Security-Policy',
    notes: 'Verified passed by automated retest.'
  }
];

export const Remediation: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<KanbanItem[]>(INITIAL_KANBAN);
  const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);
  const [commitInput, setCommitInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Load real findings from MongoDB
  useEffect(() => {
    const fetchFindings = async () => {
      try {
        const { data } = await api.get('/findings');
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: KanbanItem[] = data.data.map((f: any) => ({
            id: f._id || f.id,
            title: f.title,
            severity: (f.severity === 'informational' ? 'low' : f.severity) as KanbanItem['severity'],
            column: (['open', 'in_progress', 'ready_for_retest', 'fixed'].includes(f.status) ? f.status : 'open') as KanbanItem['column'],
            assignee: f.assignedDeveloper?.name || 'Alex Rivera',
            endpoint: f.affectedEndpoint || f.affectedAsset || 'Target Endpoint',
            commitRef: f.commitRef || undefined,
            notes: f.remediationNotes || f.recommendation || undefined
          }));
          setItems(mapped);
        }
      } catch (err) {
        // Fallback to initial
      }
    };
    fetchFindings();
  }, []);

  const moveItem = async (itemId: string, newCol: KanbanItem['column']) => {
    setItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, column: newCol } : i))
    );
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem(prev => (prev ? { ...prev, column: newCol } : null));
    }

    const columnToBackendStatus: Record<KanbanItem['column'], string> = {
      open: 'detected',
      in_progress: 'verified',
      ready_for_retest: 'accepted',
      fixed: 'resolved'
    };

    try {
      // API 6: PATCH /api/v1/findings/:findingId
      await api.patch(`/findings/${itemId}`, { status: columnToBackendStatus[newCol] || 'detected' });
    } catch (err) {}
  };

  const handleSaveDevNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updatedCommit = commitInput || selectedItem.commitRef;
    const updatedNotes = notesInput || selectedItem.notes;

    setItems(prev =>
      prev.map(i =>
        i.id === selectedItem.id
          ? { ...i, commitRef: updatedCommit, notes: updatedNotes }
          : i
      )
    );

    try {
      // API 6: PATCH /api/v1/findings/:findingId
      await api.patch(`/findings/${selectedItem.id}`, {
        remediation: updatedNotes
      });
    } catch (err) {}

    setSelectedItem(null);
  };


  const columns: { id: KanbanItem['column']; title: string; count: number; color: string }[] = [
    { id: 'open', title: 'Backlog / Open', count: items.filter(i => i.column === 'open').length, color: 'text-red-400' },
    { id: 'in_progress', title: 'In Progress', count: items.filter(i => i.column === 'in_progress').length, color: 'text-yellow-400' },
    { id: 'ready_for_retest', title: 'Ready for Retest', count: items.filter(i => i.column === 'ready_for_retest').length, color: 'text-brand-cyan' },
    { id: 'fixed', title: 'Resolved / Fixed', count: items.filter(i => i.column === 'fixed').length, color: 'text-green-400' },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Developer Remediation Kanban</h1>
          <p className="text-sm text-text-muted">
            Track vulnerability fixes, link git commits & pull requests, and push verified code into retesting.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/retest')}
          className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-cyan/20"
        >
          <RotateCcw size={14} /> Open Retesting Queue
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {columns.map((col) => {
          const colItems = items.filter(i => i.column === col.id);
          return (
            <div key={col.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.title}
                </span>
                <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center">
                  {col.count}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 min-h-[300px]">
                {colItems.map((item) => (
                  <GlassCard
                    key={item.id}
                    className="p-4 border-white/10 hover:border-brand-cyan/40 transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedItem(item);
                      setCommitInput(item.commitRef || '');
                      setNotesInput(item.notes || '');
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-text-muted font-bold text-xs">{item.id}</span>
                      <SeverityBadge severity={item.severity} />
                    </div>

                    <h4 className="text-sm font-semibold text-white group-hover:text-brand-cyan transition-colors mb-1.5">
                      {item.title}
                    </h4>
                    <div className="text-[11px] text-text-muted font-mono truncate mb-3">{item.endpoint}</div>

                    {item.commitRef && (
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] text-green-300 font-mono truncate mb-3 flex items-center gap-1.5">
                        <GitCommit size={12} className="shrink-0" />
                        <span className="truncate">{item.commitRef}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1 text-white">
                        <User size={12} className="text-brand-purple" /> {item.assignee}
                      </span>

                      {/* Quick Move Action */}
                      <select
                        value={item.column}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => moveItem(item.id, e.target.value as any)}
                        className="bg-white/10 text-[10px] text-brand-cyan font-semibold rounded-lg px-2 py-1 outline-none border border-white/10"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="ready_for_retest">Ready for Retest</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </div>
                  </GlassCard>
                ))}

                {colItems.length === 0 && (
                  <div className="p-8 text-center text-xs text-text-muted/60 border border-dashed border-white/10 rounded-2xl">
                    No findings in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Remediation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg p-6 border-brand-cyan/30 shadow-2xl relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-text-muted">{selectedItem.id}</span>
              <SeverityBadge severity={selectedItem.severity} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{selectedItem.title}</h3>
            <div className="text-xs text-brand-cyan font-mono mb-4">{selectedItem.endpoint}</div>

            <form onSubmit={handleSaveDevNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Workflow Column
                </label>
                <select
                  value={selectedItem.column}
                  onChange={(e) => moveItem(selectedItem.id, e.target.value as any)}
                  className="w-full bg-background-darker border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-brand-cyan"
                >
                  <option value="open">Backlog / Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready_for_retest">Ready for Retest</option>
                  <option value="fixed">Resolved / Fixed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Git Commit / Pull Request Link
                </label>
                <input
                  type="text"
                  value={commitInput}
                  onChange={(e) => setCommitInput(e.target.value)}
                  placeholder="e.g. git commit 4b29ef: sanitize user input"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white font-mono outline-none focus:border-brand-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Developer Remediation Notes
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Explain applied patch and tests..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                {selectedItem.column === 'ready_for_retest' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null);
                      navigate('/dashboard/retest');
                    }}
                    className="text-xs text-brand-cyan hover:underline font-semibold flex items-center gap-1"
                  >
                    Go to Retest Queue <ArrowRight size={12} />
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedItem(null)} className="px-4 py-2 text-xs text-text-muted">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold">Save Changes</button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
