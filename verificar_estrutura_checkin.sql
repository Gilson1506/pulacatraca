-- ===================================================================
-- VERIFICAR ESTRUTURA DA TABELA CHECKIN
-- ===================================================================
-- Descobrir quais colunas existem na tabela checkin
-- ===================================================================

-- ===================================
-- 1. ESTRUTURA COMPLETA DA TABELA CHECKIN
-- ===================================
SELECT 
    'COLUNAS_CHECKIN' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'checkin' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- 2. VER EXEMPLOS DE DADOS NA TABELA CHECKIN
-- ===================================
SELECT 
    'EXEMPLO_CHECKIN' as info,
    *
FROM checkin
LIMIT 3;

-- ===================================
-- 3. CONTAR REGISTROS NA TABELA CHECKIN
-- ===================================
SELECT 
    'TOTAL_CHECKINS' as info,
    COUNT(*) as total_registros
FROM checkin;

-- ===================================
-- 4. VERIFICAR OUTRAS TABELAS RELACIONADAS
-- ===================================

-- Estrutura ticket_users
SELECT 
    'COLUNAS_TICKET_USERS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Estrutura tickets
SELECT 
    'COLUNAS_TICKETS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Estrutura events
SELECT 
    'COLUNAS_EVENTS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;