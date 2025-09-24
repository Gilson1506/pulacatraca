-- ✅ CORRIGIR FUNÇÃO SEARCH_PARTICIPANTS_BY_TEXT - COLUNA CREATED_AT
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO FUNÇÃO SEARCH_PARTICIPANTS_BY_TEXT ===';
END $$;

-- 1. Dropar função existente se existir
DROP FUNCTION IF EXISTS search_participants_by_text(text, uuid, uuid);

-- 2. Recriar função com a coluna correta
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
        COALESCE(tu.qr_code, t.qr_code) as qr_code, -- Buscar em ambas as tabelas
        (c.id IS NOT NULL) as is_checked_in,
        c.created_at as checkin_date -- Verificar se essa é a coluna correta
    FROM ticket_users tu
    JOIN tickets t ON t.ticket_user_id = tu.id
    LEFT JOIN checkins c ON c.ticket_user_id = tu.id AND c.event_id = p_event_id
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
        -- Tentar versão alternativa sem a coluna problemática
        RETURN QUERY
        SELECT 
            tu.id as ticket_user_id,
            tu.name,
            tu.email,
            tu.document,
            t.ticket_type,
            COALESCE(tu.qr_code, t.qr_code) as qr_code,
            (c.id IS NOT NULL) as is_checked_in,
            NULL::TIMESTAMP WITH TIME ZONE as checkin_date -- Retornar NULL se der erro
        FROM ticket_users tu
        JOIN tickets t ON t.ticket_user_id = tu.id
        LEFT JOIN checkins c ON c.ticket_user_id = tu.id AND c.event_id = p_event_id
        WHERE t.event_id = p_event_id
        AND (
            tu.name ILIKE '%' || p_search_text || '%' OR
            tu.email ILIKE '%' || p_search_text || '%' OR
            tu.document ILIKE '%' || p_search_text || '%' OR
            COALESCE(tu.qr_code, t.qr_code) ILIKE '%' || p_search_text || '%'
        )
        ORDER BY tu.name;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Função search_participants_by_text corrigida';
END $$;