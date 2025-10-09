-- Script para criar tabelas do sistema financeiro
-- Execute este script no Supabase para criar as tabelas necessárias

-- 1. Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    agency VARCHAR(20) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('corrente', 'poupanca')),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Solicitações de Saque
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    withdrawal_limit DECIMAL(10,2) DEFAULT NULL,
    auto_withdrawal_enabled BOOLEAN DEFAULT false,
    auto_trigger_type TEXT DEFAULT 'manual' CHECK (auto_trigger_type IN ('manual', 'sales_amount', 'sales_count', 'time_interval')),
    sales_amount_trigger DECIMAL(10,2) DEFAULT NULL,
    sales_count_trigger INTEGER DEFAULT NULL,
    time_interval_days INTEGER DEFAULT NULL,
    last_auto_execution TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    next_scheduled_execution TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 3. Tabela de Transações (se não existir)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Venda', 'Reembolso', 'Comissão', 'Saque')),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Concluído', 'Pendente', 'Falhou')),
    description TEXT,
    payment_method VARCHAR(50),
    reference_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organizer_id ON bank_accounts(organizer_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank_accounts(organizer_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_withdrawals_organizer_id ON withdrawals(organizer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_auto_enabled ON withdrawals(auto_withdrawal_enabled);
CREATE INDEX IF NOT EXISTS idx_withdrawals_trigger_type ON withdrawals(auto_trigger_type);
CREATE INDEX IF NOT EXISTS idx_withdrawals_next_execution ON withdrawals(next_scheduled_execution);
CREATE INDEX IF NOT EXISTS idx_withdrawals_limit ON withdrawals(withdrawal_limit);
CREATE INDEX IF NOT EXISTS idx_transactions_organizer_id ON transactions(organizer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de segurança para bank_accounts
CREATE POLICY "Organizadores podem ver suas próprias contas bancárias" ON bank_accounts
    FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem inserir suas próprias contas bancárias" ON bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem atualizar suas próprias contas bancárias" ON bank_accounts
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem deletar suas próprias contas bancárias" ON bank_accounts
    FOR DELETE USING (auth.uid() = organizer_id);

-- 7. Políticas de segurança para withdrawals
CREATE POLICY "Organizadores podem ver seus próprios saques" ON withdrawals
    FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem inserir seus próprios saques" ON withdrawals
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem atualizar seus próprios saques" ON withdrawals
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem deletar seus próprios saques" ON withdrawals
    FOR DELETE USING (auth.uid() = organizer_id);

-- 8. Políticas de segurança para transactions
CREATE POLICY "Organizadores podem ver suas próprias transações" ON transactions
    FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem inserir suas próprias transações" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem atualizar suas próprias transações" ON transactions
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizadores podem deletar suas próprias transações" ON transactions
    FOR DELETE USING (auth.uid() = organizer_id);

-- 9. Política especial para admins verem todas as transações
CREATE POLICY "Admins podem ver todas as transações" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins podem ver todas as contas bancárias" ON bank_accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins podem ver todos os saques" ON withdrawals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 10. Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Trigger para garantir apenas uma conta padrão por organizador
CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE bank_accounts
        SET is_default = false
        WHERE organizer_id = NEW.organizer_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_default_bank_account
    BEFORE INSERT OR UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_account();

-- 12. Função para calcular saldo disponível do organizador
CREATE OR REPLACE FUNCTION get_organizer_balance(organizer_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_revenue DECIMAL(10,2) := 0;
    total_withdrawals DECIMAL(10,2) := 0;
    total_commissions DECIMAL(10,2) := 0;
    total_refunds DECIMAL(10,2) := 0;
BEGIN
    -- Calcular receita total
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue
    FROM transactions
    WHERE organizer_id = organizer_uuid 
    AND type = 'Venda' 
    AND status = 'Concluído';
    
    -- Calcular saques totais
    SELECT COALESCE(SUM(amount), 0) INTO total_withdrawals
    FROM withdrawals
    WHERE organizer_id = organizer_uuid 
    AND status IN ('concluido', 'processando');
    
    -- Calcular comissões
    SELECT COALESCE(SUM(amount), 0) INTO total_commissions
    FROM transactions
    WHERE organizer_id = organizer_uuid 
    AND type = 'Comissão' 
    AND status = 'Concluído';
    
    -- Calcular reembolsos
    SELECT COALESCE(SUM(amount), 0) INTO total_refunds
    FROM transactions
    WHERE organizer_id = organizer_uuid 
    AND type = 'Reembolso' 
    AND status = 'Concluído';
    
    RETURN total_revenue - total_withdrawals - total_commissions - total_refunds;
END;
$$ LANGUAGE plpgsql;

-- 13. Comentários das tabelas
COMMENT ON TABLE bank_accounts IS 'Contas bancárias dos organizadores para recebimento de pagamentos';
COMMENT ON TABLE withdrawals IS 'Solicitações de saque dos organizadores';
COMMENT ON TABLE transactions IS 'Transações financeiras do sistema';

-- 14. Dados de exemplo (opcional)
-- INSERT INTO bank_accounts (organizer_id, bank_name, agency, account_number, account_type, is_default)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001', 'Banco do Brasil', '1234', '12345-6', 'corrente', true),
--     ('00000000-0000-0000-0000-000000000002', 'Bradesco', '5678', '98765-4', 'corrente', true);

-- INSERT INTO withdrawals (organizer_id, bank_account_id, amount, status, notes)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1500.00, 'pendente', 'Saque mensal'),
--     ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 2500.00, 'processando', 'Saque por vendas');

-- INSERT INTO transactions (event_id, organizer_id, type, amount, status, description, payment_method)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Venda', 500.00, 'Concluído', 'Venda de ingresso VIP', 'Cartão de Crédito'),
--     ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Venda', 750.00, 'Concluído', 'Venda de ingresso Premium', 'PIX');

-- Verificar se as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bank_accounts', 'withdrawals', 'transactions')
ORDER BY table_name;

-- Verificar as políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'withdrawals', 'transactions')
ORDER BY tablename, policyname;

-- Verificar os triggers
SELECT 
    event_object_table,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('bank_accounts', 'withdrawals', 'transactions')
ORDER BY event_object_table, trigger_name;
