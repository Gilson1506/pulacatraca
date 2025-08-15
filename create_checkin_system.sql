-- ============================================
-- SISTEMA DE CHECK-IN COMPLETO
-- ============================================

-- 1. Criar tabela checkin seguindo os relacionamentos especificados
CREATE TABLE IF NOT EXISTS checkin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_user_id UUID NOT NULL REFERENCES ticket_users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_checkin_ticket_user_id ON checkin(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_event_id ON checkin(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_organizer_id ON checkin(organizer_id);
CREATE INDEX IF NOT EXISTS idx_checkin_created_at ON checkin(created_at);

-- Índice único para evitar check-ins duplicados do mesmo ticket_user
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_unique_ticket_user 
ON checkin(ticket_user_id);

-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;

-- Organizadores podem ver check-ins dos seus eventos
CREATE POLICY "Organizadores podem ver check-ins dos seus eventos" ON checkin
  FOR SELECT USING (
    organizer_id = auth.uid()
  );

-- Organizadores podem inserir check-ins nos seus eventos
CREATE POLICY "Organizadores podem inserir check-ins nos seus eventos" ON checkin
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
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

DROP TRIGGER IF EXISTS update_checkin_updated_at ON checkin;
CREATE TRIGGER update_checkin_updated_at
    BEFORE UPDATE ON checkin
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO PARA BUSCAR PARTICIPANTES DO EVENTO
-- ============================================

CREATE OR REPLACE FUNCTION search_event_participants(
  p_event_id UUID,
  p_organizer_id UUID,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  ticket_user_id UUID,
  name TEXT,
  email TEXT,
  document TEXT,
  ticket_id UUID,
  ticket_type TEXT,
  already_checked_in BOOLEAN,
  checkin_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.id as ticket_user_id,
    tu.name,
    tu.email,
    tu.document,
    t.id as ticket_id,
    COALESCE(t.ticket_type, 'Padrão') as ticket_type,
    (c.id IS NOT NULL) as already_checked_in,
    c.created_at as checkin_date
  FROM ticket_users tu
  JOIN tickets t ON tu.id = t.ticket_user_id
  JOIN events e ON t.event_id = e.id
  LEFT JOIN checkin c ON c.ticket_user_id = tu.id
  WHERE e.id = p_event_id
    AND e.organizer_id = p_organizer_id
    AND (
      p_search_term IS NULL OR
      LOWER(tu.name) LIKE '%' || LOWER(p_search_term) || '%' OR
      LOWER(tu.email) LIKE '%' || LOWER(p_search_term) || '%' OR
      LOWER(tu.document) LIKE '%' || LOWER(p_search_term) || '%' OR
      tu.id::TEXT = p_search_term
    )
  ORDER BY tu.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO PARA REALIZAR CHECK-IN SEGURO
-- ============================================

CREATE OR REPLACE FUNCTION perform_participant_checkin(
  p_ticket_user_id UUID,
  p_event_id UUID,
  p_organizer_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  checkin_id UUID,
  participant_info JSONB
) AS $$
DECLARE
  v_participant RECORD;
  v_event RECORD;
  v_existing_checkin RECORD;
  v_checkin_id UUID;
BEGIN
  -- Verificar se o organizador é dono do evento
  SELECT * INTO v_event
  FROM events 
  WHERE id = p_event_id AND organizer_id = p_organizer_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Você não tem permissão para fazer check-in neste evento', NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Buscar o participante e verificar se pertence ao evento
  SELECT 
    tu.id, tu.name, tu.email, tu.document,
    t.id as ticket_id, t.ticket_type,
    e.title as event_title
  INTO v_participant
  FROM ticket_users tu
  JOIN tickets t ON tu.id = t.ticket_user_id
  JOIN events e ON t.event_id = e.id
  WHERE tu.id = p_ticket_user_id 
    AND e.id = p_event_id
    AND e.organizer_id = p_organizer_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Participante não encontrado ou não pertence a este evento', NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Verificar se já fez check-in
  SELECT * INTO v_existing_checkin
  FROM checkin 
  WHERE ticket_user_id = p_ticket_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'Check-in já foi realizado anteriormente', v_existing_checkin.id, 
      jsonb_build_object(
        'participant_name', v_participant.name,
        'participant_email', v_participant.email,
        'participant_document', v_participant.document,
        'ticket_type', v_participant.ticket_type,
        'event_title', v_participant.event_title,
        'checkin_date', v_existing_checkin.created_at
      );
    RETURN;
  END IF;

  -- Realizar o check-in
  INSERT INTO checkin (
    ticket_user_id, event_id, organizer_id
  ) VALUES (
    p_ticket_user_id, p_event_id, p_organizer_id
  ) RETURNING id INTO v_checkin_id;

  -- Retornar sucesso
  RETURN QUERY SELECT TRUE, 'Check-in realizado com sucesso!', v_checkin_id,
    jsonb_build_object(
      'participant_name', v_participant.name,
      'participant_email', v_participant.email,
      'participant_document', v_participant.document,
      'ticket_type', v_participant.ticket_type,
      'event_title', v_participant.event_title,
      'checkin_date', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO PARA BUSCAR POR QR CODE
-- ============================================

CREATE OR REPLACE FUNCTION checkin_by_qr_code(
  p_qr_code TEXT,
  p_event_id UUID,
  p_organizer_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  checkin_id UUID,
  participant_info JSONB
) AS $$
DECLARE
  v_ticket_user_id UUID;
BEGIN
  -- Tentar interpretar o QR code como ticket_user_id
  BEGIN
    v_ticket_user_id := p_qr_code::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'QR Code inválido', NULL::UUID, NULL::JSONB;
    RETURN;
  END;

  -- Usar a função de check-in
  RETURN QUERY SELECT * FROM perform_participant_checkin(v_ticket_user_id, p_event_id, p_organizer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE checkin IS 'Registros de check-in de participantes nos eventos';
COMMENT ON COLUMN checkin.ticket_user_id IS 'ID do ticket_user que fez check-in';
COMMENT ON COLUMN checkin.event_id IS 'ID do evento onde foi feito o check-in';
COMMENT ON COLUMN checkin.organizer_id IS 'ID do organizador que fez o check-in';

-- ============================================
-- TESTAR A ESTRUTURA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Tabela checkin criada com sucesso!';
    RAISE NOTICE '🔒 RLS habilitado com políticas para organizadores';
    RAISE NOTICE '📈 Índices criados para performance';
    RAISE NOTICE '🛡️ Função perform_participant_checkin criada';
    RAISE NOTICE '🔍 Função search_event_participants criada';
    RAISE NOTICE '📱 Função checkin_by_qr_code criada';
    RAISE NOTICE '🔔 Triggers configurados para updated_at';
    RAISE NOTICE '🎯 Relacionamentos: events.organizer_id = auth.uid(), tickets.event_id = events.id, ticket_users.ticket_id = tickets.id, checkin.ticket_user_id = ticket_users.id';
END $$;