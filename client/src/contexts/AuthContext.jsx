/** @jsxImportSource solid-js */
import { createContext, useContext, createSignal, onMount } from "solid-js";
import { apiFetch } from "../utils/api";

const AuthContext = createContext();

export function AuthProvider(props) {
  const [user, setUser] = createSignal(null);
  const [token, setToken] = createSignal(localStorage.getItem("token"));
  const [loading, setLoading] = createSignal(true);

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  onMount(async () => {
    const currentToken = token();
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/auth/me", {});
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
