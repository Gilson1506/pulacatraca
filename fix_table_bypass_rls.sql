-- =====================================================
-- CORREÇÃO DA TABELA EVENTS - CONTORNANDO RLS
-- =====================================================

-- 1. VERIFICAR FUNÇÕES DE VALIDAÇÃO EXISTENTES
SELECT 
    'FUNÇÕES DE VALIDAÇÃO' as info,
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname LIKE '%event%' 
    OR prosrc LIKE '%event%';

-- 2. VERIFICAR POLÍTICAS RLS
SELECT 
    'POLÍTICAS RLS' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events';

-- 3. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- 4. VERIFICAR CONSTRAINTS ATUAIS
SELECT 
    'CONSTRAINTS ATUAIS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' THEN 'OBRIGATÓRIO'
        ELSE 'OPCIONAL'
    END as status
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. CORRIGIR end_date PARA PERMITIR NULL
ALTER TABLE public.events 
ALTER COLUMN end_date DROP NOT NULL;

-- 6. ADICIONAR VALORES PADRÃO PARA CAMPOS OBRIGATÓRIOS
ALTER TABLE public.events 
ALTER COLUMN end_date SET DEFAULT NULL;

-- 7. VERIFICAR SE HÁ DADOS EXISTENTES COM PROBLEMAS
SELECT 
    'DADOS EXISTENTES' as info,
    COUNT(*) as total_events,
    COUNT(CASE WHEN end_date IS NULL THEN 1 END) as sem_data_fim,
    COUNT(CASE WHEN title IS NULL THEN 1 END) as sem_titulo,
    COUNT(CASE WHEN description IS NULL THEN 1 END) as sem_descricao,
    COUNT(CASE WHEN location IS NULL THEN 1 END) as sem_local,
    COUNT(CASE WHEN price IS NULL THEN 1 END) as sem_preco,
    COUNT(CASE WHEN category IS NULL THEN 1 END) as sem_categoria
FROM events;

-- 8. CORRIGIR DADOS EXISTENTES COM CAMPOS NULL
UPDATE events 
SET 
    title = COALESCE(title, 'Evento sem título'),
    description = COALESCE(description, 'Descrição não disponível'),
    location = COALESCE(location, 'Local não informado'),
    price = COALESCE(price, 0),
    category = COALESCE(category, 'evento'),
    status = COALESCE(status, 'pending'),
    end_date = COALESCE(end_date, start_date + INTERVAL '2 hours')
WHERE 
    title IS NULL 
    OR description IS NULL 
    OR location IS NULL 
    OR price IS NULL 
    OR category IS NULL 
    OR status IS NULL 
    OR end_date IS NULL;

-- 9. VERIFICAR CONSTRAINTS APÓS CORREÇÃO
SELECT 
    'CONSTRAINTS APÓS CORREÇÃO' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' THEN 'OBRIGATÓRIO'
        ELSE 'OPCIONAL'
    END as status
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. REABILITAR RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 11. VERIFICAR RESULTADO FINAL
SELECT 
    'RESULTADO FINAL' as status,
    COUNT(*) as total_events,
    COUNT(CASE WHEN title IS NOT NULL THEN 1 END) as com_titulo,
    COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as com_descricao,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as com_local,
    COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as com_preco,
    COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as com_categoria,
    COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) as com_data_fim,
    COUNT(CASE WHEN end_date IS NULL THEN 1 END) as sem_data_fim
FROM events;

-- 12. VERIFICAR SE A TABELA ESTÁ FUNCIONANDO
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN title IS NOT NULL THEN 1 END) 
             AND COUNT(*) = COUNT(CASE WHEN description IS NOT NULL THEN 1 END)
             AND COUNT(*) = COUNT(CASE WHEN location IS NOT NULL THEN 1 END)
             AND COUNT(*) = COUNT(CASE WHEN price IS NOT NULL THEN 1 END)
             AND COUNT(*) = COUNT(CASE WHEN category IS NOT NULL THEN 1 END)
        THEN '✅ TABELA CORRIGIDA COM SUCESSO'
        ELSE '❌ AINDA HÁ PROBLEMAS'
    END as resultado
FROM events;

-- 13. VERIFICAR SE end_date FOI CORRIGIDO
SELECT 
    'VERIFICAÇÃO end_date' as status,
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
