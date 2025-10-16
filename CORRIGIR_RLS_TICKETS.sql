-- =====================================================
-- CORRIGIR RLS PARA PERMITIR WEBHOOK CRIAR TICKETS
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- 1. Verificar policies atuais da tabela tickets
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️  Leitura'
    WHEN cmd = 'INSERT' THEN '➕ Criação'
    WHEN cmd = 'UPDATE' THEN '✏️  Atualização'
    WHEN cmd = 'DELETE' THEN '🗑️  Exclusão'
  END as tipo
FROM pg_policies
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

-- 2. Criar policy para permitir INSERT de tickets (webhooks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tickets' 
    AND policyname = 'Allow insert tickets for webhooks'
  ) THEN
    RAISE NOTICE '⚠️  Policy de INSERT para tickets não encontrada';
    RAISE NOTICE '   Criando policy...';
    
    CREATE POLICY "Allow insert tickets for webhooks"
    ON public.tickets FOR INSERT
    WITH CHECK (true);  -- Permite INSERT de qualquer lugar (webhook)
    
    RAISE NOTICE '✅ Policy de INSERT para tickets criada!';
  ELSE
    RAISE NOTICE '✅ Policy de INSERT para tickets já existe!';
  END IF;
END $$;

-- 3. Criar policy para permitir SELECT de tickets (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tickets' 
    AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE '⚠️  Policy de SELECT para tickets não encontrada';
    RAISE NOTICE '   Criando policy...';
    
    CREATE POLICY "Users can view tickets"
    ON public.tickets FOR SELECT
    USING (user_id = auth.uid() OR true);  -- Permite SELECT
    
    RAISE NOTICE '✅ Policy de SELECT para tickets criada!';
  ELSE
    RAISE NOTICE '✅ Policy de SELECT para tickets já existe!';
  END IF;
END $$;

-- 4. Verificar resultado final
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as linha;

SELECT 
  '✅ POLICIES CONFIGURADAS PARA TICKETS:' as status;

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
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

-- 5. Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ POLICIES CONFIGURADAS!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '1. Reinicie o backend';
  RAISE NOTICE '2. Crie um novo pedido PIX';
  RAISE NOTICE '3. Simule o pagamento';
  RAISE NOTICE '4. Webhook deve criar tickets automaticamente!';
  RAISE NOTICE '';
END $$;

