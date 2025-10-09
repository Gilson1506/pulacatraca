-- =====================================================
-- ADICIONAR COLUNA DE CONTATO NA TABELA EVENTS
-- =====================================================
-- Este script adiciona uma coluna para informações de contato
-- e atualiza eventos existentes com dados padrão

-- =====================================================
-- 1. ADICIONAR COLUNA DE CONTATO
-- =====================================================

-- Adicionar coluna contact_info na tabela events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{
  "phone": "(11) 99999-9999",
  "hours": [
    "Segunda a Sexta: 9h às 18h",
    "Sábados: 9h às 14h"
  ]
}'::jsonb;

-- =====================================================
-- 2. VERIFICAR ESTRUTURA ATUALIZADA
-- =====================================================

-- Verificar se a coluna foi criada
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'contact_info';

-- =====================================================
-- 3. ATUALIZAR EVENTOS EXISTENTES
-- =====================================================

-- Atualizar eventos que não têm contact_info definido
UPDATE events 
SET contact_info = '{
  "phone": "(11) 99999-9999",
  "hours": [
    "Segunda a Sexta: 9h às 18h",
    "Sábados: 9h às 14h"
  ]
}'::jsonb
WHERE contact_info IS NULL;

-- =====================================================
-- 4. VERIFICAR DADOS ATUALIZADOS
-- =====================================================

-- Verificar alguns eventos com contact_info
SELECT 
  id,
  title,
  contact_info
FROM events 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- 5. TESTE DE INSERÇÃO
-- =====================================================

-- Testar inserção de evento com contact_info personalizado
DO $$
DECLARE
  test_event_id UUID;
BEGIN
  -- Inserir evento de teste com contact_info
  INSERT INTO events (
    title,
    description,
    start_date,
    end_date,
    location,
    location_type,
    organizer_id,
    status,
    contact_info
  ) VALUES (
    'Evento Teste - Contato',
    'Evento para testar a nova coluna de contato',
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days' + INTERVAL '2 hours',
    'Local de Teste',
    'physical',
    (SELECT id FROM profiles WHERE role = 'organizer' LIMIT 1),
    'pending',
    '{
      "phone": "(11) 88888-8888",
      "hours": [
        "Segunda a Sexta: 8h às 20h",
        "Sábados: 8h às 16h"
      ]
    }'::jsonb
  ) RETURNING id INTO test_event_id;
  
  RAISE NOTICE '✅ Evento de teste criado com ID: %', test_event_id;
  
  -- Verificar se foi criado corretamente
  PERFORM 
    title,
    contact_info
  FROM events 
  WHERE id = test_event_id;
  
  RAISE NOTICE '✅ Dados do evento de teste verificados com sucesso';
  
  -- Mostrar os dados criados
  RAISE NOTICE '📋 Dados do evento criado:';
  RAISE NOTICE '   - Título: %', (SELECT title FROM events WHERE id = test_event_id);
  RAISE NOTICE '   - Contato: %', (SELECT contact_info FROM events WHERE id = test_event_id);
  
  -- Limpar evento de teste
  DELETE FROM events WHERE id = test_event_id;
  RAISE NOTICE '🧹 Evento de teste removido';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

-- =====================================================
-- 6. VERIFICAÇÃO FINAL
-- =====================================================

-- Resumo final
DO $$
DECLARE
  total_events INTEGER;
  events_with_contact INTEGER;
  events_without_contact INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_events FROM events;
  
  SELECT COUNT(*) INTO events_with_contact 
  FROM events 
  WHERE contact_info IS NOT NULL;
  
  SELECT COUNT(*) INTO events_without_contact 
  FROM events 
  WHERE contact_info IS NULL;
  
  RAISE NOTICE '=== RESUMO FINAL DA COLUNA DE CONTATO ===';
  RAISE NOTICE '📊 Total de eventos: %', total_events;
  RAISE NOTICE '📞 Eventos com contato: %', events_with_contact;
  RAISE NOTICE '⚠️ Eventos sem contato: %', events_without_contact;
  
  IF events_without_contact = 0 THEN
    RAISE NOTICE '✅ Todos os eventos têm informações de contato';
  ELSE
    RAISE NOTICE '⚠️ Ainda há eventos sem informações de contato';
  END IF;
  
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- =====================================================
-- 7. INSTRUÇÕES DE USO
-- =====================================================

/*
🎯 COMO USAR A NOVA COLUNA:

✅ ESTRUTURA DA COLUNA:
   - contact_info é um campo JSONB
   - Contém phone (telefone) e hours (horários)
   - Formato padrão aplicado a todos os eventos

✅ EXEMPLO DE DADOS:
   {
     "phone": "(11) 99999-9999",
     "hours": [
       "Segunda a Sexta: 9h às 18h",
       "Sábados: 9h às 14h"
     ]
   }

✅ COMO ATUALIZAR:
   UPDATE events 
   SET contact_info = '{"phone": "(11) 88888-8888", "hours": ["8h às 20h"]}'::jsonb
   WHERE id = 'event-id';

✅ COMO CONSULTAR:
   SELECT contact_info->>'phone' as telefone
   FROM events 
   WHERE id = 'event-id';

🚀 PRÓXIMOS PASSOS:
   1. ✅ Execute este script no SQL Editor do Supabase
   2. ✅ Atualize o EventFormModal para incluir campos de contato
   3. ✅ Atualize o EventPage para exibir dados do banco
   4. ✅ Teste criando um novo evento com contato personalizado
*/
