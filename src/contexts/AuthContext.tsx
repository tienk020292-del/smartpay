import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppUser } from '../types';

interface AuthContextType {
  user: any | null; // Simulates firebase User object for backwards-compatibility or general profile
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Retrieve token and verify active user session with server on bootup
  const checkSession = async () => {
    const token = localStorage.getItem('smart_pay_token');
    if (!token) {
      setAppUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userProfile = await response.json() as AppUser;
        setAppUser(userProfile);
      } else {
        // Token must be expired or invalid
        localStorage.removeItem('smart_pay_token');
        setAppUser(null);
      }
    } catch (err) {
      console.error("Session verification failed:", err);
      // Keep state or set offline depending on preference, we clear for security
      setAppUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, pass: string) => {
    const response = await fetch('/api/auth/login', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password: pass })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể đăng nhập. Vui lòng kiểm tra lại thông tin!");
    }

    const { token, user } = await response.json();
    localStorage.setItem('smart_pay_token', token);
    setAppUser(user);
  };

  const logout = async () => {
    const token = localStorage.getItem('smart_pay_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error("Logout request failed:", e);
      }
    }
    localStorage.removeItem('smart_pay_token');
    setAppUser(null);
  };

  const userSimulated = appUser ? {
    uid: appUser.uid,
    email: appUser.email,
    displayName: appUser.displayName
  } : null;

  return (
    <AuthContext.Provider value={{ user: userSimulated, appUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
