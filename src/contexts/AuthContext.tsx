import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getUser, signInWithEmail, signInWithGoogle, signUp, signOut } from '../lib/supabase';
import type { UserProfile } from '../types/supabase';
import { AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string, role?: 'user' | 'organizer') => Promise<UserProfile>;
  logout: () => Promise<void>;
  loading: boolean;
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
        if (profile && (profile.role === 'user' || profile.role === 'organizer')) {
          setUser(profile);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Evento de autenticação:', event, 'Sessão:', session); // DEBUG
      
      if (event === 'SIGNED_IN' && session?.user?.id) {
        try {
          console.log('Iniciando processo de SIGNED_IN para usuário:', session.user.id); // DEBUG
          
          // Aguardar um pouco para garantir que a sessão esteja estabelecida
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const profile = await getUser();
          console.log('Perfil obtido após SIGNED_IN:', profile); // DEBUG
          
          if (!profile) {
            console.error('Perfil não encontrado após SIGNED_IN para usuário:', session.user.id); // DEBUG
            // Tentar criar o perfil se não existir
            console.log('Tentando criar perfil automaticamente...'); // DEBUG
            const newProfile = await getUser(); // getUser já tenta criar o perfil se não existir
            if (!newProfile) {
              console.error('Falha ao criar perfil automaticamente'); // DEBUG
              return;
            }
            setUser(newProfile);
            navigate('/');
            return;
          }

          if (profile.role !== 'user' && profile.role !== 'organizer') {
            console.error('Role inválida para usuário:', session.user.id, 'Role:', profile.role); // DEBUG
            return;
          }

          console.log('Atualizando estado do usuário com perfil:', profile); // DEBUG
          setUser(profile);
          
          console.log('Redirecionando usuário baseado na role:', profile.role); // DEBUG
          if (profile.role === 'organizer') {
            navigate('/organizer-dashboard');
          } else {
            navigate('/');
          }
        } catch (error) {
          console.error('Erro ao processar SIGNED_IN:', error); // DEBUG
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('Usuário fez logout, redirecionando para home'); // DEBUG
        setUser(null);
        navigate('/');
      }
    });

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      console.log('Iniciando processo de login para:', email); // DEBUG
      const { user: authUser, session } = await signInWithEmail(email, password);
      
      if (!authUser) {
        console.error('Login falhou: Nenhum usuário retornado'); // DEBUG
        throw new Error('Login failed: No user returned');
      }

      console.log('Login bem sucedido para usuário:', authUser.id); // DEBUG
      console.log('Aguardando onAuthStateChange para buscar perfil...'); // DEBUG
      
      // Não buscamos o perfil aqui, deixamos o onAuthStateChange fazer isso
      // para evitar chamadas duplicadas
      
      return { id: authUser.id, email: authUser.email || '', name: '', role: 'user' } as UserProfile;
    } catch (error: unknown) {
      console.error('Erro durante o login:', error); // DEBUG
      if (error instanceof AuthError || error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Auth state change listener will handle updating the user
    } catch (error: unknown) {
      console.error('Google login error:', error);
      if (error instanceof AuthError || error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: 'user' | 'organizer' = 'user'): Promise<UserProfile> => {
    setLoading(true);
    try {
      const { user: newUser } = await signUp(email, password, { name, role });
      if (!newUser) throw new Error('Registro falhou');
      const profile: UserProfile = {
        id: newUser.id,
        email: newUser.email || '',
        name,
        role,
        created_at: new Date().toISOString(),
        is_active: true,
        is_verified: false,
      } as unknown as UserProfile;
      return profile;
    } catch (error: unknown) {
      console.error('Registration error:', error);
      if (error instanceof AuthError || error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
      setUser(null);
      navigate('/');
    } catch (error: unknown) {
      console.error('Logout error:', error);
      if (error instanceof AuthError || error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};