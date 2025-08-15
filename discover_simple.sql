-- DESCOBRIR CAMPOS OBRIGATORIOS

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- DESABILITAR RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- TESTE COMPLETO
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
    'QR_' || substring(gen_random_uuid()::text, 1, 8),
    'Teste',
    'pending'
);

-- VERIFICAR RESULTADO
SELECT * FROM tickets WHERE ticket_type = 'Teste' LIMIT 1;

-- LIMPAR
DELETE FROM tickets WHERE ticket_type = 'Teste';