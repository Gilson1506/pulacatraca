-- =====================================================
-- TRIGGER FINAL CORRIGIDO - USER_ID NULL
-- =====================================================
-- EXECUÇÃO: Cole este código completo no seu banco PostgreSQL/Supabase

-- 1. PERMITIR USER_ID NULL NA TABELA TICKETS
DO $$
BEGIN
    BEGIN
        ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✅ user_id agora permite NULL';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '📝 user_id já permite NULL';
    END;
END $$;

-- 2. FUNÇÃO DO TRIGGER CORRIGIDA
CREATE OR REPLACE FUNCTION auto_create_ticket_for_user()
RETURNS TRIGGER AS $$
DECLARE
    v_new_ticket_id UUID;
    v_event_data RECORD;
BEGIN
    -- Só cria ticket se ticket_id for NULL
    IF NEW.ticket_id IS NULL THEN
        
        RAISE NOTICE 'Criando ticket para: %', NEW.name;
        
        -- Busca evento mais recente
        SELECT id, title, price, ticket_type
        INTO v_event_data
        FROM events 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Cria o ticket
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
            NULL,  -- USER_ID NULL - será definido depois
            COALESCE(v_event_data.ticket_type, 'Ingresso'),
            COALESCE(v_event_data.price, 0),
            'Ticket para: ' || NEW.name,
            'active',
            NOW(),
            NOW()
        ) RETURNING id INTO v_new_ticket_id;
        
        -- Atribui o ticket ao usuário
        NEW.ticket_id := v_new_ticket_id;
        
        RAISE NOTICE 'Ticket % criado para %', v_new_ticket_id, NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. INSTALAR O TRIGGER
DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;

CREATE TRIGGER trigger_auto_create_ticket
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_ticket_for_user();

-- 4. CORRIGIR REGISTROS EXISTENTES
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_id UUID;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Corrigindo registros existentes...';
    
    -- Pega um evento para usar como padrão
    SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;
    
    -- Corrige cada ticket_user sem ticket_id
    FOR user_record IN 
        SELECT id, name, email, qr_code, created_at
        FROM ticket_users 
        WHERE ticket_id IS NULL
    LOOP
        -- Cria ticket
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
            v_event_id,
            NULL,  -- USER_ID NULL
            'Ingresso',
            0,
            'Ticket corrigido para: ' || user_record.name,
            'active',
            user_record.created_at,
            NOW()
        ) RETURNING id INTO v_new_ticket_id;
        
        -- Atualiza o ticket_user
        UPDATE ticket_users 
        SET ticket_id = v_new_ticket_id
        WHERE id = user_record.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Corrigidos % registros', v_count;
END $$;

-- 5. VERIFICAÇÕES FINAIS
SELECT 
    'RESULTADO' as status,
    COUNT(*) as total_users,
    COUNT(ticket_id) as com_tickets,
    COUNT(*) - COUNT(ticket_id) as sem_tickets
FROM ticket_users;

SELECT 
    'TICKETS_CRIADOS' as info,
    COUNT(*) as total_tickets,
    COUNT(user_id) as com_user_id,
    COUNT(*) - COUNT(user_id) as user_id_null
FROM tickets;

RAISE NOTICE '🎯 TRIGGER INSTALADO COM SUCESSO!';
RAISE NOTICE '✅ user_id será NULL até comprador se definir';