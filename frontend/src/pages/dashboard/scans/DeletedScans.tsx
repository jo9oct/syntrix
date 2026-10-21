import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Scan } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  Trash2, RotateCcw, AlertTriangle, ShieldCheck,
  CheckCircle2, Clock, ArrowRight, ShieldAlert, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DeletedScans: React.FC = () => {
  const navigate = useNavigate();
  const [deletedScans, setDeletedScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const fetchDeleted = async () => {
    try {
      // API 26: Get Deleted Scans
      const res = await api.get('/scans/deleted');
      if (res.data?.data?.scans) {
        setDeletedScans(res.data.data.scans);
      }
    } catch (err) {
      console.error('Failed to fetch deleted scans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const handleRecover = async (scanId: string) => {
    setRecoveringId(scanId);
    try {
      // API 27: Recover a Deleted Scan
      await api.patch(`/scans/${scanId}/recover`);
      await fetchDeleted();
    } catch (err) {
      console.error('Failed to recover scan', err);
    } finally {
      setRecoveringId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Trash2 size={14} /> Soft-Delete Lifecycle & Retention
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Deleted Scans Archive
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Review soft-deleted assessment runs and restore them back to active history (APIs 25-27).
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/projects')}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-colors self-start sm:self-auto"
        >
          View Active Targets
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-text-muted text-xs">Loading deleted archive...</div>
      ) : deletedScans.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-white/10">
          <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-white">Trash bin is clean</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            No deleted scans currently in retention. Any soft-deleted security scans will appear here for recovery.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {deletedScans.map(scan => {
            const deleteRecord = scan.statusHistory?.find(h => h.to === 'deleted');
            return (
              <GlassCard key={scan._id} className="p-6 border-white/10 hover:border-amber-500/30 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-white">{scan._id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25 text-[10px] font-semibold uppercase">
                        Deleted
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-brand-cyan text-[10px] font-mono">
                        v{scan.version}
                      </span>
                      <span className="text-text-muted text-xs">
                        Previous status: <strong className="text-white capitalize">{scan.previousStatus || 'completed'}</strong>
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-mono">
                      Target URL: <span className="text-sky-300">{scan.targetUrl}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Deleted At: {scan.deletedAt ? new Date(scan.deletedAt).toLocaleString() : 'Recently'}
                      </span>
                      {deleteRecord && (
                        <span>
                          Reason: <strong className="text-amber-300">{deleteRecord.reason}</strong>
                        </span>
                      )}
                      <span>
                        Findings preserved: <strong className="text-white">{scan.findingCounts.critical + scan.findingCounts.high + scan.findingCounts.medium + scan.findingCounts.low}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => handleRecover(scan._id)}
                      disabled={recoveringId === scan._id}
                      className="px-4 py-2 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-brand-cyan/10"
                    >
                      <RotateCcw size={14} className={recoveringId === scan._id ? 'animate-spin' : ''} />
                      {recoveringId === scan._id ? 'Restoring...' : 'Recover Scan'}
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
