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
  ScanComparisonResult
} from '../types/sentrix';

// ==========================================
// 1. SCANNERS (API 1)
// ==========================================
export const MOCK_AVAILABLE_SCANNERS: AvailableScannersResponse = {
  recon: [
    {
      id: 'portScan',
      category: 'recon',
      name: 'Port Scan',
      description: 'Discovers accessible network ports on the authorized target host.'
    },
    {
      id: 'serviceDetection',
      category: 'recon',
      name: 'Service Detection',
      description: 'Identifies web services and server software exposed by the authorized target.'
    },
    {
      id: 'versionDetection',
      category: 'recon',
      name: 'Version Detection',
      description: 'Detects publicly exposed service and technology versions.'
    },
    {
      id: 'dns',
      category: 'recon',
      name: 'DNS Reconnaissance',
      description: 'Collects common DNS records for the authorized target hostname.'
    },
    {
      id: 'subdomains',
      category: 'recon',
      name: 'Subdomain Discovery',
      description: 'Performs bounded discovery of common subdomains under the target domain.'
    },
    {
      id: 'technology',
      category: 'recon',
      name: 'Technology Detection',
      description: 'Detects common web technologies using passive response signatures.'
    },
    {
      id: 'webServer',
      category: 'recon',
      name: 'Web Server Detection',
      description: 'Identifies publicly exposed web-server information from HTTP headers.'
    },
    {
      id: 'ssl',
      category: 'recon',
      name: 'SSL/TLS Reconnaissance',
      description: 'Collects TLS protocol, cipher, and certificate metadata from HTTPS targets.'
    },
    {
      id: 'robots',
      category: 'recon',
      name: 'Robots.txt Reconnaissance',
      description: 'Retrieves and parses the target robots.txt resource.'
    },
    {
      id: 'sitemap',
      category: 'recon',
      name: 'Sitemap Reconnaissance',
      description: 'Discovers URLs exposed through standard XML sitemap resources.'
    }
  ],
  security: [
    {
      id: 'sqli',
      category: 'security',
      name: 'SQL Injection Detection',
      description: 'Performs a conservative SQL error-surface assessment using controlled parameter input.'
    },
    {
      id: 'xss',
      category: 'security',
      name: 'Cross-Site Scripting',
      description: 'Performs a bounded reflected-input marker test.'
    },
    {
      id: 'securityHeaders',
      category: 'security',
      name: 'Security Headers',
      description: 'Checks common HTTP security response headers.'
    },
    {
      id: 'cors',
      category: 'security',
      name: 'CORS Security',
      description: 'Checks for unsafe cross-origin response configuration.'
    },
    {
      id: 'pathTraversal',
      category: 'security',
      name: 'Path Traversal',
      description: 'Checks for controlled path traversal indicators.'
    },
    {
      id: 'openRedirect',
      category: 'security',
      name: 'Open Redirect',
      description: 'Checks whether URL parameters control redirects to an external test domain.'
    },
    {
      id: 'csrf',
      category: 'security',
      name: 'CSRF Protection',
      description: 'Performs a passive assessment of form-based CSRF protections.'
    },
    {
      id: 'accessControl',
      category: 'security',
      name: 'Access Control',
      description: 'Performs a bounded unauthenticated access-control surface assessment.'
    },
    {
      id: 'authentication',
      category: 'security',
      name: 'Authentication Security',
      description: 'Inspects public login and registration pages using Chromium without submitting credentials or forms.'
    },
    {
      id: 'session',
      category: 'security',
      name: 'Session Security',
      description: 'Checks session-cookie security attributes.'
    },
    {
      id: 'ssrf',
      category: 'security',
      name: 'SSRF Surface Detection',
      description: 'Checks URL-like parameters for behavior suggesting server-side URL retrieval.'
    },
    {
      id: 'commandInjection',
      category: 'security',
      name: 'Command Injection Surface',
      description: 'Performs a conservative command-injection surface assessment without executing commands.'
    },
    {
      id: 'jwt',
      category: 'security',
      name: 'JWT Security',
      description: 'Detects exposed JWT-like tokens and reports structural exposure.'
    },
    {
      id: 'apiSecurity',
      category: 'security',
      name: 'API Security',
      description: 'Performs bounded discovery of common API documentation and endpoint surfaces.'
    },
    {
      id: 'fileUpload',
      category: 'security',
      name: 'File Upload Security',
      description: 'Detects public file-upload forms and checks basic client-visible restrictions.'
    }
  ],
  counts: {
    recon: 10,
    security: 15,
    total: 25
  }
};

// ==========================================
// 2. SCOPES (APIs 28, 29, 30, 31, 32)
// ==========================================
export const INITIAL_MOCK_SCOPES: Scope[] = [
  {
    _id: 'scope_web3',
    ownerId: 'usr_owner_sentrix',
    name: 'My Website-3',
    hostnames: ['review-x-u6mr6.vercel.app'],
    ports: [443, 80],
    includeSubdomains: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-15T14:20:00.000Z'
  },
  {
    _id: 'scope_web2',
    ownerId: 'usr_owner_sentrix',
    name: 'My Website-2',
    hostnames: ['review-x-u6mr6.vercel.app'],
    ports: [443],
    includeSubdomains: false,
    createdAt: '2026-09-20T08:30:00.000Z',
    updatedAt: '2026-09-20T08:30:00.000Z'
  },
  {
    _id: 'scope_prod_api',
    ownerId: 'usr_owner_sentrix',
    name: 'Production API Cluster',
    hostnames: ['api.sentrix-cyber.io', 'gateway.sentrix-cyber.io'],
    ports: [443],
    includeSubdomains: true,
    createdAt: '2026-09-15T09:00:00.000Z',
    updatedAt: '2026-10-10T11:15:00.000Z'
  }
];

// ==========================================
// 3. COMPANY SECURITY RULES (APIs 12, 13, 14, 15, 16)
// ==========================================
export const INITIAL_MOCK_RULES: CompanySecurityRule[] = [
  {
    _id: 'rule_hsts',
    ownerId: 'usr_owner_sentrix',
    name: 'HSTS Header Enforcement',
    normalizedName: 'hsts-header-enforcement',
    category: 'security-headers',
    description: 'All public HTTPS endpoints must return Strict-Transport-Security with max-age >= 31536000.',
    severity: 'high',
    rule: {
      type: 'header',
      header: 'strict-transport-security',
      operator: 'exists',
      value: true
    },
    enabled: true,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-10-05T09:30:00.000Z'
  },
  {
    _id: 'rule_cors',
    ownerId: 'usr_owner_sentrix',
    name: 'Wildcard CORS Restriction',
    normalizedName: 'wildcard-cors-restriction',
    category: 'cors',
    description: 'Production APIs must not allow wildcard CORS origins (Access-Control-Allow-Origin: *).',
    severity: 'critical',
    rule: {
      type: 'cors',
      header: 'access-control-allow-origin',
      operator: 'not-equals',
      value: '*'
    },
    enabled: true,
    createdAt: '2026-09-12T15:00:00.000Z',
    updatedAt: '2026-10-12T16:45:00.000Z'
  },
  {
    _id: 'rule_csp',
    ownerId: 'usr_owner_sentrix',
    name: 'Content-Security-Policy Mandatory',
    normalizedName: 'content-security-policy-mandatory',
    category: 'security-headers',
    description: 'Web applications must declare a robust Content-Security-Policy to mitigate reflected and DOM XSS.',
    severity: 'medium',
    rule: {
      type: 'header',
      header: 'content-security-policy',
      operator: 'exists',
      value: true
    },
    enabled: true,
    createdAt: '2026-09-18T10:15:00.000Z',
    updatedAt: '2026-09-18T10:15:00.000Z'
  }
];

// ==========================================
// 4. TARGETS (APIs 20, 21, 22, 23, 24)
// ==========================================
export const INITIAL_MOCK_TARGETS: Target[] = [
  {
    _id: 'tgt_review_app',
    ownerId: 'usr_owner_sentrix',
    url: 'https://review-x-u6mr6.vercel.app',
    normalizedUrl: 'https://review-x-u6mr6.vercel.app',
    hostname: 'review-x-u6mr6.vercel.app',
    lastScannedAt: '2026-10-16T18:45:00.000Z',
    scanCount: 4,
    scanVersionCounter: 4,
    isActive: true,
    createdAt: '2026-09-10T08:00:00.000Z',
    updatedAt: '2026-10-16T18:45:00.000Z'
  },
  {
    _id: 'tgt_api_gateway',
    ownerId: 'usr_owner_sentrix',
    url: 'https://gateway.sentrix-cyber.io',
    normalizedUrl: 'https://gateway.sentrix-cyber.io',
    hostname: 'gateway.sentrix-cyber.io',
    lastScannedAt: '2026-10-14T11:20:00.000Z',
    scanCount: 2,
    scanVersionCounter: 2,
    isActive: true,
    createdAt: '2026-09-18T09:30:00.000Z',
    updatedAt: '2026-10-14T11:20:00.000Z'
  },
  {
    _id: 'tgt_fintech_portal',
    ownerId: 'usr_owner_sentrix',
    url: 'https://pay.sentrix-fintech.net',
    normalizedUrl: 'https://pay.sentrix-fintech.net',
    hostname: 'pay.sentrix-fintech.net',
    lastScannedAt: '2026-10-12T16:10:00.000Z',
    scanCount: 1,
    scanVersionCounter: 1,
    isActive: true,
    createdAt: '2026-10-01T14:00:00.000Z',
    updatedAt: '2026-10-12T16:10:00.000Z'
  }
];

// ==========================================
// 5. SCANS (APIs 2, 3, 21, 22, 25, 26, 27)
// ==========================================
export const INITIAL_MOCK_SCANS: Scan[] = [
  // Version 4: Completed scan matching API 3 & 21
  {
    _id: 'scan_v4_completed',
    ownerId: 'usr_owner_sentrix',
    targetId: 'tgt_review_app',
    targetUrl: 'https://review-x-u6mr6.vercel.app',
    scopeId: 'scope_web3',
    scopeSnapshot: {
      scopeId: 'scope_web3',
      name: 'My Website-3',
      hostnames: ['review-x-u6mr6.vercel.app'],
      ports: [443, 80],
      includeSubdomains: true,
      schemaVersion: '1.0.0',
      capturedAt: '2026-10-16T18:00:00.000Z',
      targetHostname: 'review-x-u6mr6.vercel.app',
      targetPort: 443
    },
    scanSelection: {
      recon: [],
      security: ['securityHeaders', 'xss']
    },
    companyRuleIds: ['rule_hsts', 'rule_cors'],
    status: 'completed',
    version: 4,
    startedAt: '2026-10-16T18:00:05.000Z',
    completedAt: '2026-10-16T18:02:40.000Z',
    cancelledAt: null,
    failedAt: null,
    deletedAt: null,
    previousStatus: null,
    statusHistory: [
      {
        from: null,
        to: 'pending',
        changedAt: '2026-10-16T18:00:00.000Z',
        reason: 'scan_created',
        type: 'system',
        actor: 'usr_owner_sentrix'
      },
      {
        from: 'pending',
        to: 'running',
        changedAt: '2026-10-16T18:00:05.000Z',
        reason: 'scan_started',
        type: 'worker',
        actor: null
      },
      {
        from: 'running',
        to: 'completed',
        changedAt: '2026-10-16T18:02:40.000Z',
        reason: 'scan_completed',
        type: 'worker',
        actor: null
      }
    ],
    progress: 100,
    totalScanners: 2,
    completedScanners: 2,
    findingCounts: {
      critical: 0,
      high: 0,
      medium: 1,
      low: 2,
      info: 0
    },
    riskScore: 21,
    errorCode: null,
    errorMessage: null,
    credentials: {
      credentialProvided: false
    },
    idempotencyKey: null,
    scannerOutcomes: [
      {
        scannerId: 'securityHeaders',
        status: 'completed',
        startedAt: '2026-10-16T18:00:06.000Z',
        completedAt: '2026-10-16T18:01:20.000Z',
        errorCode: null,
        errorMessage: null
      },
      {
        scannerId: 'xss',
        status: 'completed',
        startedAt: '2026-10-16T18:01:21.000Z',
        completedAt: '2026-10-16T18:02:39.000Z',
        errorCode: null,
        errorMessage: null
      }
    ],
    companyRuleAnalysis: {
      enabled: true,
      rulesEvaluated: 2,
      violatedRules: 0,
      evaluations: []
    },
    createdAt: '2026-10-16T18:00:00.000Z',
    updatedAt: '2026-10-16T18:02:40.000Z'
  },

  // Version 3: Completed baseline scan
  {
    _id: 'scan_v3_completed',
    ownerId: 'usr_owner_sentrix',
    targetId: 'tgt_review_app',
    targetUrl: 'https://review-x-u6mr6.vercel.app',
    scopeId: null,
    scanSelection: {
      recon: [],
      security: ['securityHeaders', 'xss']
    },
    companyRuleIds: [],
    status: 'completed',
    version: 3,
    startedAt: '2026-10-14T12:00:00.000Z',
    completedAt: '2026-10-14T12:02:15.000Z',
    cancelledAt: null,
    failedAt: null,
    deletedAt: null,
    previousStatus: null,
    statusHistory: [
      {
        from: null,
        to: 'pending',
        changedAt: '2026-10-14T11:59:50.000Z',
        reason: 'scan_created',
        type: 'system',
        actor: 'usr_owner_sentrix'
      },
      {
        from: 'pending',
        to: 'running',
        changedAt: '2026-10-14T12:00:00.000Z',
        reason: 'scan_started',
        type: 'worker',
        actor: null
      },
      {
        from: 'running',
        to: 'completed',
        changedAt: '2026-10-14T12:02:15.000Z',
        reason: 'scan_completed',
        type: 'worker',
        actor: null
      }
    ],
    progress: 100,
    totalScanners: 2,
    completedScanners: 2,
    findingCounts: {
      critical: 0,
      high: 0,
      medium: 1,
      low: 2,
      info: 0
    },
    riskScore: 21,
    errorCode: null,
    errorMessage: null,
    credentials: { credentialProvided: false },
    scannerOutcomes: [
      {
        scannerId: 'securityHeaders',
        status: 'completed',
        startedAt: null,
        completedAt: '2026-10-14T12:01:00.000Z',
        errorCode: null,
        errorMessage: null
      },
      {
        scannerId: 'xss',
        status: 'completed',
        startedAt: null,
        completedAt: '2026-10-14T12:02:15.000Z',
        errorCode: null,
        errorMessage: null
      }
    ],
    createdAt: '2026-10-14T11:59:50.000Z',
    updatedAt: '2026-10-14T12:02:15.000Z'
  },

  // Version 2: Completed scan
  {
    _id: 'scan_v2_completed',
    ownerId: 'usr_owner_sentrix',
    targetId: 'tgt_review_app',
    targetUrl: 'https://review-x-u6mr6.vercel.app',
    scopeId: null,
    scanSelection: {
      recon: [],
      security: ['securityHeaders', 'xss']
    },
    companyRuleIds: [],
    status: 'completed',
    version: 2,
    startedAt: '2026-10-10T10:00:00.000Z',
    completedAt: '2026-10-10T10:02:20.000Z',
    cancelledAt: null,
    failedAt: null,
    deletedAt: null,
    previousStatus: null,
    statusHistory: [],
    progress: 100,
    totalScanners: 2,
    completedScanners: 2,
    findingCounts: {
      critical: 0,
      high: 0,
      medium: 1,
      low: 2,
      info: 0
    },
    riskScore: 21,
    errorCode: null,
    errorMessage: null,
    credentials: { credentialProvided: false },
    scannerOutcomes: [
      {
        scannerId: 'securityHeaders',
        status: 'completed',
        startedAt: null,
        completedAt: '2026-10-10T10:01:00.000Z',
        errorCode: null,
        errorMessage: null
      },
      {
        scannerId: 'xss',
        status: 'completed',
        startedAt: null,
        completedAt: '2026-10-10T10:02:20.000Z',
        errorCode: null,
        errorMessage: null
      }
    ],
    createdAt: '2026-10-10T09:59:00.000Z',
    updatedAt: '2026-10-10T10:02:20.000Z'
  },

  // Version 1: Failed scan matching API 22
  {
    _id: 'scan_v1_failed',
    ownerId: 'usr_owner_sentrix',
    targetId: 'tgt_review_app',
    targetUrl: 'https://review-x-u6mr6.vercel.app',
    scopeId: null,
    scanSelection: {
      recon: [],
      security: ['securityHeaders', 'sql1', 'xss']
    },
    companyRuleIds: [],
    status: 'failed',
    version: 1,
    startedAt: '2026-10-08T09:00:00.000Z',
    completedAt: null,
    cancelledAt: null,
    failedAt: '2026-10-08T09:00:08.000Z',
    deletedAt: null,
    previousStatus: null,
    statusHistory: [
      {
        from: null,
        to: 'pending',
        changedAt: '2026-10-08T08:59:55.000Z',
        reason: 'scan_created',
        type: 'system',
        actor: 'usr_owner_sentrix'
      },
      {
        from: 'pending',
        to: 'running',
        changedAt: '2026-10-08T09:00:00.000Z',
        reason: 'scan_started',
        type: 'worker',
        actor: null
      },
      {
        from: 'running',
        to: 'failed',
        changedAt: '2026-10-08T09:00:08.000Z',
        reason: 'scan_failed',
        type: 'worker',
        actor: null
      }
    ],
    progress: 0,
    totalScanners: 3,
    completedScanners: 0,
    findingCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    },
    riskScore: null,
    errorCode: 'SCAN_EXECUTION_FAILED',
    errorMessage: 'Unknown scanner: sql1',
    credentials: { credentialProvided: false },
    scannerOutcomes: [],
    createdAt: '2026-10-08T08:59:55.000Z',
    updatedAt: '2026-10-08T09:00:08.000Z'
  },

  // Soft-deleted scan matching API 25 & 26
  {
    _id: 'scan_del_998',
    ownerId: 'usr_owner_sentrix',
    targetId: 'tgt_review_app',
    targetUrl: 'https://review-x-u6mr6.vercel.app',
    scopeId: null,
    scanSelection: {
      recon: [],
      security: ['securityHeaders', 'xss']
    },
    companyRuleIds: [],
    status: 'deleted',
    version: 4,
    startedAt: '2026-10-15T15:00:00.000Z',
    completedAt: '2026-10-15T15:02:10.000Z',
    cancelledAt: null,
    failedAt: null,
    deletedAt: '2026-10-16T12:00:00.000Z',
    previousStatus: 'completed',
    statusHistory: [
      {
        from: null,
        to: 'pending',
        changedAt: '2026-10-15T14:59:50.000Z',
        reason: 'scan_created',
        type: 'system',
        actor: 'usr_owner_sentrix'
      },
      {
        from: 'pending',
        to: 'running',
        changedAt: '2026-10-15T15:00:00.000Z',
        reason: 'scan_started',
        type: 'worker',
        actor: null
      },
      {
        from: 'running',
        to: 'completed',
        changedAt: '2026-10-15T15:02:10.000Z',
        reason: 'scan_completed',
        type: 'worker',
        actor: null
      },
      {
        from: 'completed',
        to: 'deleted',
        changedAt: '2026-10-16T12:00:00.000Z',
        reason: 'user_deleted_scan',
        type: 'user',
        actor: 'usr_owner_sentrix'
      }
    ],
    progress: 100,
    totalScanners: 2,
    completedScanners: 2,
    findingCounts: {
      critical: 0,
      high: 0,
      medium: 1,
      low: 2,
      info: 0
    },
    riskScore: 21,
    errorCode: null,
    errorMessage: null,
    credentials: { credentialProvided: false },
    scannerOutcomes: [
      {
        scannerId: 'securityHeaders',
        status: 'completed',
        startedAt: null,
        completedAt: '2026-10-15T15:01:00.000Z',
        errorCode: null,
        errorMessage: null
      },
      {
        scannerId: 'xss',
        status: 'completed',
        startedAt: null,
        completedAt: '2026-10-15T15:02:10.000Z',
        errorCode: null,
        errorMessage: null
      }
    ],
    createdAt: '2026-10-15T14:59:50.000Z',
    updatedAt: '2026-10-16T12:00:00.000Z'
  }
];

// ==========================================
// 6. FINDINGS (APIs 4, 5, 6)
// ==========================================
export const INITIAL_MOCK_FINDINGS: Finding[] = [
  {
    _id: 'fnd_ref_pol_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    targetId: 'tgt_review_app',
    scannerId: 'securityHeaders',
    category: 'security-headers',
    title: 'Missing Referrer-Policy Header',
    description: 'The response does not expose the referrer-policy security header.',
    impact: 'Without Referrer-Policy, sensitive URLs and path parameters may leak to external third parties during navigations.',
    severity: 'low',
    confidence: 'medium',
    status: 'accepted',
    verificationStatus: 'pending',
    evidenceIds: ['ev_ref_01'],
    verificationId: null,
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
    tags: ['headers', 'privacy'],
    fingerprint: 'fp_ref_policy_38129038',
    remediation: 'Configure an appropriate Referrer-Policy, such as strict-origin-when-cross-origin.',
    metadata: {
      header: 'referrer-policy',
      responseStatus: 200
    },
    firstDetectedAt: '2026-10-10T10:01:00.000Z',
    lastDetectedAt: '2026-10-16T18:01:10.000Z',
    createdAt: '2026-10-10T10:01:00.000Z',
    updatedAt: '2026-10-16T18:02:40.000Z'
  },
  {
    _id: 'fnd_xcto_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    targetId: 'tgt_review_app',
    scannerId: 'securityHeaders',
    category: 'security-headers',
    title: 'Missing X-Content-Type-Options Header',
    description: 'The response does not expose the x-content-type-options security header.',
    impact: 'Legacy browsers and MIME sniffers may execute non-executable MIME types as HTML/JavaScript.',
    severity: 'low',
    confidence: 'medium',
    status: 'detected',
    verificationStatus: 'pending',
    evidenceIds: ['ev_xcto_01'],
    verificationId: null,
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
    tags: ['headers', 'sniffing'],
    fingerprint: 'fp_xcto_81726482',
    remediation: 'Set X-Content-Type-Options to nosniff in HTTP response headers.',
    metadata: {
      header: 'x-content-type-options',
      responseStatus: 200
    },
    firstDetectedAt: '2026-10-10T10:01:00.000Z',
    lastDetectedAt: '2026-10-16T18:01:10.000Z',
    createdAt: '2026-10-10T10:01:00.000Z',
    updatedAt: '2026-10-16T18:02:40.000Z'
  },
  {
    _id: 'fnd_csp_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    targetId: 'tgt_review_app',
    scannerId: 'securityHeaders',
    category: 'security-headers',
    title: 'Missing Content-Security-Policy Header',
    description: 'The response does not expose the content-security-policy security header.',
    impact: 'Absence of CSP significantly increases susceptibility to Cross-Site Scripting (XSS) and data exfiltration.',
    severity: 'medium',
    confidence: 'medium',
    status: 'detected',
    verificationStatus: 'pending',
    evidenceIds: ['ev_csp_01'],
    verificationId: null,
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
    tags: ['headers', 'xss-mitigation'],
    fingerprint: 'fp_csp_91823719',
    remediation: "Define an appropriate Content-Security-Policy with default-src 'self' and restricted script-src directives.",
    metadata: {
      header: 'content-security-policy',
      responseStatus: 200
    },
    firstDetectedAt: '2026-10-10T10:01:00.000Z',
    lastDetectedAt: '2026-10-16T18:01:10.000Z',
    createdAt: '2026-10-10T10:01:00.000Z',
    updatedAt: '2026-10-16T18:02:40.000Z'
  },
  {
    _id: 'fnd_xss_marker_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    targetId: 'tgt_review_app',
    scannerId: 'xss',
    category: 'xss',
    title: 'Reflected Marker Detected in Search Parameter',
    description: 'Controlled parameter marker reflected unencoded in response markup.',
    impact: 'Adversaries can craft malicious links to execute arbitrary client-side scripts in user sessions.',
    severity: 'high',
    confidence: 'high',
    status: 'detected',
    verificationStatus: 'verified',
    evidenceIds: ['ev_xss_01'],
    verificationId: null,
    references: ['https://owasp.org/www-community/attacks/xss/'],
    tags: ['injection', 'xss'],
    fingerprint: 'fp_xss_search_0192',
    remediation: 'HTML entity encode input contextually before DOM interpolation.',
    metadata: {
      parameter: 'q',
      responseStatus: 200
    },
    firstDetectedAt: '2026-10-16T18:02:00.000Z',
    lastDetectedAt: '2026-10-16T18:02:00.000Z',
    createdAt: '2026-10-16T18:02:00.000Z',
    updatedAt: '2026-10-16T18:02:40.000Z'
  }
];

// ==========================================
// 7. EVIDENCE (APIs 7, 8)
// ==========================================
export const INITIAL_MOCK_EVIDENCE: Evidence[] = [
  {
    _id: 'ev_ref_01',
    findingId: 'fnd_ref_pol_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    fingerprint: 'fp_ev_ref_policy_38129038',
    bodyExcerpt: '[REDACTED]',
    createdAt: '2026-10-16T18:01:10.000Z',
    headers: {
      age: '0',
      'cache-control': 'public, max-age=0, must-revalidate',
      'content-type': 'text/html; charset=utf-8',
      date: 'Fri, 16 Oct 2026 18:01:10 GMT',
      server: 'Vercel',
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      'x-vercel-cache': 'MISS',
      'x-vercel-id': 'iad1::sentrix-sec-test-84812',
      connection: 'close',
      'transfer-encoding': 'chunked'
    },
    metadata: {
      header: 'referrer-policy',
      responseStatus: 200,
      description: 'The response does not expose the referrer-policy security header.',
      scannerId: 'securityHeaders',
      targetId: 'tgt_review_app'
    },
    method: 'GET',
    observation: {
      description: 'The response does not expose the referrer-policy security header.',
      expected: 'Referrer-Policy: strict-origin-when-cross-origin or no-referrer',
      actual: 'Header omitted in HTTP 200 response'
    },
    request: {
      method: 'GET',
      url: 'https://review-x-u6mr6.vercel.app',
      body: null
    },
    response: {
      statusCode: 200,
      headers: {
        age: '0',
        'cache-control': 'public, max-age=0, must-revalidate',
        'content-type': 'text/html; charset=utf-8',
        date: 'Fri, 16 Oct 2026 18:01:10 GMT',
        server: 'Vercel',
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
        'x-vercel-cache': 'MISS',
        'x-vercel-id': 'iad1::sentrix-sec-test-84812',
        connection: 'close',
        'transfer-encoding': 'chunked'
      },
      bodySnippet: '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Review Platform</title>...</head><body>[REDACTED]</body></html>',
      contentType: 'text/html; charset=utf-8',
      bodyLength: 1042
    },
    scannerId: 'securityHeaders',
    sensitiveDataRedacted: true,
    statusCode: 200,
    summary: 'The response does not expose the referrer-policy security header.',
    type: 'http_exchange',
    updatedAt: '2026-10-16T18:01:10.000Z',
    url: 'https://review-x-u6mr6.vercel.app'
  },
  {
    _id: 'ev_xcto_01',
    findingId: 'fnd_xcto_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    fingerprint: 'fp_ev_xcto_81726482',
    bodyExcerpt: '[REDACTED]',
    createdAt: '2026-10-16T18:01:10.000Z',
    headers: {
      server: 'Vercel',
      'content-type': 'text/html; charset=utf-8',
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload'
    },
    metadata: {
      header: 'x-content-type-options',
      responseStatus: 200,
      description: 'The response does not expose the x-content-type-options security header.',
      scannerId: 'securityHeaders',
      targetId: 'tgt_review_app'
    },
    method: 'GET',
    observation: {
      description: 'The response does not expose the x-content-type-options security header.',
      expected: 'X-Content-Type-Options: nosniff',
      actual: 'Header missing'
    },
    request: {
      method: 'GET',
      url: 'https://review-x-u6mr6.vercel.app',
      body: null
    },
    response: {
      statusCode: 200,
      headers: {
        server: 'Vercel',
        'content-type': 'text/html; charset=utf-8'
      },
      bodySnippet: '[REDACTED]',
      contentType: 'text/html; charset=utf-8',
      bodyLength: 1042
    },
    scannerId: 'securityHeaders',
    sensitiveDataRedacted: true,
    statusCode: 200,
    summary: 'The response does not expose the x-content-type-options security header.',
    type: 'http_exchange',
    updatedAt: '2026-10-16T18:01:10.000Z',
    url: 'https://review-x-u6mr6.vercel.app'
  },
  {
    _id: 'ev_csp_01',
    findingId: 'fnd_csp_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    fingerprint: 'fp_ev_csp_91823719',
    bodyExcerpt: '[REDACTED]',
    createdAt: '2026-10-16T18:01:10.000Z',
    headers: {
      server: 'Vercel',
      'content-type': 'text/html; charset=utf-8'
    },
    metadata: {
      header: 'content-security-policy',
      responseStatus: 200,
      description: 'The response does not expose the content-security-policy security header.',
      scannerId: 'securityHeaders',
      targetId: 'tgt_review_app'
    },
    method: 'GET',
    observation: {
      description: 'The response does not expose the content-security-policy security header.',
      expected: "Content-Security-Policy: default-src 'self'",
      actual: 'Header missing'
    },
    request: {
      method: 'GET',
      url: 'https://review-x-u6mr6.vercel.app',
      body: null
    },
    response: {
      statusCode: 200,
      headers: {
        server: 'Vercel',
        'content-type': 'text/html; charset=utf-8'
      },
      bodySnippet: '[REDACTED]',
      contentType: 'text/html; charset=utf-8',
      bodyLength: 1042
    },
    scannerId: 'securityHeaders',
    sensitiveDataRedacted: true,
    statusCode: 200,
    summary: 'The response does not expose the content-security-policy security header.',
    type: 'http_exchange',
    updatedAt: '2026-10-16T18:01:10.000Z',
    url: 'https://review-x-u6mr6.vercel.app'
  }
];

// ==========================================
// 8. CRAWL DETAILS & PAGES (APIs 17, 18, 19)
// ==========================================
export const INITIAL_MOCK_CRAWL_DETAILS: CrawlDetails = {
  _id: 'crawl_scan_v4',
  ownerId: 'usr_owner_sentrix',
  scanId: 'scan_v4_completed',
  targetUrl: 'https://review-x-u6mr6.vercel.app',
  status: 'completed',
  maxDepth: 20,
  maxPaths: 5000,
  pagesAttempted: 5,
  pagesFailed: 0,
  pagesSucceeded: 5,
  plan: 'enterprise',
  requestsPerSecond: 100,
  startedAt: '2026-10-16T18:00:06.000Z',
  completedAt: '2026-10-16T18:01:00.000Z',
  errorCode: null,
  createdAt: '2026-10-16T18:00:06.000Z',
  updatedAt: '2026-10-16T18:01:00.000Z'
};

export const INITIAL_MOCK_CRAWLED_PAGES: CrawledPage[] = [
  {
    _id: 'page_01',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    depth: 0,
    statusCode: 200,
    contentType: 'text/html; charset=utf-8',
    url: 'https://review-x-u6mr6.vercel.app/',
    discoveredLinks: [
      'https://review-x-u6mr6.vercel.app/about',
      'https://review-x-u6mr6.vercel.app/features',
      'https://review-x-u6mr6.vercel.app/pricing',
      'https://review-x-u6mr6.vercel.app/login'
    ],
    forms: [],
    inputs: [
      {
        tag: 'button',
        name: null,
        type: 'button',
        id: 'theme-toggle-btn',
        label: null,
        ariaLabel: 'Switch to light theme',
        placeholder: null,
        formId: null,
        required: false,
        disabled: false,
        readonly: false,
        options: []
      },
      {
        tag: 'input',
        name: 'search',
        type: 'search',
        id: 'global-search',
        label: 'Search',
        ariaLabel: 'Search documentation',
        placeholder: 'Search documentation...',
        formId: null,
        required: false,
        disabled: false,
        readonly: false,
        options: []
      }
    ],
    apiRequests: [],
    openApiEndpoints: [],
    queryParameterNames: [],
    status: 'success',
    errorCode: null,
    createdAt: '2026-10-16T18:00:15.000Z',
    updatedAt: '2026-10-16T18:00:15.000Z'
  },
  {
    _id: 'page_02',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    depth: 1,
    statusCode: 200,
    contentType: 'text/html; charset=utf-8',
    url: 'https://review-x-u6mr6.vercel.app/about',
    discoveredLinks: [],
    forms: [],
    inputs: [],
    apiRequests: [],
    openApiEndpoints: [],
    queryParameterNames: [],
    status: 'success',
    errorCode: null,
    createdAt: '2026-10-16T18:00:25.000Z',
    updatedAt: '2026-10-16T18:00:25.000Z'
  },
  {
    _id: 'page_03',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    depth: 1,
    statusCode: 200,
    contentType: 'text/html; charset=utf-8',
    url: 'https://review-x-u6mr6.vercel.app/login',
    discoveredLinks: ['https://review-x-u6mr6.vercel.app/forgot-password'],
    forms: [
      {
        id: 'login-form',
        action: '/api/v1/auth/login',
        method: 'POST'
      }
    ],
    inputs: [
      {
        tag: 'input',
        name: 'email',
        type: 'email',
        id: 'login-email',
        label: 'Email Address',
        ariaLabel: 'Email Address',
        placeholder: 'you@company.com',
        formId: 'login-form',
        required: true,
        disabled: false,
        readonly: false,
        options: []
      },
      {
        tag: 'input',
        name: 'password',
        type: 'password',
        id: 'login-password',
        label: 'Password',
        ariaLabel: 'Password',
        placeholder: '••••••••',
        formId: 'login-form',
        required: true,
        disabled: false,
        readonly: false,
        options: []
      },
      {
        tag: 'button',
        name: 'submit',
        type: 'submit',
        id: 'login-submit',
        label: 'Sign In',
        ariaLabel: 'Sign In',
        placeholder: null,
        formId: 'login-form',
        required: false,
        disabled: false,
        readonly: false,
        options: []
      }
    ],
    apiRequests: ['/api/v1/auth/login'],
    openApiEndpoints: [],
    queryParameterNames: [],
    status: 'success',
    errorCode: null,
    createdAt: '2026-10-16T18:00:35.000Z',
    updatedAt: '2026-10-16T18:00:35.000Z'
  }
];

// ==========================================
// 9. REPORTS (APIs 9, 10, 11)
// ==========================================
export const INITIAL_MOCK_REPORTS: Report[] = [
  {
    _id: 'rep_pdf_v4',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    format: 'pdf',
    status: 'completed',
    storageProvider: 'cloudinary',
    storagePublicId: 'sentrix_reports/pdf_scan_v4_prod',
    storageUrl: 'https://res.cloudinary.com/sentrix/raw/upload/v1/reports/scan_v4.pdf',
    contentType: 'application/pdf',
    fileSize: 66474,
    errorCode: null,
    errorMessage: null,
    generatedAt: '2026-10-16T18:03:00.000Z',
    expiresAt: null,
    createdAt: '2026-10-16T18:02:45.000Z',
    updatedAt: '2026-10-16T18:03:00.000Z'
  },
  {
    _id: 'rep_html_v4',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    format: 'html',
    status: 'completed',
    storageProvider: 'cloudinary',
    storagePublicId: 'sentrix_reports/html_scan_v4_prod',
    storageUrl: 'https://res.cloudinary.com/sentrix/raw/upload/v1/reports/scan_v4.html',
    contentType: 'text/html; charset=utf-8',
    fileSize: 8664,
    errorCode: null,
    errorMessage: null,
    generatedAt: '2026-10-16T18:02:50.000Z',
    expiresAt: null,
    createdAt: '2026-10-16T18:02:45.000Z',
    updatedAt: '2026-10-16T18:02:50.000Z'
  },
  {
    _id: 'rep_json_v4',
    ownerId: 'usr_owner_sentrix',
    scanId: 'scan_v4_completed',
    format: 'json',
    status: 'completed',
    storageProvider: 'cloudinary',
    storagePublicId: 'sentrix_reports/json_scan_v4_prod',
    storageUrl: 'https://res.cloudinary.com/sentrix/raw/upload/v1/reports/scan_v4.json',
    contentType: 'application/json',
    fileSize: 6697,
    errorCode: null,
    errorMessage: null,
    generatedAt: '2026-10-16T18:02:48.000Z',
    expiresAt: null,
    createdAt: '2026-10-16T18:02:45.000Z',
    updatedAt: '2026-10-16T18:02:48.000Z'
  }
];

// ==========================================
// 10. TARGET TRENDS (API 23)
// ==========================================
export const MOCK_TARGET_TRENDS: TargetSecurityTrends = {
  targetId: 'tgt_review_app',
  scans: [
    {
      scanId: 'scan_v2_completed',
      version: 2,
      completedAt: '2026-10-10T10:02:20.000Z',
      riskScore: 21,
      comparableScannerCount: 2,
      findingCounts: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 2,
        info: 0
      },
      findingsIncluded: 3
    },
    {
      scanId: 'scan_v3_completed',
      version: 3,
      completedAt: '2026-10-14T12:02:15.000Z',
      riskScore: 21,
      comparableScannerCount: 2,
      findingCounts: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 2,
        info: 0
      },
      findingsIncluded: 3
    },
    {
      scanId: 'scan_v4_completed',
      version: 4,
      completedAt: '2026-10-16T18:02:40.000Z',
      riskScore: 21,
      comparableScannerCount: 2,
      findingCounts: {
        critical: 0,
        high: 0,
        medium: 1,
        low: 2,
        info: 0
      },
      findingsIncluded: 3
    }
  ],
  limitations: [
    'Only completed, non-deleted scans are included.',
    'Findings from scanners without a recorded successful outcome are excluded.',
    'Legacy scans without scanner outcome data cannot provide reliable resolution evidence.'
  ]
};

// ==========================================
// 11. SCAN COMPARISON RESULT (API 24)
// ==========================================
export const MOCK_SCAN_COMPARISON: ScanComparisonResult = {
  _id: 'cmp_res_v3_v4',
  ownerId: 'usr_owner_sentrix',
  targetId: 'tgt_review_app',
  baselineScanId: 'scan_v3_completed',
  baselineVersion: 3,
  baselineCompletedAt: '2026-10-14T12:02:15.000Z',
  comparisonScanId: 'scan_v4_completed',
  comparisonVersion: 4,
  comparedAt: '2026-10-16T18:05:00.000Z',
  comparisonCompletedAt: '2026-10-16T18:02:40.000Z',
  createdAt: '2026-10-16T18:05:00.000Z',
  updatedAt: '2026-10-16T18:05:00.000Z',
  findings: {
    added: [],
    persistent: [
      {
        previous: {
          ...INITIAL_MOCK_FINDINGS[0],
          scanId: 'scan_v3_completed',
          status: 'accepted'
        },
        current: {
          ...INITIAL_MOCK_FINDINGS[0],
          scanId: 'scan_v4_completed',
          status: 'accepted'
        }
      },
      {
        previous: {
          ...INITIAL_MOCK_FINDINGS[1],
          scanId: 'scan_v3_completed',
          status: 'detected'
        },
        current: {
          ...INITIAL_MOCK_FINDINGS[1],
          scanId: 'scan_v4_completed',
          status: 'detected'
        }
      },
      {
        previous: {
          ...INITIAL_MOCK_FINDINGS[2],
          scanId: 'scan_v3_completed',
          status: 'detected'
        },
        current: {
          ...INITIAL_MOCK_FINDINGS[2],
          scanId: 'scan_v4_completed',
          status: 'detected'
        }
      }
    ],
    resolved: []
  },
  scannerComparison: {
    comparable: ['securityHeaders', 'xss'],
    baselineOnly: [],
    comparisonOnly: [],
    outcomeDataAvailable: true
  },
  summary: {
    added: 0,
    persistent: 3,
    resolved: 0,
    comparableScanners: 2
  }
};
