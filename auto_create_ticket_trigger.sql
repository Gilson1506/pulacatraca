-- =====================================================
-- TRIGGER PARA AUTO-CRIAR TICKETS
-- =====================================================
-- Solução para evitar ticket_id NULL em ticket_users
-- Cria automaticamente um ticket quando necessário

-- 1. FUNÇÃO PARA AUTO-CRIAR TICKET
CREATE OR REPLACE FUNCTION auto_create_ticket_for_user()
RETURNS TRIGGER AS $$
DECLARE
    v_new_ticket_id UUID;
    v_event_data RECORD;
BEGIN
    -- Verifica se ticket_id está NULL ou vazio
    IF NEW.ticket_id IS NULL THEN
        
        -- Busca dados do evento para criar ticket consistente
        SELECT id, title, price, ticket_type, organizer_id, created_by
        INTO v_event_data
        FROM events 
        WHERE id = NEW.event_id
        LIMIT 1;
        
        -- Se não encontrar evento, usar valores padrão
        IF NOT FOUND THEN
            RAISE NOTICE 'Evento não encontrado para ticket_user %, usando valores padrão', NEW.id;
            v_event_data.id := NEW.event_id;
            v_event_data.title := 'Evento Padrão';
            v_event_data.price := 0;
            v_event_data.ticket_type := 'Ingresso';
            v_event_data.organizer_id := NULL;
            v_event_data.created_by := NULL;
        END IF;
        
        -- Cria novo ticket automaticamente
        INSERT INTO tickets (
            id,
            event_id,
            type,
            price,
            description,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_event_data.id,
            COALESCE(v_event_data.ticket_type, 'Ingresso Padrão'),
            COALESCE(v_event_data.price, 0),
            'Ticket criado automaticamente para: ' || NEW.name,
            NOW(),
            NOW()
        ) RETURNING id INTO v_new_ticket_id;
        
        -- Atribui o novo ticket_id ao ticket_user
        NEW.ticket_id := v_new_ticket_id;
        
        RAISE NOTICE 'Ticket criado automaticamente: % para usuário: %', v_new_ticket_id, NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER ANTES DE INSERIR TICKET_USER
DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;

CREATE TRIGGER trigger_auto_create_ticket
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_ticket_for_user();

-- =====================================================
-- CORREÇÃO DOS REGISTROS EXISTENTES COM ticket_id NULL
-- =====================================================

-- 3. SCRIPT PARA CORRIGIR REGISTROS EXISTENTES
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Loop através de todos ticket_users com ticket_id NULL
    FOR user_record IN 
        SELECT id, name, email, event_id, qr_code, created_at
        FROM ticket_users 
        WHERE ticket_id IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Busca dados do evento
        SELECT id, title, price, ticket_type, organizer_id, created_by
        INTO v_event_data
        FROM events 
        WHERE id = user_record.event_id
        LIMIT 1;
        
        -- Valores padrão se evento não encontrado
        IF NOT FOUND THEN
            v_event_data.id := user_record.event_id;
            v_event_data.title := 'Evento';
            v_event_data.price := 0;
            v_event_data.ticket_type := 'Ingresso';
            v_event_data.organizer_id := NULL;
            v_event_data.created_by := NULL;
        END IF;
        
        -- Cria ticket para o usuário existente
        INSERT INTO tickets (
            id,
            event_id,
            type,
            price,
            description,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_event_data.id,
            COALESCE(v_event_data.ticket_type, 'Ingresso'),
            COALESCE(v_event_data.price, 0),
            'Ticket criado para: ' || user_record.name || ' (QR: ' || user_record.qr_code || ')',
            user_record.created_at, -- Manter data original
            NOW()
        ) RETURNING id INTO v_new_ticket_id;
        
        -- Atualiza o ticket_user com o novo ticket_id
        UPDATE ticket_users 
        SET ticket_id = v_new_ticket_id, 
            updated_at = NOW()
        WHERE id = user_record.id;
        
        v_count := v_count + 1;
        
        RAISE NOTICE 'Corrigido: % - Ticket: % para usuário: %', 
                     v_count, v_new_ticket_id, user_record.name;
    END LOOP;
    
    RAISE NOTICE 'CORREÇÃO COMPLETA: % registros corrigidos', v_count;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- 4. VERIFICAR RESULTADOS
SELECT 
    'ANTES_CORREÇÃO' as status,
    COUNT(*) as total_ticket_users,
    COUNT(ticket_id) as com_ticket_id,
    COUNT(*) - COUNT(ticket_id) as ticket_id_null
FROM ticket_users;

-- Estatísticas após correção
SELECT 
    'APÓS_CORREÇÃO' as status,
    COUNT(*) as total_ticket_users,
    COUNT(ticket_id) as com_ticket_id,
    COUNT(*) - COUNT(ticket_id) as ticket_id_null
FROM ticket_users;

-- Listar tickets criados automaticamente
SELECT 
    t.id as ticket_id,
    t.description,
    t.created_at as ticket_created,
    tu.name as user_name,
    tu.qr_code,
    e.title as event_title
FROM tickets t
JOIN ticket_users tu ON t.id = tu.ticket_id
JOIN events e ON t.event_id = e.id
WHERE t.description LIKE '%criado automaticamente%' 
   OR t.description LIKE '%Ticket criado para:%'
ORDER BY t.created_at DESC;

-- =====================================================
-- TESTE DO TRIGGER
-- =====================================================

-- 5. TESTE: Inserir ticket_user sem ticket_id
-- (Descomente para testar)

/*
INSERT INTO ticket_users (
    id,
    name,
    email,
    event_id,
    qr_code,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Teste Trigger',
    'teste@trigger.com',
    (SELECT id FROM events LIMIT 1), -- Pega primeiro evento
    'TEST_QR_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    NOW(),
    NOW()
);

-- Verificar se ticket foi criado automaticamente
SELECT 
    tu.name,
    tu.qr_code,
    tu.ticket_id,
    t.description as ticket_description
FROM ticket_users tu
LEFT JOIN tickets t ON tu.ticket_id = t.id
WHERE tu.name = 'Teste Trigger';
*/

-- =====================================================
-- RESUMO DA SOLUÇÃO
-- =====================================================
/*
✅ TRIGGER INSTALADO:
- Detecta ticket_id NULL em novos ticket_users
- Cria ticket automaticamente
- Associa ticket ao usuário

✅ REGISTROS EXISTENTES CORRIGIDOS:
- Todos ticket_id NULL foram corrigidos
- Tickets criados com dados consistentes
- Mantidas datas originais

✅ PREVENÇÃO FUTURA:
- Novos ticket_users sempre terão ticket_id
- Dados consistentes automaticamente
- Sem mais erros de ticket_id NULL

🎯 EXECUTE ESTE SQL NO SUPABASE PARA:
1. Instalar o trigger automático
2. Corrigir registros existentes  
3. Prevenir problemas futuros
*/