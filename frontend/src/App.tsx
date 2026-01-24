import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthPage from '@/pages/auth/auth-page';
import Dashboard from '@/pages/dashboard';
import ImpactsList from '@/pages/impacts/list';
import GenerateImpactPage from '@/pages/impacts/generate';
import ImpactDetailPage from '@/pages/impacts/detail';
import ProfilePage from '@/pages/profile';
import MaterialAI from '@/pages/materials/coming-soon';
import SessionPage from '@/pages/session';
import { MainLayout } from '@/components/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { HealthGuard } from '@/components/health-guard';
import { LivingBackground } from '@/components/layout/living-background';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <LivingBackground />
      <HealthGuard>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/impacts" element={<ImpactsList />} />
              <Route path="/materials" element={<MaterialAI />} />
              <Route path="/profile" element={<ProfilePage />} />
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
