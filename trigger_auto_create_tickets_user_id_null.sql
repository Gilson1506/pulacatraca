-- =====================================================
-- TRIGGER CORRIGIDO - USER_ID NULL (LÓGICA CORRETA)
-- =====================================================
-- CORREÇÃO: user_id deve ser NULL porque ingresso é gerado antes do comprador se definir
-- Esta é a lógica correta do seu sistema

-- 1. REMOVER CONSTRAINT NOT NULL DO USER_ID (SE EXISTIR)
DO $$
BEGIN
    -- Tentar remover constraint NOT NULL do user_id
    BEGIN
        ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✅ Constraint NOT NULL removida do user_id';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '📝 user_id já permite NULL ou constraint não existe';
    END;
END $$;

-- 2. FUNÇÃO CORRIGIDA - USER_ID SEMPRE NULL (LÓGICA CORRETA)
CREATE OR REPLACE FUNCTION auto_create_ticket_for_user_null_user_id()
RETURNS TRIGGER AS $$
DECLARE
    v_new_ticket_id UUID;
    v_event_data RECORD;
BEGIN
    -- Verifica se ticket_id está NULL
    IF NEW.ticket_id IS NULL THEN
        
        RAISE NOTICE 'Criando ticket automaticamente para usuário: % (QR: %)', NEW.name, NEW.qr_code;
        
        -- Busca evento mais recente para associar ao ticket
        SELECT id, title, price, ticket_type, organizer_id, created_by
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
                user_id,          -- NULL - comprador será definido depois
                ticket_type,
                price,
                description,
                status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                NULL,             -- Sem evento específico
                NULL,             -- USER_ID NULL - LÓGICA CORRETA
                'Ingresso Padrão',
                0,
                'Ticket auto-criado para: ' || NEW.name || ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ')',
                'active',
                NOW(),
                NOW()
            ) RETURNING id INTO v_new_ticket_id;
            
        ELSE
            -- Cria ticket associado ao evento mais recente
            INSERT INTO tickets (
                id,
                event_id,
                user_id,          -- NULL - comprador será definido depois
                ticket_type,
                price,
                description,
                status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_event_data.id,
                NULL,             -- USER_ID NULL - LÓGICA CORRETA
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
        
        RAISE NOTICE 'Ticket criado com sucesso: % atribuído ao usuário: % (user_id: NULL - comprador será definido depois)', 
                     v_new_ticket_id, NEW.name;
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
    EXECUTE FUNCTION auto_create_ticket_for_user_null_user_id();

-- =====================================================
-- CORREÇÃO DOS REGISTROS EXISTENTES COM USER_ID NULL
-- =====================================================

-- 4. CORRIGIR TODOS OS REGISTROS COM ticket_id NULL
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'INICIANDO CORREÇÃO DE REGISTROS EXISTENTES COM USER_ID NULL';
    
    -- Busca evento padrão para usar em todos os tickets
    SELECT id, title, price, ticket_type, organizer_id, created_by
    INTO v_event_data
    FROM events 
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Log do evento encontrado
    IF FOUND THEN
        RAISE NOTICE 'Evento padrão encontrado: % (ID: %)', v_event_data.title, v_event_data.id;
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
            user_id,          -- NULL - comprador será definido depois
            ticket_type,
            price,
            description,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_event_data.id,
            NULL,             -- USER_ID NULL - LÓGICA CORRETA
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
        
        RAISE NOTICE 'Registro %: Usuário "%" → Ticket % (user_id: NULL)', 
                     v_count, user_record.name, v_new_ticket_id;
    END LOOP;
    
    RAISE NOTICE 'CORREÇÃO CONCLUÍDA: % registros processados com user_id NULL (lógica correta)', v_count;
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

-- 6. VERIFICAR TICKETS CRIADOS COM USER_ID NULL
SELECT 
    'TICKETS_COM_USER_ID_NULL' as tipo,
    COUNT(*) as quantidade,
    COUNT(user_id) as com_user_id,
    COUNT(*) - COUNT(user_id) as com_user_id_null
FROM tickets 
WHERE description LIKE '%auto-criado%' 
   OR description LIKE '%corrigido%';

-- 7. AMOSTRA DOS TICKETS CRIADOS COM USER_ID NULL
SELECT 
    t.id as ticket_id,
    t.event_id,
    t.user_id,
    CASE WHEN t.user_id IS NULL THEN '✅ NULL (correto)' ELSE '⚠️ Preenchido' END as user_id_status,
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

-- 8. VERIFICAR LÓGICA CORRETA - TODOS OS TICKETS DEVEM TER USER_ID NULL
SELECT 
    'VERIFICACAO_LOGICA_CORRETA' as status,
    COUNT(*) as total_tickets_auto_criados,
    COUNT(user_id) as tickets_com_user_id_preenchido,
    COUNT(*) - COUNT(user_id) as tickets_com_user_id_null,
    CASE 
        WHEN COUNT(user_id) = 0 THEN '✅ LÓGICA CORRETA - Todos com user_id NULL'
        ELSE '⚠️ Alguns tickets têm user_id preenchido'
    END as resultado
FROM tickets 
WHERE description LIKE '%auto-criado%' OR description LIKE '%corrigido%';

-- 9. TESTE DO TRIGGER COM USER_ID NULL
-- DESCOMENTE PARA TESTAR:
/*
INSERT INTO ticket_users (id, name, email, qr_code) 
VALUES (
    gen_random_uuid(),
    'Teste User ID NULL ' || EXTRACT(EPOCH FROM NOW())::text,
    'teste.null@exemplo.com',
    'TEST_NULL_' || EXTRACT(EPOCH FROM NOW())::text
);

-- Verificar se o ticket foi criado com user_id NULL
SELECT 
    tu.name,
    tu.ticket_id,
    t.user_id,
    CASE WHEN t.user_id IS NULL THEN '✅ NULL (correto)' ELSE '❌ Preenchido (incorreto)' END as status
FROM ticket_users tu
JOIN tickets t ON tu.ticket_id = t.id
WHERE tu.name LIKE 'Teste User ID NULL%'
ORDER BY tu.created_at DESC
LIMIT 1;
*/

RAISE NOTICE '🎯 TRIGGER CORRIGIDO COM USER_ID NULL INSTALADO!';
RAISE NOTICE '✅ Lógica correta: tickets criados com user_id NULL';
RAISE NOTICE '📝 Comprador será definido posteriormente no processo de compra';