-- ========================================
-- 🗄️ CRIAÇÃO DA TABELA ORDERS
-- ========================================
-- Tabela para armazenar pedidos e pagamentos
-- Necessária para integração Pagar.me
-- ========================================

-- Habilitar RLS
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

-- Criar tabela orders se não existir
CREATE TABLE IF NOT EXISTS orders (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Dados do cliente
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_document VARCHAR(20),
  customer_phone VARCHAR(20),
  
  -- Endereço de cobrança
  billing_street VARCHAR(255),
  billing_number VARCHAR(20),
  billing_complement VARCHAR(100),
  billing_zip_code VARCHAR(10),
  billing_neighborhood VARCHAR(100),
  billing_city VARCHAR(100),
  billing_state VARCHAR(2),
  
  -- Dados do pedido
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  payment_method VARCHAR(20) NOT NULL, -- 'credit_card', 'debit_card', 'pix'
  
  -- Status do pagamento
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'canceled', 'refunded'
  pagarme_order_id VARCHAR(100), -- ID retornado pelo Pagar.me
  pagarme_transaction_id VARCHAR(100), -- ID da transação
  

  card_hash VARCHAR(500), -- Para cartões
  installments INTEGER DEFAULT 1, -- Para cartões
  pix_qr_code TEXT, -- Para PIX
  pix_expires_at TIMESTAMP WITH TIME ZONE, -- Para PIX
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_pagarme_order_id ON orders(pagarme_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Criar tabela order_items para itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Dados do item
  item_type VARCHAR(50) NOT NULL, -- 'ticket', 'product', 'service'
  item_id UUID, -- ID do item (ticket, produto, etc.)
  description VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_type ON order_items(item_type);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);

-- Criar tabela payment_history para histórico de mudanças de status
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Dados da mudança
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  change_reason VARCHAR(255),
  
  -- Dados do webhook (se aplicável)
  webhook_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);

-- Função para gerar número do pedido
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Formato: ORD-YYYYMMDD-XXXXX
  NEW.order_number := 'ORD-' || 
                     TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                     LPAD(CAST(nextval('order_sequence') AS TEXT), 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequência para números de pedido
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Trigger para gerar número do pedido automaticamente
DROP TRIGGER IF EXISTS trigger_generate_order_number ON orders;
CREATE TRIGGER trigger_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_updated_at ON orders;
CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies para orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
CREATE POLICY "Users can create their own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (auth.uid() = customer_id);

-- RLS Policies para order_items
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

-- RLS Policies para payment_history
DROP POLICY IF EXISTS "Users can view their own payment history" ON payment_history;
CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = payment_history.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

-- Função para inserir item no pedido
CREATE OR REPLACE FUNCTION add_order_item(
  p_order_id UUID,
  p_item_type VARCHAR(50),
  p_item_id UUID,
  p_description VARCHAR(255),
  p_quantity INTEGER,
  p_unit_amount DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
  v_item_id UUID;
BEGIN
  INSERT INTO order_items (
    order_id, item_type, item_id, description, 
    quantity, unit_amount, total_amount
  ) VALUES (
    p_order_id, p_item_type, p_item_id, p_description,
    p_quantity, p_unit_amount, (p_quantity * p_unit_amount)
  ) RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar status do pedido
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status VARCHAR(20),
  p_reason VARCHAR(255) DEFAULT NULL,
  p_webhook_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_status VARCHAR(20);
BEGIN
  -- Obter status atual
  SELECT payment_status INTO v_old_status 
  FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar status
  UPDATE orders 
  SET payment_status = p_new_status,
      updated_at = NOW(),
      paid_at = CASE WHEN p_new_status = 'paid' THEN NOW() ELSE paid_at END,
      canceled_at = CASE WHEN p_new_status = 'canceled' THEN NOW() ELSE canceled_at END
  WHERE id = p_order_id;
  
  -- Registrar no histórico
  INSERT INTO payment_history (
    order_id, old_status, new_status, change_reason, webhook_data
  ) VALUES (
    p_order_id, v_old_status, p_new_status, p_reason, p_webhook_data
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das tabelas
COMMENT ON TABLE orders IS 'Tabela principal de pedidos e pagamentos';
COMMENT ON TABLE order_items IS 'Itens de cada pedido';
COMMENT ON TABLE payment_history IS 'Histórico de mudanças de status dos pagamentos';

-- Verificar se as tabelas foram criadas
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name IN ('orders', 'order_items', 'payment_history')
ORDER BY table_name;
