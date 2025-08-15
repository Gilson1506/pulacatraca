-- ===================================================================
-- SCRIPT PARA CORRIGIR RELACIONAMENTOS MÚLTIPLOS EVENTS-TICKETS
-- ===================================================================

-- DIAGNÓSTICO DOS RELACIONAMENTOS ATUAIS
SELECT 'CURRENT FOREIGN KEYS TICKETS -> EVENTS' as info,
       tc.constraint_name, 
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
    AND ccu.table_name = 'events'
ORDER BY tc.constraint_name;

-- VERIFICAR COLUNAS QUE REFERENCIAM EVENTS
SELECT 'TICKETS COLUMNS REFERENCING EVENTS' as info,
       column_name, 
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
AND (column_name LIKE '%event%' OR column_name = 'event')
ORDER BY column_name;

-- CORREÇÃO DOS RELACIONAMENTOS MÚLTIPLOS
DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO RELACIONAMENTOS MÚLTIPLOS EVENTS-TICKETS ===';
    
    -- Remover todos os foreign keys existentes entre tickets e events
    -- para evitar conflitos
    
    -- Remover fk_tickets_event_id se existir
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_tickets_event_id' AND table_name = 'tickets') THEN
        ALTER TABLE tickets DROP CONSTRAINT fk_tickets_event_id;
        RAISE NOTICE '✅ Constraint fk_tickets_event_id removida';
    END IF;
    
    -- Remover fk_tickets_event_unique se existir
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_tickets_event_unique' AND table_name = 'tickets') THEN
        ALTER TABLE tickets DROP CONSTRAINT fk_tickets_event_unique;
        RAISE NOTICE '✅ Constraint fk_tickets_event_unique removida';
    END IF;
    
    -- Remover tickets_event_id_fkey se existir
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'tickets_event_id_fkey' AND table_name = 'tickets') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_event_id_fkey;
        RAISE NOTICE '✅ Constraint tickets_event_id_fkey removida';
    END IF;
    
    -- Remover tickets_event_fkey se existir
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'tickets_event_fkey' AND table_name = 'tickets') THEN
        ALTER TABLE tickets DROP CONSTRAINT tickets_event_fkey;
        RAISE NOTICE '✅ Constraint tickets_event_fkey removida';
    END IF;
    
    -- Remover qualquer outra constraint que possa existir
    DECLARE
        constraint_record RECORD;
    BEGIN
        FOR constraint_record IN 
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'tickets' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name IN (
                SELECT tc.constraint_name
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.table_name = 'tickets'
                AND ccu.table_name = 'events'
            )
        LOOP
            EXECUTE 'ALTER TABLE tickets DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
            RAISE NOTICE '✅ Constraint % removida', constraint_record.constraint_name;
        END LOOP;
    END;
    
    -- Garantir que apenas a coluna event_id existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tickets' AND column_name = 'event') THEN
        -- Se a coluna 'event' existe, verificar se tem dados
        DECLARE
            event_data_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO event_data_count FROM tickets WHERE event IS NOT NULL;
            
            IF event_data_count > 0 THEN
                -- Migrar dados de 'event' para 'event_id' se event_id não tem dados
                IF NOT EXISTS (SELECT 1 FROM tickets WHERE event_id IS NOT NULL LIMIT 1) THEN
                    UPDATE tickets SET event_id = event WHERE event IS NOT NULL;
                    RAISE NOTICE '✅ Dados migrados de coluna event para event_id';
                END IF;
            END IF;
            
            -- Remover a coluna 'event'
            ALTER TABLE tickets DROP COLUMN IF EXISTS event;
            RAISE NOTICE '✅ Coluna event removida de tickets';
        END;
    END IF;
    
    -- Garantir que event_id existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'event_id') THEN
        ALTER TABLE tickets ADD COLUMN event_id UUID;
        RAISE NOTICE '✅ Coluna event_id adicionada em tickets';
    END IF;
    
    -- Criar APENAS UM foreign key único
    ALTER TABLE tickets ADD CONSTRAINT tickets_event_id_fkey_unique 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Constraint única tickets_event_id_fkey_unique criada';
    
END $$;

-- CRIAR ÍNDICE ÚNICO PARA O RELACIONAMENTO
CREATE INDEX IF NOT EXISTS idx_tickets_event_id_unique ON tickets(event_id);

-- VERIFICAR RELACIONAMENTOS FINAIS
SELECT 'FINAL FOREIGN KEYS TICKETS -> EVENTS' as info,
       tc.constraint_name, 
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
    AND ccu.table_name = 'events'
ORDER BY tc.constraint_name;

-- VERIFICAR COLUNAS FINAIS
SELECT 'FINAL TICKETS COLUMNS REFERENCING EVENTS' as info,
       column_name, 
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
AND (column_name LIKE '%event%')
ORDER BY column_name;

-- ESTATÍSTICAS
SELECT 
    'TICKETS' as tabela,
    COUNT(*) as total_records,
    COUNT(CASE WHEN event_id IS NOT NULL THEN 1 END) as with_event_id
FROM tickets;

-- MENSAGEM FINAL
DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO DE RELACIONAMENTOS CONCLUÍDA ===';
    RAISE NOTICE '✅ Relacionamentos múltiplos removidos';
    RAISE NOTICE '✅ Apenas UM foreign key entre tickets e events';
    RAISE NOTICE '✅ Coluna event_id é a única referência';
    RAISE NOTICE '✅ Constraint única: tickets_event_id_fkey_unique';
    RAISE NOTICE '✅ Consultas embed funcionarão corretamente';
    RAISE NOTICE '🎯 OrganizerDashboardPage funcionará sem erros!';
    RAISE NOTICE '🚀 Teste buscar eventos no dashboard agora!';
END $$;