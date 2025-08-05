-- =====================================================
-- TRIGGER ADAPTATIVO - DETECTA ESTRUTURA AUTOMATICAMENTE
-- =====================================================
-- Este trigger se adapta à estrutura real da tabela tickets
-- Funciona independente de quais colunas existem

-- 1. FUNÇÃO PARA DETECTAR ESTRUTURA DA TABELA TICKETS
CREATE OR REPLACE FUNCTION get_tickets_table_structure()
RETURNS TABLE(
    has_ticket_type BOOLEAN,
    has_status BOOLEAN,
    has_description BOOLEAN,
    has_event_id BOOLEAN,
    has_created_at BOOLEAN,
    has_updated_at BOOLEAN,
    has_price BOOLEAN,
    columns_list TEXT
) AS $$
DECLARE
    col_record RECORD;
    cols_array TEXT[] := '{}';
BEGIN
    -- Detectar todas as colunas da tabela tickets
    FOR col_record IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tickets'
        ORDER BY ordinal_position
    LOOP
        cols_array := array_append(cols_array, col_record.column_name);
    END LOOP;
    
    RETURN QUERY SELECT
        'ticket_type' = ANY(cols_array) as has_ticket_type,
        'status' = ANY(cols_array) as has_status,
        'description' = ANY(cols_array) as has_description,
        'event_id' = ANY(cols_array) as has_event_id,
        'created_at' = ANY(cols_array) as has_created_at,
        'updated_at' = ANY(cols_array) as has_updated_at,
        'price' = ANY(cols_array) as has_price,
        array_to_string(cols_array, ', ') as columns_list;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNÇÃO ADAPTATIVA PARA AUTO-CRIAR TICKET
CREATE OR REPLACE FUNCTION auto_create_ticket_for_user_adaptive()
RETURNS TRIGGER AS $$
DECLARE
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_structure RECORD;
    v_sql TEXT;
    v_values TEXT;
    v_columns TEXT;
BEGIN
    -- Verifica se ticket_id está NULL
    IF NEW.ticket_id IS NULL THEN
        
        RAISE NOTICE 'Criando ticket automaticamente para usuário: % (QR: %)', NEW.name, NEW.qr_code;
        
        -- Detectar estrutura da tabela tickets
        SELECT * INTO v_structure FROM get_tickets_table_structure() LIMIT 1;
        
        RAISE NOTICE 'Estrutura detectada: %', v_structure.columns_list;
        
        -- Busca evento mais recente (se tabela events existir)
        BEGIN
            SELECT id, title, COALESCE(price, 0) as price, 
                   COALESCE(ticket_type, 'Ingresso') as ticket_type
            INTO v_event_data
            FROM events 
            ORDER BY created_at DESC 
            LIMIT 1;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Tabela events não encontrada ou erro: %', SQLERRM;
                v_event_data := NULL;
        END;
        
        -- Preparar SQL dinâmico baseado na estrutura
        v_new_ticket_id := gen_random_uuid();
        v_columns := 'id';
        v_values := '''' || v_new_ticket_id || '''';
        
        -- Adicionar colunas condicionalmente
        IF v_structure.has_event_id THEN
            v_columns := v_columns || ', event_id';
            IF v_event_data.id IS NOT NULL THEN
                v_values := v_values || ', ''' || v_event_data.id || '''';
            ELSE
                v_values := v_values || ', NULL';
            END IF;
        END IF;
        
        IF v_structure.has_ticket_type THEN
            v_columns := v_columns || ', ticket_type';
            IF v_event_data.ticket_type IS NOT NULL THEN
                v_values := v_values || ', ''' || v_event_data.ticket_type || '''';
            ELSE
                v_values := v_values || ', ''Ingresso Padrão''';
            END IF;
        END IF;
        
        IF v_structure.has_price THEN
            v_columns := v_columns || ', price';
            IF v_event_data.price IS NOT NULL THEN
                v_values := v_values || ', ' || v_event_data.price;
            ELSE
                v_values := v_values || ', 0';
            END IF;
        END IF;
        
        IF v_structure.has_description THEN
            v_columns := v_columns || ', description';
            v_values := v_values || ', ''Ticket auto-criado para: ' || NEW.name || ' (QR: ' || COALESCE(NEW.qr_code, 'N/A') || ')''';
        END IF;
        
        IF v_structure.has_status THEN
            v_columns := v_columns || ', status';
            v_values := v_values || ', ''active''';
        END IF;
        
        IF v_structure.has_created_at THEN
            v_columns := v_columns || ', created_at';
            v_values := v_values || ', NOW()';
        END IF;
        
        IF v_structure.has_updated_at THEN
            v_columns := v_columns || ', updated_at';
            v_values := v_values || ', NOW()';
        END IF;
        
        -- Construir e executar SQL
        v_sql := 'INSERT INTO tickets (' || v_columns || ') VALUES (' || v_values || ')';
        
        RAISE NOTICE 'Executando SQL: %', v_sql;
        
        BEGIN
            EXECUTE v_sql;
            
            -- Atribui o novo ticket_id ao ticket_user
            NEW.ticket_id := v_new_ticket_id;
            
            RAISE NOTICE 'Ticket criado com sucesso: % atribuído ao usuário: %', v_new_ticket_id, NEW.name;
            
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Erro ao criar ticket: %', SQLERRM;
                RAISE NOTICE 'SQL que falhou: %', v_sql;
                -- Não interrompe o processo, apenas não cria o ticket
        END;
        
    ELSE
        RAISE NOTICE 'Usuário % já possui ticket_id: %', NEW.name, NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. INSTALAR/REINSTALAR TRIGGER ADAPTATIVO
DROP TRIGGER IF EXISTS trigger_auto_create_ticket ON ticket_users;

CREATE TRIGGER trigger_auto_create_ticket
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_ticket_for_user_adaptive();

-- =====================================================
-- CORREÇÃO ADAPTATIVA DOS REGISTROS EXISTENTES
-- =====================================================

-- 4. CORRIGIR REGISTROS EXISTENTES DE FORMA ADAPTATIVA
DO $$
DECLARE
    user_record RECORD;
    v_new_ticket_id UUID;
    v_event_data RECORD;
    v_structure RECORD;
    v_sql TEXT;
    v_values TEXT;
    v_columns TEXT;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'INICIANDO CORREÇÃO ADAPTATIVA DE REGISTROS EXISTENTES';
    
    -- Detectar estrutura da tabela tickets
    SELECT * INTO v_structure FROM get_tickets_table_structure() LIMIT 1;
    RAISE NOTICE 'Estrutura detectada: %', v_structure.columns_list;
    
    -- Busca evento padrão (se existir)
    BEGIN
        SELECT id, title, COALESCE(price, 0) as price, 
               COALESCE(ticket_type, 'Ingresso') as ticket_type
        INTO v_event_data
        FROM events 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE 'Evento padrão encontrado: % (ID: %)', v_event_data.title, v_event_data.id;
        END IF;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Tabela events não encontrada, usando dados padrão';
            v_event_data.id := NULL;
            v_event_data.title := 'Evento Padrão';
            v_event_data.price := 0;
            v_event_data.ticket_type := 'Ingresso';
    END;
    
    -- Processa todos ticket_users com ticket_id NULL
    FOR user_record IN 
        SELECT id, name, email, qr_code, created_at
        FROM ticket_users 
        WHERE ticket_id IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Preparar SQL dinâmico para cada registro
        v_new_ticket_id := gen_random_uuid();
        v_columns := 'id';
        v_values := '''' || v_new_ticket_id || '''';
        
        -- Adicionar colunas condicionalmente
        IF v_structure.has_event_id THEN
            v_columns := v_columns || ', event_id';
            IF v_event_data.id IS NOT NULL THEN
                v_values := v_values || ', ''' || v_event_data.id || '''';
            ELSE
                v_values := v_values || ', NULL';
            END IF;
        END IF;
        
        IF v_structure.has_ticket_type THEN
            v_columns := v_columns || ', ticket_type';
            v_values := v_values || ', ''' || COALESCE(v_event_data.ticket_type, 'Ingresso') || '''';
        END IF;
        
        IF v_structure.has_price THEN
            v_columns := v_columns || ', price';
            v_values := v_values || ', ' || COALESCE(v_event_data.price, 0);
        END IF;
        
        IF v_structure.has_description THEN
            v_columns := v_columns || ', description';
            v_values := v_values || ', ''Ticket corrigido para: ' || user_record.name || ' (QR: ' || COALESCE(user_record.qr_code, 'N/A') || ')''';
        END IF;
        
        IF v_structure.has_status THEN
            v_columns := v_columns || ', status';
            v_values := v_values || ', ''active''';
        END IF;
        
        IF v_structure.has_created_at THEN
            v_columns := v_columns || ', created_at';
            v_values := v_values || ', ''' || user_record.created_at || '''';
        END IF;
        
        IF v_structure.has_updated_at THEN
            v_columns := v_columns || ', updated_at';
            v_values := v_values || ', NOW()';
        END IF;
        
        -- Construir e executar SQL
        v_sql := 'INSERT INTO tickets (' || v_columns || ') VALUES (' || v_values || ')';
        
        BEGIN
            EXECUTE v_sql;
            
            -- Atualiza o ticket_user
            UPDATE ticket_users 
            SET ticket_id = v_new_ticket_id, 
                updated_at = COALESCE(updated_at, NOW())
            WHERE id = user_record.id;
            
            v_count := v_count + 1;
            
            RAISE NOTICE 'Registro %: Usuário "%" → Ticket %', 
                         v_count, user_record.name, v_new_ticket_id;
                         
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Erro ao processar usuário %: %', user_record.name, SQLERRM;
                RAISE NOTICE 'SQL que falhou: %', v_sql;
        END;
    END LOOP;
    
    RAISE NOTICE 'CORREÇÃO ADAPTATIVA CONCLUÍDA: % registros processados', v_count;
END $$;

-- =====================================================
-- VERIFICAÇÕES E DIAGNÓSTICOS
-- =====================================================

-- 5. VERIFICAR ESTRUTURA ATUAL
SELECT 'ESTRUTURA_DETECTADA' as info, * FROM get_tickets_table_structure();

-- 6. ESTATÍSTICAS APÓS CORREÇÃO
SELECT 
    'ESTATÍSTICAS_FINAIS' as status,
    COUNT(*) as total_ticket_users,
    COUNT(ticket_id) as com_ticket_id,
    COUNT(*) - COUNT(ticket_id) as ainda_null,
    ROUND(COUNT(ticket_id) * 100.0 / COUNT(*), 2) as percentual_corrigido
FROM ticket_users;

-- 7. VERIFICAR TICKETS CRIADOS
SELECT 
    'TICKETS_AUTO_CRIADOS' as tipo,
    COUNT(*) as quantidade
FROM tickets 
WHERE (description LIKE '%auto-criado%' OR description LIKE '%corrigido%')
   OR id IN (SELECT ticket_id FROM ticket_users WHERE ticket_id IS NOT NULL);

-- 8. TESTE SIMPLES DO TRIGGER
-- DESCOMENTE PARA TESTAR:
/*
INSERT INTO ticket_users (id, name, email, qr_code) 
VALUES (
    gen_random_uuid(),
    'Teste Adaptativo ' || EXTRACT(EPOCH FROM NOW())::text,
    'teste.adaptativo@exemplo.com',
    'TEST_ADAPT_' || EXTRACT(EPOCH FROM NOW())::text
);

-- Verificar resultado
SELECT 
    tu.name,
    tu.ticket_id,
    CASE WHEN tu.ticket_id IS NOT NULL THEN 'SUCESSO' ELSE 'FALHOU' END as resultado
FROM ticket_users tu
WHERE tu.name LIKE 'Teste Adaptativo%'
ORDER BY tu.created_at DESC
LIMIT 1;
*/

RAISE NOTICE '🎯 TRIGGER ADAPTATIVO INSTALADO COM SUCESSO!';
RAISE NOTICE '📊 Execute as consultas acima para verificar os resultados';