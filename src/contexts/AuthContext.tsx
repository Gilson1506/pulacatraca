import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getUser, signInWithEmail, signInWithGoogle, signUp, signOut } from '../lib/supabase';
import type { UserProfile } from '../types/supabase';
import { AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<string>;
  loginWithGoogle: () => Promise<string>;
  register: (name: string, email: string, password: string, role?: 'user' | 'organizer') => Promise<string>;
  logout: () => Promise<void>;
  loading: boolean;
  getDashboardRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const profile = await getUser();
        if (profile && (profile.role === 'user' || profile.role === 'organizer' || profile.role === 'admin')) {
          setUser(profile);
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const tryRestoreCheckout = (): string => {
    const checkoutData = sessionStorage.getItem('checkout_data');
    if (!checkoutData) return '';
    try {
      const data = JSON.parse(checkoutData);
      sessionStorage.removeItem('checkout_data');
      const target = data.returnTo || '/checkout';
      const state = data.state || { event: data.event, ticket: data.ticket };
      navigate(target, { state, replace: true });
      return target as string;
    } catch (error) {
      console.error('Erro ao processar dados do checkout:', error);
      return '';
    }
  };

  // Restaurar checkout ao detectar usuário logado após qualquer mudança de sessão (ex: retorno do OAuth)
  useEffect(() => {
    if (!loading && user) {
      const hasCheckout = !!sessionStorage.getItem('checkout_data');
      if (hasCheckout) {
        tryRestoreCheckout();
      }
    }
  }, [loading, user]);

  const login = async (email: string, password: string): Promise<string> => {
    setLoading(true);
    try {
      const profile = await signInWithEmail(email, password);
      if (!profile) {
        throw new Error('Falha na autenticação');
      }
      if (profile.role !== 'user' && profile.role !== 'organizer' && profile.role !== 'admin') {
        throw new Error('Função de usuário inválida');
      }
      setUser(profile);
      const restored = tryRestoreCheckout();
      if (restored) return restored;
      if (profile.role === 'organizer' || profile.role === 'admin') {
        return '/organizer-dashboard';
      }
      return '/profile';
    } catch (error: any) {
      throw new Error(error.message || 'Erro no login');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<string> => {
    setLoading(true);
    try {
      await signInWithGoogle();
      const restored = tryRestoreCheckout();
      return restored || '/profile';
    } catch (error: any) {
      throw new Error('Erro ao fazer login com Google');
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'user' | 'organizer' = 'user'
  ): Promise<string> => {
    setLoading(true);
    try {
      const profile = await signUp(email, password, name, role);
      if (!profile) {
        throw new Error('Falha ao criar conta');
      }
      setUser(profile);
      const restored = tryRestoreCheckout();
      if (restored) return restored;
      if (profile.role === 'organizer' || profile.role === 'admin') {
        return '/organizer-dashboard';
      }
      return '/profile';
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    if (user.role === 'organizer' || user.role === 'admin') {
      return '/organizer-dashboard';
    }
    return '/profile';
  };

  const value = { user, login, loginWithGoogle, register, logout, loading, getDashboardRoute };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};