-- ✅ ADICIONAR CAMPO QR_CODE NA TABELA TICKET_USERS
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE '=== ADICIONANDO CAMPO QR_CODE NA TABELA TICKET_USERS ===';
    
    -- 1. Verificar se a tabela ticket_users existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ticket_users'
    ) THEN
        RAISE EXCEPTION 'Tabela ticket_users não existe! Execute primeiro o script supabase_ticket_users.sql';
    END IF;
    
    -- 2. Adicionar campo qr_code se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' 
        AND column_name = 'qr_code'
    ) THEN
        ALTER TABLE ticket_users ADD COLUMN qr_code TEXT;
        RAISE NOTICE '✅ Campo qr_code adicionado na tabela ticket_users';
    ELSE
        RAISE NOTICE '⚠️ Campo qr_code já existe na tabela ticket_users';
    END IF;
    
    -- 3. Criar índice para qr_code se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'ticket_users' 
        AND indexname = 'idx_ticket_users_qr_code'
    ) THEN
        CREATE INDEX idx_ticket_users_qr_code ON ticket_users(qr_code);
        RAISE NOTICE '✅ Índice idx_ticket_users_qr_code criado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_ticket_users_qr_code já existe';
    END IF;
    
    -- 4. Verificar e criar índice único se necessário (opcional)
    -- Comentado porque vários ticket_users podem ter o mesmo qr_code se for baseado no ticket
    /*
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'ticket_users' 
        AND indexname = 'unique_ticket_users_qr_code'
    ) THEN
        CREATE UNIQUE INDEX unique_ticket_users_qr_code ON ticket_users(qr_code) WHERE qr_code IS NOT NULL;
        RAISE NOTICE '✅ Índice único para qr_code criado';
    END IF;
    */
    
    RAISE NOTICE '=== CONFIGURAÇÃO QR_CODE CONCLUÍDA ===';
    
END $$;