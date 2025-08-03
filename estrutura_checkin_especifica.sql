-- ===================================================================
-- ESTRUTURA ESPECÍFICA DA TABELA CHECKIN
-- ===================================================================
-- Descobrir exatamente quais colunas existem na tabela checkin
-- ===================================================================

-- ===================================
-- ESTRUTURA COMPLETA DA TABELA CHECKIN
-- ===================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'checkin' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================
-- VERIFICAR SE A TABELA CHECKIN EXISTE
-- ===================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'checkin' 
  AND table_schema = 'public';

-- ===================================
-- VER EXEMPLOS DE DADOS (SE EXISTIR)
-- ===================================
SELECT *
FROM checkin
LIMIT 3;