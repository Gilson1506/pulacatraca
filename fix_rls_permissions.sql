-- Script para diagnosticar e corrigir problemas de permissão RLS na tabela events
-- Execute este script no seu banco de dados Supabase

-- 1. DIAGNÓSTICO INICIAL
DO $$
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DE PERMISSÕES RLS ===';
    RAISE NOTICE 'Verificando estrutura e permissões...';
END $$;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'events';

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 2. VERIFICAR PROBLEMAS DE AUTENTICAÇÃO
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO PROBLEMAS DE AUTENTICAÇÃO ===';
END $$;

-- Verificar se há eventos sem organizer_id
SELECT 
    id,
    title,
    organizer_id,
    created_by,
    status,
    created_at,
    CASE 
        WHEN organizer_id IS NULL THEN '❌ SEM ORGANIZADOR'
        WHEN organizer_id = created_by THEN '✅ ORGANIZADOR CORRETO'
        ELSE '⚠️ ORGANIZADOR DIFERENTE DO CRIADOR'
    END as organizador_status
FROM events 
WHERE organizer_id IS NULL OR organizer_id != created_by
ORDER BY created_at DESC;

-- Verificar se há usuários com role incorreto
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'organizer_id' as organizer_id_meta,
    created_at,
    CASE 
        WHEN raw_user_meta_data->>'role' IS NULL THEN '❌ SEM ROLE'
        WHEN raw_user_meta_data->>'role' = 'organizer' THEN '✅ ORGANIZADOR'
        WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ ADMIN'
        ELSE '⚠️ ROLE DESCONHECIDO'
    END as role_status
FROM auth.users 
WHERE raw_user_meta_data->>'role' IN ('organizer', 'admin')
   OR raw_user_meta_data->>'role' IS NULL
ORDER BY created_at DESC;

-- 3. CORRIGIR PROBLEMAS DE DADOS
DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO PROBLEMAS DE DADOS ===';
END $$;

-- Corrigir eventos sem organizer_id (definir como created_by)
UPDATE events 
SET organizer_id = created_by
WHERE organizer_id IS NULL AND created_by IS NOT NULL;

-- Corrigir eventos onde organizer_id é diferente de created_by
UPDATE events 
SET organizer_id = created_by
WHERE organizer_id != created_by AND created_by IS NOT NULL;

-- 4. REMOVER POLÍTICAS PROBLEMÁTICAS
DO $$
BEGIN
    RAISE NOTICE '=== REMOVENDO POLÍTICAS PROBLEMÁTICAS ===';
END $$;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;
DROP POLICY IF EXISTS "events_delete_policy" ON events;
DROP POLICY IF EXISTS "Users can view published events" ON events;
DROP POLICY IF EXISTS "Organizers can manage their events" ON events;
DROP POLICY IF EXISTS "Users can view approved events" ON events;
DROP POLICY IF EXISTS "Users can create their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;

-- 5. CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
DO $$
BEGIN
    RAISE NOTICE '=== CRIANDO POLÍTICAS SIMPLES ===';
END $$;

-- Política para visualização (mais permissiva para teste)
CREATE POLICY "events_select_simple" ON events
FOR SELECT USING (
    -- Qualquer pessoa pode ver eventos aprovados
    status = 'approved' 
    OR 
    -- Organizadores podem ver seus próprios eventos
    organizer_id = auth.uid()
    OR
    -- Usuários autenticados podem ver eventos que criaram
    created_by = auth.uid()
    OR
    -- Admins podem ver todos os eventos
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Política para criação (permissiva para teste)
CREATE POLICY "events_insert_simple" ON events
FOR INSERT WITH CHECK (
    -- Usuários autenticados podem criar eventos
    auth.uid() IS NOT NULL
    AND
    -- O organizer_id deve ser o usuário atual
    organizer_id = auth.uid()
);

-- Política para atualização (permissiva para teste)
CREATE POLICY "events_update_simple" ON events
FOR UPDATE USING (
    -- Organizadores podem editar seus próprios eventos
    organizer_id = auth.uid()
    OR
    -- Usuários podem editar eventos que criaram
    created_by = auth.uid()
    OR
    -- Admins podem editar qualquer evento
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Política para exclusão (permissiva para teste)
CREATE POLICY "events_delete_simple" ON events
FOR DELETE USING (
    -- Organizadores podem excluir seus próprios eventos
    organizer_id = auth.uid()
    OR
    -- Usuários podem excluir eventos que criaram
    created_by = auth.uid()
    OR
    -- Admins podem excluir qualquer evento
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- 6. VERIFICAR SE RLS ESTÁ FUNCIONANDO
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO FUNCIONAMENTO DO RLS ===';
END $$;

-- Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 7. TESTAR PERMISSÕES
DO $$
BEGIN
    RAISE NOTICE '=== TESTANDO PERMISSÕES ===';
END $$;

-- Contar eventos por organizador
SELECT 
    organizer_id,
    COUNT(*) as total_eventos,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejeitados
FROM events 
GROUP BY organizer_id
ORDER BY total_eventos DESC;

-- 8. CRIAR FUNÇÃO DE TESTE DE PERMISSÃO
CREATE OR REPLACE FUNCTION test_event_permissions(event_id_param UUID)
RETURNS TABLE(
    can_view BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    event_record RECORD;
    user_id UUID;
    user_role TEXT;
BEGIN
    -- Obter usuário atual
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE, FALSE, 'Usuário não autenticado';
        RETURN;
    END IF;
    
    -- Buscar evento
    SELECT * INTO event_record 
    FROM events 
    WHERE id = event_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FALSE, FALSE, 'Evento não encontrado';
        RETURN;
    END IF;
    
    -- Verificar role do usuário
    SELECT raw_user_meta_data->>'role' INTO user_role
    FROM auth.users 
    WHERE id = user_id;
    
    -- Verificar permissões
    RETURN QUERY SELECT 
        -- Pode visualizar
        (event_record.status = 'approved' OR 
         event_record.organizer_id = user_id OR 
         event_record.created_by = user_id OR 
         user_role = 'admin')::BOOLEAN as can_view,
        
        -- Pode editar
        (event_record.organizer_id = user_id OR 
         event_record.created_by = user_id OR 
         user_role = 'admin')::BOOLEAN as can_edit,
        
        -- Pode excluir
        (event_record.organizer_id = user_id OR 
         event_record.created_by = user_id OR 
         user_role = 'admin')::BOOLEAN as can_delete,
        
        CASE 
            WHEN user_role = 'admin' THEN 'Usuário é admin'
            WHEN event_record.organizer_id = user_id THEN 'Usuário é organizador'
            WHEN event_record.created_by = user_id THEN 'Usuário criou o evento'
            WHEN event_record.status = 'approved' THEN 'Evento aprovado (visualização pública)'
            ELSE 'Sem permissão'
        END as reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. TESTAR A FUNÇÃO
DO $$
BEGIN
    RAISE NOTICE '=== TESTANDO FUNÇÃO DE PERMISSÕES ===';
END $$;

-- Testar com um evento existente (substitua o UUID por um real)
SELECT 'Teste de permissões para evento:' as info;
SELECT * FROM test_event_permissions('00000000-0000-0000-0000-000000000000');

-- 10. RECOMENDAÇÕES FINAIS
DO $$
BEGIN
    RAISE NOTICE '=== RECOMENDAÇÕES ===';
    RAISE NOTICE '✅ Execute este script para corrigir permissões básicas';
    RAISE NOTICE '✅ Teste a criação e edição de eventos';
    RAISE NOTICE '✅ Se funcionar, execute o script completo de políticas';
    RAISE NOTICE '✅ Monitore logs de erro para identificar problemas';
    RAISE NOTICE '✅ Configure roles corretos para usuários organizadores';
END $$;

-- 11. VERIFICAR RESULTADO FINAL
DO $$
BEGIN
    RAISE NOTICE '=== RESULTADO FINAL ===';
    RAISE NOTICE 'Políticas criadas com sucesso!';
    RAISE NOTICE 'Teste agora a criação e edição de eventos.';
    RAISE NOTICE 'Se houver problemas, verifique os logs de erro.';
END $$;
