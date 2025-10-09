-- =====================================================
-- TESTE DE FUNCIONALIDADE DO ADMIN APP
-- =====================================================
-- Execute este script APÓS executar os scripts de correção
-- para verificar se tudo está funcionando

-- =====================================================
-- 1. VERIFICAR ESTRUTURA COMPLETA DA TABELA EVENTS
-- =====================================================

DO $$
DECLARE
  required_columns TEXT[] := ARRAY[
    'carousel_approved',
    'carousel_priority', 
    'reviewed_at',
    'reviewed_by',
    'rejection_reason',
    'updated_at'
  ];
  missing_columns TEXT[] := '{}';
  col TEXT;
BEGIN
  RAISE NOTICE '=== VERIFICANDO COLUNAS NECESSÁRIAS ===';
  
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
      RAISE NOTICE '❌ Coluna %: FALTANDO', col;
    ELSE
      RAISE NOTICE '✅ Coluna %: OK', col;
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE NOTICE '❌ COLUNAS FALTANDO: %', array_to_string(missing_columns, ', ');
    RAISE NOTICE '⚠️ Execute o fix_admin_complete.sql primeiro';
  ELSE
    RAISE NOTICE '✅ TODAS AS COLUNAS NECESSÁRIAS ESTÃO PRESENTES';
  END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR FUNÇÕES NECESSÁRIAS
-- =====================================================

DO $$
DECLARE
  required_functions TEXT[] := ARRAY['is_admin', 'update_events_updated_at'];
  missing_functions TEXT[] := '{}';
  func TEXT;
BEGIN
  RAISE NOTICE '=== VERIFICANDO FUNÇÕES NECESSÁRIAS ===';
  
  FOREACH func IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = func
    ) THEN
      missing_functions := array_append(missing_functions, func);
      RAISE NOTICE '❌ Função %: FALTANDO', func;
    ELSE
      RAISE NOTICE '✅ Função %: OK', func;
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE NOTICE '❌ FUNÇÕES FALTANDO: %', array_to_string(missing_functions, ', ');
    RAISE NOTICE '⚠️ Execute o fix_admin_complete.sql primeiro';
  ELSE
    RAISE NOTICE '✅ TODAS AS FUNÇÕES NECESSÁRIAS ESTÃO PRESENTES';
  END IF;
END $$;

-- =====================================================
-- 3. VERIFICAR TRIGGERS
-- =====================================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICANDO TRIGGERS ===';
  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE event_object_table = 'events';
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '❌ NENHUM TRIGGER ENCONTRADO na tabela events';
    RAISE NOTICE '⚠️ Execute o fix_admin_complete.sql primeiro';
  ELSIF trigger_count > 2 THEN
    RAISE NOTICE '⚠️ MUITOS TRIGGERS (%): Pode haver conflitos', trigger_count;
    RAISE NOTICE '📋 Triggers encontrados:';
    RAISE NOTICE '   %', (
      SELECT string_agg(trigger_name, ', ')
      FROM information_schema.triggers 
      WHERE event_object_table = 'events'
    );
  ELSE
    RAISE NOTICE '✅ Triggers configurados corretamente (% encontrado)', trigger_count;
    RAISE NOTICE '📋 Triggers ativos:';
    RAISE NOTICE '   %', (
      SELECT string_agg(trigger_name, ', ')
      FROM information_schema.triggers 
      WHERE event_object_table = 'events'
    );
  END IF;
END $$;

-- =====================================================
-- 4. VERIFICAR POLÍTICAS RLS
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
  admin_policies INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICANDO POLÍTICAS RLS ===';
  
  -- Contar políticas na tabela events
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'events';
  
  -- Contar políticas de admin
  SELECT COUNT(*) INTO admin_policies
  FROM pg_policies 
  WHERE tablename = 'events' 
  AND policyname LIKE '%admin%';
  
  RAISE NOTICE '📊 Total de políticas RLS na tabela events: %', policy_count;
  RAISE NOTICE '📊 Políticas de admin: %', admin_policies;
  
  IF policy_count = 0 THEN
    RAISE NOTICE '❌ NENHUMA POLÍTICA RLS ENCONTRADA';
    RAISE NOTICE '⚠️ Execute o fix_admin_complete.sql primeiro';
  ELSIF admin_policies = 0 THEN
    RAISE NOTICE '❌ NENHUMA POLÍTICA DE ADMIN ENCONTRADA';
    RAISE NOTICE '⚠️ Execute o fix_admin_complete.sql primeiro';
  ELSE
    RAISE NOTICE '✅ Políticas RLS configuradas corretamente';
    RAISE NOTICE '📋 Políticas encontradas:';
    RAISE NOTICE '   %', (
      SELECT string_agg(policyname, ', ')
      FROM pg_policies 
      WHERE tablename = 'events'
      ORDER BY policyname
    );
  END IF;
END $$;

-- =====================================================
-- 5. VERIFICAR USUÁRIOS ADMIN
-- =====================================================

DO $$
DECLARE
  admin_count INTEGER;
  total_users INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICANDO USUÁRIOS ADMIN ===';
  
  SELECT COUNT(*) INTO admin_count
  FROM profiles 
  WHERE role = 'admin';
  
  SELECT COUNT(*) INTO total_users
  FROM profiles;
  
  RAISE NOTICE '📊 Total de usuários: %', total_users;
  RAISE NOTICE '📊 Usuários admin: %', admin_count;
  
  IF admin_count = 0 THEN
    RAISE NOTICE '❌ NENHUM USUÁRIO ADMIN ENCONTRADO!';
    RAISE NOTICE '⚠️ É necessário criar um usuário admin para o sistema funcionar';
    RAISE NOTICE '🔧 Execute o create_admin_user.sql ou crie manualmente';
    
    IF total_users > 0 THEN
      RAISE NOTICE '📋 Usuários disponíveis para promover a admin:';
      RAISE NOTICE '   %', (
        SELECT string_agg(email, ', ')
        FROM profiles 
        ORDER BY created_at DESC 
        LIMIT 5
      );
    END IF;
    
  ELSE
    RAISE NOTICE '✅ Usuários admin encontrados: %', admin_count;
    RAISE NOTICE '📋 Admins ativos:';
    RAISE NOTICE '   %', (
      SELECT string_agg(email, ', ')
      FROM profiles 
      WHERE role = 'admin'
      ORDER BY created_at DESC
    );
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICAR ÍNDICES
-- =====================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICANDO ÍNDICES ===';
  
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'events' 
  AND indexname LIKE 'idx_events_%';
  
  IF index_count = 0 THEN
    RAISE NOTICE '⚠️ Nenhum índice personalizado encontrado';
    RAISE NOTICE '🔧 Execute o fix_admin_complete.sql para criar índices';
  ELSE
    RAISE NOTICE '✅ Índices encontrados: %', index_count;
    RAISE NOTICE '📋 Índices ativos:';
    RAISE NOTICE '   %', (
      SELECT string_agg(indexname, ', ')
      FROM pg_indexes 
      WHERE tablename = 'events' 
      AND indexname LIKE 'idx_events_%'
      ORDER BY indexname
    );
  END IF;
END $$;

-- =====================================================
-- 7. TESTE DE FUNCIONALIDADE (SIMULAÇÃO)
-- =====================================================

DO $$
DECLARE
  test_event_id UUID;
  test_user_id UUID;
BEGIN
  RAISE NOTICE '=== TESTE DE FUNCIONALIDADE ===';
  
  -- Verificar se existe pelo menos um evento para teste
  SELECT id INTO test_event_id
  FROM events 
  LIMIT 1;
  
  IF test_event_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum evento encontrado para teste';
    RAISE NOTICE '🔧 Crie alguns eventos primeiro para testar';
  ELSE
    RAISE NOTICE '✅ Evento encontrado para teste: %', test_event_id;
    
    -- Verificar se existe usuário admin para teste
    SELECT id INTO test_user_id
    FROM profiles 
    WHERE role = 'admin'
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
      RAISE NOTICE '⚠️ Nenhum usuário admin para teste';
      RAISE NOTICE '🔧 Crie um usuário admin primeiro';
    ELSE
      RAISE NOTICE '✅ Usuário admin para teste: %', test_user_id;
      RAISE NOTICE '🎯 Sistema pronto para testes de funcionalidade';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 8. RESUMO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📋 RESUMO DA VERIFICAÇÃO';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Se todas as verificações passaram:';
  RAISE NOTICE '   - O admin app deve estar funcionando';
  RAISE NOTICE '   - Aprovação de eventos deve funcionar';
  RAISE NOTICE '   - Carrossel deve funcionar';
  RAISE NOTICE '   - Edição de eventos deve funcionar';
  RAISE NOTICE '';
  RAISE NOTICE '❌ Se alguma verificação falhou:';
  RAISE NOTICE '   - Execute os scripts de correção';
  RAISE NOTICE '   - Verifique se não há erros SQL';
  RAISE NOTICE '   - Confirme que o usuário é admin';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
  RAISE NOTICE '   1. Faça login no admin app com usuário admin';
  RAISE NOTICE '   2. Teste a aprovação de um evento pendente';
  RAISE NOTICE '   3. Teste a funcionalidade de carrossel';
  RAISE NOTICE '   4. Teste a edição de informações do evento';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Sistema pronto para uso!';
  RAISE NOTICE '==============================================';
END $$;
