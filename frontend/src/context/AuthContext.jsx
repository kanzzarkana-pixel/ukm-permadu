import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

const getStorage = () => {
  // Prefer localStorage if remember-me was set, else sessionStorage
  if (localStorage.getItem("permadu_token")) return localStorage;
  if (sessionStorage.getItem("permadu_token")) return sessionStorage;
  return null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      const s = getStorage() || localStorage;
      s.setItem("permadu_user", JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const storage = getStorage();
    if (storage) {
      const stored = storage.getItem("permadu_user");
      if (stored) setUser(JSON.parse(stored));
      api.get("/auth/me")
        .then((r) => {
          setUser(r.data);
          storage.setItem("permadu_user", JSON.stringify(r.data));
        })
        .catch(() => {
          localStorage.removeItem("permadu_token"); localStorage.removeItem("permadu_user");
          sessionStorage.removeItem("permadu_token"); sessionStorage.removeItem("permadu_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, remember = true) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const storage = remember ? localStorage : sessionStorage;
      // clear the other storage
      const other = remember ? sessionStorage : localStorage;
      other.removeItem("permadu_token"); other.removeItem("permadu_user");
      storage.setItem("permadu_token", data.access_token);
      storage.setItem("permadu_user", JSON.stringify(data.user));
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e?.response?.data?.detail) };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      // Kalau backend langsung balikin token, auto-login
      if (data?.access_token) {
        localStorage.setItem("permadu_token", data.access_token);
        localStorage.setItem("permadu_user", JSON.stringify(data.user));
        setUser(data.user);
        return { ok: true, autoLogin: true };
      }
      // Kalau tidak, anggap perlu login manual (mis. menunggu approval admin)
      return { ok: true, autoLogin: false, message: data?.message || "Registrasi berhasil. Silakan masuk." };
    } catch (e) {
      return { ok: false, error: formatApiError(e?.response?.data?.detail) };
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      await api.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e?.response?.data?.detail) };
    }
  };

  const logout = () => {
    localStorage.removeItem("permadu_token"); localStorage.removeItem("permadu_user");
    sessionStorage.removeItem("permadu_token"); sessionStorage.removeItem("permadu_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, register, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);