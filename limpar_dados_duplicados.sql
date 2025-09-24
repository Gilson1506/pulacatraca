-- ===================================================================
-- SCRIPT PARA LIMPAR DADOS DUPLICADOS - TICKET_USERS
-- ===================================================================
-- ⚠️  ATENÇÃO: Este script remove registros duplicados permanentemente!
-- ⚠️  Execute com cuidado em produção!
-- ===================================================================

-- ===================================
-- 1. ANÁLISE ANTES DE LIMPAR
-- ===================================

-- Ver quantos registros duplicados existem
SELECT 
    'ANTES_DA_LIMPEZA' as status,
    COUNT(*) as total_registros,
    COUNT(DISTINCT qr_code) as qr_codes_unicos,
    COUNT(*) - COUNT(DISTINCT qr_code) as registros_duplicados_a_remover
FROM ticket_users;

-- Ver top 10 QR codes mais duplicados
SELECT 
    'TOP_DUPLICADOS' as tipo,
    qr_code,
    COUNT(*) as total_duplicados,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids,
    MIN(created_at) as primeiro_criado,
    MAX(created_at) as ultimo_criado
FROM ticket_users
GROUP BY qr_code
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ===================================
-- 2. IDENTIFICAR REGISTROS PARA MANTER (MAIS RECENTES)
-- ===================================

-- Esta query mostra quais registros seriam mantidos
SELECT 
    'REGISTROS_A_MANTER' as tipo,
    tu.id,
    tu.name,
    tu.qr_code,
    tu.ticket_id,
    tu.created_at,
    ROW_NUMBER() OVER (PARTITION BY tu.qr_code ORDER BY tu.created_at DESC) as ranking
FROM ticket_users tu
WHERE tu.qr_code IN (
    SELECT qr_code 
    FROM ticket_users 
    GROUP BY qr_code 
    HAVING COUNT(*) > 1
)
ORDER BY tu.qr_code, tu.created_at DESC;

-- ===================================
-- 3. IDENTIFICAR REGISTROS PARA REMOVER (MAIS ANTIGOS)
-- ===================================

-- Esta query mostra quais registros seriam removidos
SELECT 
    'REGISTROS_A_REMOVER' as tipo,
    tu.id,
    tu.name,
    tu.qr_code,
    tu.ticket_id,
    tu.created_at
FROM ticket_users tu
WHERE tu.id NOT IN (
    SELECT DISTINCT t2.id
    FROM ticket_users t2
    WHERE t2.qr_code = tu.qr_code
    ORDER BY t2.created_at DESC
    LIMIT 1
)
AND tu.qr_code IN (
    SELECT qr_code 
    FROM ticket_users 
    GROUP BY qr_code 
    HAVING COUNT(*) > 1
)
ORDER BY tu.qr_code, tu.created_at;

-- ===================================
-- 4. SCRIPT DE LIMPEZA (DESCOMENTE PARA EXECUTAR)
-- ===================================

/*
-- ⚠️  DESCOMENTE AS LINHAS ABAIXO APENAS SE TIVER CERTEZA!
-- ⚠️  ISSO REMOVE PERMANENTEMENTE OS REGISTROS DUPLICADOS!

-- Criar tabela de backup primeiro
CREATE TABLE ticket_users_backup AS 
SELECT * FROM ticket_users;

-- Remover duplicados (manter apenas o mais recente de cada QR)
DELETE FROM ticket_users 
WHERE id NOT IN (
    SELECT DISTINCT ON (qr_code) id
    FROM ticket_users
    ORDER BY qr_code, created_at DESC
);

-- Verificar resultado
SELECT 
    'APOS_LIMPEZA' as status,
    COUNT(*) as total_registros,
    COUNT(DISTINCT qr_code) as qr_codes_unicos,
    COUNT(*) - COUNT(DISTINCT qr_code) as ainda_duplicados
FROM ticket_users;
*/

-- ===================================
-- 5. VERIFICAÇÃO ESPECÍFICA DO QR PLKTK909538
-- ===================================

-- Ver situação atual do QR específico
SELECT 
    'QR_PLKTK909538_ATUAL' as status,
    id,
    name,
    email,
    ticket_id,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as ordem
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC;

-- Ver qual seria mantido após limpeza
SELECT 
    'QR_PLKTK909538_SERIA_MANTIDO' as status,
    id,
    name,
    email,
    ticket_id,
    created_at
FROM ticket_users
WHERE qr_code = 'PLKTK909538'
ORDER BY created_at DESC
LIMIT 1;

-- ===================================
-- 6. ALTERNATIVA: LIMPEZA ESPECÍFICA APENAS DO QR PLKTK909538
-- ===================================

/*
-- Se quiser limpar apenas este QR específico:
-- (Descomente apenas se tiver certeza)

-- Backup específico
CREATE TABLE ticket_users_backup_plktk909538 AS 
SELECT * FROM ticket_users WHERE qr_code = 'PLKTK909538';

-- Remover duplicados apenas deste QR
DELETE FROM ticket_users 
WHERE qr_code = 'PLKTK909538'
AND id NOT IN (
    SELECT id 
    FROM ticket_users 
    WHERE qr_code = 'PLKTK909538'
    ORDER BY created_at DESC 
    LIMIT 1
);
*/

-- ===================================
-- 7. PREVENIR FUTUROS DUPLICADOS
-- ===================================

-- Criar índice único para prevenir futuros duplicados (opcional)
/*
-- Só execute se quiser prevenir completamente duplicados:
CREATE UNIQUE INDEX idx_ticket_users_qr_code_unique 
ON ticket_users (qr_code);
*/