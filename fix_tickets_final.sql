-- ============================================
-- FIX FINAL: TICKETS COM EVENT_ID OBRIGATÓRIO
-- ============================================

-- 1. DESABILITAR RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR ESTRUTURA ATUAL
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- 3. TESTE COM EVENT_ID OBRIGATÓRIO
-- Primeiro, pegar um event_id existente
SELECT id as event_id_exemplo 
FROM events 
WHERE status = 'approved' 
LIMIT 1;

-- 4. TESTE DE INSERÇÃO COM EVENT_ID VÁLIDO
INSERT INTO tickets (
    event_id, 
    ticket_type, 
    status
) VALUES (
    (SELECT id FROM events WHERE status = 'approved' LIMIT 1),
    'Teste Final',
    'pending'
) ON CONFLICT DO NOTHING;

-- 5. VERIFICAR SE FUNCIONOU
SELECT 
    id,
    event_id,
    ticket_type,
    status,
    code
FROM tickets 
WHERE ticket_type = 'Teste Final' 
LIMIT 1;

-- 6. LIMPAR TESTE
DELETE FROM tickets WHERE ticket_type = 'Teste Final';

-- 7. VERIFICAR RLS STATUS
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables 
WHERE tablename = 'tickets';