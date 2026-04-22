import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  permissions: string;
  mustChangePassword: boolean;
};

type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (path: string) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro ao fazer login" }));
      throw new Error(err.error ?? "Erro ao fazer login");
    }
    const data = await res.json();
    setUser(data);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro ao alterar senha" }));
      throw new Error(err.error ?? "Erro ao alterar senha");
    }
    setUser((prev) => prev ? { ...prev, mustChangePassword: false } : prev);
  }

  function hasPermission(path: string): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (!user.permissions) return false;
    const allowed = user.permissions.split(",").map((p) => p.trim());
    return allowed.includes(path);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
