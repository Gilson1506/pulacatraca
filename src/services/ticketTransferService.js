import { supabase } from '../lib/supabase';

export class TicketTransferService {
  
  /**
   * Verifica se um ingresso pode ser transferido
   */
  static async canTransferTicket(ticketId, userId) {
    try {
      const { data, error } = await supabase.rpc('can_transfer_ticket', {
        p_ticket_id: ticketId,
        p_user_id: userId
      });

      if (error) {
        console.error('Erro ao verificar transferência:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no serviço de verificação:', error);
      throw error;
    }
  }

  /**
   * Transfere um ingresso para outro usuário
   */
  static async transferTicket(ticketId, newUserEmail, currentUserId) {
    try {
      const { data, error } = await supabase.rpc('transfer_ticket', {
        p_ticket_id: ticketId,
        p_new_user_email: newUserEmail,
        p_current_user_id: currentUserId
      });

      if (error) {
        console.error('Erro ao transferir ingresso:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no serviço de transferência:', error);
      throw error;
    }
  }

  /**
   * Busca usuário pelo email
   */
  static async findUserByEmail(email) {
    try {
      // Primeiro tentar buscar na tabela auth.users
      const { data: authUser, error: authError } = await supabase
        .from('auth.users')
        .select('id, email, raw_user_meta_data')
        .eq('email', email)
        .single();

      if (authError) {
        console.error('Erro ao buscar usuário na auth.users:', authError);
        throw authError;
      }

      // Buscar dados completos do usuário na tabela ticket_users
      const { data: ticketUser, error: ticketUserError } = await supabase
        .from('ticket_users')
        .select('id, name, email, document, phone, created_at')
        .eq('email', email)
        .single();

      // Combinar dados
      const userData = {
        id: authUser.id,
        email: authUser.email,
        full_name: ticketUser?.name || authUser.raw_user_meta_data?.full_name || email.split('@')[0],
        document: ticketUser?.document || null,
        phone: ticketUser?.phone || null,
        created_at: ticketUser?.created_at || authUser.created_at,
        is_registered: !!ticketUser
      };

      console.log('✅ Usuário encontrado:', userData);
      return userData;
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  /**
   * Obtém dados completos do ingresso para transferência
   */
  static async getTicketDetails(ticketId) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          event_ticket_types (
            name,
            price_masculine,
            price_feminine,
            area,
            description
          ),
          events (
            id,
            title,
            start_date,
            location_name,
            location_city,
            location_state
          ),
          ticket_users (
            id,
            name,
            email,
            document,
            phone
          )
        `)
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('Erro ao buscar detalhes do ingresso:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar detalhes do ingresso:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de transferências de um ingresso
   */
  static async getTicketTransferHistory(ticketId) {
    try {
      const { data, error } = await supabase
        .from('ticket_transfers')
        .select(`
          *,
          from_user:from_user_id(id, email, full_name),
          to_user:to_user_id(id, email, full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('transferred_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar histórico de transferências:', error);
      throw error;
    }
  }
}
