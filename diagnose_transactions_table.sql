-- ============================================
-- DIAGNÓSTICO DA TABELA TRANSACTIONS
-- ============================================
-- Execute este script no Supabase SQL Editor para diagnosticar problemas

-- 1. Verificar se a tabela transactions existe
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'transactions';

-- 2. Verificar estrutura da tabela transactions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- 3. Verificar relacionamentos (foreign keys)
SELECT
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
  AND tc.table_name = 'transactions';

-- 4. Verificar quantos registros existem
SELECT 
  COUNT(*) as total_transactions,
  COUNT(DISTINCT buyer_id) as unique_buyers,
  COUNT(DISTINCT event_id) as unique_events
FROM transactions;

-- 5. Verificar alguns registros de exemplo
SELECT 
  id,
  event_id,
  buyer_id,
  amount,
  status,
  payment_method,
  created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'transactions';

-- 7. Testar JOIN com events (pode falhar se não existir relacionamento)
SELECT 
  t.id,
  t.amount,
  t.status,
  t.created_at,
  e.title as event_title,
  e.id as event_id_check
FROM transactions t
LEFT JOIN events e ON t.event_id = e.id
LIMIT 3;

-- 8. Verificar se profiles existe para buyer_id
SELECT 
  t.id,
  t.buyer_id,
  p.name as buyer_name,
  p.email as buyer_email
FROM transactions t
LEFT JOIN profiles p ON t.buyer_id = p.id
LIMIT 3;

-- ============================================
-- INSTRUÇÕES:
-- ============================================
-- 1. Execute cada query separadamente
-- 2. Se alguma falhar, anote o erro
-- 3. Se a tabela não existir, execute: supabase_transactions_table.sql
-- 4. Se não houver dados, as consultas de pedidos sempre estarão vazias
-- ============================================