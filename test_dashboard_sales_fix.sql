-- =====================================================
-- TESTE: CORREÇÃO DO DASHBOARD DE VENDAS
-- =====================================================
-- Execute este script para testar qual tabela contém os dados de vendas

DO $$
DECLARE
    test_organizer_id uuid;
    events_count integer := 0;
    ticket_purchases_count integer := 0;
    tickets_count integer := 0;
    transactions_count integer := 0;
BEGIN
    RAISE NOTICE '🧪 TESTANDO CORREÇÃO DO DASHBOARD DE VENDAS';
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
    -- TESTE 1: EVENTOS DO ORGANIZADOR
    -- =====================================================
    SELECT COUNT(*) INTO events_count
    FROM events 
    WHERE organizer_id = test_organizer_id;
    
    RAISE NOTICE '📅 EVENTOS:';
    RAISE NOTICE '   Total de eventos: %', events_count;
    
    IF events_count > 0 THEN
        FOR rec IN 
            SELECT id, title, status, created_at
            FROM events 
            WHERE organizer_id = test_organizer_id
            ORDER BY created_at DESC
            LIMIT 3
        LOOP
            RAISE NOTICE '   - % (%) - %', rec.title, rec.status, rec.created_at::date;
        END LOOP;
    END IF;
    
    -- =====================================================
    -- TESTE 2: TICKET_PURCHASES
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '🎫 TICKET_PURCHASES:';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_purchases') THEN
        SELECT COUNT(*) INTO ticket_purchases_count
        FROM ticket_purchases tp
        JOIN events e ON tp.event_id = e.id
        WHERE e.organizer_id = test_organizer_id;
        
        RAISE NOTICE '   Total de ticket_purchases: %', ticket_purchases_count;
        
        IF ticket_purchases_count > 0 THEN
            FOR rec IN 
                SELECT tp.status, COUNT(*) as count, SUM(tp.quantity) as total_tickets
                FROM ticket_purchases tp
                JOIN events e ON tp.event_id = e.id
                WHERE e.organizer_id = test_organizer_id
                GROUP BY tp.status
                ORDER BY count DESC
            LOOP
                RAISE NOTICE '   - Status "%": % compras, % ingressos', rec.status, rec.count, rec.total_tickets;
            END LOOP;
        END IF;
    ELSE
        RAISE NOTICE '   ❌ Tabela ticket_purchases não existe';
    END IF;
    
    -- =====================================================
    -- TESTE 3: TICKETS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '🎟️ TICKETS:';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        SELECT COUNT(*) INTO tickets_count
        FROM tickets t
        JOIN events e ON t.event_id = e.id
        WHERE e.organizer_id = test_organizer_id;
        
        RAISE NOTICE '   Total de tickets: %', tickets_count;
        
        IF tickets_count > 0 THEN
            FOR rec IN 
                SELECT t.status, COUNT(*) as count
                FROM tickets t
                JOIN events e ON t.event_id = e.id
                WHERE e.organizer_id = test_organizer_id
                GROUP BY t.status
                ORDER BY count DESC
            LOOP
                RAISE NOTICE '   - Status "%": % tickets', rec.status, rec.count;
            END LOOP;
        END IF;
    ELSE
        RAISE NOTICE '   ❌ Tabela tickets não existe';
    END IF;
    
    -- =====================================================
    -- TESTE 4: TRANSACTIONS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💳 TRANSACTIONS:';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        -- Verificar se tem event_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'event_id') THEN
            SELECT COUNT(*) INTO transactions_count
            FROM transactions t
            JOIN events e ON t.event_id = e.id
            WHERE e.organizer_id = test_organizer_id;
            
            RAISE NOTICE '   Total de transactions: %', transactions_count;
            
            IF transactions_count > 0 THEN
                FOR rec IN 
                    SELECT t.status, COUNT(*) as count, SUM(t.amount) as total_amount
                    FROM transactions t
                    JOIN events e ON t.event_id = e.id
                    WHERE e.organizer_id = test_organizer_id
                    GROUP BY t.status
                    ORDER BY count DESC
                LOOP
                    RAISE NOTICE '   - Status "%": % transactions, R$ %', rec.status, rec.count, (rec.total_amount::decimal / 100);
                END LOOP;
            END IF;
        ELSE
            SELECT COUNT(*) INTO transactions_count FROM transactions;
            RAISE NOTICE '   Total de transactions (sem event_id): %', transactions_count;
        END IF;
    ELSE
        RAISE NOTICE '   ❌ Tabela transactions não existe';
    END IF;
    
    -- =====================================================
    -- DIAGNÓSTICO FINAL
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💡 DIAGNÓSTICO:';
    
    IF events_count = 0 THEN
        RAISE NOTICE '   🚨 PROBLEMA: Organizador não tem eventos criados';
        RAISE NOTICE '   💡 SOLUÇÃO: Crie pelo menos um evento para testar';
    ELSIF ticket_purchases_count > 0 THEN
        RAISE NOTICE '   ✅ MELHOR OPÇÃO: Usar tabela ticket_purchases';
        RAISE NOTICE '   📊 Esta tabela tem % compras de ingressos', ticket_purchases_count;
    ELSIF tickets_count > 0 THEN
        RAISE NOTICE '   ✅ OPÇÃO ALTERNATIVA: Usar tabela tickets';
        RAISE NOTICE '   📊 Esta tabela tem % ingressos individuais', tickets_count;
    ELSIF transactions_count > 0 THEN
        RAISE NOTICE '   ⚠️ FALLBACK: Usar tabela transactions';
        RAISE NOTICE '   📊 Esta tabela tem % transações', transactions_count;
    ELSE
        RAISE NOTICE '   🚨 PROBLEMA: Nenhuma venda encontrada em nenhuma tabela';
        RAISE NOTICE '   💡 SOLUÇÃO: Verifique se o sistema de pagamento está funcionando';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Teste o dashboard atualizado no navegador';
    RAISE NOTICE '   2. Verifique os logs no console do navegador';
    RAISE NOTICE '   3. Se ainda mostrar zero, verifique se há dados de teste';
    RAISE NOTICE '   4. Confirme se o usuário logado é o mesmo organizador testado aqui';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO DURANTE TESTE: %', SQLERRM;
END $$;