-- Script completo para corrigir problemas do dashboard
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAR TABELA ACTIVITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ADICIONAR COLUNAS FALTANTES EM TICKETS
-- =====================================================

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit_card';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- =====================================================
-- 3. CRIAR TABELA TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CRIAR TABELA NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
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
-- 6. POLÍTICAS RLS SIMPLES
-- =====================================================

-- Activities
CREATE POLICY "Admins can manage all activities" ON activities FOR ALL USING (is_admin());
CREATE POLICY "Users can view own activities" ON activities FOR SELECT USING (user_id = auth.uid());

-- Transactions
CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (is_admin());
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "Admins can manage all notifications" ON notifications FOR ALL USING (is_admin());
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- 7. DADOS DE EXEMPLO
-- =====================================================

-- Atividades de exemplo
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

INSERT INTO activities (user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  'dashboard_access',
  'Acessou o painel administrativo',
  'dashboard',
  NULL
FROM profiles p
WHERE p.role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Notificações de exemplo
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
-- 8. VERIFICAÇÃO
-- =====================================================

SELECT 'Tabelas criadas com sucesso!' as status; 