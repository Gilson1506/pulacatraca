-- ===================================================================
-- RPC FUNCTION DEFINITIVA - ESTRUTURA REAL DA TABELA CHECKIN
-- ===================================================================
-- Baseada na estrutura real fornecida pelo usuário
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
    v_organizer_id UUID;
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
    -- 4. DETERMINAR ORGANIZER_ID
    -- ===================================
    -- Usar organizer_id do evento, com fallback para created_by ou user_id
    v_organizer_id := COALESCE(v_event.organizer_id, v_event.created_by, v_event.user_id);
    
    -- Se ainda não temos organizer_id válido, usar um padrão
    IF v_organizer_id IS NULL THEN
        -- Buscar primeiro usuário disponível ou usar um UUID padrão
        SELECT id INTO v_organizer_id 
        FROM auth.users 
        LIMIT 1;
        
        -- Se não encontrar nenhum usuário, gerar um UUID para não falhar
        IF v_organizer_id IS NULL THEN
            v_organizer_id := gen_random_uuid();
        END IF;
    END IF;
    
    -- ===================================
    -- 5. VERIFICAR CHECK-IN EXISTENTE
    -- ===================================
    SELECT * INTO v_existing_checkin 
    FROM checkin 
    WHERE ticket_user_id = v_ticket_user.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- ===================================
    -- 6. REALIZAR CHECK-IN SE NECESSÁRIO
    -- ===================================
    IF v_existing_checkin.id IS NULL THEN
        -- Realizar novo check-in
        INSERT INTO checkin (
            id,
            ticket_user_id,
            event_id,
            organizer_id,
            notes,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_ticket_user.id,
            v_event.id,
            v_organizer_id,
            'Check-in realizado via QR Scanner para ' || v_ticket_user.name,
            NOW(),
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
                    'is_new', true,
                    'organizer_id', v_organizer_id
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
                    'checked_in_at', v_existing_checkin.created_at,
                    'is_new', false,
                    'organizer_id', v_existing_checkin.organizer_id
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
COMMENT ON FUNCTION checkin_by_qr_code(TEXT) IS 'Função RPC definitiva para check-in via QR code baseada na estrutura real da tabela checkin.';