import React, { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import ImpactsPage from "./pages/ImpactsPage";
import ImpactDetailsPage from "./pages/ImpactDetailsPage";
import StepPage from "./pages/StepPage";
import AccountPage from "./pages/AccountPage";
import { useAuth } from "./state/AuthContext";

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

const App = () => {
  const location = useLocation();

  useEffect(() => {
    AOS.init({
      duration: 400,
      easing: "ease-out",
      once: true
    });
  }, []);

  useEffect(() => {
    AOS.refresh();
  }, [location.pathname]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/impacts" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/impacts"
          element={
            <RequireAuth>
              <ImpactsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/impacts/:impactId"
          element={
            <RequireAuth>
              <ImpactDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/impacts/:impactId/steps/:stepId/step"
          element={
            <RequireAuth>
              <StepPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/impacts" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
