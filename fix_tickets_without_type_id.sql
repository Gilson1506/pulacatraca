-- =====================================================
-- CORREÇÃO DE INGRESSOS SEM TICKET_TYPE_ID
-- =====================================================

-- 1. VERIFICAR INGRESSOS SEM TICKET_TYPE_ID
SELECT 
  'Ingressos sem ticket_type_id:' as info,
  COUNT(*) as total
FROM tickets 
WHERE ticket_type_id IS NULL;

-- 2. VERIFICAR INGRESSOS COM TICKET_TYPE_ID
SELECT 
  'Ingressos com ticket_type_id:' as info,
  COUNT(*) as total
FROM tickets 
WHERE ticket_type_id IS NOT NULL;

-- 3. VERIFICAR ESTRUTURA DA TABELA TICKETS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. VERIFICAR RELACIONAMENTOS
SELECT 
  'Relacionamentos:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'tickets';

-- 5. VERIFICAR SE EXISTEM EVENT_TICKET_TYPES
SELECT 
  'Tipos de ingresso disponíveis:' as info,
  COUNT(*) as total
FROM event_ticket_types;

-- 6. VERIFICAR INGRESSOS COM PROBLEMAS DE RELACIONAMENTO
SELECT 
  t.id as ticket_id,
  t.event_id,
  t.ticket_type_id,
  t.user_id,
  t.status,
  e.title as event_title,
  ett.name as ticket_type_name
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
WHERE t.ticket_type_id IS NULL
LIMIT 10;

-- 7. CORRIGIR INGRESSOS SEM TICKET_TYPE_ID (OPCIONAL)
-- ATENÇÃO: Esta operação pode ser perigosa se não for feita com cuidado
-- Comente as linhas abaixo se não quiser executar automaticamente

/*
-- Criar tipos de ingresso padrão para eventos existentes
INSERT INTO event_ticket_types (id, event_id, name, price, transferable, max_transfers)
SELECT 
  gen_random_uuid(),
  e.id,
  'Ingresso Geral',
  COALESCE(e.ticket_price, 50.00),
  true,
  1
FROM events e
WHERE e.id NOT IN (
  SELECT DISTINCT event_id FROM event_ticket_types
);

-- Atualizar ingressos sem ticket_type_id para usar o tipo padrão
UPDATE tickets 
SET ticket_type_id = (
  SELECT ett.id 
  FROM event_ticket_types ett 
  WHERE ett.event_id = tickets.event_id 
  LIMIT 1
)
WHERE ticket_type_id IS NULL
AND EXISTS (
  SELECT 1 FROM event_ticket_types ett 
  WHERE ett.event_id = tickets.event_id
);
*/

-- 8. VERIFICAÇÃO FINAL
SELECT 
  'Verificação final:' as info,
  'Ingressos sem ticket_type_id:' as status,
  COUNT(*) as total
FROM tickets 
WHERE ticket_type_id IS NULL

UNION ALL

SELECT 
  'Verificação final:' as info,
  'Ingressos com ticket_type_id:' as status,
  COUNT(*) as total
FROM tickets 
WHERE ticket_type_id IS NOT NULL;
