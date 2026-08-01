import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('akaleta_token'));

  const redirectTo = useCallback((path) => {
    if (typeof window !== 'undefined') {
      window.location.assign(path);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('akaleta_token');
    localStorage.removeItem('akaleta_refresh');
    setToken(null);
    setUser(null);
    api.post('/auth/logout').catch(() => {});
    redirectTo('/login');
  }, [redirectTo]);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('akaleta_token');
      if (!storedToken) { setLoading(false); return; }
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setToken(storedToken);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [logout]);

  const login = async (email, password, rememberMe) => {
    try {
      const res = await api.post('/auth/login', { email, password, rememberMe });
      const { user: userData, accessToken, refreshToken } = res.data;
      localStorage.setItem('akaleta_token', accessToken);
      if (rememberMe) localStorage.setItem('akaleta_refresh', refreshToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setToken(accessToken);
      setUser(userData);
      
      // ✅ FIX: Force redirect to dashboard after login
      redirectTo('/app/dashboard');
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (fullName, email, phone, password) => {
    try {
      const res = await api.post('/auth/register', { fullName, email, phone, password });
      const { user: userData, accessToken, refreshToken } = res.data;
      localStorage.setItem('akaleta_token', accessToken);
      localStorage.setItem('akaleta_refresh', refreshToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setToken(accessToken);
      setUser(userData);
      
      // ✅ FIX: Force redirect to dashboard after registration
      redirectTo('/app/dashboard');
      
      return userData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};