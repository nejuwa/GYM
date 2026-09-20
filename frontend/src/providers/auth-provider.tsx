"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getToken,
  removeRefreshToken,
  removeToken,
  setRefreshToken,
  setToken,
} from "@/lib/auth";
import { getMe, login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setAuthCookie(token: string) {
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax`;
}

function clearAuthState() {
  removeToken();
  removeRefreshToken();
  document.cookie = "token=; path=/; max-age=0; samesite=lax";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const response = await getMe();
    setUser(response.user);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      setAuthCookie(token);
      refreshUser()
        .catch(() => {
          clearAuthState();
          setUser(null);
        })
        .finally(() => setLoading(false));
    });
  }, [refreshUser]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const response = await apiLogin(usernameOrEmail, password);
    setToken(response.token);
    setRefreshToken(response.refreshToken);
    setAuthCookie(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    if (getToken()) {
      await apiLogout().catch(() => undefined);
    }
    clearAuthState();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
