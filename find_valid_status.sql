-- DESCOBRIR VALORES VALIDOS DE STATUS

-- Ver a constraint exata
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%status%' 
AND constraint_name LIKE '%tickets%';

-- Ver todos os status existentes na tabela
SELECT DISTINCT status, COUNT(*) 
FROM tickets 
GROUP BY status;

-- Tentar valores comuns um por um
-- Teste 1: used
DO $$
BEGIN
    INSERT INTO tickets (event_id, user_id, price, qr_code, ticket_type, status) 
    VALUES (
        (SELECT id FROM events LIMIT 1),
        (SELECT id FROM profiles LIMIT 1),
        1000,
        'QR_TEST_USED',
        'TestUsed',
        'used'
    );
    RAISE NOTICE 'SUCCESS: used funciona';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'FAILED: used nao funciona';
END $$;

-- Teste 2: cancelled
DO $$
BEGIN
    INSERT INTO tickets (event_id, user_id, price, qr_code, ticket_type, status) 
    VALUES (
        (SELECT id FROM events LIMIT 1),
        (SELECT id FROM profiles LIMIT 1),
        1000,
        'QR_TEST_CANCELLED',
        'TestCancelled',
        'cancelled'
    );
    RAISE NOTICE 'SUCCESS: cancelled funciona';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'FAILED: cancelled nao funciona';
END $$;

-- Teste 3: confirmed
DO $$
BEGIN
    INSERT INTO tickets (event_id, user_id, price, qr_code, ticket_type, status) 
    VALUES (
        (SELECT id FROM events LIMIT 1),
        (SELECT id FROM profiles LIMIT 1),
        1000,
        'QR_TEST_CONFIRMED',
        'TestConfirmed',
        'confirmed'
    );
    RAISE NOTICE 'SUCCESS: confirmed funciona';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'FAILED: confirmed nao funciona';
END $$;

-- Limpar testes
DELETE FROM tickets WHERE ticket_type LIKE 'Test%';