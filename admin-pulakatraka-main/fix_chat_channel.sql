-- Script para corrigir problema do chat - adicionar tabela chat_messages
-- Execute este script no SQL Editor do Supabase

-- =====================================================
-- 1. CRIAR TABELA CHAT_MESSAGES SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. HABILITAR RLS
-- =====================================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. POLÍTICAS RLS PARA CHAT_MESSAGES
-- =====================================================

-- Políticas para admins
CREATE POLICY "Admins can manage all chat messages" ON chat_messages
FOR ALL USING (is_admin());

-- Políticas para usuários comuns
CREATE POLICY "Users can view chat messages" ON chat_messages
FOR SELECT USING (
  room_id IN (
    SELECT id FROM chat_rooms 
    WHERE is_private = false OR created_by = auth.uid()
  )
);

CREATE POLICY "Users can create chat messages" ON chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  room_id IN (
    SELECT id FROM chat_rooms 
    WHERE is_private = false OR created_by = auth.uid()
  )
);

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- =====================================================
-- 5. VERIFICAÇÃO
-- =====================================================

-- Verificar se a tabela foi criada
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Verificar se há dados
SELECT COUNT(*) as message_count FROM chat_messages;

-- Mensagem de sucesso
SELECT 'Tabela chat_messages criada com sucesso!' as status; 