import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const getUser = async () => {
  try {
    console.log('1. Iniciando busca de usuário...'); // DEBUG
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('2. Erro ao buscar usuário:', authError); // DEBUG
      return null;
    }

    console.log('3. Dados do usuário autenticado:', { id: user?.id, email: user?.email }); // DEBUG

    if (!user) {
      console.log('4. Nenhum usuário autenticado'); // DEBUG
      return null;
    }

    console.log('5. Buscando perfil na tabela profiles...'); // DEBUG
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, role, is_verified, is_active, created_at')
      .eq('id', user.id)
      .single();

    console.log('6. Resposta da busca do perfil:', { data: profileData, error: profileError }); // DEBUG

    if (profileError) {
      console.error('7. Erro ao buscar perfil:', profileError); // DEBUG
      
      // Verificar se o perfil existe
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('id', user.id);
      
      console.log('8. Verificação de existência do perfil:', { count, error: countError }); // DEBUG
      
      if (!countError && count === 0) {
        // Se o perfil não existe, vamos criá-lo
        console.log('9. Criando perfil para usuário...'); // DEBUG
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
              role: user.user_metadata?.role || 'user',
              is_verified: false,
              is_active: true,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('10. Erro ao criar perfil:', insertError); // DEBUG
          return null;
        }

        console.log('11. Perfil criado com sucesso:', newProfile); // DEBUG
        return newProfile;
      }

      return null;
    }

    if (!profileData) {
      console.error('12. Perfil não encontrado para o usuário:', user.id); // DEBUG
      return null;
    }

    console.log('13. Perfil encontrado com sucesso:', profileData); // DEBUG
    return profileData;
  } catch (error) {
    console.error('14. Erro inesperado ao buscar usuário:', error); // DEBUG
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });

  if (error) throw error;
  return data;
};

export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
  });

  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string, userData: { name: string; role: string }) => {
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

  if (authError) throw authError;

  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email!,
          name: userData.name,
          role: userData.role as any,
          is_verified: false,
          is_active: true,
        },
      ]);

    if (profileError) throw profileError;

    // Mantemos o usuário logado para que ele seja redirecionado automaticamente pelo AuthContext
  }

  return authData;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const updateProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

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