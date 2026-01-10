import React, { createContext, useContext, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.accessToken) || ""
  );
  const [refreshToken, setRefreshToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.refreshToken) || ""
  );

  const setTokens = (access, refresh) => {
    const accessValue = access || "";
    const refreshValue = refresh || "";
    setAccessToken(accessValue);
    setRefreshToken(refreshValue);
    if (accessValue) {
      localStorage.setItem(STORAGE_KEYS.accessToken, accessValue);
    } else {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
    }
    if (refreshValue) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshValue);
    } else {
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
    }
  };

  const clearTokens = () => setTokens("", "");

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      setTokens,
      clearTokens,
      isAuthenticated: Boolean(accessToken)
    }),
    [accessToken, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
