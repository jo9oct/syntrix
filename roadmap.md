# Sentrix Cybersecurity Platform — Frontend + Backend Roadmap

> **Scope:** This roadmap is for the two-person implementation where **my responsibility is the React frontend + Express.js/NestJS backend + realistic mock services/data**, while the second developer later supplies/connects the real security-testing and malware-analysis engines.
>
> **Source of truth:** the supplied 31-page system specification. The architecture below preserves its required workflows, roles, RBAC, data model, API structure, and UI requirements.
>
> **Primary stack:** React + Tailwind CSS + Zustand + Express.js (recommended) + MongoDB + REST API.
>
> **Design direction:** The supplied Sentrix-style reference screens are the visual baseline: premium dark cybersecurity SaaS, glass panels, rounded cards, subtle glow, blurred network background, clean typography, gradient accents, responsive sidebar/topbar, dense but readable security data.
>
> **Brand color:** `#C9A227` (gold). Gold is the primary brand/accent color. Supporting cyan/blue/purple gradients may be used as secondary visualization accents, but must never overpower the gold brand identity.

---

## 0. Definition of Done

The implementation is considered complete for this developer's scope when:

- The public website works without authentication.
- Login/register flows work against the local mock backend/database.
- RBAC is enforced in **both frontend and backend**.
- Each role receives the correct navigation and dashboard.
- Client Owner can create organizations/projects/applications/APIs using the mock backend.
- OpenAPI import has a realistic mocked parser response and endpoint inventory UI.
- Security assessment wizard supports:
  - Select Specific Tests
  - Full Scan
  - Light / Standard / Deep intensity
  - target/scope/auth/environment configuration
  - scan progress
  - mock findings/results
- Findings → remediation → retest → verification workflow is functional with mock data.
- Public website analysis supports temporary mock website-analysis results.
- Public malware analysis supports **static-only mock analysis**.
- Malware Analyst workspace exposes advanced malware workflow screens, but the real dynamic sandbox is not implemented.
- Reports can be generated as realistic mock report records and previewed.
- Analysis History, notifications, and audit logs work with mock data.
- All major pages use one consistent design system.
- Loading, empty, error, success, confirmation, modal, drawer, toast, table, chart, and responsive states exist.
- Real engine integration points are isolated behind service interfaces/adapters.
- The second developer can replace mock adapters without rewriting the UI or route contracts.

---

# 1. Architecture Decision

## 1.1 Recommended backend: Express.js

Use **Express.js** rather than NestJS for this project because the developer is already comfortable with it and the platform benefits from a lightweight modular architecture.

Use a strict module structure so it can later grow toward NestJS-like separation without requiring a rewrite.

### Backend layers

```text
Route
  ↓
Controller
  ↓
Validation
  ↓
Authorization / RBAC
  ↓
Service
  ↓
Repository
  ↓
MongoDB
```

For engine-dependent functionality:

```text
Controller
  ↓
Service
  ↓
Engine Adapter Interface
  ├── MockSecurityEngine
  ├── RealSecurityEngine (future)
  ├── MockMalwareEngine
  └── RealMalwareEngine (future)
```

The frontend must never know whether the result came from a mock engine or a real engine.

---

# 2. Repository Structure

Recommended monorepo:

```text
sentrix/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── applications/
│   │   │   │   ├── apis/
│   │   │   │   ├── assessments/
│   │   │   │   ├── findings/
│   │   │   │   ├── remediation/
│   │   │   │   ├── retesting/
│   │   │   │   ├── reports/
│   │   │   │   ├── malware/
│   │   │   │   ├── history/
│   │   │   │   ├── organization/
│   │   │   │   ├── team/
│   │   │   │   └── administration/
│   │   │   ├── layouts/
│   │   │   ├── routes/
│   │   │   ├── stores/
│   │   │   ├── services/
│   │   │   ├── mocks/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   └── ...
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── middleware/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── organizations/
│       │   │   ├── projects/
│       │   │   ├── applications/
│       │   │   ├── apis/
│       │   │   ├── assessments/
│       │   │   ├── findings/
│       │   │   ├── remediation/
│       │   │   ├── retesting/
│       │   │   ├── reports/
│       │   │   ├── malware/
│       │   │   ├── history/
│       │   │   ├── notifications/
│       │   │   ├── audit/
│       │   │   └── administration/
│       │   ├── adapters/
│       │   │   ├── security/
│       │   │   ├── malware/
│       │   │   ├── storage/
│       │   │   └── ai/
│       │   ├── repositories/
│       │   ├── validators/
│       │   ├── utils/
│       │   └── app.ts
│       └── ...
├── packages/
│   ├── shared-types/
│   ├── shared-constants/
│   └── ui-tokens/
├── docs/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 3. Design System

## 3.1 Visual target

Use the two supplied reference images as the visual baseline:

### Reference A — public landing page

Characteristics to reproduce:

- Deep navy/black background.
- Large white headline.
- Gold brand accent integrated into headings and CTAs.
- Secondary cyan/purple glow only as supporting visual energy.
- Glass navigation bar.
- Rounded container.
- Large dashboard preview card.
- Soft background network nodes/lines.
- Premium SaaS feeling.
- Large whitespace around the hero.
- Strong typography hierarchy.

### Reference B — authenticated dashboard

Characteristics to reproduce:

- Floating/glass sidebar.
- Compact top bar.
- Dashboard cards with translucent surfaces.
- Subtle borders.
- Rounded corners.
- Chart-heavy security dashboard.
- KPI cards.
- Status badges.
- Gradient visualizations.
- Soft glow around active navigation.
- Dense information without visual clutter.
- Responsive collapse to mobile navigation.

Do not randomly redesign individual pages. Every page must look like it belongs to the same product.

---

## 3.2 Color tokens

### Brand

```text
Gold Primary:       #C9A227
Gold Bright:        #E6C75A
Gold Soft:          #F3E6A5
Gold Dark:          #8F7417
```

### Dark foundation

```text
Background:         #070B16
Background Alt:     #0B1020
Surface:            rgba(255,255,255,0.055)
Surface Strong:     rgba(255,255,255,0.085)
Border:             rgba(255,255,255,0.10)
Text Primary:       #F8FAFC
Text Secondary:     #A7B0C0
Text Muted:         #697386
```

### Semantic colors

```text
Critical:           #EF4444
High:               #F97316
Medium:             #EAB308
Low:                #22C55E
Informational:      #60A5FA
Success:            #22C55E
Warning:            #F59E0B
Danger:             #EF4444
```

Semantic colors are for meaning/status, not branding.

---

## 3.3 Typography

Recommended:

- Inter for primary UI.
- JetBrains Mono for hashes, IDs, IPs, technical values, API paths, code/evidence.
- Strong 700/800 headings.
- Avoid excessive uppercase.
- Keep technical data compact.

---

## 3.4 Glass component recipe

Every major glass surface should use:

```text
background: rgba(255,255,255,0.05)
border: 1px solid rgba(255,255,255,0.10)
backdrop-filter: blur(18px)
border-radius: 20px
box-shadow: subtle depth + optional gold glow
```

Do not overuse glow. The interface must remain professional.

---

# 4. Global UX Components

Build these first because every feature depends on them.

- App shell
- Public header
- Authenticated sidebar
- Mobile navigation
- Topbar
- Breadcrumbs
- Page header
- GlassCard
- StatCard
- StatusBadge
- SeverityBadge
- DataTable
- SearchInput
- FilterBar
- Tabs
- Dropdown
- Modal
- Drawer
- ConfirmDialog
- Toast
- Tooltip
- EmptyState
- LoadingSkeleton
- ErrorState
- ProgressBar
- Stepper
- Timeline
- ActivityFeed
- ChartCard
- FileDropzone
- Code/Evidence viewer
- Pagination
- Command/search palette
- PermissionGate
- RoleGate

---

# 5. Frontend Route Map

## Public

```text
/
 /features
 /analysis
 /analysis/website
 /analysis/malware
 /about
 /contact
 /login
 /register
```

## Authenticated

```text
/app
/app/dashboard
/app/projects
/app/projects/:projectId
/app/applications
/app/applications/:id
/app/apis
/app/apis/:id
/app/assessments
/app/assessments/new
/app/assessments/:id
/app/findings
/app/findings/:id
/app/remediation
/app/retests
/app/reports
/app/history
/app/malware
/app/malware/cases/:id
/app/organization
/app/team
/app/settings
/app/notifications
```

## Admin

```text
/admin
/admin/users
/admin/organizations
/admin/roles
/admin/permissions
/admin/projects
/admin/audit-logs
/admin/settings
```

---

# 6. Role Workspaces

The specification defines:

1. Client Owner
2. Client Member
3. Security Engineer / Pen Tester
4. Developer
5. Malware Analyst
6. Platform Admin

Each role must have a different dashboard and permission-aware navigation.

---

# 7. Permission Model

Use permission IDs rather than scattered role-name checks.

Example:

```text
organization.read
organization.manage
team.read
team.manage
project.create
project.read
project.update
application.manage
api.manage
assessment.create
assessment.run
assessment.configure
finding.create
finding.manage
finding.assign
remediation.submit
retest.run
verification.perform
report.generate
malware.static
malware.dynamic
malware.reverse_engineering
malware.ioc
malware.yara
malware.mitre
admin.users
admin.roles
admin.permissions
admin.audit
```

Frontend:

```text
<PermissionGate permission="assessment.run">
  <RunScanButton />
</PermissionGate>
```

Backend:

```text
authenticate
→ authorize
→ organization membership check
→ permission check
→ controller
```

Never trust frontend hiding as security.

---

# 8. Authentication

Implement:

- Register
- Login
- Logout
- Refresh session
- Current user
- Protected routes
- Role-aware routes
- Organization membership
- Session expiry handling

For development:

- JWT access token
- Refresh token strategy
- Secure password hashing
- HTTP-only cookie for refresh token where appropriate
- Validation
- Rate limiting on auth endpoints
- Audit events

Create development seed accounts for every role.

Example:

```text
owner@sentrix.local
member@sentrix.local
engineer@sentrix.local
developer@sentrix.local
analyst@sentrix.local
admin@sentrix.local
```

Use obviously fake development credentials and document them in `.env.example`/seed instructions.

---

# 9. Client Registration

Wizard:

```text
Register
  ↓
Account Information
  ↓
Organization Questionnaire
  ↓
Determine Client Account Type
  ↓
Dashboard
```

Questions required by the specification:

- Company/organization name
- Are you the company owner?
- Are you responsible for security?
- Number of employees
- Number of platform users
- New organization or existing organization
- Invitation status

The backend ultimately assigns Client Owner / Client Member.

---

# 10. Dashboard Implementation

## Client Owner

Cards:

- Organization
- Team
- Projects
- Applications
- APIs
- Findings
- Remediation
- Retests
- Reports
- Analysis History

Hero/KPI design inspired by the supplied dashboard:

```text
Security Posture
Open Findings
Critical/High
Active Assessments
Remediation Rate
Retest Pass Rate
```

Charts:

- Findings by severity
- Findings over time
- Remediation progress
- Assessment activity
- Project risk
- Test coverage

## Client Member

Show only assigned projects and permitted data.

## Security Engineer

Prioritize:

- Active scans
- Assigned projects
- Scan progress
- Findings
- Severity distribution
- Retests
- Verification queue

## Developer

Prioritize:

- Assigned findings
- Critical/High issues
- In progress
- Ready for retest
- Fixed
- Reopened

## Malware Analyst

Prioritize:

- Active cases
- Samples
- Static analysis
- Dynamic analysis
- IOCs
- MITRE
- YARA
- Reports

## Platform Admin

Prioritize:

- Users
- Organizations
- Projects
- Findings
- Malware cases
- System activity
- Audit logs

---

# 11. Project Workflow

Required workflow:

```text
Create Project
↓
Select Service Type
↓
Define Target
↓
Define Scope
↓
Confirm Authorization
↓
Add Application/API
↓
Select Scan Mode
↓
Select Tests OR Full Scan
↓
Configure Test Intensity
↓
Run Security Test
↓
Analyze Results
↓
Create Findings
↓
Remediation
↓
Retest
↓
Security Verification
↓
Generate Report
```

Build this as a guided stepper, not one enormous form.

---

# 12. Application Management

Form:

- Application name
- URL
- Description
- Technology
- Environment
- Scope

Environment:

- Development
- Staging
- Production

Production requires an explicit authorization confirmation.

UI should show an authorization warning before a production assessment begins.

---

# 13. API Management

Form:

- API name
- Base URL
- Authentication method
- Environment
- Description

OpenAPI flow:

```text
Upload OpenAPI
↓
Mock Parse
↓
Extract Endpoints
↓
Store Inventory
↓
Display Endpoints
```

Endpoint inventory:

- Method
- Path
- Parameters
- Authentication
- Request
- Response
- Tags
- Risk/test applicability

The mock parser should accept a real OpenAPI file and return deterministic mock endpoint data if full parsing is not implemented yet.

---

# 14. Security Assessment Builder

This is one of the most important screens.

## Step 1 — Target

```text
Website
Web Application
API
OpenAPI Specification
```

## Step 2 — Scan Mode

Two visually equal but distinct options:

### Select Specific Tests

Show categorized test selection.

### Full Scan

Do not require manual test selection.

The specification explicitly requires Full Scan to automatically determine applicable tests.

---

# 15. Security Test Catalog

Organize tests by category.

## Web Application

- Authentication
- Authorization
- Access Control
- BOLA/IDOR
- Session Management
- Input Validation
- Injection
- SQL Injection
- NoSQL Injection
- Command Injection
- XSS
- CSRF
- SSRF
- XXE
- SSTI
- LDAP Injection
- Path Traversal
- File Inclusion
- File Upload
- Open Redirect
- Prototype Pollution
- Business Logic
- Race Conditions
- Security Misconfiguration
- Information Disclosure
- Sensitive Data Exposure
- CORS
- Security Headers
- TLS/SSL
- Rate Limiting
- Cache Poisoning

## API

- API Discovery
- API Authentication
- API Authorization
- BOLA/IDOR
- Broken Function-Level Authorization
- Input Validation
- Injection
- Rate Limiting
- Excessive Data Exposure
- Mass Assignment
- Security Misconfiguration
- Sensitive Data Exposure
- Endpoint Security
- Parameter Tampering
- API Versioning Issues

## Secure Development

- Security Requirements
- Threat Modeling
- Secure Architecture Review
- Code Security Review
- Dependency Security Review
- Web Security Testing
- API Security Testing
- Findings
- Remediation
- Retesting
- Security Verification

Use the OWASP WSTG as an external methodology reference for the web testing taxonomy rather than inventing a completely unrelated taxonomy. OWASP's current stable guide organizes web testing into areas including information gathering, configuration/deployment, identity, authentication, authorization, session management, input validation, error handling, cryptography, business logic, client-side and API testing. See the official OWASP WSTG: https://owasp.org/www-project-web-security-testing-guide/stable/

---

# 16. Full Scan Logic

Frontend sends:

```json
{
  "mode": "full",
  "targetType": "web_application",
  "targetId": "...",
  "scope": {},
  "environment": "staging",
  "intensity": "standard"
}
```

Backend mock engine:

```text
discover target
→ determine applicable categories
→ create scan
→ simulate progress
→ generate test results
→ aggregate findings
```

Important:

```text
Full Scan != run every test blindly
```

The mock engine must still return an `applicableTests` list based on target type.

---

# 17. Select-Specific-Test Logic

Frontend sends:

```json
{
  "mode": "selected",
  "selectedTests": [
    "authentication",
    "bola_idor",
    "sql_injection"
  ],
  "intensity": "standard"
}
```

Backend validates that each requested test is applicable.

Only selected applicable tests are returned as executed.

---

# 18. Scan Progress UI

Use a polished progress workspace:

```text
Assessment: ACME Web App
Target: staging.example.test

Discovery                 ✓
Target Classification     ✓
Authentication Testing    ●
BOLA/IDOR                 ○
SQL Injection             ○
Result Aggregation        ○
Finding Creation          ○
```

Show:

- elapsed time
- current test
- completed tests
- total tests
- progress percentage
- informational log stream
- cancel action
- scan status

For the mock implementation, progress can be simulated by a backend job with short intervals.

---

# 19. Findings

Finding fields:

- Title
- Finding Type
- Severity
- Description
- Affected Asset
- Affected Endpoint
- Evidence
- Impact
- Recommendation
- Status
- Assigned Developer
- Created Date
- Updated Date

Severity:

```text
Critical
High
Medium
Low
Informational
```

Status:

```text
Open
In Progress
Ready for Retest
Fixed
Reopened
Accepted Risk
Closed
```

Finding detail page:

```text
Header
Severity + Status
Summary
Affected Asset
Affected Endpoint
Evidence
Impact
Recommendation
Assignment
Remediation Timeline
Retest History
Activity
AI Assistant panel (optional)
```

---

# 20. Remediation

Workflow:

```text
Finding
→ Assign Developer
→ Developer Reviews
→ Fix Vulnerability
→ Upload Commit/Reference
→ Ready for Retest
```

Developer UI should feel action-oriented.

Include:

- finding summary
- evidence
- recommended fix
- developer notes
- commit/reference field
- ready-for-retest action

---

# 21. Retesting

Workflow:

```text
Perform Retest
→ Run Same Test
→ Compare Results
→ Store Evidence
```

If passed:

```text
FIXED
```

If failed:

```text
REOPENED
```

Comparison view:

```text
Original Result | Retest Result
----------------|--------------
Status          | Status
Evidence        | Evidence
Risk            | Risk
Observed data   | Observed data
```

---

# 22. Security Verification

Verification checklist:

- Critical findings reviewed
- High findings reviewed
- Retest results reviewed
- Remaining risk reviewed

Then:

```text
Generate Security Verification Report
```

---

# 23. Reports

Build report preview first.

Sections:

- Executive Summary
- Assessment Scope
- Target Information
- Methodology
- Findings Summary
- Severity Distribution
- Detailed Findings
- Remediation Status
- Retest Results
- Remaining Risk
- Security Verification
- Recommendations

Backend creates a report record.

PDF generation can remain a pluggable adapter until the final reporting implementation.

---

# 24. Public Website Analysis

## Website Analysis

Flow:

```text
Enter URL
→ Select Scan Mode
→ Scan
→ Results
```

For guests:

- temporary result only
- no permanent history
- CTA to login/register to save

The UI can use the same assessment builder in a simplified public layout.

---

# 25. Public Malware Analysis

Flow:

```text
Upload Sample
→ Quarantine
→ Hash
→ Metadata
→ Static Analysis
→ Results
```

Never execute uploaded samples in the mock implementation.

Display:

- file name
- size
- type
- MD5
- SHA-1
- SHA-256
- metadata
- strings summary
- imports
- exports
- sections
- entropy
- indicators
- suspicious characteristics
- static signatures
- classification
- risk score

The result should clearly state:

```text
Static analysis only
Sample was not executed
```

---

# 26. Malware Analyst Workspace

Role-only advanced screens:

```text
Cases
Samples
Static Analysis
Dynamic Analysis
Behavior
Reverse Engineering
IOCs
YARA
MITRE ATT&CK
Notes
Reports
```

The UI can contain realistic mock dynamic-analysis data, but no real sandbox execution is required for this developer's scope.

Backend must enforce the role.

Public users and ordinary users must not receive dynamic-analysis API access.

---

# 27. Malware Case

Fields:

- Case ID
- Case Name
- Sample
- Hashes
- Upload Date
- Analyst
- Status
- Risk
- Classification
- Static Results
- Dynamic Results
- Behavioral Results
- IOCs
- MITRE ATT&CK
- YARA
- Notes
- Report

---

# 28. Analysis History

Store/link:

- user
- organization
- project
- target
- analysis type
- timestamp
- result reference

Types:

- Website analysis
- Security assessment
- Malware static analysis
- Project scan
- Retest

Guest results must remain temporary.

---

# 29. Notifications

Build:

- unread count
- notification drawer
- mark read
- mark all read
- severity/status icons

Examples:

- Scan completed
- Critical finding created
- Finding assigned
- Remediation submitted
- Retest completed
- Report generated
- Team invitation

---

# 30. Audit Logs

Record:

- Login
- Logout
- Registration
- Organization creation
- Project creation
- Scope modification
- Authorization confirmation
- Scan started
- Scan completed
- Finding created
- Finding modified
- Severity changed
- Developer assigned
- Remediation submitted
- Retest performed
- Report generated
- Malware uploaded
- Permission changed
- Role changed

Only Platform Admin can view platform-wide audit logs.

---

# 31. Mock Backend Strategy

The mock backend must be a real REST API, not frontend hardcoded arrays.

Recommended approach:

```text
React
  ↓ HTTP
Express API
  ↓
Service
  ↓
Mock Repository / MongoDB
  ↓
Mock Engine Adapter
```

This makes the frontend integration realistic from day one.

Do not do:

```text
React → local array → pretend API
```

Prefer:

```text
React → axios/fetch → Express → MongoDB/mock repository
```

---

# 32. Mock Security Engine

Create:

```text
SecurityEngine
├── startScan()
├── getScanStatus()
├── getScanResults()
├── getApplicableTests()
├── retest()
└── cancelScan()
```

Mock implementation:

```text
MockSecurityEngine
```

Future:

```text
RealSecurityEngine
```

Both implement the same interface.

---

# 33. Mock Malware Engine

Create:

```text
MalwareEngine
├── quarantine()
├── calculateHashes()
├── analyzeStatic()
├── analyzeDynamic()
├── analyzeBehavior()
├── extractIOCs()
├── mapMITRE()
├── generateYARA()
└── generateReport()
```

Current:

```text
MockMalwareEngine
```

Future:

```text
RealMalwareEngine
```

---

# 34. MongoDB Collections

Implement collections/models for at least:

```text
Users
Organizations
OrganizationMembers
Roles
Permissions
Projects
Applications
APIs
APIEndpoints
SecurityTests
Scans
Findings
Remediations
Retests
Reports
MalwareCases
MalwareSamples
MalwareStaticResults
MalwareDynamicResults
IOCs
YaraRules
MitreMappings
AnalysisHistory
Notifications
AuditLogs
```

Use IDs/references between related records.

---

# 35. API Contract

## Auth

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

## Organizations

```text
POST   /api/organizations
GET    /api/organizations/:id
PATCH  /api/organizations/:id
GET    /api/organizations/:id/members
POST   /api/organizations/:id/invitations
PATCH  /api/organizations/:id/members/:memberId/role
DELETE /api/organizations/:id/members/:memberId
```

## Projects

```text
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
GET    /api/projects/:id/dashboard
```

## Applications

```text
POST   /api/applications
GET    /api/applications
GET    /api/applications/:id
PATCH  /api/applications/:id
DELETE /api/applications/:id
```

## APIs

```text
POST   /api/apis
GET    /api/apis
GET    /api/apis/:id
PATCH  /api/apis/:id
POST   /api/apis/:id/openapi/import
GET    /api/apis/:id/endpoints
GET    /api/apis/:id/endpoints/:endpointId
```

## Assessments

```text
POST   /api/assessments
POST   /api/assessments/:id/start
POST   /api/assessments/:id/cancel
GET    /api/assessments/:id
GET    /api/assessments/:id/status
GET    /api/assessments/:id/results
GET    /api/security-tests
GET    /api/security-tests/applicable
```

## Findings

```text
POST   /api/findings
GET    /api/findings
GET    /api/findings/:id
PATCH  /api/findings/:id
POST   /api/findings/:id/assign
PATCH  /api/findings/:id/severity
```

## Remediation

```text
POST   /api/findings/:id/remediation
POST   /api/findings/:id/remediation/commit
POST   /api/findings/:id/remediation/ready-for-retest
```

## Retesting

```text
POST   /api/findings/:id/retest
GET    /api/findings/:id/retests
GET    /api/retests/:id/compare
```

## Reports

```text
POST   /api/reports
GET    /api/reports
GET    /api/reports/:id
GET    /api/reports/:id/download
```

## Malware

```text
POST   /api/malware/cases
POST   /api/malware/cases/:id/samples
POST   /api/malware/cases/:id/static-analysis
POST   /api/malware/cases/:id/dynamic-analysis
GET    /api/malware/cases/:id
POST   /api/malware/cases/:id/iocs
POST   /api/malware/cases/:id/yara
POST   /api/malware/cases/:id/mitre
POST   /api/malware/cases/:id/report
```

Dynamic malware endpoints must be backend-protected for Malware Analyst permissions.

---

# 36. API Response Convention

Use a predictable format:

```json
{
  "success": true,
  "data": {},
  "message": "Scan started successfully"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

Use centralized error handling.

---

# 37. Validation

Use Zod on the frontend and/or backend boundary where practical.

Validate:

- registration
- login
- organization
- project
- application
- API
- assessment configuration
- test selection
- findings
- remediation
- report requests

Never trust client-provided role or organization IDs.

---

# 38. Testing Strategy

## Frontend

Test:

- route protection
- permission rendering
- forms
- scan mode behavior
- selected test behavior
- full scan behavior
- findings status transitions
- role-specific navigation

## Backend

Test:

- auth
- RBAC
- organization isolation
- permission checks
- assessment creation
- scan lifecycle
- finding lifecycle
- remediation
- retest
- malware restrictions

## Integration

At minimum:

```text
Register
→ Login
→ Create Organization
→ Create Project
→ Add Application
→ Create Assessment
→ Start Mock Scan
→ View Findings
→ Assign Developer
→ Submit Remediation
→ Retest
→ Verify
→ Generate Report
```

---

# 39. Security Requirements for This Implementation

Even with mocks:

- Backend authorization is mandatory.
- Validate every request.
- Do not expose secrets to React.
- Do not store plaintext passwords.
- Use secure session handling.
- Rate-limit authentication.
- Enforce organization ownership/membership.
- Audit important actions.
- Never execute uploaded malware in the mock system.
- Keep uploaded sample handling isolated.
- Treat URLs and uploaded files as untrusted input.
- Never make destructive/security-testing actions happen automatically from UI clicks without explicit user confirmation.
- Production testing requires authorization confirmation in the workflow.

---

# 40. Integration Boundary for Developer 2

The second developer should be able to provide real engines through these interfaces:

```text
SecurityEngine
MalwareEngine
FileStorage
AIService
ReportGenerator
```

Do not import engine-specific code directly into controllers or React.

Example:

```text
assessment.service.ts
    ↓
securityEngine.startScan()
```

not:

```text
assessment.controller.ts
    ↓
run_nmap()
run_sqlmap()
...
```

The second developer can later implement the adapter behind the interface.

---

# 41. Delivery Phases

## Phase 1 — Foundation

- Repository
- React
- Tailwind
- Zustand
- Express
- MongoDB
- Environment setup
- ESLint/formatting
- Shared types
- API client
- Design tokens

## Phase 2 — Design System

- Colors
- Typography
- Glass cards
- Buttons
- Inputs
- Tables
- Badges
- Charts
- Sidebar
- Topbar
- Modal
- Drawer
- Toast
- Loading/error states

## Phase 3 — Public Website

- Home
- Features
- Analysis
- About
- Contact
- Login
- Register

## Phase 4 — Authentication/RBAC

- Register
- Login
- Refresh
- Logout
- Current user
- Roles
- Permissions
- Protected routes

## Phase 5 — Organization/Projects

- Organization
- Team
- Projects
- Applications
- APIs
- OpenAPI mock import

## Phase 6 — Security Assessment

- Assessment wizard
- Specific Tests
- Full Scan
- Intensity
- Mock engine
- Progress
- Results

## Phase 7 — Findings/Remediation/Retesting

- Findings
- Assignment
- Remediation
- Commit reference
- Retest
- Comparison
- Verification

## Phase 8 — Reports/History/Notifications

- Reports
- Report preview
- History
- Notifications
- Audit logs

## Phase 9 — Malware

- Public static analysis
- Malware cases
- Static result
- Analyst workspace
- Mock dynamic workflow
- IOC/MITRE/YARA views

## Phase 10 — Polish/QA

- Responsive
- Accessibility
- Error states
- Loading states
- Empty states
- Security review
- API integration tests
- Cross-role testing

## Phase 11 — Engine Integration Preparation

- Finalize interfaces
- Document API contracts
- Provide mock/real adapter swap instructions
- Seed data
- Integration checklist for developer 2

---

# 42. Parallel Agent Strategy

Do not let multiple agents rewrite the same files.

Recommended agent ownership:

```text
Agent 1: Design system + app shell
Agent 2: Public website
Agent 3: Authentication + RBAC
Agent 4: Organization + projects + applications
Agent 5: API inventory + OpenAPI
Agent 6: Security assessment builder
Agent 7: Findings/remediation/retesting
Agent 8: Reports/history/notifications/audit
Agent 9: Malware workspace
Agent 10: QA/integration/security review
```

One lead agent must own final integration.

---

# 43. Git Strategy

Use feature branches:

```text
main
develop
feature/design-system
feature/public
feature/auth-rbac
feature/projects
feature/api-management
feature/assessments
feature/findings
feature/reports
feature/malware
```

Rules:

- Small commits.
- One feature per branch.
- No direct edits to another agent's module without coordination.
- Run tests before merge.
- Run build before merge.
- Never commit `.env`.
- Never commit real malware samples or credentials.

---

# 44. Visual QA Checklist

Every screen must answer yes:

- Does it look like the supplied Sentrix references?
- Is the background deep navy?
- Is `#C9A227` visibly the primary brand accent?
- Are glass cards consistent?
- Are borders subtle?
- Is spacing consistent?
- Are charts readable?
- Are severity colors semantic?
- Does the page work in dark mode?
- Does the page work in light mode?
- Does mobile layout work?
- Are loading/error/empty states designed?
- Are permission boundaries obvious?
- Is the UI professional rather than overly neon?

---

# 45. Final Integration Principle

The final application should feel like **one product**, not a collection of AI-generated pages.

The implementation priority is:

```text
Correct architecture
→ Correct workflows
→ Correct RBAC
→ Consistent API contracts
→ Consistent design system
→ Realistic mock data
→ Polished visual details
→ Engine integration readiness
```

The supplied specification remains the functional source of truth; the supplied images remain the primary visual reference.
