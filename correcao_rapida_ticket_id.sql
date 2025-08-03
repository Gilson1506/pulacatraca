-- ===================================================================
-- CORREÇÃO RÁPIDA: TICKET_ID NULL PARA QR PLKTK909538
-- ===================================================================
-- Solução imediata para fazer o check-in funcionar
-- ===================================================================

-- ===================================
-- 1. VERIFICAÇÃO ANTES DA CORREÇÃO
-- ===================================
SELECT 
    'ANTES_CORRECAO' as status,
    qr_code,
    ticket_id,
    CASE 
        WHEN ticket_id IS NULL THEN 'PRECISA CORREÇÃO ❌'
        ELSE 'JÁ CORRIGIDO ✅'
    END as situacao
FROM ticket_users
WHERE qr_code = 'PLKTK909538';

-- ===================================
-- 2. ESCOLHER TICKET PARA RELACIONAR
-- ===================================
-- Ver ticket mais recente disponível
SELECT 
    'TICKET_ESCOLHIDO' as tipo,
    id as ticket_id_candidato,
    event_id,
    price,
    created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 1;

-- ===================================
-- 3. CORREÇÃO AUTOMÁTICA (DESCOMENTE PARA EXECUTAR)
-- ===================================

/*
-- EXECUTAR APENAS SE TICKET_ID FOR NULL
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

-- ===================================
-- 4. ALTERNATIVA: CORREÇÃO MANUAL (MAIS SEGURA)
-- ===================================

-- Passo 1: Ver ticket disponível
SELECT 
    'PASSO_1_TICKET_DISPONIVEL' as passo,
    id,
    event_id,
    price,
    created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 1;

-- Passo 2: Copie o ID do ticket acima e cole na query abaixo
/*
-- Substitua 'COLE_AQUI_O_ID_DO_TICKET' pelo ID real do ticket
UPDATE ticket_users 
SET ticket_id = 'COLE_AQUI_O_ID_DO_TICKET'
WHERE qr_code = 'PLKTK909538'
AND ticket_id IS NULL;
*/

-- ===================================
-- 5. VERIFICAÇÃO PÓS-CORREÇÃO
-- ===================================

-- Verificar se foi corrigido
SELECT 
    'APOS_CORRECAO' as status,
    qr_code,
    ticket_id,
    CASE 
        WHEN ticket_id IS NOT NULL THEN 'CORRIGIDO ✅'
        ELSE 'AINDA PRECISA CORREÇÃO ❌'
    END as situacao
FROM ticket_users
WHERE qr_code = 'PLKTK909538';

-- ===================================
-- 6. TESTE FINAL DA RPC
-- ===================================

-- Testar check-in após correção
SELECT checkin_by_qr_code('PLKTK909538') as teste_final;

-- ===================================
-- 7. CORREÇÃO EM MASSA (OPCIONAL)
-- ===================================

-- Ver quantos outros registros têm o mesmo problema
SELECT 
    'OUTROS_COM_PROBLEMA' as tipo,
    COUNT(*) as total_com_ticket_id_null
FROM ticket_users
WHERE ticket_id IS NULL;

/*
-- Se quiser corrigir TODOS os ticket_users com ticket_id null:
-- (Descomente apenas se tiver certeza)

UPDATE ticket_users 
SET ticket_id = (
    SELECT id 
    FROM tickets 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE ticket_id IS NULL;
*/