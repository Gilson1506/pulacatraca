-- TESTE SIMPLES DE STATUS

-- Ver constraint
SELECT check_clause FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%tickets%status%';

-- Ver status existentes
SELECT DISTINCT status FROM tickets;

-- Teste: used
INSERT INTO tickets (event_id, user_id, price, qr_code, ticket_type, status) 
VALUES (
    (SELECT id FROM events LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    1000,
    'QR_USED',
    'TestUsed',
    'used'
);

SELECT 'used funcionou' as resultado;