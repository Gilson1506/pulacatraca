-- ===================================================================
-- FUNÇÃO RPC CORRIGIDA: CHECK-IN COMPLETO VIA QR CODE
-- ===================================================================
-- Versão corrigida sem referenciar colunas que não existem
-- ===================================================================

CREATE OR REPLACE FUNCTION checkin_by_qr_code(p_qr_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_ticket_user RECORD;
    v_ticket RECORD;
    v_event RECORD;
    v_existing_checkin RECORD;
    v_new_checkin_id UUID;
BEGIN
    -- ===================================
    -- 1. BUSCAR TICKET USER PELO QR CODE
    -- ===================================
    SELECT * INTO v_ticket_user 
    FROM ticket_users 
    WHERE qr_code = p_qr_code;
    
    -- Se não encontrou ticket_user
    IF v_ticket_user.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR_CODE_NOT_FOUND',
            'message', 'Código QR não encontrado ou inválido'
        );
    END IF;
    
    -- ===================================
    -- 2. BUSCAR DADOS DO TICKET
    -- ===================================
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id;
    
    IF v_ticket.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Ticket não encontrado'
        );
    END IF;
    
    -- ===================================
    -- 3. BUSCAR DADOS DO EVENTO
    -- ===================================
    SELECT * INTO v_event 
    FROM events 
    WHERE id = v_ticket.event_id;
    
    IF v_event.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'EVENT_NOT_FOUND',
            'message', 'Evento não encontrado'
        );
    END IF;
    
    -- ===================================
    -- 4. VERIFICAR CHECK-IN EXISTENTE
    -- ===================================
    SELECT * INTO v_existing_checkin 
    FROM checkin 
    WHERE ticket_user_id = v_ticket_user.id
    LIMIT 1;
    
    -- ===================================
    -- 5. REALIZAR CHECK-IN SE NECESSÁRIO
    -- ===================================
    IF v_existing_checkin.id IS NULL THEN
        -- Realizando novo check-in
        INSERT INTO checkin (ticket_user_id, ticket_id, event_id, organizer_id, checked_in_at)
        VALUES (v_ticket_user.id, v_ticket.id, v_event.id, COALESCE(v_event.organizer_id, v_event.user_id), NOW())
        RETURNING id INTO v_new_checkin_id;
        
        RETURN json_build_object(
            'success', true,
            'action', 'NEW_CHECKIN',
            'message', 'Check-in realizado com sucesso!',
            'data', json_build_object(
                'participant', json_build_object(
                    'id', v_ticket_user.id,
                    'name', v_ticket_user.name,
                    'email', v_ticket_user.email,
                    'qr_code', v_ticket_user.qr_code
                ),
                'event', json_build_object(
                    'id', v_event.id,
                    'title', COALESCE(v_event.title, v_event.name),
                    'start_date', v_event.start_date,
                    'location', v_event.location
                ),
                'ticket', json_build_object(
                    'id', v_ticket.id,
                    'type', COALESCE(v_ticket.ticket_type, v_ticket.type, 'Padrão'),
                    'price', COALESCE(v_ticket.price, 0)
                ),
                'checkin', json_build_object(
                    'id', v_new_checkin_id,
                    'checked_in_at', NOW(),
                    'is_new', true
                )
            )
        );
    ELSE
        -- Check-in já existe
        RETURN json_build_object(
            'success', true,
            'action', 'ALREADY_CHECKED_IN',
            'message', 'Participante já realizou check-in anteriormente',
            'data', json_build_object(
                'participant', json_build_object(
                    'id', v_ticket_user.id,
                    'name', v_ticket_user.name,
                    'email', v_ticket_user.email,
                    'qr_code', v_ticket_user.qr_code
                ),
                'event', json_build_object(
                    'id', v_event.id,
                    'title', COALESCE(v_event.title, v_event.name),
                    'start_date', v_event.start_date,
                    'location', v_event.location
                ),
                'ticket', json_build_object(
                    'id', v_ticket.id,
                    'type', COALESCE(v_ticket.ticket_type, v_ticket.type, 'Padrão'),
                    'price', COALESCE(v_ticket.price, 0)
                ),
                'checkin', json_build_object(
                    'id', v_existing_checkin.id,
                    'checked_in_at', v_existing_checkin.checked_in_at,
                    'is_new', false
                )
            )
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'SYSTEM_ERROR',
            'message', 'Erro interno do sistema: ' || SQLERRM
        );
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION checkin_by_qr_code(TEXT) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION checkin_by_qr_code(TEXT) IS 'Função RPC corrigida para check-in via QR code. Remove referências a colunas inexistentes. Uso: SELECT checkin_by_qr_code(''PLKTK909538'')';