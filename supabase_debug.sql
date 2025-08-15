-- ============================================
-- DEBUG: VERIFICAR ESTRUTURA ATUAL DO SUPABASE
-- ============================================

-- 1. VERIFICAR QUAIS TABELAS EXISTEM
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. VERIFICAR ESTRUTURA DA TABELA TICKETS (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- 3. VERIFICAR RLS STATUS
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables 
WHERE tablename IN ('transactions', 'tickets', 'events', 'profiles')
ORDER BY tablename;

-- 4. VERIFICAR POLÍTICAS RLS NA TABELA TICKETS
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'tickets';

-- 5. VERIFICAR SE HÁ DADOS NA TABELA TICKETS
SELECT COUNT(*) as total_tickets FROM tickets;

-- 6. TESTAR INSERÇÃO SIMPLES
INSERT INTO tickets (ticket_type, status) 
VALUES ('Teste Debug', 'pending') 
ON CONFLICT DO NOTHING;

-- 7. VERIFICAR SE INSERÇÃO FUNCIONOU
SELECT * FROM tickets WHERE ticket_type = 'Teste Debug' LIMIT 1;

-- 8. LIMPAR TESTE
DELETE FROM tickets WHERE ticket_type = 'Teste Debug';