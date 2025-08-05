-- =====================================================
-- TRIGGER DEFINITIVO - ESTRUTURA REAL CONFIRMADA E CORRIGIDA
-- =====================================================
-- Baseado na estrutura real da tabela tickets
-- CORREÇÃO: tickets usa 'ticket_type' ao invés de 'type'

-- 1. FUNÇÃO DEFINITIVA PARA AUTO-CRIAR TICKET (CORRIGIDA)
CREATE OR REPLACE FUNCTION auto_create_ticket_for_user()
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
                ticket_type,
                price,
                description,
                status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                NULL, -- Sem evento específico
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
                ticket_type,
                price,
                description,
                status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_event_data.id,
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
        
        RAISE NOTICE 'Ticket criado com sucesso: % atribuído ao usuário: %', v_new_ticket_id, NEW.name;
    ELSE
        RAISE NOTICE 'Usuário % já possui ticket_id: %', NEW.name, NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. INSTALAR/REINSTALAR TRIGGER
DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;

CREATE TRIGGER trigger_auto_create_ticket
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_ticket_for_user();

-- =====================================================
-- CORREÇÃO DOS REGISTROS EXISTENTES (CORRIGIDA)
-- =====================================================

-- 3. CORRIGIR TODOS OS REGISTROS COM ticket_id NULL
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'INICIANDO CORREÇÃO DE REGISTROS EXISTENTES';
    
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
            ticket_type,
            price,
            description,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_event_data.id,
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
        
        RAISE NOTICE 'Registro %: Usuário "%" → Ticket %', 
                     v_count, user_record.name, v_new_ticket_id;
    END LOOP;
    
    RAISE NOTICE 'CORREÇÃO CONCLUÍDA: % registros processados', v_count;
END $$;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- 4. ESTATÍSTICAS APÓS CORREÇÃO
SELECT 
    'ESTATÍSTICAS_FINAIS' as status,
    COUNT(*) as total_ticket_users,
    COUNT(ticket_id) as com_ticket_id,
    COUNT(*) - COUNT(ticket_id) as ainda_null,
    ROUND(COUNT(ticket_id) * 100.0 / COUNT(*), 2) as percentual_corrigido
FROM ticket_users;

-- 5. VERIFICAR TICKETS CRIADOS AUTOMATICAMENTE
SELECT 
    'TICKETS_AUTO_CRIADOS' as tipo,
    COUNT(*) as quantidade
FROM tickets 
WHERE description LIKE '%auto-criado%' 
   OR description LIKE '%corrigido%';

-- 6. AMOSTRA DOS TICKETS CRIADOS
SELECT 
    t.id as ticket_id,
    t.event_id,
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

-- =====================================================
-- TESTE DO TRIGGER
-- =====================================================

-- 7. TESTE: Inserir um novo ticket_user para verificar se o trigger funciona
-- DESCOMENTE PARA TESTAR:
/*
INSERT INTO ticket_users (id, name, email, qr_code) 
VALUES (
    gen_random_uuid(),
    'Teste Trigger',
    'teste@trigger.com',
    'TEST_' || EXTRACT(EPOCH FROM NOW())::text
);

-- Verificar se o ticket foi criado automaticamente
SELECT 
    tu.name,
    tu.email,
    tu.qr_code,
    tu.ticket_id,
    t.ticket_type,
    t.description
FROM ticket_users tu
LEFT JOIN tickets t ON tu.ticket_id = t.id
WHERE tu.name = 'Teste Trigger';
*/

-- =====================================================
-- LOGS E MONITORAMENTO
-- =====================================================

-- 8. FUNÇÃO PARA MONITORAR CRIAÇÕES AUTOMÁTICAS
CREATE OR REPLACE FUNCTION get_auto_created_tickets_stats()
RETURNS TABLE(
    total_auto_created BIGINT,
    total_corrected BIGINT,
    last_created TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE description LIKE '%auto-criado%') as total_auto_created,
        COUNT(*) FILTER (WHERE description LIKE '%corrigido%') as total_corrected,
        MAX(created_at) as last_created
    FROM tickets 
    WHERE description LIKE '%auto-criado%' OR description LIKE '%corrigido%';
END;
$$ LANGUAGE plpgsql;

-- Para usar: SELECT * FROM get_auto_created_tickets_stats();