-- =====================================================
-- VERIFICAÇÃO E GERENCIAMENTO DE POLÍTICAS RLS
-- =====================================================

-- 1. VERIFICAR POLÍTICAS EXISTENTES NA TABELA TICKETS
SELECT 
  'TICKETS' as tabela,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY policyname;

-- 2. VERIFICAR POLÍTICAS EXISTENTES NA TABELA TICKET_TRANSFERS
SELECT 
  'TICKET_TRANSFERS' as tabela,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'ticket_transfers'
ORDER BY policyname;

-- 3. VERIFICAR SE RLS ESTÁ ATIVO NAS TABELAS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('tickets', 'ticket_transfers')
ORDER BY tablename;

-- 4. REMOVER TODAS AS POLÍTICAS EXISTENTES (USE COM CUIDADO!)
-- Descomente as linhas abaixo se quiser limpar todas as políticas
/*
DROP POLICY IF EXISTS "Users can only access their own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view transfers they're involved in" ON ticket_transfers;
DROP POLICY IF EXISTS "Authenticated users can create transfers" ON ticket_transfers;
*/

-- 5. CRIAR POLÍTICAS CORRETAS (execute após remover as existentes)
-- Descomente as linhas abaixo para criar as políticas
/*
-- Política para tickets: usuários só podem ver seus próprios ingressos
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
*/

-- 6. VERIFICAR PERMISSÕES DOS USUÁRIOS
SELECT 
  usename,
  usecreatedb,
  usesuper,
  usebypassrls
FROM pg_user 
WHERE usename IN ('authenticated', 'anon', 'service_role')
ORDER BY usename;

-- 7. VERIFICAR CONFIGURAÇÃO DO SUPABASE
SELECT 
  name,
  setting,
  context,
  category
FROM pg_settings 
WHERE name LIKE '%rls%' OR name LIKE '%security%'
ORDER BY name;

-- =====================================================
-- ✅ VERIFICAÇÕES CONCLUÍDAS!
-- =====================================================

-- Se houver conflitos de políticas, execute primeiro as linhas de DROP POLICY
-- Depois execute as linhas de CREATE POLICY
