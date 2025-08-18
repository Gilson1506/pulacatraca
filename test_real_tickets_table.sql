-- =====================================================
-- TESTE: ESTRUTURA REAL DA TABELA TICKETS
-- =====================================================
-- Este script testa com a estrutura real da tabela tickets

DO $$
DECLARE
    test_organizer_id uuid;
    events_count integer := 0;
    tickets_count integer := 0;
    event_ids uuid[];
    total_revenue decimal := 0;
BEGIN
    RAISE NOTICE '🎫 TESTANDO COM ESTRUTURA REAL DA TABELA TICKETS';
    RAISE NOTICE '';
    
    -- Buscar um organizador de exemplo
    SELECT id INTO test_organizer_id 
    FROM profiles 
    WHERE role IN ('organizer', 'admin') 
    LIMIT 1;
    
    IF test_organizer_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum organizador encontrado.';
        RETURN;
    END IF;
    
    RAISE NOTICE '👤 Testando com organizador: %', test_organizer_id;
    RAISE NOTICE '';
    
    -- =====================================================
    -- STEP 1: EVENTOS DO ORGANIZADOR
    -- =====================================================
    RAISE NOTICE '📅 STEP 1: Eventos do organizador...';
    
    SELECT COUNT(*) INTO events_count
    FROM events 
    WHERE organizer_id = test_organizer_id;
    
    SELECT ARRAY_AGG(id) INTO event_ids
    FROM events 
    WHERE organizer_id = test_organizer_id;
    
    RAISE NOTICE '   Total de eventos: %', events_count;
    
    IF events_count = 0 THEN
        RAISE NOTICE '   ⚠️ Organizador não tem eventos';
        RETURN;
    END IF;
    
    -- Mostrar eventos
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
    -- STEP 2: TICKETS PARA ESSES EVENTOS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '🎫 STEP 2: Tickets para esses eventos...';
    
    SELECT COUNT(*) INTO tickets_count
    FROM tickets 
    WHERE event_id = ANY(event_ids);
    
    RAISE NOTICE '   Total de tickets: %', tickets_count;
    
    IF tickets_count > 0 THEN
        -- Tickets por status
        FOR rec IN 
            SELECT status, COUNT(*) as count
            FROM tickets 
            WHERE event_id = ANY(event_ids)
            GROUP BY status
            ORDER BY count DESC
        LOOP
            RAISE NOTICE '   - Status "%": % tickets', rec.status, rec.count;
        END LOOP;
        
        -- Receita total usando preço dos tickets
        SELECT COALESCE(SUM(price), 0) INTO total_revenue
        FROM tickets
        WHERE event_id = ANY(event_ids);
        
        RAISE NOTICE '   💰 Receita total (preços dos tickets): R$ %', total_revenue;
        
        -- Receita alternativa usando preço dos eventos
        SELECT COALESCE(SUM(e.price), 0) INTO total_revenue
        FROM tickets t
        JOIN events e ON t.event_id = e.id
        WHERE t.event_id = ANY(event_ids);
        
        RAISE NOTICE '   💰 Receita alternativa (preços dos eventos): R$ %', total_revenue;
        
        -- Análise detalhada dos campos importantes
        RAISE NOTICE '';
        RAISE NOTICE '   📋 ANÁLISE DOS CAMPOS DOS TICKETS:';
        
        -- Verificar campos de usuário
        FOR rec IN 
            SELECT 
                COUNT(*) as total,
                COUNT(buyer_id) as with_buyer_id,
                COUNT(user_id) as with_user_id,
                COUNT(assigned_user_id) as with_assigned_user_id,
                COUNT(assigned_user_name) as with_assigned_name,
                COUNT(assigned_user_email) as with_assigned_email
            FROM tickets 
            WHERE event_id = ANY(event_ids)
        LOOP
            RAISE NOTICE '      - Total tickets: %', rec.total;
            RAISE NOTICE '      - Com buyer_id: % (%%)', rec.with_buyer_id, ROUND((rec.with_buyer_id::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com user_id: % (%%)', rec.with_user_id, ROUND((rec.with_user_id::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com assigned_user_id: % (%%)', rec.with_assigned_user_id, ROUND((rec.with_assigned_user_id::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com assigned_user_name: % (%%)', rec.with_assigned_name, ROUND((rec.with_assigned_name::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com assigned_user_email: % (%%)', rec.with_assigned_email, ROUND((rec.with_assigned_email::decimal / rec.total * 100), 1);
        END LOOP;
        
        -- Verificar campos de preço
        FOR rec IN 
            SELECT 
                COUNT(*) as total,
                COUNT(price) as with_price,
                COUNT(original_price) as with_original_price,
                COUNT(price_feminine) as with_price_feminine,
                AVG(price) as avg_price
            FROM tickets 
            WHERE event_id = ANY(event_ids)
        LOOP
            RAISE NOTICE '      - Com price: % (%%)', rec.with_price, ROUND((rec.with_price::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com original_price: % (%%)', rec.with_original_price, ROUND((rec.with_original_price::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com price_feminine: % (%%)', rec.with_price_feminine, ROUND((rec.with_price_feminine::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Preço médio: R$ %', COALESCE(rec.avg_price, 0);
        END LOOP;
        
        -- Verificar campos de código/QR
        FOR rec IN 
            SELECT 
                COUNT(*) as total,
                COUNT(qr_code) as with_qr_code,
                COUNT(code) as with_code,
                COUNT(ticket_type) as with_ticket_type,
                COUNT(ticket_type_name) as with_ticket_type_name
            FROM tickets 
            WHERE event_id = ANY(event_ids)
        LOOP
            RAISE NOTICE '      - Com qr_code: % (%%)', rec.with_qr_code, ROUND((rec.with_qr_code::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com code: % (%%)', rec.with_code, ROUND((rec.with_code::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com ticket_type: % (%%)', rec.with_ticket_type, ROUND((rec.with_ticket_type::decimal / rec.total * 100), 1);
            RAISE NOTICE '      - Com ticket_type_name: % (%%)', rec.with_ticket_type_name, ROUND((rec.with_ticket_type_name::decimal / rec.total * 100), 1);
        END LOOP;
        
        -- Mostrar exemplos de tickets
        RAISE NOTICE '';
        RAISE NOTICE '   📋 EXEMPLOS DE TICKETS:';
        FOR rec IN 
            SELECT 
                id,
                status,
                price,
                qr_code,
                ticket_type_name,
                assigned_user_name,
                purchase_date::date,
                is_used
            FROM tickets 
            WHERE event_id = ANY(event_ids)
            ORDER BY purchase_date DESC 
            LIMIT 3
        LOOP
            RAISE NOTICE '      - ID: %, Status: %, Preço: R$ %, Tipo: %, Usuário: %, Data: %, Usado: %', 
                rec.id, rec.status, rec.price, rec.ticket_type_name, 
                COALESCE(rec.assigned_user_name, 'N/A'), rec.purchase_date, rec.is_used;
        END LOOP;
        
    ELSE
        RAISE NOTICE '   ⚠️ Nenhum ticket encontrado para os eventos deste organizador';
    END IF;
    
    -- =====================================================
    -- DIAGNÓSTICO FINAL
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💡 DIAGNÓSTICO PARA A PÁGINA DE VENDAS:';
    
    IF events_count = 0 THEN
        RAISE NOTICE '   🚨 PROBLEMA: Organizador não tem eventos';
    ELSIF tickets_count = 0 THEN
        RAISE NOTICE '   ⚠️ PROBLEMA: Eventos existem mas não há tickets vendidos';
        RAISE NOTICE '   💡 POSSÍVEL CAUSA: Sistema de vendas não está criando tickets';
    ELSE
        RAISE NOTICE '   ✅ DADOS ENCONTRADOS! A página deve funcionar';
        RAISE NOTICE '   📊 Resumo para o frontend:';
        RAISE NOTICE '      - Ingressos vendidos: %', tickets_count;
        RAISE NOTICE '      - Receita total: R$ %', total_revenue;
        RAISE NOTICE '      - Eventos com vendas: %', events_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CAMPOS RECOMENDADOS PARA O FRONTEND:';
    RAISE NOTICE '   - Usuário: assigned_user_name (fallback: buyer via FK)';
    RAISE NOTICE '   - Email: assigned_user_email (fallback: buyer via FK)';
    RAISE NOTICE '   - Código: qr_code (principal) ou code (alternativo)';
    RAISE NOTICE '   - Preço: price (do ticket) ou event.price (fallback)';
    RAISE NOTICE '   - Tipo: ticket_type_name ou ticket_type';
    RAISE NOTICE '   - Data: purchase_date ou created_at';
    RAISE NOTICE '   - Status: status (active, used, cancelled, transferred)';
    RAISE NOTICE '   - Usado: is_used ou used ou status === "used"';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO DURANTE TESTE: %', SQLERRM;
END $$;