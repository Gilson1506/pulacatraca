import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, getUser, signInWithEmail, signInWithGoogle, signUp, signOut } from '../lib/supabase';
import { safeSetItem } from '../utils/cacheManager';
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
  
  // Ref para evitar loops infinitos
  const isInitialized = useRef(false);
  const isProcessingAuth = useRef(false);

  useEffect(() => {
    // Evitar execução dupla
    if (isInitialized.current) return;
    isInitialized.current = true;

    let isCheckingUser = false; // Lock para evitar múltiplas chamadas simultâneas
    
    const checkUser = async () => {
      // Evitar múltiplas chamadas simultâneas
      if (isCheckingUser) {
        console.log('⏳ checkUser já em andamento, ignorando...');
        return;
      }
      
      isCheckingUser = true;
      try {
        const profile = await getUser();
        if (profile && (profile.role === 'user' || profile.role === 'organizer' || profile.role === 'admin')) {
          setUser(profile);
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
        isCheckingUser = false;
      }
    };

    // NÃO chamar checkUser() aqui - aguardar INITIAL_SESSION do Supabase
    // checkUser();

    // Flag para saber se já recebemos INITIAL_SESSION
    let hasReceivedInitialSession = false;

    // Listener para mudanças de autenticação (OAuth, etc)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);

        // INITIAL_SESSION é disparado quando o Supabase termina de carregar a sessão
        if (event === 'INITIAL_SESSION') {
          hasReceivedInitialSession = true;
          console.log('🎬 Sessão inicial carregada');
          setLoading(false);
          if (session) {
            // Chamar checkUser apenas se houver sessão
            checkUser();
          }
          return;
        }

        // Ignorar SIGNED_IN - ele é disparado automaticamente pelo Supabase em várias situações:
        // 1. Durante inicialização (antes de INITIAL_SESSION)
        // 2. Quando faz refresh do token automaticamente
        // 3. Quando restaura sessão de outra aba
        // O INITIAL_SESSION já cuida de carregar o perfil na inicialização
        // E o cache de 30s evita recarregamentos desnecessários
        if (event === 'SIGNED_IN') {
          console.log('⏭️ Ignorando SIGNED_IN automático (perfil já carregado via INITIAL_SESSION ou cache)');
          return;
        }

        // Evitar processamento duplicado
        if (isProcessingAuth.current) {
          console.log('⚠️ Processamento de auth já em andamento, ignorando...');
          return;
        }

        if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário saiu');
          setUser(null);
          
          // Notificar outras abas
          try {
            const channel = new BroadcastChannel('pulacatraca-auth-sync');
            channel.postMessage({ type: 'AUTH_CHANGE' });
            channel.close();
          } catch (e) {
            // Ignorar se BroadcastChannel não estiver disponível
          }
        }
      }
    );

    // Sincronizar sessão entre abas do navegador com debounce para evitar múltiplas chamadas
    let checkUserTimeout: NodeJS.Timeout | null = null;
    
    const debouncedCheckUser = () => {
      // Se já está verificando, ignorar
      if (isCheckingUser) {
        console.log('⏳ checkUser já em andamento, ignorando...');
        return;
      }
      
      if (checkUserTimeout) {
        clearTimeout(checkUserTimeout);
      }
      checkUserTimeout = setTimeout(() => {
        checkUser();
      }, 1000); // Debounce aumentado para 1 segundo
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pulacatraca-auth' || e.key?.startsWith('sb-')) {
        console.log('🔄 Sessão alterada em outra aba, verificando usuário...');
        debouncedCheckUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // BroadcastChannel para sincronização mais rápida entre abas
    let authChannel: BroadcastChannel | null = null;
    try {
      authChannel = new BroadcastChannel('pulacatraca-auth-sync');
      authChannel.onmessage = (event) => {
        if (event.data.type === 'AUTH_CHANGE') {
          // Ignorar se já está verificando
          if (!isCheckingUser) {
            debouncedCheckUser();
          }
        }
      };
    } catch (error) {
      console.warn('BroadcastChannel não suportado, usando apenas storage events');
    }

    // Cleanup
    return () => {
      console.log('🧹 AuthContext - Limpando listeners e subscriptions...');
      
      // Unsubscribe do auth listener
      try {
        authListener?.subscription.unsubscribe();
      } catch (error) {
        console.error('Erro ao fazer unsubscribe do auth listener:', error);
      }
      
      // Remover storage event listener
      try {
        window.removeEventListener('storage', handleStorageChange);
      } catch (error) {
        console.error('Erro ao remover storage listener:', error);
      }
      
      // Fechar BroadcastChannel
      try {
        if (authChannel) {
          authChannel.close();
          authChannel = null;
        }
      } catch (error) {
        console.error('Erro ao fechar BroadcastChannel:', error);
      }
      
      // Limpar timeout
      try {
        if (checkUserTimeout) {
          clearTimeout(checkUserTimeout);
          checkUserTimeout = null;
        }
      } catch (error) {
        console.error('Erro ao limpar timeout:', error);
      }
      
      isInitialized.current = false;
      isCheckingUser = false;
    };
  }, []);

  const tryRestoreCheckout = useCallback((): string => {
    console.log('🔍 tryRestoreCheckout chamado - verificando dados do carrinho...');
    
    // Primeiro verificar se há dados no localStorage
    const rawData = localStorage.getItem('checkout_data');
    console.log('📦 Dados brutos do localStorage:', rawData ? 'encontrados' : 'não encontrados');
    
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        console.log('📦 Dados parseados:', parsed);
      } catch (e) {
        console.error('❌ Erro ao parsear dados brutos:', e);
      }
    }
    
    // Verificar se há dados válidos
    const hasValid = hasValidCartData();
    console.log('✅ hasValidCartData retornou:', hasValid);
    
    if (!hasValid) {
      console.log('🔍 Nenhum dado de carrinho válido encontrado');
      // Tentar verificar diretamente sem validação estrita
      const directData = getCartData();
      if (directData && directData.state) {
        console.log('⚠️ Dados encontrados mas validação falhou, tentando restaurar mesmo assim...');
        console.log('📦 Dados diretos:', directData);
      } else {
        return '';
      }
    }
    
    try {
      const checkoutData = getCartData();
      if (!checkoutData || !checkoutData.state) {
        console.log('❌ checkoutData é null ou não tem state');
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
      
      // Validar se temos pelo menos evento e ingressos
      if (!data.state.event || (!data.state.selectedTickets?.length && !data.state.ticket)) {
        console.log('❌ Dados incompletos - faltando evento ou ingressos');
        clearCartData();
        return '';
      }
      
      // Remover dados do localStorage após recuperar
      clearCartData();
      
      const target = data.returnTo || '/checkout';
      
      // Criar estado completo para a página de checkout
      const state = {
        event: data.state.event,
        selectedTickets: data.state.selectedTickets || [],
        totalAmount: data.state.totalAmount || 0,
        ticket: data.state.ticket
      };
      
      console.log('🔄 Restaurando checkout para:', target, 'com estado:', state);
      console.log('🔄 Estado final a ser passado:', {
        eventId: state.event?.id,
        eventTitle: state.event?.title,
        ticketsCount: state.selectedTickets?.length,
        totalAmount: state.totalAmount
      });
      
      // Salvar dados no localStorage para garantir que cheguem ao checkout
      safeSetItem('checkout_restore_data', JSON.stringify(state), { fallbackToSessionStorage: true, keyDescription: 'checkout_restore_data' });
      console.log('💾 Dados salvos no checkout_restore_data como backup');
      
      // Retornar a rota para que o LoginPage navegue
      console.log('✅ Retornando rota:', target);
      return target;
    } catch (error) {
      console.error('❌ Erro ao processar dados do checkout:', error);
      // Limpar dados corrompidos
      clearCartData();
      sessionStorage.removeItem('checkout_data');
      return '';
    }
  }, []);

  // Restaurar checkout ao detectar usuário logado após qualquer mudança de sessão (ex: retorno do OAuth)
  useEffect(() => {
    if (!loading && user) {
      console.log('👤 Usuário logado detectado:', user.name);
      // Não restaurar checkout aqui se já foi restaurado durante o login
      // O useEffect só deve restaurar checkout para casos de OAuth ou mudanças de sessão
    }
  }, [loading, user]);

  const login = useCallback(async (email: string, password: string): Promise<string> => {
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
      // Pequeno delay para garantir que tudo esteja pronto
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const restored = tryRestoreCheckout();
      console.log('🔐 Login - tryRestoreCheckout retornou:', restored);
      
      if (restored && restored === '/checkout') {
        console.log('🔄 Checkout restaurado, retornando rota:', restored);
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
  }, [tryRestoreCheckout]);

  const loginWithGoogle = useCallback(async (): Promise<string> => {
    setLoading(true);
    try {
      console.log('🔐 Tentando login com Google');
      await signInWithGoogle();
      
      // Para OAuth, o callback será tratado no AuthCallbackPage
      // Mas ainda tentar restaurar checkout caso já esteja logado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const restored = tryRestoreCheckout();
      console.log('🔐 Login Google - tryRestoreCheckout retornou:', restored);
      
      if (restored && restored === '/checkout') {
        console.log('🔄 Checkout restaurado, retornando rota:', restored);
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
  }, [tryRestoreCheckout]);

  const register = useCallback(async (
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
  }, [tryRestoreCheckout]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut();
    } finally {
      setUser(null);
      navigate('/');
    }
  }, [navigate]);

  const getDashboardRoute = useCallback(() => {
    if (!user) return '/';
    if (user.role === 'organizer' || user.role === 'admin') {
      return '/organizer-dashboard';
    }
    return '/profile';
  }, [user]);

  // Memoizar o value para evitar re-renders desnecessários
  const value = useMemo(() => ({
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    loading,
    getDashboardRoute
  }), [user, loading, login, loginWithGoogle, register, logout, getDashboardRoute]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};