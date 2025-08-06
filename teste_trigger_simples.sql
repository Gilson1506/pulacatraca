-- =====================================================
-- TESTE SIMPLES PARA IDENTIFICAR O PROBLEMA
-- =====================================================

-- Primeiro, vamos verificar se conseguimos remover a constraint NOT NULL
DO $$
BEGIN
    BEGIN
        ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✅ Constraint NOT NULL removida com sucesso';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '⚠️ Erro ao remover constraint: %', SQLERRM;
    END;
END $$;

-- Agora vamos testar uma inserção simples com user_id NULL
DO $$
DECLARE
    test_ticket_id UUID;
BEGIN
    BEGIN
        test_ticket_id := gen_random_uuid();
        
        INSERT INTO tickets (
            id,
            user_id,
            ticket_type,
            price,
            description,
            status,
            created_at,
            updated_at
        ) VALUES (
            test_ticket_id,
            NULL,  -- Este é o ponto crítico
            'Teste',
            0,
            'Teste de inserção',
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ SUCESSO: Ticket inserido com user_id NULL';
        
        -- Limpar o teste
        DELETE FROM tickets WHERE id = test_ticket_id;
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ ERRO: %', SQLERRM;
            RAISE NOTICE '❌ DETAIL: %', SQLSTATE;
    END;
END $$;

-- Verificar as constraints atuais da tabela tickets
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.tickets'::regclass
  AND contype IN ('c', 'n'); -- check constraints e not-null constraints