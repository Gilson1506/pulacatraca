-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTE
-- ============================================

-- AVISO: Isso remove a segurança da tabela temporariamente
-- Use apenas para teste e desenvolvimento
-- Em produção, use o fix_transactions_rls.sql

-- Verificar status atual do RLS
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ATIVO (pode bloquear inserções)'
        ELSE '🔓 RLS DESABILITADO (inserções livres)'
    END as status
FROM pg_tables 
WHERE tablename = 'transactions';

-- Desabilitar RLS temporariamente
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity THEN '🔒 AINDA ATIVO'
        ELSE '✅ DESABILITADO COM SUCESSO'
    END as resultado
FROM pg_tables 
WHERE tablename = 'transactions';

-- Teste de inserção simples
INSERT INTO transactions (amount, status) 
VALUES (1000, 'test') 
ON CONFLICT DO NOTHING;

-- Verificar se a inserção funcionou
SELECT COUNT(*) as total_registros 
FROM transactions 
WHERE status = 'test';

-- Limpar teste
DELETE FROM transactions WHERE status = 'test';

RAISE NOTICE '✅ RLS DESABILITADO TEMPORARIAMENTE';
RAISE NOTICE '🧪 TESTE O CHECKOUT AGORA - DEVE FUNCIONAR';
RAISE NOTICE '';
RAISE NOTICE '⚠️  IMPORTANTE:';
RAISE NOTICE '   - Esta é uma solução temporária';
RAISE NOTICE '   - Para produção, execute fix_transactions_rls.sql';
RAISE NOTICE '   - Para reabilitar: ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;';
RAISE NOTICE '';
RAISE NOTICE '🚀 CHECKOUT LIBERADO PARA TODOS OS USUÁRIOS!';