import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import * as userApi from '../api/userApi';

export const AuthContext = createContext(null);

// ─── Inner provider that has access to useNavigate (must be inside BrowserRouter) ──
function AuthProviderInner({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── On mount: restore user from localStorage ──────────────────────────────
  useEffect(() => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const stored = localStorage.getItem('user');
      if (accessToken && stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Corrupt data — clear and stay logged out
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = async (loginData) => {
    // authApi.login already stores accessToken, refreshToken, user in localStorage
    const response = await authApi.login(loginData);
    setUser(response.user);
    return response;
  };

  // ── register ──────────────────────────────────────────────────────────────
  const register = async (registerData) => {
    const response = await authApi.register(registerData);
    // Auto-login: store tokens if the register endpoint returns them
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    }
    return response;
  };

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    authApi.logout(); // clears localStorage
    setUser(null);
    navigate('/login', { replace: true });
  };

  // ── refreshUser ───────────────────────────────────────────────────────────
  const refreshUser = async (userId) => {
    try {
      const res = await userApi.getProfile(userId);
      const fresh = res.data ?? res;
      localStorage.setItem('user', JSON.stringify(fresh));
      setUser(fresh);
    } catch {
      // Silently ignore — user stays as-is
    }
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, isAdmin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Public export: AuthProvider wraps the inner component ───────────────────
export function AuthProvider({ children }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}
