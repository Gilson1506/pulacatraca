-- =====================================================
-- VERIFICAÇÃO E CORREÇÃO DA ESTRUTURA DA TABELA TICKETS
-- =====================================================
-- Execute ANTES do trigger para garantir que todas as colunas existem

-- 1. VERIFICAR E ADICIONAR COLUNAS NECESSÁRIAS
DO $$
BEGIN
    -- Verificar se coluna ticket_type existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'ticket_type'
    ) THEN
        ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'Padrão';
        RAISE NOTICE '✅ Coluna ticket_type adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna ticket_type já existe';
    END IF;

    -- Verificar se coluna status existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'status'
    ) THEN
        ALTER TABLE tickets ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE '✅ Coluna status adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna status já existe';
    END IF;

    -- Verificar se coluna description existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'description'
    ) THEN
        ALTER TABLE tickets ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Coluna description adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna description já existe';
    END IF;

    -- Verificar se coluna event_id existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE tickets ADD COLUMN event_id UUID;
        RAISE NOTICE '✅ Coluna event_id adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna event_id já existe';
    END IF;

    -- Verificar se coluna created_at existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE tickets ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna created_at adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna created_at já existe';
    END IF;

    -- Verificar se coluna updated_at existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE tickets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna updated_at adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna updated_at já existe';
    END IF;

    -- Verificar se coluna price existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'price'
    ) THEN
        ALTER TABLE tickets ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Coluna price adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna price já existe';
    END IF;
END $$;

-- 2. VERIFICAR ESTRUTURA DA TABELA TICKET_USERS
DO $$
BEGIN
    -- Verificar se coluna ticket_id existe em ticket_users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'ticket_id'
    ) THEN
        ALTER TABLE ticket_users ADD COLUMN ticket_id UUID;
        RAISE NOTICE '✅ Coluna ticket_id adicionada em ticket_users';
    ELSE
        RAISE NOTICE '✅ Coluna ticket_id já existe em ticket_users';
    END IF;

    -- Verificar se coluna updated_at existe em ticket_users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE ticket_users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna updated_at adicionada em ticket_users';
    ELSE
        RAISE NOTICE '✅ Coluna updated_at já existe em ticket_users';
    END IF;
END $$;

-- 3. VERIFICAR SE TABELA EVENTS EXISTE E TEM COLUNAS NECESSÁRIAS
DO $$
BEGIN
    -- Verificar se tabela events existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'events'
    ) THEN
        RAISE NOTICE '⚠️  ATENÇÃO: Tabela events não existe! O trigger usará dados padrão.';
    ELSE
        RAISE NOTICE '✅ Tabela events existe';
        
        -- Verificar colunas importantes em events
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' AND column_name = 'ticket_type'
        ) THEN
            RAISE NOTICE '⚠️  Coluna ticket_type não existe em events (não é crítico)';
        END IF;
    END IF;
END $$;

-- 4. MOSTRAR ESTRUTURA ATUAL DAS TABELAS
SELECT 
    'ESTRUTURA_TICKETS' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets'
ORDER BY ordinal_position;

SELECT 
    'ESTRUTURA_TICKET_USERS' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_users'
ORDER BY ordinal_position;

-- 5. CONTAR REGISTROS ATUAIS
SELECT 
    'CONTAGEM_ATUAL' as status,
    (SELECT COUNT(*) FROM ticket_users) as total_ticket_users,
    (SELECT COUNT(*) FROM ticket_users WHERE ticket_id IS NULL) as ticket_users_sem_ticket_id,
    (SELECT COUNT(*) FROM tickets) as total_tickets;

-- =====================================================
-- AGORA VOCÊ PODE EXECUTAR O TRIGGER COM SEGURANÇA
-- =====================================================
RAISE NOTICE '🎯 ESTRUTURA VERIFICADA E CORRIGIDA!';
RAISE NOTICE '📝 Agora execute o arquivo: trigger_auto_create_ticket_corrected.sql';