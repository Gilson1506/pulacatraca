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
      
      // Se o erro for "not found", tentar criar o perfil
      if (profileError.code === 'PGRST116') {
        console.log('8. Perfil não encontrado, criando automaticamente...'); // DEBUG
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
          console.error('9. Erro ao criar perfil:', insertError); // DEBUG
          return null;
        }

        console.log('10. Perfil criado com sucesso:', newProfile); // DEBUG
        return newProfile;
      }

      return null;
    }

    if (!profileData) {
      console.error('11. Perfil não encontrado para o usuário:', user.id); // DEBUG
      return null;
    }

    console.log('12. Perfil encontrado com sucesso:', profileData); // DEBUG
    return profileData;
  } catch (error) {
    console.error('13. Erro inesperado ao buscar usuário:', error); // DEBUG
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  
  // Depois de fazer login, buscar o perfil do usuário
  const profile = await getUser();
  return profile;
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

export const signUp = async (email: string, password: string, name: string, role: string = 'user') => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
        role: role,
      },
      emailRedirectTo: `${window.location.origin}/confirmacao`,
    },
  });

  if (authError) throw authError;

  if (authData.user) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email!,
          name: name,
          role: role as any,
          is_verified: false,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (profileError) throw profileError;

    return profileData;
  }

  throw new Error('Falha ao criar usuário');
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