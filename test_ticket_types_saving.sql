-- ============================================================================
-- TESTE: Verificar salvamento de tipos de ingressos
-- ============================================================================

-- 1. Verificar eventos recentes
SELECT 
    id,
    title,
    created_at,
    status
FROM public.events 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verificar tipos de ingressos para eventos recentes
SELECT 
    ett.id,
    ett.event_id,
    e.title as event_title,
    ett.title as ticket_title,
    ett.name as ticket_name,
    ett.area,
    ett.price,
    ett.price_masculine,
    ett.price_feminine,
    ett.quantity,
    ett.available_quantity,
    ett.status,
    ett.created_at
FROM public.event_ticket_types ett
JOIN public.events e ON ett.event_id = e.id
ORDER BY ett.created_at DESC
LIMIT 10;

-- 3. Verificar se há tipos de ingressos para o último evento criado
WITH latest_event AS (
    SELECT id, title FROM public.events ORDER BY created_at DESC LIMIT 1
)
SELECT 
    le.title as event_title,
    COUNT(ett.id) as ticket_types_count,
    ARRAY_AGG(ett.title) as ticket_titles
FROM latest_event le
LEFT JOIN public.event_ticket_types ett ON le.id = ett.event_id
GROUP BY le.title;

-- 4. Verificar estrutura da tabela event_ticket_types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'event_ticket_types' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar triggers na tabela
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'event_ticket_types';

SELECT 'Teste de verificação concluído!' as status;