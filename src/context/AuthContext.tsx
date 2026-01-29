import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, hasRole } from '../lib/supabase';
import type { AppRole, AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkRole: (role: AppRole) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const updateUserRole = useCallback(async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setUser(null);
      setIsAdmin(false);
      return;
    }

    const adminStatus = await hasRole(supabaseUser.id, 'admin');

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role: adminStatus ? 'admin' : null,
    });
    setIsAdmin(adminStatus);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      updateUserRole(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        await updateUserRole(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [updateUserRole]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Check if user has admin role
      if (data.user) {
        const adminStatus = await hasRole(data.user.id, 'admin');
        if (!adminStatus) {
          await supabase.auth.signOut();
          return { error: new Error('Access denied. Admin privileges required.') };
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setSession(null);
  };

  const checkRole = async (role: AppRole): Promise<boolean> => {
    if (!session?.user) return false;
    return hasRole(session.user.id, role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAdmin,
        signIn,
        signOut,
        checkRole,
      }}
    >
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
