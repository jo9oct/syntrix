/**
 * Sentrix Cybersecurity Platform — Unified Type Definitions
 * Derived directly from frontend_remade.md specifications (APIs 1 to 32)
 */

// ==========================================
// 1. SCANNERS (API 1)
// ==========================================
export interface ScannerItem {
  id: string;
  category: 'recon' | 'security';
  name: string;
  description: string;
}

export interface AvailableScannersResponse {
  recon: ScannerItem[];
  security: ScannerItem[];
  counts: {
    recon: number;
    security: number;
    total: number;
  };
}

// ==========================================
// 2. SCOPES (APIs 28, 29, 30, 31, 32)
// ==========================================
export interface Scope {
  _id: string;
  ownerId: string;
  name: string;
  hostnames: string[];
  ports: number[];
  includeSubdomains: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScopeSnapshot {
  scopeId: string;
  name: string;
  hostnames: string[];
  ports: number[];
  includeSubdomains: boolean;
  schemaVersion?: string;
  capturedAt?: string;
  targetHostname?: string;
  targetPort?: string | number;
}

// ==========================================
// 3. COMPANY SECURITY RULES (APIs 12, 13, 14, 15, 16)
// ==========================================
export interface CompanySecurityRuleDefinition {
  type: 'header' | 'cors' | 'tls' | 'parameter' | 'custom';
  header?: string;
  operator: 'exists' | 'equals' | 'not-equals' | 'contains' | 'matches';
  value: any;
}

export interface CompanySecurityRule {
  _id: string;
  ownerId: string;
  name: string;
  normalizedName?: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  rule: CompanySecurityRuleDefinition;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. SCANS & STATUS (APIs 2, 3, 22, 25, 26, 27)
// ==========================================
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'deleted';

export interface StatusHistoryItem {
  from: string | null;
  to: ScanStatus;
  changedAt: string;
  reason: string;
  type: 'system' | 'worker' | 'user' | 'recovery';
  actor: string | null;
}

export interface FindingCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ScannerOutcome {
  scannerId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface CompanyRuleAnalysis {
  enabled: boolean;
  rulesEvaluated: number;
  violatedRules: number;
  evaluations: any[];
}

export interface Scan {
  _id: string;
  ownerId: string;
  targetId: string;
  targetUrl: string;
  scopeId: string | null;
  scopeSnapshot?: ScopeSnapshot | null;
  scanSelection: {
    recon: string[];
    security: string[];
  };
  companyRuleIds: string[];
  status: ScanStatus;
  version: number;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  deletedAt: string | null;
  previousStatus: ScanStatus | null;
  purgeToken?: string | null;
  purgeLeaseUntil?: string | null;
  statusHistory: StatusHistoryItem[];
  progress: number;
  totalScanners: number;
  completedScanners: number;
  findingCounts: FindingCounts;
  riskScore: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  credentials?: {
    credentialProvided: boolean;
  };
  idempotencyKey?: string | null;
  scannerOutcomes: ScannerOutcome[];
  companyRuleAnalysis?: CompanyRuleAnalysis;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. FINDINGS (APIs 4, 5, 6)
// ==========================================
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingStatus = 'detected' | 'verified' | 'accepted' | 'false_positive' | 'resolved' | 'in-progress' | 'false-positive';
export type VerificationStatus = 'pending' | 'verified' | 'failed';

export interface FindingMetadata {
  header?: string;
  responseStatus?: number;
  [key: string]: any;
}

export interface AiRemediation {
  summary: string;
  actions?: string[];
  references?: string[];
}

export interface AiAnalysisData {
  summary: string | null;
  impact: string | null;
  rootCause: string | null;
  uncertainty: string | null;
  remediation: AiRemediation | null;
  status?: string;
  provider?: string;
  model?: string;
  completedAt?: string;
}

export interface Finding {
  _id: string;
  ownerId: string;
  scanId: string;
  targetId: string;
  scannerId: string;
  category: string;
  title: string;
  description: string;
  impact: string | null;
  severity: FindingSeverity;
  confidence: 'high' | 'medium' | 'low';
  status: FindingStatus;
  verificationStatus: VerificationStatus;
  evidenceIds: string[];
  verificationId: string | null;
  references: string[];
  tags: string[];
  fingerprint: string;
  remediation: string;
  aiAnalysis?: AiAnalysisData | null;
  metadata?: FindingMetadata;
  firstDetectedAt: string;
  lastDetectedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. EVIDENCE (APIs 7, 8)
// ==========================================
export interface EvidenceObservation {
  description: string;
  expected: string | null;
  actual: string | null;
}

export interface EvidenceRequest {
  method: string;
  url: string;
  body: any;
}

export interface EvidenceResponse {
  statusCode: number;
  headers: Record<string, string>;
  bodySnippet: string;
  contentType: string;
  bodyLength: number;
}

export interface Evidence {
  _id: string;
  findingId: string;
  ownerId: string;
  scanId: string;
  fingerprint: string;
  bodyExcerpt: string;
  createdAt: string;
  headers: Record<string, string>;
  metadata: {
    header?: string;
    responseStatus?: number;
    description?: string;
    scannerId?: string;
    targetId?: string;
    [key: string]: any;
  };
  method: string;
  observation: EvidenceObservation;
  request: EvidenceRequest;
  response: EvidenceResponse;
  scannerId: string;
  sensitiveDataRedacted: boolean;
  statusCode: number;
  summary: string;
  type: 'http_exchange';
  updatedAt: string;
  url: string;
}

// ==========================================
// 7. REPORTS (APIs 9, 10, 11)
// ==========================================
export type ReportFormat = 'json' | 'html' | 'pdf';
export type ReportStatus = 'pending' | 'completed' | 'failed';

export interface Report {
  _id: string;
  ownerId: string;
  scanId: string;
  format: ReportFormat;
  status: ReportStatus;
  storageProvider: 'cloudinary' | 's3' | 'local' | null;
  storagePublicId: string | null;
  storageUrl: string | null;
  contentType: string | null;
  fileSize: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  generatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsByScanResponse {
  scanId: string;
  reports: {
    json?: Report;
    html?: Report;
    pdf?: Report;
  };
}

// ==========================================
// 8. CRAWLS & INPUT DISCOVERY (APIs 17, 18, 19)
// ==========================================
export interface DiscoveredInput {
  tag: string;
  name: string | null;
  type: string;
  id: string | null;
  label: string | null;
  ariaLabel: string | null;
  placeholder: string | null;
  formId: string | null;
  required: boolean;
  disabled: boolean;
  autocomplete?: string | null;
  pattern?: string | null;
  min?: string | number | null;
  max?: string | number | null;
  step?: string | number | null;
  minlength?: number | null;
  maxlength?: number | null;
  readonly: boolean;
  multiple?: boolean;
  accept?: string[];
  options?: string[];
}

export interface CrawledPage {
  _id: string;
  ownerId: string;
  scanId: string;
  apiRequests: any[];
  contentType: string;
  createdAt: string;
  depth: number;
  discoveredLinks: string[];
  errorCode: string | null;
  forms: any[];
  inputs: DiscoveredInput[];
  openApiEndpoints: string[];
  queryParameterNames: string[];
  status: 'success' | 'failed';
  statusCode: number;
  updatedAt: string;
  url: string;
}

export interface CrawlDetails {
  _id: string;
  ownerId: string;
  scanId: string;
  completedAt: string;
  createdAt: string;
  errorCode: string | null;
  maxDepth: number;
  maxPaths: number;
  pagesAttempted: number;
  pagesFailed: number;
  pagesSucceeded: number;
  plan: string;
  requestsPerSecond: number;
  startedAt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  targetUrl: string;
  updatedAt: string;
}

// ==========================================
// 9. TARGETS, TRENDS & COMPARISONS (APIs 20, 21, 22, 23, 24)
// ==========================================
export interface Target {
  _id: string;
  name?: string;
  ownerId: string;
  url: string;
  normalizedUrl: string;
  hostname: string;
  lastScannedAt: string;
  scanCount: number;
  scanVersionCounter: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TargetTrendItem {
  scanId: string;
  version: number;
  completedAt: string;
  riskScore: number;
  comparableScannerCount: number;
  findingCounts: FindingCounts;
  findingsIncluded: number;
}

export interface TargetSecurityTrends {
  targetId: string;
  scans: TargetTrendItem[];
  limitations: string[];
}

export interface PersistentFindingComparison {
  previous: Finding;
  current: Finding;
}

export interface ScanComparisonResult {
  _id: string;
  ownerId: string;
  targetId: string;
  baselineCompletedAt: string;
  baselineScanId: string;
  baselineVersion: number;
  comparedAt: string;
  comparisonCompletedAt: string;
  comparisonScanId: string;
  comparisonVersion: number;
  createdAt: string;
  findings: {
    added: Finding[];
    persistent: PersistentFindingComparison[];
    resolved: Finding[];
  };
  scannerComparison: {
    comparable: string[];
    baselineOnly: string[];
    comparisonOnly: string[];
    outcomeDataAvailable: boolean;
  };
  summary: {
    added: number;
    persistent: number;
    resolved: number;
    comparableScanners: number;
  };
  updatedAt: string;
}
