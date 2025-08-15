-- ============================================
-- SISTEMA DE CHECK-IN FINAL - RELACIONAMENTOS CORRETOS
-- ============================================

-- PASSO 1: Verificar e criar tabelas necessárias se não existirem
-- ============================================

-- 1.1 Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1.2 Criar tabela events se não existir
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  banner_url TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  available_tickets INTEGER DEFAULT 0,
  total_tickets INTEGER DEFAULT 0,
  category TEXT
);

-- 1.3 Criar tabela ticket_users se não existir
CREATE TABLE IF NOT EXISTS ticket_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2),
  email VARCHAR(100) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  document VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(email)
);

-- 1.4 Criar tabela tickets se não existir (ESTRUTURA CORRETA)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_user_id UUID REFERENCES ticket_users(id) ON DELETE SET NULL,
  code TEXT UNIQUE,
  ticket_type TEXT DEFAULT 'Padrão',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  used_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- PASSO 2: Criar tabela checkin seguindo os relacionamentos CORRETOS
-- ============================================

-- Deletar tabela antiga se existir
DROP TABLE IF EXISTS check_ins CASCADE;

-- Criar nova tabela checkin
CREATE TABLE IF NOT EXISTS checkin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  organizer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  
  -- Foreign keys corretas
  CONSTRAINT fk_checkin_ticket_user FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkin_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkin_organizer FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_ticket_users_email ON ticket_users(email);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_user_id ON tickets(ticket_user_id);

CREATE INDEX IF NOT EXISTS idx_checkin_ticket_user_id ON checkin(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_event_id ON checkin(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_organizer_id ON checkin(organizer_id);
CREATE INDEX IF NOT EXISTS idx_checkin_created_at ON checkin(created_at);

-- Índice único para evitar check-ins duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_unique_ticket_user 
ON checkin(ticket_user_id);

-- ============================================
-- HABILITAR RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Políticas para events
DROP POLICY IF EXISTS "Organizadores podem ver seus eventos" ON events;
CREATE POLICY "Organizadores podem ver seus eventos" ON events
  FOR ALL USING (organizer_id = auth.uid());

-- Políticas para checkin
DROP POLICY IF EXISTS "Organizadores podem ver check-ins dos seus eventos" ON checkin;
CREATE POLICY "Organizadores podem ver check-ins dos seus eventos" ON checkin
  FOR SELECT USING (organizer_id = auth.uid());

DROP POLICY IF EXISTS "Organizadores podem inserir check-ins nos seus eventos" ON checkin;
CREATE POLICY "Organizadores podem inserir check-ins nos seus eventos" ON checkin
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND organizer_id = auth.uid())
  );

-- ============================================
-- FUNÇÃO PARA BUSCAR PARTICIPANTES DO EVENTO
-- RELACIONAMENTOS CORRETOS: tickets.event_id = events.id E tickets.ticket_user_id = ticket_users.id
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
  JOIN tickets t ON t.ticket_user_id = tu.id  -- RELACIONAMENTO CORRETO
  JOIN events e ON t.event_id = e.id          -- RELACIONAMENTO CORRETO
  LEFT JOIN checkin c ON c.ticket_user_id = tu.id
  WHERE e.id = p_event_id
    AND e.organizer_id = p_organizer_id
    AND (
      p_search_term IS NULL OR
      LOWER(tu.name) LIKE '%' || LOWER(p_search_term) || '%' OR
      LOWER(tu.email) LIKE '%' || LOWER(p_search_term) || '%' OR
      LOWER(COALESCE(tu.document, '')) LIKE '%' || LOWER(p_search_term) || '%' OR
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
    RETURN QUERY SELECT FALSE, 'Você não tem permissão para fazer check-in neste evento'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Buscar o participante e verificar se pertence ao evento (RELACIONAMENTOS CORRETOS)
  SELECT 
    tu.id, tu.name, tu.email, COALESCE(tu.document, '') as document,
    t.id as ticket_id, COALESCE(t.ticket_type, 'Padrão') as ticket_type,
    e.title as event_title
  INTO v_participant
  FROM ticket_users tu
  JOIN tickets t ON t.ticket_user_id = tu.id  -- RELACIONAMENTO CORRETO
  JOIN events e ON t.event_id = e.id          -- RELACIONAMENTO CORRETO
  WHERE tu.id = p_ticket_user_id 
    AND e.id = p_event_id
    AND e.organizer_id = p_organizer_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Participante não encontrado ou não pertence a este evento'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;

  -- Verificar se já fez check-in
  SELECT * INTO v_existing_checkin
  FROM checkin 
  WHERE ticket_user_id = p_ticket_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'Check-in já foi realizado anteriormente'::TEXT, v_existing_checkin.id, 
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
  RETURN QUERY SELECT TRUE, 'Check-in realizado com sucesso!'::TEXT, v_checkin_id,
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
    RETURN QUERY SELECT FALSE, 'QR Code inválido'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END;

  -- Usar a função de check-in
  RETURN QUERY SELECT * FROM perform_participant_checkin(v_ticket_user_id, p_event_id, p_organizer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- COMENTÁRIOS
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
    RAISE NOTICE '✅ Sistema de check-in criado com relacionamentos CORRETOS!';
    RAISE NOTICE '🔗 events.organizer_id = auth.uid()';
    RAISE NOTICE '🔗 tickets.event_id = events.id';  
    RAISE NOTICE '🔗 tickets.ticket_user_id = ticket_users.id';
    RAISE NOTICE '🔗 checkin.ticket_user_id = ticket_users.id';
    RAISE NOTICE '✅ Todas as funções criadas com JOINs corretos!';
    RAISE NOTICE '🔒 RLS habilitado com políticas de segurança!';
    RAISE NOTICE '📝 Execute este script no Supabase para criar tudo!';
END $$;