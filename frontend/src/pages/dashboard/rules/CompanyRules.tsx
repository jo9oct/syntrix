import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { CompanySecurityRule, CompanySecurityRuleDefinition } from '../../../types/sentrix';
import { SeverityBadge } from '../../../components/ui/Badge';
import api from '../../../lib/api';
import { useUserTier } from '../../../store/authStore';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, Plus, Shield, Trash2, Edit3, CheckCircle2,
  AlertTriangle, Search, X, Check, Sliders, Eye, Lock,
  ArrowRight, RefreshCw, Info, Sparkles
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'security-headers', label: 'Security Headers' },
  { value: 'cors', label: 'CORS Security' },
  { value: 'transport', label: 'Transport & SSL/TLS' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'authorization', label: 'Authorization' },
  { value: 'csrf', label: 'CSRF Protection' },
  { value: 'session', label: 'Session Management' },
  { value: 'api-security', label: 'API Security' },
  { value: 'general', label: 'General Security' },
];

export const CompanyRules: React.FC = () => {
  const { tier, isEnterprise } = useUserTier();
  const [rules, setRules] = useState<CompanySecurityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isEnterpriseLocked, setIsEnterpriseLocked] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<CompanySecurityRule | null>(null);

  // Inspector / Detail Modal State (API 3: GET /company-rules/:id)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRule, setDetailRule] = useState<CompanySecurityRule | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('security-headers');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | 'info'>('high');
  const [headerName, setHeaderName] = useState('');
  const [operator, setOperator] = useState<CompanySecurityRuleDefinition['operator']>('exists');
  const [value, setValue] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch all company rules (API 2: GET /company-rules)
  const fetchRules = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await api.get('/company-rules');
      if (res.data?.data?.rules) {
        setRules(res.data.data.rules);
        setIsEnterpriseLocked(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch company rules', err);
      if (err.response?.status === 403 && err.response?.data?.code === 'FEATURE_NOT_AVAILABLE') {
        setIsEnterpriseLocked(true);
        setErrorBanner(err.response?.data?.message || 'Company security rules are available only on the Enterprise plan.');
      } else {
        setErrorBanner(err.response?.data?.message || 'Failed to load company security rules.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // 2. Open Create Modal
  const openCreateModal = () => {
    setEditingRule(null);
    setFormError(null);
    setName('');
    setCategory('security-headers');
    setDescription('');
    setSeverity('high');
    setHeaderName('');
    setOperator('exists');
    setValue('');
    setEnabled(true);
    setIsModalOpen(true);
  };

  // 3. Inspect Single Rule (API 3: GET /company-rules/:id)
  const handleViewDetails = async (ruleId: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await api.get(`/company-rules/${ruleId}`);
      if (res.data?.data?.rule) {
        setDetailRule(res.data.data.rule);
      }
    } catch (err: any) {
      console.error('Failed to retrieve rule details', err);
      alert(err.response?.data?.message || 'Could not load company rule details.');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // 4. Open Edit Modal - First loads full info via API 3 (GET /company-rules/:id) then populates fields
  const openEditModal = async (ruleId: string) => {
    setModalLoading(true);
    setFormError(null);
    setIsModalOpen(true);

    try {
      // Fetch fresh rule details from backend before display
      const res = await api.get(`/company-rules/${ruleId}`);
      const rule: CompanySecurityRule = res.data?.data?.rule;

      if (!rule) {
        throw new Error('Rule record not found');
      }

      setEditingRule(rule);
      setName(rule.name || '');
      setCategory(rule.category || 'security-headers');
      setDescription(rule.description || '');
      setSeverity(rule.severity || 'high');
      setHeaderName(rule.rule?.header || '');
      setOperator(rule.rule?.operator || 'exists');
      setValue(rule.rule?.value !== undefined ? String(rule.rule.value) : 'true');
      setEnabled(rule.enabled ?? true);
    } catch (err: any) {
      console.error('Failed to load rule for editing', err);
      setFormError(err.response?.data?.message || 'Failed to fetch rule data for editing.');
    } finally {
      setModalLoading(false);
    }
  };

  // 5. Toggle Rule Enable Status (API 4: PATCH /company-rules/:id)
  const handleToggleEnable = async (rule: CompanySecurityRule) => {
    try {
      await api.patch(`/company-rules/${rule._id}`, {
        enabled: !rule.enabled
      });
      await fetchRules();
    } catch (err: any) {
      console.error('Failed to toggle rule state', err);
      alert(err.response?.data?.message || 'Failed to update rule status.');
    }
  };

  // 6. Submit Create or Update (API 1: POST /company-rules or API 4: PATCH /company-rules/:id)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Rule Name is required.');
      return;
    }
    if (!description.trim()) {
      setFormError('Rule Description is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Parse value appropriately
    let parsedValue: any = value;
    if (value.toLowerCase() === 'true') parsedValue = true;
    else if (value.toLowerCase() === 'false') parsedValue = false;
    else if (!isNaN(Number(value)) && value.trim() !== '') parsedValue = Number(value);

    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      severity,
      rule: {
        type: 'header' as const,
        header: headerName.trim().toLowerCase(),
        operator,
        value: parsedValue
      },
      enabled
    };

    try {
      if (editingRule) {
        // API 4: PATCH /company-rules/:id
        await api.patch(`/company-rules/${editingRule._id}`, payload);
      } else {
        // API 1: POST /company-rules
        await api.post('/company-rules', payload);
      }
      setIsModalOpen(false);
      await fetchRules();
    } catch (err: any) {
      console.error('Failed to save company rule', err);
      setFormError(err.response?.data?.message || 'Error occurred while saving company rule.');
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Delete Rule (API 5: DELETE /company-rules/:id)
  const handleDelete = async (id: string, ruleName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the rule "${ruleName}"?`)) return;

    try {
      await api.delete(`/company-rules/${id}`);
      await fetchRules();
      if (detailModalOpen && detailRule?._id === id) {
        setDetailModalOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to delete rule', err);
      alert(err.response?.data?.message || 'Failed to delete company rule.');
    }
  };

  const filteredRules = rules.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.rule?.header && r.rule.header.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

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
            Automated corporate security standards and HTTP policy enforcement across scans.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchRules}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh Rules"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={openCreateModal}
            className="btn-primary text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-cyan/20"
          >
            <Plus size={16} /> Define Security Rule
          </button>
        </div>
      </div>

      {/* Enterprise Tier Notice if not on Enterprise or 403 returned */}
      {(isEnterpriseLocked || (!isEnterprise && tier !== 'enterprise')) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-brand-cyan/10 border border-amber-500/30 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Lock size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Enterprise Plan Requirement</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                    Enterprise Feature
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Custom company compliance policies and security header audit rules are managed exclusively under the Enterprise tier. Current tier: <strong className="text-white capitalize">{tier}</strong>.
                </p>
              </div>
            </div>

            <Link
              to="/dashboard/billing"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all shrink-0"
            >
              <Sparkles size={14} /> Upgrade to Enterprise <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
            <input
              type="text"
              placeholder="Search policies by name, header, description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-text-muted focus:outline-none focus:border-brand-cyan transition-colors"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#1e293b] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Active Rules:</span>
          <span className="font-semibold text-white px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
            {rules.filter(r => r.enabled).length} / {rules.length}
          </span>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-20 text-text-muted text-xs flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-brand-cyan opacity-80" />
          <span>Loading company security rules from backend...</span>
        </div>
      ) : filteredRules.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-white/10">
          <ShieldAlert size={42} className="mx-auto text-text-muted mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-white">No company security rules found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            {searchTerm || categoryFilter !== 'all'
              ? 'No rules matched your search filters. Try resetting the query or category.'
              : 'Define mandatory corporate security rules (e.g. Strict-Transport-Security, Content-Security-Policy) to evaluate during all scanner assessments.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold hover:bg-brand-cyan/30 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Create Your First Rule
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredRules.map(rule => (
            <GlassCard
              key={rule._id}
              className={`p-5 border-white/10 hover:border-brand-cyan/30 transition-all ${
                !rule.enabled ? 'opacity-65 bg-white/[0.01]' : 'bg-white/[0.02]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-white tracking-tight">{rule.name}</span>
                    <SeverityBadge severity={rule.severity} />
                    <span className="px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/25 font-mono text-[10px] text-brand-cyan">
                      {rule.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        rule.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-white/5 text-text-muted border-white/10'
                      }`}
                    >
                      {rule.enabled ? 'Enforced' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {rule.description}
                  </p>

                  {/* Clean Evaluation Logic Pills without raw Mongo IDs */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-slate-300">
                      <span className="text-text-muted uppercase text-[9px] font-semibold tracking-wider">Target:</span>
                      <strong className="text-brand-cyan">{rule.rule?.header || 'header'}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-slate-300">
                      <span className="text-text-muted uppercase text-[9px] font-semibold tracking-wider">Evaluation:</span>
                      <span className="text-amber-300 font-semibold">{rule.rule?.operator || 'exists'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-slate-300">
                      <span className="text-text-muted uppercase text-[9px] font-semibold tracking-wider">Expected:</span>
                      <span className="text-emerald-300">{String(rule.rule?.value ?? 'true')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0">
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggleEnable(rule)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                        : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'
                    }`}
                    title="Toggle Enforce Status"
                  >
                    {rule.enabled ? 'Active Policy' : 'Inactive'}
                  </button>

                  {/* View Details (API 3) */}
                  <button
                    onClick={() => handleViewDetails(rule._id)}
                    className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 border border-white/5 transition-colors"
                    title="Inspect Rule Details"
                  >
                    <Eye size={16} />
                  </button>

                  {/* Edit Rule (API 4 - displays all info first) */}
                  <button
                    onClick={() => openEditModal(rule._id)}
                    className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 border border-white/5 transition-colors"
                    title="Edit Rule"
                  >
                    <Edit3 size={16} />
                  </button>

                  {/* Delete Rule (API 5) */}
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

      {/* DETAIL INSPECTOR MODAL (API 3: GET /company-rules/:id) */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0f172a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-brand-cyan" />
                <h3 className="text-base font-bold text-white">Company Security Policy Details</h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? (
                <div className="py-12 text-center text-text-muted text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-brand-cyan" />
                  <span>Loading policy details from backend...</span>
                </div>
              ) : detailRule ? (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-lg font-bold text-white">{detailRule.name}</h4>
                      <SeverityBadge severity={detailRule.severity} />
                      <span className="px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/25 font-mono text-[10px] text-brand-cyan">
                        {detailRule.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          detailRule.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-white/5 text-text-muted border-white/10'
                        }`}
                      >
                        {detailRule.enabled ? 'Active Policy' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {detailRule.description}
                    </p>
                  </div>

                  {/* Detailed Evaluation Configuration */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="text-xs font-semibold text-brand-cyan uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={13} /> Rule Evaluation Engine Configuration
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="block text-[10px] text-text-muted uppercase font-semibold">Target Header</span>
                        <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">
                          {detailRule.rule?.header || 'strict-transport-security'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="block text-[10px] text-text-muted uppercase font-semibold">Operator</span>
                        <span className="text-xs font-mono font-bold text-amber-300 mt-0.5 block">
                          {detailRule.rule?.operator || 'exists'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="block text-[10px] text-text-muted uppercase font-semibold">Expected Value</span>
                        <span className="text-xs font-mono font-bold text-emerald-300 mt-0.5 block truncate">
                          {String(detailRule.rule?.value ?? 'true')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-white/5">
                    <span>
                      Created: {detailRule.createdAt ? new Date(detailRule.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <span>
                      Last Updated: {detailRule.updatedAt ? new Date(detailRule.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      onClick={() => setDetailModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-text-muted font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        openEditModal(detailRule._id);
                      }}
                      className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Edit This Policy
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL (API 1: POST /company-rules & API 4: PATCH /company-rules/:id) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0f172a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-brand-cyan" />
                <h3 className="text-base font-bold text-white">
                  {editingRule ? 'Edit Company Security Rule' : 'Define Company Security Rule'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {modalLoading ? (
              <div className="p-12 text-center text-text-muted text-xs flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-brand-cyan" />
                <span>Loading existing rule configuration from backend...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Rule Name */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Require HSTS Header-1"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan transition-colors"
                  />
                </div>

                {/* Category & Severity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan"
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                      Severity
                    </label>
                    <select
                      value={severity}
                      onChange={e => setSeverity(e.target.value as any)}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan capitalize"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Description & Enforcement Justification
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Production applications must include the Strict-Transport-Security header."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-cyan resize-none transition-colors"
                  />
                </div>

                {/* Rule Evaluation Logic (User requested format: type, header, operator, value) */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-cyan uppercase tracking-wider">
                      Evaluation Logic Specification
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">type: header</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase font-semibold mb-1">
                        Header Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="strict-transport-security"
                        value={headerName}
                        onChange={e => setHeaderName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted uppercase font-semibold mb-1">
                        Operator
                      </label>
                      <select
                        value={operator}
                        onChange={e => setOperator(e.target.value as any)}
                        className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                      >
                        <option value="exists">exists</option>
                        <option value="equals">equals</option>
                        <option value="not-equals">not-equals</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted uppercase font-semibold mb-1">
                        Expected Value
                      </label>
                      <input
                        type="text"
                        placeholder="true"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-cyan"
                      />
                    </div>
                  </div>
                </div>

                {/* Enabled Checkbox */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="enabledRuleCheck"
                    checked={enabled}
                    onChange={e => setEnabled(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/5 border-white/20 text-brand-cyan focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="enabledRuleCheck" className="text-xs text-slate-300 cursor-pointer select-none">
                    Enable and enforce policy immediately for all future automated scans
                  </label>
                </div>

                {/* Action Buttons */}
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
                    className="btn-primary text-xs px-5 py-2 rounded-xl font-semibold shadow-md shadow-brand-cyan/20 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : editingRule ? (
                      'Update Policy'
                    ) : (
                      'Create Policy'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
