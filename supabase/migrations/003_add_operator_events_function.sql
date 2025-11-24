-- =====================================================
-- MIGRATION: Adicionar função para buscar eventos com detalhes
-- Descrição: Adiciona função RPC para operadores buscarem eventos
--            com tickets, tipos de ingressos e check-ins completos
-- Data: 2025-01-XX
-- =====================================================
-- Esta migration apenas ADICIONA a nova função sem alterar o que já existe
-- Use CREATE OR REPLACE para atualizar se a função já existir

-- =====================================================
-- FUNÇÃO: Buscar eventos com dados completos para operador
-- Retorna eventos com tickets, tipos de ingressos e check-ins
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_operator_events_with_details(
    p_operator_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_operator RECORD;
    v_events JSON;
    v_result JSON;
BEGIN
    -- Buscar dados do operador
    SELECT * INTO v_operator
    FROM public.event_operators
    WHERE id = p_operator_id AND is_active = true;
    
    -- Verificar se operador existe e está ativo
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Operador não encontrado ou inativo'
        );
    END IF;
    
    -- Buscar eventos disponíveis para o operador com todos os detalhes
    IF v_operator.event_id IS NOT NULL THEN
        -- Operador específico de um evento
        SELECT json_agg(
            json_build_object(
                'id', e.id,
                'title', e.title,
                'description', e.description,
                'start_date', e.start_date,
                'end_date', e.end_date,
                'location', e.location,
                'location_name', e.location_name,
                'location_city', e.location_city,
                'location_state', e.location_state,
                'image', e.image,
                'category', e.category,
                'status', e.status,
                'tickets', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', t.id,
                                'qr_code', t.qr_code,
                                'participant_name', COALESCE(tu.name, 'Não informado'),
                                'participant_email', COALESCE(tu.email, ''),
                                'participant_document', COALESCE(tu.document, ''),
                                'ticket_type', COALESCE(tt.name, tt.title, 'Geral'),
                                'ticket_type_id', t.ticket_type_id,
                                'price', COALESCE(t.price, 0),
                                'status', t.status,
                                'purchase_date', t.purchase_date,
                                'checked_in', EXISTS(
                                    SELECT 1 FROM public.checkin c 
                                    WHERE c.ticket_user_id = COALESCE(t.ticket_user_id, t.user_id)
                                        AND c.event_id = t.event_id
                                ),
                                'checkin_info', (
                                    SELECT json_build_object(
                                        'checkin_date', c.created_at,
                                        'operator_name', eo.name
                                    )
                                    FROM public.checkin c
                                    LEFT JOIN public.operator_checkins oc ON oc.checkin_id = c.id
                                    LEFT JOIN public.event_operators eo ON eo.id = oc.operator_id
                                    WHERE c.ticket_user_id = COALESCE(t.ticket_user_id, t.user_id)
                                        AND c.event_id = t.event_id
                                    ORDER BY c.created_at DESC
                                    LIMIT 1
                                ),
                                'ticket_user', CASE 
                                    WHEN tu.id IS NOT NULL THEN
                                        json_build_object(
                                            'id', tu.id,
                                            'name', tu.name,
                                            'email', tu.email,
                                            'document', tu.document
                                        )
                                    ELSE NULL
                                END
                            )
                            ORDER BY t.purchase_date DESC
                        )
                        FROM public.tickets t
                        LEFT JOIN public.ticket_users tu ON (
                            tu.id = t.ticket_user_id 
                            OR (t.ticket_user_id IS NULL AND tu.id = t.user_id)
                        )
                        LEFT JOIN public.event_ticket_types tt ON tt.id = t.ticket_type_id
                        WHERE t.event_id = e.id
                            AND t.status IN ('valid', 'active', 'pending', 'used')
                    ),
                    '[]'::json
                ),
                'ticket_types', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', tt.id,
                                'name', tt.name,
                                'title', tt.title,
                                'description', tt.description,
                                'price', tt.price,
                                'price_masculine', tt.price_masculine,
                                'price_feminine', tt.price_feminine,
                                'price_type', tt.price_type,
                                'quantity', tt.quantity,
                                'available_quantity', tt.available_quantity,
                                'status', tt.status
                            )
                        )
                        FROM public.event_ticket_types tt
                        WHERE tt.event_id = e.id
                            AND tt.status = 'active'
                    ),
                    '[]'::json
                ),
                'stats', json_build_object(
                    'total_tickets', (
                        SELECT COUNT(*)::integer
                        FROM public.tickets
                        WHERE event_id = e.id
                            AND status IN ('valid', 'active', 'pending')
                    ),
                    'checked_in', (
                        SELECT COUNT(DISTINCT c.ticket_user_id)::integer
                        FROM public.checkin c
                        WHERE c.event_id = e.id
                    ),
                    'pending', (
                        SELECT COUNT(*)::integer
                        FROM public.tickets t2
                        WHERE t2.event_id = e.id
                            AND t2.status IN ('valid', 'active', 'pending')
                            AND NOT EXISTS(
                                SELECT 1 FROM public.checkin c2 
                                WHERE c2.ticket_user_id = COALESCE(t2.ticket_user_id, t2.user_id)
                                    AND c2.event_id = t2.event_id
                            )
                    )
                )
            )
        ) INTO v_events
        FROM public.events e
        WHERE e.id = v_operator.event_id
            AND e.status = 'approved';
    ELSE
        -- Operador global - todos os eventos do organizador
        SELECT json_agg(
            json_build_object(
                'id', e.id,
                'title', e.title,
                'description', e.description,
                'start_date', e.start_date,
                'end_date', e.end_date,
                'location', e.location,
                'location_name', e.location_name,
                'location_city', e.location_city,
                'location_state', e.location_state,
                'image', e.image,
                'category', e.category,
                'status', e.status,
                'tickets', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', t.id,
                                'qr_code', t.qr_code,
                                'participant_name', COALESCE(tu.name, 'Não informado'),
                                'participant_email', COALESCE(tu.email, ''),
                                'participant_document', COALESCE(tu.document, ''),
                                'ticket_type', COALESCE(tt.name, tt.title, 'Geral'),
                                'ticket_type_id', t.ticket_type_id,
                                'price', COALESCE(t.price, 0),
                                'status', t.status,
                                'purchase_date', t.purchase_date,
                                'checked_in', EXISTS(
                                    SELECT 1 FROM public.checkin c 
                                    WHERE c.ticket_user_id = COALESCE(t.ticket_user_id, t.user_id)
                                        AND c.event_id = t.event_id
                                ),
                                'checkin_info', (
                                    SELECT json_build_object(
                                        'checkin_date', c.created_at,
                                        'operator_name', eo.name
                                    )
                                    FROM public.checkin c
                                    LEFT JOIN public.operator_checkins oc ON oc.checkin_id = c.id
                                    LEFT JOIN public.event_operators eo ON eo.id = oc.operator_id
                                    WHERE c.ticket_user_id = COALESCE(t.ticket_user_id, t.user_id)
                                        AND c.event_id = t.event_id
                                    ORDER BY c.created_at DESC
                                    LIMIT 1
                                ),
                                'ticket_user', CASE 
                                    WHEN tu.id IS NOT NULL THEN
                                        json_build_object(
                                            'id', tu.id,
                                            'name', tu.name,
                                            'email', tu.email,
                                            'document', tu.document
                                        )
                                    ELSE NULL
                                END
                            )
                            ORDER BY t.purchase_date DESC
                        )
                        FROM public.tickets t
                        LEFT JOIN public.ticket_users tu ON (
                            tu.id = t.ticket_user_id 
                            OR (t.ticket_user_id IS NULL AND tu.id = t.user_id)
                        )
                        LEFT JOIN public.event_ticket_types tt ON tt.id = t.ticket_type_id
                        WHERE t.event_id = e.id
                            AND t.status IN ('valid', 'active', 'pending', 'used')
                    ),
                    '[]'::json
                ),
                'ticket_types', COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', tt.id,
                                'name', tt.name,
                                'title', tt.title,
                                'description', tt.description,
                                'price', tt.price,
                                'price_masculine', tt.price_masculine,
                                'price_feminine', tt.price_feminine,
                                'price_type', tt.price_type,
                                'quantity', tt.quantity,
                                'available_quantity', tt.available_quantity,
                                'status', tt.status
                            )
                        )
                        FROM public.event_ticket_types tt
                        WHERE tt.event_id = e.id
                            AND tt.status = 'active'
                    ),
                    '[]'::json
                ),
                'stats', json_build_object(
                    'total_tickets', (
                        SELECT COUNT(*)::integer
                        FROM public.tickets
                        WHERE event_id = e.id
                            AND status IN ('valid', 'active', 'pending')
                    ),
                    'checked_in', (
                        SELECT COUNT(DISTINCT c.ticket_user_id)::integer
                        FROM public.checkin c
                        WHERE c.event_id = e.id
                    ),
                    'pending', (
                        SELECT COUNT(*)::integer
                        FROM public.tickets t2
                        WHERE t2.event_id = e.id
                            AND t2.status IN ('valid', 'active', 'pending')
                            AND NOT EXISTS(
                                SELECT 1 FROM public.checkin c2 
                                WHERE c2.ticket_user_id = COALESCE(t2.ticket_user_id, t2.user_id)
                                    AND c2.event_id = t2.event_id
                            )
                    )
                )
            )
            ORDER BY e.start_date DESC
        ) INTO v_events
        FROM public.events e
        WHERE e.organizer_id = v_operator.organizer_id
            AND e.status = 'approved';
    END IF;
    
    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'events', COALESCE(v_events, '[]'::json)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_operator_events_with_details IS 'Busca eventos completos com tickets, tipos de ingressos e estatísticas para um operador';

-- =====================================================
-- Também atualizar a função authenticate_operator para retornar organizer_id e event_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.authenticate_operator(
    p_access_code TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_operator RECORD;
    v_events JSON;
    v_result JSON;
BEGIN
    -- Buscar operador pelo código de acesso
    SELECT * INTO v_operator
    FROM public.event_operators
    WHERE access_code = p_access_code;
    
    -- Verificar se operador existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Código de acesso inválido'
        );
    END IF;
    
    -- Verificar se está ativo
    IF NOT v_operator.is_active THEN
        -- Log de tentativa de acesso negado
        INSERT INTO public.operator_activity_log (operator_id, action, details, ip_address, user_agent)
        VALUES (v_operator.id, 'access_denied', json_build_object('reason', 'inactive'), p_ip_address, p_user_agent);
        
        RETURN json_build_object(
            'success', false,
            'message', 'Operador inativo. Entre em contato com o organizador.'
        );
    END IF;
    
    -- Atualizar último acesso
    UPDATE public.event_operators
    SET last_access = NOW()
    WHERE id = v_operator.id;
    
    -- Buscar eventos disponíveis para o operador
    IF v_operator.event_id IS NOT NULL THEN
        -- Operador específico de um evento
        SELECT json_agg(json_build_object(
            'id', e.id,
            'title', e.title,
            'start_date', e.start_date,
            'location', e.location
        )) INTO v_events
        FROM public.events e
        WHERE e.id = v_operator.event_id
            AND e.status = 'approved';
    ELSE
        -- Operador global - todos os eventos do organizador
        SELECT json_agg(json_build_object(
            'id', e.id,
            'title', e.title,
            'start_date', e.start_date,
            'location', e.location
        )) INTO v_events
        FROM public.events e
        WHERE e.organizer_id = v_operator.organizer_id
            AND e.status = 'approved'
        ORDER BY e.start_date DESC;
    END IF;
    
    -- Log de login
    INSERT INTO public.operator_activity_log (operator_id, event_id, action, ip_address, user_agent)
    VALUES (v_operator.id, v_operator.event_id, 'login', p_ip_address, p_user_agent);
    
    -- Retornar dados do operador (AGORA COM organizer_id e event_id)
    SELECT json_build_object(
        'success', true,
        'message', 'Login realizado com sucesso',
        'operator', json_build_object(
            'id', v_operator.id,
            'name', v_operator.name,
            'email', v_operator.email,
            'organizer_id', v_operator.organizer_id,
            'event_id', v_operator.event_id,
            'can_checkin', v_operator.can_checkin,
            'can_view_stats', v_operator.can_view_stats,
            'total_checkins', v_operator.total_checkins
        ),
        'events', COALESCE(v_events, '[]'::json)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.authenticate_operator IS 'Autentica um operador usando código de acesso';

