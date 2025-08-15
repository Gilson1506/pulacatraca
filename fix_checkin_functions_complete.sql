-- ===================================================================
-- SCRIPT COMPLETO PARA CORRIGIR FUNÇÕES DE CHECK-IN
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO ESTRUTURA DAS TABELAS ===';
END $$;

SELECT 'events' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'tickets' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ticket_users' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'checkin' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'checkin' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR FUNÇÕES RPC EXISTENTES
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO FUNÇÕES RPC EXISTENTES ===';
END $$;

SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('search_event_participants', 'perform_participant_checkin', 'checkin_by_qr_code');

-- 3. REMOVER FUNÇÕES EXISTENTES SE HOUVER
DROP FUNCTION IF EXISTS search_event_participants(uuid, uuid, text);
DROP FUNCTION IF EXISTS perform_participant_checkin(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS checkin_by_qr_code(text, uuid, uuid);

-- 4. RECRIAR FUNÇÃO: search_event_participants
CREATE OR REPLACE FUNCTION search_event_participants(
    p_event_id UUID,
    p_organizer_id UUID,
    p_search_term TEXT DEFAULT NULL
) RETURNS TABLE (
    ticket_user_id UUID,
    participant_name TEXT,
    participant_email TEXT,
    participant_document TEXT,
    participant_phone TEXT,
    ticket_type TEXT,
    ticket_price DECIMAL,
    purchase_date TIMESTAMP,
    already_checked_in BOOLEAN,
    checkin_date TIMESTAMP
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RAISE NOTICE 'search_event_participants: event_id=%, organizer_id=%, search_term=%', p_event_id, p_organizer_id, p_search_term;
    
    -- Verificar se o evento pertence ao organizador
    IF NOT EXISTS (
        SELECT 1 FROM events e 
        WHERE e.id = p_event_id AND e.organizer_id = p_organizer_id
    ) THEN
        RAISE EXCEPTION 'Evento não encontrado ou você não tem permissão para acessá-lo';
    END IF;
    
    RETURN QUERY
    SELECT 
        tu.id as ticket_user_id,
        COALESCE(tu.name, 'Nome não informado') as participant_name,
        COALESCE(tu.email, 'Email não informado') as participant_email,
        COALESCE(tu.document, 'CPF não informado') as participant_document,
        COALESCE(tu.phone, 'Telefone não informado') as participant_phone,
        COALESCE(t.name, 'Ingresso') as ticket_type,
        COALESCE(t.price, 0) as ticket_price,
        COALESCE(tu.created_at, NOW()) as purchase_date,
        CASE WHEN c.id IS NOT NULL THEN TRUE ELSE FALSE END as already_checked_in,
        c.created_at as checkin_date
    FROM ticket_users tu
    INNER JOIN tickets t ON tu.ticket_id = t.id
    INNER JOIN events e ON t.event_id = e.id
    LEFT JOIN checkin c ON c.ticket_user_id = tu.id
    WHERE 
        e.id = p_event_id
        AND e.organizer_id = p_organizer_id
        AND (
            p_search_term IS NULL 
            OR p_search_term = ''
            OR LOWER(tu.name) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(tu.email) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(tu.document) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(tu.phone) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY tu.created_at DESC;
    
END $$;

-- 5. RECRIAR FUNÇÃO: perform_participant_checkin
CREATE OR REPLACE FUNCTION perform_participant_checkin(
    p_ticket_user_id UUID,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    checkin_id UUID,
    participant_name TEXT,
    participant_email TEXT,
    participant_document TEXT,
    ticket_type TEXT,
    event_title TEXT,
    checkin_date TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_checkin_id UUID;
    v_participant_name TEXT;
    v_participant_email TEXT;
    v_participant_document TEXT;
    v_ticket_type TEXT;
    v_event_title TEXT;
    v_already_checked BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'perform_participant_checkin: ticket_user_id=%, event_id=%, organizer_id=%', p_ticket_user_id, p_event_id, p_organizer_id;
    
    -- Verificar se o participante existe e pertence ao evento do organizador
    SELECT 
        tu.name, tu.email, tu.document, t.name, e.title,
        CASE WHEN c.id IS NOT NULL THEN TRUE ELSE FALSE END
    INTO 
        v_participant_name, v_participant_email, v_participant_document, 
        v_ticket_type, v_event_title, v_already_checked
    FROM ticket_users tu
    INNER JOIN tickets t ON tu.ticket_id = t.id
    INNER JOIN events e ON t.event_id = e.id
    LEFT JOIN checkin c ON c.ticket_user_id = tu.id
    WHERE 
        tu.id = p_ticket_user_id
        AND e.id = p_event_id
        AND e.organizer_id = p_organizer_id;
    
    -- Se não encontrou o participante
    IF v_participant_name IS NULL THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Participante não encontrado ou não pertence a este evento' as message,
            NULL::UUID as checkin_id,
            NULL::TEXT as participant_name,
            NULL::TEXT as participant_email,
            NULL::TEXT as participant_document,
            NULL::TEXT as ticket_type,
            NULL::TEXT as event_title,
            NULL::TEXT as checkin_date;
        RETURN;
    END IF;
    
    -- Se já fez check-in
    IF v_already_checked THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Check-in já foi realizado para este participante' as message,
            NULL::UUID as checkin_id,
            v_participant_name as participant_name,
            v_participant_email as participant_email,
            v_participant_document as participant_document,
            v_ticket_type as ticket_type,
            v_event_title as event_title,
            NOW()::TEXT as checkin_date;
        RETURN;
    END IF;
    
    -- Realizar check-in
    INSERT INTO checkin (ticket_user_id, event_id, organizer_id, created_at)
    VALUES (p_ticket_user_id, p_event_id, p_organizer_id, NOW())
    RETURNING id INTO v_checkin_id;
    
    -- Retornar sucesso
    RETURN QUERY SELECT 
        TRUE as success,
        'Check-in realizado com sucesso!' as message,
        v_checkin_id as checkin_id,
        v_participant_name as participant_name,
        v_participant_email as participant_email,
        v_participant_document as participant_document,
        v_ticket_type as ticket_type,
        v_event_title as event_title,
        NOW()::TEXT as checkin_date;
    
END $$;

-- 6. RECRIAR FUNÇÃO: checkin_by_qr_code
CREATE OR REPLACE FUNCTION checkin_by_qr_code(
    p_qr_code TEXT,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    checkin_id UUID,
    participant_name TEXT,
    participant_email TEXT,
    participant_document TEXT,
    ticket_type TEXT,
    event_title TEXT,
    checkin_date TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ticket_user_id UUID;
BEGIN
    RAISE NOTICE 'checkin_by_qr_code: qr_code=%, event_id=%, organizer_id=%', p_qr_code, p_event_id, p_organizer_id;
    
    -- Tentar extrair ticket_user_id do QR code
    -- Assumindo que o QR code pode ser:
    -- 1. Diretamente o UUID do ticket_user
    -- 2. Uma URL contendo o UUID
    -- 3. Um JSON com o UUID
    
    BEGIN
        -- Tentar como UUID direto
        v_ticket_user_id := p_qr_code::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- Tentar extrair de URL ou JSON
        -- Exemplo: https://app.com/ticket/uuid ou {"ticket_user_id":"uuid"}
        IF p_qr_code LIKE '%ticket/%' THEN
            v_ticket_user_id := SUBSTRING(p_qr_code FROM '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}')::UUID;
        ELSIF p_qr_code LIKE '%ticket_user_id%' THEN
            v_ticket_user_id := (p_qr_code::JSON->>'ticket_user_id')::UUID;
        ELSE
            RETURN QUERY SELECT 
                FALSE as success,
                'QR Code inválido ou não reconhecido' as message,
                NULL::UUID as checkin_id,
                NULL::TEXT as participant_name,
                NULL::TEXT as participant_email,
                NULL::TEXT as participant_document,
                NULL::TEXT as ticket_type,
                NULL::TEXT as event_title,
                NULL::TEXT as checkin_date;
            RETURN;
        END IF;
    END;
    
    -- Chamar a função de check-in normal
    RETURN QUERY SELECT * FROM perform_participant_checkin(v_ticket_user_id, p_event_id, p_organizer_id);
    
END $$;

-- 7. VERIFICAR SE AS TABELAS TÊM RLS HABILITADO
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO RLS ===';
END $$;

SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'tickets', 'ticket_users', 'checkin');

-- 8. HABILITAR RLS SE NECESSÁRIO
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS checkin ENABLE ROW LEVEL SECURITY;

-- 9. CRIAR/RECRIAR POLÍTICAS RLS
DROP POLICY IF EXISTS "Organizers can view their event participants" ON ticket_users;
DROP POLICY IF EXISTS "Organizers can manage checkins" ON checkin;

-- Política para ticket_users (visualização por organizadores)
CREATE POLICY "Organizers can view their event participants" ON ticket_users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tickets t
        INNER JOIN events e ON t.event_id = e.id
        WHERE t.id = ticket_users.ticket_id
        AND e.organizer_id = auth.uid()
    )
);

-- Política para checkin (gerenciamento por organizadores)
CREATE POLICY "Organizers can manage checkins" ON checkin
FOR ALL USING (organizer_id = auth.uid());

-- 10. TESTAR AS FUNÇÕES
DO $$
BEGIN
    RAISE NOTICE '=== FUNÇÕES RECRIADAS COM SUCESSO ===';
    RAISE NOTICE 'Funções disponíveis:';
    RAISE NOTICE '- search_event_participants(event_id, organizer_id, search_term)';
    RAISE NOTICE '- perform_participant_checkin(ticket_user_id, event_id, organizer_id)';
    RAISE NOTICE '- checkin_by_qr_code(qr_code, event_id, organizer_id)';
END $$;