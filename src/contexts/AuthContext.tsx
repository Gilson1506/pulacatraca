import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getUser, signInWithEmail, signInWithGoogle, signUp, signOut } from '../lib/supabase';
import type { UserProfile } from '../types/supabase';
import { AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { getCartData, clearCartData, hasValidCartData } from '../utils/cartStorage';

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

    // Listener para mudanças de autenticação (OAuth, etc)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          try {
            // Pequeno delay para garantir que o perfil foi criado no callback
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Buscar perfil do usuário
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('❌ Erro ao carregar perfil:', error);
              // Tentar buscar o usuário novamente com getUser
              try {
                const userProfile = await getUser();
                if (userProfile) {
                  console.log('✅ Perfil carregado via getUser:', userProfile.email);
                  setUser(userProfile);
                }
              } catch (getUserError) {
                console.error('❌ Erro ao buscar usuário:', getUserError);
              }
              return;
            }

            if (profile) {
              console.log('✅ Perfil carregado após login:', profile.email);
              setUser(profile);
            } else {
              console.warn('⚠️ Perfil não encontrado na tabela profiles');
            }
          } catch (error) {
            console.error('❌ Erro ao carregar perfil após login:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário saiu');
          setUser(null);
        }
      }
    );

    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const tryRestoreCheckout = (): string => {
    if (!hasValidCartData()) {
      console.log('🔍 Nenhum dado de carrinho válido encontrado');
      return '';
    }
    
    try {
      const checkoutData = getCartData();
      if (!checkoutData) {
        return '';
      }
      
      const data = checkoutData;
      console.log('💾 Dados de checkout encontrados:', data);
      console.log('💾 Estrutura dos dados encontrados:', {
        hasEvent: !!data.state.event,
        eventId: data.state.event?.id,
        eventTitle: data.state.event?.title,
        hasSelectedTickets: !!data.state.selectedTickets,
        ticketsCount: data.state.selectedTickets?.length,
        hasTotalAmount: !!data.state.totalAmount,
        returnTo: data.returnTo
      });
      
      // Remover dados do localStorage após recuperar
      clearCartData();
      
      const target = data.returnTo || '/checkout';
      
      // Criar estado completo para a página de checkout
      const state = {
        event: data.state.event,
        selectedTickets: data.state.selectedTickets,
        totalAmount: data.state.totalAmount,
        ticket: data.state.ticket
      };
      
      console.log('🔄 Restaurando checkout para:', target, 'com estado:', state);
      console.log('🔄 Estado final a ser passado:', {
        eventId: state.event.id,
        eventTitle: state.event.title,
        ticketsCount: state.selectedTickets.length,
        totalAmount: state.totalAmount
      });
      
      // Verificar se o state está sendo criado corretamente
      console.log('🔍 Verificação do state antes da navegação:');
      console.log('🔍 state.event:', state.event);
      console.log('🔍 state.selectedTickets:', state.selectedTickets);
      console.log('🔍 state.totalAmount:', state.totalAmount);
      console.log('🔍 state.ticket:', state.ticket);
      
      // Salvar dados no localStorage para garantir que cheguem ao checkout
      localStorage.setItem('checkout_restore_data', JSON.stringify(state));
      console.log('💾 Dados salvos no localStorage como backup');
      
      // Navegar para checkout - os dados serão recuperados via localStorage
      console.log('🚀 Executando navigate para:', target);
      navigate(target);
      
      return target as string;
    } catch (error) {
      console.error('❌ Erro ao processar dados do checkout:', error);
      // Limpar dados corrompidos
      sessionStorage.removeItem('checkout_data');
      return '';
    }
  };

  // Restaurar checkout ao detectar usuário logado após qualquer mudança de sessão (ex: retorno do OAuth)
  useEffect(() => {
    if (!loading && user) {
      console.log('👤 Usuário logado detectado:', user.name);
      // Não restaurar checkout aqui se já foi restaurado durante o login
      // O useEffect só deve restaurar checkout para casos de OAuth ou mudanças de sessão
    }
  }, [loading, user]);

  const login = async (email: string, password: string): Promise<string> => {
    setLoading(true);
    try {
      console.log('🔐 Tentando login com email:', email);
      const profile = await signInWithEmail(email, password);
      if (!profile) {
        throw new Error('Falha na autenticação');
      }
      if (profile.role !== 'user' && profile.role !== 'organizer' && profile.role !== 'admin') {
        throw new Error('Função de usuário inválida');
      }
      
      console.log('✅ Login bem-sucedido para:', profile.name);
      setUser(profile);
      
      // Tentar restaurar checkout antes de qualquer redirecionamento
      const restored = tryRestoreCheckout();
      if (restored) {
        console.log('🔄 Checkout restaurado para:', restored);
        return restored;
      }
      
      // Redirecionamento padrão baseado no papel
      if (profile.role === 'organizer' || profile.role === 'admin') {
        console.log('🏢 Redirecionando para dashboard do organizador');
        return '/organizer-dashboard';
      }
      
      console.log('👤 Redirecionando para perfil do usuário');
      return '/profile';
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      throw new Error(error.message || 'Erro no login');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<string> => {
    setLoading(true);
    try {
      console.log('🔐 Tentando login com Google');
      await signInWithGoogle();
      
      // Tentar restaurar checkout antes de qualquer redirecionamento
      const restored = tryRestoreCheckout();
      if (restored) {
        console.log('🔄 Checkout restaurado para:', restored);
        return restored;
      }
      
      console.log('👤 Redirecionando para perfil do usuário');
      return '/profile';
    } catch (error: any) {
      console.error('❌ Erro no login com Google:', error);
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
      console.log('📝 Tentando registro para:', email, 'com papel:', role);
      const profile = await signUp(email, password, name, role);
      if (!profile) {
        throw new Error('Falha ao criar conta');
      }
      
      console.log('✅ Registro bem-sucedido para:', profile.name);
      setUser(profile);
      
      // Tentar restaurar checkout antes de qualquer redirecionamento
      const restored = tryRestoreCheckout();
      if (restored) {
        console.log('🔄 Checkout restaurado para:', restored);
        return restored;
      }
      
      // Redirecionamento padrão baseado no papel
      if (profile.role === 'organizer' || profile.role === 'admin') {
        console.log('🏢 Redirecionando para dashboard do organizador');
        return '/organizer-dashboard';
      }
      
      console.log('👤 Redirecionando para perfil do usuário');
      return '/profile';
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
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