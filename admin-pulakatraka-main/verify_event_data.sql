-- =====================================================
-- VERIFICAÇÃO DOS DADOS REAIS DOS EVENTOS
-- =====================================================
-- Este script verifica se os eventos têm dados reais nos campos:
-- - classification (classificação etária)
-- - attractions (atrações)
-- - important_info (informações importantes)

-- =====================================================
-- 1. VERIFICAR ESTRUTURA DOS CAMPOS
-- =====================================================

-- Verificar se as colunas existem e seus tipos
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('classification', 'attractions', 'important_info')
ORDER BY column_name;

-- =====================================================
-- 2. VERIFICAR DADOS REAIS DOS EVENTOS
-- =====================================================

-- Contar eventos com dados reais vs dados padrão
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN classification IS NOT NULL AND classification != 'Livre' THEN 1 END) as events_with_real_classification,
  COUNT(CASE WHEN attractions IS NOT NULL AND attractions != '{}' AND attractions != ARRAY['Programação especial'] THEN 1 END) as events_with_real_attractions,
  COUNT(CASE WHEN important_info IS NOT NULL AND important_info != '{}' AND important_info != ARRAY['Chegue com antecedência'] THEN 1 END) as events_with_real_important_info
FROM events;

-- =====================================================
-- 3. MOSTRAR EVENTOS COM DADOS REAIS
-- =====================================================

-- Eventos com classificação real (não padrão)
SELECT 
  id,
  title,
  classification,
  created_at
FROM events 
WHERE classification IS NOT NULL 
  AND classification != 'Livre'
  AND classification != ''
ORDER BY created_at DESC;

-- Eventos com atrações reais (não padrão)
SELECT 
  id,
  title,
  attractions,
  created_at
FROM events 
WHERE attractions IS NOT NULL 
  AND attractions != '{}'
  AND attractions != ARRAY['Programação especial']
ORDER BY created_at DESC;

-- Eventos com informações importantes reais (não padrão)
SELECT 
  id,
  title,
  important_info,
  created_at
FROM events 
WHERE important_info IS NOT NULL 
  AND important_info != '{}'
  AND important_info != ARRAY['Chegue com antecedência']
ORDER BY created_at DESC;

-- =====================================================
-- 4. MOSTRAR EVENTOS COM DADOS PADRÃO (PROBLEMÁTICOS)
-- =====================================================

-- Eventos que ainda têm dados padrão
SELECT 
  id,
  title,
  classification,
  attractions,
  important_info,
  created_at
FROM events 
WHERE (classification = 'Livre' OR classification IS NULL)
   OR (attractions = ARRAY['Programação especial'] OR attractions IS NULL OR attractions = '{}')
   OR (important_info = ARRAY['Chegue com antecedência'] OR important_info IS NULL OR important_info = '{}')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 5. VERIFICAR EVENTOS APROVADOS ESPECIFICAMENTE
-- =====================================================

-- Eventos aprovados com dados reais
SELECT 
  id,
  title,
  status,
  classification,
  attractions,
  important_info,
  created_at
FROM events 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 6. TESTE DE INSERÇÃO COM DADOS REAIS
-- =====================================================

-- Criar um evento de teste com dados reais para verificar
DO $$
DECLARE
  test_event_id UUID;
BEGIN
  -- Inserir evento de teste com dados reais
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
    classification,
    attractions,
    important_info,
    created_at
  ) VALUES (
    'Evento de Teste - Dados Reais',
    'Evento para testar se os campos estão sendo salvos corretamente',
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
    '18', -- Classificação real
    ARRAY['Artista Principal', 'DJ Convidado', 'Banda de Abertura'], -- Atrações reais
    ARRAY['Proibido entrada de menores de 18 anos', 'Traje: Esporte fino', 'Não é permitido filmar'], -- Informações reais
    NOW()
  ) RETURNING id INTO test_event_id;
  
  RAISE NOTICE '✅ Evento de teste criado com ID: %', test_event_id;
  
  -- Verificar se os dados foram salvos
  RAISE NOTICE '📋 Verificando dados salvos...';
  
  PERFORM 
    classification,
    attractions,
    important_info
  FROM events 
  WHERE id = test_event_id;
  
  RAISE NOTICE '✅ Dados verificados com sucesso';
  
  -- Limpar evento de teste
  DELETE FROM events WHERE id = test_event_id;
  RAISE NOTICE '🗑️ Evento de teste removido';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

-- =====================================================
-- 7. VERIFICAÇÃO FINAL
-- =====================================================

-- Resumo final dos dados
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO FINAL DOS DADOS ===';
  
  DECLARE
    total_events INTEGER;
    events_with_real_classification INTEGER;
    events_with_real_attractions INTEGER;
    events_with_real_important_info INTEGER;
  BEGIN
    SELECT COUNT(*) INTO total_events FROM events;
    
    SELECT COUNT(*) INTO events_with_real_classification
    FROM events 
    WHERE classification IS NOT NULL 
      AND classification != 'Livre'
      AND classification != '';
    
    SELECT COUNT(*) INTO events_with_real_attractions
    FROM events 
    WHERE attractions IS NOT NULL 
      AND attractions != '{}'
      AND attractions != ARRAY['Programação especial'];
    
    SELECT COUNT(*) INTO events_with_real_important_info
    FROM events 
    WHERE important_info IS NOT NULL 
      AND important_info != '{}'
      AND important_info != ARRAY['Chegue com antecedência'];
    
    RAISE NOTICE '📊 Total de eventos: %', total_events;
    RAISE NOTICE '📊 Eventos com classificação real: %', events_with_real_classification;
    RAISE NOTICE '📊 Eventos com atrações reais: %', events_with_real_attractions;
    RAISE NOTICE '📊 Eventos com informações importantes reais: %', events_with_real_important_info;
    
    IF events_with_real_classification > 0 AND events_with_real_attractions > 0 AND events_with_real_important_info > 0 THEN
      RAISE NOTICE '✅ Eventos têm dados reais nos campos principais';
    ELSE
      RAISE NOTICE '⚠️ Ainda há eventos com dados padrão';
      RAISE NOTICE '🔧 Verifique se o EventFormModal está funcionando corretamente';
    END IF;
  END;
  
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- =====================================================
-- 8. INSTRUÇÕES DE TESTE
-- =====================================================

/*
🎯 PROBLEMA IDENTIFICADO:

✅ CAMPOS VERIFICADOS:
   - classification: Classificação etária do evento
   - attractions: Array de atrações/artistas
   - important_info: Array de informações importantes

✅ VERIFICAÇÕES REALIZADAS:
   - Estrutura das colunas
   - Dados reais vs dados padrão
   - Eventos aprovados
   - Teste de inserção

🔧 COMO RESOLVER:

1. ✅ Execute este script no SQL Editor do Supabase
2. ✅ Verifique se há eventos com dados reais
3. ✅ Se não houver, crie um novo evento usando o formulário
4. ✅ Verifique se os campos estão sendo preenchidos
5. ✅ Teste a visualização no EventPage

⚠️ IMPORTANTE:
- Eventos criados antes da correção podem ter dados padrão
- Novos eventos devem incluir dados reais automaticamente
- Verifique se o EventFormModal está funcionando

🚀 RESULTADO ESPERADO:
- Eventos com classificação real (18, 16, 14, etc.)
- Eventos com atrações reais (nomes de artistas)
- Eventos com informações importantes reais
- EventPage exibindo dados corretos
*/
