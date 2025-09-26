-- Script completo para configuração do banco de dados Supabase
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAÇÃO DAS TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'organizer', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  phone TEXT,
  company_name TEXT,
  cnpj TEXT,
  cpf TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  banner_url TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  available_tickets INTEGER DEFAULT 0,
  total_tickets INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  carousel_approved BOOLEAN DEFAULT false,
  carousel_priority INTEGER DEFAULT 0,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  rejection_reason TEXT
);

-- Tabela de ingressos
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Comprador original
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'expired')),
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  price DECIMAL(10,2) NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  
  -- Informações do usuário atribuído (pode ser diferente do comprador)
  assigned_user_id UUID REFERENCES profiles(id),
  assigned_user_name TEXT,
  assigned_user_email TEXT,
  assigned_user_phone TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES profiles(id),
  
  -- Informações de check-in
  check_in_date TIMESTAMP WITH TIME ZONE,
  check_in_by UUID REFERENCES profiles(id),
  check_in_location TEXT,
  
  -- Informações de uso
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES profiles(id),
  
  -- Notas adicionais
  notes TEXT
);

-- Tabela de histórico de ingressos
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('purchased', 'assigned', 'unassigned', 'checked_in', 'used', 'cancelled', 'status_changed')),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_email TEXT,
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('success', 'warning', 'info', 'message', 'event')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  payment_id TEXT
);

-- =====================================================
-- 2. CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user_id ON tickets(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);

-- Índices para ticket_history
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_action_date ON ticket_history(action_date);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Índices para chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- =====================================================
-- 3. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se o usuário é admin usando uma consulta simples
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar histórico de ingressos
CREATE OR REPLACE FUNCTION log_ticket_action(
  p_ticket_id UUID,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ticket_history (
    ticket_id, action, user_id, user_name, user_email, details
  ) VALUES (
    p_ticket_id, p_action, p_user_id, p_user_name, p_user_email, p_details
  );
END;
$$ LANGUAGE plpgsql;

-- Função para trigger de mudanças em ingressos
CREATE OR REPLACE FUNCTION trigger_log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar mudanças no status
  IF OLD.status != NEW.status THEN
    PERFORM log_ticket_action(
      NEW.id,
      'status_changed',
      auth.uid(),
      (SELECT name FROM profiles WHERE id = auth.uid()),
      (SELECT email FROM profiles WHERE id = auth.uid()),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  -- Registrar atribuição de usuário
  IF OLD.assigned_user_id IS NULL AND NEW.assigned_user_id IS NOT NULL THEN
    PERFORM log_ticket_action(
      NEW.id,
      'assigned',
      NEW.assigned_user_id,
      NEW.assigned_user_name,
      NEW.assigned_user_email,
      jsonb_build_object(
        'assigned_by', auth.uid(),
        'assigned_at', NEW.assigned_at
      )
    );
  END IF;
  
  -- Registrar check-in
  IF OLD.check_in_date IS NULL AND NEW.check_in_date IS NOT NULL THEN
    PERFORM log_ticket_action(
      NEW.id,
      'checked_in',
      NEW.assigned_user_id,
      NEW.assigned_user_name,
      NEW.assigned_user_email,
      jsonb_build_object(
        'check_in_by', NEW.check_in_by,
        'check_in_location', NEW.check_in_location
      )
    );
  END IF;
  
  -- Registrar uso
  IF OLD.is_used = false AND NEW.is_used = true THEN
    PERFORM log_ticket_action(
      NEW.id,
      'used',
      NEW.assigned_user_id,
      NEW.assigned_user_name,
      NEW.assigned_user_email,
      jsonb_build_object(
        'used_by', NEW.used_by,
        'used_at', NEW.used_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger para registrar mudanças em ingressos
DROP TRIGGER IF EXISTS ticket_changes_trigger ON tickets;
CREATE TRIGGER ticket_changes_trigger
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_ticket_changes();

-- =====================================================
-- 5. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. POLÍTICAS PARA PROFILES
-- =====================================================

-- Verificar e criar políticas para profiles
DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can read all profiles') THEN
    CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can update all profiles') THEN
    CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can delete all profiles') THEN
    CREATE POLICY "Admins can delete all profiles" ON profiles
    FOR DELETE USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can insert all profiles') THEN
    CREATE POLICY "Admins can insert all profiles" ON profiles
    FOR INSERT WITH CHECK (is_admin());
  END IF;
END $$;

-- =====================================================
-- 7. POLÍTICAS PARA EVENTS
-- =====================================================

DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Users can view approved events') THEN
    CREATE POLICY "Users can view approved events" ON events
    FOR SELECT USING (status = 'approved');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Organizers can manage own events') THEN
    CREATE POLICY "Organizers can manage own events" ON events
    FOR ALL USING (
      organizer_id = auth.uid() AND 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organizer')
    );
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can read all events') THEN
    CREATE POLICY "Admins can read all events" ON events
    FOR SELECT USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can update all events') THEN
    CREATE POLICY "Admins can update all events" ON events
    FOR UPDATE USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can insert all events') THEN
    CREATE POLICY "Admins can insert all events" ON events
    FOR INSERT WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can delete all events') THEN
    CREATE POLICY "Admins can delete all events" ON events
    FOR DELETE USING (is_admin());
  END IF;
END $$;

-- =====================================================
-- 8. POLÍTICAS PARA TICKETS
-- =====================================================

DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Users can view own tickets') THEN
    CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT USING (
      user_id = auth.uid() OR assigned_user_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Users can update own tickets') THEN
    CREATE POLICY "Users can update own tickets" ON tickets
    FOR UPDATE USING (
      user_id = auth.uid() OR assigned_user_id = auth.uid()
    );
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Admins can read all tickets') THEN
    CREATE POLICY "Admins can read all tickets" ON tickets
    FOR SELECT USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Admins can update all tickets') THEN
    CREATE POLICY "Admins can update all tickets" ON tickets
    FOR UPDATE USING (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Admins can insert all tickets') THEN
    CREATE POLICY "Admins can insert all tickets" ON tickets
    FOR INSERT WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Admins can delete all tickets') THEN
    CREATE POLICY "Admins can delete all tickets" ON tickets
    FOR DELETE USING (is_admin());
  END IF;
END $$;

-- =====================================================
-- 9. POLÍTICAS PARA TICKET_HISTORY
-- =====================================================

DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticket_history' AND policyname = 'Users can view own ticket history') THEN
    CREATE POLICY "Users can view own ticket history" ON ticket_history
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = ticket_history.ticket_id 
        AND (tickets.user_id = auth.uid() OR tickets.assigned_user_id = auth.uid())
      )
    );
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticket_history' AND policyname = 'Admins can read all ticket history') THEN
    CREATE POLICY "Admins can read all ticket history" ON ticket_history
    FOR SELECT USING (is_admin());
  END IF;
END $$;

-- =====================================================
-- 10. POLÍTICAS PARA NOTIFICATIONS
-- =====================================================

DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Admins can manage all notifications') THEN
    CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (is_admin());
  END IF;
END $$;

-- =====================================================
-- 11. POLÍTICAS PARA CHAT_MESSAGES
-- =====================================================

DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can view own messages') THEN
    CREATE POLICY "Users can view own messages" ON chat_messages
    FOR SELECT USING (
      sender_id = auth.uid() OR receiver_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can insert own messages') THEN
    CREATE POLICY "Users can insert own messages" ON chat_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Admins can manage all messages') THEN
    CREATE POLICY "Admins can manage all messages" ON chat_messages
    FOR ALL USING (is_admin());
  END IF;
END $$;

-- =====================================================
-- 12. POLÍTICAS PARA TRANSACTIONS
-- =====================================================

DO $$
BEGIN
  -- Políticas para usuários comuns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions') THEN
    CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can insert own transactions') THEN
    CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  -- Políticas para admins
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Admins can manage all transactions') THEN
    CREATE POLICY "Admins can manage all transactions" ON transactions
    FOR ALL USING (is_admin());
  END IF;
END $$;

-- =====================================================
-- 13. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as políticas foram criadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'events', 'tickets', 'ticket_history', 'notifications', 'chat_messages', 'transactions')
ORDER BY tablename, policyname;

-- Verificar estrutura das tabelas principais
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'events', 'tickets', 'ticket_history')
ORDER BY table_name, ordinal_position;

-- Testar a função is_admin()
SELECT is_admin() as is_admin_function_working;

-- =====================================================
-- 14. COMENTÁRIOS FINAIS
-- =====================================================

-- Este script configura completamente o banco de dados com:
-- ✅ Todas as tabelas necessárias
-- ✅ Índices para performance
-- ✅ Funções auxiliares
-- ✅ Triggers para histórico automático
-- ✅ Políticas RLS completas
-- ✅ Verificação de políticas existentes antes de criar

-- Após executar este script, o sistema estará pronto para:
-- 1. Autenticação de usuários (admin, organizer, user)
-- 2. Gestão de eventos com moderação
-- 3. Sistema de ingressos com atribuição de usuário
-- 4. Histórico completo de ações
-- 5. Notificações e chat
-- 6. Transações financeiras 