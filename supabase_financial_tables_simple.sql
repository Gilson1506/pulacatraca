-- ============================================
-- TABELAS FINANCEIRAS SIMPLIFICADAS PARA O SUPABASE
-- ============================================

-- 1. Tabela de Contas Bancárias (Estrutura Simplificada)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('corrente', 'poupanca')),
  is_default BOOLEAN DEFAULT FALSE
);

-- 2. Tabela de Saques (Estrutura Simplificada)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado')),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

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
-- DADOS DE EXEMPLO PARA TESTE
-- ============================================

-- Você pode inserir dados de exemplo substituindo 'SEU_USER_ID_AQUI' pelo seu ID real
-- Para obter seu ID, execute: SELECT auth.uid();

-- INSERT INTO bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
-- VALUES 
--   ('SEU_USER_ID_AQUI', 'Banco do Brasil', '0001-2', '12345-6', 'corrente', true),
--   ('SEU_USER_ID_AQUI', 'Bradesco', '0002-3', '67890-1', 'poupanca', false);

-- INSERT INTO withdrawals (organizer_id, bank_account_id, amount, status)
-- VALUES 
--   ('SEU_USER_ID_AQUI', 'ID_DA_CONTA_BANCARIA', 1500.00, 'concluido'),
--   ('SEU_USER_ID_AQUI', 'ID_DA_CONTA_BANCARIA', 500.00, 'pendente');

-- ============================================
-- VERIFICAÇÃO DAS TABELAS
-- ============================================

-- Para verificar se as tabelas foram criadas corretamente:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('bank_accounts', 'withdrawals');

-- Para verificar as políticas RLS:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('bank_accounts', 'withdrawals');