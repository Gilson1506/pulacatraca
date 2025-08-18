-- =====================================================
-- DEBUG: DASHBOARD SALES COUNTING ISSUE
-- =====================================================
-- Este script investiga por que os ingressos vendidos estão aparecendo como zero

DO $$
DECLARE
    tickets_table_exists boolean;
    transactions_table_exists boolean;
    sample_organizer_id uuid;
    tickets_count integer := 0;
    transactions_count integer := 0;
    completed_transactions_count integer := 0;
BEGIN
    RAISE NOTICE '🔍 INVESTIGANDO PROBLEMA DOS INGRESSOS VENDIDOS = 0';
    RAISE NOTICE '';
    
    -- =====================================================
    -- STEP 1: VERIFICAR EXISTÊNCIA DAS TABELAS
    -- =====================================================
    RAISE NOTICE '📋 STEP 1: Verificando existência das tabelas...';
    
    -- Verificar se tabela tickets existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tickets' AND table_schema = 'public'
    ) INTO tickets_table_exists;
    
    -- Verificar se tabela transactions existe  
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'transactions' AND table_schema = 'public'
    ) INTO transactions_table_exists;
    
    RAISE NOTICE '   📊 Tabela tickets existe: %', tickets_table_exists;
    RAISE NOTICE '   📊 Tabela transactions existe: %', transactions_table_exists;
    
    -- =====================================================
    -- STEP 2: ANALISAR ESTRUTURA DAS TABELAS
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 2: Analisando estrutura das tabelas...';
    
    IF tickets_table_exists THEN
        RAISE NOTICE '   🎫 ESTRUTURA DA TABELA TICKETS:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'tickets' AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '      - %: % (nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'none');
        END LOOP;
    END IF;
    
    IF transactions_table_exists THEN
        RAISE NOTICE '   💳 ESTRUTURA DA TABELA TRANSACTIONS:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'transactions' AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '      - %: % (nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'none');
        END LOOP;
    END IF;
    
    -- =====================================================
    -- STEP 3: CONTAR DADOS EXISTENTES
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 3: Contando dados existentes...';
    
    -- Pegar um organizador de exemplo
    SELECT id INTO sample_organizer_id 
    FROM profiles 
    WHERE role IN ('organizer', 'admin') 
    LIMIT 1;
    
    IF sample_organizer_id IS NOT NULL THEN
        RAISE NOTICE '   👤 Organizador de exemplo: %', sample_organizer_id;
        
        -- Contar tickets se a tabela existir
        IF tickets_table_exists THEN
            -- Verificar se tickets tem event_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'event_id') THEN
                SELECT COUNT(*) INTO tickets_count
                FROM tickets t
                JOIN events e ON t.event_id = e.id
                WHERE e.organizer_id = sample_organizer_id;
                
                RAISE NOTICE '   🎫 Total de tickets para este organizador: %', tickets_count;
                
                -- Contar por status se existir
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'status') THEN
                    FOR rec IN 
                        SELECT status, COUNT(*) as count
                        FROM tickets t
                        JOIN events e ON t.event_id = e.id
                        WHERE e.organizer_id = sample_organizer_id
                        GROUP BY status
                        ORDER BY count DESC
                    LOOP
                        RAISE NOTICE '      - Status "%" : % tickets', rec.status, rec.count;
                    END LOOP;
                END IF;
            END IF;
        END IF;
        
        -- Contar transactions se a tabela existir
        IF transactions_table_exists THEN
            -- Verificar se transactions tem event_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'event_id') THEN
                SELECT COUNT(*) INTO transactions_count
                FROM transactions t
                JOIN events e ON t.event_id = e.id
                WHERE e.organizer_id = sample_organizer_id;
                
                RAISE NOTICE '   💳 Total de transactions para este organizador: %', transactions_count;
                
                -- Contar transactions completed
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
                    SELECT COUNT(*) INTO completed_transactions_count
                    FROM transactions t
                    JOIN events e ON t.event_id = e.id
                    WHERE e.organizer_id = sample_organizer_id
                    AND t.status = 'completed';
                    
                    RAISE NOTICE '   ✅ Transactions COMPLETED: %', completed_transactions_count;
                    
                    -- Mostrar todos os status
                    FOR rec IN 
                        SELECT status, COUNT(*) as count
                        FROM transactions t
                        JOIN events e ON t.event_id = e.id
                        WHERE e.organizer_id = sample_organizer_id
                        GROUP BY status
                        ORDER BY count DESC
                    LOOP
                        RAISE NOTICE '      - Status "%" : % transactions', rec.status, rec.count;
                    END LOOP;
                END IF;
            ELSE
                -- Transactions sem event_id
                SELECT COUNT(*) INTO transactions_count
                FROM transactions;
                RAISE NOTICE '   💳 Total de transactions (sem filtro por organizador): %', transactions_count;
            END IF;
        END IF;
        
    ELSE
        RAISE NOTICE '   ❌ Nenhum organizador encontrado na tabela profiles';
    END IF;
    
    -- =====================================================
    -- STEP 4: VERIFICAR QUERY DO DASHBOARD
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 4: Testando query do dashboard...';
    
    IF sample_organizer_id IS NOT NULL AND transactions_table_exists THEN
        -- Simular a query do dashboard
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'event_id') THEN
            BEGIN
                FOR rec IN
                    SELECT 
                        COUNT(*) as total_transactions,
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue
                    FROM transactions t
                    JOIN events e ON t.event_id = e.id
                    WHERE e.organizer_id = sample_organizer_id
                LOOP
                    RAISE NOTICE '   📊 RESULTADO DA QUERY DO DASHBOARD:';
                    RAISE NOTICE '      - Total transactions: %', rec.total_transactions;
                    RAISE NOTICE '      - Completed (ingressos vendidos): %', rec.completed_transactions;
                    RAISE NOTICE '      - Pending: %', rec.pending_transactions;
                    RAISE NOTICE '      - Revenue: %', rec.total_revenue;
                END LOOP;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '   ❌ Erro ao executar query do dashboard: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    -- =====================================================
    -- STEP 5: DIAGNÓSTICO E RECOMENDAÇÕES
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '💡 DIAGNÓSTICO:';
    
    IF NOT transactions_table_exists THEN
        RAISE NOTICE '   🚨 PROBLEMA CRÍTICO: Tabela transactions não existe!';
        RAISE NOTICE '   💡 SOLUÇÃO: Execute o script supabase_transactions_table.sql';
    ELSIF completed_transactions_count = 0 THEN
        RAISE NOTICE '   ⚠️ PROBLEMA: Não há transactions com status "completed"';
        RAISE NOTICE '   💡 POSSÍVEIS CAUSAS:';
        RAISE NOTICE '      1. Nenhuma venda foi processada ainda';
        RAISE NOTICE '      2. Status está diferente de "completed" (ex: "confirmed", "paid", etc.)';
        RAISE NOTICE '      3. Problema na integração com Stripe/pagamento';
        RAISE NOTICE '   💡 SOLUÇÃO: Verificar o fluxo de pagamento e status das transactions';
    ELSIF transactions_count > 0 AND completed_transactions_count > 0 THEN
        RAISE NOTICE '   ✅ Dados existem! Problema pode estar no frontend';
        RAISE NOTICE '   💡 VERIFICAR:';
        RAISE NOTICE '      1. Se o organizador logado tem eventos';
        RAISE NOTICE '      2. Se a query no React está correta';
        RAISE NOTICE '      3. Se há erro de autenticação/RLS';
    ELSE
        RAISE NOTICE '   🤔 Situação não identificada. Verificar logs do console do navegador';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Verificar console do navegador para erros';
    RAISE NOTICE '   2. Testar query manualmente no SQL Editor';
    RAISE NOTICE '   3. Verificar se o usuário logado é organizador';
    RAISE NOTICE '   4. Verificar políticas RLS das tabelas';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO DURANTE INVESTIGAÇÃO: %', SQLERRM;
END $$;