-- =====================================================
-- TRIGGER CORRIGIDO - INCLUI USER_ID OBRIGATÓRIO
-- =====================================================
-- CORREÇÃO: A tabela tickets tem user_id NOT NULL
-- Vamos usar o ID do organizador do evento ou criar um usuário padrão

-- 1. VERIFICAR/CRIAR USUÁRIO PADRÃO PARA TICKETS
DO $$
DECLARE
    v_default_user_id UUID;
BEGIN
    -- Tentar encontrar um usuário existente (organizador ou admin)
    SELECT id INTO v_default_user_id
    FROM profiles 
    WHERE role IN ('organizer', 'admin')
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Se não encontrar, tentar qualquer usuário
        SELECT id INTO v_default_user_id
        FROM profiles 
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF NOT FOUND THEN
            RAISE NOTICE '⚠️ ATENÇÃO: Nenhum usuário encontrado na tabela profiles!';
            RAISE NOTICE '📝 Você precisa ter pelo menos um usuário na tabela profiles';
            RAISE NOTICE '🔧 Execute: INSERT INTO profiles (id, email, role) VALUES (gen_random_uuid(), ''admin@sistema.com'', ''admin'');';
        ELSE
            RAISE NOTICE '✅ Usuário padrão encontrado: %', v_default_user_id;
        END IF;
    ELSE
        RAISE NOTICE '✅ Organizador/Admin encontrado para usar como padrão: %', v_default_user_id;
    END IF;
END $$;

-- 2. FUNÇÃO CORRIGIDA PARA AUTO-CRIAR TICKET COM USER_ID
CREATE OR REPLACE FUNCTION auto_create_ticket_for_user_with_user_id()
RETURNS TRIGGER AS $$
DECLARE
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_default_user_id UUID;
BEGIN
    -- Verifica se ticket_id está NULL
    IF NEW.ticket_id IS NULL THEN
        
        RAISE NOTICE 'Criando ticket automaticamente para usuário: % (QR: %)', NEW.name, NEW.qr_code;
        
        -- Buscar usuário padrão para usar como user_id
        SELECT id INTO v_default_user_id
        FROM profiles 
        WHERE role IN ('organizer', 'admin')
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Se não encontrar organizador/admin, usar qualquer usuário
        IF NOT FOUND THEN
            SELECT id INTO v_default_user_id
            FROM profiles 
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;
        
        -- Se ainda não encontrar usuário, criar um erro informativo
        IF v_default_user_id IS NULL THEN
            RAISE EXCEPTION 'Nenhum usuário encontrado na tabela profiles. Execute: INSERT INTO profiles (id, email, role) VALUES (gen_random_uuid(), ''admin@sistema.com'', ''admin'');';
        END IF;
        
        -- Busca evento mais recente para associar ao ticket
        SELECT id, title, price, ticket_type, organizer_id, created_by, user_id
        INTO v_event_data
        FROM events 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Se não encontrar eventos, criar com dados padrão
        IF NOT FOUND THEN
            RAISE NOTICE 'Nenhum evento encontrado, criando ticket genérico';
            
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
                NULL, -- Sem evento específico
                v_default_user_id, -- USER_ID OBRIGATÓRIO
                'Ingresso Padrão',
                0,
                'Ticket auto-criado para: ' || NEW.name || ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ')',
                'active',
                NOW(),
                NOW()
            ) RETURNING id INTO v_new_ticket_id;
            
        ELSE
            -- Usar user_id do evento se disponível, senão usar padrão
            IF v_event_data.user_id IS NOT NULL THEN
                v_default_user_id := v_event_data.user_id;
            ELSIF v_event_data.organizer_id IS NOT NULL THEN
                v_default_user_id := v_event_data.organizer_id;
            ELSIF v_event_data.created_by IS NOT NULL THEN
                v_default_user_id := v_event_data.created_by;
            END IF;
            
            -- Cria ticket associado ao evento mais recente
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
                v_event_data.id,
                v_default_user_id, -- USER_ID OBRIGATÓRIO
                COALESCE(v_event_data.ticket_type, 'Ingresso'),
                COALESCE(v_event_data.price, 0),
                'Ticket auto-criado para: ' || NEW.name || ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ') - Evento: ' || v_event_data.title,
                'active',
                NOW(),
                NOW()
            ) RETURNING id INTO v_new_ticket_id;
        END IF;
        
        -- Atribui o novo ticket_id ao ticket_user
        NEW.ticket_id := v_new_ticket_id;
        
        RAISE NOTICE 'Ticket criado com sucesso: % atribuído ao usuário: % (user_id: %)', 
                     v_new_ticket_id, NEW.name, v_default_user_id;
    ELSE
        RAISE NOTICE 'Usuário % já possui ticket_id: %', NEW.name, NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. INSTALAR/REINSTALAR TRIGGER CORRIGIDO
DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;

CREATE TRIGGER trigger_auto_create_ticket
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_ticket_for_user_with_user_id();

-- =====================================================
-- CORREÇÃO DOS REGISTROS EXISTENTES COM USER_ID
-- =====================================================

-- 4. CORRIGIR TODOS OS REGISTROS COM ticket_id NULL
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_default_user_id UUID;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'INICIANDO CORREÇÃO DE REGISTROS EXISTENTES COM USER_ID';
    
    -- Buscar usuário padrão
    SELECT id INTO v_default_user_id
    FROM profiles 
    WHERE role IN ('organizer', 'admin')
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Se não encontrar organizador/admin, usar qualquer usuário
    IF NOT FOUND THEN
        SELECT id INTO v_default_user_id
        FROM profiles 
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- Verificar se encontrou usuário
    IF v_default_user_id IS NULL THEN
        RAISE EXCEPTION 'ERRO: Nenhum usuário encontrado na tabela profiles! Execute: INSERT INTO profiles (id, email, role) VALUES (gen_random_uuid(), ''admin@sistema.com'', ''admin'');';
    END IF;
    
    RAISE NOTICE 'Usando user_id padrão: %', v_default_user_id;
    
    -- Busca evento padrão para usar em todos os tickets
    SELECT id, title, price, ticket_type, organizer_id, created_by, user_id
    INTO v_event_data
    FROM events 
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Log do evento encontrado
    IF FOUND THEN
        RAISE NOTICE 'Evento padrão encontrado: % (ID: %)', v_event_data.title, v_event_data.id;
        
        -- Usar user_id do evento se disponível
        IF v_event_data.user_id IS NOT NULL THEN
            v_default_user_id := v_event_data.user_id;
            RAISE NOTICE 'Usando user_id do evento: %', v_default_user_id;
        ELSIF v_event_data.organizer_id IS NOT NULL THEN
            v_default_user_id := v_event_data.organizer_id;
            RAISE NOTICE 'Usando organizer_id do evento: %', v_default_user_id;
        END IF;
    ELSE
        RAISE NOTICE 'Nenhum evento encontrado, usando dados padrão';
        v_event_data.id := NULL;
        v_event_data.title := 'Evento Padrão';
        v_event_data.price := 0;
        v_event_data.ticket_type := 'Ingresso';
    END IF;
    
    -- Processa todos ticket_users com ticket_id NULL
    FOR user_record IN 
        SELECT id, name, email, qr_code, created_at
        FROM ticket_users 
        WHERE ticket_id IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Cria ticket para cada usuário
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
            v_event_data.id,
            v_default_user_id, -- USER_ID OBRIGATÓRIO
            COALESCE(v_event_data.ticket_type, 'Ingresso'),
            COALESCE(v_event_data.price, 0),
            'Ticket corrigido para: ' || user_record.name || ' (QR: ' || COALESCE(user_record.qr_code, 'N/A') || ')',
            'active',
            user_record.created_at, -- Manter data original
            NOW()
        ) RETURNING id INTO v_new_ticket_id;
        
        -- Atualiza o ticket_user
        UPDATE ticket_users 
        SET ticket_id = v_new_ticket_id, 
            updated_at = NOW()
        WHERE id = user_record.id;
        
        v_count := v_count + 1;
        
        RAISE NOTICE 'Registro %: Usuário "%" → Ticket % (user_id: %)', 
                     v_count, user_record.name, v_new_ticket_id, v_default_user_id;
    END LOOP;
    
    RAISE NOTICE 'CORREÇÃO CONCLUÍDA: % registros processados com user_id: %', v_count, v_default_user_id;
END $$;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- 5. ESTATÍSTICAS APÓS CORREÇÃO
SELECT 
    'ESTATÍSTICAS_FINAIS' as status,
    COUNT(*) as total_ticket_users,
    COUNT(ticket_id) as com_ticket_id,
    COUNT(*) - COUNT(ticket_id) as ainda_null,
    ROUND(COUNT(ticket_id) * 100.0 / COUNT(*), 2) as percentual_corrigido
FROM ticket_users;

-- 6. VERIFICAR TICKETS CRIADOS COM USER_ID
SELECT 
    'TICKETS_COM_USER_ID' as tipo,
    COUNT(*) as quantidade,
    COUNT(DISTINCT user_id) as usuarios_distintos
FROM tickets 
WHERE description LIKE '%auto-criado%' 
   OR description LIKE '%corrigido%';

-- 7. AMOSTRA DOS TICKETS CRIADOS COM USER_ID
SELECT 
    t.id as ticket_id,
    t.event_id,
    t.user_id,
    t.ticket_type,
    t.price,
    t.status,
    LEFT(t.description, 50) || '...' as description_preview,
    t.created_at as ticket_created,
    tu.name as user_name,
    tu.qr_code
FROM tickets t
JOIN ticket_users tu ON t.id = tu.ticket_id
WHERE t.description LIKE '%auto-criado%' 
   OR t.description LIKE '%corrigido%'
ORDER BY t.created_at DESC
LIMIT 5;

-- 8. VERIFICAR SE TODOS OS TICKETS TÊM USER_ID
SELECT 
    'VERIFICACAO_USER_ID' as status,
    COUNT(*) as total_tickets,
    COUNT(user_id) as com_user_id,
    COUNT(*) - COUNT(user_id) as sem_user_id
FROM tickets;

RAISE NOTICE '🎯 TRIGGER CORRIGIDO COM USER_ID INSTALADO!';
RAISE NOTICE '✅ Todos os tickets agora incluem user_id obrigatório';