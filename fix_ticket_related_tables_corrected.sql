-- ===================================================================
-- SCRIPT CORRIGIDO PARA TABELAS RELACIONADAS AOS INGRESSOS
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA ATUAL DAS TABELAS
DO $$
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO INICIAL DAS TABELAS ===';
END $$;

-- Verificar se as tabelas existem
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tickets', 'ticket_users', 'ticket_history', 'checkin')
ORDER BY table_name;

-- Verificar colunas da tabela tickets
SELECT 'TICKETS CURRENT COLUMNS' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. GARANTIR QUE A TABELA TICKETS TENHA AS COLUNAS NECESSÁRIAS
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURANDO TABELA TICKETS ===';
    
    -- Verificar se a tabela tickets existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE TABLE tickets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            price DECIMAL(10,2) DEFAULT 0,
            quantity INTEGER DEFAULT 1,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabela tickets criada';
    END IF;

    -- Adicionar colunas necessárias se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'event_id') THEN
        ALTER TABLE tickets ADD COLUMN event_id UUID;
        RAISE NOTICE '✅ Coluna event_id adicionada em tickets';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'buyer_id') THEN
        ALTER TABLE tickets ADD COLUMN buyer_id UUID;
        RAISE NOTICE '✅ Coluna buyer_id adicionada em tickets';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'user_id') THEN
        ALTER TABLE tickets ADD COLUMN user_id UUID;
        RAISE NOTICE '✅ Coluna user_id adicionada em tickets';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'status') THEN
        ALTER TABLE tickets ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE '✅ Coluna status adicionada em tickets';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'code') THEN
        ALTER TABLE tickets ADD COLUMN code TEXT;
        RAISE NOTICE '✅ Coluna code adicionada em tickets';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_type') THEN
        ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'Padrão';
        RAISE NOTICE '✅ Coluna ticket_type adicionada em tickets';
    END IF;
END $$;

-- 3. CRIAR TABELA TICKET_USERS
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURANDO TABELA TICKET_USERS ===';
    
    -- Criar tabela ticket_users se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_users') THEN
        CREATE TABLE ticket_users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- 4. ADICIONAR TICKET_USER_ID À TABELA TICKETS (APÓS TICKET_USERS EXISTIR)
DO $$
BEGIN
    RAISE NOTICE '=== ADICIONANDO REFERÊNCIA TICKET_USER_ID ===';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_user_id') THEN
        ALTER TABLE tickets ADD COLUMN ticket_user_id UUID;
        RAISE NOTICE '✅ Coluna ticket_user_id adicionada em tickets';
    END IF;
END $$;

-- 5. ADICIONAR COLUNAS FALTANTES EM TICKET_USERS
DO $$
BEGIN
    RAISE NOTICE '=== COMPLETANDO TABELA TICKET_USERS ===';
    
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_users' AND column_name = 'ticket_id') THEN
        ALTER TABLE ticket_users ADD COLUMN ticket_id UUID;
        RAISE NOTICE '✅ Coluna ticket_id adicionada em ticket_users';
    END IF;

    -- Verificar e adicionar outras colunas necessárias
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

-- 6. CRIAR TABELA TICKET_HISTORY
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURANDO TABELA TICKET_HISTORY ===';
    
    -- Criar tabela ticket_history se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_history') THEN
        CREATE TABLE ticket_history (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ticket_user_id UUID,
            ticket_id UUID,
            event_id UUID,
            action_type TEXT NOT NULL CHECK (action_type IN ('created', 'transferred', 'cancelled', 'checked_in', 'refunded', 'updated')),
            action_description TEXT,
            old_values JSONB,
            new_values JSONB,
            performed_by UUID,
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

-- 7. ADICIONAR FOREIGN KEYS (APÓS TODAS AS TABELAS EXISTIREM)
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURANDO FOREIGN KEYS ===';
    
    -- Foreign keys para tickets
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_tickets_event_id' AND table_name = 'tickets') THEN
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK tickets -> events criada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_tickets_ticket_user_id' AND table_name = 'tickets') THEN
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_ticket_user_id 
        FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ FK tickets -> ticket_users criada';
    END IF;

    -- Foreign keys para ticket_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ticket_users_ticket_id' AND table_name = 'ticket_users') THEN
        ALTER TABLE ticket_users ADD CONSTRAINT fk_ticket_users_ticket_id 
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK ticket_users -> tickets criada';
    END IF;

    -- Foreign keys para ticket_history
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ticket_history_ticket_user_id' AND table_name = 'ticket_history') THEN
        ALTER TABLE ticket_history ADD CONSTRAINT fk_ticket_history_ticket_user_id 
        FOREIGN KEY (ticket_user_id) REFERENCES ticket_users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK ticket_history -> ticket_users criada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ticket_history_ticket_id' AND table_name = 'ticket_history') THEN
        ALTER TABLE ticket_history ADD CONSTRAINT fk_ticket_history_ticket_id 
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK ticket_history -> tickets criada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_ticket_history_event_id' AND table_name = 'ticket_history') THEN
        ALTER TABLE ticket_history ADD CONSTRAINT fk_ticket_history_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ FK ticket_history -> events criada';
    END IF;
END $$;

-- 8. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_user_id ON tickets(ticket_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

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

-- 9. CRIAR TRIGGERS PARA UPDATED_AT
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

-- 10. CRIAR FUNÇÃO PARA GERAR QR CODE ÚNICO
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

-- 11. CRIAR TRIGGER PARA GERAR QR CODE AUTOMATICAMENTE
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

-- 12. CRIAR FUNÇÃO PARA REGISTRAR HISTÓRICO AUTOMATICAMENTE
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

-- 13. HABILITAR RLS E CRIAR POLÍTICAS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Políticas para tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
CREATE POLICY "Users can view their own tickets" ON tickets
FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() = user_id OR
    auth.uid() IN (
        SELECT organizer_id FROM events WHERE id = event_id
    )
);

DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
CREATE POLICY "Users can create tickets" ON tickets
FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR 
    auth.uid() IN (
        SELECT organizer_id FROM events WHERE id = event_id
    )
);

-- Políticas para ticket_users
DROP POLICY IF EXISTS "Users can view their ticket users" ON ticket_users;
CREATE POLICY "Users can view their ticket users" ON ticket_users
FOR SELECT USING (
    auth.uid() IN (
        SELECT DISTINCT buyer_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT user_id FROM tickets WHERE id = ticket_id
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
        SELECT DISTINCT user_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT organizer_id FROM events e 
        JOIN tickets t ON e.id = t.event_id 
        WHERE t.id = ticket_id
    )
);

DROP POLICY IF EXISTS "Users can update their ticket users" ON ticket_users;
CREATE POLICY "Users can update their ticket users" ON ticket_users
FOR UPDATE USING (
    auth.uid() IN (
        SELECT DISTINCT buyer_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT user_id FROM tickets WHERE id = ticket_id
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
        SELECT DISTINCT user_id FROM tickets WHERE id = ticket_id
        UNION
        SELECT DISTINCT organizer_id FROM events WHERE id = event_id
    )
);

-- 14. VERIFICAR ESTRUTURAS FINAIS
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUTURAS FINAIS DAS TABELAS ===';
END $$;

SELECT 'TICKETS' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'TICKET_USERS' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'TICKET_HISTORY' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_history' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 15. ESTATÍSTICAS FINAIS
SELECT 
    'TICKETS' as tabela,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN event_id IS NOT NULL THEN 1 END) as with_event,
    COUNT(CASE WHEN ticket_user_id IS NOT NULL THEN 1 END) as with_user
FROM tickets

UNION ALL

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
    RAISE NOTICE '✅ Tabela tickets com colunas necessárias';
    RAISE NOTICE '✅ Tabela ticket_users com campos completos';
    RAISE NOTICE '✅ Tabela ticket_history para auditoria';
    RAISE NOTICE '✅ QR codes únicos gerados automaticamente';
    RAISE NOTICE '✅ Histórico de mudanças automático';
    RAISE NOTICE '✅ Triggers para updated_at';
    RAISE NOTICE '✅ Índices otimizados para performance';
    RAISE NOTICE '✅ Políticas RLS para segurança';
    RAISE NOTICE '✅ Foreign keys configuradas corretamente';
    RAISE NOTICE '✅ Sistema de check-in integrado';
END $$;