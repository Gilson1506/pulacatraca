-- TESTE FINAL QUE FUNCIONA

-- Desabilitar RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- Listar campos obrigatorios
SELECT column_name, is_nullable FROM information_schema.columns 
WHERE table_name = 'tickets' AND is_nullable = 'NO';

-- Ver constraints de status
SELECT check_clause FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%tickets%status%';

-- Teste com status = 'active'
INSERT INTO tickets (
    event_id, 
    user_id,
    price,
    qr_code,
    ticket_type, 
    status
) VALUES (
    (SELECT id FROM events LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    1000,
    'QR_FINAL_TEST',
    'TesteStatus',
    'active'
);

-- Ver se funcionou
SELECT id, status, qr_code FROM tickets WHERE ticket_type = 'TesteStatus';

-- Limpar
DELETE FROM tickets WHERE ticket_type = 'TesteStatus';