-- ✅ CORRIGIR TABELA CHECKINS - ADICIONAR COLUNA ORGANIZER_ID
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO TABELA CHECKINS ===';
END $$;

-- 1. Verificar se a tabela checkins existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'checkins'
    ) THEN
        RAISE EXCEPTION 'Tabela checkins não existe!';
    END IF;
    
    RAISE NOTICE '✅ Tabela checkins encontrada';
END $$;

-- 2. Adicionar coluna organizer_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'checkins' 
        AND column_name = 'organizer_id'
    ) THEN
        ALTER TABLE checkins ADD COLUMN organizer_id UUID;
        RAISE NOTICE '✅ Coluna organizer_id adicionada na tabela checkins';
    ELSE
        RAISE NOTICE '⚠️ Coluna organizer_id já existe na tabela checkins';
    END IF;
END $$;

-- 3. Adicionar referência foreign key se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_organizer_id_fkey'
    ) THEN
        ALTER TABLE checkins 
        ADD CONSTRAINT checkins_organizer_id_fkey 
        FOREIGN KEY (organizer_id) REFERENCES auth.users(id);
        RAISE NOTICE '✅ Foreign key para organizer_id criada';
    ELSE
        RAISE NOTICE '⚠️ Foreign key para organizer_id já existe';
    END IF;
END $$;

-- 4. Atualizar dados existentes (copiar organizer_id dos eventos)
DO $$
BEGIN
    UPDATE checkins 
    SET organizer_id = e.organizer_id
    FROM events e
    WHERE checkins.event_id = e.id 
    AND checkins.organizer_id IS NULL;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RAISE NOTICE '✅ Atualizados % registros com organizer_id', updated_rows;
END $$;

-- 5. Recriar função checkin_by_qr_code corrigida
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
    FROM checkins 
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
    INSERT INTO checkins (
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

DO $$
BEGIN
    RAISE NOTICE '✅ Tabela checkins corrigida com coluna organizer_id';
    RAISE NOTICE '✅ Função checkin_by_qr_code atualizada';
END $$;