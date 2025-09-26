-- Script para corrigir problema do chat
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAR TABELA CHAT_ROOMS SE NÃO EXISTIR
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
-- 2. CRIAR TABELA SUPPORT_TICKETS SE NÃO EXISTIR
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
-- 3. CRIAR TABELA SUPPORT_MESSAGES SE NÃO EXISTIR
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
-- 4. HABILITAR RLS
-- =====================================================

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS RLS SIMPLES
-- =====================================================

-- Políticas para chat_rooms
DROP POLICY IF EXISTS "Admins can manage all chat rooms" ON chat_rooms;
CREATE POLICY "Admins can manage all chat rooms" ON chat_rooms
FOR ALL USING (is_admin());

-- Políticas para support_tickets
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
CREATE POLICY "Admins can view all support tickets" ON support_tickets
FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all support tickets" ON support_tickets;
CREATE POLICY "Admins can update all support tickets" ON support_tickets
FOR UPDATE USING (is_admin());

-- Políticas para support_messages
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;
CREATE POLICY "Admins can view all support messages" ON support_messages
FOR SELECT USING (is_admin());

-- =====================================================
-- 6. DADOS INICIAIS
-- =====================================================

-- Criar sala de chat geral se não existir
INSERT INTO chat_rooms (name, description, is_private, created_by)
SELECT 
  'Chat Geral',
  'Sala de chat geral para todos os usuários',
  false,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM chat_rooms WHERE name = 'Chat Geral'
);

-- =====================================================
-- 7. VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas existem
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('chat_rooms', 'support_tickets', 'support_messages')
ORDER BY table_name, ordinal_position;

-- Verificar se há dados
SELECT 'chat_rooms' as table_name, COUNT(*) as count FROM chat_rooms
UNION ALL
SELECT 'support_tickets' as table_name, COUNT(*) as count FROM support_tickets
UNION ALL
SELECT 'support_messages' as table_name, COUNT(*) as count FROM support_messages;

-- Mensagem de sucesso
SELECT 'Tabelas de chat e suporte criadas/verificadas com sucesso!' as status; 