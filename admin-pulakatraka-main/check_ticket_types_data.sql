-- =====================================================
-- VERIFICAÇÃO: Dados dos tipos de ingressos
-- =====================================================
-- Este script verifica se os tipos de ingressos estão sendo salvos
-- e por que aparecem como esgotados

-- =====================================================
-- 1. VERIFICAR ESTRUTURA DA TABELA
-- =====================================================

-- Verificar se a tabela existe e sua estrutura
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'event_ticket_types' 
ORDER BY ordinal_position;

-- =====================================================
-- 2. VERIFICAR DADOS DOS TIPOS DE INGRESSOS
-- =====================================================

-- Verificar todos os tipos de ingressos existentes
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
  ett.created_at,
  ett.updated_at
FROM event_ticket_types ett
JOIN events e ON ett.event_id = e.id
ORDER BY ett.created_at DESC;

-- =====================================================
-- 3. VERIFICAR EVENTOS SEM TIPOS DE INGRESSOS
-- =====================================================

-- Eventos que não têm tipos de ingressos
SELECT 
  e.id,
  e.title,
  e.status,
  e.created_at,
  'Sem tipos de ingressos' as issue
FROM events e
LEFT JOIN event_ticket_types ett ON e.id = ett.event_id
WHERE ett.id IS NULL
AND e.status = 'approved'
ORDER BY e.created_at DESC;

-- =====================================================
-- 4. VERIFICAR PROBLEMAS NOS DADOS
-- =====================================================

-- Tipos de ingressos com problemas
SELECT 
  ett.id,
  ett.event_id,
  e.title as event_title,
  ett.title as ticket_title,
  ett.quantity,
  ett.available_quantity,
  ett.status,
  CASE 
    WHEN ett.quantity = 0 OR ett.quantity IS NULL THEN 'Quantidade zero'
    WHEN ett.available_quantity = 0 OR ett.available_quantity IS NULL THEN 'Disponível zero'
    WHEN ett.status != 'active' THEN 'Status inativo'
    ELSE 'OK'
  END as problem_type,
  ett.created_at
FROM event_ticket_types ett
JOIN events e ON ett.event_id = e.id
WHERE ett.quantity = 0 
   OR ett.quantity IS NULL
   OR ett.available_quantity = 0 
   OR ett.available_quantity IS NULL
   OR ett.status != 'active'
ORDER BY ett.created_at DESC;

-- =====================================================
-- 5. VERIFICAR EVENTOS RECENTES
-- =====================================================

-- Últimos 5 eventos criados
SELECT 
  id,
  title,
  status,
  created_at,
  updated_at
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- 6. TESTE DE INSERÇÃO MANUAL
-- =====================================================

-- Criar um tipo de ingresso de teste para verificar se funciona
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
    -- Verificar se já existe um tipo de ingresso para este evento
    IF NOT EXISTS (SELECT 1 FROM event_ticket_types WHERE event_id = test_event_id) THEN
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
        'Ingresso de Teste - Debug',
        'Ingresso de Teste - Debug',
        'Ingresso criado para debug do sistema',
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
      
      -- Verificar se foi criado corretamente
      PERFORM 
        title,
        price,
        quantity,
        available_quantity,
        status
      FROM event_ticket_types 
      WHERE id = test_ticket_id;
      
      RAISE NOTICE '✅ Dados do ingresso de teste verificados com sucesso';
      
      -- Mostrar os dados criados
      RAISE NOTICE '📋 Dados do ingresso criado:';
      RAISE NOTICE '   - Título: %', (SELECT title FROM event_ticket_types WHERE id = test_ticket_id);
      RAISE NOTICE '   - Preço: %', (SELECT price FROM event_ticket_types WHERE id = test_ticket_id);
      RAISE NOTICE '   - Quantidade: %', (SELECT quantity FROM event_ticket_types WHERE id = test_ticket_id);
      RAISE NOTICE '   - Disponível: %', (SELECT available_quantity FROM event_ticket_types WHERE id = test_ticket_id);
      RAISE NOTICE '   - Status: %', (SELECT status FROM event_ticket_types WHERE id = test_ticket_id);
      
    ELSE
      RAISE NOTICE '⚠️ Evento já tem tipos de ingressos definidos';
      
      -- Mostrar os tipos existentes
      RAISE NOTICE '📋 Tipos de ingressos existentes:';
      FOR ticket_record IN 
        SELECT title, price, quantity, available_quantity, status 
        FROM event_ticket_types 
        WHERE event_id = test_event_id
      LOOP
        RAISE NOTICE '   - %: R$ %, Quantidade: %, Disponível: %, Status: %', 
          ticket_record.title, 
          ticket_record.price, 
          ticket_record.quantity, 
          ticket_record.available_quantity, 
          ticket_record.status;
      END LOOP;
    END IF;
    
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

-- Resumo final dos dados
DO $$
DECLARE
  total_events INTEGER;
  events_with_tickets INTEGER;
  tickets_with_quantity INTEGER;
  tickets_with_available INTEGER;
  tickets_active INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_events FROM events WHERE status = 'approved';
  
  SELECT COUNT(DISTINCT e.id) INTO events_with_tickets
  FROM events e
  JOIN event_ticket_types ett ON e.id = ett.event_id
  WHERE e.status = 'approved';
  
  SELECT COUNT(*) INTO tickets_with_quantity
  FROM event_ticket_types 
  WHERE quantity > 0;
  
  SELECT COUNT(*) INTO tickets_with_available
  FROM event_ticket_types 
  WHERE available_quantity > 0;
  
  SELECT COUNT(*) INTO tickets_active
  FROM event_ticket_types 
  WHERE status = 'active';
  
  RAISE NOTICE '=== RESUMO FINAL DOS TIPOS DE INGRESSOS ===';
  RAISE NOTICE '📊 Total de eventos aprovados: %', total_events;
  RAISE NOTICE '🎫 Eventos com tipos de ingressos: %', events_with_tickets;
  RAISE NOTICE '🔢 Tipos com quantidade > 0: %', tickets_with_quantity;
  RAISE NOTICE '✅ Tipos com disponível > 0: %', tickets_with_available;
  RAISE NOTICE '🟢 Tipos ativos: %', tickets_active;
  
  IF events_with_tickets = 0 THEN
    RAISE NOTICE '⚠️ PROBLEMA: Nenhum evento tem tipos de ingressos definidos';
    RAISE NOTICE '🔧 SOLUÇÃO: Verificar se o EventFormModal está salvando ticketTypes';
  ELSIF tickets_with_quantity = 0 THEN
    RAISE NOTICE '⚠️ PROBLEMA: Todos os tipos de ingressos têm quantidade zero';
    RAISE NOTICE '🔧 SOLUÇÃO: Verificar se o campo quantity está sendo preenchido';
  ELSIF tickets_with_available = 0 THEN
    RAISE NOTICE '⚠️ PROBLEMA: Todos os tipos de ingressos têm disponível zero';
    RAISE NOTICE '🔧 SOLUÇÃO: Verificar se o campo available_quantity está sendo preenchido';
  ELSIF tickets_active = 0 THEN
    RAISE NOTICE '⚠️ PROBLEMA: Todos os tipos de ingressos estão inativos';
    RAISE NOTICE '🔧 SOLUÇÃO: Verificar se o campo status está sendo definido como active';
  ELSE
    RAISE NOTICE '✅ Tipos de ingressos estão funcionando corretamente';
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
   - Se os campos quantity e available_quantity estão sendo preenchidos
   - Se o status está sendo definido como 'active'

🔧 COMO RESOLVER:

1. ✅ Execute este script no SQL Editor do Supabase
2. ✅ Verifique se há tipos de ingressos para eventos
3. ✅ Verifique se as quantidades estão sendo salvas
4. ✅ Se não houver tipos de ingressos, crie um novo evento
5. ✅ Verifique se o EventFormModal está salvando ticketTypes corretamente

⚠️ IMPORTANTE:
   - Eventos criados antes da correção podem não ter tipos de ingressos
   - O campo quantity deve ser > 0
   - O campo available_quantity deve ser > 0
   - O status deve ser 'active'

🚀 RESULTADO ESPERADO:
   - Eventos com tipos de ingressos definidos
   - Quantidades corretas nos tipos de ingressos
   - Status ativo para os tipos de ingressos
   - EventPage exibindo ingressos disponíveis (não esgotados)
*/
