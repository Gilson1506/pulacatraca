-- ============================================
-- ATUALIZAR TABELA TRANSACTIONS EXISTENTE
-- ============================================

-- 1. Verificar estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- ============================================
-- ADICIONAR COLUNAS SE NÃO EXISTIREM
-- ============================================

-- Verificar e adicionar coluna buyer_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'buyer_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Coluna buyer_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna buyer_id já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna event_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE 'Coluna event_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna event_id já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna amount
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'amount'
    ) THEN
        ALTER TABLE transactions ADD COLUMN amount INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Coluna amount adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna amount já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'status'
    ) THEN
        ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        RAISE NOTICE 'Coluna status adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna status já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna payment_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE transactions ADD COLUMN payment_method TEXT;
        RAISE NOTICE 'Coluna payment_method adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna payment_method já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna created_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE transactions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
        RAISE NOTICE 'Coluna created_at adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna created_at já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
        RAISE NOTICE 'Coluna updated_at adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna processed_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'processed_at'
    ) THEN
        ALTER TABLE transactions ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Coluna processed_at adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna processed_at já existe';
    END IF;
END $$;

-- Verificar e adicionar coluna notes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'notes'
    ) THEN
        ALTER TABLE transactions ADD COLUMN notes TEXT;
        RAISE NOTICE 'Coluna notes adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna notes já existe';
    END IF;
END $$;

-- ============================================
-- ADICIONAR CONSTRAINTS SE NÃO EXISTIREM
-- ============================================

-- Constraint para status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'transactions_status_check'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));
        RAISE NOTICE 'Constraint status adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Constraint status já existe';
    END IF;
END $$;

-- Constraint para payment_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'transactions_payment_method_check'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
        CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'bank_transfer', 'cash'));
        RAISE NOTICE 'Constraint payment_method adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Constraint payment_method já existe';
    END IF;
END $$;

-- ============================================
-- CRIAR ÍNDICES SE NÃO EXISTIREM
-- ============================================

-- Índice para event_id
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);

-- Índice para buyer_id
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);

-- Índice para status
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Índice para payment_method
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HABILITAR RLS E CRIAR POLÍTICAS
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Compradores podem ver suas transações" ON transactions;
DROP POLICY IF EXISTS "Organizadores podem ver transações dos seus eventos" ON transactions;
DROP POLICY IF EXISTS "Sistema pode inserir transações" ON transactions;
DROP POLICY IF EXISTS "Organizadores podem atualizar transações dos seus eventos" ON transactions;

-- Política: Compradores podem ver suas próprias transações
CREATE POLICY "Compradores podem ver suas transações" ON transactions
  FOR SELECT USING (buyer_id = auth.uid());

-- Política: Organizadores podem ver transações dos seus eventos
CREATE POLICY "Organizadores podem ver transações dos seus eventos" ON transactions
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- Política: Sistema pode inserir transações
CREATE POLICY "Sistema pode inserir transações" ON transactions
  FOR INSERT WITH CHECK (true);

-- Política: Organizadores podem atualizar transações dos seus eventos
CREATE POLICY "Organizadores podem atualizar transações dos seus eventos" ON transactions
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = auth.uid()
    )
  );

-- ============================================
-- ADICIONAR COMENTÁRIOS
-- ============================================

COMMENT ON TABLE transactions IS 'Transações de compra de ingressos';

COMMENT ON COLUMN transactions.event_id IS 'ID do evento relacionado à transação';
COMMENT ON COLUMN transactions.buyer_id IS 'ID da pessoa que fez a compra';
COMMENT ON COLUMN transactions.amount IS 'Valor da transação em centavos (ex: 5000 = R$ 50,00)';
COMMENT ON COLUMN transactions.status IS 'Status: pending (pendente), completed (concluída), failed (falhou), cancelled (cancelada)';
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento usado';
COMMENT ON COLUMN transactions.created_at IS 'Data e hora da criação da transação';
COMMENT ON COLUMN transactions.updated_at IS 'Data e hora da última atualização';
COMMENT ON COLUMN transactions.processed_at IS 'Data e hora do processamento do pagamento';
COMMENT ON COLUMN transactions.notes IS 'Observações sobre a transação';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Mostrar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Mostrar políticas RLS
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'transactions';

-- Mostrar constraints
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'transactions';

-- Mostrar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'transactions';

RAISE NOTICE '✅ Atualização da tabela transactions concluída com sucesso!';
RAISE NOTICE '📊 Execute uma query SELECT para verificar se tudo está funcionando';
RAISE NOTICE '🧪 Teste o checkout agora - deve funcionar perfeitamente!';