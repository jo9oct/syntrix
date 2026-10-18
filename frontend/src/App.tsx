import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/public/Home';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Features } from './pages/public/Features';
import { Analysis } from './pages/public/Analysis';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';
import { Pricing } from './pages/public/Pricing';
import { AppShell } from './components/layout/AppShell';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { Projects } from './pages/dashboard/projects/Projects';
import { ProjectDetail } from './pages/dashboard/projects/ProjectDetail';
import { Findings } from './pages/dashboard/findings/Findings';
import { MalwareAnalysis } from './pages/dashboard/malware/MalwareAnalysis';
import { Reports } from './pages/dashboard/reports/Reports';
import { AssessmentWizard } from './pages/dashboard/assessment/AssessmentWizard';
import { ScanProgress } from './pages/dashboard/assessment/ScanProgress';
import { ScanResults } from './pages/dashboard/assessment/ScanResults';
import { Remediation } from './pages/dashboard/remediation/Remediation';
import { RetestPage } from './pages/dashboard/remediation/RetestPage';
import { Admin } from './pages/dashboard/admin/Admin';
import { Billing } from './pages/dashboard/billing/Billing';
import { Scopes } from './pages/dashboard/scopes/Scopes';
import { CompanyRules } from './pages/dashboard/rules/CompanyRules';
import { DeletedScans } from './pages/dashboard/scans/DeletedScans';
import { useAuthStore, getRoleLandingPath, type UserRole } from './store/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RoleGuard: React.FC<{ allowedRoles: UserRole[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { user } = useAuthStore();
  const role = (user?.role || 'security_engineer') as UserRole;
  if (!allowedRoles.includes(role)) {
    return <Navigate to={getRoleLandingPath(role)} replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated routes strictly protected & role-guarded */}
        <Route path="/dashboard" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="findings" element={<Findings />} />
          <Route path="reports" element={<Reports />} />

          {/* Platform Administration (Admin only) */}
          <Route path="admin" element={
            <RoleGuard allowedRoles={['admin']}>
              <Admin />
            </RoleGuard>
          } />

          {/* Malware Analysis Lab (Malware Analyst, Security Engineer, Admin) */}
          <Route path="malware" element={
            <RoleGuard allowedRoles={['admin', 'malware_analyst', 'security_engineer']}>
              <MalwareAnalysis />
            </RoleGuard>
          } />

          {/* Remediation Kanban Board (Developer, Security Engineer, Admin) */}
          <Route path="remediation" element={
            <RoleGuard allowedRoles={['admin', 'developer', 'security_engineer']}>
              <Remediation />
            </RoleGuard>
          } />

          {/* Retesting Queue (Developer, Security Engineer, Admin) */}
          <Route path="retest" element={
            <RoleGuard allowedRoles={['admin', 'developer', 'security_engineer']}>
              <RetestPage />
            </RoleGuard>
          } />

          {/* Assessment Wizard (Security Engineer, Admin) */}
          <Route path="assessment/new" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer']}>
              <AssessmentWizard />
            </RoleGuard>
          } />

          {/* Security Scopes & Company Policies (Security Engineer, Admin) */}
          <Route path="scopes" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer']}>
              <Scopes />
            </RoleGuard>
          } />

          <Route path="rules" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer']}>
              <CompanyRules />
            </RoleGuard>
          } />

          {/* Deleted Scans Archive (Security Engineer, Admin) */}
          <Route path="scans/deleted" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer']}>
              <DeletedScans />
            </RoleGuard>
          } />

          {/* Subscription & Billing (Client Owner, Admin) */}
          <Route path="billing" element={
            <RoleGuard allowedRoles={['admin', 'client_owner']}>
              <Billing />
            </RoleGuard>
          } />

          {/* Telemetry and Results */}
          <Route path="assessment/:id/progress" element={<ScanProgress />} />
          <Route path="assessment/:id/results" element={<ScanResults />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
