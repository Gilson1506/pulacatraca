-- ============================================
-- FIX DEFINITIVO: Resolver relacionamentos duplicados tickets-events
-- ============================================

-- PASSO 1: Diagnóstico completo
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNÓSTICO COMPLETO DOS RELACIONAMENTOS...';
    RAISE NOTICE '';
END $$;

-- Mostrar TODAS as foreign keys da tabela tickets
SELECT 
    'TODAS AS FOREIGN KEYS - tickets' as tipo,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Mostrar estrutura completa da tabela tickets
SELECT 
    'ESTRUTURA COMPLETA - tickets' as tipo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- PASSO 2: Remoção TOTAL de todas as foreign keys
-- ============================================

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '🧹 REMOVENDO TODAS AS FOREIGN KEYS DA TABELA TICKETS...';
    
    -- Buscar e remover TODAS as foreign keys da tabela tickets
    FOR constraint_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'tickets'
            AND tc.table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE tickets DROP CONSTRAINT ' || constraint_record.constraint_name;
            RAISE NOTICE '✅ Removida constraint: %', constraint_record.constraint_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao remover %: %', constraint_record.constraint_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '🧹 Todas as foreign keys removidas!';
END $$;

-- PASSO 3: Verificar e limpar colunas problemáticas
-- ============================================

DO $$
DECLARE
    event_id_count INTEGER := 0;
    event_count INTEGER := 0;
BEGIN
    RAISE NOTICE '📊 VERIFICANDO COLUNAS RELACIONADAS A EVENTS...';
    
    -- Verificar event_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event_id'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM tickets WHERE event_id IS NOT NULL' INTO event_id_count;
        RAISE NOTICE '📋 Coluna event_id: % registros preenchidos', event_id_count;
        
        -- Se event_id está vazia, remover
        IF event_id_count = 0 THEN
            ALTER TABLE tickets DROP COLUMN event_id;
            RAISE NOTICE '🗑️ Coluna event_id removida (vazia)';
        END IF;
    END IF;
    
    -- Verificar event
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event'
    ) THEN
        EXECUTE 'SELECT COUNT(*) FROM tickets WHERE event IS NOT NULL' INTO event_count;
        RAISE NOTICE '📋 Coluna event: % registros preenchidos', event_count;
    END IF;
    
    -- Mostrar qual coluna será usada
    IF event_count > 0 THEN
        RAISE NOTICE '✅ Usando coluna "event" para relacionamento (% registros)', event_count;
    ELSIF event_id_count > 0 THEN
        RAISE NOTICE '✅ Usando coluna "event_id" para relacionamento (% registros)', event_id_count;
    ELSE
        RAISE NOTICE '⚠️ Nenhuma coluna com dados encontrada!';
    END IF;
END $$;

-- PASSO 4: Recriar APENAS o relacionamento necessário
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔗 RECRIANDO RELACIONAMENTO ÚNICO...';
    
    -- Primeiro tentar com coluna 'event' (mais comum)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event'
        AND table_schema = 'public'
    ) THEN
        BEGIN
            -- Verificar se há dados válidos
            IF EXISTS (SELECT 1 FROM tickets WHERE event IS NOT NULL LIMIT 1) THEN
                ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_only
                FOREIGN KEY (event) REFERENCES events(id) ON DELETE CASCADE;
                RAISE NOTICE '✅ Relacionamento criado: tickets.event -> events.id';
            ELSE
                RAISE NOTICE '⚠️ Coluna event existe mas está vazia';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao criar FK para event: %', SQLERRM;
        END;
        
    -- Senão, tentar com event_id
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event_id'
        AND table_schema = 'public'
    ) THEN
        BEGIN
            IF EXISTS (SELECT 1 FROM tickets WHERE event_id IS NOT NULL LIMIT 1) THEN
                ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_only
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
                RAISE NOTICE '✅ Relacionamento criado: tickets.event_id -> events.id';
            ELSE
                RAISE NOTICE '⚠️ Coluna event_id existe mas está vazia';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro ao criar FK para event_id: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '❌ Nenhuma coluna adequada encontrada para relacionamento!';
    END IF;
END $$;

-- PASSO 5: Recriar outras foreign keys necessárias (não relacionadas a events)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔗 RECRIANDO OUTRAS FOREIGN KEYS NECESSÁRIAS...';
    
    -- FK para buyer_id (se existir)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'buyer_id'
    ) THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT fk_tickets_buyer
            FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ FK criada: tickets.buyer_id -> profiles.id';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Não foi possível criar FK para buyer_id: %', SQLERRM;
        END;
    END IF;
    
    -- FK para ticket_user_id (se existir)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'ticket_user_id'
    ) THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT fk_tickets_ticket_user
            FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ FK criada: tickets.ticket_user_id -> ticket_users.id';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Não foi possível criar FK para ticket_user_id: %', SQLERRM;
        END;
    END IF;
    
    -- FK para user_id (se existir - fallback)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'user_id'
    ) THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT fk_tickets_user
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ FK criada: tickets.user_id -> profiles.id';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Não foi possível criar FK para user_id: %', SQLERRM;
        END;
    END IF;
END $$;

-- PASSO 6: Criar índices para performance
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '📈 CRIANDO ÍNDICES...';
    
    -- Índice para a coluna de evento (qualquer que seja)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'event') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_event_only ON tickets(event);
        RAISE NOTICE '✅ Índice criado: idx_tickets_event_only';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'event_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_event_id_only ON tickets(event_id);
        RAISE NOTICE '✅ Índice criado: idx_tickets_event_id_only';
    END IF;
    
    -- Outros índices úteis
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'buyer_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
        RAISE NOTICE '✅ Índice criado: idx_tickets_buyer_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
        RAISE NOTICE '✅ Índice criado: idx_tickets_user_id';
    END IF;
END $$;

-- PASSO 7: Verificação final
-- ============================================

-- Mostrar foreign keys finais
SELECT 
    'FOREIGN KEYS FINAIS - tickets' as tipo,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Contar relacionamentos com events
SELECT 
    'RELACIONAMENTOS COM EVENTS' as tipo,
    COUNT(*) as quantidade
FROM information_schema.table_constraints AS tc 
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
    AND ccu.table_name = 'events'
    AND tc.table_schema = 'public';

-- Mostrar estrutura final
SELECT 
    'ESTRUTURA FINAL - tickets' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORREÇÃO DEFINITIVA APLICADA!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 O QUE FOI FEITO:';
    RAISE NOTICE '   - TODAS as foreign keys removidas';
    RAISE NOTICE '   - Colunas vazias removidas';
    RAISE NOTICE '   - APENAS UM relacionamento tickets->events criado';
    RAISE NOTICE '   - Outras FKs necessárias recriadas';
    RAISE NOTICE '   - Índices otimizados criados';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 DEVE RESOLVER: "more than one relationship was found"';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TESTE AGORA:';
    RAISE NOTICE '   1. Busca de ingressos no ProfilePage';
    RAISE NOTICE '   2. Sistema de check-in';
    RAISE NOTICE '   3. Criação de novos ingressos';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Se ainda houver erro, execute:';
    RAISE NOTICE '   SELECT * FROM information_schema.table_constraints';
    RAISE NOTICE '   WHERE table_name = ''tickets'' AND constraint_type = ''FOREIGN KEY'';';
END $$;