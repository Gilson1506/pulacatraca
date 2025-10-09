import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { User, Session } from '@supabase/supabase-js';

// Verificação mais robusta das variáveis de ambiente
const getSupabaseConfig = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Log para debug (sem expor valores sensíveis)
  console.log('Ambiente:', import.meta.env.MODE);
  console.log('URL do Supabase configurada:', !!supabaseUrl);
  console.log('Chave anônima do Supabase configurada:', !!supabaseAnonKey);
  console.log('Todas as variáveis de ambiente disponíveis:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

  if (!supabaseUrl || supabaseUrl === 'undefined') {
    console.error('VITE_SUPABASE_URL não está definida ou é inválida.');
    throw new Error(
      'Erro de configuração: VITE_SUPABASE_URL não está definida corretamente. Por favor, verifique as variáveis de ambiente.'
    );
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
    console.error('VITE_SUPABASE_ANON_KEY não está definida ou é inválida.');
    throw new Error(
      'Erro de configuração: VITE_SUPABASE_ANON_KEY não está definida corretamente. Por favor, verifique as variáveis de ambiente.'
    );
  }

  // Validação adicional do formato da URL e da chave
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error('URL do Supabase inválida: deve começar com https://');
  }

  if (supabaseAnonKey.length < 20) {
    throw new Error('Chave anônima do Supabase parece inválida: muito curta');
  }

  return { supabaseUrl, supabaseAnonKey };
};

// Criar uma única instância do cliente Supabase
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = (() => {
  try {
    if (!supabaseInstance) {
      const config = getSupabaseConfig();
      console.log('Tentando inicializar Supabase...');
      console.log('URL base:', config.supabaseUrl.split('://')[1].split('.')[0]); // Log seguro da URL
      
      supabaseInstance = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: 'pulacatraca-auth',
          storage: window.localStorage,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        },
      });

      console.log('Supabase inicializado com sucesso!');
    }
    return supabaseInstance;
  } catch (error) {
    console.error('Erro ao inicializar o Supabase:', error);
    
    // Evita redirecionamento infinito
    const currentPath = window.location.pathname;
    if (currentPath !== '/erro-configuracao') {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao inicializar o Supabase';
      window.location.href = `/erro-configuracao?message=${encodeURIComponent(errorMessage)}`;
    }
    
    // Retorna um cliente mock para evitar erros de undefined
    return createClient('http://localhost', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
})();

export const getUser = async () => {
  try {
    // 1. Verificar se há uma sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }

    if (!session?.user) {
      console.log('No active session found');
      return null;
    }

    // 2. Buscar o perfil usando o ID do usuário da sessão
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      
      // Se o erro for de recursão infinita, tentar uma abordagem diferente
      if (error.message.includes('infinite recursion')) {
        console.log('Detected infinite recursion, trying alternative approach...');
        
        // Tentar buscar o perfil usando uma consulta mais simples
        const { data: simpleData, error: simpleError } = await supabase
          .from('profiles')
          .select('id, email, name, role, is_verified, is_active')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (simpleError) {
          console.error('Simple query also failed:', simpleError);
          return null;
        }
        
        return simpleData;
      }
      
      return null;
    }

    // Se não encontrou o perfil, tentar criar um novo
    if (!data) {
      console.log('Profile not found, creating new one...');
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'user',
          is_verified: session.user.email_confirmed_at ? true : false,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return null;
      }

      return newProfile;
    }

    return data;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('SignIn error:', error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
};

interface SignUpResult {
  confirmEmail?: boolean;
  message?: string;
  user: User;
  session: Session | null;
}

export const signUp = async (email: string, password: string, userData: { name: string; role: string }): Promise<SignUpResult> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
        },
        emailRedirectTo: `${window.location.origin}/confirmacao`,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user data returned from signup');
    }

    // Se o usuário foi criado mas precisa confirmar o email
    if (!authData.session) {
      return {
        user: authData.user,
        session: null,
        confirmEmail: true,
        message: 'Por favor, verifique seu email para confirmar sua conta.'
      };
    }

    return {
      user: authData.user,
      session: authData.session,
      confirmEmail: false
    };
  } catch (error) {
    console.error('SignUp error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const updateProfile = async (userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}; 