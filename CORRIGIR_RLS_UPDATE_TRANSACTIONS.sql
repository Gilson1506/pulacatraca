-- =====================================================
-- CORRIGIR POLÍTICA RLS PARA ATUALIZAR TRANSACTIONS
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Problema: A política atual só permite UPDATE em transactions com pagbank_transaction_id NOT NULL
-- Mas o webhook precisa atualizar TODAS as transactions de uma ordem (algumas têm NULL)

-- 1. Verificar política atual
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transactions' 
  AND cmd = 'UPDATE';

-- 2. REMOVER política restritiva
DROP POLICY IF EXISTS "Allow update transactions for webhooks" ON public.transactions;

-- 3. CRIAR nova política que permite UPDATE por order_id
CREATE POLICY "Allow update transactions by order_id"
ON public.transactions FOR UPDATE
USING (
  -- Permite atualizar se:
  -- 1. É admin
  is_admin_user()
  OR
  -- 2. É o próprio usuário
  auth.uid() = user_id 
  OR 
  auth.uid() = buyer_id
  OR
  -- 3. Tem pagbank_transaction_id OU order_id (para webhooks)
  pagbank_transaction_id IS NOT NULL 
  OR 
  order_id IS NOT NULL
);

-- 4. Verificar resultado
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transactions' 
  AND cmd = 'UPDATE';

-- 5. Teste: Ver se consegue ver todas transactions de uma ordem
DO $$
DECLARE
  test_order_id UUID;
  test_count INTEGER;
BEGIN
  -- Pegar um order_id de teste
  SELECT id INTO test_order_id 
  FROM public.orders 
  WHERE pagbank_order_id IS NOT NULL 
  LIMIT 1;
  
  IF test_order_id IS NOT NULL THEN
    SELECT COUNT(*) INTO test_count
    FROM public.transactions
    WHERE order_id = test_order_id;
    
    RAISE NOTICE '✅ Order de teste: %', test_order_id;
    RAISE NOTICE '✅ Transactions encontradas: %', test_count;
  ELSE
    RAISE NOTICE 'ℹ️  Nenhuma order com pagbank_order_id encontrada';
  END IF;
END $$;

-- =====================================================
-- RESUMO
-- =====================================================
-- ✅ Política antiga removida (só permitia UPDATE com pagbank_transaction_id NOT NULL)
-- ✅ Nova política criada (permite UPDATE por order_id também)
-- ✅ Webhooks agora podem atualizar TODAS as transactions de uma ordem

