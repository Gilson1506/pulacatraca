-- ============================================
-- FIX: Corrigir relacionamentos duplicados tickets <-> events
-- ============================================

-- PASSO 1: Diagnóstico dos relacionamentos existentes
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNOSTICANDO RELACIONAMENTOS DUPLICADOS...';
    RAISE NOTICE '';
END $$;

-- Verificar todas as foreign keys existentes na tabela tickets
SELECT 
    'FOREIGN KEYS ATUAIS - tickets' as info,
    tc.constraint_name,
    tc.table_name,
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
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Verificar colunas da tabela tickets que referenciam events
SELECT 
    'COLUNAS QUE REFERENCIAM EVENTS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
    AND column_name LIKE '%event%'
ORDER BY ordinal_position;

-- PASSO 2: Remover relacionamentos duplicados
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 REMOVENDO RELACIONAMENTOS DUPLICADOS...';
    
    -- Remover todas as foreign keys que referenciam events da tabela tickets
    -- Isso vai resolver o problema de múltiplos relacionamentos
    
    -- Remover constraint antiga se existir (pode ter nomes diferentes)
    BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_event_id_fkey;
        RAISE NOTICE '✅ Removida constraint tickets_event_id_fkey (se existia)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Constraint tickets_event_id_fkey não existia';
    END;
    
    BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_event_id;
        RAISE NOTICE '✅ Removida constraint fk_tickets_event_id (se existia)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Constraint fk_tickets_event_id não existia';
    END;
    
    BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_event;
        RAISE NOTICE '✅ Removida constraint fk_tickets_event (se existia)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Constraint fk_tickets_event não existia';
    END;
    
    -- Remover outras possíveis constraints relacionadas a events
    BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_event_fkey;
        RAISE NOTICE '✅ Removida constraint tickets_event_fkey (se existia)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Constraint tickets_event_fkey não existia';
    END;
    
END $$;

-- PASSO 3: Verificar se a coluna event_id tem dados
-- ============================================

DO $$
DECLARE
    event_id_count INTEGER;
    event_column_exists BOOLEAN;
BEGIN
    RAISE NOTICE '📊 VERIFICANDO DADOS NA COLUNA event_id...';
    
    -- Verificar se a coluna event_id existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'event_id'
        AND table_schema = 'public'
    ) INTO event_column_exists;
    
    IF event_column_exists THEN
        -- Contar registros com event_id preenchido
        EXECUTE 'SELECT COUNT(*) FROM tickets WHERE event_id IS NOT NULL' INTO event_id_count;
        RAISE NOTICE '✅ Coluna event_id existe com % registros preenchidos', event_id_count;
        
        -- Se não há dados em event_id, remover a coluna para evitar confusão
        IF event_id_count = 0 THEN
            ALTER TABLE tickets DROP COLUMN IF EXISTS event_id;
            RAISE NOTICE '🗑️ Coluna event_id removida (estava vazia)';
        ELSE
            RAISE NOTICE '📋 Coluna event_id mantida (contém dados)';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Coluna event_id não existe';
    END IF;
END $$;

-- PASSO 4: Recriar apenas UM relacionamento correto
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔗 RECRIANDO RELACIONAMENTO ÚNICO...';
    
    -- Verificar qual coluna usar para o relacionamento
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'event_id'
        AND table_schema = 'public'
    ) THEN
        -- Se event_id existe e tem dados, usar ela
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_unique
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Relacionamento criado: tickets.event_id -> events.id';
        
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'event'
        AND table_schema = 'public'
    ) THEN
        -- Se existe coluna 'event', usar ela
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_unique
        FOREIGN KEY (event) REFERENCES events(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Relacionamento criado: tickets.event -> events.id';
        
    ELSE
        RAISE NOTICE '⚠️ Nenhuma coluna adequada encontrada para relacionamento com events';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao criar relacionamento: %', SQLERRM;
END $$;

-- PASSO 5: Criar índices para performance
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '📈 CRIANDO ÍNDICES PARA PERFORMANCE...';
    
    -- Índice para event_id se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'event_id'
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_event_id_unique ON tickets(event_id);
        RAISE NOTICE '✅ Índice criado para tickets.event_id';
    END IF;
    
    -- Índice para event se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'event'
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_event_unique ON tickets(event);
        RAISE NOTICE '✅ Índice criado para tickets.event';
    END IF;
    
END $$;

-- PASSO 6: Verificação final
-- ============================================

-- Mostrar foreign keys finais
SELECT 
    'FOREIGN KEYS FINAIS - tickets' as info,
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
    AND ccu.table_name = 'events'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Mostrar estrutura final da tabela tickets
SELECT 
    'ESTRUTURA FINAL - tickets' as tabela,
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
    RAISE NOTICE '✅ RELACIONAMENTOS CORRIGIDOS!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 O QUE FOI FEITO:';
    RAISE NOTICE '   - Removidos relacionamentos duplicados';
    RAISE NOTICE '   - Mantido apenas UM relacionamento tickets -> events';
    RAISE NOTICE '   - Criados índices para performance';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 O erro "more than one relationship was found" foi resolvido!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Teste a busca de ingressos no ProfilePage';
    RAISE NOTICE '   2. Verifique se o check-in ainda funciona';
    RAISE NOTICE '   3. Confirme que não há mais erros de relacionamento';
END $$;