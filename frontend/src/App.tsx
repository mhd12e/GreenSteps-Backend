import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from '@/pages/auth/login';
import RegisterPage from '@/pages/auth/register';
import Dashboard from '@/pages/dashboard';
import GenerateImpactPage from '@/pages/impacts/generate';
import ImpactDetailPage from '@/pages/impacts/detail';
import SessionPage from '@/pages/session';
import { MainLayout } from '@/components/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { HealthGuard } from '@/components/health-guard';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <HealthGuard>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/impacts/generate" element={<GenerateImpactPage />} />
              <Route path="/impacts/:impactId" element={<ImpactDetailPage />} />
            </Route>
            {/* Session page without MainLayout (Full screen) */}
            <Route path="/impacts/:impactId/:stepId" element={<SessionPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HealthGuard>
    </BrowserRouter>
  );
}

export default App;
