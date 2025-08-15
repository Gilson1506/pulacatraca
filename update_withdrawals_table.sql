-- ============================================
-- ATUALIZAÇÃO DA TABELA WITHDRAWALS
-- ============================================
-- Este script adiciona funcionalidades de saque automático
-- e outras melhorias na tabela de saques

-- ============================================
-- 1. VERIFICAR E ADICIONAR COLUNAS FALTANTES
-- ============================================

-- Adicionar coluna notes se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'notes') THEN
        ALTER TABLE withdrawals ADD COLUMN notes TEXT;
        RAISE NOTICE 'Coluna notes adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna notes já existe';
    END IF;
END $$;

-- Adicionar coluna withdrawal_limit se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'withdrawal_limit') THEN
        ALTER TABLE withdrawals ADD COLUMN withdrawal_limit DECIMAL(10,2) DEFAULT NULL;
        RAISE NOTICE 'Coluna withdrawal_limit adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna withdrawal_limit já existe';
    END IF;
END $$;

-- ============================================
-- 2. FUNCIONALIDADES DE SAQUE AUTOMÁTICO
-- ============================================

-- Adicionar coluna para ativar saque automático
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'auto_withdrawal_enabled') THEN
        ALTER TABLE withdrawals ADD COLUMN auto_withdrawal_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna auto_withdrawal_enabled adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna auto_withdrawal_enabled já existe';
    END IF;
END $$;

-- Adicionar coluna para tipo de gatilho automático
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'auto_trigger_type') THEN
        ALTER TABLE withdrawals ADD COLUMN auto_trigger_type TEXT DEFAULT 'manual' 
            CHECK (auto_trigger_type IN ('manual', 'sales_amount', 'sales_count', 'time_interval'));
        RAISE NOTICE 'Coluna auto_trigger_type adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna auto_trigger_type já existe';
    END IF;
END $$;

-- Adicionar coluna para valor gatilho de vendas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'sales_amount_trigger') THEN
        ALTER TABLE withdrawals ADD COLUMN sales_amount_trigger DECIMAL(10,2) DEFAULT NULL;
        RAISE NOTICE 'Coluna sales_amount_trigger adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna sales_amount_trigger já existe';
    END IF;
END $$;

-- Adicionar coluna para contador gatilho de vendas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'sales_count_trigger') THEN
        ALTER TABLE withdrawals ADD COLUMN sales_count_trigger INTEGER DEFAULT NULL;
        RAISE NOTICE 'Coluna sales_count_trigger adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna sales_count_trigger já existe';
    END IF;
END $$;

-- Adicionar coluna para intervalo de tempo (em dias)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'time_interval_days') THEN
        ALTER TABLE withdrawals ADD COLUMN time_interval_days INTEGER DEFAULT NULL;
        RAISE NOTICE 'Coluna time_interval_days adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna time_interval_days já existe';
    END IF;
END $$;

-- Adicionar coluna para última execução automática
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'last_auto_execution') THEN
        ALTER TABLE withdrawals ADD COLUMN last_auto_execution TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        RAISE NOTICE 'Coluna last_auto_execution adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna last_auto_execution já existe';
    END IF;
END $$;

-- Adicionar coluna para próximo agendamento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'next_scheduled_execution') THEN
        ALTER TABLE withdrawals ADD COLUMN next_scheduled_execution TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        RAISE NOTICE 'Coluna next_scheduled_execution adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna next_scheduled_execution já existe';
    END IF;
END $$;

-- ============================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para saques automáticos
CREATE INDEX IF NOT EXISTS idx_withdrawals_auto_enabled ON withdrawals(auto_withdrawal_enabled) 
WHERE auto_withdrawal_enabled = true;

-- Índice para tipo de gatilho
CREATE INDEX IF NOT EXISTS idx_withdrawals_trigger_type ON withdrawals(auto_trigger_type);

-- Índice para próximo agendamento
CREATE INDEX IF NOT EXISTS idx_withdrawals_next_execution ON withdrawals(next_scheduled_execution) 
WHERE next_scheduled_execution IS NOT NULL;

-- Índice para limite de saque
CREATE INDEX IF NOT EXISTS idx_withdrawals_limit ON withdrawals(withdrawal_limit) 
WHERE withdrawal_limit IS NOT NULL;

-- ============================================
-- 4. FUNÇÕES PARA SAQUE AUTOMÁTICO
-- ============================================

-- Função para verificar se deve executar saque automático
CREATE OR REPLACE FUNCTION check_auto_withdrawal_conditions()
RETURNS TRIGGER AS $$
DECLARE
    withdrawal_record RECORD;
    total_sales DECIMAL(10,2) := 0;
    sales_count INTEGER := 0;
    days_since_last INTEGER := 0;
BEGIN
         -- Buscar o organizador do evento da transação
     DECLARE
         event_organizer_id UUID;
     BEGIN
         SELECT e.organizer_id INTO event_organizer_id
         FROM events e
         WHERE e.id = NEW.event_id;
         
         IF event_organizer_id IS NULL THEN
             RETURN NEW;
         END IF;
         
         -- Buscar configurações de saque automático
         FOR withdrawal_record IN 
             SELECT * FROM withdrawals 
             WHERE auto_withdrawal_enabled = true 
             AND organizer_id = event_organizer_id
             AND status = 'pendente'
         LOOP
        -- Verificar gatilho por valor de vendas
        IF withdrawal_record.auto_trigger_type = 'sales_amount' 
           AND withdrawal_record.sales_amount_trigger IS NOT NULL THEN
            
                         SELECT COALESCE(SUM(t.total_amount), 0) INTO total_sales
             FROM transactions t
             JOIN events e ON t.event_id = e.id
             WHERE e.organizer_id = withdrawal_record.organizer_id 
             AND t.created_at >= COALESCE(withdrawal_record.last_auto_execution, '1970-01-01'::timestamp);
            
            IF total_sales >= withdrawal_record.sales_amount_trigger THEN
                -- Executar saque automático
                PERFORM execute_auto_withdrawal(withdrawal_record.id);
            END IF;
        END IF;
        
        -- Verificar gatilho por contador de vendas
        IF withdrawal_record.auto_trigger_type = 'sales_count' 
           AND withdrawal_record.sales_count_trigger IS NOT NULL THEN
            
                         SELECT COUNT(*) INTO sales_count
             FROM transactions t
             JOIN events e ON t.event_id = e.id
             WHERE e.organizer_id = withdrawal_record.organizer_id 
             AND t.created_at >= COALESCE(withdrawal_record.last_auto_execution, '1970-01-01'::timestamp);
            
            IF sales_count >= withdrawal_record.sales_count_trigger THEN
                -- Executar saque automático
                PERFORM execute_auto_withdrawal(withdrawal_record.id);
            END IF;
        END IF;
        
        -- Verificar gatilho por intervalo de tempo
        IF withdrawal_record.auto_trigger_type = 'time_interval' 
           AND withdrawal_record.time_interval_days IS NOT NULL THEN
            
            IF withdrawal_record.last_auto_execution IS NULL THEN
                -- Primeira execução
                UPDATE withdrawals 
                SET next_scheduled_execution = NOW() + INTERVAL '1 day' * withdrawal_record.time_interval_days
                WHERE id = withdrawal_record.id;
            ELSE
                days_since_last := EXTRACT(DAY FROM (NOW() - withdrawal_record.last_auto_execution));
                
                IF days_since_last >= withdrawal_record.time_interval_days THEN
                    -- Executar saque automático
                    PERFORM execute_auto_withdrawal(withdrawal_record.id);
                END IF;
            END IF;
                 END IF;
     END LOOP;
     END;
     
     RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para executar saque automático
CREATE OR REPLACE FUNCTION execute_auto_withdrawal(withdrawal_id UUID)
RETURNS VOID AS $$
DECLARE
    withdrawal_record RECORD;
    available_balance DECIMAL(10,2) := 0;
    withdrawal_amount DECIMAL(10,2) := 0;
BEGIN
    -- Buscar dados do saque
    SELECT * INTO withdrawal_record FROM withdrawals WHERE id = withdrawal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Saque não encontrado: %', withdrawal_id;
    END IF;
    
         -- Calcular saldo disponível (vendas - saques já processados)
     SELECT COALESCE(SUM(t.total_amount), 0) - COALESCE(SUM(w.amount), 0) INTO available_balance
     FROM transactions t
     JOIN events e ON t.event_id = e.id
     LEFT JOIN withdrawals w ON w.organizer_id = e.organizer_id AND w.status IN ('concluido', 'processando')
     WHERE e.organizer_id = withdrawal_record.organizer_id;
    
    -- Definir valor do saque
    IF withdrawal_record.withdrawal_limit IS NOT NULL AND withdrawal_record.withdrawal_limit > 0 THEN
        withdrawal_amount := LEAST(available_balance, withdrawal_record.withdrawal_limit);
    ELSE
        withdrawal_amount := available_balance;
    END IF;
    
    -- Verificar se há saldo suficiente
    IF withdrawal_amount <= 0 THEN
        RAISE NOTICE 'Saldo insuficiente para saque automático: %', withdrawal_id;
        RETURN;
    END IF;
    
    -- Atualizar saque com valor calculado e marcar como processando
    UPDATE withdrawals 
    SET 
        amount = withdrawal_amount,
        status = 'processando',
        last_auto_execution = NOW(),
        next_scheduled_execution = CASE 
            WHEN auto_trigger_type = 'time_interval' THEN NOW() + INTERVAL '1 day' * time_interval_days
            ELSE NULL
        END
    WHERE id = withdrawal_id;
    
    RAISE NOTICE 'Saque automático executado: % - Valor: %', withdrawal_id, withdrawal_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGERS PARA AUTOMAÇÃO
-- ============================================

-- Trigger para verificar condições de saque automático após nova venda
DROP TRIGGER IF EXISTS trigger_check_auto_withdrawal ON transactions;
CREATE TRIGGER trigger_check_auto_withdrawal
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_withdrawal_conditions();

-- ============================================
-- 6. VIEW PARA MONITORAMENTO
-- ============================================

-- View para visualizar saques automáticos
CREATE OR REPLACE VIEW auto_withdrawals_monitoring AS
SELECT 
    w.id,
    w.organizer_id,
    p.name as organizer_name,
    w.auto_withdrawal_enabled,
    w.auto_trigger_type,
    w.sales_amount_trigger,
    w.sales_count_trigger,
    w.time_interval_days,
    w.withdrawal_limit,
    w.last_auto_execution,
    w.next_scheduled_execution,
    w.status,
    w.amount
FROM withdrawals w
JOIN profiles p ON w.organizer_id = p.id
WHERE w.auto_withdrawal_enabled = true
ORDER BY w.next_scheduled_execution ASC NULLS LAST;

-- ============================================
-- 7. FUNÇÃO PARA AGENDAR SAQUES RECORRENTES
-- ============================================

-- Função para agendar saques recorrentes (executar diariamente via cron)
CREATE OR REPLACE FUNCTION schedule_recurring_withdrawals()
RETURNS VOID AS $$
DECLARE
    withdrawal_record RECORD;
BEGIN
    FOR withdrawal_record IN 
        SELECT * FROM withdrawals 
        WHERE auto_withdrawal_enabled = true 
        AND auto_trigger_type = 'time_interval'
        AND time_interval_days IS NOT NULL
        AND (next_scheduled_execution IS NULL OR next_scheduled_execution <= NOW())
    LOOP
        -- Executar saque automático
        PERFORM execute_auto_withdrawal(withdrawal_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. COMENTÁRIOS NAS COLUNAS
-- ============================================

COMMENT ON COLUMN withdrawals.auto_withdrawal_enabled IS 'Ativa saque automático para esta conta';
COMMENT ON COLUMN withdrawals.auto_trigger_type IS 'Tipo de gatilho: manual, sales_amount, sales_count, time_interval';
COMMENT ON COLUMN withdrawals.sales_amount_trigger IS 'Valor total de vendas para acionar saque automático';
COMMENT ON COLUMN withdrawals.sales_count_trigger IS 'Número de vendas para acionar saque automático';
COMMENT ON COLUMN withdrawals.time_interval_days IS 'Intervalo em dias para saques recorrentes';
COMMENT ON COLUMN withdrawals.withdrawal_limit IS 'Valor máximo permitido para cada saque';
COMMENT ON COLUMN withdrawals.last_auto_execution IS 'Data da última execução automática';
COMMENT ON COLUMN withdrawals.next_scheduled_execution IS 'Próxima execução agendada';

-- ============================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar estrutura final da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'withdrawals' 
ORDER BY ordinal_position;

-- Verificar se as funções foram criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%withdrawal%';

-- Verificar se os triggers foram criados
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'withdrawals';

-- ✅ Tabela withdrawals atualizada com sucesso para suportar saque automático!
