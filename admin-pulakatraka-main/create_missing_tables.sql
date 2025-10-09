-- Script para criar tabelas faltantes para chat e suporte
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. TABELA DE SALAS DE CHAT
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT false,
  max_participants INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA DE PARTICIPANTES DO CHAT
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- =====================================================
-- 3. TABELA DE TICKETS DE SUPORTE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'geral' CHECK (category IN ('geral', 'tecnico', 'pagamento', 'evento', 'outro')),
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- =====================================================
-- 4. TABELA DE MENSAGENS DE SUPORTE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para chat_rooms
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON chat_rooms(updated_at);

-- Índices para chat_participants
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Índices para support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- Índices para support_messages
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- =====================================================
-- 6. HABILITAR RLS
-- =====================================================

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS RLS PARA CHAT_ROOMS
-- =====================================================

-- Políticas para usuários comuns
CREATE POLICY "Users can view public chat rooms" ON chat_rooms
FOR SELECT USING (is_private = false);

CREATE POLICY "Users can create chat rooms" ON chat_rooms
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own chat rooms" ON chat_rooms
FOR UPDATE USING (created_by = auth.uid());

-- Políticas para admins
CREATE POLICY "Admins can manage all chat rooms" ON chat_rooms
FOR ALL USING (is_admin());

-- =====================================================
-- 8. POLÍTICAS RLS PARA CHAT_PARTICIPANTS
-- =====================================================

-- Políticas para usuários comuns
CREATE POLICY "Users can view chat participants" ON chat_participants
FOR SELECT USING (
  user_id = auth.uid() OR 
  room_id IN (
    SELECT id FROM chat_rooms 
    WHERE created_by = auth.uid() OR is_private = false
  )
);

CREATE POLICY "Users can join chat rooms" ON chat_participants
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave chat rooms" ON chat_participants
FOR DELETE USING (user_id = auth.uid());

-- Políticas para admins
CREATE POLICY "Admins can manage all chat participants" ON chat_participants
FOR ALL USING (is_admin());

-- =====================================================
-- 9. POLÍTICAS RLS PARA SUPPORT_TICKETS
-- =====================================================

-- Políticas para usuários comuns
CREATE POLICY "Users can view own support tickets" ON support_tickets
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create support tickets" ON support_tickets
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own support tickets" ON support_tickets
FOR UPDATE USING (user_id = auth.uid());

-- Políticas para admins
CREATE POLICY "Admins can view all support tickets" ON support_tickets
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all support tickets" ON support_tickets
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete all support tickets" ON support_tickets
FOR DELETE USING (is_admin());

-- =====================================================
-- 10. POLÍTICAS RLS PARA SUPPORT_MESSAGES
-- =====================================================

-- Políticas para usuários comuns
CREATE POLICY "Users can view support messages" ON support_messages
FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create support messages" ON support_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE user_id = auth.uid()
  )
);

-- Políticas para admins
CREATE POLICY "Admins can view all support messages" ON support_messages
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can create support messages" ON support_messages
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update all support messages" ON support_messages
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete all support messages" ON support_messages
FOR DELETE USING (is_admin());

-- =====================================================
-- 11. DADOS INICIAIS
-- =====================================================

-- Criar sala de chat geral
INSERT INTO chat_rooms (name, description, is_private, created_by)
VALUES (
  'Chat Geral',
  'Sala de chat geral para todos os usuários',
  false,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 12. VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('chat_rooms', 'chat_participants', 'support_tickets', 'support_messages')
ORDER BY table_name, ordinal_position;

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'chat_participants', 'support_tickets', 'support_messages')
ORDER BY tablename, policyname;

-- Mensagem de sucesso
SELECT 'Tabelas de chat e suporte criadas com sucesso!' as status; 