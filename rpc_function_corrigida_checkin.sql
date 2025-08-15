-- ===================================================================
-- RPC FUNCTION CORRIGIDA - SEM COLUNAS INEXISTENTES
-- ===================================================================
-- Versão que se adapta à estrutura real da tabela checkin
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
            'message', 'Código QR não encontrado ou inválido',
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'step', 'ticket_user_search'
            )
        );
    END IF;
    
    -- ===================================
    -- 2. BUSCAR TICKET COM MÚLTIPLAS ESTRATÉGIAS
    -- ===================================
    
    -- Estratégia 1: Busca direta
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_ticket.id IS NOT NULL THEN
        v_search_strategy := 'direct_match';
    ELSE
        -- Estratégia 2: Cast para texto
        SELECT * INTO v_ticket 
        FROM tickets 
        WHERE id::text = v_ticket_user.ticket_id::text
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF v_ticket.id IS NOT NULL THEN
            v_search_strategy := 'text_cast_match';
        ELSE
            -- Estratégia 3: Trim para remover espaços
            SELECT * INTO v_ticket 
            FROM tickets 
            WHERE TRIM(id::text) = TRIM(v_ticket_user.ticket_id::text)
            ORDER BY created_at DESC
            LIMIT 1;
            
            IF v_ticket.id IS NOT NULL THEN
                v_search_strategy := 'trim_match';
            END IF;
        END IF;
    END IF;
    
    -- Se ainda não encontrou o ticket
    IF v_ticket.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Ticket não encontrado',
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'ticket_user_id', v_ticket_user.id,
                'ticket_user_name', v_ticket_user.name,
                'looking_for_ticket_id', v_ticket_user.ticket_id,
                'ticket_id_type', pg_typeof(v_ticket_user.ticket_id),
                'step', 'ticket_search_failed'
            )
        );
    END IF;
    
    -- ===================================
    -- 3. BUSCAR DADOS DO EVENTO
    -- ===================================
    SELECT * INTO v_event 
    FROM events 
    WHERE id = v_ticket.event_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Se não encontrou evento
    IF v_event.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'EVENT_NOT_FOUND',
            'message', 'Evento não encontrado',
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'ticket_id', v_ticket.id,
                'looking_for_event_id', v_ticket.event_id,
                'search_strategy', v_search_strategy,
                'step', 'event_search_failed'
            )
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
        -- Realizando novo check-in - USANDO APENAS COLUNAS QUE EXISTEM
        INSERT INTO checkin (ticket_user_id, event_id, organizer_id, checked_in_at)
        VALUES (
            v_ticket_user.id, 
            v_event.id, 
            COALESCE(v_event.organizer_id, v_event.user_id), 
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
                    'title', COALESCE(v_event.title, v_event.name, 'Evento'),
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
            ),
            'debug', json_build_object(
                'search_strategy', v_search_strategy,
                'success', true
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
                    'title', COALESCE(v_event.title, v_event.name, 'Evento'),
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
            ),
            'debug', json_build_object(
                'search_strategy', v_search_strategy,
                'already_checked_in', true
            )
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'SYSTEM_ERROR',
            'message', 'Erro interno do sistema: ' || SQLERRM,
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'error_message', SQLERRM,
                'error_state', SQLSTATE,
                'step', 'exception_handler'
            )
        );
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION checkin_by_qr_code(TEXT) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION checkin_by_qr_code(TEXT) IS 'Função RPC corrigida para check-in via QR code. Remove referência à coluna ticket_id inexistente na tabela checkin. Uso: SELECT checkin_by_qr_code(''PLKTK909538'')';