-- Script rápido para corrigir tabelas faltantes
-- Execute no SQL Editor do Supabase

-- Criar tabela chat_rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'aberto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Políticas para admins
CREATE POLICY "Admins can manage all chat rooms" ON chat_rooms FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage all support tickets" ON support_tickets FOR ALL USING (is_admin());

-- Verificar
SELECT 'Tabelas criadas com sucesso!' as status; 