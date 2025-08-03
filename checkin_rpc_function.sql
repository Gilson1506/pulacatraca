-- ===================================================================
-- FUNÇÃO RPC: CHECK-IN COMPLETO VIA QR CODE
-- ===================================================================
-- Esta função centraliza toda a lógica de check-in:
-- ✅ Busca o ticket pelo QR code
-- ✅ Verifica se o evento existe
-- ✅ Verifica se já foi feito check-in
-- ✅ Realiza o check-in se necessário
-- ✅ Retorna dados completos do participante
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
        -- Realizar novo check-in
        INSERT INTO checkin (
            ticket_user_id,
            ticket_id,
            event_id,
            organizer_id,
            checked_in_at
        ) VALUES (
            v_ticket_user.id,
            v_ticket.id,
            v_event.id,
            v_event.organizer_id,
            NOW()
        ) RETURNING id INTO v_new_checkin_id;
        
        -- ===================================
        -- 6. RETORNAR SUCESSO - NOVO CHECK-IN
        -- ===================================
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
            )
        );
    ELSE
        -- ===================================
        -- 7. RETORNAR AVISO - JÁ TEM CHECK-IN
        -- ===================================
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
            )
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- ===================================
        -- 8. TRATAMENTO DE ERROS
        -- ===================================
        RETURN json_build_object(
            'success', false,
            'error', 'SYSTEM_ERROR',
            'message', 'Erro interno do sistema: ' || SQLERRM
        );
END;
$$;

-- ===================================================================
-- PERMISSÕES DA FUNÇÃO
-- ===================================================================
-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION checkin_by_qr_code(TEXT) TO authenticated;

-- ===================================================================
-- COMENTÁRIO DA FUNÇÃO
-- ===================================================================
COMMENT ON FUNCTION checkin_by_qr_code(TEXT) IS 
'Função RPC completa para check-in via QR code. 
Centraliza toda a lógica: busca ticket, verifica evento, 
realiza check-in e retorna dados completos em JSON.
Uso: SELECT checkin_by_qr_code(''PLKTK123456'')';

-- ===================================================================
-- EXEMPLO DE USO
-- ===================================================================
-- SELECT checkin_by_qr_code('PLKTK123456');
--
-- Retorna JSON com estrutura:
-- {
--   "success": true,
--   "action": "NEW_CHECKIN" | "ALREADY_CHECKED_IN",
--   "message": "Mensagem descritiva",
--   "data": {
--     "participant": { "id", "name", "email", "qr_code" },
--     "event": { "id", "title", "start_date", "location" },
--     "ticket": { "id", "type", "price" },
--     "checkin": { "id", "checked_in_at", "is_new" }
--   }
-- }