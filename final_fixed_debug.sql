-- ===================================================================
-- DEBUG FINAL - FOCO NOS DADOS DUPLICADOS (SEM COLUNAS INEXISTENTES)
-- ===================================================================
-- Esta versão foca no problema real: dados duplicados em ticket_users
-- ===================================================================

-- ===================================
-- 1. VERIFICAR DADOS DUPLICADOS EM TICKET_USERS
-- ===================================
SELECT 
    'DUPLICADOS_TICKET_USERS' as problema,
    qr_code,
    COUNT(*) as total_registros_duplicados,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids_ticket_users,
    ARRAY_AGG(ticket_id ORDER BY created_at DESC) as ticket_ids,
    ARRAY_AGG(name ORDER BY created_at DESC) as nomes,
    ARRAY_AGG(created_at ORDER BY created_at DESC) as datas_criacao
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
GROUP BY qr_code;

-- ===================================
-- 2. MOSTRAR TODOS OS REGISTROS DUPLICADOS
-- ===================================
SELECT 
    'TODOS_OS_DUPLICADOS' as tipo,
    id,
    name,
    email,
    qr_code,
    ticket_id,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem_por_data
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC;

-- ===================================
-- 3. QUAL SERIA ESCOLHIDO PELA RPC (MAIS RECENTE)
-- ===================================
SELECT 
    'ESCOLHIDO_PELA_RPC' as tipo,
    id,
    name,
    email,
    qr_code,
    ticket_id,
    created_at
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC
LIMIT 1;

-- ===================================
-- 4. VERIFICAR SE OS TICKET_IDS DOS DUPLICADOS EXISTEM
-- ===================================
SELECT 
    'VERIFICACAO_TICKETS' as tipo,
    tu.id as ticket_user_id,
    tu.ticket_id as ticket_id_procurado,
    tu.created_at as ticket_user_criado_em,
    CASE 
        WHEN t.id IS NOT NULL THEN 'TICKET EXISTE'
        ELSE 'TICKET NÃO EXISTE'
    END as status_ticket,
    t.id as ticket_encontrado_id,
    t.event_id,
    t.created_at as ticket_criado_em
FROM ticket_users tu
LEFT JOIN tickets t ON t.id = tu.ticket_id
WHERE tu.qr_code = 'PLKTK909538'
ORDER BY tu.created_at DESC;

-- ===================================
-- 5. VERIFICAR QUANTOS QR CODES ESTÃO DUPLICADOS (PROBLEMA GERAL)
-- ===================================
SELECT 
    'QRS_DUPLICADOS_GERAL' as problema,
    qr_code,
    COUNT(*) as total_duplicados
FROM ticket_users
GROUP BY qr_code
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ===================================
-- 6. TESTE MANUAL DA RPC COM O REGISTRO MAIS RECENTE
-- ===================================
DO $$
DECLARE
    v_ticket_user RECORD;
    v_ticket RECORD;
    v_event RECORD;
BEGIN
    -- Buscar ticket_user mais recente (como a RPC faz)
    SELECT * INTO v_ticket_user 
    FROM ticket_users 
    WHERE qr_code = 'PLKTK909538'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RAISE NOTICE '=== TICKET_USER MAIS RECENTE ESCOLHIDO ===';
    RAISE NOTICE 'ID: %, Nome: %, ticket_id: %, Criado: %', 
                 v_ticket_user.id, v_ticket_user.name, v_ticket_user.ticket_id, v_ticket_user.created_at;
    
    -- Buscar ticket
    SELECT * INTO v_ticket 
    FROM tickets 
    WHERE id = v_ticket_user.ticket_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_ticket.id IS NULL THEN
        RAISE NOTICE '❌ TICKET NÃO ENCONTRADO com ID: %', v_ticket_user.ticket_id;
    ELSE
        RAISE NOTICE '✅ TICKET ENCONTRADO: ID=%, event_id=%', v_ticket.id, v_ticket.event_id;
        
        -- Buscar evento
        SELECT * INTO v_event 
        FROM events 
        WHERE id = v_ticket.event_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF v_event.id IS NULL THEN
            RAISE NOTICE '❌ EVENTO NÃO ENCONTRADO com ID: %', v_ticket.event_id;
        ELSE
            RAISE NOTICE '✅ EVENTO ENCONTRADO: ID=%, title=%', v_event.id, COALESCE(v_event.title, 'Sem título');
            RAISE NOTICE '🎉 TODOS OS DADOS ENCONTRADOS - RPC VAI FUNCIONAR!';
        END IF;
    END IF;
END $$;

-- ===================================
-- 7. VERIFICAR ESTRUTURA DAS TABELAS (SEM ERRO)
-- ===================================
-- Events
SELECT 
    'COLUNAS_EVENTS' as tabela,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Tickets  
SELECT 
    'COLUNAS_TICKETS' as tabela,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- 8. TESTAR A RPC CORRIGIDA
-- ===================================
SELECT checkin_by_qr_code('PLKTK909538') as resultado_rpc;