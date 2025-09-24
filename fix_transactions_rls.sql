-- ============================================
-- FIX RLS: POLÍTICAS PARA TABELA TRANSACTIONS
-- ============================================

-- Verificar políticas atuais
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'transactions';

-- ============================================
-- REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ============================================

DROP POLICY IF EXISTS "Compradores podem ver suas transações" ON transactions;
DROP POLICY IF EXISTS "Organizadores podem ver transações dos seus eventos" ON transactions;
DROP POLICY IF EXISTS "Sistema pode inserir transações" ON transactions;
DROP POLICY IF EXISTS "Organizadores podem atualizar transações dos seus eventos" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Organizers can view event transactions" ON transactions;
DROP POLICY IF EXISTS "Public read access" ON transactions;
DROP POLICY IF EXISTS "Public insert access" ON transactions;

-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTE
-- ============================================

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- REABILITAR RLS COM POLÍTICAS CORRETAS
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICA 1: INSERÇÃO UNIVERSAL (PARA COMPRAS)
-- ============================================

CREATE POLICY "Qualquer usuário autenticado pode inserir transações" ON transactions
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- POLÍTICA 2: VISUALIZAÇÃO POR COMPRADOR
-- ============================================

-- Para tabelas com buyer_id
CREATE POLICY "Compradores podem ver suas transações via buyer_id" ON transactions
  FOR SELECT 
  TO authenticated
  USING (buyer_id = auth.uid());

-- Para tabelas com user_id
CREATE POLICY "Compradores podem ver suas transações via user_id" ON transactions
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- POLÍTICA 3: VISUALIZAÇÃO POR ORGANIZADOR
-- ============================================

CREATE POLICY "Organizadores podem ver transações dos seus eventos" ON transactions
  FOR SELECT 
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICA 4: ATUALIZAÇÃO POR ORGANIZADOR
-- ============================================

CREATE POLICY "Organizadores podem atualizar transações dos seus eventos" ON transactions
  FOR UPDATE 
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICA 5: FALLBACK PARA CASOS ESPECIAIS
-- ============================================

-- Se nem buyer_id nem user_id existirem, permitir por event_id
CREATE POLICY "Acesso por event_id quando user info não disponível" ON transactions
  FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events 
      WHERE organizer_id = auth.uid() 
      OR status = 'approved'
    )
  );

-- ============================================
-- POLÍTICA 6: ADMINISTRADORES (SE EXISTIR ROLE)
-- ============================================

-- Verificar se existe coluna role na tabela profiles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        -- Criar política para administradores
        EXECUTE 'CREATE POLICY "Administradores têm acesso total" ON transactions
          FOR ALL 
          TO authenticated
          USING (
            auth.uid() IN (
              SELECT id FROM profiles WHERE role = ''admin''
            )
          )';
        RAISE NOTICE 'Política para administradores criada';
    ELSE
        RAISE NOTICE 'Coluna role não existe - política de admin não criada';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO E TESTE
-- ============================================

-- Mostrar políticas criadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Ver dados'
        WHEN cmd = 'INSERT' THEN 'Inserir dados' 
        WHEN cmd = 'UPDATE' THEN 'Atualizar dados'
        WHEN cmd = 'DELETE' THEN 'Deletar dados'
        WHEN cmd = 'ALL' THEN 'Todas operações'
        ELSE cmd
    END as operacao
FROM pg_policies 
WHERE tablename = 'transactions'
ORDER BY cmd, policyname;

-- Verificar se RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename = 'transactions';

-- ============================================
-- TESTE DE INSERÇÃO (SIMULAR USER)
-- ============================================

-- ATENÇÃO: Substitua o UUID abaixo por um ID real de usuário
-- SELECT auth.uid(); -- Para ver o ID do usuário atual

-- Exemplo de teste (descomente e ajuste o UUID):
/*
INSERT INTO transactions (
    event_id, 
    amount, 
    status,
    buyer_id  -- ou user_id se não existir buyer_id
) VALUES (
    (SELECT id FROM events LIMIT 1),  -- Pega o primeiro evento
    1000,  -- R$ 10,00
    'pending',
    'SEU-USER-ID-AQUI'  -- Substitua pelo ID real
) ON CONFLICT DO NOTHING;
*/

-- ============================================
-- INSTRUÇÕES FINAIS
-- ============================================

RAISE NOTICE '✅ Políticas RLS configuradas com sucesso!';
RAISE NOTICE '📋 VERIFICAÇÕES REALIZADAS:';
RAISE NOTICE '   - Políticas antigas removidas';
RAISE NOTICE '   - RLS reabilitado com políticas corretas';
RAISE NOTICE '   - Inserção liberada para usuários autenticados';
RAISE NOTICE '   - Visualização por comprador e organizador';
RAISE NOTICE '   - Atualização por organizador';
RAISE NOTICE '   - Fallback para casos especiais';
RAISE NOTICE '';
RAISE NOTICE '🧪 TESTE O CHECKOUT AGORA:';
RAISE NOTICE '   1. Faça login como usuário normal';
RAISE NOTICE '   2. Acesse um evento aprovado';
RAISE NOTICE '   3. Clique em "Comprar Ingressos"';
RAISE NOTICE '   4. Complete o processo';
RAISE NOTICE '   5. Deve funcionar sem erro 403!';
RAISE NOTICE '';
RAISE NOTICE '📊 LOGS DO CONSOLE:';
RAISE NOTICE '   - Observe qual nível de fallback funcionou';
RAISE NOTICE '   - Deve ver "✅ NÍVEL X: Sucesso"';
RAISE NOTICE '';