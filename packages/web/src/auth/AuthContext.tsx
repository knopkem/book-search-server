import { GoogleOAuthProvider } from '@react-oauth/google';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest, ApiError } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  googleClientId: string;
  googleEnabled: boolean;
  loading: boolean;
  signIn: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await apiRequest<User>('/api/me');
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }

      throw error;
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const authConfig = await apiRequest<{ clientId: string; enabled: boolean }>('/api/auth/google/config');
        setGoogleClientId(authConfig.clientId);
        setGoogleEnabled(authConfig.enabled);
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      googleClientId,
      googleEnabled,
      loading,
      signIn: async (credential: string) => {
        const response = await apiRequest<{ user: User }>('/api/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        });
        setUser(response.user);
      },
      signOut: async () => {
        await apiRequest<void>('/api/auth/logout', {
          method: 'POST',
        });
        setUser(null);
      },
      refreshUser,
    }),
    [googleClientId, googleEnabled, loading, user],
  );

  const content = <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

  if (!googleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
