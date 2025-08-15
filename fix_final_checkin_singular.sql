-- ====================================================================
-- SCRIPT FINAL: Correção de todas as funções para usar tabela 'checkin' (singular)
-- Execute este script no Supabase SQL Editor para corrigir definitivamente
-- ====================================================================

-- 1. Recriar função search_participants_by_text usando 'checkin' (singular)
CREATE OR REPLACE FUNCTION search_participants_by_text(
    p_search_text TEXT DEFAULT '',
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Log da função
    RAISE NOTICE 'Buscando participantes: search=%, event=%, organizer=%', p_search_text, p_event_id, p_organizer_id;
    
    -- Buscar participantes com informações de check-in
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', tu.id,
            'name', COALESCE(tu.name, 'Nome não informado'),
            'email', COALESCE(tu.email, 'Email não informado'),
            'document', tu.document,
            'qr_code', COALESCE(tu.qr_code, t.qr_code, 'QR não disponível'),
            'ticket_type', COALESCE(t.ticket_type, 'Ingresso'),
            'is_checked_in', CASE WHEN c.id IS NOT NULL THEN true ELSE false END,
            'checkin_date', c.created_at,
            'created_at', COALESCE(tu.created_at, t.created_at, NOW())
        )
    ) INTO result
    FROM tickets t
    INNER JOIN ticket_users tu ON t.ticket_user_id = tu.id
    LEFT JOIN checkin c ON c.ticket_user_id = tu.id AND c.event_id = p_event_id  -- CORRIGIDO: checkin singular
    INNER JOIN events e ON t.event_id = e.id
    WHERE t.event_id = p_event_id 
      AND e.user_id = p_organizer_id
      AND t.ticket_user_id IS NOT NULL
      AND (
          p_search_text = '' OR 
          p_search_text IS NULL OR
          LOWER(COALESCE(tu.name, '')) LIKE LOWER('%' || p_search_text || '%') OR
          LOWER(COALESCE(tu.email, '')) LIKE LOWER('%' || p_search_text || '%') OR
          LOWER(COALESCE(tu.document, '')) LIKE LOWER('%' || p_search_text || '%') OR
          LOWER(COALESCE(tu.qr_code, t.qr_code, '')) LIKE LOWER('%' || p_search_text || '%')
      )
    ORDER BY tu.created_at DESC
    LIMIT 100;
    
    -- Retornar resultado
    RETURN COALESCE(result, '[]'::JSONB);
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro em search_participants_by_text: %', SQLERRM;
    RETURN '[]'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recriar função get_event_participants usando 'checkin' (singular)
CREATE OR REPLACE FUNCTION get_event_participants(
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Log da função
    RAISE NOTICE 'Buscando todos os participantes: event=%, organizer=%', p_event_id, p_organizer_id;
    
    -- Buscar todos os participantes do evento
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', tu.id,
            'name', COALESCE(tu.name, 'Nome não informado'),
            'email', COALESCE(tu.email, 'Email não informado'),
            'document', tu.document,
            'qr_code', COALESCE(tu.qr_code, t.qr_code, 'QR não disponível'),
            'ticket_type', COALESCE(t.ticket_type, 'Ingresso'),
            'is_checked_in', CASE WHEN c.id IS NOT NULL THEN true ELSE false END,
            'checkin_date', c.created_at,
            'created_at', COALESCE(tu.created_at, t.created_at, NOW())
        )
    ) INTO result
    FROM tickets t
    INNER JOIN ticket_users tu ON t.ticket_user_id = tu.id
    LEFT JOIN checkin c ON c.ticket_user_id = tu.id AND c.event_id = p_event_id  -- CORRIGIDO: checkin singular
    INNER JOIN events e ON t.event_id = e.id
    WHERE t.event_id = p_event_id 
      AND e.user_id = p_organizer_id
      AND t.ticket_user_id IS NOT NULL
    ORDER BY tu.created_at DESC;
    
    -- Retornar resultado
    RETURN COALESCE(result, '[]'::JSONB);
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro em get_event_participants: %', SQLERRM;
    RETURN '[]'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar função checkin_by_qr_code usando 'checkin' (singular)
CREATE OR REPLACE FUNCTION checkin_by_qr_code(
    p_qr_code TEXT,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_ticket_user_id UUID;
    v_participant_name TEXT;
    v_participant_email TEXT;
    v_participant_document TEXT;
    v_ticket_type TEXT;
    v_event_title TEXT;
    v_existing_checkin_date TIMESTAMPTZ;
    v_new_checkin_id UUID;
    result JSONB;
BEGIN
    -- Log da busca
    RAISE NOTICE 'Processando check-in QR: %, evento: %, organizador: %', p_qr_code, p_event_id, p_organizer_id;
    
    -- Buscar participante pelo QR code
    SELECT 
        tu.id,
        COALESCE(tu.name, 'Nome não informado'),
        COALESCE(tu.email, 'Email não informado'),
        tu.document,
        COALESCE(t.ticket_type, 'Ingresso'),
        e.title
    INTO 
        v_ticket_user_id,
        v_participant_name,
        v_participant_email,
        v_participant_document,
        v_ticket_type,
        v_event_title
    FROM tickets t
    INNER JOIN ticket_users tu ON t.ticket_user_id = tu.id
    INNER JOIN events e ON t.event_id = e.id
    WHERE (tu.qr_code = p_qr_code OR t.qr_code = p_qr_code)
      AND t.event_id = p_event_id
      AND e.user_id = p_organizer_id
      AND t.ticket_user_id IS NOT NULL;
    
    -- Verificar se participante foi encontrado
    IF v_ticket_user_id IS NULL THEN
        RETURN jsonb_build_array(
            jsonb_build_object(
                'success', false,
                'message', 'QR code não encontrado ou não pertence a este evento',
                'participant_info', jsonb_build_object(
                    'qr_code', p_qr_code,
                    'error_type', 'not_found'
                )
            )
        );
    END IF;
    
    -- Verificar se já foi feito check-in
    SELECT created_at INTO v_existing_checkin_date
    FROM checkin  -- CORRIGIDO: checkin singular
    WHERE ticket_user_id = v_ticket_user_id 
      AND event_id = p_event_id 
      AND organizer_id = p_organizer_id;
    
    IF v_existing_checkin_date IS NOT NULL THEN
        RETURN jsonb_build_array(
            jsonb_build_object(
                'success', false,
                'message', 'Check-in já foi realizado anteriormente',
                'participant_info', jsonb_build_object(
                    'participant_name', v_participant_name,
                    'participant_email', v_participant_email,
                    'participant_document', v_participant_document,
                    'ticket_type', v_ticket_type,
                    'event_title', v_event_title,
                    'checkin_date', v_existing_checkin_date,
                    'qr_code', p_qr_code
                )
            )
        );
    END IF;
    
    -- Realizar check-in
    INSERT INTO checkin (  -- CORRIGIDO: checkin singular
        ticket_user_id,
        event_id,
        organizer_id,
        created_at
    ) VALUES (
        v_ticket_user_id,
        p_event_id,
        p_organizer_id,
        NOW()
    ) RETURNING id INTO v_new_checkin_id;
    
    -- Retornar sucesso
    RETURN jsonb_build_array(
        jsonb_build_object(
            'success', true,
            'message', 'Check-in realizado com sucesso!',
            'participant_info', jsonb_build_object(
                'participant_name', v_participant_name,
                'participant_email', v_participant_email,
                'participant_document', v_participant_document,
                'ticket_type', v_ticket_type,
                'event_title', v_event_title,
                'checkin_date', NOW(),
                'checkin_id', v_new_checkin_id,
                'qr_code', p_qr_code
            )
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro em checkin_by_qr_code: %', SQLERRM;
    RETURN jsonb_build_array(
        jsonb_build_object(
            'success', false,
            'message', 'Erro interno no servidor: ' || SQLERRM,
            'participant_info', jsonb_build_object(
                'qr_code', p_qr_code,
                'error_type', 'internal_error'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recriar função perform_participant_checkin usando 'checkin' (singular)
CREATE OR REPLACE FUNCTION perform_participant_checkin(
    p_ticket_user_id UUID,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_participant_name TEXT;
    v_participant_email TEXT;
    v_participant_document TEXT;
    v_ticket_type TEXT;
    v_event_title TEXT;
    v_existing_checkin_date TIMESTAMPTZ;
    v_new_checkin_id UUID;
    result JSONB;
BEGIN
    -- Log da operação
    RAISE NOTICE 'Check-in manual: ticket_user=%, evento=%, organizador=%', p_ticket_user_id, p_event_id, p_organizer_id;
    
    -- Buscar informações do participante
    SELECT 
        COALESCE(tu.name, 'Nome não informado'),
        COALESCE(tu.email, 'Email não informado'),
        tu.document,
        COALESCE(t.ticket_type, 'Ingresso'),
        e.title
    INTO 
        v_participant_name,
        v_participant_email,
        v_participant_document,
        v_ticket_type,
        v_event_title
    FROM tickets t
    INNER JOIN ticket_users tu ON t.ticket_user_id = tu.id
    INNER JOIN events e ON t.event_id = e.id
    WHERE tu.id = p_ticket_user_id
      AND t.event_id = p_event_id
      AND e.user_id = p_organizer_id;
    
    -- Verificar se participante foi encontrado
    IF v_participant_name IS NULL THEN
        RETURN jsonb_build_array(
            jsonb_build_object(
                'success', false,
                'message', 'Participante não encontrado ou não pertence a este evento'
            )
        );
    END IF;
    
    -- Verificar se já foi feito check-in
    SELECT created_at INTO v_existing_checkin_date
    FROM checkin  -- CORRIGIDO: checkin singular
    WHERE ticket_user_id = p_ticket_user_id 
      AND event_id = p_event_id 
      AND organizer_id = p_organizer_id;
    
    IF v_existing_checkin_date IS NOT NULL THEN
        RETURN jsonb_build_array(
            jsonb_build_object(
                'success', false,
                'message', 'Check-in já foi realizado anteriormente em ' || v_existing_checkin_date::TEXT,
                'participant_name', v_participant_name,
                'participant_email', v_participant_email,
                'participant_document', v_participant_document,
                'ticket_type', v_ticket_type,
                'event_title', v_event_title,
                'checkin_date', v_existing_checkin_date
            )
        );
    END IF;
    
    -- Realizar check-in
    INSERT INTO checkin (  -- CORRIGIDO: checkin singular
        ticket_user_id,
        event_id,
        organizer_id,
        created_at
    ) VALUES (
        p_ticket_user_id,
        p_event_id,
        p_organizer_id,
        NOW()
    ) RETURNING id INTO v_new_checkin_id;
    
    -- Retornar sucesso
    RETURN jsonb_build_array(
        jsonb_build_object(
            'success', true,
            'message', 'Check-in realizado com sucesso!',
            'participant_name', v_participant_name,
            'participant_email', v_participant_email,
            'participant_document', v_participant_document,
            'ticket_type', v_ticket_type,
            'event_title', v_event_title,
            'checkin_date', NOW(),
            'checkin_id', v_new_checkin_id
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro em perform_participant_checkin: %', SQLERRM;
    RETURN jsonb_build_array(
        jsonb_build_object(
            'success', false,
            'message', 'Erro interno: ' || SQLERRM
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- SCRIPT CONCLUÍDO
-- ====================================================================

RAISE NOTICE '✅ Todas as funções foram atualizadas para usar a tabela "checkin" (singular)';
RAISE NOTICE '🎯 Execute este script e teste o sistema de check-in';
RAISE NOTICE '📋 Funções corrigidas:';
RAISE NOTICE '   - search_participants_by_text';
RAISE NOTICE '   - get_event_participants'; 
RAISE NOTICE '   - checkin_by_qr_code';
RAISE NOTICE '   - perform_participant_checkin';