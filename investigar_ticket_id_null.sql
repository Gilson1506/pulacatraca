-- ===================================================================
-- INVESTIGAR E CORRIGIR TICKET_ID NULL
-- ===================================================================
-- O problema: ticket_user existe mas ticket_id é NULL
-- ===================================================================

-- ===================================
-- 1. VERIFICAR O REGISTRO ESPECÍFICO
-- ===================================
SELECT 
    'REGISTRO_PROBLEMATICO' as tipo,
    id,
    name,
    email,
    qr_code,
    ticket_id,
    created_at,
    CASE 
        WHEN ticket_id IS NULL THEN 'TICKET_ID É NULL ❌'
        ELSE 'TICKET_ID EXISTE ✅'
    END as status_ticket_id
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC;

-- ===================================
-- 2. VERIFICAR QUANTOS REGISTROS TÊM TICKET_ID NULL
-- ===================================
SELECT 
    'ANALISE_GERAL' as tipo,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE ticket_id IS NULL) as registros_com_ticket_id_null,
    COUNT(*) FILTER (WHERE ticket_id IS NOT NULL) as registros_com_ticket_id_valido,
    ROUND(
        (COUNT(*) FILTER (WHERE ticket_id IS NULL) * 100.0) / COUNT(*), 
        2
    ) as percentual_nulos
FROM ticket_users;

-- ===================================
-- 3. VERIFICAR SE EXISTEM TICKETS DISPONÍVEIS PARA RELACIONAR
-- ===================================
SELECT 
    'TICKETS_DISPONIVEIS' as tipo,
    COUNT(*) as total_tickets,
    MIN(created_at) as ticket_mais_antigo,
    MAX(created_at) as ticket_mais_recente
FROM tickets;

-- Ver alguns tickets de exemplo
SELECT 
    'EXEMPLOS_TICKETS' as tipo,
    id,
    event_id,
    price,
    created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 5;

-- ===================================
-- 4. VERIFICAR PADRÃO DE CRIAÇÃO DOS DADOS
-- ===================================
-- Ver se ticket_users são criados ANTES dos tickets
SELECT 
    'ANALISE_TEMPORAL' as tipo,
    'ticket_users' as tabela,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro,
    COUNT(*) as total
FROM ticket_users
UNION ALL
SELECT 
    'ANALISE_TEMPORAL' as tipo,
    'tickets' as tabela,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro,
    COUNT(*) as total
FROM tickets
ORDER BY primeiro_registro;

-- ===================================
-- 5. BUSCAR TICKET COMPATÍVEL PARA O QR PLKTK909538
-- ===================================
-- Tentar encontrar ticket criado na mesma época
WITH ticket_user_info AS (
    SELECT 
        id,
        name,
        qr_code,
        created_at as tu_created_at
    FROM ticket_users 
    WHERE qr_code = 'PLKTK909538'
    ORDER BY created_at DESC
    LIMIT 1
),
tickets_candidatos AS (
    SELECT 
        t.id as ticket_id,
        t.event_id,
        t.price,
        t.created_at as ticket_created_at,
        ABS(EXTRACT(EPOCH FROM (t.created_at - tu.tu_created_at))) as diferenca_segundos
    FROM tickets t
    CROSS JOIN ticket_user_info tu
    ORDER BY diferenca_segundos ASC
    LIMIT 5
)
SELECT 
    'TICKETS_CANDIDATOS' as tipo,
    ticket_id,
    event_id,
    price,
    ticket_created_at,
    diferenca_segundos,
    CASE 
        WHEN diferenca_segundos < 60 THEN 'MUITO PRÓXIMO'
        WHEN diferenca_segundos < 300 THEN 'PRÓXIMO' 
        WHEN diferenca_segundos < 3600 THEN 'MESMO PERÍODO'
        ELSE 'DISTANTE'
    END as proximidade
FROM tickets_candidatos;

-- ===================================
-- 6. SCRIPT PARA CORRIGIR O TICKET_ID (COMENTADO)
-- ===================================

/*
-- OPÇÃO 1: Relacionar com ticket mais próximo temporalmente
WITH ticket_user_problematico AS (
    SELECT id, created_at
    FROM ticket_users 
    WHERE qr_code = 'PLKTK909538'
    ORDER BY created_at DESC
    LIMIT 1
),
ticket_mais_proximo AS (
    SELECT t.id as ticket_id
    FROM tickets t
    CROSS JOIN ticket_user_problematico tu
    ORDER BY ABS(EXTRACT(EPOCH FROM (t.created_at - tu.created_at))) ASC
    LIMIT 1
)
UPDATE ticket_users 
SET ticket_id = (SELECT ticket_id FROM ticket_mais_proximo)
WHERE qr_code = 'PLKTK909538'
AND ticket_id IS NULL;
*/

/*
-- OPÇÃO 2: Relacionar com ticket mais recente
UPDATE ticket_users 
SET ticket_id = (
    SELECT id 
    FROM tickets 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE qr_code = 'PLKTK909538'
AND ticket_id IS NULL;
*/

/*
-- OPÇÃO 3: Criar um ticket específico para este ticket_user
INSERT INTO tickets (id, event_id, price, ticket_type, created_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM events ORDER BY created_at DESC LIMIT 1), -- Evento mais recente
    0, -- Preço zero
    'RECUPERADO', -- Tipo especial
    NOW()
)
RETURNING id;

-- Depois relacionar (substitua UUID_DO_TICKET_CRIADO pelo ID retornado acima)
UPDATE ticket_users 
SET ticket_id = 'UUID_DO_TICKET_CRIADO'
WHERE qr_code = 'PLKTK909538'
AND ticket_id IS NULL;
*/

-- ===================================
-- 7. VERIFICAÇÃO PÓS-CORREÇÃO
-- ===================================

-- Verificar se a correção funcionou
SELECT 
    'POS_CORRECAO' as tipo,
    id,
    name,
    qr_code,
    ticket_id,
    CASE 
        WHEN ticket_id IS NOT NULL THEN 'CORRIGIDO ✅'
        ELSE 'AINDA NULL ❌'
    END as status
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC;

-- Testar a RPC após correção
SELECT checkin_by_qr_code('PLKTK909538') as resultado_apos_correcao;