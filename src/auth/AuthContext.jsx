import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("roomflow.token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("roomflow.user");
    return raw ? JSON.parse(raw) : null;
  });
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }
    api("/api/v1/auth/me", { token })
      .then((me) => {
        setUser(me);
        localStorage.setItem("roomflow.user", JSON.stringify(me));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("roomflow.token");
        localStorage.removeItem("roomflow.user");
      })
      .finally(() => setBooting(false));
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      isAdmin: user?.role === "ADMIN",
      async login(email, password) {
        const data = await api("/api/v1/auth/login", { method: "POST", body: { email, password } });
        setToken(data.accessToken);
        setUser(data.user);
        localStorage.setItem("roomflow.token", data.accessToken);
        localStorage.setItem("roomflow.user", JSON.stringify(data.user));
        return data.user;
      },
      logout() {
        setToken(null);
        setUser(null);
        localStorage.removeItem("roomflow.token");
        localStorage.removeItem("roomflow.user");
      },
    }),
    [token, user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
