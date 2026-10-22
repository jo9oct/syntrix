import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { mockService } from './mockService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('sentrix-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return config;
});

// Response interceptor: automatically fall back to Vite /api proxy if browser blocks direct cross-origin
api.interceptors.response.use(
  (response) => {
    // If a scan was created, cache it in sentrix_recent_scans for dropdowns and history
    if (response?.config?.url?.match(/scans$/i) && response?.config?.method?.toLowerCase() === 'post') {
      try {
        const createdScan = response.data?.data?.scan;
        if (createdScan && createdScan._id) {
          const raw = localStorage.getItem('sentrix_recent_scans');
          const list = raw ? JSON.parse(raw) : [];
          const updated = [createdScan, ...list.filter((s: any) => s._id !== createdScan._id)].slice(0, 50);
          localStorage.setItem('sentrix_recent_scans', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    if (
      originalRequest &&
      !originalRequest._retry &&
      (!error.response || error.message === 'Network Error')
    ) {
      originalRequest._retry = true;
      originalRequest.baseURL = '/api/v1';
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

/**
 * Frontend Mock Adapter:
 * Ensures all 32 APIs defined in frontend_remade.md are answered directly from
 * rich in-memory / localStorage mock data, without needing a running backend.
 */
api.interceptors.request.use(async (config) => {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // REAL BACKEND: Authentication endpoints & Users bypass mock adapter
  if (url.includes('auth/') || url.match(/\/auth\//i) || url.includes('payment/') || url.match(/\/payment\//i) || url.includes('users')) {
    return config;
  }

  // REAL BACKEND INTEGRATION for the 11 specific requested endpoints:
  // 1. GET /scanners
  if (url.match(/scanners$/i) && method === 'get') {
    return config;
  }

  // 2. POST /scans (Create Scan)
  if (url.match(/scans$/i) && method === 'post') {
    return config;
  }

  // 4. POST /scans/:id/cancel (Cancel Scan)
  if (url.match(/scans\/[^/]+\/cancel$/i) && method === 'post') {
    return config;
  }

  // 3. GET /scans/:id (Scan details with 24-hex MongoDB ID)
  if (url.match(/scans\/[a-f0-9]{24}(\?|$)/i) && method === 'get') {
    return config;
  }

  // 5. GET /findings (All findings, single finding /findings/:id, or ?scanId=...)
  if (url.match(/findings(\/|\?|$)/i) && method === 'get') {
    return config;
  }

  // 6. PATCH /findings/:id (Update finding status/remediation)
  if (url.match(/findings\/[^/]+$/i) && method === 'patch') {
    return config;
  }

  // 7 & 8. GET /evidence (list by ?scanId=... or single /:id)
  if (url.match(/evidence(\/|\?|$)/i) && method === 'get') {
    return config;
  }

  // 9, 10, 11. Reports (POST /reports, GET /reports/:id, GET /reports?scanId=...)
  if (url.match(/reports(\/|\?|$)/i)) {
    return config;
  }

  // 12. Security Scopes (POST /scopes, GET /scopes, GET /scopes/:id, PATCH /scopes/:id, DELETE /scopes/:id)
  if (url.match(/scopes(\/|\?|$)/i)) {
    return config;
  }

  // 13. Company Rules (POST /company-rules, GET /company-rules, GET /company-rules/:id, PATCH /company-rules/:id, DELETE /company-rules/:id)
  if (url.match(/company-rules(\/|\?|$)/i)) {
    return config;
  }

  // 14. Crawls (GET /crawls/:scanId, GET /crawls/:scanId/pages, GET /crawls/:scanId/inputs)
  if (url.match(/crawls(\/|\?|$)/i) && method === 'get') {
    return config;
  }

  // 15. Targets (GET /targets, GET /targets/:targetId, GET /targets/:targetId/scans, GET /targets/:targetId/trends)
  if (url.match(/targets(\/|\?|$)/i) && method === 'get') {
    return config;
  }

  // 16. Scan Comparison (GET /scans/compare/:targetId/result)
  if (url.match(/scans\/compare\/[^/]+\/result(\?|$)/i) && method === 'get') {
    return config;
  }

  // 17. Deleted Scans Archive (GET /scans/deleted)
  if (url.match(/scans\/deleted(\?|$)/i) && method === 'get') {
    return config;
  }

  // 18. Soft-Delete Scan (PATCH /scans/:scanId/delete)
  if (url.match(/scans\/[^/]+\/delete(\?|$)/i) && method === 'patch') {
    return config;
  }

  // 19. Recover Deleted Scan (PATCH /scans/:scanId/recover)
  if (url.match(/scans\/[^/]+\/recover(\?|$)/i) && method === 'patch') {
    return config;
  }

  // 20. Backend Server Root & Health/Metrics (GET http://localhost:3001, GET /health, GET /health/metrics)
  if (url.match(/health(\/|\?|$)/i) && method === 'get') {
    return config;
  }
  if ((url.match(/^https?:\/\/[^/]+\/?$/i) || url === '' || url === '/') && method === 'get') {
    return config;
  }

  // Use mock adapter for all standard api endpoints

  // Helper to create synthetic Axios response
  const mockResponse = (data: any, status = 200): AxiosResponse => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
    request: {}
  });

  // 1. Scanners (API 1)
  if (url.match(/scanners$/i) && method === 'get') {
    config.adapter = async () => mockResponse({
      success: true,
      data: mockService.getAvailableScanners()
    });
    return config;
  }

  // 2. Scans (API 2: Create Scan)
  if (url.match(/scans$/i) && method === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const scan = mockService.createScan(body);
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scan,
        duplicated: false
      }
    }, 201);
    return config;
  }

  // API 26: Deleted Scans
  if (url.match(/scans\/deleted$/i) && method === 'get') {
    const deletedScans = mockService.getDeletedScans();
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scans: deletedScans,
        pagination: { limit: 50, skip: 0, count: deletedScans.length }
      }
    });
    return config;
  }

  // API 27: Recover Scan
  const recoverMatch = url.match(/scans\/([^/]+)\/recover$/i);
  if (recoverMatch && method === 'patch') {
    const scan = mockService.recoverScan(recoverMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: { scan }
    });
    return config;
  }

  // API 25: Delete Scan
  const deleteScanMatch = url.match(/scans\/([^/]+)\/delete$/i);
  if (deleteScanMatch && method === 'patch') {
    const scan = mockService.deleteScan(deleteScanMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scan: {
          scan,
          duplicated: false
        },
        duplicated: false
      }
    });
    return config;
  }

  // API 24: Latest Scan Comparison Result
  const compareMatch = url.match(/scans\/compare\/([^/]+)\/result$/i);
  if (compareMatch && method === 'get') {
    const result = mockService.getLatestScanComparison(compareMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: result
    });
    return config;
  }

  // API 3: Get Scan Details
  const scanDetailsMatch = url.match(/scans\/([^/]+)$/i);
  if (scanDetailsMatch && method === 'get') {
    const scan = mockService.getScanById(scanDetailsMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: scan || mockService.getAllScans()[0]
    });
    return config;
  }

  // All Scans (Combines real backend scans created in session with existing list)
  if (url.match(/scans$/i) && method === 'get') {
    let recentScans: any[] = [];
    try {
      const raw = localStorage.getItem('sentrix_recent_scans');
      recentScans = raw ? JSON.parse(raw) : [];
    } catch (e) {
      // ignore
    }
    const mockScans = mockService.getActiveScans();
    const combined = [...recentScans, ...mockScans.filter((m: any) => !recentScans.some((r: any) => r._id === m._id))];
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scans: combined
      }
    });
    return config;
  }

  // 3. Targets (APIs 20, 21, 22, 23)
  // API 23: Trends
  const trendsMatch = url.match(/targets\/([^/]+)\/trends$/i);
  if (trendsMatch && method === 'get') {
    const trends = mockService.getTargetSecurityTrends(trendsMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: trends
    });
    return config;
  }

  // API 22: Target Scans History
  const targetScansMatch = url.match(/targets\/([^/]+)\/scans$/i);
  if (targetScansMatch && method === 'get') {
    const scans = mockService.getScanHistoryByTarget(targetScansMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        targetId: targetScansMatch[1],
        scans
      }
    });
    return config;
  }

  // API 21: Target Details
  const targetDetailsMatch = url.match(/targets\/([^/]+)$/i);
  if (targetDetailsMatch && method === 'get') {
    const details = mockService.getTargetDetails(targetDetailsMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: details || { target: mockService.getTargets()[0], latestScan: mockService.getAllScans()[0] }
    });
    return config;
  }

  // API 20: All Targets
  if (url.match(/targets$/i) && method === 'get') {
    const items = mockService.getTargets();
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        items,
        pagination: { limit: 50, skip: 0 }
      }
    });
    return config;
  }

  // 4. Findings (APIs 4, 5, 6)
  // API 6: Update Finding Status
  const findingPatchMatch = url.match(/findings\/([^/]+)$/i);
  if (findingPatchMatch && method === 'patch') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const updated = mockService.updateFindingStatus(findingPatchMatch[1], body.status);
    config.adapter = async () => mockResponse({
      success: true,
      data: { finding: updated }
    });
    return config;
  }

  // API 4 & 5: Get Findings (all or by scanId)
  if (url.match(/findings/i) && method === 'get') {
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const scanId = searchParams.get('scanId');
    const findings = scanId ? mockService.getFindingsByScanId(scanId) : mockService.getAllFindings();
    config.adapter = async () => mockResponse({
      success: true,
      data: { findings }
    });
    return config;
  }

  // 5. Evidence (APIs 7, 8)
  const evidenceSingleMatch = url.match(/evidence\/([^/]+)$/i);
  if (evidenceSingleMatch && method === 'get') {
    const ev = mockService.getEvidenceById(evidenceSingleMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: { evidence: ev || mockService.getEvidenceByScanId('')[0] }
    });
    return config;
  }

  if (url.match(/evidence/i) && method === 'get') {
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const scanId = searchParams.get('scanId') || '';
    const evidence = scanId ? mockService.getEvidenceByScanId(scanId) : mockService.getEvidenceByScanId('scan_v4_completed');
    config.adapter = async () => mockResponse({
      success: true,
      data: { evidence }
    });
    return config;
  }

  // 6. Crawls (APIs 17, 18, 19)
  const crawlInputsMatch = url.match(/crawls\/([^/]+)\/inputs$/i);
  if (crawlInputsMatch && method === 'get') {
    const scanId = crawlInputsMatch[1];
    const inputs = mockService.getDiscoveredInputs(scanId);
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scanId,
        pagination: { limit: 50, skip: 0, total: inputs.length, hasMore: false },
        pages: mockService.getCrawledPages(scanId)
      }
    });
    return config;
  }

  const crawlPagesMatch = url.match(/crawls\/([^/]+)\/pages$/i);
  if (crawlPagesMatch && method === 'get') {
    const scanId = crawlPagesMatch[1];
    const pages = mockService.getCrawledPages(scanId);
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scanId,
        pagination: { limit: 50, skip: 0, total: pages.length, hasMore: false },
        pages
      }
    });
    return config;
  }

  const crawlDetailsMatch = url.match(/crawls\/([^/]+)$/i);
  if (crawlDetailsMatch && method === 'get') {
    const scanId = crawlDetailsMatch[1];
    config.adapter = async () => mockResponse({
      success: true,
      data: mockService.getCrawlDetails(scanId)
    });
    return config;
  }

  // 7. Reports (APIs 9, 10, 11)
  // API 9: Generate Report
  if (url.match(/reports$/i) && method === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const report = mockService.createReport(body.scanId, body.format);
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        report,
        queued: true,
        duplicated: false
      }
    });
    return config;
  }

  // API 11: Reports by Scan ID
  if (url.match(/reports\?scanId=/i) && method === 'get') {
    const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const scanId = searchParams.get('scanId') || 'scan_v4_completed';
    const repData = mockService.getReportsByScanId(scanId);
    config.adapter = async () => mockResponse({
      success: true,
      data: repData
    });
    return config;
  }

  // API 10: Report by ID
  const reportByIdMatch = url.match(/reports\/([^/?]+)$/i);
  if (reportByIdMatch && method === 'get') {
    const rep = mockService.getReportById(reportByIdMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: { report: rep || mockService.getAllReports()[0] }
    });
    return config;
  }

  // All Reports
  if (url.match(/reports$/i) && method === 'get') {
    config.adapter = async () => mockResponse({
      success: true,
      data: { reports: mockService.getAllReports() }
    });
    return config;
  }

  // 8. Company Rules (APIs 12, 13, 14, 15, 16)
  const ruleSingleMatch = url.match(/company-rules\/([^/]+)$/i);
  if (ruleSingleMatch) {
    const ruleId = ruleSingleMatch[1];
    if (method === 'get') {
      const rule = mockService.getCompanyRuleById(ruleId);
      config.adapter = async () => mockResponse({
        success: true,
        data: { rule }
      });
      return config;
    }
    if (method === 'patch') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const rule = mockService.updateCompanyRule(ruleId, body);
      config.adapter = async () => mockResponse({
        success: true,
        data: { rule }
      });
      return config;
    }
    if (method === 'delete') {
      const deleted = mockService.deleteCompanyRule(ruleId);
      config.adapter = async () => mockResponse({
        success: true,
        data: { deleted, ruleId }
      });
      return config;
    }
  }

  if (url.match(/company-rules$/i)) {
    if (method === 'get') {
      const rules = mockService.getCompanyRules();
      config.adapter = async () => mockResponse({
        success: true,
        data: { rules, count: rules.length }
      });
      return config;
    }
    if (method === 'post') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const rule = mockService.createCompanyRule(body);
      config.adapter = async () => mockResponse({
        success: true,
        data: { rule }
      });
      return config;
    }
  }

  // 9. Scopes (APIs 28, 29, 30, 31, 32)
  const scopeSingleMatch = url.match(/scopes\/([^/]+)$/i);
  if (scopeSingleMatch) {
    const scopeId = scopeSingleMatch[1];
    if (method === 'get') {
      const scope = mockService.getScopeById(scopeId);
      config.adapter = async () => mockResponse({
        success: true,
        data: { scope }
      });
      return config;
    }
    if (method === 'patch') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const scope = mockService.updateScope(scopeId, body);
      config.adapter = async () => mockResponse({
        success: true,
        data: { scope }
      });
      return config;
    }
    if (method === 'delete') {
      const deleted = mockService.deleteScope(scopeId);
      config.adapter = async () => mockResponse({
        success: true,
        data: { deleted, scopeId }
      });
      return config;
    }
  }

  if (url.match(/scopes$/i)) {
    if (method === 'get') {
      const scopes = mockService.getScopes();
      config.adapter = async () => mockResponse({
        success: true,
        data: { scopes }
      });
      return config;
    }
    if (method === 'post') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const scope = mockService.createScope(body);
      config.adapter = async () => mockResponse({
        success: true,
        data: { scope }
      });
      return config;
    }
  }

  // 10. Admin Users & Platform Governance - Handled live by backend API
  // Requests to /users, /users/:id/status, /users/:id/role route directly to backend without mock interceptor

  // Auth mock removed: routes directly to backend
  if (false) {
    let email = '';
    try {
      const parsed = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      email = (parsed?.email || '').toLowerCase().trim();
    } catch {
      // ignore
    }

    let role = 'security_engineer';
    let name = 'Jane Smith';
    let id = 'usr_sec';

    if (email.includes('admin')) {
      role = 'admin';
      name = 'System Admin';
      id = 'usr_admin';
    } else if (email.includes('dev')) {
      role = 'developer';
      name = 'Alex Rivera';
      id = 'usr_dev';
    } else if (email.includes('malware') || email.includes('sarah') || email.includes('analyst')) {
      role = 'malware_analyst';
      name = 'Sarah Connor';
      id = 'usr_malware';
    } else if (email.includes('john') || email.includes('owner') || email.includes('acmecorp')) {
      role = 'client_owner';
      name = 'John Doe';
      id = 'usr_client';
    } else if (email.includes('member')) {
      role = 'client_member';
      name = 'Team Member';
      id = 'usr_member';
    }

    config.adapter = async () => mockResponse({
      success: true,
      data: {
        token: `sentrix_jwt_${role}_token`,
        user: {
          id,
          name,
          email: email || `${role}@sentrix.local`,
          role,
          organizationId: 'org_acme_corp'
        }
      }
    });
    return config;
  }

  return config;
});

export default api;
