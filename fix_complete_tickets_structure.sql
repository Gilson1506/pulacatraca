-- 🎫 SCRIPT COMPLETO: CORRIGIR ESTRUTURA DE TICKETS E HISTÓRICO
-- Execução: Execute no Supabase SQL Editor

-- ============================================================================
-- 1. CORRIGIR TABELA TICKETS
-- ============================================================================

-- Adicionar colunas que podem estar faltando na tabela tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Pista',
ADD COLUMN IF NOT EXISTS price_feminine DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_period_type VARCHAR(10) DEFAULT 'date',
ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(50) DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Garantir que a coluna description existe
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- 2. CRIAR/CORRIGIR TABELA TICKET_USERS
-- ============================================================================

-- Criar tabela ticket_users se não existir
CREATE TABLE IF NOT EXISTS ticket_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    purchase_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ticket_id, user_id)
);

-- ============================================================================
-- 3. CRIAR/CORRIGIR TABELA TICKET_HISTORY
-- ============================================================================

-- Criar tabela ticket_history se não existir
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_user_id UUID NOT NULL REFERENCES ticket_users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'purchased', 'used', 'cancelled', 'refunded'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- ============================================================================
-- 4. ATUALIZAR TABELA EVENTS
-- ============================================================================

-- Adicionar colunas que podem estar faltando
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS available_tickets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tickets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(20) DEFAULT 'paid';

-- Atualizar valores NULL para 0
UPDATE events SET available_tickets = 0 WHERE available_tickets IS NULL;
UPDATE events SET total_tickets = 0 WHERE total_tickets IS NULL;

-- ============================================================================
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);

-- Índices para ticket_users
CREATE INDEX IF NOT EXISTS idx_ticket_users_user_id ON ticket_users(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_users_event_id ON ticket_users(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_users_status ON ticket_users(status);

-- Índices para ticket_history
CREATE INDEX IF NOT EXISTS idx_ticket_history_user_id ON ticket_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_event_id ON ticket_history(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_action ON ticket_history(action);

-- ============================================================================
-- 6. HABILITAR RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS nas tabelas
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CRIAR POLÍTICAS RLS
-- ============================================================================

-- Políticas para tickets
DROP POLICY IF EXISTS "Users can view their tickets" ON tickets;
CREATE POLICY "Users can view their tickets" ON tickets
    FOR SELECT USING (
        user_id = auth.uid() OR 
        buyer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Organizers can insert tickets" ON tickets;
CREATE POLICY "Organizers can insert tickets" ON tickets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Políticas para ticket_users
DROP POLICY IF EXISTS "Users can view their ticket purchases" ON ticket_users;
CREATE POLICY "Users can view their ticket purchases" ON ticket_users
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their ticket purchases" ON ticket_users;
CREATE POLICY "Users can insert their ticket purchases" ON ticket_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas para ticket_history
DROP POLICY IF EXISTS "Users can view their ticket history" ON ticket_history;
CREATE POLICY "Users can view their ticket history" ON ticket_history
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert ticket history" ON ticket_history;
CREATE POLICY "System can insert ticket history" ON ticket_history
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. CRIAR TRIGGERS PARA AUDITORIA
-- ============================================================================

-- Função para criar entrada no histórico
CREATE OR REPLACE FUNCTION create_ticket_history_entry()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ticket_history (ticket_user_id, user_id, event_id, action, description)
        VALUES (NEW.id, NEW.user_id, NEW.event_id, 'purchased', 'Ticket purchased');
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO ticket_history (ticket_user_id, user_id, event_id, action, description)
            VALUES (NEW.id, NEW.user_id, NEW.event_id, 
                   CASE NEW.status 
                       WHEN 'used' THEN 'used'
                       WHEN 'cancelled' THEN 'cancelled'
                       ELSE 'status_changed'
                   END,
                   'Status changed from ' || OLD.status || ' to ' || NEW.status);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS ticket_users_history_trigger ON ticket_users;
CREATE TRIGGER ticket_users_history_trigger
    AFTER INSERT OR UPDATE ON ticket_users
    FOR EACH ROW EXECUTE FUNCTION create_ticket_history_entry();

-- ============================================================================
-- 9. FUNÇÃO PARA GERAR CÓDIGOS ÚNICOS DE TICKETS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- Gerar código apenas se não existe
    IF NEW.code IS NULL THEN
        LOOP
            attempts := attempts + 1;
            
            -- Gerar código: 3 letras + 6 números
            new_code := UPPER(
                CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
                CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
                CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
                LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
            );
            
            -- Verificar se o código já existe
            IF NOT EXISTS (SELECT 1 FROM tickets WHERE code = new_code) THEN
                NEW.code := new_code;
                EXIT;
            END IF;
            
            -- Evitar loop infinito
            IF attempts >= max_attempts THEN
                RAISE EXCEPTION 'Could not generate unique ticket code after % attempts', max_attempts;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar códigos
DROP TRIGGER IF EXISTS generate_ticket_code_trigger ON tickets;
CREATE TRIGGER generate_ticket_code_trigger
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_code();

-- ============================================================================
-- 10. DADOS DE TESTE (OPCIONAL)
-- ============================================================================

-- Comentar/descomentar se quiser dados de teste
/*
-- Inserir dados de exemplo para teste
WITH test_event AS (
    INSERT INTO events (title, description, start_date, organizer_id, status)
    VALUES ('Evento de Teste', 'Evento para testar a estrutura', NOW() + INTERVAL '30 days', auth.uid(), 'approved')
    RETURNING id
),
test_ticket AS (
    INSERT INTO tickets (event_id, name, price, quantity, area, description)
    SELECT id, 'Ingresso Geral', 50.00, 100, 'Pista', 'Ingresso para acesso geral'
    FROM test_event
    RETURNING id
)
INSERT INTO ticket_users (ticket_id, user_id, event_id, unit_price, total_price)
SELECT t.id, auth.uid(), e.id, 50.00, 50.00
FROM test_ticket t, test_event e;
*/

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

-- Atualizar estatísticas da tabela
ANALYZE tickets;
ANALYZE ticket_users;
ANALYZE ticket_history;
ANALYZE events;

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ ESTRUTURA DE TICKETS CORRIGIDA COM SUCESSO!';
    RAISE NOTICE '📊 Tabelas criadas/atualizadas:';
    RAISE NOTICE '   - tickets (com novas colunas)';
    RAISE NOTICE '   - ticket_users (criada/corrigida)';
    RAISE NOTICE '   - ticket_history (criada/corrigida)';
    RAISE NOTICE '   - events (colunas adicionadas)';
    RAISE NOTICE '🔒 RLS habilitado com políticas de segurança';
    RAISE NOTICE '🚀 Triggers e funções criados';
    RAISE NOTICE '📈 Índices otimizados criados';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Testar criação de eventos';
    RAISE NOTICE '2. Testar compra de ingressos';
    RAISE NOTICE '3. Verificar páginas de histórico';
    RAISE NOTICE '4. Validar modal de seleção de tickets';
END $$;