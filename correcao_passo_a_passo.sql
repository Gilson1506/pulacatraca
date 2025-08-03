-- ===================================================================
-- CORREÇÃO PASSO A PASSO - TICKET_ID NULL
-- ===================================================================
-- Vamos corrigir definitivamente o QR PLKTK909538
-- ===================================================================

-- ===================================
-- PASSO 1: CONFIRMAR O PROBLEMA
-- ===================================
SELECT 
    '1_CONFIRMAR_PROBLEMA' as passo,
    qr_code,
    id as ticket_user_id,
    name,
    ticket_id,
    created_at,
    CASE 
        WHEN ticket_id IS NULL THEN 'PRECISA CORREÇÃO ❌'
        ELSE 'JÁ CORRIGIDO ✅'
    END as status
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC;

-- ===================================
-- PASSO 2: VERIFICAR SE EXISTEM TICKETS DISPONÍVEIS
-- ===================================
SELECT 
    '2_TICKETS_DISPONIVEIS' as passo,
    COUNT(*) as total_tickets,
    MIN(id) as primeiro_ticket_id,
    MAX(id) as ultimo_ticket_id
FROM tickets;

-- Mostrar ticket mais recente
SELECT 
    '2_TICKET_MAIS_RECENTE' as passo,
    id,
    event_id,
    price,
    created_at,
    CASE 
        WHEN event_id IS NOT NULL THEN 'TICKET VÁLIDO ✅'
        ELSE 'TICKET SEM EVENTO ❌'
    END as validacao
FROM tickets
ORDER BY created_at DESC
LIMIT 1;

-- ===================================
-- PASSO 3: EXECUTAR CORREÇÃO COM VERIFICAÇÃO
-- ===================================

-- Primeiro, vamos fazer um SELECT para ver o que seria atualizado
SELECT 
    '3_PREVIEW_CORRECAO' as passo,
    tu.qr_code,
    tu.id as ticket_user_id,
    tu.ticket_id as ticket_id_atual,
    t.id as ticket_id_que_sera_atribuido,
    t.event_id,
    t.created_at as ticket_criado_em
FROM ticket_users tu
CROSS JOIN (
    SELECT id, event_id, created_at
    FROM tickets 
    ORDER BY created_at DESC 
    LIMIT 1
) t
WHERE tu.qr_code = 'PLKTK909538'
AND tu.ticket_id IS NULL;

-- AGORA A CORREÇÃO REAL (execute esta linha):
UPDATE ticket_users 
SET ticket_id = (
    SELECT id 
    FROM tickets 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE qr_code = 'PLKTK909538'
AND ticket_id IS NULL;

-- ===================================
-- PASSO 4: VERIFICAR SE A CORREÇÃO FUNCIONOU
-- ===================================
SELECT 
    '4_VERIFICAR_CORRECAO' as passo,
    qr_code,
    id as ticket_user_id,
    name,
    ticket_id,
    CASE 
        WHEN ticket_id IS NOT NULL THEN 'CORRIGIDO ✅'
        ELSE 'AINDA NULL ❌'
    END as resultado,
    updated_at,
    created_at
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC;

-- ===================================
-- PASSO 5: VERIFICAR SE O TICKET RELACIONADO EXISTE
-- ===================================
SELECT 
    '5_VERIFICAR_TICKET_RELACIONADO' as passo,
    tu.qr_code,
    tu.ticket_id,
    t.id as ticket_encontrado,
    t.event_id,
    t.price,
    CASE 
        WHEN t.id IS NOT NULL THEN 'TICKET EXISTE ✅'
        ELSE 'TICKET NÃO EXISTE ❌'
    END as status_ticket
FROM ticket_users tu
LEFT JOIN tickets t ON t.id = tu.ticket_id
WHERE tu.qr_code = 'PLKTK909538'
ORDER BY tu.created_at DESC;

-- ===================================
-- PASSO 6: VERIFICAR SE O EVENTO EXISTE
-- ===================================
SELECT 
    '6_VERIFICAR_EVENTO' as passo,
    tu.qr_code,
    t.id as ticket_id,
    t.event_id,
    e.id as evento_encontrado,
    e.title as evento_titulo,
    CASE 
        WHEN e.id IS NOT NULL THEN 'EVENTO EXISTE ✅'
        ELSE 'EVENTO NÃO EXISTE ❌'
    END as status_evento
FROM ticket_users tu
JOIN tickets t ON t.id = tu.ticket_id
LEFT JOIN events e ON e.id = t.event_id
WHERE tu.qr_code = 'PLKTK909538'
ORDER BY tu.created_at DESC;

-- ===================================
-- PASSO 7: TESTE FINAL DA RPC
-- ===================================
SELECT checkin_by_qr_code('PLKTK909538') as '7_TESTE_FINAL_RPC';

-- ===================================
-- PASSO 8: ALTERNATIVA SE AINDA NÃO FUNCIONAR
-- ===================================

-- Se o ticket relacionado não tiver evento válido, escolher outro ticket:
/*
UPDATE ticket_users 
SET ticket_id = (
    SELECT t.id 
    FROM tickets t
    JOIN events e ON e.id = t.event_id
    ORDER BY t.created_at DESC 
    LIMIT 1
)
WHERE qr_code = 'PLKTK909538';
*/

-- ===================================
-- PASSO 9: CORREÇÃO DE EMERGÊNCIA - CRIAR TICKET VÁLIDO
-- ===================================

-- Se não existir nenhum ticket válido, criar um:
/*
-- Primeiro, verificar se existe evento
SELECT 
    'EVENTOS_DISPONIVEIS' as tipo,
    id,
    title,
    name,
    start_date
FROM events
ORDER BY created_at DESC
LIMIT 3;

-- Criar ticket de emergência
INSERT INTO tickets (id, event_id, price, ticket_type, created_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM events ORDER BY created_at DESC LIMIT 1),
    0,
    'RECUPERADO',
    NOW()
)
RETURNING id as novo_ticket_id;

-- Relacionar com o ticket_user (substitua NOVO_TICKET_ID pelo retornado acima)
UPDATE ticket_users 
SET ticket_id = 'NOVO_TICKET_ID'
WHERE qr_code = 'PLKTK909538';
*/