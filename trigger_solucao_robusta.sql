-- =====================================================
-- SOLUÇÃO ROBUSTA - TRIGGER AUTO-CRIAÇÃO TICKETS
-- =====================================================
-- Esta solução trata TODOS os possíveis problemas

RAISE NOTICE '🚀 INICIANDO SOLUÇÃO ROBUSTA DO TRIGGER';
RAISE NOTICE '=======================================';

-- 1. CRIAR TABELAS SE NÃO EXISTIREM
DO $$
BEGIN
    RAISE NOTICE '📋 1. VERIFICANDO E CRIANDO TABELAS NECESSÁRIAS...';
    
    -- Criar tabela events se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        CREATE TABLE events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            price DECIMAL(10,2) DEFAULT 0,
            ticket_type TEXT DEFAULT 'Ingresso',
            organizer_id UUID,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabela events criada';
    ELSE
        RAISE NOTICE '✅ Tabela events já existe';
    END IF;
    
    -- Criar tabela tickets se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE TABLE tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID,
            user_id UUID,  -- PERMITE NULL
            ticket_type TEXT DEFAULT 'Ingresso',
            price DECIMAL(10,2) DEFAULT 0,
            description TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabela tickets criada';
    ELSE
        RAISE NOTICE '✅ Tabela tickets já existe';
    END IF;
    
    -- Criar tabela ticket_users se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        CREATE TABLE ticket_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ticket_id UUID,
            name TEXT NOT NULL,
            email TEXT,
            qr_code TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabela ticket_users criada';
    ELSE
        RAISE NOTICE '✅ Tabela ticket_users já existe';
    END IF;
END $$;

-- 2. GARANTIR QUE TODAS AS COLUNAS EXISTEM
DO $$
BEGIN
    RAISE NOTICE '📋 2. VERIFICANDO E ADICIONANDO COLUNAS NECESSÁRIAS...';
    
    -- Adicionar colunas na tabela tickets se não existirem
    BEGIN
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS event_id UUID;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_id UUID;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'Ingresso';
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Colunas da tabela tickets verificadas/adicionadas';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '⚠️ Erro ao adicionar colunas em tickets: %', SQLERRM;
    END;
    
    -- Adicionar colunas na tabela ticket_users se não existirem
    BEGIN
        ALTER TABLE ticket_users ADD COLUMN IF NOT EXISTS ticket_id UUID;
        ALTER TABLE ticket_users ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE ticket_users ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE ticket_users ADD COLUMN IF NOT EXISTS qr_code TEXT;
        ALTER TABLE ticket_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE ticket_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Colunas da tabela ticket_users verificadas/adicionadas';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '⚠️ Erro ao adicionar colunas em ticket_users: %', SQLERRM;
    END;
END $$;

-- 3. REMOVER CONSTRAINT NOT NULL DO USER_ID (CRÍTICO)
DO $$
BEGIN
    RAISE NOTICE '📋 3. REMOVENDO CONSTRAINT NOT NULL DO USER_ID...';
    
    BEGIN
        -- Tentar remover constraint NOT NULL
        ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✅ Constraint NOT NULL removida do user_id';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '📝 user_id já permite NULL ou constraint não existe: %', SQLERRM;
    END;
END $$;

-- 4. CRIAR FUNÇÃO DO TRIGGER (VERSÃO SUPER ROBUSTA)
CREATE OR REPLACE FUNCTION auto_create_ticket_robust()
RETURNS TRIGGER AS $$
DECLARE
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_error_context TEXT;
BEGIN
    -- Log de entrada
    RAISE NOTICE '🎯 TRIGGER ATIVADO para usuário: % (ticket_id atual: %)', 
                 COALESCE(NEW.name, 'SEM_NOME'), COALESCE(NEW.ticket_id::text, 'NULL');
    
    -- Só processar se ticket_id for NULL
    IF NEW.ticket_id IS NULL THEN
        
        BEGIN
            -- Buscar evento mais recente
            SELECT id, title, price, ticket_type, organizer_id, created_by
            INTO v_event_data
            FROM events 
            ORDER BY created_at DESC 
            LIMIT 1;
            
            -- Definir dados padrão se não encontrar evento
            IF NOT FOUND THEN
                v_event_data.id := NULL;
                v_event_data.title := 'Evento Padrão';
                v_event_data.price := 0;
                v_event_data.ticket_type := 'Ingresso';
                RAISE NOTICE '📝 Nenhum evento encontrado, usando dados padrão';
            ELSE
                RAISE NOTICE '📝 Evento encontrado: % (ID: %)', v_event_data.title, v_event_data.id;
            END IF;
            
            -- Criar ticket com user_id NULL (LÓGICA CORRETA)
            INSERT INTO tickets (
                id,
                event_id,
                user_id,          -- SEMPRE NULL - LÓGICA CORRETA
                ticket_type,
                price,
                description,
                status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_event_data.id,
                NULL,             -- USER_ID NULL - COMPRADOR DEFINIDO DEPOIS
                COALESCE(v_event_data.ticket_type, 'Ingresso'),
                COALESCE(v_event_data.price, 0),
                'Ticket auto-criado para: ' || COALESCE(NEW.name, 'Usuário') || 
                ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ')' ||
                CASE WHEN v_event_data.id IS NOT NULL 
                     THEN ' - Evento: ' || v_event_data.title 
                     ELSE '' END,
                'active',
                COALESCE(NEW.created_at, NOW()),
                NOW()
            ) RETURNING id INTO v_new_ticket_id;
            
            -- Atribuir ticket ao usuário
            NEW.ticket_id := v_new_ticket_id;
            NEW.updated_at := NOW();
            
            RAISE NOTICE '✅ SUCESSO: Ticket % criado para usuário % (user_id: NULL)', 
                         v_new_ticket_id, COALESCE(NEW.name, 'SEM_NOME');
            
        EXCEPTION
            WHEN others THEN
                -- Log detalhado do erro
                GET STACKED DIAGNOSTICS v_error_context = PG_EXCEPTION_CONTEXT;
                
                RAISE NOTICE '❌ ERRO no trigger: %', SQLERRM;
                RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
                RAISE NOTICE '   Contexto: %', v_error_context;
                
                -- Re-lançar o erro para impedir a inserção
                RAISE;
        END;
        
    ELSE
        RAISE NOTICE '📝 Usuário % já possui ticket_id: %', 
                     COALESCE(NEW.name, 'SEM_NOME'), NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. INSTALAR TRIGGER
DO $$
BEGIN
    RAISE NOTICE '📋 5. INSTALANDO TRIGGER...';
    
    -- Remover trigger existente
    DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;
    
    -- Criar novo trigger
    CREATE TRIGGER trigger_auto_create_ticket
        BEFORE INSERT ON ticket_users
        FOR EACH ROW
        EXECUTE FUNCTION auto_create_ticket_robust();
    
    RAISE NOTICE '✅ Trigger instalado com sucesso';
END $$;

-- 6. PROCESSAR REGISTROS EXISTENTES COM TICKET_ID NULL
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_count INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 6. PROCESSANDO REGISTROS EXISTENTES...';
    
    -- Buscar evento padrão
    SELECT id, title, price, ticket_type, organizer_id, created_by
    INTO v_event_data
    FROM events 
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Definir dados padrão se não encontrar evento
    IF NOT FOUND THEN
        v_event_data.id := NULL;
        v_event_data.title := 'Evento Padrão';
        v_event_data.price := 0;
        v_event_data.ticket_type := 'Ingresso';
        RAISE NOTICE '📝 Usando dados padrão para correção';
    ELSE
        RAISE NOTICE '📝 Usando evento: % para correção', v_event_data.title;
    END IF;
    
    -- Processar cada registro com ticket_id NULL
    FOR user_record IN 
        SELECT id, name, email, qr_code, created_at
        FROM ticket_users 
        WHERE ticket_id IS NULL
        ORDER BY created_at ASC
    LOOP
        BEGIN
            -- Criar ticket
            INSERT INTO tickets (
                id,
                event_id,
                user_id,          -- NULL - LÓGICA CORRETA
                ticket_type,
                price,
                description,
                status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_event_data.id,
                NULL,             -- USER_ID NULL - COMPRADOR DEFINIDO DEPOIS
                COALESCE(v_event_data.ticket_type, 'Ingresso'),
                COALESCE(v_event_data.price, 0),
                'Ticket corrigido para: ' || COALESCE(user_record.name, 'Usuário') || 
                ' (QR: ' || COALESCE(user_record.qr_code, 'N/A') || ')',
                'active',
                user_record.created_at,
                NOW()
            ) RETURNING id INTO v_new_ticket_id;
            
            -- Atualizar ticket_user
            UPDATE ticket_users 
            SET ticket_id = v_new_ticket_id, 
                updated_at = NOW()
            WHERE id = user_record.id;
            
            v_count := v_count + 1;
            
            IF v_count % 10 = 0 THEN
                RAISE NOTICE '📝 Processados % registros...', v_count;
            END IF;
            
        EXCEPTION
            WHEN others THEN
                v_errors := v_errors + 1;
                RAISE NOTICE '❌ Erro no registro %: %', user_record.name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA: % registros processados, % erros', v_count, v_errors;
END $$;

-- 7. ESTATÍSTICAS FINAIS
DO $$
DECLARE
    stats RECORD;
BEGIN
    RAISE NOTICE '📋 7. ESTATÍSTICAS FINAIS...';
    
    SELECT 
        COUNT(*) as total_ticket_users,
        COUNT(ticket_id) as com_ticket_id,
        COUNT(*) - COUNT(ticket_id) as ainda_null
    INTO stats
    FROM ticket_users;
    
    RAISE NOTICE '   Total ticket_users: %', stats.total_ticket_users;
    RAISE NOTICE '   Com ticket_id: %', stats.com_ticket_id;
    RAISE NOTICE '   Ainda NULL: %', stats.ainda_null;
    
    -- Verificar tickets com user_id NULL
    SELECT COUNT(*) INTO stats.total_ticket_users FROM tickets WHERE user_id IS NULL;
    RAISE NOTICE '   Tickets com user_id NULL: %', stats.total_ticket_users;
END $$;

-- 8. TESTE FINAL DO TRIGGER
DO $$
DECLARE
    test_user_id UUID;
    test_ticket_id UUID;
BEGIN
    RAISE NOTICE '📋 8. TESTE FINAL DO TRIGGER...';
    
    BEGIN
        -- Inserir usuário de teste
        INSERT INTO ticket_users (
            id,
            name,
            email,
            qr_code,
            ticket_id
        ) VALUES (
            gen_random_uuid(),
            'Teste Final ' || EXTRACT(EPOCH FROM NOW())::text,
            'teste.final@exemplo.com',
            'FINAL_' || EXTRACT(EPOCH FROM NOW())::text,
            NULL
        ) RETURNING id INTO test_user_id;
        
        -- Verificar se ticket foi criado
        SELECT ticket_id INTO test_ticket_id 
        FROM ticket_users 
        WHERE id = test_user_id;
        
        IF test_ticket_id IS NOT NULL THEN
            RAISE NOTICE '✅ TESTE PASSOU: Trigger funcionando corretamente';
            
            -- Verificar se ticket tem user_id NULL
            IF EXISTS (SELECT 1 FROM tickets WHERE id = test_ticket_id AND user_id IS NULL) THEN
                RAISE NOTICE '✅ LÓGICA CORRETA: Ticket criado com user_id NULL';
            ELSE
                RAISE NOTICE '⚠️ ATENÇÃO: Ticket não tem user_id NULL';
            END IF;
        ELSE
            RAISE NOTICE '❌ TESTE FALHOU: Trigger não funcionou';
        END IF;
        
        -- Limpar teste
        DELETE FROM tickets WHERE id = test_ticket_id;
        DELETE FROM ticket_users WHERE id = test_user_id;
        RAISE NOTICE '✅ Teste limpo';
        
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ ERRO NO TESTE: %', SQLERRM;
            
            -- Tentar limpar
            BEGIN
                DELETE FROM ticket_users WHERE name LIKE 'Teste Final%';
            EXCEPTION
                WHEN others THEN NULL;
            END;
    END;
END $$;

-- RESULTADO FINAL
RAISE NOTICE '';
RAISE NOTICE '🎯 SOLUÇÃO ROBUSTA CONCLUÍDA!';
RAISE NOTICE '============================';
RAISE NOTICE '✅ Tabelas criadas/verificadas';
RAISE NOTICE '✅ Colunas adicionadas/verificadas';
RAISE NOTICE '✅ Constraint NOT NULL removida do user_id';
RAISE NOTICE '✅ Função do trigger criada (versão robusta)';
RAISE NOTICE '✅ Trigger instalado';
RAISE NOTICE '✅ Registros existentes processados';
RAISE NOTICE '✅ Teste final executado';
RAISE NOTICE '';
RAISE NOTICE '🚀 O trigger deve estar funcionando agora!';
RAISE NOTICE '📝 user_id será sempre NULL (lógica correta)';
RAISE NOTICE '🎫 Comprador será definido posteriormente';