-- =====================================================
-- RPC FUNCTION ULTRA FINAL - APENAS CAMPOS EXISTENTES
-- =====================================================
-- Erro detectado: record "v_ticket" has no field "type"
-- SOLUÇÃO: Usar APENAS campos básicos e seguros

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
BEGIN
    v_start_time := NOW();
    v_current_step := 'inicio';
    
    -- ========================================
    -- 1. BUSCAR TICKET_USER PELO QR CODE
    -- ========================================
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
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'step', 'ticket_user_not_found'
            )
        );
    END IF;
    
    -- ========================================
    -- 2. BUSCAR TICKET PELO ID
    -- ========================================
    v_current_step := 'buscar_ticket';
    
    -- Estratégias múltiplas para encontrar o ticket
    SELECT * INTO v_ticket
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Tentar busca alternativa se ticket_id for string
        SELECT * INTO v_ticket
        FROM tickets 
        WHERE id::TEXT = v_ticket_user.ticket_id::TEXT
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TICKET_NOT_FOUND',
            'message', 'Dados do ticket não encontrados',
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'ticket_user_id', v_ticket_user.id,
                'ticket_id', v_ticket_user.ticket_id,
                'step', 'ticket_not_found'
            )
        );
    END IF;
    
    -- ========================================
    -- 3. BUSCAR EVENTO PELO ID
    -- ========================================
    v_current_step := 'buscar_evento';
    
    SELECT * INTO v_event
    FROM events 
    WHERE id = v_ticket.event_id
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'EVENT_NOT_FOUND',
            'message', 'Evento não encontrado',
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'ticket_id', v_ticket.id,
                'event_id', v_ticket.event_id,
                'step', 'event_not_found'
            )
        );
    END IF;
    
    -- ========================================
    -- 4. VERIFICAR CHECK-IN EXISTENTE
    -- ========================================
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
            'message', 'Participante já fez check-in',
            'data', json_build_object(
                'name', COALESCE(v_ticket_user.name, 'Participante'),
                'email', COALESCE(v_ticket_user.email, ''),
                'event_title', COALESCE(v_event.title, 'Evento'),
                'ticket_type', COALESCE(v_event.ticket_type, 'Ingresso'),
                'checked_in_at', v_existing_checkin.created_at,
                'status', 'ALREADY_CHECKED_IN'
            )
        );
    END IF;
    
    -- ========================================
    -- 5. DETERMINAR ORGANIZER_ID
    -- ========================================
    v_current_step := 'determinar_organizer';
    
    -- Usar organizer_id da tabela events
    v_organizer_id := v_event.organizer_id;
    
    -- Fallback se organizer_id estiver NULL
    IF v_organizer_id IS NULL THEN
        -- Usar created_by se disponível
        IF v_event.created_by IS NOT NULL THEN
            v_organizer_id := v_event.created_by;
        ELSE
            -- Último fallback: primeiro organizador disponível
            SELECT id INTO v_organizer_id 
            FROM profiles 
            WHERE role = 'organizer'
            ORDER BY created_at ASC 
            LIMIT 1;
            
            -- Se não encontrar organizador, usar o primeiro usuário
            IF v_organizer_id IS NULL THEN
                SELECT id INTO v_organizer_id 
                FROM auth.users
                ORDER BY created_at ASC 
                LIMIT 1;
            END IF;
        END IF;
    END IF;
    
    -- ========================================
    -- 6. REALIZAR CHECK-IN
    -- ========================================
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
    
    -- ========================================
    -- 7. RETORNAR SUCESSO
    -- ========================================
    RETURN json_build_object(
        'success', true,
        'action', 'CHECK_IN_COMPLETED',
        'message', 'Check-in realizado com sucesso!',
        'data', json_build_object(
            'name', COALESCE(v_ticket_user.name, 'Participante'),
            'email', COALESCE(v_ticket_user.email, ''),
            'event_title', COALESCE(v_event.title, 'Evento'),
            'ticket_type', COALESCE(v_event.ticket_type, 'Ingresso'),
            'checked_in_at', NOW(),
            'status', 'CHECKED_IN',
            'checkin_id', v_checkin_id,
            'organizer_id', v_organizer_id,
            'qr_code', p_qr_code
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
            'message', 'Erro interno do sistema: ' || SQLERRM,
            'debug', json_build_object(
                'qr_code', p_qr_code,
                'step', v_current_step,
                'error_message', SQLERRM,
                'error_state', SQLSTATE,
                'timing_ms', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
            )
        );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ULTRA CORREÇÃO - CAMPOS REMOVIDOS:
-- =====================================================
-- ❌ REMOVIDO: v_event.name (inexistente)
-- ❌ REMOVIDO: v_event.user_id (inexistente)
-- ❌ REMOVIDO: v_ticket.name (inexistente)
-- ❌ REMOVIDO: v_ticket.type (inexistente)
-- 
-- ✅ USANDO APENAS CAMPOS BÁSICOS E SEGUROS:
-- - v_ticket_user.name (nome do participante)
-- - v_ticket_user.email (email)
-- - v_event.title (título do evento)
-- - v_event.ticket_type (tipo geral do evento)
-- - v_event.organizer_id (organizador)
-- - v_event.created_by (fallback)
-- 
-- 🔧 ESTRATÉGIA ULTRA SEGURA:
-- - COALESCE com valores padrão
-- - Sem referencias a campos duvidosos
-- - Apenas campos básicos de id, created_at, etc.
-- =====================================================