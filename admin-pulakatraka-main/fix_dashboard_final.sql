-- Script final para corrigir problemas do dashboard
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAR TABELA ACTIVITIES SE NÃO EXISTIR
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
-- 3. CRIAR TABELA TRANSACTIONS SE NÃO EXISTIR
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
-- 4. CRIAR TABELA NOTIFICATIONS SE NÃO EXISTIR
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
-- 6. CRIAR POLÍTICAS RLS (APENAS SE NÃO EXISTIREM)
-- =====================================================

-- Políticas para activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Admins can manage all activities') THEN
    CREATE POLICY "Admins can manage all activities" ON activities FOR ALL USING (is_admin());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Users can view own activities') THEN
    CREATE POLICY "Users can view own activities" ON activities FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- Políticas para transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Admins can manage all transactions') THEN
    CREATE POLICY "Admins can manage all transactions" ON transactions FOR ALL USING (is_admin());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions') THEN
    CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- Políticas para notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Admins can manage all notifications') THEN
    CREATE POLICY "Admins can manage all notifications" ON notifications FOR ALL USING (is_admin());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- 7. DADOS DE EXEMPLO (APENAS SE NÃO EXISTIREM)
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
  AND NOT EXISTS (SELECT 1 FROM activities WHERE action = 'login' AND user_id = p.id)
LIMIT 1;

INSERT INTO activities (user_id, action, description, entity_type, entity_id)
SELECT 
  p.id,
  'dashboard_access',
  'Acessou o painel administrativo',
  'dashboard',
  NULL
FROM profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM activities WHERE action = 'dashboard_access' AND user_id = p.id)
LIMIT 1;

-- Notificações de exemplo
INSERT INTO notifications (user_id, title, message, type)
SELECT 
  p.id,
  'Bem-vindo ao Dashboard',
  'Seu painel administrativo está pronto para uso.',
  'info'
FROM profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'Bem-vindo ao Dashboard' AND user_id = p.id)
LIMIT 1;

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar tabelas criadas
SELECT 
  'Tabelas criadas:' as info,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN ('activities', 'transactions', 'notifications')
  AND table_schema = 'public';

-- Verificar políticas criadas
SELECT 
  'Políticas criadas:' as info,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename IN ('activities', 'transactions', 'notifications')
  AND schemaname = 'public';

-- Verificar dados inseridos
SELECT 'activities' as table_name, COUNT(*) as count FROM activities
UNION ALL
SELECT 'transactions' as table_name, COUNT(*) as count FROM transactions
UNION ALL
SELECT 'notifications' as table_name, COUNT(*) as count FROM notifications;

-- Mensagem de sucesso
SELECT 'Dashboard configurado com sucesso!' as status; 