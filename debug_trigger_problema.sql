-- =====================================================
-- DEBUG COMPLETO - IDENTIFICAR PROBLEMA DO TRIGGER
-- =====================================================

-- 1. VERIFICAR QUAL ERRO ESPECÍFICO ESTÁ OCORRENDO
DO $$
BEGIN
    RAISE NOTICE '🔍 INICIANDO DIAGNÓSTICO COMPLETO DO TRIGGER';
    RAISE NOTICE '📝 Por favor, execute cada seção e me informe onde falha';
END $$;

-- 2. VERIFICAR SE TABELAS EXISTEM
SELECT 
    '🔍 VERIFICANDO_TABELAS' as status,
    table_name,
    CASE 
        WHEN table_name = 'tickets' THEN '✅ PRINCIPAL'
        WHEN table_name = 'ticket_users' THEN '✅ PRINCIPAL' 
        ELSE '📋 OUTRAS'
    END as importancia
FROM information_schema.tables 
WHERE table_name IN ('tickets', 'ticket_users', 'events', 'profiles')
ORDER BY importancia;

-- 3. ESTRUTURA ATUAL DA TABELA TICKETS
SELECT 
    '🔍 ESTRUTURA_TICKETS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets'
ORDER BY ordinal_position;

-- 4. VERIFICAR CONSTRAINT NOT NULL NO USER_ID
SELECT 
    '🔍 CONSTRAINTS_USER_ID' as tipo,
    column_name,
    is_nullable,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ Permite NULL'
        WHEN is_nullable = 'NO' THEN '❌ NOT NULL (PROBLEMA!)'
        ELSE '❓ Indefinido'
    END as status_null
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'user_id';

-- 5. TESTE BÁSICO - INSERIR TICKET COM USER_ID NULL
DO $$
DECLARE
    v_test_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE '🧪 TESTE 1: Tentando inserir ticket com user_id NULL...';
    
    BEGIN
        INSERT INTO tickets (id, user_id) VALUES (v_test_id, NULL);
        DELETE FROM tickets WHERE id = v_test_id;
        RAISE NOTICE '✅ TESTE 1 PASSOU: user_id NULL é permitido';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ TESTE 1 FALHOU: %', SQLERRM;
            RAISE NOTICE '🔧 SOLUÇÃO: Execute ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;';
    END;
END $$;

-- 6. VERIFICAR SE TRIGGER EXISTE
SELECT 
    '🔍 TRIGGERS_EXISTENTES' as tipo,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ticket_users';

-- 7. TESTE DO TRIGGER - INSERIR TICKET_USER
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_test_name TEXT := 'TESTE_DEBUG_' || EXTRACT(EPOCH FROM NOW())::text;
BEGIN
    RAISE NOTICE '🧪 TESTE 2: Tentando inserir ticket_user para testar trigger...';
    
    BEGIN
        INSERT INTO ticket_users (id, name, email, qr_code) 
        VALUES (
            v_test_user_id,
            v_test_name,
            'teste@debug.com',
            'DEBUG_' || EXTRACT(EPOCH FROM NOW())::text
        );
        
        -- Verificar se ticket foi criado
        IF EXISTS (
            SELECT 1 FROM ticket_users 
            WHERE id = v_test_user_id AND ticket_id IS NOT NULL
        ) THEN
            RAISE NOTICE '✅ TESTE 2 PASSOU: Trigger funcionou, ticket_id foi criado';
            
            -- Limpar teste
            DELETE FROM tickets WHERE id IN (
                SELECT ticket_id FROM ticket_users WHERE id = v_test_user_id
            );
            DELETE FROM ticket_users WHERE id = v_test_user_id;
            
        ELSE
            RAISE NOTICE '❌ TESTE 2 FALHOU: Trigger não funcionou, ticket_id ainda é NULL';
        END IF;
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ TESTE 2 ERRO: %', SQLERRM;
            
            -- Tentar limpar se algo foi criado
            BEGIN
                DELETE FROM tickets WHERE id IN (
                    SELECT ticket_id FROM ticket_users WHERE id = v_test_user_id
                );
                DELETE FROM ticket_users WHERE id = v_test_user_id;
            EXCEPTION
                WHEN others THEN
                    -- Ignorar erros de limpeza
            END;
    END;
END $$;

-- 8. VERIFICAR REGISTROS EXISTENTES COM PROBLEMA
SELECT 
    '🔍 REGISTROS_PROBLEMA' as status,
    COUNT(*) as total_ticket_users,
    COUNT(ticket_id) as com_ticket_id,
    COUNT(*) - COUNT(ticket_id) as sem_ticket_id
FROM ticket_users;

-- 9. MOSTRAR ALGUNS REGISTROS PROBLEMÁTICOS
SELECT 
    '🔍 EXEMPLOS_SEM_TICKET_ID' as tipo,
    id,
    name,
    email,
    qr_code,
    ticket_id,
    created_at
FROM ticket_users 
WHERE ticket_id IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- 10. VERIFICAR SE EVENTOS EXISTEM
SELECT 
    '🔍 EVENTOS_DISPONIVEIS' as status,
    COUNT(*) as total_eventos,
    MAX(created_at) as ultimo_evento
FROM events;

RAISE NOTICE '🎯 DIAGNÓSTICO COMPLETO FINALIZADO!';
RAISE NOTICE '📧 ENVIE OS RESULTADOS ACIMA E INFORME:';
RAISE NOTICE '   1. Qual seção específica deu erro?';
RAISE NOTICE '   2. Qual mensagem de erro exata apareceu?';
RAISE NOTICE '   3. Em que momento o processo falha?';