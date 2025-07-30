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

  if (authError) {
    // Se o usuário já existe, tenta fazer login
    if (authError.message.includes('User already registered')) {
      try {
        const existingProfile = await signInWithEmail(email, password);
        if (existingProfile) return existingProfile;
      } catch (loginError) {
        console.log('Erro ao tentar login automático:', loginError);
      }
    }
    throw authError;
  }

  if (authData.user) {
    // Verifica se já existe um perfil antes de tentar criar
    const existingProfile = await getUser();
    if (existingProfile && existingProfile.id === authData.user.id) {
      console.log('Perfil já existe, retornando perfil existente');
      return existingProfile;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          email: authData.user.email!,
          name: name,
          role: role as any,
          is_verified: false,
          is_active: true,
        },
      ], { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.log('Erro no upsert do perfil:', profileError);
      // Se falhar no upsert, tenta buscar o perfil existente
      const fallbackProfile = await getUser();
      if (fallbackProfile) {
        console.log('Retornando perfil existente após erro de upsert');
        return fallbackProfile;
      }
      throw profileError;
    }

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

// Upload functions
export const uploadEventBanner = async (file: File, eventId?: string): Promise<string> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${eventId || Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `event-banners/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('event_banners')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event_banners')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};

export const deleteEventBanner = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const filePath = url.pathname.split('/').slice(-2).join('/'); // Gets 'event-banners/filename'
    
    const { error } = await supabase.storage
      .from('event_banners')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    // Don't throw error for deletion failures, just log them
  }
};

// ✅ CHAT FUNCTIONS - Sistema de mensagens de suporte
export const sendChatMessage = async (receiverId: string, message: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          sender_id: user.id,
          receiver_id: receiverId,
          message: message.trim(),
          read: false
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

export const getChatMessages = async (userId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        created_at,
        read,
        sender:profiles!sender_id(id, name, email),
        receiver:profiles!receiver_id(id, name, email)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }
};

export const markMessagesAsRead = async (senderId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    throw error;
  }
};

export const getUnreadMessagesCount = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar mensagens não lidas:', error);
    return 0;
  }
};

export const getSupportAgents = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar agentes de suporte:', error);
    // Fallback: retorna um agente padrão
    return [{
      id: 'support-agent',
      name: 'Suporte PulaCatraca',
      email: 'suporte@pulacatraca.com'
    }];
  }
};

export const subscribeToMessages = (userId: string, callback: (payload: any) => void) => {
  const channel = supabase
    .channel('chat-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${userId}`
      },
      callback
    )
    .subscribe();

  return channel;
};

// ✅ TICKET USER FUNCTIONS - Sistema de usuários de ingressos
export const createTicketUser = async (ticketId: string, userData: { name: string; email: string; document?: string }) => {
  try {
    console.log('🔍 createTicketUser - Iniciando com dados:', userData);
    console.log('🔍 createTicketUser - ticketId:', ticketId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se o ingresso existe e pertence ao usuário
    const { data: existingTicket, error: checkError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (checkError) throw new Error('Ingresso não encontrado ou você não tem permissão');

    // Verificar se já existe um usuário definido para este ingresso
    if (existingTicket.ticket_user_id) {
      console.log('⚠️ Ingresso já tem ticket_user_id:', existingTicket.ticket_user_id);
      // Temporariamente permitir redefinição para corrigir dados inválidos
      // throw new Error('Este ingresso já tem um usuário definido. Não é possível alterar.');
    }

    // Tentar criar o usuário do ingresso
    let ticketUser;
    try {
      const insertData = {
        name: userData.name?.trim() || '',
        email: userData.email?.trim().toLowerCase() || '',
        document: userData.document?.trim() || null
      };
      
      console.log('🔍 createTicketUser - Dados a inserir:', insertData);
      
      const { data: newTicketUser, error: userError } = await supabase
        .from('ticket_users')
        .insert([insertData])
        .select()
        .single();

      console.log('🔍 createTicketUser - Resposta insert:', { newTicketUser, userError });

      if (userError) throw userError;
      ticketUser = newTicketUser;
      
      console.log('✅ createTicketUser - ticket_user criado:', ticketUser);
    } catch (error: any) {
      if (error.message?.includes('relation "ticket_users" does not exist')) {
        throw new Error('Sistema de usuários de ingressos não está configurado. Execute o script SQL primeiro.');
      }
      throw error;
    }

    // Atualizar o ingresso com o ticket_user_id e QR code
    const qrCode = `${ticketId}-${ticketUser.id}`;
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({ 
        ticket_user_id: ticketUser.id,
        qr_code: qrCode
      })
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      // Se falhou ao atualizar, tentar remover o ticket_user criado
      try {
        await supabase.from('ticket_users').delete().eq('id', ticketUser.id);
      } catch (cleanupError) {
        console.error('Erro ao limpar ticket_user:', cleanupError);
      }
      throw updateError;
    }

    // Buscar dados completos para retornar
    const completeTicket = await getTicketWithUser(ticketId);
    return completeTicket;

  } catch (error) {
    console.error('Erro ao criar usuário do ingresso:', error);
    throw error;
  }
};

export const getTicketWithUser = async (ticketId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Primeiro, buscar o ingresso básico
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id) // Só o comprador pode ver
      .single();

    if (ticketError) throw ticketError;

    // Buscar dados do evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', ticket.event_id)
      .single();

    if (eventError) throw eventError;

    // Tentar buscar dados do ticket_user se existir
    let ticketUser = null;
    if (ticket.ticket_user_id) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('ticket_users')
          .select('*')
          .eq('id', ticket.ticket_user_id)
          .single();
        
        if (!userError && userData) {
          // Verificar se os dados são válidos (não null/empty)
          if (userData.name && userData.name.trim() !== '' && userData.email && userData.email.trim() !== '') {
            ticketUser = userData;
            console.log('✅ Dados válidos do ticket_user encontrados:', userData);
          } else {
            console.log('⚠️ Dados do ticket_user estão null/empty:', userData);
            // Se os dados estão vazios, tentar buscar o mais recente válido
            const { data: validUserData, error: validUserError } = await supabase
              .from('ticket_users')
              .select('*')
              .not('name', 'is', null)
              .not('email', 'is', null)
              .neq('name', '')
              .neq('email', '')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (!validUserError && validUserData) {
              ticketUser = validUserData;
              console.log('✅ Dados válidos mais recentes encontrados:', validUserData);
              
              // Atualizar o ticket para apontar para os dados corretos
              await supabase
                .from('tickets')
                .update({ ticket_user_id: validUserData.id })
                .eq('id', ticketId);
            }
          }
        }
      } catch (error) {
        console.log('Tabela ticket_users ainda não existe ou ticket_user_id não definido');
      }
    }

    // Retornar dados combinados
    return {
      ...ticket,
      event: event,
      ticket_user: ticketUser
    };
  } catch (error) {
    console.error('Erro ao buscar ingresso:', error);
    throw error;
  }
};

export const getUserTickets = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events(*),
        ticket_user:ticket_users(*)
      `)
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar ingressos do usuário:', error);
    throw error;
  }
};

export const validateTicketQR = async (qrCode: string) => {
  try {
    // QR Code format: ticketId-userId
    const [ticketId, userId] = qrCode.split('-');
    
    if (!ticketId || !userId) {
      throw new Error('QR Code inválido');
    }

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events(*),
        ticket_user:ticket_users(*)
      `)
      .eq('id', ticketId)
      .eq('ticket_user_id', userId)
      .eq('qr_code', qrCode)
      .single();

    if (error) throw error;
    
    if (!data) {
      throw new Error('Ingresso não encontrado');
    }

    if (data.status === 'used') {
      throw new Error('Ingresso já foi utilizado');
    }

    if (data.status === 'cancelled') {
      throw new Error('Ingresso foi cancelado');
    }

    if (data.status === 'expired') {
      throw new Error('Ingresso expirado');
    }

    return data;
  } catch (error) {
    console.error('Erro ao validar QR Code:', error);
    throw error;
  }
};

export const checkInTicket = async (qrCode: string) => {
  try {
    // Primeiro valida o ticket
    const ticket = await validateTicketQR(qrCode);
    
    // Marca como usado
    const { data, error } = await supabase
      .from('tickets')
      .update({ 
        status: 'used',
        check_in_date: new Date().toISOString()
      })
      .eq('id', ticket.id)
      .eq('qr_code', qrCode)
      .select(`
        *,
        event:events(*),
        ticket_user:ticket_users(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao fazer check-in:', error);
    throw error;
  }
}; 