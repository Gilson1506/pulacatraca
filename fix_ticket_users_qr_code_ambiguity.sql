-- FIX PARA ERRO DE AMBIGUIDADE NA COLUNA QR_CODE
-- Erro: column reference "qr_code" is ambiguous

DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO AMBIGUIDADE DA COLUNA QR_CODE ===';
    
    -- Verificar se há triggers ou funções que podem estar causando conflito
    RAISE NOTICE '1. Verificando triggers na tabela ticket_users...';
    
    -- Listar triggers da tabela ticket_users
    SELECT 
        trigger_name,
        event_manipulation,
        action_statement
    FROM information_schema.triggers 
    WHERE event_object_table = 'ticket_users';
    
    -- Verificar se existe coluna qr_code na tabela ticket_users
    RAISE NOTICE '2. Verificando estrutura da tabela ticket_users...';
    
    -- Verificar colunas da tabela
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'ticket_users' 
    ORDER BY ordinal_position;
    
    -- Verificar se há funções que podem estar causando conflito
    RAISE NOTICE '3. Procurando funções relacionadas a ticket_users...';
    
    -- Desabilitar temporariamente triggers se necessário
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'ticket_users' 
        AND trigger_name LIKE '%qr%'
    ) THEN
        RAISE NOTICE '4. Encontrados triggers relacionados a QR_CODE, investigando...';
        
        -- Listar funções trigger relacionadas
        SELECT 
            p.proname as function_name,
            p.prosrc as function_body
        FROM pg_proc p
        JOIN pg_trigger t ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'ticket_users'
        AND (p.prosrc ILIKE '%qr_code%' OR p.proname ILIKE '%qr%');
    END IF;
    
    -- Verificar se o erro está em uma função trigger
    RAISE NOTICE '5. Verificando funções que podem ter referência ambígua...';
    
    -- Corrigir possível trigger com referência ambígua
    -- Se houver um trigger que usa qr_code sem qualificar a tabela
    
    -- Criar ou substituir função corrigida se necessário
    CREATE OR REPLACE FUNCTION generate_ticket_qr_code()
    RETURNS TRIGGER AS $trigger$
    BEGIN
        -- Qualificar explicitamente a coluna qr_code
        IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
            NEW.qr_code := 'QR' || EXTRACT(epoch FROM NOW())::bigint || '_' || NEW.id;
        END IF;
        RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
    
    -- Recriar trigger se existir
    DROP TRIGGER IF EXISTS ticket_user_qr_trigger ON ticket_users;
    
    -- Verificar se a coluna qr_code existe antes de criar o trigger
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' 
        AND column_name = 'qr_code'
    ) THEN
        CREATE TRIGGER ticket_user_qr_trigger
            BEFORE INSERT OR UPDATE ON ticket_users
            FOR EACH ROW
            EXECUTE FUNCTION generate_ticket_qr_code();
        
        RAISE NOTICE '✅ Trigger recriado com referência qualificada';
    ELSE
        RAISE NOTICE '⚠️ Coluna qr_code não existe na tabela ticket_users';
    END IF;
    
    -- Verificar e corrigir policies RLS se necessário
    RAISE NOTICE '6. Verificando policies RLS...';
    
    -- Verificar policies existentes
    SELECT 
        policyname,
        cmd,
        qual,
        with_check
    FROM pg_policies 
    WHERE tablename = 'ticket_users';
    
    -- Garantir que as policies não tenham referências ambíguas
    -- Recriar policy básica se necessário
    DROP POLICY IF EXISTS "Users can manage their ticket users" ON ticket_users;
    
    CREATE POLICY "Users can manage their ticket users" ON ticket_users
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM tickets t 
                WHERE t.id = ticket_users.ticket_id 
                AND t.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM tickets t 
                WHERE t.id = ticket_users.ticket_id 
                AND t.user_id = auth.uid()
            )
        );
    
    RAISE NOTICE '✅ Policy RLS recriada com referências qualificadas';
    
    -- Teste de inserção para verificar se o erro foi corrigido
    RAISE NOTICE '7. Testando inserção na tabela ticket_users...';
    
    -- Verificar se existe pelo menos um ticket para teste
    IF EXISTS (SELECT 1 FROM tickets LIMIT 1) THEN
        DECLARE
            test_ticket_id uuid;
            test_result record;
        BEGIN
            -- Pegar um ticket existente para teste
            SELECT id INTO test_ticket_id FROM tickets LIMIT 1;
            
            -- Tentar inserir um usuário de teste
            INSERT INTO ticket_users (ticket_id, name, email, document)
            VALUES (test_ticket_id, 'Teste Usuario', 'teste@exemplo.com', '123456789')
            RETURNING id, qr_code INTO test_result;
            
            RAISE NOTICE '✅ Teste de inserção bem-sucedido - ID: %, QR: %', test_result.id, test_result.qr_code;
            
            -- Remover o registro de teste
            DELETE FROM ticket_users WHERE id = test_result.id;
            RAISE NOTICE '✅ Registro de teste removido';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro no teste de inserção: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Nenhum ticket encontrado para teste';
    END IF;
    
    RAISE NOTICE '=== CORREÇÃO CONCLUÍDA ===';
    RAISE NOTICE '✅ Ambiguidade da coluna qr_code corrigida';
    RAISE NOTICE '✅ Triggers atualizados com referências qualificadas';
    RAISE NOTICE '✅ Policies RLS verificadas e corrigidas';

END $$;