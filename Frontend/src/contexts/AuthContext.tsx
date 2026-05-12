import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { apiFetch, clearTokens, setTokens, getAccessToken } from "@/lib/api";

export type UserRole = "user" | "master" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_USER = "sb_user";

function mapApiRole(roleName: string): UserRole {
  const r = (roleName || "").toLowerCase();
  if (r === "client") return "user";
  if (r === "master") return "master";
  if (r === "admin") return "admin";
  return "user";
}

function toAuthUser(payload: {
  id: number;
  full_name?: string;
  email?: string;
  username?: string;
  role?: string | { role_name: string };
}): AuthUser {
  const roleRaw = typeof payload.role === "object" && payload.role ? payload.role.role_name : String(payload.role || "");
  return {
    id: String(payload.id),
    name: payload.full_name || payload.username || "Пользователь",
    email: payload.email || payload.username || "",
    role: mapApiRole(roleRaw),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_USER);
    if (!getAccessToken()) return null;
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [bootstrapping, setBootstrapping] = useState(!!getAccessToken());

  const persistUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_USER);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiFetch<{
          id: number;
          full_name: string;
          email: string;
          username: string;
          role: { role_name: string };
        }>("/api/auth/profile/");
        if (!cancelled) persistUser(toAuthUser(profile));
      } catch {
        if (!cancelled) {
          clearTokens();
          persistUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{
        access: string;
        refresh: string;
        user: { id: number; username: string; full_name: string; email: string; role: string };
      }>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username: email.trim(), password }),
      });
      setTokens(data.access, data.refresh);
      const u = toAuthUser({
        id: data.user.id,
        full_name: data.user.full_name,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
      });
      persistUser(u);
      addLog(`Вход: ${u.name}`);
    },
    [persistUser],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await apiFetch("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      await login(email.trim(), password);
      addLog(`Регистрация: ${name}`);
    },
    [login],
  );

  const logout = useCallback(() => {
    if (user) addLog(`Выход: ${user.name}`);
    clearTokens();
    persistUser(null);
  }, [user, persistUser]);

  return (
    <AuthContext.Provider value={{ user, bootstrapping, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function addLog(action: string) {
  const logs = JSON.parse(localStorage.getItem("sb_logs") || "[]") as { action: string; timestamp: string }[];
  logs.unshift({ action, timestamp: new Date().toISOString() });
  if (logs.length > 100) logs.length = 100;
  localStorage.setItem("sb_logs", JSON.stringify(logs));
}

export function getLogs(): { action: string; timestamp: string }[] {
  return JSON.parse(localStorage.getItem("sb_logs") || "[]") as { action: string; timestamp: string }[];
}
