-- =====================================================
-- INSERIR DADOS DE EXEMPLO PARA TESTE
-- =====================================================

-- ATENÇÃO: Execute este script APÓS executar setup_transfer_system.sql
-- Este script insere dados de exemplo para testar o sistema

-- 1. VERIFICAR EVENTOS EXISTENTES
SELECT '=== EVENTOS EXISTENTES ===' as info;

SELECT 
  id,
  title,
  start_date,
  status
FROM events 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 5;

-- 2. INSERIR TIPOS DE INGRESSO DE EXEMPLO
-- Descomente e ajuste o UUID do evento conforme necessário

/*
-- Exemplo: Inserir tipos de ingresso para o primeiro evento aprovado
INSERT INTO event_ticket_types (id, event_id, title, price, transferable, max_transfers)
SELECT 
  gen_random_uuid(),
  e.id,
  'Ingresso Geral',
  50.00,
  true,
  1
FROM events e
WHERE e.status = 'approved'
ORDER BY e.created_at DESC
LIMIT 1
ON CONFLICT DO NOTHING;

-- Exemplo: Inserir tipo VIP
INSERT INTO event_ticket_types (id, event_id, title, price, transferable, max_transfers)
SELECT 
  gen_random_uuid(),
  e.id,
  'VIP',
  100.00,
  true,
  2
FROM events e
WHERE e.status = 'approved'
ORDER BY e.created_at DESC
LIMIT 1
ON CONFLICT DO NOTHING;

-- Exemplo: Inserir tipo Camarote (não transferível)
INSERT INTO event_ticket_types (id, event_id, title, price, transferable, max_transfers)
SELECT 
  gen_random_uuid(),
  e.id,
  'Camarote',
  200.00,
  false,
  0
FROM events e
WHERE e.status = 'approved'
ORDER BY e.created_at DESC
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- 3. VERIFICAR TIPOS DE INGRESSO CRIADOS
SELECT '=== TIPOS DE INGRESSO ===' as info;

SELECT 
  ett.id,
  ett.event_id,
  e.title as event_title,
  ett.title as ticket_type_title,
  ett.price,
  ett.transferable,
  ett.max_transfers
FROM event_ticket_types ett
JOIN events e ON ett.event_id = e.id
ORDER BY e.created_at DESC, ett.title;

-- 4. VERIFICAR INGRESSOS EXISTENTES
SELECT '=== INGRESSOS EXISTENTES ===' as info;

SELECT 
  t.id,
  t.event_id,
  e.title as event_title,
  t.status,
  t.user_id,
  t.ticket_user_id,
  t.transfer_count,
  t.max_transfers
FROM tickets t
JOIN events e ON t.event_id = e.id
ORDER BY t.created_at DESC
LIMIT 10;

-- 5. VERIFICAR USUÁRIOS DE INGRESSOS
SELECT '=== USUÁRIOS DE INGRESSOS ===' as info;

SELECT 
  tu.id,
  tu.name,
  tu.email,
  tu.document,
  tu.created_at
FROM ticket_users tu
ORDER BY tu.created_at DESC
LIMIT 10;

-- =====================================================
-- ✅ VERIFICAÇÕES CONCLUÍDAS!
-- =====================================================

-- Para inserir dados de exemplo:
-- 1. Descomente as linhas INSERT acima
-- 2. Ajuste os valores conforme necessário
-- 3. Execute o script novamente
