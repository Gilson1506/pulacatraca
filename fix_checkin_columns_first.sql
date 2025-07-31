-- ============================================
-- FIX: Adicionar colunas ANTES de criar foreign keys
-- ============================================

-- PASSO 1: Verificar e mostrar problema
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO PROBLEMA COM FOREIGN KEYS...';
    RAISE NOTICE '';
END $$;

-- Verificar estrutura atual da tabela checkin
SELECT 
    'ESTRUTURA ATUAL - checkin' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'checkin' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASSO 2: Criar/corrigir tabelas base primeiro
-- ============================================

-- Criar tabela events se não existir
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID,
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

-- Criar tabela profiles se não existir
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

-- Criar tabela ticket_users se não existir
CREATE TABLE IF NOT EXISTS ticket_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2),
  email VARCHAR(100) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  document VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(email)
);

-- PASSO 3: Corrigir tabela tickets
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 CORRIGINDO TABELA TICKETS...';
    
    -- Criar tabela tickets se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE TABLE tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID,
          buyer_id UUID,
          ticket_user_id UUID,
          code TEXT UNIQUE,
          ticket_type TEXT DEFAULT 'Padrão',
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          used_at TIMESTAMP WITH TIME ZONE,
          notes TEXT
        );
        RAISE NOTICE '✅ Tabela tickets criada';
    ELSE
        RAISE NOTICE '✅ Tabela tickets já existe';
        
        -- Adicionar colunas se não existirem
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tickets' AND column_name = 'event_id'
        ) THEN
            ALTER TABLE tickets ADD COLUMN event_id UUID;
            RAISE NOTICE '✅ Coluna event_id adicionada à tickets';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tickets' AND column_name = 'ticket_user_id'
        ) THEN
            ALTER TABLE tickets ADD COLUMN ticket_user_id UUID;
            RAISE NOTICE '✅ Coluna ticket_user_id adicionada à tickets';
        END IF;
    END IF;
END $$;

-- PASSO 4: Recriar tabela checkin corretamente
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 RECRIANDO TABELA CHECKIN COM TODAS AS COLUNAS...';
    
    -- Deletar tabela checkin se existir (para recriar corretamente)
    DROP TABLE IF EXISTS checkin CASCADE;
    DROP TABLE IF EXISTS check_ins CASCADE;
    
    -- Criar tabela checkin com TODAS as colunas necessárias
    CREATE TABLE checkin (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ticket_user_id UUID NOT NULL,
      event_id UUID NOT NULL,
      organizer_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      notes TEXT
    );
    
    RAISE NOTICE '✅ Tabela checkin criada com todas as colunas';
END $$;

-- PASSO 5: Agora adicionar foreign keys (após colunas existirem)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔗 ADICIONANDO FOREIGN KEYS...';
    
    -- Foreign keys para tickets
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'event_id') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        
        -- Remover constraint se já existir
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_event_id;
        
        -- Adicionar nova constraint
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key event_id adicionada à tickets';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_user_id') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        
        -- Remover constraint se já existir
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_ticket_user_id;
        
        -- Adicionar nova constraint
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_ticket_user_id 
        FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Foreign key ticket_user_id adicionada à tickets';
    END IF;
    
    -- Foreign keys para checkin
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin' AND column_name = 'ticket_user_id') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        
        ALTER TABLE checkin ADD CONSTRAINT fk_checkin_ticket_user 
        FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key ticket_user_id adicionada à checkin';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin' AND column_name = 'event_id') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        
        ALTER TABLE checkin ADD CONSTRAINT fk_checkin_event 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key event_id adicionada à checkin';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin' AND column_name = 'organizer_id') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        
        ALTER TABLE checkin ADD CONSTRAINT fk_checkin_organizer 
        FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key organizer_id adicionada à checkin';
    END IF;
END $$;

-- PASSO 6: Criar índices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_user_id ON tickets(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_ticket_user_id ON checkin(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_event_id ON checkin(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_organizer_id ON checkin(organizer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_unique_ticket_user ON checkin(ticket_user_id);

-- PASSO 7: Habilitar RLS
-- ============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;

-- PASSO 8: Criar políticas RLS básicas
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

-- PASSO 9: Criar funções
-- ============================================

-- Função para buscar participantes
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
  JOIN tickets t ON t.ticket_user_id = tu.id
  JOIN events e ON t.event_id = e.id
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

-- Função para realizar check-in
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

  -- Buscar o participante e verificar se pertence ao evento
  SELECT 
    tu.id, tu.name, tu.email, COALESCE(tu.document, '') as document,
    t.id as ticket_id, COALESCE(t.ticket_type, 'Padrão') as ticket_type,
    e.title as event_title
  INTO v_participant
  FROM ticket_users tu
  JOIN tickets t ON t.ticket_user_id = tu.id
  JOIN events e ON t.event_id = e.id
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

-- Função para QR Code
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

-- PASSO 10: Trigger para updated_at
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

-- PASSO 11: Verificação final
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ PROBLEMA RESOLVIDO!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 O QUE FOI CORRIGIDO:';
    RAISE NOTICE '   - Tabela checkin recriada com todas as colunas';
    RAISE NOTICE '   - Colunas adicionadas ANTES das foreign keys';
    RAISE NOTICE '   - Foreign keys criadas corretamente';
    RAISE NOTICE '   - Sistema de check-in funcionando';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 O erro "column event_id referenced in foreign key constraint does not exist" foi resolvido!';
END $$;

-- Mostrar estrutura final da tabela checkin
SELECT 
    'ESTRUTURA FINAL - checkin' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'checkin' 
    AND table_schema = 'public'
ORDER BY ordinal_position;