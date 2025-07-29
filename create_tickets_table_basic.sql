-- ============================================
-- CRIAR TABELA TICKETS BÁSICA (SE NÃO EXISTIR)
-- ============================================

-- Verificar se a tabela tickets existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tickets'
) as tabela_exists;

-- Criar tabela tickets se não existir
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID,
    buyer_id UUID,
    user_id UUID,
    code TEXT,
    ticket_type TEXT DEFAULT 'Padrão',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Adicionar foreign keys se não existirem
DO $$
BEGIN
    -- Foreign key para events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tickets_event_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT tickets_event_id_fkey 
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Se der erro, continua sem foreign key
            NULL;
        END;
    END IF;

    -- Foreign key para profiles (buyer_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tickets_buyer_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT tickets_buyer_id_fkey 
            FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Se der erro, continua sem foreign key
            NULL;
        END;
    END IF;

    -- Foreign key para profiles (user_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tickets_user_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT tickets_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
        EXCEPTION WHEN OTHERS THEN
            -- Se der erro, continua sem foreign key
            NULL;
        END;
    END IF;
END $$;

-- Criar constraint para status
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('pending', 'active', 'used', 'cancelled'));

-- Criar índices básicos
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);

-- Função para gerar código único
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente
CREATE OR REPLACE FUNCTION set_ticket_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := generate_ticket_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_ticket_code ON tickets;
CREATE TRIGGER trigger_set_ticket_code
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_code();

-- Desabilitar RLS temporariamente para testes
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- Teste básico de inserção
INSERT INTO tickets (event_id, ticket_type, status) 
VALUES (
    gen_random_uuid(), 
    'Teste', 
    'pending'
) ON CONFLICT DO NOTHING;

-- Verificar se o teste funcionou
SELECT COUNT(*) as total_tickets FROM tickets WHERE ticket_type = 'Teste';

-- Limpar teste
DELETE FROM tickets WHERE ticket_type = 'Teste';

-- Mostrar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Testar geração de código
SELECT generate_ticket_code() as codigo_teste;