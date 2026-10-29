import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Home } from './pages/public/Home';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { AuthCallback } from './pages/auth/AuthCallback';
import { Onboarding } from './pages/auth/Onboarding';
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
import { Developer } from './pages/dashboard/developer/Developer';
import { SecurityEngineer } from './pages/dashboard/security/SecurityEngineer';
import { Admin } from './pages/dashboard/admin/Admin';
import { Billing } from './pages/dashboard/billing/Billing';
import { Scopes } from './pages/dashboard/scopes/Scopes';
import { CompanyRules } from './pages/dashboard/rules/CompanyRules';
import { DeletedScans } from './pages/dashboard/scans/DeletedScans';
import { ServiceOrders } from './pages/dashboard/orders/ServiceOrders';
import { ServiceProjects } from './pages/dashboard/service-projects/ServiceProjects';
import { ServiceProjectDetail } from './pages/dashboard/service-projects/ServiceProjectDetail';
import { useAuthStore, getRoleLandingPath, type UserRole } from './store/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token') || searchParams.get('refreshToken');

  if (!isAuthenticated) {
    if (token) {
      return <Navigate to={`/auth/callback${location.search}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={getRoleLandingPath(user?.role)} replace />;
  }
  return <>{children}</>;
};

const CatchAllRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={getRoleLandingPath(user?.role)} replace />;
  }
  return <Navigate to="/" replace />;
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
        {/* Public routes (auto-redirect to role dashboard if authenticated) */}
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/features" element={<PublicRoute><Features /></PublicRoute>} />
        <Route path="/analysis" element={<PublicRoute><Analysis /></PublicRoute>} />
        <Route path="/pricing" element={<PublicRoute><Pricing /></PublicRoute>} />
        <Route path="/about" element={<PublicRoute><About /></PublicRoute>} />
        <Route path="/contact" element={<PublicRoute><Contact /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forget-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/user/Reset-Password/:token" element={<ResetPassword />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/auth/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Authenticated routes strictly protected & role-guarded */}
        <Route path="/dashboard" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="service-orders" element={<ServiceOrders />} />
          <Route path="orders" element={<ServiceOrders />} />
          <Route path="service-projects" element={<ServiceProjects />} />
          <Route path="service-projects/:id" element={<ServiceProjectDetail />} />
          <Route path="findings" element={<Findings />} />
          <Route path="reports" element={<Reports />} />

          {/* Platform Administration (Admin only) */}
          <Route path="admin" element={
            <RoleGuard allowedRoles={['admin']}>
              <Admin />
            </RoleGuard>
          } />

          {/* Developer Operations (Developer, Admin) */}
          <Route path="developer" element={
            <RoleGuard allowedRoles={['admin', 'developer']}>
              <Developer />
            </RoleGuard>
          } />

          {/* Security Engineer Operations (Security Engineer, Admin) */}
          <Route path="security" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer']}>
              <SecurityEngineer />
            </RoleGuard>
          } />

          {/* Malware Analysis Lab */}
          <Route path="malware" element={
            <RoleGuard allowedRoles={['admin', 'malware_analyst', 'security_engineer', 'developer', 'client_owner', 'client_member']}>
              <MalwareAnalysis />
            </RoleGuard>
          } />

          {/* Remediation Kanban Board */}
          <Route path="remediation" element={
            <RoleGuard allowedRoles={['admin', 'developer', 'security_engineer', 'malware_analyst', 'client_owner', 'client_member']}>
              <Remediation />
            </RoleGuard>
          } />

          {/* Retesting Queue */}
          <Route path="retest" element={
            <RoleGuard allowedRoles={['admin', 'developer', 'security_engineer', 'malware_analyst', 'client_owner', 'client_member']}>
              <RetestPage />
            </RoleGuard>
          } />

          {/* Assessment Wizard */}
          <Route path="assessment/new" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer', 'developer', 'malware_analyst', 'client_owner', 'client_member']}>
              <AssessmentWizard />
            </RoleGuard>
          } />

          {/* Security Scopes & Company Policies */}
          <Route path="scopes" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer', 'developer', 'malware_analyst', 'client_owner', 'client_member']}>
              <Scopes />
            </RoleGuard>
          } />

          <Route path="rules" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer', 'developer', 'malware_analyst', 'client_owner']}>
              <CompanyRules />
            </RoleGuard>
          } />

          {/* Deleted Scans Archive */}
          <Route path="scans/deleted" element={
            <RoleGuard allowedRoles={['admin', 'security_engineer', 'developer', 'malware_analyst', 'client_owner', 'client_member']}>
              <DeletedScans />
            </RoleGuard>
          } />

          {/* Subscription & Billing (Client Owner, Admin) */}
          <Route path="billing" element={
            <RoleGuard allowedRoles={['admin', 'client_owner', 'client_member']}>
              <Billing />
            </RoleGuard>
          } />

          {/* Telemetry and Results */}
          <Route path="assessment/:id/progress" element={<ScanProgress />} />
          <Route path="assessment/:id/results" element={<ScanResults />} />
        </Route>

        <Route path="*" element={<CatchAllRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
