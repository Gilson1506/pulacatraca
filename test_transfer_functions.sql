-- =====================================================
-- TESTE DAS FUNÇÕES DE TRANSFERÊNCIA CORRIGIDAS
-- =====================================================

-- 1. VERIFICAR SE AS FUNÇÕES FORAM CRIADAS
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('can_transfer_ticket', 'transfer_ticket', 'find_user_by_email', 'get_ticket_transfer_history')
ORDER BY routine_name;

-- 2. VERIFICAR SE A TABELA TICKET_TRANSFERS FOI CRIADA
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_transfers'
ORDER BY ordinal_position;

-- 3. VERIFICAR SE AS COLUNAS DE TRANSFERÊNCIA FORAM ADICIONADAS EM TICKETS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN ('transfer_count', 'transferred_at', 'transferred_by', 'max_transfers')
ORDER BY ordinal_position;

-- 4. VERIFICAR SE AS COLUNAS DE TRANSFERÊNCIA FORAM ADICIONADAS EM EVENT_TICKET_TYPES
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'event_ticket_types' 
AND column_name IN ('transferable', 'max_transfers')
ORDER BY ordinal_position;

-- 5. TESTAR FUNÇÃO find_user_by_email (substitua pelo email de um usuário existente)
-- SELECT find_user_by_email('usuario@exemplo.com');

-- 6. TESTAR FUNÇÃO can_transfer_ticket (substitua pelos UUIDs reais)
-- SELECT can_transfer_ticket('ticket-uuid-aqui', 'user-uuid-aqui');

-- 7. TESTAR FUNÇÃO get_ticket_transfer_history (substitua pelo UUID do ingresso)
-- SELECT get_ticket_transfer_history('ticket-uuid-aqui');

-- 8. VERIFICAR SE OS ÍNDICES FORAM CRIADOS
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_ticket_transfers_%' OR indexname LIKE 'idx_tickets_transfer_%'
ORDER BY indexname;

-- 9. VERIFICAR POLÍTICAS RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('tickets', 'ticket_transfers')
ORDER BY tablename, policyname;

-- 10. VERIFICAR ESTRUTURA COMPLETA DA TABELA TICKETS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
      ccu.table_name || '.' || ccu.column_name
    ELSE NULL
  END as foreign_key_reference
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE c.table_name = 'tickets' 
AND c.table_schema = 'public'
ORDER BY c.ordinal_position;

-- =====================================================
-- ✅ VERIFICAÇÕES CONCLUÍDAS!
-- =====================================================

-- Se todas as verificações passarem, o sistema está configurado corretamente.
-- Para testar as funções, descomente as linhas de teste acima e substitua pelos UUIDs reais.
