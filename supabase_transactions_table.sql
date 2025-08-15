-- ============================================
-- TABELA DE TRANSAÇÕES PARA O SUPABASE
-- ============================================

-- 1. Tabela de Transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Valor em centavos para precisão
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'bank_transfer', 'cash')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
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
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

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
-- VERIFICAÇÕES E CONSULTAS ÚTEIS
-- ============================================

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'transactions';

-- Consulta de exemplo para organizadores
/*
SELECT 
  t.id,
  t.amount,
  t.status,
  t.payment_method,
  t.created_at,
  e.title as event_name,
  p.name as buyer_name,
  p.email as buyer_email
FROM transactions t
JOIN events e ON t.event_id = e.id
JOIN profiles p ON t.buyer_id = p.id
WHERE e.organizer_id = auth.uid()
ORDER BY t.created_at DESC;
*/

-- ============================================
-- DADOS DE EXEMPLO PARA TESTE
-- ============================================

-- Para inserir transações de exemplo:
/*
INSERT INTO transactions (event_id, buyer_id, amount, status, payment_method)
VALUES 
  ('EVENT_ID_1', 'USER_ID_1', 5000, 'completed', 'credit_card'), -- R$ 50,00
  ('EVENT_ID_1', 'USER_ID_2', 3000, 'completed', 'pix'),         -- R$ 30,00
  ('EVENT_ID_2', 'USER_ID_1', 7500, 'pending', 'credit_card');   -- R$ 75,00
*/

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
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