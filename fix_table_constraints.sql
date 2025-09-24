-- =====================================================
-- CORREÇÃO DAS CONSTRAINTS DA TABELA EVENTS
-- =====================================================

-- 1. VERIFICAR CONSTRAINTS ATUAIS
SELECT 
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

-- 2. ALTERAR end_date PARA PERMITIR NULL (já que é opcional)
ALTER TABLE public.events 
ALTER COLUMN end_date DROP NOT NULL;

-- 3. ADICIONAR VALORES PADRÃO PARA CAMPOS OBRIGATÓRIOS
ALTER TABLE public.events 
ALTER COLUMN end_date SET DEFAULT NULL;

-- 4. VERIFICAR SE HÁ DADOS EXISTENTES COM end_date NULL
SELECT COUNT(*) as eventos_sem_data_fim
FROM events 
WHERE end_date IS NULL;

-- 5. ATUALIZAR DADOS EXISTENTES SE NECESSÁRIO
-- (opcional - apenas se quiser definir uma data padrão)
-- UPDATE events SET end_date = start_date + INTERVAL '2 hours' WHERE end_date IS NULL;

-- 6. VERIFICAR CONSTRAINTS APÓS CORREÇÃO
SELECT 
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

-- 7. VERIFICAR SE A TABELA ESTÁ FUNCIONANDO
SELECT 
    'TABELA CORRIGIDA' as status,
    COUNT(*) as total_events,
    COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) as com_data_fim,
    COUNT(CASE WHEN end_date IS NULL THEN 1 END) as sem_data_fim
FROM events;
