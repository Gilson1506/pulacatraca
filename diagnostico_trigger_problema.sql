-- =====================================================
-- DIAGNÓSTICO COMPLETO - TRIGGER DE TICKETS
-- =====================================================
-- Execute este script para identificar exatamente onde está o problema

RAISE NOTICE '🔍 INICIANDO DIAGNÓSTICO COMPLETO DO TRIGGER';
RAISE NOTICE '================================================';

-- 1. VERIFICAR SE AS TABELAS EXISTEM
DO $$
BEGIN
    RAISE NOTICE '📋 1. VERIFICANDO EXISTÊNCIA DAS TABELAS:';
    
    -- Verificar ticket_users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        RAISE NOTICE '✅ Tabela ticket_users: EXISTE';
    ELSE
        RAISE NOTICE '❌ Tabela ticket_users: NÃO EXISTE';
    END IF;
    
    -- Verificar tickets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        RAISE NOTICE '✅ Tabela tickets: EXISTE';
    ELSE
        RAISE NOTICE '❌ Tabela tickets: NÃO EXISTE';
    END IF;
    
    -- Verificar events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        RAISE NOTICE '✅ Tabela events: EXISTE';
    ELSE
        RAISE NOTICE '❌ Tabela events: NÃO EXISTE';
    END IF;
END $$;

-- 2. VERIFICAR ESTRUTURA DA TABELA TICKETS
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 2. ESTRUTURA DA TABELA TICKETS:';
    
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'tickets'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '   - %: % (NULL: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    END LOOP;
END $$;

-- 3. VERIFICAR ESTRUTURA DA TABELA TICKET_USERS
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 3. ESTRUTURA DA TABELA TICKET_USERS:';
    
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'ticket_users'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '   - %: % (NULL: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    END LOOP;
END $$;

-- 4. VERIFICAR SE CONSTRAINT NOT NULL EXISTE NO USER_ID
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 4. CONSTRAINT NOT NULL NO USER_ID DA TABELA TICKETS:';
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE '⚠️ PROBLEMA: user_id tem constraint NOT NULL';
        RAISE NOTICE '   Isso impede inserir NULL como você deseja';
    ELSE
        RAISE NOTICE '✅ OK: user_id permite NULL';
    END IF;
END $$;

-- 5. VERIFICAR SE O TRIGGER EXISTE
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 5. VERIFICANDO TRIGGERS EXISTENTES:';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_auto_create_ticket'
    ) THEN
        RAISE NOTICE '✅ Trigger trigger_auto_create_ticket: EXISTE';
    ELSE
        RAISE NOTICE '❌ Trigger trigger_auto_create_ticket: NÃO EXISTE';
    END IF;
END $$;

-- 6. VERIFICAR SE A FUNÇÃO DO TRIGGER EXISTE
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 6. VERIFICANDO FUNÇÃO DO TRIGGER:';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'auto_create_ticket_for_user_null_user_id'
    ) THEN
        RAISE NOTICE '✅ Função auto_create_ticket_for_user_null_user_id: EXISTE';
    ELSE
        RAISE NOTICE '❌ Função auto_create_ticket_for_user_null_user_id: NÃO EXISTE';
    END IF;
END $$;

-- 7. VERIFICAR DADOS EXISTENTES
DO $$
DECLARE
    total_ticket_users INTEGER;
    ticket_users_sem_ticket INTEGER;
    total_tickets INTEGER;
    tickets_com_user_null INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 7. DADOS EXISTENTES:';
    
    -- ticket_users
    SELECT COUNT(*) INTO total_ticket_users FROM ticket_users;
    SELECT COUNT(*) INTO ticket_users_sem_ticket FROM ticket_users WHERE ticket_id IS NULL;
    
    RAISE NOTICE '   - Total ticket_users: %', total_ticket_users;
    RAISE NOTICE '   - ticket_users sem ticket_id: %', ticket_users_sem_ticket;
    
    -- tickets
    SELECT COUNT(*) INTO total_tickets FROM tickets;
    SELECT COUNT(*) INTO tickets_com_user_null FROM tickets WHERE user_id IS NULL;
    
    RAISE NOTICE '   - Total tickets: %', total_tickets;
    RAISE NOTICE '   - Tickets com user_id NULL: %', tickets_com_user_null;
END $$;

-- 8. TESTE SIMPLES DE INSERT (SEM TRIGGER)
DO $$
DECLARE
    test_ticket_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 8. TESTE SIMPLES DE INSERT NA TABELA TICKETS:';
    
    BEGIN
        -- Tentar inserir um ticket com user_id NULL
        INSERT INTO tickets (
            id,
            event_id,
            user_id,
            ticket_type,
            price,
            description,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NULL,
            NULL,  -- USER_ID NULL
            'Teste',
            0,
            'Teste de diagnóstico',
            'active',
            NOW(),
            NOW()
        ) RETURNING id INTO test_ticket_id;
        
        RAISE NOTICE '✅ INSERT FUNCIONOU - Ticket criado: %', test_ticket_id;
        
        -- Limpar teste
        DELETE FROM tickets WHERE id = test_ticket_id;
        RAISE NOTICE '✅ Teste limpo';
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ ERRO NO INSERT: %', SQLERRM;
            RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
    END;
END $$;

-- 9. TESTE DO TRIGGER (SE EXISTIR)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 9. TESTE DO TRIGGER:';
    
    BEGIN
        -- Tentar inserir ticket_user para ativar o trigger
        INSERT INTO ticket_users (
            id,
            name,
            email,
            qr_code,
            ticket_id
        ) VALUES (
            gen_random_uuid(),
            'Teste Diagnóstico',
            'teste@diagnostico.com',
            'DIAG_' || EXTRACT(EPOCH FROM NOW())::text,
            NULL  -- Isso deve ativar o trigger
        ) RETURNING id INTO test_user_id;
        
        RAISE NOTICE '✅ TRIGGER FUNCIONOU - ticket_user criado: %', test_user_id;
        
        -- Verificar se ticket foi criado
        IF EXISTS (SELECT 1 FROM ticket_users WHERE id = test_user_id AND ticket_id IS NOT NULL) THEN
            RAISE NOTICE '✅ Ticket foi atribuído pelo trigger';
        ELSE
            RAISE NOTICE '❌ Ticket NÃO foi atribuído pelo trigger';
        END IF;
        
        -- Limpar teste
        DELETE FROM tickets WHERE id IN (SELECT ticket_id FROM ticket_users WHERE id = test_user_id);
        DELETE FROM ticket_users WHERE id = test_user_id;
        RAISE NOTICE '✅ Teste limpo';
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ ERRO NO TRIGGER: %', SQLERRM;
            RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
            
            -- Tentar limpar mesmo com erro
            BEGIN
                DELETE FROM ticket_users WHERE name = 'Teste Diagnóstico';
            EXCEPTION
                WHEN others THEN NULL;
            END;
    END;
END $$;

-- 10. RESUMO DOS PROBLEMAS ENCONTRADOS
RAISE NOTICE '';
RAISE NOTICE '🎯 RESUMO DO DIAGNÓSTICO:';
RAISE NOTICE '========================';
RAISE NOTICE 'Execute este script e me informe:';
RAISE NOTICE '1. Quais tabelas NÃO existem?';
RAISE NOTICE '2. user_id tem constraint NOT NULL?';
RAISE NOTICE '3. Trigger e função existem?';
RAISE NOTICE '4. Qual erro aparece no teste de INSERT?';
RAISE NOTICE '5. Qual erro aparece no teste do TRIGGER?';
RAISE NOTICE '';
RAISE NOTICE '📧 Com essas informações, posso corrigir exatamente o problema!';