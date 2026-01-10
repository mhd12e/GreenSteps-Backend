import React, { useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import BlockerOverlay from "./BlockerOverlay";
import { useAuth } from "../state/AuthContext";
import { useApi } from "../hooks/useApi";
import { useBackendStatus } from "../hooks/useBackendStatus";
import { api_base } from "../config";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, refreshToken, setTokens, clearTokens, isAuthenticated } = useAuth();
  const { request } = useApi();
  const { isDown, isChecking, checkNow } = useBackendStatus();
  const authCheckRef = useRef({ inFlight: false, accessToken, refreshToken });

  useEffect(() => {
    authCheckRef.current.accessToken = accessToken;
    authCheckRef.current.refreshToken = refreshToken;
  }, [accessToken, refreshToken]);

  useEffect(() => {
    if (isDown) {
      document.body.classList.add("system-down");
    } else {
      document.body.classList.remove("system-down");
    }
    return () => {
      document.body.classList.remove("system-down");
    };
  }, [isDown]);

  useEffect(() => {
    checkNow();
  }, [checkNow]);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      if (authCheckRef.current.inFlight || cancelled) return;
      authCheckRef.current.inFlight = true;
      const currentAccess = authCheckRef.current.accessToken;
      const currentRefresh = authCheckRef.current.refreshToken;

      if (!currentAccess && !currentRefresh) {
        clearTokens();
        if (location.pathname !== "/auth") {
          navigate("/auth", { replace: true });
        }
        authCheckRef.current.inFlight = false;
        return;
      }

      try {
        if (currentAccess) {
          const resp = await fetch(`${api_base}/auth/protected`, {
            method: "GET",
            headers: { Authorization: `Bearer ${currentAccess}` }
          });
          if (resp.ok) {
            authCheckRef.current.inFlight = false;
            return;
          }
          if (resp.status !== 401) {
            authCheckRef.current.inFlight = false;
            return;
          }
        }

        if (currentRefresh) {
          const refreshResp = await fetch(`${api_base}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: currentRefresh })
          });
          const payload = await refreshResp.json().catch(() => ({}));
          if (refreshResp.ok) {
            setTokens(payload.data?.access_token, payload.data?.refresh_token);
            authCheckRef.current.inFlight = false;
            return;
          }
        }

        clearTokens();
        if (location.pathname !== "/auth") {
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        // Keep tokens on network errors; backend status overlay will handle UI.
      } finally {
        authCheckRef.current.inFlight = false;
      }
    };

    checkAuth();
    const intervalId = setInterval(checkAuth, 15000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [clearTokens, location.pathname, navigate, setTokens]);

  const handleLogout = async () => {
    if (!refreshToken) {
      clearTokens();
      return;
    }
    try {
      await request("/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
        skipRefresh: true
      });
    } catch (error) {
      // Ignore logout errors but clear tokens.
    } finally {
      clearTokens();
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <Link to="/" className="brand-title">
            GreenSteps
          </Link>
          <p className="brand-subtitle">
            Build sustainable impact plans and launch voice coaching sessions.
          </p>
        </div>
        <div className="header-actions">
          <div className="auth-cluster">
            <div className={`auth-pill ${isAuthenticated ? "signed" : "signed-out"}`}>
              {isAuthenticated ? "Signed in" : "Not signed in"}
            </div>
            {isAuthenticated ? (
              <button className="btn ghost compact" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" /> Logout
              </button>
            ) : (
              <Link className="btn ghost compact" to="/auth">
                <i className="fa-solid fa-lock" /> Go to login
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <NavLink
          to="/impacts"
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          <i className="fa-solid fa-seedling" /> Impacts
        </NavLink>
        <NavLink
          to="/account"
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          <i className="fa-regular fa-user" /> Account
        </NavLink>
      </nav>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        Keep this page open during voice sessions so the microphone stays connected.
      </footer>

      {isDown ? (
        <BlockerOverlay
          title="Backend unavailable"
          message="We cannot reach the server right now. Check your connection and try again."
          actionLabel={isChecking ? "Checking..." : "Try again"}
          onClose={checkNow}
        />
      ) : null}
    </div>
  );
};

export default Layout;
