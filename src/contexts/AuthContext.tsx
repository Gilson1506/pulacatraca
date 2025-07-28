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
    // Check for existing session
    const checkUser = async () => {
      try {
        const profile = await getUser();
        console.log('Perfil verificado na inicialização:', profile); // DEBUG
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

  const login = async (email: string, password: string): Promise<string> => {
    setLoading(true);
    try {
      const profile = await signInWithEmail(email, password);
      console.log('Perfil recebido no login:', profile); // DEBUG
      
      if (!profile) {
        throw new Error('Falha na autenticação');
      }
      
      if (profile.role !== 'user' && profile.role !== 'organizer' && profile.role !== 'admin') {
        throw new Error('Função de usuário inválida');
      }
      
      setUser(profile);
      
      // Return the appropriate dashboard route
      if (profile.role === 'organizer' || profile.role === 'admin') {
        return '/organizer-dashboard';
      }
      return '/profile';
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error instanceof AuthError) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor, confirme seu email antes de fazer login');
        }
      }
      throw new Error(error.message || 'Erro no login');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<string> => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Return profile dashboard route after Google login
      return '/profile';
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
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
      console.log('Perfil criado/recuperado no registro:', profile); // DEBUG
      
      if (!profile) {
        throw new Error('Falha ao criar conta');
      }
      
      setUser(profile);
      
      // Return the appropriate dashboard route
      if (profile.role === 'organizer' || profile.role === 'admin') {
        return '/organizer-dashboard';
      }
      return '/profile';
    } catch (error: any) {
      console.error('Erro no registro:', error);
      
      // Se o erro é relacionado a duplicação e conseguimos recuperar o perfil
      if (error.message && error.message.includes('duplicate key value')) {
        try {
          const existingProfile = await getUser();
          if (existingProfile) {
            console.log('Perfil existente encontrado após erro de duplicação:', existingProfile);
            setUser(existingProfile);
            
            if (existingProfile.role === 'organizer' || existingProfile.role === 'admin') {
              return '/organizer-dashboard';
            }
            return '/profile';
          }
        } catch (fallbackError) {
          console.error('Erro ao recuperar perfil existente:', fallbackError);
        }
      }
      
      if (error instanceof AuthError) {
        if (error.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado');
        } else if (error.message.includes('Password should be at least 6 characters')) {
          throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
      }
      throw new Error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
      setUser(null);
      navigate('/');
    } catch (error: any) {
      console.error('Erro no logout:', error);
      // Force logout even if API call fails
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

  const value = {
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    loading,
    getDashboardRoute
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};