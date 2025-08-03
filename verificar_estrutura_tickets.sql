-- =====================================================
-- VERIFICAR ESTRUTURA REAL DA TABELA tickets
-- =====================================================

-- 1. Verificar colunas da tabela tickets
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar algumas linhas para entender a estrutura
SELECT *
FROM tickets
LIMIT 3;

-- 3. Verificar chaves estrangeiras da tabela tickets
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'tickets';

-- 4. Verificar se existe alguma coluna relacionada a tipo
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND table_schema = 'public'
  AND (column_name ILIKE '%type%' 
       OR column_name ILIKE '%categoria%' 
       OR column_name ILIKE '%kind%'
       OR column_name ILIKE '%class%')
ORDER BY column_name;