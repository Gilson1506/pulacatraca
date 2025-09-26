-- Script para criar a tabela de transferências de ingressos
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- TABELA DE TRANSFERÊNCIAS DE INGRESSOS
-- =====================================================

-- Tabela principal de transferências
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  transfer_reason TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'cancelled', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Campos adicionais para auditoria
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Campos para rastreamento
  transfer_method TEXT DEFAULT 'manual' CHECK (transfer_method IN ('manual', 'automatic', 'api')),
  external_reference TEXT,
  
  -- Constraints
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from_user_id ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_user_id ON ticket_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON ticket_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_transferred_at ON ticket_transfers(transferred_at);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_created_at ON ticket_transfers(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ticket_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_transfers_updated_at
  BEFORE UPDATE ON ticket_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_transfers_updated_at();

-- Função para registrar transferência automaticamente
CREATE OR REPLACE FUNCTION record_ticket_transfer(
  p_ticket_id UUID,
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_transfer_reason TEXT DEFAULT NULL,
  p_processed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transfer_id UUID;
BEGIN
  -- Verificar se o ingresso existe e pertence ao usuário de origem
  IF NOT EXISTS (SELECT 1 FROM tickets WHERE id = p_ticket_id AND user_id = p_from_user_id) THEN
    RAISE EXCEPTION 'Ingresso não encontrado ou não pertence ao usuário de origem';
  END IF;
  
  -- Verificar se o usuário de destino existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_to_user_id) THEN
    RAISE EXCEPTION 'Usuário de destino não encontrado';
  END IF;
  
  -- Verificar se não é a mesma pessoa
  IF p_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Não é possível transferir para o mesmo usuário';
  END IF;
  
  -- Criar a transferência
  INSERT INTO ticket_transfers (
    ticket_id,
    from_user_id,
    to_user_id,
    transfer_reason,
    processed_by,
    status
  ) VALUES (
    p_ticket_id,
    p_from_user_id,
    p_to_user_id,
    p_transfer_reason,
    p_processed_by,
    'completed'
  ) RETURNING id INTO v_transfer_id;
  
  -- Atualizar o ingresso para o novo usuário
  UPDATE tickets 
  SET 
    user_id = p_to_user_id,
    assigned_user_id = p_to_user_id,
    assigned_user_name = (SELECT name FROM profiles WHERE id = p_to_user_id),
    assigned_user_email = (SELECT email FROM profiles WHERE id = p_to_user_id),
    assigned_at = NOW(),
    assigned_by = p_processed_by
  WHERE id = p_ticket_id;
  
  -- Registrar no histórico
  INSERT INTO ticket_history (
    ticket_id,
    action,
    user_id,
    user_name,
    user_email,
    details
  ) VALUES (
    p_ticket_id,
    'transferred',
    p_processed_by,
    (SELECT name FROM profiles WHERE id = p_processed_by),
    (SELECT email FROM profiles WHERE id = p_processed_by),
    jsonb_build_object(
      'from_user_id', p_from_user_id,
      'to_user_id', p_to_user_id,
      'transfer_id', v_transfer_id,
      'reason', p_transfer_reason
    )
  );
  
  RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

-- Políticas de segurança (RLS)
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Política para administradores (podem ver todas as transferências)
CREATE POLICY "Admins can view all transfers" ON ticket_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para organizadores (podem ver transferências dos seus eventos)
CREATE POLICY "Organizers can view transfers from their events" ON ticket_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN events e ON e.organizer_id = p.id
      JOIN tickets t ON t.event_id = e.id
      WHERE p.id = auth.uid() 
      AND p.role = 'organizer'
      AND t.id = ticket_transfers.ticket_id
    )
  );

-- Política para usuários (podem ver apenas suas próprias transferências)
CREATE POLICY "Users can view their own transfers" ON ticket_transfers
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- Política para inserção (apenas usuários autenticados)
CREATE POLICY "Authenticated users can create transfers" ON ticket_transfers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualização (apenas administradores ou o usuário que criou)
CREATE POLICY "Users can update their own transfers" ON ticket_transfers
  FOR UPDATE USING (
    from_user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir dados de exemplo para teste
INSERT INTO ticket_transfers (
  ticket_id,
  from_user_id,
  to_user_id,
  transfer_reason,
  status,
  transferred_at
) VALUES 
-- Exemplo 1: Transferência bem-sucedida
(
  (SELECT id FROM tickets LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1 OFFSET 1),
  'Transferência para amigo',
  'completed',
  NOW() - INTERVAL '2 days'
),
-- Exemplo 2: Transferência cancelada
(
  (SELECT id FROM tickets LIMIT 1 OFFSET 1),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1 OFFSET 2),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1 OFFSET 3),
  'Usuário não compareceu',
  'cancelled',
  NOW() - INTERVAL '1 day'
),
-- Exemplo 3: Transferência falhou
(
  (SELECT id FROM tickets LIMIT 1 OFFSET 2),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1 OFFSET 4),
  (SELECT id FROM profiles WHERE role = 'user' LIMIT 1 OFFSET 5),
  'Erro no processamento',
  'failed',
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT DO NOTHING;

-- Comentários da tabela
COMMENT ON TABLE ticket_transfers IS 'Registra todas as transferências de ingressos entre usuários';
COMMENT ON COLUMN ticket_transfers.ticket_id IS 'ID do ingresso transferido';
COMMENT ON COLUMN ticket_transfers.from_user_id IS 'ID do usuário que transferiu o ingresso';
COMMENT ON COLUMN ticket_transfers.to_user_id IS 'ID do usuário que recebeu o ingresso';
COMMENT ON COLUMN ticket_transfers.transferred_at IS 'Data e hora da transferência';
COMMENT ON COLUMN ticket_transfers.transfer_reason IS 'Motivo da transferência';
COMMENT ON COLUMN ticket_transfers.status IS 'Status da transferência (completed, failed, cancelled, pending)';
COMMENT ON COLUMN ticket_transfers.processed_by IS 'ID do usuário que processou a transferência';
COMMENT ON COLUMN ticket_transfers.transfer_method IS 'Método da transferência (manual, automatic, api)';
COMMENT ON COLUMN ticket_transfers.external_reference IS 'Referência externa para integrações';

-- Verificar se a tabela foi criada corretamente
SELECT 
  'Tabela ticket_transfers criada com sucesso!' as status,
  COUNT(*) as total_transfers,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM ticket_transfers;
