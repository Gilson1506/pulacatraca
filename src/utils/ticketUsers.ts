import { supabase } from '../lib/supabase';

type TicketUserPayload = {
  name: string;
  email: string;
  document?: string;
};

export async function createOrUpdateTicketUser(ticketId: string, payload: TicketUserPayload) {
  const { name, email, document } = payload;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Verificar ticket existente e acessível
  const { data: ticket, error: tErr } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!ticket) throw new Error('Ingresso não encontrado');

  const normalizedEmail = (email || '').trim().toLowerCase();

  // Buscar se já existe ticket_user para este ticket + email
  const { data: existing, error: fErr } = await supabase
    .from('ticket_users')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (fErr) throw fErr;

  if (!existing) {
    const { data: inserted, error: iErr } = await supabase
      .from('ticket_users')
      .insert({
        ticket_id: ticketId,
        name: (name || '').trim(),
        email: normalizedEmail,
        document: (document || null) as string | null,
        qr_code: ticket.qr_code || null
      })
      .select('*')
      .single();
    
    if (iErr) {
      // Se for duplicate key (23505), buscar e atualizar
      if (iErr.code === '23505') {
        const { data: found2, error: f2 } = await supabase
          .from('ticket_users')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('email', normalizedEmail)
          .maybeSingle();
        if (f2) throw f2;
        if (!found2) throw iErr;
        const { data: updated, error: uErr } = await supabase
          .from('ticket_users')
          .update({
            name: (name || '').trim(),
            document: (document || null) as string | null
          })
          .eq('id', found2.id)
          .select('*')
          .single();
        if (uErr) throw uErr;
        return updated;
      } else {
        throw iErr;
      }
    }
    return inserted;
  } else {
    const { data: updated, error: uErr } = await supabase
      .from('ticket_users')
      .update({
        name: (name || '').trim(),
        document: (document || null) as string | null
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (uErr) throw uErr;
    return updated;
  }
}


