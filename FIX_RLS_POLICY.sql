-- =====================================================
-- CORRIGIR POLICIES RLS DA TABELA ORDERS
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- 1. Verificar policies existentes
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;

-- 2. Criar policy para permitir UPDATE (se não existir)
DO $$
BEGIN
  -- Verificar se já existe uma policy de UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND cmd = 'UPDATE'
  ) THEN
    RAISE NOTICE '⚠️  Nenhuma policy de UPDATE encontrada para tabela orders';
    RAISE NOTICE '   Criando policy...';
    
    -- Criar policy que permite UPDATE para o próprio usuário
    CREATE POLICY "Users can update their own orders" 
    ON public.orders FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Policy de UPDATE criada com sucesso!';
  ELSE
    RAISE NOTICE '✅ Já existe policy de UPDATE para tabela orders';
  END IF;
END $$;

-- 3. Verificar novamente as policies
SELECT 
  '✅ Policies configuradas:' as status;
  
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️  Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criação'
    WHEN cmd = 'UPDATE' THEN '✏️  Atualização'
    WHEN cmd = 'DELETE' THEN '🗑️  Exclusão'
    ELSE cmd
  END as tipo
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;

-- 4. Teste rápido (simula UPDATE)
DO $$
DECLARE
  test_user_id UUID;
  test_order_id UUID;
BEGIN
  -- Pegar um usuário autenticado de exemplo
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Pegar um pedido desse usuário
    SELECT id INTO test_order_id 
    FROM public.orders 
    WHERE user_id = test_user_id 
    LIMIT 1;
    
    IF test_order_id IS NOT NULL THEN
      RAISE NOTICE '';
      RAISE NOTICE '🧪 Testando UPDATE na tabela orders...';
      RAISE NOTICE '   User ID: %', test_user_id;
      RAISE NOTICE '   Order ID: %', test_order_id;
      
      -- Tentar UPDATE (sem realmente mudar nada importante)
      UPDATE public.orders 
      SET updated_at = NOW() 
      WHERE id = test_order_id 
      AND user_id = test_user_id;
      
      IF FOUND THEN
        RAISE NOTICE '✅ UPDATE funcionou! Policy está OK!';
      ELSE
        RAISE NOTICE '⚠️  UPDATE não encontrou o registro ou foi bloqueado';
      END IF;
    ELSE
      RAISE NOTICE '⚠️  Nenhum pedido encontrado para testar';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Nenhum usuário encontrado para testar';
  END IF;
END $$;

-- 5. Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ VERIFICAÇÃO CONCLUÍDA!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '1. Verifique as policies acima';
  RAISE NOTICE '2. Certifique-se que existe policy de UPDATE';
  RAISE NOTICE '3. Crie um novo pedido no frontend';
  RAISE NOTICE '4. Olhe o console do navegador (F12)';
  RAISE NOTICE '5. Procure por: "✅ pagbank_order_id salvo"';
  RAISE NOTICE '';
END $$;

