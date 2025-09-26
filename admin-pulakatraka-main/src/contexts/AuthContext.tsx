import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getUser, signInWithEmail, signOut } from '../lib/supabase';
import type { UserProfile } from '../types/supabase';
import { AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        return;
      }

      const profile = await getUser();
      console.log('Perfil carregado:', profile);

      if (profile && profile.role === 'admin') {
        setUser(profile);
      } else {
        console.log('Usuário não é admin:', profile?.role);
        setUser(null);
        await signOut(); // Desloga se não for admin
      }
    } catch (error) {
      console.error('Falha ao verificar o estado de autenticação:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Evento de autenticação:', event);
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        checkUser();
      } else if (event === 'SIGNED_OUT') {
        console.log('Usuário deslogado');
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Tentando fazer login com:', email);
      
      const result = await signInWithEmail(email, password);
      
      // Após o login, getUser() irá buscar o perfil atualizado.
      const profile = await getUser();
      console.log('Perfil após login:', profile);

      if (!profile || profile.role !== 'admin') {
        console.log('Login falhou - não é admin:', profile?.role);
        await signOut(); // Desloga se não for admin
        throw new Error('Acesso não autorizado. Apenas administradores podem acessar este painel.');
      }

      setUser(profile);
      return { success: true };
    } catch (error: unknown) {
      console.error('Erro no login:', error);
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao fazer login.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
      console.log('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 