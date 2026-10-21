# 🛡️ Sentrix Cybersecurity Platform

> **Enterprise-Grade Autonomous Web Security Operations, Vulnerability Triage, Attack Surface Discovery & Malware Remediation Platform.**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js_20-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Autonomous Scanner Engine (25 Scanners)](#-autonomous-scanner-engine-25-scanners)
- [Unified Platform APIs (32 Endpoints)](#-unified-platform-apis-32-endpoints)
- [System Architecture](#-system-architecture)
- [New Frontend UI Architecture](#-new-frontend-ui-architecture)
- [Standalone Frontend Mock Mode](#-standalone-frontend-mock-mode)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Live Services & Port Map](#-live-services--port-map)
- [Quick Start Guide (Docker)](#-quick-start-guide-docker)
- [Default Verified Accounts](#-default-verified-accounts)
- [Inspecting the Live Database](#-inspecting-the-live-database)
- [Key Features](#-key-features)
- [Complete REST API Reference](#-complete-rest-api-reference)
- [Environment Configuration](#-environment-configuration)
- [Local Development Without Docker](#-local-development-without-docker)
- [License](#-license)

---

## 🌐 Overview

**Sentrix** is a production-grade cybersecurity operations platform designed to bridge the gap between security researchers, developers, platform administrators, and executive stakeholders. It provides:

- **25 Specialized Recon & Security Scanners**: Autonomous, bounded asset discovery and vulnerability probes with strict safety constraints.
- **32 Unified Platform APIs**: Standardized contract covering scans, findings, raw HTTP evidence, crawl graphs, targets, scopes, rules, and reports.
- **Differential Scan Comparison & Risk Trends**: Automated multi-version differential analysis (persistent vs. new vs. resolved vulnerabilities) and historical posture tracking.
- **Deep HTTP Evidence Inspector**: Raw request/response inspection with header analysis, expected vs. observed diffs, and 1-click cURL reproduction commands.
- **Corporate Rules & Boundary Scopes Engine**: Define authorized hostnames, ports, and subdomains, paired with custom compliance policies (e.g., mandatory HSTS, disallowed CORS wildcards).
- **Audit-Compliant Soft-Delete & Recovery**: Safe retention for scan archives with audit reasons and instant one-click restoration.
- **Unified Vulnerability Management**: Track vulnerabilities across their entire lifecycle (Discovery $\rightarrow$ Triage $\rightarrow$ Remediation $\rightarrow$ Retest $\rightarrow$ Resolution).
- **Malware Analysis Sandbox**: Static analysis, dynamic emulation, behavioral heuristics, and IOC extraction.
- **Integrated Payment Gateway**: Real-time Chapa integration supporting local and international payment methods (telebirr, CBEBirr, Awash, Amole, and Card).

---

## 🧩 Autonomous Scanner Engine (25 Scanners)

The platform supports 25 distinct scanners categorized into Reconnaissance and Security:

### 🔭 Reconnaissance Scanners (10 Modules)
| Scanner ID | Module Name | Description |
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
| Scanner ID | Module Name | Description |
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

## 📡 Unified Platform APIs (32 Endpoints)

The platform is designed around 32 core REST endpoints (specified in `frontend_remade.md`):

| API # | Method | Endpoint | Description | Frontend Integration |
| :--- | :--- | :--- | :--- | :--- |
| **API 1** | `GET` | `/api/v1/scanners` | List available Recon and Security scanners | Assessment Wizard |
| **API 2** | `POST` | `/api/v1/scans` | Create and launch automated security scan | Assessment Wizard |
| **API 3** | `GET` | `/api/v1/scans/:id` | Get detailed scan outcomes and telemetry | Scan Results & Progress |
| **API 4** | `GET` | `/api/v1/findings` | Get all platform security findings | Findings Triage Board |
| **API 5** | `GET` | `/api/v1/findings?scanId=:id` | Get findings specific to a scan ID | Scan Results |
| **API 6** | `PATCH` | `/api/v1/findings/:id` | Update finding status (`accepted`, `resolved`, etc.) | Findings Triage Board |
| **API 7** | `GET` | `/api/v1/evidence?scanId=:id` | List raw evidence HTTP exchanges for scan | Scan Results |
| **API 8** | `GET` | `/api/v1/evidence/:id` | Get specific HTTP exchange evidence details | Evidence Inspector Modal |
| **API 9** | `POST` | `/api/v1/reports` | Generate PDF, HTML, or JSON security report | Reports Center |
| **API 10** | `GET` | `/api/v1/reports/:id` | Get report details and Cloudinary storage URL | Report Preview Modal |
| **API 11** | `GET` | `/api/v1/reports?scanId=:id` | Get all format variants for a scan run | Reports Center |
| **API 12** | `POST` | `/api/v1/company-rules` | Create custom corporate security policy | Company Policies |
| **API 13** | `GET` | `/api/v1/company-rules` | List all active corporate security rules | Company Policies |
| **API 14** | `GET` | `/api/v1/company-rules/:id` | Get specific company rule definition | Edit Policy Modal |
| **API 15** | `PATCH` | `/api/v1/company-rules/:id` | Update company rule parameters | Edit Policy Modal |
| **API 16** | `DELETE`| `/api/v1/company-rules/:id` | Delete company rule | Company Policies |
| **API 17** | `GET` | `/api/v1/crawls/:id` | Get crawler execution stats (depth, paths, rate) | Scan Results |
| **API 18** | `GET` | `/api/v1/crawls/:id/pages` | List crawled pages and discovered links | Crawled Pages Tab |
| **API 19** | `GET` | `/api/v1/crawls/:id/inputs` | List discovered interactive inputs & buttons | Discovered Inputs Tab |
| **API 20** | `GET` | `/api/v1/targets` | List all monitored target assets & versions | Target Inventory |
| **API 21** | `GET` | `/api/v1/targets/:id` | Get target details and latest scan telemetry | Target Details |
| **API 22** | `GET` | `/api/v1/targets/:id/scans` | Get chronological scan history for target | Scan History Tab |
| **API 23** | `GET` | `/api/v1/targets/:id/trends` | Multi-version security risk score trends | Security Trends Tab |
| **API 24** | `GET` | `/api/v1/scans/compare/:id/result` | Differential scan comparison (persistent vs new vs resolved) | Scan Comparison Diff Tab |
| **API 25** | `PATCH` | `/api/v1/scans/:id/delete` | Soft-delete scan run with audit reason | Scan Results & History |
| **API 26** | `GET` | `/api/v1/scans/deleted` | List soft-deleted scans in retention | Deleted Scans Archive |
| **API 27** | `PATCH` | `/api/v1/scans/:id/recover` | Restore soft-deleted scan back to completed | Deleted Scans Archive |
| **API 28** | `POST` | `/api/v1/scopes` | Create authorized security boundary scope | Security Scopes |
| **API 29** | `GET` | `/api/v1/scopes` | List all authorized security scopes | Security Scopes |
| **API 30** | `GET` | `/api/v1/scopes/:id` | Get security scope details | Edit Scope Modal |
| **API 31** | `PATCH` | `/api/v1/scopes/:id` | Update scope hostnames, ports, subdomains | Edit Scope Modal |
| **API 32** | `DELETE`| `/api/v1/scopes/:id` | Delete security scope | Security Scopes |

---

## 🏗️ System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │             Host Browser (User)              │
                               └──────┬──────────────────┬──────────────┬─────┘
                                      │ :5173            │ :3001        │ :8081
                                      ▼                  ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Docker Network (scentrix_cyber_platform_default)                            │
│                                                                             │
│   ┌────────────────────────────────┐       ┌────────────────────────────┐  │
│   │          sentrix-web           │       │        sentrix-api         │  │
│   │ (React 19 / Vite / Tailwind)   │──────▶│  (Express 5 / Mongoose)    │  │
│   │  • 25 Scanner Config Matrix    │       │  • 32 Unified API Engine   │  │
│   │  • Offline Mock Interceptor    │       │  • Auth & Chapa Payments   │  │
│   │  • Evidence & Diff Viewers     │       │  • Malware Analysis Sandbox│  │
│   │           Port: 5173           │       │         Port: 3001         │  │
│   └────────────────────────────────┘       └─────────────┬──────────────┘  │
│                                                          │                  │
│                                                          ▼                  │
│                                               ┌──────────────────────┐      │
│                                               │    sentrix-mongo     │      │
│   ┌─────────────────────┐                     │   (MongoDB Engine)   │      │
│   │sentrix-mongo-express│────────────────────▶│      Port: 27017     │      │
│   │ (Database Web GUI)  │                     └──────────┬───────────┘      │
│   │     Port: 8081      │                                │                  │
│   └─────────────────────┘                                ▼                  │
│                                               ┌──────────────────────┐      │
│                                               │ Volume: mongodb_data │      │
│                                               └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ New Frontend UI Architecture

The frontend (`frontend/`) contains tailored operational workspaces and deep security views:

1. **Evidence Inspector Modal (`EvidenceViewer.tsx`)**:
   - Inspect raw HTTP requests and responses.
   - Response headers inspector (`Content-Security-Policy`, `Strict-Transport-Security`, etc.).
   - Observed vs. expected vulnerability validation with cryptographic signatures.
   - **1-Click Copy cURL** command for terminal reproduction.

2. **Target Inventory & Posture Trends (`Projects.tsx` & `ProjectDetail.tsx`)**:
   - Monitored assets table with live risk indicators (`Safe`, `Elevated`, `Critical`).
   - Chronological scan history and multi-version trend charts (v1 $\rightarrow$ v4).
   - Differential scan comparison diff view highlighting **persistent vulnerabilities**, **regressions**, and **resolved issues**.

3. **Autonomous Assessment Wizard (`AssessmentWizard.tsx`)**:
   - Multi-step scanner configuration matrix for all 25 Recon and Security scanners.
   - Scope snapshot selection and company policy attachment.
   - Pre-scan safety acknowledgment and boundary verification.

4. **Crawl & Input Explorer (`ScanResults.tsx`)**:
   - Visualizes crawled URLs, depth levels, and internal link topologies.
   - Form input inspection tracking tags, input types, and accessibility aria-labels.

5. **Security Scopes Management (`Scopes.tsx`)**:
   - Define authorized target boundaries: allowed hostnames, port ranges, and subdomain wildcards.
   - Full CRUD modal workflows with validation.

6. **Corporate Security Rules Engine (`CompanyRules.tsx`)**:
   - Custom rule builder for corporate compliance (e.g., mandatory HSTS headers or disallowed CORS wildcards).
   - Real-time toggles to activate/deactivate rules across all future scan runs.

7. **Soft-Deleted Scans Archive (`DeletedScans.tsx`)**:
   - Safe retention bin with audit reason logging and 1-click scan recovery.

---

## ⚡ Standalone Frontend Mock Mode

The frontend includes a self-contained **Mock Service & Axios Interceptor** that enables complete offline functionality with rich, interactive data:

- **Zero-Backend Dependency**: Runs immediately via `npm run dev` in `frontend/` without needing MongoDB or the backend running.
- **Stateful In-Memory & LocalStorage Engine**:
  - Full CRUD operations across all 32 APIs (scopes, rules, findings, targets, scans).
  - Status updates (`accepted`, `resolved`, `false_positive`) persist immediately.
  - Soft-deleting scans moves them to the retention bin; one-click recovery restores them in real time.
  - Generating reports creates downloadable PDF/HTML/JSON mock artifacts.
- **Live Simulated Telemetry**: Launching a scan simulates active worker progression, finding discovery, and transitions smoothly to completion.

---

## 👥 Role-Based Access Control (RBAC)

Authentication is strictly enforced. Each user is routed strictly to their dedicated workspace based on their verified role:

| Role | Target Workspace | Primary Responsibilities |
| :--- | :--- | :--- |
| **Platform Admin** (`admin`) | `/dashboard/admin` | User provisioning, audit governance, system configurations, tenant control. |
| **Security Engineer** (`security_engineer`) | `/dashboard` | Vulnerability assessment, scan pipelines, pen-test findings, severity scoring. |
| **Client Owner** (`client_owner`) | `/dashboard` & `/dashboard/billing` | Executive overview, asset tracking, project scoping, subscription payments via Chapa. |
| **Malware Analyst** (`malware_analyst`) | `/dashboard/malware` | Static binary disassembly, behavioral traces, IOC extraction, Yara/MITRE mapping. |
| **Remediation Dev** (`developer`) | `/dashboard/remediation` | Kanban workflow, patch development, remediation tickets, verification requests. |

---

## 🚀 Live Services & Port Map

When running with Docker, all services are mapped to localhost:

| Service | Container Name | Host URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `sentrix-web` | [http://localhost:5173](http://localhost:5173) | Single-Page Application (SPA) with dark cyber UI |
| **Backend REST API** | `sentrix-api` | [http://localhost:3001/api](http://localhost:3001/api) | Express API, auth guards, business logic |
| **API Health Check** | `sentrix-api` | [http://localhost:3001/api/health](http://localhost:3001/api/health) | Live container health probe |
| **Database Web GUI** | `sentrix-mongo-express`| [http://localhost:8081](http://localhost:8081) | Interactive table and document viewer |
| **Database Server** | `sentrix-mongo` | `localhost:27017` | MongoDB 8.x document store |

---

## ⚡ Quick Start Guide (Docker)

Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.

### 1. Launch the Stack
Run from the project root:
```bash
docker compose up -d
```
*Starts MongoDB, the Express Backend API, the React Frontend, and Mongo Express in detached mode.*

### 2. Seed the Database
Populate verified test accounts, enterprise projects, findings, and malware cases:
```bash
docker compose exec api npm run seed
```

### 3. Open the Application
Navigate to **[http://localhost:5173](http://localhost:5173)** in your browser.

### 4. Stop the Stack
```bash
docker compose down
```
*(All data is safely persisted in the `mongodb_data` volume and will be available on next startup).*

---

## 🔑 Default Verified Accounts

All seeded accounts use the password: **`password123`**

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Platform Admin** | `admin@sentrix.local` | Full platform governance, create new users, system audits. |
| **Security Engineer** | `jane@sentrix.local` | Create findings, run automated scans, triage vulnerabilities. |
| **Client Owner** | `john@acmecorp.local` | View Acme Corp portal, initialize Chapa billing & upgrades. |
| **Malware Analyst** | `sarah@sentrix.local` | Analyze suspicious binaries, extract IOCs, submit analysis. |
| **Remediation Dev** | `dev@sentrix.local` | Manage Kanban fix boards, submit patches, verify resolutions. |

---

## 🔍 Inspecting the Live Database

You have two easy ways to view all database tables (collections) and documents:

### Method A: Web GUI (Mongo Express)
1. Open **[http://localhost:8081](http://localhost:8081)**.
2. Click on the **`sentrix`** database.
3. Browse and edit collections visually:
   - `users`
   - `projects`
   - `findings`
   - `malwarecases`
   - `organizations`
   - `transactions`
   - `assessments`

### Method B: Terminal / Docker Desktop
From any terminal:
```bash
# View all tables (collections)
docker exec sentrix-mongo mongosh sentrix --eval "show collections"

# View all registered users
docker exec sentrix-mongo mongosh sentrix --eval "db.users.find({}, {email: 1, role: 1, _id: 0})"

# Open interactive MongoDB shell
docker exec -it sentrix-mongo mongosh sentrix
```

---

## ✨ Key Features

### 1. 25 Autonomous Recon & Security Scanners
- Complete scanner matrix covering network exposure, DNS records, TLS health, web technology fingerprinting, SQL injection, reflected/DOM XSS, CORS wildcards, CSRF protection, and SSRF surface detection.

### 2. Deep HTTP Evidence Inspection & Reproduction
- Inspect raw HTTP requests and responses for every reported finding.
- Copy 1-click terminal-ready `curl` command with exact headers and payloads for instant independent verification.

### 3. Scope Boundaries & Corporate Policy Enforcement
- Configure strict asset boundaries (allowed domains, ports, subdomains) before scans begin.
- Define corporate rules (e.g. HSTS enforcement, cookie security) and enforce them across automated scans.

### 4. Differential Scan Comparison & Posture Trends
- Automated differential comparison across target scan runs (`scan-v1` vs. `scan-v2`).
- Distinguishes persistent vulnerabilities, newly introduced regressions, and successfully resolved issues.

### 5. Multi-Channel Payment Forms (Chapa Integration)
- Dynamic payment methods with specialized, responsive checkout forms:
  - **telebirr**: Mobile number validation (`+2519...` / `+2517...`).
  - **CBEBirr / Commercial Bank of Ethiopia**: Direct CBE account integration.
  - **Awash Bank / AwashPay**: Secure internet banking redirection.
  - **Amole / Dashen Bank**: Verified Amole identifier support.
  - **Credit / Debit Cards**: Visa and MasterCard processing.
- Direct Chapa API transaction initialization and verification flow (`/api/payments/verify/:tx_ref`).

### 6. Admin User Creation Engine
- Platform Admins can provision new users directly from the Admin console (`/dashboard/admin`).
- Secure cryptographic password hashing with `bcryptjs` (salt rounds: 10).
- Immediate assignment of any system role (`security_engineer`, `client_owner`, `developer`, `malware_analyst`, `admin`).

---

## 📡 Complete REST API Reference

### Unified Platform Endpoints (`/api/v1`)
See the [32 Unified Platform APIs](#-unified-platform-apis-32-endpoints) table for complete specification.

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user and receive signed JWT | No |
| `POST` | `/api/auth/register` | Register new organization and client owner | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & role | Yes |
| `POST` | `/api/auth/logout` | Invalidate active session | Yes |

### Admin Governance (`/api/admin`)
| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/users` | Create new system user with assigned role | `admin` |
| `GET` | `/api/admin/users` | List all registered system users | `admin` |
| `GET` | `/api/admin/stats` | Platform-wide operational statistics | `admin` |

### Security Findings & Projects (`/api/findings`, `/api/projects`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/projects` | List all scoped security projects | Yes |
| `POST` | `/api/projects` | Create a new security assessment project | Yes |
| `GET` | `/api/findings` | Query vulnerability findings with filters | Yes |
| `POST` | `/api/findings` | Report a new vulnerability finding | Yes |
| `PATCH` | `/api/findings/:id` | Update finding status or remediation notes | Yes |

### Chapa Payments (`/api/payments`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/initialize` | Generate Chapa transaction checkout URL | Yes |
| `GET` | `/api/payments/verify/:tx_ref` | Query Chapa API and update transaction status | Yes |
| `GET` | `/api/payments/history` | View organization transaction history | Yes |

---

## ⚙️ Environment Configuration

Environment variables are managed inside `docker-compose.yml` for containerized runs, and via `.env` files for local development:

### Backend (`backend/.env`)
```ini
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/sentrix
JWT_SECRET=super-secret-development-key-change-in-production
NODE_ENV=development

# Chapa Payment Gateway
CHAPA_SECRET_KEY=CHAPA_TEST_PRIV_Y_E5QaFeS-kuM_j64hccd-5RQ5IuTaiGQU8_uNJC
CHAPA_PUBLIC_KEY=CHAPA_TEST_PUB_RGZaLprTEfS8H-13PnxA85jgJqzTFp3p2iUyDiG6
CHAPA_BASE_URL=https://api.chapa.global/v1
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:3001/api
```

---

## 💻 Local Development Without Docker

If you prefer to run services natively on your host machine:

### 1. Frontend Standalone (With Mock Engine)
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```
*No backend or MongoDB required! The frontend mock engine handles all 32 APIs, state persistence, and simulated scans.*

### 2. Full-Stack Local Development
1. **Start MongoDB**: Ensure a local MongoDB server is listening on port `27017`.
2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   npm run seed     # Seeds default users & projects
   npm run dev      # Starts API on http://localhost:3001
   ```
3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev      # Starts Vite dev server on http://localhost:5173
   ```

---

## 🛡️ License

This project is licensed under the **ISC License**.
