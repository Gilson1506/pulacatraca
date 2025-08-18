-- =====================================================
-- DEBUG: ESTRUTURA DA TABELA TICKETS
-- =====================================================
-- Este script investiga a estrutura da tabela tickets

DO $$
DECLARE
    tickets_exists boolean := false;
    column_rec record;
BEGIN
    RAISE NOTICE '🔍 INVESTIGANDO ESTRUTURA DA TABELA TICKETS';
    RAISE NOTICE '';
    
    -- Verificar se a tabela tickets existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tickets' AND table_schema = 'public'
    ) INTO tickets_exists;
    
    RAISE NOTICE '📋 Tabela tickets existe: %', tickets_exists;
    
    IF tickets_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '📊 COLUNAS DA TABELA TICKETS:';
        
        FOR column_rec IN 
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'tickets' AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '   - %: % (nullable: %, default: %, max_length: %)', 
                column_rec.column_name, 
                column_rec.data_type, 
                column_rec.is_nullable, 
                COALESCE(column_rec.column_default, 'none'),
                COALESCE(column_rec.character_maximum_length::text, 'none');
        END LOOP;
        
        -- Verificar constraints
        RAISE NOTICE '';
        RAISE NOTICE '🔒 CONSTRAINTS DA TABELA TICKETS:';
        
        FOR column_rec IN 
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            LEFT JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'tickets' AND tc.table_schema = 'public'
            ORDER BY tc.constraint_type, tc.constraint_name
        LOOP
            IF column_rec.foreign_table_name IS NOT NULL THEN
                RAISE NOTICE '   - % (%) on % → %.%', 
                    column_rec.constraint_name,
                    column_rec.constraint_type,
                    column_rec.column_name,
                    column_rec.foreign_table_name,
                    column_rec.foreign_column_name;
            ELSE
                RAISE NOTICE '   - % (%) on %', 
                    column_rec.constraint_name,
                    column_rec.constraint_type,
                    column_rec.column_name;
            END IF;
        END LOOP;
        
        -- Contar registros
        DECLARE
            total_count integer;
            sample_rec record;
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM tickets' INTO total_count;
            RAISE NOTICE '';
            RAISE NOTICE '📊 DADOS DA TABELA TICKETS:';
            RAISE NOTICE '   Total de registros: %', total_count;
            
            IF total_count > 0 THEN
                -- Mostrar alguns exemplos
                RAISE NOTICE '   📋 Exemplo de registros:';
                FOR sample_rec IN 
                    SELECT * FROM tickets 
                    ORDER BY created_at DESC 
                    LIMIT 3
                LOOP
                    RAISE NOTICE '      - ID: %, Event: %, Status: %, Created: %', 
                        sample_rec.id, 
                        sample_rec.event_id, 
                        sample_rec.status, 
                        sample_rec.created_at::date;
                END LOOP;
                
                -- Contar por status
                FOR sample_rec IN 
                    SELECT status, COUNT(*) as count
                    FROM tickets 
                    GROUP BY status 
                    ORDER BY count DESC
                LOOP
                    RAISE NOTICE '      - Status "%": % tickets', sample_rec.status, sample_rec.count;
                END LOOP;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '   ❌ Erro ao contar registros: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ TABELA TICKETS NÃO EXISTE';
        RAISE NOTICE '';
        RAISE NOTICE '💡 POSSÍVEIS SOLUÇÕES:';
        RAISE NOTICE '   1. Executar migration que cria a tabela tickets';
        RAISE NOTICE '   2. Usar apenas a tabela transactions como fallback';
        RAISE NOTICE '   3. Verificar se a tabela tem outro nome';
        
        -- Procurar tabelas similares
        RAISE NOTICE '';
        RAISE NOTICE '🔍 TABELAS SIMILARES ENCONTRADAS:';
        FOR column_rec IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%ticket%'
            ORDER BY table_name
        LOOP
            RAISE NOTICE '   - %', column_rec.table_name;
        END LOOP;
    END IF;
    
    -- Verificar também a tabela transactions
    RAISE NOTICE '';
    RAISE NOTICE '💳 VERIFICANDO TABELA TRANSACTIONS:';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'transactions' AND table_schema = 'public'
    ) INTO tickets_exists; -- reusing variable
    
    RAISE NOTICE '   Tabela transactions existe: %', tickets_exists;
    
    IF tickets_exists THEN
        DECLARE
            trans_count integer;
        BEGIN
            SELECT COUNT(*) INTO trans_count FROM transactions;
            RAISE NOTICE '   Total de transactions: %', trans_count;
            
            IF trans_count > 0 THEN
                -- Verificar se tem event_id
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'event_id') THEN
                    RAISE NOTICE '   ✅ Coluna event_id existe em transactions';
                ELSE
                    RAISE NOTICE '   ❌ Coluna event_id NÃO existe em transactions';
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '   ❌ Erro ao verificar transactions: %', SQLERRM;
        END;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO GERAL: %', SQLERRM;
END $$;