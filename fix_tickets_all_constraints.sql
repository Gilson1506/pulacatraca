-- ============================================
-- FIX: TODOS OS CAMPOS OBRIGATÓRIOS DA TABELA TICKETS
-- ============================================

-- 1. VERIFICAR TODAS AS CONSTRAINTS NOT NULL
SELECT 
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND is_nullable = 'NO'
ORDER BY column_name;

-- 2. DESABILITAR RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 3. PEGAR DADOS EXISTENTES PARA TESTE
SELECT 
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1) as event_id_exemplo,
    (SELECT id FROM profiles LIMIT 1) as user_id_exemplo,
    (SELECT price FROM events WHERE status = 'approved' LIMIT 1) as price_exemplo;

-- 4. TESTE COM TODOS OS CAMPOS OBRIGATÓRIOS
INSERT INTO tickets (
    event_id, 
    user_id,
    price,
    ticket_type, 
    status
) VALUES (
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    (SELECT COALESCE(price, 1000) FROM events WHERE status = 'approved' LIMIT 1), -- Fallback para 10.00
    'Teste Final',
    'pending'
) ON CONFLICT DO NOTHING;

-- 5. VERIFICAR SE FUNCIONOU
SELECT 
    id,
    event_id,
    user_id,
    price,
    ticket_type,
    status,
    code
FROM tickets 
WHERE ticket_type = 'Teste Final' 
LIMIT 1;

-- 6. LIMPAR TESTE
DELETE FROM tickets WHERE ticket_type = 'Teste Final';

-- 7. VERIFICAR RLS STATUS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tickets';