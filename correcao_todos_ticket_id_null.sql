-- ===================================================================
-- CORREÇÃO TODOS OS TICKET_ID NULL (4 REGISTROS)
-- ===================================================================
-- Resolver o problema para todos os registros afetados
-- ===================================================================

-- ===================================
-- 1. IDENTIFICAR TODOS OS REGISTROS COM PROBLEMA
-- ===================================
SELECT 
    '1_TODOS_COM_PROBLEMA' as passo,
    id,
    name,
    email,
    qr_code,
    ticket_id,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
FROM ticket_users
WHERE ticket_id IS NULL
ORDER BY created_at DESC;

-- ===================================
-- 2. VERIFICAR TICKETS DISPONÍVEIS PARA DISTRIBUIR
-- ===================================
SELECT 
    '2_TICKETS_PARA_DISTRIBUIR' as passo,
    COUNT(*) as total_tickets_disponiveis
FROM tickets;

-- Ver os tickets mais recentes
SELECT 
    '2_TICKETS_RECENTES' as passo,
    id,
    event_id,
    price,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
FROM tickets
ORDER BY created_at DESC
LIMIT 5;

-- ===================================
-- 3. ESTRATÉGIA DE CORREÇÃO
-- ===================================

-- Opção A: Todos apontam para o mesmo ticket (mais simples)
SELECT 
    '3A_MESMO_TICKET_PARA_TODOS' as estrategia,
    COUNT(*) as registros_afetados,
    (SELECT id FROM tickets ORDER BY created_at DESC LIMIT 1) as ticket_id_escolhido
FROM ticket_users
WHERE ticket_id IS NULL;

-- Opção B: Cada um aponta para um ticket diferente (mais realista)
WITH tickets_disponiveis AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
    FROM tickets
    LIMIT 4
),
usuarios_problematicos AS (
    SELECT 
        id,
        qr_code,
        name,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
    FROM ticket_users
    WHERE ticket_id IS NULL
)
SELECT 
    '3B_TICKETS_DISTRIBUIDOS' as estrategia,
    u.qr_code,
    u.name,
    t.id as ticket_id_que_sera_atribuido
FROM usuarios_problematicos u
LEFT JOIN tickets_disponiveis t ON t.ordem = u.ordem;

-- ===================================
-- 4. CORREÇÃO AUTOMÁTICA - OPÇÃO A (MESMO TICKET)
-- ===================================

-- Backup antes da correção
CREATE TABLE IF NOT EXISTS ticket_users_backup_correcao AS 
SELECT * FROM ticket_users WHERE ticket_id IS NULL;

-- Correção: Todos apontam para o ticket mais recente
UPDATE ticket_users 
SET 
    ticket_id = (
        SELECT id 
        FROM tickets 
        ORDER BY created_at DESC 
        LIMIT 1
    ),
    updated_at = NOW()
WHERE ticket_id IS NULL;

-- ===================================
-- 5. VERIFICAR CORREÇÃO
-- ===================================
SELECT 
    '5_VERIFICAR_CORRECAO' as passo,
    id,
    name,
    qr_code,
    ticket_id,
    updated_at,
    CASE 
        WHEN ticket_id IS NOT NULL THEN 'CORRIGIDO ✅'
        ELSE 'AINDA NULL ❌'
    END as status
FROM ticket_users
WHERE qr_code IN (
    SELECT qr_code 
    FROM ticket_users_backup_correcao
)
ORDER BY updated_at DESC;

-- ===================================
-- 6. VERIFICAR SE OS TICKETS RELACIONADOS EXISTEM
-- ===================================
SELECT 
    '6_VERIFICAR_RELACIONAMENTOS' as passo,
    tu.qr_code,
    tu.name,
    tu.ticket_id,
    t.id as ticket_encontrado,
    t.event_id,
    CASE 
        WHEN t.id IS NOT NULL THEN 'TICKET EXISTE ✅'
        ELSE 'TICKET NÃO EXISTE ❌'
    END as status_ticket
FROM ticket_users tu
LEFT JOIN tickets t ON t.id = tu.ticket_id
WHERE tu.qr_code IN (
    SELECT qr_code 
    FROM ticket_users_backup_correcao
)
ORDER BY tu.updated_at DESC;

-- ===================================
-- 7. TESTAR RPC PARA TODOS
-- ===================================

-- Testar especificamente o QR PLKTK909538
SELECT 
    '7A_TESTE_PLKTK909538' as passo,
    checkin_by_qr_code('PLKTK909538') as resultado;

-- Testar todos os QRs que tinham problema
DO $$
DECLARE
    qr_code_record RECORD;
    resultado JSON;
BEGIN
    FOR qr_code_record IN 
        SELECT DISTINCT qr_code 
        FROM ticket_users_backup_correcao
    LOOP
        SELECT checkin_by_qr_code(qr_code_record.qr_code) INTO resultado;
        RAISE NOTICE 'QR: % | Resultado: %', qr_code_record.qr_code, resultado;
    END LOOP;
END $$;

-- ===================================
-- 8. ESTATÍSTICAS FINAIS
-- ===================================
SELECT 
    '8_ESTATISTICAS_FINAIS' as passo,
    (SELECT COUNT(*) FROM ticket_users WHERE ticket_id IS NULL) as ainda_com_ticket_id_null,
    (SELECT COUNT(*) FROM ticket_users_backup_correcao) as total_corrigidos,
    (SELECT COUNT(*) FROM ticket_users) as total_ticket_users
;

-- ===================================
-- 9. ALTERNATIVA SE AINDA NÃO FUNCIONAR
-- ===================================

/*
-- Se ainda houver problemas, distribuir tickets únicos para cada usuário:

WITH tickets_disponiveis AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
    FROM tickets
    WHERE id IN (
        SELECT t.id 
        FROM tickets t
        JOIN events e ON e.id = t.event_id
    )
),
usuarios_problematicos AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
    FROM ticket_users
    WHERE ticket_id IS NULL
)
UPDATE ticket_users 
SET ticket_id = tickets_disponiveis.id
FROM tickets_disponiveis, usuarios_problematicos
WHERE ticket_users.id = usuarios_problematicos.id
AND tickets_disponiveis.ordem = usuarios_problematicos.ordem;
*/