-- Script para corrigir tabelas faltantes do dashboard
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAR TABELA ACTIVITIES SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  entity_type TEXT, -- 'event', 'ticket', 'user', 'payment', etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ADICIONAR COLUNAS FALTANTES NA TABELA TICKETS
-- =====================================================

-- Adicionar coluna created_at se não existir
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar coluna updated_at se não existir
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar coluna payment_method se não existir
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit_card';

-- Adicionar coluna transaction_id se não existir
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- =====================================================
-- 3. CRIAR TABELA TRANSACTIONS SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CRIAR TABELA NOTIFICATIONS SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. HABILITAR RLS
-- =====================================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. POLÍTICAS RLS
-- =====================================================

-- Políticas para activities
CREATE POLICY "Admins can manage all activities" ON activities
FOR ALL USING (is_admin());

CREATE POLICY "Users can view own activities" ON activities
FOR SELECT USING (user_id = auth.uid());

-- Políticas para transactions
CREATE POLICY "Admins can manage all transactions" ON transactions
FOR ALL USING (is_admin());

CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (user_id = auth.uid());

-- Políticas para notifications
CREATE POLICY "Admins can manage all notifications" ON notifications
FOR ALL USING (is_admin());

CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para activities
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type ON activities(entity_type);

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_purchase_date ON tickets(purchase_date);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ticket_id ON transactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- 8. DADOS INICIAIS DE EXEMPLO
-- =====================================================

-- Inserir algumas atividades de exemplo
INSERT INTO activities (user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  'login',
  'Usuário fez login no sistema',
  'user',
  p.id
FROM profiles p
WHERE p.role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Inserir algumas notificações de exemplo
INSERT INTO notifications (user_id, title, message, type)
SELECT 
  p.id,
  'Bem-vindo ao Dashboard',
  'Seu painel administrativo está pronto para uso.',
  'info'
FROM profiles p
WHERE p.role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('activities', 'transactions', 'notifications')
ORDER BY table_name, ordinal_position;

-- Verificar colunas da tabela tickets
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN ('created_at', 'updated_at', 'payment_method', 'transaction_id')
ORDER BY column_name;

-- Verificar se há dados
SELECT 'activities' as table_name, COUNT(*) as count FROM activities
UNION ALL
SELECT 'transactions' as table_name, COUNT(*) as count FROM transactions
UNION ALL
SELECT 'notifications' as table_name, COUNT(*) as count FROM notifications;

-- Mensagem de sucesso
SELECT 'Tabelas do dashboard criadas/atualizadas com sucesso!' as status; 