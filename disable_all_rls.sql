-- DESABILITAR RLS EM TODAS AS TABELAS

-- Desabilitar RLS na tabela transactions
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela tickets (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Desabilitar RLS na tabela events
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela profiles  
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verificar status RLS
SELECT 
    tablename,
    rowsecurity as rls_ativo,
    CASE 
        WHEN rowsecurity THEN '🔒 ATIVO'
        ELSE '🔓 DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename IN ('transactions', 'tickets', 'events', 'profiles')
ORDER BY tablename;