-- =====================================================
-- CORREÇÃO SIMPLES - EXECUTAR DIRETAMENTO NO SUPABASE
-- =====================================================

-- 1. VERIFICAR STATUS ATUAL DO end_date
SELECT 
    'STATUS ATUAL' as info,
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND column_name = 'end_date';

-- 2. CORRIGIR end_date (executar apenas se necessário)
-- Descomente a linha abaixo se end_date ainda for NOT NULL:
-- ALTER TABLE public.events ALTER COLUMN end_date DROP NOT NULL;

-- 3. VERIFICAR SE FOI CORRIGIDO
SELECT 
    'VERIFICAÇÃO' as info,
    column_name,
    is_nullable,
    column_default,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ PERMITE NULL'
        ELSE '❌ AINDA NOT NULL'
    END as resultado
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND column_name = 'end_date';
