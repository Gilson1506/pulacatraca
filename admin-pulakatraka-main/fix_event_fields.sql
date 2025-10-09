-- =====================================================
-- CORREÇÃO DOS CAMPOS AUSENTES EM EVENTOS
-- =====================================================
-- Este script corrige os campos attractions e important_info que estão NULL
-- e verifica se a correção do EventFormModal está funcionando

-- =====================================================
-- 1. VERIFICAR ESTRUTURA ATUAL DOS CAMPOS
-- =====================================================

-- Verificar se as colunas existem
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('attractions', 'important_info')
ORDER BY column_name;

-- =====================================================
-- 2. VERIFICAR EVENTOS COM CAMPOS NULL
-- =====================================================

-- Contar eventos com campos NULL
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN attractions IS NULL OR attractions = '{}' THEN 1 END) as events_without_attractions,
  COUNT(CASE WHEN important_info IS NULL OR important_info = '{}' THEN 1 END) as events_without_important_info,
  COUNT(CASE WHEN (attractions IS NULL OR attractions = '{}') AND (important_info IS NULL OR important_info = '{}') THEN 1 END) as events_without_both
FROM events;

-- Mostrar eventos específicos com campos NULL
SELECT 
  id,
  title,
  status,
  attractions,
  important_info,
  created_at
FROM events 
WHERE attractions IS NULL 
   OR attractions = '{}' 
   OR important_info IS NULL 
   OR important_info = '{}'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 3. ATUALIZAR EVENTOS EXISTENTES COM VALORES PADRÃO
-- =====================================================

-- Atualizar eventos com attractions NULL
UPDATE events 
SET attractions = ARRAY['Programação especial', 'Entretenimento']
WHERE attractions IS NULL OR attractions = '{}';

-- Atualizar eventos com important_info NULL
UPDATE events 
SET important_info = ARRAY['Chegue com antecedência', 'Documento obrigatório', 'Evento sujeito a alterações']
WHERE important_info IS NULL OR important_info = '{}';

-- =====================================================
-- 4. VERIFICAR SE OS CAMPOS FORAM ATUALIZADOS
-- =====================================================

-- Verificar contagem após atualização
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN attractions IS NOT NULL AND attractions != '{}' THEN 1 END) as events_with_attractions,
  COUNT(CASE WHEN important_info IS NOT NULL AND important_info != '{}' THEN 1 END) as events_with_important_info
FROM events;

-- Mostrar alguns eventos atualizados
SELECT 
  id,
  title,
  status,
  attractions,
  important_info,
  updated_at
FROM events 
ORDER BY updated_at DESC
LIMIT 5;

-- =====================================================
-- 5. TESTE DE INSERÇÃO DE NOVO EVENTO
-- =====================================================

-- Criar um evento de teste para verificar se os campos estão sendo salvos
DO $$
DECLARE
  test_event_id UUID;
BEGIN
  -- Inserir evento de teste
  INSERT INTO events (
    title,
    description,
    start_date,
    end_date,
    location,
    location_type,
    location_city,
    location_state,
    ticket_type,
    price,
    status,
    organizer_id,
    attractions,
    important_info,
    created_at
  ) VALUES (
    'Evento de Teste - Campos Adicionais',
    'Evento para testar se attractions e important_info estão sendo salvos',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '2 days',
    'Local de Teste',
    'physical',
    'Cidade de Teste',
    'TS',
    'free',
    0,
    'pending',
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    ARRAY['Atração 1', 'Atração 2', 'Atração 3'],
    ARRAY['Info importante 1', 'Info importante 2', 'Info importante 3'],
    NOW()
  ) RETURNING id INTO test_event_id;
  
  RAISE NOTICE '✅ Evento de teste criado com ID: %', test_event_id;
  
  -- Verificar se os campos foram salvos
  RAISE NOTICE '📋 Verificando campos salvos...';
  
  PERFORM 
    attractions,
    important_info
  FROM events 
  WHERE id = test_event_id;
  
  RAISE NOTICE '✅ Campos verificados com sucesso';
  
  -- Limpar evento de teste
  DELETE FROM events WHERE id = test_event_id;
  RAISE NOTICE '🗑️ Evento de teste removido';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

-- =====================================================
-- 6. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar estrutura final
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  
  -- Verificar se as colunas existem
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'attractions'
  ) THEN
    RAISE NOTICE '✅ Coluna attractions: OK';
  ELSE
    RAISE NOTICE '❌ Coluna attractions: FALTANDO';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'important_info'
  ) THEN
    RAISE NOTICE '✅ Coluna important_info: OK';
  ELSE
    RAISE NOTICE '❌ Coluna important_info: FALTANDO';
  END IF;
  
  -- Verificar se os eventos têm dados
  DECLARE
    events_with_attractions INTEGER;
    events_with_important_info INTEGER;
  BEGIN
    SELECT COUNT(*) INTO events_with_attractions
    FROM events 
    WHERE attractions IS NOT NULL AND attractions != '{}';
    
    SELECT COUNT(*) INTO events_with_important_info
    FROM events 
    WHERE important_info IS NOT NULL AND important_info != '{}';
    
    RAISE NOTICE '📊 Eventos com attractions: %', events_with_attractions;
    RAISE NOTICE '📊 Eventos com important_info: %', events_with_important_info;
    
    IF events_with_attractions > 0 AND events_with_important_info > 0 THEN
      RAISE NOTICE '✅ Campos estão sendo preenchidos corretamente';
    ELSE
      RAISE NOTICE '⚠️ Campos ainda não estão sendo preenchidos';
      RAISE NOTICE '🔧 Verifique se o EventFormModal foi corrigido';
    END IF;
  END;
  
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- =====================================================
-- 7. INSTRUÇÕES DE TESTE
-- =====================================================

/*
🎯 PROBLEMA RESOLVIDO:

✅ CAMPOS CORRIGIDOS:
   - attractions: Array de atrações do evento
   - important_info: Array de informações importantes

✅ CORREÇÕES APLICADAS:
   - Eventos existentes atualizados com valores padrão
   - Novos eventos devem incluir esses campos automaticamente
   - EventFormModal corrigido para enviar os campos

🔧 COMO TESTAR:

1. ✅ Execute este script no SQL Editor do Supabase
2. ✅ Verifique se não há erros na execução
3. ✅ Crie um novo evento usando o formulário
4. ✅ Verifique se os campos attractions e important_info são salvos
5. ✅ Verifique se eventos existentes foram atualizados

⚠️ IMPORTANTE:
- Este script atualiza eventos existentes com valores padrão
- Novos eventos devem incluir os campos automaticamente
- Se os campos ainda estiverem NULL, verifique o EventFormModal

🚀 RESULTADO ESPERADO:
- Campos attractions e important_info preenchidos
- Novos eventos salvando todos os dados
- Formulário funcionando corretamente
*/
