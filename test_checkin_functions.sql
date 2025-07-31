-- ============================================
-- TESTE DAS FUNÇÕES RPC DE CHECK-IN
-- ============================================

-- PASSO 1: Verificar se as funções existem
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO FUNÇÕES RPC DE CHECK-IN...';
    RAISE NOTICE '';
END $$;

-- Listar todas as funções relacionadas ao check-in
SELECT 
    'FUNÇÕES RPC EXISTENTES' as tipo,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND (routine_name LIKE '%checkin%' OR routine_name LIKE '%participant%')
ORDER BY routine_name;

-- PASSO 2: Verificar estrutura das tabelas necessárias
-- ============================================

-- Verificar se tabelas existem
SELECT 
    'TABELAS NECESSÁRIAS' as tipo,
    table_name,
    CASE 
        WHEN table_name IN ('events', 'tickets', 'ticket_users', 'checkin', 'profiles') 
        THEN '✅ Necessária'
        ELSE '⚠️ Extra'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('events', 'tickets', 'ticket_users', 'checkin', 'profiles')
ORDER BY table_name;

-- Verificar estrutura da tabela checkin
SELECT 
    'ESTRUTURA - checkin' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'checkin' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela tickets
SELECT 
    'ESTRUTURA - tickets' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela ticket_users
SELECT 
    'ESTRUTURA - ticket_users' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASSO 3: Testar dados de exemplo
-- ============================================

-- Contar registros em cada tabela
SELECT 'CONTAGEM - events' as tipo, COUNT(*) as registros FROM events;
SELECT 'CONTAGEM - tickets' as tipo, COUNT(*) as registros FROM tickets;
SELECT 'CONTAGEM - ticket_users' as tipo, COUNT(*) as registros FROM ticket_users;
SELECT 'CONTAGEM - checkin' as tipo, COUNT(*) as registros FROM checkin;

-- Verificar relacionamentos
SELECT 
    'RELACIONAMENTOS - tickets x events' as tipo,
    COUNT(*) as tickets_com_evento
FROM tickets t
JOIN events e ON (
    (t.event_id = e.id) OR 
    (t.event = e.id)
);

SELECT 
    'RELACIONAMENTOS - tickets x ticket_users' as tipo,
    COUNT(*) as tickets_com_usuario
FROM tickets t
JOIN ticket_users tu ON t.ticket_user_id = tu.id;

-- PASSO 4: Testar função search_event_participants
-- ============================================

DO $$
DECLARE
    test_event_id UUID;
    test_organizer_id UUID;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 TESTANDO FUNÇÃO search_event_participants...';
    
    -- Pegar primeiro evento para teste
    SELECT id, organizer_id INTO test_event_id, test_organizer_id
    FROM events 
    WHERE organizer_id IS NOT NULL
    LIMIT 1;
    
    IF test_event_id IS NOT NULL THEN
        RAISE NOTICE '📋 Testando com evento: %', test_event_id;
        RAISE NOTICE '📋 Organizador: %', test_organizer_id;
        
        -- Testar função
        BEGIN
            SELECT COUNT(*) INTO result_count
            FROM search_event_participants(test_event_id, test_organizer_id, NULL);
            
            RAISE NOTICE '✅ Função search_event_participants FUNCIONANDO: % participantes encontrados', result_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro na função search_event_participants: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Nenhum evento encontrado para teste';
    END IF;
END $$;

-- PASSO 5: Verificar RLS (Row Level Security)
-- ============================================

-- Verificar se RLS está habilitado
SELECT 
    'RLS STATUS' as tipo,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('events', 'tickets', 'ticket_users', 'checkin')
ORDER BY tablename;

-- Listar políticas RLS
SELECT 
    'POLÍTICAS RLS' as tipo,
    schemaname,
    tablename,
    policyname,
    cmd as command,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- PASSO 6: Recriar funções se necessário
-- ============================================

-- Função search_event_participants
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
  JOIN events e ON (
    (t.event_id = e.id) OR 
    (t.event = e.id)
  )
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

-- Função perform_participant_checkin
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
  JOIN events e ON (
    (t.event_id = e.id) OR 
    (t.event = e.id)
  )
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

-- Função checkin_by_qr_code
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

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ TESTE E CORREÇÃO DAS FUNÇÕES RPC CONCLUÍDO!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 O QUE FOI VERIFICADO:';
    RAISE NOTICE '   - Existência das funções RPC';
    RAISE NOTICE '   - Estrutura das tabelas';
    RAISE NOTICE '   - Relacionamentos entre tabelas';
    RAISE NOTICE '   - Políticas RLS';
    RAISE NOTICE '   - Teste das funções com dados reais';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 FUNÇÕES RECRIADAS:';
    RAISE NOTICE '   - search_event_participants';
    RAISE NOTICE '   - perform_participant_checkin';
    RAISE NOTICE '   - checkin_by_qr_code';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 AGORA O CHECK-IN DEVE FUNCIONAR!';
END $$;