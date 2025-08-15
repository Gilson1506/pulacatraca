-- ============================================
-- FIX: TICKETS COM EVENT_ID E USER_ID OBRIGATÓRIOS
-- ============================================

-- 1. DESABILITAR RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR CONSTRAINTS
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN ('event_id', 'user_id', 'buyer_id')
ORDER BY column_name;

-- 3. PEGAR IDs EXISTENTES PARA TESTE
SELECT 
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1) as event_id_exemplo,
    (SELECT id FROM profiles LIMIT 1) as user_id_exemplo;

-- 4. TESTE COM TODOS OS CAMPOS OBRIGATÓRIOS
INSERT INTO tickets (
    event_id, 
    user_id,
    ticket_type, 
    status
) VALUES (
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1),
    (SELECT id FROM profiles LIMIT 1),
    'Teste Completo',
    'pending'
) ON CONFLICT DO NOTHING;

-- 5. VERIFICAR SE FUNCIONOU
SELECT 
    id,
    event_id,
    user_id,
    ticket_type,
    status,
    code
FROM tickets 
WHERE ticket_type = 'Teste Completo' 
LIMIT 1;

-- 6. LIMPAR TESTE
DELETE FROM tickets WHERE ticket_type = 'Teste Completo';

-- 7. VERIFICAR RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tickets';