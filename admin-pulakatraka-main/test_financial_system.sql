-- Script de teste para o sistema financeiro
-- Execute este script para verificar se tudo está funcionando

-- 1. Verificar se as tabelas existem
SELECT 'Verificando tabelas...' as status;

SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ Não existe'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bank_accounts', 'withdrawals', 'transactions')
ORDER BY table_name;

-- 2. Verificar as políticas RLS
SELECT 'Verificando políticas RLS...' as status;

SELECT 
    tablename,
    policyname,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ Existe'
        ELSE '❌ Não existe'
    END as status
FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'withdrawals', 'transactions')
ORDER BY tablename, policyname;

-- 3. Verificar os triggers
SELECT 'Verificando triggers...' as status;

SELECT 
    event_object_table,
    trigger_name,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ Não existe'
    END as status
FROM information_schema.triggers
WHERE event_object_table IN ('bank_accounts', 'withdrawals', 'transactions')
ORDER BY event_object_table, trigger_name;

-- 4. Verificar as funções
SELECT 'Verificando funções...' as status;

SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ Não existe'
    END as status
FROM information_schema.routines
WHERE routine_name IN ('update_updated_at_column', 'ensure_single_default_account', 'get_organizer_balance')
ORDER BY routine_name;

-- 5. Verificar os índices
SELECT 'Verificando índices...' as status;

SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ Existe'
        ELSE '❌ Não existe'
    END as status
FROM pg_indexes
WHERE tablename IN ('bank_accounts', 'withdrawals', 'transactions')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 6. Testar inserção de dados de exemplo
SELECT 'Testando inserção de dados...' as status;

-- Inserir usuário de teste (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
        VALUES (
            '11111111-1111-1111-1111-111111111111',
            'teste@organizador.com',
            crypt('senha123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"full_name": "Organizador Teste", "role": "organizer"}'
        );
    END IF;
END $$;

-- Inserir conta bancária de teste
INSERT INTO bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Banco Teste',
    '0001',
    '12345-6',
    'corrente',
    true
) ON CONFLICT DO NOTHING;

-- Inserir saque de teste
INSERT INTO withdrawals (organizer_id, bank_account_id, amount, status, notes)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM bank_accounts WHERE organizer_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
    1000.00,
    'pendente',
    'Saque de teste'
) ON CONFLICT DO NOTHING;

-- Inserir transação de teste
INSERT INTO transactions (organizer_id, type, amount, status, description, payment_method)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Venda',
    500.00,
    'Concluído',
    'Venda de teste',
    'Cartão de Crédito'
) ON CONFLICT DO NOTHING;

-- 7. Verificar dados inseridos
SELECT 'Verificando dados inseridos...' as status;

SELECT 'Contas bancárias:' as tipo, COUNT(*) as quantidade FROM bank_accounts
UNION ALL
SELECT 'Saques:', COUNT(*) FROM withdrawals
UNION ALL
SELECT 'Transações:', COUNT(*) FROM transactions;

-- 8. Testar função de saldo
SELECT 'Testando função de saldo...' as status;

SELECT 
    'Saldo do organizador teste:' as descricao,
    get_organizer_balance('11111111-1111-1111-1111-111111111111') as saldo;

-- 9. Testar trigger de conta padrão
SELECT 'Testando trigger de conta padrão...' as status;

-- Tentar inserir outra conta como padrão
INSERT INTO bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Banco Teste 2',
    '0002',
    '65432-1',
    'poupanca',
    true
) ON CONFLICT DO NOTHING;

-- Verificar se a primeira conta não é mais padrão
SELECT 
    bank_name,
    is_default,
    CASE 
        WHEN is_default = true THEN '✅ Padrão'
        ELSE '❌ Não padrão'
    END as status
FROM bank_accounts 
WHERE organizer_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at;

-- 10. Testar políticas RLS
SELECT 'Testando políticas RLS...' as status;

-- Verificar se o usuário atual pode ver os dados
SELECT 
    'Pode ver contas bancárias:' as teste,
    CASE 
        WHEN EXISTS (SELECT 1 FROM bank_accounts LIMIT 1) THEN '✅ Sim'
        ELSE '❌ Não'
    END as resultado
UNION ALL
SELECT 
    'Pode ver saques:',
    CASE 
        WHEN EXISTS (SELECT 1 FROM withdrawals LIMIT 1) THEN '✅ Sim'
        ELSE '❌ Não'
    END
UNION ALL
SELECT 
    'Pode ver transações:',
    CASE 
        WHEN EXISTS (SELECT 1 FROM transactions LIMIT 1) THEN '✅ Sim'
        ELSE '❌ Não'
    END;

-- 11. Limpeza dos dados de teste
SELECT 'Limpando dados de teste...' as status;

DELETE FROM transactions WHERE organizer_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM withdrawals WHERE organizer_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM bank_accounts WHERE organizer_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111'; -- Descomente se quiser remover o usuário

-- 12. Resumo final
SELECT '=== RESUMO DO TESTE ===' as resultado;

SELECT 
    'Tabelas criadas:' as item,
    COUNT(*) as quantidade
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bank_accounts', 'withdrawals', 'transactions')

UNION ALL

SELECT 
    'Políticas RLS:',
    COUNT(*)
FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'withdrawals', 'transactions')

UNION ALL

SELECT 
    'Triggers:',
    COUNT(*)
FROM information_schema.triggers
WHERE event_object_table IN ('bank_accounts', 'withdrawals', 'transactions')

UNION ALL

SELECT 
    'Funções:',
    COUNT(*)
FROM information_schema.routines
WHERE routine_name IN ('update_updated_at_column', 'ensure_single_default_account', 'get_organizer_balance')

UNION ALL

SELECT 
    'Índices:',
    COUNT(*)
FROM pg_indexes
WHERE tablename IN ('bank_accounts', 'withdrawals', 'transactions')
AND indexname LIKE 'idx_%';

SELECT '✅ Teste concluído com sucesso!' as status;
