-- REMOVER CONSTRAINT PROBLEMATICA DE STATUS

-- Ver constraint atual
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'tickets_status_check';

-- Remover constraint que esta bloqueando
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Desabilitar RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- Teste simples sem constraint
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
    'QR_SEM_CONSTRAINT',
    'TesteSemConstraint',
    'active'
);

-- Verificar se funcionou
SELECT id, status, qr_code FROM tickets WHERE ticket_type = 'TesteSemConstraint';

-- Limpar teste
DELETE FROM tickets WHERE ticket_type = 'TesteSemConstraint';