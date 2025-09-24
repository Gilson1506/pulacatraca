-- ============================================
-- DIAGNÓSTICO COMPLETO: ENCONTRAR E CORRIGIR event_id
-- ============================================

-- PASSO 1: Verificar TODAS as tabelas e suas colunas
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNÓSTICO COMPLETO - VERIFICANDO TODAS AS TABELAS...';
    RAISE NOTICE '';
END $$;

-- Listar TODAS as tabelas do seu schema
SELECT 
    '📋 TABELAS EXISTENTES:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- PASSO 2: Verificar quais tabelas TÊM event_id
-- ============================================

SELECT 
    '✅ TABELAS COM event_id:' as info,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE column_name = 'event_id' 
    AND table_schema = 'public'
ORDER BY table_name;

-- PASSO 3: Verificar estrutura específica de cada tabela importante
-- ============================================

-- Verificar tabela tickets
SELECT 
    'ESTRUTURA - tickets' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar tabela transactions (que você mostrou funcionando)
SELECT 
    'ESTRUTURA - transactions' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar tabela events
SELECT 
    'ESTRUTURA - events' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar tabela profiles
SELECT 
    'ESTRUTURA - profiles' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar tabela ticket_users
SELECT 
    'ESTRUTURA - ticket_users' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASSO 4: Corrigir tabelas que precisam de event_id
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CORRIGINDO TABELAS QUE PRECISAM DE event_id...';
    RAISE NOTICE '';
    
    -- Verificar se a tabela events existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        RAISE NOTICE '❌ Tabela events não existe. Criando...';
        CREATE TABLE events (
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
        RAISE NOTICE '✅ Tabela events criada';
    ELSE
        RAISE NOTICE '✅ Tabela events já existe';
    END IF;

    -- Verificar e corrigir tabela tickets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        RAISE NOTICE '🔧 Verificando tabela tickets...';
        
        -- Adicionar event_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tickets' AND column_name = 'event_id'
        ) THEN
            ALTER TABLE tickets ADD COLUMN event_id UUID;
            RAISE NOTICE '✅ Coluna event_id adicionada à tabela tickets';
            
            -- Adicionar foreign key se a tabela events existir
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
                ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_id 
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
                RAISE NOTICE '✅ Foreign key event_id adicionada à tabela tickets';
            END IF;
        ELSE
            RAISE NOTICE '✅ Coluna event_id já existe na tabela tickets';
        END IF;
        
        -- Adicionar ticket_user_id se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tickets' AND column_name = 'ticket_user_id'
        ) THEN
            ALTER TABLE tickets ADD COLUMN ticket_user_id UUID;
            RAISE NOTICE '✅ Coluna ticket_user_id adicionada à tabela tickets';
        ELSE
            RAISE NOTICE '✅ Coluna ticket_user_id já existe na tabela tickets';
        END IF;
    ELSE
        RAISE NOTICE '❌ Tabela tickets não existe. Criando...';
        CREATE TABLE tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          buyer_id UUID,
          ticket_user_id UUID,
          code TEXT UNIQUE,
          ticket_type TEXT DEFAULT 'Padrão',
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          used_at TIMESTAMP WITH TIME ZONE,
          notes TEXT
        );
        RAISE NOTICE '✅ Tabela tickets criada com event_id';
    END IF;

    -- Verificar e corrigir tabela profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE NOTICE '❌ Tabela profiles não existe. Criando...';
        CREATE TABLE profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user',
          is_verified BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
        RAISE NOTICE '✅ Tabela profiles criada';
    ELSE
        RAISE NOTICE '✅ Tabela profiles já existe';
    END IF;

    -- Verificar e corrigir tabela ticket_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        RAISE NOTICE '❌ Tabela ticket_users não existe. Criando...';
        CREATE TABLE ticket_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2),
          email VARCHAR(100) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
          document VARCHAR(20),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          UNIQUE(email)
        );
        RAISE NOTICE '✅ Tabela ticket_users criada';
    ELSE
        RAISE NOTICE '✅ Tabela ticket_users já existe';
    END IF;
END $$;

-- PASSO 5: Criar tabela checkin
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Criando tabela checkin...';
    
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
      notes TEXT
    );
    
    RAISE NOTICE '✅ Tabela checkin criada';
    
    -- Adicionar foreign keys se as tabelas existirem
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        ALTER TABLE checkin ADD CONSTRAINT fk_checkin_ticket_user 
        FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key ticket_user_id adicionada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        ALTER TABLE checkin ADD CONSTRAINT fk_checkin_event 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key event_id adicionada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE checkin ADD CONSTRAINT fk_checkin_organizer 
        FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key organizer_id adicionada';
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

-- PASSO 8: Criar funções
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

-- PASSO 9: Verificação final
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ DIAGNÓSTICO E CORREÇÃO CONCLUÍDOS!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 VERIFICAÇÃO FINAL:';
    RAISE NOTICE '   - Todas as tabelas necessárias foram verificadas/criadas';
    RAISE NOTICE '   - Coluna event_id foi adicionada onde necessário';
    RAISE NOTICE '   - Relacionamentos configurados corretamente';
    RAISE NOTICE '   - Funções de check-in criadas';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 O erro "column event_id does not exist" deve estar resolvido!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Execute novamente para ver a estrutura final:';
END $$;

-- Mostrar estrutura final de todas as tabelas importantes
SELECT 
    'VERIFICAÇÃO FINAL - tickets' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;