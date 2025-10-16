-- =====================================================
-- VERIFICAR E CORRIGIR TABELA TRANSACTIONS
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- 1. Verificar colunas atuais da tabela transactions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 2. Verificar se a coluna order_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'order_id'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ Coluna order_id NÃO EXISTE na tabela transactions!';
    RAISE NOTICE '   Será criada agora...';
    
    -- Criar a coluna
    ALTER TABLE public.transactions 
    ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
    
    -- Criar índice
    CREATE INDEX idx_transactions_order_id ON public.transactions USING btree (order_id);
    
    RAISE NOTICE '✅ Coluna order_id criada com sucesso!';
  ELSE
    RAISE NOTICE '✅ Coluna order_id já existe na tabela transactions!';
  END IF;
END $$;

-- 3. Verificar se a coluna pagbank_transaction_id existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'pagbank_transaction_id'
  ) THEN
    RAISE NOTICE '❌ Coluna pagbank_transaction_id NÃO EXISTE!';
    RAISE NOTICE '   Será criada agora...';
    
    -- Criar a coluna
    ALTER TABLE public.transactions 
    ADD COLUMN pagbank_transaction_id VARCHAR(100) UNIQUE;
    
    -- Criar índice
    CREATE INDEX idx_transactions_pagbank_id ON public.transactions USING btree (pagbank_transaction_id);
    
    RAISE NOTICE '✅ Coluna pagbank_transaction_id criada!';
  ELSE
    RAISE NOTICE '✅ Coluna pagbank_transaction_id já existe!';
  END IF;
END $$;

-- 4. Verificar outras colunas necessárias
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar paid_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'paid_at'
  ) THEN
    missing_columns := array_append(missing_columns, 'paid_at');
    ALTER TABLE public.transactions 
    ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Verificar failure_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'failure_reason'
  ) THEN
    missing_columns := array_append(missing_columns, 'failure_reason');
    ALTER TABLE public.transactions 
    ADD COLUMN failure_reason TEXT;
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE '✅ Colunas adicionadas: %', missing_columns;
  ELSE
    RAISE NOTICE '✅ Todas as colunas necessárias já existem!';
  END IF;
END $$;

-- 5. Criar policies RLS para transactions (se não existirem)
DO $$
BEGIN
  -- Habilitar RLS se não estiver
  ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  
  -- Policy de SELECT para webhooks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Allow select transactions by pagbank_transaction_id'
  ) THEN
    CREATE POLICY "Allow select transactions by pagbank_transaction_id"
    ON public.transactions FOR SELECT
    USING (pagbank_transaction_id IS NOT NULL);
    
    RAISE NOTICE '✅ Policy SELECT criada para transactions';
  END IF;
  
  -- Policy de INSERT para usuários
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Users can insert transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() = buyer_id);
    
    RAISE NOTICE '✅ Policy INSERT criada para transactions';
  END IF;
  
  -- Policy de UPDATE para webhooks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Allow update transactions for webhooks'
  ) THEN
    CREATE POLICY "Allow update transactions for webhooks"
    ON public.transactions FOR UPDATE
    USING (pagbank_transaction_id IS NOT NULL);
    
    RAISE NOTICE '✅ Policy UPDATE criada para transactions (webhooks)';
  END IF;
END $$;

-- 6. Mostrar resumo final
DO $$
DECLARE
  orders_count INTEGER;
  transactions_count INTEGER;
  orders_with_pagbank INTEGER;
  transactions_with_pagbank INTEGER;
BEGIN
  SELECT COUNT(*) INTO orders_count FROM public.orders;
  SELECT COUNT(*) INTO transactions_count FROM public.transactions;
  SELECT COUNT(*) INTO orders_with_pagbank FROM public.orders WHERE pagbank_order_id IS NOT NULL;
  SELECT COUNT(*) INTO transactions_with_pagbank FROM public.transactions WHERE pagbank_transaction_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RESUMO DAS TABELAS:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 ORDERS:';
  RAISE NOTICE '   Total: %', orders_count;
  RAISE NOTICE '   Com pagbank_order_id: %', orders_with_pagbank;
  RAISE NOTICE '';
  RAISE NOTICE '💳 TRANSACTIONS:';
  RAISE NOTICE '   Total: %', transactions_count;
  RAISE NOTICE '   Com pagbank_transaction_id: %', transactions_with_pagbank;
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ PRONTO PARA TESTAR WEBHOOK COMPLETO!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

