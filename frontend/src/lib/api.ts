import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { mockService } from './mockService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
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

/**
 * Frontend Mock Adapter:
 * Ensures all 32 APIs defined in frontend_remade.md are answered directly from
 * rich in-memory / localStorage mock data, without needing a running backend.
 */
api.interceptors.request.use(async (config) => {
  // Use mock adapter for all standard api endpoints
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

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

  // All Scans
  if (url.match(/scans$/i) && method === 'get') {
    config.adapter = async () => mockResponse({
      success: true,
      data: {
        scans: mockService.getActiveScans()
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

  // 10. Admin Users & Platform Governance
  const adminUserStatusMatch = url.match(/admin\/users\/([^/]+)\/status$/i);
  if (adminUserStatusMatch && (method === 'put' || method === 'patch')) {
    const updated = mockService.toggleAdminUserStatus(adminUserStatusMatch[1]);
    config.adapter = async () => mockResponse({
      success: true,
      data: updated
    });
    return config;
  }

  if (url.match(/admin\/users/i)) {
    if (method === 'get') {
      const users = mockService.getAdminUsers();
      config.adapter = async () => mockResponse({
        success: true,
        count: users.length,
        data: users
      });
      return config;
    }
    if (method === 'post') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const newUser = mockService.createAdminUser(body);
      config.adapter = async () => mockResponse({
        success: true,
        data: newUser
      }, 201);
      return config;
    }
  }

  // Auth mock endpoints (so login & register always work)
  if (url.match(/auth\/login/i) && method === 'post') {
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
