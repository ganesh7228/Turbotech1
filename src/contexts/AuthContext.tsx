import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../lib/firebase';

axios.defaults.withCredentials = true;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, code: string) => Promise<{ isNewUser: boolean }>;
  updateProfile: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get('/api/me');
      if (data.firebaseToken) {
        try {
          await signInWithCustomToken(auth, data.firebaseToken);
        } catch (authErr) {
          console.warn("[AuthContext] Firebase frontend auth failed, using session only:", authErr);
        }
      }
      setUser(data.user);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, code: string) => {
    const { data } = await axios.post('/api/verify-otp', { phone, code });
    if (data.firebaseToken) {
      try {
        await signInWithCustomToken(auth, data.firebaseToken);
      } catch (authErr) {
        console.warn("[AuthContext] Login: Firebase frontend auth failed, using session only:", authErr);
      }
    }
    setUser(data.user);
    return { user: data.user, isNewUser: data.isNewUser };
  };

  const updateProfile = async (name: string) => {
    const { data } = await axios.post('/api/update-profile', { name });
    setUser(data.user);
  };

  const logout = async () => {
    await axios.post('/api/logout');
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
