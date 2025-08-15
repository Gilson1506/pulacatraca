-- ============================================================================
-- TESTE: Verificar integração dos tipos de ingressos
-- ============================================================================

-- 1. Verificar se a tabela event_ticket_types existe
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'event_ticket_types'
ORDER BY ordinal_position;

-- 2. Verificar eventos existentes
SELECT 
    id, 
    title, 
    price, 
    available_tickets, 
    total_tickets,
    status
FROM events 
LIMIT 5;

-- 3. Verificar tipos de ingressos existentes
SELECT 
    ett.id,
    ett.event_id,
    e.title as event_title,
    ett.name,
    ett.price,
    ett.quantity,
    ett.available_quantity,
    ett.status
FROM event_ticket_types ett
JOIN events e ON ett.event_id = e.id
LIMIT 10;

-- 4. Testar a view events_with_ticket_types
SELECT 
    id,
    title,
    json_array_length(ticket_types::json) as ticket_types_count
FROM events_with_ticket_types
WHERE json_array_length(ticket_types::json) > 0
LIMIT 5;

-- 5. Testar função de inserção (exemplo)
-- SELECT insert_event_with_ticket_types(
--     '{"title": "Evento Teste", "description": "Teste", "start_date": "2025-01-30T20:00:00", "end_date": "2025-01-30T23:00:00", "location": "Local Teste", "category": "show", "organizer_id": "00000000-0000-0000-0000-000000000000", "price": 50, "available_tickets": 100, "total_tickets": 100}'::jsonb,
--     ARRAY['{"name": "Ingresso Geral", "description": "Ingresso padrão", "price": 50, "quantity": 100}'::jsonb, '{"name": "VIP", "description": "Ingresso VIP", "price": 100, "quantity": 20}'::jsonb]
-- );

-- 6. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'event_ticket_types';

SELECT 'Testes de integração concluídos!' as status;