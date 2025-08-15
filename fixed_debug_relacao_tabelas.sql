-- ===================================================================
-- DEBUG RELAÇÃO ENTRE TABELAS - CORRIGIDO PARA MÚLTIPLOS REGISTROS
-- ===================================================================
-- Esta versão lida com casos onde existem registros duplicados
-- ===================================================================

-- ===================================
-- 1. VERIFICAR TICKET_USER E SEU TICKET_ID
-- ===================================
SELECT 
    'STEP_1_TICKET_USER' as step,
    tu.id as ticket_user_id,
    tu.name as participant_name,
    tu.email,
    tu.qr_code,
    tu.ticket_id as ticket_id_procurado,
    tu.created_at
FROM ticket_users tu
WHERE tu.qr_code = 'PLKTK909538';

-- ===================================
-- 2. VERIFICAR QUANTOS TICKETS TÊM ESSE ID (IMPORTANTE!)
-- ===================================
SELECT 
    'STEP_2_CONTAGEM_TICKETS' as step,
    COUNT(*) as total_tickets_com_esse_id,
    (SELECT tu.ticket_id FROM ticket_users tu WHERE tu.qr_code = 'PLKTK909538' LIMIT 1) as ticket_id_procurado
FROM tickets t
WHERE t.id = (
    SELECT tu.ticket_id 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538' 
    LIMIT 1
);

-- ===================================
-- 3. LISTAR TODOS OS TICKETS COM ESSE ID
-- ===================================
SELECT 
    'STEP_3_TODOS_TICKETS_COM_ID' as step,
    t.id as ticket_id,
    t.event_id,
    t.price,
    t.created_at,
    ROW_NUMBER() OVER (ORDER BY t.created_at DESC) as ordem
FROM tickets t
WHERE t.id = (
    SELECT tu.ticket_id 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538' 
    LIMIT 1
)
ORDER BY t.created_at DESC;

-- ===================================
-- 4. VERIFICAR TIPOS DE DADOS
-- ===================================
SELECT 
    'STEP_4_TIPOS_DADOS' as step,
    'ticket_users.ticket_id' as campo,
    pg_typeof((SELECT ticket_id FROM ticket_users WHERE qr_code = 'PLKTK909538' LIMIT 1)) as tipo_ticket_user_ticket_id
UNION ALL
SELECT 
    'STEP_4_TIPOS_DADOS' as step,
    'tickets.id' as campo,
    pg_typeof((SELECT id FROM tickets LIMIT 1)) as tipo_tickets_id;

-- ===================================
-- 5. TESTE COM LIMIT 1 (COMO A RPC DEVE FAZER)
-- ===================================
SELECT 
    'STEP_5_COM_LIMIT_1' as step,
    t.*
FROM tickets t
WHERE t.id = (
    SELECT tu.ticket_id 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538' 
    LIMIT 1
)
ORDER BY t.created_at DESC
LIMIT 1;

-- ===================================
-- 6. VERIFICAR SE HÁ TICKET_USERS DUPLICADOS
-- ===================================
SELECT 
    'STEP_6_TICKET_USERS_DUPLICADOS' as step,
    qr_code,
    COUNT(*) as total_registros,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids_ticket_users,
    ARRAY_AGG(ticket_id ORDER BY created_at DESC) as ticket_ids_diferentes
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
GROUP BY qr_code;

-- ===================================
-- 7. VERIFICAR EVENTOS RELACIONADOS
-- ===================================
SELECT 
    'STEP_7_EVENTOS_RELACIONADOS' as step,
    e.id as event_id,
    e.title,
    e.name,
    e.start_date,
    t.id as ticket_id,
    COUNT(*) OVER (PARTITION BY e.id) as tickets_no_mesmo_evento
FROM events e
JOIN tickets t ON t.event_id = e.id
WHERE t.id = (
    SELECT tu.ticket_id 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538' 
    LIMIT 1
);

-- ===================================
-- 8. VERIFICAR CHECK-INS EXISTENTES
-- ===================================
SELECT 
    'STEP_8_CHECKINS_EXISTENTES' as step,
    c.*,
    tu.qr_code
FROM checkin c
JOIN ticket_users tu ON tu.id = c.ticket_user_id
WHERE tu.qr_code = 'PLKTK909538';

-- ===================================
-- 9. SIMULAÇÃO DA RPC CORRIGIDA
-- ===================================
DO $$
DECLARE
    v_ticket_user RECORD;
    v_ticket RECORD;
    v_event RECORD;
    v_ticket_count INTEGER;
BEGIN
    -- Buscar ticket_user (pode haver múltiplos)
    SELECT * INTO v_ticket_user 
    FROM ticket_users 
    WHERE qr_code = 'PLKTK909538'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RAISE NOTICE 'TICKET_USER ENCONTRADO: ID=%, ticket_id=%, name=%', 
                 v_ticket_user.id, v_ticket_user.ticket_id, v_ticket_user.name;
    
    -- Verificar quantos tickets existem com esse ID
    SELECT COUNT(*) INTO v_ticket_count
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id;
    
    RAISE NOTICE 'TOTAL DE TICKETS COM ID %: %', v_ticket_user.ticket_id, v_ticket_count;
    
    -- Buscar ticket (usar LIMIT 1 para evitar erro)
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_ticket.id IS NULL THEN
        RAISE NOTICE 'TICKET NÃO ENCONTRADO com ID: %', v_ticket_user.ticket_id;
    ELSE
        RAISE NOTICE 'TICKET ENCONTRADO: ID=%, event_id=%, duplicados=%', 
                     v_ticket.id, v_ticket.event_id, v_ticket_count;
                     
        -- Buscar evento
        SELECT * INTO v_event 
        FROM events 
        WHERE id = v_ticket.event_id;
        
        IF v_event.id IS NULL THEN
            RAISE NOTICE 'EVENTO NÃO ENCONTRADO com ID: %', v_ticket.event_id;
        ELSE
            RAISE NOTICE 'EVENTO ENCONTRADO: ID=%, title=%', v_event.id, COALESCE(v_event.title, v_event.name);
            RAISE NOTICE '✅ TODOS OS DADOS ENCONTRADOS - RPC DEVERIA FUNCIONAR!';
        END IF;
    END IF;
END $$;