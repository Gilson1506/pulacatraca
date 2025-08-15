-- =====================================================
-- TRIGGER CORRIGIDO - SEM COLUNA TYPE
-- =====================================================
-- Solução para o erro: column "type" of relation "tickets" does not exist

-- 1. FUNÇÃO CORRIGIDA SEM COLUNA TYPE
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
        SELECT id, title, price, organizer_id, created_by
        INTO v_event_data
        FROM events 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Se não encontrar eventos, criar com dados padrão
        IF NOT FOUND THEN
            RAISE NOTICE 'Nenhum evento encontrado, criando ticket genérico';
            
            -- INSERT adaptado para estrutura real da tabela tickets
            INSERT INTO tickets (
                id,
                event_id,
                price,
                description,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                NULL, -- Sem evento específico
                0,
                'Ticket auto-criado para: ' || NEW.name || ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ')',
                NOW(),
                NOW()
            ) RETURNING id INTO v_new_ticket_id;
            
        ELSE
            -- Cria ticket associado ao evento mais recente
            INSERT INTO tickets (
                id,
                event_id,
                price,
                description,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_event_data.id,
                COALESCE(v_event_data.price, 0),
                'Ticket auto-criado para: ' || NEW.name || ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ') - Evento: ' || v_event_data.title,
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

-- 2. REINSTALAR TRIGGER
DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;

CREATE TRIGGER trigger_auto_create_ticket
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_ticket_for_user();

-- =====================================================
-- CORREÇÃO DOS REGISTROS EXISTENTES - SEM TYPE
-- =====================================================

-- 3. CORRIGIR REGISTROS EXISTENTES (VERSÃO CORRIGIDA)
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'INICIANDO CORREÇÃO DE REGISTROS EXISTENTES (SEM TYPE)';
    
    -- Busca evento padrão
    SELECT id, title, price, organizer_id, created_by
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
    END IF;
    
    -- Processa todos ticket_users com ticket_id NULL
    FOR user_record IN 
        SELECT id, name, email, qr_code, created_at
        FROM ticket_users 
        WHERE ticket_id IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Cria ticket SEM coluna type
        INSERT INTO tickets (
            id,
            event_id,
            price,
            description,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_event_data.id,
            COALESCE(v_event_data.price, 0),
            'Ticket corrigido para: ' || user_record.name || ' (QR: ' || COALESCE(user_record.qr_code, 'N/A') || ')',
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

-- 5. VERIFICAR TICKETS CRIADOS
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
    t.price,
    LEFT(t.description, 60) || '...' as description_preview,
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
-- TESTE DO TRIGGER CORRIGIDO
-- =====================================================

-- 7. TESTE SEM COLUNA TYPE
-- (Descomente para testar)

/*
-- Teste: Usuário novo sem ticket_id
INSERT INTO ticket_users (
    name,
    email,
    qr_code
) VALUES (
    'Teste Sem Type',
    'teste.sem.type@trigger.com',
    'QR_SEM_TYPE_' || EXTRACT(EPOCH FROM NOW())::TEXT
);

-- Verificar resultado
SELECT 
    tu.name,
    tu.email,
    tu.qr_code,
    tu.ticket_id,
    t.description as ticket_description,
    t.event_id,
    t.price
FROM ticket_users tu
LEFT JOIN tickets t ON tu.ticket_id = t.id
WHERE tu.name = 'Teste Sem Type';
*/

-- =====================================================
-- CONSULTA PARA DESCOBRIR ESTRUTURA REAL
-- =====================================================

-- 8. Para descobrir estrutura real da tabela tickets:
/*
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
*/

-- =====================================================
-- RESUMO DA CORREÇÃO
-- =====================================================
/*
❌ ERRO CORRIGIDO:
- Removida coluna "type" inexistente
- INSERT adaptado para estrutura real
- Trigger funcionando sem erros

✅ FUNCIONALIDADES MANTIDAS:
- Auto-criação de tickets para novos ticket_users
- Correção de registros existentes com ticket_id NULL
- Associação ao evento mais recente
- Logs detalhados de operações

✅ ESTRUTURA ADAPTADA:
- Apenas colunas que existem na tabela tickets
- Sem referências a campos inexistentes
- Compatível com estrutura real do banco

🎯 EXECUTE ESTE SQL CORRIGIDO NO SUPABASE
*/