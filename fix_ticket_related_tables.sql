-- ===================================================================
-- SCRIPT PARA ATUALIZAR TABELAS RELACIONADAS AOS INGRESSOS
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS RELACIONADAS AOS INGRESSOS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO TABELAS RELACIONADAS AOS INGRESSOS ===';
END $$;

-- Verificar se as tabelas existem
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ticket_users', 'ticket_history', 'checkin')
ORDER BY table_name;

-- 2. CRIAR/ATUALIZAR TABELA TICKET_USERS
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURANDO TABELA TICKET_USERS ===';
    
    -- Criar tabela ticket_users se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        CREATE TABLE ticket_users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            document TEXT,
            phone TEXT,
            birth_date DATE,
            gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
            address TEXT,
            city TEXT,
            state TEXT,
            zip_code TEXT,
            emergency_contact TEXT,
            emergency_phone TEXT,
            dietary_restrictions TEXT,
            special_needs TEXT,
            marketing_consent BOOLEAN DEFAULT FALSE,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'transferred')),
            qr_code TEXT UNIQUE,
            check_in_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabela ticket_users criada';
    ELSE
        RAISE NOTICE '⚠️ Tabela ticket_users já existe';
    END IF;
END $$;

-- 3. ADICIONAR COLUNAS FALTANTES EM TICKET_USERS
DO $$
BEGIN
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'birth_date') THEN
        ALTER TABLE ticket_users ADD COLUMN birth_date DATE;
        RAISE NOTICE '✅ Coluna birth_date adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'gender') THEN
        ALTER TABLE ticket_users ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
        RAISE NOTICE '✅ Coluna gender adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'address') THEN
        ALTER TABLE ticket_users ADD COLUMN address TEXT;
        RAISE NOTICE '✅ Coluna address adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'city') THEN
        ALTER TABLE ticket_users ADD COLUMN city TEXT;
        RAISE NOTICE '✅ Coluna city adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'state') THEN
        ALTER TABLE ticket_users ADD COLUMN state TEXT;
        RAISE NOTICE '✅ Coluna state adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'zip_code') THEN
        ALTER TABLE ticket_users ADD COLUMN zip_code TEXT;
        RAISE NOTICE '✅ Coluna zip_code adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'emergency_contact') THEN
        ALTER TABLE ticket_users ADD COLUMN emergency_contact TEXT;
        RAISE NOTICE '✅ Coluna emergency_contact adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'emergency_phone') THEN
        ALTER TABLE ticket_users ADD COLUMN emergency_phone TEXT;
        RAISE NOTICE '✅ Coluna emergency_phone adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'dietary_restrictions') THEN
        ALTER TABLE ticket_users ADD COLUMN dietary_restrictions TEXT;
        RAISE NOTICE '✅ Coluna dietary_restrictions adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'special_needs') THEN
        ALTER TABLE ticket_users ADD COLUMN special_needs TEXT;
        RAISE NOTICE '✅ Coluna special_needs adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'marketing_consent') THEN
        ALTER TABLE ticket_users ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Coluna marketing_consent adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'status') THEN
        ALTER TABLE ticket_users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'transferred'));
        RAISE NOTICE '✅ Coluna status adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'qr_code') THEN
        ALTER TABLE ticket_users ADD COLUMN qr_code TEXT UNIQUE;
        RAISE NOTICE '✅ Coluna qr_code adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'check_in_date') THEN
        ALTER TABLE ticket_users ADD COLUMN check_in_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna check_in_date adicionada em ticket_users';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'updated_at') THEN
        ALTER TABLE ticket_users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna updated_at adicionada em ticket_users';
    END IF;
END $$;

-- 4. CRIAR/ATUALIZAR TABELA TICKET_HISTORY
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURANDO TABELA TICKET_HISTORY ===';
    
    -- Criar tabela ticket_history se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_history') THEN
        CREATE TABLE ticket_history (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ticket_user_id UUID REFERENCES ticket_users(id) ON DELETE CASCADE,
            ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            action_type TEXT NOT NULL CHECK (action_type IN ('created', 'transferred', 'cancelled', 'checked_in', 'refunded', 'updated')),
            action_description TEXT,
            old_values JSONB,
            new_values JSONB,
            performed_by UUID REFERENCES auth.users(id),
            performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ip_address INET,
            user_agent TEXT,
            additional_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabela ticket_history criada';
    ELSE
        RAISE NOTICE '⚠️ Tabela ticket_history já existe';
    END IF;
END $$;

-- 5. ADICIONAR COLUNAS FALTANTES EM TICKET_HISTORY
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_history' AND column_name = 'event_id') THEN
        ALTER TABLE ticket_history ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Coluna event_id adicionada em ticket_history';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_history' AND column_name = 'old_values') THEN
        ALTER TABLE ticket_history ADD COLUMN old_values JSONB;
        RAISE NOTICE '✅ Coluna old_values adicionada em ticket_history';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_history' AND column_name = 'new_values') THEN
        ALTER TABLE ticket_history ADD COLUMN new_values JSONB;
        RAISE NOTICE '✅ Coluna new_values adicionada em ticket_history';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_history' AND column_name = 'ip_address') THEN
        ALTER TABLE ticket_history ADD COLUMN ip_address INET;
        RAISE NOTICE '✅ Coluna ip_address adicionada em ticket_history';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_history' AND column_name = 'user_agent') THEN
        ALTER TABLE ticket_history ADD COLUMN user_agent TEXT;
        RAISE NOTICE '✅ Coluna user_agent adicionada em ticket_history';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_history' AND column_name = 'additional_data') THEN
        ALTER TABLE ticket_history ADD COLUMN additional_data JSONB;
        RAISE NOTICE '✅ Coluna additional_data adicionada em ticket_history';
    END IF;
END $$;

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ticket_users_ticket_id ON ticket_users(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_users_email ON ticket_users(email);
CREATE INDEX IF NOT EXISTS idx_ticket_users_document ON ticket_users(document);
CREATE INDEX IF NOT EXISTS idx_ticket_users_qr_code ON ticket_users(qr_code);
CREATE INDEX IF NOT EXISTS idx_ticket_users_status ON ticket_users(status);
CREATE INDEX IF NOT EXISTS idx_ticket_users_check_in_date ON ticket_users(check_in_date);
CREATE INDEX IF NOT EXISTS idx_ticket_users_created_at ON ticket_users(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_user_id ON ticket_history(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_event_id ON ticket_history(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_action_type ON ticket_history(action_type);
CREATE INDEX IF NOT EXISTS idx_ticket_history_performed_at ON ticket_history(performed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_history_performed_by ON ticket_history(performed_by);

-- 7. CRIAR TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_ticket_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ticket_users_updated_at_trigger ON ticket_users;
CREATE TRIGGER update_ticket_users_updated_at_trigger
    BEFORE UPDATE ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_users_updated_at();

-- 8. CRIAR FUNÇÃO PARA GERAR QR CODE ÚNICO
CREATE OR REPLACE FUNCTION generate_unique_qr_code()
RETURNS TEXT AS $$
DECLARE
    qr_code TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Gerar código QR único (UUID + timestamp)
        qr_code := UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8)) || '-' || 
                   EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
        
        -- Verificar se já existe
        SELECT COUNT(*) INTO exists_count 
        FROM ticket_users 
        WHERE qr_code = qr_code;
        
        -- Se não existe, retornar
        IF exists_count = 0 THEN
            RETURN qr_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. CRIAR TRIGGER PARA GERAR QR CODE AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION auto_generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
        NEW.qr_code := generate_unique_qr_code();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS auto_generate_qr_code_trigger ON ticket_users;
CREATE TRIGGER auto_generate_qr_code_trigger
    BEFORE INSERT ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_qr_code();

-- 10. CRIAR FUNÇÃO PARA REGISTRAR HISTÓRICO AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION log_ticket_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log para INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ticket_history (
            ticket_user_id, 
            ticket_id, 
            event_id,
            action_type, 
            action_description, 
            new_values,
            performed_at
        ) VALUES (
            NEW.id,
            NEW.ticket_id,
            (SELECT event_id FROM tickets WHERE id = NEW.ticket_id),
            'created',
            'Ticket user created',
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    END IF;
    
    -- Log para UPDATE
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO ticket_history (
            ticket_user_id, 
            ticket_id, 
            event_id,
            action_type, 
            action_description, 
            old_values,
            new_values,
            performed_at
        ) VALUES (
            NEW.id,
            NEW.ticket_id,
            (SELECT event_id FROM tickets WHERE id = NEW.ticket_id),
            'updated',
            'Ticket user updated',
            to_jsonb(OLD),
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    END IF;
    
    -- Log para DELETE
    IF TG_OP = 'DELETE' THEN
        INSERT INTO ticket_history (
            ticket_user_id, 
            ticket_id, 
            event_id,
            action_type, 
            action_description, 
            old_values,
            performed_at
        ) VALUES (
            OLD.id,
            OLD.ticket_id,
            (SELECT event_id FROM tickets WHERE id = OLD.ticket_id),
            'cancelled',
            'Ticket user deleted',
            to_jsonb(OLD),
            NOW()
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS log_ticket_user_changes_trigger ON ticket_users;
CREATE TRIGGER log_ticket_user_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION log_ticket_user_changes();

-- 11. HABILITAR RLS E CRIAR POLÍTICAS
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Políticas para ticket_users
DROP POLICY IF EXISTS "Users can view their own tickets" ON ticket_users;
CREATE POLICY "Users can view their own tickets" ON ticket_users
FOR SELECT USING (
    auth.uid() IN (
        SELECT DISTINCT buyer_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT organizer_id FROM events e 
        JOIN tickets t ON e.id = t.event_id 
        WHERE t.id = ticket_id
    )
);

DROP POLICY IF EXISTS "Users can create ticket users" ON ticket_users;
CREATE POLICY "Users can create ticket users" ON ticket_users
FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT DISTINCT buyer_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT organizer_id FROM events e 
        JOIN tickets t ON e.id = t.event_id 
        WHERE t.id = ticket_id
    )
);

DROP POLICY IF EXISTS "Users can update their own ticket users" ON ticket_users;
CREATE POLICY "Users can update their own ticket users" ON ticket_users
FOR UPDATE USING (
    auth.uid() IN (
        SELECT DISTINCT buyer_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT organizer_id FROM events e 
        JOIN tickets t ON e.id = t.event_id 
        WHERE t.id = ticket_id
    )
);

-- Políticas para ticket_history
DROP POLICY IF EXISTS "Users can view ticket history" ON ticket_history;
CREATE POLICY "Users can view ticket history" ON ticket_history
FOR SELECT USING (
    auth.uid() IN (
        SELECT DISTINCT buyer_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT organizer_id FROM events WHERE id = event_id
    )
);

-- 12. VERIFICAR ESTRUTURAS FINAIS
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUTURAS FINAIS DAS TABELAS ===';
END $$;

SELECT 'TICKET_USERS' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'TICKET_HISTORY' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_history' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 13. ESTATÍSTICAS FINAIS
SELECT 
    'TICKET_USERS' as tabela,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN qr_code IS NOT NULL THEN 1 END) as with_qr_code,
    COUNT(CASE WHEN check_in_date IS NOT NULL THEN 1 END) as checked_in
FROM ticket_users

UNION ALL

SELECT 
    'TICKET_HISTORY' as tabela,
    COUNT(*) as total_records,
    COUNT(CASE WHEN action_type = 'created' THEN 1 END) as created_actions,
    COUNT(CASE WHEN action_type = 'checked_in' THEN 1 END) as checkin_actions,
    COUNT(CASE WHEN action_type = 'updated' THEN 1 END) as updated_actions
FROM ticket_history;

DO $$
BEGIN
    RAISE NOTICE '=== ATUALIZAÇÃO DAS TABELAS DE INGRESSOS CONCLUÍDA ===';
    RAISE NOTICE 'Funcionalidades implementadas:';
    RAISE NOTICE '✅ Tabela ticket_users com campos completos';
    RAISE NOTICE '✅ Tabela ticket_history para auditoria';
    RAISE NOTICE '✅ QR codes únicos gerados automaticamente';
    RAISE NOTICE '✅ Histórico de mudanças automático';
    RAISE NOTICE '✅ Triggers para updated_at';
    RAISE NOTICE '✅ Índices otimizados para performance';
    RAISE NOTICE '✅ Políticas RLS para segurança';
    RAISE NOTICE '✅ Campos para dados pessoais completos';
    RAISE NOTICE '✅ Campos para necessidades especiais';
    RAISE NOTICE '✅ Sistema de check-in integrado';
END $$;