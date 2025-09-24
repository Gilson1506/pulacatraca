-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS - EXECUTE ESTE SCRIPT
-- =====================================================

-- 1. VERIFICAR POLÍTICAS EXISTENTES
SELECT '=== POLÍTICAS EXISTENTES ===' as info;

SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('tickets', 'ticket_transfers')
ORDER BY tablename, policyname;

-- 2. REMOVER POLÍTICAS DUPLICADAS
SELECT '=== REMOVENDO POLÍTICAS DUPLICADAS ===' as info;

-- Remover políticas da tabela tickets
DROP POLICY IF EXISTS "Users can only access their own tickets" ON tickets;
DROP POLICY IF EXISTS "Enable read access for all users" ON tickets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tickets;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON tickets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON tickets;

-- Remover políticas da tabela ticket_transfers
DROP POLICY IF EXISTS "Users can view transfers they're involved in" ON ticket_transfers;
DROP POLICY IF EXISTS "Authenticated users can create transfers" ON ticket_transfers;
DROP POLICY IF EXISTS "Enable read access for all users" ON ticket_transfers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ticket_transfers;

-- 3. CRIAR POLÍTICAS CORRETAS
SELECT '=== CRIANDO POLÍTICAS CORRETAS ===' as info;

-- Política para tickets: usuários só podem acessar seus próprios ingressos
CREATE POLICY "Users can only access their own tickets" ON tickets
  FOR ALL USING (auth.uid() = user_id);

-- Política para transferências: usuários só podem ver transferências relacionadas a eles
CREATE POLICY "Users can view transfers they're involved in" ON ticket_transfers
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id
  );

-- Política para inserção de transferências: apenas usuários autenticados
CREATE POLICY "Authenticated users can create transfers" ON ticket_transfers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. VERIFICAR POLÍTICAS FINAIS
SELECT '=== POLÍTICAS FINAIS ===' as info;

SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('tickets', 'ticket_transfers')
ORDER BY tablename, policyname;

-- 5. VERIFICAR SE RLS ESTÁ ATIVO
SELECT '=== STATUS DO RLS ===' as info;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('tickets', 'ticket_transfers')
ORDER BY tablename;

-- 6. TESTAR FUNÇÕES DE TRANSFERÊNCIA
SELECT '=== TESTE DAS FUNÇÕES ===' as info;

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('can_transfer_ticket', 'transfer_ticket', 'find_user_by_email', 'get_ticket_transfer_history')
ORDER BY routine_name;

-- =====================================================
-- ✅ CORREÇÃO CONCLUÍDA!
-- =====================================================

-- Agora você pode executar o setup_transfer_system.sql sem erros
-- Execute: setup_transfer_system.sql
