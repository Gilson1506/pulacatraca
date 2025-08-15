-- ===================================================================
-- FUNÇÃO RPC DEBUG: CHECK-IN COMPLETO VIA QR CODE COM LOGS
-- ===================================================================
-- Esta versão adiciona logs detalhados para debug
-- ===================================================================

CREATE OR REPLACE FUNCTION debug_checkin_by_qr_code(p_qr_code TEXT)
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
    v_debug_info JSON;
BEGIN
    -- ===================================
    -- DEBUG: Informações iniciais
    -- ===================================
    RAISE NOTICE 'DEBUG: Iniciando checkin para QR: %', p_qr_code;
    
    -- ===================================
    -- 1. BUSCAR TICKET USER PELO QR CODE
    -- ===================================
    RAISE NOTICE 'DEBUG: Buscando ticket_user com QR: %', p_qr_code;
    
    SELECT * INTO v_ticket_user 
    FROM ticket_users 
    WHERE qr_code = p_qr_code;
    
    -- Debug do resultado
    IF v_ticket_user.id IS NULL THEN
        RAISE NOTICE 'DEBUG: QR CODE NÃO ENCONTRADO na tabela ticket_users';
        RETURN json_build_object(
            'success', false,
            'error', 'QR_CODE_NOT_FOUND',
            'message', 'Código QR não encontrado ou inválido',
            'debug', json_build_object(
                'step', 'ticket_user_search',
                'qr_code', p_qr_code,
                'found', false
            )
        );
    ELSE
        RAISE NOTICE 'DEBUG: ticket_user ENCONTRADO - ID: %, ticket_id: %, name: %', 
                     v_ticket_user.id, v_ticket_user.ticket_id, v_ticket_user.name;
    END IF;
    
    -- ===================================
    -- 2. BUSCAR DADOS DO TICKET
    -- ===================================
    RAISE NOTICE 'DEBUG: Buscando ticket com ID: %', v_ticket_user.ticket_id;
    
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id;
    
    IF v_ticket.id IS NULL THEN
        RAISE NOTICE 'DEBUG: TICKET NÃO ENCONTRADO na tabela tickets com ID: %', v_ticket_user.ticket_id;
        
        -- Verificar se existem tickets na tabela
        DECLARE
            v_ticket_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO v_ticket_count FROM tickets;
            RAISE NOTICE 'DEBUG: Total de tickets na tabela: %', v_ticket_count;
            
            -- Listar alguns tickets para debug
            FOR v_ticket IN SELECT id, name, event_id FROM tickets LIMIT 5 LOOP
                RAISE NOTICE 'DEBUG: Ticket existente - ID: %, name: %, event_id: %', 
                             v_ticket.id, v_ticket.name, v_ticket.event_id;
            END LOOP;
        END;
        
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Ticket não encontrado',
            'debug', json_build_object(
                'step', 'ticket_search',
                'ticket_user_id', v_ticket_user.id,
                'ticket_user_name', v_ticket_user.name,
                'looking_for_ticket_id', v_ticket_user.ticket_id,
                'found', false
            )
        );
    ELSE
        RAISE NOTICE 'DEBUG: ticket ENCONTRADO - ID: %, name: %, event_id: %', 
                     v_ticket.id, v_ticket.name, v_ticket.event_id;
    END IF;
    
    -- ===================================
    -- 3. BUSCAR DADOS DO EVENTO
    -- ===================================
    RAISE NOTICE 'DEBUG: Buscando evento com ID: %', v_ticket.event_id;
    
    SELECT * INTO v_event 
    FROM events 
    WHERE id = v_ticket.event_id;
    
    IF v_event.id IS NULL THEN
        RAISE NOTICE 'DEBUG: EVENTO NÃO ENCONTRADO na tabela events com ID: %', v_ticket.event_id;
        RETURN json_build_object(
            'success', false,
            'error', 'EVENT_NOT_FOUND',
            'message', 'Evento não encontrado',
            'debug', json_build_object(
                'step', 'event_search',
                'ticket_id', v_ticket.id,
                'looking_for_event_id', v_ticket.event_id,
                'found', false
            )
        );
    ELSE
        RAISE NOTICE 'DEBUG: evento ENCONTRADO - ID: %, title: %', v_event.id, v_event.title;
    END IF;
    
    -- ===================================
    -- 4. VERIFICAR CHECK-IN EXISTENTE
    -- ===================================
    RAISE NOTICE 'DEBUG: Verificando check-in existente para ticket_user_id: %', v_ticket_user.id;
    
    SELECT * INTO v_existing_checkin 
    FROM checkin 
    WHERE ticket_user_id = v_ticket_user.id
    LIMIT 1;
    
    -- ===================================
    -- 5. REALIZAR CHECK-IN SE NECESSÁRIO
    -- ===================================
    IF v_existing_checkin.id IS NULL THEN
        RAISE NOTICE 'DEBUG: Realizando NOVO check-in...';
        
        INSERT INTO checkin (ticket_user_id, ticket_id, event_id, organizer_id, checked_in_at)
        VALUES (v_ticket_user.id, v_ticket.id, v_event.id, v_event.organizer_id, NOW())
        RETURNING id INTO v_new_checkin_id;
        
        RAISE NOTICE 'DEBUG: Check-in realizado com sucesso - ID: %', v_new_checkin_id;
        
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
                    'title', v_event.title,
                    'start_date', v_event.start_date,
                    'location', v_event.location
                ),
                'ticket', json_build_object(
                    'id', v_ticket.id,
                    'type', v_ticket.ticket_type,
                    'price', v_ticket.price
                ),
                'checkin', json_build_object(
                    'id', v_new_checkin_id,
                    'checked_in_at', NOW(),
                    'is_new', true
                )
            ),
            'debug', json_build_object(
                'success', true,
                'action_taken', 'NEW_CHECKIN'
            )
        );
    ELSE
        RAISE NOTICE 'DEBUG: Check-in JÁ EXISTENTE - ID: %, data: %', v_existing_checkin.id, v_existing_checkin.checked_in_at;
        
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
                    'title', v_event.title,
                    'start_date', v_event.start_date,
                    'location', v_event.location
                ),
                'ticket', json_build_object(
                    'id', v_ticket.id,
                    'type', v_ticket.ticket_type,
                    'price', v_ticket.price
                ),
                'checkin', json_build_object(
                    'id', v_existing_checkin.id,
                    'checked_in_at', v_existing_checkin.checked_in_at,
                    'is_new', false
                )
            ),
            'debug', json_build_object(
                'success', true,
                'action_taken', 'ALREADY_CHECKED_IN'
            )
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'DEBUG: ERRO EXCEPTION - %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'SYSTEM_ERROR',
            'message', 'Erro interno do sistema: ' || SQLERRM,
            'debug', json_build_object(
                'step', 'exception',
                'error_message', SQLERRM,
                'error_state', SQLSTATE
            )
        );
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION debug_checkin_by_qr_code(TEXT) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION debug_checkin_by_qr_code(TEXT) IS 'Função RPC DEBUG para check-in via QR code. Inclui logs detalhados para identificar problemas. Uso: SELECT debug_checkin_by_qr_code(''PLKTK909538'')';