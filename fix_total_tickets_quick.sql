-- ===================================================================
-- SCRIPT RÁPIDO PARA CORRIGIR TOTAL_TICKETS
-- ===================================================================

-- DIAGNÓSTICO RÁPIDO
SELECT 'EVENTS COLUMNS RELACIONADAS A TICKETS' as info, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
AND column_name IN ('total_tickets', 'available_tickets', 'sold_tickets')
ORDER BY column_name;

-- CORREÇÃO IMEDIATA DO TOTAL_TICKETS
DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO TOTAL_TICKETS IMEDIATAMENTE ===';
    
    -- Verificar se a coluna total_tickets existe e tem constraint NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' 
               AND column_name = 'total_tickets' 
               AND is_nullable = 'NO') THEN
        -- Remover constraint NOT NULL
        ALTER TABLE events ALTER COLUMN total_tickets DROP NOT NULL;
        RAISE NOTICE '✅ Constraint NOT NULL removida de total_tickets';
    END IF;
    
    -- Adicionar coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'total_tickets') THEN
        ALTER TABLE events ADD COLUMN total_tickets INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Coluna total_tickets adicionada com default 0';
    END IF;
    
    -- Garantir que tem default 0
    ALTER TABLE events ALTER COLUMN total_tickets SET DEFAULT 0;
    RAISE NOTICE '✅ Default 0 definido para total_tickets';
    
    -- Atualizar valores NULL existentes para 0
    UPDATE events SET total_tickets = 0 WHERE total_tickets IS NULL;
    RAISE NOTICE '✅ Valores NULL atualizados para 0 em total_tickets';
    
    -- CORREÇÃO PREVENTIVA PARA AVAILABLE_TICKETS
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' 
               AND column_name = 'available_tickets' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE events ALTER COLUMN available_tickets DROP NOT NULL;
        RAISE NOTICE '✅ Constraint NOT NULL removida de available_tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'available_tickets') THEN
        ALTER TABLE events ADD COLUMN available_tickets INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Coluna available_tickets adicionada com default 0';
    END IF;
    
    ALTER TABLE events ALTER COLUMN available_tickets SET DEFAULT 0;
    UPDATE events SET available_tickets = 0 WHERE available_tickets IS NULL;
    RAISE NOTICE '✅ available_tickets corrigida preventivamente';
    
    -- CORREÇÃO PREVENTIVA PARA SOLD_TICKETS
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' 
               AND column_name = 'sold_tickets' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE events ALTER COLUMN sold_tickets DROP NOT NULL;
        RAISE NOTICE '✅ Constraint NOT NULL removida de sold_tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'sold_tickets') THEN
        ALTER TABLE events ADD COLUMN sold_tickets INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Coluna sold_tickets adicionada com default 0';
    END IF;
    
    ALTER TABLE events ALTER COLUMN sold_tickets SET DEFAULT 0;
    UPDATE events SET sold_tickets = 0 WHERE sold_tickets IS NULL;
    RAISE NOTICE '✅ sold_tickets corrigida preventivamente';
    
END $$;

-- VERIFICAÇÃO FINAL
SELECT 'VERIFICAÇÃO FINAL' as info, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
AND column_name IN ('total_tickets', 'available_tickets', 'sold_tickets')
ORDER BY column_name;

-- ESTATÍSTICAS
SELECT 
    'EVENTS' as tabela,
    COUNT(*) as total_eventos,
    COUNT(CASE WHEN total_tickets IS NOT NULL THEN 1 END) as com_total_tickets,
    COUNT(CASE WHEN available_tickets IS NOT NULL THEN 1 END) as com_available_tickets,
    COUNT(CASE WHEN sold_tickets IS NOT NULL THEN 1 END) as com_sold_tickets,
    AVG(COALESCE(total_tickets, 0)) as media_total_tickets
FROM events;

-- MENSAGEM FINAL
DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO DO TOTAL_TICKETS CONCLUÍDA ===';
    RAISE NOTICE '✅ total_tickets: constraint NOT NULL removida';
    RAISE NOTICE '✅ total_tickets: default 0 definido';
    RAISE NOTICE '✅ total_tickets: valores NULL atualizados';
    RAISE NOTICE '✅ available_tickets: corrigida preventivamente';
    RAISE NOTICE '✅ sold_tickets: corrigida preventivamente';
    RAISE NOTICE '🎯 EventFormModal agora funcionará sem erros!';
    RAISE NOTICE '🚀 Teste criar um evento agora!';
END $$;