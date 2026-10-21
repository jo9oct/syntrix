import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { Scope } from '../../../types/sentrix';
import api from '../../../lib/api';
import {
  Globe, Plus, Shield, Trash2, Edit3, CheckCircle2,
  AlertTriangle, Server, Network, Search, X
} from 'lucide-react';

export const Scopes: React.FC = () => {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<Scope | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [hostnamesInput, setHostnamesInput] = useState('');
  const [portsInput, setPortsInput] = useState('443, 80');
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchScopes = async () => {
    try {
      const res = await api.get('/scopes');
      if (res.data?.data?.scopes) {
        setScopes(res.data.data.scopes);
      }
    } catch (err) {
      console.error('Failed to fetch scopes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScopes();
  }, []);

  const openCreateModal = () => {
    setEditingScope(null);
    setName('');
    setHostnamesInput('');
    setPortsInput('443, 80');
    setIncludeSubdomains(true);
    setIsModalOpen(true);
  };

  const openEditModal = (scope: Scope) => {
    setEditingScope(scope);
    setName(scope.name);
    setHostnamesInput(scope.hostnames.join(', '));
    setPortsInput(scope.ports.join(', '));
    setIncludeSubdomains(scope.includeSubdomains);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hostnamesInput.trim()) return;

    setSubmitting(true);
    const hostnames = hostnamesInput
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);
    const ports = portsInput
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(p => !isNaN(p));

    try {
      if (editingScope) {
        // API 31: Update Security Scope
        await api.patch(`/scopes/${editingScope._id}`, {
          name,
          hostnames,
          ports,
          includeSubdomains
        });
      } else {
        // API 28: Create Security Scope
        await api.post('/scopes', {
          name,
          hostnames,
          ports,
          includeSubdomains
        });
      }
      setIsModalOpen(false);
      await fetchScopes();
    } catch (err) {
      console.error('Failed to save scope', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, scopeName: string) => {
    if (!window.confirm(`Are you sure you want to delete scope "${scopeName}"?`)) return;
    try {
      // API 32: Delete Security Scope
      await api.delete(`/scopes/${id}`);
      await fetchScopes();
    } catch (err) {
      console.error('Failed to delete scope', err);
    }
  };

  const filteredScopes = scopes.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.hostnames.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <Network size={14} /> Boundary & Surface Authorization
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Security Scopes
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Explicitly authorized domain boundaries, ports, and subdomain rules for assessment compliance (APIs 28-32).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20 self-start sm:self-auto"
        >
          <Plus size={16} /> Define New Scope
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            placeholder="Search scopes by name or hostname..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>
        <div className="text-xs text-text-muted">
          Total Defined: <span className="font-semibold text-white">{scopes.length}</span>
        </div>
      </div>

      {/* Scopes Grid */}
      {loading ? (
        <div className="text-center py-16 text-text-muted text-xs">Loading authorized scopes...</div>
      ) : filteredScopes.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-white/10">
          <Globe size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-white">No security scopes found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Create an authorization scope to confine scanners to explicitly permitted hosts and ports.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold hover:bg-brand-cyan/30 transition-colors"
          >
            Create Scope
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScopes.map(scope => (
            <GlassCard key={scope._id} className="p-6 border-white/10 flex flex-col justify-between hover:border-brand-cyan/30 transition-all">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 flex items-center justify-center font-bold">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{scope.name}</h3>
                      <span className="text-[10px] font-mono text-text-muted">{scope._id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(scope)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Scope"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(scope._id, scope.name)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Scope"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Hostnames */}
                <div>
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Authorized Hostnames
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scope.hostnames.map(host => (
                      <span
                        key={host}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] text-brand-cyan"
                      >
                        {host}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ports & Subdomains */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-semibold">Ports</span>
                    <span className="font-mono text-white font-medium">
                      {scope.ports.join(', ') || '443, 80'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px] uppercase font-semibold">Subdomains</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      scope.includeSubdomains ? 'text-green-400' : 'text-text-muted'
                    }`}>
                      <CheckCircle2 size={12} />
                      {scope.includeSubdomains ? 'Wildcard Allowed' : 'Strict Host Only'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-text-muted">
                <span>Updated: {new Date(scope.updatedAt).toLocaleDateString()}</span>
                <span className="text-brand-cyan font-mono text-[10px]">Verified Scope</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0f172a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                {editingScope ? 'Edit Security Scope' : 'Create Security Scope'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Scope Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Website-3, Production API Cluster"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Authorized Hostnames (Comma separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="review-x-u6mr6.vercel.app, api.sentrix.io"
                  value={hostnamesInput}
                  onChange={e => setHostnamesInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan font-mono"
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Scanners will verify host authorization before sending requests.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Allowed Ports (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="443, 80"
                  value={portsInput}
                  onChange={e => setPortsInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="includeSubdomainsCheck"
                  checked={includeSubdomains}
                  onChange={e => setIncludeSubdomains(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/5 border-white/20 text-brand-cyan focus:ring-0"
                />
                <label htmlFor="includeSubdomainsCheck" className="text-xs text-slate-300 cursor-pointer">
                  Include Subdomains (Permit recon and discovery across *.domain)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-text-muted font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 rounded-xl font-semibold shadow-md shadow-brand-cyan/20"
                >
                  {submitting ? 'Saving...' : editingScope ? 'Update Scope' : 'Create Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
