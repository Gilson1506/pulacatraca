-- =====================================================
-- MIGRATION: Sistema de Operadores de Entrada
-- Descrição: Cria tabelas e funções para gerenciar operadores
--            que realizam check-in nos eventos
-- Data: 2025-11-10
-- =====================================================

-- =====================================================
-- 1. TABELA: event_operators
-- Armazena os operadores de entrada de cada evento
-- =====================================================
CREATE TABLE IF NOT EXISTS public.event_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    access_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    can_checkin BOOLEAN DEFAULT true,
    can_view_stats BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_access TIMESTAMP WITH TIME ZONE,
    total_checkins INTEGER DEFAULT 0,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT event_operators_name_check CHECK (char_length(name) >= 3),
    CONSTRAINT event_operators_access_code_check CHECK (char_length(access_code) = 6)
);

-- Comentários da tabela
COMMENT ON TABLE public.event_operators IS 'Operadores de entrada que realizam check-in nos eventos';
COMMENT ON COLUMN public.event_operators.organizer_id IS 'ID do organizador que criou o operador';
COMMENT ON COLUMN public.event_operators.event_id IS 'ID do evento (NULL = operador global para todos os eventos do organizador)';
COMMENT ON COLUMN public.event_operators.access_code IS 'Código de 6 dígitos para acesso ao app operador';
COMMENT ON COLUMN public.event_operators.is_active IS 'Se o operador está ativo e pode fazer login';
COMMENT ON COLUMN public.event_operators.can_checkin IS 'Permissão para realizar check-in';
COMMENT ON COLUMN public.event_operators.can_view_stats IS 'Permissão para visualizar estatísticas básicas';
COMMENT ON COLUMN public.event_operators.total_checkins IS 'Total de check-ins realizados por este operador';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_operators_organizer ON public.event_operators(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_operators_event ON public.event_operators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_operators_access_code ON public.event_operators(access_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_event_operators_active ON public.event_operators(is_active, organizer_id);

-- =====================================================
-- 2. TABELA: operator_activity_log
-- Log de todas as atividades dos operadores
-- =====================================================
CREATE TABLE IF NOT EXISTS public.operator_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.event_operators(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT operator_activity_log_action_check CHECK (action IN (
        'login', 'logout', 'checkin_success', 'checkin_duplicate', 
        'checkin_error', 'view_stats', 'access_denied'
    ))
);

-- Comentários da tabela
COMMENT ON TABLE public.operator_activity_log IS 'Log de atividades dos operadores de entrada';
COMMENT ON COLUMN public.operator_activity_log.action IS 'Tipo de ação realizada pelo operador';
COMMENT ON COLUMN public.operator_activity_log.details IS 'Detalhes adicionais da ação em formato JSON';

-- Índices para performance e auditoria
CREATE INDEX IF NOT EXISTS idx_operator_activity_operator ON public.operator_activity_log(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_activity_event ON public.operator_activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_operator_activity_action ON public.operator_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_operator_activity_created ON public.operator_activity_log(created_at DESC);

-- =====================================================
-- 3. TABELA: operator_checkins
-- Relaciona check-ins com operadores (para rastreabilidade)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.operator_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id UUID NOT NULL REFERENCES public.checkin(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES public.event_operators(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint de unicidade
    CONSTRAINT operator_checkins_unique UNIQUE (checkin_id)
);

-- Comentários
COMMENT ON TABLE public.operator_checkins IS 'Relaciona check-ins com os operadores que os realizaram';

-- Índices
CREATE INDEX IF NOT EXISTS idx_operator_checkins_operator ON public.operator_checkins(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_checkins_checkin ON public.operator_checkins(checkin_id);

-- =====================================================
-- 4. FUNÇÃO: Gerar código de acesso único
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_operator_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 100;
BEGIN
    LOOP
        -- Gerar código de 6 dígitos
        v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Verificar se já existe
        SELECT EXISTS(
            SELECT 1 FROM public.event_operators 
            WHERE access_code = v_code
        ) INTO v_exists;
        
        -- Se não existe, retornar
        IF NOT v_exists THEN
            RETURN v_code;
        END IF;
        
        -- Incrementar tentativas
        v_attempts := v_attempts + 1;
        
        -- Evitar loop infinito
        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Não foi possível gerar código único após % tentativas', v_max_attempts;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_operator_access_code() IS 'Gera um código de acesso único de 6 dígitos para operadores';

-- =====================================================
-- 5. FUNÇÃO: Criar operador
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_event_operator(
    p_organizer_id UUID,
    p_event_id UUID,
    p_name TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_access_code TEXT;
    v_operator_id UUID;
    v_result JSON;
BEGIN
    -- Verificar se o organizador existe
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_organizer_id AND role = 'organizer') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Organizador não encontrado'
        );
    END IF;
    
    -- Verificar se o evento existe e pertence ao organizador (se event_id fornecido)
    IF p_event_id IS NOT NULL THEN
        IF NOT EXISTS(SELECT 1 FROM public.events WHERE id = p_event_id AND organizer_id = p_organizer_id) THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Evento não encontrado ou não pertence ao organizador'
            );
        END IF;
    END IF;
    
    -- Gerar código de acesso
    v_access_code := public.generate_operator_access_code();
    
    -- Inserir operador
    INSERT INTO public.event_operators (
        organizer_id, event_id, name, email, phone, access_code, notes
    ) VALUES (
        p_organizer_id, p_event_id, p_name, p_email, p_phone, v_access_code, p_notes
    )
    RETURNING id INTO v_operator_id;
    
    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'message', 'Operador criado com sucesso',
        'operator', json_build_object(
            'id', v_operator_id,
            'name', p_name,
            'access_code', v_access_code,
            'email', p_email,
            'phone', p_phone
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.create_event_operator IS 'Cria um novo operador de entrada para um organizador';

-- =====================================================
-- 6. FUNÇÃO: Listar operadores do organizador
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_organizer_operators(
    p_organizer_id UUID,
    p_event_id UUID DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    access_code TEXT,
    is_active BOOLEAN,
    event_id UUID,
    event_title TEXT,
    total_checkins INTEGER,
    last_access TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eo.id,
        eo.name,
        eo.email,
        eo.phone,
        eo.access_code,
        eo.is_active,
        eo.event_id,
        e.title as event_title,
        eo.total_checkins,
        eo.last_access,
        eo.created_at
    FROM public.event_operators eo
    LEFT JOIN public.events e ON eo.event_id = e.id
    WHERE eo.organizer_id = p_organizer_id
        AND (p_event_id IS NULL OR eo.event_id = p_event_id OR eo.event_id IS NULL)
        AND (p_include_inactive = true OR eo.is_active = true)
    ORDER BY eo.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_organizer_operators IS 'Lista todos os operadores de um organizador';

-- =====================================================
-- 7. FUNÇÃO: Autenticar operador
-- =====================================================
CREATE OR REPLACE FUNCTION public.authenticate_operator(
    p_access_code TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_operator RECORD;
    v_events JSON;
    v_result JSON;
BEGIN
    -- Buscar operador pelo código de acesso
    SELECT * INTO v_operator
    FROM public.event_operators
    WHERE access_code = p_access_code;
    
    -- Verificar se operador existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Código de acesso inválido'
        );
    END IF;
    
    -- Verificar se está ativo
    IF NOT v_operator.is_active THEN
        -- Log de tentativa de acesso negado
        INSERT INTO public.operator_activity_log (operator_id, action, details, ip_address, user_agent)
        VALUES (v_operator.id, 'access_denied', json_build_object('reason', 'inactive'), p_ip_address, p_user_agent);
        
        RETURN json_build_object(
            'success', false,
            'message', 'Operador inativo. Entre em contato com o organizador.'
        );
    END IF;
    
    -- Atualizar último acesso
    UPDATE public.event_operators
    SET last_access = NOW()
    WHERE id = v_operator.id;
    
    -- Buscar eventos disponíveis para o operador
    IF v_operator.event_id IS NOT NULL THEN
        -- Operador específico de um evento
        SELECT json_agg(json_build_object(
            'id', e.id,
            'title', e.title,
            'start_date', e.start_date,
            'location', e.location
        )) INTO v_events
        FROM public.events e
        WHERE e.id = v_operator.event_id
            AND e.status = 'approved';
    ELSE
        -- Operador global - todos os eventos do organizador
        SELECT json_agg(json_build_object(
            'id', e.id,
            'title', e.title,
            'start_date', e.start_date,
            'location', e.location
        )) INTO v_events
        FROM public.events e
        WHERE e.organizer_id = v_operator.organizer_id
            AND e.status = 'approved'
        ORDER BY e.start_date DESC;
    END IF;
    
    -- Log de login
    INSERT INTO public.operator_activity_log (operator_id, event_id, action, ip_address, user_agent)
    VALUES (v_operator.id, v_operator.event_id, 'login', p_ip_address, p_user_agent);
    
    -- Retornar dados do operador
    SELECT json_build_object(
        'success', true,
        'message', 'Login realizado com sucesso',
        'operator', json_build_object(
            'id', v_operator.id,
            'name', v_operator.name,
            'email', v_operator.email,
            'can_checkin', v_operator.can_checkin,
            'can_view_stats', v_operator.can_view_stats,
            'total_checkins', v_operator.total_checkins
        ),
        'events', COALESCE(v_events, '[]'::json)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.authenticate_operator IS 'Autentica um operador usando código de acesso';

-- =====================================================
-- 8. FUNÇÃO: Atualizar operador
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_event_operator(
    p_operator_id UUID,
    p_organizer_id UUID,
    p_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN := false;
BEGIN
    -- Verificar se o operador pertence ao organizador
    IF NOT EXISTS(
        SELECT 1 FROM public.event_operators 
        WHERE id = p_operator_id AND organizer_id = p_organizer_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Operador não encontrado'
        );
    END IF;
    
    -- Atualizar campos fornecidos
    UPDATE public.event_operators
    SET 
        name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
        is_active = COALESCE(p_is_active, is_active),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_operator_id;
    
    v_updated := FOUND;
    
    IF v_updated THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Operador atualizado com sucesso'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Nenhuma alteração realizada'
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION public.update_event_operator IS 'Atualiza dados de um operador';

-- =====================================================
-- 9. FUNÇÃO: Deletar operador
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_event_operator(
    p_operator_id UUID,
    p_organizer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted BOOLEAN := false;
BEGIN
    -- Verificar se o operador pertence ao organizador
    IF NOT EXISTS(
        SELECT 1 FROM public.event_operators 
        WHERE id = p_operator_id AND organizer_id = p_organizer_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Operador não encontrado'
        );
    END IF;
    
    -- Deletar operador (cascade irá deletar logs e relacionamentos)
    DELETE FROM public.event_operators
    WHERE id = p_operator_id;
    
    v_deleted := FOUND;
    
    IF v_deleted THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Operador removido com sucesso'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', 'Erro ao remover operador'
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_event_operator IS 'Remove um operador de entrada';

-- =====================================================
-- 10. FUNÇÃO: Obter estatísticas do operador
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_operator_statistics(
    p_operator_id UUID,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'total_checkins', COUNT(oc.id),
        'checkins_today', COUNT(oc.id) FILTER (WHERE DATE(oc.created_at) = CURRENT_DATE),
        'last_checkin', MAX(oc.created_at),
        'events_worked', COUNT(DISTINCT c.event_id),
        'activity_by_day', (
            SELECT json_agg(day_stats)
            FROM (
                SELECT 
                    DATE(oc.created_at) as date,
                    COUNT(*) as checkins
                FROM public.operator_checkins oc
                WHERE oc.operator_id = p_operator_id
                    AND (p_date_from IS NULL OR oc.created_at >= p_date_from)
                    AND (p_date_to IS NULL OR oc.created_at <= p_date_to)
                GROUP BY DATE(oc.created_at)
                ORDER BY DATE(oc.created_at) DESC
                LIMIT 30
            ) day_stats
        )
    ) INTO v_stats
    FROM public.operator_checkins oc
    JOIN public.checkin c ON oc.checkin_id = c.id
    WHERE oc.operator_id = p_operator_id
        AND (p_date_from IS NULL OR oc.created_at >= p_date_from)
        AND (p_date_to IS NULL OR oc.created_at <= p_date_to);
    
    RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION public.get_operator_statistics IS 'Retorna estatísticas de atividade de um operador';

-- =====================================================
-- 11. TRIGGER: Atualizar contador de check-ins
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_operator_checkin_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Incrementar contador do operador
    UPDATE public.event_operators
    SET total_checkins = total_checkins + 1
    WHERE id = NEW.operator_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_operator_checkin_count
AFTER INSERT ON public.operator_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_operator_checkin_count();

COMMENT ON TRIGGER trigger_update_operator_checkin_count ON public.operator_checkins IS 'Atualiza contador de check-ins do operador';

-- =====================================================
-- 12. TRIGGER: Atualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_operator_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_operator_updated_at
BEFORE UPDATE ON public.event_operators
FOR EACH ROW
EXECUTE FUNCTION public.update_operator_updated_at();

-- =====================================================
-- 13. RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.event_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_checkins ENABLE ROW LEVEL SECURITY;

-- Policy: Organizadores podem ver seus próprios operadores
CREATE POLICY "Organizadores podem ver seus operadores"
ON public.event_operators
FOR SELECT
USING (
    organizer_id = auth.uid()
);

-- Policy: Organizadores podem criar operadores
CREATE POLICY "Organizadores podem criar operadores"
ON public.event_operators
FOR INSERT
WITH CHECK (
    organizer_id = auth.uid()
    AND EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'organizer')
);

-- Policy: Organizadores podem atualizar seus operadores
CREATE POLICY "Organizadores podem atualizar seus operadores"
ON public.event_operators
FOR UPDATE
USING (organizer_id = auth.uid());

-- Policy: Organizadores podem deletar seus operadores
CREATE POLICY "Organizadores podem deletar seus operadores"
ON public.event_operators
FOR DELETE
USING (organizer_id = auth.uid());

-- Policy: Organizadores podem ver logs de seus operadores
CREATE POLICY "Organizadores podem ver logs de seus operadores"
ON public.operator_activity_log
FOR SELECT
USING (
    EXISTS(
        SELECT 1 FROM public.event_operators 
        WHERE id = operator_activity_log.operator_id 
        AND organizer_id = auth.uid()
    )
);

-- Policy: Sistema pode inserir logs
CREATE POLICY "Sistema pode inserir logs"
ON public.operator_activity_log
FOR INSERT
WITH CHECK (true);

-- Policy: Organizadores podem ver check-ins de seus operadores
CREATE POLICY "Organizadores podem ver check-ins de operadores"
ON public.operator_checkins
FOR SELECT
USING (
    EXISTS(
        SELECT 1 FROM public.event_operators 
        WHERE id = operator_checkins.operator_id 
        AND organizer_id = auth.uid()
    )
);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
