# Sentrix Cybersecurity Platform — TODO

Legend:

- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked / needs decision
- `[P0]` Critical
- `[P1]` Important
- `[P2]` Polish

---

# 0. Project Setup

## Repository

- [ ] [P0] Create monorepo structure.
- [ ] [P0] Create `apps/web`.
- [ ] [P0] Create `apps/api`.
- [ ] [P1] Create `packages/shared-types`.
- [ ] [P1] Create `packages/shared-constants`.
- [ ] [P1] Create `packages/ui-tokens`.
- [ ] [P0] Add README.
- [ ] [P0] Add `.env.example`.
- [ ] [P0] Add `.gitignore`.
- [ ] [P1] Configure ESLint.
- [ ] [P1] Configure Prettier.
- [ ] [P1] Configure TypeScript strict mode.
- [ ] [P1] Configure testing framework.

## Frontend foundation

- [ ] [P0] React app.
- [ ] [P0] Tailwind CSS.
- [ ] [P0] Zustand.
- [ ] [P0] React Router.
- [ ] [P0] API client.
- [ ] [P1] Axios interceptors or equivalent fetch wrapper.
- [ ] [P1] Query/data-fetching strategy.
- [ ] [P1] Error boundary.
- [ ] [P1] Global toast system.

## Backend foundation

- [ ] [P0] Express app.
- [ ] [P0] MongoDB connection.
- [ ] [P0] Modular route registration.
- [ ] [P0] Central error handler.
- [ ] [P0] Request logging.
- [ ] [P0] Validation middleware.
- [ ] [P0] Auth middleware.
- [ ] [P0] Permission middleware.
- [ ] [P1] Rate limiting.
- [ ] [P1] Security headers.
- [ ] [P1] CORS configuration.
- [ ] [P1] API version prefix `/api`.

---

# 1. Design System

## Brand

- [ ] [P0] Define `#C9A227` as primary brand color.
- [ ] [P0] Create dark navy foundation.
- [ ] [P0] Create semantic severity colors.
- [ ] [P1] Create light-mode tokens.
- [ ] [P1] Create dark-mode tokens.
- [ ] [P0] Define typography.
- [ ] [P1] Add technical monospace font.

## Components

- [ ] [P0] GlassCard.
- [ ] [P0] Button.
- [ ] [P0] Input.
- [ ] [P0] Select.
- [ ] [P0] Textarea.
- [ ] [P0] Checkbox.
- [ ] [P0] Radio.
- [ ] [P0] Switch.
- [ ] [P0] Badge.
- [ ] [P0] SeverityBadge.
- [ ] [P0] StatusBadge.
- [ ] [P0] DataTable.
- [ ] [P0] Modal.
- [ ] [P0] Drawer.
- [ ] [P0] ConfirmDialog.
- [ ] [P0] Toast.
- [ ] [P1] Tooltip.
- [ ] [P0] EmptyState.
- [ ] [P0] LoadingSkeleton.
- [ ] [P0] ErrorState.
- [ ] [P0] ProgressBar.
- [ ] [P0] Stepper.
- [ ] [P1] Timeline.
- [ ] [P1] ActivityFeed.
- [ ] [P1] ChartCard.
- [ ] [P0] FileDropzone.
- [ ] [P1] EvidenceViewer.
- [ ] [P1] CodeBlock.
- [ ] [P1] Pagination.
- [ ] [P1] Search/Command palette.

## Shell

- [ ] [P0] Public header.
- [ ] [P0] Authenticated sidebar.
- [ ] [P0] Topbar.
- [ ] [P0] User menu.
- [ ] [P0] Notification button.
- [ ] [P0] Mobile navigation.
- [ ] [P1] Breadcrumbs.
- [ ] [P1] Global search.

---

# 2. Public Website

## Home

- [ ] [P0] Hero section matching reference.
- [ ] [P0] Glass navbar.
- [ ] [P0] Gold brand accent.
- [ ] [P0] Dashboard preview.
- [ ] [P1] Network background.
- [ ] [P1] Feature cards.
- [ ] [P1] Security workflow section.
- [ ] [P1] Role/workspace section.
- [ ] [P1] CTA.
- [ ] [P2] Footer.

## Features

- [ ] [P0] Feature overview.
- [ ] [P1] Security testing.
- [ ] [P1] Secure development.
- [ ] [P1] Malware analysis.
- [ ] [P1] Reporting.
- [ ] [P1] RBAC.
- [ ] [P2] FAQ.

## Analysis

- [ ] [P0] Analyze Website card.
- [ ] [P0] Analyze Malware card.
- [ ] [P1] Explain guest limitations.

## About

- [ ] [P1] Product mission.
- [ ] [P1] Platform overview.

## Contact

- [ ] [P1] Contact form.
- [ ] [P1] Mock submission endpoint.

---

# 3. Authentication

- [ ] [P0] Register page.
- [ ] [P0] Login page.
- [ ] [P0] Logout.
- [ ] [P0] Refresh session.
- [ ] [P0] Current user.
- [ ] [P0] Protected routes.
- [ ] [P0] Auth store.
- [ ] [P0] Auth persistence.
- [ ] [P0] Session-expired handling.
- [ ] [P1] Forgot password UI.
- [ ] [P1] Reset password mock flow.

---

# 4. Client Registration

- [ ] [P0] Account information step.
- [ ] [P0] Organization questionnaire.
- [ ] [P0] New/existing organization choice.
- [ ] [P0] Owner/member determination.
- [ ] [P0] Backend role assignment.
- [ ] [P1] Invitation flow.
- [ ] [P1] Validation.
- [ ] [P1] Confirmation screen.

---

# 5. RBAC

- [ ] [P0] Define roles.
- [ ] [P0] Define permissions.
- [ ] [P0] Permission middleware.
- [ ] [P0] Organization membership middleware.
- [ ] [P0] Frontend PermissionGate.
- [ ] [P0] Frontend RoleGate.
- [ ] [P0] Role-aware routes.
- [ ] [P0] Role-aware navigation.
- [ ] [P0] Backend forbidden responses.
- [ ] [P0] Test unauthorized API access.
- [ ] [P1] Admin permission editor.

---

# 6. Client Owner Workspace

- [ ] [P0] Owner dashboard.
- [ ] [P0] Organization page.
- [ ] [P0] Team page.
- [ ] [P0] Create project.
- [ ] [P0] Project list.
- [ ] [P0] Project detail.
- [ ] [P0] Add application.
- [ ] [P0] Add API.
- [ ] [P0] Findings view.
- [ ] [P1] Remediation monitor.
- [ ] [P1] Retest view.
- [ ] [P1] Reports.
- [ ] [P1] History.

---

# 7. Organization + Team

- [ ] [P0] Organization model.
- [ ] [P0] Organization CRUD.
- [ ] [P0] Member list.
- [ ] [P0] Invite member.
- [ ] [P0] Remove member.
- [ ] [P0] Change member role.
- [ ] [P1] Invitation status.
- [ ] [P1] Team activity.
- [ ] [P1] Permission-aware actions.

---

# 8. Projects

- [ ] [P0] Project model.
- [ ] [P0] Create project.
- [ ] [P0] Project list.
- [ ] [P0] Project detail.
- [ ] [P0] Project dashboard.
- [ ] [P1] Project edit.
- [ ] [P1] Project archive.
- [ ] [P1] Project risk summary.

---

# 9. Applications

- [ ] [P0] Application model.
- [ ] [P0] Add application.
- [ ] [P0] Application list.
- [ ] [P0] Application detail.
- [ ] [P0] Edit application.
- [ ] [P0] Delete application.
- [ ] [P0] Environment selection.
- [ ] [P0] Production authorization confirmation.
- [ ] [P1] Technology badges.
- [ ] [P1] Scope display.

---

# 10. APIs

- [ ] [P0] API model.
- [ ] [P0] Add API.
- [ ] [P0] API list.
- [ ] [P0] API detail.
- [ ] [P0] Authentication method.
- [ ] [P0] Environment.
- [ ] [P0] OpenAPI upload UI.
- [ ] [P0] Mock OpenAPI parser.
- [ ] [P0] Endpoint inventory.
- [ ] [P1] Endpoint detail.
- [ ] [P1] Request/response viewer.
- [ ] [P1] Parameter viewer.
- [ ] [P1] Endpoint filters.

---

# 11. Security Test Catalog

- [ ] [P0] SecurityTest model.
- [ ] [P0] Seed web tests.
- [ ] [P0] Seed API tests.
- [ ] [P0] Seed secure-development tests.
- [ ] [P0] Categorize tests.
- [ ] [P0] Mark target applicability.
- [ ] [P0] Mark intensity behavior.
- [ ] [P1] Search tests.
- [ ] [P1] Test detail drawer.

---

# 12. Assessment Builder

- [ ] [P0] Assessment model.
- [ ] [P0] Create assessment.
- [ ] [P0] Target selection.
- [ ] [P0] Scope configuration.
- [ ] [P0] Authorization confirmation.
- [ ] [P0] Authentication configuration.
- [ ] [P0] Environment selection.
- [ ] [P0] Select Specific Tests.
- [ ] [P0] Full Scan.
- [ ] [P0] Light intensity.
- [ ] [P0] Standard intensity.
- [ ] [P0] Deep intensity.
- [ ] [P0] Applicable test calculation.
- [ ] [P0] Validation.
- [ ] [P0] Review-before-start screen.

---

# 13. Mock Security Engine

- [ ] [P0] Define SecurityEngine interface.
- [ ] [P0] Implement MockSecurityEngine.
- [ ] [P0] Mock discovery.
- [ ] [P0] Mock target classification.
- [ ] [P0] Mock applicable tests.
- [ ] [P0] Mock scan creation.
- [ ] [P0] Mock progress.
- [ ] [P0] Mock test results.
- [ ] [P0] Mock findings.
- [ ] [P0] Mock scan completion.
- [ ] [P1] Mock cancellation.
- [ ] [P1] Deterministic seeded results.

---

# 14. Scan Workspace

- [ ] [P0] Scan status page.
- [ ] [P0] Progress bar.
- [ ] [P0] Test queue.
- [ ] [P0] Current test.
- [ ] [P0] Completed tests.
- [ ] [P0] Logs/activity.
- [ ] [P0] Cancel confirmation.
- [ ] [P1] Live polling.
- [ ] [P1] Auto-refresh.
- [ ] [P1] Completion animation.

---

# 15. Results

- [ ] [P0] Scan summary.
- [ ] [P0] Findings summary.
- [ ] [P0] Severity chart.
- [ ] [P0] Test results.
- [ ] [P0] Passed/failed/skipped states.
- [ ] [P1] Evidence view.
- [ ] [P1] Filter by severity.
- [ ] [P1] Filter by category.
- [ ] [P1] Export/continue to report.

---

# 16. Findings

- [ ] [P0] Finding model.
- [ ] [P0] Finding list.
- [ ] [P0] Finding detail.
- [ ] [P0] Create finding.
- [ ] [P0] Severity.
- [ ] [P0] Status.
- [ ] [P0] Evidence.
- [ ] [P0] Recommendation.
- [ ] [P0] Assignment.
- [ ] [P1] Finding comments.
- [ ] [P1] Activity timeline.
- [ ] [P1] Related findings.
- [ ] [P1] AI explanation placeholder.

---

# 17. Remediation

- [ ] [P0] Remediation model.
- [ ] [P0] Assign developer.
- [ ] [P0] Developer finding view.
- [ ] [P0] Review evidence.
- [ ] [P0] Review recommendation.
- [ ] [P0] Developer notes.
- [ ] [P0] Commit/reference.
- [ ] [P0] Ready for retest.
- [ ] [P1] Remediation progress dashboard.

---

# 18. Retesting

- [ ] [P0] Retest model.
- [ ] [P0] Start retest.
- [ ] [P0] Same-test behavior.
- [ ] [P0] Mock retest result.
- [ ] [P0] Pass → Fixed.
- [ ] [P0] Fail → Reopened.
- [ ] [P0] Historical results.
- [ ] [P0] Compare original/retest.
- [ ] [P1] Evidence comparison.

---

# 19. Security Verification

- [ ] [P0] Verification page.
- [ ] [P0] Critical review.
- [ ] [P0] High review.
- [ ] [P0] Retest review.
- [ ] [P0] Remaining-risk review.
- [ ] [P0] Verification result.
- [ ] [P1] Verification report generation.

---

# 20. Reports

- [ ] [P0] Report model.
- [ ] [P0] Report list.
- [ ] [P0] Report detail.
- [ ] [P0] Executive summary.
- [ ] [P0] Findings summary.
- [ ] [P0] Detailed findings.
- [ ] [P0] Remediation.
- [ ] [P0] Retest.
- [ ] [P0] Verification.
- [ ] [P1] Report preview.
- [ ] [P1] Download adapter interface.
- [ ] [P2] Real PDF generation.

---

# 21. Public Website Analysis

- [ ] [P0] Website URL form.
- [ ] [P0] Guest scan mode.
- [ ] [P0] Specific test selection.
- [ ] [P0] Full scan.
- [ ] [P0] Mock result.
- [ ] [P0] Temporary result behavior.
- [ ] [P0] Login/register CTA.
- [ ] [P1] Save-to-account flow.

---

# 22. Public Malware Static Analysis

- [ ] [P0] Upload UI.
- [ ] [P0] File validation.
- [ ] [P0] Quarantine state.
- [ ] [P0] Hash result.
- [ ] [P0] Metadata result.
- [ ] [P0] Strings result.
- [ ] [P0] Imports/exports.
- [ ] [P0] Sections.
- [ ] [P0] Entropy.
- [ ] [P0] Indicators.
- [ ] [P0] Classification.
- [ ] [P0] Risk score.
- [P0] Static-only warning.
- [ ] [P0] No dynamic analysis for guest.

---

# 23. Malware Analyst

- [ ] [P0] Malware Analyst dashboard.
- [ ] [P0] Cases.
- [ ] [P0] Create case.
- [ ] [P0] Sample page.
- [ ] [P0] Static results.
- [ ] [P0] Dynamic analysis mock page.
- [ ] [P0] Behavior mock page.
- [ ] [P0] Reverse engineering page.
- [ ] [P0] IOC page.
- [ ] [P0] YARA page.
- [ ] [P0] MITRE page.
- [ ] [P0] Analyst notes.
- [ ] [P0] Malware report.
- [ ] [P0] Backend permission tests for dynamic analysis.

---

# 24. History

- [ ] [P0] History model.
- [ ] [P0] History list.
- [ ] [P0] Website analysis history.
- [ ] [P0] Assessment history.
- [ ] [P0] Malware static history.
- [ ] [P0] Retest history.
- [ ] [P0] Link to user/org/project/target.
- [ ] [P0] Prevent guest permanent history.

---

# 25. Notifications

- [ ] [P1] Notification model.
- [ ] [P1] Notification API.
- [ ] [P1] Notification drawer.
- [ ] [P1] Unread count.
- [ ] [P1] Mark read.
- [ ] [P1] Mark all read.

---

# 26. Audit Logs

- [ ] [P0] AuditLog model.
- [ ] [P0] Auth events.
- [ ] [P0] Organization events.
- [ ] [P0] Project events.
- [ ] [P0] Scope/authorization events.
- [ ] [P0] Scan events.
- [ ] [P0] Finding events.
- [ ] [P0] Remediation events.
- [ ] [P0] Retest events.
- [ ] [P0] Report events.
- [ ] [P0] Malware upload events.
- [ ] [P0] Permission/role events.
- [ ] [P0] Admin audit page.

---

# 27. Platform Admin

- [ ] [P0] Admin dashboard.
- [ ] [P0] Users.
- [ ] [P0] Organizations.
- [ ] [P0] Roles.
- [ ] [P0] Permissions.
- [ ] [P0] Projects.
- [ ] [P0] Audit logs.
- [ ] [P1] Platform settings.
- [ ] [P1] System health mock cards.

---

# 28. Mock Data

- [ ] [P0] Seed organizations.
- [ ] [P0] Seed users for every role.
- [ ] [P0] Seed projects.
- [ ] [P0] Seed applications.
- [ ] [P0] Seed APIs.
- [ ] [P0] Seed endpoints.
- [ ] [P0] Seed security tests.
- [ ] [P0] Seed scans.
- [ ] [P0] Seed findings.
- [ ] [P0] Seed remediation.
- [ ] [P0] Seed retests.
- [ ] [P0] Seed reports.
- [ ] [P0] Seed malware cases.
- [ ] [P0] Seed notifications.
- [ ] [P0] Seed audit logs.

---

# 29. AI Assistant Placeholder

- [ ] [P1] Finding explanation UI.
- [ ] [P1] Impact summary UI.
- [ ] [P1] Remediation suggestion UI.
- [ ] [P1] Developer explanation UI.
- [ ] [P1] Related findings UI.
- [ ] [P1] Report generation action.
- [ ] [P0] Keep AI clearly secondary to actual detection.
- [ ] [P1] Create `AIService` interface.

---

# 30. Integration Adapters

- [ ] [P0] SecurityEngine interface.
- [ ] [P0] MalwareEngine interface.
- [ ] [P0] FileStorage interface.
- [ ] [P1] AIService interface.
- [ ] [P1] ReportGenerator interface.
- [ ] [P0] Mock implementations.
- [ ] [P0] Dependency injection/config selection.
- [ ] [P0] Document replacement process.

---

# 31. Security QA

- [ ] [P0] Test unauthorized role access.
- [ ] [P0] Test cross-organization access.
- [ ] [P0] Test dynamic malware endpoint restrictions.
- [ ] [P0] Test production authorization.
- [ ] [P0] Test invalid scan test selection.
- [ ] [P0] Test malformed API requests.
- [ ] [P0] Test authentication rate limits.
- [ ] [P0] Test session expiry.
- [ ] [P0] Test object-level authorization.
- [ ] [P1] Test file upload validation.
- [ ] [P1] Test audit logging.

---

# 32. UI QA

- [ ] [P0] Desktop.
- [ ] [P0] Tablet.
- [ ] [P0] Mobile.
- [ ] [P0] Dark mode.
- [ ] [P0] Light mode.
- [ ] [P0] Loading states.
- [ ] [P0] Empty states.
- [ ] [P0] Error states.
- [ ] [P0] Confirmation states.
- [ ] [P1] Keyboard navigation.
- [ ] [P1] Focus states.
- [ ] [P1] Contrast review.
- [ ] [P1] Reduced-motion support.

---

# 33. Final End-to-End Test

- [ ] [P0] Guest opens Home.
- [ ] [P0] Guest analyzes website.
- [ ] [P0] Guest views temporary result.
- [ ] [P0] Guest uploads malware sample for static analysis.
- [ ] [P0] Guest cannot access dynamic analysis.
- [ ] [P0] Client registers.
- [ ] [P0] Client Owner reaches dashboard.
- [ ] [P0] Owner creates project.
- [ ] [P0] Owner adds application.
- [ ] [P0] Owner adds API.
- [ ] [P0] Owner imports OpenAPI.
- [ ] [P0] Security Engineer opens project.
- [ ] [P0] Engineer confirms authorization.
- [ ] [P0] Engineer starts Specific Tests.
- [ ] [P0] Engineer starts Full Scan.
- [ ] [P0] Scan progress works.
- [ ] [P0] Findings generated.
- [ ] [P0] Developer sees assigned finding.
- [ ] [P0] Developer submits remediation.
- [ ] [P0] Engineer performs retest.
- [ ] [P0] Finding changes to Fixed/Reopened correctly.
- [ ] [P0] Verification works.
- [ ] [P0] Report generated.
- [ ] [P0] Malware Analyst sees advanced workspace.
- [ ] [P0] Platform Admin sees audit logs.
- [ ] [P0] Unauthorized users are denied.

---

# 34. Handoff to Developer 2

- [ ] [P0] Document all engine interfaces.
- [ ] [P0] Document scan request/response contract.
- [ ] [P0] Document finding result schema.
- [ ] [P0] Document malware result schema.
- [ ] [P0] Document file storage interface.
- [ ] [P0] Document report interface.
- [ ] [P0] Provide mock adapters.
- [ ] [P0] Provide seed data.
- [ ] [P0] Provide API collection.
- [ ] [P0] Provide integration README.
- [ ] [P0] Confirm no UI rewrite is needed for real engines.

---

# 35. Final Release Gate

- [ ] [P0] `npm run build` passes.
- [ ] [P0] Backend starts cleanly.
- [ ] [P0] Frontend starts cleanly.
- [ ] [P0] MongoDB connection works.
- [ ] [P0] Seed command works.
- [ ] [P0] All role logins work.
- [ ] [P0] Main workflow works.
- [ ] [P0] RBAC tests pass.
- [ ] [P0] No hardcoded secrets.
- [ ] [P0] No real malware execution.
- [ ] [P0] No frontend-only authorization.
- [ ] [P0] Visual QA complete.
- [ ] [P0] Handoff documentation complete.
