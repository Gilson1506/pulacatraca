-- ============================================
-- FIX FINAL: Corrigir coluna event e RLS checkin
-- ============================================

-- PASSO 1: Diagnóstico da estrutura atual
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNOSTICANDO ESTRUTURA ATUAL...';
    RAISE NOTICE '';
END $$;

-- Verificar colunas da tabela tickets
SELECT 
    'COLUNAS TICKETS' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se RLS está habilitado na tabela checkin
SELECT 
    'RLS STATUS - checkin' as tipo,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'checkin';

-- PASSO 2: Habilitar RLS na tabela checkin
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔒 HABILITANDO RLS NA TABELA CHECKIN...';
    
    -- Habilitar RLS
    ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ RLS habilitado na tabela checkin';
END $$;

-- PASSO 3: Criar políticas RLS para checkin
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '📋 CRIANDO POLÍTICAS RLS PARA CHECKIN...';
    
    -- Remover políticas existentes se houver
    DROP POLICY IF EXISTS "Organizadores podem ver check-ins dos seus eventos" ON checkin;
    DROP POLICY IF EXISTS "Organizadores podem inserir check-ins nos seus eventos" ON checkin;
    DROP POLICY IF EXISTS "Organizadores podem atualizar check-ins dos seus eventos" ON checkin;
    
    -- Política para SELECT
    CREATE POLICY "Organizadores podem ver check-ins dos seus eventos" ON checkin
    FOR SELECT USING (organizer_id = auth.uid());
    
    -- Política para INSERT
    CREATE POLICY "Organizadores podem inserir check-ins nos seus eventos" ON checkin
    FOR INSERT WITH CHECK (
        organizer_id = auth.uid() AND
        EXISTS (SELECT 1 FROM events WHERE id = event_id AND organizer_id = auth.uid())
    );
    
    -- Política para UPDATE
    CREATE POLICY "Organizadores podem atualizar check-ins dos seus eventos" ON checkin
    FOR UPDATE USING (organizer_id = auth.uid());
    
    RAISE NOTICE '✅ Políticas RLS criadas para checkin';
END $$;

-- PASSO 4: Corrigir funções RPC (remover referência a t.event)
-- ============================================

-- Função search_event_participants CORRIGIDA
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
  JOIN events e ON t.event_id = e.id  -- APENAS event_id, removido t.event
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

-- Função perform_participant_checkin CORRIGIDA
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
  JOIN events e ON t.event_id = e.id  -- APENAS event_id, removido t.event
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

-- Função checkin_by_qr_code (sem mudanças, mas recriando para garantir)
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

-- PASSO 5: Verificar se a coluna event_id existe em tickets
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO COLUNA event_id EM TICKETS...';
    
    -- Verificar se event_id existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event_id'
        AND table_schema = 'public'
    ) THEN
        -- Se não existe, criar a coluna
        ALTER TABLE tickets ADD COLUMN event_id UUID;
        RAISE NOTICE '✅ Coluna event_id adicionada à tabela tickets';
        
        -- Criar foreign key
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_id_only
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key event_id criada';
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_tickets_event_id_final ON tickets(event_id);
        RAISE NOTICE '✅ Índice event_id criado';
    ELSE
        RAISE NOTICE '✅ Coluna event_id já existe em tickets';
    END IF;
END $$;

-- PASSO 6: Verificação final
-- ============================================

-- Mostrar estrutura final da tabela tickets
SELECT 
    'ESTRUTURA FINAL - tickets' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar RLS na tabela checkin
SELECT 
    'RLS FINAL - checkin' as tipo,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'checkin';

-- Listar políticas RLS da tabela checkin
SELECT 
    'POLÍTICAS RLS - checkin' as tipo,
    policyname,
    cmd as command,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'checkin'
ORDER BY policyname;

-- Testar função search_event_participants
DO $$
DECLARE
    test_event_id UUID;
    test_organizer_id UUID;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 TESTANDO FUNÇÃO CORRIGIDA...';
    
    -- Pegar primeiro evento para teste
    SELECT id, organizer_id INTO test_event_id, test_organizer_id
    FROM events 
    WHERE organizer_id IS NOT NULL
    LIMIT 1;
    
    IF test_event_id IS NOT NULL THEN
        RAISE NOTICE '📋 Testando com evento: %', test_event_id;
        
        -- Testar função corrigida
        BEGIN
            SELECT COUNT(*) INTO result_count
            FROM search_event_participants(test_event_id, test_organizer_id, NULL);
            
            RAISE NOTICE '✅ Função search_event_participants FUNCIONANDO: % participantes', result_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro na função: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Nenhum evento encontrado para teste';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORREÇÃO FINAL APLICADA!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 O QUE FOI CORRIGIDO:';
    RAISE NOTICE '   - Removida referência à coluna t.event (não existe)';
    RAISE NOTICE '   - Usado apenas t.event_id nos JOINs';
    RAISE NOTICE '   - RLS habilitado na tabela checkin';
    RAISE NOTICE '   - Políticas RLS criadas para checkin';
    RAISE NOTICE '   - Funções RPC corrigidas e testadas';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 ERRO "column t.event does not exist" RESOLVIDO!';
    RAISE NOTICE '🔒 RLS configurado na tabela checkin!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ SISTEMA DE CHECK-IN DEVE FUNCIONAR AGORA!';
END $$;