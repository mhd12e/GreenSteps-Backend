import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { api_base } from "../config";

export const useApi = () => {
  const navigate = useNavigate();
  const { accessToken, refreshToken, setTokens, clearTokens } = useAuth();
  const apiBase = api_base;

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) {
      clearTokens();
      navigate("/auth", { replace: true });
      return false;
    }
    try {
      const response = await fetch(`${apiBase}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Refresh failed");
      }
      const data = payload.data || {};
      setTokens(data.access_token, data.refresh_token);
      return true;
    } catch (error) {
      clearTokens();
      navigate("/auth", { replace: true });
      return false;
    }
  }, [apiBase, clearTokens, navigate, refreshToken, setTokens]);

  const request = useCallback(
    async (path, options = {}) => {
      if (!apiBase) {
        throw new Error("API base is required");
      }
      const headers = { ...(options.headers || {}) };
      if (options.auth && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`${apiBase}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 && !options._retry && !options.skipRefresh) {
          const refreshed = await refreshTokens();
          if (refreshed) {
            return request(path, { ...options, _retry: true });
          }
        }
        let message = payload?.error?.message || `Request failed (${response.status})`;
        if (payload?.error?.code === "validation_error" && Array.isArray(payload.error.details)) {
          const first = payload.error.details[0];
          if (first) {
            const field = Array.isArray(first.loc) ? first.loc.slice(1).join(".") : "";
            if (field.includes("password")) {
              message = "Please enter a password with at least 8 characters.";
            } else if (field.includes("full_name")) {
              message = "Please enter your full name (at least two words).";
            } else if (field.includes("age")) {
              message = "Please enter a valid age (3 or older).";
            } else if (field.includes("email")) {
              message = "Please enter a valid email address.";
            } else if (field.includes("interests")) {
              message = "Please add at least one interest.";
            } else {
              message = first.msg || message;
            }
          }
        }
        throw new Error(message);
      }
      return payload.data;
    },
    [accessToken, apiBase, refreshTokens]
  );

  return { request };
};
