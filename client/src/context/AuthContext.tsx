import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthState {
  username: string | null;
  isAdmin: boolean;
  secretKey: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, secretKey?: string) => Promise<boolean>;
  elevate: (secretKey: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'familywatch_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          username: parsed.username || null,
          isAdmin: Boolean(parsed.isAdmin),
          secretKey: parsed.secretKey || null,
          isAuthenticated: Boolean(parsed.username),
        };
      }
    } catch {
      // Ignore
    }
    return {
      username: null,
      isAdmin: false,
      secretKey: null,
      isAuthenticated: false,
    };
  });

  useEffect(() => {
    if (auth.isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  const login = async (username: string, secretKey?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, secretKey }),
      });
      const data = await res.json();
      if (data.success) {
        setAuth({
          username: data.user.username,
          isAdmin: data.user.isAdmin,
          secretKey: secretKey || null,
          isAuthenticated: true,
        });
        return true;
      }
      return false;
    } catch {
      // Fallback local auth if server API unreachable
      setAuth({
        username: username.trim(),
        isAdmin: Boolean(secretKey),
        secretKey: secretKey || null,
        isAuthenticated: true,
      });
      return true;
    }
  };

  const elevate = async (secretKey: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/elevate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });
      const data = await res.json();
      if (data.success) {
        setAuth((prev) => ({
          ...prev,
          isAdmin: true,
          secretKey,
        }));
        return { success: true };
      }
      return { success: false, message: data.error || 'Invalid secret key' };
    } catch {
      return { success: false, message: 'Server communication error' };
    }
  };

  const logout = () => {
    setAuth({
      username: null,
      isAdmin: false,
      secretKey: null,
      isAuthenticated: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, elevate, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

