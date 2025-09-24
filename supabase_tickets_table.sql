-- ============================================
-- TABELA DE INGRESSOS PARA O SUPABASE
-- ============================================

-- 1. Tabela de Ingressos
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Pessoa que vai usar o ingresso
  code TEXT NOT NULL UNIQUE, -- Código único do ingresso
  ticket_type TEXT DEFAULT 'Padrão',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Políticas para tickets - Organizadores podem ver ingressos dos seus eventos
CREATE POLICY "Organizadores podem ver ingressos dos seus eventos" ON tickets
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Compradores podem ver seus próprios ingressos
CREATE POLICY "Compradores podem ver seus próprios ingressos" ON tickets
  FOR SELECT USING (buyer_id = auth.uid() OR user_id = auth.uid());

-- Organizadores podem atualizar ingressos dos seus eventos (para check-in)
CREATE POLICY "Organizadores podem atualizar ingressos dos seus eventos" ON tickets
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Compradores podem inserir ingressos (para compra)
CREATE POLICY "Sistema pode inserir ingressos" ON tickets
  FOR INSERT WITH CHECK (true); -- Permitir inserção pelo sistema

-- ============================================
-- FUNÇÃO PARA GERAR CÓDIGO ÚNICO DO INGRESSO
-- ============================================

CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
DECLARE
    code_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Gerar código de 8 caracteres
    FOR i IN 1..8 LOOP
        result := result || substr(code_chars, floor(random() * length(code_chars) + 1)::integer, 1);
    END LOOP;
    
    -- Verificar se o código já existe
    WHILE EXISTS (SELECT 1 FROM tickets WHERE code = result) LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(code_chars, floor(random() * length(code_chars) + 1)::integer, 1);
        END LOOP;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER PARA GERAR CÓDIGO AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION set_ticket_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o código não foi fornecido, gerar automaticamente
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := generate_ticket_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código do ingresso
DROP TRIGGER IF EXISTS set_ticket_code ON tickets;
CREATE TRIGGER set_ticket_code
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_code();

-- ============================================
-- DADOS DE EXEMPLO PARA TESTE
-- ============================================

-- Exemplo de ingressos (substitua pelos IDs reais)
/*
-- Para obter IDs reais:
-- SELECT id, title FROM events WHERE organizer_id = auth.uid() LIMIT 5;
-- SELECT id, name FROM profiles WHERE role = 'user' LIMIT 5;

INSERT INTO tickets (event_id, buyer_id, user_id, ticket_type, status)
VALUES 
  ('EVENT_ID_1', 'BUYER_ID_1', 'USER_ID_1', 'VIP', 'active'),
  ('EVENT_ID_1', 'BUYER_ID_2', 'USER_ID_2', 'Padrão', 'active'),
  ('EVENT_ID_2', 'BUYER_ID_1', 'BUYER_ID_1', 'Padrão', 'used'),
  ('EVENT_ID_2', 'BUYER_ID_3', 'USER_ID_3', 'VIP', 'active');
*/

-- ============================================
-- VERIFICAÇÕES E CONSULTAS ÚTEIS
-- ============================================

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tickets';

-- Consulta de exemplo para organizadores
/*
SELECT 
  t.code,
  t.ticket_type,
  t.status,
  t.created_at,
  t.used_at,
  e.title as event_name,
  buyer.name as buyer_name,
  buyer.email as buyer_email,
  ticket_user.name as user_name,
  ticket_user.email as user_email
FROM tickets t
JOIN events e ON t.event_id = e.id
JOIN profiles buyer ON t.buyer_id = buyer.id
LEFT JOIN profiles ticket_user ON t.user_id = ticket_user.id
WHERE e.organizer_id = auth.uid()
ORDER BY t.created_at DESC;
*/

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE tickets IS 'Ingressos dos eventos - controla compra, uso e validação';

COMMENT ON COLUMN tickets.event_id IS 'ID do evento ao qual o ingresso pertence';
COMMENT ON COLUMN tickets.buyer_id IS 'ID da pessoa que comprou o ingresso';
COMMENT ON COLUMN tickets.user_id IS 'ID da pessoa que vai usar o ingresso (pode ser diferente do comprador)';
COMMENT ON COLUMN tickets.code IS 'Código único do ingresso para validação';
COMMENT ON COLUMN tickets.ticket_type IS 'Tipo do ingresso (VIP, Padrão, etc.)';
COMMENT ON COLUMN tickets.status IS 'Status: active (ativo), used (usado), cancelled (cancelado)';
COMMENT ON COLUMN tickets.used_at IS 'Data e hora em que o ingresso foi usado (check-in)';
COMMENT ON COLUMN tickets.notes IS 'Observações sobre o ingresso';