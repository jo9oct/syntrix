# Sentrix --- Complete System Specification

> **Source:** 31-page DOCX, *Complete System Specification ---
> Cybersecurity Assessment, Secure Development & Malware Analysis
> Platform*.
>
> This Markdown preserves the requirements, terminology, workflows,
> roles, data model, API structure, frontend requirements, security
> boundaries, UML/use-case rules, and final architecture principles from
> the 31-page DOCX.

------------------------------------------------------------------------

## Technology Stack

Use:

-   **Frontend:** React
-   **Styling:** Tailwind CSS
-   **State Management:** Zustand
-   **Backend:** Express.js or NestJS
-   **Database:** MongoDB
-   **API:** REST API
-   **Authentication:** Secure role-based authentication
-   **File Storage:** Designed so malware samples and reports can be
    connected to secure storage later
-   **Architecture:** Modular, scalable, role-based system

The system must be designed as a real full-stack application. The
frontend should consume backend APIs rather than relying permanently on
mock data.

------------------------------------------------------------------------

# 1. SYSTEM ACCESS MODEL

The platform has two major access states.

## A. Before Login

Public users can access:

-   Home
-   Features
-   Analysis
-   About
-   Contact
-   Login
-   Register

Public users can also perform limited analysis:

-   Analyze Website
-   Analyze Malware

Guest analysis results are temporary.

## B. After Login

Authenticated users receive a role-based workspace.

Authenticated functionality includes:

-   Dashboard
-   Projects
-   Applications
-   APIs
-   Security Assessments
-   Findings
-   Remediation
-   Retesting
-   Reports
-   Analysis History
-   Malware Analysis
-   Organization Management
-   Team Management
-   Administration

The available functionality depends on the user's role.

------------------------------------------------------------------------

# 2. PUBLIC ANALYSIS

The public Analysis page should provide two clear choices.

## Analyze Website

Allow the user to enter a website URL.

### Flow

``` text
Enter URL → Choose Scan Mode → Scan → Results
```

## Analyze Malware

Allow the user to submit a malware sample for permitted static analysis.

### Flow

``` text
Upload Sample → Automatic Static Analysis → Results
```

------------------------------------------------------------------------

# 3. SECURITY SCAN MODE --- IMPORTANT CLARIFICATION

When a user starts a website/application/API security assessment,
provide two scan modes.

## Mode 1 --- Select Specific Tests

Display a list of available security tests.

The user can select only the tests they want to run.

Example test modules:

-   Authentication Testing
-   Authorization Testing
-   BOLA/IDOR Testing
-   Injection Testing
-   SSRF Testing
-   Misconfiguration Testing
-   Sensitive Data Testing
-   Business Logic Testing
-   API Security Testing
-   Session Security Testing
-   Access Control Testing
-   Input Validation Testing
-   Security Header Testing
-   CORS Testing
-   TLS/SSL Configuration Testing
-   Information Disclosure Testing
-   File Upload Testing
-   Path Traversal Testing
-   Command Injection Testing
-   SQL Injection Testing
-   NoSQL Injection Testing
-   XSS Testing
-   XXE Testing
-   SSTI Testing
-   LDAP Injection Testing
-   OS Command Injection Testing
-   Prototype Pollution Testing
-   Open Redirect Testing
-   CSRF Testing
-   Rate-Limit Testing
-   Web Cache/Cache Poisoning Testing
-   Business Logic Abuse Testing
-   API Authentication Testing
-   API Authorization Testing
-   API Input Validation Testing
-   API Rate-Limit Testing
-   API Configuration Testing
-   Sensitive Data Exposure Testing

The user can select individual modules and start the scan.

Example:

``` text
Select Tests → Authentication + BOLA + SQL Injection → Start Scan
```

**Only those selected modules should execute.**

------------------------------------------------------------------------

# 4. MODE 2 --- FULL SCAN

Provide a prominent:

``` text
Full Scan
```

option.

If the user chooses Full Scan:

-   Do **not** show a required test-selection filter.
-   Do **not** require the user to manually select tests.
-   Automatically determine all applicable tests based on the target
    type.
-   Run every supported and applicable security test.
-   Automatically include all relevant web/API security testing modules.
-   Display the complete scan progress.

Example:

``` text
Full Scan
    ↓
Discover Target
    ↓
Determine Applicable Tests
    ↓
Run All Applicable Tests
    ↓
Findings
    ↓
Results
```

The user should not need to configure individual tests.

------------------------------------------------------------------------

# 5. FULL-SCAN APPLICABILITY RULE

Full Scan does **not** mean blindly executing incompatible tests.

The backend should determine which tests are applicable to:

-   Website
-   Web application
-   API
-   OpenAPI specification
-   Authentication configuration
-   Environment
-   Target technology

Example:

> An API-specific test should only run when an API target exists.

------------------------------------------------------------------------

# 6. TEST CONFIGURATION

For **Select Specific Tests**, allow:

-   Test selection
-   Scope
-   Target
-   Authentication configuration
-   Environment
-   Test intensity

For **Full Scan**, automatically configure the applicable test set.

The interface should clearly display:

``` text
Scan Mode

○ Select Specific Tests
○ Full Scan
```

------------------------------------------------------------------------

# 7. TEST INTENSITY

Where supported, provide:

-   Light
-   Standard
-   Deep

The selected intensity controls the breadth/depth of the applicable
tests.

Full Scan should still respect the configured intensity while covering
all applicable test categories.

------------------------------------------------------------------------

# 8. SECURITY TESTING CATEGORIES

The platform should support a comprehensive
penetration-testing/security-testing catalog.

## Web Application Security

Include:

-   Authentication
-   Authorization
-   Access Control
-   BOLA/IDOR
-   Session Management
-   Input Validation
-   Injection
-   SQL Injection
-   NoSQL Injection
-   Command Injection
-   XSS
-   CSRF
-   SSRF
-   XXE
-   SSTI
-   LDAP Injection
-   Path Traversal
-   File Inclusion
-   File Upload
-   Open Redirect
-   Prototype Pollution
-   Business Logic
-   Race Conditions
-   Security Misconfiguration
-   Information Disclosure
-   Sensitive Data Exposure
-   CORS
-   Security Headers
-   TLS/SSL
-   Rate Limiting
-   Cache Poisoning

## API Security

Include:

-   API Discovery
-   API Authentication
-   API Authorization
-   BOLA/IDOR
-   Broken Function-Level Authorization
-   Input Validation
-   Injection
-   Rate Limiting
-   Excessive Data Exposure
-   Mass Assignment
-   Security Misconfiguration
-   Sensitive Data Exposure
-   Endpoint Security
-   Parameter Tampering
-   API Versioning Issues

## Secure Development Security

Include:

-   Security Requirements
-   Threat Modeling
-   Secure Architecture Review
-   Code Security Review
-   Dependency Security Review
-   Web Security Testing
-   API Security Testing
-   Findings
-   Remediation
-   Retesting
-   Security Verification

The interface should organize these tests into understandable categories
instead of presenting one confusing giant list.

------------------------------------------------------------------------

# 9. APPLICATION MANAGEMENT

Client Owner can add an application.

## Add Application

Include:

-   Application name
-   URL
-   Description
-   Technology
-   Environment
-   Scope

## Environment

-   Development
-   Staging
-   Production

For Production:

> Explicit Testing Authorization is required.

------------------------------------------------------------------------

# 10. API MANAGEMENT

Client Owner can add APIs.

Include:

-   API name
-   Base URL
-   Authentication method
-   Environment
-   Description

## Import OpenAPI Specification

Support:

``` text
Upload OpenAPI
    ↓
Parse
    ↓
Extract Endpoints
    ↓
Store API Inventory
```

Display:

-   Endpoints
-   HTTP methods
-   Parameters
-   Authentication
-   Request information
-   Response information

------------------------------------------------------------------------

# 11. SECURITY ASSESSMENT WORKFLOW

The complete workflow is:

``` text
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

------------------------------------------------------------------------

# 12. FINDINGS

A finding contains:

-   Title
-   Finding Type
-   Severity
-   Description
-   Affected Asset
-   Affected Endpoint
-   Evidence
-   Impact
-   Recommendation
-   Status
-   Assigned Developer
-   Created Date
-   Updated Date

## Severity

-   Critical
-   High
-   Medium
-   Low
-   Informational

## Status

-   Open
-   In Progress
-   Ready for Retest
-   Fixed
-   Reopened
-   Accepted Risk
-   Closed

------------------------------------------------------------------------

# 13. REMEDIATION

Workflow:

``` text
Finding
→ Assign Developer
→ Developer Reviews
→ Fix Vulnerability
→ Upload Commit/Reference
→ Ready for Retest
```

The Client Owner can monitor remediation progress.

The Security Engineer reviews the remediation.

------------------------------------------------------------------------

# 14. RETESTING

When a finding is marked **Ready for Retest**:

``` text
Perform Retest
→ Run Same Test
→ Compare Results
→ Store Evidence
```

If passed:

``` text
Finding FIXED
```

If failed:

``` text
Finding REOPENED
```

Store historical results so users can compare:

-   Original result
-   Remediation
-   Retest result
-   Current status

------------------------------------------------------------------------

# 15. SECURITY VERIFICATION

Before final verification:

-   Check Critical findings
-   Check High findings
-   Review retest results
-   Review remaining risk
-   Generate Security Verification Report

------------------------------------------------------------------------

# 16. AI SECURITY ASSISTANT

AI is an optional supporting feature.

Provide:

-   Explain Vulnerability
-   Summarize Impact
-   Suggest Remediation
-   Developer-Friendly Explanation
-   Correlate Related Findings
-   Generate Security Report

**AI should NOT be presented as the primary vulnerability detector.**

------------------------------------------------------------------------

# 17. MALWARE ANALYSIS --- IMPORTANT ROLE SEPARATION

Malware analysis must be separated from normal web/API security testing.

There are two different levels of malware analysis.

## Public/General Static Analysis

When a visitor uses:

``` text
Analyze Malware
```

the platform should perform automatic static analysis only.

The guest should **NOT** receive dynamic analysis functionality.

### Flow

``` text
Upload Malware
→ Quarantine
→ Hash
→ Metadata
→ Static Analysis
→ Results
```

------------------------------------------------------------------------

# 18. AUTOMATIC STATIC MALWARE ANALYSIS

Static analysis should automatically analyze the uploaded sample
**without executing it**.

Include appropriate static analysis such as:

-   File identification
-   File size
-   File type
-   Hash calculation
-   MD5
-   SHA-1
-   SHA-256
-   Metadata extraction
-   PE/ELF/document metadata where applicable
-   Strings
-   Imports
-   Exports
-   Sections
-   Entropy
-   Indicators
-   Suspicious characteristics
-   Static signatures
-   Basic classification
-   Risk score

The user should not need to manually select individual static-analysis
modules.

### Static Malware Flow

``` text
Upload
→ Quarantine
→ Hash
→ Extract Metadata
→ Static Analysis
→ Static Results
```

------------------------------------------------------------------------

# 19. DYNAMIC MALWARE ANALYSIS

Dynamic analysis is **NOT** available to ordinary users or public
visitors.

Dynamic analysis must only be performed by the:

``` text
Malware Analyst
```

role.

The Malware Analyst can perform:

-   Dynamic Analysis
-   Behavioral Analysis
-   Runtime observation
-   Process monitoring
-   Network behavior analysis
-   File/system activity analysis
-   Sandbox analysis
-   IOC extraction

This functionality must be restricted by backend authorization as well
as frontend UI permissions.

------------------------------------------------------------------------

# 20. MALWARE ANALYST WORKFLOW

``` text
Create Case
↓
Upload Sample
↓
Quarantine
↓
Hash
↓
Metadata
↓
Static Analysis
↓
Triage
↓
Dynamic Analysis
↓
Behavior Analysis
↓
Reverse Engineering
↓
IOC Extraction
↓
MITRE ATT&CK Mapping
↓
YARA Rules
↓
Analyst Notes
↓
Generate Malware Report
```

------------------------------------------------------------------------

# 21. MALWARE CASE

A malware case should contain:

-   Case ID
-   Case Name
-   Sample
-   Hashes
-   Upload date
-   Analyst
-   Status
-   Risk
-   Classification
-   Static results
-   Dynamic results
-   Behavioral results
-   IOCs
-   MITRE ATT&CK
-   YARA
-   Notes
-   Report

------------------------------------------------------------------------

# 22. MALWARE REPORT

Include:

-   Executive Summary
-   Sample Information
-   Hash Information
-   Malware Classification
-   Static Analysis
-   Dynamic Analysis
-   Behavior Analysis
-   IOC Information
-   MITRE ATT&CK Mapping
-   YARA Rules
-   Risk Assessment
-   Recommendations

------------------------------------------------------------------------

# 23. CLIENT OWNER

Client Owner capabilities:

-   Register
-   Login
-   Create Organization
-   Manage Organization
-   Manage Team Members
-   Create Project
-   Select Service Type
-   Define Project Scope
-   Confirm Testing Authorization
-   Add Application
-   Add API
-   Import OpenAPI
-   View Endpoints
-   View Security Tests
-   View Findings
-   Request/Monitor Remediation
-   Request Retest
-   View Retest Results
-   View Reports
-   Download Reports
-   Create Malware Analysis Case
-   Upload Malware Sample
-   View Malware Analysis Results
-   View Dashboard

------------------------------------------------------------------------

# 24. CLIENT MEMBER

Client Member capabilities:

-   Login
-   View Assigned Projects
-   View Applications
-   View APIs
-   View Findings
-   View Remediation Progress
-   View Retest Results
-   View Reports
-   Download Reports
-   View Dashboard

Client Member has fewer permissions than Client Owner.

------------------------------------------------------------------------

# 25. SECURITY ENGINEER / PEN TESTER

Capabilities:

-   Login
-   View Assigned Projects
-   Define Security Requirements
-   Create Threat Model
-   Document Secure Architecture
-   Perform Code Security Review
-   Define Testing Scope
-   Confirm Authorization
-   Run Security Test
-   Configure Test Intensity
-   Select Specific Tests
-   Run Full Scan
-   Perform Authentication Testing
-   Perform Authorization Testing
-   Perform BOLA/IDOR Testing
-   Perform Injection Testing
-   Perform SSRF Testing
-   Perform Misconfiguration Testing
-   Perform Sensitive Data Testing
-   Perform Business Logic Testing
-   Perform API Security Testing
-   Create Finding
-   Manage Finding
-   Change Finding Severity
-   Assign Finding to Developer
-   Review Remediation
-   Perform Retest
-   Verify Security
-   Generate Security Reports
-   Use AI Security Assistant

------------------------------------------------------------------------

# 26. DEVELOPER

Capabilities:

-   Login
-   View Assigned Findings
-   Review Finding Details
-   Review Evidence
-   Review Recommended Fix
-   Fix Vulnerability
-   Upload Commit/Reference
-   Mark Finding Ready for Retest
-   View Retest Results

------------------------------------------------------------------------

# 27. MALWARE ANALYST

Capabilities:

-   Login
-   Create/Manage Malware Cases
-   Analyze Sample Metadata
-   Perform Triage
-   Perform Static Analysis
-   Perform Dynamic Analysis
-   Perform Reverse Engineering
-   Perform Behavior Analysis
-   Extract IOCs
-   Create YARA Rules
-   Map MITRE ATT&CK
-   Add Analyst Notes
-   Generate Malware Reports
-   View Malware Analysis Results

Dynamic and advanced malware analysis functionality must be restricted
to this role.

------------------------------------------------------------------------

# 28. PLATFORM ADMIN

Capabilities:

-   Login
-   Manage Users
-   Manage Organizations
-   Manage Roles
-   Manage Permissions
-   Manage Platform Settings
-   View All Projects
-   View Audit Logs
-   Manage System Access
-   View Platform Dashboard

------------------------------------------------------------------------

# 29. CLIENT REGISTRATION

Client registration:

``` text
Register
→ Account Information
→ Organization Questionnaire
→ Determine Client Account Type
→ Dashboard
```

Ask:

-   Company/organization name
-   Are you the company owner?
-   Are you responsible for security?
-   Number of employees
-   Number of platform users
-   Are you creating a new organization?
-   Are you joining an existing organization?

If creating/managing a new organization:

``` text
Client Owner
```

If joining an existing organization:

``` text
Client Member
```

If invited by an existing Client Owner:

``` text
Client Member
```

The backend must ultimately control this role assignment.

------------------------------------------------------------------------

# 30. ROLE-BASED ACCESS CONTROL

Implement RBAC in both frontend and backend.

## Frontend

-   Show appropriate navigation
-   Hide restricted controls
-   Protect routes
-   Display role-specific dashboards

## Backend

-   Validate authentication
-   Validate role
-   Validate organization membership
-   Validate permissions
-   Reject unauthorized API requests

> **Never rely only on frontend hiding for security.**

------------------------------------------------------------------------

# 31. MONGODB DATA MODEL

Design MongoDB collections for at least:

-   Users
-   Organizations
-   OrganizationMembers
-   Roles
-   Permissions
-   Projects
-   Applications
-   APIs
-   APIEndpoints
-   SecurityTests
-   Scans
-   Findings
-   Remediations
-   Retests
-   Reports
-   MalwareCases
-   MalwareSamples
-   MalwareStaticResults
-   MalwareDynamicResults
-   IOCs
-   YaraRules
-   MitreMappings
-   AnalysisHistory
-   Notifications
-   AuditLogs

Use relationships/reference IDs between appropriate collections.

------------------------------------------------------------------------

# 32. BACKEND API STRUCTURE

Create modular backend APIs for the following.

## Authentication

-   Register
-   Login
-   Logout
-   Refresh Session
-   Current User

## Organizations

-   Create Organization
-   Get Organization
-   Update Organization
-   Manage Members
-   Invite Member
-   Remove Member
-   Change Role

## Projects

-   Create Project
-   List Projects
-   View Project
-   Update Project
-   Project Dashboard

## Applications

-   Add Application
-   View Application
-   Update Application
-   Delete Application

## APIs

-   Add API
-   Import OpenAPI
-   Parse Specification
-   List Endpoints
-   View Endpoint

## Security Testing

-   Start Scan
-   Select Tests
-   Full Scan
-   Scan Status
-   Scan Results
-   Test Results

## Findings

-   Create Finding
-   List Findings
-   View Finding
-   Update Finding
-   Assign Developer
-   Change Severity

## Remediation

-   Submit Remediation
-   Upload Commit Reference
-   Mark Ready for Retest

## Retesting

-   Start Retest
-   Compare Results
-   View Retest
-   Update Finding Status

## Reports

-   Generate Report
-   View Report
-   Download Report

## Malware

-   Create Case
-   Upload Sample
-   Static Analysis
-   Dynamic Analysis
-   Behavior Analysis
-   IOC Extraction
-   YARA
-   MITRE
-   Notes
-   Generate Report

## Administration

-   Users
-   Organizations
-   Roles
-   Permissions
-   Audit Logs
-   Platform Settings

------------------------------------------------------------------------

# 33. ANALYSIS HISTORY

For authenticated users:

``` text
Analysis
→ Save Result
→ Analysis History
```

History should support:

-   Website analyses
-   Security assessments
-   Malware static analyses
-   Project scans
-   Retests

Each result should be linked to the correct:

-   User
-   Organization
-   Project
-   Target
-   Analysis type

Guest analysis should not be stored as permanent user history.

------------------------------------------------------------------------

# 34. AUDIT LOGGING

Record important actions:

-   Login
-   Logout
-   Registration
-   Organization creation
-   Project creation
-   Scope modification
-   Authorization confirmation
-   Scan started
-   Scan completed
-   Finding created
-   Finding modified
-   Severity changed
-   Developer assigned
-   Remediation submitted
-   Retest performed
-   Report generated
-   Malware uploaded
-   Permission changed
-   Role changed

Platform Admin can view these logs.

------------------------------------------------------------------------

# 35. DASHBOARDS

Each role gets a different dashboard.

## Client Owner

-   Organization
-   Team
-   Projects
-   Applications
-   APIs
-   Findings
-   Remediation
-   Retests
-   Reports
-   Analysis History

## Client Member

-   Assigned Projects
-   Findings
-   Remediation
-   Retests
-   Reports

## Security Engineer

-   Assigned Projects
-   Active Scans
-   Findings
-   Severity
-   Remediation
-   Retests
-   Verification

## Developer

-   Assigned Findings
-   Critical/High Issues
-   In Progress
-   Ready for Retest
-   Fixed
-   Reopened

## Malware Analyst

-   Active Cases
-   Samples
-   Static Analysis
-   Dynamic Analysis
-   IOCs
-   MITRE
-   YARA
-   Reports

## Admin

-   Users
-   Organizations
-   Projects
-   Findings
-   Malware Cases
-   System Activity
-   Audit Logs

------------------------------------------------------------------------

# 36. FRONTEND DESIGN

Use the existing interface as the visual reference.

Maintain:

-   Modern cybersecurity SaaS appearance
-   Professional dashboard
-   Glass-style cards
-   Clean navigation
-   Responsive layout
-   Light mode
-   Dark mode
-   Consistent buttons
-   Tables
-   Charts
-   Status badges
-   Progress indicators
-   Modal dialogs
-   Drawers
-   Toast notifications
-   Empty states
-   Loading states
-   Error states
-   Confirmation dialogs

Use a consistent design system throughout all roles.

------------------------------------------------------------------------

# 37. SECURITY-SENSITIVE FRONTEND BEHAVIOR

The interface must make permission boundaries obvious.

## Client Member

Do not display:

-   Manage Organization
-   Manage Team
-   Change Member Role

## Developer

Do not display:

-   Platform Administration
-   Malware Analyst

## Malware Analyst

Display advanced malware analysis capabilities.

## Public User

Do not display:

-   Dynamic Malware Analysis

## Security Engineer

Display:

-   Specific Tests
-   Full Scan

------------------------------------------------------------------------

# 38. CRITICAL ANALYSIS RULES

These rules must be implemented exactly.

## Website/Application/API Security

### Option A: Select Specific Tests

User chooses tests; only selected applicable tests execute.

### Option B: Full Scan

User chooses Full Scan; system automatically runs all applicable
supported tests.

No manual test filter is required for Full Scan.

## Malware

### Public/User Static Analysis

``` text
Upload
→ Automatic Static Analysis
→ Results
```

No dynamic analysis.

### Malware Analyst

``` text
Static
→ Dynamic
→ Behavioral
→ Reverse Engineering
→ IOCs
→ YARA
→ MITRE
→ Report
```

Dynamic analysis is restricted to the Malware Analyst.

------------------------------------------------------------------------

# 39. IMPORTANT UML/USE-CASE RULES

Actors use association lines with use cases.

Do **NOT** use:

``` text
Logout <<include>> Login
Logout <<extend>> Login
Finding <<include>> Security Engineer
Developer <<include>> Fix Vulnerability
```

Use `<<include>>` and `<<extend>>` only between use cases.

------------------------------------------------------------------------

# 40. COMPLETE END-TO-END SYSTEM FLOW

## Public Website

``` text
Home
→ Features
→ Analysis
→ About
→ Contact
```

## Guest Website Analysis

``` text
Analysis
→ Analyze Website
→ Select Specific Tests OR Full Scan
→ Results
→ Login/Register to Save
```

## Guest Malware

``` text
Analysis
→ Analyze Malware
→ Automatic Static Analysis
→ Results
→ Login/Register
```

## Client

``` text
Register
→ Organization Questionnaire
→ Client Owner/Member
→ Dashboard
```

## Client Owner

``` text
Dashboard
→ Organization
→ Team
→ Project
→ Application/API
→ Security Assessment
→ Findings
→ Remediation
→ Retest
→ Verification
→ Report
```

## Security Engineer

``` text
Dashboard
→ Project
→ Scope
→ Authorization
→ Specific Tests OR Full Scan
→ Findings
→ Remediation Review
→ Retest
→ Verification
→ Report
```

## Developer

``` text
Dashboard
→ Assigned Finding
→ Evidence
→ Fix
→ Commit/Reference
→ Ready for Retest
→ Retest Result
```

## Malware Analyst

``` text
Dashboard
→ Malware Case
→ Sample
→ Quarantine
→ Static
→ Dynamic
→ Behavior
→ Reverse Engineering
→ IOC
→ YARA
→ MITRE
→ Report
```

## Platform Admin

``` text
Dashboard
→ Users
→ Organizations
→ Roles
→ Permissions
→ Projects
→ Audit Logs
→ System Settings
```

------------------------------------------------------------------------

# 41. FINAL ARCHITECTURE PRINCIPLE

Build this as a real full-stack cybersecurity platform, not simply a
collection of frontend screens.

## Frontend

React + Tailwind CSS + Zustand

Responsible for:

-   UI
-   Navigation
-   State
-   Forms
-   Dashboards
-   Role-based views
-   Scan configuration
-   Result visualization
-   User interactions

## Backend

Express.js or NestJS

Responsible for:

-   Authentication
-   Authorization
-   RBAC
-   Organizations
-   Projects
-   Scan orchestration
-   Findings
-   Remediation
-   Retesting
-   Malware-analysis orchestration
-   Reports
-   Audit logs
-   API endpoints
-   Data validation

## Database

MongoDB

Responsible for persistent storage of:

-   Users
-   Organizations
-   Projects
-   Applications
-   APIs
-   Scans
-   Findings
-   Remediation
-   Retests
-   Reports
-   Malware cases
-   Malware analysis results
-   Analysis history
-   Audit logs

The architecture must allow the real security-testing engines,
malware-analysis sandbox, AI service, and file storage to be connected
later without redesigning the entire application.

The final result should be a single integrated cybersecurity platform
where:

-   public website
-   authentication
-   client management
-   penetration testing
-   secure development
-   malware analysis
-   findings
-   remediation
-   retesting
-   reporting
-   dashboards
-   administration

all work together through the defined frontend and backend architecture.

------------------------------------------------------------------------

# Appendix --- Page Coverage

    DOCX Page Main Content
  ----------- --------------------------------------------------------------
            1 System specification, technology stack, access model
            2 Access model, public analysis
            3 Public analysis, specific security tests
            4 Specific tests, Full Scan
            5 Full Scan applicability, test configuration
            6 Test intensity, web security categories
            7 API security, secure development security
            8 Application management, API management
            9 Security assessment workflow
           10 Workflow, findings
           11 Finding status, remediation, retesting
           12 Security verification, AI assistant, malware role separation
           13 Static malware analysis
           14 Dynamic malware analysis
           15 Malware analyst workflow
           16 Malware case and report
           17 Client Owner and Client Member
           18 Security Engineer and Developer
           19 Malware Analyst and Platform Admin
           20 Client registration and RBAC
           21 MongoDB data model
           22 Backend API structure
           23 Backend API structure continuation
           24 Analysis history and audit logging
           25 Dashboards
           26 Dashboards continuation, frontend design
           27 Frontend design, security-sensitive behavior
           28 Critical analysis rules, UML/use-case rules
           29 UML rules, end-to-end system flow
           30 End-to-end role flows
           31 Final architecture principle

------------------------------------------------------------------------

## Source Integrity Note

This Markdown is a structured transcription/reorganization of the
supplied 31-page DOCX. Requirements from the DOCX are not silently
replaced with outside assumptions. Where implementation choices such as
a specific Express.js architecture, mock-engine adapter design, or
visual brand system are needed, those should be documented separately as
project implementation decisions rather than treated as original DOCX
requirements.
