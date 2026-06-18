import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ApiResponse, AuthUser } from "@helios/types";
import { api, setToken, getToken } from "../lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  hasAny: (perms: string[]) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get<ApiResponse<AuthUser>>("/auth/me")
      .then((r) => setUser(r.data.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post<ApiResponse<{ token: string; user: AuthUser }>>(
      "/auth/login",
      { email, password },
    );
    setToken(r.data.data.token);
    setUser(r.data.data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const permSet = new Set<string>(user?.permissions ?? []);
  const hasPermission = (perm: string) => permSet.has(perm);
  const hasAny = (perms: string[]) =>
    perms.length === 0 || perms.some((p) => permSet.has(p));

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, hasPermission, hasAny }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
