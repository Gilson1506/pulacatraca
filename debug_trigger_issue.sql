-- =====================================================
-- SCRIPT DE DEBUG - IDENTIFICAR PROBLEMA DO TRIGGER
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS
\echo '=== VERIFICANDO ESTRUTURA DAS TABELAS ==='

-- Verificar se as tabelas existem
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tickets', 'ticket_users', 'events', 'profiles')
ORDER BY table_name;

-- Verificar colunas da tabela tickets
\echo '=== ESTRUTURA DA TABELA TICKETS ==='
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tickets'
ORDER BY ordinal_position;

-- Verificar colunas da tabela ticket_users
\echo '=== ESTRUTURA DA TABELA TICKET_USERS ==='
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'ticket_users'
ORDER BY ordinal_position;

-- 2. VERIFICAR CONSTRAINTS ATUAIS
\echo '=== CONSTRAINTS DA TABELA TICKETS ==='
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.tickets'::regclass;

-- 3. VERIFICAR TRIGGERS EXISTENTES
\echo '=== TRIGGERS EXISTENTES ==='
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ticket_users'
  AND trigger_schema = 'public';

-- 4. VERIFICAR FUNÇÕES EXISTENTES
\echo '=== FUNÇÕES RELACIONADAS AO TRIGGER ==='
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%ticket%'
ORDER BY routine_name;

-- 5. TESTE SIMPLES DE INSERÇÃO EM TICKETS COM USER_ID NULL
\echo '=== TESTE SIMPLES DE INSERÇÃO COM USER_ID NULL ==='
DO $$
BEGIN
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
            NULL, -- USER_ID NULL
            'Teste Debug',
            0,
            'Teste de inserção com user_id NULL',
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ SUCESSO: Conseguiu inserir ticket com user_id NULL';
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ ERRO ao inserir ticket com user_id NULL: %', SQLERRM;
    END;
END $$;

-- 6. VERIFICAR SE A INSERÇÃO FUNCIONOU
SELECT 
    id,
    user_id,
    ticket_type,
    description,
    created_at
FROM tickets 
WHERE description = 'Teste de inserção com user_id NULL'
ORDER BY created_at DESC
LIMIT 1;

-- 7. LIMPAR TESTE
DELETE FROM tickets WHERE description = 'Teste de inserção com user_id NULL';

-- 8. TESTE DO TRIGGER (SE EXISTIR)
\echo '=== TESTE DO TRIGGER ==='
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    BEGIN
        -- Inserir um ticket_user para testar o trigger
        test_user_id := gen_random_uuid();
        
        INSERT INTO ticket_users (
            id,
            name,
            email,
            qr_code
        ) VALUES (
            test_user_id,
            'Debug Test User',
            'debug@test.com',
            'DEBUG_' || EXTRACT(EPOCH FROM NOW())::text
        );
        
        RAISE NOTICE '✅ SUCESSO: Trigger executado sem erro';
        
        -- Verificar se o ticket foi criado
        IF EXISTS (
            SELECT 1 FROM ticket_users 
            WHERE id = test_user_id AND ticket_id IS NOT NULL
        ) THEN
            RAISE NOTICE '✅ Ticket foi criado pelo trigger';
        ELSE
            RAISE NOTICE '⚠️ Ticket não foi criado pelo trigger';
        END IF;
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ ERRO no trigger: %', SQLERRM;
    END;
    
    -- Limpar teste
    DELETE FROM ticket_users WHERE id = test_user_id;
    DELETE FROM tickets WHERE description LIKE '%Debug Test User%';
END $$;

\echo '=== DEBUG CONCLUÍDO ==='