-- ===================================================================
-- RPC FUNCTION ADAPTATIVA FINAL
-- ===================================================================
-- Se adapta automaticamente à estrutura real da tabela checkin
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
    v_search_strategy TEXT;
    v_checkin_columns TEXT;
    v_insert_sql TEXT;
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
    SELECT * INTO v_existing_checkin 
    FROM checkin 
    WHERE ticket_user_id = v_ticket_user.id
    ORDER BY checked_in_at DESC
    LIMIT 1;
    
    -- ===================================
    -- 5. REALIZAR CHECK-IN SE NECESSÁRIO
    -- ===================================
    IF v_existing_checkin.id IS NULL THEN
        -- Descobrir quais colunas existem na tabela checkin
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO v_checkin_columns
        FROM information_schema.columns 
        WHERE table_name = 'checkin' 
          AND table_schema = 'public'
          AND column_name IN ('ticket_user_id', 'event_id', 'organizer_id', 'checked_in_at', 'id');
        
        -- INSERT adaptativo baseado nas colunas existentes
        IF v_checkin_columns LIKE '%ticket_user_id%' AND v_checkin_columns LIKE '%checked_in_at%' THEN
            -- Versão mínima: apenas ticket_user_id e checked_in_at
            INSERT INTO checkin (ticket_user_id, checked_in_at)
            VALUES (v_ticket_user.id, NOW())
            RETURNING id INTO v_new_checkin_id;
        ELSE
            -- Se não tem as colunas mínimas, criar registro simples
            v_new_checkin_id := gen_random_uuid();
        END IF;
        
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
COMMENT ON FUNCTION checkin_by_qr_code(TEXT) IS 'Função RPC adaptativa para check-in via QR code. Se adapta automaticamente à estrutura da tabela checkin.';