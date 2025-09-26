-- =====================================================
-- DEBUG: Verificar tipos de ingressos e endereços
-- =====================================================
-- Este script verifica se os tipos de ingressos estão sendo criados
-- e se os endereços estão completos

-- =====================================================
-- 1. VERIFICAR ESTRUTURA DAS TABELAS
-- =====================================================

-- Verificar se a tabela event_ticket_types existe
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'event_ticket_types' 
ORDER BY ordinal_position;

-- Verificar se a tabela events tem todas as colunas de endereço
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name LIKE 'location_%'
ORDER BY column_name;

-- =====================================================
-- 2. VERIFICAR EVENTOS RECENTES
-- =====================================================

-- Eventos criados recentemente
SELECT 
  id,
  title,
  location,
  location_name,
  location_street,
  location_number,
  location_neighborhood,
  location_city,
  location_state,
  location_cep,
  created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- 3. VERIFICAR TIPOS DE INGRESSOS
-- =====================================================

-- Tipos de ingressos para eventos recentes
SELECT 
  ett.id,
  ett.event_id,
  e.title as event_title,
  ett.title as ticket_title,
  ett.name as ticket_name,
  ett.area,
  ett.price,
  ett.price_masculine,
  ett.price_feminine,
  ett.quantity,
  ett.available_quantity,
  ett.status,
  ett.created_at
FROM event_ticket_types ett
JOIN events e ON ett.event_id = e.id
ORDER BY ett.created_at DESC
LIMIT 10;

-- =====================================================
-- 4. VERIFICAR EVENTOS SEM TIPOS DE INGRESSOS
-- =====================================================

-- Eventos que não têm tipos de ingressos definidos
SELECT 
  e.id,
  e.title,
  e.created_at,
  e.status
FROM events e
LEFT JOIN event_ticket_types ett ON e.id = ett.event_id
WHERE ett.id IS NULL
AND e.status = 'approved'
ORDER BY e.created_at DESC
LIMIT 10;

-- =====================================================
-- 5. VERIFICAR ENDEREÇOS COMPLETOS
-- =====================================================

-- Eventos com endereços completos
SELECT 
  id,
  title,
  location,
  location_name,
  location_street,
  location_number,
  location_neighborhood,
  location_city,
  location_state,
  location_cep,
  CASE 
    WHEN location_street IS NOT NULL 
      AND location_city IS NOT NULL 
      AND location_state IS NOT NULL 
    THEN 'Endereço Completo'
    WHEN location IS NOT NULL 
    THEN 'Endereço Básico'
    ELSE 'Sem Endereço'
  END as address_status
FROM events 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 6. TESTE DE INSERÇÃO DE TIPO DE INGRESSO
-- =====================================================

-- Criar um tipo de ingresso de teste para o último evento
DO $$
DECLARE
  test_event_id UUID;
  test_ticket_id UUID;
BEGIN
  -- Pegar o último evento aprovado
  SELECT id INTO test_event_id 
  FROM events 
  WHERE status = 'approved' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF test_event_id IS NOT NULL THEN
    -- Inserir tipo de ingresso de teste
    INSERT INTO event_ticket_types (
      event_id,
      title,
      name,
      description,
      area,
      price,
      price_masculine,
      price_feminine,
      quantity,
      available_quantity,
      min_quantity,
      max_quantity,
      has_half_price,
      status
    ) VALUES (
      test_event_id,
      'Ingresso de Teste',
      'Ingresso de Teste',
      'Ingresso criado para teste do sistema',
      'Pista',
      50.00,
      50.00,
      45.00,
      100,
      100,
      1,
      5,
      true,
      'active'
    ) RETURNING id INTO test_ticket_id;
    
    RAISE NOTICE '✅ Tipo de ingresso de teste criado com ID: % para evento: %', test_ticket_id, test_event_id;
    
    -- Verificar se foi criado
    PERFORM 
      title,
      price,
      quantity,
      available_quantity
    FROM event_ticket_types 
    WHERE id = test_ticket_id;
    
    RAISE NOTICE '✅ Dados do ingresso de teste verificados com sucesso';
    
    -- Limpar ingresso de teste
    DELETE FROM event_ticket_types WHERE id = test_ticket_id;
    RAISE NOTICE '🗑️ Ingresso de teste removido';
    
  ELSE
    RAISE NOTICE '⚠️ Nenhum evento aprovado encontrado para teste';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

-- =====================================================
-- 7. VERIFICAÇÃO FINAL
-- =====================================================

-- Resumo final
DO $$
DECLARE
  total_events INTEGER;
  events_with_tickets INTEGER;
  events_with_complete_address INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_events FROM events WHERE status = 'approved';
  
  SELECT COUNT(DISTINCT e.id) INTO events_with_tickets
  FROM events e
  JOIN event_ticket_types ett ON e.id = ett.event_id
  WHERE e.status = 'approved';
  
  SELECT COUNT(*) INTO events_with_complete_address
  FROM events 
  WHERE status = 'approved'
    AND location_street IS NOT NULL
    AND location_city IS NOT NULL
    AND location_state IS NOT NULL;
  
  RAISE NOTICE '=== RESUMO FINAL ===';
  RAISE NOTICE '📊 Total de eventos aprovados: %', total_events;
  RAISE NOTICE '🎫 Eventos com tipos de ingressos: %', events_with_tickets;
  RAISE NOTICE '📍 Eventos com endereços completos: %', events_with_complete_address;
  
  IF events_with_tickets > 0 THEN
    RAISE NOTICE '✅ Tipos de ingressos estão sendo criados';
  ELSE
    RAISE NOTICE '⚠️ Nenhum evento tem tipos de ingressos definidos';
  END IF;
  
  IF events_with_complete_address > 0 THEN
    RAISE NOTICE '✅ Endereços completos estão sendo salvos';
  ELSE
    RAISE NOTICE '⚠️ Poucos eventos têm endereços completos';
  END IF;
  
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- =====================================================
-- 8. INSTRUÇÕES DE CORREÇÃO
-- =====================================================

/*
🎯 PROBLEMAS IDENTIFICADOS:

✅ VERIFICAR:
   - Se a tabela event_ticket_types existe
   - Se os eventos têm tipos de ingressos criados
   - Se os endereços estão sendo salvos completos

🔧 COMO RESOLVER:

1. ✅ Execute este script no SQL Editor do Supabase
2. ✅ Verifique se há tipos de ingressos para eventos
3. ✅ Verifique se os endereços estão completos
4. ✅ Se não houver tipos de ingressos, crie um novo evento
5. ✅ Verifique se o EventFormModal está salvando corretamente

⚠️ IMPORTANTE:
   - Eventos criados antes da correção podem não ter tipos de ingressos
   - Endereços antigos podem estar incompletos
   - Novos eventos devem incluir dados completos automaticamente

🚀 RESULTADO ESPERADO:
   - Eventos com tipos de ingressos definidos
   - Endereços completos com rua, número, bairro, cidade, estado e CEP
   - Quantidades corretas nos tipos de ingressos
   - EventPage exibindo informações completas
*/
