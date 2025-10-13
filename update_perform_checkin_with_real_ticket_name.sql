-- ✅ ATUALIZAR FUNÇÃO perform_checkin PARA MOSTRAR NOME REAL DO INGRESSO

DROP FUNCTION IF EXISTS public.perform_checkin(text, uuid);

CREATE OR REPLACE FUNCTION public.perform_checkin(
  p_ticket_code TEXT,
  p_organizer_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  ticket_data JSONB,
  checkin_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_ticket_user RECORD;
  v_ticket_type RECORD;
  v_checkin_id UUID;
BEGIN
  -- Buscar o ticket pelo código com JOIN para pegar tipo de ingresso
  SELECT 
    t.id,
    t.code,
    t.status,
    t.price,
    t.used_at,
    t.event_id,
    t.ticket_type_id,
    e.title as event_title,
    e.location,
    e.organizer_id
  INTO v_ticket
  FROM tickets t
  INNER JOIN events e ON e.id = t.event_id
  WHERE t.code = p_ticket_code
  AND e.organizer_id = p_organizer_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '❌ Ingresso não encontrado'::TEXT, NULL::JSONB, NULL::UUID;
    RETURN;
  END IF;

  -- Buscar nome do tipo de ingresso (se existir)
  IF v_ticket.ticket_type_id IS NOT NULL THEN
    SELECT 
      id,
      name,
      title,
      description
    INTO v_ticket_type
    FROM event_ticket_types
    WHERE id = v_ticket.ticket_type_id
    LIMIT 1;
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT * INTO v_ticket_user
    FROM ticket_users
    WHERE ticket_id = v_ticket.id
    LIMIT 1;
    
    RETURN QUERY SELECT 
      FALSE, 
      '⚠️ CHECK-IN JÁ REALIZADO'::TEXT,
      jsonb_build_object(
        'participant_name', COALESCE(v_ticket_user.name, 'Não informado'),
        'participant_email', COALESCE(v_ticket_user.email, ''),
        'participant_document', COALESCE(v_ticket_user.document, ''),
        'event_name', v_ticket.event_title,
        'location', COALESCE(v_ticket.location, 'Local não informado'),
        'ticket_type', COALESCE(
          -- Limpar sufixos de gênero do nome do tipo
          TRIM(REGEXP_REPLACE(
            COALESCE(v_ticket_type.title, v_ticket_type.name, 'Ingresso'),
            '\s*-?\s*(Feminino|Masculino|Unissex)\s*$',
            '',
            'i'
          )),
          'Ingresso'
        ),
        'ticket_price', COALESCE(v_ticket.price, 0),
        'checkin_date', v_ticket.used_at
      ),
      NULL::UUID;
    RETURN;
  END IF;

  IF v_ticket.status != 'active' THEN
    RETURN QUERY SELECT FALSE, '❌ Ingresso não está ativo'::TEXT, NULL::JSONB, NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO v_ticket_user
  FROM ticket_users
  WHERE ticket_id = v_ticket.id
  LIMIT 1;

  UPDATE tickets
  SET status = 'used',
      used_at = NOW()
  WHERE id = v_ticket.id;

  IF v_ticket_user.id IS NOT NULL THEN
    INSERT INTO checkin (
      ticket_user_id,
      event_id,
      organizer_id,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      v_ticket_user.id,
      v_ticket.event_id,
      p_organizer_id,
      'Check-in via QR: ' || p_ticket_code,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_checkin_id;
  END IF;

  RETURN QUERY SELECT 
    TRUE,
    '✅ ACESSO LIBERADO'::TEXT,
    jsonb_build_object(
      'participant_name', COALESCE(v_ticket_user.name, 'Não informado'),
      'participant_email', COALESCE(v_ticket_user.email, ''),
      'participant_document', COALESCE(v_ticket_user.document, ''),
      'event_name', v_ticket.event_title,
      'location', COALESCE(v_ticket.location, 'Local não informado'),
      'ticket_type', COALESCE(
        -- Limpar sufixos de gênero do nome do tipo
        TRIM(REGEXP_REPLACE(
          COALESCE(v_ticket_type.title, v_ticket_type.name, 'Ingresso'),
          '\s*-?\s*(Feminino|Masculino|Unissex)\s*$',
          '',
          'i'
        )),
        'Ingresso'
      ),
      'ticket_price', COALESCE(v_ticket.price, 0),
      'checkin_date', NOW()
    ),
    v_checkin_id;
END;
$$;

-- Testar a função
-- Substitua pelos valores reais para teste:
-- SELECT * FROM perform_checkin('SEU_TICKET_CODE', 'SEU_ORGANIZER_ID'::UUID);

