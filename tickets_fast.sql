-- CRIAÇÃO RÁPIDA DA TABELA TICKETS

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID,
    buyer_id UUID,
    ticket_type TEXT DEFAULT 'Padrão',
    status TEXT DEFAULT 'pending',
    code TEXT DEFAULT substring(gen_random_uuid()::text, 1, 8)
);

-- DESABILITAR RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- TESTE RÁPIDO
INSERT INTO tickets DEFAULT VALUES;
SELECT * FROM tickets LIMIT 1;