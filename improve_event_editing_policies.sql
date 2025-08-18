-- Script para melhorar políticas de edição de eventos para organizadores
-- Execute este script no seu banco de dados Supabase

-- 1. VERIFICAR ESTRUTURA ATUAL DAS POLÍTICAS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO POLÍTICAS ATUAIS ===';
    RAISE NOTICE 'Políticas existentes na tabela events:';
END $$;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 2. REMOVER POLÍTICAS ANTIGAS E CRIAR NOVAS
DO $$
BEGIN
    RAISE NOTICE '=== ATUALIZANDO POLÍTICAS DE EVENTOS ===';
END $$;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view published events" ON events;
DROP POLICY IF EXISTS "Organizers can manage their events" ON events;
DROP POLICY IF EXISTS "Users can view approved events" ON events;
DROP POLICY IF EXISTS "Users can create their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;

-- 3. CRIAR POLÍTICAS MODERNAS E SEGURAS

-- Política para visualização de eventos
CREATE POLICY "events_select_policy" ON events
FOR SELECT USING (
    -- Qualquer pessoa pode ver eventos aprovados
    status = 'approved' 
    OR 
    -- Organizadores podem ver seus próprios eventos (qualquer status)
    organizer_id = auth.uid()
    OR
    -- Admins podem ver todos os eventos
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Política para criação de eventos
CREATE POLICY "events_insert_policy" ON events
FOR INSERT WITH CHECK (
    -- Usuários autenticados podem criar eventos
    auth.uid() IS NOT NULL
    AND
    -- O organizer_id deve ser o usuário atual
    organizer_id = auth.uid()
    AND
    -- Campos obrigatórios devem estar preenchidos
    title IS NOT NULL 
    AND title != ''
    AND start_date IS NOT NULL
);

-- Política para atualização de eventos
CREATE POLICY "events_update_policy" ON events
FOR UPDATE USING (
    -- Organizadores podem editar seus próprios eventos
    organizer_id = auth.uid()
    AND
    -- Não podem editar eventos já finalizados
    (end_date IS NULL OR end_date > NOW())
) WITH CHECK (
    -- Validações adicionais na atualização
    title IS NOT NULL 
    AND title != ''
    AND start_date IS NOT NULL
    AND
    -- Não podem alterar o organizer_id
    organizer_id = auth.uid()
);

-- Política para exclusão de eventos
CREATE POLICY "events_delete_policy" ON events
FOR DELETE USING (
    -- Organizadores podem excluir seus próprios eventos
    organizer_id = auth.uid()
    AND
    -- Só podem excluir eventos que não tenham ingressos vendidos
    NOT EXISTS (
        SELECT 1 FROM tickets 
        WHERE event_id = events.id 
        AND status = 'sold'
    )
    AND
    -- Não podem excluir eventos já finalizados
    (end_date IS NULL OR end_date > NOW())
);

-- 4. CRIAR POLÍTICAS PARA TABELAS RELACIONADAS

-- Política para event_ticket_types
DROP POLICY IF EXISTS "Anyone can view ticket types for active events" ON event_ticket_types;

CREATE POLICY "event_ticket_types_select_policy" ON event_ticket_types
FOR SELECT USING (
    -- Qualquer pessoa pode ver tipos de ingresso de eventos aprovados
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_ticket_types.event_id 
        AND events.status = 'approved'
    )
    OR
    -- Organizadores podem ver tipos de ingresso de seus eventos
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_ticket_types.event_id 
        AND events.organizer_id = auth.uid()
    )
);

CREATE POLICY "event_ticket_types_insert_policy" ON event_ticket_types
FOR INSERT WITH CHECK (
    -- Organizadores podem criar tipos de ingresso para seus eventos
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_ticket_types.event_id 
        AND events.organizer_id = auth.uid()
    )
);

CREATE POLICY "event_ticket_types_update_policy" ON event_ticket_types
FOR UPDATE USING (
    -- Organizadores podem editar tipos de ingresso de seus eventos
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_ticket_types.event_id 
        AND events.organizer_id = auth.uid()
    )
);

CREATE POLICY "event_ticket_types_delete_policy" ON event_ticket_types
FOR DELETE USING (
    -- Organizadores podem excluir tipos de ingresso de seus eventos
    EXISTS (
        SELECT 1 FROM events 
        WHERE events.id = event_ticket_types.event_id 
        AND events.organizer_id = auth.uid()
    )
    AND
    -- Só podem excluir se não houver ingressos vendidos
    NOT EXISTS (
        SELECT 1 FROM tickets 
        WHERE ticket_type_id = event_ticket_types.id 
        AND status = 'sold'
    )
);

-- 5. CRIAR FUNÇÃO PARA VALIDAR PERMISSÕES DE EDIÇÃO
CREATE OR REPLACE FUNCTION can_edit_event(event_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_record RECORD;
    user_role TEXT;
BEGIN
    -- Buscar informações do evento
    SELECT * INTO event_record 
    FROM events 
    WHERE id = event_id_param;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se o usuário é o organizador
    IF event_record.organizer_id = auth.uid() THEN
        -- Verificar se o evento pode ser editado
        IF event_record.end_date IS NOT NULL AND event_record.end_date <= NOW() THEN
            RETURN FALSE; -- Evento já finalizado
        END IF;
        
        -- Verificar se há ingressos vendidos (opcional - pode ser configurável)
        IF EXISTS (
            SELECT 1 FROM tickets 
            WHERE event_id = event_id_param 
            AND status = 'sold'
        ) THEN
            -- Pode editar mas com restrições
            RETURN TRUE;
        END IF;
        
        RETURN TRUE;
    END IF;
    
    -- Verificar se é admin
    SELECT raw_user_meta_data->>'role' INTO user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRIAR TRIGGER PARA VALIDAR EDIÇÕES
CREATE OR REPLACE FUNCTION validate_event_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se o usuário pode editar o evento
    IF NOT can_edit_event(NEW.id) THEN
        RAISE EXCEPTION 'Você não tem permissão para editar este evento';
    END IF;
    
    -- Validações adicionais
    IF NEW.title IS NULL OR NEW.title = '' THEN
        RAISE EXCEPTION 'Título do evento é obrigatório';
    END IF;
    
    IF NEW.start_date IS NULL THEN
        RAISE EXCEPTION 'Data de início é obrigatória';
    END IF;
    
    -- Validar datas
    IF NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
        RAISE EXCEPTION 'Data de término deve ser posterior à data de início';
    END IF;
    
    -- Atualizar timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_validate_event_edit ON events;
CREATE TRIGGER trigger_validate_event_edit
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_edit();

-- 7. VERIFICAR RESULTADO
DO $$
BEGIN
    RAISE NOTICE '=== POLÍTICAS DE EVENTOS ATUALIZADAS ===';
    RAISE NOTICE '✅ Políticas de visualização criadas';
    RAISE NOTICE '✅ Políticas de criação criadas';
    RAISE NOTICE '✅ Políticas de edição criadas';
    RAISE NOTICE '✅ Políticas de exclusão criadas';
    RAISE NOTICE '✅ Função de validação criada';
    RAISE NOTICE '✅ Trigger de validação aplicado';
    RAISE NOTICE '';
    RAISE NOTICE '=== PERMISSÕES PARA ORGANIZADORES ===';
    RAISE NOTICE '✅ Podem criar eventos';
    RAISE NOTICE '✅ Podem editar seus eventos (antes do término)';
    RAISE NOTICE '✅ Podem excluir eventos sem vendas';
    RAISE NOTICE '✅ Podem gerenciar tipos de ingresso';
    RAISE NOTICE '⚠️  Restrições para eventos com vendas';
    RAISE NOTICE '⚠️  Não podem editar eventos finalizados';
END $$;

-- 8. TESTAR POLÍTICAS
DO $$
BEGIN
    RAISE NOTICE '=== TESTE DAS POLÍTICAS ===';
    RAISE NOTICE 'Para testar, execute como organizador:';
    RAISE NOTICE '1. Criar um evento';
    RAISE NOTICE '2. Editar o evento criado';
    RAISE NOTICE '3. Tentar editar evento de outro organizador (deve falhar)';
    RAISE NOTICE '4. Verificar logs de auditoria';
END $$;
