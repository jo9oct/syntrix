import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { CompanySecurityRule, CompanySecurityRuleDefinition } from '../../../types/sentrix';
import { SeverityBadge } from '../../../components/ui/Badge';
import api from '../../../lib/api';
import {
  ShieldAlert, Plus, Shield, Trash2, Edit3, CheckCircle2,
  AlertTriangle, Filter, Search, X, Check, Sliders
} from 'lucide-react';

export const CompanyRules: React.FC = () => {
  const [rules, setRules] = useState<CompanySecurityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CompanySecurityRule | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('security-headers');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [headerName, setHeaderName] = useState('strict-transport-security');
  const [operator, setOperator] = useState<CompanySecurityRuleDefinition['operator']>('exists');
  const [value, setValue] = useState('true');
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await api.get('/company-rules');
      if (res.data?.data?.rules) {
        setRules(res.data.data.rules);
      }
    } catch (err) {
      console.error('Failed to fetch company rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openCreateModal = () => {
    setEditingRule(null);
    setName('');
    setCategory('security-headers');
    setDescription('');
    setSeverity('high');
    setHeaderName('strict-transport-security');
    setOperator('exists');
    setValue('true');
    setEnabled(true);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: CompanySecurityRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setCategory(rule.category);
    setDescription(rule.description);
    setSeverity(rule.severity as any);
    setHeaderName(rule.rule?.header || '');
    setOperator(rule.rule?.operator || 'exists');
    setValue(String(rule.rule?.value ?? 'true'));
    setEnabled(rule.enabled);
    setIsModalOpen(true);
  };

  const handleToggleEnable = async (rule: CompanySecurityRule) => {
    try {
      await api.patch(`/company-rules/${rule._id}`, {
        enabled: !rule.enabled
      });
      await fetchRules();
    } catch (err) {
      console.error('Failed to toggle rule', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const payload = {
      name,
      category,
      description,
      severity,
      rule: {
        type: 'header' as const,
        header: headerName.trim().toLowerCase(),
        operator,
        value: value === 'true' ? true : value === 'false' ? false : value
      },
      enabled
    };

    try {
      if (editingRule) {
        // API 15: Update Company Security Rule
        await api.patch(`/company-rules/${editingRule._id}`, payload);
      } else {
        // API 12: Create Company Security Rule
        await api.post('/company-rules', payload);
      }
      setIsModalOpen(false);
      await fetchRules();
    } catch (err) {
      console.error('Failed to save company rule', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, ruleName: string) => {
    if (!window.confirm(`Are you sure you want to delete policy rule "${ruleName}"?`)) return;
    try {
      // API 16: Delete Company Security Rule
      await api.delete(`/company-rules/${id}`);
      await fetchRules();
    } catch (err) {
      console.error('Failed to delete rule', err);
    }
  };

  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider mb-1">
            <Sliders size={14} /> Compliance & Policy Rules Engine
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Company Security Rules
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Custom corporate security policies enforced during automated scans (APIs 12-16).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20 self-start sm:self-auto"
        >
          <Plus size={16} /> Define Security Rule
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            placeholder="Search rules by name, description, category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>
        <div className="text-xs text-text-muted">
          Active Policies: <span className="font-semibold text-white">{rules.filter(r => r.enabled).length}</span> / {rules.length}
        </div>
      </div>

      {/* Rules Table / Cards */}
      {loading ? (
        <div className="text-center py-16 text-text-muted text-xs">Loading company rules...</div>
      ) : filteredRules.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-white/10">
          <ShieldAlert size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-white">No company security rules defined</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Set up mandatory security policies (e.g. strict HSTS headers or disallowed CORS origins) to audit every scan against corporate standards.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold hover:bg-brand-cyan/30 transition-colors"
          >
            Create Rule
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredRules.map(rule => (
            <GlassCard
              key={rule._id}
              className={`p-5 border-white/10 hover:border-brand-cyan/30 transition-all ${
                !rule.enabled ? 'opacity-60 bg-white/[0.01]' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-white tracking-tight">{rule.name}</span>
                    <SeverityBadge severity={rule.severity} />
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-brand-cyan">
                      {rule.category}
                    </span>
                    {!rule.enabled && (
                      <span className="px-2 py-0.5 rounded bg-white/5 text-text-muted text-[10px] font-semibold">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {rule.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted pt-1">
                    <span>
                      Condition: <strong className="text-sky-300">{rule.rule.header || 'header'}</strong> {rule.rule.operator} <span className="text-amber-300">{String(rule.rule.value)}</span>
                    </span>
                    <span>•</span>
                    <span>ID: {rule._id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => handleToggleEnable(rule)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500/20'
                        : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {rule.enabled ? 'Active Policy' : 'Inactive'}
                  </button>

                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 border border-white/5 transition-colors"
                    title="Edit Rule"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(rule._id, rule.name)}
                    className="p-2 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0f172a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                {editingRule ? 'Edit Company Security Rule' : 'Define Company Security Rule'}
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
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strict-Transport-Security Required"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan"
                  >
                    <option value="security-headers">Security Headers</option>
                    <option value="cors">CORS Security</option>
                    <option value="ssl">SSL / TLS</option>
                    <option value="authentication">Authentication</option>
                    <option value="apiSecurity">API Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Violation Severity
                  </label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan capitalize"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Policy Description & Remediation Expectation
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="State the requirement and reason for enforcement..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan resize-none"
                />
              </div>

              {/* Rule condition */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="text-xs font-semibold text-brand-cyan uppercase tracking-wider">
                  Evaluation Logic
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase font-semibold mb-1">Target Header</label>
                    <input
                      type="text"
                      placeholder="strict-transport-security"
                      value={headerName}
                      onChange={e => setHeaderName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted uppercase font-semibold mb-1">Operator</label>
                    <select
                      value={operator}
                      onChange={e => setOperator(e.target.value as any)}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    >
                      <option value="exists">exists</option>
                      <option value="equals">equals</option>
                      <option value="not-equals">not-equals</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted uppercase font-semibold mb-1">Expected Value</label>
                    <input
                      type="text"
                      placeholder="true"
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/5 border-white/20 text-brand-cyan focus:ring-0"
                />
                <label htmlFor="enabledCheck" className="text-xs text-slate-300 cursor-pointer">
                  Enable policy immediately for all active scans
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
                  {submitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
