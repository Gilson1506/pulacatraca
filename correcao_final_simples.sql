-- ===================================================================
-- CORREÇÃO FINAL SIMPLES - SEM ERROS DE SINTAXE
-- ===================================================================
-- Resolver definitivamente os 4 registros com ticket_id NULL
-- ===================================================================

-- ===================================
-- 1. VER TODOS OS REGISTROS COM PROBLEMA
-- ===================================
SELECT 
    'REGISTROS_COM_PROBLEMA' as status,
    id,
    name,
    qr_code,
    ticket_id,
    created_at
FROM ticket_users
WHERE ticket_id IS NULL
ORDER BY created_at DESC;

-- ===================================
-- 2. VERIFICAR TICKETS DISPONÍVEIS
-- ===================================
SELECT 
    'TICKETS_DISPONIVEIS' as status,
    COUNT(*) as total_tickets
FROM tickets;

-- Ver ticket que será usado para correção
SELECT 
    'TICKET_ESCOLHIDO' as status,
    id as ticket_id,
    event_id,
    price,
    created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 1;

-- ===================================
-- 3. BACKUP DE SEGURANÇA
-- ===================================
CREATE TABLE IF NOT EXISTS backup_ticket_users_null AS 
SELECT * FROM ticket_users WHERE ticket_id IS NULL;

-- ===================================
-- 4. CORREÇÃO DEFINITIVA
-- ===================================
UPDATE ticket_users 
SET ticket_id = (
    SELECT id 
    FROM tickets 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE ticket_id IS NULL;

-- ===================================
-- 5. VERIFICAR SE FUNCIONOU
-- ===================================
SELECT 
    'APOS_CORRECAO' as status,
    COUNT(*) as registros_ainda_null
FROM ticket_users
WHERE ticket_id IS NULL;

-- Ver os registros corrigidos
SELECT 
    'REGISTROS_CORRIGIDOS' as status,
    tu.qr_code,
    tu.name,
    tu.ticket_id,
    t.event_id,
    CASE 
        WHEN t.id IS NOT NULL THEN 'OK'
        ELSE 'ERRO'
    END as ticket_existe
FROM ticket_users tu
LEFT JOIN tickets t ON t.id = tu.ticket_id
WHERE tu.qr_code IN (
    SELECT qr_code FROM backup_ticket_users_null
)
ORDER BY tu.qr_code;

-- ===================================
-- 6. TESTE DO QR ESPECÍFICO
-- ===================================
SELECT 
    'TESTE_PLKTK909538' as teste,
    checkin_by_qr_code('PLKTK909538') as resultado;

-- ===================================
-- 7. ESTATÍSTICAS FINAIS
-- ===================================
SELECT 
    'ESTATISTICAS' as info,
    (SELECT COUNT(*) FROM ticket_users WHERE ticket_id IS NULL) as ainda_null,
    (SELECT COUNT(*) FROM backup_ticket_users_null) as total_corrigidos,
    (SELECT COUNT(*) FROM ticket_users) as total_usuarios;