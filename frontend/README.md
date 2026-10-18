# 🛡️ Sentrix Cybersecurity Platform — Frontend

> **Modern Autonomous Web Security Operations, Vulnerability Triage, Attack Surface Discovery & Compliance Platform.**

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Zustand**.

---

## 📋 Overview

The Sentrix Frontend has been completely remade to align with the **32 Unified Platform APIs** defined in `frontend_remade.md`. It features an interactive, self-contained **Frontend Mock Engine** that enables full offline development, seamless visual testing, and persistent client-side state without requiring a backend server.

---

## ⚡ Quick Start

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev

# Build for production
npm run build
```

The frontend will be available at **[http://localhost:5173/dashboard](http://localhost:5173/dashboard)**.

---

## 🧩 Autonomous Scanner Engine (25 Scanners)

The platform supports 25 distinct scanners categorized into Reconnaissance and Security:

### 🔭 Reconnaissance Scanners (10 Modules)
| Scanner ID | Name | Description |
| :--- | :--- | :--- |
| `portScan` | Port Scan | Discovers accessible network ports on the authorized target host. |
| `serviceDetection` | Service Detection | Identifies web services and server software exposed by the target. |
| `versionDetection` | Version Detection | Detects publicly exposed service and technology versions. |
| `dns` | DNS Reconnaissance | Collects common DNS records for the authorized hostname. |
| `subdomains` | Subdomain Discovery | Performs bounded discovery of subdomains under the target domain. |
| `technology` | Technology Detection | Detects common web technologies using passive signatures. |
| `webServer` | Web Server Detection | Identifies web-server information from HTTP response headers. |
| `ssl` | SSL/TLS Reconnaissance | Collects TLS protocol, cipher suites, and certificate chains. |
| `robots` | Robots.txt Recon | Retrieves and parses the target robots.txt resource. |
| `sitemap` | Sitemap Recon | Discovers URLs exposed through standard XML sitemap resources. |

### 🔒 Security & Vulnerability Probes (15 Modules)
| Scanner ID | Name | Description |
| :--- | :--- | :--- |
| `sqli` | SQL Injection Detection | Conservative SQL error-surface assessment via controlled parameter fuzzing. |
| `xss` | Cross-Site Scripting | Bounded reflected-input marker testing and DOM sink detection. |
| `securityHeaders` | Security Headers | Validates defensive response headers (CSP, HSTS, X-Content-Type-Options, etc.). |
| `cors` | CORS Security | Audits Cross-Origin Resource Sharing for wildcard (`*`) and untrusted origins. |
| `pathTraversal` | Path Traversal | Detects controlled path traversal and directory escape indicators. |
| `openRedirect` | Open Redirect | Checks whether URL parameters permit unvalidated external redirection. |
| `csrf` | CSRF Protection | Passive assessment of form-based CSRF protection tokens and SameSite cookies. |
| `accessControl` | Access Control | Bounded unauthenticated access-control and horizontal privilege testing. |
| `authentication` | Authentication Security | Headless inspection of public login forms without credential brute-force. |
| `session` | Session Security | Audits session cookie security attributes (`HttpOnly`, `Secure`, `SameSite`). |
| `ssrf` | SSRF Surface Detection | Checks URL-like parameters for server-side retrieval behavior. |
| `commandInjection` | Command Injection | Conservative command delimiter assessment without executing hostile commands. |
| `jwt` | JWT Security | Detects exposed JWT tokens and reports structural cryptographic weakness. |
| `apiSecurity` | API Security | Bounded discovery of OpenAPI documentation and exposed API surfaces. |
| `fileUpload` | File Upload Security | Detects public file-upload forms and checks client-visible restrictions. |

---

## 📡 32 Unified APIs Implemented

The frontend integrates all 32 core platform APIs:

| API # | Method | Endpoint | Description | Frontend View |
| :--- | :--- | :--- | :--- | :--- |
| **API 1** | `GET` | `/api/v1/scanners` | List available Recon and Security scanners | New Assessment Wizard |
| **API 2** | `POST` | `/api/v1/scans` | Create and launch automated security scan | Assessment Wizard |
| **API 3** | `GET` | `/api/v1/scans/[id]` | Get detailed scan outcomes and telemetry | Scan Results & Progress |
| **API 4** | `GET` | `/api/v1/findings` | Get all platform security findings | Findings Triage Board |
| **API 5** | `GET` | `/api/v1/findings?scanId=[id]` | Get findings specific to a scan ID | Scan Results |
| **API 6** | `PATCH` | `/api/v1/findings/[id]` | Update finding status (`accepted`, `resolved`, etc.) | Findings Triage Board |
| **API 7** | `GET` | `/api/v1/evidence?scanId=[id]` | List raw evidence HTTP exchanges for scan | Scan Results |
| **API 8** | `GET` | `/api/v1/evidence/[id]` | Get specific HTTP exchange evidence details | Evidence Inspector Modal |
| **API 9** | `POST` | `/api/v1/reports` | Generate PDF, HTML, or JSON security report | Reports Center |
| **API 10** | `GET` | `/api/v1/reports/[id]` | Get report details and Cloudinary storage URL | Report Preview Modal |
| **API 11** | `GET` | `/api/v1/reports?scanId=[id]` | Get all format variants for a scan run | Reports Center |
| **API 12** | `POST` | `/api/v1/company-rules` | Create custom corporate security policy | Company Policies |
| **API 13** | `GET` | `/api/v1/company-rules` | List all active corporate security rules | Company Policies |
| **API 14** | `GET` | `/api/v1/company-rules/[id]` | Get specific company rule definition | Edit Policy Modal |
| **API 15** | `PATCH` | `/api/v1/company-rules/[id]` | Update company rule parameters | Edit Policy Modal |
| **API 16** | `DELETE`| `/api/v1/company-rules/[id]` | Delete company rule | Company Policies |
| **API 17** | `GET` | `/api/v1/crawls/[id]` | Get crawler execution stats (depth, paths, rate) | Scan Results |
| **API 18** | `GET` | `/api/v1/crawls/[id]/pages` | List crawled pages and discovered links | Crawled Pages Tab |
| **API 19** | `GET` | `/api/v1/crawls/[id]/inputs` | List discovered interactive inputs & buttons | Discovered Inputs Tab |
| **API 20** | `GET` | `/api/v1/targets` | List all monitored target assets & versions | Target Inventory |
| **API 21** | `GET` | `/api/v1/targets/[id]` | Get target details and latest scan telemetry | Target Details |
| **API 22** | `GET` | `/api/v1/targets/[id]/scans` | Get chronological scan history for target | Scan History Tab |
| **API 23** | `GET` | `/api/v1/targets/[id]/trends` | Multi-version security risk score trends | Security Trends Tab |
| **API 24** | `GET` | `/api/v1/scans/compare/[id]/result`| Differential scan comparison (persistent vs new vs resolved) | Scan Comparison Diff Tab |
| **API 25** | `PATCH` | `/api/v1/scans/[id]/delete` | Soft-delete scan run | Scan Results |
| **API 26** | `GET` | `/api/v1/scans/deleted` | List soft-deleted scans in retention | Deleted Scans Archive |
| **API 27** | `PATCH` | `/api/v1/scans/[id]/recover` | Restore soft-deleted scan back to completed | Deleted Scans Archive |
| **API 28** | `POST` | `/api/v1/scopes` | Create authorized security boundary scope | Security Scopes |
| **API 29** | `GET` | `/api/v1/scopes` | List all authorized security scopes | Security Scopes |
| **API 30** | `GET` | `/api/v1/scopes/[id]` | Get security scope details | Edit Scope Modal |
| **API 31** | `PATCH` | `/api/v1/scopes/[id]` | Update scope hostnames, ports, subdomains | Edit Scope Modal |
| **API 32** | `DELETE`| `/api/v1/scopes/[id]` | Delete security scope | Security Scopes |

---

## 🖥️ UI Architecture & Key Features

* **Evidence Inspector Modal (`EvidenceViewer.tsx`)**:
  * Inspect raw HTTP requests and responses.
  * Server response headers inspector (HSTS, CSP, Cache, etc.).
  * Observation expected vs. actual comparison with cryptographic fingerprints.
  * 1-click **Copy cURL** reproduction command.

* **Target Posture Trends & Scan Diffs (`ProjectDetail.tsx`)**:
  * Tracks risk score history across multiple versions (v1 failed, v2, v3, v4 completed).
  * Automated differential comparison highlighting **persistent vulnerabilities**, **regressions**, and **resolved issues**.

* **Crawl & Input Explorer (`ScanResults.tsx`)**:
  * Visualizes crawled URLs, depth levels, and internal link topologies.
  * Form input inspection tracking tags, input types, and accessibility aria-labels.

* **Corporate Security Policies (`CompanyRules.tsx`)**:
  * Custom rule builder for corporate standards (e.g. mandatory HSTS headers or disallowed CORS wildcards).
  * Direct toggle switches to enable/disable rules across all active scans.

* **Soft-Delete Archive (`DeletedScans.tsx`)**:
  * Safe retention bin with audit reason logging and 1-click scan recovery.
