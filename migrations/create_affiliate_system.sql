-- ============================================
-- SISTEMA DE AFILIADOS - PULACATRACA
-- ============================================

-- Tabela de afiliados
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, rejected
  pix_key VARCHAR(255),
  pix_type VARCHAR(20), -- cpf, cnpj, email, phone, random
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  bank_agency VARCHAR(20),
  document_number VARCHAR(20), -- CPF/CNPJ
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_commission DECIMAL(10, 2) DEFAULT 0,
  pending_commission DECIMAL(10, 2) DEFAULT 0,
  paid_commission DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  UNIQUE(user_id)
);

-- Configurações de comissão por evento
CREATE TABLE IF NOT EXISTS affiliate_event_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  commission_type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed
  commission_value DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  max_commission DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id)
);

-- Vendas geradas por afiliados
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  transaction_id UUID,
  ticket_id UUID,
  sale_amount DECIMAL(10, 2) NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  commission_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
  payment_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Pagamentos aos afiliados
CREATE TABLE IF NOT EXISTS affiliate_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20), -- pix, bank_transfer
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  payment_date TIMESTAMP,
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cliques nos links de afiliado (analytics)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  converted BOOLEAN DEFAULT false,
  transaction_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate ON affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_event ON affiliate_sales(event_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(commission_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_event ON affiliate_clicks(event_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_event_settings_event ON affiliate_event_settings(event_id);

-- Função para gerar código de afiliado único
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código: AFIL + 6 dígitos aleatórios
    new_code := 'AFIL' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = new_code) INTO code_exists;
    
    -- Se não existir, retornar
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_event_settings_updated_at BEFORE UPDATE ON affiliate_event_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_payments_updated_at BEFORE UPDATE ON affiliate_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE affiliates IS 'Cadastro de afiliados do sistema';
COMMENT ON TABLE affiliate_event_settings IS 'Configurações de comissão por evento';
COMMENT ON TABLE affiliate_sales IS 'Vendas geradas através de links de afiliado';
COMMENT ON TABLE affiliate_payments IS 'Pagamentos realizados aos afiliados';
COMMENT ON TABLE affiliate_clicks IS 'Rastreamento de cliques em links de afiliado';
