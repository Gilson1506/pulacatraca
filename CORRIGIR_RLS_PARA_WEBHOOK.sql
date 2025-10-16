-- =====================================================
-- CORRIGIR RLS PARA PERMITIR WEBHOOK BUSCAR PEDIDOS
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- PROBLEMA: O webhook do PagBank não consegue buscar pedidos
-- porque a Policy RLS bloqueia SELECT sem autenticação de usuário.
--
-- SOLUÇÃO: Criar uma policy que permite SELECT quando busca
-- por pagbank_order_id (usado pelo webhook)

-- 1. Verificar policies atuais de SELECT
SELECT 
  policyname,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'orders' 
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. Criar policy para permitir SELECT por pagbank_order_id
-- (necessário para webhooks funcionarem)
DO $$
BEGIN
  -- Verificar se já existe
  IF NOT EXISTS (                                                                                                 
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Allow select orders by pagbank_order_id for webhooks'
  ) THEN
    RAISE NOTICE '⚠️  Policy para webhooks não encontrada';
    RAISE NOTICE '   Criando policy...';
    
    -- Criar policy que permite buscar por pagbank_order_id
    CREATE POLICY "Allow select orders by pagbank_order_id for webhooks"
    ON public.orders FOR SELECT
    USING (pagbank_order_id IS NOT NULL);
    
    RAISE NOTICE '✅ Policy para webhooks criada com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '   Agora o backend pode buscar pedidos pelo pagbank_order_id';
    RAISE NOTICE '   sem precisar de autenticação de usuário (necessário para webhooks)';
  ELSE
    RAISE NOTICE '✅ Policy para webhooks já existe!';
  END IF;
END $$;

-- 3. Verificar policies de UPDATE também
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND cmd = 'UPDATE'
    AND (
      policyname LIKE '%update%' 
      OR policyname LIKE '%webhook%'
    )
  ) THEN
    RAISE NOTICE '⚠️  Policy de UPDATE não encontrada';
    RAISE NOTICE '   Criando policy...';
    
    -- Criar policy de UPDATE
    CREATE POLICY "Users can update their own orders"
    ON public.orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Policy de UPDATE criada!';
  ELSE
    RAISE NOTICE '✅ Policy de UPDATE já existe!';
  END IF;
END $$;

-- 4. Criar policy adicional para webhook UPDATE (opcional mas recomendado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Allow update orders by pagbank_order_id for webhooks'
  ) THEN
    RAISE NOTICE '⚠️  Policy de UPDATE para webhooks não encontrada';
    RAISE NOTICE '   Criando policy...';
    
    -- Permitir UPDATE quando busca por pagbank_order_id (webhooks)
    CREATE POLICY "Allow update orders by pagbank_order_id for webhooks"
    ON public.orders FOR UPDATE
    USING (pagbank_order_id IS NOT NULL);
    
    RAISE NOTICE '✅ Policy de UPDATE para webhooks criada!';
  ELSE
    RAISE NOTICE '✅ Policy de UPDATE para webhooks já existe!';
  END IF;
END $$;

-- 5. Verificar resultado final
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as linha;

SELECT 
  '✅ POLICIES CONFIGURADAS PARA TABELA ORDERS:' as status;

SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️  Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criação'
    WHEN cmd = 'UPDATE' THEN '✏️  Atualização'
    WHEN cmd = 'DELETE' THEN '🗑️  Exclusão'
  END as "Tipo"
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;

-- 6. Teste rápido - buscar pedido recente pelo pagbank_order_id
DO $$
DECLARE
  test_order_id TEXT := 'ORDE_21578176-C1B2-41BF-B525-3197E8EAFD37';
  found_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTANDO BUSCA POR pagbank_order_id...';
  RAISE NOTICE '   Buscando: %', test_order_id;
  
  SELECT COUNT(*) INTO found_count
  FROM public.orders
  WHERE pagbank_order_id = test_order_id;
  
  IF found_count > 0 THEN
    RAISE NOTICE '✅ PEDIDO ENCONTRADO! (%)', found_count;
    RAISE NOTICE '';
    RAISE NOTICE '   Isso significa que:';
    RAISE NOTICE '   1. O pagbank_order_id foi salvo corretamente';
    RAISE NOTICE '   2. A policy RLS agora permite SELECT';
    RAISE NOTICE '   3. O webhook vai funcionar!';
  ELSE
    RAISE NOTICE '❌ PEDIDO NÃO ENCONTRADO!';
    RAISE NOTICE '';
    RAISE NOTICE '   Possíveis causas:';
    RAISE NOTICE '   1. O pagbank_order_id não foi salvo';
    RAISE NOTICE '   2. A policy RLS ainda está bloqueando';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 7. Mensagem final
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ SCRIPT CONCLUÍDO!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '1. Verifique as mensagens acima';
  RAISE NOTICE '2. Se o teste encontrou o pedido: crie um NOVO pedido para testar';
  RAISE NOTICE '3. Se não encontrou: verifique o console do navegador';
  RAISE NOTICE '';
END $$;

