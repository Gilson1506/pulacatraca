-- =====================================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO - SUPABASE
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- 1. Verificar se a coluna pagbank_order_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'pagbank_order_id'
  ) THEN
    RAISE NOTICE '❌ Coluna pagbank_order_id NÃO EXISTE!';
    RAISE NOTICE '   Será criada agora...';
    
    -- Criar a coluna
    ALTER TABLE public.orders 
    ADD COLUMN pagbank_order_id VARCHAR(100);
    
    -- Criar índice
    CREATE INDEX idx_orders_pagbank_order_id ON public.orders USING btree (pagbank_order_id);
    
    RAISE NOTICE '✅ Coluna pagbank_order_id criada com sucesso!';
  ELSE
    RAISE NOTICE '✅ Coluna pagbank_order_id já existe!';
  END IF;
END $$;

-- 2. Verificar se a tabela orders tem as colunas necessárias
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
  AND column_name IN ('id', 'pagbank_order_id', 'order_code', 'payment_status', 'user_id', 'event_id')
ORDER BY column_name;

-- 3. Verificar policies RLS da tabela orders
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
WHERE tablename = 'orders';

-- 4. Se não houver policy para UPDATE, criar uma
DO $$
BEGIN
  -- Verificar se existe policy de UPDATE para usuários autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND cmd = 'UPDATE' 
    AND policyname LIKE '%update%'
  ) THEN
    RAISE NOTICE '⚠️  Nenhuma policy de UPDATE encontrada!';
    RAISE NOTICE '   Criando policy...';
    
    -- Criar policy que permite UPDATE para o próprio usuário
    EXECUTE 'CREATE POLICY "Users can update their own orders" 
             ON public.orders FOR UPDATE 
             USING (auth.uid() = user_id)
             WITH CHECK (auth.uid() = user_id)';
    
    RAISE NOTICE '✅ Policy de UPDATE criada!';
  ELSE
    RAISE NOTICE '✅ Policy de UPDATE já existe!';
  END IF;
END $$;

-- 5. Mostrar resumo
DO $$
DECLARE
  orders_count INTEGER;
  orders_with_pagbank_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO orders_count FROM public.orders;
  SELECT COUNT(*) INTO orders_with_pagbank_id FROM public.orders WHERE pagbank_order_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RESUMO DA TABELA ORDERS:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Total de pedidos: %', orders_count;
  RAISE NOTICE 'Pedidos com pagbank_order_id: %', orders_with_pagbank_id;
  RAISE NOTICE 'Pedidos sem pagbank_order_id: %', (orders_count - orders_with_pagbank_id);
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

