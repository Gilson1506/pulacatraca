-- ✅ SCRIPT COMPLETO - CORRIGIR TABELA CHECKIN E FUNÇÕES
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO SISTEMA DE CHECK-IN COMPLETO ===';
END $$;

-- 1. Verificar se a tabela checkin existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'checkin'
    ) THEN
        RAISE EXCEPTION 'Tabela checkin não existe!';
    END IF;
    
    RAISE NOTICE '✅ Tabela checkin encontrada';
END $$;

-- 2. Adicionar coluna organizer_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'checkin' 
        AND column_name = 'organizer_id'
    ) THEN
        ALTER TABLE checkin ADD COLUMN organizer_id UUID;
        RAISE NOTICE '✅ Coluna organizer_id adicionada na tabela checkin';
    ELSE
        RAISE NOTICE '⚠️ Coluna organizer_id já existe na tabela checkin';
    END IF;
END $$;

-- 3. Adicionar referência foreign key se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkin_organizer_id_fkey'
    ) THEN
        ALTER TABLE checkin 
        ADD CONSTRAINT checkin_organizer_id_fkey 
        FOREIGN KEY (organizer_id) REFERENCES auth.users(id);
        RAISE NOTICE '✅ Foreign key para organizer_id criada';
    ELSE
        RAISE NOTICE '⚠️ Foreign key para organizer_id já existe';
    END IF;
END $$;

-- 4. Atualizar dados existentes (copiar organizer_id dos eventos)
DO $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE checkin 
    SET organizer_id = e.organizer_id
    FROM events e
    WHERE checkin.event_id = e.id 
    AND checkin.organizer_id IS NULL;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RAISE NOTICE '✅ Atualizados % registros com organizer_id', updated_rows;
END $$;

-- 5. Criar função checkin_by_qr_code (para scanner QR)
DROP FUNCTION IF EXISTS checkin_by_qr_code(text, uuid, uuid);

CREATE OR REPLACE FUNCTION checkin_by_qr_code(
    p_qr_code TEXT,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    participant_info JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ticket_user_record RECORD;
    v_event_record RECORD;
    v_existing_checkin RECORD;
    v_checkin_id UUID;
BEGIN
    RAISE NOTICE 'checkin_by_qr_code: QR=%, event_id=%, organizer_id=%', p_qr_code, p_event_id, p_organizer_id;
    
    -- 1. Verificar se o evento existe e pertence ao organizador
    SELECT * INTO v_event_record 
    FROM events 
    WHERE id = p_event_id AND organizer_id = p_organizer_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Evento não encontrado ou sem permissão' as message,
            jsonb_build_object(
                'error_code', 'event_not_found',
                'qr_code', p_qr_code,
                'event_id', p_event_id
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 2. Buscar ticket_user pelo QR code
    SELECT tu.*, t.event_id, t.ticket_type, t.id as ticket_id
    INTO v_ticket_user_record
    FROM ticket_users tu
    JOIN tickets t ON t.ticket_user_id = tu.id
    WHERE COALESCE(tu.qr_code, t.qr_code) = p_qr_code
    AND t.event_id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'QR Code não encontrado para este evento' as message,
            jsonb_build_object(
                'error_code', 'qr_not_found',
                'qr_code', p_qr_code,
                'event_id', p_event_id,
                'event_title', v_event_record.title
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 3. Verificar se já foi feito check-in
    SELECT * INTO v_existing_checkin
    FROM checkin 
    WHERE ticket_user_id = v_ticket_user_record.id 
    AND event_id = p_event_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Check-in já foi realizado anteriormente' as message,
            jsonb_build_object(
                'error_code', 'already_checked',
                'participant_name', v_ticket_user_record.name,
                'participant_email', v_ticket_user_record.email,
                'ticket_type', v_ticket_user_record.ticket_type,
                'event_title', v_event_record.title,
                'checkin_date', v_existing_checkin.created_at,
                'already_checked', true
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 4. Realizar check-in
    INSERT INTO checkin (
        id,
        ticket_user_id,
        event_id,
        organizer_id,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_ticket_user_record.id,
        p_event_id,
        p_organizer_id,
        NOW()
    ) RETURNING id INTO v_checkin_id;
    
    -- 5. Retornar sucesso
    RETURN QUERY SELECT 
        TRUE as success,
        'Check-in realizado com sucesso!' as message,
        jsonb_build_object(
            'checkin_id', v_checkin_id,
            'participant_name', v_ticket_user_record.name,
            'participant_email', v_ticket_user_record.email,
            'participant_document', v_ticket_user_record.document,
            'ticket_type', v_ticket_user_record.ticket_type,
            'event_title', v_event_record.title,
            'checkin_date', NOW(),
            'ticket_id', v_ticket_user_record.ticket_id
        ) as participant_info;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função checkin_by_qr_code: %', SQLERRM;
        RETURN QUERY SELECT 
            FALSE as success,
            'Erro interno durante o check-in: ' || SQLERRM as message,
            jsonb_build_object(
                'error_code', 'internal_error',
                'error_details', SQLERRM,
                'qr_code', p_qr_code
            ) as participant_info;
        RETURN;
END $$;

-- 6. Criar função perform_participant_checkin (para check-in manual)
DROP FUNCTION IF EXISTS perform_participant_checkin(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION perform_participant_checkin(
    p_ticket_user_id UUID,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    participant_info JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ticket_user_record RECORD;
    v_event_record RECORD;
    v_existing_checkin RECORD;
    v_checkin_id UUID;
BEGIN
    RAISE NOTICE 'perform_participant_checkin: ticket_user_id=%, event_id=%, organizer_id=%', p_ticket_user_id, p_event_id, p_organizer_id;
    
    -- 1. Verificar se o evento existe e pertence ao organizador
    SELECT * INTO v_event_record 
    FROM events 
    WHERE id = p_event_id AND organizer_id = p_organizer_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Evento não encontrado ou sem permissão' as message,
            jsonb_build_object(
                'error_code', 'event_not_found',
                'ticket_user_id', p_ticket_user_id,
                'event_id', p_event_id
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 2. Buscar ticket_user
    SELECT tu.*, t.event_id, t.ticket_type, t.id as ticket_id
    INTO v_ticket_user_record
    FROM ticket_users tu
    JOIN tickets t ON t.ticket_user_id = tu.id
    WHERE tu.id = p_ticket_user_id
    AND t.event_id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Participante não encontrado para este evento' as message,
            jsonb_build_object(
                'error_code', 'participant_not_found',
                'ticket_user_id', p_ticket_user_id,
                'event_id', p_event_id
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 3. Verificar se já foi feito check-in
    SELECT * INTO v_existing_checkin
    FROM checkin 
    WHERE ticket_user_id = p_ticket_user_id 
    AND event_id = p_event_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            FALSE as success,
            'Check-in já foi realizado anteriormente' as message,
            jsonb_build_object(
                'error_code', 'already_checked',
                'participant_name', v_ticket_user_record.name,
                'participant_email', v_ticket_user_record.email,
                'ticket_type', v_ticket_user_record.ticket_type,
                'event_title', v_event_record.title,
                'checkin_date', v_existing_checkin.created_at,
                'already_checked', true
            ) as participant_info;
        RETURN;
    END IF;
    
    -- 4. Realizar check-in
    INSERT INTO checkin (
        id,
        ticket_user_id,
        event_id,
        organizer_id,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_ticket_user_id,
        p_event_id,
        p_organizer_id,
        NOW()
    ) RETURNING id INTO v_checkin_id;
    
    -- 5. Retornar sucesso
    RETURN QUERY SELECT 
        TRUE as success,
        'Check-in realizado com sucesso!' as message,
        jsonb_build_object(
            'checkin_id', v_checkin_id,
            'participant_name', v_ticket_user_record.name,
            'participant_email', v_ticket_user_record.email,
            'participant_document', v_ticket_user_record.document,
            'ticket_type', v_ticket_user_record.ticket_type,
            'event_title', v_event_record.title,
            'checkin_date', NOW(),
            'ticket_id', v_ticket_user_record.ticket_id
        ) as participant_info;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função perform_participant_checkin: %', SQLERRM;
        RETURN QUERY SELECT 
            FALSE as success,
            'Erro interno durante o check-in: ' || SQLERRM as message,
            jsonb_build_object(
                'error_code', 'internal_error',
                'error_details', SQLERRM,
                'ticket_user_id', p_ticket_user_id
            ) as participant_info;
        RETURN;
END $$;

-- 7. Atualizar função search_participants_by_text
DROP FUNCTION IF EXISTS search_participants_by_text(text, uuid, uuid);

CREATE OR REPLACE FUNCTION search_participants_by_text(
    p_search_text TEXT,
    p_event_id UUID,
    p_organizer_id UUID
) RETURNS TABLE (
    ticket_user_id UUID,
    name TEXT,
    email TEXT,
    document TEXT,
    ticket_type TEXT,
    qr_code TEXT,
    is_checked_in BOOLEAN,
    checkin_date TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tu.id as ticket_user_id,
        tu.name,
        tu.email,
        tu.document,
        t.ticket_type,
        COALESCE(tu.qr_code, t.qr_code) as qr_code,
        (c.id IS NOT NULL) as is_checked_in,
        c.created_at as checkin_date
    FROM ticket_users tu
    JOIN tickets t ON t.ticket_user_id = tu.id
    LEFT JOIN checkin c ON c.ticket_user_id = tu.id AND c.event_id = p_event_id
    WHERE t.event_id = p_event_id
    AND (
        tu.name ILIKE '%' || p_search_text || '%' OR
        tu.email ILIKE '%' || p_search_text || '%' OR
        tu.document ILIKE '%' || p_search_text || '%' OR
        COALESCE(tu.qr_code, t.qr_code) ILIKE '%' || p_search_text || '%'
    )
    ORDER BY tu.name;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função search_participants_by_text: %', SQLERRM;
        -- Retornar resultado vazio em caso de erro
        RETURN;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de check-in completamente corrigido!';
    RAISE NOTICE '✅ Tabela checkin com coluna organizer_id';
    RAISE NOTICE '✅ Função checkin_by_qr_code atualizada (scanner QR)';
    RAISE NOTICE '✅ Função perform_participant_checkin criada (check-in manual)';
    RAISE NOTICE '✅ Função search_participants_by_text atualizada';
END $$;