-- ===================================================================
-- VERIFICAR ESTRUTURA EXATA DAS TABELAS
-- ===================================================================
-- Este script mostra todas as colunas de cada tabela para
-- corrigir a RPC function com os nomes corretos
-- ===================================================================

-- ===================================
-- 1. ESTRUTURA DA TABELA TICKET_USERS
-- ===================================
SELECT 
    'TICKET_USERS' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- 2. ESTRUTURA DA TABELA TICKETS
-- ===================================
SELECT 
    'TICKETS' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- 3. ESTRUTURA DA TABELA EVENTS
-- ===================================
SELECT 
    'EVENTS' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- 4. ESTRUTURA DA TABELA CHECKIN
-- ===================================
SELECT 
    'CHECKIN' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'checkin' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- 5. TESTE SIMPLES PARA VER DADOS REAIS
-- ===================================

-- Ver um registro de ticket_users
SELECT 'EXEMPLO_TICKET_USERS' as tipo, * 
FROM ticket_users 
LIMIT 1;

-- Ver um registro de tickets
SELECT 'EXEMPLO_TICKETS' as tipo, * 
FROM tickets 
LIMIT 1;

-- Ver um registro de events
SELECT 'EXEMPLO_EVENTS' as tipo, * 
FROM events 
LIMIT 1;

-- Ver um registro de checkin
SELECT 'EXEMPLO_CHECKIN' as tipo, * 
FROM checkin 
LIMIT 1;

-- ===================================
-- 6. TESTE ESPECÍFICO DO QR PLKTK909538
-- ===================================

-- Verificar se QR existe e que colunas tem
SELECT 'QR_PLKTK909538' as verificacao, *
FROM ticket_users 
WHERE qr_code = 'PLKTK909538';

-- ===================================
-- 7. TESTE DA RPC CORRIGIDA
-- ===================================
SELECT checkin_by_qr_code('PLKTK909538') as resultado_rpc_corrigida;