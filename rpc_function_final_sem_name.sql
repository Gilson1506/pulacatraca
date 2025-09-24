CREATE OR REPLACE FUNCTION checkin_by_qr_code(p_qr_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_ticket_user RECORD;
    v_ticket RECORD;
    v_event RECORD;
    v_existing_checkin RECORD;
    v_organizer_id UUID;
    v_checkin_id UUID;
    v_start_time TIMESTAMP;
    v_current_step TEXT;
    v_ticket_type RECORD;
BEGIN
    v_start_time := NOW();
    v_current_step := 'inicio';
    
    -- 1. Buscar ticket_user pelo QR Code
    v_current_step := 'buscar_ticket_user';
    SELECT * INTO v_ticket_user
    FROM ticket_users 
    WHERE qr_code = p_qr_code
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Ticket não encontrado',
            'debug', json_build_object('qr_code', p_qr_code, 'step', v_current_step)
        );
    END IF;
    
    -- 2. Buscar ticket
    v_current_step := 'buscar_ticket';
    SELECT * INTO v_ticket
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Dados do ticket não encontrados',
            'debug', json_build_object('ticket_user_id', v_ticket_user.id, 'step', v_current_step)
        );
    END IF;
    
    -- 3. Buscar tipo de ingresso (catálogo)
    v_current_step := 'buscar_ticket_type';
    SELECT * INTO v_ticket_type
    FROM ticket_types_with_batches 
    WHERE id = v_ticket.ticket_type_id
    LIMIT 1;
    
    -- 4. Buscar evento
    v_current_step := 'buscar_evento';
    SELECT * INTO v_event
    FROM events 
    WHERE id = v_ticket.event_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'EVENT_NOT_FOUND',
            'message', 'Evento não encontrado',
            'debug', json_build_object('ticket_id', v_ticket.id, 'step', v_current_step)
        );
    END IF;
    
    -- 5. Verificar check-in existente
    v_current_step := 'verificar_checkin_existente';
    SELECT * INTO v_existing_checkin
    FROM checkin 
    WHERE ticket_user_id = v_ticket_user.id
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'action', 'ALREADY_CHECKED_IN',
            'message', 'Participante já fez check-in anteriormente',
            'data', json_build_object(
                'name', COALESCE(v_ticket_user.name, 'Participante'),
                'email', COALESCE(v_ticket_user.email, ''),
                'event_title', COALESCE(v_event.title, 'Evento não informado'),
                'event_date', v_event.start_date,
                'event_location', COALESCE(
                    v_event.location,
                    v_event.location_name || ' - ' || v_event.location_city || '/' || v_event.location_state,
                    'Local não informado'
                ),
                'ticket_type', COALESCE(
                    v_ticket.ticket_type_name,
                    v_ticket_type.title,
                    v_ticket_type.name,
                    v_event.ticket_type,
                    'Ingresso não informado'
                ),
                'ticket_area', COALESCE(
                    v_ticket.ticket_area,
                    v_ticket_type.area,
                    'Área não informada'
                ),
                'ticket_price', COALESCE(
                    v_ticket.price,
                    v_ticket.original_price,
                    v_ticket_type.price,
                    v_event.price,
                    0
                ),
                'ticket_price_feminine', COALESCE(
                    v_ticket.price_feminine,
                    v_ticket_type.price_feminine,
                    v_ticket.price,
                    0
                ),
                'ticket_description', COALESCE(
                    v_ticket.description,
                    v_ticket_type.description,
                    ''
                ),
                'ticket_batch_name', COALESCE(
                    v_ticket.batch_name,
                    v_ticket_type.batches->0->>'name',
                    ''
                ),
                'checked_in_at', v_existing_checkin.created_at,
                'status', 'ALREADY_CHECKED_IN',
                'is_checked_in', true
            )
        );
    END IF;
    
    -- 6. Determinar organizer_id
    v_current_step := 'determinar_organizer';
    v_organizer_id := v_event.organizer_id;
    IF v_organizer_id IS NULL THEN
        v_organizer_id := v_event.created_by;
    END IF;
    
    -- 7. Realizar check-in
    v_current_step := 'realizar_checkin';
    INSERT INTO checkin (
        ticket_user_id,
        event_id,
        organizer_id,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_ticket_user.id,
        v_event.id,
        v_organizer_id,
        'Check-in automático via QR Scanner - ' || p_qr_code,
        NOW(),
        NOW()
    ) RETURNING id INTO v_checkin_id;
    
    -- 8. Retornar sucesso
    RETURN json_build_object(
        'success', true,
        'action', 'CHECK_IN_COMPLETED',
        'message', 'Check-in realizado com sucesso!',
        'data', json_build_object(
            'name', COALESCE(v_ticket_user.name, 'Participante'),
            'email', COALESCE(v_ticket_user.email, ''),
            'event_title', COALESCE(v_event.title, 'Evento não informado'),
            'event_date', v_event.start_date,
            'event_location', COALESCE(
                v_event.location,
                v_event.location_name || ' - ' || v_event.location_city || '/' || v_event.location_state,
                'Local não informado'
            ),
            'ticket_type', COALESCE(
                v_ticket.ticket_type_name,
                v_ticket_type.title,
                v_ticket_type.name,
                v_event.ticket_type,
                'Ingresso não informado'
            ),
            'ticket_area', COALESCE(
                v_ticket.ticket_area,
                v_ticket_type.area,
                'Área não informada'
            ),
            'ticket_price', COALESCE(
                v_ticket.price,
                v_ticket.original_price,
                v_ticket_type.price,
                v_event.price,
                0
            ),
            'ticket_price_feminine', COALESCE(
                v_ticket.price_feminine,
                v_ticket_type.price_feminine,
                v_ticket.price,
                0
            ),
            'ticket_description', COALESCE(
                v_ticket.description,
                v_ticket_type.description,
                ''
            ),
            'ticket_batch_name', COALESCE(
                v_ticket.batch_name,
                v_ticket_type.batches->0->>'name',
                ''
            ),
            'checked_in_at', NOW(),
            'status', 'CHECKED_IN',
            'checkin_id', v_checkin_id,
            'organizer_id', v_organizer_id,
            'is_checked_in', true
        ),
        'timing', json_build_object(
            'total_ms', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
            'completed_at', NOW()
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'SYSTEM_ERROR',
            'message', 'Erro interno: ' || SQLERRM,
            'debug', json_build_object('step', v_current_step, 'error_message', SQLERRM, 'error_state', SQLSTATE)
        );
END;
$$ LANGUAGE plpgsql;
