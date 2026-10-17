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
import { useAuthStore } from './store/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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

        {/* Authenticated routes strictly protected */}
        <Route path="/dashboard" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="findings" element={<Findings />} />
          <Route path="malware" element={<MalwareAnalysis />} />
          <Route path="reports" element={<Reports />} />
          <Route path="assessment/new" element={<AssessmentWizard />} />
          <Route path="assessment/:id/progress" element={<ScanProgress />} />
          <Route path="assessment/:id/results" element={<ScanResults />} />
          <Route path="scopes" element={<Scopes />} />
          <Route path="rules" element={<CompanyRules />} />
          <Route path="scans/deleted" element={<DeletedScans />} />
          <Route path="remediation" element={<Remediation />} />
          <Route path="retest" element={<RetestPage />} />
          <Route path="admin" element={<Admin />} />
          <Route path="billing" element={<Billing />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
