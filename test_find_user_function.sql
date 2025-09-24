-- =====================================================
-- TESTE DA FUNÇÃO find_user_by_email
-- =====================================================

-- 1. VERIFICAR SE A FUNÇÃO FOI CRIADA
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'find_user_by_email';

-- 2. VERIFICAR USUÁRIOS EXISTENTES NA TABELA AUTH.USERS
-- (Esta query pode não funcionar dependendo das permissões)
SELECT 
  'auth.users' as tabela,
  COUNT(*) as total_usuarios
FROM auth.users;

-- 3. VERIFICAR USUÁRIOS EXISTENTES NA TABELA TICKET_USERS
SELECT 
  'ticket_users' as tabela,
  COUNT(*) as total_usuarios
FROM ticket_users;

-- 4. TESTAR A FUNÇÃO COM EMAIL EXISTENTE
-- Substitua 'email@exemplo.com' por um email real da sua base
-- SELECT find_user_by_email('email@exemplo.com');

-- 5. TESTAR A FUNÇÃO COM EMAIL INEXISTENTE
-- SELECT find_user_by_email('usuario_inexistente@exemplo.com');

-- 6. VERIFICAR ESTRUTURA DA TABELA TICKET_USERS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_users'
ORDER BY ordinal_position;

-- 7. VERIFICAR PERMISSÕES DA FUNÇÃO
SELECT 
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proacl as access_privileges
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'find_user_by_email';

-- =====================================================
-- ✅ TESTES CONCLUÍDOS!
-- =====================================================

-- Para testar a função:
-- 1. Descomente as linhas SELECT find_user_by_email
-- 2. Substitua pelos emails reais da sua base
-- 3. Execute o script
