-- ============================================
-- SISTEMA DE CUPONS DE DESCONTO
-- Script SQL para executar no Supabase
-- ============================================

-- 1. Criar tabela de cupons
CREATE TABLE IF NOT EXISTS event_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Identificação
  code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Tipo de desconto
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  
  -- Limites
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  max_uses_per_user INTEGER DEFAULT 1 CHECK (max_uses_per_user > 0),
  current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
  
  -- Validade
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Aplicabilidade
  applicable_to_all_tickets BOOLEAN DEFAULT true,
  applicable_ticket_types JSONB,
  
  -- Valor mínimo de compra
  minimum_purchase_amount DECIMAL(10,2) CHECK (minimum_purchase_amount IS NULL OR minimum_purchase_amount >= 0),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_event_code UNIQUE (event_id, code),
  CONSTRAINT valid_date_range CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_event_coupons_event_id ON event_coupons(event_id);
CREATE INDEX IF NOT EXISTS idx_event_coupons_code ON event_coupons(code);
CREATE INDEX IF NOT EXISTS idx_event_coupons_organizer_id ON event_coupons(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_coupons_active ON event_coupons(is_active) WHERE is_active = true;

-- 3. Criar tabela de uso de cupons
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES event_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  transaction_id UUID REFERENCES transactions(id),
  
  -- Valores
  original_amount DECIMAL(10,2) NOT NULL CHECK (original_amount >= 0),
  discount_amount DECIMAL(10,2) NOT NULL CHECK (discount_amount >= 0),
  final_amount DECIMAL(10,2) NOT NULL CHECK (final_amount >= 0),
  
  -- Timestamp
  used_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_coupon_order UNIQUE (coupon_id, user_id, order_id)
);

-- 4. Criar índices para coupon_usage
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);

-- 5. Criar função para incrementar uso de cupom
CREATE OR REPLACE FUNCTION increment_coupon_uses(p_coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE event_coupons
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar função para validar cupom (opcional, pode ser feito no frontend)
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code VARCHAR(50),
  p_event_id UUID,
  p_user_id UUID,
  p_purchase_amount DECIMAL(10,2)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  coupon_data JSONB
) AS $$
DECLARE
  v_coupon event_coupons%ROWTYPE;
  v_usage_count INTEGER;
BEGIN
  -- Buscar cupom
  SELECT * INTO v_coupon
  FROM event_coupons
  WHERE code = UPPER(p_code)
    AND event_id = p_event_id
    AND is_active = true;
  
  -- Cupom não encontrado
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom inválido ou não encontrado'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Validar validade
  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > NOW() THEN
    RETURN QUERY SELECT false, 'Cupom ainda não está válido'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN QUERY SELECT false, 'Cupom expirado'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Validar limite de usos totais
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Validar uso por usuário
  SELECT COUNT(*) INTO v_usage_count
  FROM coupon_usage
  WHERE coupon_id = v_coupon.id
    AND user_id = p_user_id;
  
  IF v_usage_count >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'Você já usou este cupom o máximo de vezes permitido'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Validar valor mínimo
  IF v_coupon.minimum_purchase_amount IS NOT NULL AND p_purchase_amount < v_coupon.minimum_purchase_amount THEN
    RETURN QUERY SELECT false, 
      format('Valor mínimo de compra: R$ %.2f', v_coupon.minimum_purchase_amount)::TEXT, 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Cupom válido
  RETURN QUERY SELECT true, 
    NULL::TEXT, 
    row_to_json(v_coupon)::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_coupons_updated_at
  BEFORE UPDATE ON event_coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Habilitar RLS (Row Level Security)
ALTER TABLE event_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para event_coupons
-- Organizadores podem ver seus próprios cupons
CREATE POLICY "Organizers can view their own coupons"
  ON event_coupons FOR SELECT
  USING (auth.uid() = organizer_id);

-- Organizadores podem criar cupons para seus eventos
CREATE POLICY "Organizers can create coupons for their events"
  ON event_coupons FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- Organizadores podem atualizar seus próprios cupons
CREATE POLICY "Organizers can update their own coupons"
  ON event_coupons FOR UPDATE
  USING (auth.uid() = organizer_id);

-- Organizadores podem deletar seus próprios cupons
CREATE POLICY "Organizers can delete their own coupons"
  ON event_coupons FOR DELETE
  USING (auth.uid() = organizer_id);

-- Usuários podem ver cupons ativos de eventos aprovados
CREATE POLICY "Users can view active coupons for approved events"
  ON event_coupons FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
        AND events.status = 'approved'
    )
  );

-- 10. Políticas RLS para coupon_usage
-- Usuários podem ver seu próprio histórico de uso
CREATE POLICY "Users can view their own coupon usage"
  ON coupon_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Organizadores podem ver uso de cupons dos seus eventos
CREATE POLICY "Organizers can view coupon usage for their events"
  ON coupon_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_coupons ec
      WHERE ec.id = coupon_id
        AND ec.organizer_id = auth.uid()
    )
  );

-- Sistema pode inserir registros de uso (via service role)
CREATE POLICY "Service can insert coupon usage"
  ON coupon_usage FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Para verificar se tudo foi criado corretamente:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%coupon%';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%coupon%';
