-- ============================================
-- TABELA DE CHECK-IN PARA O SUPABASE
-- ============================================

-- 1. Criar tabela checkin (check_ins)
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_user_id UUID REFERENCES ticket_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'duplicate', 'invalid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  -- Dados capturados no momento do check-in para auditoria
  ticket_code TEXT,
  ticket_type TEXT,
  customer_name TEXT,
  customer_document TEXT
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_check_ins_ticket_id ON check_ins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_event_id ON check_ins(event_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_organizer_id ON check_ins(organizer_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_ticket_user_id ON check_ins(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON check_ins(created_at);

-- Índice único para evitar check-ins duplicados do mesmo ticket
CREATE UNIQUE INDEX IF NOT EXISTS idx_check_ins_unique_ticket_checkin 
ON check_ins(ticket_id) 
WHERE status = 'checked_in';

-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Organizadores podem ver check-ins dos seus eventos
CREATE POLICY "Organizadores podem ver check-ins dos seus eventos" ON check_ins
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    OR organizer_id = auth.uid()
  );

-- Organizadores podem inserir check-ins nos seus eventos
CREATE POLICY "Organizadores podem inserir check-ins nos seus eventos" ON check_ins
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    AND organizer_id = auth.uid()
  );

-- Organizadores podem atualizar check-ins dos seus eventos
CREATE POLICY "Organizadores podem atualizar check-ins dos seus eventos" ON check_ins
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
    OR organizer_id = auth.uid()
  );

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_check_ins_updated_at ON check_ins;
CREATE TRIGGER update_check_ins_updated_at
    BEFORE UPDATE ON check_ins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO PARA REALIZAR CHECK-IN SEGURO
-- ============================================

CREATE OR REPLACE FUNCTION perform_check_in(
  p_ticket_code TEXT,
  p_event_id UUID,
  p_organizer_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  check_in_id UUID,
  ticket_info JSONB
) AS $$
DECLARE
  v_ticket RECORD;
  v_check_in_id UUID;
  v_existing_checkin RECORD;
BEGIN
  -- Buscar o ticket pelo código
  SELECT t.*, 
         e.title as event_title,
         e.organizer_id as event_organizer_id,
         tu.name as user_name,
         tu.email as user_email,
         tu.document as user_document,
         p.name as buyer_name
  INTO v_ticket
  FROM tickets t
  JOIN events e ON t.event_id = e.id
  LEFT JOIN ticket_users tu ON t.ticket_user_id = tu.id
  LEFT JOIN profiles p ON t.user_id = p.id
  WHERE t.code = p_ticket_code;

  -- Verificar se o ticket existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Ticket não encontrado', NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Verificar se o ticket pertence ao evento
  IF v_ticket.event_id != p_event_id THEN
    RETURN QUERY SELECT FALSE, 'Ticket não pertence a este evento', NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Verificar se o organizador é dono do evento
  IF v_ticket.event_organizer_id != p_organizer_id THEN
    RETURN QUERY SELECT FALSE, 'Sem permissão para fazer check-in neste evento', NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Verificar se o ticket está ativo
  IF v_ticket.status NOT IN ('active', 'valid') THEN
    RETURN QUERY SELECT FALSE, 'Ticket não está ativo (status: ' || v_ticket.status || ')', NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Verificar se já existe um check-in bem-sucedido para este ticket
  SELECT * INTO v_existing_checkin
  FROM check_ins 
  WHERE ticket_id = v_ticket.id AND status = 'checked_in';

  IF FOUND THEN
    -- Registrar tentativa duplicada
    INSERT INTO check_ins (
      ticket_id, event_id, organizer_id, ticket_user_id, status,
      ticket_code, ticket_type, customer_name, customer_document,
      notes
    ) VALUES (
      v_ticket.id, v_ticket.event_id, p_organizer_id, v_ticket.ticket_user_id, 'duplicate',
      v_ticket.code, v_ticket.ticket_type, 
      COALESCE(v_ticket.user_name, v_ticket.buyer_name),
      v_ticket.user_document,
      'Tentativa de check-in duplicado em ' || now()
    ) RETURNING id INTO v_check_in_id;

    RETURN QUERY SELECT FALSE, 'Check-in já realizado anteriormente', v_check_in_id, 
      jsonb_build_object(
        'first_checkin', v_existing_checkin.created_at,
        'ticket_code', v_ticket.code,
        'customer_name', COALESCE(v_ticket.user_name, v_ticket.buyer_name)
      );
    RETURN;
  END IF;

  -- Realizar o check-in
  INSERT INTO check_ins (
    ticket_id, event_id, organizer_id, ticket_user_id, status,
    ticket_code, ticket_type, customer_name, customer_document,
    notes
  ) VALUES (
    v_ticket.id, v_ticket.event_id, p_organizer_id, v_ticket.ticket_user_id, 'checked_in',
    v_ticket.code, v_ticket.ticket_type,
    COALESCE(v_ticket.user_name, v_ticket.buyer_name),
    v_ticket.user_document,
    'Check-in realizado em ' || now()
  ) RETURNING id INTO v_check_in_id;

  -- Marcar o ticket como usado
  UPDATE tickets 
  SET status = 'used', used_at = now()
  WHERE id = v_ticket.id;

  -- Retornar sucesso
  RETURN QUERY SELECT TRUE, 'Check-in realizado com sucesso', v_check_in_id,
    jsonb_build_object(
      'ticket_code', v_ticket.code,
      'ticket_type', v_ticket.ticket_type,
      'customer_name', COALESCE(v_ticket.user_name, v_ticket.buyer_name),
      'customer_document', v_ticket.user_document,
      'event_title', v_ticket.event_title
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO PARA BUSCAR TICKETS POR NOME/DOCUMENTO
-- ============================================

CREATE OR REPLACE FUNCTION search_tickets_for_checkin(
  p_search_term TEXT,
  p_event_id UUID,
  p_organizer_id UUID
)
RETURNS TABLE (
  ticket_id UUID,
  ticket_code TEXT,
  ticket_type TEXT,
  customer_name TEXT,
  customer_document TEXT,
  customer_email TEXT,
  status TEXT,
  already_checked_in BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.code,
    t.ticket_type,
    COALESCE(tu.name, p.name) as customer_name,
    tu.document as customer_document,
    COALESCE(tu.email, p.email) as customer_email,
    t.status,
    EXISTS(SELECT 1 FROM check_ins ci WHERE ci.ticket_id = t.id AND ci.status = 'checked_in') as already_checked_in
  FROM tickets t
  JOIN events e ON t.event_id = e.id
  LEFT JOIN ticket_users tu ON t.ticket_user_id = tu.id
  LEFT JOIN profiles p ON t.user_id = p.id
  WHERE e.id = p_event_id
    AND e.organizer_id = p_organizer_id
    AND t.status IN ('active', 'valid', 'used')
    AND (
      LOWER(COALESCE(tu.name, p.name)) LIKE '%' || LOWER(p_search_term) || '%'
      OR LOWER(tu.document) LIKE '%' || LOWER(p_search_term) || '%'
      OR LOWER(t.code) LIKE '%' || LOWER(p_search_term) || '%'
    )
  ORDER BY COALESCE(tu.name, p.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE check_ins IS 'Registros de check-in de participantes nos eventos';
COMMENT ON COLUMN check_ins.ticket_id IS 'ID do ticket que fez check-in';
COMMENT ON COLUMN check_ins.event_id IS 'ID do evento onde foi feito o check-in';
COMMENT ON COLUMN check_ins.organizer_id IS 'ID do organizador que fez o check-in';
COMMENT ON COLUMN check_ins.status IS 'Status: checked_in (sucesso), duplicate (duplicado), invalid (inválido)';
COMMENT ON COLUMN check_ins.ticket_code IS 'Código do ticket no momento do check-in (para auditoria)';
COMMENT ON COLUMN check_ins.customer_name IS 'Nome do cliente no momento do check-in (para auditoria)';

-- ============================================
-- TESTAR A ESTRUTURA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Tabela check_ins criada com sucesso!';
    RAISE NOTICE '🔒 RLS habilitado com políticas para organizadores';
    RAISE NOTICE '📈 Índices criados para performance';
    RAISE NOTICE '🛡️ Função perform_check_in criada para check-ins seguros';
    RAISE NOTICE '🔍 Função search_tickets_for_checkin criada para busca';
    RAISE NOTICE '🔔 Triggers configurados para updated_at';
END $$;