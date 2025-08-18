-- =====================================================
-- TESTE: NOVA ABORDAGEM DE DUAS CONSULTAS DO DASHBOARD
-- =====================================================
-- Este script testa a abordagem corrigida de buscar eventos primeiro, depois tickets

DO $$
DECLARE
    test_organizer_id uuid;
    events_count integer := 0;
    tickets_count integer := 0;
    total_revenue decimal := 0;
    active_events_count integer := 0;
    event_ids uuid[];
BEGIN
    RAISE NOTICE '🧪 TESTANDO NOVA ABORDAGEM DE DUAS CONSULTAS';
    RAISE NOTICE '';
    
    -- Buscar um organizador de exemplo
    SELECT id INTO test_organizer_id 
    FROM profiles 
    WHERE role IN ('organizer', 'admin') 
    LIMIT 1;
    
    IF test_organizer_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum organizador encontrado. Crie um usuário com role organizer primeiro.';
        RETURN;
    END IF;
    
    RAISE NOTICE '👤 Testando com organizador: %', test_organizer_id;
    RAISE NOTICE '';
    
    -- =====================================================
    -- STEP 1: BUSCAR EVENTOS DO ORGANIZADOR
    -- =====================================================
    RAISE NOTICE '📅 STEP 1: Buscando eventos do organizador...';
    
    SELECT COUNT(*) INTO events_count
    FROM events 
    WHERE organizer_id = test_organizer_id;
    
    RAISE NOTICE '   Total de eventos: %', events_count;
    
    IF events_count = 0 THEN
        RAISE NOTICE '   ❌ Organizador não tem eventos. Crie eventos primeiro.';
        RETURN;
    END IF;
    
    -- Coletar IDs dos eventos
    SELECT ARRAY_AGG(id) INTO event_ids
    FROM events 
    WHERE organizer_id = test_organizer_id;
    
    RAISE NOTICE '   Event IDs: %', event_ids;
    
    -- Mostrar detalhes dos eventos
    FOR rec IN 
        SELECT id, title, status, price, created_at::date
        FROM events 
        WHERE organizer_id = test_organizer_id
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '   - % (%) - R$ % - %', rec.title, rec.status, rec.price, rec.created_at;
    END LOOP;
    
    -- =====================================================
    -- STEP 2: BUSCAR TICKETS PARA ESSES EVENTOS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '🎫 STEP 2: Buscando tickets para esses eventos...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        SELECT COUNT(*) INTO tickets_count
        FROM tickets 
        WHERE event_id = ANY(event_ids);
        
        RAISE NOTICE '   Total de tickets: %', tickets_count;
        
        IF tickets_count > 0 THEN
            -- Mostrar tickets por status
            FOR rec IN 
                SELECT status, COUNT(*) as count
                FROM tickets 
                WHERE event_id = ANY(event_ids)
                GROUP BY status
                ORDER BY count DESC
            LOOP
                RAISE NOTICE '   - Status "%": % tickets', rec.status, rec.count;
            END LOOP;
            
            -- Mostrar tickets por evento
            RAISE NOTICE '   📊 Tickets por evento:';
            FOR rec IN 
                SELECT 
                    e.title,
                    COUNT(t.id) as ticket_count,
                    e.price,
                    (COUNT(t.id) * e.price) as revenue
                FROM events e
                LEFT JOIN tickets t ON t.event_id = e.id
                WHERE e.id = ANY(event_ids)
                GROUP BY e.id, e.title, e.price
                ORDER BY ticket_count DESC
            LOOP
                RAISE NOTICE '      - %: % tickets × R$ % = R$ %', 
                    rec.title, rec.ticket_count, rec.price, rec.revenue;
            END LOOP;
        END IF;
    ELSE
        RAISE NOTICE '   ❌ Tabela tickets não existe';
        tickets_count := 0;
    END IF;
    
    -- =====================================================
    -- STEP 3: CALCULAR ESTATÍSTICAS COMO NO DASHBOARD
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '📊 STEP 3: Calculando estatísticas do dashboard...';
    
    -- Receita total baseada nos preços dos eventos
    SELECT COALESCE(SUM(e.price), 0) INTO total_revenue
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.id = ANY(event_ids);
    
    -- Eventos ativos (aprovados)
    SELECT COUNT(*) INTO active_events_count
    FROM events 
    WHERE organizer_id = test_organizer_id 
    AND status = 'approved';
    
    RAISE NOTICE '   💰 Total Revenue: R$ %', total_revenue;
    RAISE NOTICE '   🎫 Total Tickets Sold: %', tickets_count;
    RAISE NOTICE '   ✅ Active Events: %', active_events_count;
    
    -- =====================================================
    -- STEP 4: SIMULAR CONSULTAS DO FRONTEND
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💻 STEP 4: Simulando consultas do frontend...';
    
    RAISE NOTICE '   🔍 Query 1 - Eventos:';
    RAISE NOTICE '      SELECT * FROM events WHERE organizer_id = ''%'' ORDER BY created_at DESC;', test_organizer_id;
    
    RAISE NOTICE '   🔍 Query 2 - Tickets:';
    RAISE NOTICE '      SELECT * FROM tickets WHERE event_id IN (''%'') ORDER BY created_at DESC;', 
        array_to_string(event_ids, ''', ''');
    
    -- =====================================================
    -- DIAGNÓSTICO FINAL
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💡 DIAGNÓSTICO FINAL:';
    
    IF events_count = 0 THEN
        RAISE NOTICE '   🚨 PROBLEMA: Organizador não tem eventos';
        RAISE NOTICE '   💡 SOLUÇÃO: Crie eventos primeiro';
    ELSIF tickets_count = 0 THEN
        RAISE NOTICE '   ⚠️ PROBLEMA: Eventos existem mas não há tickets vendidos';
        RAISE NOTICE '   💡 POSSÍVEIS CAUSAS:';
        RAISE NOTICE '      1. Nenhuma venda foi processada ainda';
        RAISE NOTICE '      2. Sistema de vendas não está criando registros na tabela tickets';
        RAISE NOTICE '      3. Tabela tickets não está sendo populada corretamente';
    ELSIF active_events_count = 0 THEN
        RAISE NOTICE '   ⚠️ PROBLEMA: Há tickets mas nenhum evento aprovado';
        RAISE NOTICE '   💡 SOLUÇÃO: Aprovar pelo menos um evento (status = ''approved'')';
    ELSE
        RAISE NOTICE '   ✅ DADOS CORRETOS ENCONTRADOS!';
        RAISE NOTICE '   📊 O dashboard deve mostrar:';
        RAISE NOTICE '      - Ingressos vendidos: %', tickets_count;
        RAISE NOTICE '      - Receita total: R$ %', total_revenue;
        RAISE NOTICE '      - Eventos ativos: %', active_events_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Recarregue o dashboard do organizador';
    RAISE NOTICE '   2. Abra o console do navegador (F12)';
    RAISE NOTICE '   3. Procure pelos logs: "📊 Dashboard Debug"';
    RAISE NOTICE '   4. Confirme se os números coincidem com este teste';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO DURANTE TESTE: %', SQLERRM;
END $$;