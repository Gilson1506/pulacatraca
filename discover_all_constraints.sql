-- ============================================
-- DESCOBRIR TODOS OS CAMPOS OBRIGATÓRIOS
-- ============================================

-- 1. LISTAR TODOS OS CAMPOS NOT NULL
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 2. DESABILITAR RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 3. PREPARAR DADOS PARA TESTE
SELECT 
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1) as event_id,
    (SELECT id FROM profiles LIMIT 1) as user_id,
    (SELECT COALESCE(price, 1000) FROM events WHERE status = 'approved' LIMIT 1) as price;

-- 4. TESTE COM TODOS OS CAMPOS POSSÍVEIS
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
    (SELECT COALESCE(price, 1000) FROM events WHERE status = 'approved' LIMIT 1),
    'QR_' || substring(gen_random_uuid()::text, 1, 8), -- QR code único
    'Teste Completo',
    'pending'
) ON CONFLICT DO NOTHING;

-- 5. VERIFICAR RESULTADO
SELECT 
    id,
    event_id,
    user_id,
    price,
    qr_code,
    ticket_type,
    status,
    code
FROM tickets 
WHERE ticket_type = 'Teste Completo' 
LIMIT 1;

-- 6. LIMPAR TESTE
DELETE FROM tickets WHERE ticket_type = 'Teste Completo';

-- 7. VERIFICAR ESTRUTURA COMPLETA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;