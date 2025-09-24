-- =====================================================
-- TESTE DE MAPEAMENTO DOS CAMPOS DA TABELA EVENTS
-- =====================================================
-- Execute este script após criar um evento para verificar
-- se todos os campos estão sendo salvos corretamente

DO $$
DECLARE
    event_record RECORD;
    null_fields TEXT[] := ARRAY[]::TEXT[];
    filled_fields TEXT[] := ARRAY[]::TEXT[];
    total_fields INTEGER := 0;
    null_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO MAPEAMENTO DOS CAMPOS DA TABELA EVENTS...';
    RAISE NOTICE '';
    
    -- Buscar o evento mais recente para análise
    SELECT * INTO event_record 
    FROM events 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Nenhum evento encontrado na tabela. Crie um evento primeiro.';
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 ANALISANDO EVENTO: "%"', event_record.title;
    RAISE NOTICE '🆔 ID: %', event_record.id;
    RAISE NOTICE '📅 Criado em: %', event_record.created_at;
    RAISE NOTICE '';
    
    -- =====================================================
    -- VERIFICAR CAMPOS OBRIGATÓRIOS (NOT NULL)
    -- =====================================================
    RAISE NOTICE '🚨 CAMPOS OBRIGATÓRIOS (NOT NULL):';
    
    -- Campos obrigatórios básicos
    IF event_record.title IS NULL OR event_record.title = '' THEN
        RAISE NOTICE '   ❌ title: NULL ou vazio';
        null_fields := array_append(null_fields, 'title');
    ELSE
        RAISE NOTICE '   ✅ title: "%"', event_record.title;
        filled_fields := array_append(filled_fields, 'title');
    END IF;
    
    IF event_record.organizer_id IS NULL THEN
        RAISE NOTICE '   ❌ organizer_id: NULL';
        null_fields := array_append(null_fields, 'organizer_id');
    ELSE
        RAISE NOTICE '   ✅ organizer_id: %', event_record.organizer_id;
        filled_fields := array_append(filled_fields, 'organizer_id');
    END IF;
    
    IF event_record.start_date IS NULL THEN
        RAISE NOTICE '   ❌ start_date: NULL';
        null_fields := array_append(null_fields, 'start_date');
    ELSE
        RAISE NOTICE '   ✅ start_date: %', event_record.start_date;
        filled_fields := array_append(filled_fields, 'start_date');
    END IF;
    
    IF event_record.end_date IS NULL THEN
        RAISE NOTICE '   ❌ end_date: NULL (PROBLEMA!)';
        null_fields := array_append(null_fields, 'end_date');
    ELSE
        RAISE NOTICE '   ✅ end_date: %', event_record.end_date;
        filled_fields := array_append(filled_fields, 'end_date');
    END IF;
    
    IF event_record.location IS NULL OR event_record.location = '' THEN
        RAISE NOTICE '   ❌ location: NULL ou vazio';
        null_fields := array_append(null_fields, 'location');
    ELSE
        RAISE NOTICE '   ✅ location: "%"', event_record.location;
        filled_fields := array_append(filled_fields, 'location');
    END IF;
    
    IF event_record.status IS NULL OR event_record.status = '' THEN
        RAISE NOTICE '   ❌ status: NULL ou vazio';
        null_fields := array_append(null_fields, 'status');
    ELSE
        RAISE NOTICE '   ✅ status: "%"', event_record.status;
        filled_fields := array_append(filled_fields, 'status');
    END IF;
    
    IF event_record.category IS NULL OR event_record.category = '' THEN
        RAISE NOTICE '   ❌ category: NULL ou vazio (PROBLEMA!)';
        null_fields := array_append(null_fields, 'category');
    ELSE
        RAISE NOTICE '   ✅ category: "%"', event_record.category;
        filled_fields := array_append(filled_fields, 'category');
    END IF;
    
    IF event_record.price IS NULL THEN
        RAISE NOTICE '   ❌ price: NULL';
        null_fields := array_append(null_fields, 'price');
    ELSE
        RAISE NOTICE '   ✅ price: R$ %', event_record.price;
        filled_fields := array_append(filled_fields, 'price');
    END IF;
    
    -- =====================================================
    -- VERIFICAR CAMPOS OPCIONAIS IMPORTANTES
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '📊 CAMPOS OPCIONAIS IMPORTANTES:';
    
    -- Campos de controle de ingressos
    IF event_record.available_tickets IS NULL THEN
        RAISE NOTICE '   ⚠️ available_tickets: NULL (deveria ser calculado)';
        null_fields := array_append(null_fields, 'available_tickets');
    ELSE
        RAISE NOTICE '   ✅ available_tickets: %', event_record.available_tickets;
        filled_fields := array_append(filled_fields, 'available_tickets');
    END IF;
    
    IF event_record.total_tickets IS NULL THEN
        RAISE NOTICE '   ⚠️ total_tickets: NULL (deveria ser calculado)';
        null_fields := array_append(null_fields, 'total_tickets');
    ELSE
        RAISE NOTICE '   ✅ total_tickets: %', event_record.total_tickets;
        filled_fields := array_append(filled_fields, 'total_tickets');
    END IF;
    
    IF event_record.sold_tickets IS NULL THEN
        RAISE NOTICE '   ⚠️ sold_tickets: NULL (deveria ser 0)';
        null_fields := array_append(null_fields, 'sold_tickets');
    ELSE
        RAISE NOTICE '   ✅ sold_tickets: %', event_record.sold_tickets;
        filled_fields := array_append(filled_fields, 'sold_tickets');
    END IF;
    
    -- Campos de localização detalhada
    IF event_record.location_type IS NULL THEN
        RAISE NOTICE '   ⚠️ location_type: NULL (deveria ter valor)';
        null_fields := array_append(null_fields, 'location_type');
    ELSE
        RAISE NOTICE '   ✅ location_type: "%"', event_record.location_type;
        filled_fields := array_append(filled_fields, 'location_type');
    END IF;
    
    IF event_record.address IS NULL THEN
        RAISE NOTICE '   ⚠️ address: NULL (endereço completo)';
        null_fields := array_append(null_fields, 'address');
    ELSE
        RAISE NOTICE '   ✅ address: "%"', event_record.address;
        filled_fields := array_append(filled_fields, 'address');
    END IF;
    
    -- Campos de metadados da imagem
    IF event_record.banner_metadata IS NULL THEN
        RAISE NOTICE '   ⚠️ banner_metadata: NULL (metadados da imagem)';
        null_fields := array_append(null_fields, 'banner_metadata');
    ELSE
        RAISE NOTICE '   ✅ banner_metadata: %', event_record.banner_metadata;
        filled_fields := array_append(filled_fields, 'banner_metadata');
    END IF;
    
    IF event_record.banner_alt_text IS NULL THEN
        RAISE NOTICE '   ⚠️ banner_alt_text: NULL (texto alternativo)';
        null_fields := array_append(null_fields, 'banner_alt_text');
    ELSE
        RAISE NOTICE '   ✅ banner_alt_text: "%"', event_record.banner_alt_text;
        filled_fields := array_append(filled_fields, 'banner_alt_text');
    END IF;
    
    -- Campos de venda
    IF event_record.ticket_sales_start IS NULL THEN
        RAISE NOTICE '   ⚠️ ticket_sales_start: NULL (início das vendas)';
        null_fields := array_append(null_fields, 'ticket_sales_start');
    ELSE
        RAISE NOTICE '   ✅ ticket_sales_start: %', event_record.ticket_sales_start;
        filled_fields := array_append(filled_fields, 'ticket_sales_start');
    END IF;
    
    -- Tags e categorização
    IF event_record.tags IS NULL THEN
        RAISE NOTICE '   ⚠️ tags: NULL (deveria ter pelo menos categoria)';
        null_fields := array_append(null_fields, 'tags');
    ELSE
        RAISE NOTICE '   ✅ tags: %', event_record.tags;
        filled_fields := array_append(filled_fields, 'tags');
    END IF;
    
    IF event_record.subject IS NULL THEN
        RAISE NOTICE '   ⚠️ subject: NULL (assunto do evento)';
        null_fields := array_append(null_fields, 'subject');
    ELSE
        RAISE NOTICE '   ✅ subject: "%"', event_record.subject;
        filled_fields := array_append(filled_fields, 'subject');
    END IF;
    
    -- =====================================================
    -- RESUMO ESTATÍSTICO
    -- =====================================================
    total_fields := array_length(filled_fields, 1) + array_length(null_fields, 1);
    null_count := array_length(null_fields, 1);
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMO ESTATÍSTICO:';
    RAISE NOTICE '   📈 Total de campos verificados: %', total_fields;
    RAISE NOTICE '   ✅ Campos preenchidos: % (%%)', 
        array_length(filled_fields, 1), 
        ROUND((array_length(filled_fields, 1)::NUMERIC / total_fields * 100), 1);
    RAISE NOTICE '   ❌ Campos NULL: % (%%)', 
        null_count, 
        ROUND((null_count::NUMERIC / total_fields * 100), 1);
    
    -- =====================================================
    -- DIAGNÓSTICO E RECOMENDAÇÕES
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💡 DIAGNÓSTICO:';
    
    IF null_count = 0 THEN
        RAISE NOTICE '   🎉 PERFEITO! Todos os campos importantes estão sendo salvos.';
    ELSIF null_count <= 3 THEN
        RAISE NOTICE '   ⚠️ ATENÇÃO: Alguns campos opcionais estão NULL.';
        RAISE NOTICE '   📝 Campos NULL: %', array_to_string(null_fields, ', ');
    ELSE
        RAISE NOTICE '   🚨 PROBLEMA: Muitos campos estão NULL!';
        RAISE NOTICE '   📝 Campos NULL: %', array_to_string(null_fields, ', ');
        RAISE NOTICE '   💡 Execute as correções no EventFormModal.tsx';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Se há campos NULL importantes, verifique o EventFormModal.tsx';
    RAISE NOTICE '   2. Confirme se os dados do formulário estão sendo capturados';
    RAISE NOTICE '   3. Teste criar um novo evento após as correções';
    RAISE NOTICE '   4. Execute este script novamente para verificar melhorias';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO durante verificação: %', SQLERRM;
END $$;