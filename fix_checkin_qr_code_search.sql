-- ✅ CORRIGIR FUNÇÃO CHECKIN_BY_QR_CODE PARA BUSCAR QR CODES CORRETAMENTE
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO FUNÇÃO CHECKIN_BY_QR_CODE ===';
END $$;

-- 1. Dropar função existente se existir
DROP FUNCTION IF EXISTS checkin_by_qr_code(text, uuid, uuid);

-- 2. Recriar função com lógica corrigida para buscar QR codes
CREATE OR REPLACE FUNCTION checkin_by_qr_code(
    p_qr_code TEXT,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    participant_info JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ticket_user_record RECORD;
    v_ticket_record RECORD;
    v_event_record RECORD;
    v_existing_checkin RECORD;
    v_checkin_id UUID;
BEGIN
    RAISE NOTICE 'checkin_by_qr_code: Buscando QR code=%, event_id=%, organizer_id=%', p_qr_code, p_event_id, p_organizer_id;
    
    -- 1. Verificar se o evento existe e pertence ao organizador
    SELECT * INTO v_event_record 
    FROM events 
    WHERE id = p_event_id AND organizer_id = p_organizer_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Evento não encontrado ou sem permissão' as message,
            NULL::JSONB as participant_info;
        RETURN;
    END IF;
    
    -- 2. Buscar ticket_user pelo QR code
    SELECT tu.*, t.event_id, t.ticket_type, t.id as ticket_id
    INTO v_ticket_user_record
    FROM ticket_users tu
    JOIN tickets t ON t.ticket_user_id = tu.id
    WHERE tu.qr_code = p_qr_code
    AND t.event_id = p_event_id;
    
    IF NOT FOUND THEN
        -- Tentar buscar diretamente na tabela tickets pelo qr_code (fallback)
        SELECT t.*, tu.name as user_name, tu.email as user_email, tu.document as user_document
        INTO v_ticket_record
        FROM tickets t
        LEFT JOIN ticket_users tu ON t.ticket_user_id = tu.id
        WHERE t.qr_code = p_qr_code
        AND t.event_id = p_event_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                FALSE as success,
                'QR Code não encontrado para este evento' as message,
                jsonb_build_object(
                    'qr_code', p_qr_code,
                    'event_id', p_event_id,
                    'search_attempted', 'ticket_users and tickets tables'
                ) as participant_info;
            RETURN;
        ELSE
            -- Usar dados do ticket se não tiver ticket_user
            RETURN QUERY SELECT 
                FALSE as success,
                'Ingresso encontrado mas usuário não definido. Defina o usuário primeiro.' as message,
                jsonb_build_object(
                    'ticket_id', v_ticket_record.id,
                    'ticket_type', v_ticket_record.ticket_type,
                    'qr_code', p_qr_code,
                    'status', 'user_not_defined'
                ) as participant_info;
            RETURN;
        END IF;
    END IF;
    
    -- 3. Verificar se já foi feito check-in
    SELECT * INTO v_existing_checkin
    FROM checkins 
    WHERE ticket_user_id = v_ticket_user_record.id 
    AND event_id = p_event_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Check-in já foi realizado anteriormente' as message,
            jsonb_build_object(
                'participant_name', v_ticket_user_record.name,
                'participant_email', v_ticket_user_record.email,
                'participant_document', v_ticket_user_record.document,
                'ticket_type', v_ticket_user_record.ticket_type,
                'event_title', v_event_record.title,
                'checkin_date', v_existing_checkin.created_at,
                'already_checked', true
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 4. Realizar check-in
    INSERT INTO checkins (
        id,
        ticket_user_id,
        event_id,
        organizer_id,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_ticket_user_record.id,
        p_event_id,
        p_organizer_id,
        NOW()
    ) RETURNING id INTO v_checkin_id;
    
    -- 5. Retornar sucesso
    RETURN QUERY SELECT 
        TRUE as success,
        'Check-in realizado com sucesso!' as message,
        jsonb_build_object(
            'checkin_id', v_checkin_id,
            'participant_name', v_ticket_user_record.name,
            'participant_email', v_ticket_user_record.email,
            'participant_document', v_ticket_user_record.document,
            'ticket_type', v_ticket_user_record.ticket_type,
            'event_title', v_event_record.title,
            'checkin_date', NOW(),
            'ticket_id', v_ticket_user_record.ticket_id
        ) as participant_info;
    
END $$;

-- 3. Criar função para busca manual também
CREATE OR REPLACE FUNCTION search_participants_by_text(
    p_search_text TEXT,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    ticket_user_id UUID,
    name TEXT,
    email TEXT,
    document TEXT,
    ticket_type TEXT,
    qr_code TEXT,
    is_checked_in BOOLEAN,
    checkin_date TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tu.id as ticket_user_id,
        tu.name,
        tu.email,
        tu.document,
        t.ticket_type,
        tu.qr_code,
        (c.id IS NOT NULL) as is_checked_in,
        c.created_at as checkin_date
    FROM ticket_users tu
    JOIN tickets t ON t.ticket_user_id = tu.id
    LEFT JOIN checkins c ON c.ticket_user_id = tu.id AND c.event_id = p_event_id
    WHERE t.event_id = p_event_id
    AND (
        tu.name ILIKE '%' || p_search_text || '%' OR
        tu.email ILIKE '%' || p_search_text || '%' OR
        tu.document ILIKE '%' || p_search_text || '%' OR
        tu.qr_code ILIKE '%' || p_search_text || '%'
    )
    ORDER BY tu.name;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Funções de check-in corrigidas para buscar QR codes corretamente';
END $$;