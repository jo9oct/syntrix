import {
  MOCK_AVAILABLE_SCANNERS,
  INITIAL_MOCK_SCOPES,
  INITIAL_MOCK_RULES,
  INITIAL_MOCK_TARGETS,
  INITIAL_MOCK_SCANS,
  INITIAL_MOCK_FINDINGS,
  INITIAL_MOCK_EVIDENCE,
  INITIAL_MOCK_CRAWL_DETAILS,
  INITIAL_MOCK_CRAWLED_PAGES,
  INITIAL_MOCK_REPORTS,
  MOCK_TARGET_TRENDS,
  MOCK_SCAN_COMPARISON
} from './mockData';
import type {
  ScannerItem,
  AvailableScannersResponse,
  Scope,
  CompanySecurityRule,
  Scan,
  Finding,
  Evidence,
  Report,
  CrawlDetails,
  CrawledPage,
  DiscoveredInput,
  Target,
  TargetSecurityTrends,
  ScanComparisonResult,
  FindingStatus,
  ReportFormat
} from '../types/sentrix';

const STORAGE_KEY_PREFIX = 'sentrix_mock_';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading from localStorage', e);
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('Error saving to localStorage', e);
  }
}

class MockService {
  private scopes: Scope[] = loadFromStorage('scopes', INITIAL_MOCK_SCOPES);
  private rules: CompanySecurityRule[] = loadFromStorage('rules', INITIAL_MOCK_RULES);
  private targets: Target[] = loadFromStorage('targets', INITIAL_MOCK_TARGETS);
  private scans: Scan[] = loadFromStorage('scans', INITIAL_MOCK_SCANS);
  private findings: Finding[] = loadFromStorage('findings', INITIAL_MOCK_FINDINGS);
  private evidence: Evidence[] = loadFromStorage('evidence', INITIAL_MOCK_EVIDENCE);
  private reports: Report[] = loadFromStorage('reports', INITIAL_MOCK_REPORTS);
  private crawledPages: CrawledPage[] = loadFromStorage('crawledPages', INITIAL_MOCK_CRAWLED_PAGES);

  // ==========================================
  // 1. SCANNERS (API 1)
  // ==========================================
  public getAvailableScanners(): AvailableScannersResponse {
    return MOCK_AVAILABLE_SCANNERS;
  }

  // ==========================================
  // 2. SCOPES (APIs 28, 29, 30, 31, 32)
  // ==========================================
  public getScopes(): Scope[] {
    return [...this.scopes];
  }

  public getScopeById(id: string): Scope | undefined {
    return this.scopes.find(s => s._id === id);
  }

  public createScope(data: { name: string; hostnames: string[]; ports?: number[]; includeSubdomains?: boolean }): Scope {
    const newScope: Scope = {
      _id: 'scope_' + Math.random().toString(36).substring(2, 9),
      ownerId: 'usr_owner_sentrix',
      name: data.name,
      hostnames: data.hostnames,
      ports: data.ports || [443, 80],
      includeSubdomains: !!data.includeSubdomains,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.scopes = [newScope, ...this.scopes];
    saveToStorage('scopes', this.scopes);
    return newScope;
  }

  public updateScope(id: string, data: Partial<Scope>): Scope | null {
    const idx = this.scopes.findIndex(s => s._id === id);
    if (idx === -1) return null;
    this.scopes[idx] = {
      ...this.scopes[idx],
      ...data,
      updatedAt: new Date().toISOString()
    };
    saveToStorage('scopes', this.scopes);
    return this.scopes[idx];
  }

  public deleteScope(id: string): boolean {
    const initialLen = this.scopes.length;
    this.scopes = this.scopes.filter(s => s._id !== id);
    saveToStorage('scopes', this.scopes);
    return this.scopes.length < initialLen;
  }

  // ==========================================
  // 3. COMPANY RULES (APIs 12, 13, 14, 15, 16)
  // ==========================================
  public getCompanyRules(): CompanySecurityRule[] {
    return [...this.rules];
  }

  public getCompanyRuleById(id: string): CompanySecurityRule | undefined {
    return this.rules.find(r => r._id === id);
  }

  public createCompanyRule(data: Partial<CompanySecurityRule>): CompanySecurityRule {
    const newRule: CompanySecurityRule = {
      _id: 'rule_' + Math.random().toString(36).substring(2, 9),
      ownerId: 'usr_owner_sentrix',
      name: data.name || 'New Custom Rule',
      normalizedName: (data.name || 'custom-rule').toLowerCase().replace(/\s+/g, '-'),
      category: data.category || 'security-headers',
      description: data.description || '',
      severity: data.severity || 'medium',
      rule: data.rule || {
        type: 'header',
        header: 'strict-transport-security',
        operator: 'exists',
        value: true
      },
      enabled: data.enabled !== undefined ? data.enabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.rules = [newRule, ...this.rules];
    saveToStorage('rules', this.rules);
    return newRule;
  }

  public updateCompanyRule(id: string, data: Partial<CompanySecurityRule>): CompanySecurityRule | null {
    const idx = this.rules.findIndex(r => r._id === id);
    if (idx === -1) return null;
    this.rules[idx] = {
      ...this.rules[idx],
      ...data,
      updatedAt: new Date().toISOString()
    };
    saveToStorage('rules', this.rules);
    return this.rules[idx];
  }

  public deleteCompanyRule(id: string): boolean {
    const initialLen = this.rules.length;
    this.rules = this.rules.filter(r => r._id !== id);
    saveToStorage('rules', this.rules);
    return this.rules.length < initialLen;
  }

  // ==========================================
  // 4. TARGETS & TRENDS (APIs 20, 21, 22, 23, 24)
  // ==========================================
  public getTargets(): Target[] {
    return [...this.targets];
  }

  public getTargetById(id: string): Target | undefined {
    return this.targets.find(t => t._id === id);
  }

  public getTargetDetails(id: string): { target: Target; latestScan: Scan | null } | null {
    const target = this.getTargetById(id);
    if (!target) return null;
    const targetScans = this.scans
      .filter(s => s.targetId === id && s.status !== 'deleted')
      .sort((a, b) => b.version - a.version);
    return {
      target,
      latestScan: targetScans[0] || null
    };
  }

  public getScanHistoryByTarget(targetId: string): Scan[] {
    return this.scans
      .filter(s => s.targetId === targetId)
      .sort((a, b) => b.version - a.version);
  }

  public getTargetSecurityTrends(targetId: string): TargetSecurityTrends {
    const targetScans = this.scans
      .filter(s => s.targetId === targetId && s.status === 'completed')
      .sort((a, b) => a.version - b.version);

    if (targetScans.length > 0) {
      return {
        targetId,
        scans: targetScans.map(s => ({
          scanId: s._id,
          version: s.version,
          completedAt: s.completedAt || s.createdAt,
          riskScore: s.riskScore || 21,
          comparableScannerCount: s.totalScanners,
          findingCounts: s.findingCounts,
          findingsIncluded: s.findingCounts.critical + s.findingCounts.high + s.findingCounts.medium + s.findingCounts.low + s.findingCounts.info
        })),
        limitations: MOCK_TARGET_TRENDS.limitations
      };
    }
    return MOCK_TARGET_TRENDS;
  }

  public getLatestScanComparison(targetId: string): ScanComparisonResult {
    return MOCK_SCAN_COMPARISON;
  }

  // ==========================================
  // 5. SCANS (APIs 2, 3, 25, 26, 27)
  // ==========================================
  public getAllScans(): Scan[] {
    return [...this.scans];
  }

  public getActiveScans(): Scan[] {
    return this.scans.filter(s => s.status !== 'deleted');
  }

  public getDeletedScans(): Scan[] {
    return this.scans.filter(s => s.status === 'deleted');
  }

  public getScanById(id: string): Scan | undefined {
    return this.scans.find(s => s._id === id);
  }

  public createScan(params: {
    targetUrl: string;
    scopes?: string[];
    companyRuleIds?: string[];
    scanSelection: {
      recon: string[];
      security: string[];
    };
  }): Scan {
    const url = params.targetUrl.trim();
    let hostname = url.replace(/^https?:\/\//i, '').split('/')[0];

    // Find or create target
    let target = this.targets.find(t => t.url.toLowerCase() === url.toLowerCase() || t.hostname.toLowerCase() === hostname.toLowerCase());
    if (!target) {
      target = {
        _id: 'tgt_' + Math.random().toString(36).substring(2, 9),
        ownerId: 'usr_owner_sentrix',
        url: url.startsWith('http') ? url : `https://${url}`,
        normalizedUrl: url.startsWith('http') ? url : `https://${url}`,
        hostname,
        lastScannedAt: new Date().toISOString(),
        scanCount: 1,
        scanVersionCounter: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.targets.unshift(target);
      saveToStorage('targets', this.targets);
    } else {
      target.scanCount += 1;
      target.scanVersionCounter += 1;
      target.lastScannedAt = new Date().toISOString();
      saveToStorage('targets', this.targets);
    }

    const scopeId = params.scopes?.[0] || null;
    const matchedScope = scopeId ? this.getScopeById(scopeId) : null;

    const totalScannersCount = params.scanSelection.recon.length + params.scanSelection.security.length;

    const newScan: Scan = {
      _id: 'scan_' + Math.random().toString(36).substring(2, 9),
      ownerId: 'usr_owner_sentrix',
      targetId: target._id,
      targetUrl: target.url,
      scopeId,
      scopeSnapshot: matchedScope ? {
        scopeId: matchedScope._id,
        name: matchedScope.name,
        hostnames: matchedScope.hostnames,
        ports: matchedScope.ports,
        includeSubdomains: matchedScope.includeSubdomains,
        schemaVersion: '1.0.0',
        capturedAt: new Date().toISOString(),
        targetHostname: target.hostname,
        targetPort: matchedScope.ports[0] || 443
      } : null,
      scanSelection: params.scanSelection,
      companyRuleIds: params.companyRuleIds || [],
      status: 'completed', // Auto-complete for seamless demo or progress tracking
      version: target.scanVersionCounter,
      startedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 15000).toISOString(),
      cancelledAt: null,
      failedAt: null,
      deletedAt: null,
      previousStatus: null,
      statusHistory: [
        {
          from: null,
          to: 'pending',
          changedAt: new Date().toISOString(),
          reason: 'scan_created',
          type: 'system',
          actor: 'usr_owner_sentrix'
        },
        {
          from: 'pending',
          to: 'running',
          changedAt: new Date().toISOString(),
          reason: 'scan_started',
          type: 'worker',
          actor: null
        },
        {
          from: 'running',
          to: 'completed',
          changedAt: new Date(Date.now() + 15000).toISOString(),
          reason: 'scan_completed',
          type: 'worker',
          actor: null
        }
      ],
      progress: 100,
      totalScanners: totalScannersCount || 2,
      completedScanners: totalScannersCount || 2,
      findingCounts: {
        critical: 0,
        high: params.scanSelection.security.includes('xss') ? 1 : 0,
        medium: params.scanSelection.security.includes('securityHeaders') ? 1 : 0,
        low: params.scanSelection.security.includes('securityHeaders') ? 2 : 0,
        info: 0
      },
      riskScore: 21,
      errorCode: null,
      errorMessage: null,
      credentials: { credentialProvided: false },
      scannerOutcomes: [
        ...params.scanSelection.recon.map(id => ({
          scannerId: id,
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          errorCode: null,
          errorMessage: null
        })),
        ...params.scanSelection.security.map(id => ({
          scannerId: id,
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          errorCode: null,
          errorMessage: null
        }))
      ],
      companyRuleAnalysis: {
        enabled: (params.companyRuleIds?.length || 0) > 0,
        rulesEvaluated: params.companyRuleIds?.length || 0,
        violatedRules: 0,
        evaluations: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scans = [newScan, ...this.scans];
    saveToStorage('scans', this.scans);
    return newScan;
  }

  public deleteScan(id: string): Scan | null {
    const scan = this.getScanById(id);
    if (!scan) return null;
    scan.previousStatus = scan.status;
    scan.status = 'deleted';
    scan.deletedAt = new Date().toISOString();
    scan.statusHistory.push({
      from: scan.previousStatus,
      to: 'deleted',
      changedAt: new Date().toISOString(),
      reason: 'user_deleted_scan',
      type: 'user',
      actor: 'usr_owner_sentrix'
    });
    scan.updatedAt = new Date().toISOString();
    saveToStorage('scans', this.scans);
    return scan;
  }

  public recoverScan(id: string): Scan | null {
    const scan = this.getScanById(id);
    if (!scan || scan.status !== 'deleted') return null;
    const prev = scan.previousStatus || 'completed';
    scan.status = prev;
    scan.deletedAt = null;
    scan.statusHistory.push({
      from: 'deleted',
      to: prev,
      changedAt: new Date().toISOString(),
      reason: 'scan_recovered',
      type: 'recovery',
      actor: 'usr_owner_sentrix'
    });
    scan.updatedAt = new Date().toISOString();
    saveToStorage('scans', this.scans);
    return scan;
  }

  // ==========================================
  // 6. FINDINGS & EVIDENCE (APIs 4, 5, 6, 7, 8)
  // ==========================================
  public getAllFindings(): Finding[] {
    return [...this.findings];
  }

  public getFindingsByScanId(scanId: string): Finding[] {
    return this.findings.filter(f => f.scanId === scanId);
  }

  public getFindingById(id: string): Finding | undefined {
    return this.findings.find(f => f._id === id);
  }

  public updateFindingStatus(id: string, status: FindingStatus): Finding | null {
    const finding = this.getFindingById(id);
    if (!finding) return null;
    finding.status = status;
    finding.updatedAt = new Date().toISOString();
    saveToStorage('findings', this.findings);
    return finding;
  }

  public getEvidenceByScanId(scanId: string): Evidence[] {
    return this.evidence.filter(e => e.scanId === scanId);
  }

  public getEvidenceById(id: string): Evidence | undefined {
    return this.evidence.find(e => e._id === id);
  }

  // ==========================================
  // 7. CRAWLS (APIs 17, 18, 19)
  // ==========================================
  public getCrawlDetails(scanId: string): CrawlDetails {
    const scan = this.getScanById(scanId);
    return {
      ...INITIAL_MOCK_CRAWL_DETAILS,
      scanId,
      targetUrl: scan?.targetUrl || INITIAL_MOCK_CRAWL_DETAILS.targetUrl
    };
  }

  public getCrawledPages(scanId: string): CrawledPage[] {
    return this.crawledPages.map(p => ({ ...p, scanId }));
  }

  public getDiscoveredInputs(scanId: string): DiscoveredInput[] {
    const pages = this.getCrawledPages(scanId);
    const inputs: DiscoveredInput[] = [];
    pages.forEach(p => {
      p.inputs.forEach(i => inputs.push(i));
    });
    return inputs;
  }

  // ==========================================
  // 8. REPORTS (APIs 9, 10, 11)
  // ==========================================
  public createReport(scanId: string, format: ReportFormat): Report {
    const scan = this.getScanById(scanId);
    const ext = format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'json';
    const mime = format === 'pdf' ? 'application/pdf' : format === 'html' ? 'text/html; charset=utf-8' : 'application/json';
    const size = format === 'pdf' ? 66474 : format === 'html' ? 8664 : 6697;

    const newReport: Report = {
      _id: 'rep_' + format + '_' + Math.random().toString(36).substring(2, 9),
      ownerId: 'usr_owner_sentrix',
      scanId,
      format,
      status: 'completed',
      storageProvider: 'cloudinary',
      storagePublicId: `sentrix_reports/${scanId}_${format}`,
      storageUrl: `https://res.cloudinary.com/sentrix/reports/${scanId}.${ext}`,
      contentType: mime,
      fileSize: size,
      errorCode: null,
      errorMessage: null,
      generatedAt: new Date().toISOString(),
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.reports = [newReport, ...this.reports];
    saveToStorage('reports', this.reports);
    return newReport;
  }

  public getReportById(id: string): Report | undefined {
    return this.reports.find(r => r._id === id);
  }

  public getReportsByScanId(scanId: string): { scanId: string; reports: { json?: Report; html?: Report; pdf?: Report } } {
    const scanReports = this.reports.filter(r => r.scanId === scanId);
    return {
      scanId,
      reports: {
        json: scanReports.find(r => r.format === 'json') || INITIAL_MOCK_REPORTS.find(r => r.format === 'json'),
        html: scanReports.find(r => r.format === 'html') || INITIAL_MOCK_REPORTS.find(r => r.format === 'html'),
        pdf: scanReports.find(r => r.format === 'pdf') || INITIAL_MOCK_REPORTS.find(r => r.format === 'pdf')
      }
    };
  }

  public getAllReports(): Report[] {
    return [...this.reports];
  }

  // Reset to factory defaults
  public resetToFactory(): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'scopes');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'rules');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'targets');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'scans');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'findings');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'evidence');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'reports');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'crawledPages');

    this.scopes = [...INITIAL_MOCK_SCOPES];
    this.rules = [...INITIAL_MOCK_RULES];
    this.targets = [...INITIAL_MOCK_TARGETS];
    this.scans = [...INITIAL_MOCK_SCANS];
    this.findings = [...INITIAL_MOCK_FINDINGS];
    this.evidence = [...INITIAL_MOCK_EVIDENCE];
    this.reports = [...INITIAL_MOCK_REPORTS];
    this.crawledPages = [...INITIAL_MOCK_CRAWLED_PAGES];
  }
}

export const mockService = new MockService();
