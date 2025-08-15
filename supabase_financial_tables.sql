-- ============================================
-- TABELAS FINANCEIRAS PARA O SUPABASE
-- ============================================

-- 1. Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('corrente', 'poupanca')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Saques
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado')),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para bank_accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organizer_id ON bank_accounts(organizer_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(organizer_id, is_default) WHERE is_default = true;

-- Índices para withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_organizer_id ON withdrawals(organizer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Políticas para bank_accounts
CREATE POLICY "Organizadores podem ver suas próprias contas bancárias" ON bank_accounts
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem inserir suas próprias contas bancárias" ON bank_accounts
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem atualizar suas próprias contas bancárias" ON bank_accounts
  FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem deletar suas próprias contas bancárias" ON bank_accounts
  FOR DELETE USING (organizer_id = auth.uid());

-- Políticas para withdrawals
CREATE POLICY "Organizadores podem ver seus próprios saques" ON withdrawals
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem inserir seus próprios saques" ON withdrawals
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizadores podem atualizar seus próprios saques" ON withdrawals
  FOR UPDATE USING (organizer_id = auth.uid());

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para bank_accounts
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers para withdrawals
CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO PARA GARANTIR APENAS UMA CONTA PADRÃO
-- ============================================

CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a nova conta está sendo marcada como padrão
    IF NEW.is_default = true THEN
        -- Desmarcar todas as outras contas do mesmo organizador
        UPDATE bank_accounts 
        SET is_default = false 
        WHERE organizer_id = NEW.organizer_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para garantir apenas uma conta padrão
CREATE TRIGGER ensure_single_default_account
    BEFORE INSERT OR UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_account();

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL - REMOVER EM PRODUÇÃO)
-- ============================================

-- Exemplo de contas bancárias (usar apenas para testes)
-- INSERT INTO bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
-- VALUES 
--   ('user-uuid-here', 'Banco do Brasil', '0001-2', '12345-6', 'corrente', true),
--   ('user-uuid-here', 'Bradesco', '0002-3', '67890-1', 'poupanca', false);

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE bank_accounts IS 'Contas bancárias dos organizadores para recebimento de pagamentos';
COMMENT ON TABLE withdrawals IS 'Solicitações de saque dos organizadores';

COMMENT ON COLUMN bank_accounts.organizer_id IS 'ID do organizador proprietário da conta';
COMMENT ON COLUMN bank_accounts.bank_name IS 'Nome do banco (ex: Banco do Brasil, Bradesco)';
COMMENT ON COLUMN bank_accounts.agency IS 'Número da agência bancária';
COMMENT ON COLUMN bank_accounts.account_number IS 'Número da conta bancária';
COMMENT ON COLUMN bank_accounts.account_type IS 'Tipo da conta: corrente ou poupanca';
COMMENT ON COLUMN bank_accounts.is_default IS 'Indica se esta é a conta padrão do organizador';

COMMENT ON COLUMN withdrawals.organizer_id IS 'ID do organizador que solicitou o saque';
COMMENT ON COLUMN withdrawals.bank_account_id IS 'ID da conta bancária para onde enviar o saque';
COMMENT ON COLUMN withdrawals.amount IS 'Valor do saque em reais';
COMMENT ON COLUMN withdrawals.status IS 'Status do saque: pendente, processando, concluido, cancelado';
COMMENT ON COLUMN withdrawals.processed_at IS 'Data e hora em que o saque foi processado';
COMMENT ON COLUMN withdrawals.notes IS 'Observações sobre o saque';