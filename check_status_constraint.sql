-- VERIFICAR CONSTRAINT DE STATUS

-- Ver todas as constraints da tabela tickets
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%tickets%status%';

-- Ver detalhes da constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'tickets' 
AND tc.constraint_type = 'CHECK';

-- Tentar com diferentes valores de status
-- Teste 1: active
INSERT INTO tickets (
    event_id, 
    user_id,
    price,
    qr_code,
    ticket_type, 
    status
) VALUES (
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    1000,
    'QR_TEST1',
    'Teste1',
    'active'
) ON CONFLICT DO NOTHING;

-- Verificar se funcionou
SELECT status FROM tickets WHERE ticket_type = 'Teste1';

-- Teste 2: confirmed  
INSERT INTO tickets (
    event_id, 
    user_id,
    price,
    qr_code,
    ticket_type, 
    status
) VALUES (
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    1000,
    'QR_TEST2',
    'Teste2',
    'confirmed'
) ON CONFLICT DO NOTHING;

-- Verificar se funcionou
SELECT status FROM tickets WHERE ticket_type = 'Teste2';

-- Limpar testes
DELETE FROM tickets WHERE ticket_type IN ('Teste1', 'Teste2');