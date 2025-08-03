-- ===================================================================
-- RPC PARA CHECKIN COM ESTRUTURA DE EVENTS
-- ===================================================================
-- A tabela checkin tem a mesma estrutura da tabela events
-- Vamos adaptar a RPC para essa realidade
-- ===================================================================

CREATE OR REPLACE FUNCTION checkin_by_qr_code(p_qr_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
    WHERE qr_code = p_qr_code
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Se não encontrou ticket_user
    IF v_ticket_user.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR_CODE_NOT_FOUND',
            'message', 'Código QR não encontrado ou inválido'
        );
    END IF;
    
    -- ===================================
    -- 2. BUSCAR TICKET
    -- ===================================
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_ticket.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Ticket não encontrado'
        );
    END IF;
    
    -- ===================================
    -- 3. BUSCAR EVENTO
    -- ===================================
    SELECT * INTO v_event 
    FROM events 
    WHERE id = v_ticket.event_id
    ORDER BY created_at DESC
    LIMIT 1;
    
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
    -- Buscar na tabela checkin (que tem estrutura de events)
    -- Usaremos um campo específico para identificar check-ins
    SELECT * INTO v_existing_checkin 
    FROM checkin 
    WHERE organizer_id = v_ticket_user.id  -- Usando organizer_id para armazenar ticket_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- ===================================
    -- 5. REALIZAR CHECK-IN SE NECESSÁRIO
    -- ===================================
    IF v_existing_checkin.id IS NULL THEN
        -- Criar registro de check-in na tabela checkin (estrutura de events)
        INSERT INTO checkin (
            id,
            title,
            description,
            organizer_id,    -- ticket_user_id
            start_date,      -- momento do check-in
            location,        -- evento location
            status,          -- "CHECKED_IN"
            created_at
        )
        VALUES (
            gen_random_uuid(),
            'Check-in: ' || v_event.title,
            'Check-in realizado para ' || v_ticket_user.name,
            v_ticket_user.id,
            NOW(),
            v_event.location,
            'CHECKED_IN',
            NOW()
        )
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
                    'title', COALESCE(v_event.title, 'Evento'),
                    'start_date', v_event.start_date,
                    'location', v_event.location
                ),
                'ticket', json_build_object(
                    'id', v_ticket.id,
                    'type', COALESCE(v_ticket.ticket_type, 'Padrão'),
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
                    'title', COALESCE(v_event.title, 'Evento'),
                    'start_date', v_event.start_date,
                    'location', v_event.location
                ),
                'ticket', json_build_object(
                    'id', v_ticket.id,
                    'type', COALESCE(v_ticket.ticket_type, 'Padrão'),
                    'price', COALESCE(v_ticket.price, 0)
                ),
                'checkin', json_build_object(
                    'id', v_existing_checkin.id,
                    'checked_in_at', v_existing_checkin.start_date,
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
COMMENT ON FUNCTION checkin_by_qr_code(TEXT) IS 'Função RPC para check-in via QR code adaptada para tabela checkin com estrutura de events.';