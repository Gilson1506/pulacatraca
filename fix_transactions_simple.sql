-- ============================================
-- FIX SIMPLES: ADICIONAR COLUNA BUYER_ID
-- ============================================

-- Verificar estrutura atual
\d transactions;

-- Adicionar coluna buyer_id se não existir
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_id UUID;

-- Adicionar referência para profiles se não existir
DO $$
BEGIN
    -- Tentar adicionar constraint de foreign key
    BEGIN
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_buyer_id 
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint adicionada com sucesso';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint já existe';
    END;
END $$;

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'buyer_id';

-- Se ainda não existir, forçar criação direta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'buyer_id'
    ) THEN
        -- Método alternativo: adicionar sem IF NOT EXISTS
        EXECUTE 'ALTER TABLE transactions ADD COLUMN buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Coluna buyer_id criada com método alternativo';
    ELSE
        RAISE NOTICE 'Coluna buyer_id já existe';
    END IF;
END $$;

-- Verificar novamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Testar inserção simples para verificar se funciona
INSERT INTO transactions (buyer_id, amount, status) 
VALUES (NULL, 1000, 'pending') 
ON CONFLICT DO NOTHING;

-- Remover teste
DELETE FROM transactions WHERE amount = 1000 AND status = 'pending' AND buyer_id IS NULL;

RAISE NOTICE '✅ Verificação concluída - teste a aplicação agora!';