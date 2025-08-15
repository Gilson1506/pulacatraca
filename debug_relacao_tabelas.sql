-- ===================================================================
-- DEBUG RELAÇÃO ENTRE TABELAS - QR: PLKTK909538
-- ===================================================================
-- Este script investiga exatamente onde está falhando a busca
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
-- 2. VERIFICAR SE O TICKET_ID EXISTE EM TICKETS
-- ===================================
SELECT 
    'STEP_2_TICKET_EXISTE' as step,
    t.id as ticket_id,
    t.*
FROM tickets t
WHERE t.id = (
    SELECT tu.ticket_id 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538'
);

-- ===================================
-- 3. VERIFICAR TIPOS DE DADOS (IMPORTANTE!)
-- ===================================
-- Tipos podem estar diferentes (UUID vs TEXT vs INTEGER)
SELECT 
    'STEP_3_TIPOS_DADOS' as step,
    'ticket_users.ticket_id' as campo,
    pg_typeof((SELECT ticket_id FROM ticket_users WHERE qr_code = 'PLKTK909538')) as tipo_ticket_user_ticket_id
UNION ALL
SELECT 
    'STEP_3_TIPOS_DADOS' as step,
    'tickets.id' as campo,
    pg_typeof((SELECT id FROM tickets LIMIT 1)) as tipo_tickets_id;

-- ===================================
-- 4. COMPARAÇÃO DIRETA DE VALORES
-- ===================================
SELECT 
    'STEP_4_COMPARACAO' as step,
    tu.ticket_id as ticket_id_from_user,
    t.id as ticket_id_from_tickets,
    tu.ticket_id = t.id as match_direto,
    tu.ticket_id::text = t.id::text as match_como_texto
FROM ticket_users tu
CROSS JOIN tickets t
WHERE tu.qr_code = 'PLKTK909538'
  AND t.id = tu.ticket_id;

-- ===================================
-- 5. BUSCA COM CAST FORÇADO
-- ===================================
SELECT 
    'STEP_5_CAST_UUID' as step,
    t.*
FROM tickets t
WHERE t.id::text = (
    SELECT tu.ticket_id::text 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538'
);

-- ===================================
-- 6. LISTAR ALGUNS TICKETS PARA COMPARAR
-- ===================================
SELECT 
    'STEP_6_TICKETS_EXEMPLO' as step,
    id,
    pg_typeof(id) as tipo_id,
    length(id::text) as tamanho_id
FROM tickets 
ORDER BY created_at DESC 
LIMIT 3;

-- ===================================
-- 7. BUSCA APROXIMADA (CASO HAJA ESPAÇOS OU CARACTERES ESTRANHOS)
-- ===================================
SELECT 
    'STEP_7_BUSCA_APROXIMADA' as step,
    t.*
FROM tickets t
WHERE TRIM(t.id::text) = TRIM((
    SELECT tu.ticket_id::text 
    FROM ticket_users tu 
    WHERE tu.qr_code = 'PLKTK909538'
));

-- ===================================
-- 8. VERIFICAR SE EXISTE CONSTRAINT/FOREIGN KEY
-- ===================================
SELECT 
    'STEP_8_CONSTRAINTS' as step,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'ticket_users' OR tc.table_name = 'tickets');

-- ===================================
-- 9. TESTE MANUAL DA QUERY EXATA QUE A RPC USA
-- ===================================
DO $$
DECLARE
    v_ticket_user RECORD;
    v_ticket RECORD;
BEGIN
    -- Primeiro passo: buscar ticket_user
    SELECT * INTO v_ticket_user 
    FROM ticket_users 
    WHERE qr_code = 'PLKTK909538';
    
    RAISE NOTICE 'TICKET_USER ENCONTRADO: ID=%, ticket_id=%, name=%', 
                 v_ticket_user.id, v_ticket_user.ticket_id, v_ticket_user.name;
    
    -- Segundo passo: buscar ticket
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id;
    
    IF v_ticket.id IS NULL THEN
        RAISE NOTICE 'TICKET NÃO ENCONTRADO com ID: %', v_ticket_user.ticket_id;
        
        -- Tentar busca alternativa
        SELECT * INTO v_ticket 
        FROM tickets 
        WHERE id::text = v_ticket_user.ticket_id::text;
        
        IF v_ticket.id IS NULL THEN
            RAISE NOTICE 'TICKET NÃO ENCONTRADO nem com CAST para texto';
        ELSE
            RAISE NOTICE 'TICKET ENCONTRADO COM CAST: ID=%, event_id=%', v_ticket.id, v_ticket.event_id;
        END IF;
    ELSE
        RAISE NOTICE 'TICKET ENCONTRADO: ID=%, event_id=%', v_ticket.id, v_ticket.event_id;
    END IF;
END $$;